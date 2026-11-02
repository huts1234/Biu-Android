import { useLocation, useNavigate } from "react-router";

import { RiAlbumFill, RiAlbumLine, RiCompass3Fill, RiCompass3Line, RiSearchFill, RiSearchLine } from "@remixicon/react";

const tabs = [
  { path: "/", label: "发现", icon: RiCompass3Line, activeIcon: RiCompass3Fill },
  { path: "/search", label: "搜索", icon: RiSearchLine, activeIcon: RiSearchFill },
  { path: "/library", label: "资料库", icon: RiAlbumLine, activeIcon: RiAlbumFill },
];

export function TabBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <div className="glass-strong border-separator pb-safe relative z-20 border-t">
      <div className="flex h-[50px] items-stretch">
        {tabs.map(tab => {
          const active = tab.path === "/" ? pathname === "/" : pathname.startsWith(tab.path);
          const Icon = active ? tab.activeIcon : tab.icon;

          return (
            <button
              key={tab.path}
              aria-current={active ? "page" : undefined}
              className="pressable flex flex-1 flex-col items-center justify-center gap-0.5"
              style={{ color: active ? "var(--tint)" : "var(--label-2)" }}
              type="button"
              onClick={() => {
                // Android bottom navigation: tapping the current tab again
                // returns the page to the top instead of reloading it.
                if (active) {
                  window.dispatchEvent(new Event("biu:scroll-top"));
                  return;
                }
                navigate(tab.path);
              }}
            >
              <Icon size={25} />
              <span className="text-[10px] font-medium" style={{ letterSpacing: "0.05px" }}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
