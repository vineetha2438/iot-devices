'use strict';

var Protocol = require('azure-iot-device-mqtt').Mqtt;
var Client = require('azure-iot-device').Client;
var ConnectionString = require('azure-iot-device').ConnectionString;
var Message = require('azure-iot-device').Message;

var connectionString = 'HostName=iotrm.azure-devices.net;DeviceId=device2;SharedAccessKey=rzC6Ied0Flkg95uRoQzBn+3F7XJUm6UY7gEppVFbnAI=';
var deviceId = ConnectionString.parse(connectionString).DeviceId;

// var clientFromConnectionString = require('azure-iot-device-http').clientFromConnectionString;
// // var Message = require('azure-iot-device').Message;
//
// // var connectionString = '[IoT Hub device connection string]';

// var client = clientFromConnectionString(connectionString);

var temperature = 50;
var waterLevel = 50;

function printErrorFor(op) {
    return function printError(err) {
        if (err) console.log(op + ' error: ' + err.toString());
    };
}

function generateRandomValues(temp) {
  let value = (20 * Math.random()) + 40;
  return value - 20;
}

var deviceMetaData = {
    'ObjectType': 'DeviceInfo',
    'IsSimulatedDevice': 0,
    'Version': '1.0',
    'DeviceProperties': {
        'DeviceID': deviceId,
        'HubEnabledState': 1
    }
};

var reportedProperties = {
    "Device": {
        "DeviceState": "normal",
        "Location": {
            "Latitude": 57.642877,
            "Longitude": -122.125497
        }
    },
    "Config": {
        "TemperatureMeanValue": 56.7,
        "TelemetryInterval": 45
    },
    "System": {
        "Manufacturer": "Contoso Inc.",
        "FirmwareVersion": "2.22",
        "InstalledRAM": "8 MB",
        "ModelNumber": "DB-14",
        "Platform": "Plat 9.75",
        "Processor": "i3-9",
        "SerialNumber": "SER99"
    },
    "Location": {
        "Latitude": 57.642877,
        "Longitude": -122.125497
    },
    "SupportedMethods": {
        "Reboot": "Reboot the device",
        "InitiateFirmwareUpdate--FwPackageURI-string": "Updates device Firmware. Use parameter FwPackageURI to specifiy the URI of the firmware file"
    },
}

function onReboot(request, response) {
    // Implement actual logic here.
    console.log('Simulated reboot...');

    // Complete the response
    response.send(200, "Rebooting device", function(err) {
        if(!!err) {
            console.error('An error occurred when sending a method response:\n' + err.toString());
        } else {
            console.log('Response to method \'' + request.methodName + '\' sent successfully.' );
        }
    });
}

function onInitiateFirmwareUpdate(request, response) {
    console.log('Simulated firmware update initiated, using: ' + request.payload.FwPackageURI);

    // Complete the response
    response.send(200, "Firmware update initiated", function(err) {
        if(!!err) {
            console.error('An error occurred when sending a method response:\n' + err.toString());
        } else {
            console.log('Response to method \'' + request.methodName + '\' sent successfully.' );
        }
    });

    // Add logic here to perform the firmware update asynchronously
}

var client = Client.fromConnectionString(connectionString, Protocol);

client.open(function (err,result) {
  if (err || !result) {
    if (err)
     console.error('Could not connect: ' + err.message);
    else
     console.error('Could not connect: No result ' );
  } else {
      console.log('Client connected');
      console.log('Sending device metadata:\n' + JSON.stringify(deviceMetaData));
      client.sendEvent(new Message(JSON.stringify(deviceMetaData)), printErrorFor('send metadata'));

      // Create device twin
      client.getTwin(function(err, twin) {
          if (err) {
              console.error('Could not get device twin');
          } else {
              console.log('Device twin created');

              twin.on('properties.desired', function(delta) {
                  console.log('Received new desired properties:');
                  console.log(JSON.stringify(delta));
              });

              // Send reported properties
              twin.properties.reported.update(reportedProperties, function(err) {
                  if (err) throw err;
                  console.log('twin state reported');
              });

              // Register handlers for direct methods
              client.onDeviceMethod('Reboot', onReboot);
              client.onDeviceMethod('InitiateFirmwareUpdate', onInitiateFirmwareUpdate);
          }
      });

      // Start sending telemetry
      var sendInterval = setInterval(function () {
          temperature = generateRandomValues(temperature);
          waterLevel = generateRandomValues(waterLevel);
          // console.log('**************************', temperature);
          var data = JSON.stringify({
              'DeviceID': deviceId,
              'Temperature': temperature,
              'WaterLevel': waterLevel
          });

          console.log('Sending device event data:\n' + data);
          client.sendEvent(new Message(data), printErrorFor('send event'));
      }, 5000);

      client.on('error', function (err) {
          printErrorFor('client')(err);
          if (sendInterval) clearInterval(sendInterval);
          client.close(printErrorFor('client.close'));
      });
  }
});
