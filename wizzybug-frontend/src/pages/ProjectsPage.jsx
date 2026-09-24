import React, { useMemo, useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
const {LayoutDashboard,Bug,Plus,Users,User,Settings,LogOut,Search,Bell,ChevronDown,ArrowUpRight,Clock3,CircleCheck,TriangleAlert,Filter,Download,Menu,X,ChevronRight,Paperclip,Send,CalendarDays,BarChart3,FolderKanban,Activity,ShieldCheck,Eye,EyeOff,Moon,Sun,UserCog,Mail,ClipboardList,RefreshCcw,FolderPlus,ArrowLeft,Trash2,Pencil} = Icons;
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { API, apiFetch, setToken } from '../config/api';
import { formatIST, formatISTLong, timeAgoIST, IST_TZ } from '../utils/date';
import { STATUS_LABELS, STATUS_VALUES, PRIORITY_LABELS, SEVERITY_TO_PRIORITY } from '../utils/constants';
import { Avatar, Logo, RoleBadge, Status } from '../components/Ui';
import { initialsOf, isAssignedToUser, priorityLabel, statusLabel, buildTimeline } from '../utils/formatters';

const isCodeLikeDescription = (description = "") => {
  const codeSignals = /\b(let|const|var|if|else|switch|case|break|console\.log)\b|\/\//g;
  return description.split(/\r?\n/).length > 1 && (description.match(codeSignals) || []).length >= 2;
};

function ProjectsPage({
  projects,
  bugs,
  user,
  createProject,
  deleteProject,
  updateProject,
  openProject,
  setPage,
  setProjectFilter,
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [editingProject, setEditingProject] = useState(null);
  const [editDescription, setEditDescription] = useState("");
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!showCreate && !editingProject) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showCreate, editingProject]);

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

  const handleDelete = async (project) => {
    if (!window.confirm(`Remove project "${project.name}" and all of its bugs?`)) return;
    setDeletingId(project._id);
    setError("");
    try {
      await deleteProject(project._id);
    } catch (err) {
      setError(err.message || "Could not remove project");
    } finally {
      setDeletingId("");
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await updateProject(editingProject._id, { description: editDescription });
      setEditingProject(null);
    } catch (err) {
      setError(err.message || "Could not update project");
    } finally {
      setSaving(false);
    }
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
            className="panel profileForm projectModal"
            onSubmit={handleCreate}
            style={{ padding: "30px" }}
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
              <textarea
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                rows={2}
                placeholder="e.g. Checkout Revamp"
              />
            </label>
            <label>
              Description
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
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

      {editingProject && (
        <div className="overlay" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <form className="panel profileForm" onSubmit={handleEdit} style={{ width: "400px", padding: "30px" }}>
            <div className="modalHeading">
              <h3>Edit description</h3>
              <button type="button" onClick={() => setEditingProject(null)} aria-label="Close edit dialog">
                <X size={20} />
              </button>
            </div>
            {error && <div className="formError">{error}</div>}
            <label>
              {editingProject.name}
              <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={5} autoFocus />
            </label>
            <div className="formActions" style={{ marginTop: 15 }}>
              <button className="primary" type="submit" disabled={saving} style={{ width: "100%" }}>
                {saving ? "Saving..." : "Save description"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="projectGrid">
        {projects.map((p) => {
          const projBugs = bugs.filter(
            (b) => String(b.projectId) === String(p._id),
          );
          const memberKeys = new Set(
            (p.members || [])
              .map((member) => member?._id || member)
              .filter(Boolean)
              .map(String),
          );
          projBugs.forEach((bug) => {
            (bug.assigneeIds || []).filter(Boolean).forEach((assigneeId) => {
              memberKeys.add(String(assigneeId));
            });
          });
          const open = projBugs.filter((b) => b.status !== "closed").length;
          const cardDescription = p.description || "No description yet.";
          const isDescriptionLong = cardDescription.length > 150;
          return (
            <article
              key={p._id}
              className="panel projectCard"
              onClick={() => openProject(p._id)}
            >
              <div className="projectCardHead">
                <div className="projectCardIdentity">
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
                {isAdmin && (
                  <div className="projectCardActions">
                    <button
                      type="button"
                      className="projectEdit"
                      aria-label={`Edit ${p.name} description`}
                      title="Edit description"
                      onClick={(event) => {
                        event.stopPropagation();
                        setEditingProject(p);
                        setEditDescription(p.description || "");
                        setError("");
                      }}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      className="projectDelete"
                      aria-label={`Remove ${p.name}`}
                      title="Remove project"
                      disabled={deletingId === p._id}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDelete(p);
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </div>
              <h3>{p.name}</h3>
              <div className="projectCardDescription">
                <p>{cardDescription}</p>
                {isDescriptionLong && (
                  <button
                    type="button"
                    className="projectReadMore"
                    onClick={(event) => {
                      event.stopPropagation();
                      openProject(p._id);
                    }}
                  >
                    Read more
                  </button>
                )}
              </div>
              <div className="projectCardFoot">
                <span>
                  <Bug size={14} />
                  {open} open
                </span>
                <span>
                  <Users size={14} />
                  {memberKeys.size} members
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

