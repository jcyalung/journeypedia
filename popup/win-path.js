function renderWinPath(journey, scrollEl) {
  scrollEl.innerHTML = "";
  scrollEl.scrollTop = 0;
  scrollEl.classList.remove("at-end");

  if (scrollEl._winPathUpdate) {
    scrollEl.removeEventListener("scroll", scrollEl._winPathUpdate);
    scrollEl._winPathUpdate = null;
  }

  const path = journey.path || [];

  const inner = document.createElement("div");
  inner.className = "win-path-inner";

  const steps = document.createElement("div");
  steps.className = "win-path-steps";

  path.forEach((entry, index) => {
    const step = document.createElement("div");
    step.className = "win-path-step";
    if (index === path.length - 1) {
      step.classList.add("win-path-step-final");
    }

    const title = document.createElement("p");
    title.className = "win-path-title";
    title.textContent = entry.title;

    if (index === path.length - 1) {
      const spotMark = document.createElement("span");
      spotMark.className = "win-path-spot-mark";
      spotMark.setAttribute("aria-hidden", "true");
      spotMark.innerHTML = `
        <svg class="win-path-spot-svg" viewBox="0 0 100 100" aria-hidden="true">
          <line class="win-path-spot-stroke win-path-spot-stroke-a" x1="10" y1="10" x2="90" y2="90" pathLength="100"></line>
          <line class="win-path-spot-stroke win-path-spot-stroke-b" x1="90" y1="10" x2="10" y2="90" pathLength="100"></line>
        </svg>
      `;
      step.appendChild(spotMark);
    }

    step.appendChild(title);

    steps.appendChild(step);

    if (index < path.length - 1) {
      const arrow = document.createElement("div");
      arrow.className = "win-path-arrow";
      arrow.innerHTML = `
        <svg viewBox="0 0 24 36" aria-hidden="true">
          <line x1="12" y1="2" x2="12" y2="24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"></line>
          <polygon class="win-path-arrowhead" points="12,34 5,24 19,24"></polygon>
        </svg>
      `;
      steps.appendChild(arrow);
    }
  });

  inner.appendChild(steps);
  scrollEl.appendChild(inner);

  requestAnimationFrame(() => {
    layoutPathArrow(inner, scrollEl);
  });
}

function layoutPathArrow(inner, scrollEl) {
  const steps = inner.querySelector(".win-path-steps");
  const firstStep = steps?.querySelector(".win-path-step");
  const finalStep = steps?.querySelector(".win-path-step-final");
  const height = Math.max(inner.offsetHeight, scrollEl.clientHeight);
  const innerRect = inner.getBoundingClientRect();
  const innerTop = innerRect.top;
  const innerWidth = innerRect.width || 1;

  let startX = innerWidth / 2;
  let startY = 28;
  let endX = innerWidth / 2;
  let endY = height - 16;

  if (firstStep) {
    const firstRect = firstStep.getBoundingClientRect();
    startX = firstRect.left + firstRect.width / 2 - innerRect.left;
    startY = firstRect.top - innerTop + firstRect.height / 2;
  }

  if (finalStep) {
    const finalRect = finalStep.getBoundingClientRect();
    endX = finalRect.left + finalRect.width / 2 - innerRect.left;
    endY = finalRect.top - innerTop + finalRect.height / 2;
  }

  const pathD = buildWindingPath({ innerWidth, startX, startY, endX, endY });
  const svg = createPathArrow(innerWidth, height, pathD);
  inner.prepend(svg);
  initWinPathScrollAnimation(scrollEl, inner);
}

function buildWindingPath({ innerWidth, startX, startY, endX, endY }) {
  const margin = 14;
  const points = [{ x: startX, y: startY }];
  const mainSpan = Math.max(endY - startY - 12, 40);
  const segments = Math.max(5, Math.min(10, Math.round(mainSpan / 48)));

  for (let i = 1; i <= segments; i += 1) {
    const t = i / segments;
    const y = startY + mainSpan * t * 0.94;
    const wave = Math.sin(t * Math.PI * (1.6 + Math.random() * 0.8));
    const amplitude = 28 + Math.random() * 36;
    const drift = (Math.random() - 0.5) * 14;
    const x = clamp(startX + wave * amplitude + drift, margin, innerWidth - margin);
    points.push({ x, y });
  }

  points.push({ x: endX, y: endY });
  return pointsToSmoothCurve(points);
}

function pointsToSmoothCurve(points) {
  if (points.length < 2) {
    return "";
  }

  if (points.length === 2) {
    return `M ${round(points[0].x)} ${round(points[0].y)} L ${round(points[1].x)} ${round(points[1].y)}`;
  }

  let d = `M ${round(points[0].x)} ${round(points[0].y)}`;

  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / 7;
    const cp1y = p1.y + (p2.y - p0.y) / 7;
    const cp2x = p2.x - (p3.x - p1.x) / 7;
    const cp2y = p2.y - (p3.y - p1.y) / 7;

    d += ` C ${round(cp1x)} ${round(cp1y)}, ${round(cp2x)} ${round(cp2y)}, ${round(p2.x)} ${round(p2.y)}`;
  }

  return d;
}

function createPathArrow(width, height, pathD) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "win-path-rails");
  svg.setAttribute("viewBox", `0 0 ${round(width)} ${round(height)}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMin meet");
  svg.setAttribute("aria-hidden", "true");

  svg.innerHTML = `
    <defs>
      <clipPath id="win-path-clip">
        <rect class="win-path-clip-rect" x="0" y="0" width="${round(width)}" height="0"></rect>
      </clipPath>
    </defs>
    <path
      class="win-path-rail"
      d="${pathD}"
      clip-path="url(#win-path-clip)"
      fill="none"
    ></path>
  `;

  return svg;
}

function initWinPathScrollAnimation(scrollEl, inner) {
  const clipRect = scrollEl.querySelector(".win-path-clip-rect");

  function updateScrollProgress() {
    const maxScroll = scrollEl.scrollHeight - scrollEl.clientHeight;
    const atEnd = maxScroll <= 0 || scrollEl.scrollTop >= maxScroll - 2;
    const totalHeight = inner.offsetHeight;

    if (atEnd) {
      clipRect.setAttribute("height", String(totalHeight));
      scrollEl.classList.add("at-end");
      return;
    }

    const innerRect = inner.getBoundingClientRect();
    const scrollRect = scrollEl.getBoundingClientRect();
    const viewportCenterY =
      scrollRect.top + scrollEl.clientHeight / 2 - innerRect.top;

    clipRect.setAttribute("height", String(Math.max(0, viewportCenterY)));
    scrollEl.classList.remove("at-end");
  }

  scrollEl._winPathUpdate = updateScrollProgress;
  scrollEl.addEventListener("scroll", updateScrollProgress);
  updateScrollProgress();
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round(value) {
  return Math.round(value * 10) / 10;
}
