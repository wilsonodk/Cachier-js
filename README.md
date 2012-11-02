# Cachier-js

Cachier (Cache -> Cash -> Cashier)    
Copyright (c) 2012 Wilson Wise http://wilson.odk.com    
Cachier is licensed under a Creative Commons Attribution-NoDerivs 3.0 Unported License.

A module that extends the base localStorage functionality by adding serialization
for different types of objects as well as adding expire times.

## Example usage:

```javascript
var myData = Cachier.getItem('cachedItem');
if (myData.result) {
    // Use your data which is now in myData.data
} else {
    // The data is expired, go fetch data.
    var fetchedData = ...
    // Now store it
    Cachier.setItem('cachedItem', fetchedData);
}
// If needed, you can manually delete
Cachier.removeItem('cachedItem');
```