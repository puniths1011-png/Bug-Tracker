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
  const [exportFormat, setExportFormat] = useState("pdf");
  const [exportOpen, setExportOpen] = useState(false);

  const reportHeaders = [
    "BUG ID",
    "TITLE",
    "SEVERITY",
    "STATUS",
    "PROJECT",
    "REPORTER",
    "ASSIGNEE",
    "CREATED (IST)",
  ];

  const reportRows = bugs.map((b) => [
    b.id,
    b.title,
    b.severity,
    statusLabel(b.status),
    b.project,
    b.reporter,
    b.assignee,
    formatIST(b.createdAt),
  ]);

  const downloadBlob = (content, type, filename) => {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const center = pageWidth / 2;
    const margin = 14;

    doc.setFontSize(18);
    doc.setFont(undefined, "bold");
    doc.text("BUG REPORT", center, 16, { align: "center" });
    doc.setFont(undefined, "normal");
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(pdfText(`Generated ${formatIST(new Date())} IST`), center, 23, {
      align: "center",
    });

    const tableRows = reportRows.map((row) => row.map(pdfText));

    autoTable(doc, {
      head: [reportHeaders],
      body: tableRows,
      startY: 31,
      theme: "grid",
      margin: { left: margin, right: margin },
      headStyles: {
        fillColor: [91, 70, 190],
        textColor: 255,
        fontStyle: "bold",
        fontSize: 7,
        cellPadding: 2,
        halign: "center",
        valign: "middle",
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2.5,
        overflow: "linebreak",
        valign: "top",
      },
      alternateRowStyles: {
        fillColor: [245, 243, 252],
      },
      columnStyles: {
        0: { cellWidth: 14, halign: "center" },
        1: { cellWidth: 42 },
        2: { cellWidth: 24, halign: "center" },
        3: { cellWidth: 21, halign: "center" },
        4: { cellWidth: 21 },
        5: { cellWidth: 20 },
        6: { cellWidth: 20 },
        7: { cellWidth: 20, halign: "center" },
      },
    });

    const pageCount = doc.internal.getNumberOfPages();
    for (let page = 1; page <= pageCount; page += 1) {
      doc.setPage(page);
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(`WizzyBug | Page ${page} of ${pageCount}`, center, 290, {
        align: "center",
      });
    }

    doc.save("wizzybug_bugs_report.pdf");
  };

  const exportToDelimited = (format) => {
    if (format === "excel") {
      const escapeHtml = (value) =>
        String(value ?? "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/\r?\n/g, "<br>");
      const headerCells = reportHeaders
        .map((header) => `<th>${escapeHtml(header)}</th>`)
        .join("");
      const bodyRows = reportRows
        .map(
          (row) =>
            `<tr>${row.map((value) => `<td>${escapeHtml(value)}</td>`).join("")}</tr>`,
        )
        .join("");
      const columnWidths = ["90", "280", "120", "140", "150", "150", "150", "180"]
        .map((width) => `<col width="${width}">`)
        .join("");
      const workbook = `\uFEFF<html><head><meta charset="utf-8"><style>
        body { font-family: Arial, sans-serif; color: #2f241e; }
        h1 { color: #5532e5; font-size: 18px; }
        p { color: #735f54; }
        table { border-collapse: collapse; table-layout: fixed; }
        th { background: #5b46be; color: #ffffff; font-weight: bold; text-align: center; padding: 8px; border: 1px solid #40328c; }
        td { padding: 7px; border: 1px solid #d9c9f2; vertical-align: top; white-space: normal; word-wrap: break-word; }
        tr:nth-child(even) td { background: #f5f3fc; }
      </style></head><body>
        <h1>WizzyBug Bug Report</h1>
        <p>Generated ${escapeHtml(formatIST(new Date()))} IST</p>
        <table><colgroup>${columnWidths}</colgroup><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>
      </body></html>`;
      downloadBlob(workbook, "application/vnd.ms-excel", "wizzybug_bugs_report.xls");
      return;
    }

    const escapeCell = (value) => {
      const text = String(value ?? "")
        .replace(/[\r\n\t]+/g, " ")
        .replace(/"/g, '""');
      return `"${text}"`;
    };
  const delimiter = ",";
    const content = [reportHeaders, ...reportRows]
      .map((row) => row.map(escapeCell).join(delimiter))
      .join("\r\n");
    downloadBlob(`\uFEFF${content}`, "text/csv;charset=utf-8", "wizzybug_bugs_report.csv");
  };

  const exportReport = () => {
    if (exportFormat === "pdf") exportToPDF();
    else exportToDelimited(exportFormat);
  };

  const isAdmin = user?.role === "admin";

  return (
    <>
      <div className="welcome">
        <div>
          <h2>Hi, {user?.name || "there"}</h2>
          <p>Here's what's happening with your projects today.</p>
        </div>
        <div className="exportMenu">
          <button
            className="outline"
            onClick={() => setExportOpen((open) => !open)}
            aria-expanded={exportOpen}
            aria-haspopup="menu"
          >
            <Download size={17} />
            Download Report
            <ChevronDown size={16} />
          </button>
          {exportOpen && (
            <div className="exportOptions" role="menu">
              {["pdf", "excel", "csv"].map((format) => (
                <button
                  key={format}
                  role="menuitem"
                  className={exportFormat === format ? "selected" : ""}
                  onClick={() => {
                    setExportFormat(format);
                    setExportOpen(false);
                    if (format === "pdf") exportToPDF();
                    else exportToDelimited(format);
                  }}
                >
                  {format === "pdf" ? "PDF" : format === "excel" ? "Excel" : "CSV"}
                </button>
              ))}
            </div>
          )}
        </div>
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
        <BugTable bugs={bugs.slice(0, 5)} setSelected={setSelected} compact />
      </article>
    </>
  );
}

export default Dashboard;

