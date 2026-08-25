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
                      {b.id} Â· {b.project}
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
                    No developers yet â€” invite one from User Management.
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

export default AssignBugsPage;

