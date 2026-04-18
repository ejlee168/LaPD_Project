"use client";

import { useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface Props {
  text: string;
  className?: string;
  maxPx?: number;
  minPx?: number;
  stepPx?: number;
}

export function AutoFitText({
  text,
  className,
  maxPx = 16,
  minPx = 9,
  stepPx = 0.5,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const textEl = textRef.current;
    if (!container || !textEl) return;

    function fit() {
      if (!container || !textEl) return;
      let size = maxPx;
      textEl.style.fontSize = `${size}px`;
      while (
        size > minPx &&
        (textEl.scrollWidth > container.clientWidth ||
          textEl.scrollHeight > container.clientHeight)
      ) {
        size -= stepPx;
        textEl.style.fontSize = `${size}px`;
      }
    }

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(container);
    return () => ro.disconnect();
  }, [text, maxPx, minPx, stepPx]);

  return (
    <div
      ref={containerRef}
      className="flex w-full h-full items-center justify-center overflow-hidden"
    >
      <span
        ref={textRef}
        className={cn("text-center leading-tight [overflow-wrap:anywhere]", className)}
      >
        {text}
      </span>
    </div>
  );
}
