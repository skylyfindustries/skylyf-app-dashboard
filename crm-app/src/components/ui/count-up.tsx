import { useEffect, useRef, useState } from "react";

/** Animates a number (or a formatted string containing one, e.g. "₹1,20,000") from 0 to its value. */
export function CountUp({ value, duration = 900 }: { value: string | number; duration?: number }) {
  const text = String(value);
  const match = text.match(/-?[\d,]+(\.\d+)?/);
  const [progress, setProgress] = useState(0);
  const raf = useRef(0);

  useEffect(() => {
    if (!match || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setProgress(1);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setProgress(1 - Math.pow(1 - t, 3));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    setProgress(0);
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [text, duration]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!match) return <>{text}</>;
  const target = Number(match[0].replace(/,/g, ""));
  const decimals = match[1] ? match[1].length - 1 : 0;
  const current = target * progress;
  const shown = text.includes(",")
    ? current.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : current.toFixed(decimals);
  return <>{text.replace(match[0], shown)}</>;
}
