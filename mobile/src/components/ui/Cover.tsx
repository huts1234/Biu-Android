import { useEffect, useState } from "react";

import { RiMusic2Line } from "@remixicon/react";

import { formatMediaUrl } from "../../lib/media";

interface CoverProps {
  src?: string;
  alt?: string;
  /** rendered pixel size hint for the CDN */
  size?: number;
  className?: string;
  rounded?: number | string;
  /** show a soft highlight on top of the artwork */
  glossy?: boolean;
  style?: React.CSSProperties;
}

const gradients = [
  "linear-gradient(135deg,#ff9a9e,#fad0c4)",
  "linear-gradient(135deg,#a18cd1,#fbc2eb)",
  "linear-gradient(135deg,#84fab0,#8fd3f4)",
  "linear-gradient(135deg,#ffecd2,#fcb69f)",
  "linear-gradient(135deg,#5ee7df,#b490ca)",
  "linear-gradient(135deg,#c3cfe2,#f5f7fa)",
  "linear-gradient(135deg,#f6d365,#fda085)",
  "linear-gradient(135deg,#89f7fe,#66a6ff)",
];

function pickGradient(seed?: string) {
  if (!seed) return gradients[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return gradients[hash % gradients.length];
}

export function Cover({ src, alt, size, className = "", rounded = 8, glossy = false, style }: CoverProps) {
  const url = formatMediaUrl(src, size ? Math.max(size, 160) : undefined);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [url]);

  const radius = typeof rounded === "number" ? `${rounded}px` : rounded;

  return (
    <div
      className={`bg-fill relative overflow-hidden ${className}`}
      style={{ borderRadius: radius, background: url && !failed ? undefined : pickGradient(alt ?? url), ...style }}
    >
      {url && !failed ? (
        <img
          alt={alt ?? ""}
          className={`h-full w-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
          decoding="async"
          loading="lazy"
          referrerPolicy="no-referrer"
          src={url}
          onError={() => setFailed(true)}
          onLoad={() => setLoaded(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-white/70">
          <RiMusic2Line size={Math.max(18, Math.min(40, (size ?? 64) / 2.6))} />
        </div>
      )}

      {glossy && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            borderRadius: radius,
            background: "linear-gradient(160deg,rgba(255,255,255,.28),rgba(255,255,255,0) 46%)",
          }}
        />
      )}
    </div>
  );
}
