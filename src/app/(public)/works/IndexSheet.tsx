"use client";

import { useEffect, useRef, type ReactNode } from "react";

// The index-and-sheet composition's behaviour, over markup the server has
// already laid out: the pairing routine and the one-moving-preview schedule.
// Both are locked Art Works policies (art-works-2c-v2.md §0), consumed
// unchanged by the responsive candidate (page-specifications.md §2.9). The
// layout itself needs no script.

// A frame is eligible when at least half of it is on screen; the eligible frame
// nearest the viewport centre is the one that moves. This is the page's
// policy, not a global AUTOPLAY_VISIBLE threshold.
const MIN_VISIBLE = 0.5;
// The environment can pause the active preview without an event (occlusion,
// throttling), so it is re-driven on this interval (art-works-2c-v2.md §9).
const WATCHDOG_MS = 1200;

type IndexSheetProps = {
  className: string;
  children: ReactNode;
};

export function IndexSheet({ className, children }: IndexSheetProps) {
  const ref = useRef<HTMLDivElement>(null);

  // One pairing routine for both surfaces and both input modes, so hover and
  // keyboard focus cannot drift apart. The routine only marks state; the
  // presentation is in works.module.css. Clicking either surface marks that
  // project's frame as the transition origin, and its plate numeral leaves as
  // the navigation begins.
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const targets = Array.from(root.querySelectorAll<HTMLElement>("[data-project]"));

    const pair = (project?: string) => {
      root.toggleAttribute("data-paired", project !== undefined);
      for (const el of targets) el.toggleAttribute("data-hit", el.dataset.project === project);
    };

    const detach = targets.map((el) => {
      const on = () => pair(el.dataset.project);
      const off = () => pair();
      const open = () => {
        for (const other of targets) {
          if (other.hasAttribute("data-frame")) {
            other.toggleAttribute("data-origin", other.dataset.project === el.dataset.project);
          }
        }
      };
      el.addEventListener("mouseenter", on);
      el.addEventListener("mouseleave", off);
      el.addEventListener("focus", on);
      el.addEventListener("blur", off);
      el.addEventListener("click", open);
      return () => {
        el.removeEventListener("mouseenter", on);
        el.removeEventListener("mouseleave", off);
        el.removeEventListener("focus", on);
        el.removeEventListener("blur", off);
        el.removeEventListener("click", open);
      };
    });

    return () => detach.forEach((fn) => fn());
  }, []);

  // At most one moving preview and at most one loaded clip, chosen from scroll
  // position alone, so a tap never starts one. Previews are AUTOPLAY_VISIBLE:
  // muted, inline, looping, released when not the active frame. Under
  // prefers-reduced-motion no clip is loaded and every frame holds its poster.
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const frames = Array.from(root.querySelectorAll<HTMLElement>("[data-frame]")).filter((frame) =>
      frame.querySelector("video"),
    );
    if (!frames.length) return;

    const videoOf = (frame: HTMLElement) => frame.querySelector("video") as HTMLVideoElement;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let active: HTMLElement | null = null;

    const play = (frame: HTMLElement) => {
      const video = videoOf(frame);
      if (frame !== active || reducedMotion.matches) return;
      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
      // A refusal is not an error: the poster holds.
      video.play().catch(() => {});
    };
    const prepare = (frame: HTMLElement) => {
      const video = videoOf(frame);
      if (video.getAttribute("src") || !video.dataset.clip) return;
      video.preload = "auto";
      video.setAttribute("src", video.dataset.clip);
      video.load();
    };
    const release = (frame: HTMLElement) => {
      const video = videoOf(frame);
      video.pause();
      delete video.dataset.playing;
      if (video.getAttribute("src")) {
        video.removeAttribute("src");
        video.load();
      }
    };

    const choose = () => {
      if (reducedMotion.matches) return;
      const bottom = window.innerHeight;
      const middle = bottom / 2;
      let best: HTMLElement | null = null;
      let bestDistance = Infinity;
      for (const frame of frames) {
        const r = frame.getBoundingClientRect();
        if (!r.height || r.bottom < 0 || r.top > bottom) continue;
        const visible = Math.min(r.bottom, bottom) - Math.max(r.top, 0);
        if (visible < r.height * MIN_VISIBLE) continue;
        const distance = Math.abs(r.top + r.height / 2 - middle);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = frame;
        }
      }
      // The previous frame is released before the next is prepared.
      if (active && active !== best) {
        release(active);
        active = null;
      }
      if (best) {
        active = best;
        prepare(best);
        play(best);
      }
    };

    let pending = 0;
    const schedule = () => {
      if (!pending) {
        pending = requestAnimationFrame(() => {
          pending = 0;
          choose();
        });
      }
    };

    // Derived flags, set as properties as well as attributes so that inline
    // playback survives on iOS (design-system.md §9.3). Playback is re-driven
    // when a source becomes ready, not only on a scroll or visibility change.
    const unwire = frames.map((frame) => {
      const video = videoOf(frame);
      video.muted = true;
      video.defaultMuted = true;
      video.loop = true;
      video.playsInline = true;
      video.setAttribute("muted", "");
      video.setAttribute("playsinline", "");
      const redrive = () => play(frame);
      const showFrame = () => {
        video.dataset.playing = "";
      };
      video.addEventListener("loadeddata", redrive);
      video.addEventListener("canplay", redrive);
      video.addEventListener("playing", showFrame);
      return () => {
        video.removeEventListener("loadeddata", redrive);
        video.removeEventListener("canplay", redrive);
        video.removeEventListener("playing", showFrame);
      };
    });

    const start = () => {
      if (reducedMotion.matches) {
        frames.forEach(release);
        active = null;
        return;
      }
      choose();
    };

    const observer = new IntersectionObserver(schedule, { threshold: [0, 0.25, 0.5, 0.6, 1] });
    frames.forEach((frame) => observer.observe(frame));
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    reducedMotion.addEventListener("change", start);
    const watchdog = window.setInterval(() => {
      if (reducedMotion.matches || !active) return;
      const video = videoOf(active);
      if (video.paused && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) play(active);
    }, WATCHDOG_MS);
    start();

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      reducedMotion.removeEventListener("change", start);
      window.clearInterval(watchdog);
      cancelAnimationFrame(pending);
      unwire.forEach((fn) => fn());
      frames.forEach(release);
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
