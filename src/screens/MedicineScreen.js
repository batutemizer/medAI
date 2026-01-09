import React, { useState, useEffect } from 'react';
import { 
  scheduleMedicineNotification, 
  cancelMedicineNotification,
  requestNotificationPermission,
  getAllScheduledNotifications
} from '../services/notificationService';
import CustomTimePicker from '../components/CustomTimePicker';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  Alert,
  FlatList,
  Switch,
  Modal
} from 'react-native';
import { saveUserMedicines, getUserMedicines, saveMedicineReminders, getMedicineReminders, saveMedicineHistory } from '../services/database';
import { getUserId } from '../services/authService';
import LoadingScreen from '../components/LoadingScreen';

const MedicineScreen = ({ navigateTo, goBack, user }) => {
  const [medicines, setMedicines] = useState([]);
  const [medicineName, setMedicineName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');
  const [reminderTimes, setReminderTimes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [firebaseStatus, setFirebaseStatus] = useState('checking');
  const [userId, setUserId] = useState(null);
  
  React.useEffect(() => {
    const fetchUserId = async () => {
      const id = user?.uid || await getUserId();
      setUserId(id);
    };
    fetchUserId();
  }, [user]);
  
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [selectedMedicineTime, setSelectedMedicineTime] = useState(new Date());

  useEffect(() => {
    if (userId) {
      loadUserData();
      restoreNotifications();
    }
    requestNotificationPermission();
  }, [userId]);
  
  const restoreNotifications = async () => {
    try {
      const { scheduleAllMedicineReminders } = await import('../services/notificationService');
      await scheduleAllMedicineReminders(userId);
    } catch (error) {
      console.error('❌ Bildirim geri yükleme hatası:', error);
    }
  };

  const loadUserData = async () => {
    setLoading(true);
    try {
      const userMedicines = await getUserMedicines(userId);
      setMedicines(userMedicines);
      
      const userReminders = await getMedicineReminders(userId);
      setReminderTimes(userReminders);
      
      setFirebaseStatus('connected');
      console.log('✅ Veriler Firebase\'den yüklendi');
    } catch (error) {
      setFirebaseStatus('disconnected');
      console.log('📱 Demo mod: Veriler yükleniyor');
      setMedicines([]);
      setReminderTimes([]);
    } finally {
      setLoading(false);
    }
  };

  const addReminderToMedicine = async (medicineId, time) => {
    const timeString = time.toTimeString().substring(0, 5); // HH:MM formatı
    
    const newReminder = {
      id: `reminder-${Date.now()}`,
      time: timeString,
      enabled: true,
      medicineId: medicineId
    };

    const updatedReminders = [...reminderTimes, newReminder];
    setReminderTimes(updatedReminders);

    const updatedMedicines = medicines.map(med => 
      med.id === medicineId 
        ? { ...med, reminders: [...(med.reminders || []), newReminder] }
        : med
    );
    setMedicines(updatedMedicines);

    if (firebaseStatus === 'connected') {
      await saveMedicineReminders(userId, updatedReminders);
      await saveUserMedicines(userId, updatedMedicines);
    }

    const medicine = updatedMedicines.find(med => med.id === medicineId);
    if (medicine) {
      try {
        const success = await scheduleMedicineNotification(
          newReminder.id,
          medicine.name,
          medicine.dosage,
          timeString,
          userId
        );
        
        if (success) {
          console.log(`✅ Bildirim başarıyla ayarlandı: ${medicine.name} - ${timeString}`);
          
          const scheduledNotifications = await getAllScheduledNotifications();
          const ourNotification = scheduledNotifications.find(n => n.identifier === newReminder.id);
          
          if (ourNotification) {
            const now = new Date();
            const [targetHours, targetMinutes] = timeString.split(':').map(Number);
            const targetTime = new Date();
            targetTime.setHours(targetHours, targetMinutes, 0, 0);
            const isPast = targetTime < now;
            
            const message = isPast 
              ? `Bildirim ayarlandı: ${timeString}\n${medicine.name}\n\nNot: Saat geçti, yarın gelecek.`
              : `Bildirim ayarlandı: ${timeString}\n${medicine.name}\n\nBugün ${timeString} saatinde gelecek.`;
            
            Alert.alert('Başarılı', message);
          } else {
            Alert.alert('Başarılı', `Bildirim kaydedildi: ${timeString}\n${medicine.name}`);
          }
        } else {
          Alert.alert('Uyarı', 'Bildirim ayarlanırken bir hata oluştu, ancak ilaç kaydedildi.');
        }
      } catch (error) {
        console.error('❌ Bildirim ayarlama hatası:', error);
        Alert.alert('Uyarı', 'Bildirim ayarlanırken bir hata oluştu, ancak ilaç kaydedildi.');
      }
    }

    setShowReminderModal(false);
    setSelectedMedicine(null);
    
    const defaultTime = new Date();
    defaultTime.setHours(9, 0, 0, 0);
    setSelectedMedicineTime(defaultTime);
  };

  const addMedicine = async () => {
    if (!medicineName.trim() || !dosage.trim() || !frequency.trim()) {
      Alert.alert('Uyarı', 'Lütfen tüm alanları doldurun');
      return;
    }

    setSaving(true);

    const newMedicine = {
      id: Date.now().toString(),
      name: medicineName,
      dosage: dosage,
      frequency: frequency,
      taken: false,
      reminders: [],
      addedDate: new Date().toLocaleDateString('tr-TR'),
      addedDateTime: new Date().toISOString()
    };

    const updatedMedicines = [...medicines, newMedicine];
    setMedicines(updatedMedicines);
    
    try {
      const success = await saveUserMedicines(userId, updatedMedicines);
      if (success) {
        Alert.alert('Başarılı', 'İlaç listenize eklendi!');
        setMedicineName('');
        setDosage('');
        setFrequency('');
        
        
        const defaultTime = new Date();
        defaultTime.setHours(9, 0, 0, 0);
        setSelectedMedicine(newMedicine);
        setSelectedMedicineTime(defaultTime);
        setShowReminderModal(true);
      } else {
        Alert.alert('Hata', 'İlaç eklenemedi. Lütfen tekrar deneyin.');
      }
    } catch (error) {
      console.error('İlaç ekleme hatası:', error);
      Alert.alert('Hata', 'İlaç eklenirken bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const toggleReminder = async (reminderId) => {
    const updatedReminders = reminderTimes.map(reminder =>
      reminder.id === reminderId 
        ? { ...reminder, enabled: !reminder.enabled }
        : reminder
    );
    setReminderTimes(updatedReminders);

    const reminder = reminderTimes.find(r => r.id === reminderId);
    const medicine = medicines.find(med => med.id === reminder.medicineId);
    
    try {
      if (reminder.enabled) {
        await cancelMedicineNotification(reminderId);
        console.log('🔕 Bildirim kapatıldı');
      } else {
        await scheduleMedicineNotification(
          reminderId,
          medicine.name,
          medicine.dosage,
          reminder.time,
          userId
        );
        console.log('🔔 Bildirim açıldı');
      }
    } catch (error) {
      console.error('Bildirim değiştirme hatası:', error);
      Alert.alert('Hata', 'Bildirim durumu değiştirilirken bir hata oluştu');
    }

    if (firebaseStatus === 'connected') {
      await saveMedicineReminders(userId, updatedReminders);
    }
  };

  const deleteReminder = async (reminderId) => {
    const updatedReminders = reminderTimes.filter(reminder => reminder.id !== reminderId);
    setReminderTimes(updatedReminders);

    const updatedMedicines = medicines.map(med => ({
      ...med,
      reminders: (med.reminders || []).filter(rem => rem.id !== reminderId)
    }));
    setMedicines(updatedMedicines);

    try {
      await cancelMedicineNotification(reminderId);
    } catch (error) {
      console.error('Bildirim iptal hatası:', error);
    }

    if (firebaseStatus === 'connected') {
      await saveMedicineReminders(userId, updatedReminders);
      await saveUserMedicines(userId, updatedMedicines);
    }
  };

  const toggleTaken = async (id) => {
    const updatedMedicines = medicines.map(med => 
      med.id === id ? { ...med, taken: !med.taken } : med
    );
    setMedicines(updatedMedicines);
    
    if (firebaseStatus === 'connected') {
      const medicine = medicines.find(med => med.id === id);
      await saveMedicineHistory(userId, id, {
        medicineName: medicine.name,
        dosage: medicine.dosage,
        taken: !medicine.taken,
        takenTime: new Date().toISOString()
      });
      
      await saveUserMedicines(userId, updatedMedicines);
    }
  };

  const deleteMedicine = async (id) => {
    Alert.alert(
      "İlacı Sil",
      "Bu ilacı ve bildirimlerini listeden silmek istediğinizden emin misiniz?",
      [
        { text: "İptal", style: "cancel" },
        { 
          text: "Sil", 
          style: "destructive",
          onPress: async () => {
            const medicineReminders = reminderTimes.filter(reminder => reminder.medicineId === id);
            for (const reminder of medicineReminders) {
              try {
                await cancelMedicineNotification(reminder.id);
              } catch (error) {
                console.error('Bildirim iptal hatası:', error);
              }
            }

            const updatedMedicines = medicines.filter(med => med.id !== id);
            setMedicines(updatedMedicines);
            
            const updatedReminders = reminderTimes.filter(reminder => reminder.medicineId !== id);
            setReminderTimes(updatedReminders);
            
            if (firebaseStatus === 'connected') {
              await saveUserMedicines(userId, updatedMedicines);
              await saveMedicineReminders(userId, updatedReminders);
            }
          }
        }
      ]
    );
  };

  const formatTime = (timeString) => {
    const [hours, minutes] = timeString.split(':');
    return `${hours}:${minutes}`;
  };

  const getMedicineRemindersCount = (medicineId) => {
    return reminderTimes.filter(reminder => 
      reminder.medicineId === medicineId && reminder.enabled
    ).length;
  };

  const renderMedicineItem = ({ item }) => (
    <View style={[styles.medicineItem, item.taken && styles.medicineItemTaken]}>
      <View style={styles.medicineInfo}>
        <Text style={[styles.medicineName, item.taken && styles.medicineNameTaken]}>
          {item.name}
        </Text>
        <Text style={styles.medicineDetails}>
          Doz: {item.dosage} • Sıklık: {item.frequency}
        </Text>
        <Text style={styles.medicineDate}>{item.addedDate}</Text>
        
        {/* Bildirimler */}
        {getMedicineRemindersCount(item.id) > 0 && (
          <View style={styles.remindersContainer}>
            <Text style={styles.remindersText}>
              {getMedicineRemindersCount(item.id)} aktif bildirim
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.medicineActions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.reminderButton]}
          onPress={() => {
            const defaultTime = new Date();
            defaultTime.setHours(9, 0, 0, 0);
            setSelectedMedicine(item);
            setSelectedMedicineTime(defaultTime);
            setShowReminderModal(true);
          }}
        >
          <Text style={styles.actionButtonText}>Bildirim</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, item.taken ? styles.untakeButton : styles.takeButton]}
          onPress={() => toggleTaken(item.id)}
        >
          <Text style={styles.actionButtonText}>
            {item.taken ? '↶ Geri Al' : '✓ Alındı'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => deleteMedicine(item.id)}
        >
          <Text style={styles.actionButtonText}>Sil</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderReminderItem = ({ item }) => (
    <View style={styles.reminderItem}>
      <View style={styles.reminderInfo}>
        <Text style={styles.reminderTime}>{formatTime(item.time)}</Text>
        <Text style={styles.reminderMedicine}>
          {medicines.find(med => med.id === item.medicineId)?.name}
        </Text>
        <Text style={[
          styles.reminderStatus,
          item.enabled ? styles.reminderActive : styles.reminderInactive
        ]}>
          {item.enabled ? 'Aktif' : 'Kapalı'}
        </Text>
      </View>
      
      <View style={styles.reminderActions}>
        <Switch
          value={item.enabled}
          onValueChange={() => toggleReminder(item.id)}
        />
        <TouchableOpacity 
          style={styles.deleteReminderButton}
          onPress={() => deleteReminder(item.id)}
        >
          <Text style={styles.deleteReminderText}>Sil</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <LoadingScreen 
        message="İlaçlar yükleniyor..." 
        showHeader={true}
        headerTitle="İlaç Takibi"
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
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>İlaç Takibi</Text>
        </View>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content}>
        {/* İLAÇ EKLEME FORMU */}
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Yeni İlaç Ekle</Text>
          
          <TextInput
            style={styles.input}
            placeholder="İlaç Adı (örn: Parol)"
            value={medicineName}
            onChangeText={setMedicineName}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Doz (örn: 500mg)"
            value={dosage}
            onChangeText={setDosage}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Sıklık (örn: Günde 3 kez)"
            value={frequency}
            onChangeText={setFrequency}
          />
          
          <TouchableOpacity 
            style={[styles.addButton, saving && styles.addButtonDisabled]} 
            onPress={addMedicine}
            disabled={saving}
          >
            <Text style={styles.addButtonText}>
              {saving ? 'Ekleniyor...' : 'İlacı Ekle'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* AKTİF BİLDİRİMLER */}
        {reminderTimes.length > 0 && (
          <View style={styles.remindersSection}>
            <Text style={styles.sectionTitle}>Aktif Bildirimler</Text>
            <FlatList
              data={reminderTimes.filter(reminder => reminder.enabled)}
              renderItem={renderReminderItem}
              keyExtractor={item => item.id}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* İLAÇ LİSTESİ */}
        <View style={styles.listContainer}>
          <Text style={styles.listTitle}>
            İlaç Listem ({medicines.length} ilaç)
          </Text>
          
          {medicines.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Henüz ilaç eklemediniz</Text>
              <Text style={styles.emptyStateSubtext}>
                Yukarıdaki formu doldurarak ilaç ekleyebilirsiniz
              </Text>
            </View>
          ) : (
            <FlatList
              data={medicines}
              renderItem={renderMedicineItem}
              keyExtractor={item => item.id}
              scrollEnabled={false}
            />
          )}
        </View>

        {/* İSTATİSTİKLER */}
        {medicines.length > 0 && (
          <View style={styles.statsContainer}>
            <Text style={styles.statsTitle}>İstatistikler</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {medicines.filter(med => med.taken).length}
                </Text>
                <Text style={styles.statLabel}>Alınan</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {medicines.filter(med => !med.taken).length}
                </Text>
                <Text style={styles.statLabel}>Bekleyen</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {reminderTimes.filter(reminder => reminder.enabled).length}
                </Text>
                <Text style={styles.statLabel}>Bildirim</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{medicines.length}</Text>
                <Text style={styles.statLabel}>Toplam</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* CUSTOM TIME PICKER */}
      {selectedMedicine && (
        <CustomTimePicker
          visible={showReminderModal}
          onClose={() => {
            setShowReminderModal(false);
            setSelectedMedicine(null);
          }}
          onTimeSelect={(time) => {
            if (selectedMedicine) {
              addReminderToMedicine(selectedMedicine.id, time);
            }
          }}
          selectedTime={selectedMedicineTime}
        />
      )}
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
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  reminderStatus: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  reminderActive: {
    color: '#10b981',
  },
  reminderInactive: {
    color: '#ef4444',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  formContainer: {
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
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    fontSize: 15,
    color: '#1e293b',
  },
  addButton: {
    backgroundColor: '#10b981',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  remindersSection: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    marginHorizontal: 16,
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
  reminderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
  },
  reminderInfo: {
    flex: 1,
  },
  reminderTime: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  reminderMedicine: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 2,
  },
  reminderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteReminderButton: {
    padding: 8,
    marginLeft: 10,
  },
  deleteReminderText: {
    color: '#e74c3c',
    fontSize: 16,
  },
  listContainer: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 30,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 5,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#bdc3c7',
    textAlign: 'center',
  },
  medicineItem: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#2563eb',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  medicineItemTaken: {
    backgroundColor: '#ecfdf5',
    borderLeftColor: '#10b981',
  },
  medicineInfo: {
    marginBottom: 10,
  },
  medicineName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  medicineNameTaken: {
    textDecorationLine: 'line-through',
    color: '#7f8c8d',
  },
  medicineDetails: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 3,
  },
  medicineDate: {
    fontSize: 12,
    color: '#bdc3c7',
  },
  remindersContainer: {
    marginTop: 5,
  },
  remindersText: {
    fontSize: 12,
    color: '#e67e22',
    fontWeight: '600',
  },
  medicineActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    minWidth: 70,
    alignItems: 'center',
  },
  reminderButton: {
    backgroundColor: '#f59e0b',
  },
  takeButton: {
    backgroundColor: '#10b981',
  },
  untakeButton: {
    backgroundColor: '#f59e0b',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  statsContainer: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2563eb',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default MedicineScreen;