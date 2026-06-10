import { useEffect, useState } from "react";

/** True when Ace Digital is running as an installed PWA (home screen). */
export function useStandaloneMode(): boolean {
  const [standalone, setStandalone] = useState(() => readStandalone());

  useEffect(() => {
    const mq = window.matchMedia("(display-mode: standalone)");
    const onChange = () => setStandalone(readStandalone());
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return standalone;
}

function readStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}
