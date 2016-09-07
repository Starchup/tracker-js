;
(function(window, document, undefined) {
    'use strict'

    var kDEVICE_ID_COOKIE = "tracker_device_id";
    var globals = {
        customerId: null,
        deviceId: null,
        access_token: null,
        cleanerIdentifier: null
    }

    /*************************
     *                       *
     *      Public API       *
     *                       *
     *************************/
    var StarchupTracker = function(cleanerIdentifier) {
        globals.cleanerIdentifier = cleanerIdentifier;

        var devId = getCookie(kDEVICE_ID_COOKIE);
        if (devId && devId.length > 0) globals.deviceId = devId;

        return this;
    }
    var trackEvent = function(event, cb) {
        if (!cb || cb === undefined) cb = backupCb;

        if (!event) throwError("Missing event");

        var utms = getURLParamByName('utm_source');
        var utmm = getURLParamByName('utm_medium');
        var utmc = getURLParamByName('utm_campaign');
        var ref = document.referrer;

        if (utms && utms.length > 0) event.utmSource = utms;
        else if (ref && ref.length > 1) event.utmSource = ref;
        if (utmm && utms.length > 0) event.utmMedium = utmm;
        if (utmc && utms.length > 0) event.utmCampaign = utmc;

        if (globals.customerId) event.customerId = globals.customerId;
        if (globals.deviceId) event.deviceId = globals.deviceId;

        if (!globals.deviceId) {
            createDevice(function(err, device) {
                if (device) event.deviceId = device.id;
                request("POST", "Events", event, cb);
            });
        } else request("POST", "Events", event, cb);
    };
    var logIn = function(customerId, token, cb) {
        if (!cb || cb === undefined) cb = backupCb;

        if (!customerId) throwError("Missing customerId");
        if (!token) throwError("Missing token");

        if (!globals.deviceId) throwError("Invalid device");

        globals.access_token = token;
        globals.customerId = customerId;

        getCustomerDevices(function(err, res) {
            var data = {
                customerId: customerId
            };
            if (res && res.length > 0) {
                var firstId = res[0]["id"];
                data.deviceId = res[0]["deviceId"];
                res.forEach(function(d) {
                    if (d.customerId != globals.customerId) return;
                    if (!d.id || !d.deviceId) return;
                    if (d.id === firstId) return;
                    if (d.id > firstId) return;
                    firstId = d.id;
                    data.deviceId = d.deviceId;
                });
            }
            request("PUT", "DeviceData/" + globals.deviceId, data, cb);
        });
    };
    var logOut = function() {
        globals.customerId = null;
        globals.deviceId = null;
        globals.access_token = null;
        setCookie(kDEVICE_ID_COOKIE, null, 0);
    };


    StarchupTracker.prototype.trackEvent = trackEvent;
    StarchupTracker.prototype.logIn = logIn;
    StarchupTracker.prototype.logOut = logOut;

    // for backwards compatibility
    StarchupTracker.init = StarchupTracker

    // Associate tracker to window object
    window.StarchupTracker = StarchupTracker;


    /*************************
     *                       *
     *    Private Helpers    *
     *                       *
     *************************/
    var backupCb = function() {}

    var getCustomerDevices = function(cb) {
        if (!cb || cb === undefined) cb = backupCb;

        if (!globals.customerId) throwError("Missing customerId");
        var query = {
            "where": {
                "customerId": globals.customerId
            }
        };
        request("GET", "DeviceData", query, cb);
    };
    var getApiBasedOnHost = function() {
        var domain = window.location.hostname;
        if (window.location.port.length > 0) domain = domain.replace(":" + window.location.port, "");
        if (domain === "localhost") return "http://dev.starchup.com:3005/api";
        else if (domain === "dev.starchup.com") return "http://dev.starchup.com:3005/api";
        else if (domain === "stage.starchup.com") return "https://stage.starchup.com:3004/api";
        else return "https://api.starchup.com:3003/api";
    }

    var request = function(method, resource, data, cb) {
        if (!cb || cb === undefined) cb = backupCb;

        if (!method) throwError("Missing method");
        if (!resource) throwError("Missing resource");
        if (!data) throwError("Missing data");

        var api = getApiBasedOnHost();
        var requestURL = api + "/" + resource;
        if (globals.access_token) {
            requestURL = requestURL + "?access_token=" + globals.access_token;
        }

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

    /*************************
     *                       *
     * Device data utilities *
     *                       *
     *************************/
    var createDevice = function(cb) {
        if (!cb || cb === undefined) cb = backupCb;

        var dd = getBrowserData();
        if (globals.customerId) dd.customerId = globals.customerId;

        dd.deviceId = guid();
        dd.ip = findIP();
        dd.app = globals.cleanerIdentifier;

        request("POST", "DeviceData", dd, function(err, res) {
            if (res && res.id) {
                globals.deviceId = res.id;
                setCookie(kDEVICE_ID_COOKIE, res.id, 0.5);
            }
            cb(err, res);
        });
    };
    var guid = function() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
            s4() + '-' + s4() + s4() + s4();
    }

    function findIP() {
        var xmlHttp = new XMLHttpRequest();
        xmlHttp.open("GET", "https://api.ipify.org/", false);
        xmlHttp.send(null);
        return xmlHttp.responseText;
    }

    /**************************
     *                        *
     * Browser data utilities *
     *                        *
     **************************/
    var getURLParamByName = function(name) {
        name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
        var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
            results = regex.exec(location.search);
        return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
    }

    function setCookie(cname, cvalue, exdays) {
        var d = new Date();
        d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
        var expires = "expires=" + d.toUTCString();
        document.cookie = cname + "=" + cvalue + "; " + expires;
    }

    function getCookie(cname) {
        var name = cname + "=";
        var ca = document.cookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') {
                c = c.substring(1);
            }
            if (c.indexOf(name) == 0) {
                return c.substring(name.length, c.length);
            }
        }
        return "";
    }
    var getBrowserData = function() {
        var nAgt = navigator.userAgent;
        var browserName = navigator.appName;
        var fullVersion = '' + parseFloat(navigator.appVersion);
        var nameOffset, verOffset, ix;

        // In Opera, the true version is after "Opera" or after "Version"
        if ((verOffset = nAgt.indexOf("Opera")) != -1) {
            browserName = "Opera";
            fullVersion = nAgt.substring(verOffset + 6);
            if ((verOffset = nAgt.indexOf("Version")) != -1)
                fullVersion = nAgt.substring(verOffset + 8);
        }
        // In MSIE, the true version is after "MSIE" in userAgent
        else if ((verOffset = nAgt.indexOf("MSIE")) != -1) {
            browserName = "Microsoft Internet Explorer";
            fullVersion = nAgt.substring(verOffset + 5);
        }
        // In Chrome, the true version is after "Chrome" 
        else if ((verOffset = nAgt.indexOf("Chrome")) != -1) {
            browserName = "Chrome";
            fullVersion = nAgt.substring(verOffset + 7);
        }
        // In Safari, the true version is after "Safari" or after "Version" 
        else if ((verOffset = nAgt.indexOf("Safari")) != -1) {
            browserName = "Safari";
            fullVersion = nAgt.substring(verOffset + 7);
            if ((verOffset = nAgt.indexOf("Version")) != -1)
                fullVersion = nAgt.substring(verOffset + 8);
        }
        // In Firefox, the true version is after "Firefox" 
        else if ((verOffset = nAgt.indexOf("Firefox")) != -1) {
            browserName = "Firefox";
            fullVersion = nAgt.substring(verOffset + 8);
        }
        // In most other browsers, "name/version" is at the end of userAgent 
        else if ((nameOffset = nAgt.lastIndexOf(' ') + 1) <
            (verOffset = nAgt.lastIndexOf('/'))) {
            browserName = nAgt.substring(nameOffset, verOffset);
            fullVersion = nAgt.substring(verOffset + 1);
            if (browserName.toLowerCase() == browserName.toUpperCase()) {
                browserName = navigator.appName;
            }
        }
        // trim the fullVersion string at semicolon/space if present
        if ((ix = fullVersion.indexOf(";")) != -1)
            fullVersion = fullVersion.substring(0, ix);
        if ((ix = fullVersion.indexOf(" ")) != -1)
            fullVersion = fullVersion.substring(0, ix);

        return {
            browser: browserName,
            appVersion: fullVersion,
            codeName: navigator.userAgent,
            os: getOS()
        };
    }

    var getOS = function() {
        if (navigator.appVersion.indexOf("Win") != -1) return "Windows";
        if (navigator.appVersion.indexOf("Mac") != -1) return "MacOS";
        if (navigator.appVersion.indexOf("X11") != -1) return "UNIX";
        if (navigator.appVersion.indexOf("Linux") != -1) return "Linux";
        return "Unkown"
    }
})(window, document);
