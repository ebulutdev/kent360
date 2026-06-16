import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Varsayılan Firebase Konfigürasyonu
// Gerçek projede bu değerler eklenecektir. Uygulama boş değerlerle de çökmemesi için mock fallback barındırır.
const firebaseConfig = {
  apiKey: "AIzaSyDTE2xgzYHY5FYTQ4ziObg5HHatzTnKRPw",
  authDomain: "kent360-f48cb.firebaseapp.com",
  projectId: "kent360-f48cb",
  storageBucket: "kent360-f48cb.firebasestorage.app",
  messagingSenderId: "1073870792869",
  appId: "1:1073870792869:web:b2e88ed16eefdee6c0854c"
};

let app;
let auth;
let db;
let isMock = false;

try {
  if (firebaseConfig.apiKey === "MOCK_API_KEY_KENT360" || !firebaseConfig.apiKey) {
    console.log("⚠️ Kent360: Firebase kimlik bilgileri tanımlanmadı. Mock veritabanı aktif edildi.");
    isMock = true;
  } else {
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
    db = getFirestore(app, 'default');
  }
} catch (error) {
  console.warn("⚠️ Kent360: Firebase başlatılırken hata oluştu, mock moduna geçiliyor:", error);
  isMock = true;
}

export { auth, db, isMock };
