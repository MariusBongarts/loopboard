// Command palette entries (#0021) and their ranking — pure, unit-tested.
import type { Status } from './types';

export interface Command {
  id: string;
  title: string;
  group: string;
  hint?: string; // right-aligned: a shortcut or a count
  status?: Status; // shown as a status icon before the title
  keywords?: string;
  run: () => void;
}

const GROUP_ORDER = ['Selected issue', 'Actions', 'Views', 'Issues', 'Projects', 'Specs', 'Workspaces'];

// Every query word must appear; titles starting with the query and exact
// issue numbers rank first. Without a query, actions come before content.
export function rankCommands(commands: Command[], query: string, limit = 60): Command[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const groupRank = (c: Command) => {
    const i = GROUP_ORDER.indexOf(c.group);
    return i === -1 ? GROUP_ORDER.length : i;
  };
  if (!words.length) {
    return commands
      .filter((c) => c.group === 'Selected issue' || c.group === 'Actions' || c.group === 'Views' || c.group === 'Workspaces')
      .sort((a, b) => groupRank(a) - groupRank(b))
      .slice(0, limit);
  }
  const q = words.join(' ');
  const scored: { c: Command; score: number }[] = [];
  for (const c of commands) {
    const hay = `${c.title} ${c.keywords ?? ''}`.toLowerCase();
    if (!words.every((w) => hay.includes(w))) continue;
    const title = c.title.toLowerCase();
    let score = groupRank(c);
    if (title.startsWith(q) || title.startsWith(`#${q}`)) score -= 20;
    else if (title.split(/\s+/).some((t) => t.startsWith(words[0]))) score -= 10;
    scored.push({ c, score });
  }
  return scored.sort((a, b) => a.score - b.score).slice(0, limit).map((s) => s.c);
}
