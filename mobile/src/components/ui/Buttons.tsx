import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";

import { RiArrowLeftSLine } from "@remixicon/react";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
  size?: number;
  /** visual style */
  variant?: "plain" | "fill" | "glass";
  tint?: string;
}

export function IconButton({
  label,
  children,
  size = 36,
  variant = "plain",
  tint,
  className = "",
  style,
  ...rest
}: IconButtonProps) {
  const base =
    variant === "fill"
      ? "bg-fill text-label"
      : variant === "glass"
        ? "glass-thin text-label shadow-[0_1px_8px_rgba(0,0,0,.08)]"
        : "text-label";

  return (
    <button
      aria-label={label}
      className={`pressable inline-flex items-center justify-center rounded-full ${base} ${className}`}
      style={{ width: size, height: size, color: tint, ...style }}
      type="button"
      {...rest}
    >
      {children}
    </button>
  );
}

interface BackButtonProps {
  onClick?: () => void;
  label?: string;
}

export function BackButton({ onClick, label = "返回" }: BackButtonProps) {
  return (
    <button
      aria-label={label}
      className="pressable text-tint -ml-1.5 flex items-center"
      style={{ fontSize: 17, fontWeight: 400 }}
      type="button"
      onClick={onClick}
    >
      <RiArrowLeftSLine size={30} />
      <span className="-ml-1">{label}</span>
    </button>
  );
}

export function PrimaryButton({
  children,
  className = "",
  style,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; style?: CSSProperties }) {
  return (
    <button
      className={`pressable h-12 w-full rounded-[14px] text-[17px] font-semibold text-white ${className}`}
      style={{ background: "var(--tint)", ...style }}
      type="button"
      {...rest}
    >
      {children}
    </button>
  );
}

export function TextButton({
  children,
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button className={`pressable text-tint text-[17px] ${className}`} type="button" {...rest}>
      {children}
    </button>
  );
}
