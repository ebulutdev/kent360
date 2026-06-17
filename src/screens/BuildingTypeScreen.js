import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { Home, Landmark, ArrowLeft, ArrowRight, Grid3X3, Layers, Minus, Plus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, globalStyles } from '../styles/theme';

const { width } = Dimensions.get('window');

export default function BuildingTypeScreen({ data, updateData, onNext, onBack }) {
  const insets = useSafeAreaInsets();

  // Helper to determine initial selectedType based on wizard data
  const getInitialType = () => {
    if (data.buildingType === 'complex') return 'site_emsali';
    if (data.scopeType === 'multi_building') {
      return data.unionType === 'block_based' ? 'ada_bazli' : 'coklu_parsel';
    }
    return 'tek_parsel';
  };

  const [selectedType, setSelectedType] = useState(getInitialType());
  const [buildingCount, setBuildingCount] = useState(data.buildingCount || 2);
  const [totalBuildingCount, setTotalBuildingCount] = useState(data.totalBuildingCount || 4);

  // Sync state values if site emsali defaults need adjustment
  useEffect(() => {
    if (selectedType === 'site_emsali') {
      if (buildingCount > totalBuildingCount) {
        setBuildingCount(totalBuildingCount);
      }
    }
  }, [totalBuildingCount, selectedType]);

  const selectType = (type) => {
    setSelectedType(type);
  };

  const handleNext = () => {
    let buildingType = 'single';
    let scopeType = 'single_building';
    let unionType = '';
    let bCount = 1;
    let tCount = 1;

    if (selectedType === 'tek_parsel') {
      buildingType = 'single';
      scopeType = 'single_building';
      unionType = '';
      bCount = 1;
      tCount = 1;
    } else if (selectedType === 'coklu_parsel') {
      buildingType = 'single';
      scopeType = 'multi_building';
      unionType = 'multi_parcel';
      bCount = buildingCount;
      tCount = 1;
    } else if (selectedType === 'ada_bazli') {
      buildingType = 'single';
      scopeType = 'multi_building';
      unionType = 'block_based';
      bCount = buildingCount;
      tCount = 1;
    } else if (selectedType === 'site_emsali') {
      buildingType = 'complex';
      scopeType = 'site';
      unionType = 'block_based';
      bCount = buildingCount;
      tCount = totalBuildingCount;
    }

    updateData({
      buildingType,
      scopeType,
      unionType,
      buildingCount: bCount,
      totalBuildingCount: tCount
    });
    
    onNext();
  };

  const options = [
    { id: 'tek_parsel', title: 'Tek Parsel', icon: Home, bg: 'rgba(253, 192, 16, 0.08)' },
    { id: 'coklu_parsel', title: 'Çoklu Parsel', icon: Grid3X3, bg: 'rgba(30, 41, 59, 0.08)' },
    { id: 'ada_bazli', title: 'Ada Bazlı', icon: Layers, bg: 'rgba(253, 192, 16, 0.08)' },
    { id: 'site_emsali', title: 'Site Emsali', icon: Landmark, bg: 'rgba(30, 41, 59, 0.08)' }
  ];

  return (
    <View style={globalStyles.container}>
      <View style={styles.glowCyan} />

      {/* FIXED HEADER at the top */}
      <View style={{ paddingTop: Math.max(12, insets.top + 8), paddingHorizontal: 20 }}>
        {/* Geri Butonu */}
        <TouchableOpacity style={[styles.backBtn, { marginBottom: 12 }]} onPress={onBack}>
          <ArrowLeft size={20} color={COLORS.textLight} style={{ flexShrink: 0 }} />
          <Text style={styles.backBtnText}>Geri</Text>
        </TouchableOpacity>

        {/* Stepper (1/10) */}
        <View style={[globalStyles.stepperContainer, { marginBottom: 10 }]}>
          <View style={[globalStyles.stepIndicator, globalStyles.stepIndicatorActive]} />
          {Array.from({ length: 9 }).map((_, i) => (
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
            <Text style={styles.stepTitle}>PROJE TİPİ</Text>
            <Text style={globalStyles.title}>Dönüşüm projenizi nasıl planlıyorsunuz?</Text>
            <Text style={globalStyles.subtitle}>
              Sürecin imar ortaklığı ve yapı yapısını belirleyecek modeli seçiniz.
            </Text>

            <View style={styles.optionsContainer}>
              {options.map((opt) => {
                const IconComponent = opt.icon;
                const isActive = selectedType === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.optionCard,
                      isActive && styles.optionCardActive
                    ]}
                    activeOpacity={0.7}
                    onPress={() => selectType(opt.id)}
                  >
                    <View style={[
                      styles.iconContainer,
                      { backgroundColor: opt.bg },
                      isActive && styles.iconContainerActive
                    ]}>
                      <IconComponent 
                        size={26} 
                        color={isActive ? COLORS.white : (opt.id === 'tek_parsel' || opt.id === 'ada_bazli' ? COLORS.primary : COLORS.secondary)} 
                      />
                    </View>
                    <Text style={styles.optionTitle}>{opt.title}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Inline counters based on selection */}
            {(selectedType === 'coklu_parsel' || selectedType === 'ada_bazli') && (
              <View style={styles.counterBox}>
                <Text style={styles.counterLabel}>Sürece katılacak toplam bina adedi:</Text>
                <View style={styles.counterControls}>
                  <TouchableOpacity 
                    style={styles.counterBtn} 
                    onPress={() => setBuildingCount(prev => Math.max(2, prev - 1))}
                  >
                    <Minus size={18} color={COLORS.textLight} style={{ flexShrink: 0 }} />
                  </TouchableOpacity>
                  <Text style={styles.counterValue}>{buildingCount}</Text>
                  <TouchableOpacity 
                    style={styles.counterBtn} 
                    onPress={() => setBuildingCount(prev => Math.min(15, prev + 1))}
                  >
                    <Plus size={18} color={COLORS.textLight} style={{ flexShrink: 0 }} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {selectedType === 'site_emsali' && (
              <View style={styles.siteCountersContainer}>
                <View style={styles.counterBox}>
                  <Text style={styles.counterLabel}>Sitenizde toplam kaç blok bulunuyor?</Text>
                  <View style={styles.counterControls}>
                    <TouchableOpacity 
                      style={styles.counterBtn} 
                      onPress={() => setTotalBuildingCount(prev => Math.max(1, prev - 1))}
                    >
                      <Minus size={18} color={COLORS.textLight} style={{ flexShrink: 0 }} />
                    </TouchableOpacity>
                    <Text style={styles.counterValue}>{totalBuildingCount}</Text>
                    <TouchableOpacity 
                      style={styles.counterBtn} 
                      onPress={() => setTotalBuildingCount(prev => Math.min(30, prev + 1))}
                    >
                      <Plus size={18} color={COLORS.textLight} style={{ flexShrink: 0 }} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={[styles.counterBox, { marginTop: 12 }]}>
                  <Text style={styles.counterLabel}>Yenilenecek / Dönüşecek blok sayısı:</Text>
                  <View style={styles.counterControls}>
                    <TouchableOpacity 
                      style={styles.counterBtn} 
                      onPress={() => setBuildingCount(prev => Math.max(1, prev - 1))}
                    >
                      <Minus size={18} color={COLORS.textLight} style={{ flexShrink: 0 }} />
                    </TouchableOpacity>
                    <Text style={styles.counterValue}>{buildingCount}</Text>
                    <TouchableOpacity 
                      style={styles.counterBtn} 
                      onPress={() => setBuildingCount(prev => Math.min(totalBuildingCount, prev + 1))}
                    >
                      <Plus size={18} color={COLORS.textLight} style={{ flexShrink: 0 }} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}



          </View>
        </View>
      </ScrollView>

      <View style={{ padding: 16, backgroundColor: '#F8FAFC', paddingBottom: Math.max(16, insets.bottom) }}>
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.8}>
          <Text style={styles.nextBtnText}>Devam Et</Text>
          <ArrowRight size={20} color={COLORS.secondary} style={{ flexShrink: 0 }} />
        </TouchableOpacity>
      </View>
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
  stepTitle: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.primary,
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 8,
  },
  optionCard: {
    width: '48%',
    aspectRatio: 1.15,
    backgroundColor: COLORS.bgMedium,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(253, 192, 16, 0.05)',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainerActive: {
    backgroundColor: COLORS.primary,
  },
  optionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 13.5,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  counterBox: {
    backgroundColor: COLORS.bgMedium,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 16,
    marginTop: 16,
    alignItems: 'center',
  },
  counterLabel: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 10,
    textAlign: 'center',
  },
  counterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterValue: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.textLight,
    marginHorizontal: 24,
  },
  siteCountersContainer: {
    width: '100%',
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
  glowCyan: {
    position: 'absolute',
    top: 100,
    right: -100,
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: width * 0.35,
    backgroundColor: COLORS.primary,
    opacity: 0.03,
    blurRadius: 100,
  },
});
