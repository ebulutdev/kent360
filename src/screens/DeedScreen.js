import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  TextInput, 
  StyleSheet, 
  ScrollView, 
  Modal, 
  Dimensions, 
  KeyboardAvoidingView, 
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Alert
} from 'react-native';
import { HelpCircle, Info, X, ArrowLeft, ArrowRight, Check } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, globalStyles } from '../styles/theme';

const { width } = Dimensions.get('window');

export default function DeedScreen({ data, updateData, onNext, onBack, onExit }) {
  const insets = useSafeAreaInsets();
  const isComplex = data.buildingType === 'complex';
  const isMulti = data.scopeType === 'multi_building';
  const count = data.buildingCount || 1;

  const [deeds, setDeeds] = useState({});
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [differentParsels, setDifferentParsels] = useState(data.differentParsels || false);
  const [singleAda, setSingleAda] = useState('');
  const [singleParsel, setSingleParsel] = useState('');

  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const savedDeeds = data.deeds || {};
    setDeeds(savedDeeds);
    
    const hasDiff = data.differentParsels || false;
    setDifferentParsels(hasDiff);

    if (isComplex || isMulti) {
      const firstKey = isComplex ? String.fromCharCode(65) : 'building_1';
      if (savedDeeds[firstKey]) {
        setSingleAda(savedDeeds[firstKey].ada || '');
        setSingleParsel(savedDeeds[firstKey].parsel || '');
      } else if (savedDeeds['single']) {
        setSingleAda(savedDeeds['single'].ada || '');
        setSingleParsel(savedDeeds['single'].parsel || '');
      }
    } else {
      setSingleAda(savedDeeds['single']?.ada || '');
      setSingleParsel(savedDeeds['single']?.parsel || '');
    }
  }, [data, isComplex, isMulti]);

  const handleDeedChange = (key, field, val) => {
    const cleanVal = val.replace(/[^0-9]/g, '');
    setDeeds(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || { ada: '', parsel: '' }),
        [field]: cleanVal
      }
    }));
  };

  const handleSingleDeedChange = (field, val) => {
    const cleanVal = val.replace(/[^0-9]/g, '');
    if (field === 'ada') {
      setSingleAda(cleanVal);
    } else {
      setSingleParsel(cleanVal);
    }
  };

  const handleNext = () => {
    const finalDeeds = { ...deeds };

    if (!isComplex && !isMulti) {
      if (!singleAda || !singleParsel) {
        Alert.alert('Tapu Bilgileri Eksik', 'Lütfen Ada ve Parsel bilgilerini doldurunuz.');
        return;
      }
      finalDeeds['single'] = { ada: singleAda, parsel: singleParsel };
    } else {
      if (!differentParsels) {
        if (!singleAda || !singleParsel) {
          Alert.alert('Tapu Bilgileri Eksik', 'Lütfen Ada ve Parsel bilgilerini doldurunuz.');
          return;
        }
        // Copy unified inputs to all block keys
        for (let i = 0; i < count; i++) {
          const key = isComplex ? String.fromCharCode(65 + i) : `building_${i + 1}`;
          finalDeeds[key] = { ada: singleAda, parsel: singleParsel };
        }
        finalDeeds['single'] = { ada: singleAda, parsel: singleParsel };
      } else {
        // Individual blocks validation
        let isValid = true;
        for (let i = 0; i < count; i++) {
          const key = isComplex ? String.fromCharCode(65 + i) : `building_${i + 1}`;
          const entry = deeds[key];
          if (!entry || !entry.ada || !entry.parsel) {
            isValid = false;
            break;
          }
        }
        if (!isValid) {
          Alert.alert('Tapu Bilgileri Eksik', 'Lütfen tüm bloklar/binalar için Ada ve Parsel bilgilerini doldurunuz.');
          return;
        }
      }
    }

    updateData({ deeds: finalDeeds, differentParsels });
    onNext();
  };

  const renderDeedFields = () => {
    // If single building
    if (!isComplex && !isMulti) {
      return (
        <View style={styles.singleContainer}>
          <Text style={globalStyles.label}>Ada No</Text>
          <TextInput
            style={globalStyles.input}
            keyboardType="number-pad"
            placeholder="Ada (Örn: 4210)"
            placeholderTextColor="#94A3B8"
            value={singleAda}
            onChangeText={(val) => handleSingleDeedChange('ada', val)}
          />

          <Text style={globalStyles.label}>Parsel No</Text>
          <TextInput
            style={globalStyles.input}
            keyboardType="number-pad"
            placeholder="Parsel (Örn: 12)"
            placeholderTextColor="#94A3B8"
            value={singleParsel}
            onChangeText={(val) => handleSingleDeedChange('parsel', val)}
          />
        </View>
      );
    }

    // If complex/site or multi-building
    const labelText = isComplex 
      ? 'Sitenizin bulunduğu Ada ve Parsel numarasını giriniz.'
      : 'Binalarınızın bulunduğu Ada ve Parsel numarasını giriniz.';

    return (
      <View style={styles.singleContainer}>
        {!differentParsels ? (
          <View style={{ marginBottom: 12 }}>
            <Text style={[globalStyles.label, { marginBottom: 10 }]}>{labelText}</Text>
            <View style={styles.inputsRowContainer}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <TextInput
                  style={[globalStyles.input, { marginBottom: 0 }]}
                  keyboardType="number-pad"
                  placeholder="Ada"
                  placeholderTextColor="#94A3B8"
                  value={singleAda}
                  onChangeText={(val) => handleSingleDeedChange('ada', val)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <TextInput
                  style={[globalStyles.input, { marginBottom: 0 }]}
                  keyboardType="number-pad"
                  placeholder="Parsel"
                  placeholderTextColor="#94A3B8"
                  value={singleParsel}
                  onChangeText={(val) => handleSingleDeedChange('parsel', val)}
                />
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.listWrapper}>
            {Array.from({ length: count }).map((_, i) => {
              const isBlock = isComplex;
              const key = isBlock ? String.fromCharCode(65 + i) : `building_${i + 1}`;
              const headerLabel = isBlock ? `${String.fromCharCode(65 + i)} Blok Tapu Bilgileri` : `${i + 1}. Bina Tapu Bilgileri`;

              return (
                <View key={key} style={styles.deedRowCard}>
                  <Text style={styles.rowTitle}>{headerLabel}</Text>
                  <View style={styles.inputsRowContainer}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <TextInput
                        style={[globalStyles.input, { marginBottom: 0 }]}
                        keyboardType="number-pad"
                        placeholder="Ada"
                        placeholderTextColor="#94A3B8"
                        value={deeds[key]?.ada || ''}
                        onChangeText={(val) => handleDeedChange(key, 'ada', val)}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <TextInput
                        style={[globalStyles.input, { marginBottom: 0 }]}
                        keyboardType="number-pad"
                        placeholder="Parsel"
                        placeholderTextColor="#94A3B8"
                        value={deeds[key]?.parsel || ''}
                        onChangeText={(val) => handleDeedChange(key, 'parsel', val)}
                      />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Checkbox for different parsels */}
        <TouchableOpacity
          style={styles.checkboxWrapper}
          onPress={() => setDifferentParsels(prev => !prev)}
          activeOpacity={0.8}
        >
          <View style={[styles.checkboxContainer, differentParsels && styles.checkboxChecked]}>
            {differentParsels && <Check size={12} color="#FFFFFF" style={{ flexShrink: 0 }} />}
          </View>
          <Text style={styles.checkboxLabel}>
            {isComplex ? 'Bloklarımız farklı parseller üzerinde yer alıyor' : 'Binalarımız farklı parseller üzerinde yer alıyor'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={globalStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={{ flex: 1 }}>
        <View style={styles.glow} />

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

          {/* Stepper (4/10) */}
          <View style={[globalStyles.stepperContainer, { marginBottom: 10 }]}>
            {Array.from({ length: 3 }).map((_, i) => (
              <View key={i} style={[globalStyles.stepIndicator, globalStyles.stepIndicatorCompleted]} />
            ))}
            <View style={[globalStyles.stepIndicator, globalStyles.stepIndicatorActive]} />
            {Array.from({ length: 6 }).map((_, i) => (
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
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View style={{ flex: 1 }}>
              <View style={{ flex: 1, justifyContent: 'center', marginVertical: 10 }}>
                <View style={globalStyles.glassCard}>
                <View style={styles.headerBox}>
                  <Text style={styles.stepTitle}>AŞAMA 3: Resmi Bilgiler</Text>
                  <TouchableOpacity 
                    style={styles.infoBtn} 
                    onPress={() => setInfoModalVisible(true)}
                  >
                    <Info size={18} color={COLORS.primary} style={{ flexShrink: 0 }} />
                  </TouchableOpacity>
                </View>

                <Text style={globalStyles.title}>Ada ve Parsel Girişi</Text>
                <Text style={globalStyles.subtitle}>
                  Tapunuzda yer alan resmi ada ve parsel numaralarını giriniz.
                </Text>

                {renderDeedFields()}


              </View>
            </View>
            </View>
          </TouchableWithoutFeedback>
        </ScrollView>
        <View style={{ padding: 16, backgroundColor: COLORS.bgDark, paddingBottom: Math.max(16, insets.bottom) }}>
          <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.8}>
            <Text style={styles.nextBtnText}>Devam Et</Text>
            <ArrowRight size={20} color={COLORS.secondary} style={{ flexShrink: 0 }} />
          </TouchableOpacity>
        </View>
      </View>

      {/* [ i ] Bilgi Modali */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={infoModalVisible}
        onRequestClose={() => setInfoModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setInfoModalVisible(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleBox}>
                <Info size={20} color={COLORS.primary} style={{ flexShrink: 0,  marginRight: 8 }} />
                <Text style={styles.modalTitle}>Ada & Parsel Sorgulama</Text>
              </View>
              <TouchableOpacity onPress={() => setInfoModalVisible(false)}>
                <X size={20} color={COLORS.textLight} style={{ flexShrink: 0 }} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalText}>
                Ada ve Parsel numaralarınızı bilmiyorsanız, aşağıdaki resmi kanallardan sorgulama yapabilirsiniz:
              </Text>

              <View style={styles.stepItem}>
                <Text style={styles.stepNum}>1</Text>
                <Text style={styles.stepText}>
                  e-Devlet kapısına giriş yapıp <Text style={{ fontFamily: FONTS.bold }}>"Tapu Bilgileri Sorgulama"</Text> hizmetini aratın.
                </Text>
              </View>

              <View style={styles.stepItem}>
                <Text style={styles.stepNum}>2</Text>
                <Text style={styles.stepText}>
                  TKGM Parsel Sorgu uygulamasını (<Text style={{ color: COLORS.primary, textDecorationLine: 'underline' }}>parselsorgu.tkgm.gov.tr</Text>) açın.
                </Text>
              </View>

              <View style={styles.stepItem}>
                <Text style={styles.stepNum}>3</Text>
                <Text style={styles.stepText}>
                  Harita üzerinden binanızın konumunu bularak üzerine tıklayın. Ada ve parsel numaraları ekranda belirecektir.
                </Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.modalCloseBtn}
              onPress={() => setInfoModalVisible(false)}
            >
              <Text style={styles.modalCloseBtnText}>Anladım</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
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
  headerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  stepTitle: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.primary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  infoBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  singleContainer: {
    marginTop: 8,
  },
  deedRowCard: {
    backgroundColor: COLORS.bgMedium,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  rowTitle: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 12,
  },
  inputsRowContainer: {
    flexDirection: 'row',
  },
  listWrapper: {
    marginTop: 8,
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    backgroundColor: COLORS.bgMedium,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    borderBottomWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingBottom: 12,
  },
  modalHeaderTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontFamily: FONTS.bold,
    fontSize: 17,
    color: COLORS.textLight,
  },
  modalBody: {
    marginBottom: 20,
  },
  modalText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 20,
    marginBottom: 16,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    color: COLORS.primary,
    fontFamily: FONTS.bold,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 24,
    marginRight: 12,
  },
  stepText: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: 18,
  },
  modalCloseBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCloseBtnText: {
    color: COLORS.white,
    fontFamily: FONTS.bold,
    fontSize: 15,
  },
  glow: {
    position: 'absolute',
    top: 200,
    right: -100,
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: width * 0.35,
    backgroundColor: COLORS.primary,
    opacity: 0.03,
    blurRadius: 100,
  },
  checkboxWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 8,
  },
  checkboxContainer: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
  },
  checkboxLabel: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.textMuted,
    flex: 1,
  },
});
