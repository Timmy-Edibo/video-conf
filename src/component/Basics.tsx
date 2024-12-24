import {
  LocalUser,
  RemoteUser,
  useIsConnected,
  useJoin,
  useLocalMicrophoneTrack,
  useLocalCameraTrack,
  usePublish,
  useRemoteUsers,
} from "agora-rtc-react";
import { useState } from "react";

import "../styles.css";

export const Basics = () => {
  const [calling, setCalling] = useState(false);
  const isConnected = useIsConnected();
  const [channel, setChannel] = useState("");
  const token =
    "007eJxTYPA22LRgw7pYE6eVjBtWf5wj7nEpke+bUHPIy6PNae5uXb8UGCwNTFJNky0Njc2SLUwSLQ0tjJOSLFIsTM0SE5MSE9OSMnqz0hsCGRnEKhtYGBkgEMTnYSguKcpMSa3SLUktLmFgAABTkiKa";

  const appId = "904e5c9136c84a9183bb8d856aabaafb";

  useJoin(
    { appid: appId, channel: channel, token: token ? token : null },
    calling
  );
  // Local user tracks
  const [micOn, setMic] = useState(true);
  const [cameraOn, setCamera] = useState(true);
  const { localMicrophoneTrack } = useLocalMicrophoneTrack(micOn);
  const { localCameraTrack } = useLocalCameraTrack(cameraOn);
  usePublish([localMicrophoneTrack, localCameraTrack]);

  // Remote users
  const remoteUsers = useRemoteUsers();

  return (
    <>
      <div className="room h-screen m-20">
        <p className="text-red-600 text-2xl">Agora Video Conferencing POC</p>
        {isConnected ? (
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
            {remoteUsers.map((user) => (
              <div className="user" key={user.uid}>
                <RemoteUser
                  cover="https://www.agora.io/en/wp-content/uploads/2022/10/3d-spatial-audio-icon.svg"
                  user={user}
                >
                  <samp className="user-name">{user.uid}</samp>
                </RemoteUser>
              </div>
            ))}
          </div>
        ) : (
          <div className="join-room flex flex-col gap-y-4">
            <label className="font-semibold">Enter Channel Name</label>
            <input
              onChange={(e) => setChannel(e.target.value)}
              placeholder="Enter Channel Name"
              value={channel}
              className="h-14 border pl-2"
            />
            <button
              className={`join-channel ${
                !appId || !channel ? "disabled" : "bg-blue-500 text-white"
              }`}
              disabled={!appId || !channel}
              onClick={() => setCalling(true)}
            >
              Join Channel
            </button>
          </div>
        )}
      </div>
      {isConnected && (
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
            className={`btn btn-phone ${calling ? "btn-phone-active" : ""}`}
            onClick={() => setCalling((a) => !a)}
          >
            {calling ? (
              <i className="i-phone-hangup" />
            ) : (
              <i className="i-mdi-phone" />
            )}
          </button>
        </div>
      )}
    </>
  );
};

export default Basics;
