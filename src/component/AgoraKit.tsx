import React, { useState, useRef, useEffect } from "react";
import { CamSelect } from "./CamSelect";
import { MicSelect } from "./MicSelect";
import { StreamPlayer } from "./StreamPlayer";
import AgoraRTC, {
  IAgoraRTCClient,
  ILocalAudioTrack,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  ILocalVideoTrack,
} from "agora-rtc-sdk-ng";
import SuccessIcon from "./SuccessIcon";
import { UID } from "agora-rtc-react";
import AgoraRTM, { RtmChannel, RtmClient } from "agora-rtm-sdk";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { agoraGetAppData } from "./utils";
import { ScreenShare } from "./ScreenShare";

AgoraRTC.onAutoplayFailed = () => {
  alert("Click to start autoplay!");
};

let rtcClient: IAgoraRTCClient;
let rtmClient: RtmClient;
let rtmChannel: RtmChannel;
let rtcScreenShareClient: IAgoraRTCClient;

interface Options {
  appid?: string | undefined;
  channel?: string;
  rtcToken?: string | null;
  rtmToken?: string | null;
  uid?: UID | null;
  audienceLatency: number;
  role: string;
  proxyMode?: string;
  certificate?: string;
}

const message = {
  success: (msg: string) => console.log("Success:", msg),
  error: (msg: string) => console.error("Error:", msg),
};
export type ILocalTrack = {
  audioTrack: (ILocalAudioTrack & IMicrophoneAudioTrack) | null;
  videoTrack: (ICameraVideoTrack & ILocalVideoTrack) | null;
  screenTrack: {
    screenAudioTrack: ILocalAudioTrack | null;
    screenVideoTrack: ILocalVideoTrack;
  } | null;
};

export const AgoraKit: React.FC = () => {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const username = searchParams.get("username");

  const navigate = useNavigate();
  const chan = params.meetingCode;
  const [localUserTrack, setLocalUserTrack] = useState<ILocalTrack | null>(
    null
  );
  const [joinDisabled, setJoinDisabled] = useState(true);
  const [showStepJoinSuccess, setShowStepJoinSuccess] = useState(false);
  const [leaveDisabled, setLeaveDisabled] = useState(true);
  const [remoteUsers, setRemoteUsers] = useState<Record<string, any>>({});
  const [remoteScreenShareUsers, setRemoteScreenShareUsers] = useState<Record<
    string,
    any
  > | null>({});

  const [joinRoom, setJoinRoom] = useState(false);
  const [stage, setStage] = useState("prepRoom");
  const remoteUsersRef = useRef(remoteUsers);
  const remoteScreenShareUsersRef = useRef(remoteScreenShareUsers);

  const [options, setOptions] = useState<Options>({
    channel: "",
    appid: "d9b1d4e54b9e4a01aac1de9833d83752",
    rtcToken: "",
    rtmToken: "",
    proxyMode: "",
    audienceLatency: 1,
    uid: null,
    role: "host",
    certificate: "",
  });

  const [rtcScreenShareOptions, setRtcScreenShareOptions] = useState<Options>({
    channel: "",
    appid: "d9b1d4e54b9e4a01aac1de9833d83752",
    rtcToken: "",
    rtmToken: "",
    proxyMode: "",
    audienceLatency: 1,
    uid: null,
    role: "host",
    certificate: "",
  });

  const [screenTrack, setScreenTrack] = useState<{
    screenVideoTrack: ILocalVideoTrack | null;
    screenAudioTrack: ILocalAudioTrack | null;
  } | null>(null);

  useEffect(() => {
    remoteUsersRef.current = remoteUsers;
  }, [remoteUsers]);

  useEffect(() => {
    remoteScreenShareUsersRef.current = remoteScreenShareUsers;
  }, [remoteScreenShareUsers]);

  useEffect(() => {
    if (chan && username) {
      const fetchAgoraData = async () => {
        try {
          const { rtcOptions, rtmOptions } = await agoraGetAppData(chan);

          setOptions((prev) => ({
            ...prev,
            appid: rtcOptions.appId,
            rtcToken: rtcOptions.token.tokenWithUid,
            rtmToken: rtmOptions.token,
            certificate: rtcOptions.appCertificate,
            uid: rtcOptions.uid,
            channel: rtcOptions.channelName,
          }));
        } catch (error) {
          console.error("Error fetching Agora data:", error);
        }
      };

      fetchAgoraData();

      const fetchAgoraScreenShareData = async () => {
        try {
          const { rtcOptions, rtmOptions } = await agoraGetAppData(chan);

          setRtcScreenShareOptions((prev) => ({
            ...prev,
            appid: rtcOptions.appId,
            rtcToken: rtcOptions.token.tokenWithUid,
            rtmToken: rtmOptions.token,
            certificate: rtcOptions.appCertificate,
            uid: rtcOptions.uid,
            channel: rtcOptions.channelName,
          }));
        } catch (error) {
          console.error("Error fetching Agora data:", error);
        }
      };

      fetchAgoraData();
      fetchAgoraScreenShareData();
      setJoinDisabled(false);
    }
  }, [chan, username]);

  const handleMuteRemoteUserMicrophone = (action: string, uid: number) => {
    console.log("action", action, `${action}-microphone`);
    rtmChannel.sendMessage({
      text: JSON.stringify({ command: `${action}-microphone`, uid: uid }),
    });
  };

  // Function to send a removal message
  const handleRemoveUser = async (message: string, uid: number) => {
    rtmChannel.sendMessage({
      text: JSON.stringify({ command: message, uid }),
    });
  };

  const handleTransferHostPermission = (action: string, uid: number) => {
    console.log("action", action, `${action}-microphone`);
    rtmChannel.sendMessage({
      text: JSON.stringify({ command: `transfer-host`, uid: uid }),
    });
  };

  const handleAdmitUsers = (action: string, uid: number) => {
    console.log("action", action, `${action}-microphone`);
    rtmChannel.sendMessage({
      text: JSON.stringify({ command: `${action}-microphone`, uid: uid }),
    });
  };

  const handleEndMeeting = (action: string, uid: number) => {
    console.log("action", action, `${action}-microphone`);
    rtmChannel.sendMessage({
      text: JSON.stringify({ command: `${action}-microphone`, uid: uid }),
    });
  };

  const handleEndScreenShare = async (action: string, uid: number) => {
    await handleScreenTrackEnd();

    rtmChannel.sendMessage({
      text: JSON.stringify({
        command: action,
        text: `${uid} has stopped presenting`,
      }),
    });

    rtmChannel.sendMessage({
      text: JSON.stringify({ command: "stop-remote-screenshare", uid }),
    });
  };

  const initRtm = async (name: string) => {
    rtmClient = AgoraRTM.createInstance(options.appid!);
    console.log("checking for error before...", rtmClient);
    await rtmClient.login({
      uid: String(options.uid!),
      token: options.rtmToken!,
    });
    console.log("checking for error after login...", rtmClient);

    const channel = rtmClient.createChannel(options.channel!);
    rtmChannel = channel;
    await channel.join();

    await rtmClient.addOrUpdateLocalUserAttributes({
      name: name,
      userRtcUid: String(options.uid!),
      // userAvatar: avatar,
    });

    getChannelMembers();

    window.addEventListener("beforeunload", leaveRtmChannel);

    channel.on("MemberJoined", handleMemberJoined);
    channel.on("MemberLeft", handleMemberLeft);

    channel.on("ChannelMessage", async ({ text }: any) => {
      const message = JSON.parse(text);

      if (message.uid === options.uid) {
        switch (message.command) {
          case "mute-microphone":
            if (
              localUserTrack?.audioTrack?.enabled ||
              localUserTrack?.videoTrack?.enabled
            ) {
              await localUserTrack?.audioTrack!.setEnabled(false);
              await localUserTrack?.videoTrack!.setEnabled(false);
            }
            break;

          case "unmute-microphone":
            if (
              !localUserTrack?.audioTrack?.enabled ||
              !localUserTrack?.videoTrack?.enabled
            ) {
              await localUserTrack?.audioTrack!.setEnabled(true);
              await localUserTrack?.videoTrack!.setEnabled(true);
            }
            break;

          case "LEAVE_MEETING":
            alert("You have been removed from the broadcast.");
            await stepLeave();
            await rtmClient.logout();
            break;

          default:
            console.warn(`Unknown command: ${message.command}`);
        }
      } else {
        switch (message.command) {
          // case "stop-remote-screenshare": {
          //   alert(message.text);

          //   const uid = message.uid;
          //   setRemoteScreenShareUsers((prevUsers) => ({
          //     ...prevUsers,
          //     [uid]: {
          //       ...prevUsers![uid],
          //       videoTrack: null,
          //     },
          //   }));
          //   break;
          // }

          case "give-host":
            console.log(`${message.uid} has been granted host permissions.`)
            alert(`${message.uid} has been granted host permissions.`);
            break;

          case "stop-remote-screenshare": {
            // if (screenTrack?.screenVideoTrack) {
            //   await rtcScreenShareClient.unpublish([screenTrack.screenVideoTrack]);
            //   screenTrack.screenVideoTrack.stop();
            // }
            // if (screenTrack?.screenAudioTrack) {
            //   await rtcScreenShareClient.unpublish([screenTrack.screenAudioTrack]);
            //   screenTrack.screenAudioTrack.stop();
            // }
        
            // setScreenTrack(null);

            let uid: string | number ;
            if (Object.keys(remoteUsers).length > 0) {
              uid = Object.keys(remoteUsers)[0];
              console.log('This is the place', remoteUsers);
              alert(`THIS IS UID, ${uid}`)
            }
            
            handleEndRemoteScreenTrack();
            
            
            break;
          }


          default:
            console.warn(`Unknown command for other user: ${message.command}`);
        }
      }
    });

    // channel.on("ChannelMessage", async ({ text }: any) => {
    //   const message = JSON.parse(text);
    //   if (message.uid === options.uid) {
    //     if (message.command === "mute-microphone") {
    //       if (
    //         localUserTrack?.audioTrack?.enabled ||
    //         localUserTrack?.videoTrack?.enabled
    //       ) {
    //         await localUserTrack?.audioTrack!.setEnabled(false);
    //         await localUserTrack?.videoTrack!.setEnabled(false);
    //       }
    //     } else if (message.command === "unmute-microphone") {
    //       if (
    //         !localUserTrack?.audioTrack?.enabled ||
    //         !localUserTrack?.videoTrack?.enabled
    //       ) {
    //         await localUserTrack?.audioTrack!.setEnabled(true);
    //         await localUserTrack?.videoTrack!.setEnabled(true);
    //       }
    //     } else if (message.command === "LEAVE_MEETING") {
    //       alert("You have been removed from the broadcast.");
    //       await stepLeave();
    //       await rtmClient.logout();
    //     }
    //   } else {
    //     if (message.command === "stop-remote-screenshare") {
    //       alert(message.text);

    //       const uid = message.uid;
    //       // setScreenTrack(null);

    //       setRemoteScreenShareUsers((prevUsers) => ({
    //         ...prevUsers,
    //         [uid]: {
    //           ...prevUsers![uid],
    //           videoTrack: null,
    //         },
    //       }));
    //       setRemoteUsers((prevUsers) => ({
    //         ...prevUsers,
    //         [uid]: {
    //           ...prevUsers![uid],
    //           videoTrack: null,
    //         },
    //       }));
    //     }
    //   }
    // });
  };

  const handleUserLeft = async (user: any) => {
    const uid = String(user.uid);
    const updatedUsers = { ...remoteUsersRef.current };
    delete updatedUsers[uid];
    remoteUsersRef.current = updatedUsers;
    setRemoteUsers(updatedUsers);
  };

  const leaveRtmChannel = async () => {
    await rtmChannel.leave();
    await rtmClient.logout();
    (rtmChannel as any) = null;
  };

  const getChannelMembers = async () => {
    const members = await rtmChannel.getMembers();

    for (let i = 0; members.length > i; i++) {
      console.log("showing members...", members);
      const { name, userRtcUid, userAvatar } =
        await rtmClient!.getUserAttributesByKeys(members[i], [
          "name",
          "userRtcUid",
          // "userAvatar",
        ]);

      console.log("rtm clients........", name, userRtcUid, userAvatar);
    }
  };

  const handleMemberLeft = async () => {
    // document.getElementById(MemberId).remove();
  };

  const handleMemberJoined = async (MemberId: string) => {
    const { name, userRtcUid, userAvatar } =
      await rtmClient.getUserAttributesByKeys(MemberId, [
        "name",
        "userRtcUid",
        // "userAvatar",
      ]);

    await rtmClient.getChannelAttributes(rtmChannel.channelId);

    // let newMember = `
    // <div class="speaker user-rtc-${userRtcUid}" id="${MemberId}">
    //   <img class="user-avatar avatar-${userRtcUid}" src="${userAvatar}"/>
    //     <p>${name}</p>
    // </div>`;

    // document
    //   .getElementById("members")
    //   .insertAdjacentHTML("beforeend", newMember);
    console.log("rtm clients........", name, userRtcUid, userAvatar);
  };

  const handleShareScreen = async () => {
    try {
      // Create screen sharing tracks
      const screenTracks = await AgoraRTC.createScreenVideoTrack(
        {
          encoderConfig: "1080p_1",
          optimizationMode: "detail",
        },
        "auto"
      );

      // Separate video and audio tracks
      const screenVideoTrack =
        screenTracks instanceof Array ? screenTracks[0] : screenTracks;
      const screenAudioTrack =
        screenTracks instanceof Array ? screenTracks[1] : null;

      if (!screenVideoTrack) {
        console.error("Failed to create screen video track.");
        return;
      }

      // Bind the "track-ended" event to handle stop sharing
      screenVideoTrack.on("track-ended", handleScreenTrackEnd);

      // Update screenTrack state
      setScreenTrack({
        screenVideoTrack,
        screenAudioTrack,
      });

      if (screenVideoTrack) {
        await rtcScreenShareClient.publish([screenVideoTrack]);
      }

      if (screenAudioTrack) {
        await rtcScreenShareClient.publish([screenAudioTrack]);
      }
    } catch (error) {
      console.error("Error during screen sharing:", error);
    }
  };

  const handleScreenTrackEnd = async () => {
    // Unpublish and reset the screen tracks
    if (screenTrack?.screenVideoTrack) {
      await rtcScreenShareClient.unpublish([screenTrack.screenVideoTrack]);
      screenTrack.screenVideoTrack.stop();
    }
    if (screenTrack?.screenAudioTrack) {
      await rtcScreenShareClient.unpublish([screenTrack.screenAudioTrack]);
      screenTrack.screenAudioTrack.stop();
    }

    setScreenTrack(null);

    const uid = Object.keys(remoteScreenShareUsers!)[0];
    setRemoteScreenShareUsers((prevUsers) => ({
      ...prevUsers,
      [uid]: {
        ...prevUsers![uid],
        videoTrack: null,
      },
    }));
    rtmChannel.sendMessage({
      text: JSON.stringify({ command: "stop-remote-screenshare", uid }),
    });
  };

  const handleEndRemoteScreenTrack = () => {
    if (screenTrack?.screenVideoTrack) {
      screenTrack.screenVideoTrack.stop();
    }
    if (screenTrack?.screenAudioTrack) {
      screenTrack.screenAudioTrack.stop();
    }

    setScreenTrack(null);

    const uid = Object.keys(remoteScreenShareUsers!)[0];
    setRemoteScreenShareUsers((prevUsers) => ({
      ...prevUsers,
      [uid]: {
        ...prevUsers![uid],
        videoTrack: null,
      },
    }));
  }

  async function sendHostPermission(message: string, uid: string | number) {
    try {
      // Assuming you have an API endpoint to send host permissions
      rtmChannel.sendMessage({
        text: JSON.stringify({ command: message, uid }),
      });
    } catch (error) {
      console.error("Error sending host permission:", error);
    }
  }

  // message.command === "end-screenshare" && message.text

  const handleConfigureWaitingArea = async () => {
    const [audioTrack, videoTrack] = await Promise.all([
      AgoraRTC.createMicrophoneAudioTrack({
        encoderConfig: "music_standard",
      }),
      AgoraRTC.createCameraVideoTrack(),
    ]);

    setLocalUserTrack({
      audioTrack,
      videoTrack,
      screenTrack: null,
    });
  };

  useEffect(() => {
    handleConfigureWaitingArea();
  }, []);

  const removeAllIconss = () => {
    setShowStepJoinSuccess(false);
  };

  const stepJoin = async () => {
    try {
      if (!options) return;

      console.log("options finally:", options);
      setJoinRoom(true);
      setStage("joinRoom");
      await join();
      // initVolumeIndicator();
      setOptions(options);
      setShowStepJoinSuccess(true);

      setJoinDisabled(true);
      setLeaveDisabled(false);
      await createTrackAndPublish();
    } catch (error: any) {
      message.error(error.message || "An error occurred");
      console.error(error);
    }
  };

  const stepLeave = async () => {
    await leave();
    message.success("Leave channel success!");
    removeAllIconss();
    setJoinDisabled(true);
    setLeaveDisabled(true);

    navigate("/");
  };

  const join = async () => {
    rtcClient = AgoraRTC.createClient({
      mode: "live",
      codec: "vp8",
    });

    rtcClient.on("user-published", handleUserPublished);
    rtcClient.on("user-unpublished", handleUserUnpublished);
    rtcClient.on("user-left", handleUserLeft);

    const mode = options?.proxyMode ?? 0;
    if (mode !== 0 && !isNaN(parseInt(mode))) {
      rtcClient.startProxyServer(parseInt(mode));
    }

    if (options.role === "audience") {
      rtcClient.setClientRole(options.role, { level: options.audienceLatency });
      // add event listener to play remote tracks when remote user publishs.
    } else if (options.role === "host") {
      rtcClient.setClientRole(options.role);
    }

    options.uid = await rtcClient.join(
      options.appid || "",
      options.channel || "",
      options.rtcToken || null,
      options.uid || null
    );

    await joinRtcScreenShare();
    await initRtm(username!);
  };

  const joinRtcScreenShare = async () => {
    rtcScreenShareClient = AgoraRTC.createClient({
      mode: "live",
      codec: "vp8",
    });

    rtcClient.on("user-left", handleUserLeft);
    rtcScreenShareClient.on("user-published", handleUserPublishedScreen);
    rtcScreenShareClient.on("user-unpublished", handleUserUnpublishedScreen);

    const mode = rtcScreenShareOptions?.proxyMode ?? 0;
    if (mode !== 0 && !isNaN(parseInt(mode))) {
      rtcScreenShareClient.startProxyServer(parseInt(mode));
    }

    if (rtcScreenShareOptions.role === "audience") {
      rtcScreenShareClient.setClientRole(rtcScreenShareOptions.role, {
        level: rtcScreenShareOptions.audienceLatency,
      });
      // add event listener to play remote tracks when remote user publishs.
    } else if (rtcScreenShareOptions.role === "host") {
      rtcScreenShareClient.setClientRole(rtcScreenShareOptions.role);
    }

    const uid =
      rtcScreenShareOptions &&
      rtcScreenShareOptions.uid &&
      `${parseInt(`${rtcScreenShareOptions.uid}`) + 1}`;
    rtcScreenShareOptions.uid = await rtcScreenShareClient.join(
      rtcScreenShareOptions.appid || "",
      rtcScreenShareOptions.channel || "",
      rtcScreenShareOptions.rtcToken || null,
      rtcScreenShareOptions.uid || null
    );
  };

  const handleUserPublished = (user: any, mediaType: "audio" | "video") => {
    subscribe(user, mediaType);
  };

  const handleUserUnpublished = (user: any, mediaType: "audio" | "video") => {
    console.log("Checking if this event was called.........", remoteUsers);

    const uid = String(user.uid);
    setRemoteUsers((prevUsers) => ({
      ...prevUsers,
      [uid]: {
        ...prevUsers[uid],
        [mediaType]: null, // Indicate muted state
      },
    }));
  };

  const handleUserPublishedScreen = (
    user: any,
    mediaType: "audio" | "video"
  ) => {
    rtcSubscribeScreen(user, mediaType);
  };

  const handleUserUnpublishedScreen = (
    user: any,
    mediaType: "audio" | "video"
  ) => {
    console.log("Checking if this event was called.........", remoteUsers);

    const uid = String(user.uid);
    setRemoteScreenShareUsers((prevUsers) => ({
      ...prevUsers,
      [uid]: {
        ...prevUsers![uid],
        [mediaType]: null,
      },
    }));
  };

  const createTrackAndPublish = async () => {
    if (
      localUserTrack &&
      localUserTrack.audioTrack &&
      localUserTrack.videoTrack
    ) {
      await rtcClient.publish([
        localUserTrack.audioTrack,
        localUserTrack.videoTrack,
      ]);
    }
  };

  const subscribe = async (user: any, mediaType: "audio" | "video") => {
    await rtcClient.subscribe(user, mediaType);

    const uid = String(user.uid);
    if (mediaType === "video") {
      const videoTrack = user.videoTrack;
      setRemoteUsers((prevUsers) => ({
        ...prevUsers,
        [uid]: {
          ...prevUsers[uid],
          videoTrack,
        },
      }));
    }
    if (mediaType === "audio") {
      const audioTrack = user.audioTrack;
      audioTrack.play();
    }
  };

  const rtcSubscribeScreen = async (
    user: any,
    mediaType: "audio" | "video"
  ) => {
    await rtcScreenShareClient.subscribe(user, mediaType);

    const uid = String(user.uid);
    if (mediaType === "video" && user.videoTrack.isScreenTrack) {
      const videoTrack = user.videoTrack;

      const remoteScreenUsers = Object.keys(remoteScreenShareUsers!);
      if (remoteScreenShareUsers!.length > 0) {
        const currentUserScreen = remoteScreenUsers[0];

        setRemoteScreenShareUsers((prevUsers) => ({
          ...prevUsers,
          [currentUserScreen]: {
            ...prevUsers![uid],
            videoTrack,
          },
        }));
      } else {
        setRemoteScreenShareUsers((prevUsers) => ({
          ...prevUsers,
          [uid]: {
            ...prevUsers![uid],
            videoTrack,
          },
        }));
      }
    }
    if (mediaType === "audio") {
      const audioTrack = user.audioTrack;
      audioTrack.play();
    }
  };

  const leave = async () => {
    if (localUserTrack) {
      localUserTrack.audioTrack?.close();
      localUserTrack?.audioTrack?.stop();

      localUserTrack.videoTrack?.close();
      localUserTrack.videoTrack?.stop();
      setLocalUserTrack({
        videoTrack: null as any,
        audioTrack: null as any,
        screenTrack: null,
      });
    }

    setRemoteUsers({});
    await rtcClient.unpublish();
    await rtcClient.leave();

    leaveRtmChannel();
  };

  return (
    <div className="flex flex-col w-full h-full">
      {/* Video Section */}
      <div className="container flex w-full h-full overflow-hidden">
        <>
          <div className="grid grid-cols-2">
            <div className="video-group w-full lg:w-1/2">
              {joinRoom && (
                <div className="flex flex-col video-group w-full lg:w-1/2">
                  <div>
                    <h3>Channel name: {options?.channel || ""}</h3>
                  </div>
                </div>
              )}
              {/*  Channel Participants */}
              <section className="w-full border rounded shadow-md">
                <div className="bg-gray-100 text-gray-700 font-semibold px-4 py-2 border-b">
                  Channel Participants
                </div>
                <div className="p-4">
                  <div id="remote-playerlist" className="h-auto w-full">
                    <p> Local User: {options?.uid} </p>

                    {Object.keys(remoteUsers).map((uid) => {
                      const user = remoteUsers[uid];
                      console.log("remote user", remoteUsers);
                      return (
                        // <div className=" flex items-center justify-between"  >
                        <p
                          className="flex items-center justify-between"
                          key={uid}
                        >
                          User: {user?.name} {uid}
                          <button
                            className="flex border bg-gray-400"
                            onClick={() =>
                              handleMuteRemoteUserMicrophone(
                                "mute",
                                parseInt(uid)
                              )
                            }
                          >
                            <span>🔇</span>
                          </button>
                          <button
                            className="flex border bg-gray-400"
                            onClick={() =>
                              handleMuteRemoteUserMicrophone(
                                "unmute",
                                parseInt(uid)
                              )
                            }
                          >
                            <span>🔊</span>
                          </button>
                          <button
                            className="flex border bg-gray-400"
                            onClick={() =>
                              handleRemoveUser("LEAVE_MEETING", parseInt(uid))
                            }
                          >
                            <span>❌</span>
                          </button>
                          <button
                            className="px-2 py-1 text-sm rounded bg-blue-500 hover:bg-blue-600 text-white"
                            onClick={() => {
                              sendHostPermission("give-host", uid);
                            }}
                          >
                            Give host
                          </button>
                        </p>
                      );
                    })}
                  </div>
                </div>
              </section>

              {/* Local Stream */}
              <div className="flex flex-wrap gap-4">
                {localUserTrack &&
                  (stage === "prepRoom" || stage === "joinRoom") && (
                    <section className="border rounded shadow-md mb-4">
                      <div className="bg-gray-100 text-gray-700 font-semibold px-4 py-2 border-b">
                        Local Stream
                      </div>
                      <div className="p-4">
                        <StreamPlayer
                          videoTrack={localUserTrack?.videoTrack || null}
                          audioTrack={localUserTrack?.audioTrack || null}
                          uid={options?.uid || ""}
                        />
                      </div>
                    </section>
                  )}

                {/* Remote Stream */}
                <section className="border rounded shadow-md w-full lg:w-1/2">
                  {joinRoom &&
                    remoteUsers &&
                    Object.keys(remoteUsers).map((uid) => {
                      const user = remoteUsers[uid];
                      console.log("remote user", user);
                      if (
                        user.videoTrack &&
                        String(uid) !== String(rtcScreenShareOptions.uid)
                      ) {
                        return (
                          <>
                            <div key={uid} className="p-4">
                              <div
                                id="remote-playerlist"
                                className="min-h-[220px] w-full"
                              >
                                <div className="bg-gray-100 text-gray-700 font-semibold px-2 py-2 border-b">
                                  Remote Stream
                                </div>
                                <StreamPlayer
                                  key={uid}
                                  videoTrack={user.videoTrack || undefined}
                                  audioTrack={user.audioTrack || undefined}
                                  // screenTrack={user.screenTrack || undefined}
                                  uid={uid}
                                />
                              </div>
                            </div>
                          </>
                        );
                      }
                      return null;
                    })}
                </section>

                <section className="border rounded shadow-md w-full lg:w-1/2">
                  {screenTrack?.screenVideoTrack && (
                    <ScreenShare
                      screenTrack={screenTrack}
                      uid={String(rtcScreenShareOptions?.uid)}
                    />
                  )}
                </section>

                {/* Remote Screen Sharers */}
                <section className="border rounded shadow-md w-full lg:w-1/2">
                  {joinRoom &&
                    remoteScreenShareUsers &&
                    Object.keys(remoteScreenShareUsers!).length > 0 &&
                    Object.values(remoteScreenShareUsers!)[0].videoTrack !==
                      null &&
                    Object.keys(remoteScreenShareUsers).map((uid) => {
                      const user = remoteScreenShareUsers[uid];
                      if (
                        user.videoTrack &&
                        String(uid) !== String(rtcScreenShareOptions.uid)
                      ) {
                        return (
                          <>
                            <div className="p-4">
                              <div
                                id="remote-screen-share-playerlist"
                                className="min-h-[220px] w-full"
                              >
                                <div className="bg-gray-100 text-gray-700 font-semibold px-2 py-2 border-b">
                                  Remote Stream
                                </div>

                                <ScreenShare
                                  key={uid}
                                  screenTrack={user.videoTrack || undefined}
                                  uid={user?.uid}
                                />
                              </div>
                            </div>
                          </>
                        );
                      }
                      return null;
                    })}
                </section>
              </div>
            </div>
          </div>
        </>
      </div>

      {stage === "joinRoom" && (
        <div>
          <button
            className="h-12 rounded-lg w-auto ml-4 bg-blue-600 text-white"
            onClick={() => {
              handleShareScreen();
            }}
          >
            Share Screen
          </button>

          <button
            className="h-12 rounded-lg w-auto ml-4 bg-red-600 text-white"
            onClick={() => {
              handleEndScreenShare(
                "end-screenshare",
                parseInt(`${options.uid}`)
              );
            }}
          >
            End Presentation
          </button>
        </div>
      )}

      {/* Form Section */}
      <div className="col-lg-6">
        <form id="join-form" name="join-form">
          {/* Steps Section */}
          <div className="flex flex-col p-4 mt-2 gap-3">
            {/* Step 3 */}
            {stage === "prepRoom" && (
              <div className="flex flex-col step">
                {/* Microphone */}
                <label className="form-label mt-2">Microphone</label>
                {localUserTrack?.audioTrack && (
                  <MicSelect audioTrack={localUserTrack.audioTrack} />
                )}
                {/* Camera */}
                <label className="form-label mt-2">Camera</label>
                {localUserTrack?.videoTrack && (
                  <CamSelect videoTrack={localUserTrack.videoTrack} />
                )}
              </div>
            )}

            {/* Step 2 */}
            {stage === "prepRoom" && (
              <button
                type="button"
                id="step-join"
                className="btn btn-primary btn-sm border border-blue-950"
                disabled={joinDisabled}
                onClick={stepJoin}
              >
                Join Channel
                {showStepJoinSuccess && <SuccessIcon />}
              </button>
            )}

            {stage === "joinRoom" && (
              <div>
                <button
                  type="button"
                  id="step-leave"
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-red-300 disabled:cursor-not-allowed"
                  disabled={leaveDisabled}
                  onClick={stepLeave}
                >
                  Leave Channel
                </button>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
