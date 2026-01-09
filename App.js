import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import SymptomScreen from './src/screens/SymptomScreen';
import AnalysisResultScreen from './src/screens/AnalysisResultScreen';
import CameraScreen from './src/screens/CameraScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import MedicineScreen from './src/screens/MedicineScreen';
import RecommendationsScreen from './src/screens/RecommendationsScreen';
import BloodTestScreen from './src/screens/BloodTestScreen';

import { onAuthStateChange, getCurrentUser, checkSavedSession } from './src/services/authService';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('Home');
  const [screenData, setScreenData] = useState({});
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      if (firebaseUser) {
        console.log('✅ Kullanıcı giriş yaptı:', firebaseUser.uid);
        setUser(firebaseUser);
        
        try {
          const { scheduleAllMedicineReminders } = await import('./src/services/notificationService');
          await scheduleAllMedicineReminders(firebaseUser.uid);
        } catch (error) {
          console.error('❌ Bildirim geri yükleme hatası:', error);
        }
      } else {
        console.log('❌ Kullanıcı çıkış yaptı');
        setUser(null);
        setCurrentScreen('Login');
      }
      setLoading(false);
    });

    checkSavedSession().then((session) => {
      if (!session) {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLoginSuccess = (user) => {
    console.log('✅ Login başarılı, ana ekrana yönlendiriliyor...');
    setUser(user);
    setCurrentScreen('Home');
  };

  const navigateTo = (screenName, data = {}) => {
    setCurrentScreen(screenName);
    setScreenData(data);
  };

  const goBack = () => {
    const backStack = {
      'Symptom': 'Home',
      'AnalysisResult': 'Symptom', 
      'Camera': 'Home',
      'Medicine': 'Home',
      'Profile': 'Home',
      'Recommendations': 'Home',
      'BloodTest': 'Home'
    };
    
    if (backStack[currentScreen]) {
      setCurrentScreen(backStack[currentScreen]);
    } else {
      setCurrentScreen('Home');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!user && currentScreen !== 'Login') {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'Login':
        return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
      
      case 'Home':
        return <HomeScreen navigateTo={navigateTo} user={user} />;

      
      
      case 'Symptom':
        return <SymptomScreen navigateTo={navigateTo} goBack={goBack} user={user} />;

      case 'Profile':
         return <ProfileScreen navigateTo={navigateTo} goBack={goBack} user={user} />;
      
      case 'Camera':
        return <CameraScreen navigateTo={navigateTo} goBack={goBack} user={user} />;


      case 'Medicine':
        return <MedicineScreen navigateTo={navigateTo} goBack={goBack} user={user} />;

      case 'Recommendations':
        return <RecommendationsScreen navigateTo={navigateTo} goBack={goBack} user={user} />;
      
      case 'BloodTest':
        return <BloodTestScreen navigateTo={navigateTo} goBack={goBack} user={user} />;
      
      case 'AnalysisResult':
        return (
          <AnalysisResultScreen 
            navigateTo={navigateTo} 
            goBack={goBack} 
            results={screenData.results || []}
            analysisType={screenData.analysisType || 'Genel Analiz'}
            imageUri={screenData.imageUri || null}
          />
        );
      
      default:
        return <HomeScreen navigateTo={navigateTo} />;
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="auto" />
      {renderCurrentScreen()}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
});