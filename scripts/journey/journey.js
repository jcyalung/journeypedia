let trackingJourneyActive = false;

function failJourney(reason) {
  chrome.storage.local.get(JOURNEY_KEY, (result) => {
    const journey = result[JOURNEY_KEY] ?? DEFAULT_JOURNEY;
    if (!journey.active) return;

    trackingJourneyActive = false;

    const failedJourney = {
      ...journey,
      active: false,
      won: false,
      failed: true,
      failReason: reason,
    };

    chrome.storage.local.set(
      {
        [JOURNEY_KEY]: failedJourney,
        [TIMER_KEY]: { ...DEFAULT_TIMER },
        [PENDING_NAVIGATION_KEY]: null,
      },
      () => {
        showFailAnimation();
      }
    );
  });
}

function completeJourney(journey) {
  chrome.storage.local.get(TIMER_KEY, (result) => {
    const timer = result[TIMER_KEY] ?? DEFAULT_TIMER;
    const completedElapsed = getFinalElapsedMs(timer);

    const completedJourney = {
      ...journey,
      active: false,
      won: true,
      failed: false,
      failReason: null,
      completedElapsed,
    };

    chrome.storage.local.set(
      {
        [JOURNEY_KEY]: completedJourney,
        [TIMER_KEY]: {
          ...DEFAULT_TIMER,
          elapsed: completedElapsed,
        },
        [PENDING_NAVIGATION_KEY]: null,
      },
      () => {
        showVictoryCelebration(completedJourney);
      }
    );
  });
}

function checkForWin(journey) {
  if (!journey.active || journey.won || !journey.pointB?.url) return;

  const currentUrl = normalizeWikiUrl(window.location.href);
  if (!currentUrl) return;

  if (urlsMatch(currentUrl, journey.pointB.url)) {
    completeJourney(journey);
  }
}

function isUrlInAllowedLinks(allowedUrls, currentUrl) {
  return allowedUrls?.some((url) => urlsMatch(url, currentUrl)) ?? false;
}

function withAllowedNextUrls(journey) {
  return {
    ...journey,
    allowedNextUrls: collectAllowedArticleLinks(),
  };
}

function recordPathEntry() {
  chrome.storage.local.get([JOURNEY_KEY, PENDING_NAVIGATION_KEY], (result) => {
    const journey = result[JOURNEY_KEY] ?? DEFAULT_JOURNEY;
    if (!journey.active || journey.won) return;

    const currentUrl = normalizeWikiUrl(window.location.href);
    if (!currentUrl) return;

    if (isMainPageUrl(currentUrl)) {
      failJourney("main_page");
      return;
    }

    const heading = document.querySelector("#firstHeading");
    const currentTitle =
      heading?.textContent?.trim() ||
      formatArticleTitle(getWikiArticleName(window.location.href));

    const lastEntry = journey.path[journey.path.length - 1];
    const pendingUrl = result[PENDING_NAVIGATION_KEY];

    if (lastEntry && urlsMatch(lastEntry.url, currentUrl)) {
      const updated = withAllowedNextUrls(journey);
      chrome.storage.local.set(
        {
          [JOURNEY_KEY]: updated,
          [PENDING_NAVIGATION_KEY]: null,
        },
        () => checkForWin(updated)
      );
      return;
    }

    const clickedThrough = pendingUrl && urlsMatch(pendingUrl, currentUrl);
    const linkAllowed = isUrlInAllowedLinks(journey.allowedNextUrls, currentUrl);

    if (!clickedThrough && !linkAllowed) {
      failJourney("invalid_link");
      return;
    }

    const withNewEntry = {
      ...journey,
      path: [...journey.path, createPathEntry(currentUrl, currentTitle)],
    };
    const updated = withAllowedNextUrls(withNewEntry);

    chrome.storage.local.set(
      {
        [JOURNEY_KEY]: updated,
        [PENDING_NAVIGATION_KEY]: null,
      },
      () => checkForWin(updated)
    );
  });
}

function isFindShortcut(event) {
  return event.key?.toLowerCase() === "f" && (event.ctrlKey || event.metaKey);
}

function initFindShortcutGuard() {
  window.addEventListener(
    "keydown",
    (event) => {
      if (!trackingJourneyActive || !isFindShortcut(event)) return;

      event.preventDefault();
      event.stopPropagation();
      failJourney("find");
    },
    true
  );
}

function initMainPageGuard() {
  document.addEventListener(
    "click",
    (event) => {
      if (!trackingJourneyActive) return;

      const anchor = event.target.closest("a");
      if (!anchor) return;

      if (!isMainPageUrl(anchor.getAttribute("href"))) return;

      event.preventDefault();
      event.stopPropagation();
      failJourney("main_page");
    },
    true
  );
}

function trackPendingNavigation(event) {
  if (!trackingJourneyActive) return;

  const anchor = event.target.closest("a");
  if (!anchor || !isNavigableArticleLink(anchor)) return;

  const url = normalizeWikiUrl(anchor.getAttribute("href"));
  if (!url || isMainPageUrl(url)) return;

  chrome.storage.local.set({ [PENDING_NAVIGATION_KEY]: url });
}

function initLinkNavigationTracking() {
  document.addEventListener("pointerdown", trackPendingNavigation, true);
  document.addEventListener("click", trackPendingNavigation, true);
}

function initJourney() {
  chrome.storage.local.get([JOURNEY_KEY, TIMER_KEY], (result) => {
    const journey = result[JOURNEY_KEY] ?? DEFAULT_JOURNEY;
    const timer = result[TIMER_KEY] ?? DEFAULT_TIMER;
    const currentUrl = normalizeWikiUrl(window.location.href);

    if (
      journey.active &&
      timer.blocked &&
      timer.pausedAtUrl &&
      currentUrl &&
      !urlsMatch(timer.pausedAtUrl, currentUrl)
    ) {
      resetJourney();
      return;
    }

    trackingJourneyActive = journey.active;

    if (journey.active) {
      if (isMainPageUrl(currentUrl)) {
        failJourney("main_page");
        return;
      }

      recordPathEntry();
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes[JOURNEY_KEY]) return;
    trackingJourneyActive = changes[JOURNEY_KEY].newValue?.active ?? false;
  });
}

initJourney();
initFindShortcutGuard();
initMainPageGuard();
initLinkNavigationTracking();
