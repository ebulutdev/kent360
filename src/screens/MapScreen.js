import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ScrollView, Alert } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { MapPin, ArrowLeft, ArrowRight, Compass } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { COLORS, FONTS, globalStyles } from '../styles/theme';

const { width, height } = Dimensions.get('window');

// İl/İlçe koordinat eşleştirme tablosu (Örnek merkezler)
const COORDINATES = {
  'İstanbul': {
    latitude: 41.0082,
    longitude: 28.9784,
    'Kadıköy': { latitude: 40.9910, longitude: 29.0270 },
    'Beşiktaş': { latitude: 41.0428, longitude: 29.0075 },
    'Üsküdar': { latitude: 41.0264, longitude: 29.0152 },
    'Fatih': { latitude: 41.0186, longitude: 28.9436 },
    'Şişli': { latitude: 41.0600, longitude: 28.9870 },
    'Maltepe': { latitude: 40.9246, longitude: 29.1311 },
    'Kartal': { latitude: 40.8886, longitude: 29.1852 },
    'Pendik': { latitude: 40.8752, longitude: 29.2312 }
  },
  'Ankara': {
    latitude: 39.9334,
    longitude: 32.8597,
    'Çankaya': { latitude: 39.9080, longitude: 32.8622 },
    'Keçiören': { latitude: 39.9784, longitude: 32.8643 },
    'Yenimahalle': { latitude: 39.9482, longitude: 32.7984 },
    'Mamak': { latitude: 39.9204, longitude: 32.9234 },
    'Etimesgut': { latitude: 39.9460, longitude: 32.6582 }
  },
  'İzmir': {
    latitude: 38.4237,
    longitude: 27.1428,
    'Bornova': { latitude: 38.4622, longitude: 27.2163 },
    'Karşıyaka': { latitude: 38.4590, longitude: 27.1232 },
    'Konak': { latitude: 38.4189, longitude: 27.1287 },
    'Buca': { latitude: 38.3846, longitude: 27.1643 },
    'Çeşme': { latitude: 38.3246, longitude: 26.3032 }
  }
};

export default function MapScreen({ data, updateData, onNext, onBack }) {
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);
  const [pinCoordinate, setPinCoordinate] = useState(data.coordinates || null);
  const [gpsCoordinate, setGpsCoordinate] = useState(null);
  const [loadingGps, setLoadingGps] = useState(false);

  // Request permissions and fetch initial GPS location
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }

      setLoadingGps(true);
      try {
        let location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const coords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        setGpsCoordinate(coords);
        // Pre-populate pin coordinate if not already set by user
        if (!pinCoordinate) {
          setPinCoordinate(coords);
        }
      } catch (error) {
        console.log("GPS Location error:", error);
      } finally {
        setLoadingGps(false);
      }
    })();
  }, []);

  // When GPS location is fetched, animate map to focus on it
  useEffect(() => {
    if (gpsCoordinate && mapRef.current) {
      mapRef.current.animateToRegion({
        ...gpsCoordinate,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      }, 1000);
    }
  }, [gpsCoordinate]);

  // İl ve ilçeye göre haritayı odaklama koordinatlarını hesapla
  const getInitialRegion = () => {
    // 1. If we already have selected pin coordinates, use them
    if (pinCoordinate) {
      return {
        ...pinCoordinate,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008
      };
    }
    
    // 2. If we have gps coordinates, use them
    if (gpsCoordinate) {
      return {
        ...gpsCoordinate,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008
      };
    }

    const defaultRegion = {
      latitude: 41.0082,
      longitude: 28.9784,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05
    };

    if (data.city && COORDINATES[data.city]) {
      const cityData = COORDINATES[data.city];
      if (data.district && cityData[data.district]) {
        return {
          ...cityData[data.district],
          latitudeDelta: 0.015,
          longitudeDelta: 0.015
        };
      }
      return {
        latitude: cityData.latitude,
        longitude: cityData.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05
      };
    }
    return defaultRegion;
  };

  const initialRegion = getInitialRegion();

  // Haritaya tıklanınca pin bırakma
  const handleMapPress = (e) => {
    setPinCoordinate(e.nativeEvent.coordinate);
  };

  // Kendi konumuna git butonu handler
  const handleGoToMyLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Konum İzni Gerekli', 'Kendi konumunuzu harita üzerinde görebilmek için lütfen konum izni veriniz.');
      return;
    }
    
    setLoadingGps(true);
    try {
      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setGpsCoordinate(coords);
      setPinCoordinate(coords);
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          ...coords,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        }, 1000);
      }
    } catch (error) {
      Alert.alert('GPS Bağlantı Hatası', 'Konum alınamadı. Lütfen GPS servisinizin açık olduğunu kontrol edin.');
    } finally {
      setLoadingGps(false);
    }
  };

  const handleNext = () => {
    if (!pinCoordinate) {
      Alert.alert('Konum İşaretleme', 'Lütfen harita üzerinde binanızın tam konumunu işaretleyiniz.');
      return;
    }
    updateData({ coordinates: pinCoordinate });
    onNext();
  };

  return (
    <View style={globalStyles.container}>
      {/* FIXED HEADER at the top */}
      <View style={{ paddingTop: Math.max(12, insets.top + 8), paddingHorizontal: 20 }}>
        {/* Geri Butonu */}
        <TouchableOpacity style={[styles.backBtn, { marginBottom: 12 }]} onPress={onBack}>
          <ArrowLeft size={20} color={COLORS.textLight} />
          <Text style={styles.backBtnText}>Geri</Text>
        </TouchableOpacity>

        {/* Stepper (5/10) */}
        <View style={[globalStyles.stepperContainer, { marginBottom: 10 }]}>
          {Array.from({ length: 4 }).map((_, i) => (
            <View key={i} style={[globalStyles.stepIndicator, globalStyles.stepIndicatorCompleted]} />
          ))}
          <View style={[globalStyles.stepIndicator, globalStyles.stepIndicatorActive]} />
          {Array.from({ length: 5 }).map((_, i) => (
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
          <View style={[globalStyles.glassCard, { padding: 16 }]}>
          <View style={styles.headerBox}>
            <View style={styles.iconWrapper}>
              <MapPin size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.stepTitle}>AŞAMA 3: Resmi Bilgiler</Text>
          </View>

          <Text style={[globalStyles.title, { fontSize: 20 }]}>Harita Üzerinde İşaretleyin</Text>
          <Text style={[globalStyles.subtitle, { marginBottom: 16 }]}>
            Lütfen binanızın/sitenizin tam konumunu harita üzerinde tıklayarak işaretleyiniz.
          </Text>

          {/* Harita Alanı */}
          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              provider={PROVIDER_DEFAULT}
              style={styles.map}
              initialRegion={initialRegion}
              onPress={handleMapPress}
            >
              {pinCoordinate && (
                <Marker
                  coordinate={pinCoordinate}
                  title="Binamın Konumu"
                  pinColor={COLORS.primary}
                />
              )}
            </MapView>

            {/* Kendi Konumum Butonu */}
            <TouchableOpacity 
              style={styles.myLocationBtn} 
              onPress={handleGoToMyLocation}
              activeOpacity={0.8}
            >
              <Compass size={14} color={COLORS.primary} />
              <Text style={styles.myLocationBtnText}>Kendi Konumum</Text>
            </TouchableOpacity>
          </View>

          {/* İleri Butonu */}
          <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.8}>
            <Text style={styles.nextBtnText}>Devam Et</Text>
            <ArrowRight size={20} color={COLORS.secondary} />
          </TouchableOpacity>
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
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  stepTitle: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.primary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  mapContainer: {
    height: 280,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 16,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  nextBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextBtnText: {
    color: COLORS.secondary,
    fontFamily: FONTS.bold,
    fontSize: 16,
    marginRight: 8,
  },
  myLocationBtn: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  myLocationBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: COLORS.primary,
    marginLeft: 6,
  },
});
