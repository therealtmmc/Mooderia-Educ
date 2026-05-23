export interface Material {
  id: string;
  name: string;
  type: 'note' | 'snapshot' | 'pdf' | 'voice' | 'video' | 'powerpoint' | 'audio_file';
  url?: string;
  base64Data?: string;
  durationSeconds?: number;
  textContent?: string;
  createdAt: string;
}

export interface FolderCabinet {
  id: string;
  name: string;
  subject: string;
  color: string; // Tailwind bg/accent color indicator, e.g., 'fuchsia', 'violet', 'cyan', 'rose'
  icon: string; // Lucide icon identifier
  description?: string;
  materials: Material[];
  createdAt: string;
}

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  clue?: string;
  explanation?: string;
  strength: number; // 0 to 5 for spaced-repetition visual indicator
  lastReviewed?: string;
  questionType?: 'multiple-choice' | 'true-false' | 'identification';
  options?: string[]; // for multiple-choice choices
}

export interface QuizDeck {
  id: string;
  name: string;
  folderId?: string; // Optional links to folders
  description?: string;
  cards: Flashcard[];
  attemptsCount: number;
  lastScore?: number;
  bestScore?: number;
  createdAt: string;
}

export interface StudentIdentity {
  name: string;
  studentId: string;
  institution: string;
  gradeLevel: string;
  avatarEmoji: string;
  avatarGradientStart: string;
  avatarGradientEnd: string;
  university?: string; // name of university
  program?: string; // name of program
  year?: string; // year of study
  signedIn?: boolean; // offline-persistent auth status flag
}

export interface QuizAttempt {
  id: string;
  deckId: string;
  deckName: string;
  score: number;
  totalQuestions: number;
  timeInSeconds: number;
  date: string; // ISO format
}
