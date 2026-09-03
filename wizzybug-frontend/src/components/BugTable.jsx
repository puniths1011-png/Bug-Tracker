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

function BugTable({ bugs, setSelected, compact = false }) {
  return (
    <div className="tableWrap">
      <table>
        <thead>
          <tr>
            <th>BUG</th>
            <th>SEVERITY</th>
            <th>STATUS</th>
            <th>ASSIGNEE</th>
            <th>CREATED (IST)</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {bugs.map((b) => (
            <tr
              key={b.id}
              onClick={() => setSelected(b)}
              style={{ cursor: "pointer" }}
            >
              <td>
                <b>{b.title}</b>
                <small>
                  {b.id} - {b.project}
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
                    <Avatar text={initialsOf(b.assignee.split(",")[0])} small />
                    {b.assignee}
                  </span>
                )}
              </td>
              <td className="date">{formatIST(b.createdAt)}</td>
              <td />
            </tr>
          ))}
          {bugs.length === 0 && (
            <tr>
              <td
                colSpan={6}
                className="muted"
                style={{ textAlign: "center", padding: "30px 0" }}
              >
                No bugs to show.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default BugTable;

