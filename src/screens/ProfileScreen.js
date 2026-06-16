import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  Modal,
  Animated,
  PanResponder,
  Alert,
  SafeAreaView,
  StatusBar
} from 'react-native';
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Minus,
  X,
  Check,
  Home,
  Percent,
  HelpCircle,
  FileText
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, globalStyles } from '../styles/theme';

const { width: windowWidth, height: windowHeight } = Dimensions.get('window');

export default function ProfileScreen({ data, updateData, onNext, onBack }) {
  const insets = useSafeAreaInsets();

  // Get first deed/floor info if available to pre-populate ProfileScreen
  const firstDeed = useMemo(() => {
    const deedsList = Object.values(data.deeds || {});
    return deedsList[0] || null;
  }, [data.deeds]);

  const firstFloorCount = useMemo(() => {
    const floorsList = Object.values(data.floors || {});
    return floorsList[0] || null;
  }, [data.floors]);

  const hasMansartRoof = useMemo(() => {
    if (data.buildingStructures) {
      const structuresList = Object.values(data.buildingStructures);
      return structuresList.some(block => block.roofType === 'mansart');
    }
    return false;
  }, [data.buildingStructures]);

  const hasAtticRoof = useMemo(() => {
    if (data.buildingStructures) {
      const structuresList = Object.values(data.buildingStructures);
      return structuresList.some(block => {
        const topNormal = block.floors?.find(f => f.type === 'normal');
        return topNormal?.hasAttic === true;
      });
    }
    return false;
  }, [data.buildingStructures]);

  // State variables from wizard data or defaults
  const [adaNo, setAdaNo] = useState(data.adaNo || firstDeed?.ada || '102');
  const [parselNo, setParselNo] = useState(data.parselNo || firstDeed?.parsel || '15');
  const [floorsCount, setFloorsCount] = useState(data.floorsCount || firstFloorCount || 1);
  const [contractorFlatCount, setContractorFlatCount] = useState(data.contractorFlatCount || 0);
  const [mutType, setMutType] = useState(data.mutType || (data.contractorFlatCount > 0 ? 'MÜT D' : 'MÜT YOK'));
  const [isMansart, setIsMansart] = useState(
    data.isMansart !== undefined ? data.isMansart : (hasMansartRoof || false)
  );

  const [buildingWidth, setBuildingWidth] = useState(data.width || 28);
  const [buildingDepth, setBuildingDepth] = useState(data.depth || 30);
  const [localWidth, setLocalWidth] = useState(data.width ? String(data.width) : '28');
  const [localDepth, setLocalDepth] = useState(data.depth ? String(data.depth) : '30');

  // Facades layout configuration
  const [facades, setFacades] = useState(data.facades || {
    top: { type: 'bahce', name: 'ORTAK BAHÇE', distance: '28m' },
    bottom: { type: 'yol', name: 'DEDE KORKUT SK.', distance: '' },
    left: { type: 'ekle', name: '', distance: '' },
    right: { type: 'ekle', name: '', distance: '' }
  });

  const [currentQuestionStep, setCurrentQuestionStep] = useState(0);

  // Haptic feedback helper
  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      // Catch silently if not supported in environment
    }
  };

  // Restore state from previously saved data on mount
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (hasInitialized.current) return;
    if (data.contractorFlatCount !== undefined) {
      setContractorFlatCount(data.contractorFlatCount);
    }
    if (data.mutType !== undefined) {
      setMutType(data.mutType);
    } else if (data.contractorFlatCount > 0) {
      setMutType('MÜT D');
    }
    if (data.width) {
      setBuildingWidth(data.width);
      setLocalWidth(String(data.width));
    }
    if (data.depth) {
      setBuildingDepth(data.depth);
      setLocalDepth(String(data.depth));
    }
    if (data.facades) setFacades(data.facades);
    if (data.adaNo) setAdaNo(data.adaNo);
    if (data.parselNo) setParselNo(data.parselNo);
    if (data.floorsCount) setFloorsCount(data.floorsCount);
    if (data.isMansart !== undefined) setIsMansart(data.isMansart);
    hasInitialized.current = true;
  }, [data]);

  // Computed total area
  const totalArea = useMemo(() => {
    return Math.round(buildingWidth * buildingDepth);
  }, [buildingWidth, buildingDepth]);

  // Handle facade option changes inline
  const handleFacadeTypeSelect = (direction, type) => {
    triggerHaptic();
    setFacades(prev => {
      const current = prev[direction] || { type: 'ekle', name: '', distance: '' };
      return {
        ...prev,
        [direction]: {
          type,
          name: type === 'ekle' ? '' : (current.type === type ? current.name : ''),
          distance: type === 'bahce' ? (current.type === type ? current.distance : '') : ''
        }
      };
    });
  };

  const handleFacadeNameChange = (direction, name) => {
    setFacades(prev => ({
      ...prev,
      [direction]: {
        ...(prev[direction] || { type: 'ekle', distance: '' }),
        name
      }
    }));
  };

  const handleFacadeDistanceChange = (direction, distance) => {
    setFacades(prev => ({
      ...prev,
      [direction]: {
        ...(prev[direction] || { type: 'ekle', name: '' }),
        distance
      }
    }));
  };

  // Submit and proceed to next screen
  const handleNextSubmit = () => {
    triggerHaptic();

    const proceed = () => {
      let updatedStructures = data.buildingStructures;
      if (updatedStructures && Object.keys(updatedStructures).length > 0) {
        const newStructures = {};
        Object.keys(updatedStructures).forEach(key => {
          const block = updatedStructures[key];
          newStructures[key] = {
            ...block,
            roofType: isMansart ? 'mansart' : (block.roofType === 'mansart' ? 'normal' : block.roofType)
          };
        });
        updatedStructures = newStructures;
      }

      updateData({
        adaNo,
        parselNo,
        floorsCount,
        mutType,
        contractorFlatCount: mutType === 'MÜT YOK' ? 0 : contractorFlatCount,
        isMansart,
        width: buildingWidth,
        depth: buildingDepth,
        facades,
        ...(updatedStructures ? { buildingStructures: updatedStructures } : {})
      });
      onNext();
    };

    proceed();
  };

  // Steps configuration
  const STEPS = useMemo(() => {
    const steps = [
      {
        title: 'Bina Genişliği (En)',
      question: 'Binanızın yatay genişliği (en) kaç metredir?',
      key: 'width'
    },
    {
      title: 'Bina Derinliği (Boy)',
      question: 'Binanızın derinliği (boy) kaç metredir?',
      key: 'depth'
    },
    {
      title: 'Üst Cephe Durumu',
      question: 'Binanızın üst (kuzey) cephesinde ne bulunuyor?',
      key: 'facade_top',
      direction: 'top'
    },
    {
      title: 'Alt Cephe Durumu',
      question: 'Binanızın alt (güney) cephesinde ne bulunuyor?',
      key: 'facade_bottom',
      direction: 'bottom'
    },
    {
      title: 'Sol Cephe Durumu',
      question: 'Binanızın sol (batı) cephesinde ne bulunuyor?',
      key: 'facade_left',
      direction: 'left'
    },
    {
      title: 'Sağ Cephe Durumu',
      question: 'Binanızın sağ (doğu) cephesinde ne bulunuyor?',
      key: 'facade_right',
      direction: 'right'
    },
    {
      title: 'Hesaplama Tipi',
      question: 'Projenizde müteahhit payı hesaplama modelini seçiniz.',
      key: 'mutType'
    }
  ];

  if (mutType === 'MÜT D') {
    steps.push({
      title: 'Müteahhit Payı',
      question: 'Müteahhite kalacak (verilecek) daire sayısı nedir?',
      key: 'contractorFlatCount'
    });
  }

  steps.push({
    title: 'Onay ve Kontrol',
    question: 'Oluşturduğunuz parsel ve cephe modeli aşağıdaki gibidir. Onaylıyor musunuz?',
    key: 'confirmation'
  });

  return steps;
}, [mutType]);

  const handleNextSubStep = () => {
    triggerHaptic();
    const next = currentQuestionStep + 1;
    if (next < STEPS.length) {
      if (STEPS[currentQuestionStep].key === 'mutType' && mutType === 'MÜT YOK') {
        Alert.alert(
          'Müteahhit Pay Durumu',
          'Müteahhite pay vermiyorsunuz, emin misiniz?',
          [
            { text: 'Hayır', style: 'cancel' },
            { text: 'Evet', onPress: () => {
                setContractorFlatCount(0);
                setCurrentQuestionStep(next);
              }
            }
          ],
          { cancelable: false }
        );
      } else {
        setCurrentQuestionStep(next);
      }
    }
  };

  const handleBackSubStep = () => {
    triggerHaptic();
    const prev = currentQuestionStep - 1;
    if (prev >= 0) {
      setCurrentQuestionStep(prev);
    } else {
      onBack();
    }
  };

  const handleCenterBoxPress = () => {
    triggerHaptic();
    setCurrentQuestionStep(0); // Jump to width step
  };

  // Helper renderers for blueprint styling
  const renderGridLines = () => {
    const lines = [];
    for (let i = 16; i < 360; i += 16) {
      const isMajor = i % 80 === 0;
      lines.push(
        <View
          key={`h-${i}`}
          style={[
            styles.gridLine,
            {
              top: i,
              left: 0,
              right: 0,
              height: 1,
              backgroundColor: isMajor ? 'rgba(14, 165, 233, 0.1)' : 'rgba(14, 165, 233, 0.03)'
            }
          ]}
        />
      );
    }
    for (let i = 16; i < 360; i += 16) {
      const isMajor = i % 80 === 0;
      lines.push(
        <View
          key={`v-${i}`}
          style={[
            styles.gridLine,
            {
              left: i,
              top: 0,
              bottom: 0,
              width: 1,
              backgroundColor: isMajor ? 'rgba(14, 165, 233, 0.1)' : 'rgba(14, 165, 233, 0.03)'
            }
          ]}
        />
      );
    }
    return lines;
  };

  const renderHatchLines = () => {
    return (
      <View style={StyleSheet.absoluteFill}>
        {Array.from({ length: 6 }).map((_, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              backgroundColor: COLORS.textMuted,
              width: '140%',
              height: 1,
              transform: [
                { rotate: '45deg' },
                { translateY: -30 + i * 14 }
              ],
              opacity: 0.25
            }}
          />
        ))}
      </View>
    );
  };

  // Render tree symbols for garden
  const renderTrees = () => (
    <View style={styles.treesContainer}>
      <View style={styles.miniTree} />
      <View style={[styles.miniTree, { marginLeft: 8 }]} />
      <View style={[styles.miniTree, { marginLeft: 8 }]} />
    </View>
  );

  // Render a customizable slot on the parsel
  const renderFacadeSlot = (key, positionStyles) => {
    const facade = facades[key] || { type: 'ekle', name: '', distance: '' };
    const isHorizontal = key === 'top' || key === 'bottom';

    const handlePress = () => {
      triggerHaptic();
      const stepIdx = STEPS.findIndex(s => s.direction === key);
      if (stepIdx !== -1) {
        setCurrentQuestionStep(stepIdx);
      }
    };

    if (facade.type === 'ekle') {
      return (
        <TouchableOpacity
          style={[styles.facadeSlot, styles.facadeAdd, positionStyles]}
          onPress={handlePress}
          activeOpacity={0.8}
        >
          <Plus size={10} color={COLORS.primary} style={{ marginBottom: 2 }} />
          <Text style={styles.facadeAddText}>CEPHE EKLE</Text>
        </TouchableOpacity>
      );
    }

    if (facade.type === 'bitisik') {
      return (
        <TouchableOpacity
          style={[styles.facadeSlot, styles.facadeBitisik, positionStyles]}
          onPress={handlePress}
          activeOpacity={0.8}
        >
          {renderHatchLines()}
          <View style={styles.bitisikLineOverlay} />
          <Text style={styles.facadeBitisikText}>BİTİŞİK BİNA</Text>
        </TouchableOpacity>
      );
    }

    if (facade.type === 'bahce') {
      return (
        <TouchableOpacity
          style={[styles.facadeSlot, styles.facadeBahce, positionStyles]}
          onPress={handlePress}
          activeOpacity={0.8}
        >
          {renderTrees()}
          <Text style={styles.facadeBahceText} numberOfLines={1}>
            {facade.name || 'BAHÇE'} {facade.distance ? `(${facade.distance})` : ''}
          </Text>
        </TouchableOpacity>
      );
    }

    if (facade.type === 'arsa') {
      return (
        <TouchableOpacity
          style={[styles.facadeSlot, styles.facadeArsa, positionStyles]}
          onPress={handlePress}
          activeOpacity={0.8}
        >
          <Text style={styles.facadeArsaText}>BOŞ ARSA</Text>
        </TouchableOpacity>
      );
    }

    if (facade.type === 'yol') {
      return (
        <TouchableOpacity
          style={[styles.facadeSlot, styles.facadeYol, positionStyles]}
          onPress={handlePress}
          activeOpacity={0.8}
        >
          <View style={isHorizontal ? styles.roadLineHorizontal : styles.roadLineVertical} />
          <Text style={styles.facadeYolText} numberOfLines={1}>
            {facade.name || 'SOKAK'}
          </Text>
        </TouchableOpacity>
      );
    }

    return null;
  };

  // Rendering custom input controls based on active sub-step
  const renderQuestionControls = () => {
    const activeStep = STEPS[currentQuestionStep];
    if (!activeStep) return null;

    if (activeStep.direction) {
      const direction = activeStep.direction;
      const facade = facades[direction] || { type: 'ekle', name: '', distance: '' };
      return (
        <View style={{ width: '100%' }}>
          <View style={styles.optionsGrid}>
            {[
              { type: 'ekle', label: 'Birşey Yok / Boş', desc: 'Cepheyi boşta bırak' },
              { type: 'bitisik', label: 'Bitişik Bina (Kör Cephe)', desc: 'Bitişik ortak yangın duvarı' },
              { type: 'bahce', label: 'Bahçe / Ortak Bahçe', desc: 'Yeşil alan veya park alanı' },
              { type: 'arsa', label: 'Boş Arsa', desc: 'Yapılaşmamış açık alan' },
              { type: 'yol', label: 'Yol / Sokak', desc: 'İsimlendirilebilir kamu yolu' }
            ].map(opt => (
              <TouchableOpacity
                key={opt.type}
                style={[
                  styles.optionButton,
                  facade.type === opt.type && styles.optionButtonActive
                ]}
                onPress={() => handleFacadeTypeSelect(direction, opt.type)}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.optionButtonText,
                  facade.type === opt.type && styles.optionButtonTextActive
                ]}>
                  {opt.label}
                </Text>
                <Text style={styles.optionButtonDesc}>{opt.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {facade.type === 'yol' && (
            <View style={styles.inlineInputWrapper}>
              <Text style={styles.inlineInputLabel}>YOL / SOKAK ADI</Text>
              <TextInput
                style={styles.inlineTextInput}
                placeholder="Örn: Dede Korkut Sk."
                placeholderTextColor="#94A3B8"
                value={facade.name}
                onChangeText={(text) => handleFacadeNameChange(direction, text)}
              />
            </View>
          )}

          {facade.type === 'bahce' && (
            <View style={styles.inlineInputWrapper}>
              <Text style={styles.inlineInputLabel}>BAHÇE ADI</Text>
              <TextInput
                style={styles.inlineTextInput}
                placeholder="Örn: Ortak Bahçe veya İmar Bahçesi"
                placeholderTextColor="#94A3B8"
                value={facade.name}
                onChangeText={(text) => handleFacadeNameChange(direction, text)}
              />
              <Text style={[styles.inlineInputLabel, { marginTop: 10 }]}>MESAFE UZUNLUĞU</Text>
              <TextInput
                style={styles.inlineTextInput}
                placeholder="Örn: 28m veya 5m"
                placeholderTextColor="#94A3B8"
                value={facade.distance}
                onChangeText={(text) => handleFacadeDistanceChange(direction, text)}
              />
            </View>
          )}
        </View>
      );
    }

    switch (activeStep.key) {
      case 'mutType':
        return (
          <View style={styles.optionsGrid}>
            {[
              { type: 'MÜT D', label: 'MÜT D (Daire Payı)', desc: 'Müteahhide verilecek bağımsız bölüm daire adedini temel alır.' },
              { type: 'MÜT YOK', label: 'MÜT YOK (Paysız)', desc: 'Müteahhit payı olmadığını belirtir. Proje malikler tarafından karşılanır.' }
            ].map(opt => (
              <TouchableOpacity
                key={opt.type}
                style={[
                  styles.optionButton,
                  mutType === opt.type && styles.optionButtonActive
                ]}
                onPress={() => setMutType(opt.type)}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.optionButtonText,
                  mutType === opt.type && styles.optionButtonTextActive
                ]}>
                  {opt.label}
                </Text>
                <Text style={styles.optionButtonDesc}>{opt.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'contractorFlatCount':
        return (
          <View style={styles.counterWrapper}>
            <Text style={styles.counterSubLabel}>MÜTEAHHİTE KALACAK DAİRE</Text>
            <View style={styles.counterControls}>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => {
                  triggerHaptic();
                  setContractorFlatCount(prev => Math.max(0, prev - 1));
                }}
              >
                <Minus size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.counterValue}>{contractorFlatCount}</Text>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => {
                  triggerHaptic();
                  setContractorFlatCount(prev => Math.min(200, prev + 1));
                }}
              >
                <Plus size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'width':
        return (
          <View style={styles.counterWrapper}>
            <Text style={styles.counterSubLabel}>YATAY GENİŞLİK (EN)</Text>
            <View style={styles.counterControls}>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => {
                  triggerHaptic();
                  setBuildingWidth(prev => {
                    const val = Math.max(10, prev - 1);
                    setLocalWidth(String(val));
                    return val;
                  });
                }}
              >
                <Minus size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.counterValue}>{buildingWidth} m</Text>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => {
                  triggerHaptic();
                  setBuildingWidth(prev => {
                    const val = Math.min(100, prev + 1);
                    setLocalWidth(String(val));
                    return val;
                  });
                }}
              >
                <Plus size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'depth':
        return (
          <View style={styles.counterWrapper}>
            <Text style={styles.counterSubLabel}>DÜŞEY DERİNLİK (BOY)</Text>
            <View style={styles.counterControls}>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => {
                  triggerHaptic();
                  setBuildingDepth(prev => {
                    const val = Math.max(10, prev - 1);
                    setLocalDepth(String(val));
                    return val;
                  });
                }}
              >
                <Minus size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.counterValue}>{buildingDepth} m</Text>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => {
                  triggerHaptic();
                  setBuildingDepth(prev => {
                    const val = Math.min(100, prev + 1);
                    setLocalDepth(String(val));
                    return val;
                  });
                }}
              >
                <Plus size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'confirmation':
        return (
          <ScrollView style={styles.summaryScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.summaryCard}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabelText}>Ada / Parsel No:</Text>
                <Text style={styles.summaryValueText}>{adaNo} / {parselNo}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabelText}>Hesaplama Tipi:</Text>
                <Text style={styles.summaryValueText}>{mutType}</Text>
              </View>
              {mutType === 'MÜT D' && (
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabelText}>Müteahhit Payı:</Text>
                  <Text style={styles.summaryValueText}>{contractorFlatCount} Daire</Text>
                </View>
              )}
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabelText}>Bina Ölçüleri:</Text>
                <Text style={styles.summaryValueText}>{buildingWidth}m x {buildingDepth}m ({totalArea} m²)</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabelText}>Üst (Kuzey) Cephe:</Text>
                <Text style={styles.summaryValueText}>
                  {facades.top.type === 'ekle' ? 'Boş' : (facades.top.type === 'bitisik' ? 'Bitişik Bina' : (facades.top.type === 'bahce' ? `Bahçe (${facades.top.name})` : (facades.top.type === 'arsa' ? 'Boş Arsa' : `Yol (${facades.top.name})`)))}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabelText}>Alt (Güney) Cephe:</Text>
                <Text style={styles.summaryValueText}>
                  {facades.bottom.type === 'ekle' ? 'Boş' : (facades.bottom.type === 'bitisik' ? 'Bitişik Bina' : (facades.bottom.type === 'bahce' ? `Bahçe (${facades.bottom.name})` : (facades.bottom.type === 'arsa' ? 'Boş Arsa' : `Yol (${facades.bottom.name})`)))}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabelText}>Sol (Batı) Cephe:</Text>
                <Text style={styles.summaryValueText}>
                  {facades.left.type === 'ekle' ? 'Boş' : (facades.left.type === 'bitisik' ? 'Bitişik Bina' : (facades.left.type === 'bahce' ? `Bahçe (${facades.left.name})` : (facades.left.type === 'arsa' ? 'Boş Arsa' : `Yol (${facades.left.name})`)))}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabelText}>Sağ (Doğu) Cephe:</Text>
                <Text style={styles.summaryValueText}>
                  {facades.right.type === 'ekle' ? 'Boş' : (facades.right.type === 'bitisik' ? 'Bitişik Bina' : (facades.right.type === 'bahce' ? `Bahçe (${facades.right.name})` : (facades.right.type === 'arsa' ? 'Boş Arsa' : `Yol (${facades.right.name})`)))}
                </Text>
              </View>
            </View>
          </ScrollView>
        );

      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bgDark }}>
        <View style={styles.screenWrapper}>
          <View style={styles.glow} />

          {/* FIXED HEADER at the top */}
          <View style={{ paddingTop: Math.max(12, insets.top + 8), paddingHorizontal: 16 }}>
            {/* Geri Butonu */}
            <TouchableOpacity style={styles.backBtn} onPress={handleBackSubStep}>
              <ArrowLeft size={20} color={COLORS.textLight} />
              <Text style={styles.backBtnText}>Geri</Text>
            </TouchableOpacity>

            {/* Stepper showing global wizard progress (Stage 5: Parsel & Cephe) */}
            <View style={[globalStyles.stepperContainer, { marginBottom: 10 }]}>
              {Array.from({ length: 5 }).map((_, i) => (
                <View key={i} style={[globalStyles.stepIndicator, globalStyles.stepIndicatorCompleted]} />
              ))}
              <View style={[globalStyles.stepIndicator, globalStyles.stepIndicatorActive]} />
              {Array.from({ length: 4 }).map((_, i) => (
                <View key={i} style={globalStyles.stepIndicator} />
              ))}
            </View>
          </View>


          {/* Main Content inside ScrollView */}
          <ScrollView
            contentContainerStyle={[
              styles.mobileScrollContainer,
              { paddingTop: 4, paddingBottom: 40 }
            ]}
            keyboardShouldPersistTaps="handled"
          >
            <View style={{ gap: 16, paddingHorizontal: 16 }}>
              {/* 1. PARSEL VE CEPHE ÖNİZLEME KARTI */}
              <View style={[globalStyles.glassCard, styles.previewGlassCard]}>
                <Text style={styles.previewCardTitle}>PARSEL VE CEPHE ÖNİZLEME (2D)</Text>

                <View style={styles.centeredVisualizerWrapper}>
                  <View style={styles.krokiContainer}>
                    {renderGridLines()}

                    {/* Drafting Crosshairs */}
                    <View style={[styles.crosshair, styles.chTopLeft]} />
                    <View style={[styles.crosshair, styles.chTopRight]} />
                    <View style={[styles.crosshair, styles.chBottomLeft]} />
                    <View style={[styles.crosshair, styles.chBottomRight]} />

                    {/* Surrounding Facades */}
                    {renderFacadeSlot('top', styles.posTop)}
                    {renderFacadeSlot('bottom', styles.posBottom)}
                    {renderFacadeSlot('left', styles.posLeft)}
                    {renderFacadeSlot('right', styles.posRight)}

                    {/* Dimension Containers */}
                    <View style={styles.dimHeightContainer}>
                      <Text style={styles.dimText} numberOfLines={1}>{buildingDepth}m</Text>
                    </View>
                    <View style={styles.dimWidthContainer}>
                      <Text style={styles.dimText}>{buildingWidth}m</Text>
                    </View>

                    {/* Main Center Plot */}
                    <TouchableOpacity
                      style={styles.centerBuildingBox}
                      onPress={handleCenterBoxPress}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.titleLabel}>PARSEL DETAYI</Text>
                      <Text style={styles.mainInfo}>ADA {adaNo} / PARSEL {parselNo}</Text>

                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{totalArea} m²</Text>
                      </View>

                      <Text style={styles.subText}>{buildingWidth}m x {buildingDepth}m</Text>
                      <Text style={styles.subText}>
                        {floorsCount} Kat {isMansart ? '(Mansart Çatılı)' : (hasAtticRoof ? '(Çatı Piyesli)' : '')}
                      </Text>
                      <Text style={styles.subTextMuted}>
                        Hesap Tipi: {mutType === 'MÜT YOK' ? 'Paysız' : `${contractorFlatCount} Daire`}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* 2. SORU/CEVAP KARTI */}
              <View style={globalStyles.glassCard}>
                <Text style={styles.stepTitle}>PARSEL CEPHE MODELLEME</Text>

                <View style={styles.questionHeaderRow}>
                  <Text style={styles.questionTitleText}>{STEPS[currentQuestionStep]?.title}</Text>
                  <Text style={styles.questionStepText}>Soru {currentQuestionStep + 1} / {STEPS.length}</Text>
                </View>

                <View style={styles.questionProgressBarBg}>
                  <View style={[
                    styles.questionProgressBarActive,
                    { width: `${((currentQuestionStep + 1) / STEPS.length) * 100}%` }
                  ]} />
                </View>

                <Text style={styles.questionSubtitleText}>{STEPS[currentQuestionStep]?.question}</Text>

                {/* Soru Seçenekleri / Girişleri */}
                <View style={styles.controlsSection}>
                  {renderQuestionControls()}
                </View>

                {/* Onay Sorusu Banner'ı */}
                {currentQuestionStep === STEPS.length - 1 && (
                  <View style={styles.finalQuestionBox}>
                    <Text style={styles.finalQuestionText}>
                      Oluşturduğunuz parsel profili sizin parseliniz ile aynı mı? Onaylıyor musunuz?
                    </Text>
                  </View>
                )}

                {/* Devam Et / İleri Butonu */}
                <TouchableOpacity
                  style={styles.nextBtn}
                  onPress={currentQuestionStep === STEPS.length - 1 ? handleNextSubmit : handleNextSubStep}
                  activeOpacity={0.8}
                >
                  <Text style={styles.nextBtnText}>
                    {currentQuestionStep === STEPS.length - 1 ? 'Evet, Bina Profilini Onayla (Devam Et)' : 'Devam Et'}
                  </Text>
                  <ArrowRight size={20} color={COLORS.secondary} />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
  },
  screenWrapper: {
    flex: 1,
    position: 'relative',
  },
  blueprintTitleBoxCompact: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  blueprintTitleText: {
    fontSize: 10.5,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
    letterSpacing: 0.8,
  },
  blueprintScaleText: {
    fontSize: 8.5,
    fontFamily: FONTS.bold,
    color: COLORS.textMuted,
  },
  mobileScrollContainer: {
    paddingBottom: 40,
  },
  krokiContainer: {
    width: 360,
    height: 360,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    position: 'relative',
    alignSelf: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  gridLine: {
    position: 'absolute',
  },
  facadeSlot: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
    borderWidth: 1,
  },
  posTop: { left: 95, top: 30, width: 170, height: 45 },
  posBottom: { left: 95, top: 285, width: 170, height: 45 },
  posLeft: { left: 30, top: 95, width: 45, height: 170 },
  posRight: { left: 285, top: 95, width: 45, height: 170 },
  facadeAdd: {
    borderStyle: 'dashed',
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(6, 182, 212, 0.05)',
  },
  facadeAddText: {
    fontSize: 7.5,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  facadeBitisik: {
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.bgDark,
    overflow: 'hidden',
  },
  bitisikLineOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderWidth: 1.5,
    borderColor: COLORS.danger,
    borderRadius: 4,
    opacity: 0.8,
  },
  facadeBitisikText: {
    fontSize: 7.5,
    fontFamily: FONTS.bold,
    color: COLORS.danger,
    backgroundColor: COLORS.bgMedium,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
    zIndex: 5,
  },
  facadeBahce: {
    borderColor: COLORS.success,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  treesContainer: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  miniTree: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
    borderWidth: 1,
    borderColor: '#047857',
  },
  facadeBahceText: {
    fontSize: 7.5,
    fontFamily: FONTS.bold,
    color: COLORS.success,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  facadeArsa: {
    borderStyle: 'dashed',
    borderColor: COLORS.textMuted,
    backgroundColor: '#FFFFFF',
  },
  facadeArsaText: {
    fontSize: 7.5,
    fontFamily: FONTS.bold,
    color: COLORS.textMuted,
  },
  facadeYol: {
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.bgDark,
    overflow: 'hidden',
  },
  roadLineHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '48%',
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  roadLineVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '48%',
    width: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  facadeYolText: {
    fontSize: 7.5,
    fontFamily: FONTS.bold,
    color: COLORS.white,
    backgroundColor: COLORS.bgMedium,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
    zIndex: 5,
    textAlign: 'center',
    borderColor: COLORS.cardBorder,
    borderWidth: 0.5,
  },
  dimHeightContainer: {
    position: 'absolute',
    left: 5,
    top: 95,
    height: 170,
    width: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dimWidthContainer: {
    position: 'absolute',
    left: 95,
    top: 340,
    width: 170,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dimText: {
    fontFamily: FONTS.medium,
    fontSize: 10,
    color: COLORS.textMuted,
  },
  centerBuildingBox: {
    position: 'absolute',
    left: 95,
    top: 95,
    width: 170,
    height: 170,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#D97706',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    zIndex: 10,
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  titleLabel: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: '#D97706',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  mainInfo: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 6,
    textAlign: 'center',
  },
  badge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 6,
  },
  badgeText: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: '#D97706',
  },
  subText: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: COLORS.textLight,
    marginBottom: 2,
  },
  subTextMuted: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  crosshair: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderColor: '#94A3B8'
  },
  chTopLeft: { top: 10, left: 10, borderTopWidth: 1.5, borderLeftWidth: 1.5 },
  chTopRight: { top: 10, right: 10, borderTopWidth: 1.5, borderRightWidth: 1.5 },
  chBottomLeft: { bottom: 10, left: 10, borderBottomWidth: 1.5, borderLeftWidth: 1.5 },
  chBottomRight: { bottom: 10, right: 10, borderBottomWidth: 1.5, borderRightWidth: 1.5 },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
  previewGlassCard: {
    padding: 16,
    alignItems: 'center',
  },
  previewCardTitle: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.textMuted,
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  optionsGrid: {
    width: '100%',
    gap: 8,
  },
  optionButton: {
    width: '100%',
    backgroundColor: COLORS.bgMedium,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 14,
    padding: 14,
    alignItems: 'flex-start',
  },
  optionButtonActive: {
    backgroundColor: 'rgba(253, 192, 16, 0.05)',
    borderColor: COLORS.primary,
  },
  optionButtonText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.textLight,
  },
  optionButtonTextActive: {
    color: COLORS.secondary,
  },
  optionButtonDesc: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  counterWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterSubLabel: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: COLORS.textMuted,
    letterSpacing: 1.2,
    marginBottom: 10,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  counterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  counterBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  counterValue: {
    fontFamily: FONTS.bold,
    fontSize: 28,
    color: '#1E293B',
    minWidth: 80,
    textAlign: 'center',
  },
  inlineInputWrapper: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: '100%',
  },
  inlineInputLabel: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  inlineTextInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: COLORS.textLight,
    fontFamily: FONTS.regular,
    width: '100%',
  },
  summaryScroll: {
    width: '100%',
    maxHeight: 180,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  summaryLabelText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: '#64748B',
  },
  summaryValueText: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: '#1E293B',
  },
  finalQuestionBox: {
    padding: 12,
    backgroundColor: 'rgba(253, 192, 16, 0.05)',
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
  },
  finalQuestionText: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.secondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  nextBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    width: '100%',
  },
  nextBtnText: {
    color: COLORS.secondary,
    fontFamily: FONTS.bold,
    fontSize: 16,
    marginRight: 8,
  },
  questionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
    width: '100%',
  },
  questionTitleText: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.textLight,
  },
  questionStepText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.primary,
  },
  questionProgressBarBg: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    marginBottom: 16,
    width: '100%',
  },
  questionProgressBarActive: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  questionSubtitleText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 20,
    marginBottom: 20,
    width: '100%',
  },
  controlsSection: {
    minHeight: 120,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  glow: {
    position: 'absolute',
    top: 200,
    right: -100,
    width: windowWidth * 0.7,
    height: windowWidth * 0.7,
    borderRadius: windowWidth * 0.35,
    backgroundColor: COLORS.primary,
    opacity: 0.03,
    blurRadius: 100,
  },
  headerSubtitleBox: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  headerSubtitleText: {
    fontFamily: FONTS.regular,
    fontSize: 11.5,
    color: COLORS.textMuted,
    lineHeight: 16,
  },
  centeredVisualizerWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 10,
  },
});
