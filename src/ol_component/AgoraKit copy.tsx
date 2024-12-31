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

AgoraRTC.onAutoplayFailed = () => {
  alert("Click to start autoplay!");
};

let client: IAgoraRTCClient | null = null;

interface Options {
  appid?: string | undefined;
  channel?: string;
  token?: string | null;
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

function deepCopys<T>(obj: T): T {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }

  let clone: T = Array.isArray(obj) ? ([] as unknown as T) : ({} as T);

  for (let key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      // @ts-ignore: Ensures types for dynamic key assignment
      clone[key] = deepCopys((obj as any)[key]);
    }
  }

  return clone;
}

const setOptionsToLocals = (option: Options) => {
  const res = __getEncryptFromUrls();
  if (res.encryptedId && res.encryptedSecret) {
    return;
  }
  option = deepCopys(option);
  if (option.token) {
    option.token = "";
  }
  option.uid = localStorage.getItem("uid");
  localStorage.setItem("__options", JSON.stringify(option));
};

function __genUUIDs() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
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

interface ApiResponse {
  code: number;
  data?: {
    appid?: string;
  };
}

async function fetchToken(
  url: string,
  data: Record<string, unknown>,
  config: Options
) {
  console.log("Fetching token", url, data, config);
  let resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  // Parse JSON response
  const jsonResp: ApiResponse = (await resp.json()) || {};

  console.log("response: " + JSON.stringify(jsonResp));
  if (jsonResp.code !== 0) {
    const msg =
      "Generate token error, please check your appid and appcertificate parameters";
    message.error(msg);
    throw new Error(msg);
  }

  const respData = jsonResp.data || {};
  if (respData.appid) {
    config.appid = respData.appid;
  }
}
const getOptionsFromLocals = () => {
  return {
    appid: "d9b1d4e54b9e4a01aac1de9833d83752",
    certificate: "",
  };
};

async function agoraGetAppData(config: Options) {
  const { BASEURL } = getBaseUrls();
  const { uid, channel } = config;
  const { appid, certificate } = getOptionsFromLocals();
  const res = __getEncryptFromUrls();
  let encryptedId = res.encryptedId;
  let encryptedSecret = res.encryptedSecret;
  let data = {};
  let url = "";
  if (encryptedId && encryptedSecret) {
    url = `${BASEURL}/v1/webdemo/encrypted/token`;
    data = {
      channelName: channel,
      encryptedId,
      encryptedSecret,
      traceId: __genUUIDs(),
      src: "webdemo",
    };
  } else {
    if (!certificate) {
      return null;
    }
    url = `${BASEURL}/v2/token/generate`;
    data = {
      appId: appid,
      appCertificate: certificate,
      channelName: channel,
      expire: 7200,
      src: "web",
      types: [1, 2],
      uid: uid,
    };
  }
  await fetchToken(url, data, config);
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
  const [joinDisabled, setJoinDisabled] = useState(true);
  const [showStepSubscribeSuccess, setShowStepSubscribeSuccess] =
    useState(false);
  const [showStepPublishSuccess, setShowStepPublishSuccess] = useState(false);
  const [showStepCreateSuccess, setShowStepCreateSuccess] = useState(false);
  const [showStepJoinSuccess, setShowStepJoinSuccess] = useState(false);
  const [publishDisabled, setPublishDisabled] = useState(true);
  const [subscribeDisabled, setSubscribeDisabled] = useState(true);
  const [leaveDisabled, setLeaveDisabled] = useState(true);
  const [mirrorCheckDisabled, setMirrorCheckDisabled] = useState(true);
  const [mirrorChecked, setMirrorChecked] = useState(true);
  const [options, setOptions] = useState<Options>({
    channel: "",
    appid: "d9b1d4e54b9e4a01aac1de9833d83752",
    token: "",
    proxyMode: "",
    uid: null,
    role: "host",
    certificate: "",
  });
  const [remoteUid, setRemoteUid] = useState<string>("");
  const [remoteUsers, setRemoteUsers] = useState<Record<string, any>>({});
  const [audioChecked, setAudioChecked] = useState(true);
  const [videoChecked, setVideoChecked] = useState(true);
  const remoteUsersRef = useRef(remoteUsers);

  useEffect(() => {
    remoteUsersRef.current = remoteUsers;
  }, [remoteUsers]);

  useEffect(() => {}, [options]);

  const removeAllIconss = () => {
    setShowStepCreateSuccess(false);
    setShowStepSubscribeSuccess(false);
    setShowStepPublishSuccess(false);
    setShowStepJoinSuccess;
  };

  const stepCreate = () => {
    createClient();
    setShowStepCreateSuccess(true);
    message.success("Create client success!");
    setCreateDisabled(true);
    setJoinDisabled(false);
  };

  const stepJoin = async () => {
    try {
      if (!options) return;
      const token = await agoraGetAppData(options);
      setOptions((prev) => ({ ...prev, token }));
      await join();
      setOptions(options);
      setOptionsToLocals(options);
      setShowStepJoinSuccess(true);

      message.success("Join channel success!");
      setJoinDisabled(true);
      setPublishDisabled(false);
      setSubscribeDisabled(false);
      setLeaveDisabled(false);
      setMirrorCheckDisabled(false);
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
  };

  const stepSubscribe = () => {
    const user = remoteUsers[remoteUid];
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
    setCreateDisabled(false);
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

  // const setEnabled = async (type, state) => {
  //   try {
  //     if (type == "audio") {
  //       await localTracks.audioTrack.setEnabled(state);
  //       localTrackState.audioTrackEnabled = state;
  //     } else if (type == "video") {
  //       await localTracks.videoTrack.setEnabled(state);
  //       localTrackState.videoTrackEnabled = state;
  //     }
  //   } catch (err) {
  //     console.error(err);
  //     message.error(err.message);
  //   }
  // };

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
      options.token || null,
      options.uid || null
    );
    console.log("seeing options", options);
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
    const tracks = await Promise.all([
      AgoraRTC.createMicrophoneAudioTrack({
        encoderConfig: "music_standard",
      }),
      AgoraRTC.createCameraVideoTrack(),
    ]);
    setAudioTrack(tracks[0]);
    setVideoTrack(tracks[1]);
    setLocalUserTrack({ audioTrack: tracks[0], videoTrack: tracks[1] });
    await client.publish(tracks);
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

    setRemoteUid("");
    setRemoteUsers({});
    await client.leave();
  };

  return (
    <>
      {/* Video Section */}
      <div className="container flex w-full h-full overflow-hidden">
        {/* Left Panel */}
        <div className="left relative flex-none w-60 max-w-[240px] min-w-[240px] h-screen shadow-md overflow-y-auto overflow-x-hidden">
          {/* Content for the left panel */}
        </div>

        {/* Right Panel */}
        <div className="right relative flex-1 max-w-[880px] bg-gray-100 py-4 h-screen overflow-y-auto">
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
            <section className="border rounded shadow-md">
              <div className="bg-gray-100 text-gray-700 font-semibold px-4 py-2 border-b">
                Remote Stream
              </div>
              <div className="p-4">
                <div id="remote-playerlist" className="min-h-[220px] w-full">
                  {Object.keys(remoteUsers).map((uid) => {
                    const user = remoteUsers[uid];
                    if (user.audioTrack === localUserTrack?.audioTrack) {
                      console.log(
                        "trying to mute audio track.....",
                        user.audioTrack
                      );
                    }
                    // console.log("remote users", user, user.setMuted(false));
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
          </div>
        </div>
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
            <section className="step">
              <label className="form-label">
                <span>Step 1</span> Create AgoraRTC Client
              </label>
              <button
                type="button"
                id="step-create"
                className="btn btn-primary btn-sm"
                disabled={createDisabled}
                onClick={stepCreate}
              >
                Create Client {showStepCreateSuccess && <SuccessIcon />}
              </button>
            </section>

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

// async function RTMJoin() {
//   // Create Agora RTM client
//   const clientRTM = AgoraRTM.createInstance($("#appid").val(), {
//     enableLogUpload: false,
//   });
//   var accountName = $("#accountName").val();
//   // Login
//   clientRTM
//     .login({
//       uid: accountName,
//     })
//     .then(() => {
//       console.log("AgoraRTM client login success. Username: " + accountName);
//       isLoggedIn = true;
//       // RTM Channel Join
//       var channelName = $("#channel").val();
//       channel = clientRTM.createChannel(channelName);
//       channel
//         .join()
//         .then(() => {
//           console.log("AgoraRTM client channel join success.");
//           // Get all members in RTM Channel
//           channel.getMembers().then((memberNames) => {
//             console.log("------------------------------");
//             console.log("All members in the channel are as follows: ");
//             console.log(memberNames);
//             var newHTML = $.map(memberNames, function (singleMember) {
//               if (singleMember != accountName) {
//                 return `<li class="mt-2">
//                 <div class="row">
//                     <p>${singleMember}</p>
//                  </div>
//                  <div class="mb-4">
//                    <button class="text-white btn btn-control mx-3 remoteMicrophone micOn" id="remoteAudio-${singleMember}">Toggle Mic</button>
//                    <button class="text-white btn btn-control remoteCamera camOn" id="remoteVideo-${singleMember}">Toggle Video</button>
//                   </div>
//                </li>`;
//               }
//             });
//             $("#insert-all-users").html(newHTML.join(""));
//           });
//           // Send peer-to-peer message for audio muting and unmuting
//           $(document).on("click", ".remoteMicrophone", function () {
//             fullDivId = $(this).attr("id");
//             peerId = fullDivId.substring(fullDivId.indexOf("-") + 1);
//             console.log("Remote microphone button pressed.");
//             let peerMessage = "audio";
//             clientRTM
//               .sendMessageToPeer(
//                 {
//                   text: peerMessage,
//                 },
//                 peerId
//               )
//               .then((sendResult) => {
//                 if (sendResult.hasPeerReceived) {
//                   console.log(
//                     "Message has been received by: " +
//                       peerId +
//                       " Message: " +
//                       peerMessage
//                   );
//                 } else {
//                   console.log(
//                     "Message sent to: " + peerId + " Message: " + peerMessage
//                   );
//                 }
//               });
//           });
//           // Send peer-to-peer message for video muting and unmuting
//           $(document).on("click", ".remoteCamera", function () {
//             fullDivId = $(this).attr("id");
//             peerId = fullDivId.substring(fullDivId.indexOf("-") + 1);
//             console.log("Remote video button pressed.");
//             let peerMessage = "video";
//             clientRTM
//               .sendMessageToPeer(
//                 {
//                   text: peerMessage,
//                 },
//                 peerId
//               )
//               .then((sendResult) => {
//                 if (sendResult.hasPeerReceived) {
//                   console.log(
//                     "Message has been received by: " +
//                       peerId +
//                       " Message: " +
//                       peerMessage
//                   );
//                 } else {
//                   console.log(
//                     "Message sent to: " + peerId + " Message: " + peerMessage
//                   );
//                 }
//               });
//           });
//           // Display messages from peer
//           clientRTM.on("MessageFromPeer", function ({ text }, peerId) {
//             console.log(peerId + " muted/unmuted your " + text);
//             if (text == "audio") {
//               console.log("Remote video toggle reached with " + peerId);
//               if ($("#remoteAudio-" + peerId).hasClass("micOn")) {
//                 localTracks.audioTrack.setEnabled(false);
//                 console.log("Remote Audio Muted for: " + peerId);
//                 $("#remoteAudio-" + peerId).removeClass("micOn");
//               } else {
//                 localTracks.audioTrack.setEnabled(true);
//                 console.log("Remote Audio Unmuted for: " + peerId);
//                 $("#remoteAudio-" + peerId).addClass("micOn");
//               }
//             } else if (text == "video") {
//               console.log("Remote video toggle reached with " + peerId);
//               if ($("#remoteVideo-" + peerId).hasClass("camOn")) {
//                 localTracks.videoTrack.setEnabled(false);
//                 console.log("Remote Video Muted for: " + peerId);
//                 $("#remoteVideo-" + peerId).removeClass("camOn");
//               } else {
//                 localTracks.videoTrack.setEnabled(true);
//                 console.log("Remote Video Unmuted for: " + peerId);
//                 $("#remoteVideo-" + peerId).addClass("camOn");
//               }
//             }
//           });
//           // Display channel member joined updated users
//           channel.on("MemberJoined", function () {
//             // Get all members in RTM Channel
//             channel.getMembers().then((memberNames) => {
//               console.log("New member joined so updated list is: ");
//               console.log(memberNames);
//               var newHTML = $.map(memberNames, function (singleMember) {
//                 if (singleMember != accountName) {
//                   return `<li class="mt-2">
//                     <div class="row">
//                         <p>${singleMember}</p>
//                      </div>
//                      <div class="mb-4">
//                        <button class="text-white btn btn-control mx-3 remoteMicrophone micOn" id="remoteAudio-${singleMember}">Toggle Mic</button>
//                        <button class="text-white btn btn-control remoteCamera camOn" id="remoteVideo-${singleMember}">Toggle Video</button>
//                       </div>
//                    </li>`;
//                 }
//               });
//               $("#insert-all-users").html(newHTML.join(""));
//             });
//           });
//           // Display channel member left updated users
//           channel.on("MemberLeft", function () {
//             // Get all members in RTM Channel
//             channel.getMembers().then((memberNames) => {
//               console.log("A member left so updated list is: ");
//               console.log(memberNames);
//               var newHTML = $.map(memberNames, function (singleMember) {
//                 if (singleMember != accountName) {
//                   return `<li class="mt-2">
//                     <div class="row">
//                         <p>${singleMember}</p>
//                      </div>
//                      <div class="mb-4">
//                        <button class="text-white btn btn-control mx-3 remoteMicrophone micOn" id="remoteAudio-${singleMember}">Toggle Mic</button>
//                        <button class="text-white btn btn-control remoteCamera camOn" id="remoteVideo-${singleMember}">Toggle Video</button>
//                       </div>
//                    </li>`;
//                 }
//               });
//               $("#insert-all-users").html(newHTML.join(""));
//             });
//           });
//         })
//         .catch((error) => {
//           console.log("AgoraRTM client channel join failed: ", error);
//         })
//         .catch((err) => {
//           console.log("AgoraRTM client login failure: ", err);
//         });
//     });
//   // Logout
//   document.getElementById("leave").onclick = async function () {
//     console.log("Client logged out of RTM.");
//     await clientRTM.logout();
//   };
// }
