import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { Network, Grid3X3, ArrowLeft, ArrowRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, globalStyles } from '../styles/theme';

const { width } = Dimensions.get('window');

export default function UnionTypeScreen({ data, updateData, onNext, onBack }) {
  const insets = useSafeAreaInsets();
  
  const selectUnionType = (type) => {
    updateData({ unionType: type });
    onNext();
  };

  return (
    <View style={globalStyles.container}>
      <View style={styles.glowCyan} />

      {/* FIXED HEADER at the top */}
      <View style={{ paddingTop: Math.max(12, insets.top + 8), paddingHorizontal: 20 }}>
        {/* Geri Butonu */}
        <TouchableOpacity style={[styles.backBtn, { marginBottom: 12 }]} onPress={onBack}>
          <ArrowLeft size={20} color={COLORS.textLight} style={{ flexShrink: 0 }} />
          <Text style={styles.backBtnText}>Geri</Text>
        </TouchableOpacity>

        {/* Stepper (3/13) */}
        <View style={[globalStyles.stepperContainer, { marginBottom: 10 }]}>
          <View style={[globalStyles.stepIndicator, globalStyles.stepIndicatorCompleted]} />
          <View style={[globalStyles.stepIndicator, globalStyles.stepIndicatorCompleted]} />
          <View style={[globalStyles.stepIndicator, globalStyles.stepIndicatorActive]} />
          {Array.from({ length: 9 }).map((_, i) => (
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
          <Text style={styles.stepTitle}>AŞAMA 1: Birleşme Tipi</Text>
          <Text style={globalStyles.title}>Süreci hangi yapı tipinde ilerletmek istiyorsunuz?</Text>
          <Text style={globalStyles.subtitle}>
            Projenin ortaklık ve imar yapısını belirleyecek modeli seçiniz.
          </Text>

          <View style={styles.cardsContainer}>
            {/* Ada Bazlı */}
            <TouchableOpacity
              style={[
                styles.unionCard,
                data.unionType === 'block_based' && styles.unionCardActive
              ]}
              activeOpacity={0.7}
              onPress={() => selectUnionType('block_based')}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(6, 182, 212, 0.08)' }]}>
                  <Grid3X3 size={24} color={COLORS.primary} style={{ flexShrink: 0 }} />
                </View>
                <Text style={styles.cardTitle}>Ada Bazlı Birleşme</Text>
              </View>
              <Text style={styles.cardDesc}>
                Aynı imar adasında yer alan tüm parsellerin ve binaların ortak bir projede bir araya gelerek imar artışı ve geniş yeşil alan avantajlarından faydalandığı modeldir.
              </Text>
            </TouchableOpacity>

            {/* Çoklu Parsel */}
            <TouchableOpacity
              style={[
                styles.unionCard,
                data.unionType === 'multi_parcel' && styles.unionCardActive,
                { marginTop: 16 }
              ]}
              activeOpacity={0.7}
              onPress={() => selectUnionType('multi_parcel')}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(139, 92, 246, 0.08)' }]}>
                  <Network size={24} color={COLORS.secondary} style={{ flexShrink: 0 }} />
                </View>
                <Text style={styles.cardTitle}>Çoklu Parsel Birleşme</Text>
              </View>
              <Text style={styles.cardDesc}>
                Farklı adalardaki veya komşu parsellerdeki binaların, parselleri resmi olarak birleştirmeksizin ortak müteahhit veya ortak anlaşma çatısı altında birleştiği modeldir.
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        </View>
      </ScrollView>
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
  cardsContainer: {
    marginTop: 8,
  },
  unionCard: {
    backgroundColor: COLORS.bgMedium,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 20,
  },
  unionCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(14, 165, 233, 0.05)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.textLight,
  },
  cardDesc: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  glowCyan: {
    position: 'absolute',
    bottom: -100,
    left: -100,
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: width * 0.35,
    backgroundColor: COLORS.primary,
    opacity: 0.03,
    blurRadius: 100,
  },
});
