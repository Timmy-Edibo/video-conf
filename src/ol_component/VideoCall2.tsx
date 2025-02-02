import React, { useState, useRef, useEffect } from "react";
import { CamSelect } from "../component/CamSelect";
import { MicSelect } from "../component/MicSelect";
import { StreamPlayer } from "../component/StreamPlayer";
import AgoraRTC, {
  IAgoraRTCClient,
  ILocalAudioTrack,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  IRemoteTrack,
  ILocalVideoTrack,
} from "agora-rtc-sdk-ng";
import SuccessIcon from "../component/SuccessIcon";
import { UID } from "agora-rtc-react";
import AgoraRTM, { RtmChannel, RtmClient } from "agora-rtm-sdk";
import { useNavigate, useParams, useSearchParams } from "react-router";

AgoraRTC.onAutoplayFailed = () => {
  alert("Click to start autoplay!");
};

let client: IAgoraRTCClient | null = null;
let rtmClient: RtmClient;

interface Options {
  appid?: string | undefined;
  channel?: string;
  rtcToken?: string | null;
  rtmToken?: string | null;
  uid?: UID | null;
  role: string;
  proxyMode?: string;
  certificate?: string;
}

function __getEncryptFromUrls() {
  let encryptedId = "";
  let encryptedSecret = "";
  var urlParams = new URL(location.href).searchParams;
  if (urlParams.size) {
    encryptedId = urlParams.get("encryptedId") || "";
    encryptedSecret = urlParams.get("encryptedSecret") || "";
  }
  return { encryptedId, encryptedSecret };
}

const getBaseUrls = () => {
  let ENV = "dev";
  let REDIRECT_URI = ""; // sso redirect uri
  let BASE_URL = ""; // request base url

  switch (ENV) {
    case "dev":
      BASE_URL = "https://service-staging.agora.io/toolbox";
      REDIRECT_URI = "http://localhost:3001/sso/index.html";
      break;
    case "test":
      BASE_URL = "https://service-staging.agora.io/toolbox";
      REDIRECT_URI =
        "https://fullapp.oss-cn-beijing.aliyuncs.com/api-examples-internal/sso/index.html";
      break;
    case "prod":
      BASE_URL = "https://service.agora.io/toolbox";
      REDIRECT_URI = "https://webdemo.agora.io/sso/index.html";
      break;
  }
  return { BASEURL: BASE_URL, REDIRECTURI: REDIRECT_URI };
};

async function fetchToken(url: string, data: Record<string, unknown>) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Agora-Signature": "stridez@123456789",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  // Parse JSON response
  const jsonResp = await response.json();

  if (!response.ok) {
    console.log("response: An error occured fetching token ");
  } else {
    console.log("response: " + JSON.stringify(jsonResp.data));
    return jsonResp.data;
  }
}

const generateUid = () => {
  // Generate a random number in the range [1, 10000]
  const uid = Math.floor(Math.random() * 10000);
  return String(uid);
};

async function agoraGetAppData(channel: string) {
  const rtcUrl = `http://localhost:8080/api/v1/agora/rtcToken`;
  const rtmUrl = `http://localhost:8080/api/v1/agora/rtmToken`;
  const data = {
    channelName: channel,
    uid: generateUid(),
  };

  const [rtcOptions, rtmOptions] = await Promise.all([
    fetchToken(rtcUrl, data),
    fetchToken(rtmUrl, data),
  ]);

  console.log("promise result;", rtcOptions, rtmOptions);

  return { rtcOptions, rtmOptions };
}

const message = {
  success: (msg: string) => console.log("Success:", msg),
  error: (msg: string) => console.error("Error:", msg),
};
type ILocalTrack = {
  audioTrack: ILocalAudioTrack;
  videoTrack: ICameraVideoTrack;
};
export const AgoraKit: React.FC = () => {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const username = searchParams.get("username");

  const chan = params.meetingCode;
  const [localUserTrack, setLocalUserTrack] = useState<ILocalTrack | undefined>(
    undefined
  );
  const [videoTrack, setVideoTrack] = useState<
    (ICameraVideoTrack & ILocalVideoTrack) | undefined
  >(undefined);
  const [audioTrack, setAudioTrack] = useState<
    (ILocalAudioTrack & IMicrophoneAudioTrack) | undefined
  >(undefined);
  const [createDisabled, setCreateDisabled] = useState(false);
  const navigate = useNavigate();

  const [joinDisabled, setJoinDisabled] = useState(true);
  const [showStepSubscribeSuccess, setShowStepSubscribeSuccess] =
    useState(false);
  const [showStepPublishSuccess, setShowStepPublishSuccess] = useState(false);
  const [showStepCreateSuccess, setShowStepCreateSuccess] = useState(false);
  const [showStepJoinSuccess, setShowStepJoinSuccess] = useState(false);
  const [publishDisabled, setPublishDisabled] = useState(true);
  const [rtmChannel, setRtmChannel] = useState<RtmChannel | null>(null);
  const [subscribeDisabled, setSubscribeDisabled] = useState(true);
  const [leaveDisabled, setLeaveDisabled] = useState(true);
  const [mirrorCheckDisabled, setMirrorCheckDisabled] = useState(true);
  const [mirrorChecked, setMirrorChecked] = useState(true);
  const [options, setOptions] = useState<Options>({
    channel: "",
    appid: "d9b1d4e54b9e4a01aac1de9833d83752",
    rtcToken: "",
    rtmToken: "",
    proxyMode: "",
    uid: null,
    role: "host",
    certificate: "",
  });
  const [remoteUid, setRemoteUid] = useState<string>("");
  const [remoteUsers, setRemoteUsers] = useState<Record<string, any>>({});
  const [audioChecked, setAudioChecked] = useState(true);
  const [videoChecked, setVideoChecked] = useState(true);
  const [joinRoom, setJoinRoom] = useState(false);

  const remoteUsersRef = useRef(remoteUsers);

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
      stepCreate();
    }
  }, []);

  const handleConfigureWaitingArea = async () => {
    const tracks = await Promise.all([
      AgoraRTC.createMicrophoneAudioTrack({
        encoderConfig: "music_standard",
      }),
      AgoraRTC.createCameraVideoTrack(),
    ]);
    setLocalUserTrack({ audioTrack: tracks[0], videoTrack: tracks[1] });
    setAudioTrack(tracks[0]);
    setVideoTrack(tracks[1]);
  };

  useEffect(() => {
    handleConfigureWaitingArea();
  }, []);

  const removeAllIconss = () => {
    setShowStepCreateSuccess(false);
    setShowStepSubscribeSuccess(false);
    setShowStepPublishSuccess(false);
    setShowStepJoinSuccess(false);
  };

  const stepCreate = () => {
    createClient();
    setShowStepCreateSuccess(true);
    message.success("Create client success!");
    setCreateDisabled(true);
    setJoinDisabled(false);
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
    setRtmChannel(channel);
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

  let leaveRtmChannel = async () => {
    await rtmChannel!.leave();
    await rtmClient!.logout();
  };

  let getChannelMembers = async () => {
    let members = await rtmChannel?.getMembers();
    console.log("showing members.init.", members);
    if (!members) return;

    for (let i = 0; members.length > i; i++) {
      console.log("showing members...", members[i]);
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

  let handleMemberJoined = async (MemberId: string) => {
    let { name, userRtcUid, userAvatar } =
      await rtmClient!.getUserAttributesByKeys(MemberId, [
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
  };

  const handleMemberLeft = async (MemberId: string) => {
    // document.getElementById(MemberId).remove();
  };

  const stepJoin = async () => {
    try {
      if (!options) return;

      console.log("options finally:", options);
      setJoinRoom(true);
      await join();
      setOptions(options);
      setShowStepJoinSuccess(true);

      message.success("Join channel success!");
      setJoinDisabled(true);
      setPublishDisabled(false);
      setSubscribeDisabled(false);
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
    setShowStepPublishSuccess(true);
    message.success("Create tracks and publish success!");
    setPublishDisabled(true);
    setMirrorCheckDisabled(true);
    // stepSubscribe();
  };

  const stepSubscribe = () => {
    const user = remoteUsers[remoteUid];
    // setShowStepSubscribeSuccess(true);

    if (!user) {
      return message.error(`User:${remoteUid} not found!`);
    }
    if (audioChecked) {
      subscribe(user, "audio");
    }
    if (videoChecked) {
      subscribe(user, "video");
    }
    setShowStepSubscribeSuccess(true);
    message.success("Subscribe and Play success!");
  };

  const stepLeave = async () => {
    await leave();
    message.success("Leave channel success!");
    removeAllIconss();
    setJoinDisabled(true);
    setPublishDisabled(true);
    setSubscribeDisabled(true);
    setLeaveDisabled(true);
    setMirrorCheckDisabled(true);
    // setCreateDisabled(false);
    navigate("/");
  };

  const setMute = async (type: "audio" | "video", state: boolean) => {
    try {
      if (type === "audio") {
        await localUserTrack?.audioTrack.setMuted(state);
      } else if (type === "video") {
        await localUserTrack?.videoTrack.setMuted(state);
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

  const createClient = () => {
    client = AgoraRTC.createClient({
      mode: "rtc",
      codec: "vp8",
    });
  };

  const join = async () => {
    if (!client) return;
    client.on("user-published", handleUserPublished);
    client.on("user-unpublished", handleUserUnpublished);

    const mode = options?.proxyMode ?? 0;
    if (mode !== 0 && !isNaN(parseInt(mode))) {
      client.startProxyServer(parseInt(mode));
    }

    options.uid = await client.join(
      options.appid || "",
      options.channel || "",
      options.rtcToken || null,
      options.uid || null
    );
    // await initRtm(username!);
  };

  const handleUserPublished = (user: any, mediaType: "audio" | "video") => {
    const uid = String(user.uid);
    const updatedUsers = { ...remoteUsersRef.current, [uid]: user };
    remoteUsersRef.current = updatedUsers;
    setRemoteUsers(updatedUsers);
    setRemoteUid(uid);
  };

  const handleUserUnpublished = (user: any, mediaType: "audio" | "video") => {
    if (mediaType === "video") {
      const uid = String(user.uid);
      const updatedUsers = { ...remoteUsersRef.current };
      delete updatedUsers[uid];
      remoteUsersRef.current = updatedUsers;
      setRemoteUsers(updatedUsers);

      const remainingUids = Object.keys(updatedUsers);
      setRemoteUid(remainingUids.length > 0 ? remainingUids[0] : "");
    }
  };

  const createTrackAndPublish = async () => {
    if (!client) return;
    // const tracks = await Promise.all([
    //   AgoraRTC.createMicrophoneAudioTrack({
    //     encoderConfig: "music_standard",
    //   }),
    //   AgoraRTC.createCameraVideoTrack(),
    // ]);
    // setAudioTrack(tracks[0]);
    // setVideoTrack(tracks[1]);
    // setLocalUserTrack({ audioTrack: tracks[0], videoTrack: tracks[1] });
    await client.publish([
      localUserTrack!.audioTrack,
      localUserTrack!.videoTrack,
    ]);
  };

  const subscribe = async (user: any, mediaType: "audio" | "video") => {
    if (!client) return;
    await client.subscribe(user, mediaType);

    const uid = String(user.uid);
    const updatedUsers = { ...remoteUsersRef.current, [uid]: user };
    setRemoteUsers(updatedUsers);
  };

  const updatePermissions = (role: string) => {
    setOptions((prev) => ({ ...prev, role: role }));
    console.log("options updated", options);
  };

  const leave = async () => {
    if (!client) return;

    if (videoTrack) {
      videoTrack.stop();
      videoTrack.close();
      setVideoTrack(undefined);
    }
    if (audioTrack) {
      audioTrack.stop();
      audioTrack.close();
      setAudioTrack(undefined);
    }
    if (localUserTrack) {
      console.log("yes they is local user and it's beomg removed...");
      localUserTrack.audioTrack.stop();
      localUserTrack.audioTrack.close();

      localUserTrack.videoTrack.stop();
      localUserTrack.videoTrack.close();
      setLocalUserTrack(undefined);
    }

    setRemoteUid("");
    setRemoteUsers({});
    await client.leave();
  };

  return (
    <>
      {/* Video Section */}
      <div className="container flex w-full h-full overflow-hidden">
        <>
          <div className="video-group w-full lg:w-1/2">
            {/* Local Stream */}
            <section className="border rounded shadow-md mb-4">
              <div className="bg-gray-100 text-gray-700 font-semibold px-4 py-2 border-b">
                Local Stream
              </div>
              <div className="p-4">
                <StreamPlayer
                  videoTrack={videoTrack}
                  audioTrack={audioTrack}
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
                  <div id="remote-playerlist" className="min-h-[220px] w-full">
                    {Object.keys(remoteUsers).map((uid) => {
                      const user = remoteUsers[uid];
                      return (
                        <StreamPlayer
                          key={uid}
                          videoTrack={user.videoTrack || undefined}
                          audioTrack={user.audioTrack || undefined}
                          uid={uid}
                        />
                      );
                    })}
                  </div>
                </div>
              </section>
            )}
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
              <div className="text-sm text-gray-500 mt-1">
                If you don’t know what your channel is, check out{" "}
                <a
                  href="https://docs.agora.io/en/Agora%20Platform/terms?platform=All%20Platforms#channel"
                  className="text-blue-600 hover:underline"
                >
                  this
                </a>
              </div>
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
            {/* Step 1 */}

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
              <label className="form-label">
                <span>Step 3</span> Create Track & Publish
              </label>
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
              <button
                type="button"
                id="step-publish"
                className="btn btn-primary btn-sm"
                disabled={publishDisabled}
                onClick={stepPublish}
              >
                Create Track & Publish
                {showStepPublishSuccess && <SuccessIcon />}
              </button>
              {/* Microphone */}
              <label className="form-label mt-2">Microphone</label>
              <MicSelect audioTrack={audioTrack} />
              {/* Camera */}
              <label className="form-label mt-2">Camera</label>
              <CamSelect videoTrack={videoTrack} />
            </section>

            {/* Step 4 */}
            <section className="step">
              <label className="form-label">
                <span>Step 4</span> Subscribe & Play
              </label>
              <select
                className="form-select"
                value={remoteUid}
                onChange={(e) => setRemoteUid(e.target.value)}
                id="remote-uid"
                style={{ maxWidth: "300px" }}
              >
                <option value="" disabled>
                  Please select remote userId
                </option>
                {Object.keys(remoteUsers).map((uid) => (
                  <option key={uid} value={uid}>
                    {uid}
                  </option>
                ))}
              </select>
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

              <button
                type="button"
                id="step-subscribe"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center"
                disabled={subscribeDisabled}
                onClick={stepSubscribe}
              >
                Subscribe & Play
                {showStepSubscribeSuccess && <SuccessIcon />}
              </button>
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
