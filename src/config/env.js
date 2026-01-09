import Constants from 'expo-constants';

const getEnvVar = (key, defaultValue = '') => {
  const extra = 
    Constants.expoConfig?.extra || 
    Constants.manifest2?.extra || 
    Constants.manifest?.extra || 
    Constants.extra || 
    {};
  
  if (extra[key]) {
    return extra[key];
  }
  
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  
  console.log(`⚠️ Environment variable bulunamadı: ${key}, default değer kullanılıyor`);
  
  return defaultValue;
};

export const GEMINI_API_KEY = getEnvVar('GEMINI_API_KEY', '');
export const FIREBASE_API_KEY = getEnvVar('FIREBASE_API_KEY', '');
export const FIREBASE_AUTH_DOMAIN = getEnvVar('FIREBASE_AUTH_DOMAIN', '');
export const FIREBASE_PROJECT_ID = getEnvVar('FIREBASE_PROJECT_ID', '');
export const FIREBASE_STORAGE_BUCKET = getEnvVar('FIREBASE_STORAGE_BUCKET', '');
export const FIREBASE_MESSAGING_SENDER_ID = getEnvVar('FIREBASE_MESSAGING_SENDER_ID', '');
export const FIREBASE_APP_ID = getEnvVar('FIREBASE_APP_ID', '');
export const FIREBASE_MEASUREMENT_ID = getEnvVar('FIREBASE_MEASUREMENT_ID', '');

export const validateEnvVars = () => {
  const errors = [];
  
  if (!GEMINI_API_KEY || GEMINI_API_KEY === '') {
    errors.push('GEMINI_API_KEY bulunamadı - Lütfen app.json veya .env dosyasında ayarlayın');
  }
  
  if (!FIREBASE_API_KEY) {
    errors.push('FIREBASE_API_KEY bulunamadı');
  }
  
  if (!FIREBASE_PROJECT_ID) {
    errors.push('FIREBASE_PROJECT_ID bulunamadı');
  }
  
  return errors;
};

