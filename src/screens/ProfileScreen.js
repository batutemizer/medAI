import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  Alert,
  Switch,
  ActivityIndicator
} from 'react-native';
import { saveUserProfile, getUserProfile } from '../services/database';
import { getUserId, logoutUser } from '../services/authService';
import LoadingScreen from '../components/LoadingScreen';

const ProfileScreen = ({ navigateTo, goBack, user }) => {
  const [userProfile, setUserProfile] = useState({
    name: '',
    age: '',
    gender: '',
    bloodType: '',
    height: '',
    weight: '',
    
    allergies: '',
    chronicDiseases: '',
    currentMedications: '',
    surgeries: '',
    
    emergencyContact: '',
    emergencyPhone: '',
    
    notifications: true,
    dataSharing: false,
    
    profileCompletion: 0,
    lastUpdated: ''
  });

  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState(null);
  
  React.useEffect(() => {
    const fetchUserId = async () => {
      const id = user?.uid || await getUserId();
      setUserId(id);
    };
    fetchUserId();
  }, [user]);

  useEffect(() => {
    if (userId && user) {
      loadUserProfile();
    }
  }, [userId, user]);

  const loadUserProfile = async () => {
    setLoading(true);
    try {
      const profile = await getUserProfile(userId);
      if (profile) {
        const updatedProfile = {
          ...profile,
          name: profile.name || getUserDisplayName() || '',
        };
        setUserProfile(updatedProfile);
        console.log('Profil veritabanından yüklendi');
      } else {
        console.log('Profil bulunamadı, Firebase bilgileriyle yeni profil oluşturuluyor');
        const initialProfile = {
          ...userProfile,
          name: getUserDisplayName() || '',
        };
        setUserProfile(initialProfile);
      }
    } catch (error) {
      console.error('Profil yükleme hatası:', error);
      Alert.alert('Hata', 'Profil yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const getUserDisplayName = () => {
    if (!user) return '';
    
    if (user.displayName && user.displayName.trim()) {
      return user.displayName.trim();
    }
    
    if (user.email) {
      const emailName = user.email.split('@')[0];
      const nameParts = emailName.split('.');
      if (nameParts.length > 1) {
        return nameParts
          .map(part => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ');
      }
      return emailName.charAt(0).toUpperCase() + emailName.slice(1);
    }
    
    return '';
  };

  const calculateProfileCompletion = (profile) => {
    const fields = [
      'name', 'age', 'gender', 'bloodType', 'height', 'weight',
      'allergies', 'chronicDiseases', 'currentMedications', 'surgeries',
      'emergencyContact', 'emergencyPhone'
    ];
    
    const filledFields = fields.filter(field => 
      profile[field] && profile[field].toString().trim() !== ''
    ).length;
    
    return Math.round((filledFields / fields.length) * 100);
  };

  const saveProfile = async () => {
    let profileToSave = { ...userProfile };
    if (!profileToSave.name.trim()) {
      const autoName = getUserDisplayName();
      if (autoName) {
        profileToSave.name = autoName;
      } else {
        Alert.alert('Uyarı', 'Lütfen isminizi girin');
        return;
      }
    }

    setSaving(true);
    try {
      const completion = calculateProfileCompletion(profileToSave);
      const finalProfile = {
        ...profileToSave,
        profileCompletion: completion,
        lastUpdated: new Date().toISOString()
      };

      const success = await saveUserProfile(userId, finalProfile);
      
      if (success) {
        setUserProfile(finalProfile);
        Alert.alert('Başarılı', 'Profil bilgileriniz kaydedildi!');
        setEditing(false);
      } else {
        Alert.alert('Hata', 'Profil kaydedilemedi. Lütfen tekrar deneyin.');
      }
    } catch (error) {
      console.error('Profil kaydetme hatası:', error);
      Alert.alert('Hata', 'Profil kaydedilirken bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const calculateBMI = () => {
    if (userProfile.height && userProfile.weight) {
      const heightInMeters = parseFloat(userProfile.height) / 100;
      const weight = parseFloat(userProfile.weight);
      
      if (heightInMeters > 0 && weight > 0) {
        const bmi = (weight / (heightInMeters * heightInMeters)).toFixed(1);
        
        let category = '';
        if (bmi < 18.5) category = 'Zayıf';
        else if (bmi < 25) category = 'Normal';
        else if (bmi < 30) category = 'Fazla Kilolu';
        else category = 'Obez';
        
        return { bmi, category };
      }
    }
    return null;
  };

  const bmiData = calculateBMI();

  if (loading) {
    return (
      <LoadingScreen 
        message="Profil yükleniyor..." 
        showHeader={true}
        headerTitle="Sağlık Profili"
        onBack={goBack}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>Geri</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sağlık Profili</Text>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => setEditing(!editing)}
        >
          <Text style={styles.editButtonText}>
            {editing ? 'İptal' : 'Düzenle'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.completionSection}>
          <Text style={styles.completionTitle}>Profil Tamamlama</Text>
          <View style={styles.completionBar}>
            <View 
              style={[
                styles.completionProgress, 
                { width: `${userProfile.profileCompletion || 0}%` }
              ]} 
            />
          </View>
          <Text style={styles.completionText}>
            %{userProfile.profileCompletion || 0} tamamlandı
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kişisel Bilgiler</Text>
          
          <View style={styles.formRow}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Ad Soyad</Text>
              <TextInput
                style={styles.input}
                placeholder="Adınız ve soyadınız"
                value={userProfile.name}
                onChangeText={(text) => setUserProfile({...userProfile, name: text})}
                editable={editing}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Yaş</Text>
              <TextInput
                style={styles.input}
                placeholder="Yaşınız"
                value={userProfile.age}
                onChangeText={(text) => setUserProfile({...userProfile, age: text})}
                keyboardType="numeric"
                editable={editing}
              />
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Cinsiyet</Text>
              <TextInput
                style={styles.input}
                placeholder="Cinsiyetiniz"
                value={userProfile.gender}
                onChangeText={(text) => setUserProfile({...userProfile, gender: text})}
                editable={editing}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Kan Grubu</Text>
              <TextInput
                style={styles.input}
                placeholder="Kan grubunuz"
                value={userProfile.bloodType}
                onChangeText={(text) => setUserProfile({...userProfile, bloodType: text})}
                editable={editing}
              />
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Boy (cm)</Text>
              <TextInput
                style={styles.input}
                placeholder="Boyunuz"
                value={userProfile.height}
                onChangeText={(text) => setUserProfile({...userProfile, height: text})}
                keyboardType="numeric"
                editable={editing}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Kilo (kg)</Text>
              <TextInput
                style={styles.input}
                placeholder="Kilonuz"
                value={userProfile.weight}
                onChangeText={(text) => setUserProfile({...userProfile, weight: text})}
                keyboardType="numeric"
                editable={editing}
              />
            </View>
          </View>

          {bmiData && (
            <View style={styles.bmiContainer}>
              <Text style={styles.bmiTitle}>Vücut Kitle İndeksi (BMI)</Text>
              <View style={styles.bmiRow}>
                <Text style={styles.bmiValue}>{bmiData.bmi}</Text>
                <Text style={[styles.bmiCategory, 
                  bmiData.category === 'Normal' ? styles.bmiNormal :
                  bmiData.category === 'Fazla Kilolu' ? styles.bmiOverweight :
                  styles.bmiObese
                ]}>
                  {bmiData.category}
                </Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏥 Sağlık Bilgileri</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Alerjiler</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Alerjileriniz (örn: Penisilin, fındık...)"
              value={userProfile.allergies}
              onChangeText={(text) => setUserProfile({...userProfile, allergies: text})}
              multiline
              numberOfLines={3}
              editable={editing}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Kronik Hastalıklar</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Kronik hastalıklarınız (örn: Diyabet, hipertansiyon...)"
              value={userProfile.chronicDiseases}
              onChangeText={(text) => setUserProfile({...userProfile, chronicDiseases: text})}
              multiline
              numberOfLines={3}
              editable={editing}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Düzenli Kullandığı İlaçlar</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Düzenli kullandığınız ilaçlar"
              value={userProfile.currentMedications}
              onChangeText={(text) => setUserProfile({...userProfile, currentMedications: text})}
              multiline
              numberOfLines={3}
              editable={editing}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Geçirilmiş Ameliyatlar</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Geçirdiğiniz ameliyatlar"
              value={userProfile.surgeries}
              onChangeText={(text) => setUserProfile({...userProfile, surgeries: text})}
              multiline
              numberOfLines={3}
              editable={editing}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acil Durum İletişim</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Acil Durum Kişisi</Text>
            <TextInput
              style={styles.input}
              placeholder="Acil durumda aranacak kişi"
              value={userProfile.emergencyContact}
              onChangeText={(text) => setUserProfile({...userProfile, emergencyContact: text})}
              editable={editing}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Acil Durum Telefonu</Text>
            <TextInput
              style={styles.input}
              placeholder="Telefon numarası"
              value={userProfile.emergencyPhone}
              onChangeText={(text) => setUserProfile({...userProfile, emergencyPhone: text})}
              keyboardType="phone-pad"
              editable={editing}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ayarlar</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Bildirimler</Text>
              <Text style={styles.settingDesc}>İlaç hatırlatıcı ve sağlık önerileri</Text>
            </View>
            <Switch
              value={userProfile.notifications}
              onValueChange={async (value) => {
                const updatedProfile = {...userProfile, notifications: value};
                setUserProfile(updatedProfile);
                
                try {
                  const completion = calculateProfileCompletion(updatedProfile);
                  const finalProfile = {
                    ...updatedProfile,
                    profileCompletion: completion,
                    lastUpdated: new Date().toISOString()
                  };
                  await saveUserProfile(userId, finalProfile);
                  
                  if (value === false) {
                    const { cancelAllNotifications } = await import('../services/notificationService');
                    await cancelAllNotifications();
                  } else {
                    const { scheduleAllMedicineReminders } = await import('../services/notificationService');
                    await scheduleAllMedicineReminders(userId);
                  }
                } catch (error) {
                  console.error('Bildirim ayarı kaydetme hatası:', error);
                  setUserProfile(userProfile);
                  Alert.alert('Hata', 'Bildirim ayarı kaydedilemedi');
                }
              }}
              disabled={!editing}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Veri Paylaşımı</Text>
              <Text style={styles.settingDesc}>Anonim veri paylaşımı (AI geliştirme)</Text>
            </View>
            <Switch
              value={userProfile.dataSharing}
              onValueChange={async (value) => {
                const updatedProfile = {...userProfile, dataSharing: value};
                setUserProfile(updatedProfile);
                
                try {
                  const completion = calculateProfileCompletion(updatedProfile);
                  const finalProfile = {
                    ...updatedProfile,
                    profileCompletion: completion,
                    lastUpdated: new Date().toISOString()
                  };
                  await saveUserProfile(userId, finalProfile);
                  
                  if (value === true) {
                    const { collectAnonymousProfileData } = await import('../services/dataSharingService');
                    collectAnonymousProfileData(userId).catch(() => {
                    });
                  }
                } catch (error) {
                  console.error('Veri paylaşımı ayarı kaydetme hatası:', error);
                  setUserProfile(userProfile);
                  Alert.alert('Hata', 'Veri paylaşımı ayarı kaydedilemedi');
                }
              }}
              disabled={!editing}
            />
          </View>
        </View>

        {editing && (
          <TouchableOpacity 
            style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
            onPress={saveProfile}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.saveButtonText}>Profili Kaydet</Text>
            )}
          </TouchableOpacity>
        )}

        {userProfile.lastUpdated && (
          <View style={styles.updateSection}>
            <Text style={styles.updateText}>
              Son güncelleme: {new Date(userProfile.lastUpdated).toLocaleDateString('tr-TR')}
            </Text>
          </View>
        )}

        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={async () => {
            Alert.alert(
              'Çıkış Yap',
              'Hesabınızdan çıkmak istediğinize emin misiniz?',
              [
                { text: 'İptal', style: 'cancel' },
                {
                  text: 'Çıkış Yap',
                  style: 'destructive',
                  onPress: async () => {
                    const result = await logoutUser();
                    if (result.success) {
                    } else {
                      Alert.alert('Hata', result.error || 'Çıkış yapılamadı');
                    }
                  }
                }
              ]
            );
          }}
        >
          <Text style={styles.logoutButtonText}>Çıkış Yap</Text>
        </TouchableOpacity>
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
  editButton: {
    padding: 8,
    minWidth: 60,
  },
  editButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#7f8c8d',
  },
  completionSection: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  completionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  completionBar: {
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  completionProgress: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 4,
  },
  completionText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  inputContainer: {
    flex: 1,
    marginHorizontal: 5,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 6,
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
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  bmiContainer: {
    backgroundColor: '#e8f4f8',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  bmiTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  bmiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bmiValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3498db',
  },
  bmiCategory: {
    fontSize: 16,
    fontWeight: 'bold',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  bmiNormal: {
    backgroundColor: '#d5f4e6',
    color: '#27ae60',
  },
  bmiOverweight: {
    backgroundColor: '#fff3cd',
    color: '#f39c12',
  },
  bmiObese: {
    backgroundColor: '#fadbd8',
    color: '#e74c3c',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  settingDesc: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  saveButton: {
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  saveButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#dc2626',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  updateSection: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  updateText: {
    fontSize: 14,
    color: '#7f8c8d',
  },
});

export default ProfileScreen;