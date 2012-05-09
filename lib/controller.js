var soap = require("soap");


var config;
exports.withConfig = function(theConfig) {
   config = theConfig;
   return this;
};


var CustomError = function(msg, httpStatus) {
   this.message = msg || "Unexpected error!";
   this.httpStatus = httpStatus || 500;
};
CustomError.prototype = Error.prototype;


var resolveWsdl = function(req, res, next) {
   var serviceName = req.params.service,
       wsdlUrl = config.zapiUrl + serviceName + "?wsdl";

   soap.createClient(wsdlUrl, function(err, client) {
      if (err) { 
         throw new CustomError(err.message);
      }

      if (typeof client === "undefined") { 
         throw new CustomError("Unknown WSDL: " + serviceName, 400);
      }

      req._client = client;
      next();
   });
};


var resolveService = function(req, res, next) {
   var client = req._client;

   var description = client.describe(),
       availableMethods = description[req.params.service][req.params.service+"HttpPort"],
       msg = "Unknown method: " + req.params.method + "\nUse one of: " + Object.keys(availableMethods).join(", ");

   if (typeof client[req.params.method] !== "function") {
      throw new CustomError(msg, 400);
   }

   req._spec = availableMethods[req.params.method].input;
   req._service = client[req.params.method];
   next();
};


var normalizeQuerystring = function(req, res, next) {
   // validate there are no alien parameter names
   // in queryString
   Object.keys(req.query).forEach(function (key) {
      if (typeof req._spec[key] === "undefined") {
         var msg = "Unexpected parameter: "+key+"\nUse one of: "+Object.keys(req._spec).join(",");
         throw new CustomError(msg, 400);
      }
   });

   // populate soap query parameters from queryString
   // taking into account 'array' typed fields
   req._query = Object.keys(req._spec).reduce(function (query, key) {
      var spec = req._spec[key],
          queryStringValue = req.query[key];
      if (typeof spec === 'object' && typeof queryStringValue !== "undefined") {
         query[key] = {};
         var specKeys = Object.keys(spec),
             specKey = specKeys[0];
         // behaviour for array fields
         if (specKeys.length === 1 && specKey.substr(-2) === "[]")
            query[key][specKey.substr(0, specKey.length-2)] = queryStringValue.split(",");
         //TODO implement behaviour for complex input objects
      } else {
         query[key] = queryStringValue;
      }
      return query;
   }, {});

   next();
};


exports.withServer = function(server) {
   server.error(function(err, req, res, next) {
      if (err instanceof CustomError) {
         res.send(err.message, err.httpStatus);
      } else {
         next(err);
      }
   });

   server.get("/:service/:method", [resolveWsdl, resolveService, normalizeQuerystring], function(req, res, next) {
      req._service( req._query, function(err, result) {
         if (err) { 
            res.send(err.message, 500);
            return;
         }

         var json = JSON.stringify(result);
         res.send(json, {"Content-Type": "application/json"});
      } );
   });

   return this;
}; 
