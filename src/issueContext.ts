import { Box, CheckCheck, Copy, Link, Maximize2, PanelRight, SquareArrowOutUpRight, Tag, TerminalSquare } from '@lucide/vue';
import { useIssueActions } from './actions';
import { EDITOR_LABEL, editorChoice, issueEditorUrl } from './editor';
import { assigneeItems, labelItems, projectItems, statusItems, type IssueMenuContext } from './issueMenus';
import { openMenu, type MenuEntry } from './menu';
import { copyWithToast } from './prompts';
import { relativePath, type Issue } from './types';
import { useWorkspace } from './workspace';

// The right-click menu for an issue (#0055) on cards, list rows and feed rows.
export function useIssueContextMenu(): { open(e: MouseEvent, issue: Issue): void; onKeydown(e: KeyboardEvent, issue: Issue): void } {
  const { id: workspaceId, issues, projects, root, rootName } = useWorkspace();
  const actions = useIssueActions();
  const live = (issue: Issue) => issues.value.find((i) => i.id === issue.id && i.archived === issue.archived) ?? issue;
  const ctx: IssueMenuContext = {
    get issues() {
      return issues.value;
    },
    get projects() {
      return projects.value;
    },
    update: (issue, edit) => actions.updateIssue(issue, edit),
  };

  function entries(issue: Issue): MenuEntry[] {
    const list: MenuEntry[] = [];
    if (!issue.archived) {
      list.push(
        { id: 'status', label: 'Status', status: issue.status, children: () => statusItems(live(issue), ctx) },
        { id: 'assignee', label: 'Assignee', assignee: issue.assignee, children: () => assigneeItems(live(issue), ctx) },
        { id: 'labels', label: 'Labels', icon: Tag, children: () => labelItems(live(issue), ctx) },
        { id: 'project', label: 'Project', icon: Box, children: () => projectItems(live(issue), ctx) },
        'separator',
      );
    }
    list.push(
      { id: 'open', label: 'Open', icon: PanelRight, run: () => actions.openIssue(issue) },
      { id: 'open-page', label: 'Open as page', icon: Maximize2, run: () => actions.openPage(issue) },
    );
    const href = issueEditorUrl(editorChoice.value, root.value, issue);
    if (href) list.push({ id: 'editor', label: `Open in ${EDITOR_LABEL[editorChoice.value]}`, icon: SquareArrowOutUpRight, run: () => (window.location.href = href) });
    list.push('separator');
    if (!issue.archived) list.push({ id: 'prompt', label: 'Copy agent prompt', icon: TerminalSquare, run: () => actions.copyIssuePrompt(issue) });
    const link = `${window.location.origin}/w/${workspaceId.value}/issues/${issue.id}${issue.archived ? '?archived=1' : ''}`;
    list.push(
      { id: 'path', label: 'Copy path', icon: Copy, run: () => void copyWithToast(relativePath(issue, rootName.value), 'Path copied') },
      { id: 'link', label: 'Copy link', icon: Link, run: () => void copyWithToast(link, 'Link copied') },
    );
    if (issue.status === 'done' && !issue.archived) {
      list.push('separator', {
        id: 'reviewed',
        label: issue.reviewed ? 'Unmark reviewed' : 'Mark reviewed',
        icon: CheckCheck,
        run: () => actions.setReviewed(issue, !issue.reviewed),
      });
    }
    return list;
  }

  function open(e: MouseEvent, issue: Issue) {
    // The context-menu key reports no pointer position: open at the element.
    const el = e.currentTarget instanceof HTMLElement ? e.currentTarget : null;
    openMenu({
      label: `Issue #${issue.id}`,
      at: el && e.clientX === 0 && e.clientY === 0 ? el : { x: e.clientX, y: e.clientY },
      items: () => entries(live(issue)),
    });
  }

  // Shift+F10 or the context-menu key on a focused card or row.
  function onKeydown(e: KeyboardEvent, issue: Issue) {
    if (e.key !== 'ContextMenu' && !(e.shiftKey && e.key === 'F10')) return;
    if (!(e.currentTarget instanceof HTMLElement)) return;
    e.preventDefault();
    openMenu({ label: `Issue #${issue.id}`, at: e.currentTarget, items: () => entries(live(issue)) });
  }

  return { open, onKeydown };
}
