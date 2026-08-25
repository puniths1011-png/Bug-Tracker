import React, { useMemo, useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
const {LayoutDashboard,Bug,Plus,Users,User,Settings,LogOut,Search,Bell,ChevronDown,ArrowUpRight,Clock3,CircleCheck,TriangleAlert,Filter,Download,Menu,X,ChevronRight,Paperclip,Send,CalendarDays,BarChart3,FolderKanban,Activity,ShieldCheck,Eye,EyeOff,Moon,Sun,UserCog,Mail,ClipboardList,RefreshCcw,FolderPlus,ArrowLeft} = Icons;
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { API, apiFetch, setToken } from '../config/api';
import { formatIST, formatISTLong, timeAgoIST, IST_TZ } from '../utils/date';
import { STATUS_LABELS, STATUS_VALUES, PRIORITY_LABELS, SEVERITY_TO_PRIORITY } from '../utils/constants';
import { Avatar, Logo, RoleBadge, Status } from '../components/Ui';
import { initialsOf, isAssignedToUser, priorityLabel, statusLabel } from '../utils/formatters';

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
    doc.text(`WizzyBug Â· ${bug.id}`, 14, 16);
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
        ["Environment", bug.environment || "â€”"],
        ["Module / Feature", bug.moduleFeatureName || "â€”"],
        [
          "Browser",
          [bug.browser, bug.browserVersion].filter(Boolean).join(" ") || "â€”",
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
        â† Back to All Bugs
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
                {bug.assignee === "Unassigned" ? "Assignâ€¦" : "Reassignâ€¦"}
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
            {savingFix ? "Saving..." : savedFix ? "âœ“ Saved!" : "Save Changes"}
          </button>
        </aside>
      </div>
    </>
  );
}

export default Detail;

