'use client';
import { useEffect, useRef } from 'react';

/**
 * AnimatedNumber — smoothly counts up from 0 to `value` over `duration` ms.
 */
export default function AnimatedNumber({
  value,
  duration = 1200,
  style,
}: {
  value: number;
  duration?: number;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const start = performance.now();
    const from  = 0;
    const to    = value;

    function step(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      el!.textContent = String(Math.round(from + (to - from) * eased));
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }, [value, duration]);

  return <span ref={ref} style={style}>0</span>;
}
