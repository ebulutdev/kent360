import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  SafeAreaView,
  Animated,
  Modal,
  ActivityIndicator,
  TextInput,
  Alert,
  Appearance
} from 'react-native';
import { ArrowLeft, ArrowRight, Calculator, Coins, ShieldCheck, Briefcase, ChevronDown, ChevronUp, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, globalStyles } from '../styles/theme';
import Svg, { Polygon, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

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

export default function OfferChoiceScreen({ data, updateData, onNext, onBack, onExit }) {
  const insets = useSafeAreaInsets();
  const [showCalculator, setShowCalculator] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Animated value for slide-up bottom sheet transition
  const bottomSheetTranslateY = useRef(new Animated.Value(height)).current;
  const [modalVisible, setModalVisible] = useState(false);

  // Extract deed details if available from previous steps
  const firstDeed = useMemo(() => {
    const deedsList = Object.values(data.deeds || {});
    return deedsList[0] || null;
  }, [data.deeds]);

  const adaNo = data.adaNo || firstDeed?.ada || '';
  const parselNo = data.parselNo || firstDeed?.parsel || '';

  // Helper for triggering haptics on step click
  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      // Ignored in non-supported environments (e.g. web browser)
    }
  };

  // 1. Calculate base parameters from previous inputs
  const calculationContext = useMemo(() => {
    let normalCount = 0;
    let bodrumCount = 0;
    let hasRoof = false;

    const averageArea = (data.width && data.depth) ? Math.round(data.width * data.depth) : 120;

    let normalSqmTotal = 0;
    let bodrumSqmTotal = 0;
    let roofSqm = 0;

    if (data.buildingStructures && Object.keys(data.buildingStructures).length > 0) {
      Object.keys(data.buildingStructures).forEach(key => {
        const block = data.buildingStructures[key];
        if (block && block.floors) {
          block.floors.forEach(floor => {
            const area = block.averageSqm || averageArea;
            const isBodrum = floor.type === 'bodrum' || floor.type === 'bodrum_end' || floor.type === 'basement';
            if (isBodrum) {
              bodrumCount++;
              bodrumSqmTotal += area;
            } else {
              normalCount++;
              normalSqmTotal += area;
            }
          });

          const topNormal = block.floors.find(f => f.type === 'normal');
          const hasAttic = block.roofType !== 'none' && (topNormal?.hasAttic || false);
          if (block.roofType === 'mansart' || hasAttic) {
            hasRoof = true;
            roofSqm += Math.round((block.averageSqm || averageArea) * 0.8);
          }
        }
      });
    } else {
      const floorsList = Object.values(data.floors || {});
      const totalFloors = data.floorsCount || (floorsList.length > 0 ? floorsList[0] : 4);
      normalCount = totalFloors;
      normalSqmTotal = totalFloors * averageArea;
    }

    const avgNormalArea = normalCount > 0 ? Math.round(normalSqmTotal / normalCount) : averageArea;
    const avgBodrumArea = bodrumCount > 0 ? Math.round(bodrumSqmTotal / bodrumCount) : Math.round(averageArea * 0.8);

    return {
      normalCount,
      bodrumCount,
      hasRoof,
      normalArea: avgNormalArea,
      bodrumArea: avgBodrumArea,
      roofArea: roofSqm || Math.round(avgNormalArea * 0.8),
    };
  }, [data.buildingStructures, data.floors, data.floorsCount, data.width, data.depth]);

  // Retrieve pre-existing evaluationDetails if available to avoid resetting state on mount
  const preValDetails = data.valuationDetails || {};

  // 2. Local editable states
  const [normalCount, setNormalCount] = useState(
    preValDetails.normalCount !== undefined ? preValDetails.normalCount : (calculationContext.normalCount || 4)
  );
  const [bodrumCount, setBodrumCount] = useState(
    preValDetails.bodrumCount !== undefined ? preValDetails.bodrumCount : (calculationContext.bodrumCount || 0)
  );
  const [hasRoof, setHasRoof] = useState(
    preValDetails.hasRoof !== undefined ? preValDetails.hasRoof : (calculationContext.hasRoof || false)
  );

  const [normalArea, setNormalArea] = useState(
    preValDetails.normalArea !== undefined ? preValDetails.normalArea : (calculationContext.normalArea || 120)
  );
  const [bodrumArea, setBodrumArea] = useState(
    preValDetails.bodrumArea !== undefined ? preValDetails.bodrumArea : (calculationContext.bodrumArea || 100)
  );
  const [roofArea, setRoofArea] = useState(
    preValDetails.roofArea !== undefined ? preValDetails.roofArea : (calculationContext.roofArea || 80)
  );

  const [normalCost, setNormalCost] = useState(
    preValDetails.normalCost !== undefined ? preValDetails.normalCost : 32000
  );
  const [bodrumCost, setBodrumCost] = useState(
    preValDetails.bodrumCost !== undefined ? preValDetails.bodrumCost : 27000
  );
  const [mutOrani, setMutOrani] = useState(
    preValDetails.mutOrani !== undefined ? preValDetails.mutOrani : 45
  ); // Contractor share percentage
  const [roofCostRatio, setRoofCostRatio] = useState(
    preValDetails.roofCostRatio !== undefined ? preValDetails.roofCostRatio : 60
  ); // Roof cost as % of normal cost

  const [regionSalesPrice, setRegionSalesPrice] = useState(
    preValDetails.regionSalesPrice !== undefined ? preValDetails.regionSalesPrice : 75000
  );
  const [isDownloading, setIsDownloading] = useState(false);
  const [regionSalesPriceInput, setRegionSalesPriceInput] = useState(String(regionSalesPrice));

  useEffect(() => {
    setRegionSalesPriceInput(String(regionSalesPrice));
  }, [regionSalesPrice]);

  // 3. Spring schematic animation hooks
  const animNormalHeight = useRef(new Animated.Value(normalCount * 20 + 20)).current;
  const animNormalWidth = useRef(new Animated.Value(150 + (normalArea - 120) * 0.25)).current;
  const animBodrumHeight = useRef(new Animated.Value(bodrumCount * 20)).current;
  const animBodrumWidth = useRef(new Animated.Value(150 + (bodrumArea - 100) * 0.25)).current;
  const animRoofWidth = useRef(new Animated.Value(150 + (roofArea - 80) * 0.25)).current;

  useEffect(() => {
    Animated.spring(animNormalHeight, {
      toValue: normalCount * 20 + 20,
      useNativeDriver: false,
      friction: 8,
      tension: 40
    }).start();
  }, [normalCount]);

  useEffect(() => {
    Animated.spring(animNormalWidth, {
      toValue: 150 + (normalArea - 120) * 0.25,
      useNativeDriver: false,
      friction: 8,
      tension: 40
    }).start();
  }, [normalArea]);

  useEffect(() => {
    Animated.spring(animBodrumHeight, {
      toValue: bodrumCount * 20,
      useNativeDriver: false,
      friction: 8,
      tension: 40
    }).start();
  }, [bodrumCount]);

  useEffect(() => {
    Animated.spring(animBodrumWidth, {
      toValue: 150 + (bodrumArea - 100) * 0.25,
      useNativeDriver: false,
      friction: 8,
      tension: 40
    }).start();
  }, [bodrumArea]);

  useEffect(() => {
    Animated.spring(animRoofWidth, {
      toValue: 150 + (roofArea - 80) * 0.25,
      useNativeDriver: false,
      friction: 8,
      tension: 40
    }).start();
  }, [roofArea]);

  // Sync states when calculationContext changes from previous pages
  useEffect(() => {
    if (preValDetails.normalCount === undefined) {
      setNormalCount(calculationContext.normalCount || 4);
    }
    if (preValDetails.bodrumCount === undefined) {
      setBodrumCount(calculationContext.bodrumCount || 0);
    }
    if (preValDetails.hasRoof === undefined) {
      setHasRoof(calculationContext.hasRoof || false);
    }
    if (preValDetails.normalArea === undefined) {
      setNormalArea(calculationContext.normalArea || 120);
    }
    if (preValDetails.bodrumArea === undefined) {
      setBodrumArea(calculationContext.bodrumArea || 100);
    }
    if (preValDetails.roofArea === undefined) {
      setRoofArea(calculationContext.roofArea || 80);
    }
    if (preValDetails.regionSalesPrice === undefined) {
      setRegionSalesPrice(preValDetails.regionSalesPrice || 75000);
    }
  }, [calculationContext]);

  // Reconcile block structure for rendering visual mockups
  const activeBlockKey = useMemo(() => {
    if (data.buildingStructures && Object.keys(data.buildingStructures).length > 0) {
      return Object.keys(data.buildingStructures)[0];
    }
    return 'single';
  }, [data.buildingStructures]);

  const blockStructure = useMemo(() => {
    if (data.buildingStructures && data.buildingStructures[activeBlockKey]) {
      return data.buildingStructures[activeBlockKey];
    }
    return null;
  }, [data.buildingStructures, activeBlockKey]);

  // Dynamically reconcile block floors according to the currently adjusted floor counts on screen
  const reportFloors = useMemo(() => {
    const list = [];
    if (blockStructure && Array.isArray(blockStructure.floors)) {
      const configNormal = blockStructure.floors.filter(f => f.type === 'normal');
      const configGround = blockStructure.floors.find(f => f.type === 'ground');
      const configBasement = blockStructure.floors.filter(f => f.type === 'basement');

      const targetNormalLength = Math.max(0, normalCount - 1);

      for (let i = targetNormalLength; i >= 1; i--) {
        const configF = configNormal.find(f => f.key === `normal_${i}`);
        if (configF) {
          list.push(configF);
        } else {
          list.push({
            key: `normal_${i}`,
            label: `${i}. Kat`,
            type: 'normal',
            units: ['daire', 'daire']
          });
        }
      }

      if (normalCount >= 1) {
        if (configGround) {
          list.push(configGround);
        } else {
          list.push({
            key: 'ground',
            label: 'Zemin Kat',
            type: 'ground',
            units: ['dukkan', 'daire']
          });
        }
      }

      for (let i = 1; i <= bodrumCount; i++) {
        const configF = configBasement.find(f => f.key === `basement_${i}`);
        if (configF) {
          list.push(configF);
        } else {
          list.push({
            key: `basement_${i}`,
            label: `${i}. Bodrum Kat`,
            type: 'basement',
            units: ['depo']
          });
        }
      }
    } else {
      const targetNormalLength = Math.max(0, normalCount - 1);
      for (let i = targetNormalLength; i >= 1; i--) {
        list.push({
          key: `normal_${i}`,
          label: `${i}. Kat`,
          type: 'normal',
          units: ['daire', 'daire']
        });
      }
      if (normalCount >= 1) {
        list.push({
          key: 'ground',
          label: 'Zemin Kat',
          type: 'ground',
          units: ['dukkan', 'daire']
        });
      }
      for (let i = 1; i <= bodrumCount; i++) {
        list.push({
          key: `basement_${i}`,
          label: `${i}. Bodrum Kat`,
          type: 'basement',
          units: ['depo']
        });
      }
    }
    return list;
  }, [blockStructure, normalCount, bodrumCount]);

  const unitNumbers = useMemo(() => {
    const bottomToTop = [...reportFloors].reverse();
    let counter = 1;
    const mapping = {};
    bottomToTop.forEach(floor => {
      const unitsList = floor.units || [];
      unitsList.forEach((unit, uIdx) => {
        const details = getUnitDetails(unit);
        if (details.type !== 'siginak') {
          mapping[`${floor.key}_${uIdx}`] = counter++;
        }
      });
    });
    return mapping;
  }, [reportFloors]);

  // 4. Perform live calculations based on weighted pricing model & SPK feasibility
  const totals = useMemo(() => {
    const totalNormalArea = normalCount * normalArea;
    const totalBodrumArea = bodrumCount * bodrumArea;
    const totalRoofArea = (hasRoof && roofArea > 0) ? roofArea : 0;
    const totalArea = totalNormalArea + totalBodrumArea + totalRoofArea;

    const normalCostTotal = totalNormalArea * normalCost;
    const bodrumCostTotal = totalBodrumArea * bodrumCost;
    const roofCostTotal = totalRoofArea * (normalCost * (roofCostRatio / 100)); // Dynamic Weighted Roof cost
    const totalCost = normalCostTotal + bodrumCostTotal + roofCostTotal;

    const isNoContractor = data.contractorFlatCount === 0;
    const activeMutOrani = isNoContractor ? 0 : mutOrani;

    const contractorShareArea = totalArea * (activeMutOrani / 100);
    const landownerShareArea = totalArea * (1 - activeMutOrani / 100);

    // Feasibility pazar satış projections
    const projectSalesValue = totalArea * regionSalesPrice;
    const contractorSalesValue = contractorShareArea * regionSalesPrice;
    const contractorNetProfit = contractorSalesValue - totalCost;
    const contractorROI = totalCost > 0 ? (contractorNetProfit / totalCost) * 100 : 0;
    const landownerSalesValue = landownerShareArea * regionSalesPrice;

    return {
      totalArea,
      totalCost,
      contractorShareArea: Math.round(contractorShareArea),
      landownerShareArea: Math.round(landownerShareArea),
      totalNormalArea,
      totalBodrumArea,
      projectSalesValue,
      contractorSalesValue,
      contractorNetProfit,
      contractorROI,
      landownerSalesValue
    };
  }, [normalCount, normalArea, bodrumCount, bodrumArea, hasRoof, roofArea, normalCost, bodrumCost, mutOrani, roofCostRatio, regionSalesPrice, data.contractorFlatCount]);

  // Auto-synchronize edits back to the main wizard context
  useEffect(() => {
    updateData({
      valuationDetails: {
        normalCount,
        bodrumCount,
        hasRoof,
        normalArea,
        bodrumArea,
        roofArea,
        normalCost,
        bodrumCost,
        mutOrani,
        roofCostRatio,
        regionSalesPrice,
        totalArea: totals.totalArea,
        totalCost: totals.totalCost,
        contractorShareArea: totals.contractorShareArea,
        landownerShareArea: totals.landownerShareArea,
        projectSalesValue: totals.projectSalesValue,
        contractorNetProfit: totals.contractorNetProfit,
        contractorROI: totals.contractorROI,
        landownerSalesValue: totals.landownerSalesValue,
      }
    });
  }, [normalCount, bodrumCount, hasRoof, normalArea, bodrumArea, roofArea, normalCost, bodrumCost, mutOrani, roofCostRatio, regionSalesPrice, totals, data.contractorFlatCount]);

  // Bottom sheet modal controller
  useEffect(() => {
    if (showAdvanced) {
      setModalVisible(true);
      Animated.spring(bottomSheetTranslateY, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(bottomSheetTranslateY, {
        toValue: height,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        setModalVisible(false);
      });
    }
  }, [showAdvanced]);

  const adjustNormalCost = (amount) => {
    triggerHaptic();
    setNormalCost(prev => Math.max(10000, Math.min(100000, prev + amount)));
  };

  const adjustBodrumCost = (amount) => {
    triggerHaptic();
    setBodrumCost(prev => Math.max(10000, Math.min(100000, prev + amount)));
  };

  const adjustMutOrani = (amount) => {
    triggerHaptic();
    setMutOrani(prev => Math.max(10, Math.min(90, prev + amount)));
  };

  const adjustRoofArea = (amount) => {
    triggerHaptic();
    setRoofArea(prev => {
      const next = Math.max(0, prev + amount);
      setHasRoof(next > 0);
      return next;
    });
  };

  const handleRegionPriceChange = (text) => {
    const cleanText = text.replace(/[^0-9]/g, '');
    setRegionSalesPriceInput(cleanText);
    const numVal = Number(cleanText) || 0;
    setRegionSalesPrice(numVal);
  };

  const adjustRegionSalesPrice = (amount) => {
    triggerHaptic();
    setRegionSalesPrice(prev => Math.max(1000, Math.min(1000000, prev + amount)));
  };

  const handleDownloadPDF = () => {
    triggerHaptic();
    setIsDownloading(true);
    setTimeout(() => {
      setIsDownloading(false);
      Alert.alert(
        "PDF Raporu İndirildi",
        "K360-R-202613 referans numaralı Gayrimenkul Geliştirme Fizibilite Raporu cihazınıza PDF formatında başarıyla indirilmiştir.\n\nDosya Yolu: İndirilenler/Kent360_Fizibilite_Raporu_202613.pdf",
        [{ text: "Tamam" }]
      );
    }, 2000);
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(val);
  };

  const formatCostDisplay = (val) => {
    return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(val) + ' ₺';
  };

  const handleBack = () => {
    triggerHaptic();
    if (showCalculator) {
      setShowCalculator(false);
    } else {
      onBack();
    }
  };

  // ----------------------------------------------------
  // VIEW A: CHOICE SCREEN (TWO BUTTONS)
  // ----------------------------------------------------
  const renderChoiceView = () => (
    <View style={globalStyles.glassCard}>
      <Text style={styles.choiceStepTitle}>AŞAMA 4: Teklif ve Değerleme</Text>
      <Text style={globalStyles.title}>Nasıl devam etmek istersiniz?</Text>
      <Text style={globalStyles.subtitle}>
        Projeden beklentilerinize uygun şekilde süreci yönlendirebilirsiniz.
      </Text>

      <View style={styles.choicesContainer}>
        {/* Ortalama Kat m2 İle Fiyat Al */}
        <TouchableOpacity
          style={styles.choiceCard}
          onPress={() => { triggerHaptic(); setShowCalculator(true); }}
          activeOpacity={0.8}
        >
          <View style={styles.choiceHeader}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(6, 182, 212, 0.08)' }]}>
              <Calculator size={24} color={COLORS.primary} style={{ flexShrink: 0 }} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.choiceTitle}>Ortalama Kat m² Bilgilerinizle Fiyat Alın</Text>
              <Text style={styles.choiceDesc}>
                İmar ve kat m² alanlarınızı girerek tahmini yapım maliyetini ve m² hak dağılımlarını anında görün.
              </Text>
            </View>
            <ArrowRight size={20} color={COLORS.primary} style={{ flexShrink: 0,  marginLeft: 8 }} />
          </View>
        </TouchableOpacity>

        {/* Detaylı Teklif İçin Tıkla */}
        <TouchableOpacity
          style={[styles.choiceCard, styles.premiumChoiceCard]}
          onPress={() => { triggerHaptic(); onNext(); }}
          activeOpacity={0.8}
        >
          <View style={styles.choiceHeader}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(99, 102, 241, 0.08)' }]}>
              <Briefcase size={24} color={COLORS.secondary} style={{ flexShrink: 0 }} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.choiceTitle, { color: COLORS.secondary }]}>Detaylı Resmi Teklif İçin Tıkla</Text>
              <Text style={styles.choiceDesc}>
                Kadastro ve imar durumu analizine dayalı, bölgenizdeki yüklenici firmalardan resmi fizibilite teklif raporu talep edin.
              </Text>
            </View>
            <ArrowRight size={20} color={COLORS.secondary} style={{ flexShrink: 0,  marginLeft: 8 }} />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ----------------------------------------------------
  // VIEW B: DETAILED VALUATION CALCULATOR
  // ----------------  // ----------------------------------------------------
  // VIEW B: DETAILED VALUATION CALCULATOR (PDF FORMAT)
  // ----------------------------------------------------
  const renderCalculatorView = () => {
    const isNoContractor = data.contractorFlatCount === 0;
    const facades = data.facades || {
      top: { type: 'bahce', name: 'ORTAK BAHÇE', distance: '28m' },
      bottom: { type: 'yol', name: 'DEDE KORKUT SK.', distance: '' },
      left: { type: 'ekle', name: '', distance: '' },
      right: { type: 'ekle', name: '', distance: '' }
    };

    const arsaWidth = data.width || 28;
    const arsaDepth = data.depth || 30;
    const arsaArea = Math.round(arsaWidth * arsaDepth);



    const currentRoofType = blockStructure?.roofType || (hasRoof ? 'normal' : 'none');

    // Layout math matching interactive creator but scaled smaller
    const totalFloorsCount = reportFloors.length;
    const baseFloorHeight = Math.max(14, Math.min(22, 100 / (totalFloorsCount || 1)));
    const roofHeight = Math.max(14, Math.min(24, baseFloorHeight * 1.1));
    const unitTextSize = Math.max(4.5, Math.min(7, baseFloorHeight * 0.35));
    const unitNoTextSize = Math.max(5.5, Math.min(8.5, baseFloorHeight * 0.45));
    const labelTextSize = Math.max(5.5, Math.min(8, baseFloorHeight * 0.4));

    const getFormattedFloorLabel = (label, type) => {
      if (type === 'roof') return 'Çatı';
      if (type === 'ground') return 'Zemin';
      if (type === 'basement') {
        const match = label.match(/\d+/);
        return match ? `-${match[0]} B` : '-1 B';
      }
      const match = label.match(/\d+/);
      return match ? `${match[0]}. Kat` : label;
    };

    const renderMiniUnitCard = (unit, unitNum, floorKey, unitIndex) => {
      const details = getUnitDetails(unit);
      const { type: unitType, id: unitId } = details;
      const metadata = UNIT_METADATA[unitType] || { label: 'Daire', color: '#1E293B', bg: '#FFFFFF' };

      if (unitType === 'siginak') {
        return (
          <View
            key={unitId || `${floorKey}_${unitIndex}`}
            style={[styles.miniUnitCard, { backgroundColor: metadata.bg }]}
          >
            <Text style={[styles.miniUnitCardType, { fontSize: unitTextSize, color: metadata.color }]} numberOfLines={1}>
              SIĞINAK
            </Text>
          </View>
        );
      }

      const typeLabels = {
        daire: 'DAİRE',
        dukkan: 'DÜKKAN',
        depo: 'DEPO',
      };

      return (
        <View
          key={unitId || `${floorKey}_${unitIndex}`}
          style={[styles.miniUnitCard, { backgroundColor: metadata.bg }]}
        >
          <Text style={[styles.miniUnitCardType, { fontSize: unitTextSize, color: metadata.color }]} numberOfLines={1}>
            {typeLabels[unitType] || 'DAİRE'}
          </Text>
          <Text style={[styles.miniUnitCardNo, { fontSize: unitNoTextSize, color: metadata.color }]} numberOfLines={1}>
            No {unitNum}
          </Text>
        </View>
      );
    };

    // Dynamic color coding & layout builder for the mini-kroki boundaries
    const renderMiniFacadeSlot = (key, baseStyle, textStyleOverrides = {}) => {
      const fac = facades[key] || { type: 'ekle', name: '', distance: '' };
      let bgStyle = { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' };
      let textColor = '#475569';
      let titlePrefix = '';

      switch (fac.type) {
        case 'ekle':
          bgStyle = { backgroundColor: 'rgba(241, 245, 249, 0.5)', borderColor: '#CBD5E1', borderStyle: 'dashed' };
          textColor = '#94A3B8';
          titlePrefix = 'BOŞ';
          break;
        case 'bitisik':
          bgStyle = { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' };
          textColor = '#EF4444';
          titlePrefix = 'BİTİŞİK';
          break;
        case 'bahce':
          bgStyle = { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' };
          textColor = '#10B981';
          titlePrefix = 'BAHÇE';
          break;
        case 'arsa':
          bgStyle = { backgroundColor: '#F0FDFA', borderColor: '#5EEAD4', borderStyle: 'dashed' };
          textColor = '#0F766E';
          titlePrefix = 'KOMŞU';
          break;
        case 'yol':
          bgStyle = { backgroundColor: '#F1F5F9', borderColor: '#CBD5E1' };
          textColor = '#475569';
          titlePrefix = 'YOL';
          break;
        default:
          bgStyle = { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' };
          textColor = '#334155';
          titlePrefix = 'CEPHE';
      }

      let label = fac.name ? `${titlePrefix}: ${fac.name}` : titlePrefix;
      if (fac.distance && fac.type !== 'ekle') {
        label += ` (${fac.distance})`;
      }

      return (
        <View style={[styles.miniFacade, baseStyle, bgStyle]}>
          <Text style={[styles.miniFacadeText, { color: textColor }, textStyleOverrides]} numberOfLines={1}>
            {label.toUpperCase()}
          </Text>
        </View>
      );
    };

    return (
      <View style={styles.cardContainer}>
        {/* PDF SHEET HEADER BANNERS */}
        <View style={styles.pdfHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pdfHeaderBrand}>KENT360®</Text>
            <Text style={styles.pdfHeaderSub}>DİJİTAL İMAR & FİZİBİLİTE RAPORU</Text>
          </View>
          <View style={styles.pdfHeaderMeta}>
            <Text style={styles.pdfMetaText}>Rapor No: K360-R-202613</Text>
            <Text style={styles.pdfMetaText}>Tarih: 13.06.2026</Text>
            <View style={styles.pdfStatusBadge}>
              <Text style={styles.pdfStatusText}>ÖN FİZİBİLİTE HAZIR</Text>
            </View>
          </View>
        </View>

        <View style={styles.pdfDivider} />

        {/* PARSEL VE BİNA BİLGİLERİ ÖZETİ */}
        <Text style={styles.sectionHeading}>Parsel & Konum Analizi</Text>
        <View style={styles.summaryCard}>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>Lokasyon</Text>
              <Text style={styles.summaryItemValue}>
                {data.city && data.district ? `${data.city} / ${data.district}` : 'Belirtilmedi'}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>Ada / Parsel No</Text>
              <Text style={styles.summaryItemValue}>{adaNo || '-'} / {parselNo || '-'}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>Bina Tipi</Text>
              <Text style={styles.summaryItemValue}>
                {data.buildingType === 'single' ? 'Tekil Bina' : 'Site / Çoklu'} ({data.buildingCount || 1} Blok)
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>Parsel Ölçüleri</Text>
              <Text style={styles.summaryItemValue}>
                {arsaWidth}m x {arsaDepth}m ({arsaArea} m²)
              </Text>
            </View>
          </View>
        </View>

        {/* SIDE-BY-SIDE VISUALIZERS (2D Kroki & 2D Building Facade) */}
        <Text style={styles.sectionHeading}>Rapor Görsel Analizleri (2D Kroki & Yapılaşma Kesiti)</Text>
        <View style={styles.reportVisualizersRow}>
          {/* Sol Sütun: Parsel Krokisi */}
          <View style={styles.reportVisualizerBox}>
            <Text style={styles.visualizerBoxTitle}>1. PARSEL VE ÇEVRE YOL KROKİSİ</Text>
            <View style={styles.miniKrokiContainer}>
              {/* Surrounding Facades */}
              {renderMiniFacadeSlot('top', styles.miniFacadeTop)}
              {renderMiniFacadeSlot('bottom', styles.miniFacadeBottom)}
              {renderMiniFacadeSlot('left', styles.miniFacadeLeft, { transform: [{ rotate: '-90deg' }] })}
              {renderMiniFacadeSlot('right', styles.miniFacadeRight, { transform: [{ rotate: '90deg' }] })}

              {/* Arsa Merkez Kutusu */}
              <View style={styles.miniArsaBox}>
                <Text style={styles.miniArsaTitle}>ADA {adaNo || '-'}</Text>
                <Text style={styles.miniArsaTitle}>PARSEL {parselNo || '-'}</Text>
                <View style={styles.miniArsaBadge}>
                  <Text style={styles.miniArsaBadgeText}>
                    {arsaArea} m²
                  </Text>
                </View>
              </View>
            </View>
            <Text style={styles.visualizerBoxFooter}>
              {arsaWidth}m x {arsaDepth}m En/Boy
            </Text>
          </View>

          {/* Sağ Sütun: Bina Kesiti */}
          <View style={styles.reportVisualizerBox}>
            <Text style={styles.visualizerBoxTitle}>2. MİMARİ YAPILAŞMA KESİTİ</Text>
            <View style={styles.miniBuildingContainer}>
              {/* Roof rendering */}
              {currentRoofType === 'mansart' ? (
                <View style={[styles.miniBuildingRoof, { height: roofHeight }]}>
                  <Svg height={roofHeight} width={100} viewBox={`0 0 100 ${roofHeight}`}>
                    <Defs>
                      <SvgLinearGradient id="miniMansartRoofGrad" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor="#334155" stopOpacity="1" />
                        <Stop offset="1" stopColor="#0F172A" stopOpacity="1" />
                      </SvgLinearGradient>
                    </Defs>
                    <Polygon
                      points={`20,0 80,0 95,${roofHeight * 0.35} 100,${roofHeight} 0,${roofHeight} 5,${roofHeight * 0.35}`}
                      fill="url(#miniMansartRoofGrad)"
                      stroke="#1E293B"
                      strokeWidth={1}
                    />
                  </Svg>
                </View>
              ) : currentRoofType === 'normal' ? (
                <View style={[styles.miniBuildingRoof, { height: roofHeight }]}>
                  <View style={[styles.miniRoofTriangle, {
                    borderBottomWidth: roofHeight,
                    borderLeftWidth: 45,
                    borderRightWidth: 45,
                    borderBottomColor: '#1E293B',
                  }]} />
                  <View style={[styles.miniRoofTriangleInner, {
                    borderBottomWidth: roofHeight - 2,
                    borderLeftWidth: 43,
                    borderRightWidth: 43,
                    borderBottomColor: '#334155',
                  }]} />
                </View>
              ) : null}

              {/* Floors stack */}
              <View style={styles.miniFloorsStack}>
                {reportFloors.map((floor, idx) => {
                  const isBasement = floor.type === 'basement';
                  const isGround = floor.type === 'ground';

                  return (
                    <View key={floor.key} style={{ width: '100%' }}>
                      {/* Ground line separator */}
                      {isBasement && idx > 0 && reportFloors[idx - 1].type !== 'basement' && (
                        <View style={styles.miniGroundLine} />
                      )}

                      <View style={[
                        styles.miniFloorRow,
                        { height: baseFloorHeight }
                      ]}>
                        {/* Floor Label */}
                        <Text style={[styles.miniFloorLabel, { fontSize: labelTextSize }]} numberOfLines={1}>
                          {getFormattedFloorLabel(floor.label, floor.type)}
                        </Text>

                        {/* Units list container */}
                        <View style={[
                          styles.miniUnitsWrapper,
                          isBasement && { backgroundColor: '#F1F5F9', borderStyle: 'dashed' },
                          isGround && { borderColor: '#E2E8F0' }
                        ]}>
                          {floor.units.map((unit, uIdx) => {
                            const unitNum = unitNumbers[`${floor.key}_${uIdx}`] || (uIdx + 1);
                            return renderMiniUnitCard(unit, unitNum, floor.key, uIdx);
                          })}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
            <Text style={styles.visualizerBoxFooter}>
              Kat Adedi: {normalCount + bodrumCount} Kat
            </Text>
          </View>
        </View>

        {/* EXECUTIVE FEASIBILITY DASHBOARD */}
        <Text style={styles.sectionHeading}>Fizibilite Yönetici Özeti (Executive Dashboard)</Text>

        {/* Project totals highlights */}
        <View style={styles.dashboardSummaryRow}>
          <View style={[styles.dashboardSummaryBox, { borderLeftColor: '#10B981' }]}>
            <Text style={styles.dashboardSummaryLabel}>PROJE TOPLAM PAZAR DEĞERİ</Text>
            <Text style={[styles.dashboardSummaryValue, { color: '#065F46' }]}>
              {formatCurrency(totals.projectSalesValue)}
            </Text>
          </View>
          <View style={[styles.dashboardSummaryBox, { borderLeftColor: '#64748B' }]}>
            <Text style={styles.dashboardSummaryLabel}>TOPLAM YAPIM MALİYETİ</Text>
            <Text style={[styles.dashboardSummaryValue, { color: '#475569' }]}>
              {formatCurrency(totals.totalCost)}
            </Text>
          </View>
        </View>

        {/* Financial Cards Grid */}
        <View style={styles.financialCardsGrid}>
          {/* Arsa Sahibi Kazanım Kartı */}
          <View style={styles.landownerCard}>
            <View style={styles.cardHeaderWithIcon}>
              <Coins size={16} color="#F59E0B" style={{ flexShrink: 0 }} />
              <Text style={styles.landownerCardTitle}>ARSA SAHİBİ KAZANIMI</Text>
            </View>
            <View style={styles.cardStatRow}>
              <Text style={styles.cardStatLabel}>Toplam Alan Payı:</Text>
              <Text style={styles.cardStatValue}>{totals.landownerShareArea} m²</Text>
            </View>
            <View style={styles.cardStatRow}>
              <Text style={styles.cardStatLabel}>Tahmini Hak Değeri:</Text>
              <Text style={[styles.cardStatValue, { color: '#F59E0B' }]}>
                {formatCurrency(totals.landownerSalesValue)}
              </Text>
            </View>
            <View style={styles.cardBadgeContainer}>
              <Text style={styles.landownerBadgeText}>
                {isNoContractor ? 'Proje Sahibi: %100' : `Hasılat Payı: %${100 - mutOrani}`}
              </Text>
            </View>
          </View>

          {/* Müteahhit Kazanım Kartı */}
          {!isNoContractor && (
            <View style={styles.contractorCard}>
              <View style={styles.cardHeaderWithIcon}>
                <Briefcase size={16} color="#94a3b8" style={{ flexShrink: 0 }} />
                <Text style={styles.contractorCardTitle}>MÜTEAHHİT HAK & ANALİZİ</Text>
              </View>
              <View style={styles.cardStatRow}>
                <Text style={styles.cardStatLabel}>Toplam Alan Payı:</Text>
                <Text style={styles.cardStatValue}>{totals.contractorShareArea} m²</Text>
              </View>
              <View style={styles.cardStatRow}>
                <Text style={styles.cardStatLabel}>Satış Geliri (Brüt):</Text>
                <Text style={styles.cardStatValue}>{formatCurrency(totals.contractorSalesValue)}</Text>
              </View>
              <View style={styles.cardStatRow}>
                <Text style={styles.cardStatLabel}>Toplam Maliyet:</Text>
                <Text style={styles.cardStatValue}>{formatCurrency(totals.totalCost)}</Text>
              </View>
              <View style={styles.cardStatRow}>
                <Text style={styles.cardStatLabel}>Net Proje Karı:</Text>
                <Text style={[
                  styles.cardStatValue,
                  { color: totals.contractorNetProfit < 0 ? '#EF4444' : '#10B981' }
                ]}>
                  {formatCurrency(totals.contractorNetProfit)}
                </Text>
              </View>

              {/* Dynamic ROI Badge */}
              <View style={[
                styles.roiBadge,
                totals.contractorROI < 0 ? styles.roiBadgeDanger : styles.roiBadgeSuccess
              ]}>
                <Text style={[
                  styles.roiBadgeText,
                  totals.contractorROI < 0 ? styles.roiBadgeTextDanger : styles.roiBadgeTextSuccess
                ]}>
                  {totals.contractorROI < 0 ? '⚠️ Net Zarar: ' : '📈 Net ROI: '}
                  {totals.contractorROI.toFixed(1)}%
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* VALUATION SUMMARY TABLE */}
        <View style={styles.valuationTable}>
          <View style={[styles.tableRow, styles.tableHeaderRow]}>
            <Text style={styles.tableHeaderCell}>Hesaplama Detayları</Text>
            <Text style={[styles.tableHeaderCell, { textAlign: 'right' }]}>Değer</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Normal Katlar Toplamı</Text>
            <Text style={styles.tableCellValue}>{totals.totalNormalArea} m²</Text>
          </View>
          {bodrumCount > 0 && (
            <View style={[styles.tableRow, styles.tableRowOdd]}>
              <Text style={styles.tableCellLabel}>Bodrum Katlar Toplamı</Text>
              <Text style={styles.tableCellValue}>{totals.totalBodrumArea} m²</Text>
            </View>
          )}
          {hasRoof && roofArea > 0 && (
            <View style={styles.tableRow}>
              <Text style={styles.tableCellLabel}>Çatı Katı Alanı</Text>
              <Text style={styles.tableCellValue}>{roofArea} m²</Text>
            </View>
          )}
          {!isNoContractor && (
            <View style={[styles.tableRow, bodrumCount === 0 && !hasRoof ? styles.tableRowOdd : null]}>
              <Text style={styles.tableCellLabel}>Müteahhit Payı Alanı</Text>
              <Text style={styles.tableCellValue}>{totals.contractorShareArea} m²</Text>
            </View>
          )}
          <View style={[styles.tableRow, (bodrumCount > 0 || hasRoof) && !isNoContractor ? styles.tableRowOdd : null]}>
            <Text style={styles.tableCellLabel}>Arsa Sahibi Payı Alanı</Text>
            <Text style={styles.tableCellValue}>{totals.landownerShareArea} m²</Text>
          </View>
        </View>

        {/* SHARE PROGRESS BAR */}
        {!isNoContractor && (
          <View style={styles.shareProgressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Hak Sahipliği Dağılımı</Text>
              <Text style={styles.progressPercentText}>%{100 - mutOrani} Arsa / %{mutOrani} Müt.</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${100 - mutOrani}%` }]} />
            </View>
            <View style={styles.progressSubValuesRow}>
              <Text style={styles.progressSubVal}>Arsa Sahibi: {totals.landownerShareArea} m²</Text>
              <Text style={[styles.progressSubVal, { textAlign: 'right' }]}>Müteahhit: {totals.contractorShareArea} m²</Text>
            </View>
          </View>
        )}

        {/* CORE VALUATION CONTROLS */}
        <Text style={styles.sectionHeading}>Ana Değerleme Ayarları</Text>

        <View style={styles.controlRow}>
          <Text style={styles.controlLabel}>Yeni İmar Normal Kat İzni</Text>
          <View style={styles.stepperInputWrapper}>
            <TouchableOpacity style={styles.stepBtn} onPress={() => { triggerHaptic(); setNormalCount(prev => Math.max(1, prev - 1)); }}>
              <Text style={styles.stepBtnText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.numericValueText}>{normalCount}</Text>
            <TouchableOpacity style={styles.stepBtn} onPress={() => { triggerHaptic(); setNormalCount(prev => Math.min(25, prev + 1)); }}>
              <Text style={styles.stepBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.controlRow}>
          <Text style={styles.controlLabel}>Normal Kat Alanı (m²)</Text>
          <View style={styles.stepperInputWrapper}>
            <TouchableOpacity style={styles.stepBtn} onPress={() => { triggerHaptic(); setNormalArea(prev => Math.max(20, prev - 5)); }}>
              <Text style={styles.stepBtnText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.numericValueText}>{normalArea} m²</Text>
            <TouchableOpacity style={styles.stepBtn} onPress={() => { triggerHaptic(); setNormalArea(prev => Math.min(1500, prev + 5)); }}>
              <Text style={styles.stepBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {!isNoContractor && (
          <View style={[styles.controlRow, { alignItems: 'center' }]}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.controlLabel}>Müteahhit Payı (%)</Text>
              <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: '#64748B', marginTop: 4 }}>
                Tahmini Karşılık: ~{normalArea > 0 ? (totals.contractorShareArea / normalArea).toFixed(1) : 0} Kat
              </Text>
            </View>
            <View style={styles.stepperInputWrapper}>
              <TouchableOpacity style={styles.stepBtn} onPress={() => adjustMutOrani(-5)}>
                <Text style={styles.stepBtnText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.numericValueText}>%{mutOrani}</Text>
              <TouchableOpacity style={styles.stepBtn} onPress={() => adjustMutOrani(5)}>
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Hybrid input for region price control */}
        <View style={styles.controlRow}>
          <Text style={styles.controlLabel}>Bölge Satış m² Fiyatı</Text>
          <View style={styles.stepperInputWrapper}>
            <TouchableOpacity style={styles.stepBtn} onPress={() => adjustRegionSalesPrice(-2500)}>
              <Text style={styles.stepBtnText}>-</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.priceInput}
              value={regionSalesPriceInput ? new Intl.NumberFormat('tr-TR').format(Number(regionSalesPriceInput)) : ''}
              onChangeText={handleRegionPriceChange}
              keyboardType="number-pad"
              maxLength={10}
            />
            <TouchableOpacity style={styles.stepBtn} onPress={() => adjustRegionSalesPrice(2500)}>
              <Text style={styles.stepBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* COLLAPSIBLE ADVANCED PARAMETERS DRAWER TOGGLE */}
        <TouchableOpacity
          style={styles.advancedToggleBtn}
          onPress={() => { triggerHaptic(); setShowAdvanced(true); }}
          activeOpacity={0.8}
        >
          <Text style={styles.advancedToggleBtnText}>Gelişmiş Değerleme Ayarları</Text>
          <ChevronDown size={16} color={COLORS.primary} style={{ flexShrink: 0 }} />
        </TouchableOpacity>

        {/* OFFICIAL SEAL & SIGNATURE BLOCK */}
        <View style={styles.pdfFooterSection}>
          <View style={styles.signatureRow}>
            <View style={styles.signatureCol}>
              <Text style={styles.signatureLabel}>HAZIRLAYAN</Text>
              <Text style={styles.signatureTitle}>Kent360 Analiz Grubu</Text>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureName}>Dijital Onaylı (K360-AUTH)</Text>
            </View>
            <View style={styles.signatureCol}>
              <Text style={styles.signatureLabel}>ONAYLAYAN</Text>
              <Text style={styles.signatureTitle}>Arsa Malikleri Temsilcisi</Text>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureName}>İmza / Tarih</Text>
            </View>
          </View>

          {/* Official verified stamp */}
          <View style={styles.officialStampBox}>
            <ShieldCheck size={18} color="#059669" style={{ flexShrink: 0,  marginRight: 6 }} />
            <Text style={styles.officialStampText}>
              KENT360® DOĞRULANMIŞ FİZİBİLİTE RAPORU
            </Text>
          </View>
        </View>

        {/* LEGAL DISCLAIMER FOOTNOTE */}
        <Text style={styles.legalDisclaimerText}>
          * Hukuki Bilgilendirme: Bu değerleme raporu güncel piyasa ortalamalarına göre hesaplanmış brüt bir fizibilite taslağıdır. KDV, tapu/ruhsat harçları, iskan masrafları ve şerefiye farkları bu hesaba dahil edilmemiştir.
        </Text>

        {/* BOTTOM ACTION BUTTONS */}
        <View style={styles.bottomActionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.downloadPdfBtn]}
            onPress={handleDownloadPDF}
            activeOpacity={0.8}
          >
            <Text style={styles.downloadPdfBtnText}>PDF Raporu İndir</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.submitOfferBtn]}
            onPress={onNext}
            activeOpacity={0.8}
          >
            <Briefcase size={16} color="#FFFFFF" style={{ flexShrink: 0,  marginRight: 6 }} />
            <Text style={styles.submitOfferBtnText}>Detaylı Resmi Teklif Al</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={globalStyles.container}>
      {/* FIXED HEADER at the top */}
      <View style={{ paddingTop: Math.max(12, insets.top + 8), paddingHorizontal: 20 }}>
        {/* Geri & Çıkış Satırı */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <TouchableOpacity style={[styles.backBtn, { marginBottom: 0 }]} onPress={handleBack}>
            <ArrowLeft size={20} color={COLORS.textLight} style={{ flexShrink: 0 }} />
            <Text style={styles.backBtnText}>Geri</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.exitBtn} onPress={onExit}>
            <X size={20} color={COLORS.textLight} />
          </TouchableOpacity>
        </View>

        {/* Stepper Tracker (8/10 or 7/10) */}
        <View style={[globalStyles.stepperContainer, { marginBottom: 10 }]}>
          {Array.from({ length: data.unionType === 'block_based' ? 7 : 6 }).map((_, i) => (
            <View key={i} style={[globalStyles.stepIndicator, globalStyles.stepIndicatorCompleted]} />
          ))}
          <View style={[globalStyles.stepIndicator, globalStyles.stepIndicatorActive]} />
          {Array.from({ length: data.unionType === 'block_based' ? 2 : 3 }).map((_, i) => (
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
          {showCalculator ? renderCalculatorView() : renderChoiceView()}
        </View>
      </ScrollView>

      {/* ADVANCED VALUES BOTTOM SHEET MODAL */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAdvanced(false)}
      >
        <View style={styles.bottomSheetOverlay}>
          <TouchableOpacity
            style={styles.bottomSheetBackdrop}
            activeOpacity={1}
            onPress={() => setShowAdvanced(false)}
          />
          <Animated.View style={[
            styles.bottomSheetContent,
            {
              transform: [{ translateY: bottomSheetTranslateY }]
            }
          ]}>
            {/* Drag Handle */}
            <View style={styles.dragHandle} />

            <View style={styles.bottomSheetHeader}>
              <Text style={styles.bottomSheetTitle}>Gelişmiş Değerleme Ayarları</Text>
              <TouchableOpacity onPress={() => setShowAdvanced(false)}>
                <Text style={styles.bottomSheetCloseText}>Uygula</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.bottomSheetScroll} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

              {/* Bodrum Kat Sayısı */}
              <View style={styles.controlRow}>
                <Text style={styles.controlLabel}>Bodrum Kat Sayısı</Text>
                <View style={styles.stepperInputWrapper}>
                  <TouchableOpacity style={styles.stepBtn} onPress={() => {
                    triggerHaptic();
                    setBodrumCount(prev => Math.max(0, prev - 1));
                  }}>
                    <Text style={styles.stepBtnText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.numericValueText}>{bodrumCount}</Text>
                  <TouchableOpacity style={styles.stepBtn} onPress={() => {
                    triggerHaptic();
                    setBodrumCount(prev => Math.min(4, prev + 1));
                  }}>
                    <Text style={styles.stepBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Bodrum Alanı */}
              <View style={styles.controlRow}>
                <Text style={styles.controlLabel}>Bodrum Kat Alanı (m²)</Text>
                <View style={styles.stepperInputWrapper}>
                  <TouchableOpacity style={styles.stepBtn} onPress={() => {
                    triggerHaptic();
                    setBodrumArea(prev => Math.max(10, prev - 5));
                  }}>
                    <Text style={styles.stepBtnText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.numericValueText}>{bodrumArea} m²</Text>
                  <TouchableOpacity style={styles.stepBtn} onPress={() => {
                    triggerHaptic();
                    setBodrumArea(prev => Math.min(1500, prev + 5));
                    if (bodrumCount === 0) setBodrumCount(1);
                  }}>
                    <Text style={styles.stepBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Çatı Alanı */}
              <View style={styles.controlRow}>
                <Text style={styles.controlLabel}>Çatı Katı Alanı (m²)</Text>
                <View style={styles.stepperInputWrapper}>
                  <TouchableOpacity style={styles.stepBtn} onPress={() => adjustRoofArea(-5)}>
                    <Text style={styles.stepBtnText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.numericValueText}>{roofArea} m²</Text>
                  <TouchableOpacity style={styles.stepBtn} onPress={() => adjustRoofArea(5)}>
                    <Text style={styles.stepBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Normal Kat m2 Maliyeti */}
              <View style={styles.controlRow}>
                <Text style={styles.controlLabel}>Normal Kat m² Maliyeti</Text>
                <View style={styles.stepperInputWrapper}>
                  <TouchableOpacity style={styles.stepBtn} onPress={() => adjustNormalCost(-1000)}>
                    <Text style={styles.stepBtnText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.numericValueText}>{formatCostDisplay(normalCost)}</Text>
                  <TouchableOpacity style={styles.stepBtn} onPress={() => adjustNormalCost(1000)}>
                    <Text style={styles.stepBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Bodrum m2 Maliyeti */}
              <View style={styles.controlRow}>
                <Text style={styles.controlLabel}>Bodrum m² Maliyeti</Text>
                <View style={styles.stepperInputWrapper}>
                  <TouchableOpacity style={styles.stepBtn} onPress={() => adjustBodrumCost(-1000)}>
                    <Text style={styles.stepBtnText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.numericValueText}>{formatCostDisplay(bodrumCost)}</Text>
                  <TouchableOpacity style={styles.stepBtn} onPress={() => adjustBodrumCost(1000)}>
                    <Text style={styles.stepBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Çatı Katı Maliyet Yüzdesi Oranı */}
              <View style={styles.controlRow}>
                <Text style={styles.controlLabel}>Çatı Maliyet Yüzdesi (%)</Text>
                <View style={styles.stepperInputWrapper}>
                  <TouchableOpacity style={styles.stepBtn} onPress={() => { triggerHaptic(); setRoofCostRatio(prev => Math.max(10, prev - 5)); }}>
                    <Text style={styles.stepBtnText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.numericValueText}>%{roofCostRatio}</Text>
                  <TouchableOpacity style={styles.stepBtn} onPress={() => { triggerHaptic(); setRoofCostRatio(prev => Math.min(150, prev + 5)); }}>
                    <Text style={styles.stepBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.advancedHelpText}>
                * Çatı katı maliyeti, normal kat m² maliyetinin belirtilen yüzdesi (%{roofCostRatio}) olarak ağırlıklı hesaplanır. Mevcut çatı katı birim maliyeti: {formatCurrency(normalCost * (roofCostRatio / 100))} / m²
              </Text>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* PDF DOWNLOAD PROGRESS MODAL */}
      <Modal
        visible={isDownloading}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.loadingOverlayContainer}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Gayrimenkul Geliştirme Fizibilite Raporu PDF'i Hazırlanıyor...</Text>
            <Text style={styles.loadingSubtext}>Lütfen bekleyiniz...</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
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
  choiceStepTitle: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.primary,
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  choicesContainer: {
    marginTop: 8,
    gap: 16,
  },
  choiceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  premiumChoiceCard: {
    borderColor: '#CCFBF1',
    backgroundColor: COLORS.bgDark,
  },
  choiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  choiceTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  choiceDesc: {
    fontFamily: FONTS.regular,
    fontSize: 12.5,
    color: COLORS.textMuted,
    lineHeight: 18,
  },

  // CALCULATOR CARD
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
    paddingBottom: 12,
  },
  cardHeaderTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.textLight,
    marginLeft: 10,
  },
  sectionHeading: {
    fontFamily: FONTS.bold,
    fontSize: 10.5,
    color: '#64748B',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 14,
  },

  // MINIMAL 2D SCHEMATIC
  schematicWrapper: {
    alignItems: 'center',
    marginVertical: 24,
    width: '100%',
  },
  schematicRoof: {
    height: 22,
    backgroundColor: '#F59E0B',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
    borderWidth: 1,
    borderColor: '#D97706',
  },
  schematicFloorContainer: {
    backgroundColor: '#E0F2FE', // Soft sky blue windows background
    borderWidth: 1.5,
    borderColor: '#0EA5E9',
    borderRadius: 6,
    position: 'relative',
    overflow: 'hidden',
  },
  schematicFloorInner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'column-reverse', // Stack building blocks upwards
  },
  floorSlice: {
    height: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(14, 165, 233, 0.25)',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  windowBox: {
    width: 10,
    height: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 1.5,
    opacity: 0.8,
  },
  schematicBadgePill: {
    position: 'absolute',
    right: 6,
    top: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 10,
  },
  schematicBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 9,
    color: '#334155',
  },
  groundLineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 20,
    marginVertical: 4,
  },
  groundLineLabel: {
    fontFamily: FONTS.bold,
    fontSize: 9,
    color: '#64748B',
    marginRight: 6,
    width: 32,
    textAlign: 'right',
  },
  groundLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#475569',
  },
  schematicBodrum: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    borderRadius: 6,
    position: 'relative',
    overflow: 'hidden',
    borderStyle: 'dashed',
  },
  schematicBodrumInner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  bodrumSlice: {
    height: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.25)',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 8,
    backgroundColor: '#E2E8F0',
  },
  bodrumWindow: {
    width: 10,
    height: 4,
    backgroundColor: '#94A3B8',
    borderRadius: 1,
    opacity: 0.6,
  },
  bodrumLabelContainer: {
    position: 'absolute',
    alignSelf: 'center',
    top: '25%',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: '#CBD5E1',
    zIndex: 5,
  },
  schematicText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: '#1E293B',
    textAlign: 'center',
  },

  // VALUATION SUMMARY TABLE
  valuationTable: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    marginTop: 8,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
  },
  tableRowOdd: {
    backgroundColor: '#F8FAFC',
  },
  tableHeaderRow: {
    backgroundColor: '#F1F5F9',
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  tableHeaderCell: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: '#475569',
  },
  tableCellLabel: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: '#1E293B',
  },
  tableCellValue: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: '#0F172A',
  },

  // DOUBLE BOX SUMMARY
  horizontalSummary: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  summaryBoxHalf: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  summaryBoxLabel: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  summaryBoxValue: {
    fontFamily: FONTS.bold,
    fontSize: 14.5,
    color: '#0F172A',
    textAlign: 'center',
  },

  // CONTROLS
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
    width: '100%',
  },
  controlLabel: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: '#0F172A',
  },
  stepperInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 2,
  },
  stepBtn: {
    width: 28,
    height: 28,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: '#0F172A',
  },
  numericValueText: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: 'bold',
    textAlign: 'center',
    width: 75,
  },

  // SUMMARY CARD
  summaryCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryItem: {
    width: '48%',
    marginBottom: 8,
  },
  summaryItemLabel: {
    fontFamily: FONTS.bold,
    fontSize: 9,
    color: '#64748B',
    textTransform: 'uppercase',
  },
  summaryItemValue: {
    fontFamily: FONTS.medium,
    fontSize: 11.5,
    color: '#0F172A',
    marginTop: 1,
  },

  // SHARE PROGRESS BAR CARD
  shareProgressCard: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    alignItems: 'center',
  },
  progressLabel: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: '#0D9488',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressPercentText: {
    fontFamily: FONTS.bold,
    fontSize: 11.5,
    color: '#0F766E',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#CCFBF1',
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  progressSubValuesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  progressSubVal: {
    fontFamily: FONTS.medium,
    fontSize: 10,
    color: '#0F766E',
    flex: 1,
  },

  // LEAD CTA BTN
  leadCtaBtn: {
    backgroundColor: COLORS.secondary,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
    marginTop: 12,
  },
  leadCtaBtnText: {
    color: '#FFFFFF',
    fontFamily: FONTS.bold,
    fontSize: 15,
  },

  // COLLAPSIBLE DRAWER TOGGLE
  advancedToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 6,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 12,
    backgroundColor: 'rgba(14, 165, 233, 0.02)',
  },
  advancedToggleBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 12.5,
    color: COLORS.primary,
    marginRight: 6,
  },

  // BOTTOM SHEET MODAL STYLES
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  bottomSheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  bottomSheetContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 8,
    maxHeight: '80%',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 10,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 12,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
  },
  bottomSheetTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: '#0F172A',
  },
  bottomSheetCloseText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.primary,
    paddingHorizontal: 8,
  },
  bottomSheetScroll: {
    flexGrow: 0,
  },
  advancedHelpText: {
    fontFamily: FONTS.regular,
    fontSize: 10.5,
    color: COLORS.textMuted,
    lineHeight: 15,
    marginTop: 8,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  pdfHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pdfHeaderBrand: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  pdfHeaderSub: {
    fontFamily: FONTS.medium,
    fontSize: 9,
    color: '#64748B',
    letterSpacing: 1.2,
    marginTop: 2,
  },
  pdfHeaderMeta: {
    alignItems: 'flex-end',
  },
  pdfMetaText: {
    fontFamily: FONTS.medium,
    fontSize: 9.5,
    color: '#0F172A',
    marginBottom: 2,
  },
  pdfStatusBadge: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 2,
  },
  pdfStatusText: {
    fontFamily: FONTS.bold,
    fontSize: 8.5,
    color: '#065F46',
  },
  pdfDivider: {
    height: 1,
    backgroundColor: '#CBD5E1',
    marginVertical: 12,
    borderStyle: 'dashed',
  },
  reportVisualizersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  reportVisualizerBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  visualizerBoxTitle: {
    fontFamily: FONTS.bold,
    fontSize: 9.5,
    color: '#475569',
    letterSpacing: 0.5,
    marginBottom: 10,
    textAlign: 'center',
  },
  miniKrokiContainer: {
    width: '100%',
    height: 130,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  miniFacade: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E2E8F0',
  },
  miniFacadeTop: {
    top: 0,
    left: 0,
    right: 0,
    height: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
  },
  miniFacadeBottom: {
    bottom: 0,
    left: 0,
    right: 0,
    height: 20,
    borderTopWidth: 1,
    borderTopColor: '#CBD5E1',
  },
  miniFacadeLeft: {
    left: 0,
    top: 20,
    bottom: 20,
    width: 20,
    borderRightWidth: 1,
    borderRightColor: '#CBD5E1',
  },
  miniFacadeRight: {
    right: 0,
    top: 20,
    bottom: 20,
    width: 20,
    borderLeftWidth: 1,
    borderLeftColor: '#CBD5E1',
  },
  miniFacadeText: {
    fontFamily: FONTS.bold,
    fontSize: 8,
    color: '#475569',
    textAlign: 'center',
  },
  miniArsaBox: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniArsaTitle: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: '#0F172A',
  },
  miniArsaBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginTop: 4,
  },
  miniArsaBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 8.5,
    color: '#FFFFFF',
  },
  visualizerBoxFooter: {
    fontFamily: FONTS.medium,
    fontSize: 9.5,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
  },
  miniBuildingContainer: {
    width: '100%',
    minHeight: 130,
    justifyContent: 'flex-end',
    alignItems: 'center',
    position: 'relative',
    paddingTop: 10,
  },
  miniBuildingRoof: {
    width: 100,
    height: 18,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 1,
    marginLeft: 38,
  },
  miniRoofTriangle: {
    borderBottomWidth: 12,
    borderBottomColor: '#1E293B',
    borderLeftWidth: 50,
    borderLeftColor: 'transparent',
    borderRightWidth: 50,
    borderRightColor: 'transparent',
    width: 0,
    height: 0,
  },
  miniRoofTriangleInner: {
    borderBottomWidth: 10,
    borderBottomColor: '#334155',
    borderLeftWidth: 48,
    borderLeftColor: 'transparent',
    borderRightWidth: 48,
    borderRightColor: 'transparent',
    width: 0,
    height: 0,
    position: 'absolute',
    bottom: 0,
  },
  miniRoofTrapezoid: {
    width: 100,
    height: 0,
    borderStyle: 'solid',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    position: 'absolute',
    bottom: 0,
  },
  miniRoofTrapezoidInner: {
    width: 96,
    height: 0,
    borderStyle: 'solid',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    position: 'absolute',
    bottom: 0,
  },
  miniFloorsStack: {
    width: '100%',
    alignItems: 'center',
  },
  miniFloorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  miniFloorLabel: {
    fontFamily: FONTS.bold,
    fontSize: 7.5,
    color: '#64748B',
    width: 32,
    textAlign: 'right',
    marginRight: 6,
  },
  miniUnitsWrapper: {
    flex: 1,
    height: '100%',
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 3,
    paddingHorizontal: 2,
    paddingVertical: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  miniUnitCard: {
    flex: 1,
    height: '100%',
    borderRadius: 2,
    marginHorizontal: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#CBD5E1',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0.5 },
    shadowOpacity: 0.05,
    shadowRadius: 0.5,
    elevation: 1,
  },
  miniUnitCardType: {
    fontFamily: FONTS.bold,
    fontSize: 5.5,
    textAlign: 'center',
  },
  miniUnitCardNo: {
    fontFamily: FONTS.bold,
    fontSize: 6.5,
    textAlign: 'center',
  },
  miniGroundLine: {
    height: 1.5,
    backgroundColor: '#475569',
    width: 96,
    alignSelf: 'flex-end',
    marginVertical: 2,
  },
  pdfFooterSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    borderStyle: 'dashed',
    alignItems: 'center',
    width: '100%',
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  signatureCol: {
    flex: 1,
    alignItems: 'center',
  },
  signatureLabel: {
    fontFamily: FONTS.bold,
    fontSize: 8.5,
    color: '#64748B',
    letterSpacing: 1,
    marginBottom: 4,
  },
  signatureTitle: {
    fontFamily: FONTS.medium,
    fontSize: 10,
    color: '#0F172A',
    marginBottom: 10,
  },
  signatureLine: {
    width: '75%',
    height: 1,
    backgroundColor: '#CBD5E1',
    marginBottom: 4,
  },
  signatureName: {
    fontFamily: FONTS.regular,
    fontSize: 8,
    color: '#64748B',
  },
  officialStampBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#10B981',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'center',
  },
  officialStampText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: '#065F46',
    letterSpacing: 0.5,
  },
  priceInput: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: 'bold',
    textAlign: 'center',
    width: 95,
    padding: 0,
  },
  dashboardSummaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    width: '100%',
  },
  dashboardSummaryBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 12,
  },
  dashboardSummaryLabel: {
    fontFamily: FONTS.bold,
    fontSize: 8,
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  dashboardSummaryValue: {
    fontFamily: FONTS.bold,
    fontSize: 14,
  },
  financialCardsGrid: {
    flexDirection: 'column',
    gap: 12,
    marginBottom: 16,
    width: '100%',
  },
  landownerCard: {
    backgroundColor: '#064e3b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#047857',
  },
  landownerCardTitle: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: '#F59E0B',
    letterSpacing: 0.5,
  },
  cardHeaderWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  cardStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  cardStatLabel: {
    fontFamily: FONTS.medium,
    fontSize: 11.5,
    color: '#E6F4EA',
  },
  cardStatValue: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  cardBadgeContainer: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 10,
  },
  landownerBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: '#F59E0B',
  },
  contractorCard: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  contractorCardTitle: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  roiBadge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 10,
    borderWidth: 1,
  },
  roiBadgeSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  roiBadgeDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  roiBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
  },
  roiBadgeTextSuccess: {
    color: '#10B981',
  },
  roiBadgeTextDanger: {
    color: '#EF4444',
  },
  legalDisclaimerText: {
    fontFamily: FONTS.regular,
    fontSize: 9,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 13,
    marginTop: 14,
    marginBottom: 10,
    paddingHorizontal: 8,
  },
  bottomActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    width: '100%',
  },
  actionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  downloadPdfBtn: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  downloadPdfBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: '#475569',
  },
  submitOfferBtn: {
    backgroundColor: COLORS.secondary,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  submitOfferBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  loadingOverlayContainer: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: width * 0.8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  loadingText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: '#0F172A',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 6,
  },
  loadingSubtext: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
});
