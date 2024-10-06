import React, { useRef, useEffect, useState } from 'react';
import io from 'socket.io-client';
import './VideoChat.css';  // Je CSS styling

const VideoChat = () => {
  const [socket, setSocket] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [isChatStarted, setIsChatStarted] = useState(false);  // Nieuwe state voor het starten van de chat
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    const iceServers = {
      iceServers: [
        {
          urls: "stun:stun.l.google.com:19302",
        },
      ],
    };

    const newPeerConnection = new RTCPeerConnection(iceServers);
    setPeerConnection(newPeerConnection);

    newPeerConnection.ontrack = (event) => {
      remoteVideoRef.current.srcObject = event.streams[0];
    };

    setSocket(io('http://localhost:5001'));

    return () => {
      if (socket) socket.close();
      newPeerConnection.close();
    };
  }, []);

  // Dit wordt uitgevoerd als je op de knop klikt
  const startChat = async () => {
    setIsChatStarted(true);  // Chat gestart

    // WebRTC setup
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideoRef.current.srcObject = stream;

    // Voeg lokale stream toe aan peerConnection
    stream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, stream);
    });

    // Wanneer de chat begint, wordt er een offer gecreëerd en verzonden
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer', offer);

    // Signaling handlers
    socket.on('offer', async (offer) => {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socket.emit('answer', answer);
    });

    socket.on('answer', async (answer) => {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on('ice-candidate', async (candidate) => {
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('Error adding received ice candidate', error);
      }
    });

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', event.candidate);
      }
    };
  };

  return (
    <div className="video-chat-container">
      <h1>WebRTC Video Chat</h1>
      <div className="video-wrapper">
        <video ref={localVideoRef} autoPlay playsInline muted className="video"></video>
        <video ref={remoteVideoRef} autoPlay playsInline className="video"></video>
      </div>
      {!isChatStarted && (
        <button onClick={startChat} className="start-button">
          Start Video Chat
        </button>
      )}
    </div>
  );
};

export default VideoChat;
