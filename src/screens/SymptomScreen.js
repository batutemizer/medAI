import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  ActivityIndicator,
  Alert 
} from 'react-native';
import { saveAnalysisHistory } from '../services/database';
import { analyzeSymptoms as analyzeSymptomsAI } from '../services/aiService';
import { getUserId } from '../services/authService';

const SymptomScreen = ({ navigateTo, goBack, user }) => {
  const [symptoms, setSymptoms] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  

  React.useEffect(() => {
    const fetchUserId = async () => {
      const id = user?.uid || await getUserId();
      setUserId(id);
    };
    fetchUserId();
  }, [user]);

  const analyzeSymptoms = async () => {
    if (!userId) {
      Alert.alert('Hata', 'Kullanıcı bilgisi bulunamadı. Lütfen tekrar giriş yapın.');
      return;
    }

    if (!symptoms.trim()) {
      Alert.alert('Uyarı', 'Lütfen semptomlarınızı yazın');
      return;
    }

    setLoading(true);

    try {
      
      const aiResults = await analyzeSymptomsAI(symptoms, user?.uid);
      
      
      try {
        await saveAnalysisHistory(userId, {
          type: 'symptom_analysis',
          symptoms: symptoms,
          results: aiResults,
          analysisType: 'Semptom Analizi'
        });
      } catch (dbError) {
       
        console.error('Firebase kayıt hatası (sessiz):', dbError);
      }
      
      
      navigateTo('AnalysisResult', {
        results: aiResults,
        analysisType: 'Semptom Analizi'
      });
      
    } catch (error) {
      
      console.error('Beklenmeyen hata (sessiz):', error);
      
     
      navigateTo('AnalysisResult', {
        results: [
          "Analiz yapılamadı",
          "Lütfen daha sonra tekrar deneyin",
          "Veya doktora başvurun"
        ],
        analysisType: 'Semptom Analizi'
      });
    } finally {
      setLoading(false);
    }
  };

  const quickSymptoms = ['Baş Ağrısı', 'Ateş', 'Öksürük', 'Mide Bulantısı', 'Halsizlik'];

  return (
    <ScrollView style={styles.container}>
      
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>Geri</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Semptom Analizi</Text>
        <View style={styles.backButton} />
      </View>

      <Text style={styles.subtitle}>Lütfen hissettiğiniz semptomları detaylıca yazın</Text>
      
      
      <View style={styles.quickContainer}>
        <Text style={styles.quickTitle}>Hızlı Seçim:</Text>
        <View style={styles.quickButtons}>
          {quickSymptoms.map((symptom) => (
            <TouchableOpacity
              key={symptom}
              style={styles.quickButton}
              onPress={() => setSymptoms(prev => prev ? `${prev}, ${symptom}` : symptom)}
            >
              <Text style={styles.quickButtonText}>{symptom}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      
      <TextInput
        style={styles.input}
        placeholder="Örnek: baş ağrısı, ateş, öksürük, mide bulantısı..."
        value={symptoms}
        onChangeText={setSymptoms}
        multiline
        numberOfLines={6}
        textAlignVertical="top"
      />
      
     
      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        onPress={analyzeSymptoms}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>Analiz Et</Text>
        )}
      </TouchableOpacity>

      {/* Bilgi Kutusu */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>Bilgi</Text>
        <Text style={styles.infoText}>
          AI semptom analizi tahmini teşhisler sunar. Kesin teşhis için doktora başvurun.
        </Text>
      </View>
    </ScrollView>
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
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
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
  title: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
  },
  subtitle: { 
    fontSize: 14, 
    textAlign: 'center', 
    color: '#64748b', 
    marginVertical: 20,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  quickContainer: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  quickTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    color: '#1e293b'
  },
  quickButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  quickButton: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    margin: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  quickButtonText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '500',
  },
  input: { 
    backgroundColor: '#ffffff', 
    marginHorizontal: 16,
    padding: 16, 
    borderRadius: 12, 
    marginBottom: 16,
    borderWidth: 1, 
    borderColor: '#e2e8f0',
    fontSize: 15,
    minHeight: 120,
    textAlignVertical: 'top',
    color: '#1e293b',
  },
  button: { 
    backgroundColor: '#2563eb', 
    marginHorizontal: 16,
    padding: 16, 
    borderRadius: 12, 
    marginBottom: 16,
    alignItems: 'center'
  },
  buttonDisabled: {
    backgroundColor: '#cbd5e1'
  },
  buttonText: { 
    color: '#ffffff', 
    fontSize: 16, 
    fontWeight: '600' 
  },
  infoBox: {
    backgroundColor: '#eff6ff',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dbeafe',
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1e293b'
  },
  infoText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
  }
});

export default SymptomScreen;