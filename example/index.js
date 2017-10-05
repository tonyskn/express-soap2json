var soap2json = require("express-soap2json")

var app = require("express")()

var SOAP_SERVER = "http://www.webservicex.net"
var JSON_PREFIX = "api"

app.use(soap2json(SOAP_SERVER, JSON_PREFIX))

const PORT = process.env.PORT || 3003

app.listen(PORT, () => {
  console.log("listening on http://0.0.0.0:" + PORT)
})
