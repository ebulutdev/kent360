import React, { useState, useEffect, useRef, useMemo } from 'react';
import Supercluster from 'supercluster';
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
  Linking,
  Image,
  Modal
} from 'react-native';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, addDoc, getDocs, query, where, limit, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore';
import { Briefcase, Mail, Lock, Building, ArrowLeft, LogOut, Search, MapPin, X, Phone, Compass, Globe, User, Plus, Heart, Calendar, Camera, Check, Layers } from 'lucide-react-native';
import MapView, { Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, db, isMock } from '../../firebaseConfig';
import { COLORS, FONTS, globalStyles } from '../styles/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';


const { width } = Dimensions.get('window');

const PORTAL_COLORS = {
  bg: '#F8FAFC',            // Slate 50 Light Gray
  card: '#FFFFFF',          // Pure White
  border: '#E2E8F0',        // Slate 200 Light Border
  accent: '#FDC010',        // Altın Sarısı (Logo Gold)
  accentLight: '#1E293B',   // Dark Navy
  accentBg: 'rgba(253, 192, 16, 0.12)', // Altın sarısı düşük opaklıklı arka plan
  textTitle: '#0F172A',     // Slate 900 (Koyu başlıklar)
  textBody: '#1E293B',      // Slate 800 (Readability body)
  textMuted: '#64748B',     // Slate 500 Muted
  verified: '#10B981',      // Onay Yeşili
  verifiedBg: 'rgba(16, 185, 129, 0.12)',
  danger: '#EF4444',
  dangerBg: 'rgba(239, 68, 68, 0.15)',
  buttonText: '#1E293B'     // Koyu lacivert buton metni
};

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
    'Pendik': { latitude: 40.8752, longitude: 29.2312 },
    'Bahçelievler': { latitude: 40.9980, longitude: 28.8600 },
    'Bakırköy': { latitude: 40.9782, longitude: 28.8744 },
    'Bağcılar': { latitude: 41.0336, longitude: 28.8576 },
    'Esenler': { latitude: 41.0370, longitude: 28.8890 }
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

const getDistance = (lat1, lon1, lat2, lon2) => {
  return Math.pow(lat1 - lat2, 2) + Math.pow(lon1 - lon2, 2);
};

const getNearestLocationName = (lat, lng, longitudeDelta) => {
  if (longitudeDelta > 2.5) {
    return 'Türkiye';
  }
  
  let closestCity = 'İstanbul';
  let minCityDist = Infinity;
  
  Object.keys(COORDINATES).forEach(cityName => {
    const city = COORDINATES[cityName];
    const dist = getDistance(lat, lng, city.latitude, city.longitude);
    if (dist < minCityDist) {
      minCityDist = dist;
      closestCity = cityName;
    }
  });

  let closestDistrict = '';
  let minDistrictDist = Infinity;
  
  const cityDistricts = COORDINATES[closestCity];
  Object.keys(cityDistricts).forEach(key => {
    if (key !== 'latitude' && key !== 'longitude') {
      const distCoords = cityDistricts[key];
      const dist = getDistance(lat, lng, distCoords.latitude, distCoords.longitude);
      if (dist < minDistrictDist) {
        minDistrictDist = dist;
        closestDistrict = key;
      }
    }
  });
  
  // Only return district if it's reasonably close
  if (minDistrictDist < 0.02) {
    return closestDistrict;
  }
  
  return closestCity;
};

const DARK_MAP_STYLE = [
  { "elementType": "geometry", "stylers": [{ "color": "#131924" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#94A3B8" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#131924" }] },
  { "featureType": "administrative", "elementType": "geometry.stroke", "stylers": [{ "color": "rgba(197, 168, 128, 0.15)" }] },
  { "featureType": "administrative.country", "elementType": "geometry.stroke", "stylers": [{ "color": "rgba(197, 168, 128, 0.15)" }] },
  { "featureType": "landscape", "elementType": "geometry", "stylers": [{ "color": "#070A13" }] },
  { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#131924" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#64748B" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#1a2130" }] },
  { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#94A3B8" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#1f293d" }] },
  { "featureType": "transit", "elementType": "geometry", "stylers": [{ "color": "#131924" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#03050a" }] },
  { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#64748B" }] }
];

const getDemoProjects = () => [
  {
    id: 'demo_proj_1',
    title: 'Fetsan Kadıköy Modern',
    location: 'Kadıköy, İstanbul',
    year: '2024',
    description: 'Kadıköy\'ün kalbinde yer alan bu projemizde, deprem riski taşıyan 40 yıllık eski bir apartmanı sıfırdan yıkarak modern mimari standartlara, yeşil enerji sertifikalarına ve geniş sosyal alanlara sahip A+ konsept bir yapı haline getirdik. Toplamda 24 lüks daire ve 3 ticari alandan oluşmaktadır.',
    images: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&auto=format&fit=crop&q=80'
    ],
    likes: 42,
    likedByMe: false
  },
  {
    id: 'demo_proj_2',
    title: 'Beşiktaş Vadi Evleri',
    location: 'Beşiktaş, İstanbul',
    year: '2023',
    description: 'Beşiktaş Ihlamurdere vadisinde konumlanan 4 bloklu sitemizi, hak sahipleriyle %100 uzlaşı sağlayarak ada bazlı imar artışı avantajıyla yeniledik. Akıllı ev sistemleri, kapalı otoparkı ve geniş peyzaj alanıyla bölgenin en prestijli projelerinden biri haline gelmiştir.',
    images: [
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&auto=format&fit=crop&q=80'
    ],
    likes: 88,
    likedByMe: true
  }
];

const cleanPayload = (val) => {
  if (val === undefined) {
    return null;
  }
  if (val === null) {
    return null;
  }
  if (Array.isArray(val)) {
    return val.map(item => cleanPayload(item));
  }
  if (typeof val === 'object') {
    const cleaned = {};
    Object.keys(val).forEach(key => {
      cleaned[key] = cleanPayload(val[key]);
    });
    return cleaned;
  }
  return val;
};

export default function ContractorPortal({ onBack }) {
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);
  const carouselRef = useRef(null);
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

  const [mapRegion, setMapRegion] = useState(null);
  const [currentLocationName, setCurrentLocationName] = useState('Türkiye');
  const geocodeTimeoutRef = useRef(null);

  const mapRequests = useMemo(() => {
    return requests.filter(req => req.coordinates && req.coordinates.latitude && req.coordinates.longitude);
  }, [requests]);

  const superclusterIndex = useMemo(() => {
    const index = new Supercluster({
      radius: 60,
      maxZoom: 16
    });
    
    const points = mapRequests.map(req => ({
      type: 'Feature',
      properties: {
        cluster: false,
        requestId: req.id,
        request: req
      },
      geometry: {
        type: 'Point',
        coordinates: [parseFloat(req.coordinates.longitude), parseFloat(req.coordinates.latitude)]
      }
    }));
    
    index.load(points);
    return index;
  }, [mapRequests]);

  const [contractorInfo, setContractorInfo] = useState(null);
  const [contractorProjects, setContractorProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Profile Edit fields
  const [editCompanyName, setEditCompanyName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [showEditForm, setShowEditForm] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Add Project fields
  const [addProjectModalOpen, setAddProjectModalOpen] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectLocation, setNewProjectLocation] = useState('');
  const [newProjectYear, setNewProjectYear] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectImages, setNewProjectImages] = useState([]); // Array of base64 strings
  const [savingProject, setSavingProject] = useState(false);

  // Project Detail Viewer
  const [selectedProject, setSelectedProject] = useState(null);
  const [activeDetailImageIdx, setActiveDetailImageIdx] = useState(0);

  // Bidding states
  const [bidModalOpen, setBidModalOpen] = useState(false);
  const [selectedRequestForBid, setSelectedRequestForBid] = useState(null);
  const [bidShare, setBidShare] = useState('45');
  const [bidCostPerSqm, setBidCostPerSqm] = useState('32000');
  const [bidNotes, setBidNotes] = useState('');
  const [submittingBid, setSubmittingBid] = useState(false);
  const [myBids, setMyBids] = useState([]);

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

          if (isMock || !auth || !db) {
            setRequests(localSubmissions);
            setLoadingRequests(false);

            // Load Mock Profile
            const mockProfile = {
              companyName: 'Kent360 İnşaat A.Ş.',
              email: currUser.email || 'muteahhit@kent360.com',
              phone: '0555 123 45 67',
              address: 'Fetsan Plaza Kat:4, Kadıköy / İstanbul',
              website: 'www.fetsangrup.com',
              verified: true
            };
            setContractorInfo(mockProfile);
            setEditCompanyName(mockProfile.companyName);
            setEditPhone(mockProfile.phone);
            setEditAddress(mockProfile.address);
            setEditWebsite(mockProfile.website);

            // Load Mock Projects
            try {
              const localProjectsStr = await AsyncStorage.getItem('@contractor_projects');
              let localProjects = localProjectsStr ? JSON.parse(localProjectsStr) : [];
              if (localProjects.length === 0) {
                localProjects = getDemoProjects();
                await AsyncStorage.setItem('@contractor_projects', JSON.stringify(localProjects));
              }
              setContractorProjects(localProjects);
            } catch (e) {
              console.error("Error loading mock projects:", e);
            }

            // Load Mock Bids
            try {
              const localBidsStr = await AsyncStorage.getItem('@contractor_bids');
              const localBids = localBidsStr ? JSON.parse(localBidsStr) : [];
              setMyBids(localBids);
            } catch (e) {
              console.error("Error loading mock bids:", e);
            }
            return;
          }

          // Online Mode
          try {
            // Fetch Contractor Profile with 4-second timeout
            let profile = null;
            const profileCacheKey = '@contractor_profile_' + currUser.uid;
            try {
              const fetchProfile = async () => {
                const qProfile = query(collection(db, 'contractors'), where('uid', '==', currUser.uid), limit(1));
                const profileSnap = await getDocs(qProfile);
                if (!profileSnap.empty) {
                  const docSnap = profileSnap.docs[0];
                  return { id: docSnap.id, ...docSnap.data() };
                }
                return null;
              };

              profile = await Promise.race([
                fetchProfile(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))
              ]);
            } catch (err) {
              console.warn("Failed or timed out fetching online profile, loading local cache:", err);
            }

            if (!profile) {
              // Load from local storage
              try {
                const cached = await AsyncStorage.getItem(profileCacheKey);
                if (cached) {
                  profile = JSON.parse(cached);
                }
              } catch (e) {
                console.error("Error reading cached profile:", e);
              }
            }

            if (!profile) {
              profile = {
                companyName: currUser.displayName || 'Kayıtlı Müteahhit',
                email: currUser.email,
                phone: '',
                address: '',
                website: '',
                verified: false
              };
            }

            setContractorInfo(profile);
            setEditCompanyName(profile.companyName || '');
            setEditPhone(profile.phone || '');
            setEditAddress(profile.address || '');
            setEditWebsite(profile.website || '');

            // Fetch Contractor Projects with 4-second timeout
            const cacheKey = '@contractor_projects_' + currUser.uid;
            let localProjects = [];
            try {
              const localProjectsStr = await AsyncStorage.getItem(cacheKey);
              localProjects = localProjectsStr ? JSON.parse(localProjectsStr) : [];
            } catch (e) {
              console.error("Error loading local projects:", e);
            }

            let onlineProjects = null;
            try {
              const fetchProjects = async () => {
                const qProj = query(collection(db, 'contractor_projects'), where('uid', '==', currUser.uid));
                const projSnap = await getDocs(qProj);
                const fetched = [];
                projSnap.forEach(doc => {
                  fetched.push({ id: doc.id, ...doc.data() });
                });
                return fetched;
              };

              onlineProjects = await Promise.race([
                fetchProjects(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))
              ]);

              // Seed demo projects if it's the demo account and database has no projects
              if (onlineProjects && onlineProjects.length === 0 && currUser.email === 'muteahhit@kent360.com') {
                const demo = getDemoProjects();
                const seeded = [];
                for (let proj of demo) {
                  try {
                    const docRef = await addDoc(collection(db, 'contractor_projects'), {
                      ...proj,
                      uid: currUser.uid,
                      createdAt: new Date().toISOString()
                    });
                    seeded.push({ id: docRef.id, ...proj, uid: currUser.uid });
                  } catch (seedErr) {
                    console.warn("Failed to write seed project online:", seedErr);
                    seeded.push({ id: 'demo_proj_' + Math.random().toString(36).substring(7), ...proj, uid: currUser.uid });
                  }
                }
                onlineProjects = seeded;
              }
            } catch (projError) {
              console.warn("Error/Timeout loading online projects:", projError);
            }

            const finalProjects = (onlineProjects && onlineProjects.length > 0) ? onlineProjects : localProjects;
            setContractorProjects(finalProjects);
            await AsyncStorage.setItem(cacheKey, JSON.stringify(finalProjects));

            // Fetch Bids/Offers
            try {
              const fetchBids = async () => {
                const qBids = query(collection(db, 'offers'), where('contractorId', '==', currUser.uid));
                const bidsSnap = await getDocs(qBids);
                const fetched = [];
                bidsSnap.forEach(doc => {
                  fetched.push({ id: doc.id, ...doc.data() });
                });
                return fetched;
              };
              const onlineBids = await Promise.race([
                fetchBids(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))
              ]);
              setMyBids(onlineBids);
              await AsyncStorage.setItem('@contractor_bids_' + currUser.uid, JSON.stringify(onlineBids));
            } catch (e) {
              console.warn("Failed or timed out fetching online bids, reading cache:", e);
              const bidsCacheKey = '@contractor_bids_' + currUser.uid;
              const cachedBids = await AsyncStorage.getItem(bidsCacheKey);
              if (cachedBids) {
                setMyBids(JSON.parse(cachedBids));
              }
            }

            // Listen to submissions in real time, sorted by newest first
            const q = query(collection(db, 'submissions'), orderBy('createdAt', 'desc'), limit(50));
            
            // 4-second timeout to dismiss loading state and show local data if Firestore hangs
            const loadTimeout = setTimeout(() => {
              console.warn("Firestore snapshot listener timed out, showing local data");
              setRequests(localSubmissions);
              setLoadingRequests(false);
            }, 4000);

            unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
              clearTimeout(loadTimeout);
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
              clearTimeout(loadTimeout);
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

  // Harita bölgesi değiştikçe başlık güncellemesi ve reverse geocoding
  useEffect(() => {
    if (!mapRegion) return;

    const { latitude, longitude, longitudeDelta } = mapRegion;

    // 1. Yerel tablodan hızlı sorgulama (Offline-friendly & anlık tepki)
    const localName = getNearestLocationName(latitude, longitude, longitudeDelta);
    setCurrentLocationName(localName);

    // 2. Debounced online lookup (Ağ isteğini azaltmak için 1.2 saniye gecikmeli)
    if (longitudeDelta <= 2.5 && !isMock) {
      if (geocodeTimeoutRef.current) {
        clearTimeout(geocodeTimeoutRef.current);
      }

      geocodeTimeoutRef.current = setTimeout(async () => {
        try {
          let geocoded = await Location.reverseGeocodeAsync({ latitude, longitude });
          if (geocoded && geocoded.length > 0) {
            const place = geocoded[0];
            const name = place.district || place.subregion || place.city || place.region;
            if (name) {
              setCurrentLocationName(name);
            }
          }
        } catch (e) {
          console.log("Online reverse geocoding error:", e);
        }
      }, 1200);
    }

    return () => {
      if (geocodeTimeoutRef.current) {
        clearTimeout(geocodeTimeoutRef.current);
      }
    };
  }, [mapRegion]);

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
      if (isMock || !auth || !db) {
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
          
          const defaultProfile = {
            companyName: companyName.trim(),
            email: email.trim(),
            uid: userCredential.user.uid,
            createdAt: new Date().toISOString(),
            verified: false
          };

          try {
            const runProfileWrite = async () => {
              const docRef = await addDoc(collection(db, 'contractors'), defaultProfile);
              return docRef.id;
            };

            const profileId = await Promise.race([
              runProfileWrite(),
              new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
            ]);
            defaultProfile.id = profileId;
          } catch (writeErr) {
            console.warn("Auth profile write to Firestore failed/timed out, saving locally:", writeErr);
            defaultProfile.id = 'profile_local_' + Math.random().toString(36).substring(7);
          }

          // Always save locally to ensure it can be loaded offline
          await AsyncStorage.setItem('@contractor_profile_' + userCredential.user.uid, JSON.stringify(defaultProfile));
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
      setMyBids([]);
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
      const querySnapshot = await Promise.race([
        getDocs(q),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
      ]);
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

  const handleSeedRequests = async () => {
    const sampleSubmissions = [
      {
        id: 'sample_sub_1',
        buildingType: 'single',
        scopeType: 'single_building',
        unionType: '',
        buildingCount: 1,
        city: 'İstanbul',
        district: 'Kadıköy',
        deeds: { single: { ada: '1250', parsel: '4' } },
        coordinates: { latitude: 40.9910, longitude: 29.0270 },
        width: 24,
        depth: 26,
        floorsCount: 5,
        isMansart: false,
        name: 'Ahmet',
        surname: 'Yılmaz',
        phone: '5321112233',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        buildingStructures: {
          single: {
            roofType: 'normal',
            averageSqm: 110,
            floors: [
              { key: 'normal_4', label: '4. Kat', type: 'normal', units: [{type:'daire', name:'Daire', id:'u1'}, {type:'daire', name:'Daire', id:'u2'}] },
              { key: 'normal_3', label: '3. Kat', type: 'normal', units: [{type:'daire', name:'Daire', id:'u3'}, {type:'daire', name:'Daire', id:'u4'}] },
              { key: 'normal_2', label: '2. Kat', type: 'normal', units: [{type:'daire', name:'Daire', id:'u5'}, {type:'daire', name:'Daire', id:'u6'}] },
              { key: 'normal_1', label: '1. Kat', type: 'normal', units: [{type:'daire', name:'Daire', id:'u7'}, {type:'daire', name:'Daire', id:'u8'}] },
              { key: 'ground', label: 'Zemin Kat', type: 'ground', units: [{type:'dukkan', name:'Dükkan', id:'u9'}, {type:'daire', name:'Daire', id:'u10'}] }
            ]
          }
        }
      },
      {
        id: 'sample_sub_2',
        buildingType: 'complex',
        scopeType: 'site',
        unionType: 'block_based',
        buildingCount: 3,
        totalBuildingCount: 4,
        city: 'İstanbul',
        district: 'Beşiktaş',
        deeds: {
          A: { ada: '4320', parsel: '12' },
          B: { ada: '4320', parsel: '12' },
          C: { ada: '4320', parsel: '12' }
        },
        coordinates: { latitude: 41.0428, longitude: 29.0075 },
        width: 28,
        depth: 30,
        floorsCount: 4,
        isMansart: true,
        name: 'Mehmet',
        surname: 'Kaya',
        phone: '5054445566',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        buildingStructures: {
          A: {
            roofType: 'mansart',
            averageSqm: 120,
            floors: [
              { key: 'normal_3', label: '3. Kat', type: 'normal', units: [{type:'daire', name:'Daire', id:'a1'}, {type:'daire', name:'Daire', id:'a2'}] },
              { key: 'normal_2', label: '2. Kat', type: 'normal', units: [{type:'daire', name:'Daire', id:'a3'}, {type:'daire', name:'Daire', id:'a4'}] },
              { key: 'normal_1', label: '1. Kat', type: 'normal', units: [{type:'daire', name:'Daire', id:'a5'}, {type:'daire', name:'Daire', id:'a6'}] },
              { key: 'ground', label: 'Zemin Kat', type: 'ground', units: [{type:'daire', name:'Daire', id:'a7'}, {type:'daire', name:'Daire', id:'a8'}] }
            ]
          },
          B: {
            roofType: 'normal',
            averageSqm: 120,
            floors: [
              { key: 'normal_3', label: '3. Kat', type: 'normal', units: [{type:'daire', name:'Daire', id:'b1'}, {type:'daire', name:'Daire', id:'b2'}] },
              { key: 'normal_2', label: '2. Kat', type: 'normal', units: [{type:'daire', name:'Daire', id:'b3'}, {type:'daire', name:'Daire', id:'b4'}] },
              { key: 'normal_1', label: '1. Kat', type: 'normal', units: [{type:'daire', name:'Daire', id:'b5'}, {type:'daire', name:'Daire', id:'b6'}] },
              { key: 'ground', label: 'Zemin Kat', type: 'ground', units: [{type:'daire', name:'Daire', id:'b7'}, {type:'daire', name:'Daire', id:'b8'}] }
            ]
          },
          C: {
            roofType: 'normal',
            averageSqm: 100,
            floors: [
              { key: 'normal_2', label: '2. Kat', type: 'normal', units: [{type:'daire', name:'Daire', id:'c1'}, {type:'daire', name:'Daire', id:'c2'}] },
              { key: 'normal_1', label: '1. Kat', type: 'normal', units: [{type:'daire', name:'Daire', id:'c3'}, {type:'daire', name:'Daire', id:'c4'}] },
              { key: 'ground', label: 'Zemin Kat', type: 'ground', units: [{type:'daire', name:'Daire', id:'c5'}, {type:'daire', name:'Daire', id:'c6'}] }
            ]
          }
        }
      },
      {
        id: 'sample_sub_3',
        buildingType: 'single',
        scopeType: 'multi_building',
        unionType: 'multi_parcel',
        buildingCount: 2,
        city: 'Ankara',
        district: 'Çankaya',
        deeds: {
          building_1: { ada: '8890', parsel: '5' },
          building_2: { ada: '8890', parsel: '6' }
        },
        coordinates: { latitude: 39.9080, longitude: 32.8622 },
        width: 26,
        depth: 28,
        floorsCount: 6,
        isMansart: false,
        name: 'Mustafa',
        surname: 'Öztürk',
        phone: '5443332211',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
        buildingStructures: {
          building_1: {
            roofType: 'normal',
            averageSqm: 115,
            floors: [
              { key: 'normal_5', label: '5. Kat', type: 'normal', units: [{type:'daire', name:'Daire', id:'d1'}, {type:'daire', name:'Daire', id:'d2'}] },
              { key: 'normal_4', label: '4. Kat', type: 'normal', units: [{type:'daire', name:'Daire', id:'d3'}, {type:'daire', name:'Daire', id:'d4'}] },
              { key: 'normal_3', label: '3. Kat', type: 'normal', units: [{type:'daire', name:'Daire', id:'d5'}, {type:'daire', name:'Daire', id:'d6'}] },
              { key: 'normal_2', label: '2. Kat', type: 'normal', units: [{type:'daire', name:'Daire', id:'d7'}, {type:'daire', name:'Daire', id:'d8'}] },
              { key: 'normal_1', label: '1. Kat', type: 'normal', units: [{type:'daire', name:'Daire', id:'d9'}, {type:'daire', name:'Daire', id:'d10'}] },
              { key: 'ground', label: 'Zemin Kat', type: 'ground', units: [{type:'dukkan', name:'Dükkan', id:'d11'}, {type:'daire', name:'Daire', id:'d12'}] }
            ]
          },
          building_2: {
            roofType: 'normal',
            averageSqm: 115,
            floors: [
              { key: 'normal_5', label: '5. Kat', type: 'normal', units: [{type:'daire', name:'Daire', id:'e1'}, {type:'daire', name:'Daire', id:'e2'}] },
              { key: 'normal_4', label: '4. Kat', type: 'normal', units: [{type:'daire', name:'Daire', id:'e3'}, {type:'daire', name:'Daire', id:'e4'}] },
              { key: 'normal_3', label: '3. Kat', type: 'normal', units: [{type:'daire', name:'Daire', id:'e5'}, {type:'daire', name:'Daire', id:'e6'}] },
              { key: 'normal_2', label: '2. Kat', type: 'normal', units: [{type:'daire', name:'Daire', id:'e7'}, {type:'daire', name:'Daire', id:'e8'}] },
              { key: 'normal_1', label: '1. Kat', type: 'normal', units: [{type:'daire', name:'Daire', id:'e9'}, {type:'daire', name:'Daire', id:'e10'}] },
              { key: 'ground', label: 'Zemin Kat', type: 'ground', units: [{type:'dukkan', name:'Dükkan', id:'e11'}, {type:'daire', name:'Daire', id:'e12'}] }
            ]
          }
        }
      }
    ];

    try {
      if (isMock) {
        setRequests(sampleSubmissions);
        await AsyncStorage.setItem('@local_submissions', JSON.stringify(sampleSubmissions));
      } else {
        await AsyncStorage.setItem('@local_submissions', JSON.stringify(sampleSubmissions));
        setRequests(sampleSubmissions);
      }
      Alert.alert('Başarılı', '3 adet örnek dönüşüm talebi sisteme eklendi.');
    } catch (e) {
      console.error("Error seeding submissions:", e);
    }
  };

  const handleSaveProfile = async () => {
    if (!editCompanyName.trim()) {
      Alert.alert('Eksik Bilgi', 'Firma adı boş bırakılamaz.');
      return;
    }

    setSavingProfile(true);
    const updatedProfile = cleanPayload({
      ...contractorInfo,
      companyName: editCompanyName.trim(),
      phone: editPhone.trim(),
      address: editAddress.trim(),
      website: editWebsite.trim()
    });

    try {
      if (isMock || !auth || !db) {
        setContractorInfo(updatedProfile);
        Alert.alert('Başarılı', 'Profil bilgileri kaydedildi (Yerel mod).');
        setShowEditForm(false);
      } else {
        const runProfileWrite = async () => {
          if (contractorInfo && contractorInfo.id) {
            const docRef = doc(db, 'contractors', contractorInfo.id);
            await updateDoc(docRef, {
              companyName: editCompanyName.trim(),
              phone: editPhone.trim(),
              address: editAddress.trim(),
              website: editWebsite.trim()
            });
            return contractorInfo.id;
          } else {
            const docRef = await addDoc(collection(db, 'contractors'), {
              uid: user.uid,
              companyName: editCompanyName.trim(),
              phone: editPhone.trim(),
              address: editAddress.trim(),
              website: editWebsite.trim(),
              createdAt: new Date().toISOString()
            });
            return docRef.id;
          }
        };

        try {
          // 6-second timeout for Firestore write
          const profileId = await Promise.race([
            runProfileWrite(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 6000))
          ]);
          updatedProfile.id = profileId;
          setContractorInfo(updatedProfile);
          await AsyncStorage.setItem('@contractor_profile_' + user.uid, JSON.stringify(updatedProfile));
          Alert.alert('Başarılı', 'Profil bilgileri veritabanına kaydedildi.');
          setShowEditForm(false);
        } catch (writeErr) {
          console.warn("Profile save to Firestore timed out or failed, saving locally:", writeErr);
          setContractorInfo(updatedProfile);
          await AsyncStorage.setItem('@contractor_profile_' + user.uid, JSON.stringify(updatedProfile));
          Alert.alert('Yerel Kayıt Yapıldı', 'Veritabanı bağlantısı kurulamadığı için profil bilgileri yerel hafızaya kaydedildi.');
          setShowEditForm(false);
        }
      }
    } catch (e) {
      console.error("Error saving profile:", e);
      Alert.alert('Hata', 'Profil kaydedilirken hata oluştu.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Galeriden fotoğraf seçebilmek için izin vermeniz gerekmektedir.');
      return;
    }

    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: 5 - newProjectImages.length,
        quality: 0.5,
        base64: true
      });

      if (!result.canceled) {
        const selected = result.assets.map(asset => `data:image/jpeg;base64,${asset.base64}`);
        setNewProjectImages(prev => [...prev, ...selected].slice(0, 5));
      }
    } catch (e) {
      console.error("Error picking image:", e);
      Alert.alert('Hata', 'Fotoğraf seçilirken bir hata oluştu.');
    }
  };

  const handleSaveProject = async () => {
    if (!newProjectTitle.trim() || !newProjectDesc.trim() || !newProjectLocation.trim() || !newProjectYear.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen tüm alanları doldurunuz.');
      return;
    }
    if (newProjectImages.length === 0) {
      Alert.alert('Fotoğraf Eksik', 'Lütfen projeniz için en az 1 adet fotoğraf seçiniz.');
      return;
    }

    setSavingProject(true);
    const newProject = cleanPayload({
      title: newProjectTitle.trim(),
      description: newProjectDesc.trim(),
      location: newProjectLocation.trim(),
      year: newProjectYear.trim(),
      images: newProjectImages,
      likes: 0,
      likedByMe: false
    });

    try {
      if (isMock || !auth || !db) {
        newProject.id = 'proj_' + Math.random().toString(36).substring(7);
        const updatedList = [newProject, ...contractorProjects];
        setContractorProjects(updatedList);
        await AsyncStorage.setItem('@contractor_projects', JSON.stringify(updatedList));
        Alert.alert('Başarılı', 'Projeniz portfolyonuza eklendi.');
      } else {
        const runProjectWrite = async () => {
          const docRef = await addDoc(collection(db, 'contractor_projects'), {
            ...newProject,
            uid: user.uid,
            createdAt: new Date().toISOString()
          });
          return docRef.id;
        };

        try {
          // 6-second timeout for Firestore write
          const projectId = await Promise.race([
            runProjectWrite(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 6000))
          ]);
          newProject.id = projectId;
          const updatedList = [newProject, ...contractorProjects];
          setContractorProjects(updatedList);
          await AsyncStorage.setItem('@contractor_projects_' + user.uid, JSON.stringify(updatedList));
          Alert.alert('Başarılı', 'Projeniz portfolyonuza eklendi.');
        } catch (writeErr) {
          console.warn("Project save to Firestore timed out or failed, saving locally:", writeErr);
          // Fallback to local storage
          newProject.id = 'proj_local_' + Math.random().toString(36).substring(7);
          const updatedList = [newProject, ...contractorProjects];
          setContractorProjects(updatedList);
          await AsyncStorage.setItem('@contractor_projects_' + user.uid, JSON.stringify(updatedList));
          Alert.alert('Yerel Kayıt Yapıldı', 'Firebase veritabanı bulunamadığı için projeniz yerel belleğe kaydedildi.');
        }
      }

      // Reset form
      setNewProjectTitle('');
      setNewProjectDesc('');
      setNewProjectLocation('');
      setNewProjectYear('');
      setNewProjectImages([]);
      setAddProjectModalOpen(false);
    } catch (e) {
      console.error("Error adding project:", e);
      Alert.alert('Hata', 'Proje eklenirken bir hata oluştu.');
    } finally {
      setSavingProject(false);
    }
  };

  const handleSendBid = async () => {
    if (!bidShare.trim() || !bidCostPerSqm.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen teklif yüzdesi ve maliyeti alanlarını doldurunuz.');
      return;
    }

    setSubmittingBid(true);

    const shareNum = parseFloat(bidShare.replace(/[^0-9.]/g, ''));
    const costNum = parseFloat(bidCostPerSqm.replace(/[^0-9.]/g, ''));

    if (isNaN(shareNum) || shareNum <= 0 || shareNum >= 100) {
      Alert.alert('Geçersiz Değer', 'Lütfen 0 ile 100 arasında geçerli bir Müteahhit Payı giriniz.');
      setSubmittingBid(false);
      return;
    }

    if (isNaN(costNum) || costNum <= 0) {
      Alert.alert('Geçersiz Değer', 'Lütfen geçerli bir Yapım Maliyeti giriniz.');
      setSubmittingBid(false);
      return;
    }

    const newBid = cleanPayload({
      submissionId: selectedRequestForBid.id,
      contractorId: user.uid,
      companyName: contractorInfo?.companyName || 'Kent360 İnşaat A.Ş.',
      verified: contractorInfo?.verified || false,
      contractorShare: shareNum,
      costPerSqm: costNum,
      notes: bidNotes.trim(),
      createdAt: new Date().toISOString()
    });

    try {
      if (isMock || !auth || !db) {
        newBid.id = 'bid_' + Math.random().toString(36).substring(7);
        const filteredBids = myBids.filter(b => b.submissionId !== selectedRequestForBid.id);
        const updatedBids = [newBid, ...filteredBids];
        setMyBids(updatedBids);
        await AsyncStorage.setItem('@contractor_bids', JSON.stringify(updatedBids));

        const globalOffersStr = await AsyncStorage.getItem('@global_mock_offers');
        const globalOffers = globalOffersStr ? JSON.parse(globalOffersStr) : [];
        const filteredGlobal = globalOffers.filter(b => !(b.submissionId === selectedRequestForBid.id && b.contractorId === user.uid));
        const updatedGlobal = [newBid, ...filteredGlobal];
        await AsyncStorage.setItem('@global_mock_offers', JSON.stringify(updatedGlobal));

        Alert.alert('Başarılı', 'Teklifiniz başarıyla iletildi (Yerel mod).');
      } else {
        const runBidWrite = async () => {
          const qExist = query(
            collection(db, 'offers'),
            where('submissionId', '==', selectedRequestForBid.id),
            where('contractorId', '==', user.uid)
          );
          const existSnap = await getDocs(qExist);
          
          if (!existSnap.empty) {
            const bidDocId = existSnap.docs[0].id;
            const docRef = doc(db, 'offers', bidDocId);
            await updateDoc(docRef, {
              contractorShare: shareNum,
              costPerSqm: costNum,
              notes: bidNotes.trim(),
              createdAt: new Date().toISOString()
            });
            return bidDocId;
          } else {
            const docRef = await addDoc(collection(db, 'offers'), newBid);
            return docRef.id;
          }
        };

        try {
          const bidId = await Promise.race([
            runBidWrite(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
          ]);

          newBid.id = bidId;
          const filteredBids = myBids.filter(b => b.submissionId !== selectedRequestForBid.id);
          const updatedBids = [newBid, ...filteredBids];
          setMyBids(updatedBids);
          await AsyncStorage.setItem('@contractor_bids_' + user.uid, JSON.stringify(updatedBids));

          // Also save to global mock offers as fallback for citizen tracking
          const globalOffersStr = await AsyncStorage.getItem('@global_mock_offers');
          const globalOffers = globalOffersStr ? JSON.parse(globalOffersStr) : [];
          const filteredGlobal = globalOffers.filter(b => !(b.submissionId === selectedRequestForBid.id && b.contractorId === user.uid));
          const updatedGlobal = [newBid, ...filteredGlobal];
          await AsyncStorage.setItem('@global_mock_offers', JSON.stringify(updatedGlobal));

          Alert.alert('Başarılı', 'Teklifiniz veritabanına kaydedildi ve malike iletildi.');
        } catch (writeErr) {
          console.warn("Bid save to Firestore timed out or failed, saving locally:", writeErr);
          
          newBid.id = 'bid_local_' + Math.random().toString(36).substring(7);
          const filteredBids = myBids.filter(b => b.submissionId !== selectedRequestForBid.id);
          const updatedBids = [newBid, ...filteredBids];
          setMyBids(updatedBids);
          await AsyncStorage.setItem('@contractor_bids_' + user.uid, JSON.stringify(updatedBids));

          // Save to global mock offers as fallback for citizen
          const globalOffersStr = await AsyncStorage.getItem('@global_mock_offers');
          const globalOffers = globalOffersStr ? JSON.parse(globalOffersStr) : [];
          const filteredGlobal = globalOffers.filter(b => !(b.submissionId === selectedRequestForBid.id && b.contractorId === user.uid));
          const updatedGlobal = [newBid, ...filteredGlobal];
          await AsyncStorage.setItem('@global_mock_offers', JSON.stringify(updatedGlobal));

          Alert.alert('Yerel Kayıt Yapıldı', 'Veritabanı bağlantısı kurulamadığı için teklif yerel belleğe kaydedildi.');
        }
      }
      setBidModalOpen(false);
      setSelectedRequestForBid(null);
      setBidNotes('');
    } catch (e) {
      console.error("Error sending bid:", e);
      let errorMsg = e.message || '';
      let errorCode = e.code || '';
      if (errorCode === 'permission-denied' || errorMsg.includes('permission-denied') || errorMsg.includes('insufficient permissions')) {
        Alert.alert(
          'Firebase Yetki Hatası',
          'Firestore veritabanına teklif yazma yetkiniz yok.\n\nÇözüm: Firebase Konsolunuzda Cloud Firestore > Rules (Kurallar) sekmesinden okuma/yazma izinlerini herkese açık (veya test moduna) düzenleyiniz.'
        );
      } else if (errorCode === 'not-found' || errorMsg.includes('NOT_FOUND') || errorMsg.includes('database does not exist')) {
        Alert.alert(
          'Veritabanı Bulunamadı',
          'Firebase projenizde Cloud Firestore veritabanı oluşturulmamış.\n\nÇözüm: Firebase Konsolunuzdan Cloud Firestore sekmesine girip \'Veritabanı Oluştur\' butonuna basınız.'
        );
      } else {
        Alert.alert('Hata', 'Teklif iletilirken bir hata oluştu: ' + errorMsg);
      }
    } finally {
      setSubmittingBid(false);
    }
  };

  const handleToggleLike = async (project) => {
    const isLiked = !project.likedByMe;
    const newLikes = isLiked ? project.likes + 1 : Math.max(0, project.likes - 1);
    
    const updatedProjects = contractorProjects.map(p => {
      if (p.id === project.id) {
        return { ...p, likedByMe: isLiked, likes: newLikes };
      }
      return p;
    });
    setContractorProjects(updatedProjects);
    
    if (selectedProject && selectedProject.id === project.id) {
      setSelectedProject(prev => ({ ...prev, likedByMe: isLiked, likes: newLikes }));
    }

    try {
      if (isMock) {
        await AsyncStorage.setItem('@contractor_projects', JSON.stringify(updatedProjects));
      } else {
        await AsyncStorage.setItem('@contractor_projects_' + user.uid, JSON.stringify(updatedProjects));
        if (project.id && !project.id.startsWith('demo_proj_')) {
          const docRef = doc(db, 'contractor_projects', project.id);
          await updateDoc(docRef, {
            likes: newLikes
          });
        }
      }
    } catch (e) {
      console.error("Error toggling like:", e);
    }
  };

  const renderAuthForm = () => (
    <View style={styles.authCard}>
      <View style={styles.headerBox}>
        <View style={styles.iconWrapper}>
          <Briefcase size={24} color={PORTAL_COLORS.accent} />
        </View>
        <Text style={[styles.stepTitle, { color: PORTAL_COLORS.accent }]}>B2B MÜTEAHHİT PORTALI</Text>
      </View>

      <Text style={styles.authTitle}>{isRegister ? 'Kayıt Ol' : 'Müteahhit Girişi'}</Text>
      <Text style={styles.authSubtitle}>
        {isRegister ? 'Kent360 ağındaki projelere teklif vermek için firma hesabınızı oluşturun.' : 'Firma hesabınız ile giriş yaparak aktif kentsel dönüşüm taleplerini listeleyin.'}
      </Text>

      {isRegister && (
        <>
          <Text style={styles.authLabel}>Firma / Şirket Adı</Text>
          <TextInput
            style={styles.authInput}
            placeholder="İnşaat Ltd. Şti."
            placeholderTextColor="#64748B"
            value={companyName}
            onChangeText={setCompanyName}
          />
        </>
      )}

      <Text style={styles.authLabel}>E-Posta Adresi</Text>
      <TextInput
        style={styles.authInput}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholder="firma@ornek.com"
        placeholderTextColor="#64748B"
        value={email}
        onChangeText={setEmail}
      />

      <Text style={styles.authLabel}>Parola</Text>
      <TextInput
        style={styles.authInput}
        secureTextEntry={true}
        placeholder="******"
        placeholderTextColor="#64748B"
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity
        style={[styles.authBtn, loading && styles.authBtnDisabled]}
        onPress={handleAuth}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={PORTAL_COLORS.buttonText} size="small" />
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

  const handleClusterPress = (clusterId, latitude, longitude) => {
    if (mapRef.current) {
      try {
        const expansionZoom = superclusterIndex.getClusterExpansionZoom(clusterId);
        const newDelta = 360 / Math.pow(2, expansionZoom);
        mapRef.current.animateToRegion({
          latitude,
          longitude,
          latitudeDelta: newDelta,
          longitudeDelta: newDelta
        }, 800);
      } catch (e) {
        if (mapRegion) {
          mapRef.current.animateToRegion({
            latitude,
            longitude,
            latitudeDelta: mapRegion.latitudeDelta / 2,
            longitudeDelta: mapRegion.longitudeDelta / 2
          }, 800);
        }
      }
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
        <ActivityIndicator color={PORTAL_COLORS.accent} style={{ marginTop: 40 }} />
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
                    <MapPin size={12} color={PORTAL_COLORS.accent} style={{ marginRight: 4 }} />
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

                    {/* Teklif Durumu ve Teklif Ver Butonu */}
                    <View style={styles.divider} />
                    {(() => {
                      const existingBid = myBids.find(b => b.submissionId === item.id);
                      return (
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                          {item.coordinates && (
                            <TouchableOpacity
                              style={[styles.showMapBtn, { flex: 1, marginTop: 0 }]}
                              onPress={() => handleShowRequestOnMap(item)}
                            >
                              <MapPin size={16} color={PORTAL_COLORS.buttonText} style={{ marginRight: 6 }} />
                              <Text style={styles.showMapBtnText}>Haritada Göster</Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            style={[
                              styles.showMapBtn,
                              {
                                flex: 1.2,
                                marginTop: 0,
                                backgroundColor: existingBid ? 'rgba(197, 168, 128, 0.15)' : PORTAL_COLORS.accent,
                                borderWidth: existingBid ? 1 : 0,
                                borderColor: PORTAL_COLORS.accent,
                              }
                            ]}
                            onPress={() => {
                              setSelectedRequestForBid(item);
                              if (existingBid) {
                                setBidShare(String(existingBid.contractorShare));
                                setBidCostPerSqm(String(existingBid.costPerSqm));
                                setBidNotes(existingBid.notes || '');
                              } else {
                                setBidShare('45');
                                setBidCostPerSqm('32000');
                                setBidNotes('');
                              }
                              setBidModalOpen(true);
                            }}
                          >
                            <Briefcase size={16} color={existingBid ? PORTAL_COLORS.accent : PORTAL_COLORS.buttonText} style={{ marginRight: 6 }} />
                            <Text style={[styles.showMapBtnText, { color: existingBid ? PORTAL_COLORS.accent : PORTAL_COLORS.buttonText }]}>
                              {existingBid ? 'Teklifi Güncelle' : 'Teklif Ver'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })()}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
          {requests.length === 0 && (
            <View style={styles.emptyRequestsContainer}>
              <Building size={48} color="#64748B" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyRequestsText}>Aktif dönüşüm talebi bulunamadı.</Text>
              <Text style={styles.emptyRequestsSub}>Müteahhit portalını test etmek için örnek talepleri yükleyebilirsiniz.</Text>
              <TouchableOpacity 
                style={styles.seedRequestsBtn}
                onPress={handleSeedRequests}
                activeOpacity={0.8}
              >
                <Building size={16} color={PORTAL_COLORS.buttonText} style={{ marginRight: 6 }} />
                <Text style={styles.seedRequestsBtnText}>Örnek Talepleri Yükle</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );

  const renderMapView = () => {
    const activeRegion = mapRegion || (mapFocusCoordinate ? {
      latitude: parseFloat(mapFocusCoordinate.latitude),
      longitude: parseFloat(mapFocusCoordinate.longitude),
      latitudeDelta: 0.012,
      longitudeDelta: 0.012,
    } : {
      latitude: 39.9334,
      longitude: 32.8597,
      latitudeDelta: 7.5,
      longitudeDelta: 7.5,
    });

    const westLng = activeRegion.longitude - activeRegion.longitudeDelta / 2;
    const southLat = activeRegion.latitude - activeRegion.latitudeDelta / 2;
    const eastLng = activeRegion.longitude + activeRegion.longitudeDelta / 2;
    const northLat = activeRegion.latitude + activeRegion.latitudeDelta / 2;
    const bbox = [westLng, southLat, eastLng, northLat];

    const zoom = Math.max(0, Math.min(19, Math.round(Math.log2(360 / activeRegion.longitudeDelta))));
    
    let clusters = [];
    try {
      clusters = superclusterIndex.getClusters(bbox, zoom);
    } catch (err) {
      console.warn("Supercluster getClusters error:", err);
    }

    return (
      <View style={styles.mapContainer}>
        {/* Dynamic Location Header overlay */}
        <View style={styles.mapHeaderOverlay}>
          <Text style={styles.mapHeaderTitle}>{currentLocationName}</Text>
        </View>

        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          customMapStyle={undefined}
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
          onRegionChangeComplete={(region) => {
            setMapRegion(region);
          }}
          onPress={() => setSelectedMapRequest(null)}
        >
          {clusters.map((cluster) => {
            const [longitude, latitude] = cluster.geometry.coordinates;
            const { cluster: isCluster, point_count: pointCount, cluster_id: clusterId } = cluster.properties;

            if (isCluster) {
              const clusterWidth = pointCount > 99 ? 76 : (pointCount > 9 ? 60 : 52);
              const padHorizontal = pointCount > 9 ? 8 : 6;
              return (
                <Marker
                  key={`cluster_${clusterId}_${pointCount}`}
                  coordinate={{ latitude, longitude }}
                  onPress={() => handleClusterPress(clusterId, latitude, longitude)}
                  style={{ width: clusterWidth + 32, height: 64, justifyContent: 'center', alignItems: 'center' }}
                >
                  <View style={{ padding: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' }}>
                    <View style={[styles.clusterMarkerContainer, { width: clusterWidth, paddingHorizontal: padHorizontal }]}>
                      <User size={12} color="#FDC010" style={{ marginRight: 3 }} />
                      <Text style={styles.clusterMarkerText} numberOfLines={1} ellipsizeMode="clip">{pointCount}</Text>
                    </View>
                  </View>
                </Marker>
              );
            }

            const req = cluster.properties.request;
            const isFocused = (mapFocusCoordinate && 
              parseFloat(req.coordinates.latitude) === parseFloat(mapFocusCoordinate.latitude) && 
              parseFloat(req.coordinates.longitude) === parseFloat(mapFocusCoordinate.longitude)) ||
              (selectedMapRequest && selectedMapRequest.id === req.id);

            return (
              <Marker
                key={`marker_${req.id}_${isFocused ? 'focused' : 'normal'}`}
                coordinate={{
                  latitude: parseFloat(req.coordinates.latitude),
                  longitude: parseFloat(req.coordinates.longitude),
                }}
                onPress={() => handleMarkerPress(req)}
                anchor={{ x: 0.5, y: 0.81 }}
                style={{ width: 64, height: 64, justifyContent: 'center', alignItems: 'center' }}
              >
                <View style={{ padding: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' }}>
                  <View style={[
                    styles.singleMarkerPin,
                    isFocused && styles.singleMarkerPinFocused
                  ]}>
                    <View style={styles.singleMarkerIconWrapper}>
                      <Building size={12} color={isFocused ? '#FFFFFF' : '#1E293B'} />
                    </View>
                  </View>
                </View>
              </Marker>
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
                  <MapPin size={12} color={PORTAL_COLORS.accent} style={{ marginRight: 4 }} />
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

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                {selectedMapRequest.phone && (
                  <TouchableOpacity
                    style={[styles.mapCardPhoneBtn, { flex: 1, marginTop: 0, backgroundColor: 'rgba(16, 185, 129, 0.12)', borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.25)' }]}
                    onPress={() => handleCallPhone(selectedMapRequest.phone)}
                  >
                    <Phone size={14} color="#10B981" style={{ marginRight: 6 }} />
                    <Text style={[styles.mapCardPhoneBtnText, { color: '#10B981' }]}>Ara</Text>
                  </TouchableOpacity>
                )}
                {(() => {
                  const existingBid = myBids.find(b => b.submissionId === selectedMapRequest.id);
                  return (
                    <TouchableOpacity
                      style={[
                        styles.mapCardPhoneBtn,
                        {
                          flex: 1.2,
                          marginTop: 0,
                          backgroundColor: existingBid ? 'rgba(197, 168, 128, 0.15)' : PORTAL_COLORS.accent,
                          borderWidth: existingBid ? 1 : 0,
                          borderColor: PORTAL_COLORS.accent,
                        }
                      ]}
                      onPress={() => {
                        setSelectedRequestForBid(selectedMapRequest);
                        if (existingBid) {
                          setBidShare(String(existingBid.contractorShare));
                          setBidCostPerSqm(String(existingBid.costPerSqm));
                          setBidNotes(existingBid.notes || '');
                        } else {
                          setBidShare('45');
                          setBidCostPerSqm('32000');
                          setBidNotes('');
                        }
                        setBidModalOpen(true);
                      }}
                    >
                      <Briefcase size={14} color={existingBid ? PORTAL_COLORS.accent : PORTAL_COLORS.buttonText} style={{ marginRight: 6 }} />
                      <Text style={[styles.mapCardPhoneBtnText, { color: existingBid ? PORTAL_COLORS.accent : PORTAL_COLORS.buttonText }]}>
                        {existingBid ? 'Güncelle' : 'Teklif'}
                      </Text>
                    </TouchableOpacity>
                  );
                })()}
              </View>
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
        onPress={() => {
          setActiveTab('list');
          setSelectedMapRequest(null);
        }}
        activeOpacity={0.7}
      >
        <Briefcase size={20} color={activeTab === 'list' ? PORTAL_COLORS.accent : '#94A3B8'} />
        <Text style={[styles.navText, activeTab === 'list' && styles.navTextActive]}>Talepler</Text>
        {activeTab === 'list' && <View style={styles.activeIndicatorDot} />}
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => {
          setActiveTab('map');
          setSelectedMapRequest(null);
        }}
        activeOpacity={0.7}
      >
        <MapPin size={20} color={activeTab === 'map' ? PORTAL_COLORS.accent : '#94A3B8'} />
        <Text style={[styles.navText, activeTab === 'map' && styles.navTextActive]}>Harita</Text>
        {activeTab === 'map' && <View style={styles.activeIndicatorDot} />}
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => {
          setActiveTab('profile');
          setSelectedMapRequest(null);
        }}
        activeOpacity={0.7}
      >
        <User size={20} color={activeTab === 'profile' ? PORTAL_COLORS.accent : '#94A3B8'} />
        <Text style={[styles.navText, activeTab === 'profile' && styles.navTextActive]}>Profil</Text>
        {activeTab === 'profile' && <View style={styles.activeIndicatorDot} />}
      </TouchableOpacity>
    </View>
  );

  const renderProfileView = () => {
    const totalLikes = contractorProjects.reduce((sum, p) => sum + (p.likes || 0), 0);
    
    return (
      <View style={{ flex: 1, backgroundColor: PORTAL_COLORS.bg }}>
        <ScrollView contentContainerStyle={[globalStyles.scrollContainer, { paddingTop: 16, paddingBottom: 100 }]}>
          {/* Company header card */}
          <View style={styles.profileHeaderCard}>
            <View style={styles.profileAvatarRow}>
              <View style={styles.avatarContainer}>
                {editCompanyName ? (
                  <Text style={styles.avatarText}>
                    {editCompanyName.substring(0, 2).toUpperCase()}
                  </Text>
                ) : (
                  <User size={32} color="#94A3B8" />
                )}
              </View>
              <View style={styles.profileStatsRow}>
                <View style={styles.profileStatItem}>
                  <Text style={styles.profileStatNumber}>{requests.length}</Text>
                  <Text style={styles.profileStatLabel}>Talepler</Text>
                </View>
                <View style={styles.profileStatItem}>
                  <Text style={styles.profileStatNumber}>{contractorProjects.length}</Text>
                  <Text style={styles.profileStatLabel}>Projeler</Text>
                </View>
                <View style={styles.profileStatItem}>
                  <Text style={styles.profileStatNumber}>{totalLikes}</Text>
                  <Text style={styles.profileStatLabel}>Beğeniler</Text>
                </View>
              </View>
            </View>

            <View style={styles.profileNameBio}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.profileCompanyName}>{contractorInfo?.companyName || 'Yükleniyor...'}</Text>
                {contractorInfo?.verified && (
                  <View style={styles.verifiedBadge}>
                    <Check size={10} color="#FFFFFF" />
                  </View>
                )}
              </View>
              <Text style={styles.profileEmail}>{contractorInfo?.email}</Text>
              
              {contractorInfo?.phone ? (
                <Text style={styles.profileInfoText}><Phone size={12} color="#94A3B8" style={{ marginRight: 6 }} /> {contractorInfo.phone}</Text>
              ) : null}
              {contractorInfo?.address ? (
                <Text style={styles.profileInfoText}><MapPin size={12} color="#94A3B8" style={{ marginRight: 6 }} /> {contractorInfo.address}</Text>
              ) : null}
              {contractorInfo?.website ? (
                <Text style={styles.profileInfoText}><Globe size={12} color="#94A3B8" style={{ marginRight: 6 }} /> {contractorInfo.website}</Text>
              ) : null}
            </View>

            <TouchableOpacity 
              style={styles.editProfileBtn}
              onPress={() => setShowEditForm(prev => !prev)}
            >
              <Text style={styles.editProfileBtnText}>
                {showEditForm ? 'Düzenlemeyi Kapat' : 'Profili Düzenle'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Edit Profile Form */}
          {showEditForm && (
            <View style={[styles.profileHeaderCard, { marginTop: 12 }]}>
              <Text style={[styles.expandedSectionTitle, { color: PORTAL_COLORS.accent }]}>Profili Düzenle</Text>
              
              <Text style={styles.editFormLabel}>Firma Adı</Text>
              <TextInput 
                style={styles.profileInput}
                value={editCompanyName}
                onChangeText={setEditCompanyName}
                placeholder="Firma Adı"
                placeholderTextColor="#64748B"
              />

              <Text style={styles.editFormLabel}>Telefon Numarası</Text>
              <TextInput 
                style={styles.profileInput}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="Örn: 0532 123 4567"
                placeholderTextColor="#64748B"
                keyboardType="phone-pad"
              />

              <Text style={styles.editFormLabel}>Adres</Text>
              <TextInput 
                style={[styles.profileInput, { height: 80, textAlignVertical: 'top' }]}
                value={editAddress}
                onChangeText={setEditAddress}
                placeholder="Firma Adresi"
                placeholderTextColor="#64748B"
                multiline
              />

              <Text style={styles.editFormLabel}>Web Sitesi</Text>
              <TextInput 
                style={styles.profileInput}
                value={editWebsite}
                onChangeText={setEditWebsite}
                placeholder="Örn: www.fetsangrup.com"
                placeholderTextColor="#64748B"
                autoCapitalize="none"
              />

              <TouchableOpacity 
                style={styles.saveProfileBtn}
                onPress={handleSaveProfile}
                disabled={savingProfile}
              >
                {savingProfile ? (
                  <ActivityIndicator size="small" color={PORTAL_COLORS.buttonText} />
                ) : (
                  <Text style={styles.saveProfileBtnText}>Kaydet</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Portfolio Grid Header */}
          <View style={styles.portfolioGridHeader}>
            <Text style={styles.portfolioTitle}>Portfolyo Projeleri</Text>
            <TouchableOpacity 
              style={styles.addProjectBtn}
              onPress={() => setAddProjectModalOpen(true)}
            >
              <Plus size={16} color={PORTAL_COLORS.buttonText} style={{ marginRight: 4 }} />
              <Text style={styles.addProjectBtnText}>Proje Ekle</Text>
            </TouchableOpacity>
          </View>

          {/* Empty portfolio statement */}
          {contractorProjects.length === 0 && (
            <View style={styles.emptyPortfolioCard}>
              <Camera size={32} color="#64748B" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyPortfolioText}>Henüz hiç proje eklemediniz.</Text>
              <Text style={styles.emptyPortfolioSub}>
                İlk kentsel dönüşüm projenizi eklemek için yukarıdaki "Proje Ekle" butonuna basın.
              </Text>
            </View>
          )}

          {/* Grid Render */}
          {contractorProjects.length > 0 && renderProjectGrid()}
        </ScrollView>
      </View>
    );
  };

  const renderProjectGrid = () => {
    const rows = [];
    for (let i = 0; i < contractorProjects.length; i += 3) {
      rows.push(contractorProjects.slice(i, i + 3));
    }
    
    return (
      <View style={styles.gridContainer}>
        {rows.map((row, rIdx) => (
          <View key={rIdx} style={styles.gridRow}>
            {row.map((proj) => (
              <TouchableOpacity
                key={proj.id}
                style={styles.gridThumbnail}
                activeOpacity={0.8}
                onPress={() => {
                  setSelectedProject(proj);
                  setActiveDetailImageIdx(0);
                }}
              >
                <Image source={{ uri: proj.images?.[0] }} style={styles.thumbnailImage} />
                {proj.images?.length > 1 && (
                  <View style={styles.multipleImagesBadge}>
                    <Layers size={10} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
            {row.length < 3 && Array.from({ length: 3 - row.length }).map((_, i) => (
              <View key={`empty_${i}`} style={[styles.gridThumbnail, { backgroundColor: 'transparent', borderWidth: 0 }]} />
            ))}
          </View>
        ))}
      </View>
    );
  };

  const renderProjectDetailModal = () => {
    if (!selectedProject) return null;
    return (
      <Modal
        visible={!!selectedProject}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedProject(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setSelectedProject(null)}
          />
          <View style={styles.projectDetailModalCard}>
            <View style={styles.projectModalHeader}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.projectModalTitle} numberOfLines={1}>{selectedProject.title}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                  <MapPin size={10} color={PORTAL_COLORS.accent} style={{ marginRight: 4 }} />
                  <Text style={styles.projectModalSub} numberOfLines={1}>{selectedProject.location} • {selectedProject.year}</Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.closeProjectModalBtn}
                onPress={() => setSelectedProject(null)}
              >
                <X size={20} color={PORTAL_COLORS.textTitle} />
              </TouchableOpacity>
            </View>

            {/* Carousel */}
            <View style={styles.modalCarouselContainer}>
              <FlatList
                ref={carouselRef}
                data={selectedProject.images}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(_, index) => index.toString()}
                getItemLayout={(data, index) => ({
                  length: width - 40,
                  offset: (width - 40) * index,
                  index
                })}
                onMomentumScrollEnd={(e) => {
                  const contentOffset = e.nativeEvent.contentOffset.x;
                  const viewSize = e.nativeEvent.layoutMeasurement.width;
                  if (viewSize > 0) {
                    const pageNum = Math.round(contentOffset / viewSize);
                    setActiveDetailImageIdx(pageNum);
                  }
                }}
                renderItem={({ item }) => (
                  <Image 
                    source={{ uri: item }} 
                    style={{ width: width - 40, height: '100%' }} 
                    resizeMode="cover"
                  />
                )}
              />
              {selectedProject.images.length > 1 && (
                <View style={styles.carouselDotsContainer}>
                  {selectedProject.images.map((_, dotIdx) => (
                    <TouchableOpacity
                      key={dotIdx}
                      style={[
                        styles.carouselDot,
                        activeDetailImageIdx === dotIdx && styles.carouselDotActive
                      ]}
                      onPress={() => {
                        setActiveDetailImageIdx(dotIdx);
                        carouselRef.current?.scrollToIndex({ index: dotIdx, animated: true });
                      }}
                    />
                  ))}
                </View>
              )}
            </View>

            {/* Description and Likes */}
            <View style={styles.modalActionRow}>
              <TouchableOpacity 
                style={styles.likeBtnContainer}
                onPress={() => handleToggleLike(selectedProject)}
                activeOpacity={0.8}
              >
                <Heart 
                  size={20} 
                  color={selectedProject.likedByMe ? "#EF4444" : "#F1F5F9"} 
                  fill={selectedProject.likedByMe ? "#EF4444" : "transparent"} 
                />
                <Text style={styles.likeBtnText}>{selectedProject.likes || 0} Beğeni</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.projectModalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.projectModalDescription}>
                {selectedProject.description}
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderAddProjectModal = () => {
    return (
      <Modal
        visible={addProjectModalOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAddProjectModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setAddProjectModalOpen(false)}
          />
          <View style={[styles.projectDetailModalCard, { height: '80%', maxHeight: 600 }]}>
            <View style={styles.projectModalHeader}>
              <Text style={styles.projectModalTitle}>Yeni Proje Yayınla</Text>
              <TouchableOpacity 
                style={styles.closeProjectModalBtn}
                onPress={() => setAddProjectModalOpen(false)}
              >
                <X size={20} color={PORTAL_COLORS.textTitle} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.addProjectScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {/* Image Picker Box */}
              <Text style={styles.editFormLabel}>Proje Fotoğrafları (En fazla 5 adet)</Text>
              <View style={styles.imagePickerRow}>
                {newProjectImages.map((img, imgIdx) => (
                  <View key={imgIdx} style={styles.pickedImageWrapper}>
                    <Image source={{ uri: img }} style={styles.pickedImage} />
                    <TouchableOpacity 
                      style={styles.deletePickedImageBtn}
                      onPress={() => setNewProjectImages(prev => prev.filter((_, idx) => idx !== imgIdx))}
                    >
                      <X size={12} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
                
                {newProjectImages.length < 5 && (
                  <TouchableOpacity 
                    style={styles.pickImageBtn}
                    onPress={handlePickImages}
                    activeOpacity={0.8}
                  >
                    <Camera size={24} color="#94A3B8" />
                    <Text style={styles.pickImageBtnText}>Görsel Ekle</Text>
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.editFormLabel}>Proje Başlığı</Text>
              <TextInput
                style={styles.profileInput}
                value={newProjectTitle}
                onChangeText={setNewProjectTitle}
                placeholder="Örn: Fetsan Moda Apartmanı"
                placeholderTextColor="#64748B"
              />

              <Text style={styles.editFormLabel}>Lokasyon</Text>
              <TextInput
                style={styles.profileInput}
                value={newProjectLocation}
                onChangeText={setNewProjectLocation}
                placeholder="Örn: Kadıköy, İstanbul"
                placeholderTextColor="#64748B"
              />

              <Text style={styles.editFormLabel}>Tamamlanma Yılı</Text>
              <TextInput
                style={styles.profileInput}
                value={newProjectYear}
                onChangeText={setNewProjectYear}
                placeholder="Örn: 2024"
                placeholderTextColor="#64748B"
                keyboardType="number-pad"
              />

              <Text style={styles.editFormLabel}>Proje Açıklaması</Text>
              <TextInput
                style={[styles.profileInput, { height: 100, textAlignVertical: 'top' }]}
                value={newProjectDesc}
                onChangeText={setNewProjectDesc}
                placeholder="Projenin detayları, kentsel dönüşüm süreci ve teknik özelliklerini açıklayın..."
                placeholderTextColor="#64748B"
                multiline
              />

              <TouchableOpacity
                style={styles.publishProjectBtn}
                onPress={handleSaveProject}
                disabled={savingProject}
              >
                {savingProject ? (
                  <ActivityIndicator size="small" color={PORTAL_COLORS.buttonText} />
                ) : (
                  <Text style={styles.publishProjectBtnText}>Proje Yayınla</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderBidModal = () => {
    if (!selectedRequestForBid) return null;
    
    // Check if contractor already bid on this request
    const existingBid = myBids.find(b => b.submissionId === selectedRequestForBid.id);

    return (
      <Modal
        visible={bidModalOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setBidModalOpen(false);
          setSelectedRequestForBid(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => {
              setBidModalOpen(false);
              setSelectedRequestForBid(null);
            }}
          />
          <View style={[styles.projectDetailModalCard, { height: 'auto', maxHeight: 560 }]}>
            <View style={styles.projectModalHeader}>
              <Text style={styles.projectModalTitle}>
                {existingBid ? 'Teklifi Güncelle' : 'Resmi Fizibilite Teklifi Ver'}
              </Text>
              <TouchableOpacity
                style={styles.closeProjectModalBtn}
                onPress={() => {
                  setBidModalOpen(false);
                  setSelectedRequestForBid(null);
                }}
              >
                <X size={20} color={PORTAL_COLORS.textTitle} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.addProjectScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.editFormLabel}>Müteahhit Payı Yüzdesi (%)</Text>
              <TextInput
                style={styles.profileInput}
                value={bidShare}
                onChangeText={setBidShare}
                placeholder="Örn: 45"
                placeholderTextColor="#64748B"
                keyboardType="numeric"
              />

              <Text style={styles.editFormLabel}>Metrekare İnşaat Yapım Maliyeti (₺)</Text>
              <TextInput
                style={styles.profileInput}
                value={bidCostPerSqm}
                onChangeText={setBidCostPerSqm}
                placeholder="Örn: 32000"
                placeholderTextColor="#64748B"
                keyboardType="numeric"
              />

              <Text style={styles.editFormLabel}>Teklif Notları ve Açıklama</Text>
              <TextInput
                style={[styles.profileInput, { height: 100, textAlignVertical: 'top' }]}
                value={bidNotes}
                onChangeText={setBidNotes}
                placeholder="Arsa maliklerine iletilecek mesaj, firmanızın tecrübesi ve ek detaylar..."
                placeholderTextColor="#64748B"
                multiline
              />

              <TouchableOpacity
                style={styles.publishProjectBtn}
                onPress={handleSendBid}
                disabled={submittingBid}
              >
                {submittingBid ? (
                  <ActivityIndicator size="small" color={PORTAL_COLORS.buttonText} />
                ) : (
                  <Text style={styles.publishProjectBtnText}>
                    {existingBid ? 'Teklifi Güncelle' : 'Teklifi Gönder'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[
        globalStyles.container,
        {
          backgroundColor: PORTAL_COLORS.bg,
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
            <ArrowLeft size={20} color={PORTAL_COLORS.accent} />
            <Text style={styles.backBtnText}>Ana Sayfa</Text>
          </TouchableOpacity>
          {renderAuthForm()}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, backgroundColor: PORTAL_COLORS.bg }}>
          {/* Top Navigation / Header Bar (White bg stretches under notch) */}
          <View style={[
            styles.portalHeader,
            {
              paddingTop: insets.top > 0 ? insets.top + 12 : 16,
              paddingBottom: 16
            }
          ]}>
            <TouchableOpacity style={styles.headerBackBtn} onPress={onBack}>
              <ArrowLeft size={20} color={PORTAL_COLORS.textTitle} />
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
          ) : activeTab === 'map' ? (
            renderMapView()
          ) : (
            renderProfileView()
          )}

          {renderBottomNavbar()}

          {renderProjectDetailModal()}
          {renderAddProjectModal()}
          {renderBidModal()}
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
  authCard: {
    backgroundColor: PORTAL_COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: PORTAL_COLORS.border,
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
    marginBottom: 20,
  },
  authTitle: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: PORTAL_COLORS.textTitle,
    marginBottom: 8,
    textAlign: 'center',
  },
  authSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: PORTAL_COLORS.textBody,
    lineHeight: 20,
    marginBottom: 24,
    textAlign: 'center',
  },
  authLabel: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: PORTAL_COLORS.accent,
    marginBottom: 6,
    marginTop: 12,
  },
  authInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: PORTAL_COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: PORTAL_COLORS.textTitle,
    fontFamily: FONTS.regular,
    fontSize: 15,
    marginBottom: 16,
  },
  backBtnText: {
    fontFamily: FONTS.medium,
    fontSize: 15,
    color: PORTAL_COLORS.accent,
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
    backgroundColor: PORTAL_COLORS.border,
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
    backgroundColor: PORTAL_COLORS.accent,
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
    color: PORTAL_COLORS.buttonText,
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
    color: PORTAL_COLORS.textMuted,
  },
  dashHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: PORTAL_COLORS.border,
    paddingBottom: 16,
    marginBottom: 16,
  },
  dashWelcome: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: PORTAL_COLORS.textMuted,
  },
  dashEmail: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: PORTAL_COLORS.textTitle,
  },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: PORTAL_COLORS.dangerBg,
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
    color: PORTAL_COLORS.accent, // Champagne gold section title
  },
  refreshText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: PORTAL_COLORS.textBody,
  },
  requestList: {
    flex: 1,
  },
  requestCard: {
    backgroundColor: PORTAL_COLORS.card, // Premium card bg
    borderWidth: 1,
    borderColor: PORTAL_COLORS.border,
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
    backgroundColor: PORTAL_COLORS.accentBg, // Glass champagne gold badge
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  reqBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: PORTAL_COLORS.accent,
  },
  reqDate: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: PORTAL_COLORS.textMuted,
  },
  reqTitle: {
    fontFamily: FONTS.bold,
    fontSize: 14.5,
    color: PORTAL_COLORS.textTitle,
    marginBottom: 10,
  },
  reqDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: PORTAL_COLORS.border,
    paddingTop: 10,
  },
  reqDetailText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: PORTAL_COLORS.textBody,
  },
  glow: {
    position: 'absolute',
    top: 50,
    left: -50,
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: width * 0.35,
    backgroundColor: PORTAL_COLORS.accent,
    opacity: 0.03,
    blurRadius: 100,
  },
  portalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: PORTAL_COLORS.bg, // Obsidian dark header bg
    borderBottomWidth: 1,
    borderBottomColor: PORTAL_COLORS.border,
  },
  portalHeaderTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: PORTAL_COLORS.textTitle, // White title text
  },
  headerBackBtn: {
    padding: 6,
  },
  headerLogoutBtn: {
    padding: 6,
    backgroundColor: PORTAL_COLORS.dangerBg, // Premium dark red bg
    borderRadius: 8,
  },
  bottomNavbar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 16,
    left: 20,
    right: 20,
    height: 64,
    backgroundColor: PORTAL_COLORS.card, // Slate floating pill bg
    borderRadius: 20,
    borderWidth: 1,
    borderColor: PORTAL_COLORS.border,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
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
    color: PORTAL_COLORS.textBody,
    marginTop: 2,
  },
  navTextActive: {
    color: PORTAL_COLORS.accent, // Selected champagne gold text
    fontFamily: FONTS.bold,
  },
  activeIndicatorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: PORTAL_COLORS.accent,
    marginTop: 3,
  },
  mapContainer: {
    flex: 1,
    width: '100%',
    position: 'relative',
  },
  mapHeaderOverlay: {
    position: 'absolute',
    top: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  mapHeaderTitle: {
    fontFamily: FONTS.bold,
    fontSize: 28,
    color: '#1E293B',
    textShadowColor: 'rgba(255, 255, 255, 0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  clusterMarkerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: '#FDC010',
    height: 34,
    paddingHorizontal: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  clusterMarkerText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: '#FDC010',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  singleMarkerPin: {
    width: 28,
    height: 28,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 0,
    backgroundColor: '#FDC010',
    borderWidth: 1.5,
    borderColor: '#1E293B',
    transform: [{ rotate: '45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  singleMarkerPinFocused: {
    backgroundColor: '#EF4444',
    borderColor: '#FFFFFF',
  },
  singleMarkerIconWrapper: {
    transform: [{ rotate: '-45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapInfoOverlay: {
    position: 'absolute',
    top: 80,
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: PORTAL_COLORS.accent, // Gold border
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 5,
  },
  mapInfoText: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: PORTAL_COLORS.textTitle,
    letterSpacing: 0.5,
  },
  expandedSection: {
    marginTop: 12,
    borderTopWidth: 1,
    borderColor: PORTAL_COLORS.border,
    paddingTop: 12,
  },
  divider: {
    height: 1,
    backgroundColor: PORTAL_COLORS.border,
    marginVertical: 12,
  },
  expandedSectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 9.5,
    color: PORTAL_COLORS.textBody,
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
    color: PORTAL_COLORS.textMuted,
    marginBottom: 2,
  },
  detailValue: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: PORTAL_COLORS.textTitle,
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
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: PORTAL_COLORS.border,
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  breakdownLabel: {
    fontFamily: FONTS.medium,
    fontSize: 10,
    color: PORTAL_COLORS.textMuted,
    marginBottom: 2,
  },
  breakdownVal: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: PORTAL_COLORS.textTitle,
  },
  showMapBtn: {
    backgroundColor: PORTAL_COLORS.accent,
    borderRadius: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  showMapBtnText: {
    color: PORTAL_COLORS.buttonText,
    fontFamily: FONTS.bold,
    fontSize: 12,
  },
  mapBottomCard: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 104 : 96,
    left: 20,
    right: 20,
    backgroundColor: PORTAL_COLORS.card,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: PORTAL_COLORS.border,
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
    backgroundColor: 'rgba(15, 23, 42, 0.06)',
    borderRadius: 8,
  },
  mapBottomCardTitle: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: PORTAL_COLORS.textTitle,
    marginBottom: 10,
  },
  mapBottomCardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: PORTAL_COLORS.border,
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
    color: PORTAL_COLORS.textMuted,
    marginBottom: 2,
  },
  mapStatValue: {
    fontFamily: FONTS.bold,
    fontSize: 12.5,
    color: PORTAL_COLORS.textTitle,
  },
  mapBottomCardScroll: {
    flexGrow: 0,
    maxHeight: 100,
    marginVertical: 4,
  },
  mapCardPhoneBtn: {
    backgroundColor: PORTAL_COLORS.accent,
    borderRadius: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  mapCardPhoneBtnText: {
    color: PORTAL_COLORS.buttonText,
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
    backgroundColor: PORTAL_COLORS.card,
    borderWidth: 1.5,
    borderColor: PORTAL_COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  // Contractor Profile Styles
  profileHeaderCard: {
    backgroundColor: PORTAL_COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: PORTAL_COLORS.border,
    padding: 20,
    marginBottom: 12,
  },
  profileAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: PORTAL_COLORS.accentBg,
    borderWidth: 1.5,
    borderColor: PORTAL_COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: PORTAL_COLORS.accent,
  },
  profileStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flex: 1,
    marginLeft: 20,
  },
  profileStatItem: {
    alignItems: 'center',
  },
  profileStatNumber: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: PORTAL_COLORS.textTitle,
  },
  profileStatLabel: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: PORTAL_COLORS.textBody,
    marginTop: 2,
  },
  profileNameBio: {
    marginBottom: 16,
  },
  profileCompanyName: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: PORTAL_COLORS.textTitle,
    marginRight: 6,
  },
  verifiedBadge: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileEmail: {
    fontFamily: FONTS.regular,
    fontSize: 12.5,
    color: PORTAL_COLORS.textMuted,
    marginBottom: 10,
  },
  profileInfoText: {
    fontFamily: FONTS.medium,
    fontSize: 12.5,
    color: PORTAL_COLORS.textBody,
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  editProfileBtn: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: PORTAL_COLORS.border,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  editProfileBtnText: {
    color: PORTAL_COLORS.textTitle,
    fontFamily: FONTS.bold,
    fontSize: 13,
  },
  profileInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: PORTAL_COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: PORTAL_COLORS.textTitle,
    fontFamily: FONTS.regular,
    fontSize: 14.5,
    marginBottom: 14,
  },
  saveProfileBtn: {
    backgroundColor: PORTAL_COLORS.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  saveProfileBtnText: {
    color: PORTAL_COLORS.buttonText,
    fontFamily: FONTS.bold,
    fontSize: 14.5,
  },
  editFormLabel: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: PORTAL_COLORS.accent,
    marginBottom: 6,
  },
  portfolioGridHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  portfolioTitle: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: PORTAL_COLORS.textTitle,
  },
  addProjectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PORTAL_COLORS.accent,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addProjectBtnText: {
    color: PORTAL_COLORS.buttonText,
    fontFamily: FONTS.bold,
    fontSize: 12,
  },
  emptyPortfolioCard: {
    backgroundColor: PORTAL_COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: PORTAL_COLORS.border,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyPortfolioText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: PORTAL_COLORS.textTitle,
    marginBottom: 4,
  },
  emptyPortfolioSub: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: PORTAL_COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  gridContainer: {
    flexDirection: 'column',
    gap: 3,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 3,
  },
  gridThumbnail: {
    width: (width - 46) / 3,
    aspectRatio: 1,
    backgroundColor: PORTAL_COLORS.card,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: PORTAL_COLORS.border,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  multipleImagesBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderRadius: 4,
    padding: 3,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  projectDetailModalCard: {
    width: '100%',
    backgroundColor: PORTAL_COLORS.card,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: PORTAL_COLORS.border,
    overflow: 'hidden',
    maxHeight: 520,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  projectModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: PORTAL_COLORS.border,
  },
  projectModalTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16.5,
    color: PORTAL_COLORS.textTitle,
  },
  projectModalSub: {
    fontFamily: FONTS.medium,
    fontSize: 11.5,
    color: PORTAL_COLORS.textBody,
  },
  closeProjectModalBtn: {
    padding: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.06)',
    borderRadius: 10,
  },
  modalCarouselContainer: {
    width: '100%',
    aspectRatio: 1.5,
    backgroundColor: '#F1F5F9',
    position: 'relative',
  },
  modalCarouselImage: {
    width: '100%',
    height: '100%',
  },
  carouselDotsContainer: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
    backgroundColor: 'rgba(7, 10, 19, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  carouselDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  carouselDotActive: {
    backgroundColor: PORTAL_COLORS.accent,
    width: 12,
  },
  modalActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: PORTAL_COLORS.border,
  },
  likeBtnContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  likeBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: PORTAL_COLORS.textTitle,
  },
  projectModalScroll: {
    padding: 20,
    maxHeight: 120,
  },
  projectModalDescription: {
    fontFamily: FONTS.regular,
    fontSize: 13.5,
    color: PORTAL_COLORS.textBody,
    lineHeight: 20,
    paddingBottom: 20,
  },
  // Add Project Scroll
  addProjectScroll: {
    padding: 20,
    paddingBottom: 40,
  },
  imagePickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  pickedImageWrapper: {
    width: 68,
    height: 68,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: PORTAL_COLORS.border,
  },
  pickedImage: {
    width: '100%',
    height: '100%',
  },
  deletePickedImageBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: PORTAL_COLORS.danger,
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickImageBtn: {
    width: 68,
    height: 68,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: PORTAL_COLORS.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  pickImageBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 8.5,
    color: PORTAL_COLORS.textBody,
    marginTop: 4,
  },
  publishProjectBtn: {
    backgroundColor: PORTAL_COLORS.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  publishProjectBtnText: {
    color: PORTAL_COLORS.buttonText,
    fontFamily: FONTS.bold,
    fontSize: 14.5,
  },
  // Empty states for submissions
  emptyRequestsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyRequestsText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: PORTAL_COLORS.textTitle,
    marginTop: 12,
  },
  emptyRequestsSub: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: PORTAL_COLORS.textMuted,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 20,
  },
  seedRequestsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PORTAL_COLORS.accent,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 20,
    shadowColor: PORTAL_COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  seedRequestsBtnText: {
    color: PORTAL_COLORS.buttonText,
    fontFamily: FONTS.bold,
    fontSize: 13,
  },
});

