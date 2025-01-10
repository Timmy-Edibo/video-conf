import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import Cookies from "js-cookie";

export const Home = () => {
  const [channel, setChannel] = useState("");
  const [username, setUsername] = useState("");
  const [option, setOption] = useState("");
  const { isAuthenticated } = useAuth();

  const navigate = useNavigate();

  const handleCreateMeeting = async () => {
    const response = await fetch(
      "https://app.stridez.ca/api/v1/rooms/create-instant-meeting",
      {
        method: "POST",
        headers: {
          "Agora-Signature": "stridez@123456789",
          "Content-Type": "application/json",
          Authorization: `Bearer ${Cookies.get("accessToken")}`,
        },
        body: JSON.stringify({
          roomType: "instant",
        }),
      }
    );
    if (!response.ok) {
      throw new Error("Failed to create meeting");
    }
    const data = await response.json();
    setChannel(data.data.roomCode);
    navigate(
      `/prep-room/${data.data.roomCode}?username=${username || "timmy"}`
    );
  };

  return (
    <>
      {!isAuthenticated && (
        <div className="flex flex-col justify-center items-center">
          <button
            className={"bg-blue-500 text-white"}
            onClick={() => navigate(`/auth/login`)}
          >
            Login
          </button>
        </div>
      )}
      <div className="flex flex-col justify-center items-center min-h-screen px-4">
        <p className="text-red-600 text-2xl text-center mb-6">
          Agora Video Conferencing POC
        </p>

        <select
          onChange={(e) => {
            setOption(e.target.value);
          }}
          className="h-14 border w-[20rem]"
        >
          <option className="h-14" value="">
            Select a Channel
          </option>
          <option className="h-14" value="create">
            Create Instant Meeting
          </option>
          <option className="h-14" value="join">
            Join Meeting
          </option>
        </select>

        <div className="flex flex-col gap-y-4 w-full max-w-md">
          {option == "join" && (
            <>
              <label className="font-semibold text-lg text-gray-700">
                Enter Channel Name
              </label>
              <input
                onChange={(e) => setChannel(e.target.value)}
                placeholder="Enter Channel Name"
                value={channel}
                className="h-14 border border-gray-300 pl-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none w-full"
              />
            </>
          )}

          {option === "create" && (
            <button
              className={`mt-4 py-3 rounded-md text-lg font-semibold transition-all ${"bg-blue-500 text-white hover:bg-blue-600"}`}
              onClick={() => handleCreateMeeting()}
            >
              Create Instant Meeting
            </button>
          )}

          <p>RomeCode: {channel}</p>

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
