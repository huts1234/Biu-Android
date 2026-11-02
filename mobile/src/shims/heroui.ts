/**
 * Minimal `@heroui/react` surface used by the shared modules that the mobile
 * app imports (Geetest helper / play reports). Keeping it tiny avoids pulling
 * the whole desktop UI kit into the Android bundle.
 */
import { useToastStore, type ToastTone } from "../store/toast";

export type ConfigThemes = Record<string, unknown>;

interface AddToastArgs {
  title?: string;
  description?: string;
  color?: ToastTone | "primary" | "warning" | "default";
  timeout?: number;
}

const mapColor = (color?: AddToastArgs["color"]): ToastTone => {
  if (color === "danger" || color === "success") return color;
  return "default";
};

export function addToast({ title, description, color }: AddToastArgs) {
  useToastStore.getState().push({
    title: title ?? "",
    description,
    tone: mapColor(color),
  });
}
