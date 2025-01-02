import "../index.css";

import React, { useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { useAuth } from "../context/AuthContext";

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const { setAuth } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await axios.post(
        "https://app.stridez.ca/api/v1/auth/login",
        { email, password }
      );
      console.log(response);
      if (response.status === 200 && response.data.data.token) {
        const { token } = response.data.data;

        // Store token in cookies and localStorage
        Cookies.set("accessToken", token, { expires: 1 }); // Token expires in 7 days
        localStorage.setItem("authToken", token);
        setAuth(true, response.data.data);

        alert("Login successful!");
        window.location.href = "/";
      } else {
        setError("Invalid response from server.");
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || "An error occurred during login."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border h-screen flex items-center justify-center w-[90rem]">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-lg shadow-md w-full max-w-sm"
      >
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Login</h2>

        <div className="mb-4">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Email:
          </label>
          <input
            type="email"
            id="email"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="mb-4">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Password:
          </label>
          <input
            type="password"
            id="password"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-2 px-4 text-white font-medium rounded-md ${
            loading ? "bg-blue-300" : "bg-blue-500 hover:bg-blue-600"
          } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
};

export default LoginForm;
