import setupPrompt from '../docs/setup-prompt.md?raw';
import upgradePromptDoc from '../docs/upgrade-prompt.md?raw';
import { CHAPTERS } from './course';

// The Help Center's pages and prompts (#0060, #0061). The prompts are the
// same files the README quotes, so the two can't drift.

export const SETUP_PROMPT = setupPrompt.trimEnd();
export const UPGRADE_REQUEST = 'upgrade my loopboard harness';
export const UPGRADE_PATH_PLACEHOLDER = '<path-to-loopboard>';

export function upgradePrompt(packagePath?: string): string {
  const text = upgradePromptDoc.trimEnd();
  return packagePath ? text.replaceAll(UPGRADE_PATH_PLACEHOLDER, packagePath) : text;
}

export const HELP_PAGES = [
  { id: 'overview', path: '/help', title: 'Overview', blurb: 'The loop at a glance' },
  { id: 'learn', path: '/help/learn', title: 'Working with AI agents', blurb: 'Why the workflow works, chapter by chapter, with short videos' },
  { id: 'setup', path: '/help/setup', title: 'Set up a repo', blurb: 'One prompt for your agent, and what it creates' },
  { id: 'upgrade', path: '/help/upgrade', title: 'Upgrade a harness', blurb: 'Bring older repos up to the latest conventions' },
  { id: 'reference', path: '/help/reference', title: 'Reference', blurb: 'The loop, folders, statuses, routines and keyboard shortcuts' },
] as const;

export type HelpPageId = (typeof HELP_PAGES)[number]['id'];

export interface HelpSection {
  id: string;
  title: string;
}

// In-page sections, listed under the active page in the Help sidebar.
export const HELP_SECTIONS: Partial<Record<HelpPageId, HelpSection[]>> = {
  learn: [...CHAPTERS.map((c) => ({ id: c.id, title: c.title })), { id: 'sources', title: 'Learn from the source' }],
  reference: [
    { id: 'loop', title: 'The loop' },
    { id: 'folders', title: 'What lives where' },
    { id: 'statuses', title: 'Statuses and fields' },
    { id: 'routines', title: 'Routines' },
    { id: 'shortcuts', title: 'Keyboard shortcuts' },
  ],
};

// Every Help link keeps `?from=` so "Back to the board" knows where to go.
export function helpLink(path: string, from: unknown, hash?: string) {
  return { path, query: typeof from === 'string' && from ? { from } : {}, hash: hash ? `#${hash}` : '' };
}
