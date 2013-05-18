var fs = require('fs'),
    soap = require('soap'),
    assert = require('assert'),
    request = require('request'),
    http = require('http'),
    express = require('express');

var service = { 
 StockQuoteService: { 
    StockQuotePort: { 
       GetLastTradePrice: function(args) {
          if (JSON.stringify(args.tradeList.Trade) === '["GOOG","AAPL"]')
             return { price: 19.56 };
          else
             return null;
       }
    }
 }};

module.exports = {
    'Express SOAP Proxy Tests: ': {

        'Proxy should start': function(done) {
            require('../soap2json');
            request('http://localhost:9876/_WSDL', function(err, res, body) {
                assert.ok(!err);
                assert.equal(404, res.statusCode);
                done();
            });
        },

        'Proxy should answer 404 when SOAP server is not responding': function(done) {
            request('http://localhost:9876/api/_WSDL/_describe', function(err, res, body) {
                assert.ok(!err);
                assert.equal(404, res.statusCode);
                assert.equal("Error retrieving WSDL: _WSDL", body);
                done();
            });
        },

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
            });
        },

        'Proxy should answer 404 when asked for inexistant WSDL': function(done) {
            request('http://localhost:9876/api/_WSDL/_METHOD', function(err, res, body) {
                assert.ok(!err);
                assert.equal(404, res.statusCode);
                assert.equal("Error retrieving WSDL: _WSDL", body);
                done();
            });
        },

        'Proxy should answer 400 when asked for wrong method': function(done) {
            request('http://localhost:9876/api/stockquote/_METHOD', function(err, res, body) {
                assert.ok(!err);
                assert.equal(400, res.statusCode);
                assert.equal("Unknown method: _METHOD\nUse one of: _describe, GetLastTradePrice", body);
                assert.ok(body.length);
                done();
            });           
        },

        'Proxy should answer 400 when called with wrong querystring': function(done) {
            request('http://localhost:9876/api/stockquote/GetLastTradePrice?PARAM=GOOG', function(err, res, body) {
                assert.ok(!err);
                assert.equal(400, res.statusCode);
                assert.equal( "Unexpected parameter: PARAM\nUse one of: tradeList", body );
                done();
            });            
        },

        'Proxy should yield complete service description': function(done) {
            request('http://localhost:9876/api/stockquote/_describe', function(err, res, body) {
                assert.ok(!err);
                assert.equal(200, res.statusCode);
                assert.deepEqual( {"StockQuoteService":{
                   "StockQuotePort":{
                      "GetLastTradePrice":{
                         "input":{ "tradeList":{"Trade[]": "Trade|string|AAPL,GOOG"} },
                         "output":{ "price":"float" }
                      }
                   }
                }}, JSON.parse(body) );
                done();
            });            
        },

        'Service should work when called with correct parameters': function(done) {
            request('http://localhost:9876/api/stockquote/GetLastTradePrice?tradeList=GOOG,AAPL', function(err, res, body) {
                assert.ok(!err);
                assert.equal(200, res.statusCode);
                assert.deepEqual( { price: 19.56 }, JSON.parse(body) );
                done();
            });            
        },
        
        'SOAP proxy should be embeddable in an Express app': function(done) {
            var server = express.createServer();
            require('../').configure( server, 'http://localhost:15099/', 'api' );
            server.listen('9999');

            request('http://localhost:9999/api/stockquote/_METHOD', function(err, res, body) {
                assert.ok(!err);
                assert.equal(400, res.statusCode);
                assert.equal("Unknown method: _METHOD\nUse one of: _describe, GetLastTradePrice", body);
                assert.ok(body.length);
                done();
            });
        }
   }
};
