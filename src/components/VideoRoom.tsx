import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  PhoneOff, 
  Copy,
  Users,
  Wifi,
  WifiOff
} from "lucide-react";
import { useWebRTC } from "@/hooks/useWebRTC";
import ChatDrawer from "./ChatDrawer";

interface VideoRoomProps {
  username: string;
  roomId: string;
  isCreator: boolean; // kept for compatibility with parent, not used here
  onLeaveRoom: () => void;
}

export default function VideoRoom({ username, roomId, onLeaveRoom }: VideoRoomProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const { toast } = useToast();

  const {
    localStream,
    remoteParticipants,
    connectionState,
    startCall,
    toggleAudio,
    toggleVideo,
    hangUp
  } = useWebRTC(username, roomId);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // No single remote video ref; each participant manages its own video element

  useEffect(() => {
    startCall();
  }, [startCall]);

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      toast({ title: "Copied", description: "Room ID copied to clipboard." });
    } catch (err) {
      console.error("Failed to copy room ID:", err);
      toast({ title: "Copy failed", description: "Could not copy Room ID.", variant: "destructive" as any });
    }
  };

  const handleToggleAudio = () => {
    toggleAudio();
    setIsAudioEnabled(!isAudioEnabled);
  };

  const handleToggleVideo = () => {
    toggleVideo();
    setIsVideoEnabled(!isVideoEnabled);
  };

  const handleLeaveRoom = () => {
    hangUp();
    onLeaveRoom();
  };

  const getStatusColor = () => {
    switch (connectionState) {
      case "connected": return "bg-success";
      case "connecting": return "bg-warning";
      case "disconnected": return "bg-destructive";
      default: return "bg-muted";
    }
  };

  const getStatusIcon = () => {
    return connectionState === "connected" ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />;
  };

  // Build unified tiles array: local first, then remotes
  const tiles = [
    {
      id: "local",
      stream: localStream as MediaStream | null,
      name: `You (${username})`,
      videoEnabled: isVideoEnabled,
      audioEnabled: isAudioEnabled,
      isLocal: true,
    },
    ...remoteParticipants.map((p) => ({
      id: p.peerId,
      stream: p.stream,
      name: p.username || "Participant",
      videoEnabled: p.videoEnabled,
      audioEnabled: p.audioEnabled,
      isLocal: false,
    })),
  ];

  const colsClass = (() => {
    const n = tiles.length;
    if (n <= 1) return "grid-cols-1";
    if (n === 2) return "grid-cols-1 sm:grid-cols-2";
    return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
  })();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-accent to-primary p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-white" />
              <span className="text-white font-medium">Room: {roomId}</span>
              <Button
                onClick={copyRoomId}
                variant="ghost"
                size="sm"
                className="text-white/70 hover:text-white hover:bg-white/10"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <Badge className={`${getStatusColor()} text-white border-0`}>
            {getStatusIcon()}
            <span className="ml-1 capitalize">{connectionState}</span>
          </Badge>
        </div>

        {/* Video Grid (Google Meet-like behavior) */}
        <div className={`grid ${colsClass} gap-6 mb-6`}>
          {tiles.map((t) => (
            <Card key={t.id} className="bg-video-bg border-video-border overflow-hidden">
              <div className="relative aspect-video">
                {t.isLocal ? (
                  <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                ) : (
                  <ParticipantVideo stream={t.stream} videoEnabled={t.videoEnabled} />
                )}
                {/* Mic status */}
                <MicStatusOverlay enabled={t.audioEnabled} />
                <div className="absolute bottom-4 left-4">
                  <Badge variant="secondary" className="bg-black/50 text-white border-0">
                    {t.name}
                  </Badge>
                </div>
                {t.isLocal ? (
                  !isVideoEnabled && (
                    <div className="absolute inset-0 bg-video-bg flex items-center justify-center">
                      <div className="text-center">
                        <VideoOff className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                        <p className="text-muted-foreground">Camera Off</p>
                      </div>
                    </div>
                  )
                ) : (
                  t.videoEnabled === false && (
                    <div className="absolute inset-0 bg-video-bg flex items-center justify-center">
                      <div className="text-center">
                        <VideoOff className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                        <p className="text-muted-foreground">Camera Off</p>
                      </div>
                    </div>
                  )
                )}
              </div>
            </Card>
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <Button
            onClick={handleToggleAudio}
            variant={isAudioEnabled ? "secondary" : "destructive"}
            size="lg"
            className="rounded-full w-14 h-14 p-0"
          >
            {isAudioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
          </Button>
          
          <Button
            onClick={handleToggleVideo}
            variant={isVideoEnabled ? "secondary" : "destructive"}
            size="lg"
            className="rounded-full w-14 h-14 p-0"
          >
            {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
          </Button>

          <ChatDrawer username={username} />
          
          <Button
            onClick={handleLeaveRoom}
            variant="destructive"
            size="lg"
            className="rounded-full w-14 h-14 p-0"
          >
            <PhoneOff className="w-6 h-6" />
          </Button>
        </div>

        {/* Connection Status removed as requested */}
      </div>
    </div>
  );
}

function ParticipantVideo({ stream, videoEnabled }: { stream: MediaStream | null; videoEnabled?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
    }
  }, [stream]);
  return (
    <div className="w-full h-full">
      <video ref={ref} autoPlay playsInline className="w-full h-full object-cover" />
      {videoEnabled === false && (
        <div className="absolute inset-0 bg-video-bg flex items-center justify-center">
          <div className="text-center">
            <VideoOff className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Camera Off</p>
          </div>
        </div>
      )}
    </div>
  );
}

function MicStatusOverlay({ enabled }: { enabled: boolean }) {
  const isOn = enabled;
  return (
    <div className="absolute top-3 right-3 flex items-center justify-center w-7 h-7 rounded-full bg-black/50 text-white">
      {isOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
    </div>
  );
}