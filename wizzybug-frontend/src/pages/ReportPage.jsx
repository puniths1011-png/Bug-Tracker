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

function ReportPage({ addBug, setPage, projects = [], users = [], user }) {
  const [form, setForm] = useState({
    technicalMemberName: user?.name || "",
    project: projects[0]?._id || "",
    assignee: "",
    assignees: [],
    moduleFeatureName: "",
    environment: "",
    buildAppVersion: "",
    releaseVersion: "",
    defectSummary: "",
    stepsToReproduce: "",
    defectType: "",
    severity: "Blocker(System Crash/Data Loss)",
    priority: "P1-Immediate Fix",
    reproductionRate: "100%",
    expectedResult: "",
    actualResult: "",
    typeOfApplication: "",
    browser: "Chrome",
    browserVersion: "",
  });
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const compressImageUpload = async (selectedFile) => {
    if (!selectedFile || !selectedFile.type?.startsWith("image/")) {
      return null;
    }

    const reader = new FileReader();
    const dataUrl = await new Promise((resolve, reject) => {
      reader.onload = () => resolve(reader.result);
      reader.onerror = () =>
        reject(new Error("Could not read the selected image."));
      reader.readAsDataURL(selectedFile);
    });

    const image = new Image();
    const img = await new Promise((resolve, reject) => {
      image.onload = () => resolve(image);
      image.onerror = () =>
        reject(new Error("The selected image could not be loaded."));
      image.src = dataUrl;
    });

    const maxDimension = 1280;
    let width = img.width;
    let height = img.height;

    if (width > height && width > maxDimension) {
      height = (height * maxDimension) / width;
      width = maxDimension;
    } else if (height > maxDimension) {
      width = (width * maxDimension) / height;
      height = maxDimension;
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width);
    canvas.height = Math.round(height);

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not prepare the image for upload.");

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const mimeType =
      selectedFile.type === "image/png" || selectedFile.type === "image/webp"
        ? "image/jpeg"
        : selectedFile.type;
    const quality = selectedFile.size > 1024 * 1024 ? 0.72 : 0.82;
    const compressedDataUrl = canvas.toDataURL(mimeType, quality);

    return {
      base64: compressedDataUrl.split(",")[1],
      mimeType,
    };
  };

  // Keep the project dropdown pointed at a real project once the list loads.
  useEffect(() => {
    if (!form.project && projects.length)
      setForm((f) => ({ ...f, project: projects[0]._id }));
  }, [projects]);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });
  const isAdmin = user?.role === "admin";

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.defectSummary) return;
    if (!form.project) {
      setError("Select a project before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      let imageFile = file;
      if (file) {
        const compressed = await compressImageUpload(file);
        if (compressed) {
          const byteCharacters = atob(compressed.base64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i += 1) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          imageFile = new File([byteArray], file.name, { type: compressed.mimeType });
        }
      }

      await addBug({
        title: form.defectSummary,
        desc: form.stepsToReproduce,
        severity: form.severity,
        project: form.project,
        assignee: form.assignee || undefined,
        assignees: form.assignees.length ? form.assignees : undefined,
        file: imageFile,
        environment: form.environment,
        moduleFeatureName: form.moduleFeatureName,
        buildAppVersion: form.buildAppVersion,
        releaseVersion: form.releaseVersion,
        reproductionRate: form.reproductionRate,
        expectedResult: form.expectedResult,
        actualResult: form.actualResult,
        typeOfApplication: form.typeOfApplication,
        browser: form.browser,
        browserVersion: form.browserVersion,
      });
      setPage("bugs");
    } catch (err) {
      console.error("Error submitting bug:", err);
      setError(err.message || "Could not submit Bug. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="formPage">
      <div className="pageIntro">
        <div>
          <h2>Report a Bug</h2>
          <p>
            Give your team the context they need to reproduce and resolve the
            issue.
          </p>
        </div>
      </div>
      <form className="panel reportForm" onSubmit={submit}>
        <div className="sectionTitle">
          <span>1</span>
          <div>
            <h3>Issue Details</h3>
            <p>Describe what went wrong and where it happened.</p>
          </div>
        </div>

        {error && <div className="formError">{error}</div>}

        <label>
          Technical Member Name<b>*</b>
          <input
            name="technicalMemberName"
            value={form.technicalMemberName}
            onChange={handleChange}
            placeholder="your Answer"
            required
          />
        </label>
        <label>
          Project Name <b>*</b>
          {projects.length === 0 ? (
            <div className="muted" style={{ padding: "10px 0" }}>
              No projects yet -{" "}
              {isAdmin ? (
                <>
                  create one from the{" "}
                  <a
                    onClick={() => setPage("projects")}
                    style={{ cursor: "pointer", color: "var(--purple2)" }}
                  >
                    Projects Page
                  </a>{" "}
                  first.
                </>
              ) : (
                "ask an admin to create one first."
              )}
            </div>
          ) : (
            <select
              name="project"
              value={form.project}
              onChange={handleChange}
              required
            >
              {projects.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                  {p.key ? ` (${p.key})` : ""}
                </option>
              ))}
            </select>
          )}
        </label>

        {isAdmin && (
          <label>
            Assign to (optional)
            <select
              multiple
              value={form.assignees}
              onChange={(e) =>
                setForm({
                  ...form,
                  assignees: Array.from(
                    e.target.selectedOptions,
                    (opt) => opt.value,
                  ),
                })
              }
              style={{ minHeight: "110px" }}
            >
              <option value="">Leave unassigned</option>
              {users
                .filter((u) => u.role === "developer")
                .map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name}
                  </option>
                ))}
            </select>
            <small className="muted">
              Hold Ctrl/Cmd to select multiple developers.
            </small>
          </label>
        )}

        <label>
          Module / Feature Name<b>*</b>
          <input
            name="moduleFeatureName"
            value={form.moduleFeatureName}
            onChange={handleChange}
            placeholder="your Answer"
            required
          />
        </label>

        <label>
          Environment <b>*</b>
        </label>
        <div className="radioGroup">
          {["Development", "QA", "UAT", "Staging", "Production"].map((env) => (
            <label
              key={env}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                margin: 0,
                fontWeight: "normal",
              }}
            >
              <input
                type="radio"
                name="environment"
                value={env}
                checked={form.environment === env}
                onChange={handleChange}
                required
              />{" "}
              {env}
            </label>
          ))}
        </div>
        <br />

        <label>
          Build or App Version (Optional)
          <input
            name="buildAppVersion"
            value={form.buildAppVersion}
            onChange={handleChange}
            placeholder="your Answer"
          />
        </label>

        <label>
          Release Version (Optional)
          <input
            name="releaseVersion"
            value={form.releaseVersion}
            onChange={handleChange}
            placeholder="your Answer"
          />
        </label>

        <label>
          Defect Summary<b>*</b>
          <input
            name="defectSummary"
            value={form.defectSummary}
            onChange={handleChange}
            placeholder="your Answer"
            required
          />
        </label>

        <label>
          Steps to Reproduce (Write Point Wise with 1 Numbering)<b>*</b>
          <input
            name="stepsToReproduce"
            value={form.stepsToReproduce}
            onChange={handleChange}
            placeholder="your Answer"
            required
          />
        </label>

        <label>
          Defect Type <b>*</b>
        </label>
        <div className="radioGroup">
          {[
            "Functional",
            "UI/UX",
            "Performance",
            "Security",
            "Integration",
            "Data Validation",
            "Accessibility",
            "API",
            "Mobile",
            "Database",
            "Regression",
            "Enhancement Request",
            "Other",
          ].map((type) => (
            <label
              key={type}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                margin: 0,
                fontWeight: "normal",
              }}
            >
              <input
                type="radio"
                name="defectType"
                value={type}
                checked={form.defectType === type}
                onChange={handleChange}
                required
              />{" "}
              {type}
            </label>
          ))}
        </div>
        <br />

        <div className="twoCol">
          <label>
            Severity <b>*</b>
            <select
              name="severity"
              value={form.severity}
              onChange={handleChange}
            >
              <option>Blocker(System Crash/Data Loss)</option>
              <option>Critical</option>
              <option>Major</option>
              <option>Minor</option>
              <option>Cosmetic</option>
            </select>
          </label>
          <label>
            Priority<b>*</b>
            <select
              name="priority"
              value={form.priority}
              onChange={handleChange}
            >
              <option>P1-Immediate Fix</option>
              <option>P2-High</option>
              <option>P3-Medium</option>
              <option>P4-Low</option>
            </select>
          </label>
        </div>

        <div className="twoCol">
          <label>
            Reproduction Rate<b>*</b>
            <select
              name="reproductionRate"
              value={form.reproductionRate}
              onChange={handleChange}
            >
              <option>100%</option>
              <option>75%</option>
              <option>50%</option>
              <option>25%</option>
              <option>Random</option>
            </select>
          </label>
        </div>

        <label>
          Expected Result<b>*</b>
          <input
            name="expectedResult"
            value={form.expectedResult}
            onChange={handleChange}
            placeholder="your Answer"
            required
          />
        </label>
        <label>
          Actual Result<b>*</b>
          <input
            name="actualResult"
            value={form.actualResult}
            onChange={handleChange}
            placeholder="your Answer"
            required
          />
        </label>

        <div className="sectionTitle second">
          <span>2</span>
          <div>
            <h3>Attachments</h3>
            <p>Add screenshots or files that help explain the issue.</p>
          </div>
        </div>
        <label className="drop">
          <Paperclip />
          <strong>
            {file ? (
              file.name
            ) : (
              <>
                Drop files here or <u>browse</u>
              </>
            )}
          </strong>
          <small>PNG, JPG, GIF or MP4 - Max 10MB</small>
          <input type="file" onChange={(e) => setFile(e.target.files[0])} />
        </label>

        <label>
          Type of Application <b>*</b>
        </label>
        <div className="radioGroup">
          {["Web Application", "Mobile App", "Mobile Browser"].map((type) => (
            <label
              key={type}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                margin: 0,
                fontWeight: "normal",
              }}
            >
              <input
                type="radio"
                name="typeOfApplication"
                value={type}
                checked={form.typeOfApplication === type}
                onChange={handleChange}
                required
              />{" "}
              {type}
            </label>
          ))}
        </div>
        <br />

        <div className="twoCol">
          <label>
            Browser (Configuration Information)<b>*</b>
            <select name="browser" value={form.browser} onChange={handleChange}>
              <option>Chrome</option>
              <option>Firefox</option>
              <option>Safari</option>
              <option>Edge</option>
              <option>Other</option>
            </select>
          </label>
        </div>

        <label>
          Browser Version<b>*</b>
          <input
            name="browserVersion"
            value={form.browserVersion}
            onChange={handleChange}
            placeholder="your Answer"
            required
          />
        </label>

        <div className="formActions">
          <button
            type="button"
            className="outline"
            onClick={() => setPage("bugs")}
          >
            Cancel
          </button>
          <button className="primary" disabled={submitting}>
            <Bug size={17} />
            {submitting ? "Submitting..." : "Submit Bug"}
          </button>
        </div>
      </form>
    </div>
  );
}

// Turns backend history + comment entries into one merged, time-sorted feed.

export default ReportPage;

