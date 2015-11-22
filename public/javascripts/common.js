requirejs.config({
    baseUrl: 'javascripts',
    paths: {
        jquery: '//ajax.googleapis.com/ajax/libs/jquery/2.1.4/jquery.min',
        parse: '//www.parsecdn.com/js/parse-1.6.7.min',
        gapi: '//apis.google.com/js/client',
        ace: '//cdnjs.cloudflare.com/ajax/libs/ace/1.2.2'
    },
    shim: {
        gapi: {
            exports: 'gapi'
        }

    }
});
