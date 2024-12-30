import AgoraRTC, { IMicrophoneAudioTrack } from "agora-rtc-sdk-ng";
import React, { useState, useEffect, useCallback } from "react";

interface MicSelectProps {
  audioTrack?: IMicrophoneAudioTrack;
}

interface MicrophoneItem {
  label: string;
  value: string;
  deviceId: string;
}

export const MicSelect: React.FC<MicSelectProps> = ({ audioTrack }) => {
  const [items, setItems] = useState<MicrophoneItem[]>([
    {
      label: "Default",
      value: "default",
      deviceId: "",
    },
  ]);
  const [curValue, setCurValue] = useState<string>("default");

  const handleMicrophoneChange = useCallback(
    async (changedDevice: { state: string; device: { deviceId: string; label: string } }) => {
      const devices = await AgoraRTC.getMicrophones();
      setItems(
        devices.map((item) => ({
          label: item.label,
          value: item.deviceId,
          deviceId: item.deviceId,
        }))
      );

      if (audioTrack) {
        if (changedDevice.state === "ACTIVE") {
          // When plugging in a device, switch to a device that is newly plugged in.
          await audioTrack.setDevice(changedDevice.device.deviceId);
          setCurValue(audioTrack.getTrackLabel() || "default");
        } else if (changedDevice.device.label === curValue) {
          // Switch to an existing device when the current device is unplugged.
          if (devices[0]) {
            await audioTrack.setDevice(devices[0].deviceId);
            setCurValue(audioTrack.getTrackLabel() || "default");
          }
        }
      }
    },
    [audioTrack, curValue]
  );

  useEffect(() => {
    AgoraRTC.onMicrophoneChanged = handleMicrophoneChange;

    return () => {
      // Clean up the event listener when the component unmounts
      // AgoraRTC.onMicrophoneChanged = null;
    };
  }, [handleMicrophoneChange]);

  useEffect(() => {
    if (audioTrack) {
      const label = audioTrack.getTrackLabel();
      setCurValue(label || "default");

      AgoraRTC.getMicrophones().then((mics) => {
        setItems(
          mics.map((item) => ({
            label: item.label,
            value: item.deviceId,
            deviceId: item.deviceId,
          }))
        );
      });
    }
  }, [audioTrack]);

  const onChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const target = items.find((item) => item.value === e.target.value);
    if (target) {
      setCurValue(target.value);
      if (audioTrack) {
        // Switch device of the local audio track.
        await audioTrack.setDevice(target.deviceId);
      }
    }
  };

  return (
    <select
      className="form-select mic-list"
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
