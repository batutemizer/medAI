// src/services/aiService.js - AI SERVİSİ (TEMİZ MİMARİ)
// 🔐 BILLING FLAG (GLOBAL)



import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { 
  GEMINI_API_KEY
} from '../config/env';
import { handleAPIError, logError } from '../utils/errorHandler';

const HAS_VISION_BILLING = false;
// API Key validation
if (!GEMINI_API_KEY || GEMINI_API_KEY === '') {
  console.warn('⚠️ GEMINI_API_KEY bulunamadı! AI özellikleri çalışmayabilir.');
}

// Fallback mesajları
const FALLBACK_MESSAGES = {
  limit: [
    'Günlük kullanım limiti doldu',
    'Lütfen yarın tekrar deneyin',
    'Veya doktora başvurun'
  ],
  network: [
    'İnternet bağlantısı yok',
    'Lütfen bağlantınızı kontrol edin',
    'Daha sonra tekrar deneyin'
  ],
  general: [
    'Analiz yapılamadı',
    'Lütfen daha sonra tekrar deneyin',
    'Veya doktora başvurun'
  ]
};

/**
 * Semptom analizi için AI çağrısı
 * @param {string} symptoms - Kullanıcının girdiği semptomlar
 * @returns {Promise<Array<string>>} - Analiz sonuçları array
 */
/**
 * Semptom analizi - Hata yönetimi ve fallback ile
 * @param {string} symptoms - Kullanıcı semptomları
 * @param {string} userId - Kullanıcı ID (opsiyonel)
 */
export const analyzeSymptoms = async (symptoms, userId = null) => {
  try {
    console.log('🤖 AI semptom analizi başlatılıyor...');
    
    // Sadece Gemini API kullan
    const result = await analyzeSymptomsWithGemini(symptoms);
    
    if (result && result.length > 0) {
      console.log('✅ Analiz tamamlandı');
      return result;
    }
    
    // Sonuç yoksa fallback mesajı döndür
    console.warn('⚠️ Analiz sonucu alınamadı, fallback mesajı döndürülüyor');
    return FALLBACK_MESSAGES.general;
    
  } catch (error) {
    // Hatalar için sessizce fallback döndür
    console.error('❌ Analiz hatası (sessiz):', error);
    logError(error, 'analyzeSymptoms');
    
    // API hatasını yönet
    const apiError = handleAPIError(error);
    
    // Token limit hatası
    if (apiError.isLimitError) {
      return FALLBACK_MESSAGES.limit;
    }
    
    // Network hatası
    if (apiError.isNetworkError) {
      return FALLBACK_MESSAGES.network;
    }
    
    // Genel hata - fallback mesajı döndür
    return FALLBACK_MESSAGES.general;
  }
};

/**
 * Görsel analizi için AI çağrısı
 * @param {string} imageUri - Görsel URI (base64 veya URL)
 * @returns {Promise<Array<string>>} - Analiz sonuçları array
 */
/**
 * Görsel analizi - Hata yönetimi ve fallback ile
 */
export const analyzeImage = async (imageUri) => {
  // 🚫 HARD BLOCK — EN KRİTİK YER
  if (!HAS_VISION_BILLING) {
    console.log('🚫 Görsel analiz kapalı (billing yok)');
    return [
      'Görsel analiz Pro özelliktir',
      'Devam etmek için Pro’ya yükseltin'
    ];
  }

  if (!GEMINI_API_KEY) {
    return FALLBACK_MESSAGES.general;
  }

  try {
    console.log('🤖 AI görsel analizi başlatılıyor...');
    const result = await analyzeImageWithGemini(imageUri);
    return result;
  } catch (error) {
    console.error('❌ Görsel analiz hatası:', error);
    return FALLBACK_MESSAGES.general;
  }
};


// ==================== GOOGLE GEMINI API FONKSİYONLARI ====================

/**
 * Mevcut modelleri listele (debug için)
 */
const listAvailableModels = async () => {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models?key=${GEMINI_API_KEY}`
    );
    const data = await response.json();
    console.log('📋 Mevcut modeller:', data);
    return data;
  } catch (error) {
    console.error('❌ Model listesi alınamadı:', error);
    return null;
  }
};

/**
 * Google Gemini API ile semptom analizi - ÜCRETSİZ!
 */
const analyzeSymptomsWithGemini = async (symptoms) => {
  try {
    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API Key bulunamadı! Lütfen .env dosyasında GEMINI_API_KEY değerini kontrol edin.');
    }
    
    // Token limit kontrolü (response'dan kontrol edilecek)

    // Önce mevcut modelleri kontrol et (sadece ilk çağrıda)
    // Sonra doğru model adını kullan
    
    // Google Gemini API endpoint - v1 kullanıyoruz (daha stabil)
    // Önce gemini-2.0-flash-exp'ı deneyelim (en güncel stable model)
    let modelName = 'gemini-2.5-flash';


    let response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Sen bir sağlık asistanısın. Kullanıcının semptomlarını analiz edip, 
              olası durumları, önerileri ve aciliyet seviyesini belirtmelisin. 
              Yanıtını Türkçe olarak, şu formatta ver:
              1. Olası durum: [durum adı]
              2. Belirtiler: [belirtiler]
              3. Öneri: [öneriler]
              4. İzleme: [izleme önerileri]
              5. Aciliyet: [Düşük/Orta/Yüksek seviye]
              
              ÖNEMLİ: Bu sadece tahminidir, kesin teşhis değildir. Mutlaka doktora başvurulmalıdır.
              
              Kullanıcının semptomları: ${symptoms}`
            }]
          }]
        }),
      }
    );

    const rawText = await response.text();

if (!rawText || rawText.trim().length === 0) {
  throw new Error('Gemini API boş yanıt döndürdü');
}

let data;
try {
  data = JSON.parse(rawText);
} catch (err) {
  console.error('❌ JSON parse edilemedi');
  console.error('⬇️ RAW RESPONSE ⬇️');
  console.error(rawText);
  throw err;
}

    
    // Eğer model bulunamazsa, alternatif modelleri dene
    if (!response.ok && data.error?.message?.includes('not found')) {
      console.log('⚠️ Model bulunamadı, alternatif modeller deneniyor...');
      
      // Alternatif model adları (güncel modeller - v1 API)
      const alternativeModels = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-001'
];


      
      for (const altModel of alternativeModels) {
        try {
          console.log(`🔄 ${altModel} deneniyor...`);
          const altResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/${altModel}:generateContent?key=${GEMINI_API_KEY}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                contents: [{
                  parts: [{
                    text: `Sen bir sağlık asistanısın. Kullanıcının semptomlarını analiz edip, 
                    olası durumları, önerileri ve aciliyet seviyesini belirtmelisin. 
                    Yanıtını Türkçe olarak, şu formatta ver:
                    1. Olası durum: [durum adı]
                    2. Belirtiler: [belirtiler]
                    3. Öneri: [öneriler]
                    4. İzleme: [izleme önerileri]
                    5. Aciliyet: [Düşük/Orta/Yüksek seviye]
                    
                    ÖNEMLİ: Bu sadece tahminidir, kesin teşhis değildir. Mutlaka doktora başvurulmalıdır.
                    
                    Kullanıcının semptomları: ${symptoms}`
                  }]
                }]
              }),
            }
          );
          
          const rawText = await altResponse.text();

          if (!rawText) {
            continue;
          }

          try {
            data = JSON.parse(rawText);
          } catch {
            continue;
          }

          
          if (altResponse.ok) {
            console.log(`✅ ${altModel} çalıştı!`);
            response = altResponse;
            break;
          }
        } catch (err) {
          console.log(`❌ ${altModel} başarısız:`, err.message);
          continue;
        }
      }
    }
    
    if (!response.ok) {
      // Token limit kontrolü
      if (data.error?.status === 'RESOURCE_EXHAUSTED' || 
          data.error?.message?.includes('quota') ||
          data.error?.message?.includes('limit') ||
          response.status === 429) {
        console.error('❌ Token limit doldu:', data.error);
        throw new Error('Günlük kullanım limiti doldu. Lütfen yarın tekrar deneyin.');
      }
      
      // API key hatası
      if (data.error?.status === 'UNAUTHENTICATED' || 
          data.error?.message?.includes('API key')) {
        console.error('❌ API key hatası:', data.error);
        throw new Error('Gemini API Key geçersiz veya eksik!');
      }
      
      // Mevcut modelleri listele (debug için)
      await listAvailableModels();
      throw new Error(`Gemini API hatası: ${data.error?.message || 'Bilinmeyen hata'}`);
    }
    
    // Token kullanımı kontrolü (response metadata'dan)
    if (data.usageMetadata) {
      console.log('📊 Token kullanımı:', {
        promptTokens: data.usageMetadata.promptTokenCount,
        candidatesTokens: data.usageMetadata.candidatesTokenCount,
        totalTokens: data.usageMetadata.totalTokenCount
      });
    }
    
    console.log('🔍 Gemini API yanıtı alındı');
    
    // Yanıt formatını kontrol et
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      console.error('❌ Beklenmeyen yanıt formatı:', data);
      throw new Error('Gemini API beklenmeyen yanıt formatı döndü');
    }
    
    const aiResponse = data.candidates[0].content.parts[0].text;
    console.log('📝 AI yanıt metni:', aiResponse);
    
    if (!aiResponse || typeof aiResponse !== 'string') {
      console.error('❌ AI yanıtı geçersiz:', aiResponse);
      throw new Error('AI yanıtı alınamadı');
    }
    
    // AI yanıtını satırlara böl
    const results = aiResponse
      .split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => line.trim());
    
    console.log('✅ Gemini AI analiz tamamlandı, sonuçlar:', results);
    return results;
    
  } catch (error) {
    console.error('❌ Gemini API hatası:', error);
    throw error;
  }
};

/**
 * Google Gemini API ile görsel analizi - ÜCRETSİZ!
 */
const analyzeImageWithGemini = async () => {
  throw new Error('VISION_DISABLED');
};


/**
 * Görseli base64'e çevir
 */
const convertImageToBase64 = async (imageUri) => {
  try {
    if (Platform.OS === 'web') {
      // Web için
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result.split(',')[1]; // data:image/jpeg;base64, kısmını çıkar
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } else {
      // React Native için - expo-file-system kullan
      try {
        const base64 = await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        return base64;
      } catch (fileError) {
        console.warn('expo-file-system ile okunamadı, fetch deneniyor...', fileError);
        // Fallback: fetch ile dene
        const response = await fetch(imageUri);
        const blob = await response.blob();
        
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
    }
  } catch (error) {
    console.error('❌ Base64 dönüştürme hatası:', error);
    throw error;
  }
};





