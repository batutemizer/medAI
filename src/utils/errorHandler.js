import { Alert } from 'react-native';

const getErrorMessage = (error) => {
  if (error?.message?.includes('API key')) {
    return 'API anahtarı geçersiz veya eksik. Lütfen ayarları kontrol edin.';
  }
  
  if (error?.message?.includes('quota') || error?.message?.includes('limit')) {
    return 'Günlük kullanım limiti doldu. Lütfen yarın tekrar deneyin.';
  }
  
  if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
    return 'İnternet bağlantısı yok. Lütfen bağlantınızı kontrol edin.';
  }
  
  if (error?.message?.includes('timeout')) {
    return 'İstek zaman aşımına uğradı. Lütfen tekrar deneyin.';
  }
  
  if (error?.code?.includes('permission-denied')) {
    return 'Bu işlem için yetkiniz yok.';
  }
  
  if (error?.code?.includes('unavailable')) {
    return 'Servis şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.';
  }
  
  return 'Bir hata oluştu. Lütfen tekrar deneyin.';
};

export const logError = (error, context = '') => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ❌ Hata${context ? ` (${context})` : ''}:`, {
    message: error?.message || error,
    code: error?.code,
    stack: error?.stack,
  });
};

export const handleErrorSilently = (error, context = '') => {
  logError(error, context);
  return {
    success: false,
    error: getErrorMessage(error),
    silent: true,
  };
};

export const handleErrorWithAlert = (error, context = '') => {
  logError(error, context);
  const message = getErrorMessage(error);
  
  Alert.alert(
    'Hata',
    message,
    [{ text: 'Tamam' }]
  );
  
  return {
    success: false,
    error: message,
    shown: true,
  };
};

export const handleAPIError = (error, fallbackMessage = 'İşlem başarısız oldu.') => {
  logError(error, 'API');
  
  if (error?.message?.includes('quota') || 
      error?.message?.includes('limit') || 
      error?.response?.status === 429) {
    return {
      success: false,
      error: 'Günlük kullanım limiti doldu. Lütfen yarın tekrar deneyin.',
      isLimitError: true,
      fallback: true,
    };
  }
  
  if (error?.message?.includes('network') || 
      error?.message?.includes('fetch') ||
      error?.message?.includes('Failed to fetch') ||
      error?.code === 'NETWORK_ERROR') {
    return {
      success: false,
      error: 'İnternet bağlantısı yok. Lütfen bağlantınızı kontrol edin.',
      isNetworkError: true,
      fallback: true,
    };
  }
  
  return {
    success: false,
    error: fallbackMessage,
    fallback: true,
  };
};





