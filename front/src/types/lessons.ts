// Mirrors back/src/main/java/com/collabothon/back/lesson/LessonController.java
export type LessonSummary = {
  id: number;
  emoji: string;
  title: string;
  summary: string;
  xp: number;
  questionCount: number;
};

export type Question = {
  id: number;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type LessonDetail = Omit<LessonSummary, 'questionCount'> & { questions: Question[] };
