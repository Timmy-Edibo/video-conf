"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { io, Socket } from "socket.io-client";
import Cookies from "js-cookie";


// Define the WebSocket context type
interface WebSocketContextType {
  ws: Socket | null;
}

// Create a WebSocket context
const WebSocketContext = createContext<WebSocketContextType | undefined>(
  undefined
);

interface WebSocketProviderProps {
  children: ReactNode;
}

// WebSocketProvider component to wrap your app
export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({
  children,
}) => {
  const [ws, setWs] = useState<Socket | null>(null);

  useEffect(() => {
    const token = `Bearer ${Cookies.get("accessToken")}`;
    const socket = io(`http://localhost:8080`, {
      autoConnect: true,
      transports: ["websocket", "polling"],
      withCredentials: true,
      auth: {
        token,
      },
    });

    // Event listeners for connection state
    socket.on("connect", () => console.log("WebSocket connected"));
    socket.on("disconnect", () => console.log("WebSocket disconnected"));

    setWs(socket);

    // Cleanup the WebSocket connection on unmount
    return () => {
      socket.close();
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{ ws }}>
      {children}
    </WebSocketContext.Provider>
  );
};

// Custom Hook to access WebSocket
export const useWebSocket = (): Socket | null => {
  const context = useContext(WebSocketContext);

  if (!context) {
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }

  return context.ws;
};
