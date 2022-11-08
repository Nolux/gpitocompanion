const dgram = require("dgram");
const TSLServer = require("tslserver");
const Gpio = require("onoff").Gpio; //include onoff to interact with the GPIO

// Load local settings
const { settings, gpiPorts, gpoPorts } = require("./settings.json");

// Load TSL Server
let tslServer = new TSLServer(settings.tslServerPort, {
  udp: settings.tslUDP,
  tcp: settings.tslTCP,
});

// Setup UDP client for companion
const client = dgram.createSocket("udp4");

// Prep local state
let gpi = [];
let gpo = [];

//
// Functions
//

const sendTally = (tallyNumber, on) => {
  // If UDP port not ready do not send tally
  if (!client) {
    return;
  }

  // Send UDP message to companion
  client.send(
    `BANK-${on ? "DOWN" : "UP"} ${settings.page} ${tallyNumber}`,
    settings.remoteUdpPort,
    settings.remoteUdpIp
  );

  console.log(`Tally: ${tallyNumber} ${on ? "ON" : "OFF"}`);
};

const unexportOnClose = () => {
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

//
// Setup GPI
//

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

//
// Setup GPO
//

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

// On termination close all ports/cleanup
process.on("SIGINT", unexportOnClose); //function to run when user closes using ctrl+c
