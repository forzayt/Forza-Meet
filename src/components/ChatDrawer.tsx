import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  timestamp: Date;
  isLocal: boolean;
}

interface ChatDrawerProps {
  username: string;
  onSendMessage?: (message: string) => void;
  messages?: Message[];
}

export default function ChatDrawer({ username, onSendMessage, messages = [] }: ChatDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [localMessages, setLocalMessages] = useState<Message[]>([
    // Demo messages to show the design
    {
      id: "1",
      username: "Alice",
      text: "Hey everyone! Ready for the meeting?",
      timestamp: new Date(Date.now() - 120000),
      isLocal: false,
    },
    {
      id: "2", 
      username: username,
      text: "Yes, let's get started!",
      timestamp: new Date(Date.now() - 60000),
      isLocal: true,
    },
    {
      id: "3",
      username: "Bob",
      text: "Can everyone see my screen share?",
      timestamp: new Date(Date.now() - 30000),
      isLocal: false,
    }
  ]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const allMessages = messages.length > 0 ? messages : localMessages;

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [allMessages]);

  const handleSendMessage = () => {
    if (!messageText.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      username,
      text: messageText,
      timestamp: new Date(),
      isLocal: true,
    };

    if (onSendMessage) {
      onSendMessage(messageText);
    } else {
      // Demo mode - add message locally
      setLocalMessages(prev => [...prev, newMessage]);
    }
    
    setMessageText("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        <Button
          variant="secondary"
          size="lg"
          className="rounded-full w-14 h-14 p-0 bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all duration-200"
        >
          <MessageCircle className="w-6 h-6" />
        </Button>
      </DrawerTrigger>
      
      <DrawerContent className="h-[85vh] bg-gradient-to-br from-primary/95 via-accent/95 to-primary/95 backdrop-blur-xl border-white/20">
        <DrawerHeader className="border-b border-white/10 bg-white/5">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-white text-xl font-semibold flex items-center gap-2">
              <MessageCircle className="w-6 h-6" />
              Chat
            </DrawerTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="text-white/70 hover:text-white hover:bg-white/10 rounded-full p-2"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DrawerHeader>

        <div className="flex flex-col h-full p-4">
          {/* Messages Area */}
          <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
            <div className="space-y-4 pb-4">
              {allMessages.map((message) => (
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
          </ScrollArea>

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