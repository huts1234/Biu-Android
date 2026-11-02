import { getFavFolderCollectedList } from "@/service/fav-folder-collected-list";
import { getFavResourceList } from "@/service/fav-resource";
import { getHistoryToViewList } from "@/service/history-toview-list";
import { searchWebInterfaceHistory } from "@/service/web-interface-history-search";

import type { Track } from "../store/player";

import { formatMediaUrl } from "../lib/media";
import { trackFromFavMedia, trackFromHistory, trackFromLater } from "./normalize";

export interface Folder {
  id: number;
  title: string;
  cover?: string;
  count: number;
  private: boolean;
  isDefault: boolean;
}

export async function fetchMyFolders(mid: number): Promise<Folder[]> {
  const res = await getFavFolderCollectedList({ up_mid: mid, ps: 50, pn: 1, platform: "web" });
  const list = res?.data?.list ?? [];

  return list
    .filter(item => item.type === 11)
    .map(item => ({
      id: item.id,
      title: item.title,
      cover: formatMediaUrl(item.cover),
      count: item.media_count,
      private: (item.attr & 1) === 1,
      isDefault: (item.attr & 2) === 0,
    }));
}

export interface FolderPage {
  items: Track[];
  hasMore: boolean;
  title?: string;
}

export async function fetchFolderTracks(mediaId: number, page = 1): Promise<FolderPage> {
  const res = await getFavResourceList({
    media_id: String(mediaId),
    ps: 20,
    pn: page,
    platform: "web",
    type: 0,
  });

  const medias = res?.data?.medias ?? [];

  return {
    items: medias.map(trackFromFavMedia).filter((item): item is Track => Boolean(item)),
    hasMore: Boolean(res?.data?.has_more),
    title: res?.data?.info?.title,
  };
}

export async function fetchHistory(page = 1): Promise<{ items: Track[]; hasMore: boolean }> {
  const res = await searchWebInterfaceHistory({ pn: page });
  const list = res?.data?.list ?? [];

  return {
    items: list.map(trackFromHistory).filter((item): item is Track => Boolean(item)),
    hasMore: Boolean(res?.data?.has_more),
  };
}

export async function fetchWatchLater(): Promise<Track[]> {
  const res = await getHistoryToViewList({ pn: 1, ps: 50 });
  return (res?.data?.list ?? []).map(trackFromLater).filter(item => Boolean(item.bvid));
}
