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
  WifiOff,
  Settings,
  MoreVertical
} from "lucide-react";
import { useWebRTC } from "@/hooks/useWebRTC";
import ChatDrawer from "./ChatDrawer";

interface VideoRoomProps {
  username: string;
  roomId: string;
  isCreator: boolean;
  onLeaveRoom: () => void;
}

export default function VideoRoom({ username, roomId, onLeaveRoom }: VideoRoomProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const [hoveredTile, setHoveredTile] = useState<string | null>(null);
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

  useEffect(() => {
    startCall();
  }, [startCall]);

  // Auto-hide controls after 3 seconds of inactivity
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsControlsVisible(false);
    }, 3000);

    const handleMouseMove = () => {
      setIsControlsVisible(true);
      clearTimeout(timer);
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isControlsVisible]);

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      toast({ 
        title: "✓ Copied", 
        description: "Room ID copied to clipboard.",
        className: "bg-green-600 text-white border-green-500"
      });
    } catch (err) {
      console.error("Failed to copy room ID:", err);
      toast({ 
        title: "Copy failed", 
        description: "Could not copy Room ID.", 
        variant: "destructive" as any 
      });
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
      case "connected": return "bg-emerald-500/90";
      case "connecting": return "bg-amber-500/90";
      case "disconnected": return "bg-red-500/90";
      default: return "bg-slate-500/90";
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
      name: `${username} (You)`,
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

  const getGridClass = () => {
    const n = tiles.length;
    if (n <= 1) return "grid-cols-1 max-w-sm mx-auto";
    if (n === 2) return "grid-cols-1 sm:grid-cols-2";
    if (n === 3) return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3";
    // 4 or more → allow up to 4 per row on large screens
    return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 p-4 max-w-7xl mx-auto">
        {/* Header - Always visible but with smooth transitions */}
        <div className={`transition-all duration-500 ease-out ${
          isControlsVisible ? 'opacity-100 translate-y-0' : 'opacity-70 -translate-y-2'
        }`}>
          <div className="flex items-center justify-between mb-6 backdrop-blur-xl bg-white/10 rounded-2xl p-4 border border-white/20">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 group">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-white/90 font-medium text-lg">Room</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-semibold">{roomId}</span>
                    <Button
                      onClick={copyRoomId}
                      variant="ghost"
                      size="sm"
                      className="text-white/70 hover:text-white hover:bg-white/20 rounded-lg transition-all duration-200 hover:scale-105"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge className={`${getStatusColor()} text-white border-0 px-3 py-1 rounded-full shadow-lg backdrop-blur-sm`}>
                <div className="flex items-center gap-2">
                  {getStatusIcon()}
                  <span className="capitalize font-medium">{connectionState}</span>
                </div>
              </Badge>
              
              <Button
                variant="ghost"
                size="sm"
                className="text-white/70 hover:text-white hover:bg-white/20 rounded-xl p-2 transition-all duration-200"
              >
                <Settings className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Video Grid */}
        <div className={`grid ${getGridClass()} gap-3 mb-6 transition-all duration-500 ease-out`}>
          {tiles.map((tile, index) => (
            <Card 
              key={tile.id} 
              className={`
                bg-slate-800/50 backdrop-blur-xl border-slate-700/50 overflow-hidden
                transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-2xl
                hover:bg-slate-700/50 group cursor-pointer
                ${hoveredTile === tile.id ? 'ring-2 ring-blue-400/50' : ''}
              `}
              style={{
                animationDelay: `${index * 100}ms`,
                animation: 'slideInUp 0.6s ease-out forwards'
              }}
              onMouseEnter={() => setHoveredTile(tile.id)}
              onMouseLeave={() => setHoveredTile(null)}
            >
              <div className="relative aspect-video bg-gradient-to-br from-slate-800 to-slate-900">
                {tile.isLocal ? (
                  <video 
                    ref={localVideoRef} 
                    autoPlay 
                    muted 
                    playsInline 
                    className="w-full h-full object-cover rounded-lg transition-all duration-300"
                  />
                ) : (
                  <ParticipantVideo stream={tile.stream} videoEnabled={tile.videoEnabled} />
                )}
                
                {/* Video disabled overlay */}
                {((tile.isLocal && !isVideoEnabled) || (!tile.isLocal && tile.videoEnabled === false)) && (
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                    <div className="text-center animate-fade-in">
                      <div className="w-20 h-20 bg-slate-700 rounded-full flex items-center justify-center mb-4 mx-auto shadow-xl">
                        <VideoOff className="w-10 h-10 text-slate-400" />
                      </div>
                      <p className="text-slate-300 font-medium">Camera off</p>
                    </div>
                  </div>
                )}

                {/* Participant name badge */}
                <div className="absolute bottom-4 left-4 transition-all duration-300 group-hover:scale-105">
                  <Badge 
                    variant="secondary" 
                    className="bg-black/70 text-white border-0 backdrop-blur-sm shadow-lg px-3 py-1 rounded-full"
                  >
                    <span className="font-medium">{tile.name}</span>
                  </Badge>
                </div>

                {/* Audio status indicator */}
                <MicStatusOverlay enabled={tile.audioEnabled} />

                {/* Connection quality indicator for remote participants */}
                {!tile.isLocal && (
                  <div className="absolute top-3 left-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-lg"></div>
                  </div>
                )}

                {/* Hover overlay for additional controls */}
                <div className={`
                  absolute inset-0 bg-black/20 backdrop-blur-sm opacity-0 group-hover:opacity-100
                  transition-all duration-300 flex items-center justify-center
                `}>
                  {!tile.isLocal && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white/80 hover:text-white hover:bg-white/20 rounded-full"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Controls - Floating bottom bar */}
        <div className={`
          fixed bottom-6 left-1/2 transform -translate-x-1/2 z-20
          transition-all duration-500 ease-out
          ${isControlsVisible ? 'opacity-100 translate-y-0' : 'opacity-90 translate-y-2'}
        `}>
          <div className="backdrop-blur-xl bg-slate-800/80 rounded-2xl p-4 border border-slate-700/50 shadow-2xl">
            <div className="flex items-center gap-4">
              <Button
                onClick={handleToggleAudio}
                variant={isAudioEnabled ? "secondary" : "destructive"}
                size="lg"
                className={`
                  rounded-full w-14 h-14 p-0 transition-all duration-300 hover:scale-110
                  ${isAudioEnabled 
                    ? 'bg-slate-700 hover:bg-slate-600 text-white shadow-lg' 
                    : 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25'
                  }
                `}
              >
                {isAudioEnabled ? 
                  <Mic className="w-6 h-6" /> : 
                  <MicOff className="w-6 h-6" />
                }
              </Button>
              
              <Button
                onClick={handleToggleVideo}
                variant={isVideoEnabled ? "secondary" : "destructive"}
                size="lg"
                className={`
                  rounded-full w-14 h-14 p-0 transition-all duration-300 hover:scale-110
                  ${isVideoEnabled 
                    ? 'bg-slate-700 hover:bg-slate-600 text-white shadow-lg' 
                    : 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25'
                  }
                `}
              >
                {isVideoEnabled ? 
                  <Video className="w-6 h-6" /> : 
                  <VideoOff className="w-6 h-6" />
                }
              </Button>

              <ChatDrawer username={username} roomId={roomId} />
              
              <Button
                onClick={handleLeaveRoom}
                variant="destructive"
                size="lg"
                className="rounded-full w-14 h-14 p-0 bg-red-500 hover:bg-red-600 text-white transition-all duration-300 hover:scale-110 shadow-lg shadow-red-500/25"
              >
                <PhoneOff className="w-6 h-6" />
              </Button>
            </div>
          </div>
        </div>

        {/* Participant count indicator */}
        <div className="fixed top-6 right-6 backdrop-blur-xl bg-white/10 rounded-2xl p-3 border border-white/20 shadow-lg">
          <div className="flex items-center gap-2 text-white">
            <Users className="w-4 h-4" />
            <span className="font-medium">{tiles.length}</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
      `}</style>
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
    <div className="w-full h-full relative">
      <video 
        ref={ref} 
        autoPlay 
        playsInline 
        className="w-full h-full object-cover rounded-lg transition-all duration-300"
      />
      {videoEnabled === false && (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
          <div className="text-center animate-fade-in">
            <div className="w-20 h-20 bg-slate-700 rounded-full flex items-center justify-center mb-4 mx-auto shadow-xl">
              <VideoOff className="w-10 h-10 text-slate-400" />
            </div>
            <p className="text-slate-300 font-medium">Camera off</p>
          </div>
        </div>
      )}
    </div>
  );
}

function MicStatusOverlay({ enabled }: { enabled: boolean }) {
  return (
    <div className={`
      absolute top-3 right-3 flex items-center justify-center w-8 h-8 rounded-full 
      backdrop-blur-sm shadow-lg transition-all duration-300
      ${enabled 
        ? 'bg-green-500/80 text-white' 
        : 'bg-red-500/80 text-white animate-pulse'
      }
    `}>
      {enabled ? 
        <Mic className="w-4 h-4" /> : 
        <MicOff className="w-4 h-4" />
      }
    </div>
  );
}