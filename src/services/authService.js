import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import app from './firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const auth = getAuth(app);

const AUTH_STORAGE_KEY = '@user_auth';
const USER_ID_KEY = '@user_id';

export const registerUser = async (email, password, displayName = '') => {
  try {
    console.log('📝 Kullanıcı kaydı başlatılıyor...');
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    if (displayName) {
      await updateProfile(user, {
        displayName: displayName
      });
    }
    
    await saveUserSession(user);
    
    console.log('✅ Kullanıcı başarıyla kaydedildi:', user.uid);
    return { success: true, user };
    
  } catch (error) {
    console.error('❌ Kayıt hatası:', error);
    
    let errorMessage = 'Kayıt sırasında bir hata oluştu';
    
    if (error.code === 'auth/email-already-in-use') {
      errorMessage = 'Bu email adresi zaten kullanılıyor. Giriş yapmayı deneyin.';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Geçersiz email adresi';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'Şifre en az 6 karakter olmalıdır';
    } else if (error.code === 'auth/network-request-failed') {
      errorMessage = 'İnternet bağlantısı yok. Lütfen bağlantınızı kontrol edin.';
    } else {
      errorMessage = error.message || 'Kayıt oluşturulamadı. Lütfen tekrar deneyin.';
    }
    
    return { success: false, error: errorMessage };
  }
};

export const loginUser = async (email, password) => {
  try {
    console.log('🔐 Kullanıcı girişi başlatılıyor...');
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    await saveUserSession(user);
    
    console.log('✅ Kullanıcı başarıyla giriş yaptı:', user.uid);
    return { success: true, user };
    
  } catch (error) {
    console.error('❌ Giriş hatası:', error);
    
    let errorMessage = 'Giriş sırasında bir hata oluştu';
    
    if (error.code === 'auth/user-not-found') {
      errorMessage = 'Bu email adresi ile kayıtlı kullanıcı bulunamadı';
    } else if (error.code === 'auth/wrong-password') {
      errorMessage = 'Şifre hatalı';
    } else if (error.code === 'auth/invalid-credential') {
      errorMessage = 'Email veya şifre hatalı. Lütfen kontrol edin veya kayıt olun.';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Geçersiz email adresi';
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = 'Çok fazla deneme yapıldı. Lütfen daha sonra tekrar deneyin';
    } else if (error.code === 'auth/network-request-failed') {
      errorMessage = 'İnternet bağlantısı yok. Lütfen bağlantınızı kontrol edin.';
    } else {
      errorMessage = error.message || 'Giriş yapılamadı. Lütfen bilgilerinizi kontrol edin.';
    }
    
    return { success: false, error: errorMessage };
  }
};

export const logoutUser = async () => {
  try {
    console.log('🚪 Kullanıcı çıkışı yapılıyor...');
    
    await signOut(auth);
    await clearUserSession();
    
    console.log('✅ Kullanıcı başarıyla çıkış yaptı');
    return { success: true };
    
  } catch (error) {
    console.error('❌ Çıkış hatası:', error);
    return { success: false, error: 'Çıkış yapılırken bir hata oluştu' };
  }
};

export const resetPassword = async (email) => {
  try {
    console.log('📧 Şifre sıfırlama emaili gönderiliyor...');
    
    await sendPasswordResetEmail(auth, email);
    
    console.log('✅ Şifre sıfırlama emaili gönderildi');
    return { success: true, message: 'Şifre sıfırlama emaili gönderildi' };
    
  } catch (error) {
    console.error('❌ Şifre sıfırlama hatası:', error);
    
    let errorMessage = 'Email gönderilirken bir hata oluştu';
    
    if (error.code === 'auth/user-not-found') {
      errorMessage = 'Bu email adresi ile kayıtlı kullanıcı bulunamadı';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Geçersiz email adresi';
    } else if (error.code === 'auth/network-request-failed') {
      errorMessage = 'İnternet bağlantısı yok. Lütfen bağlantınızı kontrol edin.';
    } else {
      errorMessage = error.message || 'Email gönderilemedi. Lütfen tekrar deneyin.';
    }
    
    return { success: false, error: errorMessage };
  }
};

export const getCurrentUser = () => {
  return auth.currentUser;
};

export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

const saveUserSession = async (user) => {
  try {
    const sessionData = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || '',
      emailVerified: user.emailVerified
    };
    
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionData));
    await AsyncStorage.setItem(USER_ID_KEY, user.uid);
    
    console.log('✅ Session kaydedildi');
  } catch (error) {
    console.error('❌ Session kaydetme hatası:', error);
  }
};

const clearUserSession = async () => {
  try {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    await AsyncStorage.removeItem(USER_ID_KEY);
    console.log('✅ Session temizlendi');
  } catch (error) {
    console.error('❌ Session temizleme hatası:', error);
  }
};

export const checkSavedSession = async () => {
  try {
    const sessionData = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    if (sessionData) {
      const session = JSON.parse(sessionData);
      console.log('✅ Kaydedilmiş session bulundu:', session.uid);
      return session;
    }
    return null;
  } catch (error) {
    console.error('❌ Session kontrol hatası:', error);
    return null;
  }
};

export const getUserId = async () => {
  try {
    const currentUser = getCurrentUser();
    if (currentUser) {
      return currentUser.uid;
    }
    
    const userId = await AsyncStorage.getItem(USER_ID_KEY);
    if (userId) {
      return userId;
    }
    
    return null;
  } catch (error) {
    console.error('❌ User ID alma hatası:', error);
    return null;
  }
};

