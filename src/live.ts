import { onUnmounted, ref, watch, type Ref } from 'vue';

// "stale": connected, but the server lost its file watcher (#0072).
export type LiveState = 'connecting' | 'live' | 'stale' | 'offline';
export type LiveEvent = 'ready' | 'change' | 'stale' | 'error';

// What a stream event means for the indicator and the data — pure, unit-tested.
// After a gap (dropped connection or dead watcher) the next "ready" also
// refetches, so changes made meanwhile show up (#0010, #0072).
export function onLiveEvent(event: LiveEvent, state: LiveState): { state: LiveState; refetch: boolean } {
  switch (event) {
    case 'ready':
      return { state: 'live', refetch: state === 'offline' || state === 'stale' };
    case 'change':
      return { state, refetch: true };
    case 'stale':
      return { state: 'stale', refetch: state !== 'stale' };
    case 'error':
      return { state: 'offline', refetch: false };
  }
}

// Follows /api/w/:ws/events (#0010).
export function useLiveUpdates(workspace: Ref<string>, onChange: () => void) {
  const state = ref<LiveState>('connecting');
  let source: EventSource | null = null;

  function close() {
    source?.close();
    source = null;
  }

  function apply(event: LiveEvent) {
    const next = onLiveEvent(event, state.value);
    state.value = next.state;
    if (next.refetch) onChange();
  }

  function connect() {
    close();
    state.value = 'connecting';
    source = new EventSource(`/api/w/${encodeURIComponent(workspace.value)}/events`);
    source.addEventListener('ready', () => apply('ready'));
    source.addEventListener('change', () => apply('change'));
    source.addEventListener('stale', () => apply('stale'));
    source.onerror = () => apply('error');
  }

  watch(workspace, connect, { immediate: true });
  onUnmounted(close);
  return { state };
}
