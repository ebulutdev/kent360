import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions, 
  Share, 
  ScrollView, 
  Modal, 
  ActivityIndicator, 
  Image, 
  Linking,
  Alert,
  useColorScheme,
  Appearance
} from 'react-native';
import { 
  Check, 
  Share2, 
  MessageCircle, 
  RefreshCw, 
  Heart, 
  Globe, 
  Phone, 
  MapPin, 
  User, 
  Layers, 
  X, 
  ExternalLink,
  ShieldCheck,
  Calendar,
  Mail
} from 'lucide-react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, globalStyles } from '../styles/theme';
import { db, isMock } from '../../firebaseConfig';
import { collection, query, where, getDocs, doc, updateDoc, limit, arrayUnion, arrayRemove } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import StoryViewer from '../components/StoryViewer';

const { width, height } = Dimensions.get('window');

const PORTAL_COLORS = {
  get bg() { return Appearance.getColorScheme() === 'dark' ? '#070A10' : '#F8FAFC'; },
  get card() { return Appearance.getColorScheme() === 'dark' ? '#131924' : '#FFFFFF'; },
  get border() { return Appearance.getColorScheme() === 'dark' ? '#1E293B' : '#E2E8F0'; },
  get accent() { return Appearance.getColorScheme() === 'dark' ? '#FDC010' : '#1E293B'; },
  get accentLight() { return Appearance.getColorScheme() === 'dark' ? '#94A3B8' : '#64748B'; },
  get accentBg() { return Appearance.getColorScheme() === 'dark' ? 'rgba(253, 192, 16, 0.15)' : '#F1F5F9'; },
  get textTitle() { return Appearance.getColorScheme() === 'dark' ? '#F8FAFC' : '#0F172A'; },
  get textBody() { return Appearance.getColorScheme() === 'dark' ? '#E2E8F0' : '#334155'; },
  get textMuted() { return Appearance.getColorScheme() === 'dark' ? '#94A3B8' : '#94A3B8'; },
  get verified() { return '#10B981'; },
  get verifiedBg() { return 'rgba(16, 185, 129, 0.12)'; },
};

export default function ShareScreen({ docId, submissionData, onReset }) {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const shareLink = `https://malikhub.web.app/join?id=${docId}`;
  
  const shareMessage = `Merhaba! Kent360 üzerinden kentsel dönüşüm ve teklif alma sürecimizi başlattım. Diğer malikler olarak siz de bu link üzerinden parsel detaylarımızı inceleyip sürece dahil olabilir ve onay verebilirsiniz: ${shareLink}`;

  // Offers and Modals state
  const [offers, setOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  
  const [selectedContractor, setSelectedContractor] = useState(null);
  const [storyModalVisible, setStoryModalVisible] = useState(false);
  const [contractorProjects, setContractorProjects] = useState([]);
  const [loadingContractorData, setLoadingContractorData] = useState(false);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  
  const [selectedProject, setSelectedProject] = useState(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [contractorOffersCount, setContractorOffersCount] = useState(0);

  // Fetch offers for the current submission
  const fetchOffers = async () => {
    if (!docId) return;
    setLoadingOffers(true);
    try {
      if (isMock || !db) {
        const offersStr = await AsyncStorage.getItem('@global_mock_offers');
        const allOffers = offersStr ? JSON.parse(offersStr) : [];
        const filtered = allOffers.filter(o => o.submissionId === docId);
        // Sort by newest first
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setOffers(filtered);
      } else {
        const fetchOnlineOffers = async () => {
          const q = query(collection(db, 'offers'), where('submissionId', '==', docId));
          const querySnapshot = await getDocs(q);
          const fetched = [];
          querySnapshot.forEach(doc => {
            fetched.push({ id: doc.id, ...doc.data() });
          });
          return fetched;
        };

        try {
          const fetched = await Promise.race([
            fetchOnlineOffers(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
          ]);
          fetched.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          setOffers(fetched);
        } catch (onlineErr) {
          console.warn("Online offers fetch timed out or failed, falling back to local offers:", onlineErr);
          const offersStr = await AsyncStorage.getItem('@global_mock_offers');
          const allOffers = offersStr ? JSON.parse(offersStr) : [];
          const filtered = allOffers.filter(o => o.submissionId === docId);
          filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          setOffers(filtered);
        }
      }
    } catch (error) {
      console.error("Error fetching offers:", error);
    } finally {
      setLoadingOffers(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, [docId]);

  // Load contractor profile details and portfolio
  const handleOpenProfile = async (contractorId, fallbackCompanyName, fallbackVerified) => {
    setLoadingContractorData(true);
    setPreviewModalVisible(true);
    setSelectedContractor({
      companyName: fallbackCompanyName,
      verified: fallbackVerified,
      uid: contractorId
    });
    setContractorProjects([]);
    setContractorOffersCount(0);

    try {
      let profile = null;
      let projects = [];

      if (isMock || contractorId === 'mock_uid_123' || !db) {
        profile = {
          uid: contractorId,
          companyName: 'Kent360 İnşaat A.Ş.',
          email: 'muteahhit@kent360.com',
          phone: '0555 123 45 67',
          address: 'Fetsan Plaza Kat:4, Kadıköy / İstanbul',
          website: 'www.fetsangrup.com',
          verified: true,
          coverPhoto: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80',
          stories: [
            { uri: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&q=80', title: 'Şantiyemiz' },
            { uri: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&q=80', title: 'Ofis' },
            { uri: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&q=80', title: 'Referanslar' }
          ]
        };

        const localProjectsStr = await AsyncStorage.getItem('@contractor_projects');
        let localProjects = localProjectsStr ? JSON.parse(localProjectsStr) : [];
        if (localProjects.length === 0) {
          localProjects = [
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
              likes: 42
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
              likes: 88
            }
          ];
        }
        projects = localProjects;

        const offersStr = await AsyncStorage.getItem('@global_mock_offers');
        const allOffers = offersStr ? JSON.parse(offersStr) : [];
        const count = allOffers.filter(o => o.contractorId === contractorId).length;
        setContractorOffersCount(count || 3);
      } else {
        const fetchOnlineData = async () => {
          let prof = null;
          let projs = [];
          let oCount = 0;
          
          const qProfile = query(collection(db, 'contractors'), where('uid', '==', contractorId), limit(1));
          const profileSnap = await getDocs(qProfile);
          if (!profileSnap.empty) {
            prof = { id: profileSnap.docs[0].id, ...profileSnap.docs[0].data() };
          }
          
          const qProj = query(collection(db, 'contractor_projects'), where('uid', '==', contractorId));
          const projSnap = await getDocs(qProj);
          projSnap.forEach(doc => {
            projs.push({ id: doc.id, ...doc.data() });
          });

          try {
            const qOffers = query(collection(db, 'offers'), where('contractorId', '==', contractorId));
            const offersSnap = await getDocs(qOffers);
            oCount = offersSnap.size;
          } catch (countErr) {
            console.warn("Error fetching online contractor offers count:", countErr);
          }
          
          return { prof, projs, oCount };
        };

        try {
          const onlineData = await Promise.race([
            fetchOnlineData(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
          ]);
          
          if (onlineData.prof) {
            profile = onlineData.prof;
          } else {
            const localProfStr = await AsyncStorage.getItem('@contractor_profile_' + contractorId);
            profile = localProfStr ? JSON.parse(localProfStr) : {
              uid: contractorId,
              companyName: fallbackCompanyName,
              verified: fallbackVerified,
              phone: '',
              address: '',
              website: '',
              email: ''
            };
          }
          
          projects = onlineData.projs;
          if (projects.length === 0) {
            const localProjsStr = await AsyncStorage.getItem('@contractor_projects_' + contractorId);
            if (localProjsStr) {
              projects = JSON.parse(localProjsStr);
            }
          }
          setContractorOffersCount(onlineData.oCount || 0);
        } catch (onlineErr) {
          console.warn("Online contractor data fetch failed/timed out, loading locally:", onlineErr);
          
          const localProfStr = await AsyncStorage.getItem('@contractor_profile_' + contractorId);
          profile = localProfStr ? JSON.parse(localProfStr) : {
            uid: contractorId,
            companyName: fallbackCompanyName,
            verified: fallbackVerified,
            phone: '',
            address: '',
            website: '',
            email: ''
          };
          
          const localProjsStr = await AsyncStorage.getItem('@contractor_projects_' + contractorId);
          projects = localProjsStr ? JSON.parse(localProjsStr) : [];

          const offersStr = await AsyncStorage.getItem('@global_mock_offers');
          const allOffers = offersStr ? JSON.parse(offersStr) : [];
          const count = allOffers.filter(o => o.contractorId === contractorId).length;
          setContractorOffersCount(count || 3);
        }
      }

      // Check user liked projects via Firebase likedBy array or local storage fallback
      const userPhoneStr = await AsyncStorage.getItem('@user_phone');
      const likedStr = await AsyncStorage.getItem('@liked_projects');
      const likedArray = likedStr ? JSON.parse(likedStr) : [];
      const enrichedProjects = projects.map(p => ({
        ...p,
        likedByMe: (p.likedBy && Array.isArray(p.likedBy) && userPhoneStr) 
                     ? p.likedBy.includes(userPhoneStr) 
                     : likedArray.includes(p.id)
      }));

      setSelectedContractor(profile);
      setContractorProjects(enrichedProjects);
    } catch (error) {
      console.error("Error loading contractor details:", error);
    } finally {
      setLoadingContractorData(false);
    }
  };

  // Toggle Project Like button
  const handleToggleLike = async (project) => {
    try {
      const isLiked = !project.likedByMe;
      const newLikes = isLiked ? (project.likes || 0) + 1 : Math.max(0, (project.likes || 0) - 1);
      
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

      const likedStr = await AsyncStorage.getItem('@liked_projects');
      let likedArray = likedStr ? JSON.parse(likedStr) : [];
      if (isLiked) {
        if (!likedArray.includes(project.id)) {
          likedArray.push(project.id);
        }
      } else {
        likedArray = likedArray.filter(id => id !== project.id);
      }
      await AsyncStorage.setItem('@liked_projects', JSON.stringify(likedArray));

      if (isMock || project.id.startsWith('demo_proj_') || project.id.startsWith('proj_local_')) {
        const localProjectsStr = await AsyncStorage.getItem('@contractor_projects');
        let localProjects = localProjectsStr ? JSON.parse(localProjectsStr) : [];
        const updatedLocal = localProjects.map(p => {
          if (p.id === project.id) {
            return { ...p, likes: newLikes };
          }
          return p;
        });
        await AsyncStorage.setItem('@contractor_projects', JSON.stringify(updatedLocal));
      } else {
        const docRef = doc(db, 'contractor_projects', project.id);
        const userPhoneStr = await AsyncStorage.getItem('@user_phone');
        const identifier = userPhoneStr || 'anonymous';
        
        if (isLiked) {
          await updateDoc(docRef, { 
            likes: newLikes,
            likedBy: arrayUnion(identifier)
          });
        } else {
          await updateDoc(docRef, { 
            likes: newLikes,
            likedBy: arrayRemove(identifier)
          });
        }
        
        const cacheKey = '@contractor_projects_' + project.uid;
        const cachedProjectsStr = await AsyncStorage.getItem(cacheKey);
        if (cachedProjectsStr) {
          const cachedProjects = JSON.parse(cachedProjectsStr);
          const updatedCached = cachedProjects.map(p => {
            if (p.id === project.id) {
              return { ...p, likes: newLikes };
            }
            return p;
          });
          await AsyncStorage.setItem(cacheKey, JSON.stringify(updatedCached));
        }
      }
    } catch (e) {
      console.error("Error toggling like:", e);
    }
  };

  const handleOpenWebsite = (url) => {
    if (!url) return;
    const formattedUrl = url.startsWith('http') ? url : `https://${url}`;
    Linking.openURL(formattedUrl).catch(err => {
      console.error("Websitesi açma hatası:", err);
      Alert.alert("Hata", "Web adresi açılamadı.");
    });
  };

  const handleCallPhone = (phone) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${cleanPhone}`).catch(err => {
      console.error("Telefon arama hatası:", err);
      Alert.alert("Hata", "Telefon araması başlatılamadı.");
    });
  };

  const handleToggleOfferApproval = async (offerId, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      
      // Update local offers state first for fast UI responsiveness
      setOffers(prevOffers => 
        prevOffers.map(o => o.id === offerId ? { ...o, approvedByMalik: newStatus } : o)
      );

      // If contractor preview is active, also update the selected contractor stats
      if (selectedContractor) {
        // Just trigger a re-render by updating selectedContractor reference if needed
        setSelectedContractor(prev => ({ ...prev }));
      }

      if (isMock || !db) {
        // Update mock offers in AsyncStorage
        const offersStr = await AsyncStorage.getItem('@global_mock_offers');
        if (offersStr) {
          const allOffers = JSON.parse(offersStr);
          const updatedOffers = allOffers.map(o => o.id === offerId ? { ...o, approvedByMalik: newStatus } : o);
          await AsyncStorage.setItem('@global_mock_offers', JSON.stringify(updatedOffers));
        }
        
        // Also update local contractor bids if any
        const contractorBidsStr = await AsyncStorage.getItem('@contractor_bids');
        if (contractorBidsStr) {
          const contractorBids = JSON.parse(contractorBidsStr);
          const updatedBids = contractorBids.map(b => b.id === offerId ? { ...b, approvedByMalik: newStatus } : b);
          await AsyncStorage.setItem('@contractor_bids', JSON.stringify(updatedBids));
        }

        const matchedOffer = offers.find(o => o.id === offerId);
        if (matchedOffer && matchedOffer.contractorId) {
          const key = '@contractor_bids_' + matchedOffer.contractorId;
          const contractorBidsSpecificStr = await AsyncStorage.getItem(key);
          if (contractorBidsSpecificStr) {
            const contractorBidsSpecific = JSON.parse(contractorBidsSpecificStr);
            const updatedBidsSpecific = contractorBidsSpecific.map(b => b.id === offerId ? { ...b, approvedByMalik: newStatus } : b);
            await AsyncStorage.setItem(key, JSON.stringify(updatedBidsSpecific));
          }
        }

        Alert.alert(
          newStatus ? 'İletişim İzni Verildi' : 'İletişim İzni Kaldırıldı',
          newStatus 
            ? 'Müteahhit artık telefon numaranızı görebilir.' 
            : 'Müteahhitin telefon numaranızı görme yetkisi kaldırıldı.'
        );
      } else {
        // Firestore mode
        const offerDocRef = doc(db, 'offers', offerId);
        await updateDoc(offerDocRef, {
          approvedByMalik: newStatus
        });

        // Also sync local fallback storage
        const offersStr = await AsyncStorage.getItem('@global_mock_offers');
        if (offersStr) {
          const allOffers = JSON.parse(offersStr);
          const updatedOffers = allOffers.map(o => o.id === offerId ? { ...o, approvedByMalik: newStatus } : o);
          await AsyncStorage.setItem('@global_mock_offers', JSON.stringify(updatedOffers));
        }

        const matchedOffer = offers.find(o => o.id === offerId);
        if (matchedOffer && matchedOffer.contractorId) {
          const key = '@contractor_bids_' + matchedOffer.contractorId;
          const contractorBidsSpecificStr = await AsyncStorage.getItem(key);
          if (contractorBidsSpecificStr) {
            const contractorBidsSpecific = JSON.parse(contractorBidsSpecificStr);
            const updatedBidsSpecific = contractorBidsSpecific.map(b => b.id === offerId ? { ...b, approvedByMalik: newStatus } : b);
            await AsyncStorage.setItem(key, JSON.stringify(updatedBidsSpecific));
          }
        }

        Alert.alert(
          newStatus ? 'İletişim İzni Verildi' : 'İletişim İzni Kaldırıldı',
          newStatus 
            ? 'Müteahhit artık telefon numaranızı görebilir.' 
            : 'Müteahhitin telefon numaranızı görme yetkisi kaldırıldı.'
        );
      }
    } catch (error) {
      console.error("Error toggling offer approval:", error);
      Alert.alert('Hata', 'İşlem gerçekleştirilemedi: ' + error.message);
      fetchOffers();
    }
  };


  const handleWhatsAppShare = async () => {
    try {
      await Share.share({
        message: shareMessage,
      });
    } catch (error) {
      console.warn("Paylaşım hatası:", error);
    }
  };

  const getBuildingTypeLabel = () => {
    if (!submissionData) return '';
    const type = submissionData.buildingType;
    const scope = submissionData.scopeType;
    if (type === 'single') {
      return scope === 'multi_building' ? 'Birleşmeli Çoklu Bina' : 'Tekil Bina';
    }
    return 'Site Ortaklığı';
  };

  // Stats calculate for profile preview
  const getTotalLikes = () => {
    return contractorProjects.reduce((sum, p) => sum + (p.likes || 0), 0);
  };

  return (
    <View style={globalStyles.container}>
      {/* Yeşil / Cyan başarı neonu */}
      <View style={styles.glowSuccess} />

      {/* FIXED HEADER at the top */}
      <View style={{ paddingTop: Math.max(12, insets.top + 8) }} />

      <ScrollView 
        contentContainerStyle={[
          globalStyles.scrollContainer,
          { paddingTop: 10, paddingBottom: 40 }
        ]} 
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flex: 1, justifyContent: 'center', marginVertical: 10 }}>
          <View style={globalStyles.glassCard}>
            <View style={styles.successIconBox}>
              <Check size={40} color={COLORS.white} />
            </View>

            <Text style={globalStyles.title}>Talebiniz Başarıyla Alındı!</Text>
            <Text style={globalStyles.subtitle}>
              Kentsel dönüşüm ön başvuru kaydınız başarıyla oluşturulmuştur.
            </Text>

            {submissionData && (
              <View style={styles.summaryBox}>
                <Text style={styles.summaryTitle}>Talep Özeti</Text>
                
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Yapı Türü:</Text>
                  <Text style={styles.summaryVal}>{getBuildingTypeLabel()}</Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Lokasyon:</Text>
                  <Text style={styles.summaryVal}>{submissionData.city} / {submissionData.district}</Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Bina/Blok Sayısı:</Text>
                  <Text style={styles.summaryVal}>{submissionData.buildingCount || 1} Adet</Text>
                </View>

              </View>
            )}

            {/* Gelen Teklifler Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Gelen Müteahhit Teklifleri</Text>
              <TouchableOpacity onPress={fetchOffers} disabled={loadingOffers} style={styles.refreshBtnInline}>
                {loadingOffers ? (
                  <ActivityIndicator size="small" color={PORTAL_COLORS.accent} />
                ) : (
                  <RefreshCw size={16} color={PORTAL_COLORS.accent} />
                )}
              </TouchableOpacity>
            </View>

            {offers.length === 0 ? (
              <View style={styles.emptyOffersBox}>
                <Text style={styles.emptyOffersText}>Henüz teklif iletilmedi.</Text>
                <Text style={styles.emptyOffersSubtext}>
                  Mütteahhitler başvurunuzu inceledikten sonra teklifleri burada görebilirsiniz.
                </Text>
              </View>
            ) : (
              offers.map((offer) => (
                <View key={offer.id} style={styles.offerCard}>
                  <View style={styles.offerHeader}>
                    <View style={styles.companyNameRow}>
                      <Text style={styles.offerCompany} numberOfLines={1}>{offer.companyName}</Text>
                      {offer.verified && (
                        <View style={styles.verifiedBadgeInline}>
                          <Check size={8} color={COLORS.white} />
                        </View>
                      )}
                    </View>
                    <Text style={styles.offerDate}>
                      {new Date(offer.createdAt).toLocaleDateString('tr-TR')}
                    </Text>
                  </View>

                  <View style={styles.offerStatsRow}>
                    <View style={styles.offerStatCol}>
                      <Text style={styles.offerStatLabel}>Müteahhit Payı</Text>
                      <Text style={styles.offerStatVal}>%{offer.contractorShare}</Text>
                    </View>
                    <View style={styles.offerStatCol}>
                      <Text style={styles.offerStatLabel}>Yapım Maliyeti</Text>
                      <Text style={styles.offerStatVal}>
                        {offer.costPerSqm?.toLocaleString('tr-TR')} ₺/m²
                      </Text>
                    </View>
                  </View>

                  {offer.notes ? (
                    <View style={styles.offerNotesBox}>
                      <Text style={styles.offerNotesLabel}>Müteahhit Notu:</Text>
                      <Text style={styles.offerNotesText}>{offer.notes}</Text>
                    </View>
                  ) : null}

                  <TouchableOpacity 
                    style={styles.inspectBtn}
                    onPress={() => handleOpenProfile(offer.contractorId, offer.companyName, offer.verified)}
                  >
                    <Text style={styles.inspectBtnText}>Mütteahhit Profilini İncele</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[
                      styles.approvalBtn,
                      offer.approvedByMalik ? styles.approvedBtn : styles.approveBtn
                    ]}
                    onPress={() => handleToggleOfferApproval(offer.id, offer.approvedByMalik)}
                  >
                    <Text style={[
                      styles.approvalBtnText,
                      offer.approvedByMalik ? styles.approvedBtnText : styles.approveBtnText
                    ]}>
                      {offer.approvedByMalik 
                        ? '✓ İletişim İzni Verildi' 
                        : 'Teklifi Onayla & İletişim İzni Ver'
                      }
                    </Text>
                  </TouchableOpacity>
                </View>
              ))
            )}

            <Text style={styles.shareInstruction}>
              Sürecin hızlanması ve imar anlaşmasının sağlanabilmesi için diğer maliklerin (komşularınızın) de onay vermesi gerekmektedir. Aşağıdaki linki komşularınızla paylaşın:
            </Text>

            {/* WhatsApp Paylaşım Butonu */}
            <TouchableOpacity 
              style={styles.whatsappBtn} 
              onPress={handleWhatsAppShare} 
              activeOpacity={0.8}
            >
              <MessageCircle size={22} color={COLORS.white} style={{ marginRight: 8 }} />
              <Text style={styles.whatsappBtnText}>WhatsApp ile Paylaş</Text>
            </TouchableOpacity>

            {/* Genel Paylaşım Butonu */}
            <TouchableOpacity 
              style={styles.shareBtn} 
              onPress={() => Share.share({ message: shareMessage })} 
              activeOpacity={0.8}
            >
              <Share2 size={20} color={COLORS.textLight} style={{ marginRight: 8 }} />
              <Text style={styles.shareBtnText}>Bağlantıyı Kopyala & Paylaş</Text>
            </TouchableOpacity>

            {/* Yeni Talep Butonu */}
            <TouchableOpacity 
              style={styles.resetBtn} 
              onPress={onReset} 
              activeOpacity={0.8}
            >
              <RefreshCw size={18} color={COLORS.textMuted} style={{ marginRight: 8 }} />
              <Text style={styles.resetBtnText}>Yeni Talep Oluştur</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* 1. CONTRACTOR PROFILE PREVIEW MODAL (Premium Obsidian Dark Theme) */}
      <Modal
        visible={previewModalVisible}
        animationType="slide"
        transparent={false}
        statusBarTranslucent={true}
        onRequestClose={() => setPreviewModalVisible(false)}
      >
        {selectedContractor && (
          <View style={styles.modalContainer}>
            {/* Absolute close button overlaying the cover banner */}
            <TouchableOpacity 
              style={[styles.modalCloseBtnAbsolute, { top: Math.max(12, insets.top + 8) }]} 
              onPress={() => setPreviewModalVisible(false)}
            >
              <X size={20} color="#000000" />
            </TouchableOpacity>

            {loadingContractorData ? (
              <View style={styles.loadingContainerDark}>
                <ActivityIndicator size="large" color={PORTAL_COLORS.accent} />
                <Text style={styles.loadingTextDark}>Profil yükleniyor...</Text>
              </View>
            ) : (
              <View style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={[globalStyles.scrollContainer, { paddingTop: 0, paddingBottom: 130 }]} showsVerticalScrollIndicator={false}>
                {/* Company header card */}
                <View style={[styles.profileHeaderCard, { padding: 0, overflow: 'hidden', borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTopWidth: 0, borderLeftWidth: 0, borderRightWidth: 0, marginTop: 0, marginHorizontal: -20 }]}>
                  {/* Cover Banner */}
                  {selectedContractor.coverPhoto ? (
                    <Image source={{ uri: selectedContractor.coverPhoto }} style={styles.coverBanner} />
                  ) : (
                    <LinearGradient
                      colors={['#1E293B', '#334155']}
                      style={styles.coverBanner}
                    />
                  )}

                  <View style={{ paddingHorizontal: 20, paddingBottom: 10, paddingTop: 10 }}>
                    <View style={styles.profileAvatarRow}>
                      <View style={[styles.avatarContainer, { width: 80, height: 80, borderRadius: 40, borderWidth: 0, marginTop: -40, overflow: 'hidden' }]}>
                        {selectedContractor.profilePhoto ? (
                          <Image source={{ uri: selectedContractor.profilePhoto }} style={{ width: '100%', height: '100%' }} />
                        ) : (
                          <View style={{ width: '100%', height: '100%', backgroundColor: PORTAL_COLORS.accentBg, justifyContent: 'center', alignItems: 'center' }}>
                            <Text style={styles.avatarText}>
                              {(selectedContractor.companyName || 'ME').substring(0, 2).toUpperCase()}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.profileStatsRow}>
                        <View style={styles.profileStatItem}>
                          <Text style={styles.profileStatNumber}>{contractorOffersCount}</Text>
                          <Text style={styles.profileStatLabel}>Talepler</Text>
                        </View>
                        <View style={styles.profileStatItem}>
                          <Text style={styles.profileStatNumber}>{contractorProjects.length}</Text>
                          <Text style={styles.profileStatLabel}>Projeler</Text>
                        </View>
                        <View style={styles.profileStatItem}>
                          <Text style={styles.profileStatNumber}>{getTotalLikes()}</Text>
                          <Text style={styles.profileStatLabel}>Beğeniler</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.profileNameBio}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Text style={styles.profileCompanyName}>{selectedContractor.companyName}</Text>
                        {selectedContractor.verified && (
                          <View style={styles.verifiedBadge}>
                            <Check size={10} color="#FFFFFF" />
                          </View>
                        )}
                      </View>
                      <Text style={styles.profileEmail}>{selectedContractor.email || 'E-posta bulunmuyor'}</Text>

                      {selectedContractor.phone ? (
                        <TouchableOpacity
                          onPress={() => handleCallPhone(selectedContractor.phone)}
                          activeOpacity={0.7}
                          style={styles.profileInfoRow}
                        >
                          <Phone size={12} color="#94A3B8" style={{ marginRight: 6 }} />
                          <Text style={styles.profileInfoText}>{selectedContractor.phone}</Text>
                        </TouchableOpacity>
                      ) : null}
                      {selectedContractor.address ? (
                        <View style={styles.profileInfoRow}>
                          <MapPin size={12} color="#94A3B8" style={{ marginRight: 6 }} />
                          <Text style={styles.profileInfoText}>{selectedContractor.address}</Text>
                        </View>
                      ) : null}
                      {selectedContractor.website ? (
                        <TouchableOpacity
                          onPress={() => handleOpenWebsite(selectedContractor.website)}
                          activeOpacity={0.7}
                          style={styles.profileInfoRow}
                        >
                          <Globe size={12} color="#94A3B8" style={{ marginRight: 6 }} />
                          <Text style={styles.profileInfoText}>{selectedContractor.website}</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>

                  {/* Highlights (Öne Çıkanlar) Section */}
                  {selectedContractor.stories && selectedContractor.stories.length > 0 && (
                    <View style={[styles.profileHighlightsSection, { paddingHorizontal: 20 }]}>
                      <Text style={styles.profileHighlightsTitle}>Öne Çıkan Hikayeler</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.profileHighlightsList}>
                        {selectedContractor.stories.map((story, index) => {
                          const uri = typeof story === 'string' ? story : (story?.uri || '');
                          const title = typeof story === 'string' ? `Hikaye ${index + 1}` : (story?.title || `Hikaye ${index + 1}`);
                          return (
                            <TouchableOpacity 
                              key={index}
                              onPress={() => setStoryModalVisible(true)}
                              activeOpacity={0.8}
                              style={styles.profileHighlightItem}
                            >
                              <View style={styles.profileHighlightRing}>
                                <View style={styles.profileHighlightThumbContainer}>
                                  <Image source={{ uri: uri }} style={styles.profileHighlightThumb} />
                                </View>
                              </View>
                              <Text style={styles.profileHighlightText}>{title}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}
                </View>

                {/* Portfolio Section */}
                <View style={styles.portfolioGridHeader}>
                  <Text style={styles.portfolioTitle}>Tamamlanan Portfolyo Projeleri</Text>
                </View>

                {contractorProjects.length === 0 ? (
                  <View style={styles.emptyPortfolioCard}>
                    <Text style={styles.emptyPortfolioText}>Henüz Proje Eklenmemiş</Text>
                    <Text style={styles.emptyPortfolioSub}>Müteahhit henüz tamamlanmış portfolyo projesi eklememiştir.</Text>
                  </View>
                ) : (
                  (() => {
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
                                  setActiveImageIdx(0);
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
                  })()
                )}
              </ScrollView>

              {/* Sticky İletişim İzni Yönetim Butonu */}
              {(() => {
                const matchingOffer = offers.find(o => o.contractorId === selectedContractor.uid);
                if (!matchingOffer) return null;
                return (
                  <View style={[styles.modalStickyFooter, { paddingBottom: Math.max(16, insets.bottom + 8) }]}>
                    <TouchableOpacity 
                      style={[
                        styles.modalApprovalBtn,
                        matchingOffer.approvedByMalik ? styles.modalApprovedBtn : styles.modalApproveBtn
                      ]}
                      onPress={() => {
                        handleToggleOfferApproval(matchingOffer.id, matchingOffer.approvedByMalik);
                      }}
                    >
                      <Text style={[
                        styles.modalApprovalBtnText,
                        matchingOffer.approvedByMalik ? styles.modalApprovedBtnText : styles.modalApproveBtnText
                      ]}>
                        {matchingOffer.approvedByMalik 
                          ? '✓ İletişim İzni Verildi (İptal Et)' 
                          : 'Teklifi Onayla & İletişim İzni Ver'
                        }
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })()}
            </View>
          )}
        </View>
      )}
    </Modal>

      {/* 2. PROJECT DETAIL VIEW MODAL (Swipeable Image Carousel & Likes) */}
      <Modal
        visible={selectedProject !== null}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSelectedProject(null)}
      >
        {selectedProject && (
          <View style={styles.modalOverlayDark}>
            <View style={styles.projectDetailCard}>
              {/* Carousel Container */}
              <View style={styles.carouselContainer}>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={(e) => {
                    const offset = e.nativeEvent.contentOffset.x;
                    const idx = Math.round(offset / (width - 40));
                    setActiveImageIdx(idx);
                  }}
                >
                  {selectedProject.images && selectedProject.images.length > 0 ? (
                    selectedProject.images.map((img, index) => (
                      <Image 
                        key={index} 
                        source={{ uri: img }} 
                        style={styles.carouselImage} 
                        resizeMode="cover"
                      />
                    ))
                  ) : (
                    <View style={[styles.carouselImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#131924' }]}>
                      <User size={48} color={PORTAL_COLORS.accent} />
                    </View>
                  )}
                </ScrollView>

                {/* Dot indicator */}
                {selectedProject.images && selectedProject.images.length > 1 && (
                  <View style={styles.dotContainer}>
                    {selectedProject.images.map((_, index) => (
                      <View 
                        key={index} 
                        style={[
                          styles.dot, 
                          activeImageIdx === index ? styles.activeDot : null
                        ]} 
                      />
                    ))}
                  </View>
                )}

                {/* Close Button overlay */}
                <TouchableOpacity 
                  style={styles.carouselCloseBtn} 
                  onPress={() => setSelectedProject(null)}
                >
                  <X size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* Detail Content */}
              <ScrollView style={styles.projectContentScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.projectTitleRow}>
                  <Text style={styles.projectTitleText}>{selectedProject.title}</Text>
                  
                  {/* Like Button */}
                  <TouchableOpacity 
                    style={[styles.likeBtn, selectedProject.likedByMe ? styles.likeBtnActive : null]}
                    onPress={() => handleToggleLike(selectedProject)}
                    activeOpacity={0.8}
                  >
                    <Heart 
                      size={18} 
                      color={selectedProject.likedByMe ? '#FFF' : PORTAL_COLORS.accent} 
                      fill={selectedProject.likedByMe ? '#FFF' : 'transparent'} 
                    />
                    <Text style={[styles.likeBtnText, selectedProject.likedByMe ? styles.likeBtnTextActive : null]}>
                      {selectedProject.likes || 0} Beğeni
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Year & Location Row */}
                <View style={styles.projectMetaRow}>
                  <View style={styles.projectMetaItem}>
                    <Calendar size={14} color={PORTAL_COLORS.accent} style={{ marginRight: 4 }} />
                    <Text style={styles.projectMetaValue}>{selectedProject.year || '2024'}</Text>
                  </View>
                  <View style={styles.projectMetaItem}>
                    <MapPin size={14} color={PORTAL_COLORS.accent} style={{ marginRight: 4 }} />
                    <Text style={styles.projectMetaValue}>{selectedProject.location}</Text>
                  </View>
                </View>

                <Text style={styles.projectLabelDark}>Proje Açıklaması</Text>
                <Text style={styles.projectDescriptionText}>
                  {selectedProject.description}
                </Text>
                <View style={{ height: 20 }} />
              </ScrollView>
            </View>
          </View>
        )}
      </Modal>

      {/* Story Viewer */}
      {selectedContractor && selectedContractor.stories && selectedContractor.stories.length > 0 && (
        <StoryViewer 
          visible={storyModalVisible} 
          stories={selectedContractor.stories} 
          onClose={() => setStoryModalVisible(false)} 
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  successIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 24,
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  summaryBox: {
    backgroundColor: COLORS.bgDark,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
  },
  summaryTitle: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingBottom: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.textMuted,
  },
  summaryVal: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.textLight,
  },
  shareInstruction: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  whatsappBtn: {
    backgroundColor: '#25D366',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  whatsappBtnText: {
    color: COLORS.white,
    fontFamily: FONTS.bold,
    fontSize: 16,
  },
  shareBtn: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  shareBtnText: {
    color: COLORS.textLight,
    fontFamily: FONTS.bold,
    fontSize: 15,
  },
  resetBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  resetBtnText: {
    color: COLORS.textMuted,
    fontFamily: FONTS.medium,
    fontSize: 14,
  },
  glowSuccess: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: COLORS.success,
    opacity: 0.04,
    blurRadius: 100,
  },
  // Bids section styling (Light Theme alignment)
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: PORTAL_COLORS.textTitle,
  },
  refreshBtnInline: {
    padding: 6,
    backgroundColor: PORTAL_COLORS.accentBg,
    borderRadius: 8,
  },
  emptyOffersBox: {
    backgroundColor: COLORS.bgDark,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyOffersText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  emptyOffersSubtext: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  offerCard: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingBottom: 10,
    marginBottom: 10,
  },
  companyNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  offerCompany: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.textLight,
    marginRight: 6,
    flexShrink: 1,
  },
  verifiedBadgeInline: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  offerDate: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textMuted,
  },
  offerStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  offerStatCol: {
    flex: 1,
  },
  offerStatLabel: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  offerStatVal: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.textLight,
  },
  offerNotesBox: {
    backgroundColor: COLORS.bgDark,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  offerNotesLabel: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: COLORS.textLight,
    marginBottom: 2,
  },
  offerNotesText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 16,
  },
  inspectBtn: {
    backgroundColor: COLORS.secondary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inspectBtnText: {
    color: COLORS.white,
    fontFamily: FONTS.bold,
    fontSize: 13,
  },

  // 1. MODAL CONTAINER - DARK THEME
  modalContainer: {
    flex: 1,
    backgroundColor: PORTAL_COLORS.bg,
  },
  modalHeaderDark: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: PORTAL_COLORS.border,
  },
  modalHeaderTitleDark: {
    color: PORTAL_COLORS.accent,
    fontFamily: FONTS.bold,
    fontSize: 15,
    letterSpacing: 2,
  },
  closeBtnDark: {
    padding: 6,
    backgroundColor: PORTAL_COLORS.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: PORTAL_COLORS.border,
  },
  loadingContainerDark: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingTextDark: {
    color: PORTAL_COLORS.accent,
    fontFamily: FONTS.medium,
    fontSize: 14,
    marginTop: 12,
  },
  profileCardDark: {
    backgroundColor: PORTAL_COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PORTAL_COLORS.border,
    padding: 20,
    margin: 16,
  },
  profileHeaderDark: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarDark: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(197, 168, 128, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: PORTAL_COLORS.border,
  },
  profileNameContainer: {
    flex: 1,
  },
  companyNameRowDark: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  companyNameDark: {
    color: PORTAL_COLORS.textTitle,
    fontFamily: FONTS.bold,
    fontSize: 18,
  },
  verifiedBadgeDark: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
  },
  verifiedTextDark: {
    color: PORTAL_COLORS.verified,
    fontFamily: FONTS.medium,
    fontSize: 11,
  },
  unverifiedBadgeDark: {
    backgroundColor: 'rgba(148, 163, 184, 0.08)',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
  },
  unverifiedTextDark: {
    color: PORTAL_COLORS.textBody,
    fontFamily: FONTS.medium,
    fontSize: 11,
  },
  profileInfoList: {
    borderTopWidth: 1,
    borderColor: PORTAL_COLORS.border,
    paddingTop: 16,
    marginBottom: 16,
  },
  profileInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoIcon: {
    marginRight: 10,
  },
  profileInfoValue: {
    color: PORTAL_COLORS.textBody,
    fontFamily: FONTS.regular,
    fontSize: 13,
    flex: 1,
  },
  linkTextDark: {
    color: PORTAL_COLORS.accent,
    textDecorationLine: 'underline',
  },
  statsContainerDark: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderColor: PORTAL_COLORS.border,
    paddingTop: 16,
  },
  statCardDark: {
    flex: 1,
    alignItems: 'center',
  },
  statValueDark: {
    color: PORTAL_COLORS.accent,
    fontFamily: FONTS.bold,
    fontSize: 18,
    marginBottom: 2,
  },
  statLabelDark: {
    color: PORTAL_COLORS.textMuted,
    fontFamily: FONTS.medium,
    fontSize: 11,
  },
  portfolioHeaderDark: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 12,
  },
  portfolioTitleDark: {
    color: PORTAL_COLORS.accent,
    fontFamily: FONTS.bold,
    fontSize: 14,
  },
  emptyPortfolioDark: {
    backgroundColor: PORTAL_COLORS.card,
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: PORTAL_COLORS.border,
  },
  emptyPortfolioTextDark: {
    color: PORTAL_COLORS.textMuted,
    fontFamily: FONTS.regular,
    fontSize: 13,
    textAlign: 'center',
  },
  // Instagram Grid Pattern
  gridContainer: {
    flexDirection: 'column',
    gap: 3,
  },
  gridItem: {
    width: (width - 48) / 3,
    height: (width - 48) / 3,
    margin: 4,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: PORTAL_COLORS.card,
    borderWidth: 1,
    borderColor: PORTAL_COLORS.border,
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 3,
  },
  gridLikesText: {
    color: '#FFF',
    fontFamily: FONTS.bold,
    fontSize: 10,
  },

  // 2. PROJECT DETAIL MODAL - OVERLAY AND CARD
  modalOverlayDark: {
    flex: 1,
    backgroundColor: 'rgba(7, 10, 19, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  projectDetailCard: {
    width: '100%',
    maxHeight: height * 0.85,
    backgroundColor: PORTAL_COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: PORTAL_COLORS.border,
    overflow: 'hidden',
  },
  carouselContainer: {
    width: '100%',
    height: width * 0.65,
    position: 'relative',
    backgroundColor: '#000',
  },
  carouselImage: {
    width: width - 40, // Account for card width alignment
    height: width * 0.65,
  },
  carouselCloseBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(7, 10, 19, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  dotContainer: {
    position: 'absolute',
    bottom: 16,
    flexDirection: 'row',
    alignSelf: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 3,
  },
  activeDot: {
    backgroundColor: PORTAL_COLORS.accent,
    width: 14,
  },
  projectContentScroll: {
    padding: 20,
  },
  projectTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  projectTitleText: {
    color: PORTAL_COLORS.textTitle,
    fontFamily: FONTS.bold,
    fontSize: 18,
    flex: 1,
    marginRight: 10,
  },
  likeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(197, 168, 128, 0.1)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(197, 168, 128, 0.2)',
  },
  likeBtnActive: {
    backgroundColor: PORTAL_COLORS.accent,
    borderColor: PORTAL_COLORS.accent,
  },
  likeBtnText: {
    color: PORTAL_COLORS.accent,
    fontFamily: FONTS.bold,
    fontSize: 12,
    marginLeft: 6,
  },
  likeBtnTextActive: {
    color: '#FFFFFF',
  },
  projectMetaRow: {
    flexDirection: 'row',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderColor: PORTAL_COLORS.border,
    paddingBottom: 12,
  },
  projectMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  projectMetaValue: {
    color: PORTAL_COLORS.textMuted,
    fontFamily: FONTS.medium,
    fontSize: 12,
  },
  projectLabelDark: {
    color: PORTAL_COLORS.accent,
    fontFamily: FONTS.bold,
    fontSize: 12,
    letterSpacing: 1,
    marginBottom: 6,
  },
  projectDescriptionText: {
    color: PORTAL_COLORS.textBody,
    fontFamily: FONTS.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  approvalBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    borderWidth: 1.5,
  },
  approveBtn: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  approvedBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  approvalBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
  },
  approveBtnText: {
    color: '#1E293B',
  },
  approvedBtnText: {
    color: '#10B981',
  },
  modalApprovalBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  modalApproveBtn: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  modalApprovedBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  modalApprovalBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
  },
  modalApproveBtnText: {
    color: '#1E293B',
  },
  modalApprovedBtnText: {
    color: '#10B981',
  },
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
    marginTop: 6,
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
    marginBottom: 4,
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
  profileInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  profileInfoText: {
    fontFamily: FONTS.medium,
    fontSize: 12.5,
    color: PORTAL_COLORS.textBody,
  },
  profileHighlightsSection: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: PORTAL_COLORS.border,
    marginTop: 4,
    marginBottom: 4,
  },
  profileHighlightsTitle: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: PORTAL_COLORS.textTitle,
    marginBottom: 12,
  },
  profileHighlightsList: {
    gap: 16,
  },
  profileHighlightItem: {
    alignItems: 'center',
  },
  profileHighlightRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: PORTAL_COLORS.border,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHighlightThumbContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: PORTAL_COLORS.bg,
  },
  profileHighlightThumb: {
    width: '100%',
    height: '100%',
  },
  profileHighlightText: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: PORTAL_COLORS.textMuted,
    marginTop: 6,
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
  coverBanner: {
    height: 200,
    width: '100%',
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
  modalCloseBtnAbsolute: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  modalStickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: PORTAL_COLORS.bg,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
});
