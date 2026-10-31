/**
 * The self-running pan of a sideways strip (decisions 94, 96 and 101).
 *
 * The strip's items move with a compositor transform, in fractions of a
 * pixel, so every frame moves; a scroll position lands on whole pixels and
 * stepped. The scroll position stays where the pan began and takes the pan's
 * place the moment anything else moves the strip.
 *
 * It runs end to end and back, easing into each end and resting there (the
 * gallery). The program tiles' loop is a ring of its own (src/data/ring.ts).
 *
 * A hand wins at once: a mouse resting on the strip or focus inside it holds
 * the pan; a wheel, a touch, a press, a key or any outside scroll hands the
 * strip over, and the pan picks up from wherever it was left `hold` ms after
 * the last touch. It runs only while the strip is on screen and the tab is
 * visible, and never for a reader who asks for less motion.
 *
 * The strip's own CSS supplies two classes: `is-panning` turns its scroll
 * snap off, and `is-gliding` moves its items by `--pan` pixels.
 */
export type GlideOptions = {
  /** Pixels a second on the open run. */
  speed: number;
  /** Pixels over which a run eases in (and, end to end, out). */
  ramp?: number;
  /** End to end: milliseconds held at each end. */
  turn?: number;
  /** Milliseconds a hand on the strip holds it after letting go. */
  hold?: number;
  /** Told where the pan shows the strip, each frame it moves. */
  onPan?: (x: number) => void;
};

export type Glide = {
  /** The strip is handed to a reader: the pan stops and gives its place to the scroll. */
  handOver: () => void;
  /** Stops for good (the strip is about to change shape). */
  destroy: () => void;
};

const smooth = (t: number) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

export function glide(strip: HTMLElement, options: GlideOptions): Glide {
  const { speed, ramp = 260, turn = 1600, hold = 8000, onPan } = options;
  const still = !matchMedia("(prefers-reduced-motion: no-preference)").matches;

  let dir = 1;
  let origin = 0; // where the current run began: the ramp is measured from it
  let pos = 0; // where the pan shows the strip, in the scroll's terms
  let base = 0; // the scroll position the pan began from; the transform is pos - base
  let running = false;
  let frame = 0;
  let last = 0;
  let turnUntil = 0;
  let inView = false;
  let hovered = false;
  let focused = false;
  let handUntil = 0;
  let handTimer = 0;
  let handed = false; // a gesture has the strip: its snap returns once it settles
  let settleTimer = 0;
  let gone = false;

  const span = () => strip.scrollWidth - strip.clientWidth;

  const tick = (now: number) => {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    // Scrolled by something other than the pan: that is a hand too.
    if (Math.abs(strip.scrollLeft - base) > 1) {
      hand();
      return;
    }
    if (now >= turnUntil) {
      const fromStart = Math.abs(pos - origin);
      const end = span();
      const toEnd = dir > 0 ? end - pos : pos;
      const v = speed * Math.max(0.1, smooth(Math.min(toEnd, fromStart + ramp * 0.25) / ramp));
      const next = pos + dir * v * dt;
      if ((dir > 0 && next >= end - 0.5) || (dir < 0 && next <= 0.5)) {
        pos = dir > 0 ? end : 0;
        origin = pos;
        dir = -dir;
        turnUntil = now + turn;
      } else {
        pos = next;
      }
      strip.style.setProperty("--pan", String(pos - base));
      onPan?.(pos);
    }
    frame = requestAnimationFrame(tick);
  };

  const start = () => {
    if (gone || still || running || !inView || hovered || focused || document.hidden) return;
    if (performance.now() < handUntil) return;
    if (span() <= 0) return;
    running = true;
    base = strip.scrollLeft;
    pos = base;
    origin = pos;
    strip.style.setProperty("--pan", "0");
    strip.classList.add("is-panning", "is-gliding");
    last = performance.now();
    frame = requestAnimationFrame(tick);
  };

  // The pan hands its place to the scroll position. Whatever scrolled the
  // strip meanwhile was aiming at the items where the transform showed them,
  // so its scroll is kept and the transform added to it: nothing on screen
  // moves by more than the half pixel the scroll rounds to.
  const stop = () => {
    if (!running) return;
    running = false;
    cancelAnimationFrame(frame);
    const scrolled = strip.scrollLeft;
    const offset = pos - base;
    strip.classList.remove("is-gliding");
    strip.style.removeProperty("--pan");
    strip.scrollLeft = scrolled + offset;
  };

  // The snap comes back once the gesture has settled (it would otherwise
  // pull the strip to the nearest item the moment it returned). A pointer or
  // focus merely resting on the strip holds it where it is, snap still off,
  // so nothing moves under a still hand.
  const settle = () => {
    if (!handed) return;
    clearTimeout(settleTimer);
    settleTimer = window.setTimeout(() => {
      handed = false;
      strip.classList.remove("is-panning");
    }, 160);
  };
  const hand = () => {
    stop();
    handed = true;
    handUntil = performance.now() + hold;
    clearTimeout(handTimer);
    handTimer = window.setTimeout(start, hold);
    settle();
  };

  const onScroll = () => settle();

  const onEnter = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    hovered = true;
    stop();
  };
  const onLeave = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    hovered = false;
    start();
  };
  const onFocusIn = () => {
    focused = true;
    stop();
  };
  const onFocusOut = () => {
    focused = false;
    start();
  };
  const onVisibility = () => (document.hidden ? stop() : start());
  const gestures = ["wheel", "touchstart", "pointerdown", "keydown"] as const;

  strip.addEventListener("pointerenter", onEnter);
  strip.addEventListener("pointerleave", onLeave);
  strip.addEventListener("focusin", onFocusIn);
  strip.addEventListener("focusout", onFocusOut);
  for (const type of gestures) strip.addEventListener(type, hand, { passive: true });
  strip.addEventListener("scroll", onScroll, { passive: true });
  document.addEventListener("visibilitychange", onVisibility);
  const observer = new IntersectionObserver(
    ([entry]) => {
      inView = entry?.isIntersecting ?? false;
      if (inView) start();
      else stop();
    },
    { threshold: 0.35 },
  );
  observer.observe(strip);

  return {
    handOver: hand,
    destroy: () => {
      stop();
      gone = true;
      clearTimeout(handTimer);
      clearTimeout(settleTimer);
      observer.disconnect();
      strip.removeEventListener("pointerenter", onEnter);
      strip.removeEventListener("pointerleave", onLeave);
      strip.removeEventListener("focusin", onFocusIn);
      strip.removeEventListener("focusout", onFocusOut);
      for (const type of gestures) strip.removeEventListener(type, hand);
      strip.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
      strip.classList.remove("is-panning", "is-gliding");
    },
  };
}
