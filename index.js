var Service, Characteristic;
var request = require('request');
var colorsys = require( 'colorsys' );


module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  homebridge.registerAccessory("homebridge-sonoff-tasmota-http-h801", "SonoffTasmotaHTTPH801", SonoffTasmotaHTTPH801Accessory);
}

function SonoffTasmotaHTTPH801Accessory(log, config) {
  this.log = log;
  this.config = config;
  this.name = config["name"]
  this.hostname = config["hostname"] || "sonoff";
  this.hsv = {
    h: 0,
    s: 0,
    v: 0
  };
}

SonoffTasmotaHTTPH801Accessory.prototype.setColor = function(hsv) {
  var color = colorsys.hsv_to_hex( hsv );
  color = color.substring(1, color.length);
  var that = this
  request("http://" + this.hostname + "/cm?cmnd=Color " + color, function(error, response, body) {
    if (error) return hsv(error);
    var sonoff_reply = JSON.parse(body); // {"Color":"FF9245"}
    that.log("Sonoff H801: " + that.hostname + " Set Color: " + sonoff_reply.Color);
  })
};

SonoffTasmotaHTTPH801Accessory.prototype.getColor = function(callback) {
  var that = this
  request("http://" + this.hostname + "/cm?cmnd=Color", function(error, response, body) {
        if (error) return callback(error);
    var sonoff_reply = JSON.parse(body); // {"Color":"FF9245"}
    var hsvcolor = colorsys.hex_to_hsv('#'+sonoff_reply.Color);
    that.log("Sonoff H801: " + that.hostname + " Get Color: " + sonoff_reply.Color + '. Parsed color is {h: ' + hsvcolor.h + ', s: ' + hsvcolor.s + ', v: ' + hsvcolor.v + '}');
    callback(error, hsvcolor)
  })
};

SonoffTasmotaHTTPH801Accessory.prototype.getServices = function() {
  var informationService = new Service.AccessoryInformation();
  informationService
    .setCharacteristic(Characteristic.Manufacturer, 'Sonoff Tasmota')
    .setCharacteristic(Characteristic.Model, 'homebridge-sonoff-tasmota-http-h801')
    .setCharacteristic(Characteristic.SerialNumber, 'HTTP Serial Number')

  var bulb = this
  this.service = new Service.Lightbulb(this.name);
  this.service
    .getCharacteristic(Characteristic.On)
    .on( 'get', function( callback ) {
        request("http://" + bulb.hostname + "/cm?cmnd=Power", function(error, response, body) {
          if (error) return callback(error);
          var sonoff_reply = JSON.parse(body); // {"POWER":"ON"}
          bulb.log("Sonoff H801: " + bulb.hostname + ", Get State: " + JSON.stringify(sonoff_reply));
          switch (sonoff_reply["POWER" + bulb.relay]) {
            case "ON":
              callback(null, 1); break;
            case "OFF":
              callback(null, 0); break;
          }
        })
    } )
    .on( 'set', function( value, callback ) {
        var newstate = "%20Off"
        if (value) newstate = "%20On"
        request("http://" + bulb.hostname + "/cm?cmnd=Power" + newstate, function(error, response, body) {
          if (error) return callback(error);
          var sonoff_reply = JSON.parse(body); // {"POWER":"ON"}
          bulb.log("Sonoff HTTP: " + bulb.hostname + ", Set State: " + JSON.stringify(sonoff_reply));
          switch (sonoff_reply["POWER" + bulb.relay]) {
            case "ON":
              callback(); break;
            case "OFF":
              callback(); break;
          }
        })
    } );
  this.service     
    .addCharacteristic(new Characteristic.Brightness())
    .on( 'get', function( callback ) {
      bulb.getColor((err, hsv) => {
        if (err) return callback(err)
        callback( err, hsv.v );
      });
    } )
    .on( 'set', function( value, callback ) {
      bulb.log('Set Characteristic.Brightness to ' + value);
      bulb.hsv.v = value;
      bulb.setColor(bulb.hsv);
      callback();
    } );
  this.service     
    .addCharacteristic(new Characteristic.Hue())
    .on( 'get', function( callback ) {
      bulb.getColor((err, hsv) => {
        if (err) return callback(err)
        callback( err, hsv.h );
      });
    } )
    .on( 'set', function( value, callback ) {
      bulb.log('Set Characteristic.Hue to ' + value);
      bulb.hsv.h = value;
      bulb.setColor(bulb.hsv);
      callback();
    } );
  this.service     
    .addCharacteristic(new Characteristic.Saturation())
    .on( 'get', function( callback ) {
      bulb.getColor((err, hsv) => {
        if (err) return callback(err)
        callback( err, hsv.s );
      });
    } )
    .on( 'set', function( value, callback ) {
      bulb.log('Set Characteristic.Saturation to ' + value);
      bulb.hsv.s = value;
      bulb.setColor(bulb.hsv)
      callback();
    });

  this.log("Sonoff Tasmota HTTP H801 Initialized")

  return [this.service];
}