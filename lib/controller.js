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
      console.log(description);
      throw new CustomError(msg, 400);
   }

//    console.log(JSON.stringify(description));
   console.log(availableMethods[req.params.method]);
   req._service = client[req.params.method];
   next();
};


var normalizeQuerystring = function(req, res, next) {
   // TODO
   req._query = req.query;
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
            throw new CustomError(err.message);
         }

         var json = JSON.stringify(result);
         res.send(json, {"Content-Type": "application/json"});
      } );
   });

   return this;
}; 
