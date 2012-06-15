/**
 * Cachier (Cache -> Cash -> Cashier) Version 1.2
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
var Cachier = (function(Json) {
	var module		= {},						// Return object for public methods
		win			= this,						// Quick reference to window object
		ls			= win.localStorage,			// Quick reference to localStorage
		dataCid		= "cachier:data:{cid}",		// Name spaced key for cache data
		typeCid		= "cachier:type:{cid}",		// Name spaced key for cache data type
		expireCid	= "cachier:expire:{cid}",	// Name spaced key for cache exprie time
		cidRegEx	= /\{cid\}/,				// Regular expression to replace cache ids
		defaultTime	= 60 * 60 * 1000, 			// One hour in milliseconds
		serialize 	= Json.stringify,			// JSON.stringify for object serialization
		unserialize = Json.parse;				// JSON.parse for object deserialization
		
	/* Private helper functions */
	/**
	 *	prepareCids
	 *	@param	cid		A required string that is the key for all the cache tables
	 *	@return object	The return object will have three values that are the 
	 *					prepared keys to be used in localStorage
	 *					@value	data	String cache key for data
	 *					@value	type	String cache key for data type
	 *					@value 	expire	String cache key for expire time
	 */
	function prepareCids(cid) {
		return {
			data: 	dataCid.replace(cidRegEx, cid),
			type: 	typeCid.replace(cidRegEx, cid),
			expire:	expireCid.replace(cidRegEx, cid)
		};
	}

	/**
	 *	getItem public method
	 *	@param 	cacheId	A required string that is the key for the item in cache 
	 *					to be retrieved.
	 *	@return object	
	 *		The return object has two or three values depending on the result 
	 *		of the getItem. 
	 *		@value result boolean	Whether the getItem request was successful
	 *		@value data	  mixed		The data that was stored
	 *		@value error  string	Message about the error that was thrown
	 */
	module.getItem = function(cacheId) {
		var cid	= prepareCids(cacheId),
			// Need some numbers that represent dates
			now	= (new Date()).getTime(),
			expireDate = parseInt(ls.getItem(cid.expire)),
			// Result object
			myData 	= {										
				result: false,
				data:	"",
				error:	null
			},
			dataType, data;
		
		// Check if our cached content has expired
		if (now < expireDate) {
			// OK, we can proceed
			dataType = ls.getItem(cid.type);
			data	 = ls.getItem(cid.data);
			
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
			myData.error = "Expired";
			return myData;
		}
		
		return myData;
	};
	/**
	 * 	setItem public method
	 *	@param	cacheId	A required string that is the key for the item.
 	 *	@param	data	A required mixed value, this is the data to be stored.
	 *					All types except functions are allowed. 
	 *	@param	expire	Optional number of milliseconds for how long the item 
	 					should be stored before it is expired.
	 *	@return	boolean
	 *		True if the value was stored, false if it wasn't
	 */
	module.setItem = function(cacheId, data, expire) {
		// Use the defaultTime if expire is not set
		var expireTime	= expire || defaultTime,
			dataType 	= typeof data,
			cid;
		
		// cacheId should be a string
		if (typeof cacheId != "string") return false;
		
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
			cid	= prepareCids(cacheId);
			
			// Add now to the expired time, then convert to string to save it
			expireTime = (parseInt(expireTime) + (new Date).getTime()).toString();
				
			// Try to save them
			try {
				ls.setItem(cid.data, data);
				ls.setItem(cid.type, dataType);
				ls.setItem(cid.expire, expireTime);
			}
			catch (error) {
				return false;
			}
		}
		else {
			return false;
		}
		// We haven't errored out, we must be ok, right?
		return true;
	};
	/**
	 *	removeItem public method
	 *	@param	cacheId A required string, the cache key to be deleted.
	 *	@return boolean
	 *		True if the content was deleted, false if it wasn't
 	 */
	module.removeItem = function(cacheId) {		
		try {
			// Remove all three items
			var cid	= prepareCids(cacheId);
			ls.removeItem(cid.data);
			ls.removeItem(cid.type);
			ls.removeItem(cid.expire);
		}
		catch (error) {
			// Something went wrong
			return false;
		}
		return true;
	};

	return module;
}(JSON));