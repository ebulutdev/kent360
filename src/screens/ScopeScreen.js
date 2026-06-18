import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { Layers, Plus, Minus, ArrowLeft, ArrowRight, MapPin, Handshake, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, globalStyles } from '../styles/theme';
import CounterButton from '../components/CounterButton';

const { width } = Dimensions.get('window');

export default function ScopeScreen({ data, updateData, onNext, onBack, onExit }) {
  const insets = useSafeAreaInsets();
  const isComplex = data.buildingType === 'complex';
  
  // Varsayılan değerler
  const [scopeType, setScopeType] = useState(data.scopeType || 'single_building'); // single_building, multi_building
  const [totalCount, setTotalCount] = useState(data.totalBuildingCount || 4);
  const [count, setCount] = useState(data.buildingCount || (isComplex ? 4 : 2));

  useEffect(() => {
    if (isComplex) {
      setScopeType('site');
    }
  }, [isComplex]);

  const handleMinus = () => {
    setCount(prev => prev > 2 ? prev - 1 : prev);
  };

  const handlePlus = () => {
    const max = 15;
    setCount(prev => prev < max ? prev + 1 : prev);
  };

  const handleTotalMinus = () => {
    setTotalCount(prevTotal => {
      if (prevTotal > 1) {
        const newTotal = prevTotal - 1;
        setCount(prevCount => prevCount > newTotal ? newTotal : prevCount);
        return newTotal;
      }
      return prevTotal;
    });
  };

  const handleTotalPlus = () => {
    setTotalCount(prev => prev < 30 ? prev + 1 : prev);
  };

  const handleParticipatingMinus = () => {
    setCount(prev => prev > 1 ? prev - 1 : prev);
  };

  const handleParticipatingPlus = () => {
    setCount(prev => prev < totalCount ? prev + 1 : prev);
  };

  const handleNext = () => {
    updateData({
      scopeType: isComplex ? 'site' : scopeType,
      totalBuildingCount: isComplex ? totalCount : 1,
      buildingCount: (isComplex || scopeType === 'multi_building') ? count : 1
    });
    onNext();
  };

  return (
    <View style={globalStyles.container}>
      <View style={styles.glowViolet} />

      {/* FIXED HEADER at the top */}
      <View style={{ paddingTop: Math.max(12, insets.top + 8), paddingHorizontal: 20 }}>
        {/* Geri & Çıkış Satırı */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <TouchableOpacity style={[styles.backBtn, { marginBottom: 0 }]} onPress={onBack}>
            <ArrowLeft size={20} color={COLORS.textLight} style={{ flexShrink: 0 }} />
            <Text style={styles.backBtnText}>Geri</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.exitBtn} onPress={onExit}>
            <X size={20} color={COLORS.textLight} />
          </TouchableOpacity>
        </View>

        {/* Stepper (2/13) */}
        <View style={[globalStyles.stepperContainer, { marginBottom: 10 }]}>
          <View style={[globalStyles.stepIndicator, globalStyles.stepIndicatorCompleted]} />
          <View style={[globalStyles.stepIndicator, globalStyles.stepIndicatorActive]} />
          {Array.from({ length: 10 }).map((_, i) => (
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
            <Text style={styles.stepTitle}>AŞAMA 1: Kapsam Belirleme</Text>
            
            {!isComplex ? (
              <>
                <Text style={globalStyles.title}>Dönüşüm projenizi nasıl planlıyorsunuz?</Text>
                <Text style={globalStyles.subtitle}>
                  Süreci kendi arsanızda tek başınıza mı yoksa komşu parsellerle birleşerek mi planlıyorsunuz?
                </Text>

                <View style={styles.verticalBtnGroup}>
                  <TouchableOpacity
                    style={[
                      styles.typeBtnVertical,
                      scopeType === 'single_building' && styles.typeBtnActive
                    ]}
                    onPress={() => setScopeType('single_building')}
                  >
                    <View style={styles.optionHeaderRow}>
                      <MapPin size={18} color={scopeType === 'single_building' ? COLORS.optionActiveText : COLORS.textMuted} style={{ flexShrink: 0,  marginRight: 8 }} />
                      <Text style={[
                        styles.typeBtnTitle,
                        scopeType === 'single_building' && styles.typeBtnTitleActive
                      ]}>Sadece kendi arsamızda</Text>
                    </View>
                    <Text style={styles.typeBtnDesc}>Başka parsel veya blok ile birleşmeden, müstakil proje.</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.typeBtnVertical,
                      scopeType === 'multi_building' && styles.typeBtnActive,
                      { marginTop: 14 }
                    ]}
                    onPress={() => setScopeType('multi_building')}
                  >
                    <View style={styles.optionHeaderRow}>
                      <Handshake size={18} color={scopeType === 'multi_building' ? COLORS.optionActiveText : COLORS.textMuted} style={{ flexShrink: 0,  marginRight: 8 }} />
                      <Text style={[
                        styles.typeBtnTitle,
                        scopeType === 'multi_building' && styles.typeBtnTitleActive
                      ]}>Komşu parsellerle birleşerek</Text>
                    </View>
                    <Text style={styles.typeBtnDesc}>Ada veya parsel bazlı komşularla kentsel dönüşüm ortaklığı.</Text>
                  </TouchableOpacity>
                </View>

                {scopeType === 'multi_building' && (
                  <View style={styles.stepperBox}>
                    <Text style={styles.stepperLabel}>Sürece katılacak toplam bina adedi:</Text>
                    <View style={styles.counterContainer}>
                      <CounterButton style={styles.counterBtn} onPress={handleMinus}>
                        <Minus size={20} color={COLORS.textLight} style={{ flexShrink: 0 }} />
                      </CounterButton>
                      <Text style={styles.counterValue}>{count}</Text>
                      <CounterButton style={styles.counterBtn} onPress={handlePlus}>
                        <Plus size={20} color={COLORS.textLight} style={{ flexShrink: 0 }} />
                      </CounterButton>
                    </View>
                  </View>
                )}
              </>
            ) : (
              <>
                <Text style={globalStyles.title}>Sitenizdeki blok yapısı planı</Text>
                <Text style={globalStyles.subtitle}>
                  Sitenizdeki blok yapısına göre sürecin kapsamını belirleyiniz.
                </Text>

                <View style={[styles.stepperBox, { marginBottom: 16 }]}>
                  <Text style={styles.stepperLabel}>Sitenizde toplam kaç blok bulunuyor?</Text>
                  <View style={styles.counterContainer}>
                    <CounterButton style={styles.counterBtn} onPress={handleTotalMinus}>
                      <Minus size={20} color={COLORS.textLight} style={{ flexShrink: 0 }} />
                    </CounterButton>
                    <Text style={styles.counterValue}>{totalCount}</Text>
                    <CounterButton style={styles.counterBtn} onPress={handleTotalPlus}>
                      <Plus size={20} color={COLORS.textLight} style={{ flexShrink: 0 }} />
                    </CounterButton>
                  </View>
                  <Text style={styles.blockHelperText}>Sitenizdeki toplam blok adedi</Text>
                </View>

                <View style={styles.stepperBox}>
                  <Text style={styles.stepperLabel}>Bu blokların kaç tanesi yenileme/dönüşüm sürecine dahil edilecek?</Text>
                  <View style={styles.counterContainer}>
                    <CounterButton style={styles.counterBtn} onPress={handleParticipatingMinus}>
                      <Minus size={20} color={COLORS.textLight} style={{ flexShrink: 0 }} />
                    </CounterButton>
                    <Text style={styles.counterValue}>{count}</Text>
                    <CounterButton style={styles.counterBtn} onPress={handleParticipatingPlus}>
                      <Plus size={20} color={COLORS.textLight} style={{ flexShrink: 0 }} />
                    </CounterButton>
                  </View>
                  <Text style={styles.blockHelperText}>Sürece katılacak toplam blok sayısı</Text>
                </View>
              </>
            )}


          </View>
        </View>
      </ScrollView>

      <View style={{ padding: 16, backgroundColor: COLORS.bgDark, paddingBottom: Math.max(16, insets.bottom) }}>
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.8}>
          <Text style={styles.nextBtnText}>Devam Et</Text>
          <ArrowRight size={20} color={COLORS.white} style={{ flexShrink: 0 }} />
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
  exitBtn: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
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
    color: COLORS.secondary,
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  btnGroup: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  verticalBtnGroup: {
    flexDirection: 'column',
    width: '100%',
    marginBottom: 20,
  },
  optionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  typeBtnVertical: {
    width: '100%',
    backgroundColor: COLORS.bgMedium,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  typeBtnTitle: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.textMuted,
  },
  typeBtnTitleActive: {
    color: COLORS.textLight,
  },
  typeBtnDesc: {
    fontFamily: FONTS.regular,
    fontSize: 12.5,
    color: COLORS.textMuted,
    marginLeft: 24,
  },
  typeBtnDescActive: {
    color: COLORS.textMuted,
  },
  typeBtn: {
    flex: 1,
    backgroundColor: COLORS.bgMedium,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingVertical: 14,
    alignItems: 'center',
  },
  typeBtnActive: {
    borderColor: COLORS.secondary,
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
  },
  typeBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.textMuted,
  },
  typeBtnTextActive: {
    color: COLORS.textLight,
  },
  stepperBox: {
    alignItems: 'center',
    backgroundColor: COLORS.bgMedium,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 20,
    marginBottom: 10,
  },
  stepperLabel: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 14,
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterValue: {
    fontFamily: FONTS.bold,
    fontSize: 28,
    color: COLORS.textLight,
    marginHorizontal: 32,
  },
  blockHelperText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 8,
  },
  nextBtn: {
    backgroundColor: COLORS.secondary,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  nextBtnText: {
    color: COLORS.white,
    fontFamily: FONTS.bold,
    fontSize: 16,
    marginRight: 8,
  },
  glowViolet: {
    position: 'absolute',
    top: 200,
    left: -100,
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: width * 0.35,
    backgroundColor: COLORS.secondary,
    opacity: 0.03,
    blurRadius: 100,
  },
});
