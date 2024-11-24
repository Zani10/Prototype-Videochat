import React, { useRef, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faVideo, faVideoSlash, faMicrophone, faMicrophoneSlash } from '@fortawesome/free-solid-svg-icons';

const VideoChat = () => {
  const [socket, setSocket] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [isChatStarted, setIsChatStarted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);

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

    const newSocket = io('http://localhost:5001');
    setSocket(newSocket);

    newSocket.on('offer', async (offer) => {
      await handleIncomingOffer(offer, newPeerConnection, newSocket);
    });

    newSocket.on('answer', async (answer) => {
      await newPeerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    });

    newSocket.on('ice-candidate', async (candidate) => {
      try {
        await newPeerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('Error adding received ice candidate', error);
      }
    });

    newSocket.on('user-disconnected', () => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
        remoteVideoRef.current.style.backgroundColor = 'black';
      }

      if (peerConnection) {
        peerConnection.close();
        setPeerConnection(new RTCPeerConnection(iceServers));
      }
    });

    newPeerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        newSocket.emit('ice-candidate', event.candidate);
      }
    };    

    return () => {
      newSocket.close();
      newPeerConnection.close();
    };
  }, []);

  const startChat = async () => {
    setIsChatStarted(true);

    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localStreamRef.current = stream;
    localVideoRef.current.srcObject = stream;

    stream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, stream);
    });

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer', offer);
  };

  const handleIncomingOffer = async (offer, peerConnection, socket) => {
    setIsChatStarted(true);

    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localStreamRef.current = stream;
    localVideoRef.current.srcObject = stream;

    stream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, stream);
    });

    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('answer', answer);
  };

  const endChat = () => {
    setIsChatStarted(false);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localVideoRef.current.srcObject = null;
      remoteVideoRef.current.srcObject = null;
    }
    peerConnection.close();
    setPeerConnection(new RTCPeerConnection()); // Reset peer connection
  };

  const toggleVideo = () => {
    const videoTrack = localStreamRef.current.getTracks().find(track => track.kind === 'video');
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const toggleAudio = () => {
    const audioTrack = localStreamRef.current.getTracks().find(track => track.kind === 'audio');
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
      <h1 className="text-3xl font-bold text-blue-500 mb-8">WebRTC Video Chat</h1>
      <div className="flex flex-wrap gap-8 justify-center items-center w-full max-w-6xl">
        <div className="flex flex-col items-center gap-4">
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full max-w-lg rounded-lg border-4 border-gray-400 shadow-lg"></video>
          <p className="text-lg font-semibold">You</p>
          <div className="flex gap-4">
            <button onClick={toggleVideo} className="w-12 h-12 flex justify-center items-center rounded-full bg-blue-600 hover:bg-blue-800 shadow-lg">
              <FontAwesomeIcon icon={isVideoEnabled ? faVideo : faVideoSlash} className="text-white text-xl" />
            </button>
            <button onClick={toggleAudio} className="w-12 h-12 flex justify-center items-center rounded-full bg-green-600 hover:bg-green-800 shadow-lg">
              <FontAwesomeIcon icon={isAudioEnabled ? faMicrophone : faMicrophoneSlash} className="text-white text-xl" />
            </button>
          </div>
        </div>
        <div className="flex flex-col items-center gap-4">
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full max-w-lg rounded-lg border-4 border-gray-400 shadow-lg bg-black"></video>
          <p className="text-lg font-semibold">Remote User</p>
        </div>
      </div>
      <div className="mt-10">
        {!isChatStarted ? (
          <button onClick={startChat} className="px-8 py-2 text-lg bg-green-600 hover:bg-green-800 rounded-lg shadow-lg">
            Start Video Chat
          </button>
        ) : (
          <button onClick={endChat} className="px-8 py-2 text-lg bg-red-600 hover:bg-red-800 rounded-lg shadow-lg">
            End Chat
          </button>
        )}
      </div>
    </div>
  );
};

export default VideoChat;
