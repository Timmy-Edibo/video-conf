import { useState } from "react";
import "../styles.css";
import { useNavigate } from "react-router";

export const Home = () => {
  const [channel, setChannel] = useState("");
  let navigate = useNavigate();

  return (
    <>
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
            onClick={() => navigate(`/prep-room/${channel}`)}
          >
            Join Channel
          </button>
        </div>
      </div>
    </>
  );
};

export default Home;
