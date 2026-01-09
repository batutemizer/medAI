import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';
import { getUserProfile } from './database';
import { logError } from '../utils/errorHandler';

const hashUserId = (userId) => {
  if (!userId) return '';
  
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
};

const getAgeRange = (age) => {
  if (!age || age === '') return 'unknown';
  const numAge = parseInt(age);
  if (isNaN(numAge)) return 'unknown';
  
  if (numAge < 18) return 'under_18';
  if (numAge < 25) return '18-24';
  if (numAge < 35) return '25-34';
  if (numAge < 45) return '35-44';
  if (numAge < 55) return '45-54';
  if (numAge < 65) return '55-64';
  return '65+';
};

const getBMICategory = (bmi) => {
  if (!bmi || isNaN(bmi)) return 'unknown';
  
  if (bmi < 18.5) return 'underweight';
  if (bmi < 25) return 'normal';
  if (bmi < 30) return 'overweight';
  return 'obese';
};

const getMonthYear = (timestamp) => {
  if (!timestamp) return '';
  try {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  } catch (error) {
    return '';
  }
};

const extractSymptomPatterns = (analysisHistory) => {
  if (!analysisHistory || analysisHistory.length === 0) return {};
  
  const symptomFrequency = {};
  const symptomCombinations = [];
  
  analysisHistory.forEach(analysis => {
    if (analysis.symptoms) {
      const symptoms = analysis.symptoms.toLowerCase().trim();
      
      symptomFrequency[symptoms] = (symptomFrequency[symptoms] || 0) + 1;
      
      const symptomList = symptoms.split(/[,\s]+/).filter(s => s.length > 2);
      if (symptomList.length >= 2) {
        symptomCombinations.push(symptomList.sort().join(','));
      }
    }
  });
  
  return {
    uniqueSymptoms: Object.keys(symptomFrequency).length,
    totalAnalyses: analysisHistory.length,
    topSymptoms: Object.entries(symptomFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([symptom, count]) => ({ symptom, count })),
    commonCombinations: symptomCombinations.slice(0, 10)
  };
};

const extractMedicineStats = (medicines, medicineHistory) => {
  if (!medicines) medicines = [];
  if (!medicineHistory) medicineHistory = [];
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentHistory = medicineHistory.filter(h => {
    const historyDate = new Date(h.timestamp);
    return historyDate >= thirtyDaysAgo;
  });
  
  const activeMedicines = medicines.filter(m => m.enabled !== false);
  const expectedCount = activeMedicines.length * 30; // 30 gün için
  const takenCount = recentHistory.length;
  const complianceRate = expectedCount > 0 
    ? Math.round((takenCount / expectedCount) * 100) 
    : 0;
  
  return {
    totalMedicines: medicines.length,
    activeMedicines: activeMedicines.length,
    complianceRate: complianceRate,
    averageMedicinesPerDay: activeMedicines.length,
    hasReminders: activeMedicines.some(m => m.reminders && m.reminders.length > 0)
  };
};

export const checkDataSharingPermission = async (userId) => {
  try {
    const profile = await getUserProfile(userId);
    return profile?.dataSharing === true;
  } catch (error) {
    logError(error, 'checkDataSharingPermission');
    return false;
  }
};

export const collectAnonymousProfileData = async (userId) => {
  try {
    const hasPermission = await checkDataSharingPermission(userId);
    if (!hasPermission) {
      console.log('ℹ️ Kullanıcı veri paylaşımına izin vermemiş');
      return;
    }
    
    const profile = await getUserProfile(userId);
    if (!profile) return;
    
    const age = profile.age ? parseInt(profile.age) : null;
    const height = profile.height ? parseFloat(profile.height) : null;
    const weight = profile.weight ? parseFloat(profile.weight) : null;
    const bmi = (height && weight) 
      ? weight / Math.pow(height / 100, 2) 
      : null;
    
    const anonymousData = {
      userIdHash: hashUserId(userId),
      
      ageRange: getAgeRange(age),
      gender: profile.gender || 'unknown',
      bmiCategory: getBMICategory(bmi),
      
      hasAllergies: !!(profile.allergies && profile.allergies.trim()),
      hasChronicDiseases: !!(profile.chronicDiseases && profile.chronicDiseases.trim()),
      hasSurgeries: !!(profile.surgeries && profile.surgeries.trim()),
      
      monthYear: getMonthYear(profile.lastUpdated || new Date().toISOString()),
      
      profileCompletion: profile.profileCompletion || 0,
      collectedAt: new Date().toISOString()
    };
    
    await addDoc(collection(db, 'anonymousHealthData'), anonymousData);
    console.log('✅ Anonim profil verisi kaydedildi');
    
  } catch (error) {
    logError(error, 'collectAnonymousProfileData');
  }
};

export const collectAnonymousAnalysisData = async (userId, analysisData) => {
  try {
    const hasPermission = await checkDataSharingPermission(userId);
    if (!hasPermission) return;
    
    const anonymousData = {
      userIdHash: hashUserId(userId),
      
      analysisType: analysisData.type || 'unknown',
      
      symptoms: analysisData.symptoms 
        ? analysisData.symptoms.toLowerCase().trim() 
        : null,
      
      hasResults: !!(analysisData.results && analysisData.results.length > 0),
      resultCount: analysisData.results ? analysisData.results.length : 0,
      
      monthYear: getMonthYear(analysisData.timestamp || new Date().toISOString()),
      
      collectedAt: new Date().toISOString()
    };
    
    await addDoc(collection(db, 'anonymousAnalysisData'), anonymousData);
    console.log('✅ Anonim analiz verisi kaydedildi');
    
  } catch (error) {
    logError(error, 'collectAnonymousAnalysisData');
  }
};

export const collectAnonymousMedicineData = async (userId, medicines, medicineHistory) => {
  try {
    const hasPermission = await checkDataSharingPermission(userId);
    if (!hasPermission) return;
    
    const medicineStats = extractMedicineStats(medicines, medicineHistory);
    
    const anonymousData = {
      userIdHash: hashUserId(userId),
      
      ...medicineStats,
      
      monthYear: getMonthYear(new Date().toISOString()),
      
      collectedAt: new Date().toISOString()
    };
    
    await addDoc(collection(db, 'anonymousMedicineData'), anonymousData);
    console.log('✅ Anonim ilaç verisi kaydedildi');
    
  } catch (error) {
    logError(error, 'collectAnonymousMedicineData');
  }
};

export const collectAnonymousTrendData = async (userId, analysisHistory) => {
  try {
    const hasPermission = await checkDataSharingPermission(userId);
    if (!hasPermission) return;
    
    const symptomPatterns = extractSymptomPatterns(analysisHistory);
    
    const anonymousData = {
      userIdHash: hashUserId(userId),
      
      ...symptomPatterns,
      
      monthYear: getMonthYear(new Date().toISOString()),
      
      collectedAt: new Date().toISOString()
    };
    
    await addDoc(collection(db, 'anonymousTrendData'), anonymousData);
    console.log('✅ Anonim trend verisi kaydedildi');
    
  } catch (error) {
    logError(error, 'collectAnonymousTrendData');
  }
};








