import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { getMedicineReminders, getUserMedicines, getUserProfile } from './database';

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    console.log('📬 Bildirim alındı:', notification.request.content.title);
    console.log('   - Trigger:', notification.request.trigger);
    console.log('   - Data:', notification.request.content.data);
    
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    };
  },
});

export const requestNotificationPermission = async () => {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('medicine-reminders', {
      name: 'İlaç Hatırlatıcıları',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'default',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      alert('Bildirim izni vermediğiniz için ilaç hatırlatıcıları çalışmayacak!');
      return false;
    }
    
    return true;
  } else {
    alert('Bildirimler sadece fiziksel cihazlarda çalışır!');
    return false;
  }
};

export const scheduleMedicineNotification = async (reminderId, medicineName, dosage, time, userId = null) => {
  try {
    if (userId) {
      try {
        const profile = await getUserProfile(userId);
        if (profile && profile.notifications === false) {
          console.log('ℹ️ Kullanıcı bildirimleri kapalı tutmuş');
          return false;
        }
      } catch (error) {
        console.log('⚠️ Profil kontrolü yapılamadı, bildirim devam ediyor:', error);
      }
    }
    
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      console.log('❌ Bildirim izni yok');
      return false;
    }

    const notificationId = String(reminderId);
    const firstNotificationId = `${notificationId}-first`;

    const [hours, minutes] = time.split(':').map(Number);
    
    const now = new Date();
    const targetTimeToday = new Date();
    targetTimeToday.setHours(hours, minutes, 0, 0);
    targetTimeToday.setSeconds(0);
    targetTimeToday.setMilliseconds(0);
    
    const isPastToday = targetTimeToday < now;
    
    const timeDiff = targetTimeToday.getTime() - now.getTime();
    const minutesUntilTarget = timeDiff / (1000 * 60);
    const useSecondsTrigger = !isPastToday && minutesUntilTarget > 0 && minutesUntilTarget < 30;
    
    console.log(`🕒 Bildirim zamanlaması:`);
    console.log(`   - Şu anki saat: ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`);
    console.log(`   - Hedef saat: ${hours}:${String(minutes).padStart(2, '0')}`);
    console.log(`   - Kalan süre: ${minutesUntilTarget.toFixed(1)} dakika`);
    console.log(`   - Bugün geçti mi: ${isPastToday ? 'Evet (yarın gelecek)' : 'Hayır (bugün gelecek)'}`);
    console.log(`   - İlk bildirim: ${useSecondsTrigger ? `${Math.round(minutesUntilTarget)} dakika sonra` : 'Daily trigger ile'}`);
    console.log(`   - Tekrarlı: Her gün`);
    
    const notificationContent = {
      title: 'İlaç Zamanı',
      body: `${medicineName} - ${dosage} almanız gerekiyor`,
      sound: 'default',
      data: { 
        medicineName, 
        dosage, 
        time,
        reminderId,
        type: 'medicine-reminder'
      },
      badge: 1,
    };

    if (Platform.OS === 'android') {
      notificationContent.android = {
        channelId: 'medicine-reminders',
        priority: 'high',
        importance: Notifications.AndroidImportance.HIGH,
      };
    }

    let trigger;
    
    if (useSecondsTrigger) {
      const secondsUntilTarget = Math.max(60, Math.round(timeDiff / 1000)); // En az 1 dakika
      console.log(`   ⚠️ İlk bildirim ${secondsUntilTarget} saniye sonra gelecek, sonra her gün ${hours}:${String(minutes).padStart(2, '0')} saatinde`);
      
      await Notifications.scheduleNotificationAsync({
        identifier: firstNotificationId,
        content: notificationContent,
        trigger: {
          seconds: secondsUntilTarget,
        },
      });
      
      trigger = {
        hour: hours,
        minute: minutes,
        repeats: true,
      };
    } else {
      trigger = {
        hour: hours,
        minute: minutes,
        repeats: true,
      };
    }
    
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: notificationId,
        content: notificationContent,
        trigger,
      });

      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const ourNotification = scheduledNotifications.find(n => n.identifier === notificationId || n.identifier === firstNotificationId);
      
      if (ourNotification) {
        console.log(`✅ Bildirim başarıyla ayarlandı: ${medicineName} - ${time} (ID: ${reminderId})`);
        console.log(`   - Trigger detayları:`, ourNotification.trigger);
        console.log(`   - Bildirim her gün ${hours}:${String(minutes).padStart(2, '0')} saatinde gelecek`);
        
        if (isPastToday) {
          console.log(`   ⚠️ Not: Hedef saat bugün geçti, bildirim yarın gelecek`);
        } else {
          console.log(`   ✅ Bildirim bugün ${hours}:${String(minutes).padStart(2, '0')} saatinde gelecek`);
        }
      } else {
        console.warn(`⚠️ Bildirim zamanlandı ama listede bulunamadı`);
      }
      
      return true;
    } catch (scheduleError) {
      console.error('❌ Bildirim zamanlama hatası:', scheduleError);
      throw scheduleError;
    }
  } catch (error) {
    console.error('❌ Bildirim ayarlama hatası:', error);
    return false;
  }
};

export const scheduleAllMedicineReminders = async (userId) => {
  try {
    try {
      const profile = await getUserProfile(userId);
      if (profile && profile.notifications === false) {
        console.log('ℹ️ Kullanıcı bildirimleri kapalı tutmuş, bildirimler ayarlanmayacak');
        await Notifications.cancelAllScheduledNotificationsAsync();
        return false;
      }
    } catch (error) {
      console.log('⚠️ Profil kontrolü yapılamadı, bildirim devam ediyor:', error);
    }
    
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      console.log('❌ Bildirim izni yok, bildirimler ayarlanamadı');
      return false;
    }

    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('🧹 Eski bildirimler temizlendi');

    const reminders = await getMedicineReminders(userId);
    const medicines = await getUserMedicines(userId);
    const activeReminders = reminders.filter(reminder => reminder.enabled);
    
    if (activeReminders.length === 0) {
      console.log('ℹ️ Aktif bildirim yok');
      return true;
    }
    
    console.log(`⏰ ${activeReminders.length} aktif bildirim ayarlanıyor...`);
    
    let successCount = 0;
    const errors = [];
    
    for (const reminder of activeReminders) {
      const medicine = medicines.find(med => med.id === reminder.medicineId);
      if (medicine) {
        try {
          const success = await scheduleMedicineNotification(
            reminder.id,
            medicine.name,
            medicine.dosage,
            reminder.time,
            userId
          );
          if (success) {
            successCount++;
          } else {
            errors.push(`${medicine.name} - ${reminder.time}`);
          }
        } catch (error) {
          console.error(`❌ Bildirim ayarlama hatası (${medicine.name}):`, error);
          errors.push(`${medicine.name} - ${reminder.time}`);
        }
      }
    }
    
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    const scheduledIds = scheduledNotifications.map(n => n.identifier);
    const reminderIds = activeReminders.map(r => String(r.id));
    const missingNotifications = reminderIds.filter(id => 
      !scheduledIds.includes(id) && !scheduledIds.includes(`${id}-first`)
    );
    
    if (missingNotifications.length > 0) {
      console.warn(`⚠️ ${missingNotifications.length} bildirim zamanlanamadı, yeniden deneniyor...`);
      for (const reminderId of missingNotifications) {
        const reminder = activeReminders.find(r => String(r.id) === reminderId);
        if (reminder) {
          const medicine = medicines.find(med => med.id === reminder.medicineId);
          if (medicine) {
            try {
              const success = await scheduleMedicineNotification(
                reminder.id,
                medicine.name,
                medicine.dosage,
                reminder.time,
                userId
              );
              if (success) successCount++;
            } catch (error) {
              console.error(`❌ Yeniden deneme hatası (${medicine.name}):`, error);
            }
          }
        }
      }
    }
    
    console.log(`✅ ${successCount}/${activeReminders.length} bildirim başarıyla ayarlandı`);
    if (errors.length > 0) {
      console.warn(`⚠️ ${errors.length} bildirim ayarlanamadı:`, errors);
    }
    
    const finalScheduled = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`📋 Toplam ${finalScheduled.length} aktif bildirim sistemde kayıtlı`);
    
    return successCount > 0;
  } catch (error) {
    console.error('❌ Toplu bildirim ayarlama hatası:', error);
    return false;
  }
};

export const cancelMedicineNotification = async (reminderId) => {
  try {
    const notificationId = String(reminderId);
    const firstNotificationId = `${notificationId}-first`;
    
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    await Notifications.cancelScheduledNotificationAsync(firstNotificationId);
    
    console.log(`🔕 Bildirim iptal edildi: ${reminderId}`);
    return true;
  } catch (error) {
    console.error('❌ Bildirim iptal hatası:', error);
    return false;
  }
};

export const cancelAllNotifications = async () => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('✅ Tüm bildirimler temizlendi');
    return true;
  } catch (error) {
    console.error('❌ Bildirim temizleme hatası:', error);
    return false;
  }
};

export const testNotification = async () => {
  try {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) return false;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'MedAI Test',
        body: 'Bildirim sistemi başarıyla çalışıyor!',
        sound: 'default',
        data: { test: true },
        ...(Platform.OS === 'android' && {
          android: {
            channelId: 'medicine-reminders',
          },
        }),
      },
      trigger: {
        seconds: 5, // 5 saniye sonra
      },
    });
    
    console.log('✅ Test bildirimi ayarlandı - 5 saniye sonra gelecek');
    return true;
  } catch (error) {
    console.error('❌ Test bildirimi hatası:', error);
    return false;
  }
};

export const getAllScheduledNotifications = async () => {
  try {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`📋 Toplam ${notifications.length} aktif bildirim:`);
    notifications.forEach((notification, index) => {
      console.log(`   ${index + 1}. ID: ${notification.identifier}`);
      console.log(`      Trigger:`, notification.trigger);
      console.log(`      Content:`, notification.content.title);
    });
    return notifications;
  } catch (error) {
    console.error('❌ Bildirim listeleme hatası:', error);
    return [];
  }
};