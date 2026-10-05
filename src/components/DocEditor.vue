<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { applyIssueFields, readIssueFields, splitFrontmatter, type IssueFields } from '../../shared/frontmatter';
import { fetchDoc, saveDoc, type Doc } from '../api';
import { diffLines } from '../diff';
import { fromEditorMarkdown, spliceMarkdown, toEditorMarkdown } from '../splice';
import { readStored, writeStored } from '../storage';
import { ALL_STATUSES, COLUMN_LABEL } from '../types';
import { useWorkspace } from '../workspace';
import BaseDialog from './BaseDialog.vue';
import RichEditor from './RichEditor.vue';
import Segmented from './Segmented.vue';

// Edits one markdown file (#0024, #0026, ADR-0005). Saves are hash-checked,
// so an agent's edit in between is a conflict, never a silent overwrite.
// Rich mode edits fields + body and splices only changed blocks back into the
// file; Source mode edits the raw file. `version` changes whenever live data
// shows the file changed on disk.
const props = defineProps<{ path: string; version: string }>();
const emit = defineEmits<{ (e: 'close'): void; (e: 'saved'): void }>();
const { id: workspaceId, projects } = useWorkspace();

type Mode = 'rich' | 'source';
const MODE_KEY = 'loopboard.editorMode';
const mode = ref<Mode>(readStored(MODE_KEY) === 'source' ? 'source' : 'rich');
const isIssue = computed(() => props.path.startsWith('issues/'));

const base = ref<Doc | null>(null);
const source = ref(''); // Source mode draft: the whole file
const fields = ref<IssueFields | null>(null); // Rich mode: frontmatter fields
const fieldsBase = ref<IssueFields | null>(null);
const body = ref(''); // Rich mode: what the editor holds (with raw blocks wrapped)
const editorKey = ref(0); // remount the rich editor when its content is replaced
const labelsText = ref('');
const saving = ref(false);
const error = ref<string | null>(null);
const conflict = ref<{ content: string; hash: string } | null>(null);
const comparing = ref(false);
const diskChanged = ref(false);
const confirmingDiscard = ref(false);

// The file as it would be saved right now.
function compose(): string {
  if (!base.value) return '';
  if (mode.value === 'source') return source.value;
  const start = source.value; // the text Rich mode started from
  const { frontmatter, body: startBody } = splitFrontmatter(start);
  const nextBody = spliceMarkdown(startBody, fromEditorMarkdown(body.value));
  let next = frontmatter + nextBody;
  if (fields.value && fieldsBase.value) {
    const f = { ...fields.value, labels: parseLabels(labelsText.value) };
    next = applyIssueFields(next, fieldsBase.value, f);
  }
  return next;
}

const composed = ref('');
const dirty = computed(() => base.value !== null && composed.value !== base.value.content);
const diff = computed(() => (conflict.value ? diffLines(conflict.value.content, composed.value) : []));

function parseLabels(text: string): string[] {
  return text.split(',').map((l) => l.trim()).filter(Boolean);
}

// Rich mode starts from `text` (the disk version, or the Source draft).
function enterRich(text: string) {
  source.value = text;
  const parsed = isIssue.value ? readIssueFields(text) : null;
  fields.value = parsed ? { ...parsed } : null;
  fieldsBase.value = parsed;
  labelsText.value = parsed?.labels.join(', ') ?? '';
  body.value = toEditorMarkdown(splitFrontmatter(text).body);
  editorKey.value++;
}

function reset(doc: Doc) {
  base.value = doc;
  source.value = doc.content;
  if (mode.value === 'rich') enterRich(doc.content);
  composed.value = doc.content;
  diskChanged.value = false;
}

async function load() {
  try {
    reset(await fetchDoc(workspaceId.value, props.path));
    error.value = null;
  } catch (e) {
    error.value = (e as Error).message;
  }
}

onMounted(load);
watch([source, body, fields, labelsText, mode], () => (composed.value = compose()), { deep: true });

function setMode(next: Mode) {
  if (next === mode.value || !base.value) return;
  const current = compose();
  mode.value = next;
  writeStored(MODE_KEY, next);
  if (next === 'rich') enterRich(current);
  else source.value = current;
  void nextTick(() => (composed.value = compose()));
}

// Live data moved on: follow silently unless there are unsaved edits.
watch(
  () => props.version,
  () => {
    if (!base.value || saving.value) return;
    if (dirty.value) diskChanged.value = true;
    else void load();
  },
);

async function save(force = false) {
  if (!base.value || saving.value) return;
  const content = compose();
  const baseHash = force && conflict.value ? conflict.value.hash : base.value.hash;
  saving.value = true;
  try {
    const result = await saveDoc(workspaceId.value, props.path, content, baseHash);
    if (result.ok) {
      base.value = result.doc;
      conflict.value = null;
      comparing.value = false;
      diskChanged.value = false;
      emit('saved');
      emit('close');
    } else {
      conflict.value = result.current;
    }
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    saving.value = false;
  }
}

function reloadTheirs() {
  if (!conflict.value) return;
  reset({ path: props.path, ...conflict.value });
  conflict.value = null;
  comparing.value = false;
}

function cancel() {
  if (dirty.value && !confirmingDiscard.value) {
    confirmingDiscard.value = true;
    return;
  }
  emit('close');
}

function onKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 's') {
    e.preventDefault();
    void save();
  } else if (e.key === 'Escape' && !e.defaultPrevented) {
    e.stopPropagation();
    if (comparing.value) comparing.value = false;
    else cancel();
  }
}

const statusOptions = ALL_STATUSES.map((s) => ({ value: s, label: COLUMN_LABEL[s] }));
const openProjects = computed(() => projects.value.filter((p) => p.status !== 'shipped'));
</script>

<template>
  <div class="doc-editor" @keydown="onKeydown">
    <div class="doc-editor-bar">
      <Segmented
        :model-value="mode"
        label="Editor mode"
        :options="[
          { value: 'rich', label: 'Rich' },
          { value: 'source', label: 'Source' },
        ]"
        @update:model-value="setMode"
      />
      <span class="doc-editor-path">{{ props.path }}</span>
      <span v-if="dirty" class="doc-editor-dirty">Unsaved</span>
      <template v-if="confirmingDiscard">
        <span class="doc-editor-ask">Discard your changes?</span>
        <button type="button" class="danger" @click="emit('close')">Discard</button>
        <button type="button" @click="confirmingDiscard = false">Keep editing</button>
      </template>
      <template v-else>
        <button type="button" @click="cancel">Cancel</button>
        <button type="button" class="primary" :disabled="saving || !dirty" @click="save()">Save <kbd>⌘S</kbd></button>
      </template>
    </div>
    <div v-if="conflict" class="doc-editor-conflict" role="alert">
      <strong>Changed on disk</strong> while you were editing — probably an agent.
      <button type="button" @click="reloadTheirs">Reload theirs</button>
      <button type="button" @click="comparing = true">Compare</button>
      <button type="button" class="danger" @click="save(true)">Overwrite with mine</button>
    </div>
    <div v-else-if="diskChanged" class="doc-editor-heads-up" role="status">
      This file changed on disk. Saving will ask what to do.
    </div>
    <p v-if="error" class="ws-error" role="alert">{{ error }}</p>

    <template v-if="base && mode === 'rich'">
      <div v-if="fields" class="doc-fields">
        <input v-model="fields.title" class="doc-field-title" aria-label="Title" />
        <label>
          <span>Status</span>
          <select v-model="fields.status" aria-label="Status">
            <option v-for="o in statusOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </label>
        <label>
          <span>Assignee</span>
          <select v-model="fields.assignee" aria-label="Assignee">
            <option value="agent">Agent</option>
            <option value="human">You</option>
          </select>
        </label>
        <label>
          <span>Project</span>
          <select v-model="fields.project" aria-label="Project">
            <option value="">No project</option>
            <option v-for="p in openProjects" :key="p.slug" :value="p.slug">{{ p.title }}</option>
          </select>
        </label>
        <label>
          <span>Parent</span>
          <input v-model="fields.parent" aria-label="Parent" placeholder="NNNN" maxlength="4" class="doc-field-short" />
        </label>
        <label class="doc-field-labels">
          <span>Labels</span>
          <input v-model="labelsText" aria-label="Labels" placeholder="ui, bug" />
        </label>
      </div>
      <RichEditor :key="editorKey" :markdown="body" label="Body" @update="(md) => (body = md)" />
    </template>
    <!-- Disabled until loaded, so typing can't be overwritten by the late load. -->
    <textarea
      v-else
      v-model="source"
      class="doc-editor-source"
      spellcheck="false"
      aria-label="Markdown source"
      :disabled="!base"
      autofocus
    />
    <BaseDialog :open="comparing" label="Compare versions" eyebrow="Compare" wide @close="comparing = false">
      <h3>On disk <span class="diff-vs">vs</span> yours</h3>
      <pre class="diff"><span v-for="(l, i) in diff" :key="i" :class="`diff-${l.kind}`">{{ l.kind === 'add' ? '+ ' : l.kind === 'del' ? '- ' : '  ' }}{{ l.text }}
</span></pre>
      <template #actions>
        <button type="button" @click="reloadTheirs">Keep theirs</button>
        <button type="button" class="primary" @click="save(true)">Keep mine</button>
      </template>
    </BaseDialog>
  </div>
</template>
