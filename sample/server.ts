import * as restify from 'restify';
import { Gateway } from '../Gateway';
import { Message } from 'azure-iot-common';

var connectionString = process.env.IOTHUB_CONNECTION_STRING;

var gateway = new Gateway();

var latestMessage = {};

gateway.on('message', (message) => {
  latestMessage = message;
  console.log(message);
});

var server = restify.createServer();
server.use(restify.plugins.bodyParser());

server.get('/', function (req, res, next) {
  res.send(latestMessage);
  next();
});

server.post('/:deviceId', async function (req, res, next) {
  var message = new Message(req.body);
  console.time('Send message took');
  try {
    await gateway.sendMessage(req.params.deviceId, message);
    console.timeEnd('Send message took');
    res.statusCode = 201;
    res.send();
  } catch (error) {
    res.statusCode = 500;
    res.send(error);
  }
  next();
});

var firstId = 0;
var lastId = 1000;
var devices = [];
for (var i = firstId; i < lastId; i++) {
  devices.push('CCACBBBA' + ('00000000' + i).slice(-8));
};

var start = async function () {
  console.time('Open took');
  try {
    await gateway.open(connectionString);
    console.timeEnd('Open took');
    var addDevicePromises = [];
    devices.forEach((deviceId) => {
      addDevicePromises.push(gateway.addDevice(deviceId));
    });
    console.time('Add devices took');
    await Promise.all(addDevicePromises);
    console.timeEnd('Add devices took');
  } catch (error) {
    console.log(error);
    try {
      await gateway.close();
      server.close();
    } catch (error) {
      console.log(error);
      server.close();
    }
  }
};

var port = process.env.PORT || 8080;
server.listen(port, function() {
  console.log('Server listening at %s', server.url);
  start();
});
