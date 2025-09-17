import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

interface VideoRoomProps {
  username: string;
  roomId: string;
  isCreator: boolean;
  onLeaveRoom: () => void;
}

export default function VideoRoom({ username, roomId, isCreator, onLeaveRoom }: VideoRoomProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  const {
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
    hangUp
  } = useWebRTC(username, isCreator);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    startCall();
  }, [startCall]);

  const copySignalingData = async () => {
    if (signalingData) {
      try {
        await navigator.clipboard.writeText(JSON.stringify(signalingData));
      } catch (err) {
        console.error("Failed to copy signaling data:", err);
      }
    }
  };

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
    } catch (err) {
      console.error("Failed to copy room ID:", err);
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

        {/* Video Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Local Video */}
          <Card className="bg-video-bg border-video-border overflow-hidden">
            <div className="relative aspect-video">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 left-4">
                <Badge variant="secondary" className="bg-black/50 text-white border-0">
                  You ({username})
                </Badge>
              </div>
              {!isVideoEnabled && (
                <div className="absolute inset-0 bg-video-bg flex items-center justify-center">
                  <div className="text-center">
                    <VideoOff className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Camera Off</p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Remote Video */}
          <Card className="bg-video-bg border-video-border overflow-hidden">
            <div className="relative aspect-video">
              {remoteStream ? (
                <>
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-4 left-4">
                    <Badge variant="secondary" className="bg-black/50 text-white border-0">
                      {remoteUsername || "Remote User"}
                    </Badge>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-video-bg">
                  <div className="text-center">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Waiting for participant...</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
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
          
          <Button
            onClick={handleLeaveRoom}
            variant="destructive"
            size="lg"
            className="rounded-full w-14 h-14 p-0"
          >
            <PhoneOff className="w-6 h-6" />
          </Button>
        </div>

        {/* Signaling Section */}
        {!isSignalingComplete && (
          <Card className="bg-white/10 backdrop-blur border-white/20 text-white p-4">
            <h3 className="font-semibold mb-3">
              {isCreator ? "Share Connection Data" : "Paste Connection Data"}
            </h3>
            
            {isCreator ? (
              <div className="space-y-3">
                <p className="text-sm text-white/70">
                  Copy this data and share it with the other participant:
                </p>
                {signalingData && (
                  <div className="flex gap-2">
                    <textarea
                      value={JSON.stringify(signalingData, null, 2)}
                      readOnly
                      className="flex-1 p-3 bg-black/20 border border-white/20 rounded text-sm font-mono"
                      rows={4}
                    />
                    <Button onClick={copySignalingData} size="sm">
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-white/70">
                  Paste the connection data from the room creator:
                </p>
                <textarea
                  placeholder="Paste connection data here..."
                  className="w-full p-3 bg-black/20 border border-white/20 rounded text-sm font-mono"
                  rows={4}
                  onChange={(e) => {
                    try {
                      const data = JSON.parse(e.target.value);
                      handleSignalingData(data);
                    } catch (err) {
                      // Invalid JSON, ignore
                    }
                  }}
                />
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}