import {
  LocalUser,
  useIsConnected,
  useJoin,
  useLocalMicrophoneTrack,
  useLocalCameraTrack,
  usePublish,
} from "agora-rtc-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router";

import "../styles.css";

export const PrepRoom = () => {
  const [calling, setCalling] = useState(true);
  const isConnected = useIsConnected();
  const [channel, setChannel] = useState("");
  const [username, setUsername] = useState("");

  const { meetingCode } = useParams();
  const [micOn, setMic] = useState(true);
  const [cameraOn, setCamera] = useState(true);
  const { localMicrophoneTrack } = useLocalMicrophoneTrack(micOn);
  const { localCameraTrack } = useLocalCameraTrack(cameraOn);

  const appId = "904e5c9136c84a9183bb8d856aabaafb";
  const token =
    "007eJxTYPA22LRgw7pYE6eVjBtWf5wj7nEpke+bUHPIy6PNae5uXb8UGCwNTFJNky0Njc2SLUwSLQ0tjJOSLFIsTM0SE5MSE9OSMnqz0hsCGRnEKhtYGBkgEMTnYSguKcpMSa3SLUktLmFgAABTkiKa";

  useEffect(() => {
    if (meetingCode) {
      setChannel(meetingCode);
    }
  }, []);

  useJoin(
    { appid: appId, channel: channel, token: token ? token : null },
    calling
  );
  usePublish([localMicrophoneTrack, localCameraTrack]);

  return (
    <div className="w-full h-screen m-20">
      <p className="text-red-600 text-2xl">Agora Video Conferencing POC</p>
      {isConnected ? (
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
                onClick={() => setCalling(true)}
              >
                Join
              </button>
            </div>
          </div>
        </div>
      ) : (
        <p>Not connected</p>
      )}
    </div>
  );
};

export default PrepRoom;
