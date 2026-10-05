import { describe, expect, it } from 'vitest';
import { buildRelations } from '../src/relations';
import type { Issue } from '../src/types';

const issue = (id: string, over: Partial<Issue> = {}): Issue => ({
  id,
  filename: `${id}-x.md`,
  archived: false,
  title: id,
  category: 'task',
  status: 'todo',
  assignee: 'agent',
  labels: [],
  body: '',
  ...over,
});

describe('buildRelations', () => {
  const parent = issue('0001', { status: 'in-progress' });
  const child = issue('0002', { parent: '0001' });
  const doneChild = issue('0003', { parent: '0001', status: 'done' });
  const orphan = issue('0004', { parent: '0099' });
  const rel = buildRelations([parent, child, doneChild, orphan]);

  it('finds parents, children and missing parents', () => {
    expect(rel.parentOf(child)).toBe(parent);
    expect(rel.parentOf(orphan)).toBe('missing');
    expect(rel.parentOf(parent)).toBeNull();
    expect(rel.childrenOf(parent).map((i) => i.id)).toEqual(['0002', '0003']);
  });

  it('marks open issues whose parent is not done as waiting', () => {
    expect(rel.isWaiting(child)).toBe(true);
    expect(rel.isWaiting(doneChild)).toBe(false);
    expect(rel.isWaiting(orphan)).toBe(true);
    expect(buildRelations([{ ...parent, status: 'done' }, child]).isWaiting(child)).toBe(false);
  });

  it('counts an archived done parent as done', () => {
    const archived = issue('0001', { archived: true, status: 'done' });
    expect(buildRelations([archived, child]).isWaiting(child)).toBe(false);
  });
});
