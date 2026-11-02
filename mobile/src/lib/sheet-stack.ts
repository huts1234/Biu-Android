/**
 * Tracks mounted bottom sheets so the Android back button can dismiss the
 * topmost one (including page-local confirm dialogs) before navigating.
 */
const openSheets: Array<() => void> = [];

/** Register an open sheet; returns the matching cleanup function. */
export function registerSheet(close: () => void): () => void {
  openSheets.push(close);
  return () => {
    const index = openSheets.lastIndexOf(close);
    if (index >= 0) openSheets.splice(index, 1);
  };
}

/** Dismiss the most recently opened sheet. */
export function closeTopSheet(): boolean {
  const close = openSheets[openSheets.length - 1];
  if (!close) return false;
  close();
  return true;
}
