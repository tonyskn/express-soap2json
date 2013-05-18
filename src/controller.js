var soap = require("soap");


var CustomError = function(msg, httpStatus) {
   this.message = msg || "Unexpected error!";
   this.httpStatus = httpStatus || 500;
};
CustomError.prototype = Error.prototype;


var resolveWsdl = function(soapServerUrl) {
   return function(req, res, next) {
      var serviceName = req.params.service,
          wsdlUrl = soapServerUrl + serviceName + "?wsdl";

      soap.createClient(wsdlUrl, function(err, client) {
         if (err || typeof client === "undefined") { 
            return next(new CustomError("Error retrieving WSDL: " + serviceName, 404));
         }

         req._client = client;
         next();
      });
   };
};


var resolveService = function(req, res, next) {
   var objValue = function(obj) {
      return obj[Object.keys(obj)[0]];
   };

   var client = req._client,
       description = client.describe(),
       service = req.params.service,
       availableMethods = objValue(objValue(description)),
       msg = "Unknown method: " + req.params.method + "\n" +
             "Use one of: _describe, " + Object.keys(availableMethods).join(", ");

   if (req.params.method === "_describe") {
      return res.json(description);
   }

   if (typeof client[req.params.method] !== "function") {
      return next(new CustomError(msg, 400));
   }

   req._spec = availableMethods[req.params.method].input;
   req._service = client[req.params.method];
   next();
};


var normalizeQuerystring = function(req, res, next) {
   // validate there are no alien parameter names
   // in queryString
   for (var querystringKey in req.query) {
      if ( req.query.hasOwnProperty(querystringKey) &&
          typeof req._spec[querystringKey] === "undefined" ) {
         var msg = "Unexpected parameter: " + querystringKey + "\n" +
                   "Use one of: " + Object.keys(req._spec).join(", ");
         return next(new CustomError(msg, 400));
      }
   }

   // populate soap query parameters from queryString
   // taking into account 'array' typed fields
   req._query = Object.keys(req._spec).reduce(function (query, key) {
      var spec = req._spec[key],
          querystringValue = req.query[key];
      if (typeof spec === 'object' && typeof querystringValue !== "undefined") {
         query[key] = {};
         var specKeys = Object.keys(spec),
             specKey = specKeys[0];

         // behaviour for array fields
         if (specKeys.length === 1 && specKey.substr(-2) === "[]")
            query[key][specKey.substr(0, specKey.length-2)] = querystringValue.split(",");

         //TODO implement behaviour for complex input objects
      } else {
         query[key] = querystringValue;
      }

      return query;
   }, {});

   next();
};


var errorHandler = function(err, req, res, next) {
   res.send(err.message, err.httpStatus || 500);
};


exports.configure = function(express, soapServerUrl, prefix) {
   prefix = prefix || "/";
   if (soapServerUrl.substr(-1) !== "/") soapServerUrl += "/";
   if (prefix.substr(-1) !== "/") prefix += "/";
   if (prefix[0] !== "/") prefix = "/"+prefix;

   express.get( prefix+":service/:method", 
      [resolveWsdl(soapServerUrl), resolveService, normalizeQuerystring, errorHandler], 
      function(req, res) {
         req._service( req._query, function(err, result) {
            if (err) { 
               res.send(err.message, 500);
               return;
            }

            res.json(result);
         } );
      }
   );

   return express;
}; 
