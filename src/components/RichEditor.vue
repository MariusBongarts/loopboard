<script setup lang="ts">
import { Markdown } from '@tiptap/markdown';
import { TaskItem } from '@tiptap/extension-task-item';
import { TaskList } from '@tiptap/extension-task-list';
import StarterKit from '@tiptap/starter-kit';
import { EditorContent, useEditor } from '@tiptap/vue-3';
import { computed, onBeforeUnmount, ref } from 'vue';
import { useWorkspace } from '../workspace';

// Rich-text editing of a markdown body (#0026). The parent splices the
// result into the original file, so untouched blocks keep their bytes.
const props = defineProps<{ markdown: string; label: string }>();
const emit = defineEmits<{ (e: 'update', markdown: string): void }>();
const { issues } = useWorkspace();

// `#` autocomplete: the token being typed, and where to show the list.
const suggest = ref<{ query: string; from: number; to: number; x: number; y: number } | null>(null);
const active = ref(0);
const matches = computed(() => {
  if (!suggest.value) return [];
  const q = suggest.value.query.toLowerCase();
  return issues.value
    .filter((i) => !i.archived && (i.id.startsWith(q) || i.title.toLowerCase().includes(q)))
    .slice(0, 8);
});

const editor = useEditor({
  content: props.markdown,
  contentType: 'markdown',
  extensions: [StarterKit.configure({ link: { openOnClick: false } }), TaskList, TaskItem.configure({ nested: true }), Markdown],
  editorProps: {
    attributes: { class: 'rich-editor-content prose', 'aria-label': props.label, role: 'textbox', 'aria-multiline': 'true' },
    handleKeyDown: (_view, event) => {
      if (!suggest.value || !matches.value.length) return false;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        const n = matches.value.length;
        active.value = (active.value + (event.key === 'ArrowDown' ? 1 : n - 1)) % n;
        return true;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        pick(matches.value[active.value].id);
        return true;
      }
      if (event.key === 'Escape') {
        suggest.value = null;
        return true;
      }
      return false;
    },
  },
  onUpdate: ({ editor: e }) => {
    emit('update', e.getMarkdown());
    track();
  },
  onSelectionUpdate: () => track(),
});

function track() {
  const e = editor.value;
  if (!e) return;
  const { from, empty } = e.state.selection;
  const before = e.state.doc.textBetween(Math.max(0, from - 40), from, '\n', '\0');
  const m = empty ? before.match(/(?:^|[\s(])#(\w{0,30})$/) : null;
  if (!m) {
    suggest.value = null;
    return;
  }
  const coords = e.view.coordsAtPos(from);
  suggest.value = { query: m[1], from: from - m[1].length - 1, to: from, x: coords.left, y: coords.bottom };
  active.value = 0;
}

function pick(id: string) {
  const s = suggest.value;
  if (!s || !editor.value) return;
  editor.value.chain().focus().insertContentAt({ from: s.from, to: s.to }, `#${id} `).run();
  suggest.value = null;
}

function run(cmd: (c: ReturnType<NonNullable<typeof editor.value>['chain']>) => { run: () => boolean }) {
  if (editor.value) cmd(editor.value.chain().focus()).run();
}

defineExpose({ getMarkdown: () => editor.value?.getMarkdown() ?? props.markdown });
onBeforeUnmount(() => editor.value?.destroy());
</script>

<template>
  <div class="rich-editor">
    <div v-if="editor" class="rich-toolbar" role="toolbar" aria-label="Formatting">
      <button type="button" title="Bold (⌘B)" :class="{ on: editor.isActive('bold') }" @click="run((c) => c.toggleBold())"><b>B</b></button>
      <button type="button" title="Italic (⌘I)" :class="{ on: editor.isActive('italic') }" @click="run((c) => c.toggleItalic())"><i>I</i></button>
      <button type="button" title="Heading" :class="{ on: editor.isActive('heading', { level: 2 }) }" @click="run((c) => c.toggleHeading({ level: 2 }))">H2</button>
      <button type="button" title="Bullet list" :class="{ on: editor.isActive('bulletList') }" @click="run((c) => c.toggleBulletList())">• List</button>
      <button type="button" title="Checklist" :class="{ on: editor.isActive('taskList') }" @click="run((c) => c.toggleTaskList())">☑ Checklist</button>
      <button type="button" title="Code" :class="{ on: editor.isActive('code') }" @click="run((c) => c.toggleCode())">&lt;/&gt;</button>
      <span class="rich-toolbar-hint">Type <kbd>#</kbd> to link an issue</span>
    </div>
    <EditorContent :editor="editor" />
    <Teleport to="body">
      <ul
        v-if="suggest && matches.length"
        class="issue-suggest"
        role="listbox"
        aria-label="Link an issue"
        :style="{ left: `${suggest.x}px`, top: `${suggest.y + 4}px` }"
      >
        <li
          v-for="(i, n) in matches"
          :key="i.id"
          role="option"
          :aria-selected="n === active"
          @mousedown.prevent="pick(i.id)"
        >
          <span class="card-id">#{{ i.id }}</span> {{ i.title }}
        </li>
      </ul>
    </Teleport>
  </div>
</template>
