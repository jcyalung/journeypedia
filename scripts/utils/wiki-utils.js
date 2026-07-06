const JOURNEY_KEY = "atopedia_journey";
const TIMER_KEY = "atopedia_timer";
const POINT_A_KEY = "atopedia_point_a";
const POINT_B_KEY = "atopedia_point_b";

const MAIN_PAGE_URL = "https://en.wikipedia.org/wiki/Main_Page";
const PENDING_NAVIGATION_KEY = "atopedia_pending_navigation";

const EXCLUDED_HIGHLIGHT_ANCESTORS = [
  ".infobox",
  ".sidebar",
  ".navbox",
  ".vertical-navbox",
  ".toc",
  "#toc",
  ".reference",
  ".reflist",
  ".references",
  ".metadata",
  ".ambox",
  ".mw-editsection",
  "#mw-head",
  "#mw-navigation",
  "#footer",
  "#mw-footer",
  "#catlinks",
];

const EXCLUDED_NAVIGATION_ANCESTORS = [
  ".toc",
  "#toc",
  ".reference",
  ".reflist",
  ".references",
  ".mw-editsection",
  "#mw-head",
  "#mw-navigation",
  "#footer",
  "#mw-footer",
  "#catlinks",
];

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

function getWikiArticleName(href) {
  if (!href) return null;

  const trimmed = href.trim();

  if (trimmed.startsWith("/wiki/")) {
    return decodeURIComponent(trimmed.slice("/wiki/".length).split("#")[0].split("?")[0]);
  }

  const match = trimmed.match(/^(?:https?:)?\/\/[^/]*\.wikipedia\.org\/wiki\/([^#?]*)/i);
  if (match) {
    return decodeURIComponent(match[1]);
  }

  return null;
}

function formatArticleTitle(articleName) {
  return articleName.replace(/_/g, " ");
}

function isValidArticleName(articleName) {
  if (!articleName) return false;
  if (articleName.includes(":")) return false;
  return true;
}

function normalizeWikiUrl(input) {
  const articleName = getWikiArticleName(input);
  if (!articleName || !isValidArticleName(articleName)) return null;
  return `https://en.wikipedia.org/wiki/${articleName}`;
}

function parseWikiInput(input) {
  const trimmed = (input || "").trim();
  if (!trimmed) return { valid: false, empty: true };

  const articleName = getWikiArticleName(trimmed);
  if (!articleName || !isValidArticleName(articleName)) {
    return { valid: false, empty: false };
  }

  return {
    valid: true,
    url: normalizeWikiUrl(trimmed),
    articleName,
    title: formatArticleTitle(articleName),
  };
}

function normalizeUrl(url) {
  const normalized = normalizeWikiUrl(url);
  return normalized || url;
}

function isMainPageUrl(input) {
  const normalized = normalizeWikiUrl(input);
  if (!normalized) return false;
  return normalized === MAIN_PAGE_URL;
}

function isWikiArticleAnchor(anchor) {
  const articleName = getWikiArticleName(anchor.getAttribute("href"));
  if (!articleName) return false;
  if (articleName.includes(":")) return false;
  return true;
}

function isArticleLink(anchor) {
  if (!isWikiArticleAnchor(anchor)) return false;
  return !EXCLUDED_HIGHLIGHT_ANCESTORS.some((selector) => anchor.closest(selector));
}

function isNavigableArticleLink(anchor) {
  if (!isWikiArticleAnchor(anchor)) return false;
  return !EXCLUDED_NAVIGATION_ANCESTORS.some((selector) => anchor.closest(selector));
}

function collectAllowedArticleLinks() {
  const contentRoot = document.querySelector("#mw-content-text");
  if (!contentRoot) return [];

  const urls = new Set();
  contentRoot.querySelectorAll("a").forEach((anchor) => {
    if (!isNavigableArticleLink(anchor)) return;
    const url = normalizeWikiUrl(anchor.getAttribute("href"));
    if (url) urls.add(url);
  });

  return Array.from(urls);
}

async function fetchRandomArticle() {
  const response = await fetch("https://en.wikipedia.org/wiki/Special:Random", {
    redirect: "follow",
  });
  const parsed = parseWikiInput(response.url);
  if (!parsed.valid) throw new Error("Failed to fetch random article");
  return parsed;
}

function resetJourney() {
  chrome.storage.local.set({
    [JOURNEY_KEY]: { ...DEFAULT_JOURNEY },
    [TIMER_KEY]: { ...DEFAULT_TIMER },
    [PENDING_NAVIGATION_KEY]: null,
  });
}
