import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Show a long list a page at a time: the first `size` items render, and the
 * next page is added when the person scrolls near the end. A list of 300
 * works builds 24 cards up front instead of 300, so the screen opens and
 * scrolls smoothly on a phone. Changing `resetKey` (a search or a filter)
 * goes back to the first page.
 *
 *   const { visible, hasMore, sentinel } = usePaged(filtered, 24, search + stage);
 *   ...{visible.map(...)}  {hasMore && <div ref={sentinel} aria-hidden className="h-px" />}
 */
export function usePaged<T>(items: T[], size = 24, resetKey?: unknown) {
  const [count, setCount] = useState(size);
  useEffect(() => { setCount(size); }, [resetKey, size]);

  const observer = useRef<IntersectionObserver | null>(null);
  const sentinel = useCallback((node: HTMLElement | null) => {
    observer.current?.disconnect();
    if (!node || typeof IntersectionObserver === "undefined") return;
    observer.current = new IntersectionObserver(
      entries => { if (entries.some(e => e.isIntersecting)) setCount(c => c + size); },
      { rootMargin: "800px 0px" }
    );
    observer.current.observe(node);
  }, [size]);
  useEffect(() => () => observer.current?.disconnect(), []);

  return { visible: items.slice(0, count), hasMore: items.length > count, sentinel, showMore: () => setCount(c => c + size) };
}
