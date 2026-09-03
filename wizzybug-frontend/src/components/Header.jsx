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

export default Header;

