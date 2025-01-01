import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import AgoraRTC, { AgoraRTCProvider } from "agora-rtc-react";
import { BrowserRouter, Route, Routes } from "react-router";
import { AgoraKit } from "./component/AgoraKit.tsx";
import LoginForm from "./component/LoginForm.tsx";
import { AuthProvider } from "./context/AuthContext.tsx";
import { WebSocketProvider } from "./context/WebSocket.tsx";

// In video call, set mode to "rtc"
const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <WebSocketProvider>
        <AgoraRTCProvider client={client}>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<App />} />
              <Route path="/prep-room/:meetingCode" element={<AgoraKit />} />
              <Route path="/auth/login" element={<LoginForm />} />
            </Routes>{" "}
          </BrowserRouter>
        </AgoraRTCProvider>
      </WebSocketProvider>
    </AuthProvider>
  </StrictMode>
);
