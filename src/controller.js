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
         if (err) { 
            next(new CustomError(err.message));
            return;
         }

         if (typeof client === "undefined") { 
            next(new CustomError("Unknown WSDL: " + serviceName, 400));
            return;
         }

         req._client = client;
         next();
      });
   };
};


var resolveService = function(req, res, next) {
   var client = req._client;

   var description = client.describe(),
       availableMethods = description[req.params.service][req.params.service+"HttpPort"],
       msg = "Unknown method: " + req.params.method + "\n"
           + "Use one of: _describe, " + Object.keys(availableMethods).join(", ");

   if (req.params.method === "_describe") {
      res.send( JSON.stringify(description), {"Content-Type": "application/json"} );
      return;
   }

   if (typeof client[req.params.method] !== "function") {
      next(new CustomError(msg, 400));
      return;
   }

   req._spec = availableMethods[req.params.method].input;
   req._service = client[req.params.method];
   next();
};


var normalizeQuerystring = function(req, res, next) {
   // validate there are no alien parameter names
   // in queryString
   for (var querystringKey in req.query) {
      if ( req.query.hasOwnProperty(querystringKey)
          && typeof req._spec[querystringKey] === "undefined" ) {
         var msg = "Unexpected parameter: " + querystringKey + "\n"
                 + "Use one of: " + Object.keys(req._spec).join(", ");
         next(new CustomError(msg, 400));
         return;
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


exports.configure = function(express, soapServerUrl, prefix) {
   prefix = prefix || "";
   if (soapServerUrl.substr(-1) !== "/") soapServerUrl += "/";
   if (prefix.substr(-1) !== "/") prefix += "/";

   express.error(function(err, req, res, next) {
      if (err instanceof CustomError) {
         res.send(err.message, err.httpStatus);
      } else {
         next(err);
      }
   });

   express.get( prefix+":service/:method", 
      [resolveWsdl(soapServerUrl), resolveService, normalizeQuerystring], 
      function(req, res, next) {
         req._service( req._query, function(err, result) {
            if (err) { 
               res.send(err.message, 500);
               return;
            }

            var json = JSON.stringify(result);
            res.send(json, {"Content-Type": "application/json"});
         } );
      }
   );

   return express;
}; 
