import { useRef, type PointerEvent as ReactPointerEvent } from "react";

import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

/**
 * Touch friendly long-press with click suppression.
 *
 * The returned handlers are meant to be spread on the same element that would
 * normally receive the click. When the press turns into a long press the click
 * that follows is swallowed so the action sheet does not also start playback.
 */
export function useLongPress(onLongPress?: () => void, onClick?: () => void, delay = 460) {
  const timer = useRef<number | null>(null);
  const origin = useRef({ x: 0, y: 0 });
  const suppressClick = useRef(false);
  const swallowListener = useRef<((event: MouseEvent) => void) | null>(null);
  const swallowTimer = useRef<number | null>(null);

  const clearTimer = () => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  };

  /*
   * The action sheet opens while the finger is still down. On touch devices
   * the following click is resolved against the newly mounted backdrop, which
   * would close the sheet immediately, so the first click is swallowed in the
   * capture phase (before it reaches React).
   */
  const stopSwallow = () => {
    if (swallowTimer.current !== null) {
      window.clearTimeout(swallowTimer.current);
      swallowTimer.current = null;
    }
    if (swallowListener.current) {
      window.removeEventListener("click", swallowListener.current, true);
      swallowListener.current = null;
    }
  };

  const startSwallow = () => {
    stopSwallow();
    const handler = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      stopSwallow();
    };
    swallowListener.current = handler;
    window.addEventListener("click", handler, true);
    // Fail-safe in case no click / pointerup ever arrives.
    swallowTimer.current = window.setTimeout(stopSwallow, 8000);
  };

  const scheduleStopSwallow = () => {
    if (!swallowListener.current) return;
    if (swallowTimer.current !== null) window.clearTimeout(swallowTimer.current);
    swallowTimer.current = window.setTimeout(stopSwallow, 400);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (!onLongPress || event.button !== 0) return;

    stopSwallow();
    suppressClick.current = false;
    origin.current = { x: event.clientX, y: event.clientY };
    clearTimer();

    timer.current = window.setTimeout(() => {
      timer.current = null;
      suppressClick.current = true;
      startSwallow();
      // Android long-press convention: confirm the gesture with a short buzz
      // before opening the context sheet.
      if (Capacitor.isNativePlatform()) {
        void Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {
          /* haptics unavailable */
        });
      }
      onLongPress();
    }, delay);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (timer.current === null) return;
    const dx = Math.abs(event.clientX - origin.current.x);
    const dy = Math.abs(event.clientY - origin.current.y);
    if (dx > 10 || dy > 10) clearTimer();
  };

  const onPointerUp = () => {
    clearTimer();
    scheduleStopSwallow();
  };

  const onPointerCancel = () => {
    clearTimer();
    suppressClick.current = false;
    stopSwallow();
  };

  const onPointerLeave = () => clearTimer();

  const handleClick = () => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    onClick?.();
  };

  return { onClick: handleClick, onPointerCancel, onPointerDown, onPointerLeave, onPointerMove, onPointerUp };
}
