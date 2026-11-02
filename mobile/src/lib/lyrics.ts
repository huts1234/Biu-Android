export interface LyricLine {
  time: number;
  text: string;
}

/** Parse a standard LRC file into timed lines. */
export function parseLrc(lrc: string): LyricLine[] {
  if (!lrc) return [];

  const lines = lrc.split(/\r?\n/);
  const result: LyricLine[] = [];
  const timeTag = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;

  for (const line of lines) {
    const tags = [...line.matchAll(timeTag)];
    if (!tags.length) continue;

    const text = line.replace(timeTag, "").trim();
    if (!text) continue;

    for (const tag of tags) {
      const minutes = Number(tag[1]);
      const seconds = Number(tag[2]);
      const fraction = tag[3] ? Number(`0.${tag[3]}`) : 0;
      result.push({ time: Math.round((minutes * 60 + seconds + fraction) * 1000), text });
    }
  }

  return result.sort((a, b) => a.time - b.time);
}

/** Binary-search the active line for a playback position in milliseconds. */
export function findActiveLine(lines: LyricLine[], timeMs: number): number {
  if (!lines.length) return -1;

  let low = 0;
  let high = lines.length - 1;
  let found = -1;

  while (low <= high) {
    const mid = (low + high) >> 1;
    if (lines[mid].time <= timeMs) {
      found = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return found;
}
