;
(function(window, document, undefined) {
    'use strict'

    var options = {
        api: null,
        credentials: null,
        access_token: null
    }

    /*
      Public API
    */
    var StarchupTracker = function(api, credentials) {
        if (!api) throwError("Missing api url");
        if (!credentials) throwError("Missing credentials");
        if (!credentials.email || !credentials.password) throwError("Invalid credentials");

        options.credentials = JSON.parse(JSON.stringify(credentials));
        options.api = JSON.parse(JSON.stringify(api));
        return this;
    }

    StarchupTracker.prototype.trackEvent = function(event, cb) {
        if (!options.access_token && !options.credentials) throwError("Tracker not initialized correctly");
        if (!event) throwError("Missing event");

        logIn(function() {
            request("POST", "Events", event, cb);
        });
    };

    // for backwards compatibility
    StarchupTracker.init = StarchupTracker

    // Associate tracker to window object
    window.StarchupTracker = StarchupTracker;

    /*
      Private Helpers
    */
    var request = function(method, resource, data, cb) {
        if (!method) throwError("Missing method");
        if (!resource) throwError("Missing resource");
        if (!data) throwError("Missing data");

        if (!options.api) throwError("Tracker url undefined");

        var requestURL = options.api + "/" + resource;
        if (options.access_token) {
            requestURL = requestURL + "?access_token=" + options.access_token;
        }

        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function() {
            if (this.readyState === 4) {
                if (this.status === 200) {
                    cb(null, JSON.parse(this.responseText));
                } else {
                    cb(this.responseText, null);
                }
            }
        }
        xhttp.open(method, requestURL, true);
        xhttp.setRequestHeader("Content-type", "application/json");
        xhttp.send(JSON.stringify(data));
    };

    function logIn(cb) {
        if (!options.credentials) throwError("Missing credentials");
        if (options.access_token) return cb();

        var method = "POST";
        var resource = "StarchupUsers/login";
        var creds = options.credentials;
        return request(method, resource, creds, function(err, body) {

            if (err) throwError(err);
            if (!body || !body.id) throwError("Could not login");
            options.access_token = body.id;
            cb();
        });
    }

    function throwError(message) {
        throw new Error('StarchupTracker --- ' + message)
    }
})(window, document);
