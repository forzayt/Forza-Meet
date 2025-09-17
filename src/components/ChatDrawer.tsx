import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { MessageCircle, Send, X } from "lucide-react";

interface Message {
  id: string;
  username: string;
  text: string;
  timestamp: number; // epoch ms
  isLocal: boolean;
}

interface ChatDrawerProps {
  username: string;
  roomId: string;
}

export default function ChatDrawer({ username, roomId }: ChatDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const [hasUnread, setHasUnread] = useState(false);
  const unreadTimerRef = useRef<number | null>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const channel = new BroadcastChannel(`forza-meet:${roomId}:chat`);
    channelRef.current = channel;
    const onMessage = (event: MessageEvent) => {
      const data = event.data as any;
      if (!data || data.type !== "chat") return;
      const incoming: Message = {
        id: data.id,
        username: data.username,
        text: data.text,
        timestamp: data.timestamp,
        isLocal: false,
      };
      setMessages((prev) => {
        if (prev.some((m) => m.id === incoming.id)) return prev; // avoid duplicates
        return [...prev, incoming];
      });
      // Show unread dot for 3s if drawer is closed and message is from others
      if (!isOpen && data.username !== username) {
        setHasUnread(true);
        if (unreadTimerRef.current) window.clearTimeout(unreadTimerRef.current);
        unreadTimerRef.current = window.setTimeout(() => {
          setHasUnread(false);
          unreadTimerRef.current = null;
        }, 3000);
      }
    };
    channel.addEventListener("message", onMessage as EventListener);
    return () => {
      channel.removeEventListener("message", onMessage as EventListener);
      channel.close();
      channelRef.current = null;
    };
  }, [roomId]);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (!messageText.trim()) return;
    const id = Date.now().toString();
    const ts = Date.now();
    const local: Message = { id, username, text: messageText, timestamp: ts, isLocal: true };
    setMessages((prev) => [...prev, local]);
    if (channelRef.current) {
      channelRef.current.postMessage({ type: "chat", id, username, text: messageText, timestamp: ts });
    }
    
    setMessageText("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (epochMs: number) => {
    return new Date(epochMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Drawer
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (open) {
          setHasUnread(false);
          if (unreadTimerRef.current) {
            window.clearTimeout(unreadTimerRef.current);
            unreadTimerRef.current = null;
          }
        }
      }}
    >
      <DrawerTrigger asChild>
        <Button
          variant="secondary"
          size="lg"
          className="relative rounded-full w-14 h-14 p-0 bg-black/60 text-white shadow-lg hover:bg-black/80 transition-all duration-200"
        >
          <MessageCircle className="w-6 h-6" />
          {hasUnread && !isOpen && (
            <span className="absolute -top-0.5 -right-0.5 inline-block w-3 h-3 rounded-full bg-red-500 ring-2 ring-black/60" />
          )}
        </Button>
      </DrawerTrigger>
      
      <DrawerContent className="h-[85vh] bg-gradient-to-br from-primary/95 via-accent/95 to-primary/95 backdrop-blur-xl border-white/20">
        <DrawerHeader className="border-b border-white/10 bg-white/5">
          
          <div className="mt-2 flex items-center justify-center">
            <p className="text-xs text-white/60">Drag down to close</p>
          </div>
        </DrawerHeader>

        <div className="flex flex-col h-full min-h-0 p-4">
          {/* Messages Area */}
          <div ref={messagesRef} className="flex-1 min-h-0 pr-4 overflow-y-auto">
            <div className="space-y-4 pb-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isLocal ? 'justify-end' : 'justify-start'} animate-fade-in`}
                >
                  <Card
                    className={`max-w-[75%] p-3 ${
                      message.isLocal
                        ? 'bg-primary/40 border-primary/30 text-white'
                        : 'bg-white/10 border-white/20 text-white'
                    } backdrop-blur-sm`}
                  >
                    {!message.isLocal && (
                      <div className="flex items-center gap-2 mb-1">
                        <Badge 
                          variant="secondary" 
                          className="bg-white/20 text-white border-0 text-xs"
                        >
                          {message.username}
                        </Badge>
                        <span className="text-xs text-white/60">
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                    )}
                    <p className="text-sm leading-relaxed">{message.text}</p>
                    {message.isLocal && (
                      <div className="flex justify-end mt-1">
                        <span className="text-xs text-white/60">
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                    )}
                  </Card>
                </div>
              ))}
            </div>
          </div>

          {/* Message Input */}
          <div className="flex gap-3 pt-4 border-t border-white/10">
            <Input
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-white/40 focus:ring-white/20"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!messageText.trim()}
              className="bg-primary/60 hover:bg-primary/80 text-white border border-primary/30 px-4 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}