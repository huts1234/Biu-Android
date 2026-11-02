import type { FavMedia } from "@/service/fav-resource";
import type { ToViewVideoItem } from "@/service/history-toview-list";
import type { Data as RankItem } from "@/service/music-comprehensive-web-rank";
import type { HistoryListItem } from "@/service/web-interface-history-search";
import type { List as NewMusicItem } from "@/service/web-interface-new-music";
import type { List as BannerItem } from "@/service/web-interface-new-music-banner";
import type { Archive } from "@/service/web-interface-region-feed-rcmd";
import type { SearchVideoItem } from "@/service/web-interface-search-type";

import type { Track } from "../store/player";

import { formatMediaUrl, parseDuration, stripHighlight } from "../lib/media";

const videoTrack = (input: {
  bvid?: string;
  aid?: number;
  cid?: number;
  title?: string;
  artist?: string;
  artistMid?: number;
  cover?: string;
  duration?: number;
  playCount?: number;
  publishedAt?: number;
}): Track => ({
  key: `mv:${input.bvid ?? input.aid ?? input.title}`,
  kind: "mv",
  title: stripHighlight(input.title) || "未命名视频",
  artist: input.artist,
  artistMid: input.artistMid,
  cover: formatMediaUrl(input.cover),
  duration: input.duration,
  bvid: input.bvid,
  aid: input.aid,
  cid: input.cid,
  playCount: input.playCount,
  publishedAt: input.publishedAt,
});

export const trackFromArchive = (item: Archive): Track =>
  videoTrack({
    bvid: item.bvid,
    aid: item.aid,
    cid: item.cid,
    title: item.title,
    artist: item.author?.name,
    artistMid: item.author?.mid,
    cover: item.cover,
    duration: item.duration,
    playCount: item.stat?.view,
    publishedAt: item.pubdate,
  });

export const trackFromRank = (item: RankItem): Track => {
  const archive = item.related_archive;
  return videoTrack({
    bvid: archive?.bvid || item.bvid,
    aid: Number(archive?.aid ?? item.aid) || undefined,
    cid: Number(archive?.cid ?? item.cid) || undefined,
    title: archive?.title || item.music_title,
    artist: archive?.username || item.author,
    artistMid: archive?.uid,
    cover: archive?.cover || item.cover,
    duration: archive?.duration,
    playCount: archive?.vv_count,
  });
};

export const trackFromNewMusic = (item: NewMusicItem | BannerItem): Track =>
  videoTrack({
    bvid: item.bvid,
    aid: Number(item.aid) || undefined,
    cid: Number(item.cid) || undefined,
    title:
      ("music_title" in item ? item.music_title : undefined) ||
      ("archive_title" in item ? item.archive_title : undefined),
    artist: item.author,
    cover: item.cover,
    duration: undefined,
  });

export const trackFromFavMedia = (item: FavMedia): Track | null => {
  if (item.type === 12) {
    return {
      key: `audio:${item.id}`,
      kind: "audio",
      sid: item.id,
      title: stripHighlight(item.title) || "未命名音频",
      artist: item.upper?.name,
      artistMid: item.upper?.mid,
      cover: formatMediaUrl(item.cover),
      duration: item.duration,
      playCount: item.cnt_info?.play,
      publishedAt: item.pubtime,
    };
  }

  if (item.type === 2 || item.type === 24) {
    return videoTrack({
      bvid: item.bvid || item.bv_id,
      aid: item.id,
      title: item.title,
      artist: item.upper?.name,
      artistMid: item.upper?.mid,
      cover: item.cover,
      duration: item.duration,
      playCount: item.cnt_info?.play,
      publishedAt: item.pubtime,
    });
  }

  return null;
};

export const trackFromSearchVideo = (item: SearchVideoItem): Track =>
  videoTrack({
    bvid: item.bvid,
    aid: item.aid,
    title: item.title,
    artist: item.author,
    artistMid: item.mid,
    cover: item.pic,
    duration: parseDuration(item.duration),
    playCount: item.play,
    publishedAt: item.pubdate,
  });

export const trackFromHistory = (item: HistoryListItem): Track | null => {
  const bvid = item.history?.bvid;
  if (!bvid) return null;

  return videoTrack({
    bvid,
    aid: item.history?.oid,
    cid: item.history?.cid,
    title: item.title,
    artist: item.author_name,
    artistMid: item.author_mid,
    cover: item.cover,
    duration: item.duration,
    publishedAt: item.view_at,
  });
};

export const trackFromLater = (item: ToViewVideoItem): Track =>
  videoTrack({
    bvid: item.bvid,
    aid: item.aid,
    cid: item.cid,
    title: item.title,
    artist: item.owner?.name,
    artistMid: item.owner?.mid,
    cover: item.pic,
    duration: item.duration,
    playCount: item.stat?.view,
    publishedAt: item.pubdate,
  });
