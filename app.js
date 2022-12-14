const { SerialPort } = require("serialport");
const { ReadlineParser } = require("@serialport/parser-readline");

const dgram = require("dgram");
const TSLServer = require("tslserver");

const express = require("express");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http, {
  cors: {
    origin: "*",
  },
});
const path = require("path");

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
let fallback = settings.fallback;

//
// Functions
//

const sendTally = (
  tallyNumber,
  on,
  page = settings.page,
  button = tallyNumber
) => {
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
  if (settings.debug) {
    consoleLog(`Overpress: ${tallyNumber} ${on ? "ON" : "OFF"}`);
  }
  updateState();
};

const unexportOnClose = () => {
  // Close all incoming ports/send blank tally to all numbers
  gpiPorts.map(({ rpiPin, tallyNumber }) => {
    if (!tallyNumber) {
      return;
    }
    sendTally(tallyNumber, 0);
  });
  console.log("GPIO cleaned up and OSC-states set off");
  process.exit();
};

//
// Setup GPI
//

// SETUP COMS TO SERIAL

const serialport = new SerialPort({
  path: settings.serialPath,
  baudRate: settings.serialBaud,
});

// PARSER FOR SERIAL
const parser = serialport.pipe(new ReadlineParser({ delimiter: "\r\n" }));
parser.on("data", (input) => {
  if (input[0] != "X") {
    input = input.split(" ");
    tallyNumber = input[0];
    value = input[1] === "1";
    if (gpiPorts[tallyNumber - 1]) {
      page = gpiPorts[tallyNumber - 1].page;
      button = gpiPorts[tallyNumber - 1].button;

      sendTally(tallyNumber, value ? true : false, page, button);

      if (!value) {
        let allFalse = false;
        gpi.map((i) => {
          // Check if another GPI is pressed
          if (i.status) {
            allFalse = true;
            // If another Gpi is active send Activate
            sendTally(i.tallyNumber, true, i.page, i.button);
          }
        });
        if (!allFalse && fallback) {
          // revert to fallback

          // Send UDP message to companion
          client.send(
            `BANK-PRESS ${settings.page} ${settings.button}`,
            settings.remoteUdpPort,
            settings.remoteUdpIp
          );
        }
      }
    }
  }
});

gpiPorts.map(({ tallyNumber, rpiPin, page, button }) => {
  // Check if tallyNumber exists, bug caused by index
  if (!tallyNumber) {
    return;
  }

  // Update local state
  gpi[tallyNumber] = { tallyNumber };
  gpi[tallyNumber].status = false;
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

  //gpo[tallyNumber].gpo = new Gpio(rpiPin, "out"); //enable when needed
});

// TSL server actions
tslServer.on("message", ({ address, tally1, tally2, label }) => {
  gpo[address].status = tally2;
  // Trigger output matching address
  if (gpo[address]) {
    // TODO:
    serialport.write(`${address} ${tally2}\n`);
    //gpo[address].gpo.writeSync(tally2);
  }
  if (settings.debug) {
    consoleLog(`Recived Tally: ${address} ${tally2 ? "ON" : "OFF"}`);
  }
  updateState();
});

console.log("Running GPItoOSC");

// On termination close all ports/cleanup
process.on("SIGINT", unexportOnClose); //function to run when user closes using ctrl+c

const updateState = () => {
  io.emit("state", { gpo, gpi, settings, fallback });
};

const consoleLog = (line) => {
  console.log(line);
  io.emit("consolelog", line);
};

// Start webserver
app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, "./frontend/dist", "index.html"));
});

app.get("/fallbackToggle", (req, res) => {
  fallback = !fallback;
  if (settings.debug) {
    consoleLog(`Fallback is: ${fallback}`);
  }
  res.json(fallback);
  updateState();
});

app.use(express.static("frontend/dist"));

//Whenever someone connects this gets executed
io.on("connection", (socket) => {
  console.log("A user connected");

  socket.emit("state", { gpo, gpi, settings });

  //Whenever someone disconnects this piece of code executed
  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});
http.listen(settings.webServerPort, () => {
  console.log("listening on http://localhost:" + settings.webServerPort);
});
