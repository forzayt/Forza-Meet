import { useCallback, useEffect, useRef, useState } from "react";

type ConnectionState = "disconnected" | "connecting" | "connected";

interface SignalingData {
  type: "offer" | "answer" | "ice-candidate";
  username?: string;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

export function useWebRTC(username: string, isCreator: boolean) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const [remoteUsername, setRemoteUsername] = useState<string>("");
  const [signalingData, setSignalingData] = useState<SignalingData | null>(null);
  const [isSignalingComplete, setIsSignalingComplete] = useState(false);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([]);

  const configuration: RTCConfiguration = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  };

  const initializePeerConnection = useCallback(() => {
    const peerConnection = new RTCPeerConnection(configuration);
    peerConnectionRef.current = peerConnection;

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        setSignalingData({
          type: "ice-candidate",
          candidate: event.candidate.toJSON(),
        });
      }
    };

    peerConnection.ontrack = (event) => {
      const [stream] = event.streams;
      setRemoteStream(stream);
    };

    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState;
      if (state === "connected") {
        setConnectionState("connected");
        setIsSignalingComplete(true);
      } else if (state === "connecting") {
        setConnectionState("connecting");
      } else if (state === "disconnected" || state === "failed" || state === "closed") {
        setConnectionState("disconnected");
      }
    };

    return peerConnection;
  }, []);

  const getLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(stream);
      localStreamRef.current = stream;
      return stream;
    } catch (error) {
      console.error("Error accessing media devices:", error);
      throw error;
    }
  }, []);

  const startCall = useCallback(async () => {
    try {
      setConnectionState("connecting");
      const stream = await getLocalStream();
      const peerConnection = initializePeerConnection();

      // Add local stream tracks to peer connection
      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

      if (isCreator) {
        // Creator creates offer
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        setSignalingData({
          type: "offer",
          username,
          offer: offer,
        });
      }
    } catch (error) {
      console.error("Error starting call:", error);
      setConnectionState("disconnected");
    }
  }, [getLocalStream, initializePeerConnection, isCreator, username]);

  const handleSignalingData = useCallback(async (data: SignalingData) => {
    const peerConnection = peerConnectionRef.current;
    if (!peerConnection) return;

    try {
      if (data.type === "offer" && !isCreator) {
        // Joiner receives offer and creates answer
        setRemoteUsername(data.username || "Remote User");
        await peerConnection.setRemoteDescription(data.offer!);

        // Process any queued ICE candidates
        while (iceCandidatesQueue.current.length > 0) {
          const candidate = iceCandidatesQueue.current.shift();
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate!));
        }

        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        setSignalingData({
          type: "answer",
          username,
          answer: answer,
        });
      } else if (data.type === "answer" && isCreator) {
        // Creator receives answer
        setRemoteUsername(data.username || "Remote User");
        await peerConnection.setRemoteDescription(data.answer!);

        // Process any queued ICE candidates
        while (iceCandidatesQueue.current.length > 0) {
          const candidate = iceCandidatesQueue.current.shift();
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate!));
        }
      } else if (data.type === "ice-candidate") {
        // Handle ICE candidates
        if (peerConnection.remoteDescription) {
          await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate!));
        } else {
          // Queue ICE candidates until remote description is set
          iceCandidatesQueue.current.push(data.candidate!);
        }
      }
    } catch (error) {
      console.error("Error handling signaling data:", error);
    }
  }, [isCreator, username]);

  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
      }
    }
  }, []);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
      }
    }
  }, []);

  const hangUp = useCallback(() => {
    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    // Reset state
    setLocalStream(null);
    setRemoteStream(null);
    setConnectionState("disconnected");
    setRemoteUsername("");
    setSignalingData(null);
    setIsSignalingComplete(false);
    iceCandidatesQueue.current = [];
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      hangUp();
    };
  }, [hangUp]);

  return {
    localStream,
    remoteStream,
    connectionState,
    remoteUsername,
    signalingData,
    isSignalingComplete,
    startCall,
    handleSignalingData,
    toggleAudio,
    toggleVideo,
    hangUp,
  };
}