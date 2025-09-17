import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Video, Users, ArrowRight, Github } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LandingPageProps {
  onJoinRoom: (username: string, roomId: string, isCreator: boolean) => void;
}

export default function LandingPage({ onJoinRoom }: LandingPageProps) {
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("");
  const [mode, setMode] = useState<"select" | "create" | "join">("select");
  const [createdRoomId, setCreatedRoomId] = useState("");
  const { toast } = useToast();
  const pendingPresenceTimeoutRef = useRef<number | null>(null);

  const checkRoomPresence = async (room: string): Promise<boolean> => {
    return new Promise((resolve) => {
      let resolved = false;
      const channel = new BroadcastChannel(`forza-meet:${room}`);
      const onMessage = (event: MessageEvent) => {
        const data = event.data as any;
        if (data && data.type === "presence-response") {
          resolved = true;
          cleanup();
          resolve(true);
        }
      };
      const cleanup = () => {
        channel.removeEventListener("message", onMessage as EventListener);
        channel.close();
        if (pendingPresenceTimeoutRef.current) {
          window.clearTimeout(pendingPresenceTimeoutRef.current);
          pendingPresenceTimeoutRef.current = null;
        }
      };
      channel.addEventListener("message", onMessage as EventListener);
      // Ask if anyone is present in this room
      channel.postMessage({ type: "presence-request", senderId: "landing" });
      // Timeout after 800ms if nobody responds
      pendingPresenceTimeoutRef.current = window.setTimeout(() => {
        if (!resolved) {
          cleanup();
          resolve(false);
        }
      }, 800);
    });
  };

  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const handleCreateRoom = () => {
    if (!username.trim()) return;
    const newRoomId = generateRoomId();
    setCreatedRoomId(newRoomId);
    setMode("create");
  };

  const handleJoinCreatedRoom = () => {
    onJoinRoom(username, createdRoomId, true);
  };

  const handleJoinRoom = () => {
    if (!username.trim() || !roomId.trim()) return;
    // Validate room presence before joining
    checkRoomPresence(roomId).then((present) => {
      if (!present) {
        toast({ title: "Room not found", description: "Please check the Room ID and try again.", variant: "destructive" as any });
        return;
      }
      onJoinRoom(username, roomId, false);
    });
  };

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(createdRoomId);
    } catch (err) {
      console.error("Failed to copy room ID:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-accent to-primary flex items-center justify-center p-4">
      {/* Top-right GitHub link */}
      <a
        href="https://github.com/forzayt/Forza-Meet"
        target="_blank"
        rel="noreferrer"
        aria-label="GitHub repository"
        className="fixed top-4 right-4 z-50 inline-flex items-center justify-center w-12 h-12 rounded-full bg-black/60 text-white shadow-lg hover:bg-black/80"
      >
        <Github className="w-6 h-6" />
      </a>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur rounded-2xl mb-4">
            <Video className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">FORZA MEET</h1>
          <p className="text-white/80">Unlimited video meetings </p>
        </div>

        <Card className="bg-white/10 backdrop-blur border-white/20 text-white">
          <CardHeader className="text-center">
            <CardTitle>
              {mode === "select" && "Get Started"}
              {mode === "create" && "Room Created"}
              {mode === "join" && "Join Room"}
            </CardTitle>
            <CardDescription className="text-white/70">
              {mode === "select" && "Enter your name to create or join a room"}
              {mode === "create" && "Share this Room ID with your contact"}
              {mode === "join" && "Enter the Room ID to join the call"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mode === "select" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-white/90">Your Name</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your name"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={handleCreateRoom}
                    disabled={!username.trim()}
                    className="bg-white/20 hover:bg-white/30 border border-white/30"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Create Room
                  </Button>
                  <Button
                    onClick={() => setMode("join")}
                    disabled={!username.trim()}
                    variant="outline"
                    className="border-white/30 text-white hover:bg-white/10"
                  >
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Join Room
                  </Button>
                </div>
              </>
            )}

            {mode === "create" && (
              <>
                <div className="space-y-2">
                  <Label className="text-white/90">Room ID</Label>
                  <div className="flex gap-2">
                    <Input
                      value={createdRoomId}
                      readOnly
                      className="bg-white/10 border-white/20 text-white"
                    />
                    <Button
                      onClick={copyRoomId}
                      variant="outline"
                      size="sm"
                      className="border-white/30 text-white hover:bg-white/10 shrink-0"
                    >
                      Copy
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={handleJoinCreatedRoom}
                    className="bg-success hover:bg-success/90"
                  >
                    Start Call
                  </Button>
                  <Button
                    onClick={() => setMode("select")}
                    variant="outline"
                    className="border-white/30 text-white hover:bg-white/10"
                  >
                    Back
                  </Button>
                </div>
              </>
            )}

            {mode === "join" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="roomId" className="text-white/90">Room ID</Label>
                  <Input
                    id="roomId"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    placeholder="Enter Room ID"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={handleJoinRoom}
                    disabled={!username.trim() || !roomId.trim()}
                    className="bg-success hover:bg-success/90"
                  >
                    Join Call
                  </Button>
                  <Button
                    onClick={() => setMode("select")}
                    variant="outline"
                    className="border-white/30 text-white hover:bg-white/10"
                  >
                    Back
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}