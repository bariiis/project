"use client";

import { useEffect, useRef, useState } from "react";

const MIN_HEIGHT = 200;
const MAX_HEIGHT = 2400;

/**
 * Renders a block preview at a desktop viewport of at least `viewport` px and scales it down to
 * fit its box. Wider boxes (large or 4K screens) widen the viewport instead of upscaling it.
 * With `autoHeight`, the frame takes the height the preview reports (`ps:height` messages from
 * the runtime injected by /api/preview), so stacked blocks read as one continuous page.
 */
export function ScaledFrame({
  src,
  title,
  viewport = 1440,
  height = 900,
  interactive = false,
  autoHeight = false,
}: {
  src: string;
  title: string;
  viewport?: number;
  height?: number;
  interactive?: boolean;
  autoHeight?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [boxWidth, setBoxWidth] = useState(0);
  const [frameHeight, setFrameHeight] = useState(height);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setBoxWidth(entry!.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const frameWidth = Math.max(viewport, Math.round(boxWidth));
  const scale = boxWidth / frameWidth;

  useEffect(() => {
    if (!autoHeight) return;
    function onMessage(event: MessageEvent) {
      if (event.source !== frame.current?.contentWindow) return;
      const data = event.data as { type?: string; height?: unknown };
      if (data?.type !== "ps:height" || typeof data.height !== "number") return;
      setFrameHeight(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.round(data.height))));
    }
    addEventListener("message", onMessage);
    return () => removeEventListener("message", onMessage);
  }, [autoHeight]);

  return (
    <div ref={box} className="relative w-full overflow-hidden bg-ink-2" style={{ aspectRatio: `${frameWidth} / ${frameHeight}` }}>
      {scale > 0 && (
        <iframe
          ref={frame}
          src={src}
          title={title}
          loading="lazy"
          sandbox="allow-scripts"
          tabIndex={interactive ? 0 : -1}
          className="absolute top-0 left-0 origin-top-left border-0"
          style={{ width: frameWidth, height: frameHeight, transform: `scale(${scale})`, pointerEvents: interactive ? "auto" : "none" }}
        />
      )}
    </div>
  );
}
