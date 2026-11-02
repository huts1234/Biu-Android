import { useEffect, useRef, useState, type ReactNode, type TouchEvent as ReactTouchEvent } from "react";

import { RiArrowDownLine, RiLoader4Line } from "@remixicon/react";

import { BackButton } from "./Buttons";

interface ScreenProps {
  title: string;
  subtitle?: string;
  largeTitle?: boolean;
  onBack?: () => void;
  right?: ReactNode;
  children: ReactNode;
  /** extra space reserved below the content (player bar, tab bar…) */
  bottomInset?: number;
  className?: string;
  contentClassName?: string;
  /** hide the compact top bar entirely */
  transparentBar?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
}

/**
 * An iOS-style page: a large title inside the scroll view plus a compact,
 * translucent navigation bar that fades in once the title scrolls away.
 */
export function Screen({
  title,
  subtitle,
  largeTitle = true,
  onBack,
  right,
  children,
  bottomInset = 0,
  className = "",
  contentClassName = "",
  transparentBar = false,
  onRefresh,
  refreshing = false,
}: ScreenProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [elevated, setElevated] = useState(!largeTitle);
  const frame = useRef(0);

  // Pull-to-refresh state. Android has no rubber-band scrolling, so the page
  // grows a refresh row while the finger is dragged down from the very top.
  const [pull, setPull] = useState(0);
  const pullValue = useRef(0);
  const pullStart = useRef<number | null>(null);
  const pulling = useRef(false);
  const PULL_THRESHOLD = 56;

  const updatePull = (value: number) => {
    pullValue.current = value;
    setPull(value);
  };

  useEffect(() => {
    setElevated(!largeTitle);
    const el = scrollerRef.current;
    if (el) el.scrollTop = 0;
    updatePull(0);
  }, [title, largeTitle]);

  useEffect(() => {
    // Re-tapping the active bottom tab scrolls the current page to the top.
    const onScrollTop = () => scrollerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    window.addEventListener("biu:scroll-top", onScrollTop);
    return () => window.removeEventListener("biu:scroll-top", onScrollTop);
  }, []);

  const handleScroll = () => {
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const top = scrollerRef.current?.scrollTop ?? 0;
      setElevated(!largeTitle || top > 34);
    });
  };

  const handleTouchStart = (event: ReactTouchEvent<HTMLDivElement>) => {
    if (!onRefresh || refreshing) return;
    if ((scrollerRef.current?.scrollTop ?? 1) > 0) return;
    pullStart.current = event.touches[0]?.clientY ?? null;
    pulling.current = pullStart.current !== null;
  };

  const handleTouchMove = (event: ReactTouchEvent<HTMLDivElement>) => {
    if (!pulling.current || pullStart.current === null) return;

    if ((scrollerRef.current?.scrollTop ?? 0) > 0) {
      pulling.current = false;
      pullStart.current = null;
      updatePull(0);
      return;
    }

    const dy = (event.touches[0]?.clientY ?? pullStart.current) - pullStart.current;
    if (dy <= 0) {
      updatePull(0);
      return;
    }

    // Resistance makes the row feel like it is being pulled, not dragged.
    updatePull(Math.min(96, dy * 0.5));
  };

  const handleTouchEnd = () => {
    if (!pulling.current) return;
    pulling.current = false;
    pullStart.current = null;
    if (pullValue.current >= PULL_THRESHOLD) onRefresh?.();
    updatePull(0);
  };

  const pullHeight = refreshing ? 44 : pull;
  const pullLabel = refreshing ? "正在刷新…" : pull >= PULL_THRESHOLD ? "松开刷新" : "下拉刷新";

  return (
    <div className={`relative h-full overflow-hidden ${className}`}>
      <div
        ref={scrollerRef}
        className={`scroll-y h-full ${contentClassName}`}
        onScroll={handleScroll}
        onTouchCancel={handleTouchEnd}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onTouchStart={handleTouchStart}
      >
        <div className="pt-safe" />

        {onRefresh && (
          <div
            className="text-label-3 flex items-end justify-center overflow-hidden text-[12px]"
            style={{
              height: pullHeight,
              transition: pulling.current ? "none" : "height 0.2s var(--ease-out-ios)",
            }}
          >
            <div className="flex items-center gap-1.5 pb-1.5">
              {refreshing ? (
                <RiLoader4Line className="animate-spin" size={15} />
              ) : (
                <RiArrowDownLine
                  size={15}
                  style={{
                    transform: pull >= PULL_THRESHOLD ? "rotate(180deg)" : "none",
                    transition: "transform 0.16s linear",
                  }}
                />
              )}
              <span>{pullLabel}</span>
            </div>
          </div>
        )}

        {largeTitle ? (
          <header className="px-4 pb-5" style={{ paddingTop: onBack ? 52 : 12 }}>
            <h1 className="text-large-title text-label">{title}</h1>
            {subtitle && <p className="text-subhead text-label-2 mt-1">{subtitle}</p>}
          </header>
        ) : (
          <div className="h-[52px]" />
        )}

        {children}

        <div style={{ height: bottomInset ? bottomInset : "var(--shell-bottom, 0px)" }} />
      </div>

      {!transparentBar && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-30">
          <div
            className="transition-colors duration-300"
            style={{
              background: elevated ? "var(--glass-strong)" : "transparent",
              paddingTop: "var(--safe-area-inset-top, env(safe-area-inset-top, 0px))",
            }}
          >
            <div
              className="pointer-events-auto relative flex h-[44px] items-center px-2"
              style={{
                backdropFilter: elevated ? "saturate(180%) blur(24px)" : undefined,
                WebkitBackdropFilter: elevated ? "saturate(180%) blur(24px)" : undefined,
              }}
            >
              <div className="flex min-w-[64px] items-center">
                {onBack ? <BackButton onClick={onBack} label="" /> : null}
              </div>

              <div
                className="pointer-events-none absolute inset-x-16 flex items-center justify-center transition-opacity duration-200"
                style={{ opacity: elevated ? 1 : 0 }}
              >
                <span className="text-label truncate text-[17px] font-semibold" style={{ letterSpacing: "-0.2px" }}>
                  {title}
                </span>
              </div>

              <div className="ml-auto flex items-center gap-1">{right}</div>
            </div>
            <div
              className="bg-separator h-px transition-opacity duration-200"
              style={{ opacity: elevated ? 1 : 0, transform: "scaleY(0.5)" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
