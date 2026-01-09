import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Alert, 
  ImageBackground,
  ActivityIndicator,
  Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getUserStats, clearAllTodayData, getBloodTestResults } from '../services/database';
import LoadingScreen from '../components/LoadingScreen';

const HomeScreen = ({ navigateTo, user }) => {
  const [userStats, setUserStats] = useState({
    profileCompletion: 0,
    medicineCount: 0,
    takenMedicines: 0,
    analysisCount: 0,
    totalStats: 0
  });
  const [loading, setLoading] = useState(true);
  const [previousTests, setPreviousTests] = useState([]);
  const userId = user?.uid || null;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (userId) {
      loadUserStats();
    }
  }, [userId]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const loadUserStats = async () => {
    try {
      const stats = await getUserStats(userId);
      setUserStats(stats);
      
      const tests = await getBloodTestResults(userId);
      setPreviousTests(tests);
    } catch (error) {
      console.error('İstatistik yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigation = (screen) => {
    navigateTo(screen);
    setTimeout(() => {
      loadUserStats();
    }, 1000);
  };

  const handleClearTodayData = () => {
    Alert.alert(
      'Günlük Verileri Temizle',
      'Bugünün tüm analizleri, görsel analizleri ve ilaç alım geçmişi silinecek. İlaç durumları sıfırlanacak. Devam etmek istiyor musunuz?',
      [
        {
          text: 'İptal',
          style: 'cancel'
        },
        {
          text: 'Temizle',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await clearAllTodayData(userId);
              Alert.alert(
                'Temizleme Tamamlandı',
                `${result.analysisCount} analiz, ${result.historyCount} ilaç kaydı temizlendi. ${result.medicineCount} ilaç durumu sıfırlandı.`,
                [{ text: 'Tamam' }]
              );
              loadUserStats();
            } catch (error) {
              Alert.alert('Hata', 'Veriler temizlenirken bir hata oluştu.');
            }
          }
        }
      ]
    );
  };

  const features = [
    {
      id: 'Symptom',
      title: 'Semptom Analizi',
      description: 'AI ile semptomlarınızı analiz edin',
      stat: userStats.analysisCount > 0 ? `${userStats.analysisCount} analiz` : 'Henüz analiz yok',
      color: '#3b82f6'
    },
    {
      id: 'Camera',
      title: 'Görsel Analiz',
      description: 'Fotoğraf ile teşhis desteği',
      stat: userStats.analysisCount > 0 ? `${userStats.analysisCount} görsel` : 'Henüz analiz yok',
      color: '#f59e0b'
    },
    {
      id: 'Medicine',
      title: 'İlaç Takibi',
      description: 'İlaçlarınızı yönetin ve takip edin',
      stat: userStats.medicineCount > 0 
        ? `${userStats.takenMedicines}/${userStats.medicineCount} alındı` 
        : 'Henüz ilaç yok',
      color: '#10b981'
    },
    {
      id: 'Recommendations',
      title: 'Sağlık Önerileri',
      description: 'Kişiselleştirilmiş sağlık önerileri',
      stat: 'AI destekli analiz',
      color: '#8b5cf6',
      badge: 'BETA'
    },
    {
      id: 'Profile',
      title: 'Sağlık Profili',
      description: 'Sağlık geçmişiniz ve bilgileriniz',
      stat: `%${userStats.profileCompletion} tamamlandı`,
      color: '#ec4899'
    },
    {
      id: 'BloodTest',
      title: 'Kan Tahlili Analizi',
      description: 'Kan tahlili sonuçlarınızı analiz edin',
      stat: previousTests.length > 0 ? `${previousTests.length} tahlil` : 'Henüz tahlil yok',
      color: '#dc2626'
    }
  ];

  if (loading) {
    return <LoadingScreen message="Veriler yükleniyor..." />;
  }

  return (
    <View style={styles.container}>
      <ImageBackground 
        source={require("../assets/unnamed.jpg")} 
        style={styles.background}
        resizeMode="cover"
      >
        <View style={styles.overlay} />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
              <View style={styles.header}>
                <Text style={styles.greeting}>Hoş geldiniz</Text>
                <Text style={styles.title}>MedAI</Text>
                <Text style={styles.subtitle}>Sağlık yolculuğunuzu başlatın</Text>
              </View>

              <View style={styles.quickStats}>
                <View style={styles.quickStatItem}>
                  <Text style={styles.quickStatNumber}>{userStats.analysisCount}</Text>
                  <Text style={styles.quickStatLabel}>Analiz</Text>
                </View>
                <View style={styles.quickStatDivider} />
                <View style={styles.quickStatItem}>
                  <Text style={styles.quickStatNumber}>{userStats.medicineCount}</Text>
                  <Text style={styles.quickStatLabel}>İlaç</Text>
                </View>
                <View style={styles.quickStatDivider} />
                <View style={styles.quickStatItem}>
                  <Text style={styles.quickStatNumber}>{userStats.takenMedicines}</Text>
                  <Text style={styles.quickStatLabel}>Alınan</Text>
                </View>
                <View style={styles.quickStatDivider} />
                <View style={styles.quickStatItem}>
                  <Text style={styles.quickStatNumber}>%{userStats.profileCompletion}</Text>
                  <Text style={styles.quickStatLabel}>Profil</Text>
                </View>
              </View>

              <View style={styles.cardsContainer}>
                {features.map((feature, index) => (
                  <TouchableOpacity
                    key={feature.id}
                    style={styles.card}
                    onPress={() => handleNavigation(feature.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.cardContent}>
                      <View style={styles.cardHeader}>
                        <View style={[styles.cardIcon, { backgroundColor: `${feature.color}15` }]}>
                          <View style={[styles.cardIconDot, { backgroundColor: feature.color }]} />
                        </View>
                        <View style={styles.cardTextContainer}>
                          <View style={styles.cardTitleRow}>
                            <Text style={styles.cardTitle}>{feature.title}</Text>
                            {feature.badge && (
                              <View style={styles.badge}>
                                <Text style={styles.badgeText}>{feature.badge}</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.cardDescription}>{feature.description}</Text>
                        </View>
                      </View>
                      <View style={styles.cardFooter}>
                        <Text style={[styles.cardStat, { color: feature.color }]}>
                          {feature.stat}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.progressCard}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressTitle}>Aktivite Durumu</Text>
                  <Text style={styles.progressValue}>{userStats.totalStats} / 10</Text>
                </View>
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill,
                        { 
                          width: `${Math.min((userStats.totalStats / 10) * 100, 100)}%`,
                          backgroundColor: userStats.totalStats >= 5 ? '#10b981' : '#3b82f6'
                        }
                      ]} 
                    />
                  </View>
                </View>
                <Text style={styles.progressHint}>
                  {userStats.totalStats >= 10 
                    ? 'Mükemmel! Tüm aktiviteleri tamamladınız' 
                    : `${10 - userStats.totalStats} aktivite daha tamamlayın`}
                </Text>
              </View>

              <TouchableOpacity 
                style={styles.clearButton}
                onPress={handleClearTodayData}
                activeOpacity={0.7}
              >
                <Text style={styles.clearButtonText}>Günlük Verileri Temizle</Text>
                <Text style={styles.clearButtonSubtext}>
                  Bugünün analizleri ve ilaç kayıtlarını sil
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    marginBottom: 4,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -1,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '400',
  },
  quickStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: 16,
    paddingVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  quickStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatDivider: {
    width: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 4,
  },
  quickStatNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  quickStatLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  cardsContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  cardContent: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardIconDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginRight: 8,
  },
  badge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  cardDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  cardFooter: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  cardStat: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  progressValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  progressBarContainer: {
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressHint: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '400',
  },
  clearButton: {
    backgroundColor: '#fef2f2',
    marginHorizontal: 24,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: 4,
  },
  clearButtonSubtext: {
    fontSize: 13,
    color: '#991b1b',
    fontWeight: '400',
  },
});

export default HomeScreen;
