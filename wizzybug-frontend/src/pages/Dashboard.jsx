import React, { useMemo, useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
const {LayoutDashboard,Bug,Plus,Users,User,Settings,LogOut,Search,Bell,ChevronDown,ArrowUpRight,Clock3,CircleCheck,TriangleAlert,Filter,Download,Menu,X,ChevronRight,Paperclip,Send,CalendarDays,BarChart3,FolderKanban,Activity,ShieldCheck,Eye,EyeOff,Moon,Sun,UserCog,Mail,ClipboardList,RefreshCcw,FolderPlus,ArrowLeft} = Icons;
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { API, apiFetch, setToken } from '../config/api';
import { formatIST, formatISTLong, timeAgoIST, IST_TZ } from '../utils/date';
import { STATUS_LABELS, STATUS_VALUES, PRIORITY_LABELS, SEVERITY_TO_PRIORITY } from '../utils/constants';
import { Avatar, Logo, RoleBadge, Status } from '../components/Ui';
import { initialsOf, isAssignedToUser, priorityLabel, statusLabel, buildTimeline, pdfText } from '../utils/formatters';
import BugTable from '../components/BugTable';
import Stats from '../components/Stats';

function Trend({ bugs = [] }) {
  const days = useMemo(() => {
    const arr = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      arr.push(d);
    }
    return arr;
  }, [bugs]);

  const counts = days.map(
    (d) =>
      bugs.filter((b) => {
        const bd = new Date(b.createdAt);
        return bd.toDateString() === d.toDateString();
      }).length,
  );

  const max = Math.max(1, ...counts);
  const points = counts
    .map((c, i) => {
      const x = (i / (counts.length - 1)) * 100;
      const y = 100 - (c / max) * 90;
      return `${x},${y}`;
    })
    .join(" ");
  const areaPoints = `0,100 ${points} 100,100`;

  return (
    <article className="panel chartCard">
      <div className="panelHead">
        <div>
          <h3>Bug Trend</h3>
          <p>New bugs reported over the last 7 days</p>
        </div>
      </div>
      <div className="chart">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="yaxis">
          <polyline className="area" points={areaPoints} />
          <polyline className="line" points={points} />
        </svg>
        <div className="months">
          {days.map((d, i) => (
            <span key={i}>
              {d.toLocaleDateString("en-IN", {
                timeZone: IST_TZ,
                weekday: "short",
              })}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}

// Severity distribution donut, using the same pre-built .donut CSS.

function Distribution({ bugs = [] }) {
  const counts = { critical: 0, high: 0, medium: 0, low: 0, cosmetic: 0 };
  bugs.forEach((b) => {
    if (counts[b.priority] !== undefined) counts[b.priority]++;
  });
  const total = bugs.length || 1;
  const colors = {
    critical: "#ff7d87",
    high: "#f0a456",
    medium: "#80aaff",
    low: "#9b99a4",
    cosmetic: "#9b99a4",
  };

  let cumulative = 0;
  const segments = Object.entries(counts).map(([key, count]) => {
    const pct = count / total;
    const start = cumulative;
    cumulative += pct;
    return {
      key,
      count,
      start: start * 360,
      end: cumulative * 360,
      color: colors[key],
    };
  });

  const gradient = segments
    .map((s) => `${s.color} ${s.start}deg ${s.end}deg`)
    .join(", ");

  return (
    <article className="panel chartCard">
      <div className="panelHead">
        <div>
          <h3>Severity Distribution</h3>
          <p>Breakdown of open work by severity</p>
        </div>
      </div>
      <div className="donutWrap">
        <div
          className="donut"
          style={{
            background: bugs.length
              ? `conic-gradient(${gradient})`
              : "var(--border)",
          }}
        >
          <div className="donutHole">
            <strong>{bugs.length}</strong>
            <small>Total</small>
          </div>
        </div>
        <ul className="distLegend">
          {Object.entries(counts).map(([key, count]) => (
            <li key={key}>
              <span style={{ background: colors[key] }} />
              {priorityLabel(key)}
              <b>{count}</b>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

function Dashboard({ bugs, setSelected, setPage, user }) {
  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text(pdfText("WizzyBug - Bug Report"), 14, 15);
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(pdfText(`Generated ${formatIST(new Date())} IST`), 14, 21);

    const tableColumn = [
      "BUG ID",
      "TITLE",
      "SEVERITY",
      "STATUS",
      "PROJECT",
      "ASSIGNEE",
      "CREATED (IST)",
    ];
    const tableRows = bugs.map((b) => [
      pdfText(b.id),
      pdfText(b.title),
      pdfText(b.severity),
      pdfText(statusLabel(b.status)),
      pdfText(b.project),
      pdfText(b.assignee),
      pdfText(formatIST(b.createdAt)),
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 26,
      margin: { left: 14, right: 14 },
      styles: { fontSize: 8, cellPadding: 3, overflow: "linebreak" },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 42 },
        2: { cellWidth: 23 },
        3: { cellWidth: 23 },
        4: { cellWidth: 28 },
        5: { cellWidth: 30 },
        6: { cellWidth: 28 },
      },
    });

    doc.save("wizzybug_bugs_report.pdf");
  };

  const isAdmin = user?.role === "admin";

  return (
    <>
      <div className="welcome">
        <div>
          <h2>Hi, {user?.name || "there"}</h2>
          <p>Here's what's happening with your projects today.</p>
        </div>
        <button className="outline" onClick={exportToPDF}>
          <Download size={17} />
          Download Report
        </button>
      </div>
      <Stats bugs={bugs} admin={isAdmin} user={user} />
      <div className="analytics">
        <Trend bugs={bugs} />
        <Distribution bugs={bugs} />
      </div>
      <article className="panel recent">
        <div className="panelHead">
          <div>
            <h3>Recent Bugs</h3>
            <p>Latest issues reported across all projects</p>
          </div>
          <button className="link" onClick={() => setPage("bugs")}>
            View all Bugs <ChevronRight size={16} />
          </button>
        </div>
        <BugTable bugs={bugs.slice(0, 5)} setSelected={setSelected} />
      </article>
    </>
  );
}

export default Dashboard;

