import { useEffect, useRef, type ReactNode } from "react";

import { RiCloseLine } from "@remixicon/react";
import { AnimatePresence, motion } from "framer-motion";

import { registerSheet } from "../../lib/sheet-stack";
import { IconButton } from "./Buttons";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: ReactNode;
  /** css max-height, defaults to 86vh */
  maxHeight?: string;
  showClose?: boolean;
  /** remove inner padding when the sheet renders its own scroll view */
  bare?: boolean;
  zIndex?: number;
}

export function Sheet({
  open,
  onClose,
  children,
  title,
  maxHeight = "86vh",
  showClose = true,
  bare = false,
  zIndex = 60,
}: SheetProps) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    return registerSheet(() => closeRef.current());
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          animate={{ opacity: 1 }}
          className="fixed inset-0"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          style={{ zIndex }}
          transition={{ duration: 0.24 }}
        >
          <div className="absolute inset-0 bg-black/35 backdrop-blur-[2px]" onClick={onClose} />

          <motion.div
            animate={{ y: 0 }}
            className="bg-surface pb-safe absolute inset-x-0 bottom-0 mx-auto w-full max-w-[720px] overflow-hidden rounded-t-[14px] sm:rounded-t-[20px]"
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            exit={{ y: "100%" }}
            initial={{ y: "100%" }}
            style={{ maxHeight, boxShadow: "0 -12px 40px rgba(0,0,0,.18)" }}
            transition={{ type: "spring", stiffness: 380, damping: 38, mass: 0.9 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 130 || info.velocity.y > 750) onClose();
            }}
          >
            <div className="flex h-5 items-center justify-center">
              <div className="bg-fill-3 h-[5px] w-9 rounded-full" />
            </div>

            {(title || showClose) && (
              <div className="relative flex h-11 items-center justify-center px-14">
                {title && <div className="text-label truncate text-[17px] font-semibold">{title}</div>}
                {showClose && (
                  <IconButton className="absolute right-2" label="关闭" size={30} variant="fill" onClick={onClose}>
                    <RiCloseLine size={18} />
                  </IconButton>
                )}
              </div>
            )}

            <div
              className={bare ? "" : "px-5 pb-6"}
              style={{ maxHeight: `calc(${maxHeight} - 64px)`, overflowY: "auto" }}
            >
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface ConfirmSheetProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmSheet({
  open,
  title,
  description,
  confirmLabel = "确定",
  cancelLabel = "取消",
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmSheetProps) {
  return (
    <Sheet open={open} showClose={false} title={undefined} maxHeight="auto" onClose={onCancel}>
      <div className="pb-2 text-center">
        <h3 className="text-label text-[19px] font-semibold">{title}</h3>
        {description && <p className="text-subhead text-label-2 mt-1.5">{description}</p>}
      </div>

      <div className="mt-4 flex gap-2.5 pb-2">
        <button
          className="pressable bg-fill text-label h-12 flex-1 rounded-[13px] text-[16px] font-semibold"
          type="button"
          onClick={onCancel}
        >
          {cancelLabel}
        </button>
        <button
          className="pressable h-12 flex-1 rounded-[13px] text-[16px] font-semibold text-white"
          style={{ background: danger ? "var(--red)" : "var(--tint)" }}
          type="button"
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </Sheet>
  );
}
