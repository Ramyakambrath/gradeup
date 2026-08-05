/** SM-2 spaced repetition scheduler (MVP). */

export const SESSION_CAP = 40;

export const GRADE_QUALITY = {
  again: 1,
  hard: 3,
  good: 4,
  easy: 5,
};

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(isoDate, days) {
  const d = new Date(isoDate + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function createCard({ id, subject, front, back, src, specRef = null }) {
  return {
    id,
    subject,
    front,
    back,
    src,
    specRef,
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    nextReview: todayISO(),
    lastReview: null,
  };
}

/** Migrate legacy cards that used a boolean `due` field. */
export function migrateCard(card) {
  if (card.nextReview !== undefined) {
    const { due: _due, ...rest } = card;
    return rest;
  }
  const migrated = {
    ...card,
    easeFactor: 2.5,
    interval: card.due ? 0 : 6,
    repetitions: card.due ? 0 : 1,
    nextReview: card.due ? todayISO() : addDays(todayISO(), 6),
    lastReview: null,
  };
  delete migrated.due;
  return migrated;
}

export function migrateDeck(deck) {
  return deck.map(migrateCard);
}

export function isDue(card, asOf = todayISO()) {
  return card.nextReview <= asOf;
}

export function scheduleCard(card, grade) {
  const quality = GRADE_QUALITY[grade] ?? GRADE_QUALITY.good;
  let { easeFactor, interval, repetitions } = card;

  if (quality >= 3) {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.max(1, Math.round(interval * easeFactor));
    repetitions += 1;
  } else {
    repetitions = 0;
    interval = 1;
  }

  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  const reviewed = todayISO();
  return {
    ...card,
    easeFactor: Math.round(easeFactor * 100) / 100,
    interval,
    repetitions,
    nextReview: addDays(reviewed, interval),
    lastReview: reviewed,
  };
}

export function getDueCards(deck, { filter = "all", tier = "Higher", higherOnlyRefs = new Set() } = {}) {
  const today = todayISO();
  return deck
    .filter((c) => isDue(c, today))
    .filter((c) => filter === "all" || c.subject === filter)
    .filter((c) => tier === "Higher" || !c.specRef || !higherOnlyRefs.has(c.specRef));
}

export function capSession(cards) {
  if (cards.length <= SESSION_CAP) return cards;
  return cards.slice(0, SESSION_CAP);
}

export function getNextDueDate(deck) {
  const today = todayISO();
  const future = deck
    .filter((c) => c.nextReview > today)
    .map((c) => c.nextReview)
    .sort();
  return future[0] ?? null;
}

export function estimateMinutes(cardCount) {
  return Math.max(1, Math.ceil(cardCount * 0.5));
}

/** Streak: consecutive calendar days with at least one review. */
export function updateStreak(streakData) {
  const today = todayISO();
  const { lastReviewDate, count } = streakData;

  if (lastReviewDate === today) return streakData;

  const yesterday = addDays(today, -1);
  const newCount = lastReviewDate === yesterday ? count + 1 : 1;

  return { lastReviewDate: today, count: newCount };
}

export function getStreakDisplay(streakData) {
  if (!streakData?.lastReviewDate) return 0;
  const today = todayISO();
  const yesterday = addDays(today, -1);
  if (streakData.lastReviewDate === today || streakData.lastReviewDate === yesterday) {
    return streakData.count;
  }
  return 0;
}
