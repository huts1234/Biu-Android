import { getMusicComprehensiveWebRank } from "@/service/music-comprehensive-web-rank";
import { getNewMusic } from "@/service/web-interface-new-music";
import { getNewMusicBanner } from "@/service/web-interface-new-music-banner";
import { getRegionFeedRcmd } from "@/service/web-interface-region-feed-rcmd";

import type { Track } from "../store/player";

import { trackFromArchive, trackFromNewMusic, trackFromRank } from "./normalize";

export interface FeedPage {
  items: Track[];
  hasMore: boolean;
}

const REGION_MUSIC = 1003;

/** 推荐 — 音乐分区为你推荐 */
export async function fetchRecommend(page = 1): Promise<FeedPage> {
  const res = await getRegionFeedRcmd({
    display_id: page,
    request_cnt: 15,
    from_region: REGION_MUSIC,
    device: "web",
    plat: 30,
    web_location: "333.40138",
  });

  const list = res?.data?.archives ?? [];
  return {
    items: list.map(trackFromArchive).filter(item => Boolean(item.bvid || item.aid)),
    hasMore: list.length >= 15,
  };
}

/** 热门 — 音乐综合排行榜 */
export async function fetchChart(page = 1): Promise<FeedPage> {
  const res = await getMusicComprehensiveWebRank({ pn: page, ps: 20, web_location: "333.1351" });
  const list = res?.data?.list ?? [];

  return {
    items: list.map(trackFromRank).filter(item => Boolean(item.bvid)),
    hasMore: list.length >= 20,
  };
}

/** 新歌速递 */
export async function fetchNewMusic(): Promise<Track[]> {
  try {
    const res = await getNewMusic();
    const list = res?.data?.list ?? [];
    return list.map(trackFromNewMusic).filter(item => Boolean(item.bvid || item.sid));
  } catch {
    return [];
  }
}

/** 首页顶部焦点图 */
export async function fetchBanners(): Promise<Track[]> {
  try {
    const res = await getNewMusicBanner();
    const list = res?.data?.list ?? [];
    return list.map(trackFromNewMusic).filter(item => Boolean(item.bvid));
  } catch {
    return [];
  }
}
