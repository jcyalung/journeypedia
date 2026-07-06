let highlightJourneyActive = false;
let highlightObserver = null;

function highlightArticleLinks(root) {
  root.querySelectorAll("a").forEach((anchor) => {
    if (isArticleLink(anchor)) {
      anchor.classList.add("atopedia-highlight");
    }
  });
}

function clearHighlights(root) {
  root.querySelectorAll(".atopedia-highlight").forEach((el) => {
    el.classList.remove("atopedia-highlight");
  });
}

function observeContent() {
  const contentRoot = document.querySelector("#mw-content-text .mw-parser-output");
  if (!contentRoot) return false;

  if (highlightJourneyActive) {
    highlightArticleLinks(contentRoot);
  } else {
    clearHighlights(contentRoot);
  }

  if (highlightObserver) highlightObserver.disconnect();
  highlightObserver = new MutationObserver(() => {
    if (highlightJourneyActive) {
      highlightArticleLinks(contentRoot);
    }
  });
  highlightObserver.observe(contentRoot, { childList: true, subtree: true });

  return true;
}

function setHighlightingActive(active) {
  highlightJourneyActive = active;
  const contentRoot = document.querySelector("#mw-content-text .mw-parser-output");
  if (contentRoot) {
    if (active) {
      highlightArticleLinks(contentRoot);
    } else {
      clearHighlights(contentRoot);
      highlightObserver?.disconnect();
      highlightObserver = null;
    }
  } else if (!active) {
    highlightObserver?.disconnect();
    highlightObserver = null;
  }
}

function initHighlighting() {
  chrome.storage.local.get(JOURNEY_KEY, (result) => {
    highlightJourneyActive = result[JOURNEY_KEY]?.active ?? false;
    if (!observeContent() && highlightJourneyActive) {
      const bodyObserver = new MutationObserver(() => {
        if (observeContent()) bodyObserver.disconnect();
      });
      bodyObserver.observe(document.body, { childList: true, subtree: true });
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes[JOURNEY_KEY]) return;
    setHighlightingActive(changes[JOURNEY_KEY].newValue?.active ?? false);
  });
}

initHighlighting();
