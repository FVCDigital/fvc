import React, { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  DEMO_TOUR_BEATS,
  DemoTourAction,
  isCaptureMode,
  shouldAutoplayTour,
  tourTimeScale,
} from '@/constants/demoTourBeats';

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface DemoTourProps {
  onAction?: (action: DemoTourAction) => void;
  onBeatChange?: (index: number | null) => void;
  onRecordingChange?: (recording: boolean) => void;
  allowRecord?: boolean;
  light?: boolean;
}

function pickMimeType(): string {
  const options = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  return options.find((type) => MediaRecorder.isTypeSupported(type)) ?? 'video/webm';
}

const PAD = 12;
const RADIUS = 14;
const BRAND = '#6A70E4';

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Window scroll with an ease, stretched by `scale`; native smooth scrolling cannot be slowed. */
function scrollWindowTo(el: HTMLElement, durationMs: number) {
  const rect = el.getBoundingClientRect();
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const from = window.scrollY;
  const to = Math.max(0, Math.min(max, from + rect.top + rect.height / 2 - window.innerHeight / 2));
  const startedAt = performance.now();
  const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const step = (now: number) => {
    const t = Math.min(1, (now - startedAt) / durationMs);
    window.scrollTo(0, from + (to - from) * ease(t));
    if (t < 1) window.requestAnimationFrame(step);
  };
  window.requestAnimationFrame(step);
}

export const DemoTour: React.FC<DemoTourProps> = ({
  onAction,
  onBeatChange,
  onRecordingChange,
  allowRecord = false,
  light = false,
}) => {
  const [beatIndex, setBeatIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [finished, setFinished] = useState(false);
  const [captionVisible, setCaptionVisible] = useState(true);
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [capture, setCapture] = useState(false);
  const [scale, setScale] = useState(1);
  const hideControls = recording || capture;
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const beat = DEMO_TOUR_BEATS[beatIndex];

  useEffect(() => {
    onBeatChange?.(playing || finished ? beatIndex : null);
  }, [beatIndex, playing, finished, onBeatChange]);

  useEffect(() => {
    setCapture(isCaptureMode());
    setScale(tourTimeScale());
  }, []);

  useEffect(() => {
    onRecordingChange?.(hideControls);
    if (!hideControls) return;
    const previous = document.body.style.cursor;
    document.body.style.cursor = 'none';
    return () => {
      document.body.style.cursor = previous;
    };
  }, [hideControls, onRecordingChange]);

  useEffect(() => {
    if (finished) document.documentElement.dataset.tourFinished = 'true';
  }, [finished]);

  const measureTarget = useCallback((targetId: string) => {
    const el = document.querySelector(`[data-tour-id="${targetId}"]`) as HTMLElement | null;
    if (!el) {
      setSpotlight(null);
      return;
    }

    if (scale !== 1) {
      scrollWindowTo(el, 700 * scale);
    } else {
      el.scrollIntoView({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    }

    const rect = el.getBoundingClientRect();
    setSpotlight({
      top: Math.max(8, rect.top - PAD),
      left: Math.max(8, rect.left - PAD),
      width: Math.min(window.innerWidth - 16, rect.width + PAD * 2),
      height: rect.height + PAD * 2,
    });
  }, [scale]);

  const goToBeat = useCallback(
    (index: number) => {
      const next = DEMO_TOUR_BEATS[index];
      if (!next) return;

      setCaptionVisible(false);
      window.setTimeout(() => {
        if (next.action) onAction?.(next.action);
        setBeatIndex(index);
        setCaptionVisible(true);
        measureTarget(next.targetId);
      }, 160 * scale);
    },
    [measureTarget, onAction, scale]
  );

  const start = useCallback(() => {
    setFinished(false);
    setPlaying(true);
    goToBeat(0);
  }, [goToBeat]);

  const restart = useCallback(() => {
    onAction?.('select-loan-1');
    setFinished(false);
    setPlaying(true);
    goToBeat(0);
  }, [goToBeat, onAction]);

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
  }, []);

  const record = useCallback(async () => {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 60, width: 1920, height: 1080, cursor: 'never' },
        audio: false,
        preferCurrentTab: true,
      } as DisplayMediaStreamOptions);
    } catch (error) {
      const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      console.warn('Recording did not start', message);
      setRecordError(message);
      return;
    }
    setRecordError(null);

    chunksRef.current = [];
    const recorder = new MediaRecorder(stream, {
      mimeType: pickMimeType(),
      videoBitsPerSecond: 12_000_000,
    });
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `fvc-portfolio-tour-${new Date().toISOString().slice(0, 10)}.webm`;
      link.click();
      URL.revokeObjectURL(url);
      recorderRef.current = null;
      setRecording(false);
    };
    stream.getVideoTracks()[0]?.addEventListener('ended', () => {
      setPlaying(false);
      stopRecording();
    });

    recorderRef.current = recorder;
    setRecording(true);
    recorder.start(1000);
    onAction?.('select-loan-1');
    // Let the share prompt close before the first beat is captured
    window.setTimeout(() => {
      setFinished(false);
      setPlaying(true);
      goToBeat(0);
    }, 1200);
  }, [goToBeat, onAction, stopRecording]);

  useEffect(() => {
    if (finished && recording) {
      const timer = window.setTimeout(stopRecording, 1500);
      return () => window.clearTimeout(timer);
    }
  }, [finished, recording, stopRecording]);

  useEffect(() => {
    if (!shouldAutoplayTour()) return;
    const timer = window.setTimeout(() => start(), isCaptureMode() ? 2500 * tourTimeScale() : 700);
    return () => window.clearTimeout(timer);
  }, [start]);

  useEffect(() => {
    if (!playing || finished) return;
    const timer = window.setTimeout(() => {
      const nextIndex = beatIndex + 1;
      if (nextIndex >= DEMO_TOUR_BEATS.length) {
        setPlaying(false);
        setFinished(true);
        return;
      }
      goToBeat(nextIndex);
    }, beat.durationMs * scale);
    return () => window.clearTimeout(timer);
  }, [playing, finished, beatIndex, beat.durationMs, goToBeat, scale]);

  useEffect(() => {
    if (!playing && !finished) return;
    let frame = 0;
    let running = true;
    const tick = () => {
      if (!running) return;
      const el = document.querySelector(
        `[data-tour-id="${beat.targetId}"]`
      ) as HTMLElement | null;
      if (el) {
        const rect = el.getBoundingClientRect();
        setSpotlight({
          top: Math.max(8, rect.top - PAD),
          left: Math.max(8, rect.left - PAD),
          width: Math.min(window.innerWidth - 16, rect.width + PAD * 2),
          height: rect.height + PAD * 2,
        });
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    const onResize = () => measureTarget(beat.targetId);
    window.addEventListener('resize', onResize);
    return () => {
      running = false;
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
    };
  }, [playing, finished, beat.targetId, measureTarget]);

  const showOverlay = playing || finished;

  return (
    <>
      {recordError && !recording && (
        <span className="max-w-[260px] text-[11px] text-amber-400" role="alert">
          Recording did not start ({recordError})
        </span>
      )}
      <div className={cn('flex items-center gap-2', hideControls && 'invisible')}>
        {allowRecord && !playing && (
          <button
            type="button"
            onClick={record}
            className={cn(
              'h-9 rounded-lg px-3 text-xs font-semibold border transition-colors',
              light
                ? 'border-gray-300 bg-white text-gray-900 hover:bg-gray-50'
                : 'border-white/10 bg-transparent text-white hover:bg-white/5'
            )}
          >
            Record
          </button>
        )}
        {!playing ? (
          <button
            type="button"
            onClick={finished ? restart : start}
            className={cn(
              'h-9 rounded-lg px-3 text-xs font-semibold tracking-wide transition-colors',
              light
                ? 'bg-[#6A70E4] text-white hover:bg-[#5A60D4]'
                : 'bg-[#6A70E4] text-white shadow-[0_0_24px_rgba(106,112,228,0.35)] hover:bg-[#7A80F0]'
            )}
          >
            {finished ? 'Restart tour' : 'Play tour'}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(false)}
            className={cn(
              'h-9 rounded-lg px-3 text-xs font-semibold border transition-colors',
              light
                ? 'border-gray-300 bg-white text-gray-900'
                : 'border-white/10 bg-transparent text-white hover:bg-white/5'
            )}
          >
            Pause
          </button>
        )}
      </div>

      {showOverlay && spotlight ? (
        <div className="pointer-events-none fixed inset-0 z-[1200]" aria-hidden>
          <div
            className="absolute border transition-[top,left,width,height] ease-out"
            style={{
              transitionDuration: `${500 * scale}ms`,
              top: spotlight.top,
              left: spotlight.left,
              width: spotlight.width,
              height: spotlight.height,
              borderRadius: RADIUS,
              borderColor: 'rgba(106,112,228,0.55)',
              background: 'rgba(106,112,228,0.12)',
              boxShadow: `0 0 0 9999px rgba(0,0,0,${light ? 0.45 : 0.72}), 0 0 28px rgba(106,112,228,0.35)`,
            }}
          />
        </div>
      ) : null}

      <div
        className={cn(
          'pointer-events-none fixed left-1/2 z-[1201] w-[min(640px,calc(100%-2rem))] -translate-x-1/2 bottom-6',
          'transition-opacity',
          showOverlay && captionVisible ? 'opacity-100' : 'opacity-0'
        )}
        style={{ transitionDuration: `${200 * scale}ms` }}
        aria-live="polite"
      >
        <div
          className={cn(
            'rounded-xl px-5 py-4 shadow-2xl border backdrop-blur-md',
            light
              ? 'bg-gray-900 text-white border-gray-800'
              : 'bg-black/90 text-white border-white/10'
          )}
        >
          <div className="mb-2 h-0.5 w-10 rounded-full" style={{ background: BRAND }} />
          <p className="text-sm md:text-base font-medium leading-relaxed">{beat.caption}</p>
          <div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-gray-400 font-bold font-mono">
            {beatIndex + 1} / {DEMO_TOUR_BEATS.length}
          </div>
        </div>
      </div>
    </>
  );
};

export default DemoTour;
