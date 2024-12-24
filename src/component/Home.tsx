import { useState } from "react";
import "../styles.css";
import PrepRoom from "./PrepRoom";
import Basics from "./Basics";
import {
useIsConnected
} from "agora-rtc-react";

export type PrepRoomProp = {
  channel: string;
  step: number;
  isConnected?: boolean;
  setStep: (step: number) => void;
};

export const Home = () => {
  const [channel, setChannel] = useState("");
  const [step, setStep] = useState(1);
  const isConnected = useIsConnected();

  return (
    <>
      {step === 1 && (
        <div className="room h-screen m-20">
          <p className="text-red-600 text-2xl">Agora Video Conferencing POC</p>

          <div className="join-room flex flex-col gap-y-4">
            <label className="font-semibold">Enter Channel Name</label>
            <input
              onChange={(e) => setChannel(e.target.value)}
              placeholder="Enter Channel Name"
              value={channel}
              className="h-14 border pl-2"
            />
            <button
              className={`join-channel ${
                !channel ? "disabled" : "bg-blue-500 text-white"
              }`}
              disabled={!channel}
              // onClick={() => navigate(`/prep-room/${channel}`)}
              onClick={()=>setStep(2)}
            >
              Join Channel
            </button>
          </div>
        </div>
      )}

      {step === 2 &&  channel && <PrepRoom channel={channel} step={step} setStep={setStep} />}

      {
        step === 3 && channel && <Basics channel={channel} step={step} setStep={setStep} isConnected={isConnected}/>
      }
    </>
  );
};

export default Home;
