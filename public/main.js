// const { Twilio } = require("twilio");

const submitBtn = document.querySelector(".btn");
const form = document.getElementById("room-name-form");
const ParticipantNameInput = document.getElementById("participant-input");
const roomNameInput = document.getElementById("roomName-input");
const container = document.getElementById("video-container");

//starting a room
const startRoom = async (event) => {
  //prevent a page reload when a user submits the form
  event.preventDefault();
  //hide the join form
  form.classList.add("hidden");
  //retrieve the room name
  const roomName = roomNameInput.value;
  const participantName = ParticipantNameInput.value;
  //fetch an Access Token from the join-room route
  const response = await fetch("/join-room", {
    method: "POST",
    headers: {
      Accept: "aaplication/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      roomName: roomName,
    }),
  });
  const { token } = await response.json();
  console.log(token);
  //join the video room with the token
  const room = await joinVideoRoom(roomName, token);
  console.log(room);
  //render the local and remote participants video and audio tracks
  handleConnectedParticipant(room.localParticipant);
  room.participants.forEach(handleConnectedParticipant);
  room.on("participantConnected", handleConnectedParticipant);

  //handle cleanup when a participant disconnects
  room.on("participantDisconnected", handleDisconnectedParticipant);
  //handle disconnect when user closes webbrowser
  window.addEventListener("pagehide", () => room.disconnect());
  window.addEventListener("beforeunload", () => room.disconnect());
};

const joinVideoRoom = async (roomName, token) => {
  //join the video room with the Access Tokn and the given room name
  const room = await Twilio.Video.connect(token, {
    room: roomName,
    maxAverageBitrate: 16000,
    networkQuality: {
      local: 3, // LocalParticipant's Network Quality verbosity [1 - 3]
      remote: 3, // RemoteParticipants' Network Quality verbosity [1 - 3]
    },
  });
  return room;
};

const handleConnectedParticipant = (participant) => {
  //create a div for this participants tracks
  const participantDiv = document.createElement("div");
  participantDiv.setAttribute("id", participant.identity);
  container.appendChild(participantDiv);

  //iterate through the participants published tracks
  //call 'handleTrackPublication' on them
  participant.tracks.forEach((trackPublication) => {
    handleTrackPublication(trackPublication, participant);
  });

  //listen for any new track publications
  participant.on("trackPublished", handleTrackPublication);
};

const handleTrackPublication = (trackPublication, participant) => {
  function displayTrack(track) {
    //apend this track to the participants div and render it on the page
    const participantDiv = document.getElementById(participant.identity);
    participantDiv.setAttribute("class", "participant-window");
    //track.attach created an HTMLVideoElement or HTMLAudioElement
    //(depending on the type of track) and adds the video or audio stream
    participantDiv.append(track.attach());
  }
  //check if the trackPublication contains a 'track' attritube. If it does,
  //we are subscribed to this track. If not, we are nt subscribed.
  if (trackPublication.track) {
    displayTrack(trackPublication.track);
  }

  //listen for any new subscriptions to this track publication
  trackPublication.on("subscribed", displayTrack);
};

const handleDisconnectedParticipant = (participant) => {
  //stop listening for this participant
  participant.removeAllListeners();
  //remove this participants div from the page
  const participantDiv = document.getElementById(participant.identity);
  participantDiv.remove();
};

submitBtn.addEventListener("click", startRoom);
