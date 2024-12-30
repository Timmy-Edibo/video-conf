import React, { useState, useEffect } from "react";
import AgoraRTC, { IAgoraRTC } from "agora-rtc-sdk-ng";
import AgoraRTM from "agora-rtm-sdk";
import "../styles.css";
import { useParams } from "react-router";

const appId = "a073ff90d2c64445a9887314e1c66810";
const rtcToken = null;
// const rtcToken =
//   "007eJxTYPA1qdu464//A65pHKImi8r4L/hYTPA8eGTeCn3l2Q9CSxoUGCwNTFJNky0Njc2SLUwSLQ0tjJOSLFIsTM0SE5MSE9OSbM7mpzcEMjIk3ZzJxMgAgSA+C0NJanEJAwMACwkfQA==";
const rtmToken = undefined;


interface Member {
  id: string;
  name: string;
  userRtcUid: string;
  userAvatar: string;
}

const App: React.FC = () => {
  const [rtcClient, setRtcClient] = useState<ReturnType<
    typeof AgoraRTC.createClient
  > | null>(null);
  const [rtmClient, setRtmClient] = useState<ReturnType<
    typeof AgoraRTM.createInstance
  > | null>(null);
  const [channel, setChannel] = useState<any | null>(null);

  const [localAudioTrack, setLocalAudioTrack] = useState<any>(null);
  const [members, setMembers] = useState<Member[] | null>(null);
  const [remoteAudioTracks, setRemoteAudioTracks] = useState<{
    [key: string]: any;
  }>({});
  const [micMuted, setMicMuted] = useState(true);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const rtmUid = String(Math.floor(Math.random() * 2032));
  const rtcUid = Math.floor(Math.random() * 2032);

  const params = useParams();
  //   const roomCode = params.roomCode;

  //   useEffect(() => {
  //     if (roomCode) {
  //       setRoomId(roomCode);
  //     }
  //   }, [roomCode]);

  const initRtm = async (name: string) => {
    const rtmInstance = AgoraRTM.createInstance(appId);
    await rtmInstance.login({
      uid: rtmUid,
      token: rtmToken,
    });

    const rtmChannel = rtmInstance.createChannel(roomId!);
    await rtmChannel.join();

    await rtmInstance.addOrUpdateLocalUserAttributes({
      name,
      userRtcUid: String(rtcUid),
      userAvatar: avatar || "",
    });

    getChannelMembers();

    setRtmClient(rtmInstance);
    setChannel(rtmChannel);

    window.addEventListener("beforeunload", () => leaveRtmChannel());

    rtmChannel.on("MemberJoined", handleMemberJoined);
    rtmChannel.on("MemberLeft", handleMemberLeft);
  };

  const initRtc = async () => {
    const rtcInstance = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    rtcInstance.on("user-published", handleUserPublished);
    rtcInstance.on("user-left", handleUserLeft);

    await rtcInstance.join(appId, roomId!, rtcToken, rtcUid);
    const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
    audioTrack.setMuted(micMuted);

    await rtcInstance.publish(audioTrack);

    setRtcClient(rtcInstance);
    setLocalAudioTrack(audioTrack);

    initVolumeIndicator(rtcInstance);
  };

  const initVolumeIndicator = (
    rtcInstance: ReturnType<typeof AgoraRTC.createClient>
  ) => {
    // rtcClient.setParameter("AUDIO_VOLUME_INDICATION_INTERVAL", 200);
    rtcInstance.enableAudioVolumeIndicator();

    rtcInstance.on("volume-indicator", (volumes) => {
      volumes.forEach(({ uid, level }) => {
        const item = document.querySelector(`.avatar-${uid}`) as HTMLElement;
        if (item) {
          item.style.borderColor = level >= 50 ? "#00ff00" : "#fff";
        }
      });
    });
  };

  const handleUserPublished = async (user: any, mediaType: string) => {
    if (!rtcClient) return;

    if (mediaType === "audio" || mediaType === "video") {
      await rtcClient.subscribe(user, mediaType);
    } else {
      console.log(`Received unsupported media type: ${mediaType}`);
      return;
    }

    if (mediaType === "audio") {
      setRemoteAudioTracks((prev) => ({
        ...prev,
        [user.uid]: user.audioTrack,
      }));
      user.audioTrack.play();
    }
  };

  const handleUserLeft = (user: any) => {
    setRemoteAudioTracks((prev) => {
      const { [user.uid]: _, ...rest } = prev;
      return rest;
    });
  };

  const getChannelMembers = async () => {
    try {
      const memberIds: string[] = await channel.getMembers();

      if (rtmClient) {
        const memberData = await Promise.all(
          memberIds.map(async (memberId) => {
            const attributes = await rtmClient.getUserAttributesByKeys(
              memberId,
              ["name", "userRtcUid", "userAvatar"]
            );

            return {
              id: memberId,
              name: attributes?.name,
              userRtcUid: attributes?.userRtcUid,
              userAvatar: attributes?.userAvatar,
            };
          })
        );

        memberData && setMembers({ ...memberData });
      }
    } catch (error) {
      console.error("Error fetching channel members:", error);
    }
  };

  const handleMemberJoined = async (MemberId: string) => {
    if (!rtmClient) return;
    const attributes = await rtmClient.getUserAttributesByKeys(MemberId, [
      "name",
      "userRtcUid",
      "userAvatar",
    ]);
    const newMember = `
      <div class="speaker user-rtc-${attributes.userRtcUid}" id="${MemberId}">
        <img class="user-avatar avatar-${attributes.userRtcUid}" src="${attributes.userAvatar}"/>
        <p>${attributes.name}</p>
      </div>`;
    document
      .getElementById("members")
      ?.insertAdjacentHTML("beforeend", newMember);
  };

  const handleMemberLeft = (MemberId: string) => {
    document.getElementById(MemberId)?.remove();
  };

  const toggleMic = () => {
    if (!localAudioTrack) return;
    localAudioTrack.setMuted(!micMuted);
    setMicMuted(!micMuted);
  };

  const leaveRtmChannel = async () => {
    await channel.leave();
    await rtmClient?.logout();
  };

  const leaveRoom = async () => {
    if (!rtcClient || !localAudioTrack) return;
    localAudioTrack.stop();
    localAudioTrack.close();
    rtcClient.unpublish();
    await rtcClient.leave();

    if (rtmClient && channel) {
      leaveRtmChannel();
    }

    setRtcClient(null);
    setLocalAudioTrack(null);
    setRemoteAudioTracks({});
  };

  const enterRoom = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // if (!avatar) {
    //   alert("Please select an avatar");
    //   return;
    // }

    const target = e.target as typeof e.target & {
      roomname: { value: string };
      displayname: { value: string };
    };

    const newRoomId = target.roomname.value.toLowerCase();
    setRoomId(newRoomId);
    window.history.replaceState(null, "", `?room=${newRoomId}`);

    await initRtc();
    await initRtm(target.displayname.value);
  };

  return (
    <div>
      <form id="form" onSubmit={enterRoom}>
        <input
          name="roomname"
          value={roomId || ""}
          onChange={(e) => setRoomId(e.target.value)}
          placeholder="Enter Room Name"
        />
        <input name="displayname" placeholder="Enter Display Name" />
        <button className="bg-blue-500" type="submit">Join Room</button>
      </form>
      <div id="room-header" style={{ display: "none" }}>
        <span id="room-name">{roomId}</span>
        <button onClick={leaveRoom}>Leave Room</button>
      </div>
      <div id="members"></div>
      <div>
        <button className="bg-blue-500" id="mic-icon" onClick={toggleMic}>
          {micMuted ? "Unmute Mic" : "Mute Mic"}
        </button>
      </div>
      {/* <div className="avatar-selection">Render Avatar Options Here</div> */}
    </div>
  );
};

export default App;
