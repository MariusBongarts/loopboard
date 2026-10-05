import type { Issue, Project } from './types';

// "Copy agent prompt" (#0022): the right skill invocation for an issue or
// project, so handing work to an agent is one paste.

const PRD_TEMPLATE_MARKERS = ['{Project Title}', 'The problem the user (or the system) is facing'];

function hasSection(body: string, heading: string): boolean {
  return new RegExp(`^##\\s+${heading}\\b`, 'im').test(body);
}

export function issuePrompt(issue: Issue): string {
  const ref = `#${issue.id}`;
  if (issue.status === 'in-review' && issue.assignee === 'human') {
    return `Walk me through reviewing ${ref}: what its ## Review section asks me to check, and how to check it.`;
  }
  if (issue.assignee === 'human' && hasSection(issue.body, 'Questions')) {
    return `I answered the questions in ${ref}. Read its ## Questions section, flip it back to assignee: agent, and continue with the implement skill.`;
  }
  if (issue.status === 'backlog') {
    return `Look at backlog idea ${ref}: sharpen it into a ready issue (acceptance criteria, out of scope) and move it to todo with the triage skill — ask me if anything is unclear.`;
  }
  return `Use the implement skill on ${ref}.`;
}

export function projectPrompt(project: Project, issues: Issue[]): string {
  const prdIsTemplate = !project.prdBody.trim() || PRD_TEMPLATE_MARKERS.some((m) => project.prdBody.includes(m));
  if (prdIsTemplate) {
    return `Write the PRD for project ${project.slug} with the to-prd skill. Grill me first if the plan isn't clear.`;
  }
  const own = issues.filter((i) => i.project === project.slug && !i.archived);
  if (own.length === 0) {
    return `Run the to-issues skill on project ${project.slug}.`;
  }
  return `Continue project ${project.slug}: read wip.md "Current focus" and implement the next todo issue.`;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
