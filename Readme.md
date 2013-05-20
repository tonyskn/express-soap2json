# express-soap2json

[![Build Status][travis-image]][travis] [![Coverage Status][coveralls-image]][coveralls]

Node based JSON/HTTP proxy to SOAP webservices.

Features:
- Routes HTTP/GET requests to SOAP webservices, passing along any parameters in query string.
- Returns SOAP responses as JSON.
- Supports sequence & enumerated WSDL parameter types.
- Provides explicit and clear error messages and proper HTTP status codes.

## Installation

```
npm install -g express-soap2json
```

## Usage

This module can be used in two ways: 

### As a standalone proxy server

If you just need a simple proxy running out of the box, use the provided `soap2json` command:

```
soap2json -p <port> -u <http://soap-server/services/>
```

### As a library

Inside you own application, you can configure an Express server to route some requests to SOAP webservices:

```javascript
var soap = require('express-soap2json'),
    server = require('express').createServer();

    soap.configure( server, "<soap server url>", "<JSON apis prefix>" );

    server.listen(...)
```

Take a look at the Mocha tests for more detailed examples.


[travis]: http://travis-ci.org/tonyskn/express-soap2json
[travis-image]: https://secure.travis-ci.org/tonyskn/express-soap2json.png?branch=master
[coveralls]: https://coveralls.io/r/tonyskn/express-soap2json
[coveralls-image]: https://coveralls.io/repos/tonyskn/express-soap2json/badge.png?branch=master

