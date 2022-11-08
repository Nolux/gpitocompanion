const osc = require("osc");
const http = require("http");
const WebSocket = require("ws");
const dgram = require("dgram");
const TSLServer = require("tslserver");
const Gpio = require("onoff").Gpio; //include onoff to interact with the GPIO

// Load local settings
const { settings, gpiPorts, gpoPorts } = require("./settings.json");

let tslServer = new TSLServer(settings.tslServerPort, {
  udp: settings.tslUDP,
  tcp: settings.tslTCP,
});

var client = dgram.createSocket("udp4");

/*
const udpPort = new osc.UDPPort({
  localAddress: settings.udpIp,
  localPort: settings.localUdpPort,
  metadata: true,
});
udpPort.open();
udpPort.on("ready", function () {
  console.log("OSC ready");
});
*/

client.send("BANK-PRESS 10 1", "8009", "10.0.10.15");

let gpi = [];
let gpo = [];

// Functions

const sendTally = (tallyNumber, on) => {
  // If UDP port not ready do not send tally
  if (!client) {
    return;
  }
  console.log(`BANK-${on ? "DOWN" : "UP"} ${settings.page} ${tallyNumber}`);
  client.send(
    `BANK-${on ? "DOWN" : "UP"} ${settings.page} ${tallyNumber}`,
    settings.remoteUdpPort,
    settings.remoteUdpIp
  );
  /*
  udpPort.send(
    {
      address: `/press/bank/${settings.page}/${tallyNumber}`,
      args: [
        {
          type: "i",
          value: on ? 1 : 0,
        },
      ],
    },
    settings.udpIp,
    settings.udpPort
  );*/
  console.log(`Tally: ${tallyNumber} ${on ? "ON" : "OFF"}`);
};

// Setup GPI

gpiPorts.map(({ tally, rpiPin, page, button }) => {
  if (!tally) {
    return;
  }

  gpi[tally] = { tally };
  gpi[tally].status = false;

  // enable pin
  gpi[tally].gpi = new Gpio(rpiPin, "in", "both");

  // set watch pin function
  gpi[tally].gpi.watch(function (err, value) {
    if (err) {
      //if an error
      console.error(`There was an error GPI${rpiPin} ${err}`); //output error message to console
      return;
    }
    sendTally(tally, value);
  });
});

// Setup GPO

gpoPorts.map(({ tally, rpiPin }) => {
  if (!tally) {
    return;
  }
  gpo[tally] = { tally };
  gpo[tally].status = false;

  gpo[tally].gpo = new Gpio(rpiPin, "out"); //enable when needed
});

// TSL server actions
tslServer.on("message", ({ address, tally1, tally2, label }) => {
  // Trigger output matching address
  if (gpo[address]) {
    gpo[address].gpo.writeSync(tally2);
  }
});

console.log("Running GPItoOSC");

let unexportOnClose = () => {
  gpiPorts.map(({ rpiPin, tally }) => {
    if (!tally) {
      return;
    }
    gpi[tally].gpi.unexport(); // Unexport GPI0 to free resources
    sendTally(tally, 0);
  });
  console.log("GPIO cleaned up and OSC-states set off");
  process.exit();
};

process.on("SIGINT", unexportOnClose); //function to run when user closes using ctrl+c
