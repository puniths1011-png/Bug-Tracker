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

  const sourceUsers = Array.isArray(users) && users.length ? users : localUsers;
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

export default UsersPage;

