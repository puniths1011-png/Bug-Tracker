import React from "react";
import { ArrowLeft, Bug, Users } from "lucide-react";

function ProjectDetailPage({ project, bugs, onBack }) {
  const projectBugs = bugs.filter(
    (bug) => String(bug.projectId) === String(project._id),
  );
  const openBugs = projectBugs.filter((bug) => bug.status !== "closed").length;
  const members = new Set(
    (project.members || [])
      .map((member) => member?._id || member)
      .filter(Boolean)
      .map(String),
  );

  return (
    <section className="projectDetailPage">
      <button className="backButton" type="button" onClick={onBack}>
        <ArrowLeft size={17} />
        Back to projects
      </button>
      <div className="projectDetailHeader">
        <div>
          <span className="projectKey">
            {project.key || project.name.slice(0, 3).toUpperCase()}
          </span>
          <h2>{project.name}</h2>
          <p>{project.description || "No description yet."}</p>
        </div>
        <span className="status open">
          <i />
          {project.status || "active"}
        </span>
      </div>
      <div className="projectDetailStats">
        <span>
          <Bug size={16} />
          {openBugs} open bugs
        </span>
        <span>
          <Users size={16} />
          {members.size} members
        </span>
      </div>
    </section>
  );
}

export default ProjectDetailPage;
