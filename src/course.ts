// Content for the Help Center's loop diagram and course (#0063, #0066).
// Chapter prose lives in docs/learn/ so it reads on GitHub too; this module
// adds what the page needs around it.

const chapterDocs = import.meta.glob<string>('../docs/learn/[0-9]*.md', { query: '?raw', import: 'default', eager: true });

export const LOOP_STEPS = [
  {
    id: 'decide',
    who: 'human',
    chapter: 'grill',
    title: 'Decide',
    say: 'grill me on …',
    skill: 'grill-me',
    result: 'A shared understanding — no open questions left',
    detail: 'The agent interviews you one question at a time, each with its recommended answer, until the plan has no open branches.',
  },
  {
    id: 'plan',
    who: 'agent',
    chapter: 'prd',
    title: 'Plan',
    say: 'write a PRD for this',
    skill: 'to-prd',
    result: '.agents/projects/NN-slug/prd.md and wip.md',
    detail: 'The conversation becomes a contract — problem, solution, user stories, decisions, testing, out of scope — plus a journal for every session.',
  },
  {
    id: 'slice',
    who: 'agent',
    chapter: 'slices',
    title: 'Slice',
    say: 'break it into issues',
    skill: 'to-issues',
    result: '.agents/issues/NNNN-slug.md, one per slice',
    detail: 'Thin vertical slices that each cut through every layer, fit one session and can be checked on their own.',
  },
  {
    id: 'build',
    who: 'agent',
    chapter: 'loop',
    title: 'Build',
    say: 'implement #0012',
    skill: 'implement',
    result: 'Code, tests, a wip.md entry, updated specs',
    detail: 'One issue end to end: flip it to in-progress, build the slice, write down what happened.',
  },
  {
    id: 'verify',
    who: 'agent',
    chapter: 'feedback',
    title: 'Verify',
    say: 'nothing — the agent runs it',
    skill: 'implement',
    result: 'done — or in-review, assigned to you, with a ## Review note',
    detail: 'The verify command and the acceptance criteria decide. Work the agent can’t check itself waits for you.',
  },
  {
    id: 'steer',
    who: 'human',
    chapter: 'steer',
    title: 'Steer',
    say: 'work on the next todo',
    skill: 'triage',
    result: 'Answers, reviews and new priorities on the board',
    detail: 'You watch the board. Needs you lists what waits on you; answer, check, reorder — and the loop goes round again.',
  },
] as const;

export type LoopStep = (typeof LOOP_STEPS)[number];

// Explainer videos rendered by videos/ (#0064, #0065) into public/media/.
export const VIDEOS = ['memory', 'skills', 'grill', 'slices', 'loop', 'board'] as const;
export type VideoName = (typeof VIDEOS)[number];

export function videoSources(name: VideoName, theme: 'light' | 'dark'): { src: string; poster: string } {
  return { src: `/media/learn-${name}-${theme}.mp4`, poster: `/media/learn-${name}-${theme}.jpg` };
}

interface ChapterMeta {
  id: string;
  file: string;
  video?: VideoName;
  videoLabel?: string;
  say?: string;
  skill?: string;
}

const CHAPTER_META: ChapterMeta[] = [
  {
    id: 'memory',
    file: '01-memory.md',
    video: 'memory',
    videoLabel: 'Each session starts with an empty context window; the .agents folder and AGENTS.md persist between sessions.',
  },
  {
    id: 'skills',
    file: '02-skills.md',
    video: 'skills',
    videoLabel: 'You ask in plain words; the agent matches a skill description, loads that SKILL.md and writes the result.',
    say: 'write a PRD for this',
    skill: 'to-prd',
  },
  {
    id: 'grill',
    file: '03-grill.md',
    video: 'grill',
    videoLabel: 'The agent asks one question at a time with a recommended answer, resolving each branch of the plan.',
    say: 'grill me on …',
    skill: 'grill-me',
  },
  { id: 'prd', file: '04-prd.md', say: 'write a PRD for this', skill: 'to-prd' },
  {
    id: 'slices',
    file: '05-slices.md',
    video: 'slices',
    videoLabel: 'Horizontal layers deliver nothing until the end; vertical slices cut through every layer and work one by one.',
    say: 'break it into issues',
    skill: 'to-issues',
  },
  {
    id: 'loop',
    file: '06-loop.md',
    video: 'loop',
    videoLabel: 'An issue goes from todo to in-progress, is built and verified, then lands in done or in review for a human check.',
    say: 'implement #0012',
    skill: 'implement',
  },
  { id: 'feedback', file: '07-feedback.md', say: 'let’s do this test-first', skill: 'tdd' },
  {
    id: 'steer',
    file: '08-steer.md',
    video: 'board',
    videoLabel: 'Cards move across the board as the agent works; one needs a human check and shows up under Needs you.',
    say: 'work on the next todo',
    skill: 'implement',
  },
];

export interface Chapter extends ChapterMeta {
  number: number;
  title: string;
  markdown: string;
}

function readChapter(meta: ChapterMeta, index: number): Chapter {
  const raw = chapterDocs[`../docs/learn/${meta.file}`];
  if (raw === undefined) throw new Error(`missing docs/learn/${meta.file}`);
  const title = /^# (.+)$/m.exec(raw)?.[1] ?? meta.id;
  return { ...meta, number: index + 1, title, markdown: raw.replace(/^# .*\n+/, '') };
}

export const CHAPTERS: Chapter[] = CHAPTER_META.map(readChapter);

// Learn from the source (#0067): Matt Pocock's work these skills come from.
// Video ids are checked against YouTube's oEmbed (author "Matt Pocock")
// before they're listed; nothing loads from YouTube until a click.
export const SKILLS_REPO = 'https://github.com/mattpocock/skills';

export const SOURCE_VIDEOS = [
  {
    id: 'M6mYodf0dJM',
    title: 'mattpocock/skills: A complete AI Coding workflow, end-to-end',
    length: '17:17',
    about: 'The whole flow with the current skills: setup, grilling with docs, spec, tickets, implementation and review.',
  },
  {
    id: 'EJyuu6zlQCg',
    title: '5 Claude Code skills I use every single day',
    length: '16:42',
    about: 'grill-me, PRD, issues, tdd and improve-codebase-architecture — the planning-to-code loop this course follows.',
  },
  {
    id: 'Ah9p7v7nJWg',
    title: 'The 7 phases of AI-driven development',
    length: '8:26',
    about: 'Idea, research, prototype, PRD, planning, execution and QA — where each skill fits.',
  },
  {
    id: '6BB6exR8Zd8',
    title: 'I stopped using /grill-me for coding. Here’s what I use instead:',
    length: '15:16',
    about: 'grill-with-docs: grilling plus a shared language and decision records.',
  },
  {
    id: 'hYZdIwFIy-c',
    title: 'Red Green Refactor is OP With Claude Code',
    length: '5:19',
    about: 'Why the red-green-refactor loop suits coding agents so well.',
  },
  {
    id: 'hX7yG1KVYhI',
    title: 'Building a REAL feature with Claude Code: every step explained',
    length: '44:16',
    about: 'A real feature from brainstorm through autonomous implementation to QA.',
  },
] as const;

export const SOURCE_READING = [
  { title: 'AI Skills for Real Engineers', url: 'https://www.aihero.dev/skills', about: 'The hub for the skills, with a guide per skill' },
  { title: '5 Agent Skills I Use Every Day', url: 'https://www.aihero.dev/5-agent-skills-i-use-every-day', about: 'The core loop in one article' },
  { title: 'Tracer Bullets: Keeping AI Slop Under Control', url: 'https://www.aihero.dev/tracer-bullets', about: 'Why vertical slices' },
  { title: 'How To Make Codebases AI Agents Love', url: 'https://www.aihero.dev/how-to-make-codebases-ai-agents-love', about: 'Deep modules and codebase design for agents' },
  { title: 'AI Coding Dictionary', url: 'https://www.aihero.dev/ai-coding-dictionary', about: 'Smart zone, feedback loops and the other terms' },
] as const;
