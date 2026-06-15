import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Linking
} from 'react-native';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, addDoc, getDocs, query, where, limit, onSnapshot, orderBy } from 'firebase/firestore';
import { Briefcase, Mail, Lock, Building, ArrowLeft, LogOut, Search, MapPin, X, Phone, Compass, Globe } from 'lucide-react-native';
import MapView, { Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, db, isMock } from '../../firebaseConfig';
import { COLORS, FONTS, globalStyles } from '../styles/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

const { width } = Dimensions.get('window');

const DARK_MAP_STYLE = [
  { "elementType": "geometry", "stylers": [{ "color": "#0F172A" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#94A3B8" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#0F172A" }] },
  { "featureType": "administrative", "elementType": "geometry.stroke", "stylers": [{ "color": "#334155" }] },
  { "featureType": "administrative.country", "elementType": "geometry.stroke", "stylers": [{ "color": "#475569" }] },
  { "featureType": "landscape", "elementType": "geometry", "stylers": [{ "color": "#0B0F19" }] },
  { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#0F172A" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#64748B" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#1E293B" }] },
  { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#94A3B8" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#334155" }] },
  { "featureType": "transit", "elementType": "geometry", "stylers": [{ "color": "#1E293B" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#020617" }] },
  { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#475569" }] }
];

export default function ContractorPortal({ onBack }) {
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'map'
  const [expandedRequestId, setExpandedRequestId] = useState(null);
  const [mapFocusCoordinate, setMapFocusCoordinate] = useState(null);
  const [selectedMapRequest, setSelectedMapRequest] = useState(null);
  const [loadingGps, setLoadingGps] = useState(false);

  useEffect(() => {
    let unsubscribeAuth = null;
    let unsubscribeSnapshot = null;

    unsubscribeAuth = auth?.onAuthStateChanged((currUser) => {
      setUser(currUser);
      if (currUser) {
        setLoadingRequests(true);
        
        const loadInitialData = async () => {
          let localSubmissions = [];
          try {
            const localStr = await AsyncStorage.getItem('@local_submissions');
            localSubmissions = localStr ? JSON.parse(localStr) : [];
          } catch (e) {
            console.error("Error loading local submissions:", e);
          }

          if (isMock) {
            setRequests(localSubmissions);
            setLoadingRequests(false);
            return;
          }

          try {
            // Listen to submissions in real time, sorted by newest first
            const q = query(collection(db, 'submissions'), orderBy('createdAt', 'desc'), limit(50));
            unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
              const onlineFetched = [];
              snapshot.forEach((doc) => {
                onlineFetched.push({ id: doc.id, ...doc.data() });
              });

              // Merge local and online submissions, avoiding duplicates
              const mergedMap = new Map();
              localSubmissions.forEach(item => {
                if (item && item.id) mergedMap.set(item.id, item);
              });
              onlineFetched.forEach(item => {
                if (item && item.id) mergedMap.set(item.id, item);
              });

              const mergedArray = Array.from(mergedMap.values()).sort((a, b) => {
                const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return dateB - dateA;
              });

              setRequests(mergedArray);
              setLoadingRequests(false);
            }, (error) => {
              console.error("Firestore real-time snapshot error:", error);
              setRequests(localSubmissions);
              setLoadingRequests(false);
            });
          } catch (err) {
            console.error("Error starting Firestore real-time listener:", err);
            setRequests(localSubmissions);
            setLoadingRequests(false);
          }
        };

        loadInitialData();
      } else {
        setRequests([]);
        if (unsubscribeSnapshot) {
          unsubscribeSnapshot();
          unsubscribeSnapshot = null;
        }
      }
    });

    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  // Animate map when focus coordinate changes
  useEffect(() => {
    if (activeTab === 'map' && mapFocusCoordinate && mapRef.current) {
      const timer = setTimeout(() => {
        mapRef.current.animateToRegion({
          latitude: parseFloat(mapFocusCoordinate.latitude),
          longitude: parseFloat(mapFocusCoordinate.longitude),
          latitudeDelta: 0.012,
          longitudeDelta: 0.012,
        }, 1000);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [mapFocusCoordinate, activeTab]);

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen tüm alanları doldurunuz.');
      return;
    }

    setLoading(true);

    try {
      if (isMock) {
        // Mock Giriş
        setTimeout(async () => {
          let localSubmissions = [];
          try {
            const localStr = await AsyncStorage.getItem('@local_submissions');
            localSubmissions = localStr ? JSON.parse(localStr) : [];
          } catch (e) {
            console.error("Error reading local submissions in mock login:", e);
          }
          setLoading(false);
          setUser({ email: email, uid: 'mock_uid_123', displayName: companyName || 'Kent360 İnşaat A.Ş.' });
          setRequests(localSubmissions);
        }, 1200);
      } else {
        if (isRegister) {
          if (!companyName.trim()) {
            Alert.alert('Eksik Bilgi', 'Lütfen firma adını giriniz.');
            setLoading(false);
            return;
          }
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          // Firestore'a müteahhit firma kaydı ekle
          await addDoc(collection(db, 'contractors'), {
            uid: userCredential.user.uid,
            companyName: companyName.trim(),
            email: email.trim(),
            createdAt: new Date().toISOString()
          });
          setUser(userCredential.user);
        } else {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          setUser(userCredential.user);
        }
        setLoading(false);
      }
    } catch (error) {
      console.error("Müteahhit Auth Hatası:", error);
      Alert.alert('Kimlik Doğrulama Hatası', 'İşlem başarısız: ' + error.message);
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (!isMock) {
        await signOut(auth);
      }
      setUser(null);
      setRequests([]);
    } catch (error) {
      console.error("Çıkış hatası:", error);
    }
  };

  const fetchRequests = async () => {
    setLoadingRequests(true);
    let localSubmissions = [];
    try {
      const localStr = await AsyncStorage.getItem('@local_submissions');
      localSubmissions = localStr ? JSON.parse(localStr) : [];
    } catch (e) {
      console.error("Error loading local submissions on refresh:", e);
    }

    if (isMock) {
      setRequests(localSubmissions);
      setLoadingRequests(false);
      return;
    }

    try {
      const q = query(collection(db, 'submissions'), orderBy('createdAt', 'desc'), limit(50));
      const querySnapshot = await getDocs(q);
      const fetched = [];
      querySnapshot.forEach((doc) => {
        fetched.push({ id: doc.id, ...doc.data() });
      });

      const mergedMap = new Map();
      localSubmissions.forEach(item => {
        if (item && item.id) mergedMap.set(item.id, item);
      });
      fetched.forEach(item => {
        if (item && item.id) mergedMap.set(item.id, item);
      });

      const mergedArray = Array.from(mergedMap.values()).sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });

      setRequests(mergedArray);
    } catch (error) {
      console.error("Talepleri çekme hatası:", error);
      setRequests(localSubmissions);
    } finally {
      setLoadingRequests(false);
    }
  };

  const renderAuthForm = () => (
    <View style={globalStyles.glassCard}>
      <View style={styles.headerBox}>
        <View style={styles.iconWrapper}>
          <Briefcase size={24} color={COLORS.secondary} />
        </View>
        <Text style={[styles.stepTitle, { color: COLORS.secondary }]}>B2B MÜTEAHHİT PORTALI</Text>
      </View>

      <Text style={globalStyles.title}>{isRegister ? 'Kayıt Ol' : 'Müteahhit Girişi'}</Text>
      <Text style={globalStyles.subtitle}>
        {isRegister ? 'Kent360 ağındaki projelere teklif vermek için firma hesabınızı oluşturun.' : 'Firma hesabınız ile giriş yaparak aktif kentsel dönüşüm taleplerini listeleyin.'}
      </Text>

      {isRegister && (
        <>
          <Text style={globalStyles.label}>Firma / Şirket Adı</Text>
          <TextInput
            style={globalStyles.input}
            placeholder="İnşaat Ltd. Şti."
            placeholderTextColor="#94A3B8"
            value={companyName}
            onChangeText={setCompanyName}
          />
        </>
      )}

      <Text style={globalStyles.label}>E-Posta Adresi</Text>
      <TextInput
        style={globalStyles.input}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholder="firma@ornek.com"
        placeholderTextColor="#94A3B8"
        value={email}
        onChangeText={setEmail}
      />

      <Text style={globalStyles.label}>Parola</Text>
      <TextInput
        style={globalStyles.input}
        secureTextEntry={true}
        placeholder="******"
        placeholderTextColor="#94A3B8"
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity
        style={[styles.authBtn, loading && styles.authBtnDisabled]}
        onPress={handleAuth}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.white} size="small" />
        ) : (
          <Text style={styles.authBtnText}>{isRegister ? 'Hesap Oluştur' : 'Giriş Yap'}</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.switchBtn}
        onPress={() => setIsRegister(!isRegister)}
        disabled={loading}
      >
        <Text style={styles.switchBtnText}>
          {isRegister ? 'Zaten hesabınız var mı? Giriş Yapın' : 'Hesabınız yok mu? Yeni Hesap Oluşturun'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const getRequestUnitBreakdown = (item) => {
    let daire = 0;
    let dukkan = 0;
    let depo = 0;
    let siginak = 0;
    
    if (item.buildingStructures) {
      Object.keys(item.buildingStructures).forEach(blockKey => {
        const block = item.buildingStructures[blockKey];
        if (block && Array.isArray(block.floors)) {
          block.floors.forEach(floor => {
            if (Array.isArray(floor.units)) {
              floor.units.forEach(unit => {
                const type = typeof unit === 'object' ? (unit.type || 'daire') : (unit || 'daire');
                if (type === 'daire') daire++;
                else if (type === 'dukkan') dukkan++;
                else if (type === 'depo') depo++;
                else if (type === 'siginak') siginak++;
              });
            }
          });
        }
      });
    } else {
      daire = item.flats ? Object.values(item.flats).reduce((acc, curr) => acc + parseInt(curr || 0), 0) : 0;
    }
    
    return { daire, dukkan, depo, siginak };
  };

  const formatDeeds = (deeds) => {
    if (!deeds || typeof deeds !== 'object') return '-';
    const parts = [];
    Object.keys(deeds).forEach(key => {
      const d = deeds[key];
      if (d && (d.ada || d.parsel)) {
        const prefix = key === 'single' ? '' : `${key} Blok: `;
        parts.push(`${prefix}Ada ${d.ada || '-'}, Parsel ${d.parsel || '-'}`);
      }
    });
    return parts.length > 0 ? parts.join(' | ') : '-';
  };

  const handleShowRequestOnMap = (item) => {
    if (item.coordinates && item.coordinates.latitude && item.coordinates.longitude) {
      setMapFocusCoordinate(item.coordinates);
      setSelectedMapRequest(item);
      setActiveTab('map');
    } else {
      Alert.alert('Konum Bilgisi Yok', 'Bu başvuru için harita konumu işaretlenmemiş.');
    }
  };

  const handleMarkerPress = (item) => {
    setSelectedMapRequest(item);
    if (item.coordinates) {
      setMapFocusCoordinate(item.coordinates);
    }
  };

  const handleCallPhone = (phoneNum) => {
    if (phoneNum) {
      Linking.openURL(`tel:${phoneNum}`).catch(() => {
        Alert.alert('Hata', 'Arama başlatılamadı. Lütfen telefon uygulamasının kurulu olduğunu doğrulayın.');
      });
    }
  };

  const handleGoToMyLocation = async () => {
    setLoadingGps(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Konum İzni Gerekli', 'Kendi konumunuzu harita üzerinde görebilmek için lütfen konum izni veriniz.');
        setLoadingGps(false);
        return;
      }
      
      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      if (mapRef.current) {
        mapRef.current.animateToRegion({
          ...coords,
          latitudeDelta: 0.012,
          longitudeDelta: 0.012,
        }, 1000);
      }
    } catch (error) {
      console.warn("GPS Location error:", error);
      Alert.alert('GPS Bağlantı Hatası', 'Konum alınamadı. Lütfen GPS servisinizin açık olduğunu kontrol edin.');
    } finally {
      setLoadingGps(false);
    }
  };

  const handleResetMapZoom = () => {
    const mapRequests = requests.filter(req => req.coordinates && req.coordinates.latitude && req.coordinates.longitude);
    if (mapRequests.length > 0 && mapRef.current) {
      const coordinates = mapRequests.map(req => ({
        latitude: parseFloat(req.coordinates.latitude),
        longitude: parseFloat(req.coordinates.longitude),
      }));
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 80, right: 80, bottom: 180, left: 80 },
        animated: true,
      });
    } else if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: 39.9334,
        longitude: 32.8597,
        latitudeDelta: 7.5,
        longitudeDelta: 7.5,
      }, 1000);
    }
  };

  const renderDashboard = () => (
    <View style={{ flex: 1 }}>
      <View style={styles.listSectionHeader}>
        <Text style={styles.sectionTitle}>Aktif Kentsel Dönüşüm Talepleri</Text>
        <TouchableOpacity onPress={fetchRequests}>
          <Text style={styles.refreshText}>Yenile</Text>
        </TouchableOpacity>
      </View>

      {loadingRequests ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <View style={styles.requestList}>
          {requests.map((item) => {
            const isExpanded = expandedRequestId === item.id;
            const breakdown = getRequestUnitBreakdown(item);

            const sqmParts = [];
            if (item.sqm && typeof item.sqm === 'object') {
              Object.keys(item.sqm).forEach(k => {
                const prefix = k === 'single' ? '' : `${k} Blok: `;
                sqmParts.push(`${prefix}${item.sqm[k]} m²`);
              });
            }

            return (
              <TouchableOpacity
                key={item.id}
                style={styles.requestCard}
                activeOpacity={0.9}
                onPress={() => setExpandedRequestId(prev => prev === item.id ? null : item.id)}
              >
                <View style={styles.reqCardHeader}>
                  <View style={styles.reqBadge}>
                    <MapPin size={12} color={COLORS.primary} style={{ marginRight: 4 }} />
                    <Text style={styles.reqBadgeText}>{item.city} / {item.district}</Text>
                  </View>
                  <Text style={styles.reqDate}>
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString('tr-TR') : '-'}
                  </Text>
                </View>
                
                <Text style={styles.reqTitle}>
                  {item.buildingType === 'complex' ? 'Site Dönüşüm Projesi' : 'Apartman Dönüşüm Başvurusu'}
                </Text>
                
                <View style={styles.reqDetails}>
                  <Text style={styles.reqDetailText}>Blok/Bina: {item.buildingCount || 1}</Text>
                  <Text style={styles.reqDetailText}>Daire: {breakdown.daire}</Text>
                  <Text style={styles.reqDetailText}>
                    Başvuru: {item.name || ''} {isExpanded ? (item.surname || '') : (item.surname ? item.surname[0] + '.' : '')}
                  </Text>
                </View>

                {/* Genişletilmiş Ayrıntı Paneli */}
                {isExpanded && (
                  <View style={styles.expandedSection}>
                    <View style={styles.divider} />
                    
                    <Text style={styles.expandedSectionTitle}>İLETİŞİM BİLGİLERİ</Text>
                    <View style={styles.detailRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.detailLabel}>Malik Adı Soyadı:</Text>
                        <Text style={styles.detailValue}>{item.name || ''} {item.surname || ''}</Text>
                      </View>
                      {item.phone && (
                        <TouchableOpacity
                          style={styles.phoneCallBtn}
                          onPress={() => handleCallPhone(item.phone)}
                        >
                          <Text style={styles.phoneCallBtnText}>Ara: {item.phone}</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    <View style={styles.divider} />

                    <Text style={styles.expandedSectionTitle}>YAPI & ARSA BİLGİLERİ</Text>
                    
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Ada / Parsel Bilgisi:</Text>
                      <Text style={styles.detailValue}>{formatDeeds(item.deeds)}</Text>
                    </View>

                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Ortalama Daire Büyüklüğü (m²):</Text>
                      <Text style={styles.detailValue}>
                        {sqmParts.length > 0 ? sqmParts.join(' | ') : '-'}
                      </Text>
                    </View>

                    <View style={styles.divider} />

                    <Text style={styles.expandedSectionTitle}>BİRİM DAĞILIMI</Text>
                    <View style={styles.unitBreakdownRow}>
                      <View style={styles.breakdownBox}>
                        <Text style={styles.breakdownLabel}>Daire</Text>
                        <Text style={styles.breakdownVal}>{breakdown.daire} Adet</Text>
                      </View>
                      <View style={styles.breakdownBox}>
                        <Text style={styles.breakdownLabel}>Dükkan</Text>
                        <Text style={styles.breakdownVal}>{breakdown.dukkan} Adet</Text>
                      </View>
                      {breakdown.depo > 0 && (
                        <View style={styles.breakdownBox}>
                          <Text style={styles.breakdownLabel}>Depo</Text>
                          <Text style={styles.breakdownVal}>{breakdown.depo} Adet</Text>
                        </View>
                      )}
                      {breakdown.siginak > 0 && (
                        <View style={styles.breakdownBox}>
                          <Text style={styles.breakdownLabel}>Sığınak</Text>
                          <Text style={styles.breakdownVal}>{breakdown.siginak} Adet</Text>
                        </View>
                      )}
                    </View>

                    {item.coordinates && (
                      <TouchableOpacity
                        style={styles.showMapBtn}
                        onPress={() => handleShowRequestOnMap(item)}
                      >
                        <MapPin size={16} color="#0F172A" style={{ marginRight: 6 }} />
                        <Text style={styles.showMapBtnText}>Teklif Konumunu Haritada Göster</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
          {requests.length === 0 && (
            <Text style={{ textAlign: 'center', color: COLORS.textMuted, marginTop: 40 }}>
              Aktif dönüşüm talebi bulunamadı.
            </Text>
          )}
        </View>
      )}
    </View>
  );

  const renderMapView = () => {
    const mapRequests = requests.filter(req => req.coordinates && req.coordinates.latitude && req.coordinates.longitude);

    return (
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          customMapStyle={DARK_MAP_STYLE}
          showsUserLocation={true}
          followsUserLocation={false}
          initialRegion={mapFocusCoordinate ? {
            latitude: parseFloat(mapFocusCoordinate.latitude),
            longitude: parseFloat(mapFocusCoordinate.longitude),
            latitudeDelta: 0.012,
            longitudeDelta: 0.012,
          } : {
            latitude: 39.9334,
            longitude: 32.8597,
            latitudeDelta: 7.5,
            longitudeDelta: 7.5,
          }}
          onPress={() => setSelectedMapRequest(null)}
        >
          {mapRequests.map((req) => {
            const breakdown = getRequestUnitBreakdown(req);
            const title = req.buildingType === 'complex' ? 'Site Dönüşüm Projesi' : 'Apartman Dönüşüm Başvurusu';
            const description = `${req.city}/${req.district} - ${req.buildingCount || 1} Blok, ${breakdown.daire} Daire`;

            const isFocused = (mapFocusCoordinate && 
              parseFloat(req.coordinates.latitude) === parseFloat(mapFocusCoordinate.latitude) && 
              parseFloat(req.coordinates.longitude) === parseFloat(mapFocusCoordinate.longitude)) ||
              (selectedMapRequest && selectedMapRequest.id === req.id);

            return (
              <Marker
                key={req.id || `marker_${Math.random()}`}
                coordinate={{
                  latitude: parseFloat(req.coordinates.latitude),
                  longitude: parseFloat(req.coordinates.longitude),
                }}
                title={title}
                description={description}
                pinColor={isFocused ? "#EF4444" : "#F59E0B"}
                onPress={() => handleMarkerPress(req)}
              />
            );
          })}
        </MapView>

        {/* Floating Map Controls */}
        <View style={styles.mapControlsContainer}>
          <TouchableOpacity 
            style={styles.mapControlBtn} 
            onPress={handleGoToMyLocation}
            activeOpacity={0.8}
          >
            {loadingGps ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Compass size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.mapControlBtn} 
            onPress={handleResetMapZoom}
            activeOpacity={0.8}
          >
            <Globe size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {!selectedMapRequest && (
          <View style={styles.mapInfoOverlay}>
            <Text style={styles.mapInfoText}>
              Toplam {mapRequests.length} Konum Haritada Gösteriliyor
            </Text>
          </View>
        )}

        {/* Seçilen Teklif Alt Detay Kartı */}
        {selectedMapRequest && (() => {
          const breakdown = getRequestUnitBreakdown(selectedMapRequest);
          const sqmParts = [];
          if (selectedMapRequest.sqm && typeof selectedMapRequest.sqm === 'object') {
            Object.keys(selectedMapRequest.sqm).forEach(k => {
              const prefix = k === 'single' ? '' : `${k} Blok: `;
              sqmParts.push(`${prefix}${selectedMapRequest.sqm[k]} m²`);
            });
          }

          return (
            <View style={styles.mapBottomCard}>
              <View style={styles.mapBottomCardHeader}>
                <View style={styles.reqBadge}>
                  <MapPin size={12} color={COLORS.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.reqBadgeText}>
                    {selectedMapRequest.city} / {selectedMapRequest.district}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.closeMapCardBtn} 
                  onPress={() => setSelectedMapRequest(null)}
                >
                  <X size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <Text style={styles.mapBottomCardTitle}>
                {selectedMapRequest.buildingType === 'complex' ? 'Site Dönüşüm Projesi' : 'Apartman Dönüşüm Başvurusu'}
              </Text>

              <View style={styles.mapBottomCardStats}>
                <View style={styles.mapStatCol}>
                  <Text style={styles.mapStatLabel}>Blok/Bina</Text>
                  <Text style={styles.mapStatValue}>{selectedMapRequest.buildingCount || 1}</Text>
                </View>
                <View style={styles.mapStatCol}>
                  <Text style={styles.mapStatLabel}>Toplam Daire</Text>
                  <Text style={styles.mapStatValue}>{breakdown.daire}</Text>
                </View>
                <View style={styles.mapStatCol}>
                  <Text style={styles.mapStatLabel}>Başvuru</Text>
                  <Text style={styles.mapStatValue} numberOfLines={1}>
                    {selectedMapRequest.name || ''} {selectedMapRequest.surname || ''}
                  </Text>
                </View>
              </View>

              <ScrollView style={styles.mapBottomCardScroll} showsVerticalScrollIndicator={false}>
                <View style={[styles.divider, { marginVertical: 8 }]} />
                
                <Text style={styles.expandedSectionTitle}>Yapı & Tapu Detayları</Text>
                
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Ada / Parsel:</Text>
                  <Text style={[styles.detailValue, { fontSize: 12 }]}>
                    {formatDeeds(selectedMapRequest.deeds)}
                  </Text>
                </View>

                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Daire Büyüklüğü:</Text>
                  <Text style={[styles.detailValue, { fontSize: 12 }]}>
                    {sqmParts.length > 0 ? sqmParts.join(' | ') : '-'}
                  </Text>
                </View>

                {breakdown.dukkan > 0 || breakdown.depo > 0 ? (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Ticari & Diğer Birimler:</Text>
                    <Text style={[styles.detailValue, { fontSize: 12 }]}>
                      {breakdown.dukkan > 0 ? `${breakdown.dukkan} Dükkan ` : ''}
                      {breakdown.depo > 0 ? `${breakdown.depo} Depo ` : ''}
                    </Text>
                  </View>
                ) : null}
              </ScrollView>

              {selectedMapRequest.phone && (
                <TouchableOpacity
                  style={styles.mapCardPhoneBtn}
                  onPress={() => handleCallPhone(selectedMapRequest.phone)}
                >
                  <Phone size={14} color="#0F172A" style={{ marginRight: 6 }} />
                  <Text style={styles.mapCardPhoneBtnText}>
                    Maliki Ara: {selectedMapRequest.phone}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })()}
      </View>
    );
  };

  const renderBottomNavbar = () => (
    <View style={styles.bottomNavbar}>
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => setActiveTab('list')}
        activeOpacity={0.7}
      >
        <Briefcase size={20} color={activeTab === 'list' ? '#F59E0B' : '#94A3B8'} />
        <Text style={[styles.navText, activeTab === 'list' && styles.navTextActive]}>Talepler</Text>
        {activeTab === 'list' && <View style={styles.activeIndicatorDot} />}
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => setActiveTab('map')}
        activeOpacity={0.7}
      >
        <MapPin size={20} color={activeTab === 'map' ? '#F59E0B' : '#94A3B8'} />
        <Text style={[styles.navText, activeTab === 'map' && styles.navTextActive]}>Harita</Text>
        {activeTab === 'map' && <View style={styles.activeIndicatorDot} />}
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[
        globalStyles.container,
        {
          backgroundColor: user ? '#0B0F19' : COLORS.bgDark,
          paddingBottom: 0
        }
      ]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.glow} />

      {!user ? (
        <ScrollView
          contentContainerStyle={[
            globalStyles.scrollContainer,
            { paddingTop: Math.max(60, insets.top + 20) }
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Geri Butonu */}
          <TouchableOpacity style={styles.backBtn} onPress={onBack} disabled={loading}>
            <ArrowLeft size={20} color={COLORS.textLight} />
            <Text style={styles.backBtnText}>Ana Sayfa</Text>
          </TouchableOpacity>
          {renderAuthForm()}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, backgroundColor: '#0B0F19' }}>
          {/* Top Navigation / Header Bar (White bg stretches under notch) */}
          <View style={[
            styles.portalHeader,
            {
              paddingTop: insets.top > 0 ? insets.top + 12 : 16,
              paddingBottom: 16
            }
          ]}>
            <TouchableOpacity style={styles.headerBackBtn} onPress={onBack}>
              <ArrowLeft size={20} color="#F1F5F9" />
            </TouchableOpacity>
            <Text style={styles.portalHeaderTitle}>Müteahhit Portalı</Text>
            <TouchableOpacity style={styles.headerLogoutBtn} onPress={handleLogout}>
              <LogOut size={18} color={COLORS.danger} />
            </TouchableOpacity>
          </View>

          {activeTab === 'list' ? (
            <ScrollView contentContainerStyle={[globalStyles.scrollContainer, { paddingTop: 16, paddingBottom: 100 }]}>
              {renderDashboard()}
            </ScrollView>
          ) : (
            renderMapView()
          )}

          {/* Floating Bottom Navigation Bar */}
          {renderBottomNavbar()}
        </View>
      )}
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
  authBtn: {
    backgroundColor: COLORS.secondary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  authBtnDisabled: {
    opacity: 0.6,
  },
  authBtnText: {
    color: COLORS.white,
    fontFamily: FONTS.bold,
    fontSize: 16,
  },
  switchBtn: {
    alignItems: 'center',
    marginTop: 16,
  },
  switchBtnText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.textMuted,
  },
  dashHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingBottom: 16,
    marginBottom: 16,
  },
  dashWelcome: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.textMuted,
  },
  dashEmail: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.textLight,
  },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: '#F59E0B', // Gold/Amber section title
  },
  refreshText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: '#94A3B8',
  },
  requestList: {
    flex: 1,
  },
  requestCard: {
    backgroundColor: '#1E293B', // Dark slate card
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  reqCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  reqBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(14, 165, 233, 0.15)', // Glass sky blue badge
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  reqBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: '#38BDF8',
  },
  reqDate: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: '#64748B',
  },
  reqTitle: {
    fontFamily: FONTS.bold,
    fontSize: 14.5,
    color: '#FFFFFF',
    marginBottom: 10,
  },
  reqDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
    paddingTop: 10,
  },
  reqDetailText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: '#94A3B8',
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
  portalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#0B0F19', // Deep dark header bg
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  portalHeaderTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: '#FFFFFF', // White title text
  },
  headerBackBtn: {
    padding: 6,
  },
  headerLogoutBtn: {
    padding: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.15)', // Premium dark red bg
    borderRadius: 8,
  },
  bottomNavbar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 16,
    left: 20,
    right: 20,
    height: 64,
    backgroundColor: '#1E293B', // Dark slate floating pill bg
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1000,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  navText: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  navTextActive: {
    color: '#F59E0B', // Gold/Amber selected text
    fontFamily: FONTS.bold,
  },
  activeIndicatorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#F59E0B',
    marginTop: 3,
  },
  mapContainer: {
    flex: 1,
    width: '100%',
    position: 'relative',
  },
  mapInfoOverlay: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#F59E0B', // Gold border!
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  mapInfoText: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  expandedSection: {
    marginTop: 12,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 12,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 12,
  },
  expandedSectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 9.5,
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  detailItem: {
    marginBottom: 10,
  },
  detailLabel: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
  },
  detailValue: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: '#F1F5F9',
  },
  phoneCallBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  phoneCallBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: '#10B981',
  },
  unitBreakdownRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  breakdownBox: {
    flex: 1,
    minWidth: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  breakdownLabel: {
    fontFamily: FONTS.medium,
    fontSize: 10,
    color: '#64748B',
    marginBottom: 2,
  },
  breakdownVal: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  showMapBtn: {
    backgroundColor: '#F59E0B',
    borderRadius: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  showMapBtnText: {
    color: '#0F172A',
    fontFamily: FONTS.bold,
    fontSize: 12,
  },
  mapBottomCard: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 104 : 96,
    left: 20,
    right: 20,
    backgroundColor: '#1E293B',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
    maxHeight: 280,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
    zIndex: 2000,
  },
  mapBottomCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  closeMapCardBtn: {
    padding: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 8,
  },
  mapBottomCardTitle: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: '#FFFFFF',
    marginBottom: 10,
  },
  mapBottomCardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 10,
  },
  mapStatCol: {
    flex: 1,
    alignItems: 'center',
  },
  mapStatLabel: {
    fontFamily: FONTS.medium,
    fontSize: 9.5,
    color: '#64748B',
    marginBottom: 2,
  },
  mapStatValue: {
    fontFamily: FONTS.bold,
    fontSize: 12.5,
    color: '#FFFFFF',
  },
  mapBottomCardScroll: {
    flexGrow: 0,
    maxHeight: 100,
    marginVertical: 4,
  },
  mapCardPhoneBtn: {
    backgroundColor: '#F59E0B',
    borderRadius: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  mapCardPhoneBtnText: {
    color: '#0F172A',
    fontFamily: FONTS.bold,
    fontSize: 12,
  },
  mapControlsContainer: {
    position: 'absolute',
    right: 16,
    top: 80,
    flexDirection: 'column',
    gap: 12,
    zIndex: 1500,
  },
  mapControlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E293B',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
});
