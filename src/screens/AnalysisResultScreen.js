import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image } from 'react-native';

const AnalysisResultScreen = ({ navigateTo, goBack, results, analysisType, imageUri }) => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>Geri</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analiz Sonuçları</Text>
        <View style={styles.backButton} />
      </View>

      <Text style={styles.headerSubtitle}>{analysisType}</Text>

      {imageUri && (
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUri }} style={styles.analysisImage} />
          <Text style={styles.imageCaption}>Analiz Edilen Görsel</Text>
        </View>
      )}

      <View style={styles.resultsCard}>
        <Text style={styles.resultsTitle}>AI Analiz Sonuçları:</Text>
        
        <View style={styles.resultsList}>
          {results.map((result, index) => (
            <View key={index} style={styles.resultItem}>
              <Text style={styles.resultBullet}>•</Text>
              <Text style={styles.resultText}>{result}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={() => navigateTo('Home')}
        >
          <Text style={styles.primaryButtonText}>Ana Sayfaya Dön</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.secondaryButton}
          onPress={goBack}
        >
          <Text style={styles.secondaryButtonText}>
            Yeni Analiz
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.warningCard}>
        <Text style={styles.warningTitle}>ÖNEMLİ UYARI</Text>
        <Text style={styles.warningText}>
          Bu analiz yapay zeka tarafından gerçekleştirilmiştir ve kesin teşhis değildir. 
          Lütfen sağlık sorunlarınız için mutlaka doktora başvurun.
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginVertical: 16,
    paddingHorizontal: 20,
  },
  imageContainer: {
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  analysisImage: {
    width: '100%',
    height: 250,
    borderRadius: 8,
  },
  imageCaption: {
    textAlign: 'center',
    marginTop: 12,
    color: '#64748b',
    fontSize: 12,
    fontWeight: '500',
  },
  resultsCard: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  resultsList: {
    marginLeft: 4,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  resultBullet: {
    fontSize: 14,
    color: '#2563eb',
    marginRight: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  resultText: {
    fontSize: 14,
    color: '#475569',
    flex: 1,
    lineHeight: 22,
  },
  actionsContainer: {
    padding: 16,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#64748b',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '500',
  },
  warningCard: {
    backgroundColor: '#fef3c7',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
    marginBottom: 20,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 13,
    color: '#92400e',
    lineHeight: 20,
  },
});

export default AnalysisResultScreen;