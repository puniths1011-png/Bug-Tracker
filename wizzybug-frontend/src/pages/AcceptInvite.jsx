import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { apiFetch, setToken } from "../config/api";

export default function AcceptInvite() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState("");
  const token = new URLSearchParams(window.location.search).get("token");
  const passwordRequirements = [
    { label: "6 to 40 characters", valid: password.length >= 6 && password.length <= 40 },
    { label: "at least one lowercase letter", valid: /[a-z]/.test(password) },
    { label: "at least one uppercase letter", valid: /[A-Z]/.test(password) },
    { label: "at least one number", valid: /\d/.test(password) },
    { label: "at least one special character", valid: /[^A-Za-z0-9]/.test(password) },
  ];
  const passwordIsValid = passwordRequirements.every((requirement) => requirement.valid);

  const handleAccept = async (event) => {
    event.preventDefault();
    if (!passwordIsValid) {
      setStatus("Error: Password does not meet all the requirements.");
      return;
    }

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
    <div className="loginPage passwordPageLight">
      <div className="loginBox passwordBoxLight">
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
            <div className="password">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
                maxLength={40}
                autoComplete="new-password"
                aria-describedby="invite-password-requirements"
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
          <ul
            id="invite-password-requirements"
            aria-live="polite"
            style={{ margin: "8px 0 16px", paddingLeft: 20, fontSize: 14 }}
          >
            {passwordRequirements.map((requirement) => (
              <li
                key={requirement.label}
                style={{ color: requirement.valid ? "green" : "#666" }}
              >
                {requirement.valid ? "Met:" : "Required:"} {requirement.label}
              </li>
            ))}
          </ul>
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
