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
  const [pairedUserId, setPairedUserId] = useState(null);
  const [peers, setPeers] = useState({});
  const [remoteStreams, setRemoteStreams] = useState({});

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);

  const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';

  useEffect(() => {
    console.log('Attempting to connect to socket server...');
    const newSocket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('Socket connected successfully!');
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    setSocket(newSocket);

    return () => {
      if (newSocket) {
        newSocket.close();
      }
    };
  }, []);
  

  useEffect(() => {
    if (isChatStarted) {
      const interval = setInterval(() => {
        setWaitingMessage((prev) => (prev.endsWith('...') ? 'Waiting for another user to join' : prev + '.'));
      }, 500);

      return () => clearInterval(interval);
    }
  }, [isChatStarted]);

  const startChat = () => {
    if (!nickname.trim()) return;
    
    if (!socket?.connected) {
      console.error('Socket not connected');
      alert('Connection error. Please try again.');
      return;
    }

    try {
      setIsChatStarted(true);
    } catch (error) {
      console.error('Error starting chat:', error);
      alert('Failed to start chat. Please try again.');
    }
  };

  // handle media setup after chat is started
  useEffect(() => {
    const setupMediaStream = async () => {
      if (!isChatStarted) return;

      try {
        // Get media stream
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        } else {
          console.error('Local video ref not available');
          return;
        }

        if (!peerConnectionRef.current) {
          console.error('PeerConnection not initialized');
          return;
        }

        // Add tracks to peer connection
        stream.getTracks().forEach((track) => {
          console.log('Adding track to peer connection:', track.kind, track.enabled, track.readyState);
          const sender = peerConnectionRef.current.addTrack(track, stream);
          console.log('Track sender created:', sender.track.kind);
        });

        // Join the chat
        socket.emit('join', { nickname });
      } catch (error) {
        console.error('Error accessing media devices:', error);
        setIsChatStarted(false); 
      }
    };

    setupMediaStream();
  }, [isChatStarted, nickname, socket]);

  const handleIncomingOffer = async (offer, peerConnection, socket) => {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('answer', answer);
  };

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
    peerConnectionRef.current = new RTCPeerConnection();
  };

  useEffect(() => {
    if (!socket) return;

    socket.on("user:joined", ({ userId, nickname }) => {
      console.log(`User ${nickname} (${userId}) joined`);
      createPeerConnection(userId, true); // We're the initiator
    });

    socket.on("user:left", ({ userId }) => {
      if (peers[userId]) {
        peers[userId].close();
        const newPeers = { ...peers };
        delete newPeers[userId];
        setPeers(newPeers);
      }
    });

    socket.on("webrtc:offer", async ({ from, offer }) => {
      console.log("Received offer from", from);
      const pc = createPeerConnection(from, false);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("webrtc:answer", { to: from, answer });
    });

    socket.on("webrtc:answer", async ({ from, answer }) => {
      console.log("Received answer from", from);
      const pc = peers[from];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    socket.on("webrtc:ice-candidate", async ({ from, candidate }) => {
      console.log("Received ICE candidate from", from);
      const pc = peers[from];
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });
  }, [socket]);

  const createPeerConnection = (userId, isInitiator) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    // Store the peer connection
    setPeers(prev => ({ ...prev, [userId]: pc }));

    // Add local stream
    localStream.current?.getTracks().forEach(track => {
      pc.addTrack(track, localStream.current);
    });

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("webrtc:ice-candidate", {
          to: userId,
          candidate: event.candidate,
        });
      }
    };

    // Handle incoming streams
    pc.ontrack = (event) => {
      const [stream] = event.streams;
      setRemoteStreams(prev => ({
        ...prev,
        [userId]: stream
      }));
    };

    // If we're the initiator, create and send the offer
    if (isInitiator) {
      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .then(() => {
          socket.emit("webrtc:offer", {
            to: userId,
            offer: pc.localDescription,
          });
        });
    }

    return pc;
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
            onClick={() => {
              console.log('Start button clicked');
              console.log('Socket status:', socket?.connected);
              console.log('Nickname:', nickname);
              startChat();
            }}
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
                onLoadedMetadata={() => {
                  console.log('Remote video metadata loaded');
                  if (remoteVideoRef.current.paused) {
                    remoteVideoRef.current.play().catch(err => {
                      console.error('Error playing remote video on metadata load:', err);
                    });
                  }
                }}
                onPlay={() => console.log('Remote video started playing')}
                onPause={() => console.log('Remote video paused')}
                onError={(e) => console.error('Remote video error:', e)}
              />
              {(!remoteVideoRef.current?.srcObject || !remoteVideoRef.current?.videoWidth) && (
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
          {Object.entries(remoteStreams).map(([userId, stream]) => (
            <video
              key={userId}
              ref={el => {
                if (el) el.srcObject = stream;
              }}
              autoPlay
              playsInline
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default VideoChat;
