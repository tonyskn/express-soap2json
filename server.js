var config = require("commander"),
    soapController = require("./index.js"),
    express = require("express"),
    server = express.createServer();

config
   .option("-p, --port [port]", "Server port", 9876)
   .option("-u, --soap-url [url]", "SOAP server url", "http://localhost:15099/")
   .option("-P, --prefix [prefix]", "Url prefix", "")
   .parse(process.argv);

// our catcher for log messages
process.addListener('uncaughtException', function (err, stack) {
   var message = 'Caught exception: ' + err;
   console.log(message);
});

soapController.configure(server, config.soapUrl, config.prefix);

console.log("Using SOAP server on: ", config.soapUrl);
console.log("Listening on port: ", config.port);
console.log("Service urls use prefix: ", config.prefix);

server.listen(config.port);
