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
  const peerConnectionRef = useRef({});

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

  const startCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      // Join room with nickname
      if (socket && nickname) {
        socket.emit('join:room', { nickname });
      }
    } catch (error) {
      console.error('Error accessing media devices:', error);
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
    peerConnectionRef.current[userId] = pc;

    // Add local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="w-full max-w-4xl">
        {/* Video container */}
        <div className="flex flex-wrap gap-4 mb-4">
          {/* Local video */}
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-[400px] h-[300px] bg-black rounded-lg object-cover"
          />
          
          {/* Remote videos */}
          {Object.entries(remoteStreams).map(([userId, stream]) => (
            <video
              key={userId}
              ref={el => {
                if (el) el.srcObject = stream;
              }}
              autoPlay
              playsInline
              className="w-[400px] h-[300px] bg-black rounded-lg object-cover"
            />
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center gap-4">
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Enter your nickname"
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          
          <button
            onClick={startCall}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Start Call
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoChat;
