// Load required modules
//const http = require("http");                 // http server core module
var https	= require("https"); // https functionality
var fs		= require("fs"); // file system 
const path = require("path");
const express = require("express");           // web framework external module
const socketIo = require("socket.io");        // web socket external module
const easyrtc = require("open-easyrtc");      // EasyRTC external module

//easyrtc.setOption("logLevel", "debug");

// Set process name
process.title = "networked-aframe-server_ssl";

// Get port or default to 8443
const port = process.env.PORT || 8443;

// Setup and configure Express https server.
const app = express();
app.use(express.static(path.resolve(__dirname, "..", "examples")));
//app.use(express.static(path.resolve(__dirname, "..", "dist")));
app.use("/dist", express.static(path.resolve(__dirname, "..", "dist")));

// Serve the example and build the bundle in development.
if (process.env.NODE_ENV === "development") {
  const webpackMiddleware = require("webpack-dev-middleware");
  const webpack = require("webpack");
  const config = require("../webpack.config");

  app.use(
    webpackMiddleware(webpack(config), {
      publicPath: "/"
    })
  );
}

// Start Express https server
const webServer = https.createServer({
	key:  fs.readFileSync("/etc/letsencrypt/live/5gwebar.5gear.net/privkey.pem"),
    	cert: fs.readFileSync("/etc/letsencrypt/live/5gwebar.5gear.net/cert.pem")	
}, app);

// Start Socket.io so it attaches itself to Express server
const socketServer = socketIo.listen(webServer, {"log level": 1});
const myIceServers = [
  {"urls":"stun:stun1.l.google.com:19302"},
  {"urls":"stun:stun2.l.google.com:19302"},
  // {
  //   "urls":"turn:[ADDRESS]:[PORT]",
  //   "username":"[USERNAME]",
  //   "credential":"[CREDENTIAL]"
  // },
  // {
  //   "urls":"turn:[ADDRESS]:[PORT][?transport=tcp]",
  //   "username":"[USERNAME]",
  //   "credential":"[CREDENTIAL]"
  // }
];
easyrtc.setOption("appIceServers", myIceServers);
easyrtc.setOption("logLevel", "debug");
easyrtc.setOption("demosEnable", true);

// Overriding the default easyrtcAuth listener, only so we can directly access its callback
easyrtc.events.on("easyrtcAuth", (socket, easyrtcid, msg, socketCallback, callback) => {
    easyrtc.events.defaultListeners.easyrtcAuth(socket, easyrtcid, msg, socketCallback, (err, connectionObj) => {
        if (err || !msg.msgData || !msg.msgData.credential || !connectionObj) {
            callback(err, connectionObj);
            return;
        }

        connectionObj.setField("credential", msg.msgData.credential, {"isShared":false});

        console.log("["+easyrtcid+"] Credential saved!", connectionObj.getFieldValueSync("credential"));

        callback(err, connectionObj);
    });
});

// To test, lets print the credential to the console for every room join!
easyrtc.events.on("roomJoin", (connectionObj, roomName, roomParameter, callback) => {
    console.log("["+connectionObj.getEasyrtcid()+"] Credential retrieved!", connectionObj.getFieldValueSync("credential"));
    easyrtc.events.defaultListeners.roomJoin(connectionObj, roomName, roomParameter, callback);
});

// Start EasyRTC server
easyrtc.listen(app, socketServer, null, (err, rtcRef) => {
    console.log("Initiated");

    rtcRef.events.on("roomCreate", (appObj, creatorConnectionObj, roomName, roomOptions, callback) => {
        console.log("roomCreate fired! Trying to create: " + roomName);

        appObj.events.defaultListeners.roomCreate(appObj, creatorConnectionObj, roomName, roomOptions, callback);
    });
});

// Listen on port
webServer.listen(port, () => {
    console.log("listening on http://localhost:" + port);
});
