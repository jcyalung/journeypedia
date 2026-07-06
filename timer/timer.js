let timerState = { ...DEFAULT_TIMER };
let journeyState = { ...DEFAULT_JOURNEY };
let tickInterval = null;
let timerElements = null;
let pauseOverlayEl = null;
let pauseIsVisible = false;

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getElapsedMs() {
  if (timerState.running && timerState.startedAt) {
    return timerState.elapsed + (Date.now() - timerState.startedAt);
  }
  return timerState.elapsed;
}

function saveTimerState() {
  chrome.storage.local.set({ [TIMER_KEY]: timerState });
}

function saveJourneyState() {
  chrome.storage.local.set({ [JOURNEY_KEY]: journeyState });
}

function getPreviousArticle() {
  if (journeyState.path.length < 2) return null;
  return journeyState.path[journeyState.path.length - 2];
}

function setPauseVisible(visible) {
  if (pauseIsVisible === visible) return;
  pauseIsVisible = visible;

  document.documentElement.classList.toggle("atopedia-paused", visible);
  if (pauseOverlayEl) {
    pauseOverlayEl.classList.toggle("is-visible", visible);
  }
}

function createPauseOverlay() {
  if (document.getElementById("atopedia-pause-overlay")) {
    pauseOverlayEl = document.getElementById("atopedia-pause-overlay");
    return;
  }

  const overlay = document.createElement("div");
  overlay.id = "atopedia-pause-overlay";
  const iconUrl = chrome.runtime.getURL("images/JourneyPedia.png");
  overlay.innerHTML = `
    <div class="atopedia-pause-content">
      <img class="atopedia-pause-icon" src="${iconUrl}" alt="A to Pedia">
      <p class="atopedia-pause-text">Paused journey. Press Start on the Timer to continue</p>
    </div>
  `;
  document.body.appendChild(overlay);
  pauseOverlayEl = overlay;
}

function updateTimerUI() {
  if (!timerElements) return;

  const { container, display, startBtn, stopBtn, pathToggleBtn, pathPanel, previousRow, previousLink, movesCount } = timerElements;

  if (!journeyState.active) {
    setPauseVisible(false);
    container.remove();
    pauseOverlayEl?.remove();
    pauseOverlayEl = null;
    timerElements = null;
    stopTicking();
    return;
  }

  display.textContent = formatTime(getElapsedMs());
  startBtn.disabled = timerState.running;
  stopBtn.disabled = !timerState.running;

  const previous = getPreviousArticle();
  if (previous) {
    previousRow.classList.remove("hidden");
    previousLink.textContent = previous.title;
    previousLink.href = previous.url;
  } else {
    previousRow.classList.add("hidden");
  }

  movesCount.textContent = `${Math.max(0, journeyState.path.length - 1)} moves`;

  pathToggleBtn.textContent = journeyState.showPath ? "Hide Path" : "Show Path";
  pathPanel.classList.toggle("hidden", !journeyState.showPath);

  pathPanel.innerHTML = "";
  const pathSummary = document.createElement("div");
  pathSummary.className = "timer-path-summary";
  pathSummary.textContent = formatPathWithArrows(journeyState.path);
  pathPanel.appendChild(pathSummary);

  journeyState.path.forEach((entry, index) => {
    const item = document.createElement("div");
    item.className = "timer-path-item";
    item.textContent = `${index + 1}. ${entry.title}`;
    pathPanel.appendChild(item);
  });

  if (timerState.running) {
    startTicking();
  } else {
    stopTicking();
  }
}

function startTicking() {
  if (!timerElements) return;
  if (tickInterval) clearInterval(tickInterval);
  tickInterval = setInterval(() => {
    timerElements.display.textContent = formatTime(getElapsedMs());
  }, 250);
}

function stopTicking() {
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
  }
}

function createTimerOverlay() {
  if (document.getElementById("atopedia-timer")) return;

  createPauseOverlay();

  const container = document.createElement("div");
  container.id = "atopedia-timer";

  const label = document.createElement("p");
  label.className = "timer-label";
  label.textContent = "Journey Timer";

  const display = document.createElement("p");
  display.className = "timer-display";
  display.textContent = "00:00";

  const movesCount = document.createElement("p");
  movesCount.className = "timer-moves";

  const previousRow = document.createElement("p");
  previousRow.className = "timer-previous hidden";
  previousRow.append("From: ");
  const previousLink = document.createElement("a");
  previousLink.className = "timer-previous-link";
  previousRow.appendChild(previousLink);

  const pathPanel = document.createElement("div");
  pathPanel.className = "timer-path hidden";

  const buttons = document.createElement("div");
  buttons.className = "timer-buttons";

  const startBtn = document.createElement("button");
  startBtn.className = "timer-btn timer-btn-start";
  startBtn.textContent = "Start";
  startBtn.addEventListener("click", () => {
    if (timerState.running) return;
    timerState.running = true;
    timerState.startedAt = Date.now();
    timerState.blocked = false;
    timerState.pausedAtUrl = null;
    setPauseVisible(false);
    saveTimerState();
    updateTimerUI();
  });

  const stopBtn = document.createElement("button");
  stopBtn.className = "timer-btn timer-btn-stop";
  stopBtn.textContent = "Stop";
  stopBtn.addEventListener("click", () => {
    if (!timerState.running) return;
    timerState.elapsed += Date.now() - timerState.startedAt;
    timerState.running = false;
    timerState.startedAt = null;
    timerState.blocked = true;
    timerState.pausedAtUrl = normalizeWikiUrl(window.location.href);
    setPauseVisible(true);
    saveTimerState();
    updateTimerUI();
  });

  const pathToggleBtn = document.createElement("button");
  pathToggleBtn.className = "timer-btn timer-btn-secondary";
  pathToggleBtn.textContent = "Show Path";
  pathToggleBtn.addEventListener("click", () => {
    journeyState.showPath = !journeyState.showPath;
    saveJourneyState();
    updateTimerUI();
  });

  buttons.append(startBtn, stopBtn);
  container.append(label, display, movesCount, previousRow, pathPanel, buttons, pathToggleBtn);
  document.body.appendChild(container);

  timerElements = {
    container,
    display,
    startBtn,
    stopBtn,
    pathToggleBtn,
    pathPanel,
    previousRow,
    previousLink,
    movesCount,
  };

  setPauseVisible(timerState.blocked);
  updateTimerUI();
}

function handleStorageUpdate(changes) {
  if (changes[TIMER_KEY]) {
    const nextTimer = changes[TIMER_KEY].newValue ?? { ...DEFAULT_TIMER };
    const blockedChanged = nextTimer.blocked !== timerState.blocked;
    timerState = nextTimer;
    if (blockedChanged && journeyState.active) {
      setPauseVisible(timerState.blocked);
    }
  }

  if (changes[JOURNEY_KEY]) {
    journeyState = changes[JOURNEY_KEY].newValue ?? { ...DEFAULT_JOURNEY };
  }

  if (journeyState.active) {
    if (!timerElements) createTimerOverlay();
    else updateTimerUI();
  } else if (timerElements) {
    updateTimerUI();
  }
}

chrome.storage.local.get([TIMER_KEY, JOURNEY_KEY], (result) => {
  timerState = result[TIMER_KEY] ?? { ...DEFAULT_TIMER };
  journeyState = result[JOURNEY_KEY] ?? { ...DEFAULT_JOURNEY };

  if (journeyState.active) {
    createTimerOverlay();
  } else if (journeyState.won) {
    setPauseVisible(false);
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes[TIMER_KEY] || changes[JOURNEY_KEY]) {
    handleStorageUpdate(changes);
  }
});
