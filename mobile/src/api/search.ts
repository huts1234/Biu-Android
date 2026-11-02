import { getSearchSuggestMain } from "@/service/main-suggest";
import { getWebInterfaceWbiSearchType, type SearchVideoItem } from "@/service/web-interface-search-type";

import type { Track } from "../store/player";

import { trackFromSearchVideo } from "./normalize";

export interface SearchPage {
  items: Track[];
  hasMore: boolean;
  total: number;
}

export async function searchVideos(keyword: string, page = 1, order: "totalrank" | "click" | "pubdate" = "totalrank") {
  const res = await getWebInterfaceWbiSearchType<SearchVideoItem>({
    keyword,
    search_type: "video",
    page,
    page_size: 20,
    order,
  });

  const list = res?.data?.result ?? [];

  return {
    items: list.map(trackFromSearchVideo).filter(item => Boolean(item.bvid)),
    hasMore: page < (res?.data?.numPages ?? 1),
    total: res?.data?.numResults ?? 0,
  } satisfies SearchPage;
}

export async function fetchSuggest(term: string): Promise<string[]> {
  if (!term.trim()) return [];
  try {
    const res = await getSearchSuggestMain({ term, main_ver: "v1", func: "suggest", suggest_type: "accurate" });
    return (res?.result?.tag ?? [])
      .map(item => item.value)
      .filter(Boolean)
      .slice(0, 10);
  } catch {
    return [];
  }
}
