import React, { useState } from 'react';
import { StyleSheet, View, ActivityIndicator, Alert } from 'react-native';
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
import { db, isMock } from './firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { COLORS } from './src/styles/theme';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';

export default function App() {
  // Google Yazı Tiplerini Yükle
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_700Bold,
  });

  // Sihirbaz Durum Yönetimi
  const [currentStep, setCurrentStep] = useState(0);
  const [stepHistory, setStepHistory] = useState([0]);
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
    setStepHistory(prev => [...prev, nextStep]);
    setCurrentStep(nextStep);
  };

  const navigateBack = () => {
    if (stepHistory.length > 1) {
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

  const handleTrackSubmission = async (trackId) => {
    try {
      let foundSubmission = null;

      if (!isMock) {
        try {
          const docRef = doc(db, 'submissions', trackId);
          const docSnap = await Promise.race([
            getDoc(docRef),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
          ]);
          if (docSnap.exists()) {
            foundSubmission = { id: docSnap.id, ...docSnap.data() };
          }
        } catch (onlineErr) {
          console.warn("Online tracking failed/timed out, trying local submissions:", onlineErr);
        }
      }

      if (!foundSubmission) {
        const localStr = await AsyncStorage.getItem('@local_submissions');
        const localSubmissions = localStr ? JSON.parse(localStr) : [];
        const found = localSubmissions.find(sub => sub.id === trackId);
        if (found) {
          foundSubmission = found;
        }
      }

      if (foundSubmission) {
        setDocId(foundSubmission.id);
        setWizardData(foundSubmission);
        setCurrentStep(12);
        setStepHistory([0, 12]);
        return true;
      }

      Alert.alert('Başvuru Bulunamadı', 'Girdiğiniz Referans ID ile eşleşen bir başvuru kaydı bulunamadı. Lütfen ID\'nizi kontrol ediniz.');
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
        <View style={[styles.appContainer, { backgroundColor: '#0B0F19' }]}>
          <ContractorPortal onBack={() => setShowContractorPortal(false)} />
          <StatusBar style="light" />
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
          />
        );
      case 3:
        return (
          <UnionTypeScreen 
            data={wizardData}
            updateData={updateWizardData}
            onNext={() => handleNextTransition()}
            onBack={navigateBack}
          />
        );
      case 4:
        return (
          <PhysicalInfoScreen 
            data={wizardData}
            updateData={updateWizardData}
            onNext={() => handleNextTransition()}
            onBack={navigateBack}
          />
        );
      case 7:
        return (
          <LocationScreen 
            data={wizardData}
            updateData={updateWizardData}
            onNext={() => handleNextTransition()}
            onBack={navigateBack}
          />
        );
      case 8:
        return (
          <DeedScreen 
            data={wizardData}
            updateData={updateWizardData}
            onNext={() => handleNextTransition()}
            onBack={navigateBack}
          />
        );
      case 9:
        return (
          <MapScreen 
            data={wizardData}
            updateData={updateWizardData}
            onNext={() => handleNextTransition()}
            onBack={navigateBack}
          />
        );
      case 10:
        return (
          <ProfileScreen 
            data={wizardData}
            updateData={updateWizardData}
            onNext={() => handleNextTransition()}
            onBack={navigateBack}
          />
        );
      case 13:
        return (
          <ExtraScreen 
            data={wizardData}
            updateData={updateWizardData}
            onNext={() => handleNextTransition()}
            onBack={navigateBack}
          />
        );
      case 14:
        return (
          <OfferChoiceScreen 
            data={wizardData}
            updateData={updateWizardData}
            onNext={() => handleNextTransition()}
            onBack={navigateBack}
          />
        );
      case 11:
        return (
          <ContactScreen 
            data={wizardData}
            updateData={updateWizardData}
            onComplete={handleComplete}
            onBack={navigateBack}
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
      default:
        return <WelcomeScreen onNext={() => handleNextTransition()} />;
    }
  };

  return (
    <SafeAreaProvider initialWindowMetrics={initialWindowMetrics}>
      <View style={styles.appContainer}>
        {renderScreen()}
        <StatusBar style="light" />
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
