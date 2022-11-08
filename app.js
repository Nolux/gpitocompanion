var osc = require("osc"),
  http = require("http"),
  WebSocket = require("ws");
var Gpio = require("onoff").Gpio; //include onoff to interact with the GPIO
var gpi0 = new Gpio(4, "in", "rising");
var gpi1 = new Gpio(17, "in", "rising");
var gpi2 = new Gpio(27, "in", "both");
var gpi3 = new Gpio(22, "in", "both");
var gpi4 = new Gpio(23, "in", "both");
var gpi5 = new Gpio(24, "in", "both");
var gpi6 = new Gpio(9, "in", "both");
var gpi7 = new Gpio(25, "in", "both");

var GPIO0 = "gpi0";
var GPIO1 = "gpi1";
var GPIO2 = "gpi2";
var GPIO3 = "gpi3";
var GPIO4 = "gpi4";
var GPIO5 = "gpi5";
var GPIO6 = "gpi6";
var GPIO7 = "gpi7";

var udpPort = new osc.UDPPort({
  localAddress: "127.0.0.1",
  localPort: 8010,
  metadata: true,
});
udpPort.open();
udpPort.on("ready", function () {
  console.log("OSC ready");
});

console.log("hello");

function tallyON(tally) {
  udpPort.send(
    {
      address: "/press/bank/10/" + tally,
      args: [
        {
          type: "i",
          value: 1,
        },
      ],
    },
    "127.0.0.1",
    8001
  );
  console.log("Tally: " + tally + " ON");
}

function tallyOFF(tally) {
  udpPort.send(
    {
      address: "/press/bank/10/" + tally,
      args: [
        {
          type: "i",
          value: 0,
        },
      ],
    },
    "127.0.0.1",
    8001
  );
  console.log("Tally: " + tally + " OFF");
}

gpi0.watch(function (err, value) {
  if (err) {
    //if an error
    console.error("There was an error GPI0", err); //output error message to console
    return;
  }
  if (value == 1) {
    tallyOFF(1); //send OSC state ON
    console.log("gpi0 OFF");
  } else {
    tallyON(1); //send OSC state OFF
    console.log("gpi0 ON");
  }
});

gpi1.watch(function (err, value) {
  if (err) {
    //if an error
    console.error("There was an error GPI1", err); //output error message to console
    return;
  }
  if (value == 1) {
    tallyOFF(2); //send OSC state ON
    console.log("gpi1 OFF");
  } else {
    tallyON(2); //send OSC state OFF
    console.log("gpi1 ON");
  }
});

gpi2.watch(function (err, value) {
  if (err) {
    //if an error
    console.error("There was an error GPI2", err); //output error message to console
    return;
  }
  if (value == 1) {
    tallyOFF(3); //send OSC state ON
    console.log("gpi2 OFF");
  } else {
    tallyON(3); //send OSC state OFF
    console.log("gpi2 ON");
  }
});

gpi3.watch(function (err, value) {
  if (err) {
    //if an error
    console.error("There was an error GPI3", err); //output error message to console
    return;
  }
  if (value == 1) {
    tallyOFF(4); //send OSC state ON
    console.log("gpi3 OFF");
  } else {
    tallyON(4); //send OSC state OFF
    console.log("gpi3 ON");
  }
});

gpi4.watch(function (err, value) {
  if (err) {
    //if an error
    console.error("There was an error GPI4", err); //output error message to console
    return;
  }
  if (value == 1) {
    tallyOFF(5); //send OSC state ON
    console.log("gpi4 OFF");
  } else {
    tallyON(5); //send OSC state OFF
    console.log("gpi4 ON");
  }
});

gpi5.watch(function (err, value) {
  if (err) {
    //if an error
    console.error("There was an error GPI5", err); //output error message to console
    return;
  }
  if (value == 1) {
    tallyOFF(6); //send OSC state ON
    console.log("gpi5 OFF");
  } else {
    tallyON(6); //send OSC state OFF
    console.log("gpi5 ON");
  }
});

gpi6.watch(function (err, value) {
  if (err) {
    //if an error
    console.error("There was an error GPI6", err); //output error message to console
    return;
  }
  if (value == 1) {
    tallyOFF(7); //send OSC state ON
    console.log("gpi6 OFF");
  } else {
    tallyON(7); //send OSC state OFF
    console.log("gpi6 ON");
  }
});

gpi7.watch(function (err, value) {
  if (err) {
    //if an error
    console.error("There was an error GPI7", err); //output error message to console
    return;
  }
  if (value == 1) {
    tallyOFF(8); //send OSC state ON
    console.log("gpi7 OFF");
  } else {
    tallyON(8); //send OSC state OFF
    console.log("gpi7 ON");
  }
});

console.log("Running GPItoOSC");

function unexportOnClose() {
  //function to run when exiting program
  gpi0.unexport(); // Unexport GPI0 to free resources
  gpi1.unexport(); // Unexport GPI0 to free resources
  gpi2.unexport(); // Unexport GPI0 to free resources
  gpi3.unexport(); // Unexport GPI0 to free resources
  gpi4.unexport(); // Unexport GPI0 to free resources
  gpi5.unexport(); // Unexport GPI0 to free resources
  gpi6.unexport(); // Unexport GPI0 to free resources
  gpi7.unexport(); // Unexport GPI0 to free resources
  tallyOFF(0);
  tallyOFF(1);
  tallyOFF(2);
  tallyOFF(3);
  tallyOFF(4);
  tallyOFF(5);
  tallyOFF(6);
  tallyOFF(7);
  console.log("GPIO cleaned up and OSC-states set off");
  process.exit();
}

process.on("SIGINT", unexportOnClose); //function to run when user closes using ctrl+c
