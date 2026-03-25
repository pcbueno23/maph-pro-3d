"use client";

import { useEffect, useMemo, useRef, useState } from "react";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function formatPtBrInteger(n: number) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(n);
}

export function CountUp({
  to,
  suffix,
  durationMs = 900,
  startOnView = true,
}: {
  to: number;
  suffix?: string;
  durationMs?: number;
  startOnView?: boolean;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [started, setStarted] = useState(!startOnView);
  const [value, setValue] = useState(startOnView ? 0 : to);

  const target = useMemo(() => (Number.isFinite(to) ? to : 0), [to]);

  useEffect(() => {
    if (!startOnView) return;
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setStarted(true);
          obs.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [startOnView]);

  useEffect(() => {
    if (!started) return;
    const start = performance.now();

    let raf = 0;
    const tick = (now: number) => {
      const t = clamp((now - start) / durationMs, 0, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(eased * target));
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [durationMs, started, target]);

  return (
    <span ref={ref} className="tabular-nums">
      {formatPtBrInteger(value)}
      {suffix ?? ""}
    </span>
  );
}

