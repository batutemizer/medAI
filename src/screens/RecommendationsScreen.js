import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { generatePersonalizedRecommendations } from '../services/recommendationService';
import { getUserId } from '../services/authService';
import LoadingScreen from '../components/LoadingScreen';

const RecommendationsScreen = ({ navigateTo, goBack, user }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [userId, setUserId] = useState(null);
  
  React.useEffect(() => {
    const fetchUserId = async () => {
      const id = user?.uid || await getUserId();
      setUserId(id);
    };
    fetchUserId();
  }, [user]);

  useEffect(() => {
    if (userId) {
      loadRecommendations();
    }
  }, [userId]);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      const recs = await generatePersonalizedRecommendations(userId);
      setRecommendations(recs);
      
      try {
        const { getUserAnalysisHistory } = await import('../services/database');
        const { collectAnonymousTrendData } = await import('../services/dataSharingService');
        const analysisHistory = await getUserAnalysisHistory(userId);
        if (analysisHistory && analysisHistory.length > 0) {
          await collectAnonymousTrendData(userId, analysisHistory);
        }
      } catch (error) {
        console.error('Veri toplama hatası (sessiz):', error);
      }
    } catch (error) {
      console.error('Öneri yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRecommendations();
    setRefreshing(false);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return '#dc2626';
      case 'medium':
        return '#f59e0b';
      case 'low':
        return '#10b981';
      default:
        return '#64748b';
    }
  };

  const getPriorityText = (priority) => {
    switch (priority) {
      case 'high':
        return 'Yüksek';
      case 'medium':
        return 'Orta';
      case 'low':
        return 'Düşük';
      default:
        return 'Genel';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Sağlık':
        return '🏥';
      case 'İlaç':
        return '💊';
      case 'Yaşam Tarzı':
        return '🏃';
      case 'Güvenlik':
        return '⚠️';
      default:
        return '📋';
    }
  };

  const filteredRecommendations = recommendations.filter(rec => {
    const categoryMatch = selectedCategory === 'all' || rec.category === selectedCategory;
    const priorityMatch = selectedPriority === 'all' || rec.priority === selectedPriority;
    return categoryMatch && priorityMatch;
  });

  const categories = ['all', 'Sağlık', 'İlaç', 'Yaşam Tarzı', 'Güvenlik'];
  const priorities = ['all', 'high', 'medium', 'low'];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>Geri</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Sağlık Önerileri</Text>
          <View style={styles.betaBadge}>
            <Text style={styles.betaText}>BETA</Text>
          </View>
        </View>
        <View style={styles.backButton} />
      </View>

      {loading ? (
        <LoadingScreen 
          message="Öneriler analiz ediliyor..." 
          showHeader={true}
          headerTitle="Sağlık Önerileri"
          onBack={goBack}
        />
      ) : (
        <>
          <ScrollView
            style={styles.content}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
          <View style={styles.filtersContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterRow}>
                <Text style={styles.filterLabel}>Kategori:</Text>
                {categories.map(category => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.filterChip,
                      selectedCategory === category && styles.filterChipActive
                    ]}
                    onPress={() => setSelectedCategory(category)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selectedCategory === category && styles.filterChipTextActive
                      ]}
                    >
                      {category === 'all' ? 'Tümü' : category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.priorityFilter}>
              <View style={styles.filterRow}>
                <Text style={styles.filterLabel}>Öncelik:</Text>
                {priorities.map(priority => (
                  <TouchableOpacity
                    key={priority}
                    style={[
                      styles.filterChip,
                      selectedPriority === priority && styles.filterChipActive
                    ]}
                    onPress={() => setSelectedPriority(priority)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selectedPriority === priority && styles.filterChipTextActive
                      ]}
                    >
                      {priority === 'all' ? 'Tümü' : getPriorityText(priority)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {filteredRecommendations.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>Henüz öneri bulunmuyor</Text>
              <Text style={styles.emptySubtext}>
                Daha fazla veri toplandıkça kişiselleştirilmiş öneriler görünecek
              </Text>
            </View>
          ) : (
            <View style={styles.recommendationsList}>
              {filteredRecommendations.map((recommendation, index) => (
                <View key={recommendation.id || index} style={styles.recommendationCard}>
                  <View style={styles.recommendationHeader}>
                    <View style={styles.recommendationIconContainer}>
                      <Text style={styles.recommendationIcon}>
                        {recommendation.icon || getCategoryIcon(recommendation.category)}
                      </Text>
                    </View>
                    <View style={styles.recommendationHeaderText}>
                      <Text style={styles.recommendationTitle}>{recommendation.title}</Text>
                      <View style={styles.recommendationMeta}>
                        <Text style={styles.recommendationCategory}>{recommendation.category}</Text>
                        <View
                          style={[
                            styles.priorityBadge,
                            { backgroundColor: getPriorityColor(recommendation.priority) }
                          ]}
                        >
                          <Text style={styles.priorityBadgeText}>
                            {getPriorityText(recommendation.priority)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <Text style={styles.recommendationDescription}>
                    {recommendation.description}
                  </Text>

                  {recommendation.actionable && recommendation.actionText && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => {
                        if (recommendation.type === 'medicine_reminder') {
                          navigateTo('Medicine');
                        } else if (recommendation.type === 'doctor_visit') {
                          navigateTo('Profile');
                        } else if (recommendation.type === 'lifestyle') {
                          navigateTo('Profile');
                        } else {
                          navigateTo('Home');
                        }
                      }}
                    >
                      <Text style={styles.actionButtonText}>{recommendation.actionText}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* BETA BİLGİ */}
          <View style={styles.betaInfo}>
            <Text style={styles.betaInfoText}>
              Bu özellik beta aşamasındadır. Öneriler AI ve veri analizi ile oluşturulmaktadır.
            </Text>
          </View>
        </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#1e293b',
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  backButton: {
    padding: 8,
    minWidth: 60,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  betaBadge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  betaText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  filtersContainer: {
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginRight: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  priorityFilter: {
    marginTop: 8,
  },
  recommendationsList: {
    padding: 16,
    gap: 12,
  },
  recommendationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  recommendationHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  recommendationIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recommendationIcon: {
    fontSize: 24,
  },
  recommendationHeaderText: {
    flex: 1,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  recommendationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recommendationCategory: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  recommendationDescription: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 12,
  },
  actionButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 300,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  betaInfo: {
    backgroundColor: '#fef3c7',
    margin: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  betaInfoText: {
    fontSize: 12,
    color: '#92400e',
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default RecommendationsScreen;

