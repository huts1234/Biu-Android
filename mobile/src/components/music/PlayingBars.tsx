export function PlayingBars({ playing }: { playing: boolean }) {
  return (
    <span aria-hidden className={`eq ${playing ? "" : "is-paused"}`} style={{ width: 14 }}>
      <i style={{ height: 6 }} />
      <i style={{ height: 11 }} />
      <i style={{ height: 8 }} />
    </span>
  );
}
