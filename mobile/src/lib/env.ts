declare const __APP_TARGET__: "phone" | "pad";
declare const __APP_VERSION__: string;
declare const __DEV_PROXY__: boolean;

export type AppTarget = "phone" | "pad";

/** Target baked into the current web bundle (see vite.config.ts). */
export const BUILD_TARGET: AppTarget = __APP_TARGET__;
export const APP_VERSION: string = __APP_VERSION__;
export const IS_DEV_PROXY: boolean = __DEV_PROXY__;
