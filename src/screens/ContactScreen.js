import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  TextInput, 
  StyleSheet, 
  Dimensions, 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  Alert
} from 'react-native';
import { signInAnonymously } from 'firebase/auth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { User, Phone, CheckCircle, ArrowLeft, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, db, isMock } from '../../firebaseConfig';
import { COLORS, FONTS, globalStyles } from '../styles/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

export default function ContactScreen({ data, updateData, onComplete, onBack, onExit }) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(data.name || '');
  const [surname, setSurname] = useState(data.surname || '');
  const [phone, setPhone] = useState(data.phone || '');
  const [loading, setLoading] = useState(false);

  const formatPhoneNumber = (text) => {
    // Sadece sayıları al
    let cleaned = ('' + text).replace(/\D/g, '');
    
    // Eğer başta 0 varsa temizle
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    
    // Türkiye 10 haneli telefon biçimlendirmesi: (555) 555 55 55
    const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,2})(\d{0,2})$/);
    if (!match) return cleaned;

    let formatted = '';
    if (match[1]) {
      formatted += '(' + match[1] + ')';
    }
    if (match[2]) {
      formatted += ' ' + match[2];
    }
    if (match[3]) {
      formatted += ' ' + match[3];
    }
    if (match[4]) {
      formatted += ' ' + match[4];
    }

    return formatted;
  };

  const handlePhoneChange = (text) => {
    setPhone(formatPhoneNumber(text));
  };

  const handleComplete = async () => {
    if (!name.trim() || !surname.trim() || !phone.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen iletişim bilgilerini eksiksiz doldurunuz.');
      return;
    }

    if (phone.replace(/\D/g, '').length < 10) {
      Alert.alert('Hatalı Telefon No', 'Lütfen geçerli bir telefon numarası giriniz.');
      return;
    }

    setLoading(true);

    // Helper to recursively clean payload of undefined values which Firestore rejects
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

    const submissionPayload = cleanPayload({
      ...data,
      name: name.trim(),
      surname: surname.trim(),
      phone: phone.replace(/\D/g, ''),
      createdAt: new Date().toISOString()
    });

    try {
      if (isMock || !auth || !db) {
        console.log("🔥 Mock Firebase Kaydı Yapıldı:", submissionPayload);
        const mockDocId = "mock_doc_id_" + Math.random().toString(36).substring(7);
        const newSubmission = { id: mockDocId, ...submissionPayload };
        
        try {
          const existingLocalStr = await AsyncStorage.getItem('@local_submissions');
          const existingLocal = existingLocalStr ? JSON.parse(existingLocalStr) : [];
          existingLocal.unshift(newSubmission);
          await AsyncStorage.setItem('@local_submissions', JSON.stringify(existingLocal));
        } catch (storageErr) {
          console.error("Local storage save error (isMock):", storageErr);
        }

        setTimeout(() => {
          setLoading(false);
          onComplete(mockDocId, submissionPayload);
        }, 1500);
      } else {
        // Anonim Giriş ve Firestore Kaydını zaman aşımı ile çalıştır
        const runFirebaseWrite = async () => {
          let uid = null;
          try {
            const userCredential = await signInAnonymously(auth);
            uid = userCredential.user.uid;
          } catch (authError) {
            console.error("Firebase Auth Error:", authError);
            if (authError.code === 'auth/admin-restricted-operation' || authError.code === 'auth/operation-not-allowed') {
              Alert.alert(
                'Sistem Yapılandırma Hatası',
                'Firebase Yapılandırma Hatası:\nAnonim Giriş (Anonymous Authentication) yöntemi aktif edilmemiş.\n\nÇözüm: Firebase Konsolunuza girip \'Authentication\' > \'Sign-in method\' sekmesinden \'Anonymous\' sağlayıcısını etkinleştiriniz.'
              );
              setLoading(false);
              return 'auth_error_handled';
            } else {
              throw authError;
            }
          }

          // Firestore Kayıt: submissions koleksiyonuna ekle
          const docRef = await addDoc(collection(db, 'submissions'), {
            ...submissionPayload,
            uid,
            createdAt: serverTimestamp()
          });

          console.log("✅ Firestore Veri Kaydı Başarılı! Doküman ID:", docRef.id);
          return docRef.id;
        };

        try {
          // En fazla 12 saniye bekle, yoksa zaman aşımına uğra ve yerel belleğe kaydet
          const result = await Promise.race([
            runFirebaseWrite(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 12000))
          ]);

          if (result === 'auth_error_handled') {
            return;
          }

          // Save to local storage for instant offline access/caching on this device
          const newSubmission = { id: result, ...submissionPayload };
          try {
            const existingLocalStr = await AsyncStorage.getItem('@local_submissions');
            const existingLocal = existingLocalStr ? JSON.parse(existingLocalStr) : [];
            existingLocal.unshift(newSubmission);
            await AsyncStorage.setItem('@local_submissions', JSON.stringify(existingLocal));
          } catch (storageErr) {
            console.error("Local storage save error (onSuccess):", storageErr);
          }

          setLoading(false);
          onComplete(result, submissionPayload);
        } catch (writeError) {
          if (writeError.message === 'timeout') {
            console.warn("⚠️ Firebase kaydı zaman aşımına uğradı. Yerel belleğe kaydediliyor...");
            const mockDocId = "mock_doc_id_" + Math.random().toString(36).substring(7);
            const newSubmission = { id: mockDocId, ...submissionPayload, offline: true };
            
            try {
              const existingLocalStr = await AsyncStorage.getItem('@local_submissions');
              const existingLocal = existingLocalStr ? JSON.parse(existingLocalStr) : [];
              existingLocal.unshift(newSubmission);
              await AsyncStorage.setItem('@local_submissions', JSON.stringify(existingLocal));
            } catch (storageErr) {
              console.error("Local storage save error (onTimeout):", storageErr);
            }

            setLoading(false);
            onComplete(mockDocId, submissionPayload);
          } else {
            throw writeError;
          }
        }
      }
    } catch (error) {
      console.error("❌ Firebase Kayıt Hatası:", error);
      
      let errorMsg = error.message || '';
      let errorCode = error.code || '';
      
      if (errorCode === 'permission-denied' || errorMsg.includes('permission-denied') || errorMsg.includes('insufficient permissions')) {
        Alert.alert(
          'Firebase Yetki Hatası',
          'Firestore veritabanına yazma yetkiniz yok.\n\nÇözüm: Firebase Konsolunuzda Cloud Firestore > Rules (Kurallar) sekmesinden okuma/yazma izinlerini herkese açık (veya test moduna) düzenleyiniz.'
        );
      } else if (errorCode === 'not-found' || errorMsg.includes('NOT_FOUND') || errorMsg.includes('database does not exist')) {
        Alert.alert(
          'Veritabanı Bulunamadı',
          'Firebase projenizde Cloud Firestore veritabanı oluşturulmamış.\n\nÇözüm: Firebase Konsolunuzdan Cloud Firestore sekmesine girip \'Veritabanı Oluştur\' butonuna basınız.'
        );
      } else {
        Alert.alert(
          'Kayıt Hatası',
          'Firebase\'e kaydedilirken bir hata oluştu, ancak başvurunuz yerel belleğe kaydedildi. Hata: ' + errorMsg
        );
      }

      console.warn("⚠️ Firebase hatası nedeniyle yerel belleğe kaydediliyor...");
      const mockDocId = "mock_doc_id_err_" + Math.random().toString(36).substring(7);
      const newSubmission = { id: mockDocId, ...submissionPayload, offline: true };

      try {
        const existingLocalStr = await AsyncStorage.getItem('@local_submissions');
        const existingLocal = existingLocalStr ? JSON.parse(existingLocalStr) : [];
        existingLocal.unshift(newSubmission);
        await AsyncStorage.setItem('@local_submissions', JSON.stringify(existingLocal));
      } catch (storageErr) {
        console.error("Local storage save error (onError):", storageErr);
      }

      setLoading(false);
      onComplete(mockDocId, submissionPayload);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={globalStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={{ flex: 1 }}>
        <View style={styles.glow} />

        {/* FIXED HEADER at the top */}
        <View style={{ paddingTop: Math.max(12, insets.top + 8), paddingHorizontal: 20 }}>
          {/* Geri & Çıkış Satırı */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <TouchableOpacity style={[styles.backBtn, { marginBottom: 0 }]} onPress={onBack} disabled={loading}>
              <ArrowLeft size={20} color={COLORS.textLight} style={{ flexShrink: 0 }} />
              <Text style={styles.backBtnText}>Geri</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.exitBtn} onPress={onExit} disabled={loading}>
              <X size={20} color={COLORS.textLight} />
            </TouchableOpacity>
          </View>

          {/* Stepper (9/10 or 8/10) */}
          <View style={[globalStyles.stepperContainer, { marginBottom: 10 }]}>
            {Array.from({ length: data.unionType === 'block_based' ? 8 : 7 }).map((_, i) => (
              <View key={i} style={[globalStyles.stepIndicator, globalStyles.stepIndicatorCompleted]} />
            ))}
            <View style={[globalStyles.stepIndicator, globalStyles.stepIndicatorActive]} />
            {Array.from({ length: data.unionType === 'block_based' ? 1 : 2 }).map((_, i) => (
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
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View style={{ flex: 1 }}>
              <View style={{ flex: 1, justifyContent: 'center', marginVertical: 10 }}>
                <View style={globalStyles.glassCard}>
                <View style={styles.headerBox}>
                  <View style={styles.iconWrapper}>
                    <User size={24} color={COLORS.primary} style={{ flexShrink: 0 }} />
                  </View>
                  <Text style={styles.stepTitle}>AŞAMA 4: İletişim</Text>
                </View>

                <Text style={globalStyles.title}>İletişim Bilgileri</Text>
                <Text style={globalStyles.subtitle}>
                  Teklif hazırlığı tamamlandığında size ulaşabilmemiz için bilgilerinizi giriniz.
                </Text>

                {/* Ad ve Soyad */}
                <Text style={globalStyles.label}>Ad</Text>
                <TextInput
                  style={globalStyles.input}
                  placeholder="Adınız"
                  placeholderTextColor="#94A3B8"
                  value={name}
                  onChangeText={setName}
                  editable={!loading}
                />

                <Text style={globalStyles.label}>Soyad</Text>
                <TextInput
                  style={globalStyles.input}
                  placeholder="Soyadınız"
                  placeholderTextColor="#94A3B8"
                  value={surname}
                  onChangeText={setSurname}
                  editable={!loading}
                />

                {/* Telefon Numarası */}
                <Text style={globalStyles.label}>Telefon Numarası</Text>
                <TextInput
                  style={globalStyles.input}
                  keyboardType="phone-pad"
                  placeholder="(555) 555 55 55"
                  placeholderTextColor="#94A3B8"
                  value={phone}
                  onChangeText={handlePhoneChange}
                  maxLength={15}
                  editable={!loading}
                />

                {/* Talebi Tamamla Butonu */}
                <TouchableOpacity 
                  style={[styles.completeBtn, loading && styles.completeBtnDisabled]} 
                  onPress={handleComplete} 
                  activeOpacity={0.8}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Text style={styles.completeBtnText}>Sonuçlar hazırlanıyor...</Text>
                      <ActivityIndicator color={COLORS.secondary} size="small" style={{ marginLeft: 8 }} />
                    </>
                  ) : (
                    <>
                      <Text style={styles.completeBtnText}>Talebi Tamamla</Text>
                      <CheckCircle size={20} color={COLORS.secondary} style={{ flexShrink: 0 }} />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
            </View>
          </TouchableWithoutFeedback>
        </ScrollView>
      </View>
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
  exitBtn: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
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
  completeBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  completeBtnDisabled: {
    opacity: 0.6,
  },
  completeBtnText: {
    color: COLORS.secondary,
    fontFamily: FONTS.bold,
    fontSize: 16,
    marginRight: 8,
  },
  glow: {
    position: 'absolute',
    top: 50,
    left: -50,
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: width * 0.35,
    backgroundColor: COLORS.success,
    opacity: 0.04,
    blurRadius: 100,
  },
});
