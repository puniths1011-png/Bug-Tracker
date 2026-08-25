import { useState } from "react";
import { apiFetch, setToken } from "../config/api";

export default function AcceptInvite() {
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const token = new URLSearchParams(window.location.search).get("token");

  const handleAccept = async (event) => {
    event.preventDefault();
    setStatus("Accepting...");
    try {
      const data = await apiFetch("/auth/accept-invite", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      setToken(data.token);
      localStorage.setItem(
        "user",
        JSON.stringify({
          _id: data._id,
          name: data.name,
          email: data.email,
          role: data.role,
        }),
      );
      localStorage.setItem("isLogged", "true");
      setStatus("Success! Redirecting...");
      setTimeout(() => (window.location.href = "/"), 1500);
    } catch (error) {
      setStatus("Error: " + (error.message || "Server error"));
    }
  };

  return (
    <div className="loginPage">
      <div className="loginBox">
        <h2>Accept Invitation</h2>
        <p>Welcome to WizzyBug! Set a password to activate your account.</p>
        {status && (
          <p style={{ color: status.startsWith("Err") ? "red" : "green" }}>
            {status}
          </p>
        )}
        <form onSubmit={handleAccept}>
          <label>
            New Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
            />
          </label>
          <button
            className="primary"
            type="submit"
            disabled={!token || status === "Accepting..."}
          >
            Accept & Join
          </button>
        </form>
      </div>
    </div>
  );
}
