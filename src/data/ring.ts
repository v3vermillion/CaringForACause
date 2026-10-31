/**
 * A ring of tiles: the program tiles below desktop (decision 102).
 *
 * The four tiles stand in order on a circle, so after the last comes the
 * first again, in both directions, with no end to reach. The strip does not
 * scroll: it has one position, `x`, and every tile is placed by a transform
 * at its slot on the ring for that position. A finger or a mouse drags the
 * ring and lets it run on with momentum, settling on a tile; a trackpad's
 * sideways wheel turns it; focus on a tile turns it into view. While nothing
 * holds it, it pans on its own at the gallery's pace.
 *
 * Only the four real tiles are used when they span the strip with a tile to
 * spare, which they do on phones and tablets. A strip wider than that gets
 * whole extra sets, for the eye only: hidden from assistive technology,
 * inert and out of the tab order.
 *
 * A hand wins at once: a mouse resting on the strip or focus inside it holds
 * the pan; a drag, a wheel or a key hands the ring over, and the pan picks up
 * from wherever it was left `hold` ms after the last touch. It runs only
 * while the strip is on screen and the tab is visible, and never for a
 * reader who asks for less motion (a drag still works for them).
 */
export type RingOptions = {
  /** Pixels a second on the open run. */
  speed: number;
  /** Pixels over which the pan eases in from rest. */
  ramp?: number;
  /** Milliseconds a hand on the ring holds it after letting go. */
  hold?: number;
};

export type Ring = { destroy: () => void };

const smooth = (t: number) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};
const mod = (a: number, n: number) => ((a % n) + n) % n;

export function ring(list: HTMLElement, options: RingOptions): Ring {
  const { speed, ramp = 260, hold = 8000 } = options;
  const still = !matchMedia("(prefers-reduced-motion: no-preference)").matches;
  const originals = Array.from(list.children) as HTMLElement[];
  const count = originals.length;

  list.classList.add("is-ring");
  list.scrollLeft = 0;

  // Measure the strip as laid out. offsetLeft ignores the transforms, so a
  // measure taken mid-turn is still the layout's; it is whole pixels, so the
  // spacing is averaged across the row, which keeps a lap within a pixel.
  const measure = (row: HTMLElement[]) => {
    const firstLeft = row[0]!.offsetLeft;
    const step =
      row.length > 1
        ? (row[row.length - 1]!.offsetLeft - firstLeft) / (row.length - 1)
        : row[0]!.offsetWidth;
    return {
      lefts: row.map((_, i) => firstLeft + i * step),
      step,
      width: row[0]!.offsetWidth,
      view: list.clientWidth,
    };
  };
  let { step, width, view } = measure(originals);

  // Enough sets that the ring spans the strip with a tile to spare: a tile
  // leaves at the left only once it is wholly out of view, and comes in
  // from beyond the right edge.
  const sets = Math.max(1, Math.ceil((view + width + 1) / (count * step)));
  const extras: HTMLElement[] = [];
  for (let s = 1; s < sets; s++) {
    for (const li of originals) {
      const clone = li.cloneNode(true) as HTMLElement;
      clone.dataset.copy = "";
      clone.setAttribute("aria-hidden", "true");
      clone.inert = true;
      clone.querySelectorAll("a").forEach((a) => a.setAttribute("tabindex", "-1"));
      extras.push(clone);
    }
  }
  list.append(...extras);
  const items = [...originals, ...extras];
  // The thumbnails are small and every one may come round at any moment.
  list.querySelectorAll("img").forEach((img) => (img.loading = "eager"));
  let lefts: number[] = [];
  let period = 0;
  let lowest = 0;
  // Taken again whenever the strip changes size: a phone settling on its
  // width after the first layout, a rotation, a window resized.
  const layout = () => {
    const laid = measure(items);
    lefts = laid.lefts;
    ({ step, width, view } = laid);
    period = items.length * step;
    lowest = -width - 1; // a slot this far left is wholly out of view
  };
  layout();

  let x = 0; // the ring's position: how far it has turned, in pixels
  const render = () => {
    if (!(period > 0)) return;
    items.forEach((li, i) => {
      const slot = lowest + mod(lefts[i]! - x - lowest, period);
      li.style.transform = `translate3d(${slot - lefts[i]!}px, 0, 0)`;
    });
  };
  render();

  // Motion: the pan, a throw's momentum, or an ease to a resting tile.
  let mode: "idle" | "pan" | "throw" | "settle" = "idle";
  let frame = 0;
  let last = 0;
  let panFrom = 0;
  let velocity = 0; // px/s, for a throw
  let settleFrom = 0;
  let settleTo = 0;
  let settleStart = 0;
  const SETTLE_MS = 320;

  let inView = false;
  let hovered = false;
  let focused = false;
  let dragging = false;
  let handTimer = 0;
  let handUntil = 0;
  let gone = false;

  const stopMotion = () => {
    mode = "idle";
    cancelAnimationFrame(frame);
  };
  const run = () => {
    cancelAnimationFrame(frame);
    last = performance.now();
    frame = requestAnimationFrame(tick);
  };
  const tick = () => {
    // One clock for every frame: a frame's own timestamp can be older than
    // the moment the motion began (WebKit stamps a late frame with its
    // display time), which made a negative step that ran the motion
    // backwards and grew a throw instead of slowing it.
    // A step may run up to a quarter second, so a throw ends in about the
    // same real time when frames come slowly (a busy phone, a headless
    // browser drew 13 a second): at a tenth of a second the motion's own
    // clock stopped between slow frames and a throw took five seconds.
    const now = performance.now();
    const dt = Math.min(Math.max((now - last) / 1000, 0), 0.25);
    last = now;
    if (mode === "pan") {
      const v = speed * Math.max(0.1, smooth((x - panFrom + ramp * 0.25) / ramp));
      x += v * dt;
    } else if (mode === "throw") {
      x += velocity * dt;
      velocity *= Math.exp(-dt / 0.325); // a phone's own scrolling decays about so
      if (Math.abs(velocity) < 40) {
        settle();
        return;
      }
    } else if (mode === "settle") {
      // Clamped both ways: a frame's timestamp can be a hair before the
      // settle began.
      const t = Math.min(1, Math.max(0, (now - settleStart) / SETTLE_MS));
      x = settleFrom + (settleTo - settleFrom) * (1 - (1 - t) ** 3);
      if (t >= 1) {
        x = settleTo;
        render();
        mode = "idle";
        return;
      }
    } else return;
    render();
    frame = requestAnimationFrame(tick);
  };

  // Settle on the nearest tile, or on a given position on the ring.
  const settle = (target = Math.round(x / step) * step) => {
    settleFrom = x;
    settleTo = target;
    settleStart = performance.now();
    mode = "settle";
    run();
  };

  const startPan = () => {
    if (gone || still || mode !== "idle" || dragging) return;
    if (!inView || hovered || focused || document.hidden) return;
    if (performance.now() < handUntil) return;
    panFrom = x;
    mode = "pan";
    run();
  };
  const stopPan = () => {
    if (mode === "pan") stopMotion();
  };
  // The ring is handed to a reader: the pan stops and waits out the hold.
  const hand = () => {
    stopPan();
    handUntil = performance.now() + hold;
    clearTimeout(handTimer);
    handTimer = window.setTimeout(startPan, hold);
  };

  // A drag: horizontal movement past a few pixels takes the ring; vertical
  // movement first is the page's scroll and is left alone (touch-action:
  // pan-y lets the browser keep it).
  let pointer = -1;
  let startX = 0;
  let startY = 0;
  let startRing = 0;
  let samples: [number, number][] = [];
  let suppressClick = false;
  const onDown = (event: PointerEvent) => {
    if (event.button !== 0 || pointer !== -1) return;
    pointer = event.pointerId;
    suppressClick = false; // a new press is a new gesture: its own click counts
    startX = event.clientX;
    startY = event.clientY;
    startRing = x;
    samples = [];
    if (mode !== "idle") stopMotion();
    hand();
  };
  const onMove = (event: PointerEvent) => {
    if (event.pointerId !== pointer) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (!dragging) {
      if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) {
        pointer = -1; // the page is scrolling
        return;
      }
      if (Math.abs(dx) < 6) return;
      dragging = true;
      list.classList.add("is-dragging");
      list.setPointerCapture(event.pointerId);
    }
    x = startRing - dx;
    render();
    const now = performance.now();
    samples.push([now, x]);
    while (samples.length > 2 && now - samples[0]![0] > 100) samples.shift();
  };
  // A release, a cancel, or a pointer the ring loses without either all end
  // the drag the same way.
  const onUp = (event: PointerEvent) => {
    if (event.pointerId !== pointer) return;
    pointer = -1;
    if (!dragging) return;
    dragging = false;
    list.classList.remove("is-dragging");
    // A drag that ends on a tile does not follow its link. The click comes
    // after the release, in the same task in Chromium and later in Safari,
    // so the guard holds for a moment rather than one task.
    suppressClick = true;
    window.setTimeout(() => (suppressClick = false), 350);
    const [a, b] = [samples[0], samples[samples.length - 1]];
    velocity = a && b && b[0] - a[0] > 8 ? ((b[1] - a[1]) / (b[0] - a[0])) * 1000 : 0;
    // A phone caps a flick about so; past it, a ring spun for whole seconds
    // would read as running away.
    velocity = Math.max(-4000, Math.min(4000, velocity));
    if (Math.abs(velocity) > 40) {
      mode = "throw";
      run();
    } else settle();
    hand();
  };
  const onClick = (event: MouseEvent) => {
    if (!suppressClick) return;
    event.preventDefault();
    event.stopPropagation();
    suppressClick = false;
  };
  const onDragStart = (event: DragEvent) => event.preventDefault();

  // A trackpad's sideways swipe turns the ring; an upright one scrolls the page.
  let wheelTimer = 0;
  const onWheel = (event: WheelEvent) => {
    if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
    event.preventDefault();
    if (mode !== "idle") stopMotion();
    hand();
    x += event.deltaX;
    render();
    clearTimeout(wheelTimer);
    wheelTimer = window.setTimeout(() => settle(), 140);
  };

  // Focus on a tile turns it to the strip's start, the shorter way round.
  const onFocusIn = (event: FocusEvent) => {
    focused = true;
    stopPan();
    const li = (event.target as HTMLElement).closest("li");
    const i = li ? items.indexOf(li) : -1;
    if (i < 0) return;
    const target = x + (mod(i * step - x + period / 2, period) - period / 2);
    settle(target);
  };
  const onFocusOut = () => {
    focused = false;
    startPan();
  };

  // Anything that scrolls the strip itself (find in page, a script) is
  // taken into the ring's position, so the strip never scrolls.
  const onScroll = () => {
    if (!list.scrollLeft) return;
    x += list.scrollLeft;
    list.scrollLeft = 0;
    render();
    hand();
  };

  const onEnter = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    hovered = true;
    stopPan();
  };
  const onLeave = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    hovered = false;
    startPan();
  };
  const onKey = () => hand();
  const onVisibility = () => (document.hidden ? stopPan() : startPan());

  list.addEventListener("pointerdown", onDown);
  list.addEventListener("pointermove", onMove);
  list.addEventListener("pointerup", onUp);
  list.addEventListener("pointercancel", onUp);
  list.addEventListener("lostpointercapture", onUp);
  list.addEventListener("click", onClick, true);
  list.addEventListener("dragstart", onDragStart);
  list.addEventListener("wheel", onWheel, { passive: false });
  list.addEventListener("focusin", onFocusIn);
  list.addEventListener("focusout", onFocusOut);
  list.addEventListener("keydown", onKey);
  list.addEventListener("scroll", onScroll, { passive: true });
  list.addEventListener("pointerenter", onEnter);
  list.addEventListener("pointerleave", onLeave);
  document.addEventListener("visibilitychange", onVisibility);
  const observer = new IntersectionObserver(
    ([entry]) => {
      inView = entry?.isIntersecting ?? false;
      if (inView) startPan();
      else stopPan();
    },
    { threshold: 0.35 },
  );
  observer.observe(list);
  // A new size: measure again and keep the ring at the same tile.
  let lastView = view;
  let lastStep = step;
  const sized = new ResizeObserver(() => {
    if (list.clientWidth === lastView && originals[0]!.offsetWidth === Math.round(width)) return;
    const turned = lastStep > 0 ? x / lastStep : 0;
    layout();
    lastView = view;
    lastStep = step;
    x = Math.round(turned) * step;
    render();
  });
  sized.observe(list);

  return {
    destroy: () => {
      gone = true;
      stopMotion();
      clearTimeout(handTimer);
      clearTimeout(wheelTimer);
      observer.disconnect();
      sized.disconnect();
      list.removeEventListener("pointerdown", onDown);
      list.removeEventListener("pointermove", onMove);
      list.removeEventListener("pointerup", onUp);
      list.removeEventListener("pointercancel", onUp);
      list.removeEventListener("lostpointercapture", onUp);
      list.removeEventListener("click", onClick, true);
      list.removeEventListener("dragstart", onDragStart);
      list.removeEventListener("wheel", onWheel);
      list.removeEventListener("focusin", onFocusIn);
      list.removeEventListener("focusout", onFocusOut);
      list.removeEventListener("keydown", onKey);
      list.removeEventListener("scroll", onScroll);
      list.removeEventListener("pointerenter", onEnter);
      list.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      extras.forEach((li) => li.remove());
      originals.forEach((li) => (li.style.transform = ""));
      list.classList.remove("is-ring", "is-dragging");
    },
  };
}
