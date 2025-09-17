import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ConnectionState = "disconnected" | "connecting" | "connected";

type SignalMessage =
  | { type: "join"; senderId: string; username: string }
  | { type: "leave"; senderId: string }
  | { type: "offer"; senderId: string; targetId: string; sdp: RTCSessionDescriptionInit; username: string }
  | { type: "answer"; senderId: string; targetId: string; sdp: RTCSessionDescriptionInit }
  | { type: "ice-candidate"; senderId: string; targetId: string; candidate: RTCIceCandidateInit }
  | { type: "state"; senderId: string; audioEnabled: boolean; videoEnabled: boolean };

interface RemoteParticipant {
  peerId: string;
  username: string;
  stream: MediaStream | null;
  audioEnabled: boolean;
  videoEnabled: boolean;
}

export function useWebRTC(username: string, roomId: string) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteParticipants, setRemoteParticipants] = useState<RemoteParticipant[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");

  const clientId = useMemo(() => Math.random().toString(36).slice(2), []);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const remoteNamesRef = useRef<Map<string, string>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const localAudioEnabledRef = useRef<boolean>(true);
  const localVideoEnabledRef = useRef<boolean>(true);

  const configuration: RTCConfiguration = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
      { urls: "stun:stun3.l.google.com:19302" },
      { urls: "stun:stun4.l.google.com:19302" },
    ],
    iceCandidatePoolSize: 10,
  };

  const createPeerConnection = useCallback((peerId: string) => {
    const pc = new RTCPeerConnection(configuration);
    peersRef.current.set(peerId, pc);

    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        const message: SignalMessage = {
          type: "ice-candidate",
          senderId: clientId,
          targetId: peerId,
          candidate: event.candidate.toJSON(),
        };
        channelRef.current.postMessage(message);
      }
    };

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (stream) {
        remoteStreamsRef.current.set(peerId, stream);
        setRemoteParticipants((prev) => {
          const name = remoteNamesRef.current.get(peerId) || "";
          const exists = prev.some((p) => p.peerId === peerId);
          const updated = exists
            ? prev.map((p) => (p.peerId === peerId ? { ...p, stream } : p))
            : [...prev, { peerId, username: name, stream, audioEnabled: true, videoEnabled: true }];
          return updated;
        });
      }
    };

    pc.onconnectionstatechange = () => {
      const states = Array.from(peersRef.current.values()).map((p) => p.connectionState);
      if (states.some((s) => s === "connected")) setConnectionState("connected");
      else if (states.some((s) => s === "connecting" || s === "new")) setConnectionState("connecting");
      else setConnectionState("disconnected");
    };

    // Add local tracks to this connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current!));
    }

    return pc;
  }, [clientId]);

  const getLocalStream = useCallback(async () => {
    try {
      console.log("Requesting media access...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
      });
      console.log("Local stream obtained:", stream.getTracks());
      setLocalStream(stream);
      localStreamRef.current = stream;
      return stream;
    } catch (error) {
      console.error("Error accessing media devices:", error);
      setConnectionState("disconnected");
      throw error;
    }
  }, []);

  const startCall = useCallback(async () => {
    try {
      setConnectionState("connecting");
      const stream = await getLocalStream();
      // Open signaling channel for this room
      const channel = new BroadcastChannel(`forza-meet:${roomId}`);
      channelRef.current = channel;

      const handleMessage = async (event: MessageEvent<SignalMessage>) => {
        const msg = event.data;
        if (!msg || ("senderId" in msg && msg.senderId === clientId)) return;

        switch (msg.type) {
          case "join": {
            // A new peer joined: create offer to them
            remoteNamesRef.current.set(msg.senderId, msg.username);
            setRemoteParticipants((prev) => {
              if (prev.some((p) => p.peerId === msg.senderId)) return prev;
              return [
                ...prev,
                {
                  peerId: msg.senderId,
                  username: msg.username,
                  stream: remoteStreamsRef.current.get(msg.senderId) || null,
                  audioEnabled: true,
                  videoEnabled: true,
                },
              ];
            });
            const pc = createPeerConnection(msg.senderId);
            const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
            await pc.setLocalDescription(offer);
            channel.postMessage({ type: "offer", senderId: clientId, targetId: msg.senderId, sdp: offer, username } as SignalMessage);
            // Send our current state
            channel.postMessage({ type: "state", senderId: clientId, audioEnabled: localAudioEnabledRef.current, videoEnabled: localVideoEnabledRef.current } as SignalMessage);
            break;
          }
          case "offer": {
            if (msg.targetId !== clientId) break;
            remoteNamesRef.current.set(msg.senderId, msg.username);
            setRemoteParticipants((prev) => {
              if (prev.some((p) => p.peerId === msg.senderId)) return prev;
              return [
                ...prev,
                {
                  peerId: msg.senderId,
                  username: msg.username,
                  stream: remoteStreamsRef.current.get(msg.senderId) || null,
                  audioEnabled: true,
                  videoEnabled: true,
                },
              ];
            });
            const pc = createPeerConnection(msg.senderId);
            await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            channel.postMessage({ type: "answer", senderId: clientId, targetId: msg.senderId, sdp: answer } as SignalMessage);
            // Send our current state
            channel.postMessage({ type: "state", senderId: clientId, audioEnabled: localAudioEnabledRef.current, videoEnabled: localVideoEnabledRef.current } as SignalMessage);
            break;
          }
          case "answer": {
            if (msg.targetId !== clientId) break;
            const pc = peersRef.current.get(msg.senderId);
            if (pc) {
              await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
            }
            break;
          }
          case "ice-candidate": {
            if (msg.targetId !== clientId) break;
            const pc = peersRef.current.get(msg.senderId);
            if (pc && msg.candidate) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
              } catch (e) {
                console.error("Error adding ICE candidate", e);
              }
            }
            break;
          }
          case "state": {
            setRemoteParticipants((prev) =>
              prev.map((p) => (p.peerId === msg.senderId ? { ...p, audioEnabled: msg.audioEnabled, videoEnabled: msg.videoEnabled } : p)),
            );
            break;
          }
          case "leave": {
            const pc = peersRef.current.get(msg.senderId);
            if (pc) pc.close();
            peersRef.current.delete(msg.senderId);
            remoteStreamsRef.current.delete(msg.senderId);
            remoteNamesRef.current.delete(msg.senderId);
            setRemoteParticipants((prev) => prev.filter((p) => p.peerId !== msg.senderId));
            break;
          }
        }
      };

      channel.addEventListener("message", handleMessage as EventListener);

      // Announce presence
      channel.postMessage({ type: "join", senderId: clientId, username } as SignalMessage);
      // Also immediately publish our current state
      channel.postMessage({ type: "state", senderId: clientId, audioEnabled: localAudioEnabledRef.current, videoEnabled: localVideoEnabledRef.current } as SignalMessage);

      // Cleanup listener on unmount/leave handled in hangUp
    } catch (error) {
      console.error("Error starting call:", error);
      setConnectionState("disconnected");
    }
  }, [clientId, createPeerConnection, getLocalStream, roomId, username]);

  // No external signaling handler needed; handled via BroadcastChannel

  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        localAudioEnabledRef.current = audioTrack.enabled;
        if (channelRef.current) {
          channelRef.current.postMessage({
            type: "state",
            senderId: clientId,
            audioEnabled: localAudioEnabledRef.current,
            videoEnabled: localVideoEnabledRef.current,
          } as SignalMessage);
        }
      }
    }
  }, []);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        localVideoEnabledRef.current = videoTrack.enabled;
        if (channelRef.current) {
          channelRef.current.postMessage({
            type: "state",
            senderId: clientId,
            audioEnabled: localAudioEnabledRef.current,
            videoEnabled: localVideoEnabledRef.current,
          } as SignalMessage);
        }
      }
    }
  }, []);

  const hangUp = useCallback(() => {
    // Notify others
    if (channelRef.current) {
      channelRef.current.postMessage({ type: "leave", senderId: clientId } as SignalMessage);
      channelRef.current.close();
      channelRef.current = null;
    }

    // Close all peer connections
    peersRef.current.forEach((pc) => pc.close());
    peersRef.current.clear();

    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    // Reset state
    setLocalStream(null);
    setRemoteParticipants([]);
    setConnectionState("disconnected");
    remoteStreamsRef.current.clear();
    remoteNamesRef.current.clear();
  }, [clientId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      hangUp();
    };
  }, [hangUp]);

  return {
    localStream,
    remoteParticipants,
    connectionState,
    startCall,
    toggleAudio,
    toggleVideo,
    hangUp,
  };
}