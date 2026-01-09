import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { saveAnalysisHistory } from '../services/database';
import { analyzeImage as analyzeImageAI } from '../services/aiService';
import { getUserId } from '../services/authService';

/* =========================
   🔐 BILLING / PRO FLAG
   Billing açınca SADECE bunu true yap
========================= */
const HAS_VISION_BILLING = false;

const CameraScreen = ({ navigateTo, goBack, user }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const fetchUserId = async () => {
      const id = user?.uid || await getUserId();
      setUserId(id);
    };
    fetchUserId();
  }, [user]);

  /* =========================
     📷 IMAGE PICKERS
  ========================= */
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Hata', 'Galeriden fotoğraf seçilemedi');
    }
  };

  const takePicture = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Kamera İzni Gerekli',
          'Fotoğraf çekmek için kamera izni gerekli'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Hata', 'Kamera açılamadı');
    }
  };

  /* =========================
     🤖 ANALYZE IMAGE
  ========================= */
  const analyzeImage = async () => {
    // 🔐 PRO KONTROLÜ
    if (!HAS_VISION_BILLING) {
      Alert.alert(
        'Pro Özellik 🔒',
        'Görsel analiz Pro özelliktir.\nDevam etmek için Pro’ya yükseltin.',
        [
          { text: 'Vazgeç', style: 'cancel' },
          { text: 'Pro’ya Yükselt', onPress: () => navigateTo('Upgrade') }
        ]
      );
      return;
    }

    if (!userId) {
      Alert.alert('Hata', 'Kullanıcı bilgisi bulunamadı');
      return;
    }

    if (!selectedImage) {
      Alert.alert('Uyarı', 'Önce bir fotoğraf seçin');
      return;
    }

    setAnalyzing(true);

    try {
      const aiResults = await analyzeImageAI(selectedImage);

      // ❗ FALLBACK TESPİTİ
      const isFallback =
        !Array.isArray(aiResults) ||
        aiResults.includes('Günlük kullanım limiti doldu') ||
        aiResults.includes('Analiz yapılamadı') ||
        aiResults.includes('İnternet bağlantısı yok');

      // ✅ SADECE GERÇEK SONUÇSA KAYDET
      if (!isFallback) {
        try {
          await saveAnalysisHistory(userId, {
            type: 'image_analysis',
            imageUri: selectedImage,
            results: aiResults,
            analysisType: 'Görsel Analiz',
            symptoms: 'Görsel analiz'
          });
        } catch (dbError) {
          console.error('Firebase kayıt hatası (sessiz):', dbError);
        }
      }

      navigateTo('AnalysisResult', {
        results: aiResults,
        analysisType: 'Görsel Analiz',
        imageUri: selectedImage
      });

    } catch {
      navigateTo('AnalysisResult', {
        results: [
          'Görsel analiz yapılamadı',
          'Lütfen daha sonra tekrar deneyin',
          'Veya doktora başvurun'
        ],
        analysisType: 'Görsel Analiz',
        imageUri: selectedImage
      });
    } finally {
      setAnalyzing(false);
    }
  };

  /* =========================
     🖼️ UI
  ========================= */
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack}>
          <Text style={styles.backButtonText}>Geri</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Görsel Analiz</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {!selectedImage ? (
          <View style={styles.uploadSection}>
            <Text style={styles.uploadTitle}>Fotoğraf Yükle</Text>
            <Text style={styles.uploadDesc}>
              Analiz için bir fotoğraf seçin veya çekin
            </Text>

            <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
              <Text style={styles.uploadButtonText}>Galeriden Seç</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cameraButton} onPress={takePicture}>
              <Text style={styles.cameraButtonText}>Kamera ile Çek</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.previewContainer}>
            <Image source={{ uri: selectedImage }} style={styles.previewImage} />

            <View style={styles.previewControls}>
              <TouchableOpacity
                style={[styles.previewButton, styles.retakeButton]}
                onPress={() => setSelectedImage(null)}
                disabled={analyzing}
              >
                <Text style={styles.previewButtonText}>Farklı Seç</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.previewButton,
                  styles.analyzeButton,
                  (!HAS_VISION_BILLING || analyzing) && styles.analyzeButtonDisabled
                ]}
                onPress={analyzeImage}
                disabled={!HAS_VISION_BILLING || analyzing}
              >
                {analyzing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.previewButtonText}>
                    {HAS_VISION_BILLING ? 'Analiz Et' : 'Pro’ya Yükselt'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

/* =========================
   🎨 STYLES
========================= */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    backgroundColor: '#1e293b',
    padding: 16,
    paddingTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  backButtonText: { color: '#fff', fontSize: 15 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },
  content: { flex: 1, justifyContent: 'center', padding: 20 },
  uploadSection: {
    backgroundColor: '#fff',
    padding: 32,
    borderRadius: 12
  },
  uploadTitle: { fontSize: 20, fontWeight: '600' },
  uploadDesc: { color: '#64748b', marginVertical: 16 },
  uploadButton: {
    backgroundColor: '#2563eb',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10
  },
  uploadButtonText: { color: '#fff', textAlign: 'center' },
  cameraButton: {
    backgroundColor: '#10b981',
    padding: 14,
    borderRadius: 12
  },
  cameraButtonText: { color: '#fff', textAlign: 'center' },
  previewContainer: { flex: 1 },
  previewImage: { height: 400, borderRadius: 12 },
  previewControls: { flexDirection: 'row', marginTop: 16, gap: 12 },
  previewButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center'
  },
  retakeButton: { backgroundColor: '#ef4444' },
  analyzeButton: { backgroundColor: '#10b981' },
  analyzeButtonDisabled: { backgroundColor: '#cbd5e1' },
  previewButtonText: { color: '#fff', fontWeight: '600' }
});

export default CameraScreen;
