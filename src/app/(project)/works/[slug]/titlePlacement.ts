// PROJECT-DETAIL-SPECIFIC: where the HERO title sits (page-specifications.md
// §3.12, project-detail-1b-v2-responsive.md §000 items 14–15). The title
// overlays the film only when all three hold — it renders in at most two lines,
// it clears the play affordance, and it clears Back to works, each by 16px.
// Otherwise it stacks below the film, at any width. It is never shrunk,
// truncated or re-sized because of its length. Below 700px the derived fallback
// (ADR-0010 §6) applies, and that is decided by CSS alone.
//
// The rule reads rendered geometry, so it is measured. To avoid a visible
// overlay → stacked jump, the decision is made before the title is seen: on a
// server render by a bootstrap that runs while the HTML is parsed, on a client
// render before paint, and while the title's face is still loading the title
// is held back until that face is there (§3.12).
//
// Both functions are serialised into the page as that bootstrap, so neither may
// refer to anything outside its own body.

// Marks the opening data-title-mode="overlay" or "stacked".
export function placeTitle(opening: HTMLElement): void {
  if (opening.clientWidth < 700) return;
  const hero = opening.querySelector("[data-hero]");
  const back = opening.querySelector("[data-back]");
  const title = opening.querySelector("[data-title]");
  if (!hero || !back || !title) return;
  const affordance = opening.querySelector("[data-affordance]");
  const clearance = 16;
  const frame = hero.getBoundingClientRect();
  const height = title.getBoundingClientRect().height;
  const lines = Math.round(height / parseFloat(getComputedStyle(title).lineHeight));
  const bottom = parseFloat(getComputedStyle(opening).getPropertyValue("--overlay-bottom")) || 0;
  const top = frame.height - bottom - height;
  let fits = lines <= 2 && top >= back.getBoundingClientRect().bottom - frame.top + clearance;
  // An IMAGE HERO has no affordance to clear.
  if (fits && affordance) {
    fits = top >= frame.height / 2 + parseFloat(getComputedStyle(affordance).height) / 2 + clearance;
  }
  const mode = fits ? "overlay" : "stacked";
  if (opening.getAttribute("data-title-mode") !== mode) opening.setAttribute("data-title-mode", mode);
}

// Places the title now and, if its face has not loaded yet, holds it back
// (data-title-pending) until the face is there and places it again.
export function bootTitle(opening: HTMLElement | null, place: (opening: HTMLElement) => void): void {
  if (!opening) return;
  const title = opening.querySelector("[data-title]");
  const fonts = document.fonts;
  if (title && fonts) {
    const style = getComputedStyle(title);
    const face = style.fontStyle + " " + style.fontWeight + " " + style.fontSize + " " + style.fontFamily.split(",")[0];
    const text = title.textContent || "";
    let loaded = true;
    try {
      loaded = fonts.check(face, text);
    } catch {
      loaded = true;
    }
    if (!loaded) {
      opening.setAttribute("data-title-pending", "");
      const reveal = () => {
        place(opening);
        opening.removeAttribute("data-title-pending");
      };
      fonts.load(face, text).then(reveal, reveal);
      // Never longer than a font block period.
      setTimeout(reveal, 3000);
    }
  }
  place(opening);
}

// The bootstrap for a server render. It sits directly after the opening's
// markup, inside an element's innerHTML, so the parser runs it once and a
// client render never does.
export function titleBootstrap(): string {
  return `<script>(${bootTitle})(document.querySelector("[data-opening]"),${placeTitle})</script>`;
}
