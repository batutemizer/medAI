import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Modal, 
  ScrollView, 
  StyleSheet,
  Dimensions 
} from 'react-native';

const { width } = Dimensions.get('window');

const CustomTimePicker = ({ 
  visible, 
  onClose, 
  onTimeSelect, 
  selectedTime = new Date() 
}) => {
  const [hours, setHours] = useState(selectedTime.getHours());
  const [minutes, setMinutes] = useState(selectedTime.getMinutes());

  useEffect(() => {
    if (visible && selectedTime) {
      setHours(selectedTime.getHours());
      setMinutes(selectedTime.getMinutes());
    }
  }, [visible, selectedTime]);

  const hoursList = Array.from({ length: 24 }, (_, i) => i);
  const minutesList = Array.from({ length: 60 }, (_, i) => i);

  const handleConfirm = () => {
    const time = new Date();
    time.setHours(hours, minutes, 0, 0);
    onTimeSelect(time);
    onClose();
  };

  const formatTime = (value) => value.toString().padStart(2, '0');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Bildirim Saati Seçin</Text>
          <Text style={styles.subtitle}>İstediğiniz saati seçin ve onaylayın</Text>
          
          <View style={styles.timeDisplay}>
            <Text style={styles.timeText}>
              {formatTime(hours)}:{formatTime(minutes)}
            </Text>
          </View>

          <View style={styles.pickerContainer}>
            <View style={styles.pickerColumn}>
              <Text style={styles.columnLabel}>SAAT</Text>
              <ScrollView 
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
              >
                {hoursList.map((hour) => (
                  <TouchableOpacity
                    key={hour}
                    style={[
                      styles.pickerItem,
                      hours === hour && styles.selectedItem
                    ]}
                    onPress={() => setHours(hour)}
                  >
                    <Text style={[
                      styles.pickerText,
                      hours === hour && styles.selectedText
                    ]}>
                      {formatTime(hour)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <Text style={styles.colon}>:</Text>

            <View style={styles.pickerColumn}>
              <Text style={styles.columnLabel}>DAKİKA</Text>
              <ScrollView 
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
              >
                {minutesList.map((minute) => (
                  <TouchableOpacity
                    key={minute}
                    style={[
                      styles.pickerItem,
                      minutes === minute && styles.selectedItem
                    ]}
                    onPress={() => setMinutes(minute)}
                  >
                    <Text style={[
                      styles.pickerText,
                      minutes === minute && styles.selectedText
                    ]}>
                      {formatTime(minute)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, styles.cancelButton]} 
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>İptal</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.confirmButton]} 
              onPress={handleConfirm}
            >
              <Text style={styles.confirmButtonText}>Onayla</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: width * 0.85,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    color: '#1e293b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    color: '#64748b',
    marginBottom: 20,
  },
  timeDisplay: {
    alignItems: 'center',
    marginBottom: 20,
    padding: 20,
    backgroundColor: '#2563eb',
    borderRadius: 12,
  },
  timeText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 2,
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
    marginBottom: 20,
  },
  pickerColumn: {
    flex: 1,
    alignItems: 'center',
  },
  columnLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#7f8c8d',
    marginBottom: 5,
  },
  scrollView: {
    width: '100%',
  },
  pickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginVertical: 2,
    borderRadius: 8,
    width: '90%',
    alignItems: 'center',
  },
  selectedItem: {
    backgroundColor: '#2563eb',
  },
  pickerText: {
    fontSize: 16,
    color: '#475569',
  },
  selectedText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  colon: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1e293b',
    marginHorizontal: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#ef4444',
  },
  confirmButton: {
    backgroundColor: '#10b981',
  },
  cancelButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default CustomTimePicker;