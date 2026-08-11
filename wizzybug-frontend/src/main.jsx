import React, { useMemo, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Bug,
  Plus,
  Users,
  User,
  Settings,
  LogOut,
  Search,
  Bell,
  ChevronDown,
  ArrowUpRight,
  Clock3,
  CircleCheck,
  TriangleAlert,
  Filter,
  Download,
  Menu,
  X,
  ChevronRight,
  Paperclip,
  Send,
  CalendarDays,
  BarChart3,
  FolderKanban,
  Activity,
  ShieldCheck,
  Eye,
  EyeOff,
  Moon,
  Sun,
  UserCog,
  Mail,
  ClipboardList,
  RefreshCcw,
  FolderPlus,
  ArrowLeft,
} from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import "./styles.css";

const initialBugs = [];
const initialUsers = [];

const API = import.meta.env.VITE_API_URL;

/* ---------------------------------------------------------------------- */
/* Auth token helpers                                                     */
/* ---------------------------------------------------------------------- */
const getToken = () => localStorage.getItem("token") || "";
const setToken = (t) => {
  if (t) localStorage.setItem("token", t);
  else localStorage.removeItem("token");
};
const clearStoredAuth = () => {
  setToken(null);
  localStorage.removeItem("user");
  localStorage.setItem("isLogged", "false");
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("auth:expired"));
  }
};

// Central fetch wrapper: always attaches the JWT (when present), always sends
// / expects JSON, and throws a readable Error on non-2xx responses so callers
// can just try/catch instead of re-checking res.ok everywhere.
async function apiFetch(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const headers = isFormData
    ? { ...(options.headers || {}) }
    : {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(API + path, { ...options, headers });
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    /* no body */
  }

  if (!res.ok) {
    const message = (data && data.message) || `Request failed (${res.status})`;
    if (
      res.status === 401 &&
      typeof window !== "undefined" &&
      !path.startsWith("/auth/")
    ) {
      clearStoredAuth();
    }
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return data;
}

/* ---------------------------------------------------------------------- */
/* India Standard Time helpers -- every timestamp in the app renders in   */
/* Asia/Kolkata regardless of the visiting browser's own timezone, and    */
/* updates live whenever the underlying data (or the clock) changes.      */
/* ---------------------------------------------------------------------- */
const IST_TZ = "Asia/Kolkata";

function formatIST(dateInput, { withTime = true } = {}) {
  if (!dateInput) return "—";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "—";
  const opts = {
    timeZone: IST_TZ,
    day: "2-digit",
    month: "short",
    year: "numeric",
  };
  if (withTime) {
    opts.hour = "2-digit";
    opts.minute = "2-digit";
    opts.hour12 = true;
  }
  return d.toLocaleString("en-IN", opts);
}

function formatISTLong(dateInput) {
  if (!dateInput) return "—";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    timeZone: IST_TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function timeAgoIST(dateInput) {
  if (!dateInput) return "—";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "—";
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatIST(dateInput, { withTime: false });
}

const initialsOf = (name = "") =>
  name.trim()
    ? name
        .trim()
        .split(/\s+/)
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

/* ---------------------------------------------------------------------- */
/* Status / priority mapping -- backend stores lowercase enums, the UI    */
/* shows friendly labels. Keeping bug.status as the RAW backend value     */
/* everywhere avoids the "Fixed" vs "resolved" mismatches of the old UI.  */
/* ---------------------------------------------------------------------- */
const STATUS_LABELS = {
  // Keep this order consistent with the workflow shown in the All Bugs filter.
  open: "Open / New",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
  rejected: "Rejected",
  deferred: "Deferred",
  not_reproducible: "Not Reproducible",
};
const STATUS_VALUES = Object.keys(STATUS_LABELS);
const statusLabel = (s) => STATUS_LABELS[s] || s;
const statusClass = (s) => String(s || "open").toLowerCase().replaceAll("_", "-");

const PRIORITY_LABELS = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};
const priorityLabel = (p) =>
  PRIORITY_LABELS[p] || (p ? p.charAt(0).toUpperCase() + p.slice(1) : "Medium");

// The report form keeps its detailed, QA-style severity wording, but every
// bug is stored against the backend's simple critical/high/medium/low enum
// so severity badges, stats, and filters stay consistent everywhere else.
const SEVERITY_TO_PRIORITY = {
  "Blocker(System Crash/Data Loss)": "critical",
  Critical: "critical",
  Major: "high",
  Minor: "medium",
  Cosmetic: "low",
};

// Turns a raw ticket returned by the API into the flat shape the UI uses.
function formatBug(t) {
  const priority = (t.priority || "medium").toLowerCase();
  const status = (t.status || "open").toLowerCase();
  const assignees = Array.isArray(t.assignees)
    ? t.assignees
    : t.assignee
      ? [t.assignee]
      : [];
  const assigneeNames = assignees.map((a) => a?.name || a).filter(Boolean);
  return {
    id: t._id ? t._id.substring(t._id.length - 6).toUpperCase() : "WZ-000000",
    rawId: t._id,
    title: t.title,
    desc: t.description,
    severity: priorityLabel(priority),
    priority,
    status,
    project: t.project?.name || "Unassigned project",
    projectId: t.project?._id || t.project || null,
    projectKey: t.project?.key || "",
    reporter: t.creator?.name || "System",
    reporterId: t.creator?._id || null,
    assignees,
    assignee: assigneeNames.length ? assigneeNames.join(", ") : "Unassigned",
    assigneeIds: assignees.map((a) => a?._id || a).filter(Boolean),
    assigneeId: assignees[0]?._id || assignees[0] || null,
    date: formatIST(t.createdAt, { withTime: false }),
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    comments: (t.comments || []).length,
    commentList: t.comments || [],
    history: t.history || [],
    hasScreenshot: !!t.screenshot || !!t.imageUrl,
    imageUrl: t.imageUrl || null,
    fixDescription: t.fixDescription || "",
    environment: t.environment,
    moduleFeatureName: t.moduleFeatureName,
    buildAppVersion: t.buildAppVersion,
    releaseVersion: t.releaseVersion,
    reproductionRate: t.reproductionRate,
    expectedResult: t.expectedResult,
    actualResult: t.actualResult,
    typeOfApplication: t.typeOfApplication,
    browser: t.browser,
    browserVersion: t.browserVersion,
  };
}

function Logo() {
  return (
    <div className="logo">
      <span className="logoMark">
        <Bug size={20} />
      </span>
      <strong>
        Wizzy<span>Bug</span>
      </strong>
    </div>
  );
}

function Avatar({ text = "OS", small = false }) {
  return <span className={"avatar " + (small ? "small" : "")}>{text}</span>;
}

function Status({ children }) {
  const label = STATUS_LABELS[children] || children;
  return (
    <span className={"status " + statusClass(children)}>
      <i />
      {label}
    </span>
  );
}

function RoleBadge({ role }) {
  const r = (role || "developer").toLowerCase();
  const label = r.charAt(0).toUpperCase() + r.slice(1);
  return <span className={"role " + r}>{label}</span>;
}

function Sidebar({
  page,
  setPage,
  open,
  setOpen,
  onLogout,
  user,
  bugs = [],
  projects = [],
  projectFilter,
  setProjectFilter,
  theme,
  toggleTheme,
}) {
  const isAdmin = user?.role === "admin";
  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const items = [
    ["dashboard", LayoutDashboard, "Dashboard"],
    ["bugs", Bug, "All Bugs"],
    ["report", Plus, "Report a Bug"],
  ];
  if (isAdmin) items.push(["assign", UserCog, "Assign Bugs"]);
  if (isAdmin) items.push(["users", Users, "User Management"]);
  items.push(["profile", User, "My Profile"]);

  return (
    <aside className={open ? "open" : ""}>
      <div className="sideTop">
        <Logo />
        <button className="closeMobile" onClick={() => setOpen(false)}>
          <X />
        </button>
      </div>
      <nav>
        <p>WORKSPACE</p>
        {items.map(([id, I, label]) => (
          <button
            key={id}
            className={page === id && !projectFilter ? "active" : ""}
            onClick={() => {
              setPage(id);
              setProjectFilter && setProjectFilter(null);
              setOpen(false);
            }}
          >
            <I size={18} />
            {label}
            {id === "bugs" && <em>{bugs.length}</em>}
          </button>
        ))}
        <p>PROJECTS</p>
        <button
          className={page === "projects" ? "active" : ""}
          onClick={() => {
            setPage("projects");
            setOpen(false);
          }}
        >
          <FolderKanban size={18} />
          All Projects
          <ChevronRight
            size={14}
            className={"chev " + (projectsExpanded ? "open" : "")}
            onClick={(e) => {
              e.stopPropagation();
              setProjectsExpanded(!projectsExpanded);
            }}
          />
        </button>
        {projectsExpanded && (
          <div className="projectSubnav">
            {projects.length === 0 && (
              <small className="emptyHint">No projects yet</small>
            )}
            {projects.map((p) => (
              <button
                key={p._id}
                className={
                  "projectSubBtn " + (projectFilter === p._id ? "active" : "")
                }
                onClick={() => {
                  setPage("bugs");
                  setProjectFilter && setProjectFilter(p._id);
                  setOpen(false);
                }}
              >
                <span className="projectDot" />
                {p.name}
                <em>{bugs.filter((b) => b.projectId === p._id).length}</em>
              </button>
            ))}
          </div>
        )}
      </nav>
      <div className="sideFoot">
        <div
          className="profileMini"
          onClick={() => {
            setPage("profile");
            setOpen(false);
          }}
          style={{ cursor: "pointer" }}
        >
          <Avatar text={initialsOf(user?.name)} />
          <div>
            <b>{user?.name || "Olivia Stone"}</b>
            <small>
              {user?.role
                ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
                : "Developer"}
            </small>
          </div>
        </div>
        <button className="logout" onClick={onLogout}>
          <LogOut size={17} />
          Log out
        </button>
      </div>
    </aside>
  );
}

function Header({
  title,
  onMenu,
  setPage,
  globalSearch,
  setGlobalSearch,
  theme,
  toggleTheme,
}) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  return (
    <header>
      <button className="mobileMenu" onClick={onMenu}>
        <Menu />
      </button>
      <div>
        <h1>{title}</h1>
        <p>
          {formatISTLong(now)} ·{" "}
          {now.toLocaleTimeString("en-IN", {
            timeZone: IST_TZ,
            hour: "2-digit",
            minute: "2-digit",
          })}{" "}
          IST
        </p>
      </div>
      <div className="headerActions">
        <label className="globalSearch">
          <Search size={17} />
          <input
            placeholder="Search Anything..."
            value={globalSearch}
            onChange={(e) => {
              setGlobalSearch(e.target.value);
              if (e.target.value.trim() !== "") {
                setPage("bugs");
              }
            }}
          />
        </label>
        <button
          className="iconBtn"
          onClick={() => alert("You have no new notifications at this time.")}
        >
          <Bell size={19} />
        </button>
        <button
          className="iconBtn themeToggle themeToggleNav"
          onClick={toggleTheme}
          title={
            theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"
          }
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          <span className="themeToggleLabel">
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </span>
        </button>
        <button className="primary" onClick={() => setPage("report")}>
          <Plus size={18} />
          Report Bug
        </button>
      </div>
    </header>
  );
}

function isAssignedToUser(bug, user) {
  if (!user) return false;
  const userId = user._id ? String(user._id) : "";
  const userEmail = user.email ? String(user.email).toLowerCase() : "";
  const userName = user.name ? String(user.name).trim() : "";

  if (userId && (bug.assigneeIds || []).some((id) => String(id) === userId))
    return true;
  if (
    Array.isArray(bug.assignees) &&
    bug.assignees.some((a) => {
      const assigneeId = a && a._id ? String(a._id) : "";
      const assigneeEmail = a && a.email ? String(a.email).toLowerCase() : "";
      const assigneeName = a && a.name ? String(a.name).trim() : "";
      return (
        (userId && assigneeId && assigneeId === userId) ||
        (userEmail && assigneeEmail && assigneeEmail === userEmail) ||
        (userName && assigneeName && assigneeName === userName)
      );
    })
  )
    return true;

  const assigneeText = bug.assignee ? String(bug.assignee) : "";
  if (userName && assigneeText) {
    const names = assigneeText.split(",").map((n) => n.trim().toLowerCase());
    if (names.includes(userName.toLowerCase())) return true;
  }
  if (userEmail && assigneeText) {
    return assigneeText.toLowerCase().includes(userEmail);
  }
  return false;
}

function Stats({ admin = true, bugs = [], user }) {
  const total = bugs.length;
  const open = bugs.filter((b) => b.status === "open").length;
  const inProgress = bugs.filter((b) => b.status === "in_progress").length;
  const closed = bugs.filter(
    (b) => b.status === "closed" || b.status === "resolved",
  ).length;

  const thisMonthResolved = bugs.filter((b) => {
    if (b.status !== "resolved" && b.status !== "closed") return false;
    const d = new Date(b.updatedAt || b.createdAt);
    const now = new Date();
    return (
      d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    );
  }).length;

  const data = admin
    ? [
        [
          "Total Bugs",
          total,
          `${
            bugs.filter((b) => {
              const d = new Date(b.createdAt);
              const now = new Date();
              return (
                d.getMonth() === now.getMonth() &&
                d.getFullYear() === now.getFullYear()
              );
            }).length
          } this month`,
          Bug,
          "purple",
        ],
        ["Open Bugs", open, "needs triage", TriangleAlert, "red"],
        ["In Progress", inProgress, "being worked on", Clock3, "orange"],
        ["Closed", closed, "resolved", CircleCheck, "green"],
      ]
    : [
        [
          "Assigned to me",
          bugs.filter((b) => isAssignedToUser(b, user)).length,
          "total",
          Bug,
          "purple",
        ],
        [
          "In Progress",
          bugs.filter(
            (b) => isAssignedToUser(b, user) && b.status === "in_progress",
          ).length,
          "working",
          Clock3,
          "orange",
        ],
        [
          "Fixed this month",
          bugs.filter(
            (b) =>
              isAssignedToUser(b, user) &&
              (b.status === "resolved" || b.status === "closed"),
          ).length,
          "done",
          CircleCheck,
          "blue",
        ],
        ["Open bugs", open, "across team", Activity, "green"],
      ];

  return (
    <div className="stats">
      {data.map(([label, num, delta, I, color]) => (
        <article key={label}>
          <div className={"statIcon " + color}>
            <I size={20} />
          </div>
          <span>{label}</span>
          <strong>{num}</strong>
          <small>
            <b>
              <ArrowUpRight size={13} />
              {delta}
            </b>
          </small>
        </article>
      ))}
    </div>
  );
}

// 7-day bug intake trend, rendered with the pre-built .chart / .line / .area
// CSS in styles.css (previously unused -- Trend/Distribution were empty stubs).
function Trend({ bugs = [] }) {
  const days = useMemo(() => {
    const arr = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      arr.push(d);
    }
    return arr;
  }, [bugs]);

  const counts = days.map(
    (d) =>
      bugs.filter((b) => {
        const bd = new Date(b.createdAt);
        return bd.toDateString() === d.toDateString();
      }).length,
  );

  const max = Math.max(1, ...counts);
  const points = counts
    .map((c, i) => {
      const x = (i / (counts.length - 1)) * 100;
      const y = 100 - (c / max) * 90;
      return `${x},${y}`;
    })
    .join(" ");
  const areaPoints = `0,100 ${points} 100,100`;

  return (
    <article className="panel chartCard">
      <div className="panelHead">
        <div>
          <h3>Bug Trend</h3>
          <p>New bugs reported over the last 7 days</p>
        </div>
      </div>
      <div className="chart">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="yaxis">
          <polyline className="area" points={areaPoints} />
          <polyline className="line" points={points} />
        </svg>
        <div className="months">
          {days.map((d, i) => (
            <span key={i}>
              {d.toLocaleDateString("en-IN", {
                timeZone: IST_TZ,
                weekday: "short",
              })}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}

// Severity distribution donut, using the same pre-built .donut CSS.
function Distribution({ bugs = [] }) {
  const counts = { critical: 0, high: 0, medium: 0, low: 0, cosmetic: 0 };
  bugs.forEach((b) => {
    if (counts[b.priority] !== undefined) counts[b.priority]++;
  });
  const total = bugs.length || 1;
  const colors = {
    critical: "#ff7d87",
    high: "#f0a456",
    medium: "#80aaff",
    low: "#9b99a4",
    cosmetic: "#9b99a4",
  };

  let cumulative = 0;
  const segments = Object.entries(counts).map(([key, count]) => {
    const pct = count / total;
    const start = cumulative;
    cumulative += pct;
    return {
      key,
      count,
      start: start * 360,
      end: cumulative * 360,
      color: colors[key],
    };
  });

  const gradient = segments
    .map((s) => `${s.color} ${s.start}deg ${s.end}deg`)
    .join(", ");

  return (
    <article className="panel chartCard">
      <div className="panelHead">
        <div>
          <h3>Severity Distribution</h3>
          <p>Breakdown of open work by severity</p>
        </div>
      </div>
      <div className="donutWrap">
        <div
          className="donut"
          style={{
            background: bugs.length
              ? `conic-gradient(${gradient})`
              : "var(--border)",
          }}
        >
          <div className="donutHole">
            <strong>{bugs.length}</strong>
            <small>Total</small>
          </div>
        </div>
        <ul className="distLegend">
          {Object.entries(counts).map(([key, count]) => (
            <li key={key}>
              <span style={{ background: colors[key] }} />
              {priorityLabel(key)}
              <b>{count}</b>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

function BugTable({ bugs, setSelected, compact = false }) {
  return (
    <div className="tableWrap">
      <table>
        <thead>
          <tr>
            <th>BUG</th>
            <th>SEVERITY</th>
            <th>STATUS</th>
            <th>ASSIGNEE</th>
            <th>CREATED (IST)</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {bugs.map((b) => (
            <tr
              key={b.id}
              onClick={() => setSelected(b)}
              style={{ cursor: "pointer" }}
            >
              <td>
                <b>{b.title}</b>
                <small>
                  {b.id} · {b.project}
                </small>
              </td>
              <td>
                <span className={"severity " + b.severity.toLowerCase()}>
                  {b.severity}
                </span>
              </td>
              <td>
                <Status>{b.status}</Status>
              </td>
              <td>
                {b.assignee === "Unassigned" ? (
                  <span className="muted">Unassigned</span>
                ) : (
                  <span className="person">
                    <Avatar text={initialsOf(b.assignee.split(",")[0])} small />
                    {b.assignee}
                  </span>
                )}
              </td>
              <td className="date">{formatIST(b.createdAt)}</td>
              <td />
            </tr>
          ))}
          {bugs.length === 0 && (
            <tr>
              <td
                colSpan={6}
                className="muted"
                style={{ textAlign: "center", padding: "30px 0" }}
              >
                No bugs to show.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Dashboard({ bugs, setSelected, setPage, user }) {
  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("WizzyBug - Bug Report", 14, 15);
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`Generated ${formatIST(new Date())} IST`, 14, 21);

    const tableColumn = [
      "BUG ID",
      "TITLE",
      "SEVERITY",
      "STATUS",
      "PROJECT",
      "ASSIGNEE",
      "CREATED (IST)",
    ];
    const tableRows = bugs.map((b) => [
      b.id,
      b.title,
      b.severity,
      statusLabel(b.status),
      b.project,
      b.assignee,
      formatIST(b.createdAt),
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 26,
    });

    doc.save("wizzybug_bugs_report.pdf");
  };

  const isAdmin = user?.role === "admin";

  return (
    <>
      <div className="welcome">
        <div>
          <h2>Hi, {user?.name || "there"}</h2>
          <p>Here’s what’s happening with your projects today.</p>
        </div>
        <button className="outline" onClick={exportToPDF}>
          <Download size={17} />
          Download Report
        </button>
      </div>
      <Stats bugs={bugs} admin={isAdmin} user={user} />
      <div className="analytics">
        <Trend bugs={bugs} />
        <Distribution bugs={bugs} />
      </div>
      <article className="panel recent">
        <div className="panelHead">
          <div>
            <h3>Recent Bugs</h3>
            <p>Latest issues reported across all projects</p>
          </div>
          <button className="link" onClick={() => setPage("bugs")}>
            View all Bugs <ChevronRight size={16} />
          </button>
        </div>
        <BugTable bugs={bugs.slice(0, 5)} setSelected={setSelected} />
      </article>
    </>
  );
}

function BugsPage({
  bugs,
  setSelected,
  user,
  globalSearch,
  setGlobalSearch,
  projects = [],
  projectFilter,
  setProjectFilter,
}) {
  const [status, setStatus] = useState("All");
  const [tab, setTab] = useState("All");

  const scoped = projectFilter
    ? bugs.filter((b) => b.projectId === projectFilter)
    : bugs;

  const filteredBugs = scoped.filter((b) => {
    if (tab === "Assigned to me" && !isAssignedToUser(b, user)) return false;
    if (tab === "Unassigned" && b.assignee !== "Unassigned") return false;
    return true;
  });

  const rows = filteredBugs.filter(
    (b) =>
      (b.title + b.id).toLowerCase().includes(globalSearch.toLowerCase()) &&
      (status === "All" || b.status === status),
  );
  const activeProject = projects.find((p) => p._id === projectFilter);

  return (
    <>
      <div className="pageIntro">
        <div>
          <h2>{activeProject ? activeProject.name : "All Bugs"}</h2>
          <p>
            {activeProject
              ? `Bugs scoped to ${activeProject.name}.`
              : "Track, prioritize, and resolve issues across every project."}
          </p>
        </div>
        {activeProject && (
          <button className="outline" onClick={() => setProjectFilter(null)}>
            <X size={15} />
            Clear Project Filter
          </button>
        )}
      </div>
      <div className="tabs">
        <button
          className={tab === "All" ? "active" : ""}
          onClick={() => setTab("All")}
        >
          All <span>{scoped.length}</span>
        </button>
        <button
          className={tab === "Assigned to me" ? "active" : ""}
          onClick={() => setTab("Assigned to me")}
        >
          Assigned to me{" "}
          <span>{scoped.filter((b) => isAssignedToUser(b, user)).length}</span>
        </button>
        <button
          className={tab === "Unassigned" ? "active" : ""}
          onClick={() => setTab("Unassigned")}
        >
          Unassigned{" "}
          <span>
            {scoped.filter((b) => b.assignee === "Unassigned").length}
          </span>
        </button>
      </div>
      <article className="panel bugList">
        <div className="tableTools">
          <label>
            <Search size={17} />
            <input
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Search by title or bug ID..."
            />
          </label>
          <div>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="All">All Statuses</option>
              {STATUS_VALUES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            {projects.length > 0 && (
              <select
                value={projectFilter || ""}
                onChange={(e) => setProjectFilter(e.target.value || null)}
              >
                <option value="">All Projects</option>
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
        <BugTable bugs={rows} setSelected={setSelected} />
        <div className="pagination">
          <span>
            Showing 1–{rows.length} of {scoped.length} bugs
          </span>
        </div>
      </article>
    </>
  );
}

function ReportPage({ addBug, setPage, projects = [], users = [], user }) {
  const [form, setForm] = useState({
    technicalMemberName: user?.name || "",
    project: projects[0]?._id || "",
    assignee: "",
    assignees: [],
    moduleFeatureName: "",
    environment: "",
    buildAppVersion: "",
    releaseVersion: "",
    defectSummary: "",
    stepsToReproduce: "",
    defectType: "",
    severity: "Blocker(System Crash/Data Loss)",
    priority: "P1-Immediate Fix",
    reproductionRate: "100%",
    expectedResult: "",
    actualResult: "",
    typeOfApplication: "",
    browser: "Chrome",
    browserVersion: "",
  });
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const compressImageUpload = async (selectedFile) => {
    if (!selectedFile || !selectedFile.type?.startsWith("image/")) {
      return null;
    }

    const reader = new FileReader();
    const dataUrl = await new Promise((resolve, reject) => {
      reader.onload = () => resolve(reader.result);
      reader.onerror = () =>
        reject(new Error("Could not read the selected image."));
      reader.readAsDataURL(selectedFile);
    });

    const image = new Image();
    const img = await new Promise((resolve, reject) => {
      image.onload = () => resolve(image);
      image.onerror = () =>
        reject(new Error("The selected image could not be loaded."));
      image.src = dataUrl;
    });

    const maxDimension = 1280;
    let width = img.width;
    let height = img.height;

    if (width > height && width > maxDimension) {
      height = (height * maxDimension) / width;
      width = maxDimension;
    } else if (height > maxDimension) {
      width = (width * maxDimension) / height;
      height = maxDimension;
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width);
    canvas.height = Math.round(height);

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not prepare the image for upload.");

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const mimeType =
      selectedFile.type === "image/png" || selectedFile.type === "image/webp"
        ? "image/jpeg"
        : selectedFile.type;
    const quality = selectedFile.size > 1024 * 1024 ? 0.72 : 0.82;
    const compressedDataUrl = canvas.toDataURL(mimeType, quality);

    return {
      base64: compressedDataUrl.split(",")[1],
      mimeType,
    };
  };

  // Keep the project dropdown pointed at a real project once the list loads.
  useEffect(() => {
    if (!form.project && projects.length)
      setForm((f) => ({ ...f, project: projects[0]._id }));
  }, [projects]);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });
  const isAdmin = user?.role === "admin";

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.defectSummary) return;
    if (!form.project) {
      setError("Select a project before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      let imageFile = file;
      if (file) {
        const compressed = await compressImageUpload(file);
        if (compressed) {
          const byteCharacters = atob(compressed.base64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i += 1) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          imageFile = new File([byteArray], file.name, { type: compressed.mimeType });
        }
      }

      await addBug({
        title: form.defectSummary,
        desc: form.stepsToReproduce,
        severity: form.severity,
        project: form.project,
        assignee: form.assignee || undefined,
        assignees: form.assignees.length ? form.assignees : undefined,
        file: imageFile,
        environment: form.environment,
        moduleFeatureName: form.moduleFeatureName,
        buildAppVersion: form.buildAppVersion,
        releaseVersion: form.releaseVersion,
        reproductionRate: form.reproductionRate,
        expectedResult: form.expectedResult,
        actualResult: form.actualResult,
        typeOfApplication: form.typeOfApplication,
        browser: form.browser,
        browserVersion: form.browserVersion,
      });
      setPage("bugs");
    } catch (err) {
      console.error("Error submitting bug:", err);
      setError(err.message || "Could not submit Bug. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="formPage">
      <div className="pageIntro">
        <div>
          <h2>Report a Bug</h2>
          <p>
            Give your team the context they need to reproduce and resolve the
            issue.
          </p>
        </div>
      </div>
      <form className="panel reportForm" onSubmit={submit}>
        <div className="sectionTitle">
          <span>1</span>
          <div>
            <h3>Issue Details</h3>
            <p>Describe what went wrong and where it happened.</p>
          </div>
        </div>

        {error && <div className="formError">{error}</div>}

        <label>
          Technical Member Name<b>*</b>
          <input
            name="technicalMemberName"
            value={form.technicalMemberName}
            onChange={handleChange}
            placeholder="your Answer"
            required
          />
        </label>
        <label>
          Project Name <b>*</b>
          {projects.length === 0 ? (
            <div className="muted" style={{ padding: "10px 0" }}>
              No projects yet —{" "}
              {isAdmin ? (
                <>
                  create one from the{" "}
                  <a
                    onClick={() => setPage("projects")}
                    style={{ cursor: "pointer", color: "var(--purple2)" }}
                  >
                    Projects Page
                  </a>{" "}
                  first.
                </>
              ) : (
                "ask an admin to create one first."
              )}
            </div>
          ) : (
            <select
              name="project"
              value={form.project}
              onChange={handleChange}
              required
            >
              {projects.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                  {p.key ? ` (${p.key})` : ""}
                </option>
              ))}
            </select>
          )}
        </label>

        {isAdmin && (
          <label>
            Assign to (optional)
            <select
              multiple
              value={form.assignees}
              onChange={(e) =>
                setForm({
                  ...form,
                  assignees: Array.from(
                    e.target.selectedOptions,
                    (opt) => opt.value,
                  ),
                })
              }
              style={{ minHeight: "110px" }}
            >
              <option value="">Leave unassigned</option>
              {users
                .filter((u) => u.role === "developer")
                .map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name}
                  </option>
                ))}
            </select>
            <small className="muted">
              Hold Ctrl/Cmd to select multiple developers.
            </small>
          </label>
        )}

        <label>
          Module / Feature Name<b>*</b>
          <input
            name="moduleFeatureName"
            value={form.moduleFeatureName}
            onChange={handleChange}
            placeholder="your Answer"
            required
          />
        </label>

        <label>
          Environment <b>*</b>
        </label>
        <div className="radioGroup">
          {["Development", "QA", "UAT", "Staging", "Production"].map((env) => (
            <label
              key={env}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                margin: 0,
                fontWeight: "normal",
              }}
            >
              <input
                type="radio"
                name="environment"
                value={env}
                checked={form.environment === env}
                onChange={handleChange}
                required
              />{" "}
              {env}
            </label>
          ))}
        </div>
        <br />

        <label>
          Build or App Version (Optional)
          <input
            name="buildAppVersion"
            value={form.buildAppVersion}
            onChange={handleChange}
            placeholder="your Answer"
          />
        </label>

        <label>
          Release Version (Optional)
          <input
            name="releaseVersion"
            value={form.releaseVersion}
            onChange={handleChange}
            placeholder="your Answer"
          />
        </label>

        <label>
          Defect Summary<b>*</b>
          <input
            name="defectSummary"
            value={form.defectSummary}
            onChange={handleChange}
            placeholder="your Answer"
            required
          />
        </label>

        <label>
          Steps to Reproduce (Write Point Wise with 1 Numbering)<b>*</b>
          <input
            name="stepsToReproduce"
            value={form.stepsToReproduce}
            onChange={handleChange}
            placeholder="your Answer"
            required
          />
        </label>

        <label>
          Defect Type <b>*</b>
        </label>
        <div className="radioGroup">
          {[
            "Functional",
            "UI/UX",
            "Performance",
            "Security",
            "Integration",
            "Data Validation",
            "Accessibility",
            "API",
            "Mobile",
            "Database",
            "Regression",
            "Enhancement Request",
            "Other",
          ].map((type) => (
            <label
              key={type}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                margin: 0,
                fontWeight: "normal",
              }}
            >
              <input
                type="radio"
                name="defectType"
                value={type}
                checked={form.defectType === type}
                onChange={handleChange}
                required
              />{" "}
              {type}
            </label>
          ))}
        </div>
        <br />

        <div className="twoCol">
          <label>
            Severity <b>*</b>
            <select
              name="severity"
              value={form.severity}
              onChange={handleChange}
            >
              <option>Blocker(System Crash/Data Loss)</option>
              <option>Critical</option>
              <option>Major</option>
              <option>Minor</option>
              <option>Cosmetic</option>
            </select>
          </label>
          <label>
            Priority<b>*</b>
            <select
              name="priority"
              value={form.priority}
              onChange={handleChange}
            >
              <option>P1-Immediate Fix</option>
              <option>P2-High</option>
              <option>P3-Medium</option>
              <option>P4-Low</option>
            </select>
          </label>
        </div>

        <div className="twoCol">
          <label>
            Reproduction Rate<b>*</b>
            <select
              name="reproductionRate"
              value={form.reproductionRate}
              onChange={handleChange}
            >
              <option>100%</option>
              <option>75%</option>
              <option>50%</option>
              <option>25%</option>
              <option>Random</option>
            </select>
          </label>
        </div>

        <label>
          Expected Result<b>*</b>
          <input
            name="expectedResult"
            value={form.expectedResult}
            onChange={handleChange}
            placeholder="your Answer"
            required
          />
        </label>
        <label>
          Actual Result<b>*</b>
          <input
            name="actualResult"
            value={form.actualResult}
            onChange={handleChange}
            placeholder="your Answer"
            required
          />
        </label>

        <div className="sectionTitle second">
          <span>2</span>
          <div>
            <h3>Attachments</h3>
            <p>Add screenshots or files that help explain the issue.</p>
          </div>
        </div>
        <label className="drop">
          <Paperclip />
          <strong>
            {file ? (
              file.name
            ) : (
              <>
                Drop files here or <u>browse</u>
              </>
            )}
          </strong>
          <small>PNG, JPG, GIF or MP4 · Max 10MB</small>
          <input type="file" onChange={(e) => setFile(e.target.files[0])} />
        </label>

        <label>
          Type of Application <b>*</b>
        </label>
        <div className="radioGroup">
          {["Web Application", "Mobile App", "Mobile Browser"].map((type) => (
            <label
              key={type}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                margin: 0,
                fontWeight: "normal",
              }}
            >
              <input
                type="radio"
                name="typeOfApplication"
                value={type}
                checked={form.typeOfApplication === type}
                onChange={handleChange}
                required
              />{" "}
              {type}
            </label>
          ))}
        </div>
        <br />

        <div className="twoCol">
          <label>
            Browser (Configuration Information)<b>*</b>
            <select name="browser" value={form.browser} onChange={handleChange}>
              <option>Chrome</option>
              <option>Firefox</option>
              <option>Safari</option>
              <option>Edge</option>
              <option>Other</option>
            </select>
          </label>
        </div>

        <label>
          Browser Version<b>*</b>
          <input
            name="browserVersion"
            value={form.browserVersion}
            onChange={handleChange}
            placeholder="your Answer"
            required
          />
        </label>

        <div className="formActions">
          <button
            type="button"
            className="outline"
            onClick={() => setPage("bugs")}
          >
            Cancel
          </button>
          <button className="primary" disabled={submitting}>
            <Bug size={17} />
            {submitting ? "Submitting..." : "Submit Bug"}
          </button>
        </div>
      </form>
    </div>
  );
}

// Turns backend history + comment entries into one merged, time-sorted feed.
function buildTimeline(bug) {
  const historyItems = (bug.history || []).map((h) => ({
    kind: "history",
    type: h.type,
    message: h.message,
    actorName: h.actorName || "System",
    createdAt: h.createdAt,
  }));
  const commentItems = (bug.commentList || []).map((c) => ({
    kind: "comment",
    message: c.text,
    actorName: c.authorName || "Unknown user",
    createdAt: c.createdAt,
  }));
  return [...historyItems, ...commentItems].sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
  );
}

function Detail({
  bug,
  setSelected,
  updateStatus,
  addComment,
  saveFixNotes,
  assignBug,
  users = [],
  user,
}) {
  const [next, setNext] = useState(bug.status);
  const [commentText, setCommentText] = useState("");
  const [fixDescription, setFixDescription] = useState(
    bug.fixDescription || "",
  );
  const [savingFix, setSavingFix] = useState(false);
  const [savedFix, setSavedFix] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setNext(bug.status);
    setFixDescription(bug.fixDescription || "");
  }, [bug.rawId, bug.status, bug.fixDescription]);

  const isAdmin = user?.role === "admin";
  const timeline = buildTimeline(bug);

  const handleSend = async () => {
    if (!commentText.trim()) return;
    setBusy(true);
    try {
      await addComment(bug.rawId, commentText.trim());
      setCommentText("");
    } catch (e) {
      alert(e.message || "Could not post comment");
    }
    setBusy(false);
  };

  const handleStatusChange = async (value) => {
    setNext(value);
    setBusy(true);
    try {
      await updateStatus(bug.rawId, value);
    } catch (e) {
      alert(e.message || "Could not update status");
      setNext(bug.status);
    }
    setBusy(false);
  };

  const handleSaveFix = async () => {
    setSavingFix(true);
    try {
      await saveFixNotes(bug.rawId, fixDescription);
      setSavedFix(true);
      setTimeout(() => setSavedFix(false), 2000);
    } catch (e) {
      alert(e.message || "Could not save fix description");
    }
    setSavingFix(false);
  };

  const handleReassign = async (userIds) => {
    setBusy(true);
    try {
      await assignBug(bug.rawId, userIds);
      setReassignOpen(false);
    } catch (e) {
      alert(e.message || "Could not reassign bug");
    }
    setBusy(false);
  };

  const exportBugPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`WizzyBug · ${bug.id}`, 14, 16);
    doc.setFontSize(11);
    doc.setTextColor(80);
    doc.text(bug.title, 14, 24);

    autoTable(doc, {
      startY: 30,
      theme: "plain",
      styles: { fontSize: 10 },
      body: [
        ["Status", statusLabel(bug.status)],
        ["Severity", bug.severity],
        ["Project", bug.project],
        ["Reporter", bug.reporter],
        ["Assignee", bug.assignee],
        ["Reported (IST)", formatIST(bug.createdAt)],
        ["Last updated (IST)", formatIST(bug.updatedAt)],
        ["Environment", bug.environment || "—"],
        ["Module / Feature", bug.moduleFeatureName || "—"],
        [
          "Browser",
          [bug.browser, bug.browserVersion].filter(Boolean).join(" ") || "—",
        ],
      ],
    });

    let y = doc.lastAutoTable.finalY + 8;
    const addBlock = (label, text) => {
      if (!text) return;
      doc.setFontSize(11);
      doc.setTextColor(20);
      doc.text(label, 14, y);
      y += 5;
      doc.setFontSize(9);
      doc.setTextColor(90);
      const lines = doc.splitTextToSize(text, 180);
      doc.text(lines, 14, y);
      y += lines.length * 4.5 + 5;
    };
    addBlock("Description", bug.desc);
    addBlock("Expected result", bug.expectedResult);
    addBlock("Actual result", bug.actualResult);
    addBlock("Fix description", bug.fixDescription);

    if (timeline.length) {
      doc.setFontSize(11);
      doc.setTextColor(20);
      doc.text("Activity log", 14, y);
      y += 3;
      autoTable(doc, {
        startY: y + 3,
        head: [["When (IST)", "Who", "Update"]],
        styles: { fontSize: 8 },
        body: timeline.map((t) => [
          formatIST(t.createdAt),
          t.actorName,
          t.message,
        ]),
      });
    }

    doc.save(`${bug.id}_wizzyBug.pdf`);
  };

  return (
    <>
      <button className="back" onClick={() => setSelected(null)}>
        ← Back to All Bugs
      </button>
      <div className="detailHead">
        <div>
          <div>
            <span className="bugId">{bug.id}</span>
            <Status>{bug.status}</Status>
          </div>
          <h2>{bug.title}</h2>
          <p>
            Reported by {bug.reporter} on {formatIST(bug.createdAt)} IST
          </p>
        </div>
        <button className="outline" onClick={exportBugPDF}>
          <Download size={17} />
          Export PDF
        </button>
      </div>
      <div className="detailGrid">
        <div>
          <article className="panel contentCard">
            <h3>Description</h3>
            <p>{bug.desc}</p>
            {(bug.expectedResult || bug.actualResult) && (
              <div className="twoCol">
                {bug.expectedResult && (
                  <div>
                    <h3>Expected result</h3>
                    <p>{bug.expectedResult}</p>
                  </div>
                )}
                {bug.actualResult && (
                  <div>
                    <h3>Actual result</h3>
                    <p>{bug.actualResult}</p>
                  </div>
                )}
              </div>
            )}
            {bug.imageUrl ? (
              <div className="attachment">
                <div>Image</div>
                <span>
                  <b>Uploaded screenshot</b>
                  <small>View attachment</small>
                </span>
                <button
                  className="iconBtn"
                  onClick={() => window.open(bug.imageUrl, "_blank")}
                >
                  <Download size={17} />
                </button>
              </div>
            ) : bug.hasScreenshot ? (
              <div className="attachment">
                <div>PNG</div>
                <span>
                  <b>screenshot.png</b>
                  <small>View attachment</small>
                </span>
                <button
                  className="iconBtn"
                  onClick={() =>
                    window.open(
                      `${API}/tickets/${bug.rawId}/screenshot`,
                      "_blank",
                    )
                  }
                >
                  <Download size={17} />
                </button>
              </div>
            ) : null}
          </article>
          <article className="panel comments">
            <h3>
              Activity
              <span>{timeline.length}</span>
            </h3>
            <div className="timeline">
              {timeline.map((t, i) => (
                <div key={i}>
                  <Avatar text={initialsOf(t.actorName)} small />
                  <p>
                    <b>{t.actorName}</b>{" "}
                    {t.kind === "comment" ? (
                      <>commented: {t.message}</>
                    ) : (
                      t.message
                    )}
                    <small>{formatIST(t.createdAt)} IST</small>
                  </p>
                </div>
              ))}
              {timeline.length === 0 && (
                <p className="muted">No activity yet.</p>
              )}
            </div>
            <div className="commentBox">
              <Avatar text={initialsOf(user?.name)} />
              <textarea
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <button onClick={handleSend} disabled={busy}>
                <Send size={17} />
              </button>
            </div>
          </article>
        </div>
        <aside className="panel detailsSide">
          <h3>Details</h3>
          <label>
            Status
            <select
              value={next}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={busy}
            >
              {STATUS_VALUES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Severity
            <span className={"severity " + bug.severity.toLowerCase()}>
              {bug.severity}
            </span>
          </label>
          <label>
            Assignee
            <span className="person">
              <Avatar
                text={
                  bug.assignee === "Unassigned"
                    ? "?"
                    : initialsOf(bug.assignee.split(",")[0])
                }
                small
              />
              {bug.assignee}
            </span>
            {isAdmin && (
              <button
                type="button"
                className="link"
                style={{ marginTop: 6 }}
                onClick={() => setReassignOpen((o) => !o)}
              >
                {bug.assignee === "Unassigned" ? "Assign…" : "Reassign…"}
              </button>
            )}
            {reassignOpen && (
              <select
                autoFocus
                multiple
                defaultValue={bug.assigneeIds || []}
                onChange={(e) =>
                  handleReassign(
                    Array.from(e.target.selectedOptions, (opt) => opt.value),
                  )
                }
                disabled={busy}
                style={{ minHeight: "110px" }}
              >
                {users
                  .filter((u) => u.role === "developer")
                  .map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name}
                    </option>
                  ))}
              </select>
            )}
          </label>
          <label>
            Reporter
            <span className="person">
              <Avatar text={initialsOf(bug.reporter)} small />
              {bug.reporter}
            </span>
          </label>
          <label>
            Project<b>{bug.project}</b>
          </label>
          <label>
            Reported
            <span>
              <CalendarDays size={15} /> {formatIST(bug.createdAt)} IST
            </span>
          </label>
          <label>
            Last Updated
            <span>
              <CalendarDays size={15} /> {formatIST(bug.updatedAt)} IST
            </span>
          </label>
          <hr />
          <h3>Fix Description</h3>
          <textarea
            placeholder="Add details about the fix..."
            value={fixDescription}
            onChange={(e) => setFixDescription(e.target.value)}
          />
          <button
            className="primary full"
            onClick={handleSaveFix}
            disabled={savingFix}
          >
            {savingFix ? "Saving..." : savedFix ? "✓ Saved!" : "Save Changes"}
          </button>
        </aside>
      </div>
    </>
  );
}

function InviteUserModal({ onClose, onInvited }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleInvite = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const name = e.target.name.value;
    const email = e.target.email.value;
    const role = e.target.role.value;

    try {
      const data = await apiFetch("/auth/invite", {
        method: "POST",
        body: JSON.stringify({ name, email, role }),
      });
      if (data?.mailMode === "preview") {
        alert(
          `Invite created for ${email}, but the backend is not configured for real email delivery yet. Check the server console for the preview link.`,
        );
      } else {
        alert(
          `Invite sent to ${email}! An email with a sign-up link has been sent to their inbox.`,
        );
      }
      onInvited &&
        onInvited({
          _id: email,
          name,
          email,
          role,
          status: "pending",
          createdAt: new Date().toISOString(),
        });
      onClose();
    } catch (err) {
      setError(err.message || "Error inviting user");
      setLoading(false);
    }
  };

  return (
    <div
      className="overlay"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <form
        className="panel profileForm"
        onSubmit={handleInvite}
        style={{ width: "400px", padding: "30px" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <h3 style={{ margin: 0 }}>Invite Team Member</h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--muted)",
            }}
          >
            <X size={20} />
          </button>
        </div>
        <p
          className="muted"
          style={{ marginTop: -10, marginBottom: 15, fontSize: 13 }}
        >
          <Mail size={13} style={{ verticalAlign: -2, marginRight: 4 }} />A real
          email with a sign-up link is sent to the address below.
        </p>
        {error && <div className="formError">{error}</div>}
        <label>
          Full Name
          <input name="name" required placeholder="Jane Doe" />
        </label>
        <label>
          Email Address
          <input
            name="email"
            type="email"
            required
            placeholder="jane@example.com"
          />
        </label>
        <label>
          Role
          <select name="role">
            <option value="developer">Developer</option>
            <option value="tester">Tester</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <div className="formActions" style={{ marginTop: "25px" }}>
          <button
            className="primary"
            type="submit"
            disabled={loading}
            style={{ width: "100%" }}
          >
            {loading ? "Sending invite..." : "Send Invite"}
          </button>
        </div>
      </form>
    </div>
  );
}

function UsersPage({ users, bugs = [], currentUser, refreshUsers }) {
  const [showInvite, setShowInvite] = useState(false);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [localUsers, setLocalUsers] = useState(
    Array.isArray(users) ? users : [],
  );

  useEffect(() => {
    if (Array.isArray(users)) {
      setLocalUsers(users);
    }
  }, [users]);

  const sourceUsers = localUsers.length ? localUsers : users;
  const withStats = (sourceUsers || []).map((u) => ({
    ...u,
    bugCount: bugs.filter(
      (b) => (b.assigneeIds || []).includes(u._id) || b.assignee === u.name,
    ).length,
  }));

  const rows = withStats.filter(
    (u) =>
      (roleFilter === "All" || u.role === roleFilter) &&
      (u.name.toLowerCase().includes(query.toLowerCase()) ||
        u.email.toLowerCase().includes(query.toLowerCase())),
  );

  return (
    <>
      <div className="pageIntro">
        <div>
          <h2>User Management</h2>
          <p>Manage workspace access, roles, and team members. Admin-only.</p>
        </div>
        <button className="primary" onClick={() => setShowInvite(true)}>
          <Plus size={17} />
          Invite User
        </button>
      </div>
      {showInvite && (
        <InviteUserModal
          onClose={() => setShowInvite(false)}
          onInvited={(invitedUser) => {
            setLocalUsers((prev) => [invitedUser, ...prev]);
            refreshUsers && refreshUsers();
          }}
        />
      )}
      <div className="stats mini">
        <article>
          <div className="statIcon purple">
            <Users />
          </div>
          <span>Total Users</span>
          <strong>{withStats.length}</strong>
        </article>
        <article>
          <div className="statIcon blue">
            <Bug />
          </div>
          <span>Developers</span>
          <strong>
            {withStats.filter((u) => u.role === "developer").length}
          </strong>
        </article>
        <article>
          <div className="statIcon orange">
            <Eye />
          </div>
          <span>Testers</span>
          <strong>{withStats.filter((u) => u.role === "tester").length}</strong>
        </article>
        <article>
          <div className="statIcon green">
            <ShieldCheck />
          </div>
          <span>Admins</span>
          <strong>{withStats.filter((u) => u.role === "admin").length}</strong>
        </article>
      </div>
      <article className="panel userTable">
        <div className="tableTools">
          <label>
            <Search />
            <input
              placeholder="Search Users..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="All">All Roles</option>
            <option value="admin">Admin</option>
            <option value="developer">Developer</option>
            <option value="tester">Tester</option>
          </select>
        </div>
        <table>
          <thead>
            <tr>
              <th>USER</th>
              <th>ROLE</th>
              <th>ASSIGNED BUGS</th>
              <th>STATUS</th>
              <th>MEMBER SINCE (IST)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.email}>
                <td>
                  <span className="person">
                    <Avatar text={initialsOf(u.name)} />
                    <span>
                      <b>{u.name}</b>
                      <small>{u.email}</small>
                    </span>
                  </span>
                </td>
                <td>
                  <RoleBadge role={u.role} />
                </td>
                <td>{u.bugCount}</td>
                <td>
                  {u.status === "pending" ? (
                    <span className="status open">
                      <i />
                      Invite Pending
                    </span>
                  ) : (
                    <span className="status closed">
                      <i />
                      {u.status === "active" || u.status === "accepted"
                        ? "Accepted"
                        : "Active"}
                    </span>
                  )}
                </td>
                <td className="date">
                  {formatIST(u.createdAt, { withTime: false })}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="muted"
                  style={{ textAlign: "center", padding: "30px 0" }}
                >
                  No team members yet. Invite your first user to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </article>
    </>
  );
}

function Profile({ user, setUser, bugs = [] }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const bugsReported = bugs.filter((b) => b.reporter === user?.name).length;
  const bugsResolved = bugs.filter(
    (b) =>
      b.assignee === user?.name &&
      (b.status === "resolved" || b.status === "closed"),
  ).length;
  const bugsAssigned = bugs.filter((b) => b.assignee === user?.name).length;

  const handleSave = (e) => {
    e.preventDefault();
    setSaving(true);

    const firstName = e.target.firstName.value;
    const lastName = e.target.lastName.value;
    const email = e.target.email.value;
    const updatedName = `${firstName} ${lastName}`.trim();

    if (setUser) {
      setUser({ ...user, name: updatedName, email });
    }

    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 600);
  };

  const firstName = user?.name ? user.name.split(" ")[0] : "";
  const lastName = user?.name ? user.name.split(" ").slice(1).join(" ") : "";

  return (
    <>
      <div className="pageIntro">
        <div>
          <h2>My Profile</h2>
          <p>Manage your personal information and account security.</p>
        </div>
      </div>
      <div className="profileGrid">
        <article className="panel profileCard">
          <div className="bigAvatar">{initialsOf(user?.name)}</div>
          <RoleBadge role={user?.role} />
          <hr />
          <div>
            <span>
              Bugs reported<b>{bugsReported}</b>
            </span>
            <span>
              Bugs assigned<b>{bugsAssigned}</b>
            </span>
            <span>
              Bugs resolved<b>{bugsResolved}</b>
            </span>
          </div>
        </article>
        <form className="panel profileForm" onSubmit={handleSave}>
          <h3>Personal Information</h3>
          <p>Update your name and contact information.</p>
          <div className="twoCol">
            <label>
              First name
              <input name="firstName" defaultValue={firstName} required />
            </label>
            <label>
              Last name
              <input name="lastName" defaultValue={lastName} required />
            </label>
          </div>
          <label>
            Email address
            <input
              name="email"
              type="email"
              defaultValue={user?.email || ""}
              required
            />
          </label>
          <label>
            Role
            <input
              value={
                user?.role
                  ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
                  : "Developer"
              }
              disabled
            />
          </label>
          <div className="formActions">
            <button className="primary" type="submit" disabled={saving}>
              {saving ? "Saving..." : saved ? "✓ Saved!" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// Admin-only: assign or reassign every bug in the workspace to a developer.
// This is the dedicated page requested for bug-assignment workflows.
function AssignBugsPage({ bugs, users, assignBug, setSelected }) {
  const [projectFilter, setProjectFilter] = useState("All");
  const [onlyUnassigned, setOnlyUnassigned] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const developers = users.filter((u) => u.role === "developer");
  const projectNames = [
    "All",
    ...Array.from(new Set(bugs.map((b) => b.project))),
  ];

  const rows = bugs.filter((b) => {
    if (projectFilter !== "All" && b.project !== projectFilter) return false;
    if (onlyUnassigned && b.assignee !== "Unassigned") return false;
    if (b.status === "closed") return false;
    return true;
  });

  const handleAssign = async (bug, userIds) => {
    if (!userIds || userIds.length === 0) return;
    setBusyId(bug.rawId);
    try {
      await assignBug(bug.rawId, userIds);
    } catch (e) {
      alert(e.message || "Could not assign bug");
    }
    setBusyId(null);
  };

  return (
    <>
      <div className="pageIntro">
        <div>
          <h2>
            <b>Assign Bugs</b>
          </h2>
          <p>
            Route open bugs to the right developer. Assignees are notified by
            email.
          </p>
        </div>
      </div>
      <div className="stats mini">
        <article>
          <div className="statIcon purple">
            <Bug />
          </div>
          <span>Open Bugs</span>
          <strong>{bugs.filter((b) => b.status !== "closed").length}</strong>
        </article>
        <article>
          <div className="statIcon red">
            <TriangleAlert />
          </div>
          <span>Unassigned</span>
          <strong>
            {
              bugs.filter(
                (b) => b.assignee === "Unassigned" && b.status !== "closed",
              ).length
            }
          </strong>
        </article>
        <article>
          <div className="statIcon blue">
            <Users />
          </div>
          <span>Developers Available</span>
          <strong>{developers.length}</strong>
        </article>
      </div>
      <article className="panel bugList">
        <div className="tableTools">
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
          >
            {projectNames.map((p) => (
              <option key={p} value={p}>
                {p === "All" ? "All Projects" : p}
              </option>
            ))}
          </select>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontWeight: 500,
              fontSize: 13,
            }}
          >
            <input
              type="checkbox"
              checked={onlyUnassigned}
              onChange={(e) => setOnlyUnassigned(e.target.checked)}
              style={{ width: "auto" }}
            />
            Only Unassigned
          </label>
        </div>
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>BUG</th>
                <th>SEVERITY</th>
                <th>STATUS</th>
                <th>CURRENT ASSIGNEE</th>
                <th>ASSIGN TO</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id}>
                  <td
                    onClick={() => setSelected(b)}
                    style={{ cursor: "pointer" }}
                  >
                    <b>{b.title}</b>
                    <small>
                      {b.id} · {b.project}
                    </small>
                  </td>
                  <td>
                    <span className={"severity " + b.severity.toLowerCase()}>
                      {b.severity}
                    </span>
                  </td>
                  <td>
                    <Status>{b.status}</Status>
                  </td>
                  <td>
                    {b.assignee === "Unassigned" ? (
                      <span className="muted">Unassigned</span>
                    ) : (
                      <span className="person">
                        <Avatar
                          text={initialsOf(b.assignee.split(",")[0])}
                          small
                        />
                        {b.assignee}
                      </span>
                    )}
                  </td>
                  <td>
                    <select
                      multiple
                      defaultValue={[]}
                      disabled={busyId === b.rawId}
                      onChange={(e) => {
                        handleAssign(
                          b,
                          Array.from(
                            e.target.selectedOptions,
                            (opt) => opt.value,
                          ),
                        );
                      }}
                      style={{ minHeight: "90px" }}
                    >
                      {developers.map((d) => (
                        <option key={d._id} value={d._id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="muted"
                    style={{ textAlign: "center", padding: "30px 0" }}
                  >
                    No bugs match these filters.
                  </td>
                </tr>
              )}
              {developers.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="muted"
                    style={{ textAlign: "center", padding: "10px 0" }}
                  >
                    No developers yet — invite one from User Management.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </>
  );
}

// Real project directory backing the sidebar's Projects section: create
// projects (admin), see per-project bug counts, jump into a scoped bug list.
function ProjectsPage({
  projects,
  bugs,
  user,
  createProject,
  setPage,
  setProjectFilter,
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isAdmin = user?.role === "admin";

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      await createProject({ name: name.trim(), description });
      setName("");
      setDescription("");
      setShowCreate(false);
    } catch (err) {
      setError(err.message || "Could not create project");
    }
    setSaving(false);
  };

  return (
    <>
      <div className="pageIntro">
        <div>
          <h2>Projects</h2>
          <p>Everything is organized by project. Pick one to see its bugs.</p>
        </div>
        {isAdmin && (
          <button className="primary" onClick={() => setShowCreate(true)}>
            <FolderPlus size={17} />
            New Project
          </button>
        )}
      </div>

      {showCreate && (
        <div
          className="overlay"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <form
            className="panel profileForm"
            onSubmit={handleCreate}
            style={{ width: "400px", padding: "30px" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <h3 style={{ margin: 0 }}>New project</h3>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--muted)",
                }}
              >
                <X size={20} />
              </button>
            </div>
            {error && <div className="formError">{error}</div>}
            <label>
              Project name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. Checkout Revamp"
              />
            </label>
            <label>
              Description
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description (optional)"
              />
            </label>
            <div className="formActions" style={{ marginTop: 15 }}>
              <button
                className="primary"
                type="submit"
                disabled={saving}
                style={{ width: "100%" }}
              >
                {saving ? "Creating…" : "Create project"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="projectGrid">
        {projects.map((p) => {
          const projBugs = bugs.filter((b) => b.projectId === p._id);
          const open = projBugs.filter((b) => b.status !== "closed").length;
          return (
            <article
              key={p._id}
              className="panel projectCard"
              onClick={() => {
                setPage("bugs");
                setProjectFilter(p._id);
              }}
            >
              <div className="projectCardHead">
                <span className="projectKey">
                  {p.key || p.name.slice(0, 3).toUpperCase()}
                </span>
                <span
                  className={
                    "status " + (p.status === "archived" ? "closed" : "open")
                  }
                >
                  <i />
                  {p.status || "active"}
                </span>
              </div>
              <h3>{p.name}</h3>
              <p>{p.description || "No description yet."}</p>
              <div className="projectCardFoot">
                <span>
                  <Bug size={14} />
                  {open} open
                </span>
                <span>
                  <Users size={14} />
                  {(p.members || []).length} members
                </span>
              </div>
            </article>
          );
        })}
        {projects.length === 0 && (
          <div className="muted" style={{ padding: "30px 0" }}>
            No projects yet.{" "}
            {isAdmin
              ? "Create the first one above."
              : "Ask an admin to create one."}
          </div>
        )}
      </div>
    </>
  );
}

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
          © 2026 WizzyBug. Built for teams who care.
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
              ? "Sign up to get started — choose your role below."
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

function App({ isAdminPage = false }) {
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "dark";
    return localStorage.getItem("theme") || "dark";
  });
  const [logged, setLogged] = useState(() => {
    if (typeof window === "undefined") return false;
    const storedIsLogged = localStorage.getItem("isLogged");
    if (storedIsLogged === "true") return true;
    return Boolean(getToken());
  });
  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem("user");
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  });
  const [globalSearch, setGlobalSearch] = useState("");
  const [page, setPage] = useState("dashboard");
  const [bugs, setBugs] = useState([]);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [projectFilter, setProjectFilter] = useState(null);
  const [menu, setMenu] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  const titles = {
    dashboard: "Dashboard",
    bugs: "Bug Management",
    report: "Report a Bug",
    users: "User Management",
    profile: "My Profile",
    assign: "Assign Bugs",
    projects: "Projects",
  };
  const selected = selectedId
    ? bugs.find((b) => b.rawId === selectedId) || null
    : null;
  const setSelected = (b) => setSelectedId(b ? b.rawId : null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("isLogged", logged);
    if (user) localStorage.setItem("user", JSON.stringify(user));
    else localStorage.removeItem("user");
  }, [logged, user]);

  useEffect(() => {
    const handleAuthExpired = () => {
      setLogged(false);
      setUser(null);
      setBugs([]);
      setUsers([]);
      setProjects([]);
      setPage("dashboard");
    };

    window.addEventListener("auth:expired", handleAuthExpired);
    return () => window.removeEventListener("auth:expired", handleAuthExpired);
  }, []);

  const refreshTickets = () =>
    apiFetch("/tickets")
      .then((data) => {
        if (Array.isArray(data)) setBugs(data.map(formatBug));
      })
      .catch((err) => console.error("Error fetching tickets:", err));

  const refreshUsers = () =>
    apiFetch("/users?includePending=true")
      .then((data) => {
        if (Array.isArray(data)) setUsers(data);
      })
      .catch((err) => console.error("Error fetching users:", err));

  const refreshProjects = () =>
    apiFetch("/projects")
      .then((data) => {
        if (Array.isArray(data)) setProjects(data);
      })
      .catch((err) => console.error("Error fetching projects:", err));

  useEffect(() => {
    if (!logged) return;
    setLoadingData(true);
    Promise.all([refreshTickets(), refreshUsers(), refreshProjects()]).finally(
      () => setLoadingData(false),
    );
  }, [logged]);

  if (!logged)
    return (
      <Login
        onLogin={(u, token) => {
          setToken(token);
          setUser(u);
          setLogged(true);
        }}
        isAdminPage={isAdminPage}
        theme={theme}
        toggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
      />
    );

  const addBug = async (b) => {
    const mappedPriority = SEVERITY_TO_PRIORITY[b.severity] || "medium";
    const formData = new FormData();
    formData.append("title", b.title);
    formData.append("description", b.desc);
    formData.append("priority", mappedPriority);
    formData.append("project", b.project);
    if (b.assignee) formData.append("assignee", b.assignee);
    if (b.assignees) {
      if (Array.isArray(b.assignees)) {
        b.assignees.forEach((assignee) => formData.append("assignees", assignee));
      } else {
        formData.append("assignees", b.assignees);
      }
    }
    if (b.file) {
      formData.append("image", b.file);
    }
    formData.append("environment", b.environment || "");
    formData.append("moduleFeatureName", b.moduleFeatureName || "");
    formData.append("buildAppVersion", b.buildAppVersion || "");
    formData.append("releaseVersion", b.releaseVersion || "");
    formData.append("reproductionRate", b.reproductionRate || "");
    formData.append("expectedResult", b.expectedResult || "");
    formData.append("actualResult", b.actualResult || "");
    formData.append("typeOfApplication", b.typeOfApplication || "");
    formData.append("browser", b.browser || "");
    formData.append("browserVersion", b.browserVersion || "");

    const data = await apiFetch("/tickets", {
      method: "POST",
      body: formData,
    });
    setBugs((x) => [formatBug(data), ...x]);
    if (b.assignee) refreshUsers();
  };

  const updateStatus = async (rawId, status) => {
    const data = await apiFetch(`/tickets/${rawId}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
    setBugs((x) => x.map((b) => (b.rawId === rawId ? formatBug(data) : b)));
  };

  const addComment = async (rawId, text) => {
    const data = await apiFetch(`/tickets/${rawId}/comments`, {
      method: "POST",
      body: JSON.stringify({ text }),
    });
    setBugs((x) => x.map((b) => (b.rawId === rawId ? formatBug(data) : b)));
  };

  const saveFixNotes = async (rawId, fixDescription) => {
    const data = await apiFetch(`/tickets/${rawId}/fix-notes`, {
      method: "PUT",
      body: JSON.stringify({ fixDescription }),
    });
    setBugs((x) => x.map((b) => (b.rawId === rawId ? formatBug(data) : b)));
  };

  const assignBug = async (rawId, userIds) => {
    const payload = Array.isArray(userIds)
      ? { assignees: userIds }
      : { assignee: userIds };
    const data = await apiFetch(`/tickets/${rawId}/assign`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    setBugs((x) => x.map((b) => (b.rawId === rawId ? formatBug(data) : b)));
  };

  const createProject = async (payload) => {
    const data = await apiFetch("/projects", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setProjects((x) => [data, ...x]);
  };

  const isAdmin = user?.role === "admin";
  let content;
  if (selected) {
    content = (
      <Detail
        bug={selected}
        setSelected={setSelected}
        updateStatus={updateStatus}
        addComment={addComment}
        saveFixNotes={saveFixNotes}
        assignBug={assignBug}
        users={users}
        user={user}
      />
    );
  } else if (page === "dashboard") {
    content = (
      <Dashboard
        bugs={bugs}
        setSelected={setSelected}
        setPage={setPage}
        user={user}
      />
    );
  } else if (page === "bugs") {
    content = (
      <BugsPage
        bugs={bugs}
        setSelected={setSelected}
        user={user}
        globalSearch={globalSearch}
        setGlobalSearch={setGlobalSearch}
        projects={projects}
        projectFilter={projectFilter}
        setProjectFilter={setProjectFilter}
      />
    );
  } else if (page === "report") {
    content = (
      <ReportPage
        addBug={addBug}
        setPage={setPage}
        projects={projects}
        users={users}
        user={user}
      />
    );
  } else if (page === "assign" && isAdmin) {
    content = (
      <AssignBugsPage
        bugs={bugs}
        users={users}
        assignBug={assignBug}
        setSelected={setSelected}
      />
    );
  } else if (page === "users" && isAdmin) {
    content = (
      <UsersPage
        users={users}
        bugs={bugs}
        currentUser={user}
        refreshUsers={refreshUsers}
      />
    );
  } else if (page === "projects") {
    content = (
      <ProjectsPage
        projects={projects}
        bugs={bugs}
        user={user}
        createProject={createProject}
        setPage={setPage}
        setProjectFilter={setProjectFilter}
      />
    );
  } else {
    content = <Profile user={user} setUser={setUser} bugs={bugs} />;
  }

  return (
    <div className="app">
      <Sidebar
        page={page}
        setPage={(p) => {
          setPage(p);
          setSelectedId(null);
        }}
        open={menu}
        setOpen={setMenu}
        onLogout={() => {
          setToken(null);
          setLogged(false);
          setUser(null);
          setBugs([]);
          setUsers([]);
          setProjects([]);
        }}
        user={user}
        bugs={bugs}
        projects={projects}
        projectFilter={projectFilter}
        setProjectFilter={setProjectFilter}
        theme={theme}
        toggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
      />
      <main>
        <Header
          title={selected ? "Bug details" : titles[page]}
          onMenu={() => setMenu(true)}
          setPage={setPage}
          globalSearch={globalSearch}
          setGlobalSearch={setGlobalSearch}
          theme={theme}
          toggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
        />
        <div className="content">
          {loadingData && bugs.length === 0 ? (
            <div className="muted" style={{ padding: 40, textAlign: "center" }}>
              Loading your workspace…
            </div>
          ) : (
            content
          )}
        </div>
      </main>
      {menu && <div className="overlay" onClick={() => setMenu(false)} />}
    </div>
  );
}

function AcceptInvite() {
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const token = new URLSearchParams(window.location.search).get("token");

  const handleAccept = async (e) => {
    e.preventDefault();
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
    } catch (err) {
      setStatus("Error: " + (err.message || "Server error"));
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
              onChange={(e) => setPassword(e.target.value)}
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

function AppRouter() {
  return (
    <Routes>
      <Route path="/admin" element={<App isAdminPage={true} />} />
      <Route path="/accept-invite" element={<AcceptInvite />} />
      <Route path="/*" element={<App isAdminPage={false} />} />
    </Routes>
  );
}

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <AppRouter />
  </BrowserRouter>,
);
