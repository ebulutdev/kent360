import React, { useState } from 'react';
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
  Keyboard
} from 'react-native';
import { UploadCloud, FileText, CheckCircle2, ArrowLeft, ArrowRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, globalStyles } from '../styles/theme';

const { width } = Dimensions.get('window');

export default function ExtraScreen({ data, updateData, onNext, onBack }) {
  const insets = useSafeAreaInsets();
  const [pdfFile, setPdfFile] = useState(data.pdfFile || null);

  const simulateUpload = () => {
    // PDF Yükleme simülasyonu
    setPdfFile({
      name: 'emsal_tablosu_imardurumu.pdf',
      size: '1.8 MB'
    });
  };

  const clearFile = () => {
    setPdfFile(null);
  };

  const handleNext = () => {
    updateData({ 
      pdfFile: pdfFile
    });
    onNext();
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
          {/* Geri Butonu */}
          <TouchableOpacity style={[styles.backBtn, { marginBottom: 12 }]} onPress={onBack}>
            <ArrowLeft size={20} color={COLORS.textLight} />
            <Text style={styles.backBtnText}>Geri</Text>
          </TouchableOpacity>

          {/* Stepper (7/10) */}
          <View style={[globalStyles.stepperContainer, { marginBottom: 10 }]}>
            {Array.from({ length: 6 }).map((_, i) => (
              <View key={i} style={[globalStyles.stepIndicator, globalStyles.stepIndicatorCompleted]} />
            ))}
            <View style={[globalStyles.stepIndicator, globalStyles.stepIndicatorActive]} />
            {Array.from({ length: 3 }).map((_, i) => (
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
                  <View style={styles.iconWrapper}>
                    <UploadCloud size={24} color={COLORS.secondary} />
                  </View>
                  <Text style={[styles.stepTitle, { color: COLORS.secondary }]}>AŞAMA 4: Ada Detayları</Text>
                </View>

                <Text style={globalStyles.title}>Ada Bazlı Ekstra Bilgiler</Text>
                <Text style={globalStyles.subtitle}>
                  İmar artış hesabı için aşağıdaki ek bilgileri giriniz.
                </Text>



                {/* Emsal Tablosu PDF Yükleme */}
                <Text style={globalStyles.label}>Emsal Tablosu veya İmar Durum Belgesi (PDF)</Text>
                
                {!pdfFile ? (
                  <TouchableOpacity 
                    style={styles.uploadZone} 
                    activeOpacity={0.8}
                    onPress={simulateUpload}
                  >
                    <UploadCloud size={32} color={COLORS.textMuted} style={{ marginBottom: 12 }} />
                    <Text style={styles.uploadTitle}>Dosya Seç veya Sürükle</Text>
                    <Text style={styles.uploadSub}>PDF formatında maksimum 10MB</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.fileCard}>
                    <View style={styles.fileInfo}>
                      <FileText size={28} color={COLORS.secondary} style={{ marginRight: 12 }} />
                      <View>
                        <Text style={styles.fileName}>{pdfFile.name}</Text>
                        <Text style={styles.fileSize}>{pdfFile.size}</Text>
                      </View>
                    </View>
                    <View style={styles.fileActions}>
                      <CheckCircle2 size={20} color={COLORS.success} style={{ marginRight: 16 }} />
                      <TouchableOpacity onPress={clearFile}>
                        <Text style={styles.deleteText}>Sil</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* İleri Butonu */}
                <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.8}>
                  <Text style={styles.nextBtnText}>Devam Et</Text>
                  <ArrowRight size={20} color={COLORS.white} />
                </TouchableOpacity>
              </View>
            </View>
            </View>
          </TouchableWithoutFeedback>
        </ScrollView>
      </View>
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
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  stepTitle: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  uploadZone: {
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  uploadTitle: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  uploadSub: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textMuted,
  },
  fileCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileName: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 2,
    width: width * 0.4,
  },
  fileSize: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textMuted,
  },
  fileActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.danger,
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
  glow: {
    position: 'absolute',
    top: 50,
    left: -50,
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: width * 0.35,
    backgroundColor: COLORS.secondary,
    opacity: 0.05,
    blurRadius: 100,
  },
});
