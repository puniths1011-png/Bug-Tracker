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
    <aside className={`sidebar ${open ? "open" : ""}`}>
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
            <b>{user?.name || ""}</b>
            <small>
              {user?.role
                ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
                : ""}
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

export default Sidebar;

