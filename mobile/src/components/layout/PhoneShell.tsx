import { useLocation } from "react-router";

import { AppRoutes } from "../../routes";
import { MiniPlayer } from "../music/MiniPlayer";
import { TabBar } from "../music/TabBar";

const TAB_ROOTS = ["/", "/search", "/library"];

export function PhoneShell() {
  const { pathname } = useLocation();
  const showTabs = TAB_ROOTS.some(root => (root === "/" ? pathname === "/" : pathname.startsWith(root)));

  return (
    <div className="bg-bg flex h-full flex-col overflow-hidden">
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <AppRoutes />
      </div>

      <footer className={`relative z-20 shrink-0 ${showTabs ? "" : "pb-safe"}`} data-shell-footer>
        <MiniPlayer />
        {showTabs && <TabBar />}
      </footer>
    </div>
  );
}
