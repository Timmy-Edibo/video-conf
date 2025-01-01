import { useState } from "react";
import { useNavigate } from "react-router";

export const Home = () => {
  const [channel, setChannel] = useState("");
  const [username, setUsername] = useState("");

  const navigate = useNavigate();

  return (
    <>
      <div className="flex flex-col justify-center items-center">
        <button
          className={"bg-blue-500 text-white"}
          onClick={() => navigate(`/auth/login`)}
        >
          Login
        </button>
        <p className="text-red-600 text-2xl">Agora Video Conferencing POC</p>

        <div className="flex flex-col gap-y-4">
          <label className="font-semibold">Enter Channel Name</label>
          <input
            onChange={(e) => setChannel(e.target.value)}
            placeholder="Enter Channel Name"
            value={channel}
            className="h-14 border pl-2 w-[26rem]"
          />
          <input
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter Username"
            value={username}
            className="h-14 border pl-2 w-[26rem]"
          />
          <button
            className={` ${
              !channel || !username ? "disabled" : "bg-blue-500 text-white"
            }`}
            disabled={!channel || !username}
            onClick={() =>
              navigate(`/prep-room/${channel}?username=${username}`)
            }
          >
            Join Channel
          </button>
        </div>
      </div>
    </>
  );
};

export default Home;
