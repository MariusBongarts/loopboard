# Frontend component rules

- Vue 3 single-file components with `<script setup lang="ts">`, typed
  `defineProps` / `defineEmits`. Components live in `src/components/`, icons
  in `src/components/icons/`.
- Before building a component, check whether an existing one (drawers,
  `BadgePopover`, `Column`/`Card`, `IssueRefText`) can be reused or
  generalized. Extract logic used in two places into `src/*.ts`.
- `App.vue` owns the data and every write to the server; child components
  emit events instead of calling the API.
- Style with the tokens in [`src/styles.css`](../../src/styles.css) (colors,
  fonts, radii, shadows, motion) — no hard-coded colors. Follow the Brand Kit
  for UI/UX work (`.agents/design/Brand Kit.html`).
- `styles.css` holds tokens, base elements and shared primitives (buttons,
  inputs, pills, menus); a component's own layout goes in its SFC as
  `<style scoped>`. Shared visuals are components (`StatusIcon`, `Avatar`, …),
  not copied class lists. Icons come from `@lucide/vue`.
- Persist UI state in `localStorage` only under a namespaced key, and wrap
  every read and write in `try/catch` — storage can be disabled. List new
  keys in [`architecture/client.md`](../architecture/client.md#browser-storage).
- Keyboard shortcuts must ignore events from inputs, textareas and
  contenteditable elements, and must not fire while a drawer or modal owns
  the keyboard.
