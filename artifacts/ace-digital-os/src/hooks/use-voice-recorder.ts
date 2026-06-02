import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceRecorderState = "idle" | "recording" | "unsupported";

const MAX_RECORD_SECONDS = 120;

function pickMimeType(): string {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  for (const mime of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  return "audio/webm";
}

export function useVoiceRecorder() {
  const [state, setState] = useState<VoiceRecorderState>(() =>
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined"
      ? "idle"
      : "unsupported",
  );
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeRef = useRef("audio/webm");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => () => cleanupStream(), [cleanupStream]);

  const stop = useCallback((): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        reject(new Error("Not recording"));
        return;
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeRef.current });
        cleanupStream();
        setState("idle");
        setSeconds(0);
        resolve(blob);
      };
      recorder.onerror = () => {
        cleanupStream();
        setState("idle");
        setSeconds(0);
        reject(new Error("Recording failed"));
      };
      try {
        recorder.stop();
      } catch (err) {
        cleanupStream();
        setState("idle");
        setSeconds(0);
        reject(err instanceof Error ? err : new Error("Could not stop recording"));
      }
    });
  }, [cleanupStream]);

  const start = useCallback(async () => {
    if (state === "unsupported") {
      throw new Error("Voice messages are not supported in this browser");
    }
    cleanupStream();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    mimeRef.current = pickMimeType();
    const recorder = new MediaRecorder(stream, { mimeType: mimeRef.current });
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.start(200);
    recorderRef.current = recorder;
    setSeconds(0);
    setState("recording");
    timerRef.current = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
  }, [cleanupStream, state]);

  useEffect(() => {
    if (state === "recording" && seconds >= MAX_RECORD_SECONDS) {
      void stop();
    }
  }, [state, seconds, stop]);

  const cancel = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.onstop = null;
      try {
        recorderRef.current.stop();
      } catch {
        /* ignore */
      }
    }
    cleanupStream();
    setState("idle");
    setSeconds(0);
  }, [cleanupStream]);

  return { state, seconds, start, stop, cancel, maxSeconds: MAX_RECORD_SECONDS };
}
