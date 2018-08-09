import { EventEmitter } from 'events';
import { Amqp } from 'azure-iot-amqp-base';
import { AmqpMessage } from 'azure-iot-amqp-base';
import { ConnectionString } from 'azure-iot-common';
import { SharedAccessSignature } from 'azure-iot-common';
import { Message } from 'azure-iot-common';

// tslint:disable-next-line:no-var-requires
const packageJson = require('../package.json');

export class Gateway extends EventEmitter {
  sasExpiry: number = 3600; // 60 minutes
  sasRenewalInterval: number = 2700; // 45 minutes

  connectionString: string;
  amqp: Amqp;
  receiverLinks: object

  open(connectionString: string, autoSettleMessages = true): Promise<Error> {
    return new Promise((resolve, reject) => {
      this.connectionString = connectionString;
      this.receiverLinks = {};

      this.amqp = new Amqp(autoSettleMessages);

      try {
        var parsedConnectionString = ConnectionString.parse(connectionString,
          [
            'HostName',
            'SharedAccessKeyName',
            'SharedAccessKey'
          ]
        );

        var endpoint = parsedConnectionString.HostName;
        var hubName = endpoint.split('.')[0];
        var policyName = parsedConnectionString.SharedAccessKeyName;
        var policyKey = parsedConnectionString.SharedAccessKey;

        var sas = SharedAccessSignature.create(
          encodeURIComponent(endpoint),
          policyName,
          policyKey,
          Math.ceil((Date.now() / 1000) + this.sasExpiry)
        );

        var audience = policyName + '@sas.root.' + hubName;
        var token = sas.toString();
      } catch (error) {
        reject(error);
        return;
      }

      var transportConfig = {
        uri: 'amqps://' + endpoint + ':5671',
        userAgentString: packageJson.name + '/' + packageJson.version
      };

      this.amqp.connect(transportConfig, (error) => {
        if (error) {
          reject(error);
          return;
        }
        this.amqp.initializeCBS((error) => {
          if (error) {
            reject(error);
            return;
          }
          this.amqp.putToken(audience, token, (error) => {
            if (error) {
              reject(error);
              return;
            }
            resolve();
          });
        });
      });
    });
  }

  close(): Promise<Error> {
    return new Promise((resolve, reject) => {
      this.amqp.disconnect((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  };

  addDevice(deviceId: string): Promise<Error> {
    return new Promise((resolve, reject) => {
      var link = '/devices/' + deviceId + '/messages/devicebound';
      this.amqp.attachReceiverLink(link, {}, (error, receiverLink) => {
        if (error) {
          reject(error);
          return;
        }
        this.receiverLinks[deviceId] = receiverLink;
        receiverLink.on('message', (message) => {
          this.emit('message', AmqpMessage.toMessage(message));
        });
        resolve();
      });
    });
  };

  removeDevice(deviceId: string): Promise<Error> {
    return new Promise((resolve, reject) => {
      var link = '/devices/' + deviceId + '/messages/devicebound';
      this.amqp.detachReceiverLink(link, (error, receiverLink) => {
        if (error) {
          reject(error);
          return;
        }
        this.receiverLinks[deviceId].removeAllListeners();
        delete this.receiverLinks[deviceId];
        resolve();
      });
    });
  };

  sendMessage(deviceId: string, message: Message): Promise<Error> {
    return new Promise((resolve, reject) => {
      var link = '/devices/' + deviceId + '/messages/events';
      this.amqp.send(message, link, link, (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  };
}
