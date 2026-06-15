import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Share, ScrollView } from 'react-native';
import { Check, Share2, MessageCircle, RefreshCw } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, globalStyles } from '../styles/theme';

const { width } = Dimensions.get('window');

export default function ShareScreen({ docId, submissionData, onReset }) {
  const insets = useSafeAreaInsets();
  const shareLink = `https://malikhub.web.app/join?id=${docId}`;
  
  const shareMessage = `Merhaba! Kent360 üzerinden kentsel dönüşüm ve teklif alma sürecimizi başlattım. Diğer malikler olarak siz de bu link üzerinden parsel detaylarımızı inceleyip sürece dahil olabilir ve onay verebilirsiniz: ${shareLink}`;

  const handleWhatsAppShare = async () => {
    try {
      const url = `whatsapp://send?text=${encodeURIComponent(shareMessage)}`;
      // React Native Share API fallback
      await Share.share({
        message: shareMessage,
      });
    } catch (error) {
      console.warn("Paylaşım hatası:", error);
    }
  };

  const getBuildingTypeLabel = () => {
    if (!submissionData) return '';
    const type = submissionData.buildingType;
    const scope = submissionData.scopeType;
    if (type === 'single') {
      return scope === 'multi_building' ? 'Birleşmeli Çoklu Bina' : 'Tekil Bina';
    }
    return 'Site Ortaklığı';
  };

  return (
    <View style={globalStyles.container}>
      {/* Yeşil / Cyan başarı neonu */}
      <View style={styles.glowSuccess} />

      {/* FIXED HEADER at the top */}
      <View style={{ paddingTop: Math.max(12, insets.top + 8), paddingHorizontal: 20 }}>
        {/* Stepper (10/10 - Tamamlandı) */}
        <View style={[globalStyles.stepperContainer, { marginBottom: 10 }]}>
          {Array.from({ length: 10 }).map((_, i) => (
            <View key={i} style={[globalStyles.stepIndicator, globalStyles.stepIndicatorCompleted]} />
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
          <View style={styles.successIconBox}>
            <Check size={40} color={COLORS.white} />
          </View>

          <Text style={globalStyles.title}>Talebiniz Başarıyla Alındı!</Text>
          <Text style={globalStyles.subtitle}>
            Kentsel dönüşüm ön başvuru kaydınız başarıyla oluşturulmuştur.
          </Text>

          {submissionData && (
            <View style={styles.summaryBox}>
              <Text style={styles.summaryTitle}>Talep Özeti</Text>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Yapı Türü:</Text>
                <Text style={styles.summaryVal}>{getBuildingTypeLabel()}</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Lokasyon:</Text>
                <Text style={styles.summaryVal}>{submissionData.city} / {submissionData.district}</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Bina/Blok Sayısı:</Text>
                <Text style={styles.summaryVal}>{submissionData.buildingCount || 1} Adet</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Referans ID:</Text>
                <Text style={[styles.summaryVal, { fontFamily: FONTS.bold, color: COLORS.primary }]}>{docId}</Text>
              </View>
            </View>
          )}

          <Text style={styles.shareInstruction}>
            Sürecin hızlanması ve imar anlaşmasının sağlanabilmesi için diğer maliklerin (komşularınızın) de onay vermesi gerekmektedir. Aşağıdaki linki komşularınızla paylaşın:
          </Text>

          {/* WhatsApp Paylaşım Butonu */}
          <TouchableOpacity 
            style={styles.whatsappBtn} 
            onPress={handleWhatsAppShare} 
            activeOpacity={0.8}
          >
            <MessageCircle size={22} color={COLORS.white} style={{ marginRight: 8 }} />
            <Text style={styles.whatsappBtnText}>WhatsApp ile Paylaş</Text>
          </TouchableOpacity>

          {/* Genel Paylaşım Butonu */}
          <TouchableOpacity 
            style={styles.shareBtn} 
            onPress={() => Share.share({ message: shareMessage })} 
            activeOpacity={0.8}
          >
            <Share2 size={20} color={COLORS.textLight} style={{ marginRight: 8 }} />
            <Text style={styles.shareBtnText}>Bağlantıyı Kopyala & Paylaş</Text>
          </TouchableOpacity>

          {/* Yeni Talep Butonu */}
          <TouchableOpacity 
            style={styles.resetBtn} 
            onPress={onReset} 
            activeOpacity={0.8}
          >
            <RefreshCw size={18} color={COLORS.textMuted} style={{ marginRight: 8 }} />
            <Text style={styles.resetBtnText}>Yeni Talep Oluştur</Text>
          </TouchableOpacity>
        </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  successIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 24,
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  summaryBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  summaryTitle: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    paddingBottom: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.textMuted,
  },
  summaryVal: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.textLight,
  },
  shareInstruction: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  whatsappBtn: {
    backgroundColor: '#25D366', // WhatsApp Brand Color
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  whatsappBtnText: {
    color: COLORS.white,
    fontFamily: FONTS.bold,
    fontSize: 16,
  },
  shareBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  shareBtnText: {
    color: COLORS.textLight,
    fontFamily: FONTS.bold,
    fontSize: 15,
  },
  resetBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  resetBtnText: {
    color: COLORS.textMuted,
    fontFamily: FONTS.medium,
    fontSize: 14,
  },
  glowSuccess: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: COLORS.success,
    opacity: 0.04,
    blurRadius: 100,
  },
});
