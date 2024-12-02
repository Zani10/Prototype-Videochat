import React, { useRef, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faVideo, faVideoSlash, faMicrophone, faMicrophoneSlash, faPhone } from '@fortawesome/free-solid-svg-icons';

const VideoChat = () => {
  const [nickname, setNickname] = useState('');
  const [isChatStarted, setIsChatStarted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [waitingMessage, setWaitingMessage] = useState('Waiting for another user to join');
  const [socket, setSocket] = useState(null);
  const [stream, setStream] = useState(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);

  const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';
  // const SOCKET_URL = 'http://localhost:5001';

  useEffect(() => {
    const newSocket = io(SOCKET_URL);

    newSocket.on('connect', () => {
      console.log('Connected to socket server');
    });

    newSocket.on('user:joined', async ({ userId }) => {
      console.log('User joined:', userId);
      if (peerConnectionRef.current) {
        const offer = await peerConnectionRef.current.createOffer();
        await peerConnectionRef.current.setLocalDescription(offer);
        newSocket.emit('offer', { to: userId, offer });
      }
    });

    newSocket.on('offer', async ({ from, offer }) => {
      console.log('Received offer from:', from);
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);
      newSocket.emit('answer', { to: from, answer });
    });

    newSocket.on('answer', async ({ from, answer }) => {
      console.log('Received answer from:', from);
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
    });

    setSocket(newSocket);

    return () => newSocket.disconnect();
  }, []);

  useEffect(() => {
    if (isChatStarted) {
      const interval = setInterval(() => {
        setWaitingMessage((prev) => (prev.endsWith('...') ? 'Waiting for another user to join' : prev + '.'));
      }, 500);

      return () => clearInterval(interval);
    }
  }, [isChatStarted]);

  const createPeerConnection = async (userId, isInitiator) => {
    try {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current);
        });
      }

      pc.ontrack = (event) => {
        console.log('Received remote stream');
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('Sending ICE candidate');
          socket.emit('ice-candidate', {
            to: userId,
            candidate: event.candidate
          });
        }
      };

      peerConnectionRef.current = pc;

      if (isInitiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('offer', {
          to: userId,
          offer: offer
        });
      }

      return pc;
    } catch (err) {
      console.error('Error creating peer connection:', err);
    }
  };

  const initializeMedia = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      setStream(mediaStream);
      localStreamRef.current = mediaStream;
      return mediaStream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  };

  const startChat = async () => {
    if (!nickname.trim()) return;

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      localStreamRef.current = mediaStream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = mediaStream;
      }

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      // Add local stream to peer connection
      mediaStream.getTracks().forEach(track => {
        pc.addTrack(track, mediaStream);
      });

      // Safe way to handle remote stream
      pc.ontrack = (event) => {
        console.log('Received remote track:', event.streams[0]);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      peerConnectionRef.current = pc;
      socket.emit('join', { nickname });
      setIsChatStarted(true);

    } catch (error) {
      console.error('Error:', error);
      alert('Could not access camera/microphone');
    }
  };

  useEffect(() => {
    if (isChatStarted && stream && localVideoRef.current) {
      console.log('Setting up video element');
      localVideoRef.current.srcObject = stream;
    }
  }, [isChatStarted, stream]);

  useEffect(() => {
    if (isChatStarted && stream) {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      pc.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      peerConnectionRef.current = pc;
    }
  }, [isChatStarted, stream]);

  const toggleVideo = () => {
    const videoTrack = localStreamRef.current.getTracks().find((track) => track.kind === 'video');
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const toggleAudio = () => {
    const audioTrack = localStreamRef.current.getTracks().find((track) => track.kind === 'audio');
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  const endCall = () => {
    setIsChatStarted(false);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localVideoRef.current.srcObject = null;
      remoteVideoRef.current.srcObject = null;
    }
    peerConnectionRef.current.close();
    peerConnectionRef.current = null;
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
      {!isChatStarted ? (
        <div className="text-center">
          <h1 className="text-4xl font-bold text-blue-500 mb-6">StreamConnect</h1>
          <input
            type="text"
            placeholder="Enter your nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="p-2 text-black rounded w-80 mb-4"
          />
          <button
            onClick={startChat}
            disabled={!nickname.trim()}
            className={`px-6 py-2 rounded-lg font-semibold ${
              nickname.trim() ? 'bg-green-500 hover:bg-green-700' : 'bg-gray-500 cursor-not-allowed'
            }`}
          >
            Start Call
          </button>
        </div>
      ) : (
        <div className="w-full h-full flex flex-col">
          <div className="flex-1 flex">
            <div className="flex-1 bg-black flex flex-col items-center justify-center relative">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <p className="absolute top-2 left-2 text-lg font-semibold bg-black bg-opacity-50 px-2 py-1 rounded">
                {nickname}
              </p>
            </div>
            <div className="flex-1 bg-gray-800 flex items-center justify-center relative">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              {(!remoteVideoRef.current?.srcObject) && (
                <p className="absolute text-xl font-semibold text-gray-300">{waitingMessage}</p>
              )}
            </div>
          </div>
          <div className="w-full bg-gray-700 flex items-center justify-center gap-4 py-3">
            <button
              onClick={toggleVideo}
              className="w-12 h-12 flex justify-center items-center rounded-full bg-blue-600 hover:bg-blue-800"
            >
              <FontAwesomeIcon icon={isVideoEnabled ? faVideo : faVideoSlash} className="text-white text-xl" />
            </button>
            <button
              onClick={toggleAudio}
              className="w-12 h-12 flex justify-center items-center rounded-full bg-green-600 hover:bg-green-800"
            >
              <FontAwesomeIcon icon={isAudioEnabled ? faMicrophone : faMicrophoneSlash} className="text-white text-xl" />
            </button>
            <button
              onClick={endCall}
              className="w-12 h-12 flex justify-center items-center rounded-full bg-red-600 hover:bg-red-800"
            >
              <FontAwesomeIcon icon={faPhone} className="text-white text-xl" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoChat;
