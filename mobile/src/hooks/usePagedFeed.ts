import { useCallback, useEffect, useRef, useState } from "react";

export interface PagedResult<T> {
  items: T[];
  hasMore: boolean;
}

interface FeedState<T> {
  items: T[];
  page: number;
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
  error?: string;
}

export function usePagedFeed<T>(loader: (page: number) => Promise<PagedResult<T>>, key: string) {
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const [state, setState] = useState<FeedState<T>>({
    items: [],
    page: 1,
    hasMore: true,
    loading: true,
    loadingMore: false,
  });

  const runId = useRef(0);

  const fetchPage = useCallback(async (page: number, replace: boolean) => {
    const id = ++runId.current;
    setState(prev => ({ ...prev, loading: replace, loadingMore: !replace, error: undefined }));

    try {
      const result = await loaderRef.current(page);
      if (id !== runId.current) return;

      setState(prev => ({
        items: replace ? result.items : [...prev.items, ...result.items],
        page,
        hasMore: result.hasMore,
        loading: false,
        loadingMore: false,
      }));
    } catch (error) {
      if (id !== runId.current) return;
      setState(prev => ({
        ...prev,
        loading: false,
        loadingMore: false,
        hasMore: false,
        error: error instanceof Error ? error.message : "加载失败",
      }));
    }
  }, []);

  useEffect(() => {
    setState({ items: [], page: 1, hasMore: true, loading: true, loadingMore: false });
    void fetchPage(1, true);
  }, [key, fetchPage]);

  const loadMore = useCallback(() => {
    setState(prev => {
      if (prev.loading || prev.loadingMore || !prev.hasMore) return prev;
      void fetchPage(prev.page + 1, false);
      return prev;
    });
  }, [fetchPage]);

  const refresh = useCallback(() => {
    void fetchPage(1, true);
  }, [fetchPage]);

  return { ...state, loadMore, refresh };
}

/** Attach to a sentinel element at the end of a list to page in more data. */
export function useInfiniteSentinel(onVisible: () => void, enabled = true) {
  const ref = useRef<HTMLDivElement | null>(null);
  const callbackRef = useRef(onVisible);
  callbackRef.current = onVisible;

  useEffect(() => {
    const node = ref.current;
    if (!node || !enabled) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) callbackRef.current();
      },
      { rootMargin: "600px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled]);

  return ref;
}
