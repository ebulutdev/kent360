import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ScrollView, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Briefcase, ArrowRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS } from '../styles/theme';
import Svg, { Path, Line, Text as SvgText, TSpan } from 'react-native-svg';

const { width } = Dimensions.get('window');

export default function WelcomeScreen({ onNext, onGoToContractor }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      {/* Arka plan neon parlamaları */}
      <View style={styles.glowCyan} />
      <View style={styles.glowViolet} />

      <SafeAreaView style={styles.safeArea}>
        {/* Üst Kısım: Müteahhit Giriş Butonu */}
        <View style={[styles.header, { paddingTop: insets.top > 0 ? insets.top + 8 : 16 }]}>
          <TouchableOpacity 
            style={styles.contractorBtn} 
            activeOpacity={0.8}
            onPress={onGoToContractor}
          >
            <Briefcase size={14} color={COLORS.primary} style={{ marginRight: 6 }} />
            <Text style={styles.contractorBtnText}>Müteahhit Girişi</Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContainer} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <View style={styles.logoContainer}>
              <Svg width={160} height={120} viewBox="50 0 300 300">
                {/* --- İKON: BİNALAR VE ÇİZGİLER --- */}
                {/* Sol Bina */}
                <Path d="M 130 150 L 130 90 L 155 75 L 155 150 Z" fill="#FDC010" />
                {/* Orta Bina */}
                <Path d="M 165 150 L 165 60 L 195 45 L 195 150 Z" fill="#FDC010" />
                {/* Sağ Bina */}
                <Path d="M 205 150 L 205 30 L 245 15 L 245 150 Z" fill="#FDC010" />
                
                {/* Çapraz Mimari Çizgi */}
                <Line x1="195" y1="105" x2="280" y2="150" stroke="#FDC010" strokeWidth="8" />
                
                {/* Alt Zemin Çizgisi */}
                <Line x1="90" y1="150" x2="260" y2="150" stroke="#FDC010" strokeWidth="4" />

                {/* --- METİN: FETSAN GRUP --- */}
                <SvgText 
                  x="200" 
                  y="200" 
                  textAnchor="middle" 
                  fontFamily="System" 
                  fontSize="36" 
                  fontWeight="bold"
                >
                  <TSpan fill="#FDC010">FETSAN </TSpan>
                  {/* GRUP yazısı burada koyu renge ayarlandı */}
                  <TSpan fill="#1E293B">GRUP</TSpan> 
                </SvgText>

                {/* --- METİN: KENT360 ENTEGRASYONU --- */}
                {/* İnce bir ayraç çizgisi */}
                <Line x1="130" y1="220" x2="270" y2="220" stroke="#E2E8F0" strokeWidth="2" />
                
                <SvgText 
                  x="200" 
                  y="255" 
                  textAnchor="middle" 
                  fontFamily="System" 
                  fontSize="24" 
                  fontWeight="bold"
                  letterSpacing="4"
                >
                  {/* KENT yazısı burada koyu renge ayarlandı */}
                  <TSpan fill="#1E293B">KENT</TSpan>
                  <TSpan fill="#FDC010">360</TSpan>
                </SvgText>
              </Svg>
            </View>

            <Text style={styles.title}>Kent360'a{"\n"}Hoş Geldiniz</Text>
            <Text style={styles.subtitle}>
              Sizin için en uygun kentsel dönüşüm teklifini birlikte bulalım.
            </Text>

            {/* Büyük Süreci Başlat Butonu */}
            <TouchableOpacity 
              style={styles.startBtn} 
              activeOpacity={0.8}
              onPress={onNext}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.startBtnGradient}
              >
                <Text style={styles.startBtnText}>Teklif Alım Sürecini Başlat</Text>
                <ArrowRight size={20} color={COLORS.white} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
    zIndex: 10,
  },
  contractorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgMedium,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  contractorBtnText: {
    color: COLORS.textLight,
    fontFamily: FONTS.bold,
    fontSize: 13,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  content: {
    width: '100%',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    width: '100%',
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 32,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 40,
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 36,
    paddingHorizontal: 12,
  },
  startBtn: {
    width: '100%',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 24,
  },
  startBtnGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBtnText: {
    color: COLORS.white,
    fontFamily: FONTS.bold,
    fontSize: 17,
    marginRight: 8,
  },
  glowCyan: {
    position: 'absolute',
    top: -50,
    left: -50,
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: COLORS.primary,
    opacity: 0.03,
    blurRadius: 100,
  },
  glowViolet: {
    position: 'absolute',
    bottom: -50,
    right: -50,
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: COLORS.secondary,
    opacity: 0.03,
    blurRadius: 100,
  },
});
