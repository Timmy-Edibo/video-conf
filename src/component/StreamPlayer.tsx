import React, { useLayoutEffect, useRef, useState } from "react";
import {
  ICameraVideoTrack,
  ILocalAudioTrack,
  ILocalVideoTrack,
  IMicrophoneAudioTrack,
  IRemoteAudioTrack,
  IRemoteVideoTrack,
} from "agora-rtc-sdk-ng";

type StreamPlayerProps = {
  audioTrack: (ILocalAudioTrack & IMicrophoneAudioTrack) | null;
  videoTrack: (ICameraVideoTrack & ILocalVideoTrack) | null;
  uid?: string | number;
  options?: object;
};

export const StreamPlayer: React.FC<StreamPlayerProps> = ({
  audioTrack,
  videoTrack,
  uid = "",
  options = {},
}) => {
  // Refs for video elements
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);

  // Effect for video track
  useLayoutEffect(() => {
    if (videoRef.current !== null && videoTrack) {
      videoTrack.play(videoRef.current, options);
    }

    return () => {
      if (videoTrack) {
        videoTrack.stop();
      }
    };
  }, [videoTrack, options]);

  // Effect for audio track
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

  // Toggle audio mute
  const toggleAudioMute = async () => {
    if (audioTrack) {
      const isLocalTrack = "setEnabled" in audioTrack;

      if (isLocalTrack) {
        const localAudioTrack = audioTrack as ILocalAudioTrack;
        const newState = !isAudioMuted;
        await localAudioTrack.setEnabled(!newState);
        setIsAudioMuted(newState);
      } else {
        const remoteAudioTrack = audioTrack as IRemoteAudioTrack;
        if (isAudioMuted) {
          remoteAudioTrack.setVolume(100);
        } else {
          remoteAudioTrack.setVolume(0);
        }
        setIsAudioMuted(!isAudioMuted);
      }
    }
  };

  // Toggle video mute
  const toggleVideoMute = async () => {
    if (videoTrack) {
      const isLocalTrack = "setEnabled" in videoTrack;

      if (isLocalTrack) {
        const localVideoTrack = videoTrack as ILocalVideoTrack;
        const newState = !isVideoMuted;
        await localVideoTrack.setEnabled(!newState);
        setIsVideoMuted(newState);
      } else {
        const remoteVideoTrack = videoTrack as IRemoteVideoTrack;
        if (isVideoMuted) {
          remoteVideoTrack.play(videoRef.current!);
        } else {
          remoteVideoTrack.stop();
        }
        setIsVideoMuted(!isVideoMuted);
      }
    }
  };

  return (
    <div className="player w-full h-full">
      {/* Conditionally render video element */}
      {videoTrack ? (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            width="100%"
            height="auto"
          />
          User uid: {uid}
        </>
      ) : (
        <p className="text-center text-gray-500">No video available</p>
      )}

      {/* Control buttons */}
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
};
