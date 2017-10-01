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

  var informationService = new Service.AccessoryInformation();
  informationService
    .setCharacteristic(Characteristic.Manufacturer, 'Sonoff Tasmota')
    .setCharacteristic(Characteristic.Model, 'homebridge-sonoff-tasmota-http-h801')
    .setCharacteristic(Characteristic.SerialNumber, 'HTTP Serial Number')

  var bulb = this
  this.service = new Service.Lightbulb(this.name);
  this.service
    .getCharacteristic(Characteristic.On)
    .on('get', this.getState.bind(this))
    .on('set', this.setState.bind(this));
  this.service     
    .addCharacteristic(new Characteristic.Brightness())
    .on('get', this.getBrightness.bind(this))
    .on('set', this.setBrightness.bind(this))
  this.service     
    .addCharacteristic(new Characteristic.Hue())
    .on( 'get', function( callback ) {
      bulb.getColor((err, hsv) => {
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
        callback( err, hsv.s );
      });
    } )
    .on( 'set', function( value, callback ) {
      bulb.log('Set Characteristic.Saturation to ' + value);
      bulb.hsv.s = value;
      bulb.setColor(bulb.hsv);
      callback();
    } );

  this.log("Sonoff Tasmota HTTP H801 Initialized")
}

SonoffTasmotaHTTPH801Accessory.prototype.setColor = function(hsv, callback) {
  var color = colorsys.hsv_to_hex( hsv );
  color = color.substring(1, color.length);
  var that = this
  request("http://" + this.hostname + "/cm?cmnd=Color " + color, function(error, response, body) {
    if (error) return callback(error);
  	var lines = body.split("=");
  	var jsonreply = JSON.parse(lines[1])
  	that.log("Sonoff RGB: " + that.hostname + " Set Color: " + jsonreply.Color);
  	callback(null, jsonreply.Color)
  })
};

SonoffTasmotaHTTPH801Accessory.prototype.getColor = function(callback) {
  var that = this
  request("http://" + this.hostname + "/cm?cmnd=Color", function(error, response, body) {
  	var lines = body.split("=");
  	var jsonreply = JSON.parse(lines[1])
    var hsvcolor = colorsys.hex_to_hsv('#'+jsonreply.Color);
    that.log("Sonoff RGB: " + that.hostname + " Get Color: " + jsonreply.Color + '. Parsed color is {h: ' + hsvcolor.h + ', s: ' + hsvcolor.s + ', v: ' + hsvcolor.v + '}');
  	callback(error, hsvcolor)
  })
};


SonoffTasmotaHTTPH801Accessory.prototype.getState = function(callback) {
  var that = this
  request("http://" + this.hostname + "/cm?cmnd=Power", function(error, response, body) {
    if (error) return callback(error);
  	var lines = body.split("\n");
  	that.log("Sonoff LED: " + that.hostname + " Get State: " + lines[1]);
  	if (lines[1] == "POWER = OFF") callback(null, 0)
  	else if (lines[1] == "POWER = ON") callback(null, 1)
  })
}

SonoffTasmotaHTTPH801Accessory.prototype.setState = function(toggle, callback) {
  var newstate = "%20Off"
  if (toggle) newstate = "%20On"
  var that = this
  request("http://" + this.hostname + "/cm?cmnd=Power" + newstate, function(error, response, body) {
    if (error) return callback(error);
  	var lines = body.split("\n");
  	that.log("Sonoff LED: " + that.hostname + " Set State to: " + lines[1]);
  	if (lines[1] == "POWER = OFF") callback()
  	else if (lines[1] == "POWER = ON") callback()
  })
}

SonoffTasmotaHTTPH801Accessory.prototype.getBrightness = function(callback) {
  var that = this
  request("http://" + this.hostname + "/cm?cmnd=Dimmer", function(error, response, body) {
    if (error) return callback(error);
  	var lines = body.split("=");
  	var jsonreply = JSON.parse(lines[1])
  	that.log("Sonoff LED: " + that.hostname + " Get Brightness: " + jsonreply.Dimmer);
  	callback(null, jsonreply.Dimmer)
  })
}

SonoffTasmotaHTTPH801Accessory.prototype.setBrightness = function(brightness, callback) {
  var that = this
  request("http://" + this.hostname + "/cm?cmnd=Dimmer%20" + brightness, function(error, response, body) {
    if (error) return callback(error);
  	var lines = body.split("=");
  	var jsonreply = JSON.parse(lines[1])
  	that.log("Sonoff LED: " + that.hostname + " Set Brightness to: " + jsonreply.Dimmer);
  	if (jsonreply.Dimmer == brightness) callback()
  	else { 
  	  that.log("Sonoff LED: " + that.hostname + " ERROR Setting Brightness to: " + brightness) 
  	  callback()
  	}
  })
}

SonoffTasmotaHTTPH801Accessory.prototype.getServices = function() {
  return [this.service];
}
