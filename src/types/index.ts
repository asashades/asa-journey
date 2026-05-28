// Core data types for ASA Journey

export type BulletStyle = 'bullet' | 'star' | 'checklist';

export interface Bullet {
  id: string;
  text: string;
  style: BulletStyle;
  isHighlight: boolean;
  tags: string[];
  mentions: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Entry {
  id: string;
  date: string; // YYYY-MM-DD format
  dream: string;
  bullets: Bullet[];
  createdAt: Date;
  updatedAt: Date;
}

export type WisdomType = 'thought' | 'quote' | 'fact' | 'excerpt' | 'lesson';

export interface Wisdom {
  id: string;
  type: WisdomType;
  content: string;
  linkedEntryId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  labels: string[];
  linkedEntryId?: string;
  linkedDate?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Idea {
  id: string;
  content: string;
  solutions?: string[];
  linkedEntries?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Highlight {
  id: string;
  bulletId: string;
  entryId: string;
  entryDate: string;
  content: string;
  createdAt: Date;
}

export interface Tag {
  id: string;
  name: string;
  aliases?: string[];
  count: number;
  createdAt: Date;
}

export interface Person {
  id: string;
  name: string;
  mentions: number;
  createdAt: Date;
}

export interface FocusGoal {
  id: string;
  content: string;
  priority: number;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSettings {
  darkMode: boolean;
  moduleVisibility: {
    dreams: boolean;
    highlights: boolean;
    tags: boolean;
    people: boolean;
    notes: boolean;
    wisdom: boolean;
    ideas: boolean;
    focus: boolean;
  };
  language: 'en';
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: Date;
  lastLoginAt: Date;
  settings: UserSettings;
  streak: {
    current: number;
    longest: number;
    lastEntryDate: string | null;
  };
}

export type ModuleType = 'dreams' | 'highlights' | 'tags' | 'people' | 'notes' | 'wisdom' | 'ideas' | 'focus';

export interface InsightMetric {
  name: string;
  value: number;
  change?: number;
  period?: string;
}

export interface WeeklyData {
  date: string;
  entries: number;
  bullets: number;
  dreams: number;
  wisdom: number;
  notes: number;
  ideas: number;
}
