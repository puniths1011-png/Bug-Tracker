export const STATUS_LABELS = {
  open: "Open / New",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
  rejected: "Rejected",
  deferred: "Deferred",
  not_reproducible: "Not Reproducible",
};

export const STATUS_VALUES = Object.keys(STATUS_LABELS);

export const PRIORITY_LABELS = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const SEVERITY_TO_PRIORITY = {
  "Blocker(System Crash/Data Loss)": "critical",
  Critical: "critical",
  Major: "high",
  Minor: "medium",
  Cosmetic: "low",
};
