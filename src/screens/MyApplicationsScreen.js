import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, SafeAreaView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Building, MapPin, Calendar, ChevronRight } from 'lucide-react-native';
import { COLORS, FONTS, globalStyles } from '../styles/theme';

export default function MyApplicationsScreen({ applications, onSelect, onBack }) {
  const insets = useSafeAreaInsets();

  const renderItem = ({ item }) => {
    // Format date if available
    const dateStr = item.createdAt 
      ? new Date(item.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
      : 'Bilinmeyen Tarih';

    return (
      <TouchableOpacity 
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => onSelect(item)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.badge}>
            <Building size={14} color={COLORS.primary} style={{ marginRight: 4 }} />
            <Text style={styles.badgeText}>
              {item.buildingType === 'single' ? 'Tek Bina' : 'Site / Kompleks'}
            </Text>
          </View>
          <View style={styles.dateContainer}>
            <Calendar size={14} color={COLORS.textMuted} style={{ marginRight: 4 }} />
            <Text style={styles.dateText}>{dateStr}</Text>
          </View>
        </View>

        <View style={styles.locationContainer}>
          <MapPin size={16} color={COLORS.textLight} style={{ marginRight: 6 }} />
          <Text style={styles.locationText}>
            {item.district || 'İlçe Yok'}, {item.city || 'İl Yok'}
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {item.buildingCount || 1} Bina • {item.floorsCount || '?'} Kat
          </Text>
          <View style={styles.viewBtn}>
            <Text style={styles.viewBtnText}>Teklifleri Gör</Text>
            <ChevronRight size={16} color={COLORS.primary} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Background Glows */}
      <View style={styles.glowCyan} />
      <View style={styles.glowViolet} />

      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.header, { paddingTop: Math.max(16, insets.top + 8) }]}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <ArrowLeft size={20} color={COLORS.textLight} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Başvurularım</Text>
          <View style={{ width: 40 }} /> {/* Spacer */}
        </View>

        <View style={styles.content}>
          <Text style={styles.subtitle}>
            Telefon numaranıza ait {applications?.length || 0} başvuru bulundu. İncelemek istediğiniz başvuruyu seçiniz.
          </Text>

          <FlatList
            data={applications}
            keyExtractor={(item, index) => item.id || `app_${index}`}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        </View>
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
  glowCyan: {
    position: 'absolute',
    top: -100,
    left: -50,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: COLORS.primary,
    opacity: 0.05,
    blurRadius: 100,
  },
  glowViolet: {
    position: 'absolute',
    bottom: -100,
    right: -50,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: COLORS.secondary,
    opacity: 0.05,
    blurRadius: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.textLight,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 20,
    lineHeight: 20,
  },
  listContainer: {
    paddingBottom: 40,
  },
  card: {
    backgroundColor: COLORS.bgMedium,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(253, 192, 16, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.primary,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textMuted,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  locationText: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.textLight,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  footerText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.textMuted,
  },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.primary,
    marginRight: 2,
  },
});
