import { useState } from "react";
import {
  BookOpen, PenLine, Layers, Home, Search, CheckCircle2, XCircle, Flame,
  ChevronRight, ArrowLeft, RotateCcw, ScanLine, Users, Highlighter, Sparkles,
  Plus, Camera,
} from "lucide-react";
import {
  SUBJECTS, TOPICS, QUESTIONS, SCAN_TEXT, DEFAULT_DECK, DEFAULT_GROUPS,
  COLOUR, COLOUR_LIGHT, norm,
} from "./data/content";
import { useLocalStorage } from "./hooks/useLocalStorage";

const BADGE_TONES = {
  gray: "bg-gray-100 text-gray-700",
  sky: "bg-sky-100 text-sky-700",
  indigo: "bg-indigo-100 text-indigo-700",
};

const GRADE_TONES = {
  again: "bg-rose-100 text-rose-700",
  hard: "bg-amber-100 text-amber-700",
  good: "bg-emerald-100 text-emerald-700",
  easy: "bg-sky-100 text-sky-700",
};

function Badge({ text, tone = "gray" }) {
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${BADGE_TONES[tone] || BADGE_TONES.gray}`}>{text}</span>;
}

export default function App() {
  const [onboarded, setOnboarded] = useLocalStorage("gradeup-onboarded", false);
  const [tier, setTier] = useLocalStorage("gradeup-tier", null);
  const [pendingTier, setPendingTier] = useState(null);

  const [tab, setTab] = useState("home");
  const [subjectId, setSubjectId] = useState("maths");
  const subject = SUBJECTS.find((s) => s.id === subjectId);

  const [query, setQuery] = useState("");
  const [openTopic, setOpenTopic] = useState(null);

  const [mockState, setMockState] = useState("setup");
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);

  const [deck, setDeck] = useLocalStorage("gradeup-deck", DEFAULT_DECK);
  const [reviewIdx, setReviewIdx] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [reviewFilter, setReviewFilter] = useState("all");
  const [streak] = useState(4);

  const [scanStep, setScanStep] = useState("capture");
  const [noteText, setNoteText] = useState("");
  const [highlights, setHighlights] = useState([]);
  const [notes, setNotes] = useLocalStorage("gradeup-notes", []);
  const [smartCards, setSmartCards] = useState(null);

  const [groups, setGroups] = useLocalStorage("gradeup-groups", DEFAULT_GROUPS);
  const [openGroup, setOpenGroup] = useState(null);
  const [joinCode, setJoinCode] = useState("");

  if (!onboarded || !tier) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex flex-col font-sans px-4 py-8">
        <div className="flex-1 flex flex-col justify-center">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">GradeUp</h1>
            <p className="text-gray-500 mt-2">AQA GCSE study · spec-aligned · local-first</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Choose your exam tier</h2>
            <p className="text-sm text-gray-500">Content is filtered to match your AQA Maths tier. You can change this later from Home.</p>
            <div className="flex gap-3">
              {["Foundation", "Higher"].map((t) => (
                <button
                  key={t}
                  onClick={() => setPendingTier(t)}
                  className={`flex-1 px-4 py-3 rounded-xl text-sm font-semibold border-2 transition-colors ${
                    pendingTier === t
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <details className="text-sm text-gray-500">
              <summary className="cursor-pointer text-indigo-600 font-medium">Not sure which tier?</summary>
              <p className="mt-2">Foundation covers grades 1–5; Higher covers grades 4–9. Ask your teacher if you're unsure — you can switch anytime.</p>
            </details>
            <button
              disabled={!pendingTier}
              onClick={() => { setTier(pendingTier); setOnboarded(true); }}
              className={`w-full rounded-xl py-3 font-semibold text-sm ${
                pendingTier ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              Continue
            </button>
            {!pendingTier && (
              <p className="text-xs text-center text-gray-400">Choose your tier — you can change this later</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const topics = (TOPICS[subjectId] || []).filter(
    (t) =>
      (!subject.tiered || tier === "Higher" || t.tier === "Both") &&
      (t.title.toLowerCase().includes(query.toLowerCase()) ||
        t.ref.toLowerCase().includes(query.toLowerCase()) ||
        t.strand.toLowerCase().includes(query.toLowerCase()))
  );
  const dueAll = deck.filter((c) => c.due);
  const dueForSubject = dueAll.filter((c) => c.subject === subjectId);
  const reviewCards = dueAll.filter((c) => reviewFilter === "all" || c.subject === reviewFilter);

  const submitMock = () => {
    const qs = QUESTIONS[subjectId] || [];
    setResult(
      qs.map((q) => {
        const given = answers[q.id] || "";
        const correct =
          norm(given).includes(norm(q.answer)) ||
          (norm(q.answer).includes(norm(given)) && given.length > 2);
        return { ...q, given, correct, awarded: correct ? q.marks : 0 };
      })
    );
    setMockState("result");
  };

  const addMistakes = () => {
    const cards = result
      .filter((r) => !r.correct && !deck.some((c) => c.id === "q" + r.id))
      .map((r) => ({
        id: "q" + r.id,
        subject: subjectId,
        front: r.q,
        back: r.model,
        src: "mock mistake · " + r.ref,
        due: true,
      }));
    setDeck([...deck, ...cards]);
  };

  const gradeCard = (grade) => {
    const card = reviewCards[Math.min(reviewIdx, reviewCards.length - 1)];
    setShowBack(false);
    if (grade !== "again") {
      setDeck((d) => d.map((c) => (c.id === card.id ? { ...c, due: false } : c)));
      setReviewIdx(0);
    } else {
      setReviewIdx((i) => (i + 1 < reviewCards.length ? i + 1 : 0));
    }
  };

  const sentences = noteText.split(/(?<=\.)\s+/).filter(Boolean);
  const toggleHighlight = (i) =>
    setHighlights((h) => (h.includes(i) ? h.filter((x) => x !== i) : [...h, i]));

  const makeSmartCards = () => {
    const gen = highlights.map((i) => {
      const s = sentences[i];
      const q = s.startsWith("Osmosis")
        ? "What is osmosis?"
        : s.startsWith("Diffusion")
          ? "How does diffusion differ from osmosis?"
          : "Key point?";
      return { front: q, back: s.trim(), accepted: true };
    });
    setSmartCards(gen);
  };

  const acceptSmartCards = () => {
    const accepted = smartCards
      .filter((c) => c.accepted)
      .map((c, i) => ({
        id: "sc" + Date.now() + i,
        subject: subjectId,
        front: c.front,
        back: c.back,
        src: "scan-highlight",
        due: true,
      }));
    setDeck([...deck, ...accepted]);
    setNotes([...notes, { id: "n" + Date.now(), subject: subjectId, text: noteText, highlights: highlights.length }]);
    setSmartCards(null);
    setHighlights([]);
    setNoteText("");
    setScanStep("capture");
    setTab("review");
  };

  const grad = COLOUR_LIGHT[subject.colour];

  const HomeScreen = () => (
    <div className="space-y-4">
      <div className={`bg-gradient-to-br ${grad} text-white rounded-2xl p-5`}>
        <div>
          <p className="text-white/70 text-sm">{subject.spec}{subject.tiered ? ` · ${tier}` : ""}</p>
          <h2 className="text-2xl font-bold mt-1">Ready to revise {subject.name}?</h2>
        </div>
        <div className="flex items-center gap-2 mt-3 text-sm">
          <Flame size={16} className="text-amber-300" /> {streak}-day streak
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {SUBJECTS.map((s) => (
          <button
            key={s.id}
            onClick={() => { setSubjectId(s.id); setOpenTopic(null); setMockState("setup"); }}
            className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium ${
              subjectId === s.id ? `${COLOUR[s.colour]} text-white` : "bg-white border border-gray-200 text-gray-600"
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      <button
        onClick={() => setTab("review")}
        className="w-full bg-white border border-gray-200 rounded-2xl p-4 flex items-center justify-between hover:border-gray-300"
      >
        <div className="text-left">
          <p className="font-semibold text-gray-900">
            {dueAll.length > 0 ? `${dueAll.length} reviews due` : "All caught up ✨"}
          </p>
          <p className="text-sm text-gray-500">
            {dueForSubject.length} in {subject.name} · ~{Math.max(1, Math.ceil(dueAll.length * 0.5))} min
          </p>
        </div>
        <ChevronRight className="text-gray-400" />
      </button>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => { setTab("mock"); setMockState("setup"); }}
          className="bg-white border border-gray-200 rounded-2xl p-4 text-left hover:border-gray-300"
        >
          <PenLine className="text-gray-700" size={20} />
          <p className="font-semibold text-gray-900 mt-2 text-sm">Take a mock</p>
          <p className="text-xs text-gray-500">{subject.mocksSoon ? "Coming soon" : "Instant marking"}</p>
        </button>
        <button
          onClick={() => { setTab("scan"); setScanStep("capture"); }}
          className="bg-white border border-gray-200 rounded-2xl p-4 text-left hover:border-gray-300"
        >
          <ScanLine className="text-gray-700" size={20} />
          <p className="font-semibold text-gray-900 mt-2 text-sm">Scan notes</p>
          <p className="text-xs text-gray-500">→ smart cards</p>
        </button>
      </div>

      {subject.tiered && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <p className="font-semibold text-gray-900 mb-2 text-sm">Tier</p>
          <div className="flex gap-2">
            {["Foundation", "Higher"].map((t) => (
              <button
                key={t}
                onClick={() => setTier(t)}
                className={`px-4 py-2 rounded-xl text-sm font-medium ${
                  tier === t ? `${COLOUR[subject.colour]} text-white` : "bg-gray-100 text-gray-600"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const TopicsScreen = () =>
    openTopic ? (
      <div className="space-y-4">
        <button onClick={() => setOpenTopic(null)} className="flex items-center gap-1 text-gray-600 text-sm font-medium">
          <ArrowLeft size={16} /> All topics
        </button>
        <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{openTopic.ref}</span>
            <Badge text={openTopic.strand} tone="sky" />
            {openTopic.tier === "Higher" && <Badge text="Higher only" tone="indigo" />}
          </div>
          <h2 className="text-xl font-bold text-gray-900">{openTopic.title}</h2>
          <section>
            <h3 className="font-semibold text-xs text-gray-500 uppercase tracking-wide">Concept</h3>
            <p className="text-gray-700 mt-1">{openTopic.concept}</p>
          </section>
          <section>
            <h3 className="font-semibold text-xs text-gray-500 uppercase tracking-wide">Example</h3>
            <p className="text-gray-700 mt-1 bg-gray-50 rounded-xl p-3">{openTopic.example}</p>
          </section>
          <section>
            <h3 className="font-semibold text-xs text-rose-500 uppercase tracking-wide">Common mistakes</h3>
            <p className="text-gray-700 mt-1">{openTopic.mistakes}</p>
          </section>
          <button
            onClick={() => {
              const id = "t" + openTopic.ref;
              if (!deck.some((c) => c.id === id)) {
                setDeck([
                  ...deck,
                  {
                    id,
                    subject: subjectId,
                    front: openTopic.title + " — key idea?",
                    back: openTopic.concept.split(".")[0] + ".",
                    src: "topic " + openTopic.ref,
                    due: true,
                  },
                ]);
              }
            }}
            className={`w-full ${COLOUR[subject.colour]} text-white rounded-xl py-2.5 text-sm font-semibold`}
          >
            Add to review deck
          </button>
        </div>
      </div>
    ) : (
      <div className="space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-3 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${subject.name} topics…`}
            className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-gray-400"
          />
        </div>
        {topics.length === 0 && <p className="text-center text-gray-500 text-sm py-8">No topics match.</p>}
        {topics.map((t) => (
          <button
            key={t.ref}
            onClick={() => setOpenTopic(t)}
            className="w-full bg-white border border-gray-200 rounded-2xl p-4 flex items-center justify-between hover:border-gray-300"
          >
            <div className="flex items-center gap-3 text-left">
              <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{t.ref}</span>
              <div>
                <p className="font-medium text-gray-900">{t.title}</p>
                <Badge text={t.strand} tone="sky" />
              </div>
            </div>
            <ChevronRight className="text-gray-400 shrink-0" />
          </button>
        ))}
      </div>
    );

  const MockScreen = () => {
    const qs = QUESTIONS[subjectId] || [];
    if (subject.mocksSoon) {
      return (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
          <p className="text-3xl">📝</p>
          <p className="font-semibold text-gray-900 mt-2">Mocks coming soon for {subject.name}</p>
          <p className="text-sm text-gray-500 mt-1">Essay-style marking is in development. Explanations and smart cards work now.</p>
        </div>
      );
    }
    if (mockState === "setup") {
      return (
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h2 className="text-lg font-bold text-gray-900">Quick {subject.name} mock</h2>
          <p className="text-sm text-gray-500 mt-1">{qs.length} questions · instant marking</p>
          <button
            onClick={() => { setMockState("running"); setQIndex(0); setAnswers({}); setResult(null); }}
            className={`mt-4 w-full ${COLOUR[subject.colour]} text-white rounded-xl py-3 font-semibold`}
          >
            Start mock
          </button>
        </div>
      );
    }
    if (mockState === "running") {
      const q = qs[qIndex];
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>Q{qIndex + 1} of {qs.length}</span>
            <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-xs">{q.ref} · {q.marks} mark{q.marks > 1 ? "s" : ""}</span>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <p className="text-gray-900 font-medium">{q.q}</p>
            <input
              value={answers[q.id] || ""}
              onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
              placeholder="Your answer…"
              className="mt-4 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-gray-400"
            />
          </div>
          <div className="flex gap-2">
            {qIndex > 0 && (
              <button onClick={() => setQIndex(qIndex - 1)} className="flex-1 border border-gray-300 rounded-xl py-2.5 text-sm font-semibold text-gray-600">
                Back
              </button>
            )}
            {qIndex < qs.length - 1 ? (
              <button onClick={() => setQIndex(qIndex + 1)} className={`flex-1 ${COLOUR[subject.colour]} text-white rounded-xl py-2.5 text-sm font-semibold`}>
                Next
              </button>
            ) : (
              <button onClick={submitMock} className="flex-1 bg-emerald-600 text-white rounded-xl py-2.5 text-sm font-semibold">
                Submit
              </button>
            )}
          </div>
        </div>
      );
    }
    const total = result.reduce((s, r) => s + r.awarded, 0);
    const max = result.reduce((s, r) => s + r.marks, 0);
    const wrong = result.filter((r) => !r.correct).length;
    return (
      <div className="space-y-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-5 text-center">
          <p className="text-4xl font-bold text-gray-900">{total}/{max}</p>
          <p className="text-gray-500 text-sm mt-1">
            {Math.round((100 * total) / max)}% · {wrong === 0 ? "Perfect!" : `${wrong} to learn from`}
          </p>
          {wrong > 0 && (
            <button onClick={addMistakes} className={`mt-3 ${COLOUR[subject.colour]} text-white rounded-xl px-4 py-2 text-sm font-semibold`}>
              Add mistakes to review deck
            </button>
          )}
        </div>
        {result.map((r) => (
          <div key={r.id} className="bg-white border border-gray-200 rounded-2xl p-4">
            <div className="flex items-start gap-2">
              {r.correct ? (
                <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={18} />
              ) : (
                <XCircle className="text-rose-500 shrink-0 mt-0.5" size={18} />
              )}
              <div className="min-w-0">
                <p className="text-sm text-gray-900">{r.q}</p>
                <p className="text-xs text-gray-500 mt-1">
                  You: <span className="font-medium">{r.given || "—"}</span> · {r.awarded}/{r.marks}
                </p>
                <p className={`text-xs mt-2 rounded-lg p-2 ${r.correct ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
                  {r.correct ? r.fb.right : r.fb.wrong}
                </p>
                {!r.correct && <p className="text-xs text-gray-600 mt-1">Model: {r.model}</p>}
              </div>
            </div>
          </div>
        ))}
        <button
          onClick={() => setMockState("setup")}
          className="w-full border border-gray-300 rounded-xl py-2.5 text-sm font-semibold text-gray-600 flex items-center justify-center gap-1"
        >
          <RotateCcw size={14} /> New mock
        </button>
      </div>
    );
  };

  const ScanScreen = () => {
    if (smartCards) {
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="text-amber-500" size={18} />
            <h2 className="font-bold text-gray-900">Smart cards from your highlights</h2>
          </div>
          <p className="text-sm text-gray-500">AI-generated · edit or discard before adding.</p>
          {smartCards.map((c, i) => (
            <div key={i} className={`bg-white border rounded-2xl p-4 ${c.accepted ? "border-emerald-300" : "border-gray-200 opacity-50"}`}>
              <p className="font-medium text-gray-900 text-sm">{c.front}</p>
              <p className="text-gray-600 text-sm mt-1">{c.back}</p>
              <button
                onClick={() => setSmartCards((sc) => sc.map((x, j) => (j === i ? { ...x, accepted: !x.accepted } : x)))}
                className={`mt-2 text-xs font-semibold px-3 py-1 rounded-lg ${c.accepted ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}
              >
                {c.accepted ? "✓ Will add" : "Discarded"}
              </button>
            </div>
          ))}
          <button onClick={acceptSmartCards} className={`w-full ${COLOUR[subject.colour]} text-white rounded-xl py-3 font-semibold`}>
            Add {smartCards.filter((c) => c.accepted).length} cards to deck
          </button>
        </div>
      );
    }
    if (scanStep === "capture") {
      return (
        <div className="space-y-4">
          <div className="bg-white border-2 border-dashed border-gray-300 rounded-2xl p-10 text-center">
            <Camera className="mx-auto text-gray-400" size={40} />
            <p className="text-gray-600 mt-3 font-medium">Photograph a page of your notes</p>
            <p className="text-xs text-gray-400 mt-1">Filing under {subject.name}</p>
          </div>
          <button
            onClick={() => {
              setScanStep("extracting");
              setTimeout(() => { setNoteText(SCAN_TEXT); setScanStep("edit"); }, 1200);
            }}
            className={`w-full ${COLOUR[subject.colour]} text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2`}
          >
            <Camera size={18} /> Capture (demo)
          </button>
          {notes.length > 0 && (
            <p className="text-center text-xs text-gray-400">
              {notes.length} note{notes.length > 1 ? "s" : ""} saved
            </p>
          )}
        </div>
      );
    }
    if (scanStep === "extracting") {
      return (
        <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center">
          <div className="animate-pulse">
            <ScanLine className="mx-auto text-gray-400" size={40} />
          </div>
          <p className="text-gray-600 mt-3">Reading your handwriting…</p>
        </div>
      );
    }
    if (scanStep === "edit") {
      return (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Extracted text — check it before saving. <span className="text-amber-600 font-medium">Low-confidence words are flagged.</span>
          </p>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            className="w-full h-40 bg-white border border-gray-200 rounded-2xl p-4 text-sm text-gray-700 focus:outline-none focus:border-gray-400"
          />
          <button onClick={() => setScanStep("note")} className={`w-full ${COLOUR[subject.colour]} text-white rounded-xl py-3 font-semibold`}>
            Save & highlight
          </button>
        </div>
      );
    }
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Highlighter className="text-amber-500" size={18} />
          <p className="text-sm text-gray-600">Tap sentences to highlight what matters.</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4 leading-relaxed">
          {sentences.map((s, i) => (
            <span
              key={i}
              onClick={() => toggleHighlight(i)}
              className={`cursor-pointer text-sm ${highlights.includes(i) ? "bg-amber-200 rounded" : ""}`}
            >
              {s}{" "}
            </span>
          ))}
        </div>
        <button
          disabled={highlights.length === 0}
          onClick={makeSmartCards}
          className={`w-full rounded-xl py-3 font-semibold flex items-center justify-center gap-2 ${
            highlights.length ? `${COLOUR[subject.colour]} text-white` : "bg-gray-200 text-gray-400"
          }`}
        >
          <Sparkles size={18} /> Make smart cards ({highlights.length})
        </button>
      </div>
    );
  };

  const ReviewScreen = () => (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => { setReviewFilter("all"); setReviewIdx(0); setShowBack(false); }}
          className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium ${
            reviewFilter === "all" ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-600"
          }`}
        >
          All ({dueAll.length})
        </button>
        {SUBJECTS.map((s) => {
          const n = dueAll.filter((c) => c.subject === s.id).length;
          return (
            <button
              key={s.id}
              onClick={() => { setReviewFilter(s.id); setReviewIdx(0); setShowBack(false); }}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium ${
                reviewFilter === s.id ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-600"
              }`}
            >
              {s.name} ({n})
            </button>
          );
        })}
      </div>
      {reviewCards.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
          <p className="text-3xl">✨</p>
          <p className="font-semibold text-gray-900 mt-2">All caught up</p>
          <p className="text-sm text-gray-500 mt-1">Cards come from mocks, topics and scanned notes.</p>
        </div>
      ) : (
        (() => {
          const card = reviewCards[Math.min(reviewIdx, reviewCards.length - 1)];
          return (
            <>
              <p className="text-sm text-gray-500 text-center">
                {reviewCards.length} due · {card.src}{card.src === "scan-highlight" ? " 📸" : ""}
              </p>
              <div className="bg-white border border-gray-200 rounded-2xl p-6 min-h-40 flex flex-col justify-center text-center">
                <p className="font-medium text-gray-900">{card.front}</p>
                {showBack && <p className="text-gray-600 mt-4 pt-4 border-t border-gray-100 text-sm">{card.back}</p>}
              </div>
              {!showBack ? (
                <button onClick={() => setShowBack(true)} className="w-full bg-gray-900 text-white rounded-xl py-3 font-semibold">
                  Reveal answer
                </button>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {[["Again", "again"], ["Hard", "hard"], ["Good", "good"], ["Easy", "easy"]].map(([label, key]) => (
                    <button
                      key={key}
                      onClick={() => gradeCard(key)}
                      className={`${GRADE_TONES[key]} rounded-xl py-2.5 text-sm font-semibold`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </>
          );
        })()
      )}
    </div>
  );

  const GroupsScreen = () =>
    openGroup ? (
      (() => {
        const g = groups.find((x) => x.id === openGroup);
        return (
          <div className="space-y-4">
            <button onClick={() => setOpenGroup(null)} className="flex items-center gap-1 text-gray-600 text-sm font-medium">
              <ArrowLeft size={16} /> Groups
            </button>
            <div className="bg-gradient-to-br from-gray-800 to-gray-600 text-white rounded-2xl p-5">
              <h2 className="text-xl font-bold">{g.name}</h2>
              <p className="text-white/70 text-sm mt-1">{g.members.length} members · code {g.code}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-4">
              <p className="font-semibold text-gray-900 text-sm mb-2">Members</p>
              <div className="flex flex-wrap gap-2">
                {g.members.map((m) => (
                  <span key={m} className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">{m}</span>
                ))}
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-4">
              <p className="font-semibold text-gray-900 text-sm mb-2">This week&apos;s challenge</p>
              <p className="text-sm text-gray-600">10 {subject.name} questions · same for everyone</p>
              <button className={`mt-3 ${COLOUR[subject.colour]} text-white rounded-xl px-4 py-2 text-sm font-semibold`}>
                Start challenge 👏
              </button>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-4">
              <p className="font-semibold text-gray-900 text-sm mb-2">Shared decks</p>
              {g.sharedDecks.map((d) => (
                <div key={d.name} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm text-gray-900">{d.name}</p>
                    <p className="text-xs text-gray-400">by {d.by} · {d.count} cards</p>
                  </div>
                  <button
                    onClick={() =>
                      setDeck([
                        ...deck,
                        {
                          id: "gd" + Date.now(),
                          subject: "biology",
                          front: "Shared: " + d.name,
                          back: "Cloned into your deck",
                          src: "group · " + g.name,
                          due: true,
                        },
                      ])
                    }
                    className="text-xs font-semibold text-gray-700 border border-gray-300 rounded-lg px-3 py-1.5"
                  >
                    Clone
                  </button>
                </div>
              ))}
            </div>
            <p className="text-center text-xs text-gray-400">Private group · no chat · report or leave anytime</p>
          </div>
        );
      })()
    ) : (
      <div className="space-y-4">
        {groups.map((g) => (
          <button
            key={g.id}
            onClick={() => setOpenGroup(g.id)}
            className="w-full bg-white border border-gray-200 rounded-2xl p-4 flex items-center justify-between hover:border-gray-300"
          >
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-gray-800 text-white flex items-center justify-center">
                <Users size={18} />
              </div>
              <div>
                <p className="font-medium text-gray-900">{g.name}</p>
                <p className="text-xs text-gray-400">{g.members.length} members</p>
              </div>
            </div>
            <ChevronRight className="text-gray-400" />
          </button>
        ))}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
          <p className="font-semibold text-gray-900 text-sm">Join a group</p>
          <div className="flex gap-2">
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Invite code"
              maxLength={6}
              className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-gray-400"
            />
            <button
              onClick={() => {
                if (joinCode.length === 6) {
                  setGroups([
                    ...groups,
                    { id: "g" + Date.now(), name: "New group", members: ["You"], code: joinCode, sharedDecks: [] },
                  ]);
                  setJoinCode("");
                }
              }}
              className="bg-gray-900 text-white rounded-xl px-4 text-sm font-semibold"
            >
              Join
            </button>
          </div>
          <button
            onClick={() =>
              setGroups([
                ...groups,
                {
                  id: "g" + Date.now(),
                  name: "My study group",
                  members: ["You"],
                  code: "AB" + Math.floor(1000 + Math.random() * 9000),
                  sharedDecks: [],
                },
              ])
            }
            className="w-full border border-gray-300 rounded-xl py-2.5 text-sm font-semibold text-gray-700 flex items-center justify-center gap-1"
          >
            <Plus size={16} /> Create a group
          </button>
        </div>
        <p className="text-center text-xs text-gray-400">Invite-only · no public discovery · safeguarding-first</p>
      </div>
    );

  const tabs = [
    { id: "home", label: "Home", icon: Home },
    { id: "topics", label: "Topics", icon: BookOpen },
    { id: "scan", label: "Scan", icon: ScanLine },
    { id: "review", label: "Review", icon: Layers, badge: dueAll.length },
    { id: "groups", label: "Groups", icon: Users },
  ];

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="px-4 pt-5 pb-3">
        <h1 className="font-bold text-gray-900">
          GradeUp <span className="text-xs font-normal text-gray-400">· GCSE study</span>
        </h1>
      </header>
      <main className="flex-1 px-4 pb-24">
        {tab === "home" && <HomeScreen />}
        {tab === "topics" && <TopicsScreen />}
        {tab === "mock" && <MockScreen />}
        {tab === "scan" && <ScanScreen />}
        {tab === "review" && <ReviewScreen />}
        {tab === "groups" && <GroupsScreen />}
      </main>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="max-w-md mx-auto flex">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id);
                if (t.id === "topics") setOpenTopic(null);
                if (t.id === "groups") setOpenGroup(null);
              }}
              className={`relative flex-1 py-3 flex flex-col items-center gap-0.5 text-xs ${
                tab === t.id ? "text-gray-900" : "text-gray-400"
              }`}
            >
              <t.icon size={20} />
              {t.label}
              {t.badge > 0 && (
                <span className="absolute top-1.5 right-1/4 bg-rose-500 text-white text-[10px] rounded-full px-1.5">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
