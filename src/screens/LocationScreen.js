import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Modal, 
  FlatList, 
  Dimensions, 
  SafeAreaView,
  ScrollView,
  Alert
} from 'react-native';
import { MapPin, ChevronDown, ArrowLeft, ArrowRight, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, globalStyles } from '../styles/theme';

const { width, height } = Dimensions.get('window');

const LOCATION_DATA = {
  'İstanbul': ['Kadıköy', 'Beşiktaş', 'Üsküdar', 'Fatih', 'Şişli', 'Maltepe', 'Kartal', 'Pendik'],
  'Ankara': ['Çankaya', 'Keçiören', 'Yenimahalle', 'Mamak', 'Etimesgut'],
  'İzmir': ['Bornova', 'Karşıyaka', 'Konak', 'Buca', 'Çeşme']
};

export default function LocationScreen({ data, updateData, onNext, onBack }) {
  const insets = useSafeAreaInsets();
  const [selectedCity, setSelectedCity] = useState(data.city || '');
  const [selectedDistrict, setSelectedDistrict] = useState(data.district || '');
  
  const [modalVisible, setModalVisible] = useState(false);
  const [activeSelectType, setActiveSelectType] = useState('city'); // city, district

  const openSelector = (type) => {
    if (type === 'district' && !selectedCity) {
      Alert.alert('İl Seçimi', 'Lütfen önce il seçiniz.');
      return;
    }
    setActiveSelectType(type);
    setModalVisible(true);
  };

  const handleSelect = (item) => {
    if (activeSelectType === 'city') {
      setSelectedCity(item);
      setSelectedDistrict(''); // İl değiştiğinde ilçeyi sıfırla
    } else {
      setSelectedDistrict(item);
    }
    setModalVisible(false);
  };

  const handleNext = () => {
    if (!selectedCity || !selectedDistrict) {
      Alert.alert('Konum Eksik', 'Lütfen İl ve İlçe bilgilerini seçiniz.');
      return;
    }
    updateData({ city: selectedCity, district: selectedDistrict });
    onNext();
  };

  const currentList = activeSelectType === 'city' 
    ? Object.keys(LOCATION_DATA) 
    : (LOCATION_DATA[selectedCity] || []);

  return (
    <View style={globalStyles.container}>
      <View style={styles.glow} />

      {/* FIXED HEADER at the top */}
      <View style={{ paddingTop: Math.max(12, insets.top + 8), paddingHorizontal: 20 }}>
        {/* Geri Butonu */}
        <TouchableOpacity style={[styles.backBtn, { marginBottom: 12 }]} onPress={onBack}>
          <ArrowLeft size={20} color={COLORS.textLight} />
          <Text style={styles.backBtnText}>Geri</Text>
        </TouchableOpacity>

        {/* Stepper (3/10) */}
        <View style={[globalStyles.stepperContainer, { marginBottom: 10 }]}>
          {Array.from({ length: 2 }).map((_, i) => (
            <View key={i} style={[globalStyles.stepIndicator, globalStyles.stepIndicatorCompleted]} />
          ))}
          <View style={[globalStyles.stepIndicator, globalStyles.stepIndicatorActive]} />
          {Array.from({ length: 7 }).map((_, i) => (
            <View key={i} style={globalStyles.stepIndicator} />
          ))}
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={[
          globalStyles.scrollContainer,
          { paddingTop: 10, paddingBottom: 40 }
        ]} 
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ flex: 1, justifyContent: 'center', marginVertical: 10 }}>
          <View style={globalStyles.glassCard}>
          <View style={styles.headerBox}>
            <View style={styles.iconWrapper}>
              <MapPin size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.stepTitle}>AŞAMA 3: Resmi Bilgiler</Text>
          </View>

          <Text style={globalStyles.title}>Konum Bilgisi</Text>
          <Text style={globalStyles.subtitle}>
            Binalarınızın/Sitenizin bulunduğu İl ve İlçe bilgisini seçiniz.
          </Text>

          {/* İl Seçimi */}
          <Text style={globalStyles.label}>İl</Text>
          <TouchableOpacity 
            style={styles.dropdownTrigger} 
            activeOpacity={0.8}
            onPress={() => openSelector('city')}
          >
            <Text style={[styles.triggerText, !selectedCity && styles.placeholderText]}>
              {selectedCity || 'İl seçiniz'}
            </Text>
            <ChevronDown size={20} color={COLORS.textMuted} />
          </TouchableOpacity>

          {/* İlçe Seçimi */}
          <Text style={globalStyles.label}>İlçe</Text>
          <TouchableOpacity 
            style={styles.dropdownTrigger} 
            activeOpacity={0.8}
            onPress={() => openSelector('district')}
          >
            <Text style={[styles.triggerText, !selectedDistrict && styles.placeholderText]}>
              {selectedDistrict || 'İlçe seçiniz'}
            </Text>
            <ChevronDown size={20} color={COLORS.textMuted} />
          </TouchableOpacity>

          {/* İleri Butonu */}
          <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.8}>
            <Text style={styles.nextBtnText}>Devam Et</Text>
            <ArrowRight size={20} color={COLORS.secondary} />
          </TouchableOpacity>
        </View>
        </View>
      </ScrollView>

      {/* Şık Seçim Modali */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          />
          <SafeAreaView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {activeSelectType === 'city' ? 'İl Seçiniz' : 'İlçe Seçiniz'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={currentList}
              keyExtractor={(item) => item}
              contentContainerStyle={styles.listContainer}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.listItem} 
                  onPress={() => handleSelect(item)}
                >
                  <Text style={styles.listItemText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    alignSelf: 'flex-start',
  },
  backBtnText: {
    fontFamily: FONTS.medium,
    fontSize: 15,
    color: COLORS.textLight,
    marginLeft: 8,
  },
  headerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  stepTitle: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.primary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  dropdownTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.bgMedium,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
  },
  triggerText: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    color: '#0F172A',
  },
  placeholderText: {
    color: COLORS.textMuted,
  },
  nextBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  nextBtnText: {
    color: COLORS.secondary,
    fontFamily: FONTS.bold,
    fontSize: 16,
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.bgMedium,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: COLORS.cardBorder,
    maxHeight: height * 0.6,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  modalTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.textLight,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  listItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  listItemText: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    color: '#0F172A',
  },
  glow: {
    position: 'absolute',
    top: 50,
    left: -50,
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: width * 0.35,
    backgroundColor: COLORS.primary,
    opacity: 0.03,
    blurRadius: 100,
  },
});
