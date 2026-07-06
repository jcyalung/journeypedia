function createPathEntry(url, title) {
  return { url, title, visitedAt: Date.now() };
}

function formatPathWithArrows(path) {
  if (!path?.length) return "";
  return path.map((entry) => entry.title).join(" -> ");
}

function urlsMatch(a, b) {
  if (!a || !b) return false;
  return normalizeUrl(a) === normalizeUrl(b);
}

function getFinalElapsedMs(timer) {
  if (!timer) return 0;
  if (timer.running && timer.startedAt) {
    return timer.elapsed + (Date.now() - timer.startedAt);
  }
  return timer.elapsed;
}

function formatElapsedTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function buildShareMessage(journey) {
  const pathLine = formatPathWithArrows(journey.path);
  const timeLine = journey.completedElapsed != null
    ? `\nCan you beat my score of ${formatElapsedTime(journey.completedElapsed)}?`
    : "\nCan you beat my score?";

  return `I just beat JourneyPedia and found a path from ${journey.pointA.title} to ${journey.pointB.title}! Here's my path:\n${pathLine}${timeLine}`;
}

function getFailMessage(reason) {
  if (reason === "find") {
    return "Your journey ended because you used the Find shortcut (Ctrl+F / Cmd+F).";
  }

  if (reason === "main_page") {
    return "Your journey ended because you visited the Main Page.";
  }

  if (reason === "invalid_link") {
    return "Your journey ended because you visited an article that wasn't linked from the previous page.";
  }

  return "Your journey ended.";
}

function buildWinMessage(journey) {
  return `You went from ${journey.pointA.title} to ${journey.pointB.title} on the following path:\n${formatPathWithArrows(journey.path)}`;
}
