import { PRIORITY_LABELS, STATUS_LABELS } from "./constants";

export const initialsOf = (name = "") =>
  name.trim()
    ? name
        .trim()
        .split(/\s+/)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

export const statusLabel = (status) => STATUS_LABELS[status] || status;

export const priorityLabel = (priority) =>
  PRIORITY_LABELS[priority] ||
  (priority
    ? priority.charAt(0).toUpperCase() + priority.slice(1)
    : "Medium");

export function formatBug(ticket) {
  const priority = (ticket.priority || "medium").toLowerCase();
  const status = (ticket.status || "open").toLowerCase();
  const assignees = Array.isArray(ticket.assignees)
    ? ticket.assignees
    : ticket.assignee
      ? [ticket.assignee]
      : [];
  const assigneeNames = assignees.map((assignee) => assignee?.name || assignee).filter(Boolean);

  return {
    id: ticket._id
      ? ticket._id.substring(ticket._id.length - 6).toUpperCase()
      : "WZ-000000",
    rawId: ticket._id,
    title: ticket.title,
    desc: ticket.description,
    severity: priorityLabel(priority),
    priority,
    status,
    project: ticket.project?.name || "Unassigned project",
    projectId: ticket.project?._id || ticket.project || null,
    projectKey: ticket.project?.key || "",
    reporter: ticket.creator?.name || "System",
    reporterId: ticket.creator?._id || null,
    assignees,
    assignee: assigneeNames.length ? assigneeNames.join(", ") : "Unassigned",
    assigneeIds: assignees.map((assignee) => assignee?._id || assignee).filter(Boolean),
    assigneeId: assignees[0]?._id || assignees[0] || null,
    date: ticket.createdAt,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    comments: (ticket.comments || []).length,
    commentList: ticket.comments || [],
    history: ticket.history || [],
    hasScreenshot: !!ticket.screenshot || !!ticket.imageUrl,
    imageUrl: ticket.imageUrl || null,
    fixDescription: ticket.fixDescription || "",
    environment: ticket.environment,
    moduleFeatureName: ticket.moduleFeatureName,
    buildAppVersion: ticket.buildAppVersion,
    releaseVersion: ticket.releaseVersion,
    reproductionRate: ticket.reproductionRate,
    expectedResult: ticket.expectedResult,
    actualResult: ticket.actualResult,
    typeOfApplication: ticket.typeOfApplication,
    browser: ticket.browser,
    browserVersion: ticket.browserVersion,
  };
}

export function isAssignedToUser(bug, user) {
  if (!user) return false;
  const userId = user._id ? String(user._id) : "";
  const userEmail = user.email ? String(user.email).toLowerCase() : "";
  const userName = user.name ? String(user.name).trim() : "";

  if (userId && (bug.assigneeIds || []).some((id) => String(id) === userId)) {
    return true;
  }
  if (
    Array.isArray(bug.assignees) &&
    bug.assignees.some((assignee) => {
      const assigneeId = assignee?._id ? String(assignee._id) : "";
      const assigneeEmail = assignee?.email
        ? String(assignee.email).toLowerCase()
        : "";
      const assigneeName = assignee?.name ? String(assignee.name).trim() : "";
      return (
        (userId && assigneeId && assigneeId === userId) ||
        (userEmail && assigneeEmail && assigneeEmail === userEmail) ||
        (userName && assigneeName && assigneeName === userName)
      );
    })
  ) {
    return true;
  }

  const assigneeText = bug.assignee ? String(bug.assignee) : "";
  if (userName && assigneeText) {
    const names = assigneeText.split(",").map((name) => name.trim().toLowerCase());
    if (names.includes(userName.toLowerCase())) return true;
  }
  return Boolean(userEmail && assigneeText && assigneeText.toLowerCase().includes(userEmail));
}

export function buildTimeline(bug) {
  const historyItems = (bug.history || []).map((history) => ({
    kind: "history",
    type: history.type,
    message: history.message,
    actorName: history.actorName || "System",
    createdAt: history.createdAt,
  }));
  const commentItems = (bug.commentList || []).map((comment) => ({
    kind: "comment",
    message: comment.text,
    actorName: comment.authorName || "Unknown user",
    createdAt: comment.createdAt,
  }));
  return [...historyItems, ...commentItems].sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
  );
}
