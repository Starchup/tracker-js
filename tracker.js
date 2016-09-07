;
(function(window, document, undefined) {
    'use strict'

    /*
      Public API
    */
    var StarchupTracker = function() {
        return this;
    }

    StarchupTracker.prototype.trackEvent = function(event, cb) {
        if (!event) throwError("Missing event");

        request("POST", "Events", event, cb);
    };

    // for backwards compatibility
    StarchupTracker.init = StarchupTracker

    // Associate tracker to window object
    window.StarchupTracker = StarchupTracker;

    /*
      Private Helpers
    */
    var getApiBasedOnHost = function() {
        var domain = window.location.hostname;
        if (window.location.port.length > 0) domain = domain.replace(":" + window.location.port, "");
        if (domain === "localhost") return "http://dev.starchup.com:3005/api";
        else if (domain === "dev.starchup.com") return "http://dev.starchup.com:3005/api";
        else if (domain === "stage.starchup.com") return "https://stage.starchup.com:3004/api";
        else return "https://api.starchup.com:3003/api";
    }

    var request = function(method, resource, data, cb) {
        if (!method) throwError("Missing method");
        if (!resource) throwError("Missing resource");
        if (!data) throwError("Missing data");

        if (!api) throwError("Tracker url undefined");

        var api = getApiBasedOnHost();
        var requestURL = api + "/" + resource;

        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function() {
            if (this.readyState === 4) {
                if (this.status != 200) cb();
                else cb(null, JSON.parse(this.responseText));
            }
        }
        xhttp.open(method, requestURL, true);
        xhttp.setRequestHeader("Content-type", "application/json");
        xhttp.send(JSON.stringify(data));
    };

    function throwError(message) {
        throw new Error('StarchupTracker --- ' + message)
    }
})(window, document);
