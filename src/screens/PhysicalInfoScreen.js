import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Platform,
  TextInput,
  useWindowDimensions,
  Alert,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Dimensions,
  Animated,
  Easing
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  Plus,
  Minus,
  Copy,
  Check,
  Info,
  X,
  ChevronDown,
  Trash2,
  ArrowRight,
  Layers
} from 'lucide-react-native';
import { COLORS, FONTS, globalStyles } from '../styles/theme';
import Svg, { Polygon, Defs, LinearGradient as SvgLinearGradient, Stop, Rect } from 'react-native-svg';

const isSmallScreenFallback = false;
const { width } = Dimensions.get('window');

// Emojiler ve Renk İndikatörleri
const UNIT_METADATA = {
  daire: { label: 'Daire', color: '#1E293B', bg: '#FFFFFF' },
  dukkan: { label: 'Dükkan', color: '#78281F', bg: '#F5B041' },
  depo: { label: 'Depo', color: '#1E293B', bg: '#E2E8F0' },
  siginak: { label: 'Sığınak', color: '#1E293B', bg: '#E2E8F0' },
};

const getUnitDetails = (unit) => {
  if (typeof unit === 'object' && unit !== null) {
    return {
      type: unit.type || 'daire',
      name: unit.name || UNIT_METADATA[unit.type || 'daire']?.label || 'Daire',
      id: unit.id || `unit_${Math.random().toString(36).substr(2, 9)}`
    };
  }
  const type = unit || 'daire';
  return {
    type: type,
    name: UNIT_METADATA[type]?.label || 'Daire',
    id: `unit_${type}_${Math.random().toString(36).substr(2, 9)}`
  };
};

const ActiveHighlight = React.memo(() => {
  const pulseAnim = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.7,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.2,
          duration: 900,
          useNativeDriver: true,
        })
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0, bottom: 0, left: 0, right: 0,
        backgroundColor: 'rgba(99, 102, 241, 0.4)',
        borderRadius: 8,
        opacity: pulseAnim,
        zIndex: 10,
        pointerEvents: 'none',
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: Platform.OS === 'ios' ? 0.8 : 1,
        shadowRadius: 12,
        elevation: Platform.OS === 'android' ? 6 : 0,
      }}
    />
  );
});

export default function PhysicalInfoScreen({ data, updateData, onNext, onBack }) {
  const { width, height: screenHeight } = useWindowDimensions();
  const isSmallScreen = width < 410;
  const insets = useSafeAreaInsets();

  const isComplex = data.buildingType === 'complex';
  const isMulti = data.scopeType === 'multi_building';
  const count = data.buildingCount || 1;

  // Blok/Bina Anahtarları
  const blockKeys = useMemo(() => {
    if (!isComplex && !isMulti) {
      return [{ key: 'single', label: 'Bina' }];
    }
    const keys = [];
    for (let i = 0; i < count; i++) {
      const label = isComplex ? `${String.fromCharCode(65 + i)} Blok` : `${i + 1}. Bina`;
      const key = isComplex ? String.fromCharCode(65 + i) : `building_${i + 1}`;
      keys.push({ key, label });
    }
    return keys;
  }, [count, isComplex, isMulti]);

  // Questionnaire States
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [savedBlocks, setSavedBlocks] = useState({});
  const [currentQuestionStep, setCurrentQuestionStep] = useState(0);

  const [roofType, setRoofType] = useState('normal'); // 'normal', 'mansart', 'none'
  const [hasAttic, setAttic] = useState(false);
  const [contractorFlatCount, setContractorFlatCount] = useState(0);
  const [normalFloorCount, setNormalFloorCount] = useState(3);
  const [flatsPerFloor, setFlatsPerFloor] = useState({ 1: 2, 2: 2, 3: 2 });
  const [groundUnitCount, setGroundUnitCount] = useState(2);
  const [groundUnitTypes, setGroundUnitTypes] = useState({});
  const [basementCount, setBasementCount] = useState(0);
  const [basementTypes, setBasementTypes] = useState({});
  const [basementUnitCounts, setBasementUnitCounts] = useState({});
  const defaultSqm = data.width && data.depth ? Math.round(data.width * data.depth) : 120;
  const [footprintSqm, setFootprintSqm] = useState(defaultSqm);
  const [normalFloorSqm, setNormalFloorSqm] = useState(defaultSqm);

  // Restore state from previously saved data on mount or block change
  useEffect(() => {
    const activeKey = blockKeys[currentBlockIndex]?.key || 'single';
    const existingStructure = savedBlocks[activeKey] || data.buildingStructures?.[activeKey];
    if (existingStructure) {
      if (existingStructure.roofType) setRoofType(existingStructure.roofType);
      if (existingStructure.footprintSqm) setFootprintSqm(existingStructure.footprintSqm);
      if (existingStructure.normalFloorSqm) setNormalFloorSqm(existingStructure.normalFloorSqm);
      else if (existingStructure.averageSqm) {
        setFootprintSqm(existingStructure.averageSqm);
        setNormalFloorSqm(existingStructure.averageSqm);
      }

      const floors = existingStructure.floors || [];

      // Normal floors
      const normalFloors = floors.filter(f => f.type === 'normal');
      if (normalFloors.length > 0) {
        setNormalFloorCount(normalFloors.length);

        const restoredFlatsPerFloor = {};
        normalFloors.forEach(f => {
          const match = f.key.match(/normal_(\d+)/);
          if (match) {
            const idx = parseInt(match[1], 10);
            restoredFlatsPerFloor[idx] = f.units?.filter(u => getUnitDetails(u).type === 'daire').length || 2;
          }
        });
        setFlatsPerFloor(restoredFlatsPerFloor);

        const topNormalFloor = normalFloors.reduce((maxF, currentF) => {
          const currentIdx = parseInt(currentF.key.match(/normal_(\d+)/)?.[1] || '0', 10);
          const maxIdx = parseInt(maxF.key.match(/normal_(\d+)/)?.[1] || '0', 10);
          return currentIdx > maxIdx ? currentF : maxF;
        }, normalFloors[0]);
        if (topNormalFloor) {
          setAttic(!!topNormalFloor.hasAttic);
        }
      }

      // Ground floor
      const groundFloor = floors.find(f => f.type === 'ground');
      if (groundFloor) {
        const uTypes = {};
        groundFloor.units?.forEach((u, uIdx) => {
          uTypes[uIdx + 1] = getUnitDetails(u).type;
        });
        setGroundUnitTypes(uTypes);
        setGroundUnitCount(groundFloor.units?.length || 2);
      }

      // Basement floors
      const basementFloors = floors.filter(f => f.type === 'basement');
      if (basementFloors.length > 0) {
        setBasementCount(basementFloors.length);
        const bTypes = {};
        const bCounts = {};
        basementFloors.forEach(f => {
          const match = f.key.match(/basement_(\d+)/);
          if (match) {
            const idx = parseInt(match[1], 10);
            const firstUnit = f.units?.[0];
            bTypes[idx] = firstUnit ? getUnitDetails(firstUnit).type : 'depo';
            bCounts[idx] = f.units?.length || 1;
          }
        });
        setBasementTypes(bTypes);
        setBasementUnitCounts(bCounts);
      } else {
        setBasementCount(0);
      }
    } else {
       // Herhangi bir veri yoksa (yeni binaya geçiş yaptıysa) varsayılanlara sıfırla
       setRoofType('normal');
       setAttic(false);
       setNormalFloorCount(3);
       setFlatsPerFloor({ 1: 2, 2: 2, 3: 2 });
       setGroundUnitCount(2);
       setGroundUnitTypes({});
       setBasementCount(0);
       setBasementTypes({});
       setBasementUnitCounts({});
       setFootprintSqm(defaultSqm);
       setNormalFloorSqm(defaultSqm);
    }
  }, [currentBlockIndex, blockKeys, data.buildingStructures, savedBlocks]);

  // Sync flatsPerFloor keys dynamically with normalFloorCount
  useEffect(() => {
    setFlatsPerFloor(prev => {
      const updated = { ...prev };
      let changed = false;
      for (let i = 1; i <= normalFloorCount; i++) {
        if (updated[i] === undefined) {
          updated[i] = 2; // Default 2 flats per floor
          changed = true;
        }
      }
      return changed ? updated : prev;
    });
  }, [normalFloorCount]);

  // Sync groundUnitTypes dynamically with groundUnitCount
  useEffect(() => {
    setGroundUnitTypes(prev => {
      const updated = { ...prev };
      let changed = false;
      for (let i = 1; i <= groundUnitCount; i++) {
        if (updated[i] === undefined) {
          updated[i] = 'dukkan'; // default to dukkan
          changed = true;
        }
      }
      return changed ? updated : prev;
    });
  }, [groundUnitCount]);

  // Sync basementTypes & basementUnitCounts dynamically with basementCount
  useEffect(() => {
    setBasementTypes(prev => {
      const updated = { ...prev };
      let changed = false;
      for (let i = 1; i <= basementCount; i++) {
        if (updated[i] === undefined) {
          updated[i] = 'depo'; // default to depo
          changed = true;
        }
      }
      return changed ? updated : prev;
    });
    setBasementUnitCounts(prev => {
      const updated = { ...prev };
      let changed = false;
      for (let i = 1; i <= basementCount; i++) {
        if (updated[i] === undefined) {
          updated[i] = 1; // default to 1 unit
          changed = true;
        }
      }
      return changed ? updated : prev;
    });
  }, [basementCount]);

  // Compute dynamic floors representation for building preview
  const computedBlockData = useMemo(() => {
    const floors = [];

    // 1. Normal Floors (Top to Bottom)
    for (let i = normalFloorCount; i >= 1; i--) {
      const isTop = i === normalFloorCount;
      const units = [];
      const floorFlatsCount = flatsPerFloor[i] || 2;
      for (let u = 0; u < floorFlatsCount; u++) {
        units.push({
          id: `daire_normal_${i}_${u}`,
          type: 'daire',
          name: 'Daire'
        });
      }
      floors.push({
        key: `normal_${i}`,
        label: `${i}. Kat`,
        type: 'normal',
        hasAttic: isTop ? hasAttic : false,
        units: units
      });
    }

    // 2. Ground Floor
    const groundUnits = [];
    for (let u = 0; u < groundUnitCount; u++) {
      const uType = groundUnitTypes[u + 1] || 'dukkan';
      groundUnits.push({
        id: `ground_${u}`,
        type: uType,
        name: uType === 'dukkan' ? 'Dükkan' : 'Daire'
      });
    }
    floors.push({
      key: 'ground',
      label: 'Zemin Kat',
      type: 'ground',
      units: groundUnits
    });

    // 3. Basement Floors
    for (let i = 1; i <= basementCount; i++) {
      const basementUnits = [];
      const bType = basementTypes[i] || 'depo';
      const bUnitCount = basementUnitCounts[i] || 1;
      for (let u = 0; u < bUnitCount; u++) {
        basementUnits.push({
          id: `basement_${i}_${u}`,
          type: bType,
          name: bType === 'depo' ? 'Depo' : 'Sığınak'
        });
      }
      floors.push({
        key: `basement_${i}`,
        label: `${i}. Bodrum Kat`,
        type: 'basement',
        units: basementUnits
      });
    }

    return {
      roofType: roofType,
      footprintSqm: footprintSqm,
      normalFloorSqm: normalFloorSqm,
      floors: floors
    };
  }, [
    roofType,
    hasAttic,
    normalFloorCount,
    flatsPerFloor,
    groundUnitCount,
    groundUnitTypes,
    basementCount,
    basementTypes,
    basementUnitCounts,
    footprintSqm,
    normalFloorSqm
  ]);

  // Step definition array
  const STEPS = useMemo(() => {
    const steps = [
      {
        title: 'Kat Sayısı',
        question: 'Binanızda zemin katın üstünde kaç kat bulunmaktadır?',
        key: 'normalFloorCount'
      }
    ];

    // Oturum Alanı
    steps.push({
      title: 'Zemin Oturumu (Taban Alanı)',
      question: 'Mevcut binanızın tabanı arsada tahmini kaç m² yer kaplıyor?',
      key: 'footprintSqm'
    });

    // Normal Kat Alanı
    steps.push({
      title: 'Normal Kat Büyüklüğü',
      question: 'Zemin katın üstündeki normal bir kat toplamda ortalama kaç m² büyüklüğünde?',
      key: 'normalFloorSqm'
    });

    // Dynamic steps for each normal floor from 1st to Nth floor
    for (let i = 1; i <= normalFloorCount; i++) {
      steps.push({
        title: `${i}. Kat Daire Sayısı`,
        question: `${i}. normal katta toplam kaç daire bulunuyor?`,
        key: `floorFlatsCount_${i}`,
        floorIndex: i
      });
    }

    // Zemin Birim Sayısı
    steps.push({
      title: 'Zemin Birim Sayısı',
      question: 'Zemin katta toplam kaç adet bağımsız birim bulunmaktadır?',
      key: 'groundUnitCount'
    });

    // Dynamic ground unit type questions
    for (let i = 1; i <= groundUnitCount; i++) {
      steps.push({
        title: `Zemin ${i}. Birim Tipi`,
        question: `Zemin kattaki ${i}. bağımsız birimin kullanım amacı nedir?`,
        key: `groundUnitType_${i}`,
        groundUnitIndex: i
      });
    }

    // Bodrum Kat sayısı
    steps.push({
      title: 'Bodrum Kat',
      question: 'Binanızda bodrum kat bulunuyor mu? Varsa kaç adet?',
      key: 'basementCount'
    });

    // Dynamic basement floor usage questions
    for (let i = 1; i <= basementCount; i++) {
      steps.push({
        title: `${i}. Bodrum Kullanımı`,
        question: `${i}. bodrum kattaki birimlerin tipi nedir ve kaç adettir?`,
        key: `basementUsage_${i}`,
        basementIndex: i
      });
    }

    // Çatı Tipi
    steps.push({
      title: 'Çatı Tipi',
      question: 'Binanızın üst kısmındaki çatı yapısı nasıldır?',
      key: 'roofType'
    });

    // Çatı Piyesi (only if roofType is not none)
    if (roofType !== 'none') {
      steps.push({
        title: 'Çatı Piyesi',
        question: 'En üst katın çatı boşluğunda dubleks daire (çatı piyesi) var mı?',
        key: 'hasAttic'
      });
    }

    // Müteahhit Daire Sayısı
    steps.push({
      title: 'Müteahhit Payı',
      question: 'Bu binada müteahhite verilecek (kalacak) toplam daire sayısı nedir?',
      key: 'contractorFlatCount'
    });

    // Onay ve Kontrol
    steps.push({
      title: 'Onay ve Kontrol',
      question: 'Oluşturduğunuz bina modeli aşağıdaki gibidir. Onaylıyor musunuz?',
      key: 'confirmation'
    });

    return steps;
  }, [normalFloorCount, groundUnitCount, basementCount, roofType]);

  // Navigation handlers for sub-steps
  const jumpToStepByKey = (stepKey) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const index = STEPS.findIndex(s => s.key === stepKey);
    if (index !== -1) {
      setCurrentQuestionStep(index);
    }
  };

  const handleNextSubStep = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = currentQuestionStep + 1;
    if (next < STEPS.length) {
      setCurrentQuestionStep(next);
    }
  };

  const handleBackSubStep = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const prev = currentQuestionStep - 1;
    if (prev >= 0) {
      setCurrentQuestionStep(prev);
    } else {
      if (currentBlockIndex > 0) {
        // Önceki binaya dön
        setCurrentBlockIndex(currentBlockIndex - 1);
        setCurrentQuestionStep(0); // Önceki binanın ilk sorusundan (veya son sorusundan) başlat
      } else {
        onBack(); // Go back to the previous screen of the main wizard
      }
    }
  };

  const handleConfirmSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Build the final structures block matching computedBlockData
    const singleStructure = {
      roofType: roofType,
      footprintSqm: footprintSqm,
      normalFloorSqm: normalFloorSqm,
      averageSqm: normalFloorSqm, // Geriye dönük uyumluluk için
      contractorFlatCount: contractorFlatCount,
      floors: computedBlockData.floors
    };

    const activeKey = blockKeys[currentBlockIndex]?.key || 'single';
    
    // O anki bloğu savedBlocks state'ine kaydet
    const updatedSavedBlocks = {
      ...savedBlocks,
      [activeKey]: singleStructure
    };
    setSavedBlocks(updatedSavedBlocks);

    // Eğer sırada başka blok/bina varsa ona geç
    if (currentBlockIndex < blockKeys.length - 1) {
      setCurrentBlockIndex(currentBlockIndex + 1);
      setCurrentQuestionStep(0); // Yeni blok için ilk sorudan başlat
      return;
    }

    // Eğer tüm bloklar/binalar bittiyse tüm verileri ana state'e kaydet
    const finalBlocksData = updatedSavedBlocks;

    const finalFloors = {};
    const finalFlats = {};
    const finalSqm = {};
    let hasAnyMansart = false;

    Object.keys(finalBlocksData).forEach(key => {
      const block = finalBlocksData[key];
      const normalFloorCountVal = block.floors.filter(f => f.type === 'normal').length;
      const roofCount = block.roofType === 'mansart' ? 1 : 0;
      if (block.roofType === 'mansart') {
        hasAnyMansart = true;
      }

      finalFloors[key] = normalFloorCountVal + roofCount;

      let flatCount = 0;
      block.floors.forEach(f => {
        flatCount += f.units.filter(u => getUnitDetails(u).type === 'daire').length;
      });
      finalFlats[key] = flatCount;

      finalSqm[key] = block.normalFloorSqm || block.averageSqm;
    });

    updateData({
      floors: finalFloors,
      flats: finalFlats,
      sqm: finalSqm,
      footprintSqm: footprintSqm,
      normalFloorSqm: normalFloorSqm,
      buildingStructures: finalBlocksData,
      isMansart: hasAnyMansart
    });

    onNext();
  };

  // Precompute unit numbering from bottom to top, skipping sığınak
  const unitNumbers = useMemo(() => {
    const bottomToTop = [...computedBlockData.floors].reverse();
    let counter = 1;
    const mapping = {};
    bottomToTop.forEach(floor => {
      floor.units.forEach((unit, uIdx) => {
        const { type } = getUnitDetails(unit);
        if (type !== 'siginak') {
          mapping[`${floor.key}_${uIdx}`] = counter++;
        }
      });
    });
    return mapping;
  }, [computedBlockData.floors]);

  // Layout calculations for preview container (fits in 170px available height)
  const numFloors = computedBlockData.floors.length;
  const layoutMath = useMemo(() => {
    const availableBuildingHeight = 175;
    const computedHeight = availableBuildingHeight / (numFloors + 0.75);
    const baseFloorHeight = Math.max(20, Math.min(40, computedHeight));

    return {
      baseFloorHeight,
      rowPaddingVertical: Math.max(1, Math.min(3, baseFloorHeight * 0.08)),
      cardPaddingVertical: Math.max(1, Math.min(2, baseFloorHeight * 0.04)),
      unitTextSize: Math.max(5, Math.min(7, baseFloorHeight * 0.12)),
      unitNoTextSize: Math.max(6, Math.min(8, baseFloorHeight * 0.15)),
      labelTextSize: Math.max(5.5, Math.min(7.5, baseFloorHeight * 0.13)),
      roofHeight: Math.max(18, Math.min(35, baseFloorHeight * 0.75))
    };
  }, [numFloors]);

  const {
    baseFloorHeight,
    rowPaddingVertical,
    cardPaddingVertical,
    unitTextSize,
    unitNoTextSize,
    labelTextSize,
    roofHeight
  } = layoutMath;

  const renderFloorLabel = (floor) => {
    const isBasement = floor.type === 'basement';
    const isGround = floor.type === 'ground';

    let mainText = '';
    let subText = '';

    if (floor.type === 'ground') {
      mainText = 'Z';
      subText = 'Zemin';
    } else if (floor.type === 'basement') {
      const match = floor.label.match(/\d+/);
      mainText = match ? `B${match[0]}` : 'B1';
      subText = 'Bodrum';
    } else {
      const match = floor.label.match(/\d+/);
      mainText = match ? match[0] : floor.label;
      subText = 'Kat';
    }

    let mainColor = '#1E293B';
    let subColor = '#64748B';
    let badgeBg = 'rgba(59, 130, 246, 0.06)';
    let borderColor = 'rgba(59, 130, 246, 0.12)';

    if (isGround) {
      mainColor = '#D97706';
      subColor = '#B45309';
      badgeBg = 'rgba(245, 158, 11, 0.06)';
      borderColor = 'rgba(245, 158, 11, 0.12)';
    } else if (isBasement) {
      mainColor = '#475569';
      subColor = '#64748B';
      badgeBg = 'rgba(100, 116, 139, 0.06)';
      borderColor = 'rgba(100, 116, 139, 0.12)';
    }

    return (
      <View style={[
        styles.floorLabelBadge,
        {
          backgroundColor: badgeBg,
          borderColor: borderColor,
          paddingVertical: Math.max(1, baseFloorHeight * 0.05)
        }
      ]}>
        <Text style={[styles.floorLabelMainText, { color: mainColor, fontSize: Math.max(9, Math.min(12, baseFloorHeight * 0.22)) }]}>
          {mainText}
        </Text>
        <Text style={[styles.floorLabelSubText, { color: subColor, fontSize: Math.max(5.5, Math.min(7.5, baseFloorHeight * 0.13)) }]}>
          {subText.toUpperCase()}
        </Text>
      </View>
    );
  };

  const renderUnitCard = (unit, unitNum, floorKey, unitIndex) => {
    const details = getUnitDetails(unit);
    const { type: unitType, id: unitId } = details;

    if (unitType === 'siginak') {
      return (
        <View key={unitId || `${floorKey}_${unitIndex}`} style={[styles.unitCard, { paddingVertical: cardPaddingVertical }]}>
          <Text style={[styles.unitCardType, { fontSize: unitTextSize }]} numberOfLines={1}>SIĞINAK</Text>
        </View>
      );
    }

    const typeLabels = {
      daire: 'DAİRE',
      dukkan: 'DÜKKAN',
      depo: 'DEPO',
    };

    return (
      <View key={unitId || `${floorKey}_${unitIndex}`} style={[styles.unitCard, { paddingVertical: cardPaddingVertical }]}>
        <Text style={[styles.unitCardType, { fontSize: unitTextSize }]} numberOfLines={1}>{typeLabels[unitType] || 'DAİRE'}</Text>
        <Text style={[styles.unitCardNo, { fontSize: unitNoTextSize, marginTop: Math.max(0, baseFloorHeight * 0.02) }]} numberOfLines={1}>No {unitNum}</Text>
      </View>
    );
  };

  // Rendering custom input controls based on active sub-step
  const renderQuestionControls = () => {
    const activeStep = STEPS[currentQuestionStep];
    if (!activeStep) return null;

    if (activeStep.floorIndex !== undefined) {
      const floorIdx = activeStep.floorIndex;
      const val = flatsPerFloor[floorIdx] || 2;
      return (
        <View style={styles.counterWrapper}>
          <Text style={styles.counterSubLabel}>DAİRE SAYISI</Text>
          <View style={styles.counterControls}>
            <TouchableOpacity
              style={styles.counterBtn}
              onPress={() => {
                setFlatsPerFloor(prev => ({
                  ...prev,
                  [floorIdx]: Math.max(1, (prev[floorIdx] || 2) - 1)
                }));
              }}
            >
              <Minus size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.counterValue}>{val}</Text>
            <TouchableOpacity
              style={styles.counterBtn}
              onPress={() => {
                setFlatsPerFloor(prev => ({
                  ...prev,
                  [floorIdx]: Math.min(8, (prev[floorIdx] || 2) + 1)
                }));
              }}
            >
              <Plus size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (activeStep.groundUnitIndex !== undefined) {
      const gIdx = activeStep.groundUnitIndex;
      const val = groundUnitTypes[gIdx] || 'dukkan';
      return (
        <View style={styles.optionsRow}>
          {[
            { value: 'dukkan', label: 'Dükkan', desc: 'Ticari dükkan/mağaza' },
            { value: 'daire', label: 'Konut / Daire', desc: 'Konut giriş / daire' }
          ].map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.optionButtonHalf,
                val === opt.value && styles.optionButtonActive
              ]}
              onPress={() => {
                setGroundUnitTypes(prev => ({
                  ...prev,
                  [gIdx]: opt.value
                }));
              }}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.optionButtonText,
                val === opt.value && styles.optionButtonTextActive
              ]}>
                {opt.label}
              </Text>
              <Text style={styles.optionButtonDesc}>{opt.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      );
    }

    if (activeStep.basementIndex !== undefined) {
      const bIdx = activeStep.basementIndex;
      const bType = basementTypes[bIdx] || 'depo';
      const bUnitCount = basementUnitCounts[bIdx] || 1;
      return (
        <View style={styles.basementStepContainer}>
          <Text style={styles.subQuestionLabel}>{bIdx}. Bodrum Birim Tipi:</Text>
          <View style={styles.optionsRowSmall}>
            {[
              { type: 'depo', label: 'Depo / Kömürlük' },
              { type: 'siginak', label: 'Ortak Sığınak' }
            ].map(opt => (
              <TouchableOpacity
                key={opt.type}
                style={[
                  styles.optionButtonHalfSmall,
                  bType === opt.type && styles.optionButtonActive
                ]}
                onPress={() => {
                  setBasementTypes(prev => ({
                    ...prev,
                    [bIdx]: opt.type
                  }));
                }}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.optionButtonTextSmall,
                  bType === opt.type && styles.optionButtonTextActive
                ]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.subQuestionLabel, { marginTop: 12 }]}>{bIdx}. Bodrum Birim Sayısı:</Text>
          <View style={styles.counterControlsSmall}>
            <TouchableOpacity
              style={styles.counterBtnSmall}
              onPress={() => {
                setBasementUnitCounts(prev => ({
                  ...prev,
                  [bIdx]: Math.max(1, (prev[bIdx] || 1) - 1)
                }));
              }}
            >
              <Minus size={14} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.counterValueSmall}>{bUnitCount}</Text>
            <TouchableOpacity
              style={styles.counterBtnSmall}
              onPress={() => {
                setBasementUnitCounts(prev => ({
                  ...prev,
                  [bIdx]: Math.min(5, (prev[bIdx] || 1) + 1)
                }));
              }}
            >
              <Plus size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    switch (activeStep.key) {
      case 'normalFloorCount':
        return (
          <View style={styles.counterWrapper}>
            <Text style={styles.counterSubLabel}>NORMAL KAT SAYISI</Text>
            <View style={styles.counterControls}>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => setNormalFloorCount(prev => Math.max(1, prev - 1))}
              >
                <Minus size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.counterValue}>{normalFloorCount}</Text>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => setNormalFloorCount(prev => Math.min(20, prev + 1))}
              >
                <Plus size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'footprintSqm':
        return (
          <View style={styles.counterWrapper}>
            <Text style={styles.counterSubLabel}>ZEMİN OTURUMU (m²)</Text>
            <View style={styles.counterControls}>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFootprintSqm(prev => Math.max(20, prev - 5)); }}
              >
                <Minus size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.counterValue}>{footprintSqm} m²</Text>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFootprintSqm(prev => Math.min(2000, prev + 5)); }}
              >
                <Plus size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'normalFloorSqm':
        return (
          <View style={styles.counterWrapper}>
            <Text style={styles.counterSubLabel}>ORTALAMA NORMAL KAT (m²)</Text>
            <View style={styles.counterControls}>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setNormalFloorSqm(prev => Math.max(20, prev - 5)); }}
              >
                <Minus size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.counterValue}>{normalFloorSqm} m²</Text>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setNormalFloorSqm(prev => Math.min(2000, prev + 5)); }}
              >
                <Plus size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'groundUnitCount':
        return (
          <View style={styles.counterWrapper}>
            <Text style={styles.counterSubLabel}>ZEMİN BİRİM SAYISI</Text>
            <View style={styles.counterControls}>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => setGroundUnitCount(prev => Math.max(1, prev - 1))}
              >
                <Minus size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.counterValue}>{groundUnitCount}</Text>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => setGroundUnitCount(prev => Math.min(8, prev + 1))}
              >
                <Plus size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'basementCount':
        return (
          <View style={styles.counterWrapper}>
            <Text style={styles.counterSubLabel}>BODRUM KAT SAYISI</Text>
            <View style={styles.counterControls}>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => setBasementCount(prev => Math.max(0, prev - 1))}
              >
                <Minus size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.counterValue}>{basementCount}</Text>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => setBasementCount(prev => Math.min(5, prev + 1))}
              >
                <Plus size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'roofType':
        return (
          <View style={styles.optionsGrid}>
            {[
              { type: 'normal', label: 'Normal Çatı', desc: 'Klasik üçgen çatı yapısı' },
              { type: 'mansart', label: 'Mansart Çatı', desc: 'Kırıklı, pencereli çatı' },
              { type: 'none', label: 'Çatı Yok', desc: 'Teras veya düz çatı' }
            ].map(opt => (
              <TouchableOpacity
                key={opt.type}
                style={[
                  styles.optionButton,
                  roofType === opt.type && styles.optionButtonActive
                ]}
                onPress={() => setRoofType(opt.type)}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.optionButtonText,
                  roofType === opt.type && styles.optionButtonTextActive
                ]}>
                  {opt.label}
                </Text>
                <Text style={styles.optionButtonDesc}>{opt.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'hasAttic':
        return (
          <View style={styles.optionsRow}>
            {[
              { value: true, label: 'Evet, Var', desc: 'Dubleks daire mevcut' },
              { value: false, label: 'Hayır, Yok', desc: 'Düz kat tavanı' }
            ].map(opt => (
              <TouchableOpacity
                key={opt.value.toString()}
                style={[
                  styles.optionButtonHalf,
                  hasAttic === opt.value && styles.optionButtonActive
                ]}
                onPress={() => setAttic(opt.value)}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.optionButtonText,
                  hasAttic === opt.value && styles.optionButtonTextActive
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
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setContractorFlatCount(prev => Math.max(0, prev - 1)); }}
              >
                <Minus size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.counterValue}>{contractorFlatCount}</Text>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setContractorFlatCount(prev => Math.min(100, prev + 1)); }}
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
                <Text style={styles.summaryLabelText}>Çatı Yapısı:</Text>
                <Text style={styles.summaryValueText}>
                  {roofType === 'none' ? 'Çatı Yok' : (roofType === 'mansart' ? 'Mansart Çatı' : 'Normal Çatı')}
                  {hasAttic && roofType !== 'none' ? ' (Çatı Piyesli/Dubleks)' : ''}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabelText}>Müteahhit Payı:</Text>
                <Text style={styles.summaryValueText}>{contractorFlatCount} Daire</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabelText}>Normal Kat Sayısı:</Text>
                <Text style={styles.summaryValueText}>{normalFloorCount} Kat</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabelText}>Zemin Oturumu:</Text>
                <Text style={styles.summaryValueText}>{footprintSqm} m²</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabelText}>Normal Kat Büyüklüğü:</Text>
                <Text style={styles.summaryValueText}>{normalFloorSqm} m²</Text>
              </View>
              <View style={[styles.summaryItem, { flexDirection: 'column', alignItems: 'flex-start' }]}>
                <Text style={styles.summaryLabelText}>Zemin Kat Yapısı:</Text>
                {Array.from({ length: groundUnitCount }).map((_, idx) => {
                  const type = groundUnitTypes[idx + 1] || 'dukkan';
                  return (
                    <Text key={idx} style={[styles.summaryValueText, { marginLeft: 8, marginTop: 2 }]}>
                      • {idx + 1}. Bağımsız Birim: {type === 'dukkan' ? 'Dükkan' : 'Daire'}
                    </Text>
                  );
                })}
              </View>
              {basementCount > 0 && (
                <View style={[styles.summaryItem, { flexDirection: 'column', alignItems: 'flex-start' }]}>
                  <Text style={styles.summaryLabelText}>Bodrum Katlar:</Text>
                  {Array.from({ length: basementCount }).map((_, idx) => {
                    const floorNum = idx + 1;
                    const bType = basementTypes[floorNum] || 'depo';
                    const bUnitCount = basementUnitCounts[floorNum] || 1;
                    return (
                      <Text key={idx} style={[styles.summaryValueText, { marginLeft: 8, marginTop: 2 }]}>
                        • {floorNum}. Bodrum Kat: {bUnitCount} Adet {bType === 'depo' ? 'Depo' : 'Sığınak'}
                      </Text>
                    );
                  })}
                </View>
              )}
            </View>
          </ScrollView>
        );

      default:
        return null;
    }
  };

  const activeStep = STEPS[currentQuestionStep];
  const isRoofActive = activeStep?.key === 'roofType' || activeStep?.key === 'hasAttic';
  const isGroundActive = activeStep?.key === 'groundUnitCount' || activeStep?.groundUnitIndex !== undefined;
  const isBasementActive = (idx) => activeStep?.basementIndex === idx;
  const isNormalFloorActive = (idx) => activeStep?.floorIndex === idx;

  return (
    <KeyboardAvoidingView
      style={globalStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={{ flex: 1 }}>
        <View style={styles.glow} />

        {/* FIXED HEADER at the top */}
        <View style={{ paddingTop: Math.max(12, insets.top + 8), paddingHorizontal: 20 }}>
          {/* Geri Butonu */}
          <TouchableOpacity style={styles.backBtn} onPress={handleBackSubStep}>
            <ArrowLeft size={20} color={COLORS.textLight} />
            <Text style={styles.backBtnText}>Geri</Text>
          </TouchableOpacity>

          {/* Stepper showing global wizard progress (Stage 2: Building Design) */}
          <View style={[globalStyles.stepperContainer, { marginBottom: 10 }]}>
            <View style={[globalStyles.stepIndicator, globalStyles.stepIndicatorCompleted]} />
            <View style={[globalStyles.stepIndicator, globalStyles.stepIndicatorActive]} />
            {Array.from({ length: 8 }).map((_, i) => (
              <View key={i} style={globalStyles.stepIndicator} />
            ))}
          </View>
        </View>

        {/* Main Content inside ScrollView */}
        <ScrollView
          contentContainerStyle={[
            globalStyles.scrollContainer,
            { paddingTop: 10, paddingBottom: 40 }
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ flex: 1, gap: 16 }}>

            {/* 1. BİNA ÖNİZLEME KARTI */}
            <View style={[globalStyles.glassCard, styles.previewGlassCard]}>
              <Text style={styles.previewCardTitle}>
                {blockKeys.length > 1 ? `${blockKeys[currentBlockIndex]?.label.toUpperCase()} MODEL ÖNİZLEME` : 'BİNA MODELİ ÖNİZLEME'}
              </Text>

              <View style={styles.buildingWrapper}>
                {/* Çatı */}
                {roofType === 'mansart' ? (
                  <TouchableOpacity activeOpacity={0.9} onPress={() => jumpToStepByKey('roofType')} style={[styles.roofWrapper, { height: roofHeight, zIndex: isRoofActive ? 20 : 1 }]}>
                    {isRoofActive && <ActiveHighlight />}
                    <Svg height={roofHeight} width={220} viewBox={`0 0 280 ${roofHeight * (280 / 220)}`}>
                      <Defs>
                        <SvgLinearGradient id="mansartRoofGrad" x1="0" y1="0" x2="0" y2="1">
                          <Stop offset="0" stopColor="#334155" stopOpacity="1" />
                          <Stop offset="1" stopColor="#0F172A" stopOpacity="1" />
                        </SvgLinearGradient>
                        <SvgLinearGradient id="eavesGrad" x1="0" y1="0" x2="1" y2="0">
                          <Stop offset="0" stopColor="#D97706" stopOpacity="1" />
                          <Stop offset="1" stopColor="#B45309" stopOpacity="1" />
                        </SvgLinearGradient>
                      </Defs>
                      <Polygon
                        points={`25,0 255,0 280,${roofHeight * (280 / 220)} 0,${roofHeight * (280 / 220)}`}
                        fill="url(#mansartRoofGrad)"
                      />
                      <Rect x="0" y={roofHeight * (280 / 220) - 4} width="280" height="4" rx="2" fill="url(#eavesGrad)" />
                    </Svg>
                    <View style={[styles.roofTextCapsule, { marginBottom: Math.max(1, roofHeight * 0.12) }]}>
                      <Text style={[styles.roofTextCapsuleText, { fontSize: Math.max(6.5, Math.min(10, roofHeight * 0.22)) }]}>
                        MANSART
                      </Text>
                    </View>
                  </TouchableOpacity>
                ) : roofType === 'normal' ? (
                  <TouchableOpacity activeOpacity={0.9} onPress={() => jumpToStepByKey('roofType')} style={[styles.roofWrapper, { height: roofHeight, zIndex: isRoofActive ? 20 : 1 }]}>
                    {isRoofActive && <ActiveHighlight />}
                    <Svg height={roofHeight} width={220} viewBox={`0 0 280 ${roofHeight * (280 / 220)}`}>
                      <Defs>
                        <SvgLinearGradient id="normalRoofGrad" x1="0" y1="0" x2="0" y2="1">
                          <Stop offset="0" stopColor="#3E4F66" stopOpacity="1" />
                          <Stop offset="1" stopColor="#1E293B" stopOpacity="1" />
                        </SvgLinearGradient>
                        <SvgLinearGradient id="eavesGrad" x1="0" y1="0" x2="1" y2="0">
                          <Stop offset="0" stopColor="#D97706" stopOpacity="1" />
                          <Stop offset="1" stopColor="#B45309" stopOpacity="1" />
                        </SvgLinearGradient>
                      </Defs>
                      <Polygon
                        points={`0,${roofHeight * (280 / 220)} 140,0 280,${roofHeight * (280 / 220)}`}
                        fill="url(#normalRoofGrad)"
                      />
                      {hasAttic && (
                        <>
                          <Polygon points={`85,${roofHeight * (280 / 220) * 0.75} 100,${roofHeight * (280 / 220) * 0.5} 115,${roofHeight * (280 / 220) * 0.75}`} fill="#475569" opacity="0.6" />
                          <Polygon points={`89,${roofHeight * (280 / 220) * 0.73} 100,${roofHeight * (280 / 220) * 0.54} 111,${roofHeight * (280 / 220) * 0.73}`} fill="#7DD3FC" opacity="0.8" />
                          <Polygon points={`165,${roofHeight * (280 / 220) * 0.75} 180,${roofHeight * (280 / 220) * 0.5} 195,${roofHeight * (280 / 220) * 0.75}`} fill="#475569" opacity="0.6" />
                          <Polygon points={`169,${roofHeight * (280 / 220) * 0.73} 180,${roofHeight * (280 / 220) * 0.54} 191,${roofHeight * (280 / 220) * 0.73}`} fill="#7DD3FC" opacity="0.8" />
                        </>
                      )}
                      <Rect x="0" y={roofHeight * (280 / 220) - 4} width="280" height="4" rx="2" fill="url(#eavesGrad)" />
                    </Svg>
                    <View style={[styles.roofTextCapsule, { marginBottom: Math.max(1, roofHeight * 0.12) }]}>
                      <Text style={[styles.roofTextCapsuleText, { fontSize: Math.max(6.5, Math.min(10, roofHeight * 0.22)) }]}>
                        {hasAttic ? 'ÇATI PİYESLİ' : 'NORMAL ÇATI'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ) : null}

                {hasAttic && roofType !== 'none' && (
                  <View style={[styles.duplexConnectionsContainer, { top: roofHeight - 8, width: 90 }]}>
                    <View style={styles.dashedVerticalLine} />
                    <View style={styles.dashedVerticalLine} />
                  </View>
                )}

                {/* Katlar taşıyıcı blok */}
                <View style={[styles.floorsContainer, { width: 230, paddingBottom: 4, paddingTop: 4 }]}>
                  {computedBlockData.floors.map((floor) => {
                    const isBasement = floor.type === 'basement';
                    const isGround = floor.type === 'ground';

                    return (
                      <TouchableOpacity
                        key={floor.key}
                        activeOpacity={0.9}
                        onPress={() => {
                          if (isBasement) {
                            const match = floor.key.match(/basement_(\d+)/);
                            if (match) jumpToStepByKey(`basementUsage_${match[1]}`);
                          } else if (isGround) {
                            jumpToStepByKey('groundUnitCount');
                          } else if (floor.type === 'normal') {
                            const match = floor.key.match(/normal_(\d+)/);
                            if (match) jumpToStepByKey(`floorFlatsCount_${match[1]}`);
                          }
                        }}
                        style={[
                          styles.floorRow,
                          isBasement && styles.floorRowBasement,
                          isGround && styles.floorRowGround,
                          floor.type === 'normal' && styles.floorRowNormal,
                          {
                            height: baseFloorHeight,
                            minHeight: baseFloorHeight,
                            paddingVertical: rowPaddingVertical,
                            marginVertical: Math.max(1, Math.min(3, baseFloorHeight * 0.05)),
                            paddingHorizontal: 4,
                            borderRadius: 6,
                            position: 'relative',
                            zIndex: ((isBasement && isBasementActive(parseInt(floor.key.split('_')[1] || '0', 10))) || (isGround && isGroundActive) || (floor.type === 'normal' && isNormalFloorActive(parseInt(floor.key.split('_')[1] || '0', 10)))) ? 20 : 1
                          }
                        ]}
                      >
                        {((isBasement && isBasementActive(parseInt(floor.key.split('_')[1] || '0', 10))) ||
                         (isGround && isGroundActive) ||
                         (floor.type === 'normal' && isNormalFloorActive(parseInt(floor.key.split('_')[1] || '0', 10)))) && (
                           <ActiveHighlight />
                         )}
                        <View style={[styles.floorLabelColumn, { width: 44, marginRight: 4 }]}>
                          {renderFloorLabel(floor)}
                        </View>

                        <View style={styles.unitCardsContainer}>
                          {floor.units.map((unit, uIdx) => {
                            const unitNum = unitNumbers[`${floor.key}_${uIdx}`] || (uIdx + 1);
                            return renderUnitCard(unit, unitNum, floor.key, uIdx);
                          })}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* 2. SORU/CEVAP KARTI (DİĞER AŞAMALARLA AYNI ARAYÜZ) */}
            <View style={globalStyles.glassCard}>
              <Text style={styles.stepTitle}>
                {blockKeys.length > 1 ? `${blockKeys[currentBlockIndex]?.label.toUpperCase()} TASARIMI` : 'BİNA TASARIMI'}
              </Text>

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


              {/* Devam Et / İleri Butonu */}
              <TouchableOpacity
                style={styles.nextBtn}
                onPress={currentQuestionStep === STEPS.length - 1 ? handleConfirmSave : handleNextSubStep}
                activeOpacity={0.8}
              >
                <Text style={styles.nextBtnText}>
                  {currentQuestionStep === STEPS.length - 1 ? 'Evet, Birebir Aynı (Devam Et)' : 'Devam Et'}
                </Text>
                <ArrowRight size={20} color={COLORS.secondary} />
              </TouchableOpacity>
            </View>

          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: 'rgba(253, 192, 16, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
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
  buildingWrapper: {
    alignItems: 'center',
    width: '100%',
  },
  roofWrapper: {
    width: 220,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  roofTextCapsule: {
    position: 'absolute',
    bottom: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
    zIndex: 20,
  },
  roofTextCapsuleText: {
    fontFamily: FONTS.bold,
    color: '#1E293B',
  },
  floorsContainer: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderColor: '#CBD5E1',
    borderRadius: 2,
  },
  floorRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    overflow: 'hidden',
  },
  floorRowBasement: {
    backgroundColor: '#FCFDFE',
    borderLeftWidth: 4,
    borderLeftColor: '#64748B',
  },
  floorRowGround: {
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  floorRowNormal: {
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  floorLabelColumn: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  floorLabelBadge: {
    borderRadius: 4,
    paddingHorizontal: 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  floorLabelMainText: {
    fontFamily: FONTS.bold,
    textAlign: 'center',
    lineHeight: 11,
  },
  floorLabelSubText: {
    fontFamily: FONTS.bold,
    textAlign: 'center',
    lineHeight: 8,
    letterSpacing: 0.2,
  },
  unitCardsContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'center',
    gap: 2,
  },
  unitCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 4,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  unitCardType: {
    fontFamily: FONTS.bold,
    color: '#64748B',
    letterSpacing: 0.1,
  },
  unitCardNo: {
    fontFamily: FONTS.bold,
    color: '#1E293B',
  },
  duplexConnectionsContainer: {
    position: 'absolute',
    height: 12,
    flexDirection: 'row',
    justifyContent: 'space-around',
    zIndex: 15,
  },
  dashedVerticalLine: {
    width: 0,
    height: '100%',
    borderLeftWidth: 1.2,
    borderColor: '#F59E0B',
    borderStyle: 'dashed',
  },

  // QUESTIONNAIRE STYLING
  controlsSection: {
    minHeight: 120,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  optionsGrid: {
    width: '100%',
    gap: 8,
  },
  optionsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
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
  optionButtonHalf: {
    flex: 1,
    backgroundColor: COLORS.bgMedium,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
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
  questionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
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
  basementStepContainer: {
    width: '100%',
    alignItems: 'flex-start',
  },
  subQuestionLabel: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: '#475569',
    marginBottom: 4,
  },
  optionsRowSmall: {
    flexDirection: 'row',
    width: '100%',
    gap: 6,
  },
  optionButtonHalfSmall: {
    flex: 1,
    backgroundColor: COLORS.bgMedium,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  optionButtonTextSmall: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: '#475569',
  },
  counterControlsSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  counterBtnSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterValueSmall: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: '#1E293B',
    minWidth: 30,
    textAlign: 'center',
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
  },
  nextBtnText: {
    color: COLORS.secondary,
    fontFamily: FONTS.bold,
    fontSize: 16,
    marginRight: 8,
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
});
