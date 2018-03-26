A gateway to Azure IoT Hub that can represent multiple devices over a single connection.

[![Build Status](https://travis-ci.org/vjrantal/azure-iot-multiplexing-gateway.svg?branch=master)](https://travis-ci.org/vjrantal/azure-iot-multiplexing-gateway)

To see an implementation of the same pattern in .NET Core, please see [this](https://github.com/fbeltrao/IoTHubGateway) project.

# Basic functionality

```
var gateway = new Gateway();

// The connection string must include a shared access key with the `device connect` permission.
// The value can be copied, for example, from the Azure Portal.
await gateway.open(process.env.IOTHUB_CONNECTION_STRING);

// Setup the message handler.
gateway.on('message', (message) => {
  // Do something when C2D messages arrive.
  // This handler is called to messages targeting any device and includes the target device id.
});

// Add the devices you want to handle with this gateway.
// Note that only device id is enough and there is no need for device-specific keys.
await gateway.addDevice('<some-device-id>');

// Send D2C messages on behalf of any device id.
await gateway.sendMessage('<some-device-id>', <message>);
```

See the [sample server.ts](./sample/server.ts) for more details about the usage.

# Running sample locally

```
export IOTHUB_CONNECTION_STRING="HostName=..."
npm install
npm start
```

# Running tests locally

```
npm install
npm test
```
