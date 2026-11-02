import {
  RiDeleteBin6Line,
  RiExternalLinkLine,
  RiFileCopyLine,
  RiPlayListAddLine,
  RiPlayListLine,
} from "@remixicon/react";

import { openBiliVideoLink } from "@/common/utils/url";

import { usePlayer, type Track } from "../../store/player";
import { toastSuccess } from "../../store/toast";
import { Cover } from "../ui/Cover";
import { ListRow } from "../ui/List";
import { Sheet } from "../ui/Sheet";

interface TrackActionsSheetProps {
  track: Track | null;
  open: boolean;
  onClose: () => void;
  /** when opened from the queue, offer removal */
  queueIndex?: number;
}

const biliLink = (track: Track) =>
  track.kind === "mv"
    ? `https://www.bilibili.com/video/${track.bvid ?? ""}`
    : `https://www.bilibili.com/audio/au${track.sid ?? ""}`;

export function TrackActionsSheet({ track, open, onClose, queueIndex }: TrackActionsSheetProps) {
  const playNext = usePlayer(state => state.playNext);
  const enqueue = usePlayer(state => state.enqueue);
  const removeAt = usePlayer(state => state.removeAt);

  if (!track) return null;

  return (
    <Sheet open={open} title="更多" onClose={onClose} zIndex={85}>
      <div className="mb-4 flex items-center gap-3 px-1">
        <Cover alt={track.title} className="h-14 w-14" rounded={8} size={120} src={track.cover} />
        <div className="min-w-0 flex-1">
          <div className="text-label line-clamp-2 text-[16px] leading-[21px] font-semibold">{track.title}</div>
          <div className="text-footnote text-label-2 mt-1 truncate">{track.artist ?? "未知 UP 主"}</div>
        </div>
      </div>

      <div className="bg-fill/60 overflow-hidden rounded-[14px]">
        <ListRow
          icon={<RiPlayListAddLine size={20} />}
          title="下一首播放"
          onClick={() => {
            playNext(track);
            toastSuccess("已添加到下一首");
            onClose();
          }}
        />
        <ListRow
          icon={<RiPlayListLine size={20} />}
          title="添加到播放队列"
          onClick={() => {
            enqueue([track]);
            toastSuccess("已加入播放队列");
            onClose();
          }}
        />
        <ListRow
          icon={<RiExternalLinkLine size={20} />}
          title="在哔哩哔哩中打开"
          onClick={() => {
            openBiliVideoLink({ type: track.kind, bvid: track.bvid, sid: track.sid });
            onClose();
          }}
        />
        <ListRow
          icon={<RiFileCopyLine size={20} />}
          title="复制链接"
          last
          onClick={() => {
            void navigator.clipboard?.writeText(biliLink(track)).then(
              () => toastSuccess("链接已复制"),
              () => undefined,
            );
            onClose();
          }}
        />
      </div>

      {typeof queueIndex === "number" && (
        <div className="bg-fill/60 mt-2 overflow-hidden rounded-[14px]">
          <ListRow
            danger
            icon={<RiDeleteBin6Line size={20} />}
            last
            title="从队列中移除"
            onClick={() => {
              removeAt(queueIndex);
              onClose();
            }}
          />
        </div>
      )}
    </Sheet>
  );
}
