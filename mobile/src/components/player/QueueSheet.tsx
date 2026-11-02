import { useState } from "react";

import { RiPlayListLine, RiRepeat2Line, RiShuffleLine, RiRepeatOneLine, RiOrderPlayLine } from "@remixicon/react";

import { PLAY_MODE_LABEL, PlayMode, usePlayer } from "../../store/player";
import { useUiStore } from "../../store/ui";
import { MusicRow } from "../music/MusicRow";
import { ConfirmSheet, Sheet } from "../ui/Sheet";

export function QueueSheet() {
  const open = useUiStore(state => state.queueOpen);
  const close = useUiStore(state => state.closeQueue);
  const openActions = useUiStore(state => state.openActions);

  const queue = usePlayer(state => state.queue);
  const index = usePlayer(state => state.index);
  const isPlaying = usePlayer(state => state.isPlaying);
  const mode = usePlayer(state => state.mode);
  const playAt = usePlayer(state => state.playAt);
  const clear = usePlayer(state => state.clear);
  const cycleMode = usePlayer(state => state.cycleMode);

  const [confirmClear, setConfirmClear] = useState(false);

  const ModeIcon =
    mode === PlayMode.Single
      ? RiRepeatOneLine
      : mode === PlayMode.Random
        ? RiShuffleLine
        : mode === PlayMode.Sequence
          ? RiOrderPlayLine
          : RiRepeat2Line;

  return (
    <>
      <Sheet bare maxHeight="82vh" open={open} title={`待播清单 · ${queue.length}`} onClose={close} zIndex={80}>
        <div className="border-separator flex items-center justify-between border-b px-4 pb-2.5">
          <button
            className="pressable bg-fill text-footnote text-label flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium"
            type="button"
            onClick={cycleMode}
          >
            <ModeIcon size={16} />
            {PLAY_MODE_LABEL[mode]}
          </button>

          <button
            className="pressable text-footnote text-tint rounded-full px-3 py-1.5 disabled:opacity-40"
            disabled={!queue.length}
            type="button"
            onClick={() => setConfirmClear(true)}
          >
            清空
          </button>
        </div>

        <div className="no-scrollbar overflow-y-auto" style={{ maxHeight: "calc(82vh - 120px)" }}>
          {queue.length === 0 ? (
            <div className="text-label-2 flex flex-col items-center justify-center gap-3 py-16">
              <RiPlayListLine size={36} />
              <span className="text-subhead">队列是空的</span>
            </div>
          ) : (
            <div className="pb-safe">
              {queue.map((track, itemIndex) => (
                <MusicRow
                  key={track.key}
                  active={itemIndex === index}
                  playing={isPlaying}
                  track={track}
                  onMore={() => openActions(track, itemIndex)}
                  onPress={() => void playAt(itemIndex)}
                />
              ))}
            </div>
          )}
        </div>
      </Sheet>

      <ConfirmSheet
        danger
        confirmLabel="清空队列"
        description="当前播放也会停止"
        open={confirmClear}
        title="清空待播清单？"
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => {
          clear();
          setConfirmClear(false);
          close();
        }}
      />
    </>
  );
}
