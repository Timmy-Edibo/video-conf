import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import AgoraRTC, { AgoraRTCProvider } from "agora-rtc-react";
import { BrowserRouter, Route, Routes } from "react-router";
import { AgoraKit } from "./component/AgoraKit.tsx";
// import PrepRoom from "./component/PrepRoom.tsx";

// In video call, set mode to "rtc"
const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AgoraRTCProvider client={client}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/prep-room/:meetingCode" element={<AgoraKit />} />
        </Routes>{" "}
      </BrowserRouter>
    </AgoraRTCProvider>
  </StrictMode>
);
