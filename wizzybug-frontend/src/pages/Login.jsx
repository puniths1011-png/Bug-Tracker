import React, { useMemo, useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
const {LayoutDashboard,Bug,Plus,Users,User,Settings,LogOut,Search,Bell,ChevronDown,ArrowUpRight,Clock3,CircleCheck,TriangleAlert,Filter,Download,Menu,X,ChevronRight,Paperclip,Send,CalendarDays,BarChart3,FolderKanban,Activity,ShieldCheck,Eye,EyeOff,Moon,Sun,UserCog,Mail,ClipboardList,RefreshCcw,FolderPlus,ArrowLeft} = Icons;
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { API, apiFetch, setToken } from '../config/api';
import { formatIST, formatISTLong, timeAgoIST, IST_TZ } from '../utils/date';
import { STATUS_LABELS, STATUS_VALUES, PRIORITY_LABELS, SEVERITY_TO_PRIORITY } from '../utils/constants';
import { Avatar, Logo, RoleBadge, Status } from '../components/Ui';
import { initialsOf, isAssignedToUser, priorityLabel, statusLabel, buildTimeline } from '../utils/formatters';

function Login({ onLogin, isAdminPage, theme, toggleTheme }) {
  const [show, setShow] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setStatus("");
    const email = e.target.email.value;
    const password = e.target.password.value;
    setSubmitting(true);

    try {
      let data;
      if (isRegister) {
        const name = e.target.name.value;
        const role = e.target.role.value;
        // Register the user but do NOT auto-login. Show success and return to login form.
        data = await apiFetch("/auth/register", {
          method: "POST",
          body: JSON.stringify({ name, email, password, role }),
        });
        setStatus("Account created successfully. Please sign in.");
        setIsRegister(false);
      } else {
        data = await apiFetch("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        onLogin(
          {
            _id: data._id,
            name: data.name,
            email: data.email,
            role: data.role || "developer",
          },
          data.token,
        );
      }
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth">
      <div className="authLeft">
        <Logo />
        <div className="authCopy">
          <span className="eyebrow">BUILT FOR HIGH-PERFORMING TEAMS</span>
          <h1>
            Ship better software,
            <br />
            <em>one bug at a time.</em>
          </h1>
          <p>
            Everything your team needs to report, track, and resolve issues
            without losing momentum.
          </p>
        </div>
        <small className="copyright">
          (c) 2026 WizzyBug. Built for teams who care.
        </small>
      </div>
      <div className="authRight">
        <button
          type="button"
          className="iconBtn themeToggle authThemeToggle"
          onClick={toggleTheme}
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="mobileLogo">
            <Logo />
          </div>
          <h2>
            {isRegister
              ? isAdminPage
                ? "Create Admin Account"
                : "Create an account"
              : isAdminPage
                ? "Admin Sign In"
                : "Welcome back"}
          </h2>
          <p>
            {isRegister
              ? "Sign up to get started - choose your role below."
              : isAdminPage
                ? "Enter your details to access the admin dashboard."
                : "Enter your details to access your workspace."}
          </p>

          {error && <div className="formError">{error}</div>}
          {status && <div className="formSuccess">{status}</div>}

          {isRegister && (
            <label>
              Full Name
              <input
                name="name"
                type="text"
                placeholder="Enter your name"
                required
                autoComplete="off"
              />
            </label>
          )}
          <label>
            Email address
            <input
              name="email"
              type="email"
              placeholder="Enter your email"
              required
              autoComplete="off"
            />
          </label>
          <label>
            Password
            <div className="password">
              <input
                name="password"
                type={show ? "text" : "password"}
                placeholder="Enter your password"
                required
                autoComplete="new-password"
                minLength={6}
              />
              <button type="button" onClick={() => setShow(!show)}>
                {show ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </label>
          {isRegister && (
            <label>
              My Role
              <select
                name="role"
                defaultValue={isAdminPage ? "admin" : "developer"}
              >
                <option value="admin">Admin</option>
                <option value="developer">Developer</option>
                <option value="tester">Tester</option>
              </select>
            </label>
          )}
          {!isRegister && (
            <div className="remember">
              <label>
                <input type="checkbox" defaultChecked /> Remember me
              </label>
              <a>Forgot password?</a>
            </div>
          )}
          <button className="primary loginBtn" disabled={submitting}>
            {submitting ? "Please wait..." : isRegister ? "Sign up" : "Sign in"}{" "}
            <ArrowUpRight />
          </button>
          <p
            className="signup"
            onClick={() => {
              setIsRegister(!isRegister);
              setError("");
            }}
            style={{ cursor: "pointer" }}
          >
            {isRegister ? (
              <>
                Already have an account? <b>Sign in</b>
              </>
            ) : (
              <>
                New to WizzyBug? <b>Create an account</b>
              </>
            )}
          </p>
        </form>
      </div>
    </div>
  );
}

export default Login;

