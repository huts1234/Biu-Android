import type { ReactNode } from "react";

import { RiArrowRightSLine } from "@remixicon/react";

/* ------------------------------------------------------------------ */
/*  Grouped list (iOS Settings look)                                   */
/* ------------------------------------------------------------------ */

export function ListGroup({
  children,
  className = "",
  title,
  footer,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  footer?: ReactNode;
}) {
  return (
    <section className={`px-4 ${className}`}>
      {title && <h2 className="text-label-2 mb-2 ml-4 text-[13px] font-normal tracking-[0.02em] uppercase">{title}</h2>}
      <div className="bg-surface overflow-hidden rounded-[14px]">{children}</div>
      {footer && <p className="text-footnote text-label-2 mt-2 ml-4">{footer}</p>}
    </section>
  );
}

interface ListRowProps {
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  value?: ReactNode;
  accessory?: ReactNode;
  chevron?: boolean;
  onClick?: () => void;
  danger?: boolean;
  className?: string;
  /** hide the bottom separator (last row) */
  last?: boolean;
  disabled?: boolean;
}

export function ListRow({
  icon,
  title,
  subtitle,
  value,
  accessory,
  chevron = false,
  onClick,
  danger = false,
  className = "",
  last = false,
  disabled = false,
}: ListRowProps) {
  const interactive = Boolean(onClick) && !disabled;
  const Comp = interactive ? "button" : "div";

  return (
    <Comp
      className={`relative flex min-h-[48px] w-full items-center gap-3 px-4 text-left ${
        interactive ? "pressable-soft" : ""
      } ${disabled ? "opacity-45" : ""} ${className}`}
      {...(interactive ? { type: "button" as const, onClick } : {})}
    >
      {icon && <span className="flex w-7 shrink-0 items-center justify-center">{icon}</span>}
      <span className="min-w-0 flex-1 py-[11px]">
        <span
          className={`block truncate text-[17px] leading-[22px] ${danger ? "text-ios-red" : "text-label"}`}
          style={{ letterSpacing: "-0.15px" }}
        >
          {title}
        </span>
        {subtitle && <span className="text-footnote text-label-2 mt-0.5 block truncate">{subtitle}</span>}
      </span>
      {value && <span className="text-label-2 shrink-0 text-[17px]">{value}</span>}
      {accessory}
      {chevron && <RiArrowRightSLine className="text-label-3 shrink-0" size={20} />}
      {!last && (
        <span className="bg-separator absolute right-0 bottom-0 left-4 h-px" style={{ transform: "scaleY(0.5)" }} />
      )}
    </Comp>
  );
}

/* ------------------------------------------------------------------ */
/*  Media section header                                               */
/* ------------------------------------------------------------------ */

export function SectionHeader({
  title,
  subtitle,
  action,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mb-3 flex items-end justify-between gap-3 px-4 ${className}`}>
      <div className="min-w-0">
        <h2 className="section-title text-label truncate">{title}</h2>
        {subtitle && <p className="text-footnote text-label-2 mt-0.5 truncate">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty state                                                       */
/* ------------------------------------------------------------------ */

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-10 py-20 text-center">
      {icon && (
        <div className="bg-fill text-label-2 mb-4 flex h-16 w-16 items-center justify-center rounded-full">{icon}</div>
      )}
      <h3 className="text-label text-[19px] font-semibold">{title}</h3>
      {description && <p className="text-subhead text-label-2 mt-1.5 max-w-[280px]">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Pills / badges                                                     */
/* ------------------------------------------------------------------ */

export function Badge({
  children,
  tone = "fill",
}: {
  children: ReactNode;
  tone?: "fill" | "tint" | "lossless" | "vip";
}) {
  const style =
    tone === "tint"
      ? "bg-tint/12 text-tint"
      : tone === "lossless"
        ? "bg-[#ffd60a]/16 text-[#b58900] dark:text-[#ffd60a]"
        : tone === "vip"
          ? "bg-[#ff375f]/12 text-tint"
          : "bg-fill text-label-2";
  return (
    <span className={`inline-flex h-[20px] items-center rounded-[6px] px-1.5 text-[11px] font-semibold ${style}`}>
      {children}
    </span>
  );
}
