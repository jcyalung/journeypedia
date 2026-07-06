const setupScreen = document.getElementById("setup-screen");
const winScreen = document.getElementById("win-screen");
const failScreen = document.getElementById("fail-screen");
const winIntroEl = document.getElementById("win-intro");
const failMessageEl = document.getElementById("fail-message");
const winPathScrollEl = document.getElementById("win-path-scroll");
const shareCopyBtn = document.getElementById("share-copy");
const newJourneyBtn = document.getElementById("new-journey");
const failNewJourneyBtn = document.getElementById("fail-new-journey");
const shareStatusEl = document.getElementById("share-status");

const pointAInput = document.getElementById("point-a");
const pointBInput = document.getElementById("point-b");
const pointASuffix = document.getElementById("point-a-suffix");
const pointBSuffix = document.getElementById("point-b-suffix");
const startBtn = document.getElementById("start-journey");
const resetBtn = document.getElementById("reset-journey");
const randomModal = document.getElementById("random-modal");
const randomTitleEl = document.getElementById("random-article-title");
const randomConfirmBtn = document.getElementById("random-confirm");
const randomCancelBtn = document.getElementById("random-cancel");

let pendingRandom = null;
let pendingRandomTarget = null;
let wonJourney = null;

function showSetupScreen() {
  setupScreen.classList.remove("hidden");
  winScreen.classList.add("hidden");
  failScreen.classList.add("hidden");
  shareStatusEl.classList.add("hidden");
  wonJourney = null;
}

function showFailScreen(journey) {
  setupScreen.classList.add("hidden");
  winScreen.classList.add("hidden");
  failScreen.classList.remove("hidden");
  shareStatusEl.classList.add("hidden");
  failMessageEl.textContent = getFailMessage(journey.failReason);
}

function showWinScreen(journey) {
  wonJourney = journey;
  setupScreen.classList.add("hidden");
  failScreen.classList.add("hidden");
  winScreen.classList.remove("hidden");
  shareStatusEl.classList.add("hidden");
  shareStatusEl.textContent = "Copied to clipboard!";
  winIntroEl.textContent = `You went from ${journey.pointA.title} to ${journey.pointB.title} on the following path:`;
  renderWinPath(journey, winPathScrollEl);
}

function updateLabelSuffix(suffixEl, inputValue) {
  const parsed = parseWikiInput(inputValue);

  if (!inputValue.trim()) {
    suffixEl.textContent = "";
    return parsed;
  }

  if (parsed.valid) {
    suffixEl.innerHTML = ` - <span class="label-title">${parsed.title}</span>`;
  } else {
    suffixEl.innerHTML = ` - <span class="label-title-error">Invalid Link!</span>`;
  }

  return parsed;
}

function updateStartButton(pointA, pointB) {
  const valid = pointA.valid && pointB.valid;
  startBtn.disabled = !valid;
  startBtn.classList.toggle("btn-disabled", !valid);
}

function updateResetButton(journey) {
  const show = journey?.active === true;
  resetBtn.classList.toggle("hidden", !show);
}

function refreshUI(journey) {
  if (journey?.won) {
    showWinScreen(journey);
    return;
  }

  if (journey?.failed) {
    showFailScreen(journey);
    return;
  }

  showSetupScreen();
  const pointA = updateLabelSuffix(pointASuffix, pointAInput.value);
  const pointB = updateLabelSuffix(pointBSuffix, pointBInput.value);
  updateStartButton(pointA, pointB);
  updateResetButton(journey);
}

chrome.storage.local.get([POINT_A_KEY, POINT_B_KEY, JOURNEY_KEY], (result) => {
  if (result[POINT_A_KEY]) pointAInput.value = result[POINT_A_KEY];
  if (result[POINT_B_KEY]) pointBInput.value = result[POINT_B_KEY];
  refreshUI(result[JOURNEY_KEY]);
});

pointAInput.addEventListener("input", () => {
  chrome.storage.local.set({ [POINT_A_KEY]: pointAInput.value });
  chrome.storage.local.get(JOURNEY_KEY, (result) => refreshUI(result[JOURNEY_KEY]));
});

pointBInput.addEventListener("input", () => {
  chrome.storage.local.set({ [POINT_B_KEY]: pointBInput.value });
  chrome.storage.local.get(JOURNEY_KEY, (result) => refreshUI(result[JOURNEY_KEY]));
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes[JOURNEY_KEY]) return;
  refreshUI(changes[JOURNEY_KEY].newValue);
});

startBtn.addEventListener("click", () => {
  const pointA = parseWikiInput(pointAInput.value);
  const pointB = parseWikiInput(pointBInput.value);
  if (!pointA.valid || !pointB.valid) return;

  const journey = {
    active: true,
    won: false,
    failed: false,
    failReason: null,
    pointA: { url: pointA.url, title: pointA.title },
    pointB: { url: pointB.url, title: pointB.title },
    path: [createPathEntry(pointA.url, pointA.title)],
    allowedNextUrls: [],
    showPath: false,
    completedElapsed: null,
  };

  const timer = {
    running: true,
    startedAt: Date.now(),
    elapsed: 0,
    blocked: false,
    pausedAtUrl: null,
  };

  chrome.storage.local.set({ [JOURNEY_KEY]: journey, [TIMER_KEY]: timer }, () => {
    chrome.tabs.create({ url: pointA.url, active: true });
    refreshUI(journey);
  });
});

resetBtn.addEventListener("click", () => {
  chrome.storage.local.set({
    [JOURNEY_KEY]: { ...DEFAULT_JOURNEY },
    [TIMER_KEY]: { ...DEFAULT_TIMER },
  }, () => {
    refreshUI(DEFAULT_JOURNEY);
  });
});

shareCopyBtn.addEventListener("click", async () => {
  if (!wonJourney) return;
  const message = buildShareMessage(wonJourney);
  try {
    await navigator.clipboard.writeText(message);
    shareStatusEl.classList.remove("hidden");
  } catch {
    shareStatusEl.textContent = "Could not copy to clipboard.";
    shareStatusEl.classList.remove("hidden");
  }
});

newJourneyBtn.addEventListener("click", () => {
  chrome.storage.local.set({
    [JOURNEY_KEY]: { ...DEFAULT_JOURNEY },
    [TIMER_KEY]: { ...DEFAULT_TIMER },
  }, () => {
    refreshUI(DEFAULT_JOURNEY);
  });
});

failNewJourneyBtn.addEventListener("click", () => {
  chrome.storage.local.set({
    [JOURNEY_KEY]: { ...DEFAULT_JOURNEY },
    [TIMER_KEY]: { ...DEFAULT_TIMER },
  }, () => {
    refreshUI(DEFAULT_JOURNEY);
  });
});

function openRandomModal(targetInput, article) {
  pendingRandom = article;
  pendingRandomTarget = targetInput;
  randomTitleEl.textContent = article.title;
  randomModal.classList.remove("hidden");
}

function closeRandomModal() {
  randomModal.classList.add("hidden");
  pendingRandom = null;
  pendingRandomTarget = null;
}

async function handleRandomClick(targetInput) {
  const btn = targetInput === pointAInput ? document.getElementById("random-a") : document.getElementById("random-b");
  btn.disabled = true;
  try {
    const article = await fetchRandomArticle();
    openRandomModal(targetInput, article);
  } catch {
    randomTitleEl.textContent = "Could not fetch a random article.";
    randomModal.classList.remove("hidden");
    pendingRandom = null;
    pendingRandomTarget = null;
  } finally {
    btn.disabled = false;
  }
}

document.getElementById("random-a").addEventListener("click", () => handleRandomClick(pointAInput));
document.getElementById("random-b").addEventListener("click", () => handleRandomClick(pointBInput));

randomConfirmBtn.addEventListener("click", () => {
  if (pendingRandom && pendingRandomTarget) {
    pendingRandomTarget.value = pendingRandom.url;
    const key = pendingRandomTarget === pointAInput ? POINT_A_KEY : POINT_B_KEY;
    chrome.storage.local.set({ [key]: pendingRandom.url }, () => {
      chrome.storage.local.get(JOURNEY_KEY, (result) => refreshUI(result[JOURNEY_KEY]));
    });
  }
  closeRandomModal();
});

randomCancelBtn.addEventListener("click", closeRandomModal);
