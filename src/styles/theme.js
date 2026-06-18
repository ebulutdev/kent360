import { StyleSheet, Appearance } from 'react-native';

const RAW_COLORS = {
  bgDark: { dark: '#070A10FF', light: '#F8FAFCFF' },
  bgMedium: { dark: '#131924FF', light: '#FFFFFFFF' },
  cardBg: { dark: '#131924FF', light: '#FFFFFFFF' },
  cardBorder: { dark: '#1E293BFF', light: '#E2E8F0FF' },
  primary: { dark: '#FDC010FF', light: '#FDC010FF' },
  secondary: { dark: '#1E293BFF', light: '#1E293BFF' },
  textLight: { dark: '#F8FAFCFF', light: '#0F172AFF' },
  textMuted: { dark: '#94A3B8FF', light: '#64748BFF' },
  textDark: { dark: '#E2E8F0FF', light: '#1E293BFF' },
  danger: { dark: '#EF4444FF', light: '#EF4444FF' },
  success: { dark: '#10B981FF', light: '#10B981FF' },
  white: { dark: '#FFFFFFFF', light: '#FFFFFFFF' },
  glassBg: { dark: 'rgba(19, 25, 36, 0.85)', light: 'rgba(255, 255, 255, 0.85)' },
  optionActiveText: { dark: '#FDC010FF', light: '#1E293BFF' },
  optionActiveDesc: { dark: '#E2E8F0FF', light: '#475569FF' },
  accentPurple: { dark: '#A78BFAFF', light: '#1E293BFF' }
};

let accessedColorsQueue = [];
let clearQueueTimeout = null;

function queueColorAccess(colorKey) {
  accessedColorsQueue.push(colorKey);
  if (!clearQueueTimeout) {
    clearQueueTimeout = Promise.resolve().then(() => {
      accessedColorsQueue = [];
      clearQueueTimeout = null;
    });
  }
}

export const COLORS = {};
for (const key of Object.keys(RAW_COLORS)) {
  Object.defineProperty(COLORS, key, {
    get() {
      queueColorAccess(key);
      const scheme = Appearance.getColorScheme();
      return RAW_COLORS[key][scheme === 'dark' ? 'dark' : 'light'];
    },
    enumerable: true,
    configurable: true
  });
}

const originalCreate = StyleSheet.create;
const registeredSheets = [];

function extractThemePaths(obj, queue, currentScheme, currentPath = [], paths = []) {
  const cleanObj = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    const newPath = [...currentPath, key];
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      cleanObj[key] = extractThemePaths(val, queue, currentScheme, newPath, paths).cleanObj;
    } else if (typeof val === 'string') {
      let foundIndex = -1;
      for (let i = 0; i < queue.length; i++) {
        const colorKey = queue[i];
        const expectedVal = RAW_COLORS[colorKey][currentScheme];
        if (val === expectedVal) {
          foundIndex = i;
          break;
        }
      }
      if (foundIndex !== -1) {
        const colorKey = queue[foundIndex];
        paths.push({ path: newPath, colorKey });
        cleanObj[key] = val;
        queue.splice(foundIndex, 1);
      } else {
        cleanObj[key] = val;
      }
    } else {
      cleanObj[key] = val;
    }
  }
  return { cleanObj, paths };
}

StyleSheet.create = (styleObject) => {
  const currentScheme = Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
  const queueCopy = [...accessedColorsQueue];
  accessedColorsQueue = [];

  const { cleanObj, paths } = extractThemePaths(styleObject, queueCopy, currentScheme);

  const sheetRef = {
    cleanObj,
    paths,
    compiled: originalCreate(cleanObj)
  };
  registeredSheets.push(sheetRef);

  return new Proxy({}, {
    get(target, prop) {
      if (prop === '__registeredSheet') return sheetRef;
      return sheetRef.compiled[prop];
    },
    ownKeys(target) {
      return Reflect.ownKeys(sheetRef.compiled);
    },
    getOwnPropertyDescriptor(target, prop) {
      return Reflect.getOwnPropertyDescriptor(sheetRef.compiled, prop);
    }
  });
};

Appearance.addChangeListener(() => {
  const currentScheme = Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
  for (const sheetRef of registeredSheets) {
    if (sheetRef.paths.length === 0) continue;
    
    const freshStyleObject = JSON.parse(JSON.stringify(sheetRef.cleanObj));
    for (const { path, colorKey } of sheetRef.paths) {
      const newColor = RAW_COLORS[colorKey][currentScheme];
      let current = freshStyleObject;
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]];
      }
      current[path[path.length - 1]] = newColor;
    }
    sheetRef.compiled = originalCreate(freshStyleObject);
  }
});

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
    backgroundColor: COLORS.bgMedium,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    color: COLORS.textLight,
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
