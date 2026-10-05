import { onUnmounted, ref, watch, type Ref } from 'vue';

export type LiveState = 'connecting' | 'live' | 'offline';

// Follows /api/w/:ws/events (#0010). After a dropped connection the next
// "ready" also triggers a refetch, so changes made while offline show up.
export function useLiveUpdates(workspace: Ref<string>, onChange: () => void) {
  const state = ref<LiveState>('connecting');
  let source: EventSource | null = null;
  let wasOffline = false;

  function close() {
    source?.close();
    source = null;
  }

  function connect() {
    close();
    state.value = 'connecting';
    wasOffline = false;
    source = new EventSource(`/api/w/${encodeURIComponent(workspace.value)}/events`);
    source.addEventListener('ready', () => {
      state.value = 'live';
      if (wasOffline) onChange();
      wasOffline = false;
    });
    source.addEventListener('change', () => onChange());
    source.onerror = () => {
      state.value = 'offline';
      wasOffline = true;
    };
  }

  watch(workspace, connect, { immediate: true });
  onUnmounted(close);
  return { state };
}
