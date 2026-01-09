import { 
  getUserAnalysisHistory, 
  getUserMedicines, 
  getUserProfile,
  getMedicineHistory 
} from './database';
import { analyzeSymptoms as analyzeWithAI } from './aiService';
import { logError } from '../utils/errorHandler';

export const generatePersonalizedRecommendations = async (userId) => {
  try {
    console.log('🔍 Kişiselleştirilmiş öneriler oluşturuluyor...');
    
    const [analysisHistory, medicines, profile, medicineHistory] = await Promise.all([
      getUserAnalysisHistory(userId),
      getUserMedicines(userId),
      getUserProfile(userId),
      getMedicineHistory(userId).catch(() => []) // Hata olursa boş array
    ]);
    
    const ruleBasedRecommendations = generateRuleBasedRecommendations(
      analysisHistory,
      medicines,
      profile,
      medicineHistory
    );
    
    const aiRecommendations = await generateAIRecommendations(
      analysisHistory,
      medicines,
      profile
    );
    
    const allRecommendations = [...ruleBasedRecommendations, ...aiRecommendations];
    const prioritizedRecommendations = prioritizeRecommendations(allRecommendations);
    
    try {
      const { collectAnonymousTrendData } = await import('./dataSharingService');
      if (analysisHistory && analysisHistory.length > 0) {
        await collectAnonymousTrendData(userId, analysisHistory);
      }
    } catch (error) {
      console.error('Trend veri toplama hatası (sessiz):', error);
    }
    
    console.log(`✅ ${prioritizedRecommendations.length} öneri oluşturuldu`);
    return prioritizedRecommendations;
    
  } catch (error) {
    logError(error, 'generatePersonalizedRecommendations');
    return getFallbackRecommendations();
  }
};

const generateRuleBasedRecommendations = (analysisHistory, medicines, profile, medicineHistory) => {
  const recommendations = [];
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const recentAnalyses = analysisHistory.filter(analysis => {
    const analysisDate = new Date(analysis.timestamp);
    return analysisDate >= sevenDaysAgo;
  });
  
  const symptomFrequency = {};
  recentAnalyses.forEach(analysis => {
    if (analysis.symptoms) {
      const symptoms = analysis.symptoms.toLowerCase();
      symptomFrequency[symptoms] = (symptomFrequency[symptoms] || 0) + 1;
    }
  });
  
  Object.entries(symptomFrequency).forEach(([symptom, count]) => {
    if (count >= 3) {
      recommendations.push({
        id: `symptom-trend-${symptom}`,
        type: 'doctor_visit',
        priority: 'high',
        title: 'Tekrarlayan Semptom',
        description: `Son 7 günde "${symptom}" semptomu ${count} kez görüldü. Doktora başvurmanız önerilir.`,
        category: 'Sağlık',
        icon: '⚠️',
        actionable: true,
        actionText: 'Doktor Randevusu Al',
        timestamp: new Date().toISOString()
      });
    }
  });
  
  const activeMedicines = medicines.filter(med => med.enabled !== false);
  const takenCount = medicineHistory.filter(h => {
    const historyDate = new Date(h.timestamp);
    return historyDate >= sevenDaysAgo;
  }).length;
  
  const expectedCount = activeMedicines.length * 7; // Her ilaç için günde 1 kez
  const complianceRate = expectedCount > 0 ? (takenCount / expectedCount) * 100 : 100;
  
  if (complianceRate < 70 && activeMedicines.length > 0) {
    recommendations.push({
      id: 'medicine-compliance',
      type: 'medicine_reminder',
      priority: 'high',
      title: 'İlaç Uyumluluğu Düşük',
      description: `Son 7 günde ilaç alım oranınız %${Math.round(complianceRate)}. Düzenli ilaç kullanımı önemlidir.`,
      category: 'İlaç',
      icon: '💊',
      actionable: true,
      actionText: 'İlaç Takibini Aç',
      timestamp: new Date().toISOString()
    });
  }
  
  if (profile) {
    if (profile.height && profile.weight) {
      const heightInMeters = profile.height / 100;
      const bmi = profile.weight / (heightInMeters * heightInMeters);
      
      if (bmi > 25) {
        recommendations.push({
          id: 'bmi-high',
          type: 'lifestyle',
          priority: 'medium',
          title: 'Sağlıklı Kilo Yönetimi',
          description: `BMI değeriniz ${bmi.toFixed(1)}. Sağlıklı kilo yönetimi için düzenli egzersiz ve dengeli beslenme önerilir.`,
          category: 'Yaşam Tarzı',
          icon: '🏃',
          actionable: true,
          actionText: 'Egzersiz Planı',
          timestamp: new Date().toISOString()
        });
      } else if (bmi < 18.5) {
        recommendations.push({
          id: 'bmi-low',
          type: 'lifestyle',
          priority: 'medium',
          title: 'Kilo Takibi',
          description: `BMI değeriniz ${bmi.toFixed(1)}. Sağlıklı kilo alımı için beslenme uzmanına danışmanız önerilir.`,
          category: 'Yaşam Tarzı',
          icon: '🍎',
          actionable: true,
          actionText: 'Beslenme Planı',
          timestamp: new Date().toISOString()
        });
      }
    }
    
    if (profile.allergies && profile.allergies.trim()) {
      recommendations.push({
        id: 'allergy-reminder',
        type: 'safety',
        priority: 'high',
        title: 'Alerji Hatırlatıcısı',
        description: `Alerjiniz: ${profile.allergies}. İlaç ve gıda seçimlerinde dikkatli olun.`,
        category: 'Güvenlik',
        icon: '⚠️',
        actionable: false,
        timestamp: new Date().toISOString()
      });
    }
    
    if (profile.chronicDiseases && profile.chronicDiseases.trim()) {
      const lastAnalysis = analysisHistory[analysisHistory.length - 1];
      const daysSinceLastAnalysis = lastAnalysis 
        ? Math.floor((now - new Date(lastAnalysis.timestamp)) / (1000 * 60 * 60 * 24))
        : 999;
      
      if (daysSinceLastAnalysis > 30) {
        recommendations.push({
          id: 'chronic-disease-checkup',
          type: 'doctor_visit',
          priority: 'medium',
          title: 'Düzenli Kontrol',
          description: `Kronik hastalığınız (${profile.chronicDiseases}) için düzenli takip önemlidir. Son analizinizden ${daysSinceLastAnalysis} gün geçti.`,
          category: 'Sağlık',
          icon: '🏥',
          actionable: true,
          actionText: 'Doktor Randevusu',
          timestamp: new Date().toISOString()
        });
      }
    }
  }
  
  recommendations.push({
    id: 'water-reminder',
    type: 'lifestyle',
    priority: 'low',
    title: 'Su İçme Hatırlatıcısı',
    description: 'Günde en az 2-2.5 litre su içmeyi unutmayın. Yeterli su tüketimi sağlık için önemlidir.',
    category: 'Yaşam Tarzı',
    icon: '💧',
    actionable: true,
    actionText: 'Hatırlatıcı Kur',
    timestamp: new Date().toISOString()
  });
  
  return recommendations;
};

const generateAIRecommendations = async (analysisHistory, medicines, profile) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const recentAnalyses = analysisHistory.filter(analysis => {
      const analysisDate = new Date(analysis.timestamp);
      return analysisDate >= thirtyDaysAgo;
    });
    
    if (recentAnalyses.length === 0) {
      return [];
    }
    
    const dataSummary = {
      totalAnalyses: recentAnalyses.length,
      symptoms: recentAnalyses.map(a => a.symptoms).join(', '),
      medicines: medicines.map(m => m.name).join(', '),
      profile: profile ? {
        age: profile.age,
        gender: profile.gender,
        bmi: profile.height && profile.weight 
          ? (profile.weight / Math.pow(profile.height / 100, 2)).toFixed(1)
          : null,
        allergies: profile.allergies,
        chronicDiseases: profile.chronicDiseases
      } : null
    };
    
    const prompt = `Sen bir sağlık uzmanısın. Kullanıcının geçmiş 30 günlük sağlık verilerini analiz et ve kişiselleştirilmiş öneriler sun.

Kullanıcı Verileri:
- Toplam analiz sayısı: ${dataSummary.totalAnalyses}
- Semptomlar: ${dataSummary.symptoms || 'Yok'}
- İlaçlar: ${dataSummary.medicines || 'Yok'}
- Profil: ${dataSummary.profile ? JSON.stringify(dataSummary.profile) : 'Eksik'}

Lütfen şu formatta öneriler sun (her öneri için ayrı satır):
Öneri 1:
Başlık: [başlık]
Öncelik: [Yüksek/Orta/Düşük]
Açıklama: [detaylı açıklama]
Kategori: [Sağlık/İlaç/Yaşam Tarzı/Güvenlik]

ÖNEMLİ: Sadece gerçek verilere dayalı öneriler sun. Genel öneriler verme.`;

    let aiResults = [];
    try {
      aiResults = await analyzeWithAI(prompt);
      
      const aiRecommendations = parseAIRecommendations(aiResults);
      
      if (aiRecommendations && aiRecommendations.length > 0) {
        return aiRecommendations;
      }
    } catch (error) {
      logError(error, 'generateAIRecommendations');
      
      if (error?.message?.includes('limit') || error?.message?.includes('quota')) {
        console.warn('⚠️ AI token limit doldu, sadece kural tabanlı öneriler gösterilecek');
      }
    }
    
    return [];
    
  } catch (error) {
    logError(error, 'generateAIRecommendations');
    return [];
  }
};

const parseAIRecommendations = (aiResults) => {
  if (!Array.isArray(aiResults) || aiResults.length === 0) {
    return [];
  }
  
  const recommendations = [];
  let currentRecommendation = null;
  let recommendationIndex = 0;
  
  const fullText = aiResults.join('\n');
  const lines = fullText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  lines.forEach((line, index) => {
    const lowerLine = line.toLowerCase();
    
    if (lowerLine.includes('öneri') && (lowerLine.includes('1') || lowerLine.includes('2') || lowerLine.includes('3'))) {
      if (currentRecommendation && currentRecommendation.title) {
        recommendations.push(currentRecommendation);
      }
      recommendationIndex++;
      currentRecommendation = {
        id: `ai-recommendation-${recommendationIndex}`,
        type: 'ai_insight',
        priority: 'medium',
        title: '',
        description: '',
        category: 'Sağlık',
        icon: '🤖',
        actionable: false,
        timestamp: new Date().toISOString()
      };
    }
    
    if (lowerLine.includes('başlık') && currentRecommendation) {
      const parts = line.split(':');
      if (parts.length > 1) {
        currentRecommendation.title = parts.slice(1).join(':').trim() || `AI Öneri ${recommendationIndex}`;
      }
    }
    
    if (lowerLine.includes('öncelik') && currentRecommendation) {
      const parts = line.split(':');
      if (parts.length > 1) {
        const priority = parts[1].trim().toLowerCase();
        currentRecommendation.priority = priority.includes('yüksek') ? 'high' :
                                         priority.includes('düşük') ? 'low' : 'medium';
      }
    }
    
    if (lowerLine.includes('açıklama') && currentRecommendation) {
      const parts = line.split(':');
      if (parts.length > 1) {
        currentRecommendation.description = parts.slice(1).join(':').trim();
      }
    }
    
    if (lowerLine.includes('kategori') && currentRecommendation) {
      const parts = line.split(':');
      if (parts.length > 1) {
        currentRecommendation.category = parts[1].trim() || 'Sağlık';
      }
    }
    
    if (currentRecommendation && !currentRecommendation.title && 
        !lowerLine.includes('öneri') && !lowerLine.includes('başlık') && 
        !lowerLine.includes('öncelik') && !lowerLine.includes('kategori') &&
        line.length > 10) {
      if (!currentRecommendation.description) {
        currentRecommendation.description = line;
      } else {
        currentRecommendation.description += ' ' + line;
      }
    }
  });
  
  if (currentRecommendation && currentRecommendation.title) {
    recommendations.push(currentRecommendation);
  }
  
  if (recommendations.length === 0 && fullText.length > 50) {
    recommendations.push({
      id: 'ai-recommendation-general',
      type: 'ai_insight',
      priority: 'medium',
      title: 'AI Analiz Önerisi',
      description: fullText.substring(0, 200) + (fullText.length > 200 ? '...' : ''),
      category: 'Sağlık',
      icon: '🤖',
      actionable: false,
      timestamp: new Date().toISOString()
    });
  }
  
  return recommendations;
};

const prioritizeRecommendations = (recommendations) => {
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  
  return recommendations
    .sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return new Date(b.timestamp) - new Date(a.timestamp);
    })
    .slice(0, 10); // En fazla 10 öneri
};

const getFallbackRecommendations = () => {
  return [
    {
      id: 'fallback-1',
      type: 'lifestyle',
      priority: 'low',
      title: 'Düzenli Kontrol',
      description: 'Sağlık durumunuzu düzenli olarak takip etmeyi unutmayın.',
      category: 'Genel',
      icon: '📋',
      actionable: false,
      timestamp: new Date().toISOString()
    }
  ];
};

export const filterRecommendationsByCategory = (recommendations, category) => {
  if (!category || category === 'all') {
    return recommendations;
  }
  return recommendations.filter(rec => rec.category === category);
};

export const filterRecommendationsByPriority = (recommendations, priority) => {
  if (!priority || priority === 'all') {
    return recommendations;
  }
  return recommendations.filter(rec => rec.priority === priority);
};

