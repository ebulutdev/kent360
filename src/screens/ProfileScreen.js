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
  const [mutType, setMutType] = useState(data.mutType || 'MÜT YOK');
  const [isMansart, setIsMansart] = useState(
    data.isMansart !== undefined ? data.isMansart : (hasMansartRoof || false)
  );

  // Local width/depth states for typing responsiveness, committed to main states onEndEditing/Blur
  const [localWidth, setLocalWidth] = useState(data.width ? String(data.width) : '28');
  const [localDepth, setLocalDepth] = useState(data.depth ? String(data.depth) : '30');
  const [buildingWidth, setBuildingWidth] = useState(data.width || 28);
  const [buildingDepth, setBuildingDepth] = useState(data.depth || 30);

  // Facades layout configuration
  const [facades, setFacades] = useState(data.facades || {
    top: { type: 'bahce', name: 'ORTAK BAHÇE', distance: '28m' },
    bottom: { type: 'yol', name: 'DEDE KORKUT SK.', distance: '' },
    left: { type: 'ekle', name: '', distance: '' },
    right: { type: 'ekle', name: '', distance: '' }
  });

  // Modal selector state
  const [facadeModalOpen, setFacadeModalOpen] = useState(false);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [activeFacadeKey, setActiveFacadeKey] = useState(null); // 'top' | 'bottom' | 'left' | 'right'
  const [modalType, setModalType] = useState('ekle');
  const [modalName, setModalName] = useState('');
  const [modalDistance, setModalDistance] = useState('');

  // Haptic feedback helper
  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      // Catch silently if not supported in environment
    }
  };

  // Helper info dialogs for tooltips
  const showInfoAlert = (title, message) => {
    triggerHaptic();
    Alert.alert(
      title,
      message,
      [{ text: 'Anladım', style: 'cancel' }],
      { cancelable: true }
    );
  };

  // Stepper increment/decrement handlers
  const handleFloorsChange = (change) => {
    triggerHaptic();
    setFloorsCount(prev => Math.max(1, Math.min(20, prev + change)));
  };

  const toggleMutType = (type) => {
    triggerHaptic();
    if (type === 'MÜT YOK') {
      Alert.alert(
        'Müteahhit Pay Durumu',
        'Müteahhite paysız devam etmek istediğinizden emin misiniz?',
        [
          { text: 'Hayır', style: 'cancel' },
          { text: 'Evet', onPress: () => setMutType('MÜT YOK') }
        ],
        { cancelable: false }
      );
    } else {
      setMutType(type);
    }
  };

  const handleMansartToggle = (val) => {
    triggerHaptic();
    setIsMansart(val);
  };

  // Dimensions blur commits
  const handleWidthBlur = () => {
    const parsed = parseFloat(localWidth) || 0;
    if (parsed > 0) {
      setBuildingWidth(parsed);
    } else {
      setLocalWidth(String(buildingWidth));
    }
  };

  const handleDepthBlur = () => {
    const parsed = parseFloat(localDepth) || 0;
    if (parsed > 0) {
      setBuildingDepth(parsed);
    } else {
      setLocalDepth(String(buildingDepth));
    }
  };

  // Computed total area
  const totalArea = useMemo(() => {
    return Math.round(buildingWidth * buildingDepth);
  }, [buildingWidth, buildingDepth]);

  // Open configuration for surrounding facade
  const openFacadeEditor = (key) => {
    triggerHaptic();
    setActiveFacadeKey(key);
    const current = facades[key] || { type: 'ekle', name: '', distance: '' };
    setModalType(current.type);
    setModalName(current.name || '');
    setModalDistance(current.distance || '');
    setFacadeModalOpen(true);
  };

  // Save selected facade config
  const saveFacadeConfig = () => {
    triggerHaptic();
    setFacades(prev => ({
      ...prev,
      [activeFacadeKey]: {
        type: modalType,
        name: modalType === 'ekle' ? '' : modalName,
        distance: (modalType === 'bahce' && modalDistance) ? (modalDistance.endsWith('m') ? modalDistance : `${modalDistance}m`) : ''
      }
    }));
    setFacadeModalOpen(false);
  };

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
        isMansart,
        width: buildingWidth,
        depth: buildingDepth,
        facades,
        ...(updatedStructures ? { buildingStructures: updatedStructures } : {})
      });
      onNext();
    };

    if (mutType === 'MÜT YOK') {
      Alert.alert(
        'Müteahhit Pay Durumu',
        'Müteahhite paysız devam etmek istediğinizden emin misiniz?',
        [
          { text: 'Hayır', style: 'cancel' },
          { text: 'Evet', onPress: proceed }
        ],
        { cancelable: false }
      );
    } else {
      proceed();
    }
  };

  // Sliders background animation hooks
  const mutSlideAnim = useRef(new Animated.Value(mutType === 'MÜT D' ? 0 : (mutType === 'MÜT P' ? 1 : 2))).current;
  useEffect(() => {
    let toValue = 0;
    if (mutType === 'MÜT P') toValue = 1;
    else if (mutType === 'MÜT YOK') toValue = 2;
    Animated.spring(mutSlideAnim, {
      toValue,
      useNativeDriver: false,
      friction: 8,
      tension: 50
    }).start();
  }, [mutType]);

  const mansartSlideAnim = useRef(new Animated.Value(isMansart ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(mansartSlideAnim, {
      toValue: isMansart ? 1 : 0,
      useNativeDriver: false,
      friction: 8,
      tension: 50
    }).start();
  }, [isMansart]);

  const mutIndicatorLeft = mutSlideAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: ['1%', '34.3%', '67.6%']
  });

  const mansartIndicatorLeft = mansartSlideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['1%', '51%']
  });



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

    if (facade.type === 'ekle') {
      return (
        <TouchableOpacity
          style={[styles.facadeSlot, styles.facadeAdd, positionStyles]}
          onPress={() => openFacadeEditor(key)}
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
          onPress={() => openFacadeEditor(key)}
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
          onPress={() => openFacadeEditor(key)}
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
          onPress={() => openFacadeEditor(key)}
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
          onPress={() => openFacadeEditor(key)}
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

  // Shared form inputs renderer for space efficiency
  const renderFormFields = () => {
    return (
      <View style={styles.formFieldsInner}>
        {/* 1. Müteahhit Payı Bilgisi */}
        <Text style={styles.compactGroupHeader}>1. MÜTEAHHİT PAYI HESAPLAMA TİPİ</Text>

        <View style={styles.labelWithHelp}>
          <Text style={styles.compactInputLabel}>Hesaplama Tipi</Text>
          <TouchableOpacity onPress={() => showInfoAlert('Müteahhit Payı Tipi', 'MÜT D (Daire Payı): Müteahhide verilecek bağımsız bölüm daire adedini temel alır.\nMÜT P (Pay Oranı): Toplam inşaat alanının müteahhide ait olan yüzdelik (%) oranını belirtir.\nMÜT YOK (Paysız): Müteahhit payı olmadığını belirtir.')}>
            <HelpCircle size={13} color={COLORS.textMuted} style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </View>

        <View style={styles.mutSegmentContainer}>
          <Animated.View style={[styles.segmentIndicator, { left: mutIndicatorLeft, width: '31.4%' }]} />
          <TouchableOpacity
            style={styles.mutSegmentBtn}
            onPress={() => toggleMutType('MÜT D')}
            activeOpacity={0.8}
          >
            <Home size={12} color={mutType === 'MÜT D' ? COLORS.primary : COLORS.textMuted} style={{ marginRight: 4 }} />
            <View>
              <Text style={[styles.mutSegmentText, mutType === 'MÜT D' && styles.mutSegmentTextActive]}>MÜT D</Text>
              <Text style={styles.mutSegmentDesc}>Daire</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.mutSegmentBtn}
            onPress={() => toggleMutType('MÜT P')}
            activeOpacity={0.8}
          >
            <Percent size={12} color={mutType === 'MÜT P' ? COLORS.primary : COLORS.textMuted} style={{ marginRight: 4 }} />
            <View>
              <Text style={[styles.mutSegmentText, mutType === 'MÜT P' && styles.mutSegmentTextActive]}>MÜT P</Text>
              <Text style={styles.mutSegmentDesc}>Pay %</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.mutSegmentBtn}
            onPress={() => toggleMutType('MÜT YOK')}
            activeOpacity={0.8}
          >
            <X size={12} color={mutType === 'MÜT YOK' ? COLORS.primary : COLORS.textMuted} style={{ marginRight: 4 }} />
            <View>
              <Text style={[styles.mutSegmentText, mutType === 'MÜT YOK' && styles.mutSegmentTextActive]}>MÜT YOK</Text>
              <Text style={styles.mutSegmentDesc}>Paysız</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* 2. Ölçülendirme */}
        <Text style={styles.compactGroupHeader}>2. BİNA ÖLÇÜLERİ</Text>

        <View style={styles.inputsGridCompact}>
          <View style={[styles.compactCol, { marginRight: 4 }]}>
            <View style={styles.labelWithHelp}>
              <Text style={styles.compactInputLabel}>Genişlik En (m)</Text>
              <TouchableOpacity onPress={() => showInfoAlert('Genişlik En', 'Bina veya arsanızın yatay (en) genişliğidir. Değiştirdiğinizde kroki en-boy oranına göre dinamik olarak güncellenir.')}>
                <HelpCircle size={11} color={COLORS.textMuted} style={{ marginLeft: 3 }} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.textInputStyleCompact}
              placeholder="En"
              placeholderTextColor="#94A3B8"
              value={localWidth}
              onChangeText={setLocalWidth}
              keyboardType="decimal-pad"
              onEndEditing={handleWidthBlur}
              onBlur={handleWidthBlur}
            />
          </View>
          <View style={[styles.compactCol, { marginLeft: 4 }]}>
            <View style={styles.labelWithHelp}>
              <Text style={styles.compactInputLabel}>Derinlik Boy (m)</Text>
              <TouchableOpacity onPress={() => showInfoAlert('Derinlik Boy', 'Bina veya arsanızın derinlik (boy) uzunluğudur. Değiştirdiğinizde kroki en-boy oranına göre dinamik olarak güncellenir.')}>
                <HelpCircle size={11} color={COLORS.textMuted} style={{ marginLeft: 3 }} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.textInputStyleCompact}
              placeholder="Boy"
              placeholderTextColor="#94A3B8"
              value={localDepth}
              onChangeText={setLocalDepth}
              keyboardType="decimal-pad"
              onEndEditing={handleDepthBlur}
              onBlur={handleDepthBlur}
            />
          </View>
        </View>

        {/* Toplam Alan Göstergesi */}
        <View style={styles.areaRowBoxCompact}>
          <Text style={styles.areaRowLabelCompact}>TOPLAM HESAPLANAN ALAN</Text>
          <Text style={styles.areaRowValCompact}>{totalArea} m²</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bgDark }}>
        <View style={[styles.screenWrapper, { paddingTop: insets.top > 0 ? insets.top + 8 : 8 }]}>
          <View style={styles.glow} />

          {/* Header Box */}
          <View style={styles.blueprintTitleBoxCompact}>
            <TouchableOpacity style={styles.compactBackBtn} onPress={onBack}>
              <ArrowLeft size={16} color={COLORS.textLight} />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.blueprintTitleText}>PARSEL & CEPHE MODELLEME (2D)</Text>
              <Text style={styles.blueprintScaleText}>ÖLÇEK: DİNAMİK</Text>
            </View>
          </View>

          {/* Progress Stepper */}
          <View style={styles.mobileStepperContainer}>
            {Array.from({ length: 5 }).map((_, i) => (
              <View key={i} style={[globalStyles.stepIndicator, globalStyles.stepIndicatorCompleted, { height: 3 }]} />
            ))}
            <View style={[globalStyles.stepIndicator, globalStyles.stepIndicatorActive, { height: 3 }]} />
            {Array.from({ length: 4 }).map((_, i) => (
              <View key={i} style={[globalStyles.stepIndicator, { height: 3 }]} />
            ))}
          </View>

          {/* Subtitle Description */}
          <View style={styles.headerSubtitleBox}>
            <Text style={styles.headerSubtitleText}>
              Bina imar durumu ve cephe ilişkilerini görsel olarak inceleyin. Bilgileri düzenlemek için "Bilgiler" butonuna tıklayabilirsiniz.
            </Text>
          </View>

          {/* Centered 2D Visualizer Area */}
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
              <View style={styles.centerBuildingBox}>
                <Text style={styles.titleLabel}>PARSEL DETAYI</Text>
                <Text style={styles.mainInfo}>ADA {adaNo} / PARSEL {parselNo}</Text>

                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{totalArea} m²</Text>
                </View>

                <Text style={styles.subText}>{buildingWidth}m x {buildingDepth}m</Text>
                <Text style={styles.subText}>
                  {floorsCount} Kat {isMansart ? '(Mansart Çatılı)' : (hasAtticRoof ? '(Çatı Piyesli)' : '')}
                </Text>
                <Text style={styles.subTextMuted}>Hesap Tipi: {mutType}</Text>
              </View>
            </View>
          </View>

          {/* Bottom Button Row */}
          <View style={styles.bottomButtonsRow}>
            {/* Bilgiler button */}
            <TouchableOpacity
              style={styles.infoOpenBtn}
              onPress={() => setInfoModalOpen(true)}
              activeOpacity={0.8}
            >
              <FileText size={18} color="#D97706" style={{ marginRight: 6 }} />
              <Text style={styles.infoOpenBtnText}>Bilgiler</Text>
            </TouchableOpacity>

            {/* Bina Profilini Onayla ve Devam Et button */}
            <TouchableOpacity
              style={styles.confirmSubmitBtn}
              onPress={handleNextSubmit}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmSubmitBtnText}>Bina Profilini Onayla</Text>
              <ArrowRight size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* PARAMETERS CONFIG MODAL */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={infoModalOpen}
        onRequestClose={() => setInfoModalOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setInfoModalOpen(false)}
        >
          <TouchableWithoutFeedback>
            <View style={[styles.modalContent, styles.infoModalContent]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Bina Ölçüleri & Müteahhit Payı</Text>
                <TouchableOpacity onPress={() => setInfoModalOpen(false)}>
                  <X size={18} color={COLORS.textLight} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalFormScroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {renderFormFields()}
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalConfirmBtn}
                  onPress={() => setInfoModalOpen(false)}
                >
                  <Text style={styles.modalConfirmBtnText}>Kaydet</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* SURROUNDING FACADE EDIT POPUP MODAL */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={facadeModalOpen}
        onRequestClose={() => setFacadeModalOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setFacadeModalOpen(false)}
        >
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Cephe Durumu Seçin</Text>
                <TouchableOpacity onPress={() => setFacadeModalOpen(false)}>
                  <X size={18} color={COLORS.textLight} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalOptionsScroll} showsVerticalScrollIndicator={false}>
                {[
                  { key: 'ekle', label: '➕ Birim Yok / Boş', desc: 'Cepheyi boşta bırak' },
                  { key: 'bitisik', label: '🏠 Bitişik Bina (Kör Cephe)', desc: 'Bitişik ortak yangın duvarı' },
                  { key: 'bahce', label: '🌳 Bahçe / Ortak Bahçe', desc: 'Yeşil alan veya park alanı' },
                  { key: 'arsa', label: '⬜ Boş Arsa', desc: 'Yapılaşmamış açık alan' },
                  { key: 'yol', label: '🛣️ Yol / Sokak', desc: 'İsimlendirilebilir kamu yolu' }
                ].map(opt => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.modalItem, modalType === opt.key && styles.modalItemActive]}
                    onPress={() => setModalType(opt.key)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.modalItemText, modalType === opt.key && styles.modalItemTextActive]}>
                      {opt.label}
                    </Text>
                    <Text style={styles.modalItemDesc}>{opt.desc}</Text>
                  </TouchableOpacity>
                ))}

                {modalType === 'yol' && (
                  <View style={styles.modalInputWrapper}>
                    <Text style={styles.modalInputLabel}>Yol / Sokak Adı</Text>
                    <TextInput
                      style={styles.modalTextInput}
                      placeholder="Örn: Dede Korkut Sk."
                      placeholderTextColor="#94A3B8"
                      value={modalName}
                      onChangeText={setModalName}
                    />
                  </View>
                )}

                {modalType === 'bahce' && (
                  <View style={styles.modalInputWrapper}>
                    <Text style={styles.modalInputLabel}>Bahçe Adı / Mesafe</Text>
                    <TextInput
                      style={styles.modalTextInput}
                      placeholder="Örn: Ortak Bahçe veya 5m"
                      placeholderTextColor="#94A3B8"
                      value={modalName}
                      onChangeText={setModalName}
                    />
                    <Text style={[styles.modalInputLabel, { marginTop: 6 }]}>Mesafe Uzunluğu (İsteğe Bağlı)</Text>
                    <TextInput
                      style={styles.modalTextInput}
                      placeholder="Örn: 28m"
                      placeholderTextColor="#94A3B8"
                      value={modalDistance}
                      onChangeText={setModalDistance}
                      keyboardType="default"
                    />
                  </View>
                )}
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setFacadeModalOpen(false)}
                >
                  <Text style={styles.modalCancelBtnText}>İptal</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalConfirmBtn}
                  onPress={saveFacadeConfig}
                >
                  <Text style={styles.modalConfirmBtnText}>Kaydet</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>
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
  splitRow: {
    flex: 1,
    flexDirection: 'row',
  },

  // MOBILE BLUEPRINT CONTAINER (Behind bottom sheet)
  mobileBlueprintContainer: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : 8,
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
  mobileBlueprintContainerInline: {
    backgroundColor: COLORS.bgDark,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    width: '100%',
    position: 'relative',
  },

  mobileFormContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: '100%',
  },
  nextBtnCompactInline: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 20,
  },

  // LARGE SCREEN / TABLET VIEW PANELS
  leftPanelLarge: {
    flex: 0.85,
    height: '100%',
    backgroundColor: COLORS.bgDark,
  },
  rightPanelLarge: {
    flex: 1.15,
    height: '100%',
    backgroundColor: COLORS.bgMedium,
    borderLeftWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  // INTERACTIVE 2D KROKI DIAGRAM
  krokiContainer: {
    width: 360,
    height: 360,
    backgroundColor: '#F8FAFC', // Very light blueprint background
    borderWidth: 1.5,
    borderColor: '#E2E8F0', // slate-200
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

  // POSITIONED FACADE SLOTS
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

  // FACADE STYLINGS
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

  // DIMENSIONS MEASURING BARS
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

  // CENTER BOX: MEVCUT PROJE ALANI
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
    backgroundColor: '#FEF3C7', // Amber-50
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
  // Crosshair styles for drafting aesthetic
  crosshair: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderColor: '#94A3B8' // slate-400
  },
  chTopLeft: { top: 10, left: 10, borderTopWidth: 1.5, borderLeftWidth: 1.5 },
  chTopRight: { top: 10, right: 10, borderTopWidth: 1.5, borderRightWidth: 1.5 },
  chBottomLeft: { bottom: 10, left: 10, borderBottomWidth: 1.5, borderLeftWidth: 1.5 },
  chBottomRight: { bottom: 10, right: 10, borderBottomWidth: 1.5, borderRightWidth: 1.5 },

  // SCROLLABLE FORM PANEL STYLES
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  backBtnText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.textLight,
    marginLeft: 6,
  },
  mainTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 16,
  },

  // COMPACT CONFIG FIELDS & HEADERS
  formFieldsInner: {
    flexDirection: 'column',
  },
  compactGroupHeader: {
    fontFamily: FONTS.bold,
    fontSize: 10.5,
    color: COLORS.primary,
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingBottom: 3,
  },
  compactRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  compactCol: {
    flex: 1,
    flexDirection: 'column',
  },
  labelWithHelp: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  compactInputLabel: {
    fontFamily: FONTS.bold,
    fontSize: 10.5,
    color: COLORS.textLight,
  },

  // COMPACT STEPPER
  compactStepperBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    height: 34,
  },
  compactStepperBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactStepperVal: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'center',
    minWidth: 32,
  },

  // COMPACT SLIDING SEGMENTED CONTROLS
  yesNoSegmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 2,
    position: 'relative',
    height: 34,
    alignItems: 'center',
  },
  segmentIndicator: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  yesNoSegmentBtn: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  yesNoSegmentText: {
    fontFamily: FONTS.bold,
    fontSize: 10.5,
    color: COLORS.textMuted,
  },
  yesNoSegmentTextActive: {
    color: COLORS.primary,
  },

  mutSegmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 2,
    position: 'relative',
    height: 42,
    alignItems: 'center',
    marginBottom: 8,
  },
  mutSegmentBtn: {
    flex: 1,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  mutSegmentText: {
    fontFamily: FONTS.bold,
    fontSize: 11.5,
    color: COLORS.textMuted,
  },
  mutSegmentTextActive: {
    color: COLORS.primary,
  },
  mutSegmentDesc: {
    fontFamily: FONTS.regular,
    fontSize: 8,
    color: COLORS.textMuted,
    marginTop: -1,
  },

  // COMPACT GRID SYSTEM (2x2)
  inputsGridCompact: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  textInputStyleCompact: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
    height: 32,
    fontSize: 12.5,
    color: COLORS.textLight,
    fontFamily: FONTS.regular,
  },

  // TOTAL AREA ROW
  areaRowBoxCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginTop: 6,
    marginBottom: 8,
  },
  areaRowLabelCompact: {
    fontFamily: FONTS.bold,
    fontSize: 9.5,
    color: COLORS.success,
  },
  areaRowValCompact: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.success,
  },

  // NEXT BTN
  nextBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  nextBtnCompact: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextBtnText: {
    color: COLORS.secondary,
    fontFamily: FONTS.bold,
    fontSize: 13,
    marginRight: 6,
  },

  // GLOW BACKDROP EFFECT
  glow: {
    position: 'absolute',
    top: 50,
    left: -50,
    width: windowWidth * 0.7,
    height: windowWidth * 0.7,
    borderRadius: windowWidth * 0.35,
    backgroundColor: COLORS.secondary,
    opacity: 0.03,
  },

  // FACADE EDITOR MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.bgMedium,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 16,
    width: '100%',
    maxWidth: 340,
    padding: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingBottom: 10,
    marginBottom: 10,
  },
  modalTitle: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.textLight,
  },
  modalOptionsScroll: {
    maxHeight: 280,
  },
  modalItem: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  modalItemActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(6, 182, 212, 0.06)',
  },
  modalItemText: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.textLight,
  },
  modalItemTextActive: {
    color: COLORS.primary,
  },
  modalItemDesc: {
    fontFamily: FONTS.regular,
    fontSize: 9.5,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  modalInputWrapper: {
    marginTop: 10,
    padding: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalInputLabel: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  modalTextInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
    color: COLORS.textLight,
    fontFamily: FONTS.regular,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    borderTopWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingTop: 12,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.textMuted,
  },
  modalConfirmBtn: {
    flex: 1,
    backgroundColor: '#D97706',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalConfirmBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.white,
  },
  inlineEditBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  inlineEditBtnText: {
    color: COLORS.white,
    fontFamily: FONTS.bold,
    fontSize: 11,
  },
  inlineCloseBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  inlineCloseBtnText: {
    color: COLORS.textLight,
    fontFamily: FONTS.bold,
    fontSize: 11,
  },
  floatingEditBtn: {
    position: 'absolute',
    bottom: 35,
    alignSelf: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    zIndex: 25,
  },
  floatingEditBtnText: {
    color: COLORS.secondary,
    fontFamily: FONTS.bold,
    fontSize: 12.5,
  },
  mobileStepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    width: '100%',
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
  },
  compactBackBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
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
  bottomButtonsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.bgMedium,
    gap: 10,
    alignItems: 'center',
  },
  infoOpenBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 46,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#D97706',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoOpenBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: '#D97706',
  },
  confirmSubmitBtn: {
    flex: 2.2,
    flexDirection: 'row',
    height: 46,
    borderRadius: 10,
    backgroundColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmSubmitBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.white,
    marginRight: 6,
  },
  infoModalContent: {
    maxWidth: 360,
    maxHeight: '85%',
  },
  modalFormScroll: {
    marginVertical: 10,
  },
});
