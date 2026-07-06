const JOURNEY_KEY = "atopedia_journey";
const TIMER_KEY = "atopedia_timer";

const DEFAULT_TIMER = { running: false, startedAt: null, elapsed: 0, blocked: false, pausedAtUrl: null };
const DEFAULT_JOURNEY = {
  active: false,
  won: false,
  failed: false,
  failReason: null,
  pointA: null,
  pointB: null,
  path: [],
  allowedNextUrls: [],
  showPath: false,
  completedElapsed: null,
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get([JOURNEY_KEY, TIMER_KEY], (result) => {
    const updates = {};
    if (!result[JOURNEY_KEY]) updates[JOURNEY_KEY] = { ...DEFAULT_JOURNEY };
    if (!result[TIMER_KEY]) updates[TIMER_KEY] = { ...DEFAULT_TIMER };
    if (Object.keys(updates).length) chrome.storage.local.set(updates);
  });
});
