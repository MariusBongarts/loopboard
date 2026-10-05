// One-click checklists in the rendered drawer (#0026): flip the nth GFM
// task marker in the file, skipping fenced code. Null when there's none.
const TASK_RE = /^(\s*(?:[-*+]|\d+[.)])\s+\[)([ xX])(\])/;
const FENCE_RE = /^\s*(`{3,}|~{3,})/;

export function toggleTask(text: string, index: number): string | null {
  const lines = text.split('\n');
  let fence: string | null = null;
  let n = 0;
  for (let i = 0; i < lines.length; i++) {
    const f = lines[i].match(FENCE_RE);
    if (f) {
      if (!fence) fence = f[1][0];
      else if (f[1][0] === fence) fence = null;
      continue;
    }
    if (fence) continue;
    const m = lines[i].match(TASK_RE);
    if (!m) continue;
    if (n++ === index) {
      lines[i] = lines[i].replace(TASK_RE, (_all, a: string, mark: string, b: string) => `${a}${mark === ' ' ? 'x' : ' '}${b}`);
      return lines.join('\n');
    }
  }
  return null;
}
