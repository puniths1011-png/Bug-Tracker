import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import "./styles/styles.css";
import {
  API,
  apiFetch,
  clearStoredAuth,
  getToken,
  setToken,
} from "./config/api";
import {
  PRIORITY_LABELS,
  SEVERITY_TO_PRIORITY,
  STATUS_LABELS,
  STATUS_VALUES,
} from "./utils/constants";
import { IST_TZ, formatIST, formatISTLong, timeAgoIST } from "./utils/date";
import { Avatar, Logo, RoleBadge, Status } from "./components/Ui";
import { formatBug } from "./utils/formatters";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import AssignBugsPage from "./pages/AssignBugsPage";
import BugsPage from "./pages/BugsPage";
import Dashboard from "./pages/Dashboard";
import Detail from "./pages/Detail";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import ProjectsPage from "./pages/ProjectsPage";
import ReportPage from "./pages/ReportPage";
import UsersPage from "./pages/UsersPage";

const initialBugs = [];
const initialUsers = [];




function App({ isAdminPage = false }) {
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "light";
    return localStorage.getItem("theme") || "light";
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

  useEffect(() => {
    const initialState = window.history.state;
    window.history.replaceState(
      {
        ...(initialState || {}),
        page,
        projectFilter,
        selectedId: null,
      },
      "",
      window.location.href,
    );

    const handlePopState = (event) => {
      const state = event.state;
      if (!state || !state.page) {
        setSelectedId(null);
        setPage("dashboard");
        setProjectFilter(null);
        return;
      }
      setPage(state.page);
      setProjectFilter(state.projectFilter || null);
      setSelectedId(state.selectedId || null);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (selectedId) return;
    window.history.replaceState(
      { ...(window.history.state || {}), page, projectFilter, selectedId: null },
      "",
      window.location.href,
    );
  }, [page, projectFilter, selectedId]);

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
  const navigateTo = (nextPage, nextProjectFilter = null) => {
    window.history.pushState(
      { page: nextPage, projectFilter: nextProjectFilter, selectedId: null },
      "",
      window.location.href,
    );
    setSelectedId(null);
    setPage(nextPage);
    setProjectFilter(nextProjectFilter);
  };
  const navigatePage = (nextPage) => navigateTo(nextPage, null);
  const navigateProjectFilter = (nextProjectFilter) =>
    navigateTo("bugs", nextProjectFilter);
  const setSelected = (b) => {
    if (b) {
      window.history.pushState(
        { page, projectFilter, selectedId: b.rawId },
        "",
        window.location.href,
      );
      setSelectedId(b.rawId);
      return;
    }

    if (selectedId && window.history.state?.selectedId === selectedId) {
      window.history.back();
    } else {
      setSelectedId(null);
    }
  };

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

  const updateBug = async (rawId, values) => {
    const data = await apiFetch(`/tickets/${rawId}`, {
      method: "PUT",
      body: JSON.stringify({
        title: values.title,
        description: values.desc,
        expectedResult: values.expectedResult,
        actualResult: values.actualResult,
      }),
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
        updateBug={updateBug}
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
        setPage={navigatePage}
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
        setProjectFilter={navigateProjectFilter}
      />
    );
  } else if (page === "report") {
    content = (
      <ReportPage
        addBug={addBug}
        setPage={navigatePage}
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
        setPage={navigatePage}
        setProjectFilter={navigateProjectFilter}
      />
    );
  } else {
    content = <Profile user={user} setUser={setUser} bugs={bugs} />;
  }

  return (
    <div className="app">
      <Sidebar
        page={page}
        setPage={navigatePage}
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
        setProjectFilter={navigateProjectFilter}
        onDashboard={() => {
          navigatePage("dashboard");
        }}
        theme={theme}
        toggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
      />
      <main>
        <Header
          title={selected ? "Bug details" : titles[page]}
          onMenu={() => setMenu(true)}
          setPage={navigatePage}
          globalSearch={globalSearch}
          setGlobalSearch={setGlobalSearch}
          theme={theme}
          toggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
        />
        <div className="content">
          {loadingData && bugs.length === 0 ? (
            <div className="muted" style={{ padding: 40, textAlign: "center" }}>
              Loading your workspace...
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

export default App;

