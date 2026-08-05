const CACHE_KEY = "gradeup-topic-cache";

function loadCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveCache(cache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // quota exceeded
  }
}

/** Cache a topic for offline reading. */
export function cacheTopic(topic) {
  const cache = loadCache();
  cache[topic.ref] = {
    ...topic,
    cachedAt: new Date().toISOString(),
  };
  saveCache(cache);
}

/** Get cached topic, or null if not cached. */
export function getCachedTopic(ref) {
  const cache = loadCache();
  return cache[ref] ?? null;
}

/** Check if topic is available offline. */
export function isTopicCached(ref) {
  return ref in loadCache();
}

export function getCachedTopicCount() {
  return Object.keys(loadCache()).length;
}

/** Merge live topic with cache — live wins, cache fills gaps. */
export function resolveTopic(topic) {
  if (!topic) return null;
  cacheTopic(topic);
  return topic;
}

/** For offline: return cached version if network topic unavailable. */
export function getTopicOffline(ref, liveTopic) {
  if (liveTopic) {
    cacheTopic(liveTopic);
    return liveTopic;
  }
  return getCachedTopic(ref);
}

export function listCachedRefs() {
  return Object.keys(loadCache());
}
