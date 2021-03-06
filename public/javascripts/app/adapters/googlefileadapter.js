define(function(require) {
    "use strict";

    var Q = require('q'),
        gapi = require('gapi'),
        userManager = require('app/model/usermanager')();

    function GoogleFileAdapter() {}


    (function() {

        this.constructor = GoogleFileAdapter;

        this.load = function() {
            var deferred = Q.defer();
            gapi.load('drive-realtime,drive-share', function(){
                deferred.resolve();
            });
            return deferred.promise;
        };

        /**
         * Loads an existing realtime file.
         * @param {!string} id for the document to load.
         * @export
         */
        this.loadDriveFile = function(id, onFileLoaded, initializeModel) {
            gapi.drive.realtime.load(id, function(doc) {
                onFileLoaded(doc);
            }, initializeModel, this.onError);
        };

        this.onError = function(error) {
            if (error.type == gapi.drive.realtime.ErrorType
                    .TOKEN_REFRESH_REQUIRED) {
                userManager.authorize(false);
            } else if (error.type == gapi.drive.realtime.ErrorType
                    .CLIENT_ERROR) {
                alert('An Error happened: ' + error.message);
            } else if (error.type == gapi.drive.realtime.ErrorType.NOT_FOUND) {
                alert('The file was not found. It does not exist or you do not have ' +
                    'read access to the file.');
            } else if (error.type == gapi.drive.realtime.ErrorType.FORBIDDEN) {
                alert('You do not have access to this file. Try having the owner share' +
                    'it with you from Google Drive.');
            }
        };

    }).call(GoogleFileAdapter.prototype);

    return GoogleFileAdapter;
});