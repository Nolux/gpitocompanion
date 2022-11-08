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

const sendTally = (
  tallyNumber,
  on,
  page = settings.page,
  button = tallyNumber
) => {
  console.log(button, tallyNumber);
  // If UDP port not ready do not send tally
  if (!client) {
    return;
  }

  // Send UDP message to companion
  client.send(
    `BANK-${on ? "DOWN" : "UP"} ${page} ${button}`,
    settings.remoteUdpPort,
    settings.remoteUdpIp
  );

  gpi[tallyNumber].status = on; // For future use

  console.log(`Tally: ${tallyNumber} ${on ? "ON" : "OFF"}`);
};

const unexportOnClose = () => {
  // Close all incoming ports/send blank tally to all numbers
  gpiPorts.map(({ rpiPin, tallyNumber }) => {
    if (!tallyNumber) {
      return;
    }
    gpi[tallyNumber].gpi.unexport(); // Unexport GPI0 to free resources
    sendTally(tallyNumber, 0);
  });
  console.log("GPIO cleaned up and OSC-states set off");
  process.exit();
};

//
// Setup GPI
//

gpiPorts.map(({ tallyNumber, rpiPin, page, button }) => {
  // Check if tallyNumber exists, bug caused by index
  if (!tallyNumber) {
    return;
  }

  // Update local state
  gpi[tallyNumber] = { tallyNumber };
  gpi[tallyNumber].status = false;

  // Enable pin
  gpi[tallyNumber].gpi = new Gpio(rpiPin, "in", "both");

  // Setup watch pin function
  gpi[tallyNumber].gpi.watch(function (err, value) {
    if (err) {
      //if an error
      console.error(`There was an error GPI${rpiPin} ${err}`); //output error message to console
      return;
    }
    sendTally(tallyNumber, value, page, button);
  });
});

//
// Setup GPO
//

gpoPorts.map(({ tallyNumber, rpiPin }) => {
  if (!tallyNumber) {
    return;
  }
  gpo[tallyNumber] = { tallyNumber };
  gpo[tallyNumber].status = false;

  gpo[tallyNumber].gpo = new Gpio(rpiPin, "out"); //enable when needed
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
