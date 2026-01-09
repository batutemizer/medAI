import { 
  doc, 
  setDoc, 
  getDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';

const cache = new Map();
const CACHE_TTL = 30000; // 30 saniye

const getCached = (key) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  cache.delete(key);
  return null;
};

const setCached = (key, data) => {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
};

const clearCache = (pattern) => {
  if (pattern) {
    for (const key of cache.keys()) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
};

export const saveUserProfile = async (userId, profileData) => {
  try {
    await setDoc(doc(db, 'users', userId), {
      ...profileData,
      updatedAt: new Date().toISOString()
    });
    
    clearCache(`profile_${userId}`);
    clearCache(`stats_${userId}`);
    
    if (profileData.dataSharing === true) {
      const { collectAnonymousProfileData } = await import('./dataSharingService');
      collectAnonymousProfileData(userId).catch(() => {});
    }
    
    return true;
  } catch (error) {
    console.error('❌ Profil kaydetme hatası:', error);
    return false;
  }
};

export const getUserProfile = async (userId) => {
  try {
    const cacheKey = `profile_${userId}`;
    const cached = getCached(cacheKey);
    if (cached !== null) {
      return cached;
    }
    
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      setCached(cacheKey, data);
      return data;
    }
    return null;
  } catch (error) {
    console.error('❌ Profil getirme hatası:', error);
    return null;
  }
};

export const saveUserMedicines = async (userId, medicines) => {
  try {
    await setDoc(doc(db, 'medicines', userId), {
      medicines: medicines,
      updatedAt: new Date().toISOString(),
      medicineCount: medicines.length
    });
    
    clearCache(`medicines_${userId}`);
    clearCache(`stats_${userId}`);
    
    const { collectAnonymousMedicineData } = await import('./dataSharingService');
    getMedicineHistory(userId, 50).then(history => {
      collectAnonymousMedicineData(userId, medicines, history).catch(() => {});
    }).catch(() => {
      collectAnonymousMedicineData(userId, medicines, []).catch(() => {});
    });
    
    return true;
  } catch (error) {
    console.error('❌ İlaç kaydetme hatası:', error);
    return false;
  }
};

export const getUserMedicines = async (userId) => {
  try {
    const cacheKey = `medicines_${userId}`;
    const cached = getCached(cacheKey);
    if (cached !== null) {
      return cached;
    }
    
    const docRef = doc(db, 'medicines', userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const medicines = docSnap.data().medicines || [];
      setCached(cacheKey, medicines);
      return medicines;
    }
    return [];
  } catch (error) {
    console.error('❌ İlaç getirme hatası:', error);
    return [];
  }
};

export const getUserStats = async (userId) => {
  try {
    const cacheKey = `stats_${userId}`;
    const cached = getCached(cacheKey);
    if (cached !== null) {
      return cached;
    }
    
    const [profileDoc, medicinesDoc, analysisCount] = await Promise.all([
      getDoc(doc(db, 'users', userId)),
      getDoc(doc(db, 'medicines', userId)),
      getUserAnalysisHistoryCount(userId) // Sadece sayı için optimize edilmiş
    ]);
    
    const profileCompletion = profileDoc.exists() ? 
      (profileDoc.data().profileCompletion || 0) : 0;
    
    const medicines = medicinesDoc.exists() ? 
      (medicinesDoc.data().medicines || []) : [];
    
    const medicineCount = medicines.length;
    const takenMedicines = medicines.filter(med => med.taken).length;

    const stats = {
      profileCompletion,
      medicineCount,
      takenMedicines,
      analysisCount,
      totalStats: medicineCount + analysisCount
    };

    setCached(cacheKey, stats);
    return stats;
    
  } catch (error) {
    console.error('❌ İstatistik yükleme hatası:', error);
    return {
      profileCompletion: 0,
      medicineCount: 0,
      takenMedicines: 0,
      analysisCount: 0,
      totalStats: 0
    };
  }
};

const getUserAnalysisHistoryCount = async (userId) => {
  try {
    const cacheKey = `analysis_count_${userId}`;
    const cached = getCached(cacheKey);
    if (cached !== null) {
      return cached;
    }
    
    const q = query(
      collection(db, 'analysisHistory'), 
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    const count = querySnapshot.size;
    
    setCached(cacheKey, count);
    return count;
  } catch (error) {
    return 0;
  }
};

export const saveAnalysisHistory = async (userId, analysisData) => {
  try {
    const timestamp = new Date().toISOString();
    const analysisRef = doc(collection(db, 'analysisHistory'));
    await setDoc(analysisRef, {
      userId: userId,
      type: analysisData.type,
      results: analysisData.results,
      timestamp: timestamp,
      ...analysisData
    });
    
    clearCache(`analysis_history_${userId}`);
    clearCache(`analysis_count_${userId}`);
    clearCache(`stats_${userId}`);
    
    const { collectAnonymousAnalysisData } = await import('./dataSharingService');
    collectAnonymousAnalysisData(userId, {
      ...analysisData,
      timestamp: timestamp
    }).catch(() => {});
    
    return true;
  } catch (error) {
    console.error('❌ Analiz kaydetme hatası:', error);
    return false;
  }
};

export const saveMedicineReminders = async (userId, reminders) => {
  try {
    console.log('⏰ İlaç bildirim ayarları kaydediliyor...');
    
    await setDoc(doc(db, 'medicineReminders', userId), {
      reminders: reminders,
      updatedAt: new Date().toISOString(),
      enabled: reminders.some(reminder => reminder.enabled)
    });
    
    console.log('✅ İlaç bildirim ayarları kaydedildi');
    return true;
  } catch (error) {
    console.error('❌ İlaç bildirim kaydetme hatası:', error);
    return false;
  }
};

export const getMedicineReminders = async (userId) => {
  try {
    console.log('📖 İlaç bildirim ayarları yükleniyor...');
    
    const docRef = doc(db, 'medicineReminders', userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      console.log('✅ İlaç bildirim ayarları bulundu');
      return docSnap.data().reminders || [];
    } else {
      console.log('ℹ️ İlaç bildirim ayarları bulunamadı');
      return [];
    }
  } catch (error) {
    console.error('❌ İlaç bildirim yükleme hatası:', error);
    return [];
  }
};

export const saveMedicineHistory = async (userId, medicineId, takenData) => {
  try {
    console.log('📝 İlaç alım geçmişi kaydediliyor...');
    
    const historyRef = doc(collection(db, 'medicineHistory'));
    await setDoc(historyRef, {
      userId: userId,
      medicineId: medicineId,
      ...takenData,
      timestamp: new Date().toISOString()
    });
    
    console.log('✅ İlaç alım geçmişi kaydedildi');
    return true;
  } catch (error) {
    console.error('❌ İlaç alım geçmişi kaydetme hatası:', error);
    return false;
  }
};

export const getMedicineHistory = async (userId, maxResults = 100) => {
  try {
    const cacheKey = `medicine_history_${userId}_${maxResults}`;
    const cached = getCached(cacheKey);
    if (cached !== null) {
      return cached;
    }
    
    const q = query(
      collection(db, 'medicineHistory'), 
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    const medicineHistory = [];
    
    querySnapshot.forEach((doc) => {
      medicineHistory.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    medicineHistory.sort((a, b) => {
      const timeA = a.timestamp || '';
      const timeB = b.timestamp || '';
      return timeB.localeCompare(timeA); // Descending order
    });
    
    const limitedHistory = medicineHistory.slice(0, maxResults);
    
    setCached(cacheKey, limitedHistory);
    return limitedHistory;
    
  } catch (error) {
    console.error('❌ İlaç alım geçmişi yükleme hatası:', error);
    return [];
  }
};

export const getUserAnalysisHistory = async (userId, maxResults = 100) => {
  try {
    const cacheKey = `analysis_history_${userId}_${maxResults}`;
    const cached = getCached(cacheKey);
    if (cached !== null) {
      return cached;
    }
    
    const q = query(
      collection(db, 'analysisHistory'), 
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    const analysisHistory = [];
    
    querySnapshot.forEach((doc) => {
      analysisHistory.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    analysisHistory.sort((a, b) => {
      const timeA = a.timestamp || '';
      const timeB = b.timestamp || '';
      return timeB.localeCompare(timeA); // Descending order
    });
    
    const limitedHistory = analysisHistory.slice(0, maxResults);
    
    setCached(cacheKey, limitedHistory);
    return limitedHistory;
    
  } catch (error) {
    console.error('❌ Analiz geçmişi yükleme hatası:', error);
    return [];
  }
};


export const clearTodayAnalysis = async (userId) => {
  try {
    console.log('🧹 Bugünün analizleri temizleniyor...');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.toISOString();
    
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const todayEndStr = todayEnd.toISOString();
    
    const q = query(
      collection(db, 'analysisHistory'),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    const deletePromises = [];
    
    querySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      const timestamp = data.timestamp;
      
      if (timestamp >= todayStart && timestamp <= todayEndStr) {
        deletePromises.push(deleteDoc(doc(db, 'analysisHistory', docSnapshot.id)));
      }
    });
    
    await Promise.all(deletePromises);
    const deletedCount = deletePromises.length;
    
    console.log(`✅ ${deletedCount} analiz temizlendi`);
    return deletedCount;
    
  } catch (error) {
    console.error('❌ Analiz temizleme hatası:', error);
    return 0;
  }
};

export const clearTodayMedicineHistory = async (userId) => {
  try {
    console.log('🧹 Bugünün ilaç alım geçmişi temizleniyor...');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.toISOString();
    
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const todayEndStr = todayEnd.toISOString();
    
    const q = query(
      collection(db, 'medicineHistory'),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    const deletePromises = [];
    
    querySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      const timestamp = data.timestamp;
      
      if (timestamp >= todayStart && timestamp <= todayEndStr) {
        deletePromises.push(deleteDoc(doc(db, 'medicineHistory', docSnapshot.id)));
      }
    });
    
    await Promise.all(deletePromises);
    const deletedCount = deletePromises.length;
    
    console.log(`✅ ${deletedCount} ilaç alım kaydı temizlendi`);
    return deletedCount;
    
  } catch (error) {
    console.error('❌ İlaç alım geçmişi temizleme hatası:', error);
    return 0;
  }
};


export const resetTodayMedicineStatus = async (userId) => {
  try {
    console.log('🔄 İlaç durumları sıfırlanıyor...');
    
    const medicines = await getUserMedicines(userId);
    
    const updatedMedicines = medicines.map(medicine => ({
      ...medicine,
      taken: false,
      takenToday: false
    }));
    
    await saveUserMedicines(userId, updatedMedicines);
    
    console.log(`✅ ${updatedMedicines.length} ilaç durumu sıfırlandı`);
    return updatedMedicines.length;
    
  } catch (error) {
    console.error('❌ İlaç durumu sıfırlama hatası:', error);
    return 0;
  }
};


export const clearAllTodayData = async (userId) => {
  try {
    console.log('🧹 Tüm bugünün verileri temizleniyor...');
    
    const [analysisCount, historyCount, medicineCount] = await Promise.all([
      clearTodayAnalysis(userId),
      clearTodayMedicineHistory(userId),
      resetTodayMedicineStatus(userId)
    ]);
    
    const total = analysisCount + historyCount + medicineCount;
    console.log(`✅ Toplam ${total} kayıt temizlendi`);
    
    return {
      analysisCount,
      historyCount,
      medicineCount,
      total
    };
    
  } catch (error) {
    console.error('❌ Günlük temizleme hatası:', error);
    return {
      analysisCount: 0,
      historyCount: 0,
      medicineCount: 0,
      total: 0
    };
  }
};

export const saveBloodTestResults = async (userId, testData) => {
  try {
    console.log('🩸 Kan tahlili sonuçları kaydediliyor...');
    
    const testRef = doc(collection(db, 'bloodTests'));
    await setDoc(testRef, {
      userId: userId,
      tarih: testData.tarih,
      değerler: testData.değerler,
      analiz: testData.analiz || [],
      öneri: testData.öneri || '',
      timestamp: new Date().toISOString()
    });
    
    clearCache(`blood_tests_${userId}`);
    
    console.log('✅ Kan tahlili sonuçları kaydedildi');
    return true;
  } catch (error) {
    console.error('❌ Kan tahlili kaydetme hatası:', error);
    return false;
  }
};

export const getBloodTestResults = async (userId) => {
  try {
    const cacheKey = `blood_tests_${userId}`;
    const cached = getCached(cacheKey);
    if (cached !== null) {
      return cached;
    }
    
    const q = query(
      collection(db, 'bloodTests'),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    const tests = [];
    
    querySnapshot.forEach((doc) => {
      tests.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    tests.sort((a, b) => {
      const dateA = a.tarih || a.timestamp || '';
      const dateB = b.tarih || b.timestamp || '';
      return dateB.localeCompare(dateA);
    });
    
    setCached(cacheKey, tests);
    return tests;
  } catch (error) {
    console.error('❌ Kan tahlili yükleme hatası:', error);
    return [];
  }
};

export const deleteAllBloodTestResults = async (userId) => {
  try {
    console.log('🗑️ Tüm kan tahlili sonuçları siliniyor...');
    
    const q = query(
      collection(db, 'bloodTests'),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    const deletePromises = [];
    
    querySnapshot.forEach((doc) => {
      deletePromises.push(deleteDoc(doc.ref));
    });
    
    await Promise.all(deletePromises);
    
    clearCache(`blood_tests_${userId}`);
    
    console.log(`✅ ${deletePromises.length} kan tahlili sonucu silindi`);
    return deletePromises.length;
  } catch (error) {
    console.error('❌ Kan tahlili silme hatası:', error);
    return 0;
  }
};