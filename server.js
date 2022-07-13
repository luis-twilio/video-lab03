"use strict";

require("dotenv").config();
const { v4: uuid4 } = require("uuid");
const AccessToken = require("twilio").jwt.AccessToken;
const VideoGrant = AccessToken.VideoGrant;
const express = require("express");
const app = express();
const port = 5000;

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_API_KEY;
const authSecrete = process.env.TWILIO_API_SECRET;

//use the express JSON middleware
app.use(express.json());

//create the twilio client
const twilioClient = require("twilio")(authToken, authSecrete, {
  accountSid: accountSid,
});

//create a room
const createRoom = async (roomName) => {
  try {
    //if the room exists, continue.
    await twilioClient.video.rooms(roomName).fetch();
    //If the room doesnt exist, this iwlltrigger error 20404. Not Found
    //https://www.twilio.com/docs/api/errors/20404
  } catch (error) {
    if (error.code == 20404) {
      await twilioClient.video.rooms
        .create({
          uniqueName: roomName,
          type: "group",
          recordParticipantsOnConnect: true,
        })
        .then((room) => {
          console.log(room);
        });
    } else {
      //show any other errors
      throw error;
    }
  }
};

const getAccessToken = (roomName, participantName = uuid4()) => {
  //create an access token
  const token = new AccessToken(accountSid, authToken, authSecrete, {
    identity: participantName,
  });

  //create a video grant
  const videoGrant = new VideoGrant({ room: roomName });

  //add the video grant to the token
  token.addGrant(videoGrant);

  console.log(`Generating Token: ${token.toJwt()}`);

  return token.toJwt();
};

//start the express server
app.listen(port, () => {
  console.log(`Started Express server on port ${port}`);
});

app.post("/join-room", async (req, res) => {
  //return a 400 error code if the request has an empty body or no roomName.
  if (!req.body || !req.body.roomName) {
    return res.status(400).send("Must include roomName argument.");
  }
  const roomName = req.body.roomName;

  //create room with given roomName, or verify if it already exists
  createRoom(roomName);

  //generate an access token for the requestor with no identity specified
  const token = getAccessToken(roomName);

  //send the token back to frontend
  res.send({ token: token });
});

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile("public/index.html");
});
