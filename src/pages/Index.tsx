import { useState } from "react";
import LandingPage from "@/components/LandingPage";
import VideoRoom from "@/components/VideoRoom";

const Index = () => {
  const [currentView, setCurrentView] = useState<"landing" | "room">("landing");
  const [roomData, setRoomData] = useState<{
    username: string;
    roomId: string;
    isCreator: boolean;
  } | null>(null);

  const handleJoinRoom = (username: string, roomId: string, isCreator: boolean) => {
    setRoomData({ username, roomId, isCreator });
    setCurrentView("room");
  };

  const handleLeaveRoom = () => {
    setRoomData(null);
    setCurrentView("landing");
  };

  if (currentView === "room" && roomData) {
    return (
      <VideoRoom
        username={roomData.username}
        roomId={roomData.roomId}
        isCreator={roomData.isCreator}
        onLeaveRoom={handleLeaveRoom}
      />
    );
  }

  return <LandingPage onJoinRoom={handleJoinRoom} />;
};

export default Index;
