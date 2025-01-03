// import React, { useLayoutEffect, useRef } from "react";
// import { ILocalAudioTrack, ILocalVideoTrack } from "agora-rtc-sdk-ng";

// type ScreenShareProps = {
//   uid?: string | number;
//   options?: object;
//   screenTrack: {
//     screenAudioTrack: ILocalAudioTrack | null;
//     screenVideoTrack: ILocalVideoTrack;
//   } | null;
// };

// export const ScreenShare: React.FC<ScreenShareProps> = ({
//   screenTrack,
//   uid = "",
//   options = {},
// }) => {
//   // Refs for video elements
//   const screenVideoRef = useRef<HTMLVideoElement | null>(null);

//   // Effect for screen sharing track
//   useLayoutEffect(() => {
//     if (screenVideoRef.current !== null && screenTrack?.screenVideoTrack) {
//       screenTrack.screenVideoTrack.play(screenVideoRef.current, options);
//     }

//     return () => {
//       if (screenTrack?.screenVideoTrack) {
//         screenTrack.screenVideoTrack.stop();
//       }
//     };
//   }, [screenTrack, options]);

//   return (
//     <div className="player w-full h-full">
//       {/* Conditionally render video element */}
//       {screenTrack ? (
//         <>
//           <video
//             ref={screenVideoRef}
//             autoPlay
//             playsInline
//             width="100%"
//             height="auto"
//           />
//           User uid: {uid}
//         </>
//       ) : (
//         <div className="text-center text-gray-500">
//           No User is sharing their screen
//         </div>
//       )}
//     </div>
//   );
// };

import React, { useLayoutEffect, useRef } from "react";
import { ILocalAudioTrack, ILocalVideoTrack } from "agora-rtc-sdk-ng";

type ScreenShareProps = {
  screenTrack: {
    screenAudioTrack: ILocalAudioTrack | null;
    screenVideoTrack: ILocalVideoTrack | null;
  } | null;
  uid?: string | number;
};

export const ScreenShare: React.FC<ScreenShareProps> = ({
  screenTrack,
  uid,
}) => {
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);

  useLayoutEffect(() => {
    if (screenVideoRef.current && screenTrack?.screenVideoTrack) {
      screenTrack.screenVideoTrack.play(screenVideoRef.current);
    }

    return () => {
      if (screenTrack?.screenVideoTrack) {
        screenTrack.screenVideoTrack.stop();
      }
    };
  }, [screenTrack]);

  return (
    <div className="screen-share-container border rounded shadow-md p-4">
      {screenTrack?.screenVideoTrack ? (
        <>
          <video
            ref={screenVideoRef}
            autoPlay
            playsInline
            className="w-full h-auto"
          />
          <div>User {uid} is sharing</div>
        </>
      ) : (
        <div className="text-center text-gray-500">
          No screen is currently being shared.
        </div>
      )}
    </div>
  );
};
