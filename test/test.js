var fs = require('fs'),
    soap = require('soap'),
    assert = require('assert'),
    request = require('request'),
    http = require('http');

var service = { 
    StockQuoteService: { 
        StockQuotePort: { 
            GetLastTradePrice: function(args) {
                return { price: 19.56 };
            }
        }
    }
}

var proxy;

module.exports = {
    'Express SOAP Proxy Tests': {

        'SOAP server should start': function(done) {
            var wsdl = fs.readFileSync(__dirname+'/wsdl/stockquote.wsdl', 'utf8'),
                server = http.createServer(function(req, res) {
                    res.statusCode = 404;
                    res.end();
                });
            server.listen(15099);
            soap.listen(server, '/stockquote', service, wsdl);

            request('http://localhost:15099', function(err, res, body) {
                assert.ok(!err);
                done();
            })
        },

        'Proxy should start': function(done) {
            proxy = require('../server');
            request('http://localhost:9876', function(err, res, body) {
                assert.ok(!err);
                assert.equal(res.statusCode, 404);
                done();
            })
        },

        'Proxy should answer 400 when asked for inexistant WSDL': function(done) {
            request('http://localhost:9876/_WSDL/_SERVICE', function(err, res, body) {
                assert.ok(!err);
                assert.equal(res.statusCode, 400);
                assert.equal(body, "Unknown WSDL: _WSDL");
                done();
            })            
        },

        'Proxy should answer 400 when asked for wrong service': function(done) {
            request('http://localhost:9876/stockquote/_SERVICE', function(err, res, body) {
                assert.ok(!err);
                assert.equal(res.statusCode, 400);
                console.log(body);
                assert.ok(body.length);
                done();
            })            
        }

//         'Proxy should answer 400 when asked for service with wrong param names': function(done) {
//             request('http://localhost:9876/stockquote/getLastTradePrice?PARAM=GOOG', function(err, res, body) {
//                 assert.ok(!err);
//                 console.log(res.statusCode);
//                 console.log(body);
// //                 assert.equal(res.statusCode, 400);
// //                 assert.ok(body.length);
//                 done();
//             })            
//         }
   }
}

