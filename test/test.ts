var test = require('tape');
var proxyquire = require('proxyquire');

var Gateway = proxyquire('../Gateway.js', {
  'azure-iot-amqp-base': {
    Amqp: function () {}
  }
}).Gateway;

test('can create a new Gateway', function (t) {
  var gateway = new Gateway();
  t.equal(typeof gateway, 'object');
  t.end();
});

test('opening a Gateway fails with a malformed connection string', function (t) {
  var gateway = new Gateway();
  gateway.open('malformed')
  .then(function () {
    t.fail();
    t.end();
  })
  .catch(function (error) {
    t.equal(error instanceof Error, true);
    t.end();
  });
});
