export const SUBJECTS = [
  { id: "maths", name: "Maths", spec: "AQA 8300", tiered: true, colour: "indigo" },
  { id: "biology", name: "Biology", spec: "AQA 8461", tiered: true, colour: "emerald" },
  { id: "english", name: "English Lit", spec: "AQA 8702", tiered: false, colour: "rose", mocksSoon: true },
];

export const TOPICS = {
  maths: [
    { ref: "N7", strand: "Number", title: "Indices and roots", tier: "Both", concept: "Index laws: aᵐ × aⁿ = aᵐ⁺ⁿ. Negative index means reciprocal; fractional index means root.", example: "2³ × 2⁵ ÷ 2⁴ → 3+5−4 = 4, so 2⁴ = 16.", mistakes: "Multiplying indices instead of adding them." },
    { ref: "A19", strand: "Algebra", title: "Simultaneous equations", tier: "Both", concept: "Two equations, two unknowns. Match a coefficient, then add/subtract to eliminate one variable.", example: "2x+y=7 and x−y=2 → add: 3x=9, x=3, y=1.", mistakes: "Sign errors when subtracting equations." },
    { ref: "G20", strand: "Geometry", title: "Pythagoras' theorem", tier: "Both", concept: "In a right-angled triangle, a² + b² = c² where c is the hypotenuse.", example: "Legs 6 and 8 → c² = 100, c = 10.", mistakes: "Forgetting to square-root at the end." },
    { ref: "A22", strand: "Algebra", title: "Quadratic equations", tier: "Higher", concept: "Solve by factorising, completing the square, or the quadratic formula.", example: "x²−5x+6=0 → (x−2)(x−3)=0 → x=2 or 3.", mistakes: "Only giving one solution." },
    { ref: "N1", strand: "Number", title: "Ordering and comparing", tier: "Both", concept: "Compare numbers using place value, decimals, fractions and indices. Use number lines to order values.", example: "0.3 < 1/3 < 0.34 — convert to decimals to compare.", mistakes: "Assuming longer decimals are always larger." },
    { ref: "R5", strand: "Ratio", title: "Direct proportion", tier: "Both", concept: "When two quantities are directly proportional, their ratio stays constant: y = kx.", example: "5 pens cost £2 → 12 pens cost £4.80 (k = 0.4).", mistakes: "Adding instead of multiplying when scaling." },
    { ref: "P8", strand: "Probability", title: "Tree diagrams", tier: "Both", concept: "Tree diagrams show outcomes for multi-step events. Multiply along branches, add across outcomes.", example: "Two coins: P(HH) = 1/2 × 1/2 = 1/4.", mistakes: "Forgetting branches must sum to 1 at each stage." },
    { ref: "S12", strand: "Statistics", title: "Scatter graphs", tier: "Both", concept: "Scatter graphs show correlation. Positive: as x increases, y increases. Negative: opposite.", example: "Height vs shoe size — positive correlation.", mistakes: "Confusing correlation with causation." },
  ],
  biology: [
    { ref: "B1", strand: "Cell biology", title: "Cell structure", tier: "Both", concept: "Animal and plant cells share a nucleus, cytoplasm, cell membrane, mitochondria and ribosomes. Plant cells also have a cell wall, chloroplasts and a permanent vacuole.", example: "A palisade cell has many chloroplasts to maximise photosynthesis.", mistakes: "Saying animal cells have a cell wall — they don't." },
    { ref: "B1.3", strand: "Cell biology", title: "Osmosis", tier: "Both", concept: "Osmosis is the movement of water across a partially permeable membrane from a dilute to a more concentrated solution.", example: "A potato in salt water loses mass as water leaves its cells.", mistakes: "Confusing osmosis (water) with diffusion (any particle)." },
    { ref: "B2", strand: "Organisation", title: "Enzymes", tier: "Both", concept: "Enzymes are biological catalysts. The lock-and-key model: substrate fits the active site. Affected by temperature and pH.", example: "Amylase breaks starch into maltose.", mistakes: "Saying enzymes are 'killed' rather than denatured." },
  ],
  english: [
    { ref: "T1", strand: "Macbeth", title: "Ambition as a theme", tier: null, concept: "Macbeth's ambition drives the tragedy; Shakespeare presents unchecked ambition as self-destructive.", example: "'Vaulting ambition, which o'erleaps itself' — Act 1 Scene 7.", mistakes: "Retelling the plot instead of analysing the writer's methods." },
    { ref: "T2", strand: "A Christmas Carol", title: "Redemption", tier: null, concept: "Scrooge's transformation shows Dickens's belief that anyone can change.", example: "'I will honour Christmas in my heart' — Stave 5.", mistakes: "Ignoring social/historical context (Victorian poverty)." },
  ],
};

export const QUESTIONS = {
  maths: [
    { id: "m1", ref: "G20", marks: 2, q: "A right-angled triangle has legs 5 cm and 12 cm. Find the hypotenuse (cm).", answer: "13", model: "5²+12² = 169, √169 = 13.", fb: { right: "Full marks (M1, A1).", wrong: "M1 for 5²+12²=169. A1 lost — square-root to get 13." } },
    { id: "m2", ref: "A19", marks: 3, q: "Solve 2x + y = 7 and x − y = 2. Give x.", answer: "3", model: "Add: 3x=9, x=3.", fb: { right: "Full marks (M1,M1,A1).", wrong: "M1 for adding equations to eliminate y." } },
    { id: "m3", ref: "N7", marks: 1, q: "Evaluate 2³ × 2⁵ ÷ 2⁴.", answer: "16", model: "3+5−4=4, 2⁴=16.", fb: { right: "Correct (B1).", wrong: "Add/subtract indices: 3+5−4=4, 2⁴=16." } },
    { id: "m4", ref: "R5", marks: 2, q: "If 4 apples cost £1.20, how much do 10 apples cost (£)?", answer: "3", model: "Unit cost = 0.30, 10 × 0.30 = 3.", fb: { right: "Full marks (M1, A1).", wrong: "Find cost per apple first: £1.20 ÷ 4 = £0.30." } },
    { id: "m5", ref: "P8", marks: 2, q: "A bag has 3 red and 2 blue counters. One is drawn, not replaced, then another. P(both red)? Give as a fraction.", answer: "3/10", model: "3/5 × 2/4 = 6/20 = 3/10.", fb: { right: "Full marks (M1, A1).", wrong: "First draw 3/5, second 2/4 — multiply, don't add." } },
  ],
  biology: [
    { id: "b1", ref: "B1", marks: 1, q: "Name the part of a plant cell where photosynthesis happens.", answer: "chloroplast", model: "Chloroplast.", fb: { right: "Correct (B1).", wrong: "Photosynthesis happens in the chloroplast." } },
    { id: "b2", ref: "B1.3", marks: 2, q: "Define osmosis.", answer: "movement of water across a partially permeable membrane", model: "Movement of water from dilute to concentrated across a partially permeable membrane.", fb: { right: "Full marks (M1, A1).", wrong: "Must mention water AND a partially permeable membrane." } },
    { id: "b3", ref: "B2", marks: 1, q: "What word describes an enzyme losing its shape at high temperature?", answer: "denatured", model: "Denatured.", fb: { right: "Correct (B1).", wrong: "The term is 'denatured', not 'killed'." } },
  ],
  english: [],
};

export const SCAN_TEXT = "Osmosis is the movement of water across a partially permeable membrane, from a dilute solution to a more concentrated solution. It is a passive process — no energy needed. Diffusion is different: it is the spreading of any particles from high to low concentration.";

export const DEFAULT_DECK = [
  { id: "c1", subject: "maths", front: "a⁻ⁿ = ?", back: "1 / aⁿ", src: "topic N7", due: true },
  { id: "c2", subject: "biology", front: "Where does photosynthesis occur?", back: "The chloroplast", src: "topic B1", due: true },
];

export const DEFAULT_GROUPS = [
  { id: "g1", name: "Y11 Science Crew", members: ["You", "Priya S.", "Jamal O."], code: "K7M3PX", sharedDecks: [{ name: "B1 essentials", by: "Priya S.", count: 8 }] },
];

export const COLOUR = { indigo: "bg-indigo-600", emerald: "bg-emerald-600", rose: "bg-rose-600" };
export const COLOUR_LIGHT = { indigo: "from-indigo-600 to-violet-600", emerald: "from-emerald-600 to-teal-600", rose: "from-rose-600 to-pink-600" };

export const norm = (s) => s.trim().toLowerCase().replace(/£|cm|\.|,/g, "").replace(/\s+/g, " ");

export const STRANDS = ["Number", "Algebra", "Ratio", "Geometry", "Probability", "Statistics"];
