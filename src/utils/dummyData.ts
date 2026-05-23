import { FolderCabinet, QuizDeck, QuizAttempt, StudentIdentity } from "../types";

export const initialProfile: StudentIdentity = {
  name: "Elizabeth Vance",
  studentId: "STU-2026-9082",
  institution: "Interstellar Institute of Technology",
  gradeLevel: "Senior undergraduate",
  avatarEmoji: "🧠",
  avatarGradientStart: "from-indigo-600",
  avatarGradientEnd: "to-fuchsia-600",
  university: "Interstellar Institute of Technology",
  program: "BS Quantum Engineering",
  year: "Senior undergraduate",
  signedIn: false // Start with sign in flow on first load to let user enter their details
};

export const initialFolders: FolderCabinet[] = [
  {
    id: "f1",
    name: "Quantum Mechanics I",
    subject: "Physics",
    color: "violet",
    icon: "Atom",
    description: "Wave-particle duality, Schrodinger equations, and quantum tunneling states.",
    createdAt: "2026-05-10T14:30:00Z",
    materials: [
      {
        id: "m1",
        name: "Duality & Wavefunctions",
        type: "note",
        textContent: "The wavefunction Psi represents the probability amplitude of finding a particle in space. The modulus squared |Psi|^2 is the probability density function. Normalization requires that the integral of |Psi|^2 across all space equals 1.",
        createdAt: "2026-05-11T10:15:00Z",
      },
      {
        id: "m2",
        name: "Operator Algebra Snapshot",
        type: "snapshot",
        textContent: "Operators correspond to physical observables. The momentum operator is p_hat = -i * h-bar * d/dx. The Hamiltonian represents total energy: H_hat = p_hat^2 / 2m + V(x).",
        createdAt: "2026-05-12T09:40:00Z",
      },
      {
        id: "m3",
        name: "Lecture: Tunneling Probability",
        type: "voice",
        durationSeconds: 154,
        textContent: "Discussed how particles traverse potential barriers of energy greater than their kinetic energy. Transmission coefficient T is proportional to exp(-2 * alpha * L).",
        createdAt: "2026-05-13T16:05:00Z",
      }
    ]
  },
  {
    id: "f2",
    name: "Advanced Organic Synthesis",
    subject: "Chemistry",
    color: "emerald",
    icon: "Beaker",
    description: "Stereochemistry, thermodynamic controls, and retro-synthetic pathway analysis.",
    createdAt: "2026-05-15T11:00:00Z",
    materials: [
      {
        id: "m4",
        name: "Grignard Reaction Mechanics",
        type: "note",
        textContent: "Grignard reagents (R-Mg-X) act as strong nucleophiles, attacking electrophilic carbon atoms such as carbonyls. This forms a new carbon-carbon bond. Essential to perform under anhydrous ether conditions to avoid proton transfer.",
        createdAt: "2026-05-16T12:00:00Z",
      },
      {
        id: "m5",
        name: "Diels-Alder Cycloaddition Text",
        type: "pdf",
        textContent: "[4+2] cycloaddition between a conjugated diene and a dienophile. Thermally allowed process yielding a cyclohexene ring. Stereospecific syn addition maintaining the stereochemistry of the reactants.",
        createdAt: "2026-05-18T14:22:00Z",
      }
    ]
  },
  {
    id: "f3",
    name: "Neurolinguistics & Cognition",
    subject: "Bio-Sciences",
    color: "rose",
    icon: "BrainCircuit",
    description: "Neural substrates of language acquisition, speech production, and aphasic patterns.",
    createdAt: "2026-05-19T08:15:00Z",
    materials: [
      {
        id: "m6",
        name: "Broca's vs Wernicke's Areas",
        type: "note",
        textContent: "Broca's area (inferior frontal gyrus) is responsible for language production and grammatical layout. Wernicke's area (superior temporal gyrus) handles semantic comprehension. Damage to Broca's results in expressive aphasia, while Wernicke's results in fluent but nonsensical receptive aphasia.",
        createdAt: "2026-05-20T15:30:00Z",
      }
    ]
  }
];

export const initialQuizzes: QuizDeck[] = [
  {
    id: "q1",
    name: "Quantum Foundations Recall",
    folderId: "f1",
    description: "Spaced-repetition deck testing Wavefunctions and Operator algebra.",
    attemptsCount: 3,
    lastScore: 4,
    bestScore: 5,
    createdAt: "2026-05-12T18:00:00Z",
    cards: [
      {
        id: "c1_1",
        question: "What physical quantity does |Psi(x)|^2 represent in quantum theory?",
        answer: "Probability density of locating the particle",
        clue: "Think about Max Born's probability interpretation.",
        explanation: "The Born rule states that the probability of locating a particle within an interval [a, b] is given by the integral of |Psi(x)|^2 from a to b. Psi itself contains complex phase factors which are eliminated when squared.",
        strength: 5,
        lastReviewed: "2026-05-21T09:00:00Z",
        questionType: "multiple-choice",
        options: [
          "Energy eigenvalue of the wave",
          "Probability density of locating the particle",
          "Phase velocity of wavepacket",
          "Angular momentum of particle"
        ]
      },
      {
        id: "c1_2",
        question: "In quantum theory, the Hamiltonian represents the total energy of the system (kinetic plus potential).",
        answer: "True",
        clue: "This is the time-independent Schrodinger equation operator.",
        explanation: "In this equation, H_hat represents the total energy operator (kinetic plus potential), Psi is the energy eigenstate wavefunction, and E is the scalar energy eigenvalue.",
        strength: 4,
        lastReviewed: "2026-05-21T09:05:00Z",
        questionType: "true-false",
        options: ["True", "False"]
      },
      {
        id: "c1_3",
        question: "What is the standard name of the fundamental equation written as H_hat * Psi = E * Psi?",
        answer: "Schrodinger Equation",
        clue: "Named after Erwin...",
        explanation: "Because momentum corresponds to the first derivative of the wavefunction (-i * h-bar * d/dx), quantum mechanics describes energy states using Erwin Schrodinger's non-relativistic wave equation.",
        strength: 3,
        lastReviewed: "2026-05-22T10:11:00Z",
        questionType: "identification"
      },
      {
        id: "c1_4",
        question: "What happens to a particle's wave properties as its mass increases infinitely?",
        answer: "The de Broglie wavelength approaches zero, shifting from quantum to classical mechanics.",
        clue: "Recall lambda = h / p.",
        explanation: "As mass increases, momentum increases proportionally. Since de Broglie wavelength is planck's constant divided by momentum (lambda = h / mv), the wavelength shrinks below observable limits, exhibiting classical macroscopic behavior.",
        strength: 2,
        lastReviewed: "2026-05-22T10:14:00Z",
      },
      {
        id: "c1_5",
        question: "What is quantum tunneling primarily dependent on physically?",
        answer: "The potential barrier height, thickness, and the mass of the incident particle.",
        clue: "Exponential decay rate.",
        explanation: "Tunneling probability decays exponentially relative to the product of barrier width (L) and alpha, where alpha is proportional to the square root of (V_0 - E) times the particle mass.",
        strength: 1,
        lastReviewed: "2026-05-22T10:19:00Z",
      }
    ]
  },
  {
    id: "q2",
    name: "Synthesis & Carbonyl Attacks",
    folderId: "f2",
    description: "Core organometallic mechanics under Grignard and nucleophilic reagents.",
    attemptsCount: 1,
    lastScore: 3,
    bestScore: 3,
    createdAt: "2026-05-17T15:00:00Z",
    cards: [
      {
        id: "c2_1",
        question: "Explain why Grignard reactions run strictly in dry ether solvers.",
        answer: "Moisture immediately protodesilylayes or protonates the carbon-magnesium bond, forming an unreactive alkane.",
        clue: "Grignard is a powerful base.",
        explanation: "Because R-MgX holds an extremely basic carbanionic center, even traces of water will donate a proton, executing a fast acid-base exchange that renders the nucleophile completely useless (e.g., forming R-H and Mg(OH)X).",
        strength: 4,
        lastReviewed: "2026-05-20T11:00:00Z",
      },
      {
        id: "c2_2",
        question: "Describe the stereochemical outcome of a Diels-Alder cycloaddition.",
        answer: "It is stereospecific; syn addition preserves the cis/trans configuration of the starting diene/dienophile.",
        clue: "Think about concerted transition states.",
        explanation: "The reaction occurs in a single concerted transition state with no carbocation intermediate. Therefore, groups that were cis on the dienophile remain cis relative to one another in the resulting cyclohexene ring.",
        strength: 2,
        lastReviewed: "2026-05-21T18:30:00Z",
      },
      {
        id: "c2_3",
        question: "What reactant is formed when carbon dioxide reacts with a Grignard reagent, followed by acid workup?",
        answer: "A carboxylic acid.",
        clue: "Adds one carbon atom to the chain.",
        explanation: "The Grignard nucleophile attacks the carbonyl carbon of CO2, creating a magnesium carboxylate salt. Subsequent acid protonation converts it into a terminal carboxylic acid.",
        strength: 5,
        lastReviewed: "2026-05-22T14:40:00Z",
      }
    ]
  }
];

export const initialAttempts: QuizAttempt[] = [
  {
    id: "att_1",
    deckId: "q1",
    deckName: "Quantum Foundations Recall",
    score: 3,
    totalQuestions: 5,
    timeInSeconds: 145,
    date: "2026-05-15T18:12:00Z",
  },
  {
    id: "att_2",
    deckId: "q2",
    deckName: "Synthesis & Carbonyl Attacks",
    score: 3,
    totalQuestions: 3,
    timeInSeconds: 88,
    date: "2026-05-17T15:04:00Z",
  },
  {
    id: "att_3",
    deckId: "q1",
    deckName: "Quantum Foundations Recall",
    score: 4,
    totalQuestions: 5,
    timeInSeconds: 110,
    date: "2026-05-19T20:30:00Z",
  },
  {
    id: "att_4",
    deckId: "q1",
    deckName: "Quantum Foundations Recall",
    score: 5,
    totalQuestions: 5,
    timeInSeconds: 95,
    date: "2026-05-21T09:10:00Z",
  }
];
