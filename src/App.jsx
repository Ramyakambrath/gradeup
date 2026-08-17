import { useState, useEffect, useRef } from "react";
import {
  BookOpen, PenLine, Layers, Home, Search, CheckCircle2, XCircle, Flame,
  ChevronRight, ArrowLeft, RotateCcw, ScanLine, Users, Highlighter, Sparkles,
  Plus, Camera, BarChart3, Download, Upload, FileDown, Play, Pause, TimerReset,
  StickyNote, ListOrdered, Send, Trash2, PencilLine, ClipboardList, CalendarDays,
  Check, Eye, EyeOff, Bold, Italic, Heading2, List, Quote, Minus,
} from "lucide-react";
import {
  SUBJECTS, TOPICS, QUESTIONS, DEFAULT_DECK, DEFAULT_GROUPS,
  COLOUR, COLOUR_LIGHT, COLOUR_SOFT, norm,
} from "./data/content";
import { useLocalStorage } from "./hooks/useLocalStorage";
import {
  createCard, migrateDeck, getDueCards, scheduleCard, todayISO,
  updateStreak, getStreakDisplay,
} from "./lib/sm2";
import { buildBackup, downloadBackup, readBackupFile } from "./lib/backup";
import { exportTopicPDF, exportMockPDF, exportNotePDF, exportPracticePaperPDF } from "./lib/pdf";
import { formatSeconds, recommendedMockSeconds } from "./lib/timer";
import { askFollowUp } from "./lib/tutor";
import { buildQuizQuestions } from "./lib/quiz";
import { recognizeImage } from "./lib/ocr";
import { classifySubject } from "./lib/classify";

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

const PILL_TONE = {
  indigo: "bg-indigo-100 text-indigo-700",
  emerald: "bg-emerald-100 text-emerald-700",
  rose: "bg-rose-100 text-rose-700",
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const AI_NAME = "Gradey";
const PAPER_SIZE = 20;

function shuffled(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const ICON_TONES = {
  indigo: "bg-indigo-100 text-indigo-600",
  emerald: "bg-emerald-100 text-emerald-600",
  rose: "bg-rose-100 text-rose-600",
  amber: "bg-amber-100 text-amber-600",
  sky: "bg-sky-100 text-sky-600",
  violet: "bg-violet-100 text-violet-600",
};

function IconTile({ icon: Icon, tone = "indigo", size = 18 }) {
  return (
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${ICON_TONES[tone] || ICON_TONES.indigo}`}>
      <Icon size={size} />
    </div>
  );
}

function BotAvatar({ size = 32, thinking = false }) {
  return (
    <div
      className={`rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 ${thinking ? "animate-pulse" : ""}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.55) }}
    >
      🤖
    </div>
  );
}

const SYMBOLS = ["√(", "²", "³", "^", "°", "π", "×", "÷", "±", "≤", "≥"];

/** Row of maths symbol buttons — inserts the tapped symbol via onInsert. Handy on-screen keyboards (e.g. iPad) don't expose these. */
function SymbolRow({ onInsert, dark = false }) {
  return (
    <div className="flex flex-wrap gap-1">
      {SYMBOLS.map((sym) => (
        <button
          key={sym}
          type="button"
          onClick={() => onInsert(sym)}
          className={`w-7 h-7 rounded-lg text-sm font-medium shrink-0 ${
            dark
              ? "bg-white/10 border border-white/20 text-gray-300 hover:bg-white/20 hover:text-white"
              : "bg-gray-50 border border-gray-200 text-gray-600 hover:bg-white hover:border-gray-300 hover:text-gray-900"
          }`}
        >
          {sym}
        </button>
      ))}
    </div>
  );
}

const STRAND_TIPS = {
  Number: "Practise converting between fractions, decimals and percentages until it's automatic — most Number slip-ups come from misreading place value.",
  Algebra: "Rewrite the equation one line at a time and say out loud what you're doing to both sides — most Algebra errors are sign errors, not method errors.",
  Ratio: "Always find the value of \"one part\" or \"one unit\" first, then scale up — that one habit fixes most Ratio mistakes.",
  Geometry: "Sketch the shape and label every side and angle you know before you start calculating — Geometry marks are lost from working blind, not from the maths.",
  Probability: "Draw the tree or sample-space diagram before you calculate anything — Probability mistakes usually come from skipping this step.",
  Statistics: "Double-check what the question is actually asking for (mean vs median, correlation vs causation) before you answer.",
  "Cell biology": "Go back to the diagram and label every organelle from memory — most marks lost here are for mixing up structure and function.",
  Organisation: "Link cause to effect explicitly in your answer (e.g. \"the enzyme is denatured, so it can no longer...\") — GCSE Biology rewards explaining the mechanism, not just naming it.",
  Macbeth: "Practise picking one short quotation per theme and explaining Shakespeare's word choice — examiners reward analysis of language over plot summary.",
  "A Christmas Carol": "Tie every point back to Dickens's Victorian context (poverty, social reform) — that's usually the difference between a good and a top-band answer.",
};
const DEFAULT_STRAND_TIP = "Revisit this topic's concept and example on the Topics page, then try a short test on it.";

function Badge({ text, tone = "gray" }) {
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${BADGE_TONES[tone] || BADGE_TONES.gray}`}>{text}</span>;
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 text-center">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}

/** Self-contained step-reveal panel. Module-level so its own state survives parent re-renders. */
function StepWalkthrough({ steps, colourClass = "bg-indigo-600", onClose }) {
  const [idx, setIdx] = useState(0);
  if (!steps || steps.length === 0) return null;
  return (
    <div className="bg-gray-900 text-white rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>Step {idx + 1} of {steps.length}</span>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xs font-semibold">
            Close
          </button>
        )}
      </div>
      <p className="text-sm leading-relaxed">{steps[idx]}</p>
      <div className="flex gap-2">
        {idx > 0 && (
          <button onClick={() => setIdx((i) => i - 1)} className="flex-1 border border-white/20 rounded-xl py-2 text-sm font-semibold">
            Back
          </button>
        )}
        {idx < steps.length - 1 ? (
          <button onClick={() => setIdx((i) => i + 1)} className={`flex-1 ${colourClass} rounded-xl py-2 text-sm font-semibold`}>
            Next step
          </button>
        ) : (
          <button onClick={() => setIdx(0)} className="flex-1 border border-white/20 rounded-xl py-2 text-sm font-semibold">
            Restart
          </button>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [onboarded, setOnboarded] = useLocalStorage("gradeup-onboarded", false);
  const [tier, setTier] = useLocalStorage("gradeup-tier", null);
  const [pendingTier, setPendingTier] = useState(null);

  const [tab, setTab] = useState("home");
  const [subjectId, setSubjectId] = useState("maths");
  const subject = SUBJECTS.find((s) => s.id === subjectId);

  const [customQuestions, setCustomQuestions] = useLocalStorage("gradeup-custom-questions", []);
  const questionsFor = (subjId) => [...(QUESTIONS[subjId] || []), ...customQuestions.filter((q) => q.subject === subjId)];

  const [addQOpen, setAddQOpen] = useState(false);
  const [addQRef, setAddQRef] = useState("");
  const [addQText, setAddQText] = useState("");
  const [addQAnswer, setAddQAnswer] = useState("");
  const [addQModel, setAddQModel] = useState("");
  const [addQMarks, setAddQMarks] = useState(1);

  const [query, setQuery] = useState("");
  const [openTopic, setOpenTopic] = useState(null);

  const [mockState, setMockState] = useState("setup");
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);

  const [deck, setDeck] = useLocalStorage("gradeup-deck", DEFAULT_DECK);
  useEffect(() => { setDeck((d) => migrateDeck(d)); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [reviewIdx, setReviewIdx] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [reviewFilter, setReviewFilter] = useState("all");
  const [streakData, setStreakData] = useLocalStorage("gradeup-streak", { lastReviewDate: null, count: 0 });
  const streak = getStreakDisplay(streakData);

  const [mockHistory, setMockHistory] = useLocalStorage("gradeup-mock-history", []);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  useEffect(() => {
    if (!timerRunning) return;
    const id = setInterval(() => {
      setTimerSeconds((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [timerRunning]);
  useEffect(() => {
    if (timerSeconds === 0 && timerRunning) setTimerRunning(false);
  }, [timerSeconds, timerRunning]);

  const [scanStep, setScanStep] = useState("list"); // list | capture | extracting | edit | highlight
  const [noteText, setNoteText] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteSubjectId, setNoteSubjectId] = useState(null);
  const [activeNoteId, setActiveNoteId] = useState(null);
  const noteTextareaRef = useRef(null);
  const [notesFilter, setNotesFilter] = useState("all");
  const [scanProgress, setScanProgress] = useState(0);
  const [scanDetected, setScanDetected] = useState(null); // { subjectId, confidence } | null
  const [scanError, setScanError] = useState("");
  const scanFileInputRef = useRef(null);
  const [highlights, setHighlights] = useState([]);
  const [notes, setNotes] = useLocalStorage("gradeup-notes", []);
  const [smartCards, setSmartCards] = useState(null);

  const [groups, setGroups] = useLocalStorage("gradeup-groups", DEFAULT_GROUPS);
  const [openGroup, setOpenGroup] = useState(null);
  const [joinCode, setJoinCode] = useState("");

  // AI tutor follow-up chat (per topic, not persisted)
  const [tutorHistory, setTutorHistory] = useState([]);
  const [tutorInput, setTutorInput] = useState("");
  const [tutorLoading, setTutorLoading] = useState(false);
  useEffect(() => { setTutorHistory([]); setTutorInput(""); }, [openTopic]);

  // Step-by-step walkthrough toggles
  const [topicWalkthroughOpen, setTopicWalkthroughOpen] = useState(false);
  useEffect(() => { setTopicWalkthroughOpen(false); }, [openTopic]);
  const [openMockWalkthroughs, setOpenMockWalkthroughs] = useState({});

  // Practice hub: mock (short-answer) / quiz (MCQ) / paper (printable)
  const [practiceMode, setPracticeMode] = useState("mock");
  // When set, Mock/Quiz are scoped to a single topic (launched from "Test me on this topic")
  const [topicTestRef, setTopicTestRef] = useState(null);

  const [quizState, setQuizState] = useState("setup");
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [quizIdx, setQuizIdx] = useState(0);
  const [quizChoice, setQuizChoice] = useState(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizAnswered, setQuizAnswered] = useState([]);
  const [quizHistory, setQuizHistory] = useLocalStorage("gradeup-quiz-history", []);

  const [paperGenerated, setPaperGenerated] = useState(false);
  const [paperRevealed, setPaperRevealed] = useState(false);
  const [paperQuestions, setPaperQuestions] = useState([]);

  // Revision planner
  const [exams, setExams] = useLocalStorage("gradeup-exams", []);
  const [plannerTasks, setPlannerTasks] = useLocalStorage("gradeup-planner-tasks", []);
  const [newExamName, setNewExamName] = useState("");
  const [newExamDate, setNewExamDate] = useState("");
  const [newTaskLabel, setNewTaskLabel] = useState("");
  const [newTaskDate, setNewTaskDate] = useState("");
  const taskLabelInputRef = useRef(null);

  // Subject-level AI agent (general Q&A, not tied to one topic)
  const [agentHistory, setAgentHistory] = useState([]);
  const [agentInput, setAgentInput] = useState("");
  const [agentLoading, setAgentLoading] = useState(false);
  useEffect(() => { setAgentHistory([]); setAgentInput(""); }, [subjectId]);

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
  const dueAll = getDueCards(deck, { tier });
  const dueForSubject = getDueCards(deck, { filter: subjectId, tier });
  const reviewCards = getDueCards(deck, { filter: reviewFilter, tier });

  const submitMock = () => {
    const allQs = questionsFor(subjectId);
    const qs = topicTestRef ? allQs.filter((q) => q.ref === topicTestRef) : allQs;
    const res = qs.map((q) => {
      const given = answers[q.id] || "";
      const correct =
        norm(given).includes(norm(q.answer)) ||
        (norm(q.answer).includes(norm(given)) && given.length > 2);
      return { ...q, given, correct, awarded: correct ? q.marks : 0 };
    });
    setResult(res);
    setMockState("result");
    const total = res.reduce((s, r) => s + r.awarded, 0);
    const max = res.reduce((s, r) => s + r.marks, 0);
    const pct = max ? Math.round((100 * total) / max) : 0;
    setMockHistory((h) => [...h, { date: todayISO(), subject: subjectId, total, max, pct, byRef: res.map((r) => ({ ref: r.ref, correct: r.correct })) }].slice(-200));
  };

  const addCustomQuestion = () => {
    if (!addQRef || !addQText.trim() || !addQAnswer.trim()) return;
    const q = {
      id: "custom" + Date.now(),
      subject: subjectId,
      ref: addQRef,
      marks: Math.max(1, Number(addQMarks) || 1),
      q: addQText.trim(),
      answer: addQAnswer.trim(),
      model: addQModel.trim() || addQAnswer.trim(),
      fb: { right: "Correct!", wrong: `Model answer: ${addQModel.trim() || addQAnswer.trim()}` },
      custom: true,
    };
    setCustomQuestions((qs) => [...qs, q]);
    setAddQText(""); setAddQAnswer(""); setAddQModel(""); setAddQMarks(1); setAddQOpen(false);
  };

  const deleteCustomQuestion = (id) => setCustomQuestions((qs) => qs.filter((q) => q.id !== id));

  const addMistakes = () => {
    const cards = result
      .filter((r) => !r.correct && !deck.some((c) => c.id === "q" + r.id))
      .map((r) =>
        createCard({
          id: "q" + r.id,
          subject: subjectId,
          front: r.q,
          back: r.model,
          src: "mock mistake \u00b7 " + r.ref,
        })
      );
    setDeck([...deck, ...cards]);
  };

  const gradeCard = (grade) => {
    const card = reviewCards[Math.min(reviewIdx, reviewCards.length - 1)];
    setShowBack(false);
    setDeck((d) => d.map((c) => (c.id === card.id ? scheduleCard(c, grade) : c)));
    setStreakData((s) => updateStreak(s));
    if (grade === "again") {
      setReviewIdx((i) => (i + 1 < reviewCards.length ? i + 1 : 0));
    } else {
      setReviewIdx(0);
    }
  };

  const exportBackup = () => downloadBackup(buildBackup({ deck, notes, groups, mockHistory, quizHistory, exams, plannerTasks, streakData, tier, customQuestions }));

  const importBackup = async (file) => {
    if (!file) return;
    try {
      const data = await readBackupFile(file);
      if (!window.confirm("This will replace your current deck, notes, groups and progress with the imported backup. Continue?")) return;
      if (data.deck) setDeck(migrateDeck(data.deck));
      if (data.notes) setNotes(data.notes);
      if (data.groups) setGroups(data.groups);
      if (data.mockHistory) setMockHistory(data.mockHistory);
      if (data.quizHistory) setQuizHistory(data.quizHistory);
      if (data.exams) setExams(data.exams);
      if (data.plannerTasks) setPlannerTasks(data.plannerTasks);
      if (data.streakData) setStreakData(data.streakData);
      if (data.tier) setTier(data.tier);
      if (data.customQuestions) setCustomQuestions(data.customQuestions);
      window.alert("Import successful! 🎉");
    } catch {
      window.alert("Could not read that file — make sure it's a GradeUp backup (.json).");
    }
  };

  // ── Quiz (MCQ) ──
  const startQuiz = () => {
    const pool = TOPICS[subjectId] || [];
    const qs = buildQuizQuestions(pool, 6);
    setQuizQuestions(qs);
    setQuizIdx(0);
    setQuizScore(0);
    setQuizChoice(null);
    setQuizAnswered([]);
    setQuizState(qs.length ? "running" : "setup");
  };

  // ── Test me on this topic (launched from Topics) ──
  const startTopicMock = (topic) => {
    const qs = questionsFor(subjectId).filter((q) => q.ref === topic.ref);
    setTopicTestRef(topic.ref);
    setPracticeMode("mock");
    setMockState("running");
    setQIndex(0);
    setAnswers({});
    setResult(null);
    setTimerSeconds(recommendedMockSeconds(qs));
    setTimerRunning(false);
    setTab("practice");
  };

  const startTopicQuiz = (topic) => {
    const allTopics = TOPICS[subjectId] || [];
    const pool = allTopics.filter((t) => t.strand === topic.strand);
    const qs = buildQuizQuestions(pool, Math.min(4, pool.length));
    setTopicTestRef(topic.ref);
    setPracticeMode("quiz");
    setQuizQuestions(qs);
    setQuizIdx(0);
    setQuizScore(0);
    setQuizChoice(null);
    setQuizAnswered([]);
    setQuizState(qs.length ? "running" : "setup");
    setTab("practice");
  };

  const clearTopicTest = () => setTopicTestRef(null);

  const answerQuiz = (choice) => {
    if (quizChoice !== null) return;
    const q = quizQuestions[quizIdx];
    const correct = choice === q.answer;
    setQuizChoice(choice);
    if (correct) setQuizScore((s) => s + 1);
    setQuizAnswered((a) => [...a, { ...q, given: choice, correct }]);
  };

  const nextQuiz = () => {
    if (quizIdx + 1 < quizQuestions.length) {
      setQuizIdx((i) => i + 1);
      setQuizChoice(null);
    } else {
      const pct = Math.round((100 * quizScore) / quizQuestions.length);
      const byRef = quizAnswered.map((r) => ({ ref: r.ref, correct: r.correct }));
      setQuizHistory((h) => [...h, { date: todayISO(), subject: subjectId, total: quizScore, max: quizQuestions.length, pct, byRef }].slice(-200));
      setQuizState("result");
    }
  };

  const addQuizMistakes = () => {
    const cards = quizAnswered
      .filter((r) => !r.correct && !deck.some((c) => c.id === "qz" + r.ref))
      .map((r) =>
        createCard({
          id: "qz" + r.ref,
          subject: subjectId,
          front: r.question,
          back: r.answer,
          src: "quiz mistake \u00b7 " + r.ref,
          specRef: r.ref,
        })
      );
    setDeck([...deck, ...cards]);
  };

  // ── Planner ──
  const addExam = () => {
    if (!newExamName.trim() || !newExamDate) return;
    setExams((e) => [...e, { id: "ex" + Date.now(), subject: subjectId, name: newExamName.trim(), date: newExamDate }]);
    setNewExamName("");
    setNewExamDate("");
  };
  const deleteExam = (id) => setExams((e) => e.filter((x) => x.id !== id));

  const addTask = () => {
    if (!newTaskLabel.trim() || !newTaskDate) return;
    setPlannerTasks((t) => [...t, { id: "tk" + Date.now(), subject: subjectId, label: newTaskLabel.trim(), date: newTaskDate, done: false }]);
    setNewTaskLabel("");
    setNewTaskDate("");
  };
  const toggleTask = (id) => setPlannerTasks((t) => t.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
  const deleteTask = (id) => setPlannerTasks((t) => t.filter((x) => x.id !== id));

  const daysUntil = (dateStr) => Math.ceil((new Date(dateStr) - new Date(todayISO())) / (1000 * 60 * 60 * 24));

  // ── Subject-level AI agent ──
  const askAgent = async () => {
    const question = agentInput.trim();
    if (!question || agentLoading) return;
    const newHistory = [...agentHistory, { role: "user", text: question }];
    setAgentHistory(newHistory);
    setAgentInput("");
    setAgentLoading(true);
    const pseudoTopic = { ref: subject.spec, title: subject.name, concept: `General ${subject.name} study help.`, example: "", mistakes: "" };
    try {
      const answer = await askFollowUp({ question, topic: pseudoTopic, tier, history: newHistory });
      setAgentHistory((h) => [...h, { role: "assistant", text: answer }]);
    } catch (err) {
      setAgentHistory((h) => [...h, { role: "assistant", text: err.message || "Something went wrong \u2014 try again." }]);
    } finally {
      setAgentLoading(false);
    }
  };

  const sentences = noteText.split(/(?<=\.)\s+/).filter(Boolean);
  const toggleHighlight = (i) =>
    setHighlights((h) => (h.includes(i) ? h.filter((x) => x !== i) : [...h, i]));

  const makeSmartCards = () => {
    const gen = highlights.map((i) => {
      const s = sentences[i].trim();
      const words = s.split(" ");
      const front = words.length > 4 ? `Complete or explain: "${words.slice(0, 4).join(" ")}…"` : "Key point from this note?";
      return { front, back: s, accepted: true };
    });
    setSmartCards(gen);
  };

  const acceptSmartCards = () => {
    const accepted = smartCards
      .filter((c) => c.accepted)
      .map((c, i) =>
        createCard({
          id: "sc" + Date.now() + i,
          subject: subjectId,
          front: c.front,
          back: c.back,
          src: activeNoteId ? "note \u00b7 " + noteTitle : "scan-highlight",
        })
      );
    setDeck([...deck, ...accepted]);
    setSmartCards(null);
    setHighlights([]);
    setScanStep("edit");
    setTab("review");
  };

  // ── Notes: create / open / save / delete ──
  const openNewNote = () => {
    setActiveNoteId(null);
    setNoteTitle("");
    setNoteText("");
    setNoteSubjectId(subjectId);
    setHighlights([]);
    setSmartCards(null);
    setScanStep("edit");
  };

  const openScanCapture = () => {
    setActiveNoteId(null);
    setNoteTitle("");
    setNoteText("");
    setNoteSubjectId(subjectId);
    setHighlights([]);
    setSmartCards(null);
    setScanError("");
    setScanDetected(null);
    setScanStep("capture");
  };

  const runScan = async (file) => {
    if (!file) return;
    setScanStep("extracting");
    setScanProgress(0);
    setScanError("");
    try {
      const text = await recognizeImage(file, setScanProgress);
      if (!text) {
        setScanError("Couldn't find any text in that photo — try a clearer, well-lit shot.");
        setScanStep("capture");
        return;
      }
      const { subjectId: detectedId, confidence } = classifySubject(text, SUBJECTS, TOPICS);
      const finalSubjectId = detectedId || subjectId;
      setNoteText(text);
      setNoteTitle("Scanned note");
      setNoteSubjectId(finalSubjectId);
      setScanDetected(detectedId ? { subjectId: detectedId, confidence } : null);
      setScanStep("edit");
    } catch {
      setScanError("Scan failed — try again with a clearer photo.");
      setScanStep("capture");
    }
  };

  const openNote = (note) => {
    setActiveNoteId(note.id);
    setNoteTitle(note.title || "Untitled note");
    setNoteText(note.text);
    setNoteSubjectId(note.subject);
    setHighlights([]);
    setSmartCards(null);
    setScanStep("edit");
  };

  const saveNote = () => {
    const title = noteTitle.trim() || "Untitled note";
    const subj = noteSubjectId || subjectId;
    if (activeNoteId) {
      setNotes((ns) => ns.map((n) => (n.id === activeNoteId ? { ...n, title, text: noteText, subject: subj, date: todayISO() } : n)));
    } else {
      const id = "n" + Date.now();
      setNotes((ns) => [...ns, { id, subject: subj, title, text: noteText, date: todayISO(), source: "typed" }]);
      setActiveNoteId(id);
    }
  };

  const deleteNote = () => {
    if (!activeNoteId) return;
    if (!window.confirm("Delete this note?")) return;
    setNotes((ns) => ns.filter((n) => n.id !== activeNoteId));
    setActiveNoteId(null);
    setNoteTitle("");
    setNoteText("");
    setScanStep("list");
  };

  const insertFormatting = (before, after = "") => {
    const ta = noteTextareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = noteText.slice(start, end);
    const next = noteText.slice(0, start) + before + selected + after + noteText.slice(end);
    setNoteText(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = start + before.length;
      ta.selectionEnd = start + before.length + selected.length;
    });
  };

  // ── AI tutor follow-up chat ──
  const askTutor = async () => {
    const question = tutorInput.trim();
    if (!question || tutorLoading || !openTopic) return;
    const newHistory = [...tutorHistory, { role: "user", text: question }];
    setTutorHistory(newHistory);
    setTutorInput("");
    setTutorLoading(true);
    try {
      const answer = await askFollowUp({ question, topic: openTopic, tier, history: newHistory });
      setTutorHistory((h) => [...h, { role: "assistant", text: answer }]);
    } catch (err) {
      setTutorHistory((h) => [...h, { role: "assistant", text: err.message || "Something went wrong \u2014 try again." }]);
    } finally {
      setTutorLoading(false);
    }
  };

  const toggleMockWalkthrough = (id) =>
    setOpenMockWalkthroughs((m) => ({ ...m, [id]: !m[id] }));

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
          onClick={() => { setTab("practice"); setPracticeMode("mock"); setMockState("setup"); }}
          className="bg-white border border-gray-200 rounded-2xl p-4 text-left hover:border-gray-300 hover:shadow-md transition-all"
        >
          <IconTile icon={PenLine} tone="indigo" />
          <p className="font-semibold text-gray-900 mt-2 text-sm">Practice</p>
          <p className="text-xs text-gray-500">{subject.mocksSoon ? "Quiz & papers" : "Mock · quiz · paper"}</p>
        </button>
        <button
          onClick={() => { setTab("notes"); setScanStep("list"); }}
          className="bg-white border border-gray-200 rounded-2xl p-4 text-left hover:border-gray-300 hover:shadow-md transition-all"
        >
          <IconTile icon={StickyNote} tone="amber" />
          <p className="font-semibold text-gray-900 mt-2 text-sm">Notes</p>
          <p className="text-xs text-gray-500">scan or write · → cards</p>
        </button>
        <button
          onClick={() => setTab("planner")}
          className="bg-white border border-gray-200 rounded-2xl p-4 text-left hover:border-gray-300 hover:shadow-md transition-all"
        >
          <IconTile icon={CalendarDays} tone="emerald" />
          <p className="font-semibold text-gray-900 mt-2 text-sm">Planner</p>
          <p className="text-xs text-gray-500">exams · revision tasks</p>
        </button>
        <button
          onClick={() => setTab("topics")}
          className="bg-white border border-gray-200 rounded-2xl p-4 text-left hover:border-gray-300 hover:shadow-md transition-all"
        >
          <BotAvatar size={36} />
          <p className="font-semibold text-gray-900 mt-2 text-sm">Ask {AI_NAME}</p>
          <p className="text-xs text-gray-500">general or per-topic help</p>
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
                  createCard({
                    id,
                    subject: subjectId,
                    front: openTopic.title + " — key idea?",
                    back: openTopic.concept.split(".")[0] + ".",
                    src: "topic " + openTopic.ref,
                    specRef: openTopic.ref,
                  }),
                ]);
              }
            }}
            className={`w-full ${COLOUR[subject.colour]} text-white rounded-xl py-2.5 text-sm font-semibold`}
          >
            Add to review deck
          </button>
          <button
            onClick={() => {
              const hasMockQs = questionsFor(subjectId).some((q) => q.ref === openTopic.ref);
              if (hasMockQs) startTopicMock(openTopic);
              else startTopicQuiz(openTopic);
            }}
            className="w-full border border-gray-300 rounded-xl py-2.5 text-sm font-semibold text-gray-600 flex items-center justify-center gap-1"
          >
            <ClipboardList size={16} /> Test me on this topic
          </button>
          <button
            onClick={() => exportTopicPDF(openTopic, subject.name)}
            className="w-full border border-gray-300 rounded-xl py-2.5 text-sm font-semibold text-gray-600 flex items-center justify-center gap-1"
          >
            <FileDown size={16} /> Download as PDF
          </button>

          {!topicWalkthroughOpen ? (
            <button
              onClick={() => setTopicWalkthroughOpen(true)}
              className="w-full border border-gray-300 rounded-xl py-2.5 text-sm font-semibold text-gray-600 flex items-center justify-center gap-1"
            >
              <ListOrdered size={16} /> Walk me through the example
            </button>
          ) : (
            <StepWalkthrough
              steps={openTopic.steps && openTopic.steps.length ? openTopic.steps : [openTopic.example]}
              colourClass={COLOUR[subject.colour]}
              onClose={() => setTopicWalkthroughOpen(false)}
            />
          )}

          <section className="border-t border-gray-100 pt-4">
            <div className="flex items-center gap-2 mb-1">
              <BotAvatar size={26} />
              <div>
                <h3 className="font-semibold text-xs text-gray-900 leading-tight">{AI_NAME}</h3>
                <p className="text-[10px] text-gray-400 leading-tight">Ask a follow-up about this topic</p>
              </div>
            </div>
            <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
              {tutorHistory.length === 0 && (
                <p className="text-xs text-gray-400">Ask anything about this topic — e.g. "why does the sign flip?"</p>
              )}
              {tutorHistory.map((m, i) => (
                <div key={i} className={`flex items-end gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                  {m.role !== "user" && <BotAvatar size={18} />}
                  <div
                    className={`text-sm rounded-xl px-3 py-2 max-w-[78%] ${
                      m.role === "user" ? "bg-indigo-50 text-indigo-900" : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {tutorLoading && (
                <div className="flex items-end gap-2">
                  <BotAvatar size={18} thinking />
                  <div className="text-xs text-gray-400 bg-gray-100 rounded-xl px-3 py-2">{AI_NAME} is thinking…</div>
                </div>
              )}
            </div>
            <SymbolRow onInsert={(sym) => setTutorInput((v) => v + sym)} />
            <div className="flex gap-2 mt-2">
              <input
                value={tutorInput}
                onChange={(e) => setTutorInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") askTutor();
                }}
                placeholder={`Ask ${AI_NAME} a question…`}
                className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
              />
              <button
                onClick={askTutor}
                disabled={tutorLoading || !tutorInput.trim()}
                className={`${COLOUR[subject.colour]} text-white rounded-xl px-3 text-sm font-semibold disabled:opacity-40 flex items-center justify-center`}
              >
                <Send size={15} />
              </button>
            </div>
          </section>
        </div>
      </div>
    ) : (
      <div className="space-y-3">
        <div className="bg-gray-900 text-white rounded-2xl p-4">
          <div className="flex items-center gap-2.5">
            <BotAvatar size={34} />
            <div>
              <h3 className="font-semibold text-sm leading-tight">{AI_NAME}</h3>
              <p className="text-[11px] text-gray-400 leading-tight">Your {subject.name} study buddy</p>
            </div>
          </div>
          <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
            {agentHistory.length === 0 && (
              <div className="text-center py-3">
                <div className="text-3xl mb-1">🤖</div>
                <p className="text-xs text-gray-400 max-w-[220px] mx-auto">
                  Hey, I'm {AI_NAME}! Ask me anything general about {subject.name} — e.g. "what should I revise this week?"
                </p>
              </div>
            )}
            {agentHistory.map((m, i) => (
              <div key={i} className={`flex items-end gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                {m.role !== "user" && <BotAvatar size={22} />}
                <div
                  className={`text-sm rounded-xl px-3 py-2 max-w-[78%] ${
                    m.role === "user" ? "bg-violet-600" : "bg-white/10 text-gray-100"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {agentLoading && (
              <div className="flex items-end gap-2">
                <BotAvatar size={22} thinking />
                <div className="text-xs text-gray-400 bg-white/10 rounded-xl px-3 py-2">{AI_NAME} is thinking…</div>
              </div>
            )}
          </div>
          <SymbolRow dark onInsert={(sym) => setAgentInput((v) => v + sym)} />
          <div className="flex gap-2 mt-2">
            <input
              value={agentInput}
              onChange={(e) => setAgentInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") askAgent(); }}
              placeholder={`Ask ${AI_NAME}…`}
              className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:border-white/40"
            />
            <button
              onClick={askAgent}
              disabled={agentLoading || !agentInput.trim()}
              className="bg-violet-600 text-white rounded-xl px-3 text-sm font-semibold disabled:opacity-40 flex items-center justify-center"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
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
        <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-3">
          {topics.map((t) => (
            <button
              key={t.ref}
              onClick={() => setOpenTopic(t)}
              className="w-full bg-white border border-gray-200 rounded-2xl p-4 flex items-center justify-between hover:border-gray-300 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3 text-left">
                <span className={`font-mono text-xs px-2 py-1 rounded-lg font-semibold ${COLOUR_SOFT[subject.colour]}`}>{t.ref}</span>
                <div>
                  <p className="font-medium text-gray-900">{t.title}</p>
                  <Badge text={t.strand} tone="sky" />
                </div>
              </div>
              <ChevronRight className="text-gray-400 shrink-0" />
            </button>
          ))}
        </div>
      </div>
    );

  const MockScreen = () => {
    const allQs = questionsFor(subjectId);
    const qs = topicTestRef ? allQs.filter((q) => q.ref === topicTestRef) : allQs;
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
      const subjectTopics = TOPICS[subjectId] || [];
      const subjectCustomQs = customQuestions.filter((q) => q.subject === subjectId);
      return (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <h2 className="text-lg font-bold text-gray-900">Quick {subject.name} mock</h2>
            <p className="text-sm text-gray-500 mt-1">{qs.length} questions · instant marking</p>
            <button
              onClick={() => {
                setTopicTestRef(null);
                setMockState("running"); setQIndex(0); setAnswers({}); setResult(null);
                setTimerSeconds(recommendedMockSeconds(qs));
                setTimerRunning(false);
              }}
              className={`mt-4 w-full ${COLOUR[subject.colour]} text-white rounded-xl py-3 font-semibold`}
            >
              Start mock
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <button onClick={() => setAddQOpen((o) => !o)} className="w-full flex items-center justify-between text-sm font-semibold text-gray-900">
              <span className="flex items-center gap-1.5"><Plus size={16} /> Add your own question</span>
              <span className="text-gray-400 text-xs">{addQOpen ? "Close" : `${subjectCustomQs.length} custom`}</span>
            </button>
            {addQOpen && (
              <div className="mt-3 space-y-2">
                <select
                  value={addQRef}
                  onChange={(e) => setAddQRef(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
                >
                  <option value="">Which topic is this about?</option>
                  {subjectTopics.map((t) => (
                    <option key={t.ref} value={t.ref}>{t.ref} · {t.title}</option>
                  ))}
                </select>
                <textarea
                  value={addQText}
                  onChange={(e) => setAddQText(e.target.value)}
                  placeholder="Question text…"
                  className="w-full h-20 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
                />
                <SymbolRow onInsert={(sym) => setAddQText((v) => v + sym)} />
                <input
                  value={addQAnswer}
                  onChange={(e) => setAddQAnswer(e.target.value)}
                  placeholder="Short answer / key phrase used to mark it correct"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
                />
                <textarea
                  value={addQModel}
                  onChange={(e) => setAddQModel(e.target.value)}
                  placeholder="Model answer / mark scheme (optional — defaults to the short answer)"
                  className="w-full h-16 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
                />
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500">Marks</label>
                  <input
                    type="number"
                    min="1"
                    value={addQMarks}
                    onChange={(e) => setAddQMarks(e.target.value)}
                    className="w-16 border border-gray-300 rounded-xl px-2 py-1.5 text-sm focus:outline-none focus:border-gray-400"
                  />
                </div>
                <button
                  disabled={!addQRef || !addQText.trim() || !addQAnswer.trim()}
                  onClick={addCustomQuestion}
                  className={`w-full ${COLOUR[subject.colour]} text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-40`}
                >
                  Save question
                </button>
              </div>
            )}
            {subjectCustomQs.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {subjectCustomQs.map((q) => (
                  <div key={q.id} className="flex items-center justify-between gap-2 bg-gray-50 rounded-lg px-2.5 py-1.5">
                    <p className="text-xs text-gray-600 truncate">{q.ref} · {q.q}</p>
                    <button onClick={() => deleteCustomQuestion(q.id)} className="text-gray-400 hover:text-rose-500 shrink-0">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
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
          <div className={`flex items-center justify-between rounded-xl px-3 py-2 text-white ${timerSeconds === 0 ? "bg-rose-600" : timerSeconds <= 60 ? "bg-amber-600" : "bg-gray-900"}`}>
            <span className="text-xs font-medium">{timerSeconds === 0 ? "⏰ Time's up" : "Timed practice"}</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-sm tabular-nums">{formatSeconds(timerSeconds)}</span>
              <button
                onClick={() => setTimerRunning((r) => !r)}
                disabled={timerSeconds === 0}
                className="bg-white/20 hover:bg-white/30 rounded-lg p-1.5 disabled:opacity-40"
              >
                {timerRunning ? <Pause size={13} /> : <Play size={13} />}
              </button>
              <button
                onClick={() => { setTimerSeconds(recommendedMockSeconds(qs)); setTimerRunning(false); }}
                className="bg-white/20 hover:bg-white/30 rounded-lg p-1.5"
              >
                <TimerReset size={13} />
              </button>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <p className="text-gray-900 font-medium">{q.q}</p>
            <input
              value={answers[q.id] || ""}
              onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
              placeholder="Your answer…"
              className="mt-4 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-gray-400"
            />
            <div className="mt-2">
              <SymbolRow onInsert={(sym) => setAnswers({ ...answers, [q.id]: (answers[q.id] || "") + sym })} />
            </div>
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
                {!r.correct && r.steps && r.steps.length > 0 && (
                  <div className="mt-2">
                    {!openMockWalkthroughs[r.id] ? (
                      <button
                        onClick={() => toggleMockWalkthrough(r.id)}
                        className="text-xs font-semibold text-gray-600 border border-gray-300 rounded-lg px-2.5 py-1 flex items-center gap-1"
                      >
                        <ListOrdered size={12} /> Walk through the method
                      </button>
                    ) : (
                      <StepWalkthrough
                        steps={r.steps}
                        colourClass={COLOUR[subject.colour]}
                        onClose={() => toggleMockWalkthrough(r.id)}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        <button
          onClick={() => exportMockPDF(subject.name, result)}
          className="w-full border border-gray-300 rounded-xl py-2.5 text-sm font-semibold text-gray-600 flex items-center justify-center gap-1"
        >
          <FileDown size={14} /> Download PDF report
        </button>
        <button
          onClick={() => { setTopicTestRef(null); setMockState("setup"); }}
          className="w-full border border-gray-300 rounded-xl py-2.5 text-sm font-semibold text-gray-600 flex items-center justify-center gap-1"
        >
          <RotateCcw size={14} /> New mock
        </button>
      </div>
    );
  };

  const QuizScreen = () => {
    const topicPool = TOPICS[subjectId] || [];
    if (quizState === "setup") {
      return (
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h2 className="text-lg font-bold text-gray-900">Quick-fire {subject.name} quiz</h2>
          <p className="text-sm text-gray-500 mt-1">Multiple choice · {Math.min(6, topicPool.length)} questions · instant feedback</p>
          <button
            disabled={topicPool.length === 0}
            onClick={() => { setTopicTestRef(null); startQuiz(); }}
            className={`mt-4 w-full ${COLOUR[subject.colour]} text-white rounded-xl py-3 font-semibold disabled:opacity-40`}
          >
            Start quiz
          </button>
        </div>
      );
    }
    if (quizState === "running") {
      const q = quizQuestions[quizIdx];
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>Q{quizIdx + 1} of {quizQuestions.length}</span>
            <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-xs">{q.ref}</span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${COLOUR[subject.colour]}`}
              style={{ width: `${((quizIdx + (quizChoice !== null ? 1 : 0)) / quizQuestions.length) * 100}%` }}
            />
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <p className="text-gray-900 font-semibold mb-4">{q.question}</p>
            <div className="space-y-2">
              {q.choices.map((c, i) => {
                const isCorrect = c === q.answer;
                const isChosen = c === quizChoice;
                let cls = "border-gray-200 text-gray-700";
                if (quizChoice !== null) {
                  if (isCorrect) cls = "border-emerald-400 bg-emerald-50 text-emerald-800";
                  else if (isChosen) cls = "border-rose-400 bg-rose-50 text-rose-700";
                }
                return (
                  <button
                    key={i}
                    onClick={() => answerQuiz(c)}
                    disabled={quizChoice !== null}
                    className={`w-full text-left border rounded-xl px-3 py-2.5 text-sm ${cls}`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>
          {quizChoice !== null && (
            <button onClick={nextQuiz} className={`w-full ${COLOUR[subject.colour]} text-white rounded-xl py-2.5 text-sm font-semibold`}>
              {quizIdx + 1 < quizQuestions.length ? "Next question" : "See results"}
            </button>
          )}
        </div>
      );
    }
    // result
    const wrong = quizAnswered.filter((r) => !r.correct).length;
    return (
      <div className="space-y-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-5 text-center">
          <p className="text-4xl font-bold text-gray-900">{quizScore}/{quizQuestions.length}</p>
          <p className="text-gray-500 text-sm mt-1">
            {Math.round((100 * quizScore) / quizQuestions.length)}% · {wrong === 0 ? "Perfect!" : `${wrong} to review`}
          </p>
          {wrong > 0 && (
            <button onClick={addQuizMistakes} className={`mt-3 ${COLOUR[subject.colour]} text-white rounded-xl px-4 py-2 text-sm font-semibold`}>
              Add mistakes to review deck
            </button>
          )}
        </div>
        {quizAnswered.map((r, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-2xl p-4">
            <div className="flex items-start gap-2">
              {r.correct ? (
                <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={18} />
              ) : (
                <XCircle className="text-rose-500 shrink-0 mt-0.5" size={18} />
              )}
              <div className="min-w-0">
                <p className="text-sm text-gray-900">{r.question}</p>
                <p className="text-xs text-gray-500 mt-1">You: <span className="font-medium">{r.given}</span></p>
                {!r.correct && <p className="text-xs text-gray-600 mt-1">Correct: {r.answer}</p>}
              </div>
            </div>
          </div>
        ))}
        <button onClick={() => { setTopicTestRef(null); setQuizState("setup"); }} className="w-full border border-gray-300 rounded-xl py-2.5 text-sm font-semibold text-gray-600 flex items-center justify-center gap-1">
          <RotateCcw size={14} /> New quiz
        </button>
      </div>
    );
  };

  const PapersScreen = () => {
    const pool = questionsFor(subjectId);
    const paperSize = Math.min(PAPER_SIZE, pool.length);
    const qs = paperGenerated ? paperQuestions : pool;
    const totalMarks = qs.reduce((s, q) => s + q.marks, 0);
    if (!paperGenerated) {
      return (
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h2 className="text-lg font-bold text-gray-900">{subject.name} practice paper</h2>
          <p className="text-sm text-gray-500 mt-1">
            {paperSize} questions per paper · {pool.length} in the bank · printable, with mark scheme
          </p>
          <button
            disabled={pool.length === 0}
            onClick={() => {
              const picked = shuffled(pool).slice(0, paperSize);
              setPaperQuestions(picked);
              setPaperGenerated(true);
              setPaperRevealed(false);
              setTimerSeconds(recommendedMockSeconds(picked));
              setTimerRunning(false);
            }}
            className={`mt-4 w-full ${COLOUR[subject.colour]} text-white rounded-xl py-3 font-semibold disabled:opacity-40`}
          >
            Generate paper
          </button>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={() => setPaperGenerated(false)} className="flex items-center gap-1 text-gray-600 text-sm font-medium">
            <ArrowLeft size={16} /> New paper
          </button>
          <span className="text-xs text-gray-500">{qs.length} questions · {totalMarks} marks</span>
        </div>
        <div className={`flex items-center justify-between rounded-xl px-3 py-2 text-white ${timerSeconds === 0 ? "bg-rose-600" : timerSeconds <= 60 ? "bg-amber-600" : "bg-gray-900"}`}>
          <span className="text-xs font-medium">{timerSeconds === 0 ? "⏰ Time's up" : "Timed practice"}</span>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-sm tabular-nums">{formatSeconds(timerSeconds)}</span>
            <button onClick={() => setTimerRunning((r) => !r)} disabled={timerSeconds === 0} className="bg-white/20 hover:bg-white/30 rounded-lg p-1.5 disabled:opacity-40">
              {timerRunning ? <Pause size={13} /> : <Play size={13} />}
            </button>
            <button onClick={() => { setTimerSeconds(recommendedMockSeconds(qs)); setTimerRunning(false); }} className="bg-white/20 hover:bg-white/30 rounded-lg p-1.5">
              <TimerReset size={13} />
            </button>
          </div>
        </div>
        {qs.map((q, i) => (
          <div key={q.id} className="bg-white border border-gray-200 rounded-2xl p-4">
            <p className="text-xs font-mono text-gray-400">{i + 1}. {q.ref} · {q.marks} mark{q.marks > 1 ? "s" : ""}</p>
            <p className="text-sm text-gray-900 mt-1">{q.q}</p>
            <div className="mt-3 space-y-2">
              <div className="h-px bg-gray-100" /><div className="h-px bg-gray-100" /><div className="h-px bg-gray-100" />
            </div>
            {paperRevealed && (
              <p className="text-xs text-emerald-700 bg-emerald-50 rounded-lg p-2 mt-2">Mark scheme: {q.model}</p>
            )}
          </div>
        ))}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setPaperRevealed((r) => !r)} className="border border-gray-300 rounded-xl py-2.5 text-sm font-semibold text-gray-600 flex items-center justify-center gap-1">
            {paperRevealed ? <EyeOff size={14} /> : <Eye size={14} />} {paperRevealed ? "Hide" : "Reveal"} answers
          </button>
          <button onClick={() => window.print()} className="border border-gray-300 rounded-xl py-2.5 text-sm font-semibold text-gray-600">
            🖨 Print
          </button>
        </div>
        <button
          onClick={() => exportPracticePaperPDF(subject.name, qs, { revealAnswers: true })}
          className="w-full border border-gray-300 rounded-xl py-2.5 text-sm font-semibold text-gray-600 flex items-center justify-center gap-1"
        >
          <FileDown size={14} /> Download PDF (with mark scheme)
        </button>
      </div>
    );
  };

  const PracticeScreen = () => (
    <div className="space-y-4">
      {topicTestRef && (
        <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2">
          <p className="text-xs font-medium text-indigo-700">
            Testing: {(TOPICS[subjectId] || []).find((t) => t.ref === topicTestRef)?.title || topicTestRef}
          </p>
          <button onClick={clearTopicTest} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
            ✕ Clear
          </button>
        </div>
      )}
      <div className="grid grid-cols-3 gap-2">
        {[
          { id: "mock", label: "Mock", icon: PenLine },
          { id: "quiz", label: "Quiz", icon: ClipboardList },
          { id: "paper", label: "Paper", icon: FileDown },
        ].map((m) => (
          <button
            key={m.id}
            onClick={() => setPracticeMode(m.id)}
            className={`rounded-xl py-2.5 text-xs font-semibold flex flex-col items-center gap-1 ${
              practiceMode === m.id ? `${COLOUR[subject.colour]} text-white` : "bg-white border border-gray-200 text-gray-600"
            }`}
          >
            <m.icon size={16} /> {m.label}
          </button>
        ))}
      </div>
      {practiceMode === "mock" && MockScreen()}
      {practiceMode === "quiz" && QuizScreen()}
      {practiceMode === "paper" && PapersScreen()}
    </div>
  );

  const NotesScreen = () => {
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
          <button onClick={() => setScanStep("list")} className="flex items-center gap-1 text-gray-600 text-sm font-medium">
            <ArrowLeft size={16} /> Notes
          </button>
          <div className="bg-white border-2 border-dashed border-gray-300 rounded-2xl p-10 text-center">
            <Camera className="mx-auto text-gray-400" size={40} />
            <p className="text-gray-600 mt-3 font-medium">Photograph or upload a page of your notes</p>
            <p className="text-xs text-gray-400 mt-1">We'll read the text and guess the subject automatically</p>
          </div>
          {scanError && (
            <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">{scanError}</p>
          )}
          <input
            ref={scanFileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => runScan(e.target.files?.[0])}
          />
          <button
            onClick={() => scanFileInputRef.current?.click()}
            className={`w-full ${COLOUR[subject.colour]} text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2`}
          >
            <Camera size={18} /> Take or choose a photo
          </button>
        </div>
      );
    }

    if (scanStep === "extracting") {
      return (
        <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center">
          <div className="animate-pulse">
            <ScanLine className="mx-auto text-gray-400" size={40} />
          </div>
          <p className="text-gray-600 mt-3">Reading your handwriting… {Math.round(scanProgress * 100)}%</p>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mt-3">
            <div className="h-full bg-gray-900 transition-all" style={{ width: `${Math.round(scanProgress * 100)}%` }} />
          </div>
        </div>
      );
    }

    if (scanStep === "edit") {
      const savedNote = notes.find((n) => n.id === activeNoteId);
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <button onClick={() => setScanStep("list")} className="flex items-center gap-1 text-gray-600 text-sm font-medium">
              <ArrowLeft size={16} /> Notes
            </button>
            {activeNoteId && (
              <button onClick={deleteNote} className="text-rose-500 text-sm font-medium flex items-center gap-1">
                <Trash2 size={14} /> Delete
              </button>
            )}
          </div>
          {activeNoteId && (
            <p className="text-xs text-gray-400">
              Low-confidence words may need checking if this was scanned. <span className="text-amber-600 font-medium">Edit freely.</span>
            </p>
          )}
          {scanDetected && (
            <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
              <Sparkles size={12} className="inline mr-1" />
              Detected <strong>{SUBJECTS.find((s) => s.id === scanDetected.subjectId)?.name}</strong> from the text — change it below if that's wrong.
            </p>
          )}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {SUBJECTS.map((s) => (
              <button
                key={s.id}
                onClick={() => setNoteSubjectId(s.id)}
                className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium ${
                  noteSubjectId === s.id ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-600"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
          <input
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
            placeholder="Note title"
            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:border-gray-400"
          />
          <div className="flex flex-wrap gap-1 bg-gray-50 border border-gray-200 rounded-xl p-1.5">
            {[
              { icon: Bold, label: "Bold", before: "**", after: "**" },
              { icon: Italic, label: "Italic", before: "_", after: "_" },
              { icon: Heading2, label: "Heading", before: "\n## ", after: "" },
              { icon: List, label: "Bullet list", before: "\n- ", after: "" },
              { icon: ListOrdered, label: "Numbered list", before: "\n1. ", after: "" },
              { icon: Quote, label: "Quote", before: "\n> ", after: "" },
              { icon: Minus, label: "Divider", before: "\n---\n", after: "" },
              { icon: Highlighter, label: "Highlight", before: "==", after: "==" },
            ].map(({ icon: Icon, label, before, after }) => (
              <button
                key={label}
                type="button"
                title={label}
                onClick={() => insertFormatting(before, after)}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-white hover:text-gray-900 hover:shadow-sm"
              >
                <Icon size={14} />
              </button>
            ))}
          </div>
          <SymbolRow onInsert={(sym) => insertFormatting(sym, "")} />
          <textarea
            ref={noteTextareaRef}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Write or paste your notes here…"
            className="w-full h-48 bg-white border border-gray-200 rounded-2xl p-4 text-sm text-gray-700 focus:outline-none focus:border-gray-400"
          />
          <button onClick={saveNote} className={`w-full ${COLOUR[subject.colour]} text-white rounded-xl py-3 font-semibold`}>
            💾 Save note
          </button>
          {activeNoteId && (
            <div className="grid grid-cols-2 gap-2">
              <button
                disabled={!noteText.trim()}
                onClick={() => setScanStep("highlight")}
                className="border border-gray-300 rounded-xl py-2.5 text-sm font-semibold text-gray-600 flex items-center justify-center gap-1 disabled:opacity-40"
              >
                <Sparkles size={14} /> Make flashcards
              </button>
              <button
                onClick={() => exportNotePDF({ title: noteTitle, text: noteText, date: savedNote?.date }, SUBJECTS.find((s) => s.id === noteSubjectId)?.name || subject.name)}
                className="border border-gray-300 rounded-xl py-2.5 text-sm font-semibold text-gray-600 flex items-center justify-center gap-1"
              >
                <FileDown size={14} /> PDF
              </button>
            </div>
          )}
        </div>
      );
    }

    if (scanStep === "highlight") {
      return (
        <div className="space-y-3">
          <button onClick={() => setScanStep("edit")} className="flex items-center gap-1 text-gray-600 text-sm font-medium">
            <ArrowLeft size={16} /> Back to note
          </button>
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
    }

    // scanStep === "list"
    const filteredNotes = notesFilter === "all" ? notes : notes.filter((n) => n.subject === notesFilter);
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <button onClick={openScanCapture} className="bg-white border border-gray-200 rounded-2xl p-4 text-left hover:border-gray-300 hover:shadow-md transition-all">
            <IconTile icon={Camera} tone="violet" />
            <p className="font-semibold text-gray-900 mt-2 text-sm">Scan a page</p>
            <p className="text-xs text-gray-500">photo → text</p>
          </button>
          <button onClick={openNewNote} className="bg-white border border-gray-200 rounded-2xl p-4 text-left hover:border-gray-300 hover:shadow-md transition-all">
            <IconTile icon={PencilLine} tone="sky" />
            <p className="font-semibold text-gray-900 mt-2 text-sm">Write a note</p>
            <p className="text-xs text-gray-500">type it out</p>
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setNotesFilter("all")}
            className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium ${
              notesFilter === "all" ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-600"
            }`}
          >
            All ({notes.length})
          </button>
          {SUBJECTS.map((s) => {
            const n = notes.filter((x) => x.subject === s.id).length;
            return (
              <button
                key={s.id}
                onClick={() => setNotesFilter(s.id)}
                className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium ${
                  notesFilter === s.id ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-600"
                }`}
              >
                {s.name} ({n})
              </button>
            );
          })}
        </div>

        {filteredNotes.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
            <StickyNote className="mx-auto text-gray-300" size={32} />
            <p className="font-semibold text-gray-900 mt-2">No notes yet</p>
            <p className="text-sm text-gray-500 mt-1">Scan a page or write one to get started.</p>
          </div>
        ) : (
          <div className="space-y-2 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-3">
            {filteredNotes
              .slice()
              .reverse()
              .map((n) => {
                const s = SUBJECTS.find((x) => x.id === n.subject);
                const preview = n.text.length > 90 ? n.text.slice(0, 90) + "…" : n.text;
                return (
                  <button
                    key={n.id}
                    onClick={() => openNote(n)}
                    className="w-full bg-white border border-gray-200 rounded-2xl p-4 text-left hover:border-gray-300"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-gray-900 text-sm truncate">{n.title || "Untitled note"}</p>
                      {s && <Badge text={s.name} tone="sky" />}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{preview}</p>
                    <p className="text-[11px] text-gray-400 mt-1">{n.date}</p>
                  </button>
                );
              })}
          </div>
        )}
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
                        createCard({
                          id: "gd" + Date.now(),
                          subject: "biology",
                          front: "Shared: " + d.name,
                          back: "Cloned into your deck",
                          src: "group \u00b7 " + g.name,
                        }),
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

  const ProgressScreen = () => {
    const mastered = deck.filter((c) => (c.interval || 0) >= 21).length;
    const avgPct = mockHistory.length
      ? Math.round(mockHistory.reduce((s, m) => s + m.pct, 0) / mockHistory.length)
      : null;
    const quizAvgPct = quizHistory.length
      ? Math.round(quizHistory.reduce((s, m) => s + m.pct, 0) / quizHistory.length)
      : null;
    const last10 = mockHistory.slice(-10);
    const bySubject = {};
    mockHistory.forEach((m) => {
      const key = SUBJECTS.find((s) => s.id === m.subject)?.name || m.subject;
      if (!bySubject[key]) bySubject[key] = { sum: 0, total: 0 };
      bySubject[key].sum += m.pct;
      bySubject[key].total += 1;
    });

    const topicsByRef = {};
    Object.values(TOPICS).forEach((arr) => arr.forEach((t) => { topicsByRef[t.ref] = t; }));
    const strandStats = {};
    [...mockHistory, ...quizHistory].forEach((h) => {
      (h.byRef || []).forEach((r) => {
        const topic = topicsByRef[r.ref];
        if (!topic) return;
        if (!strandStats[topic.strand]) strandStats[topic.strand] = { correct: 0, total: 0 };
        strandStats[topic.strand].total += 1;
        if (r.correct) strandStats[topic.strand].correct += 1;
      });
    });
    const strandRows = Object.entries(strandStats)
      .filter(([, v]) => v.total >= 3)
      .map(([strand, v]) => ({ strand, pct: Math.round((100 * v.correct) / v.total), total: v.total }))
      .sort((a, b) => a.pct - b.pct);
    const weakest = strandRows.slice(0, 3);

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Day streak" value={streak} />
          <StatCard label="Cards mastered" value={`${mastered}/${deck.length}`} />
          <StatCard label="Mocks taken" value={mockHistory.length} />
          <StatCard label="Avg mock score" value={avgPct === null ? "–" : `${avgPct}%`} />
          <StatCard label="Quizzes taken" value={quizHistory.length} />
          <StatCard label="Avg quiz score" value={quizAvgPct === null ? "–" : `${quizAvgPct}%`} />
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <p className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-1.5">
            <Sparkles size={16} className="text-amber-500" /> Weak spots
          </p>
          {weakest.length === 0 ? (
            <p className="text-sm text-gray-500">Answer a few more mock or quiz questions (at least 3 on the same topic area) and your weakest spots will show up here, with tips.</p>
          ) : (
            <div className="space-y-3">
              {weakest.map((w) => (
                <div key={w.strand} className="bg-rose-50 border border-rose-100 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-rose-800">{w.strand}</p>
                    <span className="text-xs font-bold text-rose-600">{w.pct}% · {w.total} qs</span>
                  </div>
                  <p className="text-xs text-rose-700 mt-1">{STRAND_TIPS[w.strand] || DEFAULT_STRAND_TIP}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {last10.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <p className="font-semibold text-gray-900 text-sm mb-3">Mock score trend</p>
            <div className="flex items-end gap-2 h-24">
              {last10.map((m, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                  <div
                    className="w-full rounded-t bg-gradient-to-t from-indigo-600 to-violet-500"
                    style={{ height: `${Math.max(4, m.pct)}%` }}
                    title={`${m.pct}%`}
                  />
                  <span className="text-[10px] text-gray-400 mt-1">{m.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <p className="font-semibold text-gray-900 text-sm mb-3">Performance by subject</p>
          {Object.keys(bySubject).length === 0 ? (
            <p className="text-sm text-gray-500">Take a mock to see your subject breakdown here.</p>
          ) : (
            Object.entries(bySubject).map(([name, v]) => {
              const avg = Math.round(v.sum / v.total);
              return (
                <div key={name} className="flex items-center gap-3 py-1.5">
                  <span className="w-24 text-xs font-medium text-gray-700 shrink-0">{name}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${avg >= 70 ? "bg-emerald-500" : avg >= 50 ? "bg-amber-500" : "bg-rose-500"}`}
                      style={{ width: `${avg}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-xs font-semibold text-gray-500">{avg}%</span>
                </div>
              );
            })
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <p className="font-semibold text-gray-900 text-sm mb-1">Your data</p>
          <p className="text-xs text-gray-500 mb-3">Everything is stored on this device. Back up or move it to another device with a file.</p>
          <div className="flex gap-2">
            <button
              onClick={exportBackup}
              className="flex-1 border border-gray-300 rounded-xl py-2 text-sm font-semibold text-gray-700 flex items-center justify-center gap-1.5"
            >
              <Download size={14} /> Export
            </button>
            <label className="flex-1 border border-gray-300 rounded-xl py-2 text-sm font-semibold text-gray-700 flex items-center justify-center gap-1.5 cursor-pointer">
              <Upload size={14} /> Import
              <input type="file" accept="application/json" className="hidden" onChange={(e) => importBackup(e.target.files[0])} />
            </label>
          </div>
        </div>
      </div>
    );
  };

  const PlannerScreen = () => {
    const upcomingExams = [...exams].sort((a, b) => new Date(a.date) - new Date(b.date));
    const upcomingTasks = [...plannerTasks].sort((a, b) => new Date(a.date) - new Date(b.date));
    const today = todayISO();
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today + "T12:00:00");
      d.setDate(d.getDate() + i);
      return d;
    });
    const focusTaskDateFor = (iso) => {
      setNewTaskDate(iso);
      taskLabelInputRef.current?.focus();
      taskLabelInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    return (
      <div className="space-y-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <h3 className="font-semibold text-gray-900 text-sm mb-2 flex items-center gap-1.5">
            <CalendarDays size={16} /> Exam countdown
          </h3>
          {upcomingExams.length === 0 ? (
            <p className="text-sm text-gray-500">No exams added yet.</p>
          ) : (
            <div className="space-y-2">
              {upcomingExams.map((ex) => {
                const d = daysUntil(ex.date);
                const s = SUBJECTS.find((x) => x.id === ex.subject);
                return (
                  <div key={ex.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{ex.name}</p>
                      <p className="text-xs text-gray-500">{s?.name || ex.subject} · {new Date(ex.date + "T12:00:00").toLocaleDateString("en-GB")}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-1 rounded-lg ${d <= 7 ? "bg-rose-100 text-rose-700" : d <= 30 ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"}`}>
                        {d < 0 ? "past" : d === 0 ? "today" : `${d}d`}
                      </span>
                      <button onClick={() => deleteExam(ex.id)} className="text-gray-400 hover:text-rose-500">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex gap-2 mt-3">
            <input
              value={newExamName}
              onChange={(e) => setNewExamName(e.target.value)}
              placeholder={`${subject.name} exam name`}
              className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
            />
            <input
              type="date"
              value={newExamDate}
              onChange={(e) => setNewExamDate(e.target.value)}
              className="border border-gray-300 rounded-xl px-2 py-2 text-sm focus:outline-none focus:border-gray-400"
            />
          </div>
          <button onClick={addExam} className={`mt-2 w-full ${COLOUR[subject.colour]} text-white rounded-xl py-2 text-sm font-semibold`}>
            + Add exam
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <h3 className="font-semibold text-gray-900 text-sm mb-2 flex items-center gap-1.5">
            <CalendarDays size={16} /> This week
          </h3>
          <div className="grid grid-cols-7 gap-1.5">
            {weekDays.map((d) => {
              const iso = d.toISOString().slice(0, 10);
              const isToday = iso === today;
              const dayTasks = plannerTasks.filter((t) => t.date === iso);
              return (
                <div
                  key={iso}
                  className={`rounded-xl p-1.5 min-h-[92px] flex flex-col ${
                    isToday ? "bg-indigo-50 border border-indigo-200" : "bg-gray-50 border border-gray-100"
                  }`}
                >
                  <p className={`text-[10px] font-bold uppercase text-center ${isToday ? "text-indigo-600" : "text-gray-400"}`}>
                    {DAY_LABELS[d.getDay()]}
                  </p>
                  <p className={`text-xs font-semibold text-center mb-1 ${isToday ? "text-indigo-700" : "text-gray-700"}`}>
                    {d.getDate()}
                  </p>
                  <div className="flex-1 space-y-1">
                    {dayTasks.map((t) => {
                      const s = SUBJECTS.find((x) => x.id === t.subject);
                      return (
                        <button
                          key={t.id}
                          onClick={() => toggleTask(t.id)}
                          className={`w-full text-left text-[10px] leading-tight px-1 py-0.5 rounded ${PILL_TONE[s?.colour] || PILL_TONE.indigo} ${
                            t.done ? "opacity-40 line-through" : ""
                          }`}
                        >
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                  <button onClick={() => focusTaskDateFor(iso)} className="text-[10px] text-gray-400 hover:text-gray-600 mt-1 text-center">
                    + add
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <h3 className="font-semibold text-gray-900 text-sm mb-2 flex items-center gap-1.5">
            <ClipboardList size={16} /> Revision tasks
          </h3>
          {upcomingTasks.length === 0 ? (
            <p className="text-sm text-gray-500">No tasks yet — plan a revision session below.</p>
          ) : (
            <div className="space-y-1.5">
              {upcomingTasks.map((t) => {
                const s = SUBJECTS.find((x) => x.id === t.subject);
                return (
                  <div key={t.id} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                    <button
                      onClick={() => toggleTask(t.id)}
                      className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${t.done ? `${COLOUR[s?.colour || "indigo"]} border-transparent` : "border-gray-300"}`}
                    >
                      {t.done && <Check size={12} className="text-white" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${t.done ? "text-gray-400 line-through" : "text-gray-900"}`}>{t.label}</p>
                      <p className="text-xs text-gray-400">{s?.name || t.subject} · {new Date(t.date + "T12:00:00").toLocaleDateString("en-GB")}</p>
                    </div>
                    <button onClick={() => deleteTask(t.id)} className="text-gray-400 hover:text-rose-500 shrink-0">
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex gap-2 mt-3">
            <input
              ref={taskLabelInputRef}
              value={newTaskLabel}
              onChange={(e) => setNewTaskLabel(e.target.value)}
              placeholder="e.g. Revise quadratics"
              className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
            />
            <input
              type="date"
              value={newTaskDate}
              onChange={(e) => setNewTaskDate(e.target.value)}
              className="border border-gray-300 rounded-xl px-2 py-2 text-sm focus:outline-none focus:border-gray-400"
            />
          </div>
          <button onClick={addTask} className={`mt-2 w-full ${COLOUR[subject.colour]} text-white rounded-xl py-2 text-sm font-semibold`}>
            + Add task
          </button>
        </div>
      </div>
    );
  };

  const tabs = [
    { id: "home", label: "Home", icon: Home },
    { id: "topics", label: "Topics", icon: BookOpen },
    { id: "practice", label: "Practice", icon: PenLine },
    { id: "notes", label: "Notes", icon: StickyNote },
    { id: "review", label: "Review", icon: Layers, badge: dueAll.length },
    { id: "planner", label: "Planner", icon: CalendarDays },
    { id: "progress", label: "Progress", icon: BarChart3 },
    { id: "groups", label: "Groups", icon: Users },
  ];

  const selectTab = (id) => {
    setTab(id);
    if (id === "topics") setOpenTopic(null);
    if (id === "groups") setOpenGroup(null);
    if (id === "notes") { setScanStep("list"); setSmartCards(null); }
    if (id === "practice") setTopicTestRef(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white font-sans md:flex">
      {/* Sidebar nav — tablet/desktop only */}
      <nav className="hidden md:flex md:flex-col md:w-56 lg:w-64 md:shrink-0 md:h-screen md:sticky md:top-0 md:border-r md:border-gray-200 md:bg-white md:px-3 md:py-5">
        <h1 className="font-bold text-gray-900 px-3 mb-6 flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white text-sm">🎓</span>
          <span>
            GradeUp <span className="block text-xs font-normal text-gray-400">GCSE study</span>
          </span>
        </h1>
        <div className="flex flex-col gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => selectTab(t.id)}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-colors ${
                tab === t.id ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <t.icon size={18} />
              {t.label}
              {t.badge > 0 && (
                <span className="ml-auto bg-rose-500 text-white text-[10px] rounded-full px-1.5 py-0.5">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

      <div className="md:flex-1 md:min-w-0">
        <div className="max-w-md md:max-w-3xl lg:max-w-4xl mx-auto min-h-screen md:min-h-0 flex flex-col">
          <header className="px-4 pt-5 pb-3 md:hidden flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white text-sm">🎓</span>
            <h1 className="font-bold text-gray-900">
              GradeUp <span className="text-xs font-normal text-gray-400">· GCSE study</span>
            </h1>
          </header>
          <main className="flex-1 px-4 pb-24 md:px-6 md:pt-6 md:pb-10 lg:px-8">
            {tab === "home" && HomeScreen()}
            {tab === "topics" && TopicsScreen()}
            {tab === "practice" && PracticeScreen()}
            {tab === "notes" && NotesScreen()}
            {tab === "review" && ReviewScreen()}
            {tab === "planner" && PlannerScreen()}
            {tab === "progress" && ProgressScreen()}
            {tab === "groups" && GroupsScreen()}
          </main>
          <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden">
            <div className="max-w-md mx-auto flex overflow-x-auto">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => selectTab(t.id)}
                  className={`relative flex-1 min-w-[56px] py-2.5 flex flex-col items-center gap-0.5 text-[10px] font-medium ${
                    tab === t.id ? "text-indigo-600" : "text-gray-400"
                  }`}
                >
                  <span className={`w-8 h-6 rounded-lg flex items-center justify-center ${tab === t.id ? "bg-indigo-100" : ""}`}>
                    <t.icon size={16} />
                  </span>
                  {t.label}
                  {t.badge > 0 && (
                    <span className="absolute top-1 right-1/4 bg-rose-500 text-white text-[10px] rounded-full px-1.5">
                      {t.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
}
