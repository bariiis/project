"use client";

import { useEffect, useRef, useState } from "react";

/** Renders a block preview at a fixed desktop viewport and scales it down to fit its box. */
export function ScaledFrame({
  src,
  title,
  viewport = 1440,
  height = 900,
  interactive = false,
}: {
  src: string;
  title: string;
  viewport?: number;
  height?: number;
  interactive?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setScale(entry!.contentRect.width / viewport));
    observer.observe(el);
    return () => observer.disconnect();
  }, [viewport]);

  return (
    <div ref={box} className="relative w-full overflow-hidden bg-ink-2" style={{ aspectRatio: `${viewport} / ${height}` }}>
      {scale > 0 && (
        <iframe
          src={src}
          title={title}
          loading="lazy"
          sandbox="allow-scripts"
          tabIndex={interactive ? 0 : -1}
          className="absolute top-0 left-0 origin-top-left border-0"
          style={{ width: viewport, height, transform: `scale(${scale})`, pointerEvents: interactive ? "auto" : "none" }}
        />
      )}
    </div>
  );
}
