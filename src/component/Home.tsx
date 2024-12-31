import { useState } from "react";
import { useNavigate } from "react-router";

export const Home = () => {
  const [channel, setChannel] = useState("");
  const [username, setUsername] = useState("");

  const navigate = useNavigate();

  return (
    <>
      <div className="flex flex-col justify-center items-center min-h-screen px-4">
        <p className="text-red-600 text-2xl text-center mb-6">
          Agora Video Conferencing POC
        </p>

        <div className="flex flex-col gap-y-4 w-full max-w-md">
          <label className="font-semibold text-lg text-gray-700">
            Enter Channel Name
          </label>
          <input
            onChange={(e) => setChannel(e.target.value)}
            placeholder="Enter Channel Name"
            value={channel}
            className="h-14 border border-gray-300 pl-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none w-full"
          />
          <label className="font-semibold text-lg text-gray-700">
            Enter Username
          </label>
          <input
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter Username"
            value={username}
            className="h-14 border border-gray-300 pl-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none w-full"
          />
          <button
            className={`mt-4 py-3 rounded-md text-lg font-semibold transition-all ${
              !channel || !username
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-blue-500 text-white hover:bg-blue-600"
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
