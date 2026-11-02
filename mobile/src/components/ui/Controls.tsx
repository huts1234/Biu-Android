import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { clamp } from "../../lib/media";

/* ------------------------------------------------------------------ */
/*  Slider — iOS style track with a thumb that grows while dragging     */
/* ------------------------------------------------------------------ */

interface SliderProps {
  value: number;
  max: number;
  min?: number;
  onChange: (value: number) => void;
  onCommit?: (value: number) => void;
  tint?: string;
  trackColor?: string;
  height?: number;
  disabled?: boolean;
  ariaLabel?: string;
}

export function Slider({
  value,
  max,
  min = 0,
  onChange,
  onCommit,
  tint = "var(--tint)",
  trackColor = "var(--fill-3)",
  height = 6,
  disabled = false,
  ariaLabel,
}: SliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [local, setLocal] = useState(value);

  useEffect(() => {
    if (!dragging) setLocal(value);
  }, [value, dragging]);

  const ratio = max > min ? clamp((local - min) / (max - min), 0, 1) : 0;

  const updateFromEvent = useCallback(
    (clientX: number) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0) return;
      const next = min + clamp((clientX - rect.left) / rect.width, 0, 1) * (max - min);
      setLocal(next);
      onChange(next);
      return next;
    },
    [max, min, onChange],
  );

  return (
    <div
      aria-label={ariaLabel}
      aria-valuemax={max}
      aria-valuemin={min}
      aria-valuenow={local}
      className={`relative flex items-center ${disabled ? "opacity-40" : ""}`}
      role="slider"
      style={{ height: 28, touchAction: "none" }}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={event => {
        if (disabled) return;
        const step = (max - min) / 40;
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          const next = clamp(local - step, min, max);
          setLocal(next);
          onChange(next);
          onCommit?.(next);
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          const next = clamp(local + step, min, max);
          setLocal(next);
          onChange(next);
          onCommit?.(next);
        }
      }}
      onPointerDown={event => {
        if (disabled) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
        updateFromEvent(event.clientX);
      }}
      onPointerMove={event => {
        if (!dragging) return;
        updateFromEvent(event.clientX);
      }}
      onPointerUp={event => {
        if (!dragging) return;
        setDragging(false);
        event.currentTarget.releasePointerCapture(event.pointerId);
        onCommit?.(local);
      }}
      onPointerCancel={() => {
        setDragging(false);
        onCommit?.(local);
      }}
    >
      <div
        ref={trackRef}
        className="relative w-full overflow-visible rounded-full"
        style={{ height, background: trackColor }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${ratio * 100}%`, background: tint }}
        />
        <div
          className="absolute top-1/2 rounded-full bg-white transition-[width,height] duration-200"
          style={{
            width: dragging ? 22 : 16,
            height: dragging ? 22 : 16,
            left: `calc(${ratio * 100}% - ${(dragging ? 22 : 16) / 2}px)`,
            transform: "translateY(-50%)",
            boxShadow: "0 1px 4px rgba(0,0,0,.28), 0 0 0 0.5px rgba(0,0,0,.06)",
            transitionTimingFunction: "var(--ease-out-ios)",
          }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Switch — 51 × 31 iOS toggle                                        */
/* ------------------------------------------------------------------ */

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  tint?: string;
  label?: string;
}

export function Switch({ checked, onChange, disabled, tint = "var(--green)", label }: SwitchProps) {
  return (
    <button
      aria-checked={checked}
      aria-label={label}
      className={`relative shrink-0 rounded-full transition-colors duration-300 ${disabled ? "opacity-40" : ""}`}
      role="switch"
      style={{
        width: 51,
        height: 31,
        background: checked ? tint : "var(--fill-3)",
        transitionTimingFunction: "var(--ease-ios)",
      }}
      type="button"
      onClick={() => !disabled && onChange(!checked)}
    >
      <span
        className="absolute top-[2px] rounded-full bg-white"
        style={{
          width: 27,
          height: 27,
          left: 2,
          transform: `translateX(${checked ? 20 : 0}px)`,
          transition: "transform .28s var(--ease-ios)",
          boxShadow: "0 2px 6px rgba(0,0,0,.18), 0 0 1px rgba(0,0,0,.12)",
        }}
      />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Segmented control                                                  */
/* ------------------------------------------------------------------ */

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: "sm" | "md";
  fullWidth?: boolean;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className = "",
  size = "md",
  fullWidth = true,
}: SegmentedControlProps<T>) {
  const index = Math.max(
    0,
    options.findIndex(option => option.value === value),
  );

  return (
    <div
      className={`relative rounded-[10px] p-[2px] ${fullWidth ? "flex w-full" : "inline-flex"} ${className}`}
      style={{ background: "var(--fill)" }}
    >
      <div
        className="bg-surface absolute top-[2px] bottom-[2px] rounded-[8px]"
        style={{
          width: `calc((100% - 4px) / ${options.length})`,
          left: 2,
          transform: `translateX(${index * 100}%)`,
          transition: "transform .3s var(--ease-ios)",
          boxShadow: "0 1px 4px rgba(0,0,0,.12), 0 0 0 0.5px rgba(0,0,0,.04)",
        }}
      />
      {options.map(option => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            className={`relative z-10 flex-1 text-center font-medium whitespace-nowrap transition-colors ${
              size === "sm" ? "h-7 px-3 text-[13px]" : "h-8 px-4 text-[15px]"
            } ${selected ? "text-label" : "text-label-2"}`}
            style={{ fontWeight: selected ? 600 : 500, letterSpacing: "-0.1px" }}
            type="button"
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  iOS spinner                                                        */
/* ------------------------------------------------------------------ */

export function Spinner({ size = 20, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg aria-hidden height={size} viewBox="0 0 24 24" width={size}>
      {Array.from({ length: 8 }).map((_, index) => (
        <rect
          key={index}
          fill={color}
          height="6"
          opacity={0.15 + index * 0.1}
          rx="1.2"
          transform={`rotate(${index * 45} 12 12)`}
          width="2.4"
          x="10.8"
          y="1.5"
        >
          <animate
            attributeName="opacity"
            dur="0.9s"
            begin={`${index * 0.1125}s`}
            repeatCount="indefinite"
            values="0.15;1;0.15"
          />
        </rect>
      ))}
    </svg>
  );
}

export function LoadingBlock({ label = "载入中" }: { label?: string }) {
  return (
    <div className="text-label-2 flex flex-col items-center justify-center gap-3 py-16">
      <Spinner size={24} />
      <span className="text-footnote">{label}</span>
    </div>
  );
}

export function Skeleton({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`skeleton ${className}`} style={style} />;
}
