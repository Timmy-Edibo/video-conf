import React, { useLayoutEffect, useRef, useState } from "react";
import {
  ILocalAudioTrack,
  ILocalVideoTrack,
  IRemoteAudioTrack,
  IRemoteVideoTrack,
} from "agora-rtc-sdk-ng";

interface StreamPlayerProps {
  audioTrack?: ILocalAudioTrack | IRemoteAudioTrack;
  videoTrack?: ILocalVideoTrack | IRemoteVideoTrack;
  uid?: string | number;
  options?: object;
}

export const StreamPlayer: React.FC<StreamPlayerProps> = ({
  audioTrack,
  videoTrack,
  uid = "",
  options = {},
}) => {
  // Use ref for video element
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);

  useLayoutEffect(() => {
    if (videoRef.current !== null && videoTrack) {
      // Play the video track on the video element
      videoTrack.play(videoRef.current, options);
    }

    return () => {
      if (videoTrack) {
        videoTrack.stop();
      }
    };
  }, [videoTrack, options]);

  useLayoutEffect(() => {
    if (audioTrack) {
      audioTrack.play();
    }
    return () => {
      if (audioTrack) {
        audioTrack.stop();
      }
    };
  }, [audioTrack]);

  const toggleAudioMute = async () => {
    if (audioTrack) {
      const isLocalTrack = "setEnabled" in audioTrack;

      if (isLocalTrack) {
        // Local audio track: Enable or disable audio
        const localAudioTrack = audioTrack as ILocalAudioTrack;
        const newState = !isAudioMuted;
        await localAudioTrack.setEnabled(!newState);
        setIsAudioMuted(newState);
      } else {
        // Remote audio track: Stop or play the audio locally
        const remoteAudioTrack = audioTrack as IRemoteAudioTrack;
        if (isAudioMuted) {
          remoteAudioTrack.play();
        } else {
          remoteAudioTrack.stop();
        }
        setIsAudioMuted(!isAudioMuted);
      }
    }
  };

  const toggleVideoMute = async () => {
    if (videoTrack) {
      const isLocalTrack = "setEnabled" in videoTrack;

      if (isLocalTrack) {
        // Local track: Enable or disable the video
        const localVideoTrack = videoTrack as ILocalVideoTrack;
        const newState = !isVideoMuted;
        await localVideoTrack.setEnabled(!newState); // `setEnabled(false)` mutes the track
        setIsVideoMuted(newState);
      } else {
        // Remote track: Stop or play the video
        const remoteVideoTrack = videoTrack as IRemoteVideoTrack;
        if (isVideoMuted) {
          remoteVideoTrack.play(videoRef.current!); // Resume playing
        } else {
          remoteVideoTrack.stop(); // Stop rendering
        }
        setIsVideoMuted(!isVideoMuted);
      }
    }
  };

  return (
    <div className="player w-full h-full">
      <video ref={videoRef} autoPlay playsInline width="100%" height="auto" />
      {uid && (
        <div className="card-text player-name absolute top-0 right-0 bg-black text-white text-xs p-1">
          uid: {uid}
        </div>
      )}

      <div className="flex mt-2 space-x-2">
        <button
          className={`px-2 py-1 text-sm rounded ${
            isAudioMuted
              ? "bg-red-500 hover:bg-red-600"
              : "bg-green-500 hover:bg-green-600"
          } text-white`}
          onClick={toggleAudioMute}
        >
          {isAudioMuted ? "Unmute Audio" : "Mute Audio"}
        </button>
        <button
          className={`px-2 py-1 text-sm rounded ${
            isVideoMuted
              ? "bg-red-500 hover:bg-red-600"
              : "bg-green-500 hover:bg-green-600"
          } text-white`}
          onClick={toggleVideoMute}
        >
          {isVideoMuted ? "Unmute Video" : "Mute Video"}
        </button>
      </div>
    </div>
  );

  // return (
  //   <div className="relative p-4 border rounded shadow">
  //     <div ref={videoRef} className="w-full h-48 bg-gray-200"></div>
  //     {uid && (
  //       <div className="absolute top-0 right-0 bg-black text-white text-xs px-2 py-1">
  //         UID: {uid}
  //       </div>
  //     )}
  //     {/* Mute/Unmute Buttons */}
  //     <div className="flex mt-2 space-x-2">
  //       <button
  //         className={`px-2 py-1 text-sm rounded ${
  //           isAudioMuted
  //             ? "bg-red-500 hover:bg-red-600"
  //             : "bg-green-500 hover:bg-green-600"
  //         } text-white`}
  //         onClick={toggleAudioMute}
  //       >
  //         {isAudioMuted ? "Unmute Audio" : "Mute Audio"}
  //       </button>
  //       <button
  //         className={`px-2 py-1 text-sm rounded ${
  //           isVideoMuted
  //             ? "bg-red-500 hover:bg-red-600"
  //             : "bg-green-500 hover:bg-green-600"
  //         } text-white`}
  //         onClick={toggleVideoMute}
  //       >
  //         {isVideoMuted ? "Unmute Video" : "Mute Video"}
  //       </button>
  //     </div>
  //   </div>
  // );
};
