import { computed, inject, provide, ref, watch, type ComputedRef, type InjectionKey } from 'vue';
import type { RouteLocationNormalizedLoaded, Router } from 'vue-router';
import { parsePeek, peekValue, type Peek } from './home';

// Previews on Home (#0130, #0131) live in `?peek=`. Opening one pushes a
// history entry, so the browser's Back closes it. A chain of previews keeps
// the entries it pushed: Back steps to the previous preview, Close rewinds
// to where the chain started — or, for a preview opened from a link, drops
// the query in place.
export interface PeekNav {
  current: ComputedRef<Peek | null>;
  canGoBack: ComputedRef<boolean>;
  href(peek: Peek): string;
  open(peek: Peek): void;
  back(): void;
  close(): void;
}

const PEEK_KEY: InjectionKey<PeekNav> = Symbol('peek');

export function providePeek(router: Router, route: RouteLocationNormalizedLoaded): PeekNav {
  const current = computed(() => parsePeek(route.query.peek));
  // The previews Back returns to, and how many entries this page pushed.
  const trail = ref<string[]>([]);
  let pushed = 0;
  let fromPage = false;

  watch(
    () => route.query.peek,
    (value) => {
      if (typeof value !== 'string' || !parsePeek(value)) {
        trail.value = [];
        pushed = 0;
        fromPage = false;
      } else if (trail.value.at(-1) === value) {
        trail.value = trail.value.slice(0, -1);
        pushed = Math.max(0, pushed - 1);
      }
    },
  );

  const nav: PeekNav = {
    current,
    canGoBack: computed(() => trail.value.length > 0),
    href(peek) {
      return router.resolve({ path: route.path, query: { ...route.query, peek: peekValue(peek) } }).href;
    },
    open(peek) {
      const value = peekValue(peek);
      const now = route.query.peek;
      if (value === now) return;
      if (typeof now === 'string' && parsePeek(now)) trail.value = [...trail.value, now];
      else fromPage = true;
      pushed++;
      void router.push({ path: route.path, query: { ...route.query, peek: value } });
    },
    back() {
      router.back();
    },
    close() {
      if (fromPage && pushed > 0) {
        router.go(-pushed);
        return;
      }
      const query = { ...route.query };
      delete query.peek;
      void router.replace({ path: route.path, query });
    },
  };
  provide(PEEK_KEY, nav);
  return nav;
}

export function usePeek(): PeekNav {
  const nav = inject(PEEK_KEY);
  if (!nav) throw new Error('usePeek() outside Home');
  return nav;
}
