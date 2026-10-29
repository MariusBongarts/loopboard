import { computed, onScopeDispose, ref, watch, type ComputedRef, type Ref } from 'vue';
import { buildHome, isHomePeriod, type Home, type HomePeriod } from './home';
import { todayIso } from './inbox';
import { readStored, readWorkspaceStored, writeStored, writeWorkspaceStored } from './storage';
import { useWorkspace } from './workspace';

// Home's state shared by the view and the rail's count (project 06): the
// period (per browser) and when Home was last marked seen (per workspace).
const period = ref<HomePeriod>(((v) => (isHomePeriod(v) ? v : '7d'))(readStored('loopboard.home.period')));
watch(period, (p) => writeStored('loopboard.home.period', p));
const seen = ref<Record<string, number | null>>({});

function lastSeenOf(ws: string): number | null {
  if (!(ws in seen.value)) {
    const stored = Number(readWorkspaceStored(ws, 'home.seen'));
    seen.value[ws] = Number.isFinite(stored) && stored > 0 ? stored : null;
  }
  return seen.value[ws];
}

export function useHome(): { home: ComputedRef<Home>; period: Ref<HomePeriod>; now: Ref<number>; today: ComputedRef<string>; markSeen(): void } {
  const { id, issues, projects, routines } = useWorkspace();
  // Ticks each minute so "today" and the 24-hour fallback move on.
  const now = ref(Date.now());
  const timer = setInterval(() => (now.value = Date.now()), 60_000);
  onScopeDispose(() => clearInterval(timer));

  const today = computed(() => todayIso(new Date(now.value)));
  const home = computed(() =>
    buildHome({
      issues: issues.value,
      projects: projects.value,
      routines: routines.value?.routines ?? [],
      today: today.value,
      now: now.value,
      period: period.value,
      lastSeen: lastSeenOf(id.value),
    }),
  );

  function markSeen() {
    const at = Date.now();
    seen.value[id.value] = at;
    writeWorkspaceStored(id.value, 'home.seen', String(at));
  }

  return { home, period, now, today, markSeen };
}
