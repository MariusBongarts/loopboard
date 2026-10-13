import { issueRefs } from '../shared/refs';

// Turns plain `#NNNN` mentions in rendered HTML into clickable issue refs
// (the drawer body, #0005 spec). Text inside code, pre and links is left alone,
// and so are ids that `exists` rejects, so no button leads nowhere.
export function linkifyIssueRefs(html: string, exists: (id: string) => boolean = () => true): string {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstElementChild!;
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const targets: Text[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const text = n as Text;
    if (text.parentElement?.closest('code, pre, a, button')) continue;
    if (issueRefs(text.data).length) targets.push(text);
  }
  for (const text of targets) {
    const frag = doc.createDocumentFragment();
    let last = 0;
    for (const { id, index } of issueRefs(text.data)) {
      if (!exists(id)) continue;
      frag.append(text.data.slice(last, index));
      const btn = doc.createElement('button');
      btn.type = 'button';
      btn.className = 'issue-ref';
      btn.dataset.ref = id;
      btn.textContent = `#${id}`;
      frag.append(btn);
      last = index + id.length + 1;
    }
    frag.append(text.data.slice(last));
    text.replaceWith(frag);
  }
  return root.innerHTML;
}
