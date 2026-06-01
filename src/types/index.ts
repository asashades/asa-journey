// Core data types for ASA Journey

export type BulletStyle = 'bullet' | 'star' | 'checklist';
export type WisdomType = 'thought' | 'quote' | 'fact' | 'excerpt' | 'lesson';
export type BulletSource = 'wisdom' | 'note' | 'idea';

export interface MediaItem {
  id: string;
  fileKey: string;
  publicUrl: string;
  type: 'image' | 'audio';
  caption?: string;
}

export interface LocationItem {
  latitude: number;
  longitude: number;
  district: string;
  mapUrl: string;
  accuracy?: number;
  capturedAt: Date;
}

export interface Bullet {
  id: string;
  text: string;
  style: BulletStyle;
  isHighlight: boolean;
  isCompleted?: boolean;
  source?: BulletSource;
  sourceType?: WisdomType;
  sourceId?: string; // ID of the original wisdom/note/idea
  tags: string[];
  mentions: string[];
  media?: MediaItem[];
  createdAt: Date;
  updatedAt: Date;
  scheduledAt?: Date;
}

export interface Entry {
  id: string;
  date: string; // YYYY-MM-DD format
  dream: string;
  bullets: Bullet[];
  media?: MediaItem[];
  location?: LocationItem;
  createdAt: Date;
  updatedAt: Date;
}

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

export type DoMoreLess = 'more' | 'less' | null;

export interface TagGroup {
  id: string;
  name: string;
  tags: string[]; // tag names
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tag {
  id: string;
  name: string;
  aliases?: string[]; // alternative spellings/names
  groupId?: string;
  count: number;
  doMoreLess?: DoMoreLess;
  firstMentioned?: Date;
  totalDays?: number;
  createdAt: Date;
}

export interface PersonGroup {
  id: string;
  name: string;
  people: string[]; // person names
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Person {
  id: string;
  name: string;
  aliases?: string[]; // alternative names/nicknames
  groupId?: string;
  mentions: number;
  doMoreLess?: DoMoreLess;
  firstMentioned?: Date;
  totalDays?: number;
  createdAt: Date;
}

export interface SubGoal {
  id: string;
  content: string;
  isCompleted: boolean;
}

export interface FocusGoal {
  id: string;
  content: string;
  priority: number;
  isCompleted: boolean;
  deadline?: string; // YYYY-MM-DD format
  category?: string;
  progress: number; // 0-100
  focusMode?: 'hyperfocus' | 'top3' | 'pareto' | 'none';
  subGoals?: SubGoal[]; // Sub-goals checklist
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
  autoTagging: boolean;
  autoMentioning: boolean;
  language: 'en';
  dailyWordGoal?: number; // Daily target word count
  showStreakWidget?: boolean; // Option to show/hide streak widget
  showWordGoalWidget?: boolean; // Option to show/hide daily word goal battery widget
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
