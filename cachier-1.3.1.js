/**
 * Cachier (Cache -> Cash -> Cashier) Version 1.3.1
 *
 * Copyright (c) 2012 Wilson Wise http://wilson.odk.com
 * Cachier is licensed under a Creative Commons Attribution-NoDerivs 3.0 Unported License.
 *
 * A localStorage wrapper/helper module. The base localStorage object in JS is
 * a key/value store where value must be a string. This is pretty limiting, but
 * easily worked around, and that's where Cachier comes in. Cachier handles 
 * serializing and unserializing the data that is passed to it. It also sets an
 * expire time, so that data can be refreshed when needed. 
 * Provides three public methods; getItem, setItem, and removeItem.
 *
 * JSON-js is required for use. https://github.com/douglascrockford/JSON-js
 *
 * Example usage:
 * 	var myData = Cachier.getItem('cachedItem');
 *	if (myData.result) {
 *		// Use your data which is now in myData.data
 *	} else {
 *		// The data is expired, go fetch data.
 *		var fetchedData = ...
 *		// Now store it
 *		Cachier.setItem('cachedItem', fetchedData);
 *	}
 *	// If needed, you can manually delete
 *	Cachier.removeItem('cachedItem');
 */
var Cachier = (function(window, Json, undefined) {
		// Return object for public methods
	var module		= {},
		// Does localStorage exists?
		lsExists	= typeof window.localStorage !== "undefined",
		// Namespaced key for cache data
		dataCid		= "cachier:data:{cid}",
		// Namespaced key for cache data type
		typeCid		= "cachier:type:{cid}",
		// Namespaced key for cache exprie time
		expireCid	= "cachier:expire:{cid}",
		// Regular expression to replace cache ids
		cidRegEx	= /\{cid\}/,
		// One hour in milliseconds
		defaultTime	= 60 * 60 * 1000,
		// JSON.stringify for object serialization
		serialize 	= Json.stringify,
		// JSON.parse for object deserialization
		unserialize = Json.parse;

	/* Private helper functions */
	/**
	 * _prepareCids
	 * @param	cid		A required string that is the key for all the cache tables
	 * @return object	The return object will have three values that are the 
	 *					prepared keys to be used in localStorage
	 *					@value	data	String cache key for data
	 *					@value	type	String cache key for data type
	 *					@value 	expire	String cache key for expire time
	 */
	function _prepareCids(cid) {
		return {
			data: 	dataCid.replace(cidRegEx, cid),
			type: 	typeCid.replace(cidRegEx, cid),
			expire:	expireCid.replace(cidRegEx, cid)
		};
	}

	/**
	 * _exists 
	 * Private helper that checks if a item is being managed by Cachier already
	 *
	 * @param	cacheId	A required string of the cache key to check
	 * @return	A boolean value indicating whether it is being managed or not
	 */
	function _exists(cacheId) {
		var cid = _prepareCids(cacheId), val;
		if (lsExists) {
			val = window.localStorage.getItem(cid.data);
			return val !== null;
		}
		else {
			return false;
		}
	}

	/* Public methods */
	/**
	 * exists
	 * Public method that exposes the _exists functionality
	 *
	 * @param	cacheId	A required string of the cache key to check
	 * @return	A boolean value indicating whether it is being managed or not
	 */
	module.exists = function(cacheId) {
		return _exists(cacheId);
	}

	/**
	 * getItem public method
	 * @param 	cacheId	A required string that is the key for the item in cache 
	 *					to be retrieved.
	 * @return object
	 *		The return object has two or three values depending on the result 
	 *		of the getItem. 
	 *		@value cids   object	A hash of the localStorage keys that are being used
	 *		@value data	  mixed		The data that was stored
	 *		@value error  string	Message about the error that was thrown
	 *		@value result boolean	Whether the getItem request was successful	 
	 */
	module.getItem = function(cacheId) {
		var cid	= _prepareCids(cacheId),
			// Need some numbers that represent dates
			now	= (new Date()).getTime(),
			expireDate,
			// Result object
			myData 	= {
				cids: 	cid,
				data:	"",
				error:	null,
				result: false,
				expires: -1
			},
			dataType, data;

		// Make sure localStorage is available
		if (lsExists) {
			// Check if our content exists in cache
			if (_exists(cacheId)) {
				expireDate = parseInt(window.localStorage.getItem(cid.expire));
				// Check if our cached content has expired
				if (now < expireDate) {
					// OK, we can proceed
					dataType = window.localStorage.getItem(cid.type);
					data	 = window.localStorage.getItem(cid.data);
					
					// Set the expires time
					myData.expires = expireDate - now;

					// Get data
					switch (dataType) {
						case "object":
							// Unserialize the data back to an object
							myData.data   = unserialize(data);
							myData.result = true;
							break;

						case "number":
							// Make a number from a string
							myData.data   = Number(data);
							myData.result = true;
							break;

						case "boolean":
							// We can retrieve boolean values easily enough
							myData.data   = data == "true" ? true : false;
							myData.result = true;
							break;

						case "string": 
							// Don't need to do anything for strings
							myData.data   = data;
							myData.result = true;
							break;

						case "function":
							myData.data   = "";
							myData.result = false;
							myData.error  = "Function was saved, unable to retrieve the value";
							break;

						default:
							myData.data   = "";
							myData.result = false;
							myData.error  = "Unknown data type was saved";
							break;
					}
				}
				else {
					// It's expired, so delete and return false
					Cachier.removeItem(cacheId);
					myData.error = "Expired in cache";
				}
			}
			else {
				myData.error = "Cache key undefined";
			}
		}
		else {
			myData.error = "The localStorage object is not supported";
		}

		return myData;
	};

	/**
	 * setItem public method
	 * @param	cacheId	A required string that is the key for the item.
 	 * @param	data	A required mixed value, this is the data to be stored.
	 *					All types except functions are allowed. 
	 * @param	expire	Optional number of milliseconds for how long the item 
	 					should be stored before it is expired.
	 * @return	boolean
	 *		True if the value was stored, false if it wasn't
	 */
	module.setItem = function(cacheId, data, expire) {
		// Use the defaultTime if expire is not set
		var expireTime	= expire || defaultTime,
			dataType 	= typeof data,
			cid;

		// cacheId should be a string
		if (typeof cacheId !== "string") return false;

		// Check the type of data
		switch (dataType) {
			case "function":
				// We don't support serializing functions
				return false;
				break;

			case "object":
				// Serialize the object then store it
				data = serialize(data);
				break;

			case "string":
				// Don't have to do anything
				break;

			case "number":
			case "boolean":
			default:
				// By default, let's try calling toString
				// on data to convert it.
				data = data.toString();
				break;
		}

		// Let's double-check we are a string
		if (typeof data == "string") {
			cid	= _prepareCids(cacheId);

			// Add now to the expired time, then convert to string to save it
			expireTime = (parseInt(expireTime) + (new Date).getTime()).toString();

			// Try to save them
			try {
				window.localStorage.setItem(cid.data, data);
				window.localStorage.setItem(cid.type, dataType);
				window.localStorage.setItem(cid.expire, expireTime);
			}
			catch (error) {
				return false;
			}
		}
		else {
			return false;
		}
		// We haven't had an error, we must be OK, right?
		return true;
	};

	/**
	 * removeItem public method
	 * @param	cacheId A required string, the cache key to be deleted.
	 * @return boolean
	 *		True if the content was deleted, false if it wasn't
 	 */
	module.removeItem = function(cacheId) {
		try {
			// Remove all three items
			var cid	= _prepareCids(cacheId);
			window.localStorage.removeItem(cid.data);
			window.localStorage.removeItem(cid.type);
			window.localStorage.removeItem(cid.expire);
		}
		catch (error) {
			// Something went wrong
			return false;
		}
		return true;
	};
	return module;
}(window, JSON));