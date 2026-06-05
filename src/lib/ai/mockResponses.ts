import { AIInsight } from '@/types/ai';

export function getMockWeeklyInsight(userId: string, weekStart: string, weekEnd: string): AIInsight {
  return {
    id: `insight_mock_${Date.now()}`,
    userId,
    type: 'weekly',
    status: 'generated',
    weekStart,
    weekEnd,
    dateRange: { start: weekStart, end: weekEnd },
    summary: `Minggu ini ditandai dengan fokus yang kuat pada eksplorasi kreatif dan pembersihan teknis. Tulisan Anda mencerminkan antusiasme tinggi terhadap proyek ASA Journey, terutama pada peningkatan estetika visual dan mode gelap. Ada sedikit kelelahan di pertengahan minggu, namun Anda berhasil memulihkan energi melalui istirahat yang berkualitas dan refleksi diri yang tenang. Hubungan sosial dengan rekan terdekat juga memberikan dorongan motivasi positif.`,
    keyEvents: [
      'Menyelesaikan pembersihan arsitektur kode visual mode gelap.',
      'Menemukan ritme tidur yang lebih stabil di awal minggu.',
      'Melakukan kolaborasi intens terkait integrasi PWA offline-first.'
    ],
    themes: [
      'Peningkatan Produktivitas & Kreativitas',
      'Refleksi Diri & Pemulihan Energi',
      'Kolaborasi & Koneksi Sosial yang Hangat'
    ],
    recurringThemes: [
      'Peningkatan Produktivitas & Kreativitas',
      'Refleksi Diri & Pemulihan Energi',
      'Kolaborasi & Koneksi Sosial yang Hangat'
    ],
    emotionalPatterns: [
      {
        label: 'Tenang dan Kreatif',
        description: 'Terlihat adanya korelasi positif antara aktivitas eksplorasi visual dengan ketenangan emosi Anda.',
        confidence: 0.85
      },
      {
        label: 'Lelah di Tengah Pekan',
        description: 'Ada penurunan energi di hari Rabu, yang langsung membaik setelah Anda mengambil waktu istirahat penuh.',
        confidence: 0.72
      }
    ],
    lessons: [
      'Menulis jurnal terbukti membantu mengurai kecemasan dan memperjelas langkah tindakan.',
      'Menetapkan prioritas yang terpusat mencegah cognitive overload dari daftar tugas yang terlalu panjang.',
      'Sesi istirahat berkualitas di malam hari berdampak langsung pada kejernihan mimpi dan kesiapan keesokan hari.'
    ],
    actionItems: [
      {
        id: 'act_mock_1',
        text: 'Selesaikan pembersihan kode UI serta terapkan transisi warna pada tema gelap observatorium',
        title: 'Selesaikan pembersihan kode UI gelap',
        description: 'Terapkan transisi warna yang mulus pada tema gelap observatorium untuk meningkatkan pengalaman premium.',
        category: 'Creative',
        priority: 'high',
        focusMode: 'hyperfocus',
        suggestedGoalArea: 'work',
        canBecomeGoal: true
      },
      {
        id: 'act_mock_2',
        text: 'Lakukan ritual tenang 10 menit sebelum tidur (membaca buku fisik atau meditasi napas)',
        title: 'Ritual tenang sebelum tidur',
        description: 'Lakukan ritual membaca buku fisik atau meditasi pernapasan selama 10 menit sebelum tidur demi kualitas mimpi.',
        category: 'Self-Care',
        priority: 'medium',
        focusMode: 'top3',
        suggestedGoalArea: 'health',
        canBecomeGoal: true
      },
      {
        id: 'act_mock_3',
        text: 'Jadwalkan diskusi santai dengan rekan kerja mengenai integrasi arsitektur PWA offline-first',
        title: 'Jadwalkan diskusi integrasi PWA',
        description: 'Bicarakan dengan tim mengenai strategi sinkronisasi Firestore yang tangguh saat luring.',
        category: 'Work',
        priority: 'low',
        focusMode: 'pareto',
        suggestedGoalArea: 'work',
        canBecomeGoal: false
      }
    ],
    suggestedGoals: [
      {
        id: 'sgoal_mock_1',
        title: 'Integrasikan Quiet Insight MVP',
        reason: 'Ini adalah fitur utama yang menjadi jembatan antara refleksi mingguan dan aksi nyata di ASA Journey.',
        goalType: 'top3'
      },
      {
        id: 'sgoal_mock_2',
        title: 'Optimalkan Kualitas Istirahat Mingguan',
        reason: 'Meningkatkan ritme tidur secara konsisten berdasarkan catatan kelelahan Anda di pertengahan pekan.',
        goalType: 'hyperfocus'
      }
    ],
    suggestedTags: ['work', 'design', 'self-growth', 'sleep'],
    suggestedPeople: ['Budi', 'Andi'],
    sourceEntryIds: ['mock_entry_1', 'mock_entry_2'],
    aiMeta: {
      model: 'gemini-1.5-flash',
      promptVersion: '1.0',
      generatedAt: new Date().toISOString()
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export function getMockSuggestedTags(content: string) {
  const text = content.toLowerCase();
  
  const suggestedTags: string[] = [];
  const suggestedPeople: string[] = [];

  // Analisis teks sederhana untuk mencocokkan kata kunci
  if (text.includes('kerja') || text.includes('project') || text.includes('coding') || text.includes('pwa')) {
    suggestedTags.push('work', 'development');
  }
  if (text.includes('desain') || text.includes('tema') || text.includes('ui') || text.includes('css')) {
    suggestedTags.push('design', 'creative');
  }
  if (text.includes('tidur') || text.includes('mimpi') || text.includes('dream')) {
    suggestedTags.push('dreams', 'sleep');
  }
  if (text.includes('lelah') || text.includes('istirahat') || text.includes('tenang')) {
    suggestedTags.push('self-care', 'mindfulness');
  }

  // Tambahkan tag fallback jika kosong
  if (suggestedTags.length === 0) {
    suggestedTags.push('journal', 'reflection');
  }

  // Deteksi nama orang (contoh mentee atau rekan kerja)
  const commonNames = ['budi', 'andi', 'ani', 'siti', 'dodi', 'rudi', 'dewi', 'ibu', 'ayah', 'adik', 'kakak'];
  commonNames.forEach(name => {
    if (text.includes(name)) {
      suggestedPeople.push(name.charAt(0).toUpperCase() + name.slice(1));
    }
  });

  return {
    suggestedTags: Array.from(new Set(suggestedTags)),
    suggestedPeople: Array.from(new Set(suggestedPeople))
  };
}

export function getMockDailyInsight(userId: string) {
  return {
    moodScore: 8,
    sentiment: 'positive',
    insightText: 'Hari yang menyenangkan! Skor tidur Anda yang tinggi (85) tampaknya memberikan kontribusi langsung pada energi positif Anda dalam menyelesaikan proyek kreatif hari ini.'
  };
}
