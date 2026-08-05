/** Client for topic-scoped follow-up Q&A. */

const OFF_TOPIC =
  "That's a bit outside this topic — try asking something about the explanation you're reading, or browse another topic in the library.";

const OFFLINE_MSG =
  "You're offline — questions need a connection. Your question is saved and you can send it when you're back online.";

const BUSY_MSG = "The tutor is busy — try again in a minute.";

function isOffline() {
  return typeof navigator !== "undefined" && !navigator.onLine;
}

/** Rule-based fallback when no LLM API key is configured. */
function mockAnswer(question, topic, tier) {
  const q = question.toLowerCase();

  if (/^(hi|hello|hey)\b/.test(q) || q.length < 4) {
    return `Ask me anything about **${topic.title}** (${topic.ref}). I'll explain in ${tier} tier language.`;
  }

  if (/exam|paper|mark/.test(q)) {
    return `For ${topic.ref} (${topic.title}), exam questions often test: ${topic.concept.split(".")[0]}. Check the worked example on this page — ${topic.example.split("—")[0].trim()}.`;
  }

  if (/mistake|wrong|confus/.test(q)) {
    return `A common mistake here: ${topic.mistakes} Re-read the concept section — ${topic.concept.split(".")[0]}.`;
  }

  if (/example|how|why|what|when|explain/.test(q)) {
    return `For **${topic.title}**: ${topic.concept} Example: ${topic.example} (${tier} tier)`;
  }

  if (!q.includes(topic.ref.toLowerCase()) && !topic.title.toLowerCase().split(" ").some((w) => w.length > 3 && q.includes(w))) {
    const mathsWords = ["math", "biology", "english", "game", "sport", "weather", "joke"];
    if (mathsWords.some((w) => q.includes(w)) && !q.includes("equation") && !q.includes("number")) {
      return OFF_TOPIC;
    }
  }

  return `Good question about ${topic.title}. ${topic.concept} Try working through: ${topic.example}`;
}

export async function askFollowUp({ question, topic, tier, history = [] }) {
  if (isOffline()) {
    const err = new Error(OFFLINE_MSG);
    err.offline = true;
    throw err;
  }

  if (question.trim().length > 500) {
    throw new Error("Keep your question under 500 characters.");
  }

  try {
    const res = await fetch("/api/tutor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, topic, tier, history }),
    });

    if (!res.ok) {
      if (res.status === 503) throw new Error(BUSY_MSG);
      throw new Error(BUSY_MSG);
    }

    const data = await res.json();
    return data.answer;
  } catch (err) {
    if (err.offline) throw err;
    // Fallback to mock when API unavailable (no key configured)
    return mockAnswer(question, topic, tier);
  }
}

export { OFFLINE_MSG, OFF_TOPIC, BUSY_MSG };
