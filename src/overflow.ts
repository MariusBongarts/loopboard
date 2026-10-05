import { ref, watch, type Ref } from 'vue';

// Which edges of a horizontal scroller hide content, so CSS can fade them
// as a "there is more" hint (#0029 follow-up).
export function useOverflowEdges(el: Ref<HTMLElement | null>) {
  const left = ref(false);
  const right = ref(false);

  watch(
    el,
    (node, _old, onCleanup) => {
      if (!node) return;
      const update = () => {
        left.value = node.scrollLeft > 1;
        right.value = node.scrollLeft + node.clientWidth < node.scrollWidth - 1;
      };
      const ro = new ResizeObserver(update);
      ro.observe(node);
      for (const child of node.children) ro.observe(child);
      node.addEventListener('scroll', update, { passive: true });
      update();
      onCleanup(() => {
        ro.disconnect();
        node.removeEventListener('scroll', update);
      });
    },
    { immediate: true, flush: 'post' },
  );

  return { left, right };
}
