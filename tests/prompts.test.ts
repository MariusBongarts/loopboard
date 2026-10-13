import { describe, expect, it } from 'vitest';
import { issuePrompt, projectPrompt, skippedPrompt } from '../src/prompts';
import type { Issue, Project } from '../src/types';

const issue = (over: Partial<Issue> = {}): Issue => ({
  id: '0012',
  filename: '0012-x.md',
  archived: false,
  title: 'X',
  category: 'task',
  status: 'todo',
  assignee: 'agent',
  labels: [],
  body: '',
  ...over,
});

const project = (over: Partial<Project> = {}): Project =>
  ({
    slug: '03-export',
    title: 'Export',
    status: 'active',
    prdPath: '',
    wipPath: '',
    prdBody: '# Export — PRD\n\n## Problem statement\n\nUsers can’t export.',
    wipBody: '',
    focus: '',
    problem: '',
    solution: '',
    sessions: [],
    ...over,
  }) as Project;

describe('issuePrompt', () => {
  it('implements a ready issue', () => {
    expect(issuePrompt(issue())).toBe('Use the implement skill on #0012.');
  });
  it('resumes after answered questions', () => {
    expect(issuePrompt(issue({ assignee: 'human', body: '## Questions\n\n1. Which?' }))).toMatch(/I answered the questions in #0012/);
  });
  it('walks the human through a review', () => {
    expect(issuePrompt(issue({ status: 'in-review', assignee: 'human' }))).toMatch(/^Walk me through reviewing #0012/);
  });
  it('sharpens a backlog idea', () => {
    expect(issuePrompt(issue({ status: 'backlog' }))).toMatch(/backlog idea #0012/);
  });
});

describe('projectPrompt', () => {
  it('asks for a PRD while it is still the template', () => {
    expect(projectPrompt(project({ prdBody: '# {Project Title} — PRD' }), [])).toMatch(/^Write the PRD for project 03-export/);
  });
  it('slices a PRD without issues', () => {
    expect(projectPrompt(project(), [])).toBe('Run the to-issues skill on project 03-export.');
  });
  it('continues a project with issues', () => {
    expect(projectPrompt(project(), [issue({ project: '03-export' })])).toMatch(/^Continue project 03-export/);
  });
});

describe('skippedPrompt', () => {
  it('lists every skipped file with its reason, as the repo sees it', () => {
    const prompt = skippedPrompt(
      [
        { file: 'issues/0002-Tax-Return.md', reason: 'name must be NNNN-slug.md' },
        { file: 'projects/Offline-Mode', reason: 'folder must be named NN-slug' },
      ],
      'ai',
    );
    expect(prompt).toMatch(/^loopboard can't show these files\. Fix each one/);
    expect(prompt).toContain('`npx loopboard check`');
    expect(prompt).toContain('\n\n- ai/issues/0002-Tax-Return.md — name must be NNNN-slug.md\n- ai/projects/Offline-Mode — folder must be named NN-slug');
  });
});
