export interface AIActionItem {
  id: string;
  text: string; // backwards compatibility
  title: string;
  description?: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  focusMode: 'hyperfocus' | 'top3' | 'pareto';
  suggestedGoalArea?: 'personal' | 'work' | 'health' | 'relationship' | 'learning' | 'other';
  canBecomeGoal: boolean;
  goalId?: string;
  bulletId?: string;
  suggestedDeadline?: string;
}

export interface AISuggestedGoal {
  id: string;
  title: string;
  reason: string;
  goalType: 'hyperfocus' | 'top3' | 'pareto';
  createdGoalId?: string;
  category?: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface AIEmotionalPattern {
  label: string;
  description: string;
  confidence?: number;
}

export interface AIMeta {
  model?: string;
  promptVersion: string;
  generatedAt: string;
  tokenEstimate?: number;
}

export interface AIInsight {
  id: string;
  userId: string;
  
  type: 'daily' | 'weekly' | 'monthly';
  status: 'generated' | 'saved' | 'archived';
  
  // Backwards compatibility keys
  weekStart: string; // YYYY-MM-DD
  weekEnd: string;   // YYYY-MM-DD
  
  dateRange: {
    start: string; // ISO or YYYY-MM-DD date
    end: string;   // ISO or YYYY-MM-DD date
  };
  
  summary: string;
  keyEvents: string[];
  themes: string[]; // backwards compatibility
  recurringThemes: string[];
  
  emotionalPatterns: AIEmotionalPattern[];
  lessons: string[];
  
  actionItems: AIActionItem[];
  suggestedGoals: AISuggestedGoal[];
  
  suggestedTags: string[];
  suggestedPeople: string[];
  
  sourceEntryIds: string[];
  
  aiMeta: AIMeta;
  
  createdAt: any;
  updatedAt: any;
}

export interface MonthlyAIUsage {
  userId: string;
  month: string; // YYYY-MM
  weeklyInsightCount: number;
  tagSuggestionCount: number;
  lastWeeklyInsightAt?: any;
  lastTagSuggestionAt?: any;
  createdAt: any;
  updatedAt: any;
}

