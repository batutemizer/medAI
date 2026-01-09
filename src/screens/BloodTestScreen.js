import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  FlatList
} from 'react-native';
import { getUserId } from '../services/authService';
import { 
  saveBloodTestResults, 
  getBloodTestResults, 
  deleteAllBloodTestResults 
} from '../services/database';
import { ruleBasedBloodAnalysis } from '../services/bloodRuleEngine';

import LoadingScreen from '../components/LoadingScreen';

const BloodTestScreen = ({ navigateTo, goBack, user }) => {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [userId, setUserId] = useState(null);
  const [previousTests, setPreviousTests] = useState([]);
  
  const [tarih, setTarih] = useState('');
  const [değerler, setDeğerler] = useState({
    Glukoz: '',
    Demir: '',
    Hemoglobin: '',
    Trombosit: '',
    BeyazKüre: '',
    Kreatinin: '',
    Kolesterol: ''
  });
  
  const [currentAnalysis, setCurrentAnalysis] = useState(null);

  useEffect(() => {
    const fetchUserId = async () => {
      const id = user?.uid || await getUserId();
      setUserId(id);
    };
    fetchUserId();
  }, [user]);

  useEffect(() => {
    if (userId) {
      loadPreviousTests();
    }
  }, [userId]);

  const loadPreviousTests = async () => {
    try {
      setLoadingData(true);
      const tests = await getBloodTestResults(userId);
      setPreviousTests(tests);
    } catch (error) {
      console.error('Tahlil yükleme hatası:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    if (!tarih) {
      setTarih(getTodayDate());
    }
  }, []);

  const handleValueChange = (key, value) => {
    setDeğerler(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const validateForm = () => {
    if (!tarih.trim()) {
      Alert.alert('Uyarı', 'Lütfen tahlil tarihini girin');
      return false;
    }

    const hasValue = Object.values(değerler).some(val => val.toString().trim() !== '');
    if (!hasValue) {
      Alert.alert('Uyarı', 'Lütfen en az bir tahlil değeri girin');
      return false;
    }

    return true;
  };

  const analyzeTest = async () => {
    if (loading) return;

  if (!validateForm()) return;

  if (!userId) {
    Alert.alert('Hata', 'Kullanıcı bilgisi bulunamadı');
    return;
  }

  setLoading(true);

  try {
    const numericDeğerler = {};
    Object.keys(değerler).forEach(key => {
      const value = değerler[key].toString().trim();
      if (value !== '') {
        const parsed = parseFloat(value.replace(',', '.'));
        if (!isNaN(parsed)) {
          numericDeğerler[key] = parsed;
}

      }
    });

    const currentTest = {
      tarih: tarih.trim(),
      değerler: numericDeğerler
    };

    // ✅ 1. SADECE AI ANALİZİ
    const analysis = ruleBasedBloodAnalysis(
  currentTest,
  previousTests
);


    // ✅ 2. SADECE BAŞARILIYSA DEVAM
    const testData = {
      ...currentTest,
      analiz: analysis.analiz,
      öneri: analysis.öneri
    };

    await saveBloodTestResults(userId, testData);

    setCurrentAnalysis({
      tarih: currentTest.tarih,
      analiz: analysis.analiz,
      öneri: analysis.öneri
    });

    setDeğerler({
      Glukoz: '',
      Demir: '',
      Hemoglobin: '',
      Trombosit: '',
      BeyazKüre: '',
      Kreatinin: '',
      Kolesterol: ''
    });

    await loadPreviousTests();

    Alert.alert('Başarılı', 'Tahlil analizi tamamlandı ve kaydedildi!');
  } catch (error) {
    console.error('❌ Analiz hatası:', error);

    Alert.alert(
      'Analiz yapılamadı',
      error.message || 'Lütfen daha sonra tekrar deneyin'
    );

    // ⛔ BURADA KAYIT YOK
    return;
  } finally {
    setLoading(false);
  }
};


  const handleDeleteAll = () => {
    Alert.alert(
      'Tüm Tahlilleri Sil',
      'Tüm kan tahlili sonuçlarını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              const count = await deleteAllBloodTestResults(userId);
              await loadPreviousTests();
              setCurrentAnalysis(null);
              Alert.alert('Başarılı', `${count} tahlil sonucu silindi`);
            } catch (error) {
              console.error('Silme hatası:', error);
              Alert.alert('Hata', 'Tahliller silinirken bir hata oluştu');
            }
          }
        }
      ]
    );
  };

  const renderTestItem = ({ item }) => (
    <View style={styles.testCard}>
      <View style={styles.testHeader}>
        <Text style={styles.testDate}>{item.tarih}</Text>
      </View>
      
      <View style={styles.testValues}>
        {Object.entries(item.değerler || {}).map(([key, value]) => (
          <View key={key} style={styles.valueRow}>
            <Text style={styles.valueLabel}>{key}:</Text>
            <Text style={styles.valueText}>{value}</Text>
          </View>
        ))}
      </View>

      {item.analiz && item.analiz.length > 0 && (
        <View style={styles.analysisSection}>
          <Text style={styles.analysisTitle}>Analiz:</Text>
          {item.analiz.map((line, index) => (
            <Text key={index} style={styles.analysisText}>• {line}</Text>
          ))}
        </View>
      )}

      {item.öneri && (
        <View style={styles.recommendationSection}>
          <Text style={styles.recommendationTitle}>Öneri:</Text>
          <Text style={styles.recommendationText}>{item.öneri}</Text>
        </View>
      )}
    </View>
  );

  if (loadingData) {
    return (
      <LoadingScreen 
        message="Tahliller yükleniyor..." 
        showHeader={true}
        headerTitle="Kan Tahlili Analizi"
        onBack={goBack}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>Geri</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kan Tahlili Analizi</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content}>
        {/* FORM */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Yeni Tahlil Sonucu Ekle</Text>

          {/* Tarih */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tarih (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              placeholder="2025-01-15"
              value={tarih}
              onChangeText={setTarih}
              editable={!loading}
            />
          </View>

          {/* Değerler */}
          <View style={styles.valuesSection}>
            <Text style={styles.sectionTitle}>Tahlil Değerleri</Text>
            
            {Object.keys(değerler).map((key) => (
              <View key={key} style={styles.inputGroup}>
                <Text style={styles.label}>{key}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={`${key} değeri`}
                  value={değerler[key]}
                  onChangeText={(value) => handleValueChange(key, value)}
                  keyboardType="numeric"
                  editable={!loading}
                />
              </View>
            ))}
          </View>

          {/* Analiz Butonu */}
          <TouchableOpacity
            style={[styles.analyzeButton, loading && styles.buttonDisabled]}
            onPress={analyzeTest}
            disabled={loading}
          >
            <Text style={styles.analyzeButtonText}>
              {loading ? 'Analiz Ediliyor...' : 'Analiz Et'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* MEVCUT ANALİZ SONUCU */}
        {currentAnalysis && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Analiz Sonucu ({currentAnalysis.tarih})</Text>
            
            <View style={styles.analysisSection}>
              <Text style={styles.analysisTitle}>Değerlendirme:</Text>
              {currentAnalysis.analiz.map((line, index) => (
                <Text key={index} style={styles.analysisText}>• {line}</Text>
              ))}
            </View>

            {currentAnalysis.öneri && (
              <View style={styles.recommendationSection}>
                <Text style={styles.recommendationTitle}>Öneri:</Text>
                <Text style={styles.recommendationText}>{currentAnalysis.öneri}</Text>
              </View>
            )}
          </View>
        )}

        {/* ÖNCEKİ TAHLİLLER */}
        {previousTests.length > 0 && (
          <View style={styles.historySection}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>
                Tahlil Geçmişi ({previousTests.length} kayıt)
              </Text>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDeleteAll}
              >
                <Text style={styles.deleteButtonText}>Tümünü Sil</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={previousTests}
              renderItem={renderTestItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* BOŞ DURUM */}
        {previousTests.length === 0 && !currentAnalysis && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🩸</Text>
            <Text style={styles.emptyText}>Henüz tahlil sonucu yok</Text>
            <Text style={styles.emptySubtext}>
              Yukarıdaki formu doldurarak ilk tahlil sonucunuzu ekleyin
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#1e293b',
    padding: 16,
    paddingTop: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
    minWidth: 50,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    fontSize: 15,
    color: '#1e293b',
  },
  valuesSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  analyzeButton: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#cbd5e1',
  },
  analyzeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  analysisSection: {
    marginBottom: 16,
  },
  analysisTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  analysisText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 4,
  },
  recommendationSection: {
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#2563eb',
  },
  recommendationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  recommendationText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  historySection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  deleteButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  testCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  testHeader: {
    marginBottom: 12,
  },
  testDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  testValues: {
    marginBottom: 12,
  },
  valueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  valueLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  valueText: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    marginTop: 20,
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
  },
});

export default BloodTestScreen;

