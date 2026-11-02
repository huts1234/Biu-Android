import { NavLink, useLocation } from "react-router";

import {
  RiAlbumFill,
  RiAlbumLine,
  RiCompass3Fill,
  RiCompass3Line,
  RiMusic2Line,
  RiSearchFill,
  RiSearchLine,
  RiSettings3Fill,
  RiSettings3Line,
} from "@remixicon/react";

import { APP_VERSION } from "../../lib/env";
import { AppRoutes } from "../../routes";
import { MiniPlayer } from "../music/MiniPlayer";
import { NowPlayingPanel } from "../player/NowPlayingPanel";

const primary = [
  { to: "/", label: "发现", icon: RiCompass3Line, activeIcon: RiCompass3Fill },
  { to: "/search", label: "搜索", icon: RiSearchLine, activeIcon: RiSearchFill },
  { to: "/library", label: "资料库", icon: RiAlbumLine, activeIcon: RiAlbumFill },
];

function NavItem({
  to,
  label,
  icon: Icon,
  activeIcon: ActiveIcon,
  end = false,
}: {
  to: string;
  label: string;
  icon: typeof RiCompass3Line;
  activeIcon: typeof RiCompass3Line;
  end?: boolean;
}) {
  const { pathname } = useLocation();
  const active = to === "/" ? pathname === "/" : pathname.startsWith(to);

  return (
    <NavLink
      className={({ isActive }) =>
        `pressable-soft flex h-10 items-center gap-3 rounded-[9px] px-3 text-[15px] font-medium ${
          isActive ? "bg-tint/12 text-tint" : "text-label"
        }`
      }
      end={end}
      to={to}
      onClick={event => {
        // Android: re-tapping the current destination returns to the top
        // instead of pushing a duplicate history entry.
        if (!active) return;
        event.preventDefault();
        window.dispatchEvent(new Event("biu:scroll-top"));
      }}
    >
      {({ isActive }) => {
        const IconComponent = isActive ? ActiveIcon : Icon;
        return (
          <>
            <IconComponent size={19} />
            {label}
          </>
        );
      }}
    </NavLink>
  );
}

export function PadShell() {
  return (
    <div className="bg-bg flex h-full overflow-hidden">
      <aside className="border-separator bg-surface/55 pt-safe pb-safe flex w-[228px] shrink-0 flex-col border-r px-3">
        <div className="flex items-center gap-2.5 px-3 pt-5 pb-5">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-[10px] text-white"
            style={{ background: "linear-gradient(135deg,#ff375f,#ff9f0a)" }}
          >
            <RiMusic2Line size={20} />
          </div>
          <div>
            <div className="text-label text-[17px] leading-[20px] font-bold" style={{ letterSpacing: "-0.3px" }}>
              Biu
            </div>
            <div className="text-label-3 text-[11px]">for Pad</div>
          </div>
        </div>

        <nav className="flex flex-col gap-0.5">
          {primary.map(item => (
            <NavItem key={item.to} end={item.to === "/"} {...item} />
          ))}
        </nav>

        <div className="bg-separator my-3 h-px" />

        <nav className="flex flex-col gap-0.5">
          <NavItem to="/settings" activeIcon={RiSettings3Fill} icon={RiSettings3Line} label="设置" />
        </nav>

        <div className="text-label-3 mt-auto px-3 pb-2 text-[11px]">Biu {APP_VERSION}</div>
      </aside>

      <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <AppRoutes />
        </div>
        {/* Without the now-playing panel, keep playback controls reachable. */}
        <div className="pb-safe shrink-0 min-[1100px]:hidden" data-shell-footer>
          <MiniPlayer />
        </div>
      </main>

      <NowPlayingPanel />
    </div>
  );
}
