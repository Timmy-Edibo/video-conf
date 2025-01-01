import React, { useState, useRef, useEffect } from "react";
import { CamSelect } from "./CamSelect";
import { MicSelect } from "./MicSelect";
import { StreamPlayer } from "./StreamPlayer";
import AgoraRTC, {
  IAgoraRTCClient,
  ILocalAudioTrack,
  ICameraVideoTrack,
  ScreenVideoTrackInitConfig,
  IMicrophoneAudioTrack,
  ILocalVideoTrack,
} from "agora-rtc-sdk-ng";
import SuccessIcon from "./SuccessIcon";
import { UID } from "agora-rtc-react";
import AgoraRTM, { RtmChannel, RtmClient } from "agora-rtm-sdk";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { agoraGetAppData } from "./utils";
import { ScreenShare } from "./ScreenShare";
import { useWebSocket } from "../context/WebSocket";

AgoraRTC.onAutoplayFailed = () => {
  alert("Click to start autoplay!");
};

let rtcClient: IAgoraRTCClient;
let rtmClient: RtmClient;
let rtmChannel: RtmChannel;

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
  const ws = useWebSocket();

  const chan = params.meetingCode;
  const [localUserTrack, setLocalUserTrack] = useState<ILocalTrack | undefined>(
    undefined
  );
  const navigate = useNavigate();

  const [joinDisabled, setJoinDisabled] = useState(true);
  useState(false);
  const [showStepJoinSuccess, setShowStepJoinSuccess] = useState(false);
  const [leaveDisabled, setLeaveDisabled] = useState(true);
  const [mirrorCheckDisabled, setMirrorCheckDisabled] = useState(true);
  const [mirrorChecked, setMirrorChecked] = useState(true);
  const [remoteUsers, setRemoteUsers] = useState<Record<string, any>>({});
  const [audioChecked, setAudioChecked] = useState(true);
  const [videoChecked, setVideoChecked] = useState(true);
  const [joinRoom, setJoinRoom] = useState(false);
  const remoteUsersRef = useRef(remoteUsers);
  const wsRef = useRef<typeof ws | null>(null);
  const [userProfiles, setUserProfiles] = useState<
    | {
        uid: string;
        name: string;
        userRtcUid: string;
        userAvatar: string;
      }[]
    | null
  >(null);
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

  useEffect(() => {
    remoteUsersRef.current = remoteUsers;
  }, [remoteUsers]);

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
      setJoinDisabled(false);
    }
  }, []);

  useEffect(() => {
    wsRef.current = ws;
    try {
      if (ws) {
        ws.connect();

        ws.on("auth_error", (error: string) => {
          console.error("WebSocket authentication error:", error);
        });

        ws.on("suggested_username_response", (response: any) => {
          console.log("Suggested usernames from DB:", response);
        });

        ws.on("connect_error", (error) => {
          console.error("WebSocket connection error:", error);
        });

        ws.on("mute-remote-user-microphone", async (result) => {
          if (result.uid.toString() === options.uid?.toString()) {
            console.log("handleMuteRemoteUserMicrophone....", result);
            if (localUserTrack?.audioTrack?.isPlaying) {
              localUserTrack?.audioTrack!.setEnabled(false);
            } else if (localUserTrack?.videoTrack?.isPlaying) {
              await localUserTrack?.videoTrack!.setEnabled(false);
            }
          }
        });
      }
    } catch (error) {
      console.error("WebSocket error:", error);
    }
  }, [ws]);

  const handleMuteRemoteUserMicrophone = (uid: number) => {
    const userId = remoteUsers[uid];
    console.log("microphone....", userId.uid);
    const data = { uid };
    wsRef?.current?.emit("mute-remote-user-microphone", data);
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
  };

  // let initVolumeIndicator = async () => {
  //   //1
  //   (AgoraRTC as any).setParameter("AUDIO_VOLUME_INDICATION_INTERVAL", 200);
  //   client!.enableAudioVolumeIndicator();

  //   //2
  //   client!.on("volume-indicator", (volumes) => {
  //     volumes.forEach((volume) => {
  //       console.log(`UID ${volume.uid} Level ${volume.level}`);

  //       //3
  //       try {
  //         // let item = document.getElementsByClassName(`avatar-${volume.uid}`)[0];

  //         // if (volume.level >= 50) {
  //         //   item.style.borderColor = "#00ff00";
  //         // } else {
  //         //   item.style.borderColor = "#fff";
  //         // }
  //       } catch (error) {
  //         console.error(error);
  //       }
  //     });
  //   });
  // };

  const handleUserLeft = async (user: any) => {
    const uid = String(user.uid);
    const updatedUsers = { ...remoteUsersRef.current };
    delete updatedUsers[uid];
    remoteUsersRef.current = updatedUsers;
    setRemoteUsers(updatedUsers);
  };

  let leaveRtmChannel = async () => {
    await rtmChannel.leave();
    await rtmClient.logout();
    (rtmChannel as any) = null;
  };

  let getChannelMembers = async () => {
    const members = await rtmChannel.getMembers();

    for (let i = 0; members.length > i; i++) {
      console.log("showing members...", members);
      let { name, userRtcUid, userAvatar } =
        await rtmClient!.getUserAttributesByKeys(members[i], [
          "name",
          "userRtcUid",
          // "userAvatar",
        ]);

      // let newMember = `
      // <div class="speaker user-rtc-${userRtcUid}" id="${members[i]}">
      //     <img class="user-avatar avatar-${userRtcUid}" src="${userAvatar}"/>
      //     <p>${name}</p>
      // </div>`;

      // document
      //   .getElementById("members")
      //   .insertAdjacentHTML("beforeend", newMember);
      console.log("rtm clients........", name, userRtcUid, userAvatar);
    }
  };

  const handleMemberLeft = async (MemberId: string) => {
    // document.getElementById(MemberId).remove();
  };

  let handleMemberJoined = async (MemberId: string) => {
    let { name, userRtcUid, userAvatar } =
      await rtmClient.getUserAttributesByKeys(MemberId, [
        "name",
        "userRtcUid",
        // "userAvatar",
      ]);

    // let newMember = `
    // <div class="speaker user-rtc-${userRtcUid}" id="${MemberId}">
    //   <img class="user-avatar avatar-${userRtcUid}" src="${userAvatar}"/>
    //     <p>${name}</p>
    // </div>`;

    // document
    //   .getElementById("members")
    //   .insertAdjacentHTML("beforeend", newMember);
    console.log("rtm clients........", name, userRtcUid, userAvatar);
    // setUserProfiles((prev: any) => [
    //   ...prev,
    //   { uid: MemberId, name, userRtcUid, userAvatar },
    // ]);
  };

  const handleShareScreen = async () => {
    try {
      if (localUserTrack?.videoTrack?.isPlaying) {
        alert("stopping video sharing");
        await localUserTrack.videoTrack.setEnabled(false);
        // add global context for setting mute button for video and audio
        // message.info("Screen sharing paused.");
        // setPauseScreenShare(true);
      }

      // Create the screen video and audio tracks
      const [screenTrack] = await Promise.all([
        AgoraRTC.createScreenVideoTrack(
          {
            encoderConfig: "720p",
          },
          "auto"
        ),
      ]);

      // Prepare screen track object
      let screenVideoTrack = null;
      let screenAudioTrack = null;

      if (screenTrack instanceof Array) {
        // Array: Separate video and audio tracks
        screenVideoTrack = screenTrack[0];
        screenAudioTrack = screenTrack[1];
      } else {
        // Single track: Only video
        screenVideoTrack = screenTrack;
      }

      if (screenVideoTrack) {
        // Bind the "track-ended" event to handle the case where sharing stops
        screenVideoTrack.on("track-ended", handleScreenTrackEnd);

        // Update the state with the new screen tracks
        setLocalUserTrack((prev) => ({
          audioTrack:
            prev?.audioTrack ??
            ({} as ILocalAudioTrack & IMicrophoneAudioTrack),
          videoTrack:
            prev?.videoTrack ?? ({} as ICameraVideoTrack & ILocalVideoTrack),
          screenTrack: {
            screenVideoTrack,
            screenAudioTrack,
          },
        }));

        if (screenVideoTrack) {
          await rtcClient.publish([screenVideoTrack]);
          console.log("Screen video track added.");
        }
        if (screenAudioTrack) {
          // await rtcClient.unpublish([localUserTrack!.videoTrack]);
          await rtcClient.publish([screenAudioTrack]);
          console.log("Screen audio track added.");
        }
      } else {
        console.error("Failed to create screen video track.");
      }
    } catch (error) {
      console.error("Error during screen sharing:", error);
    }
  };

  // This function will be called when the user stops screen sharing
  const handleScreenTrackEnd = async () => {
    // message.info(
    //   `Screen-share track ended, stop sharing screen ` +
    //     localTracks.screenVideoTrack.getTrackId()
    // );
    localUserTrack?.screenTrack?.screenVideoTrack &&
      localUserTrack?.screenTrack?.screenVideoTrack.close();
    localUserTrack?.screenTrack?.screenAudioTrack &&
      localUserTrack?.screenTrack?.screenAudioTrack.close();

    alert("Screen sharing has ended.");
    setLocalUserTrack((prev) => ({
      audioTrack:
        prev?.audioTrack ?? ({} as ILocalAudioTrack & IMicrophoneAudioTrack),
      videoTrack:
        prev?.videoTrack ?? ({} as ICameraVideoTrack & ILocalVideoTrack),
      screenTrack: null,
    }));

    const { screenVideoTrack, screenAudioTrack } =
      localUserTrack?.screenTrack || {};
    if (screenVideoTrack) {
      await rtcClient.unpublish([screenVideoTrack]);
      console.log("Screen video track unpublished.");
    }
    if (screenAudioTrack) {
      await rtcClient.unpublish([screenAudioTrack]);
      console.log("Screen audio track unpublished.");
    }
  };

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
      await join();
      // initVolumeIndicator();
      setOptions(options);
      setShowStepJoinSuccess(true);

      message.success("Join channel success!");
      setJoinDisabled(true);
      setLeaveDisabled(false);
      setMirrorCheckDisabled(false);
      stepPublish();
    } catch (error: any) {
      message.error(error.message || "An error occurred");
      console.error(error);
    }
  };

  const stepPublish = async () => {
    await createTrackAndPublish();
    message.success("Create tracks and publish success!");
    setMirrorCheckDisabled(true);
  };

  const stepLeave = async () => {
    await leave();
    message.success("Leave channel success!");
    removeAllIconss();
    setJoinDisabled(true);
    setLeaveDisabled(true);
    setMirrorCheckDisabled(true);
    navigate("/");
  };

  const setMute = async (type: "audio" | "video", state: boolean) => {
    try {
      if (type === "audio") {
        await localUserTrack?.audioTrack?.setMuted(state);
      } else if (type === "video") {
        await localUserTrack?.videoTrack?.setMuted(state);
      } else {
        throw new Error("Invalid track type or track does not support muting");
      }
    } catch (err: any) {
      console.error(err);
      message.error(
        err.message || "An error occurred while setting mute state"
      );
    }
  };

  const setMuteByAdmin = async (
    type: "audio" | "video",
    state: boolean,
    userMediaTrack: ILocalAudioTrack | ILocalVideoTrack
  ) => {
    try {
      if ((type === "audio" || "video") && "setMuted" in userMediaTrack) {
        await userMediaTrack.setMuted(state);
      } else {
        throw new Error("Invalid track type or track does not support muting");
      }
    } catch (err: any) {
      console.error(err);
      message.error(
        err.message || "An error occurred while setting mute state"
      );
    }
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

    await initRtm(username!);
  };

  const handleUserPublished = (user: any, mediaType: "audio" | "video") => {
    const uid = String(user.uid);
    const updatedUsers = { ...remoteUsersRef.current, [uid]: user };
    remoteUsersRef.current = updatedUsers;
    setRemoteUsers(updatedUsers);
    subscribe(user, mediaType);
  };

  const handleUserUnpublished = (user: any, mediaType: "audio" | "video") => {
    if (mediaType === "video") {
      const uid = String(user.uid);
      const updatedUsers = { ...remoteUsersRef.current };
      delete updatedUsers[uid];
      remoteUsersRef.current = updatedUsers;
      setRemoteUsers(updatedUsers);

      const remainingUids = Object.keys(updatedUsers);
    }
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
    const updatedUsers = { ...remoteUsersRef.current, [uid]: user };
    setRemoteUsers(updatedUsers);
  };

  const updatePermissions = (role: string) => {
    setOptions((prev) => ({ ...prev, role: role }));
    console.log("options updated", options);
  };

  const leave = async () => {
    if (localUserTrack) {
      console.log("yes they is local user and it's beomg removed...");
      localUserTrack?.audioTrack?.stop();
      localUserTrack.audioTrack?.close();

      localUserTrack.videoTrack?.stop();
      localUserTrack.videoTrack?.close();
      setLocalUserTrack(undefined);
    }

    setRemoteUsers({});
    await rtcClient.unpublish();
    await rtcClient.leave();

    leaveRtmChannel();
  };

  return (
    <>
      {/* Video Section */}
      <div className="container flex w-full h-full overflow-hidden">
        <>
          <div className="grid grid-cols-2">
            <div className="video-group w-full lg:w-1/2">
              {/* Local Stream */}
              <section className="border rounded shadow-md mb-4">
                <div className="bg-gray-100 text-gray-700 font-semibold px-4 py-2 border-b">
                  Local Stream
                </div>
                <div className="p-4">
                  <StreamPlayer
                    videoTrack={localUserTrack?.videoTrack || null}
                    audioTrack={localUserTrack?.audioTrack || null}
                    uid={options?.uid || ""}
                    options={{
                      mirror: mirrorChecked,
                    }}
                  />
                </div>
              </section>

              {/* Remote Stream */}
              {joinRoom && (
                <section className="border rounded shadow-md">
                  <div className="bg-gray-100 text-gray-700 font-semibold px-4 py-2 border-b">
                    Remote Stream
                  </div>
                  <div className="p-4">
                    <div
                      id="remote-playerlist"
                      className="min-h-[220px] w-full"
                    >
                      {Object.keys(remoteUsers).map((uid) => {
                        const user = remoteUsers[uid];
                        console.log("remote user", user);
                        return (
                          <StreamPlayer
                            key={uid}
                            videoTrack={user.videoTrack || undefined}
                            audioTrack={user.audioTrack || undefined}
                            // screenTrack={user.screenTrack || undefined}
                            uid={uid}
                          />
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-4">
                    <div id="share-screen" className="min-h-[220px] w-full">
                      {Object.keys(remoteUsers).map((uid) => {
                        const user = remoteUsers[uid];
                        console.log("remote user", user);
                        return (
                          <ScreenShare
                            key={uid}
                            screenTrack={user.screenTrack || undefined}
                            uid={uid}
                          />
                        );
                      })}
                    </div>
                  </div>
                </section>
              )}
            </div>

            <div className="video-group w-full lg:w-1/2">
              {/*  Channel Participants */}
              <section className="border rounded shadow-md">
                <div className="bg-gray-100 text-gray-700 font-semibold px-4 py-2 border-b">
                  Channel Participants
                </div>
                <div className="p-4">
                  <div id="remote-playerlist" className="min-h-[220px] w-full">
                    <p>nknfnfkfknf</p>
                    {Object.keys(remoteUsers).map((uid) => {
                      const user = remoteUsers[uid];
                      console.log("remote user", user);
                      return (
                        <div>
                          <p>
                            {" "}
                            User: {user?.name} {uid}
                          </p>
                          <button
                            onClick={() =>
                              handleMuteRemoteUserMicrophone(parseInt(uid))
                            }
                          >
                            mute
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            </div>
          </div>
        </>
      </div>

      <div>
        <button
          className="h-12 rounded-lg w-auto ml-4 bg-blue-600 text-white"
          onClick={() => updatePermissions("admin")}
        >
          Make Admin
        </button>
        <button
          className="h-12 rounded-lg w-auto ml-4 bg-blue-600 text-white"
          onClick={() => updatePermissions("audience")}
        >
          Make Audience
        </button>
        <button
          className="h-12 rounded-lg w-auto ml-4 bg-blue-600 text-white"
          onClick={() => handleShareScreen()}
        >
          Share Screen
        </button>
      </div>

      {/* Form Section */}
      <div className="col-lg-6">
        <form id="join-form" name="join-form">
          <div>
            {/* Channel Input */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Channel
              </label>
              <input
                className="block w-full px-4 py-2 text-sm border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 border-gray-300 placeholder-gray-400"
                id="channel"
                type="text"
                disabled={true}
                placeholder="Enter channel name"
                value={options?.channel}
                onChange={(e) =>
                  setOptions((prev) => ({
                    ...prev,
                    channel: e.target.value,
                  }))
                }
                required
              />
            </div>

            {/* User ID Input */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User ID (optional)
              </label>
              <input
                className="block w-full px-4 py-2 text-sm border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 border-gray-300 placeholder-gray-400"
                id="uid"
                type="text"
                disabled={true}
                value={options?.uid || ""}
                onChange={(e) =>
                  setOptions((prev) => ({
                    ...prev,
                    uid: e.target.value,
                  }))
                }
                placeholder="Enter the user ID"
              />
            </div>
          </div>

          {/* Steps Section */}
          <div className="mt-2">
            {/* Step 2 */}
            <section className="step">
              <label className="form-label">
                <span>Step 2</span> Join Channel
              </label>
              <button
                type="button"
                id="step-join"
                className="btn btn-primary btn-sm"
                disabled={joinDisabled}
                onClick={stepJoin}
              >
                Join Channel
                {showStepJoinSuccess && <SuccessIcon />}
              </button>
            </section>

            {/* Step 3 */}
            <section className="step">
              <div className="form-check">
                <span className="form-check-label">Mirror Mode</span>
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="mirror-check"
                  checked={mirrorChecked}
                  disabled={mirrorCheckDisabled}
                  onChange={(e) => setMirrorChecked(e.target.checked)}
                />
              </div>

              {/* Microphone */}
              <label className="form-label mt-2">Microphone</label>
              <MicSelect audioTrack={localUserTrack?.audioTrack!} />
              {/* Camera */}
              <label className="form-label mt-2">Camera</label>
              <CamSelect videoTrack={localUserTrack?.videoTrack!} />
            </section>

            {/* Step 4 */}
            <section className="step">
              <div className="mt-2 mb-1">
                <span className="flex items-center space-x-2">
                  <input
                    className="form-checkbox h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    type="checkbox"
                    id="audio-check"
                    checked={audioChecked}
                    onChange={(e) => setAudioChecked(e.target.checked)}
                  />
                  <label
                    className="text-sm text-gray-700"
                    htmlFor="audio-check"
                  >
                    Audio
                  </label>
                </span>
                <span className="flex items-center space-x-2 mt-1">
                  <input
                    className="form-checkbox h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    type="checkbox"
                    id="video-check"
                    checked={videoChecked}
                    onChange={(e) => setVideoChecked(e.target.checked)}
                  />
                  <label
                    className="text-sm text-gray-700"
                    htmlFor="video-check"
                  >
                    Video
                  </label>
                </span>
              </div>
            </section>

            {/* Step 5 */}
            <section className="step">
              <label className="form-label">
                <span>Step 5</span> Leave Channel
              </label>
              <button
                type="button"
                id="step-leave"
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-red-300 disabled:cursor-not-allowed"
                disabled={leaveDisabled}
                onClick={stepLeave}
              >
                Leave Channel
              </button>
            </section>
          </div>
        </form>
      </div>
    </>
  );
};
