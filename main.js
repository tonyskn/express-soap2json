var config = require("commander"),
    controller = require("./lib/controller").withConfig(config),
    express = require("express"),
    server = express.createServer();

config
   .option("-p, --port [port]", "Server port", 9876)
   .option("-u, --zapi-url [url]", "Merlin API server url", "http://localhost:9000/merlin-server/services/")
   .parse(process.argv);

// our catcher for log messages
process.addListener('uncaughtException', function (err, stack) {
   var message = 'Caught exception: ' + err;
   console.log(message);
});

controller.withServer(server);

console.log("Using SOAP server on: ", config.zapiUrl);
console.log("Listening on port: ", config.port);

server.listen(config.port);
