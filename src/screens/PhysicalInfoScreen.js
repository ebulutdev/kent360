import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Alert
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
  Trash2
} from 'lucide-react-native';
import { COLORS, FONTS } from '../styles/theme';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Polygon, Defs, LinearGradient as SvgLinearGradient, Stop, Rect } from 'react-native-svg';

const isSmallScreenFallback = false;

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

  // Aktif Seçili Blok
  const [activeBlock, setActiveBlock] = useState(blockKeys[0]?.key || 'single');

  // Blok Yapısı Oluşturucu Fonksiyon
  const createInitialBlock = useCallback(() => ({
    roofType: 'piyes', // normal, mansart, piyes
    averageSqm: 120,
    floors: [
      { key: 'normal_3', label: '3. Kat', type: 'normal', units: ['daire', 'daire'] },
      { key: 'normal_2', label: '2. Kat', type: 'normal', units: ['daire', 'daire'] },
      { key: 'normal_1', label: '1. Kat', type: 'normal', units: ['daire', 'daire'] },
      { key: 'ground', label: 'Zemin Kat', type: 'ground', units: ['dukkan', 'daire'] },
    ]
  }), []);

  // Blok Verileri State'i
  const [blocksData, setBlocksData] = useState(() => {
    let rawData = data.buildingStructures;
    if (!rawData || Object.keys(rawData).length === 0) {
      const initial = {};
      if (!isComplex && !isMulti) {
        initial['single'] = {
          ...createInitialBlock(),
          roofType: data.isMansart ? 'mansart' : 'piyes'
        };
      } else {
        blockKeys.forEach(bk => {
          initial[bk.key] = {
            ...createInitialBlock(),
            roofType: data.isMansart ? 'mansart' : 'piyes'
          };
        });
      }
      rawData = initial;
    }

    // Sanitize blocks:
    // 1. Remove 'roof' floor items from floors list.
    // 2. Map old roofType === 'piyes' to roofType === 'normal' + top floor hasAttic === true.
    // 3. Ensure all units are objects with persistent unique IDs.
    const sanitized = {};
    Object.keys(rawData).forEach(key => {
      const block = rawData[key] || {};
      let updatedFloors = Array.isArray(block.floors) 
        ? block.floors.filter(f => f.type !== 'roof')
        : [];
      
      let roofType = block.roofType || 'normal';
      let hasAttic = false;

      if (roofType === 'piyes') {
        roofType = 'normal';
        hasAttic = true;
      }

      // Apply hasAttic to top normal floor if true
      if (updatedFloors.length > 0) {
        const topNormalIdx = updatedFloors.findIndex(f => f.type === 'normal');
        if (topNormalIdx >= 0) {
          updatedFloors[topNormalIdx] = {
            ...updatedFloors[topNormalIdx],
            hasAttic: hasAttic || updatedFloors[topNormalIdx].hasAttic || false
          };
        }
      }

      // Map units to objects with persistent IDs
      updatedFloors = updatedFloors.map(floor => ({
        ...floor,
        units: floor.units.map((unit, uIdx) => {
          const details = getUnitDetails(unit);
          return {
            id: details.id || `${floor.key}_${uIdx}_${Math.random().toString(36).substr(2, 9)}`,
            type: details.type,
            name: details.name
          };
        })
      }));

      sanitized[key] = {
        ...block,
        roofType,
        floors: updatedFloors
      };
    });

    return sanitized;
  });

  // Gelişmiş Kat Düzenleme Modali State'leri
  const [dropdownOpen, setDropdownOpen] = useState(false); // Floor Content Modal visibility
  const [activeFloorForKey, setActiveFloorForKey] = useState(null); // Key of the floor being edited
  const [editingUnitType, setEditingUnitType] = useState('daire'); // Selected type for the whole floor
  const [editingUnitCount, setEditingUnitCount] = useState(2); // Number of units for the whole floor
  const [editingHasAttic, setEditingHasAttic] = useState(false); // Attic / Çatı piyesi checkbox status
  const [activeDropdownOpen, setActiveDropdownOpen] = useState(false); // Controls type selector overlay modal

  // Onay Modalı Görünürlüğü
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);

  // Aktif Blok Verisi
  const activeBlockData = useMemo(() => {
    const block = blocksData[activeBlock];
    if (block && Array.isArray(block.floors)) {
      return block;
    }
    return createInitialBlock();
  }, [blocksData, activeBlock, createInitialBlock]);

  // Kat Ekleme Eylemi
  const handleAddFloor = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBlocksData(prev => {
      const currentBlock = prev[activeBlock] || createInitialBlock();
      const normalFloors = currentBlock.floors.filter(f => f.type === 'normal');
      const nextNum = normalFloors.length + 1;
      
      const newFloor = {
        key: `normal_${nextNum}`,
        label: `${nextNum}. Kat`,
        type: 'normal',
        units: [
          { id: `daire_${Date.now()}_1`, type: 'daire', name: 'Daire' },
          { id: `daire_${Date.now()}_2`, type: 'daire', name: 'Daire' }
        ]
      };

      const updatedFloors = [...currentBlock.floors];
      const insertIndex = updatedFloors.findIndex(f => f.type !== 'roof');
      updatedFloors.splice(insertIndex >= 0 ? insertIndex : 0, 0, newFloor);

      return {
        ...prev,
        [activeBlock]: {
          ...currentBlock,
          floors: updatedFloors
        }
      };
    });
  }, [activeBlock, createInitialBlock]);

  // Kat Çıkarma Eylemi
  const handleRemoveFloor = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBlocksData(prev => {
      const currentBlock = prev[activeBlock] || createInitialBlock();
      const normalFloors = currentBlock.floors.filter(f => f.type === 'normal');
      if (normalFloors.length <= 1) return prev; // En az 1 normal kat kalmalı

      const topNormalKey = normalFloors[0].key;
      const updatedFloors = currentBlock.floors.filter(f => f.key !== topNormalKey);

      return {
        ...prev,
        [activeBlock]: {
          ...currentBlock,
          floors: updatedFloors
        }
      };
    });
  }, [activeBlock, createInitialBlock]);

  // Bodrum Ekleme/Çıkarma Eylemi
  const handleAddRemoveBasement = useCallback((change) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBlocksData(prev => {
      const currentBlock = prev[activeBlock] || createInitialBlock();
      const basementFloors = currentBlock.floors.filter(f => f.type === 'basement');
      const updatedFloors = [...currentBlock.floors];
      
      if (change > 0) {
        const nextNum = basementFloors.length + 1;
        const newFloor = {
          key: `basement_${nextNum}`,
          label: `${nextNum}. Bodrum Kat`,
          type: 'basement',
          units: [
            { id: `depo_${Date.now()}_1`, type: 'depo', name: 'Depo' }
          ]
        };
        updatedFloors.push(newFloor);
      } else {
        if (basementFloors.length === 0) return prev;
        const bottomBasementKey = basementFloors[basementFloors.length - 1].key;
        const removeIndex = updatedFloors.findIndex(f => f.key === bottomBasementKey);
        if (removeIndex >= 0) {
          updatedFloors.splice(removeIndex, 1);
        }
      }
      
      return {
        ...prev,
        [activeBlock]: {
          ...currentBlock,
          floors: updatedFloors
        }
      };
    });
  }, [activeBlock, createInitialBlock]);

  // Çatı Tipi Değiştirme Eylemi
  const handleRoofTypeChange = useCallback((type) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBlocksData(prev => {
      const currentBlock = prev[activeBlock] || createInitialBlock();
      return {
        ...prev,
        [activeBlock]: {
          ...currentBlock,
          roofType: type
        }
      };
    });
  }, [activeBlock, createInitialBlock]);

  // Open floor modal with aggregated floor data
  const openFloorModal = (floorKey) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const floor = activeBlockData.floors.find(f => f.key === floorKey);
    if (floor) {
      setActiveFloorForKey(floorKey);
      const { type: unitType } = getUnitDetails(floor.units[0]);
      setEditingUnitType(unitType);
      setEditingUnitCount(floor.units.length);
      setEditingHasAttic(floor.hasAttic || false);
      setActiveDropdownOpen(false);
      setDropdownOpen(true);
    }
  };

  const handleSaveFloorContent = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newUnits = Array.from({ length: editingUnitCount }, (_, index) => ({
      id: `${editingUnitType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${index}`,
      type: editingUnitType,
      name: UNIT_METADATA[editingUnitType]?.label || 'Daire'
    }));

    setBlocksData(prev => {
      const currentBlock = prev[activeBlock] || createInitialBlock();
      const updatedFloors = currentBlock.floors.map(f => {
        if (f.key === activeFloorForKey) {
          return {
            ...f,
            units: newUnits,
            hasAttic: isTopFloor ? editingHasAttic : false
          };
        }
        return f;
      });
      return {
        ...prev,
        [activeBlock]: {
          ...currentBlock,
          floors: updatedFloors
        }
      };
    });
    setDropdownOpen(false);
  };

  const handleDeleteWholeFloor = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBlocksData(prev => {
      const currentBlock = prev[activeBlock] || createInitialBlock();
      const updatedFloors = currentBlock.floors.filter(f => f.key !== activeFloorForKey);
      return {
        ...prev,
        [activeBlock]: {
          ...currentBlock,
          floors: updatedFloors
        }
      };
    });
    setDropdownOpen(false);
  };

  // Ortalama m² Değiştirme Eylemi
  const handleSqmChange = useCallback((value) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBlocksData(prev => ({
      ...prev,
      [activeBlock]: {
        ...(prev[activeBlock] || createInitialBlock()),
        averageSqm: value
      }
    }));
  }, [activeBlock, createInitialBlock]);

  // Blok Yapısını Diğer Bloklara Kopyalama
  const handleCopyLayout = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBlocksData(prev => {
      const currentBlock = prev[activeBlock] || createInitialBlock();
      const nextBlocksData = { ...prev };
      Object.keys(nextBlocksData).forEach(key => {
        if (key !== activeBlock) {
          nextBlocksData[key] = {
            ...currentBlock,
            floors: currentBlock.floors.map(f => ({ ...f, units: [...f.units] }))
          };
        }
      });
      Alert.alert('Blok Tasarım Kopyalama', 'Tasarım yapısı diğer tüm bloklara kopyalandı!');
      return nextBlocksData;
    });
  }, [activeBlock, createInitialBlock]);

  // Sihirbaz Verisi Olarak Kaydetme Eylemi
  const handleConfirmSave = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const finalFloors = {};
    const finalFlats = {};
    const finalSqm = {};
    let hasAnyMansart = false;

    Object.keys(blocksData).forEach(key => {
      const block = blocksData[key] || createInitialBlock();
      const normalFloorCount = block.floors.filter(f => f.type === 'normal').length;
      const topNormal = block.floors.find(f => f.type === 'normal');
      const hasAttic = topNormal?.hasAttic || false;
      const roofCount = block.roofType === 'mansart' ? 1 : 0;
      if (block.roofType === 'mansart') {
        hasAnyMansart = true;
      }
      
      finalFloors[key] = normalFloorCount + roofCount;

      let flatCount = 0;
      block.floors.forEach(f => {
        flatCount += f.units.filter(u => getUnitDetails(u).type === 'daire').length;
      });
      finalFlats[key] = flatCount;

      finalSqm[key] = block.averageSqm;
    });

    updateData({
      floors: finalFloors,
      flats: finalFlats,
      sqm: finalSqm,
      buildingStructures: blocksData,
      isMansart: hasAnyMansart
    });

    setConfirmModalVisible(false);
    onNext();
  }, [blocksData, updateData, onNext, createInitialBlock]);

  // Onay Modalı İçin Özet İstatistikleri Hesaplama
  const statsSummary = useMemo(() => {
    return Object.keys(blocksData).map(key => {
      const block = blocksData[key] || {};
      const label = blockKeys.find(bk => bk.key === key)?.label || 'Bina';
      
      let daire = 0, dukkan = 0, depo = 0, siginak = 0;
      const floorsList = block.floors || [];
      floorsList.forEach(f => {
        const unitsList = f.units || [];
        unitsList.forEach(u => {
          const { type } = getUnitDetails(u);
          if (type === 'daire') daire++;
          else if (type === 'dukkan') dukkan++;
          else if (type === 'depo') depo++;
          else if (type === 'siginak') siginak++;
        });
      });

      const normalFloorCount = floorsList.filter(f => f.type === 'normal').length;
      const topNormal = floorsList.find(f => f.type === 'normal');
      const hasAttic = topNormal?.hasAttic || false;
      const roofCount = block.roofType === 'mansart' ? 1 : 0;

      return {
        label,
        totalFloors: normalFloorCount + roofCount,
        roofLabel: block.roofType === 'none' ? 'Çatı Yok' : (block.roofType === 'mansart' ? 'Mansart Çatı' : (hasAttic ? 'Normal Çatı (Çatı Piyesli)' : 'Normal Çatı')),
        daire,
        dukkan,
        depo,
        siginak,
        averageSqm: block.averageSqm || 120
      };
    });
  }, [blocksData, blockKeys]);

  // Building components
  const normalFloors = activeBlockData.floors.filter(f => f.type === 'normal');
  const groundFloor = activeBlockData.floors.find(f => f.type === 'ground');
  const basementFloors = activeBlockData.floors.filter(f => f.type === 'basement');
  const topNormalFloor = activeBlockData.floors.find(f => f.type === 'normal');
  const isTopFloor = topNormalFloor && topNormalFloor.key === activeFloorForKey;
  const hasAttic = activeBlockData.roofType !== 'none' && (topNormalFloor?.hasAttic || false);

  // Precompute unit numbering from bottom to top, skipping sığınak
  const unitNumbers = useMemo(() => {
    const bottomToTop = [...activeBlockData.floors].reverse();
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
  }, [activeBlockData.floors]);

  // Compact Floor Label Formatter (Matches Mockups: e.g. 3. Kat, Zemin Kat, -1 Bodrum)
  const getFormattedFloorLabel = (label, type) => {
    if (type === 'roof') return 'Çatı';
    if (type === 'ground') return 'Zemin Kat';
    if (type === 'basement') {
      const match = label.match(/\d+/);
      return match ? `-${match[0]} Bodrum` : '-1 Bodrum';
    }
    const match = label.match(/\d+/);
    return match ? `${match[0]}. Kat` : label;
  };

  const renderFloorLabel = (floor, labelTextSize) => {
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
        isGround && styles.floorLabelBadgeGround,
        isBasement && styles.floorLabelBadgeBasement,
        { 
          backgroundColor: badgeBg,
          borderColor: borderColor,
          paddingVertical: Math.max(2, baseFloorHeight * 0.06)
        }
      ]}>
        <Text style={[styles.floorLabelMainText, { color: mainColor, fontSize: Math.max(10.5, Math.min(14.5, baseFloorHeight * 0.21)) }]}>
          {mainText}
        </Text>
        <Text style={[styles.floorLabelSubText, { color: subColor, fontSize: Math.max(6.5, Math.min(8.5, baseFloorHeight * 0.12)) }]}>
          {subText.toUpperCase()}
        </Text>
      </View>
    );
  };

  // Dynamic scaling math based on the number of floors to ensure the entire building always fits on the screen
  const numFloors = activeBlockData.floors.length;
  const layoutMath = useMemo(() => {
    const hasTabs = blockKeys.length > 1;
    const nonBuildingHeight = 360 + (hasTabs ? 40 : 0) + insets.top;
    const availableBuildingHeight = Math.max(200, screenHeight - nonBuildingHeight);
    
    // We want the building (roof + floors) to fit in availableBuildingHeight
    // roofHeight is approx 0.75 * baseFloorHeight. So total structural units = numFloors + 0.75
    const computedHeight = availableBuildingHeight / (numFloors + 0.75);
    const baseFloorHeight = Math.max(34, Math.min(85, computedHeight));
    
    return {
      baseFloorHeight,
      rowPaddingVertical: Math.max(1, Math.min(12, baseFloorHeight * 0.1)),
      cardPaddingVertical: Math.max(1, Math.min(8, baseFloorHeight * 0.05)),
      unitTextSize: Math.max(6, Math.min(10, baseFloorHeight * 0.12)),
      unitNoTextSize: Math.max(7, Math.min(12, baseFloorHeight * 0.15)),
      labelTextSize: Math.max(6.5, Math.min(10, baseFloorHeight * 0.13)),
      roofHeight: Math.max(28, Math.min(70, baseFloorHeight * 0.75))
    };
  }, [numFloors, screenHeight, blockKeys.length, insets.top]);
  const {
    baseFloorHeight,
    rowPaddingVertical,
    cardPaddingVertical,
    unitTextSize,
    unitNoTextSize,
    labelTextSize,
    roofHeight
  } = layoutMath;

  const renderUnitCard = (unit, unitNum, floorKey, unitIndex) => {
    const details = getUnitDetails(unit);
    const { type: unitType, id: unitId } = details;
    
    if (unitType === 'siginak') {
      return (
        <View key={unitId || `${floorKey}_${unitIndex}`} style={[styles.unitCard, { paddingVertical: cardPaddingVertical }]}>
          <Text style={[styles.unitCardType, { fontSize: unitTextSize }]} numberOfLines={1} adjustsFontSizeToFit={true}>SIĞINAK</Text>
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
        <Text style={[styles.unitCardType, { fontSize: unitTextSize }]} numberOfLines={1} adjustsFontSizeToFit={true}>{typeLabels[unitType] || 'DAİRE'}</Text>
        <Text style={[styles.unitCardNo, { fontSize: unitNoTextSize, marginTop: Math.max(0, baseFloorHeight * 0.03) }]} numberOfLines={1} adjustsFontSizeToFit={true}>No {unitNum}</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top > 0 ? insets.top + 12 : 20 }]}>
      {/* Üst Başlık ve Geri Butonu */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <ArrowLeft size={20} color="#4B5563" />
          <Text style={[styles.backBtnText, { fontSize: isSmallScreen ? 12 : 14 }]}>Geri</Text>
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { fontSize: isSmallScreen ? 14 : 16 }]}>İnteraktif Bina Oluşturucu</Text>
        <TouchableOpacity style={[styles.saveBtn, { paddingHorizontal: isSmallScreen ? 8 : 12 }]} onPress={() => setConfirmModalVisible(true)}>
          <Text style={[styles.saveBtnText, { fontSize: isSmallScreen ? 11 : 13 }]}>Kaydet</Text>
        </TouchableOpacity>
      </View>

      {/* Stepper */}
      <View style={styles.stepperContainer}>
        <View style={[styles.stepIndicator, styles.stepIndicatorCompleted]} />
        <View style={[styles.stepIndicator, styles.stepIndicatorActive]} />
        {Array.from({ length: 8 }).map((_, i) => (
          <View key={i} style={styles.stepIndicator} />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Blok Seçim Sekmeleri (Site Projesi ise) */}
        {blockKeys.length > 1 && (
          <View style={styles.tabsWrapper}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
              {blockKeys.map(bk => (
                <TouchableOpacity
                  key={bk.key}
                  style={[styles.tabButton, activeBlock === bk.key && styles.tabButtonActive]}
                  onPress={() => setActiveBlock(bk.key)}
                >
                  <Text style={[styles.tabButtonText, activeBlock === bk.key && styles.tabButtonTextActive]}>
                    {bk.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.copyLayoutBtn} onPress={handleCopyLayout} activeOpacity={0.8}>
              <Copy size={16} color="#F59E0B" style={{ marginRight: 4 }} />
              <Text style={styles.copyLayoutBtnText}>Kopyala</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ÇATI SEÇİM ALANI */}
        <View style={styles.roofSelectionContainer}>
          {[
            { type: 'normal', label: 'Normal Çatı' },
            { type: 'mansart', label: 'Mansart Çatı' },
            { type: 'none', label: 'Çatı Yok' }
          ].map(opt => (
            <TouchableOpacity
              key={opt.type}
              style={[
                styles.roofSelectBtn,
                activeBlockData.roofType === opt.type && styles.roofSelectBtnActive
              ]}
              onPress={() => handleRoofTypeChange(opt.type)}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.roofSelectBtnText,
                activeBlockData.roofType === opt.type && styles.roofSelectBtnTextActive
              ]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* KAT EKLEME VE ÇIKARMA KONTROLLERİ */}
        <View style={styles.floorControlsContainer}>
          <TouchableOpacity 
            style={styles.floorActionBtnRed} 
            onPress={handleRemoveFloor}
            activeOpacity={0.8}
          >
            <Text style={styles.floorActionBtnTextRed}>- Çıkar</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.floorActionBtnGold} 
            onPress={handleAddFloor}
            activeOpacity={0.8}
          >
            <Text style={styles.floorActionBtnTextGold}>+ Normal Kat Ekle</Text>
          </TouchableOpacity>
        </View>

        {/* İNTERAKTİF BİNA GÖRÜNÜMÜ */}
        <View style={styles.buildingWrapper}>
          
          {/* Çatı Görünümü: Mansart veya Üçgen Normal Çatı veya Çatı Yok */}
          {activeBlockData.roofType === 'mansart' ? (
            <View style={[styles.roofWrapper, { height: roofHeight }]}>
              <Svg height={roofHeight} width={280} viewBox={`0 0 280 ${roofHeight}`}>
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

                {/* Ana Çatı Gövdesi (Trapezoid) */}
                <Polygon 
                  points={`25,0 255,0 280,${roofHeight} 0,${roofHeight}`} 
                  fill="url(#mansartRoofGrad)" 
                />
                
                {/* Sol & Sağ Mansart Pencereleri */}
                <Rect x="65" y={roofHeight * 0.28} width="22" height={roofHeight * 0.45} rx="2" fill="#475569" opacity="0.6" />
                <Rect x="69" y={roofHeight * 0.33} width="14" height={roofHeight * 0.35} rx="1" fill="#7DD3FC" opacity="0.8" />

                <Rect x="193" y={roofHeight * 0.28} width="22" height={roofHeight * 0.45} rx="2" fill="#475569" opacity="0.6" />
                <Rect x="197" y={roofHeight * 0.33} width="14" height={roofHeight * 0.35} rx="1" fill="#7DD3FC" opacity="0.8" />

                {/* Alt Saçak (Turuncu Vurgu) */}
                <Rect x="0" y={roofHeight - 4} width="280" height="4" rx="2" fill="url(#eavesGrad)" />
              </Svg>

              <View style={[styles.roofTextCapsule, { marginBottom: Math.max(2, roofHeight * 0.15) }]}>
                <Text style={[styles.roofTextCapsuleText, { fontSize: Math.max(8, Math.min(12, roofHeight * 0.2)) }]}>
                  MANSART
                </Text>
              </View>
            </View>
          ) : activeBlockData.roofType === 'normal' ? (
            <View style={[styles.roofWrapper, { height: roofHeight }]}>
              <Svg height={roofHeight} width={280} viewBox={`0 0 280 ${roofHeight}`}>
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

                {/* Çatı Üçgeni */}
                <Polygon 
                  points={`0,${roofHeight} 140,0 280,${roofHeight}`} 
                  fill="url(#normalRoofGrad)" 
                />
                
                {/* Çatı Piyesi Skylight Pencereleri */}
                {hasAttic && (
                  <>
                    <Polygon points={`85,${roofHeight * 0.75} 100,${roofHeight * 0.5} 115,${roofHeight * 0.75}`} fill="#475569" opacity="0.6" />
                    <Polygon points={`89,${roofHeight * 0.73} 100,${roofHeight * 0.54} 111,${roofHeight * 0.73}`} fill="#7DD3FC" opacity="0.8" />

                    <Polygon points={`165,${roofHeight * 0.75} 180,${roofHeight * 0.5} 195,${roofHeight * 0.75}`} fill="#475569" opacity="0.6" />
                    <Polygon points={`169,${roofHeight * 0.73} 180,${roofHeight * 0.54} 191,${roofHeight * 0.73}`} fill="#7DD3FC" opacity="0.8" />
                  </>
                )}

                {/* Alt Saçak (Turuncu Vurgu) */}
                <Rect x="0" y={roofHeight - 4} width="280" height="4" rx="2" fill="url(#eavesGrad)" />
              </Svg>

              <View style={[styles.roofTextCapsule, { marginBottom: Math.max(2, roofHeight * 0.15) }]}>
                <Text style={[styles.roofTextCapsuleText, { fontSize: Math.max(8, Math.min(12, roofHeight * 0.2)) }]}>
                  {hasAttic ? 'ÇATI PİYESLİ' : 'NORMAL ÇATI'}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Duplex stair connection lines bridging roof and top normal floor */}
          {hasAttic && (
            <View style={[styles.duplexConnectionsContainer, { top: roofHeight - 12 }]}>
              <View style={styles.dashedVerticalLine} />
              <View style={styles.dashedVerticalLine} />
            </View>
          )}

          {/* Katlar Listesi (Yukarıdan Aşağıya) */}
          <View style={styles.floorsContainer}>
            {activeBlockData.floors.map((floor) => {
              if (floor.type === 'roof') return null; // Çatı üstte ayrıca işlendi
              
              const isBasement = floor.type === 'basement';
              const isGround = floor.type === 'ground';

              return (
                <TouchableOpacity
                  key={floor.key}
                  style={[
                    styles.floorRow,
                    isBasement && styles.floorRowBasement,
                    isGround && styles.floorRowGround,
                    floor.type === 'normal' && styles.floorRowNormal,
                    { 
                      height: baseFloorHeight, 
                      minHeight: baseFloorHeight,
                      paddingVertical: rowPaddingVertical,
                      marginVertical: Math.max(1, Math.min(4, baseFloorHeight * 0.05))
                    }
                  ]}
                  activeOpacity={0.9}
                  onPress={() => openFloorModal(floor.key)}
                >
                  {/* Sol Kat Etiketi Kolonu */}
                  <View style={styles.floorLabelColumn}>
                    {renderFloorLabel(floor, labelTextSize)}
                  </View>

                  {/* Birim Kartları */}
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

        {/* BODRUM KAT EKLEME VE ÇIKARMA KONTROLLERİ */}
        <View style={styles.basementControlsContainer}>
          <TouchableOpacity 
            style={[styles.basementActionBtnRed]} 
            onPress={() => handleAddRemoveBasement(-1)}
            activeOpacity={0.8}
          >
            <Text style={styles.basementActionBtnTextRed}>- Çıkar</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.basementActionBtnGray]} 
            onPress={() => handleAddRemoveBasement(1)}
            activeOpacity={0.8}
          >
            <Text style={styles.basementActionBtnTextGray}>+ Harici Kat Ekle</Text>
          </TouchableOpacity>
        </View>

        {/* ALT ONAY BÖLÜMÜ */}
        <View style={styles.confirmWrapper}>
          <Text style={styles.confirmQuestion}>
            Oluşturduğunuz bina sizin binanız ile aynı mı?
          </Text>
          
          <View style={styles.confirmButtonsRow}>
            <TouchableOpacity 
              style={styles.backButtonOutline} 
              onPress={onBack}
              activeOpacity={0.8}
            >
              <ArrowLeft size={16} color="#4B5563" style={{ marginRight: 6 }} />
              <Text style={styles.backButtonOutlineText}>Geri Dön</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.confirmButtonGold} 
              onPress={() => setConfirmModalVisible(true)}
              activeOpacity={0.9}
            >
              <Check size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.confirmButtonGoldText}>Evet, Birebir Aynı (Devam Et)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* KAT İÇERİĞİ DÜZENLEME MODALİ */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={dropdownOpen}
        onRequestClose={() => setDropdownOpen(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setDropdownOpen(false)} // Backdrop Click Dismiss
        >
          <TouchableOpacity 
            style={styles.modalContent} 
            activeOpacity={1} 
            onPress={(e) => e.stopPropagation()} // Prevent closing when clicking inside
          >
            {/* Modal Başlık */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {activeFloorForKey ? getFormattedFloorLabel(
                  activeBlockData.floors.find(f => f.key === activeFloorForKey)?.label || '',
                  activeBlockData.floors.find(f => f.key === activeFloorForKey)?.type || ''
                ) : ''} İçeriği
              </Text>
              <TouchableOpacity onPress={() => setDropdownOpen(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Modal İçerik Satırları */}
            <View style={[styles.modalRowItem, { zIndex: 50 }]}>
              {/* Tür Seçim Dropdown Tetikleyici */}
              <View style={styles.dropdownWrapperContainer}>
                <TouchableOpacity
                  style={styles.dropdownTrigger}
                  onPress={() => setActiveDropdownOpen(prev => !prev)}
                >
                  <Text style={styles.dropdownTriggerText}>
                    {UNIT_METADATA[editingUnitType]?.label || 'Türü Seçin...'}
                  </Text>
                  <ChevronDown size={14} color="#64748B" />
                </TouchableOpacity>

                {/* Dropdown Seçenek Listesi */}
                {activeDropdownOpen && (
                  <View style={styles.dropdownOptionsList}>
                    <TouchableOpacity
                      style={styles.dropdownOptionItem}
                      onPress={() => setActiveDropdownOpen(false)}
                    >
                      <Text style={[styles.dropdownOptionItemText, { color: '#94A3B8' }]}>
                        Türü Seçin...
                      </Text>
                    </TouchableOpacity>

                    {Object.keys(UNIT_METADATA).map(typeKey => {
                      const meta = UNIT_METADATA[typeKey];
                      const isSelected = editingUnitType === typeKey;
                      return (
                        <TouchableOpacity
                          key={typeKey}
                          style={[
                            styles.dropdownOptionItem,
                            isSelected && styles.dropdownOptionItemActive
                          ]}
                          onPress={() => {
                            setEditingUnitType(typeKey);
                            setActiveDropdownOpen(false);
                          }}
                        >
                          <Text style={[
                            styles.dropdownOptionItemText,
                            isSelected && styles.dropdownOptionItemTextActive
                          ]}>
                            {meta.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* Adet Sayacı */}
              <View style={styles.modalCounter}>
                <TouchableOpacity 
                  style={styles.modalCounterBtn}
                  onPress={() => setEditingUnitCount(prev => Math.max(1, prev - 1))}
                >
                  <Minus size={12} color="#64748B" />
                </TouchableOpacity>
                <Text style={styles.modalCounterVal}>{editingUnitCount}</Text>
                <TouchableOpacity 
                  style={styles.modalCounterBtn}
                  onPress={() => setEditingUnitCount(prev => Math.min(10, prev + 1))}
                >
                  <Plus size={12} color="#64748B" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Çatı Piyesi Seçeneği (Sadece en üst kat ise gösterilir) */}
            {isTopFloor && activeBlockData.roofType !== 'none' && (
              <View style={styles.modalAtticRow}>
                <Text style={styles.modalAtticLabel}>Çatı Piyesi (Çatı Dubleksi) Var mı?</Text>
                <TouchableOpacity 
                  style={[
                    styles.atticToggleBtn, 
                    editingHasAttic && styles.atticToggleBtnActive
                  ]}
                  onPress={() => setEditingHasAttic(prev => !prev)}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.atticToggleBtnText, 
                    editingHasAttic && styles.atticToggleBtnTextActive
                  ]}>
                    {editingHasAttic ? 'EVET' : 'HAYIR'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Modal Aksiyon Butonları (Mükemmelleştirme: Uyumlu Renk Paleti) */}
            <View style={styles.modalActionButtons}>
              <TouchableOpacity 
                style={styles.deleteFloorBtn}
                onPress={handleDeleteWholeFloor}
                activeOpacity={0.8}
              >
                <Trash2 size={14} color="#EF4444" style={{ marginRight: 4 }} />
                <Text style={styles.deleteFloorBtnText}>Katı Sil</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.saveFloorBtn}
                onPress={handleSaveFloorContent}
                activeOpacity={0.8}
              >
                <Text style={styles.saveFloorBtnText}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* (Birim tipi seçme arayüzü inline dropdown listesi olarak taşındı) */}

      {/* ONAY / YAPILAR ÖZET MODALİ */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={confirmModalVisible}
        onRequestClose={() => setConfirmModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setConfirmModalVisible(false)}
        >
          <TouchableOpacity 
            style={styles.confirmModalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.confirmModalHeader}>
              <View style={styles.confirmModalTitleBox}>
                <Info size={22} color="#D97706" style={{ marginRight: 8 }} />
                <Text style={styles.confirmModalTitle}>Yapı Tasarım Özeti</Text>
              </View>
              <TouchableOpacity onPress={() => setConfirmModalVisible(false)}>
                <X size={22} color="#4B5563" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.confirmModalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.confirmModalSub}>
                Oluşturduğunuz bina yapısı gerçekte oturduğunuz binayı temsil ediyor mu? Lütfen kontrol edin:
              </Text>

              {statsSummary.map((stat, i) => (
                <View key={i} style={styles.summaryBlockCard}>
                  <Text style={styles.summaryBlockTitle}>{stat.label}</Text>
                  
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Toplam Kat Sayısı:</Text>
                    <Text style={styles.summaryVal}>{stat.totalFloors} Kat</Text>
                  </View>

                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>En Üst Çatı Tipi:</Text>
                    <Text style={styles.summaryVal}>{stat.roofLabel}</Text>
                  </View>

                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Daire Sayısı:</Text>
                    <Text style={styles.summaryVal}>{stat.daire} Adet</Text>
                  </View>

                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Dükkan Sayısı:</Text>
                    <Text style={styles.summaryVal}>{stat.dukkan} Adet</Text>
                  </View>

                  {(stat.depo > 0 || stat.siginak > 0) && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Bodrum Birimleri:</Text>
                      <Text style={styles.summaryVal}>
                        {stat.depo > 0 ? `${stat.depo} Depo ` : ''}
                        {stat.siginak > 0 ? `${stat.siginak} Sığınak` : ''}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>

            <View style={styles.confirmModalActionButtons}>
              <TouchableOpacity 
                style={styles.confirmModalEditBtn}
                onPress={() => setConfirmModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmModalEditBtnText}>Geri Gel, Düzenle</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.confirmModalConfirmBtn}
                onPress={handleConfirmSave}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmModalConfirmBtnText}>Evet, Onayla</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtnText: {
    fontFamily: FONTS.medium,
    fontSize: isSmallScreenFallback ? 12 : 14,
    color: '#4B5563',
    marginLeft: 4,
  },
  screenTitle: {
    fontFamily: FONTS.bold,
    fontSize: isSmallScreenFallback ? 14 : 16,
    color: '#1E293B',
    letterSpacing: 0.5,
  },
  saveBtn: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: isSmallScreenFallback ? 8 : 12,
  },
  saveBtnText: {
    color: '#D97706',
    fontFamily: FONTS.bold,
    fontSize: isSmallScreenFallback ? 11 : 13,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepIndicator: {
    height: 4,
    flex: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 3,
    borderRadius: 2,
  },
  stepIndicatorActive: {
    backgroundColor: '#D97706',
  },
  stepIndicatorCompleted: {
    backgroundColor: '#10B981',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    alignItems: 'center',
  },
  tabsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  tabsScroll: {
    flexGrow: 1,
  },
  tabButton: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabButtonActive: {
    borderColor: '#F59E0B',
    backgroundColor: '#FEF3C7',
  },
  tabButtonText: {
    color: '#64748B',
    fontFamily: FONTS.medium,
    fontSize: 12,
  },
  tabButtonTextActive: {
    color: '#D97706',
    fontFamily: FONTS.bold,
  },
  copyLayoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginLeft: 6,
  },
  copyLayoutBtnText: {
    color: '#4B5563',
    fontFamily: FONTS.medium,
    fontSize: 11,
  },
  roofSelectionContainer: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  roofSelectBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  roofSelectBtnActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  roofSelectBtnText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: '#64748B',
  },
  roofSelectBtnTextActive: {
    fontFamily: FONTS.bold,
    color: '#D97706',
  },
  floorControlsContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    marginBottom: 20,
  },
  floorActionBtnRed: {
    flex: 0.35,
    backgroundColor: '#EF4444',
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floorActionBtnTextRed: {
    color: '#FFFFFF',
    fontFamily: FONTS.bold,
    fontSize: 13,
  },
  floorActionBtnGold: {
    flex: 0.65,
    backgroundColor: '#D97706',
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floorActionBtnTextGold: {
    color: '#FFFFFF',
    fontFamily: FONTS.bold,
    fontSize: 13,
  },
  buildingWrapper: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 10,
  },
  roofWrapper: {
    width: '100%',
    height: 60,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  roofTrapezoid: {
    width: '100%',
    height: 0,
    borderBottomWidth: 60,
    borderBottomColor: '#1E293B',
    borderLeftWidth: 35,
    borderLeftColor: 'transparent',
    borderRightWidth: 35,
    borderRightColor: 'transparent',
    position: 'absolute',
    bottom: 0,
  },
  roofTextCapsule: {
    position: 'absolute',
    bottom: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    paddingHorizontal: 20,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 20,
  },
  roofTextCapsuleText: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: '#1E293B',
  },
  floorsContainer: {
    width: 290,
    backgroundColor: '#F1F5F9', // Solid carrier background
    paddingHorizontal: 10,
    paddingBottom: 8,
    paddingTop: 8,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderColor: '#CBD5E1', // Structural column side borders
    borderRadius: 2,
  },
  floorRow: {
    width: '100%',
    flexDirection: 'row', // Align label and unit cards side-by-side
    alignItems: 'center', // Center vertically
    backgroundColor: '#FFFFFF', // Modern clean white
    borderWidth: 1,
    borderColor: '#E2E8F0', // Soft gray border
    borderRadius: 8,
    marginVertical: 4,
    minHeight: 80,
    position: 'relative',
    paddingVertical: 12,
    paddingHorizontal: 8, // Snug horizontal padding
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    overflow: 'hidden',
  },
  floorRowBasement: {
    backgroundColor: '#FCFDFE',
    borderLeftWidth: 6,
    borderLeftColor: '#64748B', // Slate gray for basement
  },
  floorRowGround: {
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 6,
    borderLeftColor: '#F59E0B', // Amber for commercial ground
  },
  floorRowNormal: {
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 6,
    borderLeftColor: '#3B82F6', // Blue for residential normal
  },
  floorLabelColumn: {
    width: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  floorLabelBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.08)', // Soft blue transparent fill
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  floorLabelBadgeBasement: {
    backgroundColor: 'rgba(100, 116, 139, 0.08)', // Soft slate transparent fill
    borderColor: 'rgba(100, 116, 139, 0.15)',
  },
  floorLabelBadgeGround: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)', // Soft gold transparent fill
    borderColor: 'rgba(245, 158, 11, 0.15)',
  },
  floorLabelBadgeText: {
    fontFamily: FONTS.bold,
    color: '#1E293B', // Dark slate text for maximum readability
    textAlign: 'center',
    lineHeight: 11,
  },
  floorLabelMainText: {
    fontFamily: FONTS.bold,
    textAlign: 'center',
    lineHeight: 13,
  },
  floorLabelSubText: {
    fontFamily: FONTS.bold,
    textAlign: 'center',
    lineHeight: 9,
    letterSpacing: 0.2,
    marginTop: 1,
  },
  unitCardsContainer: {
    flex: 1, // Fill remaining width dynamically
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'center',
    gap: 4,
  },
  unitCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    flex: 1,
    paddingVertical: 8,
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
    fontSize: isSmallScreenFallback ? 7.5 : 8.5,
    color: '#64748B',
    letterSpacing: 0.1,
  },
  unitCardNo: {
    fontFamily: FONTS.bold,
    fontSize: isSmallScreenFallback ? 9.5 : 11,
    color: '#1E293B',
    marginTop: 2,
  },
  basementControlsContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    marginTop: 6,
    marginBottom: 20,
  },
  basementActionBtnRed: {
    flex: 0.35,
    backgroundColor: '#EF4444',
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  basementActionBtnTextRed: {
    color: '#FFFFFF',
    fontFamily: FONTS.bold,
    fontSize: 13,
  },
  basementActionBtnGray: {
    flex: 0.65,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#64748B',
    backgroundColor: 'rgba(100, 116, 139, 0.05)',
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  basementActionBtnTextGray: {
    color: '#475569',
    fontFamily: FONTS.bold,
    fontSize: 13,
  },
  sqmSection: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    alignItems: 'center',
  },
  sqmTitle: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: '#64748B',
    marginBottom: 10,
  },
  sqmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  sqmBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sqmText: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: '#1E293B',
  },
  confirmWrapper: {
    width: '100%',
    marginTop: 20,
    alignItems: 'center',
  },
  confirmQuestion: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: '#D97706',
    marginBottom: 12,
  },
  confirmButtonsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  backButtonOutline: {
    flex: 0.35,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 24,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonOutlineText: {
    color: '#4B5563',
    fontFamily: FONTS.bold,
    fontSize: 13,
  },
  confirmButtonGold: {
    flex: 0.65,
    backgroundColor: '#D97706',
    borderRadius: 24,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  confirmButtonGoldText: {
    color: '#FFFFFF',
    fontFamily: FONTS.bold,
    fontSize: 13,
  },
  // Floor Content Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 380,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: '#1E293B',
  },
  modalScroll: {
    maxHeight: 240,
    marginBottom: 16,
  },
  modalRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
    position: 'relative',
  },
  dropdownWrapperContainer: {
    flex: 1,
    position: 'relative',
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dropdownTriggerText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: '#1E293B',
  },
  dropdownOptionsList: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 15,
    zIndex: 9999,
  },
  dropdownOptionItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  dropdownOptionItemActive: {
    backgroundColor: '#2563EB',
  },
  dropdownOptionItemTextActive: {
    color: '#FFFFFF',
    fontFamily: FONTS.bold,
  },
  dropdownOptionItemText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: '#334155',
  },
  modalCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    height: 36,
  },
  modalCounterBtn: {
    width: 28,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCounterVal: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: '#1E293B',
    paddingHorizontal: 6,
  },
  deleteRowBtn: {
    width: 36,
    height: 36,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addContentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 4,
    backgroundColor: '#F8FAFC',
  },
  addContentBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: '#D97706',
  },
  modalActionButtons: {
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 16,
  },
  deleteFloorBtn: {
    flex: 0.4,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteFloorBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: '#EF4444',
  },
  saveFloorBtn: {
    flex: 0.6,
    backgroundColor: '#D97706',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveFloorBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  // Summary modal styles
  confirmModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  confirmModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
    marginBottom: 12,
  },
  confirmModalTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confirmModalTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: '#1E293B',
  },
  confirmModalScroll: {
    flexGrow: 0,
    marginBottom: 16,
  },
  confirmModalSub: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 12,
  },
  summaryBlockCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 8,
  },
  summaryBlockTitle: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: '#E67E22',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: '#64748B',
  },
  summaryVal: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: '#1E293B',
  },
  confirmModalActionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  confirmModalEditBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  confirmModalEditBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: '#4B5563',
  },
  confirmModalConfirmBtn: {
    flex: 1,
    backgroundColor: '#D97706',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmModalConfirmBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  // Roof Triangle and Attic Sizing Styles
  roofTriangle: {
    width: 0,
    height: 0,
    borderStyle: 'solid',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    position: 'absolute',
    bottom: 0,
  },
  roofTriangleInner: {
    width: 0,
    height: 0,
    borderStyle: 'solid',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    position: 'absolute',
    bottom: 3,
    zIndex: 1,
  },
  roofWindowsRow: {
    position: 'absolute',
    bottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 220,
    zIndex: 3,
  },
  roofWindowContainer: {
    width: 14,
    height: 18,
    borderColor: '#1E293B',
    borderWidth: 1.5,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: '#0284C7',
  },
  roofWindowGradient: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  windowShine: {
    position: 'absolute',
    top: 0,
    left: 4,
    width: 2,
    height: '150%',
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    transform: [{ rotate: '45deg' }],
  },
  skylightsRow: {
    position: 'absolute',
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 120,
    zIndex: 3,
  },
  skylightWindowContainer: {
    width: 12,
    height: 12,
    borderColor: '#1E293B',
    borderWidth: 1.2,
    transform: [{ rotate: '45deg' }],
    overflow: 'hidden',
    backgroundColor: '#0284C7',
  },
  skylightWindowGradient: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  skylightShine: {
    position: 'absolute',
    top: 0,
    left: 4,
    width: 1.5,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
  roofEaves: {
    width: 284,
    height: 4,
    backgroundColor: '#D97706',
    borderRadius: 2,
    position: 'absolute',
    bottom: 0,
    zIndex: 10,
  },
  duplexConnectionsContainer: {
    position: 'absolute',
    height: 24,
    width: 120,
    flexDirection: 'row',
    justifyContent: 'space-around',
    zIndex: 15,
  },
  dashedVerticalLine: {
    width: 0,
    height: '100%',
    borderLeftWidth: 1.5,
    borderColor: '#F59E0B',
    borderStyle: 'dashed',
  },
  modalAtticRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 8,
    marginBottom: 12,
    width: '100%',
  },
  modalAtticLabel: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: '#334155',
  },
  atticToggleBtn: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  atticToggleBtnActive: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  atticToggleBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: '#64748B',
  },
  atticToggleBtnTextActive: {
    color: '#D97706',
  },
});
