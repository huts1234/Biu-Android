import { useEffect, useState } from "react";

import { BUILD_TARGET, type AppTarget } from "../lib/env";
import { useAppStore } from "../store/app";

/** Below this width the sidebar + content can no longer coexist; use the phone shell. */
export const PAD_MIN_WIDTH = 720;
/** At or above this width the now-playing panel is also shown. */
export const PAD_PANEL_MIN_WIDTH = 1100;

function readQueryTarget(): AppTarget | null {
  try {
    const value = new URLSearchParams(window.location.search).get("ui");
    return value === "phone" || value === "pad" ? value : null;
  } catch {
    return null;
  }
}

/**
 * Works out which shell should be rendered.
 *
 * - a manual choice in Settings always wins
 * - `?ui=phone|pad` is handy while previewing
 * - in the dev server the window width decides, so both layouts can be
 *   reviewed from one `npm run mobile:dev`
 * - a production bundle always uses the flavor it was built for
 */
export function useEffectiveTarget(): AppTarget {
  const uiTarget = useAppStore(state => state.uiTarget);
  const [width, setWidth] = useState(() => (typeof window === "undefined" ? 390 : window.innerWidth));

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  if (uiTarget === "phone") return "phone";

  const chosen: AppTarget =
    uiTarget === "pad"
      ? "pad"
      : (readQueryTarget() ?? (import.meta.env.DEV ? (width >= PAD_MIN_WIDTH ? "pad" : "phone") : BUILD_TARGET));

  // The pad shell needs room for the 228px sidebar. Below that width it would
  // squeeze the content to nothing, so fall back to the phone shell (this also
  // covers phone-sized windows and narrow split-view panes).
  return chosen === "pad" && width < PAD_MIN_WIDTH ? "phone" : chosen;
}
