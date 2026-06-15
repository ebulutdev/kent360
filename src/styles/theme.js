import { StyleSheet } from 'react-native';

export const COLORS = {
  bgDark: '#F8FAFC',       // Slate 50 (Very light gray-blue background)
  bgMedium: '#FFFFFF',     // Pure White
  cardBg: '#FFFFFF',       // Card background
  cardBorder: '#E2E8F0',   // Slate 200 (Light border)
  primary: '#FDC010',      // Altın Sarısı (Logo Gold)
  secondary: '#1E293B',    // Koyu Lacivert/Siyah (Logo Dark Navy)
  textLight: '#0F172A',    // Slate 900 (Used for titles/main labels - dark for readability!)
  textMuted: '#64748B',    // Slate 500 (Subtitles and secondary text)
  textDark: '#1E293B',     // Slate 800
  danger: '#EF4444',
  success: '#10B981',
  white: '#FFFFFF',
  glassBg: 'rgba(255, 255, 255, 0.85)',
};

export const FONTS = {
  regular: 'Outfit_400Regular',
  medium: 'Outfit_500Medium',
  bold: 'Outfit_700Bold',
};

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  glassCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 4,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: COLORS.textLight,
    lineHeight: 32,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.textMuted,
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'center',
  },
  label: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    color: '#0F172A',
    fontFamily: FONTS.regular,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
  },
  inputFocused: {
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  btnPrimary: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 12,
  },
  btnPrimaryInner: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  btnPrimaryText: {
    color: COLORS.white,
    fontFamily: FONTS.bold,
    fontSize: 16,
    marginRight: 8,
  },
  btnSecondary: {
    backgroundColor: 'transparent',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  btnSecondaryText: {
    color: COLORS.textLight,
    fontFamily: FONTS.medium,
    fontSize: 16,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  stepIndicator: {
    height: 4,
    flex: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 3,
    borderRadius: 2,
  },
  stepIndicatorActive: {
    backgroundColor: COLORS.primary,
  },
  stepIndicatorCompleted: {
    backgroundColor: COLORS.secondary,
  },
});
