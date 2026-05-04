export interface Topic {
  id: string;
  name: string;
  subjectId: string;
  userId: string;
  createdAt: any;
  updatedAt: any;
}

export interface Subject {
  id: string;
  name: string;
  userId: string;
  createdAt: any;
  updatedAt: any;
}

export interface StudySession {
  id: string;
  date: string;
  goal: string;
  activity: string;
  subjectId: string; // References Subject.id
  subjectName: string; // Store name for easy display
  topicIds: string[]; // References Topic.ids
  topicNames: string[]; // Store names for easy display
  createdAt: any;
  updatedAt: any;
  userId: string;
}

export type SortConfig = {
  key: keyof StudySession;
  direction: 'asc' | 'desc';
} | null;

export type FilterConfig = Partial<Record<keyof StudySession, string>>;
