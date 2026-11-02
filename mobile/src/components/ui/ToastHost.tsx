import { useEffect, useState } from "react";
import { useLocation } from "react-router";

import { RiCheckLine, RiErrorWarningLine, RiInformationLine } from "@remixicon/react";
import { AnimatePresence, motion } from "framer-motion";

import { useToastStore } from "../../store/toast";
import { useUiStore } from "../../store/ui";

const icons = {
  default: <RiInformationLine size={16} />,
  success: <RiCheckLine size={16} />,
  danger: <RiErrorWarningLine size={16} />,
};

const tones = {
  default: "text-white/70",
  success: "text-[#7ee2a8]",
  danger: "text-[#ff9a90]",
};

/**
 * Android style snackbar: bottom anchored, full-width bar above the player /
 * tab bar, one message at a time, auto dismissed by the toast store.
 */
export function ToastHost() {
  const items = useToastStore(state => state.items);
  const dismiss = useToastStore(state => state.dismiss);
  const fullPlayerOpen = useUiStore(state => state.fullPlayerOpen);
  const { pathname } = useLocation();
  const [bottom, setBottom] = useState("calc(var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)) + 16px)");

  useEffect(() => {
    const measure = () => {
      if (fullPlayerOpen) {
        setBottom("calc(var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)) + 16px)");
        return;
      }

      // The shell footer already accounts for the safe area when it is present.
      const footer = document.querySelector<HTMLElement>("[data-shell-footer]");
      const height = footer?.getBoundingClientRect().height ?? 0;
      setBottom(
        height > 0
          ? `${Math.round(height + 12)}px`
          : "calc(var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)) + 16px)",
      );
    };

    measure();
    const footer = document.querySelector<HTMLElement>("[data-shell-footer]");
    const observer = footer && typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : undefined;
    if (footer) observer?.observe(footer);
    window.addEventListener("resize", measure);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [fullPlayerOpen, pathname]);

  const item = items[items.length - 1];

  return (
    <div className="pointer-events-none fixed inset-x-0 z-[120] flex justify-center px-4" style={{ bottom }}>
      <AnimatePresence mode="wait">
        {item && (
          <motion.button
            key={item.id}
            animate={{ opacity: 1, y: 0 }}
            className="pointer-events-auto flex w-full max-w-[560px] items-start gap-3 rounded-[6px] bg-[#2f2f31] px-4 py-3 text-left text-white"
            exit={{ opacity: 0, y: 12 }}
            initial={{ opacity: 0, y: 24 }}
            style={{ boxShadow: "0 6px 18px rgba(0,0,0,.28)" }}
            transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
            type="button"
            onClick={() => dismiss(item.id)}
          >
            <span className={`mt-px shrink-0 ${tones[item.tone]}`}>{icons[item.tone]}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] leading-[20px] font-medium">{item.title}</span>
              {item.description && (
                <span className="mt-0.5 block text-[12px] leading-[16px] text-white/70">{item.description}</span>
              )}
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
