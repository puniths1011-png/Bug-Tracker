import React, { useMemo, useState, useEffect } from "react";
import * as Icons from "lucide-react";
const {
  LayoutDashboard,
  Bug,
  Plus,
  Users,
  User,
  Settings,
  LogOut,
  Search,
  Bell,
  ChevronDown,
  ArrowUpRight,
  Clock3,
  CircleCheck,
  TriangleAlert,
  Filter,
  Download,
  Menu,
  X,
  ChevronRight,
  Paperclip,
  Send,
  CalendarDays,
  BarChart3,
  FolderKanban,
  Activity,
  ShieldCheck,
  Eye,
  EyeOff,
  Moon,
  Sun,
  UserCog,
  Mail,
  ClipboardList,
  RefreshCcw,
  FolderPlus,
  ArrowLeft,
} = Icons;
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx-js-style";
import { API, apiFetch, setToken } from "../config/api";
import { formatIST, formatISTLong, timeAgoIST, IST_TZ } from "../utils/date";
import {
  STATUS_LABELS,
  STATUS_VALUES,
  PRIORITY_LABELS,
  SEVERITY_TO_PRIORITY,
  SEVERITY_LABELS,
} from "../utils/constants";
import { Avatar, Logo, RoleBadge, Status } from "../components/Ui";
import {
  initialsOf,
  isAssignedToUser,
  statusLabel,
  buildTimeline,
  pdfText,
  severityLabel,
} from "../utils/formatters";
import BugTable from "../components/BugTable";
import Stats from "../components/Stats";

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
  const counts = Object.fromEntries(SEVERITY_LABELS.map((severity) => [severity, 0]));
  bugs.forEach((b) => {
    const severity = severityLabel(b.severity, b.priority);
    if (counts[severity] !== undefined) counts[severity]++;
  });
  const total = bugs.length || 1;
  const colors = {
    "Blocker(System Crash/Data Loss)": "#c94251",
    Critical: "#ff7d87",
    Major: "#f0a456",
    Minor: "#80aaff",
    Cosmetic: "#9b99a4",
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
          <p>Breakdown of all bugs by severity</p>
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
              {key === "Blocker(System Crash/Data Loss)" ? "Blocker" : key}
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

  const bugSummary = [
    ["Total Bugs", bugs.length],
    ["In Progress", bugs.filter((b) => b.status === "in_progress").length],
    ["Open Bugs", bugs.filter((b) => b.status === "open").length],
    [
      "Closed",
      bugs.filter((b) => b.status === "closed" || b.status === "resolved")
        .length,
    ],
  ];

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

    autoTable(doc, {
      head: [bugSummary.map(([label]) => label.toUpperCase())],
      body: [bugSummary.map(([, count]) => String(count))],
      startY: 31,
      theme: "grid",
      margin: { left: margin, right: margin },
      headStyles: {
        fillColor: [91, 70, 190],
        textColor: 255,
        fontStyle: "bold",
        fontSize: 8,
        halign: "center",
      },
      bodyStyles: {
        fontStyle: "bold",
        fontSize: 13,
        halign: "center",
        textColor: [35, 35, 45],
        cellPadding: 4,
      },
      alternateRowStyles: { fillColor: [245, 243, 252] },
    });

    const tableRows = reportRows.map((row) => row.map(pdfText));
    autoTable(doc, {
      head: [reportHeaders],
      body: tableRows,
      startY: doc.lastAutoTable.finalY + 8,
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
      const workbook = XLSX.utils.book_new();
      const summaryRow = bugSummary.flatMap(([label, count]) => [label, count]);
      const worksheet = XLSX.utils.aoa_to_sheet([
        ["BUG SUMMARY", "", "", "", "", "", "", ""],
        summaryRow,
        ["", "", "", "", "", "", "", ""],
        reportHeaders,
        ...reportRows,
      ]);
      worksheet["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: reportHeaders.length - 1 } },
      ];
      const headerStyle = {
        fill: { fgColor: { rgb: "5B46BE" } },
        font: { bold: true, color: { rgb: "FFFFFF" } },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border: {
          top: { style: "thin", color: { rgb: "40328C" } },
          bottom: { style: "thin", color: { rgb: "40328C" } },
          left: { style: "thin", color: { rgb: "40328C" } },
          right: { style: "thin", color: { rgb: "40328C" } },
        },
      };
      const dataStyle = (rowIndex) => ({
        fill: { fgColor: { rgb: rowIndex % 2 ? "F5F3FC" : "FFFFFF" } },
        alignment: { vertical: "top", wrapText: true },
        border: {
          top: { style: "thin", color: { rgb: "D9C9F2" } },
          bottom: { style: "thin", color: { rgb: "D9C9F2" } },
          left: { style: "thin", color: { rgb: "D9C9F2" } },
          right: { style: "thin", color: { rgb: "D9C9F2" } },
        },
      });

      worksheet["A1"].s = {
        fill: { fgColor: { rgb: "40328C" } },
        font: { bold: true, color: { rgb: "FFFFFF" }, sz: 14 },
      };
      bugSummary.forEach(([label], index) => {
        const labelCell = XLSX.utils.encode_cell({ r: 1, c: index * 2 });
        const valueCell = XLSX.utils.encode_cell({ r: 1, c: index * 2 + 1 });
        worksheet[labelCell].s = { font: { bold: true } };
        worksheet[valueCell].s = {
          font: { bold: true, sz: 14, color: { rgb: "40328C" } },
        };
      });
      reportHeaders.forEach((_, columnIndex) => {
        worksheet[XLSX.utils.encode_cell({ r: 3, c: columnIndex })].s =
          headerStyle;
        for (let rowIndex = 4; rowIndex < reportRows.length + 4; rowIndex += 1) {
          worksheet[XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex })].s =
            dataStyle(rowIndex - 3);
        }
      });
      worksheet["!cols"] = [
        { wch: 14 },
        { wch: 48 },
        { wch: 16 },
        { wch: 20 },
        { wch: 24 },
        { wch: 24 },
        { wch: 24 },
        { wch: 24 },
      ];
      worksheet["!autofilter"] = {
        ref: `A4:${XLSX.utils.encode_col(reportHeaders.length - 1)}${reportRows.length + 4}`,
      };
      XLSX.utils.book_append_sheet(workbook, worksheet, "Bug Report");
      XLSX.writeFile(workbook, "wizzybug_bugs_report.xlsx", {
        compression: true,
      });
      return;
    }

    const escapeCell = (value) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;
    const content = [
      ["BUG SUMMARY"],
      bugSummary.map(([label]) => label),
      bugSummary.map(([, count]) => count),
      [],
      reportHeaders,
      ...reportRows,
    ]
      .map((row) => row.map(escapeCell).join(","))
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
                  {format === "pdf"
                    ? "PDF"
                    : format === "excel"
                      ? "Excel"
                      : "CSV"}
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
