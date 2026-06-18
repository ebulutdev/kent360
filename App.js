import { COLORS } from './src/styles/theme';
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator, Alert, useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { 
  useFonts, 
  Outfit_400Regular, 
  Outfit_500Medium, 
  Outfit_700Bold 
} from '@expo-google-fonts/outfit';

// Ekranlar
import WelcomeScreen from './src/screens/WelcomeScreen';
import BuildingTypeScreen from './src/screens/BuildingTypeScreen';
import ScopeScreen from './src/screens/ScopeScreen';
import UnionTypeScreen from './src/screens/UnionTypeScreen';
import PhysicalInfoScreen from './src/screens/PhysicalInfoScreen';
import LocationScreen from './src/screens/LocationScreen';
import DeedScreen from './src/screens/DeedScreen';
import MapScreen from './src/screens/MapScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ExtraScreen from './src/screens/ExtraScreen';
import OfferChoiceScreen from './src/screens/OfferChoiceScreen';
import ContactScreen from './src/screens/ContactScreen';
import ShareScreen from './src/screens/ShareScreen';
import ContractorPortal from './src/screens/ContractorPortal';
import MyApplicationsScreen from './src/screens/MyApplicationsScreen';
import { db, isMock } from './firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';

export default function App() {
  const colorScheme = useColorScheme();
  // Google Yazı Tiplerini Yükle
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_700Bold,
  });

  // Sihirbaz Durum Yönetimi
  const [currentStep, setCurrentStep] = useState(0);
  const [stepHistory, setStepHistory] = useState([0]);
  const [navDirection, setNavDirection] = useState('forward');
  const [wizardData, setWizardData] = useState({
    buildingType: '',      // single, complex
    scopeType: '',         // single_building, multi_building, site
    buildingCount: 1,      // N adet bina/blok sayısı
    unionType: '',         // block_based, multi_parcel
    floors: {},            // { single: 5 } veya { A: 4, B: 5 }
    flats: {},             // { single: 10 } veya { A: 12, B: 10 }
    sqm: {},               // { single: 120 } veya { A: 100, B: 110 }
    city: '',
    district: '',
    deeds: {},             // { single: { ada: '1', parsel: '2' } }
    coordinates: null,     // { latitude: x, longitude: y }
    surroundingCount: '',
    pdfFile: null,
    name: '',
    surname: '',
    phone: '',
  });

  const [showContractorPortal, setShowContractorPortal] = useState(false);
  const [docId, setDocId] = useState('');
  const [foundApplications, setFoundApplications] = useState([]);

  useEffect(() => {
    const seedInitialLocalSubmissions = async () => {
      try {
        const localStr = await AsyncStorage.getItem('@local_submissions');
        const localSubmissions = localStr ? JSON.parse(localStr) : [];
        const hasSample1 = localSubmissions.some(sub => sub && sub.id === 'sample_sub_1');
        
        if (!hasSample1) {
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
                B: { ada: '4320', parsel: '13' },
                C: { ada: '4320', parsel: '14' }
              },
              coordinates: { latitude: 41.0430, longitude: 29.0060 },
              width: 30,
              depth: 32,
              floorsCount: 6,
              isMansart: true,
              name: 'Mehmet',
              surname: 'Can',
              phone: '5332223344',
              createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
              buildingStructures: {
                A: {
                  roofType: 'mansart',
                  averageSqm: 120,
                  floors: [
                    { key: 'normal_5', label: '5. Kat (Çatı)', type: 'normal', units: [{type:'daire', name:'Daire', id:'ua1'}] },
                    { key: 'normal_4', label: '4. Kat', type: 'normal', units: [{type:'daire', name:'Daire', id:'ua2'}, {type:'daire', name:'Daire', id:'ua3'}] },
                    { key: 'normal_3', label: '3. Kat', type: 'normal', units: [{type:'daire', name:'Daire', id:'ua4'}, {type:'daire', name:'Daire', id:'ua5'}] },
                    { key: 'normal_2', label: '2. Kat', type: 'normal', units: [{type:'daire', name:'Daire', id:'ua6'}, {type:'daire', name:'Daire', id:'ua7'}] },
                    { key: 'normal_1', label: '1. Kat', type: 'normal', units: [{type:'daire', name:'Daire', id:'ua8'}, {type:'daire', name:'Daire', id:'ua9'}] },
                    { key: 'ground', label: 'Zemin Kat', type: 'ground', units: [{type:'dukkan', name:'Dükkan', id:'ua10'}] }
                  ]
                }
              }
            },
            {
              id: 'sample_sub_3',
              buildingType: 'single',
              scopeType: 'single_building',
              unionType: '',
              buildingCount: 1,
              city: 'Ankara',
              district: 'Çankaya',
              deeds: { single: { ada: '7840', parsel: '18' } },
              coordinates: { latitude: 39.9020, longitude: 32.8590 },
              width: 20,
              depth: 22,
              floorsCount: 4,
              isMansart: false,
              name: 'Ayşe',
              surname: 'Kaya',
              phone: '5353334455',
              createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
              buildingStructures: {
                single: {
                  roofType: 'normal',
                  averageSqm: 95,
                  floors: [
                    { key: 'normal_3', label: '3. Kat', type: 'normal', units: [{type:'daire', name:'Daire', id:'u3_1'}, {type:'daire', name:'Daire', id:'u3_2'}] },
                    { key: 'normal_2', label: '2. Kat', type: 'normal', units: [{type:'daire', name:'Daire', id:'u2_1'}, {type:'daire', name:'Daire', id:'u2_2'}] },
                    { key: 'normal_1', label: '1. Kat', type: 'normal', units: [{type:'daire', name:'Daire', id:'u1_1'}, {type:'daire', name:'Daire', id:'u1_2'}] },
                    { key: 'ground', label: 'Zemin Kat', type: 'ground', units: [{type:'daire', name:'Daire', id:'ug_1'}, {type:'daire', name:'Daire', id:'ug_2'}] }
                  ]
                }
              }
            }
          ];
          
          const filteredLocal = localSubmissions.filter(s => s && s.id && !s.id.startsWith('sample_sub_'));
          const merged = [...sampleSubmissions, ...filteredLocal];
          await AsyncStorage.setItem('@local_submissions', JSON.stringify(merged));
          console.log("✅ Kent360: Örnek başvurular yerel hafızaya otomatik olarak yüklendi.");
        }
      } catch (e) {
        console.error("Error seeding initial local submissions:", e);
      }
    };
    
    seedInitialLocalSubmissions();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const updateWizardData = (newData) => {
    setWizardData(prev => ({ ...prev, ...newData }));
  };

  const navigateTo = (nextStep) => {
    setNavDirection('forward');
    setStepHistory(prev => [...prev, nextStep]);
    setCurrentStep(nextStep);
  };

  const navigateBack = () => {
    if (stepHistory.length > 1) {
      setNavDirection('backward');
      const newHistory = [...stepHistory];
      newHistory.pop(); // Mevcut ekranı çıkart
      const prevStep = newHistory[newHistory.length - 1];
      setStepHistory(newHistory);
      setCurrentStep(prevStep);
    }
  };

  const handleReset = () => {
    setWizardData({
      buildingType: '',
      scopeType: '',
      buildingCount: 1,
      unionType: '',
      floors: {},
      flats: {},
      sqm: {},
      city: '',
      district: '',
      deeds: {},
      coordinates: null,
      surroundingCount: '',
      pdfFile: null,
      name: '',
      surname: '',
      phone: '',
    });
    setDocId('');
    setCurrentStep(0);
    setStepHistory([0]);
  };

  const handleTrackSubmission = async (phoneNumber) => {
    try {
      let matchedSubmissions = [];

      if (!isMock) {
        try {
          const q = query(collection(db, 'submissions'), where('phone', '==', phoneNumber));
          const querySnapshot = await Promise.race([
            getDocs(q),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
          ]);
          querySnapshot.forEach((docSnap) => {
            matchedSubmissions.push({ id: docSnap.id, ...docSnap.data() });
          });
        } catch (onlineErr) {
          console.warn("Online tracking failed/timed out, trying local submissions:", onlineErr);
        }
      }

      // Her halükarda locale de bakalım
      const localStr = await AsyncStorage.getItem('@local_submissions');
      const localSubmissions = localStr ? JSON.parse(localStr) : [];
      const localMatches = localSubmissions.filter(sub => sub.phone === phoneNumber);
      
      // Merge online and local to prevent duplicates
      const mergedMap = new Map();
      matchedSubmissions.forEach(item => mergedMap.set(item.id, item));
      localMatches.forEach(item => mergedMap.set(item.id, item));
      
      const finalMatches = Array.from(mergedMap.values()).sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });

      if (finalMatches.length === 1) {
        await AsyncStorage.setItem('@user_phone', phoneNumber);
        setDocId(finalMatches[0].id);
        setWizardData(finalMatches[0]);
        setCurrentStep(12); // ShareScreen
        setStepHistory([0, 12]);
        return true;
      } else if (finalMatches.length > 1) {
        await AsyncStorage.setItem('@user_phone', phoneNumber);
        setFoundApplications(finalMatches);
        setCurrentStep(15); // MyApplicationsScreen
        setStepHistory([0, 15]);
        return true;
      }

      Alert.alert('Başvuru Bulunamadı', 'Girdiğiniz telefon numarası ile eşleşen bir başvuru kaydı bulunamadı.');
      return false;
    } catch (error) {
      console.error("Başvuru sorgulama hatası:", error);
      Alert.alert('Hata', 'Sorgulama esnasında bir hata oluştu: ' + error.message);
      return false;
    }
  };

  // İleri Yönlü Geçiş Akış Kuralları
  const handleNextTransition = () => {
    if (currentStep === 0) {
      navigateTo(1); // Karşılama -> Proje Tipi Seçimi
    } else if (currentStep === 1) {
      navigateTo(4); // Proje Tipi Seçimi -> Doğrudan Kat Bilgisi (PhysicalInfoScreen)
    } else if (currentStep === 2) {
      // Kapsam -> Birleşme Tipi veya Kat Bilgisi
      if (wizardData.buildingType === 'single' && wizardData.scopeType === 'single_building') {
        navigateTo(4); // Birleşme tipi yok, doğrudan Kat Bilgisi
      } else {
        navigateTo(3); // Çoklu bina veya Site ise Birleşme Tipi sor
      }
    } else if (currentStep === 3) {
      navigateTo(4); // Birleşme Tipi -> Bina Tasarım
    } else if (currentStep === 4) {
      navigateTo(7); // Bina Tasarım -> İl/İlçe Seçimi
    } else if (currentStep === 7) {
      navigateTo(8); // İl/İlçe Seçimi -> Ada/Parsel Girişi
    } else if (currentStep === 8) {
      navigateTo(9); // Ada/Parsel Girişi -> Harita Konumu
    } else if (currentStep === 9) {
      // Harita -> Bina/Parsel Profilleme
      navigateTo(10);
    } else if (currentStep === 10) {
      // Bina/Parsel Profilleme -> Ada Bazlı Ekstra veya Değerleme Seçimi
      if (wizardData.unionType === 'block_based') {
        navigateTo(13); // Ada bazlı ise ekstra sorular (ExtraScreen)
      } else {
        navigateTo(14); // Değilse doğrudan Değerleme Seçimi (OfferChoiceScreen)
      }
    } else if (currentStep === 13) {
      navigateTo(14); // Ada Bazlı Ekstra -> Değerleme Seçimi (OfferChoiceScreen)
    } else if (currentStep === 14) {
      navigateTo(11); // Değerleme Seçimi -> İletişim Bilgileri
    }
  };

  const handleComplete = (submissionId, finalData) => {
    setDocId(submissionId);
    setWizardData(finalData);
    navigateTo(12); // İletişim -> Paylaşım Ekranı
  };

  // Müteahhit Portalı Aktif İken
  if (showContractorPortal) {
    return (
      <SafeAreaProvider initialWindowMetrics={initialWindowMetrics}>
        <View style={[styles.appContainer, { backgroundColor: COLORS.bgDark }]}>
          <ContractorPortal onBack={() => setShowContractorPortal(false)} />
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        </View>
      </SafeAreaProvider>
    );
  }

  // Aktif Ekran Seçimi
  const renderScreen = () => {
    switch (currentStep) {
      case 0:
        return (
          <WelcomeScreen 
            onNext={() => handleNextTransition()} 
            onGoToContractor={() => setShowContractorPortal(true)} 
            onTrackRequest={handleTrackSubmission}
          />
        );
      case 1:
        return (
          <BuildingTypeScreen 
            data={wizardData}
            updateData={updateWizardData}
            onNext={() => handleNextTransition()}
            onBack={navigateBack}
          />
        );
      case 2:
        return (
          <ScopeScreen 
            data={wizardData}
            updateData={updateWizardData}
            onNext={() => handleNextTransition()}
            onBack={navigateBack}
            onExit={handleReset}
          />
        );
      case 3:
        return (
          <UnionTypeScreen 
            data={wizardData}
            updateData={updateWizardData}
            onNext={() => handleNextTransition()}
            onBack={navigateBack}
            onExit={handleReset}
          />
        );
      case 4:
        return (
          <PhysicalInfoScreen 
            data={wizardData}
            updateData={updateWizardData}
            onNext={() => handleNextTransition()}
            onBack={navigateBack}
            navDirection={navDirection}
            onExit={handleReset}
          />
        );
      case 7:
        return (
          <LocationScreen 
            data={wizardData}
            updateData={updateWizardData}
            onNext={() => handleNextTransition()}
            onBack={navigateBack}
            onExit={handleReset}
          />
        );
      case 8:
        return (
          <DeedScreen 
            data={wizardData}
            updateData={updateWizardData}
            onNext={() => handleNextTransition()}
            onBack={navigateBack}
            onExit={handleReset}
          />
        );
      case 9:
        return (
          <MapScreen 
            data={wizardData}
            updateData={updateWizardData}
            onNext={() => handleNextTransition()}
            onBack={navigateBack}
            onExit={handleReset}
          />
        );
      case 10:
        return (
          <ProfileScreen 
            data={wizardData}
            updateData={updateWizardData}
            onNext={() => handleNextTransition()}
            onBack={navigateBack}
            onExit={handleReset}
          />
        );
      case 13:
        return (
          <ExtraScreen 
            data={wizardData}
            updateData={updateWizardData}
            onNext={() => handleNextTransition()}
            onBack={navigateBack}
            onExit={handleReset}
          />
        );
      case 14:
        return (
          <OfferChoiceScreen 
            data={wizardData}
            updateData={updateWizardData}
            onNext={() => handleNextTransition()}
            onBack={navigateBack}
            onExit={handleReset}
          />
        );
      case 11:
        return (
          <ContactScreen 
            data={wizardData}
            updateData={updateWizardData}
            onComplete={handleComplete}
            onBack={navigateBack}
            onExit={handleReset}
          />
        );
      case 12:
        return (
          <ShareScreen 
            docId={docId}
            submissionData={wizardData}
            onReset={handleReset}
          />
        );
      case 15:
        return (
          <MyApplicationsScreen 
            applications={foundApplications}
            onSelect={(selectedApp) => {
              setDocId(selectedApp.id);
              setWizardData(selectedApp);
              navigateTo(12);
            }}
            onBack={navigateBack}
          />
        );
      default:
        return <WelcomeScreen onNext={() => handleNextTransition()} />;
    }
  };

  return (
    <SafeAreaProvider initialWindowMetrics={initialWindowMetrics}>
      <View style={styles.appContainer}>
        {renderScreen()}
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
