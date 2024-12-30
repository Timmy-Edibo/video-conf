import AgoraRTC, { ICameraVideoTrack } from "agora-rtc-sdk-ng";
import React, { useState, useEffect, useCallback } from "react";

interface CamSelectProps {
  videoTrack?: ICameraVideoTrack;
}

interface CameraItem {
  label: string;
  value: string;
  deviceId: string;
}

export const CamSelect: React.FC<CamSelectProps> = ({ videoTrack }) => {
  const [items, setItems] = useState<CameraItem[]>([
    {
      label: "Default",
      value: "default",
      deviceId: "",
    },
  ]);
  const [curValue, setCurValue] = useState<string>("default");

  const handleCameraChange = useCallback(
    async (changedDevice: { state: string; device: { deviceId: string; label: string } }) => {
      const devices = await AgoraRTC.getCameras();
      setItems(
        devices.map((item) => ({
          label: item.label,
          value: item.deviceId,
          deviceId: item.deviceId,
        }))
      );

      if (videoTrack) {
        if (changedDevice.state === "ACTIVE") {
          // When plugging in a device, switch to a device that is newly plugged in.
          await videoTrack.setDevice(changedDevice.device.deviceId);
          setCurValue(videoTrack.getTrackLabel() || "default");
        } else if (changedDevice.device.label === curValue) {
          // Switch to an existing device when the current device is unplugged.
          if (devices[0]) {
            await videoTrack.setDevice(devices[0].deviceId);
            setCurValue(videoTrack.getTrackLabel() || "default");
          }
        }
      }
    },
    [videoTrack, curValue]
  );

  useEffect(() => {
    if (videoTrack) {
      const label = videoTrack.getTrackLabel();
      setCurValue(label || "default");

      AgoraRTC.getCameras().then((cams) => {
        setItems(
          cams.map((item) => ({
            label: item.label,
            value: item.deviceId,
            deviceId: item.deviceId,
          }))
        );
      });
    }

    AgoraRTC.onCameraChanged = handleCameraChange;

    return () => {
      // Clean up the event listener when the component unmounts
      // AgoraRTC.onCameraChanged = null;
    };
  }, [videoTrack, handleCameraChange]);

  const onChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const target = items.find((item) => item.value === e.target.value);
    if (target) {
      setCurValue(target.value);
      if (videoTrack) {
        // Switch device of the local video track.
        await videoTrack.setDevice(target.deviceId);
      }
    }
  };

  return (
    <select
      className="form-select cam-list"
      value={curValue}
      onChange={onChange}
    >
      {items.map((item) => (
        <option key={item.deviceId} value={item.value}>
          {item.label}
        </option>
      ))}
    </select>
  );
};
