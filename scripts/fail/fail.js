const FAIL_ANIMATION_MS = 3000;

const FAIL_X_LEFT =
  "M 13 13 C 28 26, 42 44, 50 52 C 58 60, 72 76, 87 87";

const FAIL_X_RIGHT =
  "M 87 13 C 72 26, 58 44, 50 52 C 42 60, 28 76, 13 87";

function showFailAnimation(durationMs = FAIL_ANIMATION_MS) {
  document.getElementById("atopedia-fail-overlay")?.remove();

  const overlay = document.createElement("div");
  overlay.id = "atopedia-fail-overlay";
  overlay.innerHTML = `
    <svg class="atopedia-fail-x" viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <filter id="atopedia-marker-filter" x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.1" result="blur"></feGaussianBlur>
          <feMerge>
            <feMergeNode in="blur"></feMergeNode>
            <feMergeNode in="SourceGraphic"></feMergeNode>
          </feMerge>
        </filter>
      </defs>
      <g class="atopedia-fail-mark" filter="url(#atopedia-marker-filter)">
        <path class="atopedia-fail-stroke atopedia-fail-stroke-left" d="${FAIL_X_LEFT}" pathLength="100"></path>
        <path class="atopedia-fail-stroke atopedia-fail-stroke-right" d="${FAIL_X_RIGHT}" pathLength="100"></path>
      </g>
    </svg>
  `;
  document.body.appendChild(overlay);

  requestAnimationFrame(() => {
    overlay.classList.add("is-visible");
  });

  setTimeout(() => {
    overlay.classList.add("is-fading");
    setTimeout(() => overlay.remove(), 300);
  }, durationMs);
}
