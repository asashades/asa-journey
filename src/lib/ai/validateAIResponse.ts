export function cleanRawAIResponse(rawText: string): string {
  let cleaned = rawText.trim();
  
  // Hapus blok kode markdown jika ada
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.substring(3);
  }
  
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  
  return cleaned.trim();
}

export function parseAndValidateWeeklyInsight(rawText: string, defaultInsight: any): any {
  try {
    const cleaned = cleanRawAIResponse(rawText);
    const parsed = JSON.parse(cleaned);

    // Validasi struktur penting
    if (!parsed.summary || typeof parsed.summary !== 'string') {
      parsed.summary = defaultInsight.summary;
    }
    
    // keyEvents
    if (!Array.isArray(parsed.keyEvents)) {
      parsed.keyEvents = defaultInsight.keyEvents || [];
    }
    
    // themes / recurringThemes (duplikasi untuk kompatibilitas ke belakang)
    if (!Array.isArray(parsed.recurringThemes)) {
      parsed.recurringThemes = Array.isArray(parsed.themes) ? parsed.themes : (defaultInsight.recurringThemes || defaultInsight.themes || []);
    }
    if (!Array.isArray(parsed.themes)) {
      parsed.themes = parsed.recurringThemes;
    }
    
    // lessons
    if (!Array.isArray(parsed.lessons) || parsed.lessons.length === 0) {
      parsed.lessons = defaultInsight.lessons;
    }
    
    // emotionalPatterns
    if (!Array.isArray(parsed.emotionalPatterns)) {
      parsed.emotionalPatterns = defaultInsight.emotionalPatterns || [];
    } else {
      parsed.emotionalPatterns = parsed.emotionalPatterns.map((pat: any) => ({
        label: pat.label || 'Tenang',
        description: pat.description || 'Pola emosi terdeteksi stabil.',
        confidence: typeof pat.confidence === 'number' ? pat.confidence : 0.7
      }));
    }
    
    // Validasi Action Items
    if (!Array.isArray(parsed.actionItems) || parsed.actionItems.length === 0) {
      parsed.actionItems = defaultInsight.actionItems;
    } else {
      parsed.actionItems = parsed.actionItems.map((item: any, index: number) => {
        const title = item.title || item.text || 'Langkah aksi baru';
        return {
          id: item.id || `act_${Date.now()}_${index}`,
          text: title, // kompatibilitas ke belakang
          title: title,
          description: item.description || '',
          category: item.category || item.suggestedGoalArea || 'Self-Care',
          suggestedGoalArea: item.suggestedGoalArea || 'other',
          canBecomeGoal: typeof item.canBecomeGoal === 'boolean' ? item.canBecomeGoal : true,
          priority: ['low', 'medium', 'high'].includes(item.priority) ? item.priority : 'medium',
          focusMode: ['hyperfocus', 'top3', 'pareto'].includes(item.focusMode) ? item.focusMode : 'top3',
          goalId: item.goalId || undefined
        };
      });
    }

    // suggestedGoals
    if (!Array.isArray(parsed.suggestedGoals)) {
      parsed.suggestedGoals = defaultInsight.suggestedGoals || [];
    } else {
      parsed.suggestedGoals = parsed.suggestedGoals.map((g: any, index: number) => ({
        id: g.id || `sgoal_${Date.now()}_${index}`,
        title: g.title || 'Tujuan yang disarankan',
        reason: g.reason || 'Saran berdasarkan tulisan minggu ini.',
        goalType: ['hyperfocus', 'top3', 'pareto'].includes(g.goalType) ? g.goalType : 'top3',
        createdGoalId: g.createdGoalId || undefined
      }));
    }

    // suggestedTags
    if (!Array.isArray(parsed.suggestedTags)) {
      parsed.suggestedTags = defaultInsight.suggestedTags || [];
    }

    // suggestedPeople
    if (!Array.isArray(parsed.suggestedPeople)) {
      parsed.suggestedPeople = defaultInsight.suggestedPeople || [];
    }

    return parsed;
  } catch (error) {
    console.error('Failed to parse AI structured response, falling back to mock schema:', error);
    return defaultInsight;
  }
}

export function parseAndValidateTagSuggestions(rawText: string, defaultTags: any): any {
  try {
    const cleaned = cleanRawAIResponse(rawText);
    const parsed = JSON.parse(cleaned);

    return {
      suggestedTags: Array.isArray(parsed.suggestedTags) ? parsed.suggestedTags : defaultTags.suggestedTags,
      suggestedPeople: Array.isArray(parsed.suggestedPeople) ? parsed.suggestedPeople : defaultTags.suggestedPeople,
    };
  } catch (error) {
    console.error('Failed to parse Tag Suggestions, returning default:', error);
    return defaultTags;
  }
}
