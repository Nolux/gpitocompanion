const osc = require("osc");
const http = require("http");
const WebSocket = require("ws");
const Gpio = require("onoff").Gpio; //include onoff to interact with the GPIO

// Load local settings
const { settings, gpiPorts, gpoPorts } = require("./settings.json");

console.log(settings, gpiPorts, gpoPorts);

const udpPort = new osc.UDPPort({
  localAddress: settings.udpIp,
  localPort: settings.localUdpPort,
  metadata: true,
});
udpPort.open();
udpPort.on("ready", function () {
  console.log("OSC ready");
});

let ports = [];

// Functions

const sendTally = (tallyNumber, on) => {
  // If UDP port not ready do not send tally
  if (!udpPort) {
    return;
  }
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
  );
  console.log(`Tally: ${tallyNumber} ${on ? "ON" : "OFF"}`);
};

// Setup GPI

gpiPorts.map(({ tally, rpiPin, page, button }) => {
  if (!tally) {
    return;
  }

  ports[rpiPin] = { tally };
  ports[rpiPin].status = false;

  // enable pin
  ports[rpiPin].gpi = new Gpio(rpiPin, "in", "both");

  // set watch pin function
  ports[rpiPin].gpi.watch(function (err, value) {
    if (err) {
      //if an error
      console.error("There was an error GPI0", err); //output error message to console
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
  ports[rpiPin] = { tally };
  ports[rpiPin].status = false;

  //ports[rpiPin].gpo = new Gpio(rpiPin, "out"); //enable when needed
});

console.log("Running GPItoOSC");

let unexportOnClose = () => {
  gpiPorts.map(({ rpiPin, tally }) => {
    ports[rpiPin].gpi.unexport(); // Unexport GPI0 to free resources
    sendTally(tally, 0);
  });
  console.log("GPIO cleaned up and OSC-states set off");
  process.exit();
};

process.on("SIGINT", unexportOnClose); //function to run when user closes using ctrl+c