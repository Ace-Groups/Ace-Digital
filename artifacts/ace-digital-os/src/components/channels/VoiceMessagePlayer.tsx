import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceMessagePlayerProps {
  url: string;
  isMe?: boolean;
}

const BAR_COUNT = 28;

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function VoiceMessagePlayer({ url, isMe }: VoiceMessagePlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number>(0);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [bars, setBars] = useState<number[]>(() =>
    Array.from({ length: BAR_COUNT }, (_, i) => 0.25 + (i % 5) * 0.12),
  );

  useEffect(() => {
    const audio = new Audio(url);
    audioRef.current = audio;
    const onMeta = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onTime = () => setCurrent(audio.currentTime);
    const onEnd = () => {
      setPlaying(false);
      setCurrent(0);
      cancelAnimationFrame(rafRef.current);
    };
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.pause();
      cancelAnimationFrame(rafRef.current);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnd);
      audioRef.current = null;
    };
  }, [url]);

  useEffect(() => {
    if (!playing) return;
    let t = 0;
    function tick() {
      t += 0.08;
      setBars(
        Array.from({ length: BAR_COUNT }, (_, i) => {
          const wave = Math.sin(t + i * 0.45) * 0.35 + Math.cos(t * 1.3 + i * 0.2) * 0.25;
          return Math.max(0.15, Math.min(1, 0.45 + wave));
        }),
      );
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing]);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      void audio.play();
      setPlaying(true);
    }
  }

  const progress = duration > 0 ? current / duration : 0;
  const playedBars = Math.floor(progress * BAR_COUNT);

  return (
    <div
      className={cn(
        "flex min-w-[12rem] max-w-[18rem] items-center gap-3 rounded-2xl px-3 py-2.5",
        isMe ? "bg-primary/20" : "bg-muted/80",
      )}
    >
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors",
          isMe ? "bg-primary text-primary-foreground" : "bg-background text-foreground",
        )}
        aria-label={playing ? "Pause voice message" : "Play voice message"}
      >
        {playing ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
      </button>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex h-6 items-end gap-[2px]">
          {bars.map((h, i) => (
            <span
              key={i}
              className={cn(
                "w-[3px] rounded-full transition-[height,background-color]",
                i <= playedBars
                  ? isMe
                    ? "bg-primary"
                    : "bg-primary/80"
                  : isMe
                    ? "bg-primary/30"
                    : "bg-border",
              )}
              style={{ height: `${Math.round(h * 100)}%` }}
            />
          ))}
        </div>
        <p className="text-[11px] tabular-nums text-muted-foreground">
          {formatDuration(playing || current > 0 ? current : duration)}
        </p>
      </div>
    </div>
  );
}
