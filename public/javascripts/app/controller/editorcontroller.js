define(function (require) {
    "use strict";

    var $ = require('jquery'),
        ace = require('ace/ace'),
        Q = require('q'),
        Workspace = require('app/model/workspace'),
        WorkspaceAdapter = require('app/adapters/googleworkspaceadapter'),
        FileAdapter = require('app/adapters/googlefileadapter'),
        ACEAdapter = require('app/adapters/aceadapter'),
        getParam = require('lib/getparam');

    var socket;

    ace.config.set("packaged", true);
    ace.config.set("basePath", require.toUrl("ace"));

    var supportedLanguages = {
        'cpp': 'c_cpp',
        'c': 'c_cpp',
        'java': 'java',
        'js': 'javascript',
        'py': 'python',
        'swift': 'swift'
    };

    function EditorController() {

        this.workspaceAdapter = new WorkspaceAdapter();
        this.fileAdapter = new FileAdapter();

        this.editor = ace.edit('editor');
        this.editor.setTheme("ace/theme/monokai");
        this.editor.getSession().setMode("ace/mode/plain_text");
        this.editor.getSession().setUseWrapMode(true);
        this.editor.$blockScrolling = Infinity;

        this.aceAdapter = new ACEAdapter(this.editor);
    }

    (function () {

        this.workspace = null;
        this.currentFile = null;

        this.init = function() {
            var that = this;
            return Q.all([
                this.fileAdapter.load(),
                this.workspaceAdapter.load()
            ]).then(function() {
                return that.loadWorkspace();
            }).then(function() {
                that.addSocketListeners();
                that.connectToView();
            });
        };

        this.loadWorkspace = function() {
            var wsID = getParam('id');
            var wsName = getParam('name');
            var that = this;
            // Get a list of files from work space with wsID
            if (wsID) {
                this.workspace = new Workspace(wsID, wsName, this.workspaceAdapter);
                return this.workspace.getContentsList()
                    .then(function(contents) {
                        if (Object.keys(contents).length > 0) {
                            showList(contents);
                        }
                        else {
                            that.workspace.createFile(that.workspace.id, 'demo.js')
                                .then(function (file) {
                                    addContentToList(file.id, file.name);
                                });
                        }
                    });
            }
            else {
                $('#workwrapper').show();
            }
        };

        this.refreshWorkSpace = function() {
            var currentId = $('#files').find('li.current').attr('id');
            $('#files').empty();
            this.workspace.refreshContentList()
                .then(function(contents) {
                    showList(contents);
                    $('#'+currentId).addClass('current');
                });
        };

        this.addSocketListeners = function() {
            var that = this;
            socket = window.socket;
            if (socket != null) {
                socket.on('fileListChanged', function () {
                    that.refreshWorkSpace();
                })
            }
        };

        this.connectToView = function() {
            var that = this;

            $('#editor').on('resize', function() {
                that.editor.resize();
            });

            $('#fileForm').submit(function(){
                that.createFile($('#fileName').val());
            });

            $('#wsName').text(that.workspace.name);

            $('#files')
                .on('click', 'li.file', function() {
                    $('#files').find('li.current').removeClass('current');
                    $(this).addClass('current');
                    if (that.currentFile) {
                        that.workspace.unloadFile(that.currentFile);
                        that.editor.setValue('loading...');
                    }
                    var fileName = $(this).text();
                    that.setEditorMode(fileName);
                    var id = $(this).attr('id');
                    that.currentFile = id;
                    that.workspace.loadFile(id, that.aceAdapter, that.fileAdapter);
                })
                .on('click', 'li.folder', function() {
                    var id = $(this).attr('id');
                    that.workspace.loadFolderContents(id);
                })
                .on('contextmenu','li.content', function(event) {
                    console.log('right clicked');
                    var id = $(this).attr('id');
                    $('#rmenu')
                        .css('top', event.pageY)
                        .css('left', event.pageX)
                        .attr('contentId', id)
                        .show();

                    window.event.returnValue = false;
                }).find('li:first-child').click();

            $(document).on('click', function() {
                $("#rmenu")
                    .hide()
                    .removeAttr('contentId');
            });

            $('#refreshFiles').on('click', function() {
                that.refreshWorkSpace();
            });

            $('#renameCancel').click(function(){
                $('#renameFormPage').hide();
            });

            $('#renameContent').on('click', function() {
                var id = $(this).parents('div').attr('contentId');
                $('#renameFormPage').show();
                $('#renameButton').click(function(){
                    that.renameFile(id);
                    $('#renameFormPage').hide();
                });
            });

            $('#deleteContent').on('click', function() {
                var id = $(this).parents('div').attr('contentId');
                that.deleteFile(id);
            });

        };

        this.createFile = function(fileName) {
            if (fileName) {
                var that = this;
                this.workspace.createFile(that.workspace.id, fileName)
                    .then(function (file) {
                        addContentToList(file.id, file.name);
                        $('#'+file.id).click();
                        socket.emit('fileListChanged', that.workspace.id);
                    });
            }
            else {
                alert('Please input a file name!');
            }
        };

        /**
         * Starts off renaming a file
         * @param {string} id
         */
        this.renameFile = function(id) {
            var fileName = $('#renameInput').val();
            if (fileName != null) {
                this.workspaceAdapter.renameFile(id, fileName);
            }
        };

        /**
         * Starts off deleting a file
         * @param {string} id
         */
        this.deleteFile = function(id) {
            var that = this;
            this.workspace.deleteFile(id)
                .then(function() {
                    $('#' + id).remove();
                    socket.emit('fileListChanged', that.workspace.id);
                });
        };

        this.setEditorMode = function(fileName) {
            var extension = fileName.split('.')[1];
            if (extension && supportedLanguages[extension]) {
                this.editor.getSession().setMode('ace/mode/' + supportedLanguages[extension]);
            }
            else {
                this.editor.getSession().setMode('ace/mode/plain_text');
            }
        };

        this.resetEditorText = function(text) {
            this.editor.setValue(text);
            this.editor.moveCursorTo(0,0);
        };

        this.getEditorText = function() {
            return this.editor.getValue();
        };
    }).call(EditorController.prototype);

    function showList(contents) {
        for (var id in contents) {
            if (contents.hasOwnProperty(id)) {
                if (contents[id].constructor.name == 'File') {
                    var file =  '<li style="color:white" class="content file" id=' + id + '>' +
                        contents[id].name +
                        '</li>';
                    $('#files').append(file);
                } else if (contents[id].constructor.name == 'Folder') {
                    var folder = '<li style="color:white" class="content folder" id="' + id + '">' +
                        contents[id].name +
                        '</li>';
                    $('#files').append(folder);
                }
            }
        }
    }

    function addContentToList(contentId, fileName) {
        $('#fileName').val('');
        $('#files').append(
            '<li style="color:white" class="file content" id="' + contentId + '">' +
            fileName +
            '</li>');
    }

    return EditorController;
});
