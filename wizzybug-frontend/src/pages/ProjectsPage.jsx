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
                {saving ? "Creating..." : "Create project"}
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

export default ProjectsPage;

