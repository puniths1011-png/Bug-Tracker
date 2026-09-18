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

function Header({
  title,
  onMenu,
  setPage,
  globalSearch,
  setGlobalSearch,
  theme,
  toggleTheme,
  bugs = [],
  user,
  setSelected,
}) {
  const [now, setNow] = useState(new Date());
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const notifications = bugs
    .filter((bug) => isAssignedToUser(bug, user))
    .slice(0, 8);

  return (
    <header>
      <button className="mobileMenu" onClick={onMenu}>
        <Menu />
      </button>
      <div>
        <h1>{title}</h1>
        <p>
          {formatISTLong(now)} -{" "}
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
        <div className="notificationWrap">
          <button
            className="iconBtn"
            type="button"
            aria-label="Open notifications"
            aria-expanded={notificationsOpen}
            onClick={() => setNotificationsOpen((open) => !open)}
          >
            <Bell size={19} />
            {notifications.length > 0 && <i />}
          </button>
          {notificationsOpen && (
            <div className="notificationMenu" role="dialog" aria-label="Notifications">
              <div className="notificationHead">
                <strong>Notifications</strong>
                <span>{notifications.length}</span>
              </div>
              {notifications.length ? (
                <div className="notificationList">
                  {notifications.map((bug) => (
                    <button
                      className={`notificationCard ${user?.role || "member"}`}
                      key={bug.rawId || bug.id}
                      type="button"
                      onClick={() => {
                        setNotificationsOpen(false);
                        setSelected(bug);
                      }}
                    >
                      <span className="notificationIcon"><Bell size={16} /></span>
                      <span className="notificationText">
                        <b>Bug assigned to you</b>
                        <span>{bug.title}</span>
                        <small>{bug.project} · {timeAgoIST(bug.updatedAt || bug.createdAt)}</small>
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="notificationEmpty">No bug assignments yet.</p>
              )}
            </div>
          )}
        </div>
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

export default Header;

