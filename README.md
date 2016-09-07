# Tracker JS
Starchup Analytics Tracker middleware for javascript apps


#### Installation

use cdn


#### Initialization

```
var tracker = require('tracker-js');
var t = new tracker(cleanerIdentifier);
```


#### Example
```
var tracker = require('tracker-js');
var t = new tracker(cleanerIdentifier);

t.trackEvent(event, function(err, res) {});
t.logIn(customerId, accessToken, function(err, res) {});
t.logOut();
```