import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

import { RiBookmarkLine, RiFolderMusicFill, RiLoginCircleLine, RiSettings3Line, RiTimeLine } from "@remixicon/react";

import { useUser } from "@/store/user";

import { fetchMyFolders, type Folder } from "../api/library";
import { IconButton } from "../components/ui/Buttons";
import { Skeleton } from "../components/ui/Controls";
import { Cover } from "../components/ui/Cover";
import { ListGroup, ListRow, SectionHeader } from "../components/ui/List";
import { Screen } from "../components/ui/Screen";
import { useLongPress } from "../hooks/useLongPress";
import { usePlayer, type Track } from "../store/player";
import { useRecent } from "../store/recent";
import { useUiStore } from "../store/ui";

function RecentTile({ track, onPress, onLongPress }: { track: Track; onPress: () => void; onLongPress: () => void }) {
  const press = useLongPress(onLongPress, onPress);

  return (
    <button className="pressable w-[112px] shrink-0 text-left" type="button" {...press}>
      <Cover alt={track.title} className="aspect-square w-full" rounded={10} size={320} src={track.cover} />
      <div className="text-label mt-1.5 line-clamp-1 text-[13px] font-medium">{track.title}</div>
      <div className="text-label-2 line-clamp-1 text-[11px]">{track.artist ?? "未知 UP 主"}</div>
    </button>
  );
}

export function LibraryPage() {
  const navigate = useNavigate();
  const user = useUser(state => state.user);
  const openLogin = useUiStore(state => state.openLogin);
  const openActions = useUiStore(state => state.openActions);
  const playNow = usePlayer(state => state.playNow);
  const recent = useRecent(state => state.items);

  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.mid) {
      setFolders([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void fetchMyFolders(user.mid)
      .then(list => {
        if (!cancelled) setFolders(list);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.mid]);

  return (
    <Screen
      right={
        <IconButton label="设置" size={36} onClick={() => navigate("/settings")}>
          <RiSettings3Line size={21} />
        </IconButton>
      }
      subtitle={user?.isLogin ? "收藏、历史与你的音乐" : "登录后同步你的音乐"}
      title="资料库"
    >
      {/* profile / login */}
      {user?.isLogin ? (
        <section className="px-4 pb-6">
          <div className="bg-surface flex items-center gap-3.5 rounded-[18px] p-4">
            <Cover alt={user.uname} className="h-[62px] w-[62px] shrink-0" rounded={999} size={180} src={user.face} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-label truncate text-[20px] font-semibold" style={{ letterSpacing: "-0.3px" }}>
                  {user.uname}
                </h2>
                {user.vipStatus ? (
                  <span className="rounded-[5px] bg-gradient-to-r from-[#ff375f] to-[#ff9f0a] px-1.5 py-[1px] text-[10px] font-bold text-white">
                    大会员
                  </span>
                ) : null}
              </div>
              <div className="text-footnote text-label-2 mt-1 flex items-center gap-2">
                <span className="bg-fill rounded-[4px] px-1.5 py-0.5 font-semibold">
                  LV{user.level_info?.current_level ?? 0}
                </span>
                <span>UID {user.mid}</span>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="px-4 pb-6">
          <div
            className="relative overflow-hidden rounded-[20px] p-5 text-white"
            style={{ background: "linear-gradient(135deg,#ff375f 0%,#ff6482 45%,#ff9f0a 100%)" }}
          >
            <div className="relative z-10">
              <h2 className="text-[22px] leading-[28px] font-bold" style={{ letterSpacing: "-0.3px" }}>
                {user ? "登录已过期" : "登录哔哩哔哩"}
              </h2>
              <p className="mt-1.5 max-w-[230px] text-[13px] leading-[18px] text-white/85">
                同步你的收藏夹、稍后再看和播放历史
              </p>
              <button
                className="pressable mt-4 inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-4 text-[14px] font-semibold text-[#ff375f]"
                type="button"
                onClick={openLogin}
              >
                <RiLoginCircleLine size={17} />
                立即登录
              </button>
            </div>
            <div className="absolute -right-6 -bottom-8 h-32 w-32 rounded-full bg-white/15" />
            <div className="absolute -top-10 right-10 h-24 w-24 rounded-full bg-white/10" />
          </div>
        </section>
      )}

      {/* recent plays */}
      {recent.length > 0 && (
        <section className="mb-6">
          <SectionHeader
            title="最近播放"
            action={
              <button
                className="pressable text-footnote text-tint flex items-center"
                type="button"
                onClick={() => void playNow(recent, 0)}
              >
                播放全部
              </button>
            }
          />
          <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1">
            {recent.slice(0, 12).map(track => (
              <RecentTile
                key={track.key}
                track={track}
                onLongPress={() => openActions(track)}
                onPress={() => {
                  const at = recent.findIndex(item => item.key === track.key);
                  void playNow(recent, Math.max(0, at));
                }}
              />
            ))}
          </div>
        </section>
      )}

      {/* favourites */}
      <section className="mb-6">
        <SectionHeader title="收藏夹" subtitle={user?.isLogin ? `${folders.length} 个收藏夹` : undefined} />
        {!user?.isLogin ? (
          <div className="bg-surface text-label-2 mx-4 flex items-center gap-3 rounded-[14px] p-4">
            <RiFolderMusicFill className="text-tint" size={22} />
            <span className="text-subhead">登录后显示你的收藏夹</span>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-2 gap-3 px-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-[132px] rounded-[14px]" />
            ))}
          </div>
        ) : folders.length === 0 ? (
          <div className="bg-surface text-subhead text-label-2 mx-4 rounded-[14px] p-5 text-center">还没有收藏夹</div>
        ) : (
          <div className="grid grid-cols-2 gap-3 px-4 md:grid-cols-4">
            {folders.slice(0, 8).map(folder => (
              <button
                key={folder.id}
                className="pressable bg-surface overflow-hidden rounded-[14px] text-left"
                type="button"
                onClick={() => navigate(`/folder/${folder.id}`, { state: { title: folder.title } })}
              >
                <div className="relative">
                  <Cover
                    alt={folder.title}
                    className="aspect-[1.5/1] w-full"
                    rounded={0}
                    size={400}
                    src={folder.cover}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                  <div className="absolute right-2 bottom-2 left-2">
                    <div className="line-clamp-1 text-[13px] font-semibold text-white">{folder.title}</div>
                    <div className="text-[10px] text-white/70">{folder.count} 首</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* quick rows */}
      <ListGroup className="mb-6">
        <ListRow
          chevron
          icon={<RiBookmarkLine className="text-ios-orange" size={21} />}
          title="稍后再看"
          onClick={() => navigate("/later")}
        />
        <ListRow
          chevron
          icon={<RiTimeLine className="text-ios-blue" size={21} />}
          title="播放历史"
          onClick={() => navigate("/history")}
        />
        <ListRow
          last
          chevron
          icon={<RiSettings3Line className="text-label-2" size={21} />}
          title="设置"
          onClick={() => navigate("/settings")}
        />
      </ListGroup>

      <div className="text-label-3 px-8 pb-6 text-center text-[11px] leading-[16px]">
        Biu for Android · 基于哔哩哔哩公开接口
      </div>
    </Screen>
  );
}
