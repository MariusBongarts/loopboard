// Filming helpers for the README demo (#0036). Nothing runs in real time:
// each step changes the page, then captures a frame with a fixed duration.

export class Film {
  frames = [];
  duration = 0;

  constructor(page) {
    this.page = page;
    const { width, height } = page.viewportSize();
    this.cursor = { x: width * 0.6, y: height * 0.92 };
  }

  async capture(ms) {
    const png = await this.page.screenshot();
    const last = this.frames.at(-1);
    if (last && last.png.equals(png)) last.delay += ms;
    else this.frames.push({ png, delay: ms });
    this.duration += ms;
  }

  hold(ms) {
    return this.capture(ms);
  }

  // The agent's terminal: a typed command, then output lines.
  async type(command) {
    for (let i = 2; i < command.length + 2; i += 2) {
      await this.stage('typing', command.slice(0, i));
      await this.capture(70);
    }
    await this.capture(350);
  }

  async say(text, ms, tone = '') {
    await this.stage('line', text, tone);
    if (ms) await this.capture(ms);
  }

  async prompt() {
    await this.stage('prompt');
  }

  // Waits for the board to pick up a file change on its own.
  async live(locator) {
    await locator.waitFor();
    await this.page.waitForTimeout(250);
  }

  // Rings what just changed for `ms`.
  async spotlight(locators, ms) {
    for (const l of locators) await l.evaluate((el) => el.classList.add('demo-spot'));
    await this.capture(ms);
    for (const l of locators) await l.evaluate((el) => el.classList.remove('demo-spot'));
  }

  // The human: the real mouse and a drawn pointer glide to the target, then click.
  async click(locator) {
    const box = await locator.boundingBox();
    const to = { x: Math.round(box.x + box.width * 0.45), y: Math.round(box.y + box.height * 0.5) };
    await this.stage('showCursor');
    await this.glide(to);
    await this.capture(220);
    await this.page.mouse.click(to.x, to.y);
  }

  async glide(to, steps = 14) {
    const from = this.cursor;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      const x = Math.round(from.x + (to.x - from.x) * e);
      const y = Math.round(from.y + (to.y - from.y) * e);
      await this.stage('moveCursor', x, y);
      await this.page.mouse.move(x, y);
      await this.capture(30);
    }
    this.cursor = to;
  }

  stage(method, ...args) {
    return this.page.evaluate(([m, a]) => window.demoStage[m](...a), [method, args]);
  }
}

// Runs in the page: a terminal for the agent, a pointer for the human, and a
// ring style for whatever just changed. Transitions are off so layout is final
// the moment a step measures it.
export function installStage() {
  const style = document.createElement('style');
  style.textContent = `
    *, *::before, *::after { transition: none !important; animation: none !important; caret-color: transparent !important; }
    .demo-term { position: fixed; right: 20px; bottom: 20px; width: 470px; z-index: 9000; pointer-events: none;
      background: oklch(0.2 0.006 286); color: oklch(0.92 0.004 286); border: 1px solid oklch(0.32 0.006 286);
      border-radius: 10px; box-shadow: 0 8px 28px oklch(0.2 0.01 286 / 0.28); font: 12px/18px var(--mono); overflow: hidden; }
    .demo-term-bar { display: flex; align-items: center; gap: 6px; padding: 8px 12px; border-bottom: 1px solid oklch(0.3 0.006 286);
      color: oklch(0.7 0.006 286); font: 500 11px/14px var(--sans); }
    .demo-term-bar i { width: 9px; height: 9px; border-radius: 50%; background: oklch(0.38 0.006 286); }
    .demo-term-bar span { margin-left: 6px; }
    .demo-term-body { height: 184px; padding: 8px 12px; display: flex; flex-direction: column; justify-content: flex-end; }
    .demo-term-body div { white-space: pre; overflow: hidden; text-overflow: ellipsis; }
    .demo-term .cmd { color: oklch(0.98 0 0); margin-top: 4px; }
    .demo-term .cmd b { color: oklch(0.72 0.14 277); font-weight: 600; }
    .demo-term .out { color: oklch(0.74 0.006 286); padding-left: 14px; }
    .demo-term .ok { color: oklch(0.78 0.14 150); }
    .demo-term .warn { color: oklch(0.82 0.13 75); }
    .demo-term .caret { display: inline-block; width: 7px; height: 14px; margin-bottom: -2px; background: oklch(0.8 0.006 286); }
    .demo-cursor { position: fixed; left: 0; top: 0; z-index: 9001; pointer-events: none; display: none; }
    .demo-spot { box-shadow: 0 0 0 2px var(--accent), 0 0 0 6px var(--focus) !important; }
  `;
  document.head.append(style);
  const term = document.createElement('div');
  term.className = 'demo-term';
  term.innerHTML = '<div class="demo-term-bar"><i></i><i></i><i></i><span>agent · acme-notes</span></div><div class="demo-term-body"></div>';
  const body = term.querySelector('.demo-term-body');
  const cursor = document.createElement('div');
  cursor.className = 'demo-cursor';
  cursor.innerHTML =
    '<svg width="22" height="22" viewBox="0 0 24 24"><path d="M5 2.5v17.2l4.6-4.4 2.9 6.7 2.9-1.3-2.9-6.6h6.4z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  document.body.append(term, cursor);

  let command = null;
  const add = (cls, html) => {
    const div = document.createElement('div');
    div.className = cls;
    div.innerHTML = html;
    body.append(div);
    while (body.children.length > 10) body.firstElementChild.remove();
    return div;
  };
  const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
  window.demoStage = {
    prompt() {
      command = add('cmd', '<b>›</b> <span class="caret"></span>');
    },
    typing(text) {
      if (!command) this.prompt();
      command.innerHTML = `<b>›</b> ${esc(text)}<span class="caret"></span>`;
    },
    line(text, tone) {
      command?.querySelector('.caret')?.remove();
      command = null;
      add(`out ${tone}`, esc(text));
    },
    showCursor() {
      cursor.style.display = 'block';
    },
    moveCursor(x, y) {
      cursor.style.transform = `translate(${x - 5}px, ${y - 3}px)`;
    },
  };
}
