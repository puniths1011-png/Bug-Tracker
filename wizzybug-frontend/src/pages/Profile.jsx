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
              {saving ? "Saving..." : saved ? "âœ“ Saved!" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// Admin-only: assign or reassign every bug in the workspace to a developer.
// This is the dedicated page requested for bug-assignment workflows.

export default Profile;

