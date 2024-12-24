import {
  LocalUser,
  useJoin,
  useLocalMicrophoneTrack,
  useLocalCameraTrack,
  usePublish,
} from "agora-rtc-react";
import { useState } from "react";
// import { useNavigate } from "react-router";
import "../styles.css";
import { PrepRoomProp } from "./Home";

export const PrepRoom = ({ channel, step, setStep }: PrepRoomProp) => {
  // const [calling, setCalling] = useState(true);
  // const isConnected = useIsConnected();
  const [username, setUsername] = useState("");

  const [micOn, setMic] = useState(true);
  const [cameraOn, setCamera] = useState(true);
  const { localMicrophoneTrack } = useLocalMicrophoneTrack(micOn);
  const { localCameraTrack } = useLocalCameraTrack(cameraOn);
  // const navigate = useNavigate();

  console.log("step", step);
  console.log("channel", channel);

  const appId = "904e5c9136c84a9183bb8d856aabaafb";
  const token =
    "007eJxTYPA22LRgw7pYE6eVjBtWf5wj7nEpke+bUHPIy6PNae5uXb8UGCwNTFJNky0Njc2SLUwSLQ0tjJOSLFIsTM0SE5MSE9OSMnqz0hsCGRnEKhtYGBkgEMTnYSguKcpMSa3SLUktLmFgAABTkiKa";

  useJoin(
    {
      appid: appId,
      channel: channel,
      token: token || null,
    },
    true
  );

  usePublish([localMicrophoneTrack, localCameraTrack]);

  return (
    <div className="w-full h-screen m-20">
      <p className="text-red-600 text-2xl">Agora Video Conferencing POC</p>
      {step === 2 && (
        <div className="flex gap-x-2 justify-center items-center">
          <div className="user-list">
            <div className="user">
              <LocalUser
                audioTrack={localMicrophoneTrack}
                cameraOn={cameraOn}
                micOn={micOn}
                videoTrack={localCameraTrack}
                cover="https://www.agora.io/en/wp-content/uploads/2022/10/3d-spatial-audio-icon.svg"
              >
                <samp className="user-name">You</samp>
              </LocalUser>
            </div>
          </div>
          <div>
            <p className="font-semibold">Hello {username}</p>
            <div className="join-room flex flex-col gap-y-4">
              <input
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter Your Name"
                value={username}
                className="h-14 border pl-2"
              />
              <button
                className={`join-channel ${
                  !appId || !channel ? "disabled" : "bg-blue-500 text-white"
                }`}
                disabled={!appId || !channel}
                onClick={() => setStep(3)}
              >
                Join
              </button>
            </div>
          </div>

          <div className="control">
            <div className="left-control">
              <button className="btn" onClick={() => setMic((a) => !a)}>
                Mic
              </button>
              <button className="btn" onClick={() => setCamera((a) => !a)}>
                Cam
              </button>
            </div>
            <button
              className={`btn btn-phone ${ "btn-phone-active" }`}
              onClick={() => setStep(1)}
            >
              End
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrepRoom;
