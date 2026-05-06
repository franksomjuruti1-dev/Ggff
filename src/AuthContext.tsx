import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth, db, OperationType, handleFirestoreError } from './firebase';
import { initGlobalSettings } from './utils/initDb';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut,
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot,
  serverTimestamp,
  query,
  collection,
  where,
  getDocs,
  limit,
  orderBy
} from 'firebase/firestore';

export { OperationType, handleFirestoreError };
export type { FirestoreErrorInfo } from './firebase';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'customer' | 'manager' | 'admin' | 'courier';
  status?: 'online' | 'offline';
  vehicleType?: string;
  vehiclePlate?: string;
  vehicleColor?: string;
  whatsapp?: string;
  address?: string;
  city?: string;
  cityId?: string;
  restaurantId?: string; // Manual link to a restaurant
  branchId?: string;
  referencePoint?: string;
  cpf?: string;
  latitude?: number;
  longitude?: number;
  subscriptionStatus?: 'active' | 'expired' | 'trial';
  subscriptionDueDate?: string;
  trialEndsAt?: string;
  theme?: {
    mode: 'light' | 'dark';
    primaryColor: string;
    secondaryColor?: string;
    isGradient: boolean;
    backgroundImage?: string;
  };
}

const ADMIN_EMAILS = [
  'xofometupa@gmail.com',
  'tupass@gmail.com',
  'entrega.rapida247@gmail.com',
  'foddcomida9@gmail.com',
  'solicitacaofoodd@gmail.com',
  'foodfinal70@gmail.com',
  'portovelhonfc@gmail.com',
  'leonkeeennedyy@gmail.com',
  'projetotupajo@gmail.com',
  'gestaoconversas@gmail.com',
  'ifoodtupa@gmail.com',
  'ifoodtupa4@gmail.com',
  'rota.delivery.app1@gmail.com',
  'rota.deliverwnw.app1@gmail.com',
  'testejuru2@gmail.com',
  'delivery.projeto.app@gmail.com',
  'julianamendes982025@gmail.com',
  'tupafoof@gmail.com',
  'ifoodclara0@gmail.com',
  'hgggt@gmail.com',
  'dhuy@gmail.com',
  'foddtopmendes@gmail.com',
  'tupamobilidade@gmail.com',
  'tupamobilidadeurbana@gmail.com',
  'testecledilson01@gmail.com',
  'franksomjuruti1@gmail.com',
  'franksomjuruti1uh@gmail.com',
  'franksonxofome@gmail.com',
  'ifoodclara@gmail.com',
  'peituda@gmail.com',
];

const ADMIN_UIDS = [
  'LDRVpG64gQWlZKsuL3hcQplxVXC2', // peituda@gmail.com
  'yq7zj06METZIB8GvGPUjf0JbEDj2',
  'tigg0qRc4XPzm80HjvGBL6aMqlI2',
  'cItlobEB0Mh7x2QJzBqe88fdq372',
  'zSeImWKr7aOEoHOGgvbYsx9865L2',
  'dSyWJidVLFZhJMtaK1J6mUujazL2',
  'nwDRVBJqCSWq9yIO2W2ortDgJR12',
  '57iagE601ARX5s2RqbyKMQtEoYl2',
  'franksonxofome',
  'backend-system',
  'backend-admin',
  'adZ8V1w2bnVm2atLYqsVdiCqNzD3'
];

interface GlobalSettings {
  appName?: string;
  splashText?: string;
  splashMediaUrl?: string;
  splashMediaType?: 'image' | 'video';
  splashAudioUrl?: string;
  activeEffect?: 'none' | 'snow' | 'rocket' | 'easter' | 'women_day';
  maintenanceMode?: boolean;
  maintenanceMessage?: string;
  maintenanceImageUrl?: string;
  globalTheme?: {
    primaryColor: string;
    secondaryColor?: string;
    isGradient: boolean;
    backgroundImage?: string;
  };
  clientIcons?: {
    size: number;
    spacing: number;
    colorIcon?: string;
    filterIcon?: string;
    ordersIcon?: string;
    cartIcon?: string;
    // Individual settings
    colorIconSize?: number;
    colorIconScale?: number;
    colorIconSpacing?: number;
    filterIconSize?: number;
    filterIconScale?: number;
    filterIconSpacing?: number;
    ordersIconSize?: number;
    ordersIconScale?: number;
    ordersIconSpacing?: number;
    cartIconSize?: number;
    cartIconScale?: number;
    cartIconSpacing?: number;
  };
  mercadoPagoPublicKey?: string;
  mercadoPagoAccessToken?: string;
  manualRechargeUrl?: string;
  monthlyFee?: number;
  autoMonthlyBilling?: boolean;
  defaultDueDay?: number;
  trialPeriodDays?: number;
  minWalletBalance?: number;
  minRechargeAmount?: number;
  orderDeductionAmount?: number;
  highlightDailyCost?: number;
  subscriptionDurationDays?: number;
  defaultOrderSoundUrl?: string;
  tupaDeliveryBaseValue?: number;
  tupaDeliveryKmValue?: number;
  tupaDeliveryMinDistance?: number;
  tupaDeliveryMaxDistance?: number;
  tupaDeliveryName?: string;
  tupaDeliveryEstimatedTime?: string;
  supportLink?: string;
  appSupportPhone?: string;
  companySupportPhone?: string;
  citySupportNumbers?: Record<string, string>;
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  globalSettings: GlobalSettings | null;
  loading: boolean;
  isGuest: boolean;
  isSigningIn: boolean;
  signUpWithEmail: (email: string, pass: string, name: string, cpf: string, photoURL: string, whatsapp: string, modality?: string, targetRole?: 'manager' | 'customer') => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  continueAsGuest: (role?: UserProfile['role']) => void;
  signOut: () => Promise<void>;
  updateStatus: (status: 'online' | 'offline') => Promise<void>;
  setRole: (role: UserProfile['role']) => Promise<void>;
  updateProfileData: (data: Partial<Pick<UserProfile, 'displayName' | 'photoURL' | 'whatsapp' | 'address' | 'cpf' | 'referencePoint'>>) => Promise<void>;
  updateTheme: (theme: UserProfile['theme']) => Promise<void>;
  updateGlobalSettings: (settings: Partial<GlobalSettings>) => Promise<void>;
  activateSubscription: (userId: string) => Promise<void>;
  getIdToken: () => Promise<string | null>;
  refreshWallet: () => Promise<any>;
  adminData: {
    restaurants: any[];
    users: any[];
    cities: any[];
    orders: any[];
    wallets: any[];
    banners: any[];
    categories: any[];
    payments: any[];
    branches: any[];
    isPreloaded: boolean;
  };
  managerData: {
    restaurant: any | null;
    popups: any[];
    banners: any[];
    foodItems: any[];
    orders: any[];
    reviews: any[];
    rides: any[];
    wallet: any | null;
    transactions: any[];
    splitPayHistory: any[];
    printers: any[];
    isPreloaded: boolean;
  };
  commonData: {
    restaurants: any[];
    banners: any[];
    categories: any[];
    cities: any[];
    foodItems: any[];
    isLoaded: boolean;
  };
  isAdmin: boolean;
  prefetchManagerData: (uid: string) => Promise<void>;
  prefetchAdminData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('user_profile_cache');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing cached user profile:', e);
      }
    }
    return null;
  });
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(() => {
    const saved = localStorage.getItem('global_settings_cache');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing cached global settings:', e);
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(!localStorage.getItem('user_profile_cache'));
  const [isGuest, setIsGuest] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isManualRegistering, setIsManualRegistering] = useState(false);
  const [adminData, setAdminData] = useState<AuthContextType['adminData']>(() => {
    const saved = localStorage.getItem('admin_data_cache');
    if (saved) {
      try {
        return { ...JSON.parse(saved), isPreloaded: true };
      } catch (e) {
        console.error('Error parsing cached admin data:', e);
      }
    }
    return {
      restaurants: [],
      users: [],
      cities: [],
      orders: [],
      wallets: [],
      banners: [],
      categories: [],
      payments: [],
      branches: [],
      isPreloaded: false
    };
  });

  const [commonData, setCommonData] = useState<AuthContextType['commonData']>(() => {
    const saved = localStorage.getItem('common_data_cache');
    if (saved) {
      try {
        return { ...JSON.parse(saved), isLoaded: true };
      } catch (e) {
        console.error('Error parsing cached common data:', e);
      }
    }
    return {
      restaurants: [],
      banners: [],
      categories: [],
      cities: [],
      foodItems: [],
      isLoaded: false
    };
  });

  const [managerData, setManagerData] = useState<AuthContextType['managerData']>(() => {
    const saved = localStorage.getItem('manager_data_cache');
    if (saved) {
      try {
        return { ...JSON.parse(saved), isPreloaded: true };
      } catch (e) {
        console.error('Error parsing cached manager data:', e);
      }
    }
    return {
      restaurant: null,
      popups: [],
      banners: [],
      foodItems: [],
      orders: [],
      reviews: [],
      rides: [],
      wallet: null,
      transactions: [],
      splitPayHistory: [],
      printers: [],
      isPreloaded: false
    };
  });

  const prefetchManagerData = useCallback(async (uid?: string, restaurantIdFromProfile?: string) => {
    const targetUid = uid || user?.uid;
    if (!targetUid || managerData.isPreloaded) return;
    
    console.log('Prefetching manager data for:', targetUid, 'ResID from profile:', restaurantIdFromProfile);
    
    try {
      // Get restaurant: prioritize direct link, fallback to ownership
      let restaurantDoc: any = null;
      let restaurantId = restaurantIdFromProfile;

      if (restaurantId) {
        const docRef = doc(db, 'restaurants', restaurantId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          restaurantDoc = docSnap;
        }
      }

      if (!restaurantDoc) {
        const restaurantsRef = collection(db, 'restaurants');
        const q = query(restaurantsRef, where('ownerUid', '==', targetUid), limit(1));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          restaurantDoc = querySnapshot.docs[0];
          restaurantId = restaurantDoc.id;
        }
      }
      
      if (restaurantDoc) {
        const restaurantData = { id: restaurantId, ...restaurantDoc.data() } as any;

        // Fetch other data in parallel
        const [itemsSnap, ordersSnap, walletSnap] = await Promise.all([
          getDocs(query(collection(db, 'food_items'), where('restaurantId', '==', restaurantId), limit(50))),
          getDocs(query(collection(db, 'orders'), where('restaurantId', '==', restaurantId), orderBy('createdAt', 'desc'), limit(50))),
          getDocs(query(collection(db, 'wallets'), where('ownerUid', '==', targetUid)))
        ]);

        setManagerData(prev => {
          // Prefer the wallet where the document ID matches the owner's UID
          let walletDoc = walletSnap.docs.find(d => d.id === targetUid);
          
          // If no UID-based wallet exists, pick the one with the highest balance
          if (!walletDoc && !walletSnap.empty) {
            walletDoc = [...walletSnap.docs].sort((a, b) => (b.data().balance || 0) - (a.data().balance || 0))[0];
          }

          const newData = {
            ...prev,
            restaurant: restaurantData,
            foodItems: itemsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)),
            orders: ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)),
            wallet: walletDoc ? { id: walletDoc.id, ...walletDoc.data() } as any : null,
            isPreloaded: true
          };
          localStorage.setItem('manager_data_cache', JSON.stringify(newData));
          return newData;
        });
      }
    } catch (error) {
      console.error('Error prefetching manager data:', error);
    }
  }, [managerData.isPreloaded, user?.uid]);

  const prefetchAdminData = useCallback(async () => {
    if (adminData.isPreloaded) return;
    
    console.log('Prefetching admin data');
    
    try {
      const [restaurantsSnap, usersSnap, paymentsSnap, branchesSnap] = await Promise.all([
        getDocs(query(collection(db, 'restaurants'), limit(50))),
        getDocs(query(collection(db, 'users'), limit(50))),
        getDocs(query(collection(db, 'payments'), orderBy('createdAt', 'desc'), limit(50))),
        getDocs(query(collection(db, 'branches'), limit(50)))
      ]);

      setAdminData(prev => {
        const newData = {
          ...prev,
          restaurants: restaurantsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)),
          users: usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)),
          payments: paymentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)),
          branches: branchesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)),
          isPreloaded: true
        };
        localStorage.setItem('admin_data_cache', JSON.stringify(newData));
        return newData;
      });
    } catch (error) {
      console.error('Error prefetching admin data:', error);
    }
  }, [adminData.isPreloaded]);

  // Load common data for all users efficiently
  useEffect(() => {
    console.log('Loading common data...');
    
    const fetchCommonData = async () => {
      try {
        const [restaurantsSnap, bannersSnap, categoriesSnap, citiesSnap, foodItemsSnap] = await Promise.all([
          getDocs(query(collection(db, 'restaurants'), limit(100))),
          getDocs(query(collection(db, 'promotional_banners'), limit(20))),
          getDocs(query(collection(db, 'categories'), limit(50))),
          getDocs(query(collection(db, 'cities'), limit(50))),
          getDocs(query(collection(db, 'food_items'), limit(5000)))
        ]);

        const restaurants = restaurantsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const banners = bannersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const categories = categoriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const cities = citiesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const foodItems = foodItemsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        setCommonData({
          restaurants,
          banners,
          categories,
          cities,
          foodItems,
          isLoaded: true
        });

        // Update admin data too
        setAdminData(prev => ({ 
          ...prev, 
          restaurants, 
          cities, 
          categories, 
          banners 
        }));

        localStorage.setItem('common_data_cache', JSON.stringify({
          restaurants, banners, categories, cities, isLoaded: true
        }));
      } catch (err) {
        console.error('Error fetching common data:', err);
        // Fallback to cache if error, or just mark as loaded
        setCommonData(prev => ({ ...prev, isLoaded: true }));
      }
    };

    fetchCommonData();
  }, []);

  const refreshWallet = useCallback(async () => {
    const currentUid = user?.uid || profile?.uid;
    if (!currentUid) return;

    try {
      console.log('[Wallet] Syncing balance...');
      // Direct Doc Read (Skip cache if possible in SDK, though getDoc usually does)
      const walletRef = doc(db, 'wallets', currentUid);
      let walletSnap = await getDoc(walletRef);
      
      // Fallback to query if doc ID isn't UID
      if (!walletSnap.exists()) {
        const q = query(collection(db, 'wallets'), where('ownerUid', '==', currentUid), limit(1));
        const querySnap = await getDocs(q);
        if (!querySnap.empty) {
          walletSnap = querySnap.docs[0];
        }
      }

      if (walletSnap.exists()) {
        const walletData = { id: walletSnap.id, ...walletSnap.data() } as any;
        setManagerData(prev => ({ ...prev, wallet: walletData }));
        console.log('[Wallet] Balanced synced:', walletData.balance);
        return walletData;
      }
      return null;
    } catch (err) {
      console.error('[Wallet] Sync error:', err);
      return null;
    }
  }, [user?.uid, profile?.uid]);

  // Data healing logic for existing records
  useEffect(() => {
    if (commonData.isLoaded && profile && !isGuest) {
      const healData = async () => {
        console.log('Running data healing check...');
        
        // 1. Heal Restaurants
        for (const res of commonData.restaurants) {
          // Only heal if admin or owner
          if (profile.role !== 'admin' && res.ownerUid !== profile.uid) continue;

          let needsUpdate = false;
          const updateData: any = {};
          
          if (!res.id_field && res.id) { // Some apps use id_field for internal tracking
            updateData.id_field = res.id;
            needsUpdate = true;
          }

          if (!res.id_field_v2 && res.id) { // Another variation
            updateData.id_field_v2 = res.id;
            needsUpdate = true;
          }

          if (!res.id_internal && res.id) { // Another variation
            updateData.id_internal = res.id;
            needsUpdate = true;
          }

          if (!res.id_v3 && res.id) { // Explicit id field v3
            updateData.id_v3 = res.id;
            needsUpdate = true;
          }
          
          // Aggressive city healing
          const isCityUndefined = !res.city || res.city === "NÃO DEFINIDO" || res.city === "UNDEFINED";
          const isCityIdUndefined = !res.cityId || res.cityId === "NÃO DEFINIDO" || res.cityId === "UNDEFINED";

          if ((isCityUndefined || isCityIdUndefined) && commonData.cities.length > 0) {
            // Try to find Tupã or use the first city
            const tupaCity = commonData.cities.find(c => c.name.toLowerCase().includes('tupa'));
            const fallbackCity = tupaCity || commonData.cities[0];
            
            if (fallbackCity) {
              updateData.city = fallbackCity.name;
              updateData.cityId = fallbackCity.id;
              needsUpdate = true;
              console.log(`Auto-assigning city to restaurant ${res.name}: ${fallbackCity.name}`);
            }
          } else if (!res.cityId && res.city && commonData.cities.length > 0) {
            const city = commonData.cities.find(c => 
              c.name.toLowerCase().trim() === res.city.toLowerCase().trim()
            );
            if (city) {
              updateData.cityId = city.id;
              needsUpdate = true;
            }
          }

          if (needsUpdate) {
            console.log(`Healing restaurant: ${res.name}`);
            await updateDoc(doc(db, 'restaurants', res.id), updateData);
          }
        }

        // 2. Heal Food Items
        const foodItemsToHeal = Array.isArray(commonData.foodItems) ? commonData.foodItems : [];
        for (const item of foodItemsToHeal) {
          const restaurant = commonData.restaurants.find(r => r.id === item.restaurantId);
          if (!restaurant) continue;

          // Only heal if admin or owner
          if (profile.role !== 'admin' && restaurant.ownerUid !== profile.uid) continue;

          let needsUpdate = false;
          const updateData: any = {};
          
          if (!item.cityId && restaurant?.cityId) {
            updateData.cityId = restaurant.cityId;
            needsUpdate = true;
          }
          
          if (!item.city && restaurant?.city) {
            updateData.city = restaurant.city;
            needsUpdate = true;
          }

          if (!item.id_v3 && item.id) {
            updateData.id_v3 = item.id;
            needsUpdate = true;
          }

          if (needsUpdate) {
            console.log(`Healing food item: ${item.name}`);
            await updateDoc(doc(db, 'food_items', item.id), updateData);
          }
        }
      };
      
      healData().catch(err => console.error('Data healing failed:', err));
    }
  }, [commonData.isLoaded, profile]);

  // Persist admin data to cache
  useEffect(() => {
    if (adminData.isPreloaded) {
      try {
        // Only cache essential data to avoid localStorage limits
        const cacheData = {
          restaurants: adminData.restaurants.slice(0, 50),
          cities: adminData.cities,
          categories: adminData.categories,
          banners: adminData.banners,
          // Limit orders and users as they can be many
          orders: adminData.orders.slice(0, 20),
          users: adminData.users.slice(0, 20),
          wallets: adminData.wallets.slice(0, 20)
        };
        localStorage.setItem('admin_data_cache', JSON.stringify(cacheData));
      } catch (e) {
        console.warn('Admin data too large for localStorage cache');
      }
    }
  }, [adminData]);
  const [localTheme, setLocalTheme] = useState<UserProfile['theme']>(() => {
    const saved = localStorage.getItem('app_theme');
    return saved ? JSON.parse(saved) : null;
  });

  // Load admin-only data
  useEffect(() => {
      const isAdmin = (user && (ADMIN_EMAILS.includes((user.email || '').toLowerCase()) || ADMIN_UIDS.includes(user.uid!))) || profile?.role === 'admin';
      if (!isAdmin) return;

      console.log('Pre-loading admin-only data...', { email: user?.email, role: profile?.role });
      
      const unsubUsers = onSnapshot(query(collection(db, 'users'), limit(500)), (snapshot) => {
      const allUsers = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
      setAdminData(prev => ({ ...prev, users: allUsers, isPreloaded: true }));
    }, (error) => {
      console.error('Error loading admin users:', error);
      if (error.code !== 'permission-denied') {
        handleFirestoreError(error, OperationType.LIST, 'users');
      }
    });

    const unsubOrders = onSnapshot(query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(200)), (snapshot) => {
      setAdminData(prev => ({ ...prev, orders: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })), isPreloaded: true }));
    }, (error) => {
      console.error('Error loading admin orders:', error);
      if (error.code !== 'permission-denied') {
        handleFirestoreError(error, OperationType.LIST, 'orders');
      }
    });

    return () => {
      unsubUsers();
      unsubOrders();
    };
  }, [profile?.role, isGuest]);

  // Load manager-specific data
  useEffect(() => {
    if (!user && !isGuest) { // Bypassed: role check removed as requested
      if (managerData.isPreloaded) {
        setManagerData({
          restaurant: null,
          popups: [],
          banners: [],
          foodItems: [],
          orders: [],
          reviews: [],
          rides: [],
          wallet: null,
          transactions: [],
          splitPayHistory: [],
          printers: [],
          isPreloaded: false
        });
      }
      return;
    }

    const currentUid = user?.uid || profile?.uid;
    if (!currentUid) return;

    console.log('Pre-loading manager-specific data...', { currentUid, restaurantId: profile?.restaurantId });

    let unsubRestaurant: (() => void) | null = null;
    let unsubFood: (() => void) | null = null;
    let unsubOrders: (() => void) | null = null;
    let unsubReviews: (() => void) | null = null;
    let unsubRides: (() => void) | null = null;
    let unsubWallet: (() => void) | null = null;
    let unsubTransactions: (() => void) | null = null;
    let unsubSPHistory: (() => void) | null = null;
    let unsubPrinters: (() => void) | null = null;

    const setupDependentListeners = (resId: string, resData: any) => {
      setManagerData(prev => ({ ...prev, restaurant: resData, isPreloaded: true }));
      
      // Cleanup previous dependent subs if any
      if (unsubFood) unsubFood();
      if (unsubOrders) unsubOrders();
      if (unsubReviews) unsubReviews();
      if (unsubRides) unsubRides();
      if (unsubSPHistory) unsubSPHistory();
      if (unsubPrinters) unsubPrinters();

      unsubFood = onSnapshot(query(collection(db, 'food_items'), where('restaurantId', '==', resId)), (foodSnapshot) => {
        setManagerData(prev => ({ ...prev, foodItems: foodSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) }));
      }, (error) => {
        if (error.code !== 'permission-denied') handleFirestoreError(error, OperationType.LIST, 'food_items');
      });

      unsubOrders = onSnapshot(query(collection(db, 'orders'), where('restaurantId', '==', resId), orderBy('createdAt', 'desc'), limit(100)), (orderSnapshot) => {
        setManagerData(prev => ({ ...prev, orders: orderSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) }));
      }, (error) => {
        if (error.code !== 'permission-denied') handleFirestoreError(error, OperationType.LIST, 'orders');
      });

      unsubReviews = onSnapshot(query(collection(db, 'reviews'), where('restaurantId', '==', resId), orderBy('createdAt', 'desc'), limit(50)), (snapshot) => {
        setManagerData(prev => ({ ...prev, reviews: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) }));
      }, (error) => {
        if (error.code !== 'permission-denied') handleFirestoreError(error, OperationType.LIST, 'reviews');
      });

      unsubRides = onSnapshot(query(collection(db, 'rides'), where('restaurantId', '==', resId), orderBy('createdAt', 'desc'), limit(50)), (snapshot) => {
        setManagerData(prev => ({ ...prev, rides: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) }));
      }, (error) => {
        const errCode = error.code || (error as any).code;
        if (errCode !== 'permission-denied' && !error.message?.toLowerCase().includes('permissions')) {
          handleFirestoreError(error, OperationType.LIST, 'rides');
        }
      });

      unsubSPHistory = onSnapshot(query(collection(db, 'splitpay_history'), where('restaurantId', '==', resId), orderBy('createdAt', 'desc'), limit(50)), (snapshot) => {
        setManagerData(prev => ({ ...prev, splitPayHistory: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) }));
      }, (error) => {
        if (error.code !== 'permission-denied') handleFirestoreError(error, OperationType.LIST, 'splitpay_history');
      });

      unsubPrinters = onSnapshot(query(collection(db, 'printers'), where('restaurantId', '==', resId)), (snapshot) => {
        setManagerData(prev => ({ ...prev, printers: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) }));
      }, (error) => {
        if (error.code !== 'permission-denied') handleFirestoreError(error, OperationType.LIST, 'printers');
      });
    };

    if (profile?.restaurantId) {
      unsubRestaurant = onSnapshot(doc(db, 'restaurants', profile.restaurantId), (snap) => {
        if (snap.exists()) {
          setupDependentListeners(snap.id, { id: snap.id, ...snap.data() });
        } else {
          setManagerData(prev => ({ ...prev, restaurant: null, isPreloaded: true }));
        }
      }, (error) => {
        console.error('Error loading linked restaurant:', error);
        setManagerData(prev => ({ ...prev, isPreloaded: true }));
      });
    } else {
      const q = query(collection(db, 'restaurants'), where('ownerUid', '==', currentUid), limit(1));
      unsubRestaurant = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const resDoc = snapshot.docs[0];
          setupDependentListeners(resDoc.id, { id: resDoc.id, ...resDoc.data() });
        } else {
          setManagerData(prev => ({ ...prev, restaurant: null, isPreloaded: true }));
        }
      }, (error) => {
        console.error('Error loading manager restaurant:', error);
        if (error.code !== 'permission-denied') {
          handleFirestoreError(error, OperationType.GET, 'restaurants');
        }
        setManagerData(prev => ({ ...prev, isPreloaded: true }));
      });
    }

    // Wallet and Transactions listeners are independent of the restaurant document
    // This prevents flickers and accidental balance resets when the restaurant doc is updated
    unsubWallet = onSnapshot(query(collection(db, 'wallets'), where('ownerUid', '==', currentUid)), (snapshot) => {
      if (!snapshot.empty) {
        // Prefer the wallet where the document ID matches the owner's UID
        let walletDoc = snapshot.docs.find(d => d.id === currentUid);
        
        // If no UID-based wallet exists, pick the one with the highest balance (likely the active one)
        if (!walletDoc) {
          walletDoc = [...snapshot.docs].sort((a, b) => (b.data().balance || 0) - (a.data().balance || 0))[0];
        }
        
        if (walletDoc) {
          setManagerData(prev => ({ ...prev, wallet: { id: walletDoc!.id, ...walletDoc!.data() } }));
        }
      } else {
        // Wallet missing in snapshot - don't auto-create here to avoid race conditions
        setManagerData(prev => ({ ...prev, wallet: null }));
      }
    }, (error) => {
      if (error.code !== 'permission-denied') handleFirestoreError(error, OperationType.GET, 'wallets');
    });

    unsubTransactions = onSnapshot(query(collection(db, 'wallet_transactions'), where('ownerUid', '==', currentUid), orderBy('createdAt', 'desc'), limit(50)), (snapshot) => {
      setManagerData(prev => ({ ...prev, transactions: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) }));
    }, (error) => {
      if (error.code !== 'permission-denied') handleFirestoreError(error, OperationType.LIST, 'wallet_transactions');
    });

    // One-time check to ensure wallet exists for managers/admins
    if (profile?.role === 'manager' || profile?.role === 'admin') {
      getDoc(doc(db, 'wallets', currentUid)).then(docSnap => {
        if (!docSnap.exists()) {
          console.log('Auto-creating missing wallet for manager/admin:', currentUid);
          setDoc(doc(db, 'wallets', currentUid), {
            ownerUid: currentUid,
            balance: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          }, { merge: true }).catch(err => console.error('Error auto-creating wallet:', err));
        }
      }).catch(err => {
        if (err.code !== 'permission-denied') console.error('Error checking wallet existence:', err);
      });
    }

    const unsubPopups = onSnapshot(query(collection(db, 'marketing_popups'), where('ownerUid', '==', currentUid)), (snapshot) => {
      setManagerData(prev => ({ ...prev, popups: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) }));
    }, (error) => {
      if (error.code !== 'permission-denied') handleFirestoreError(error, OperationType.LIST, 'marketing_popups');
    });

    const unsubBanners = onSnapshot(query(collection(db, 'promotional_banners'), where('ownerUid', '==', currentUid)), (snapshot) => {
      setManagerData(prev => ({ ...prev, banners: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) }));
    }, (error) => {
      if (error.code !== 'permission-denied') handleFirestoreError(error, OperationType.LIST, 'promotional_banners');
    });

    return () => {
      unsubRestaurant();
      if (unsubFood) unsubFood();
      if (unsubOrders) unsubOrders();
      if (unsubReviews) unsubReviews();
      if (unsubRides) unsubRides();
      if (unsubWallet) unsubWallet();
      if (unsubTransactions) unsubTransactions();
      if (unsubSPHistory) unsubSPHistory();
      if (unsubPrinters) unsubPrinters();
      unsubPopups();
      unsubBanners();
    };
  }, [profile, user, isGuest]);

  useEffect(() => {
    const settingsDocRef = doc(db, 'settings', 'global');
    const unsubscribeSettings = onSnapshot(settingsDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as GlobalSettings;
        
        // Auto-reset global black theme - only for real admins to avoid permission errors
        const isAdminUser = !!(user && (ADMIN_EMAILS.includes((user.email || '').toLowerCase()) || ADMIN_UIDS.includes(user.uid!)));
        
        // Auto-update default order sound to softer bell if it's the old loud one
        const oldSounds = [
          'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
          'https://assets.mixkit.co/active_storage/sfx/2515/2515-preview.mp3'
        ];
        const newBellSound = 'https://assets.mixkit.co/active_storage/sfx/2510/2510-preview.mp3';
        
        if (isAdminUser && data.defaultOrderSoundUrl && oldSounds.includes(data.defaultOrderSoundUrl)) {
          updateDoc(settingsDocRef, {
            defaultOrderSoundUrl: newBellSound
          }).catch(console.error);
          data.defaultOrderSoundUrl = newBellSound;
        }

        if (isAdminUser && (data.globalTheme?.primaryColor === '#000000' || data.globalTheme?.primaryColor === '#000')) {
          updateDoc(settingsDocRef, {
            'globalTheme.primaryColor': '#2563eb',
            'globalTheme.isGradient': false
          }).catch(console.error);
          if (data.globalTheme) {
            data.globalTheme.primaryColor = '#2563eb';
            data.globalTheme.isGradient = false;
          }
        }
        
        setGlobalSettings(data);
        localStorage.setItem('global_settings_cache', JSON.stringify(data));
      } else {
        console.warn("Settings document 'global' does not exist.");
      }
    }, (error) => {
      // Don't throw for permission errors on the initial settings load to avoid crashing the app
      console.error("Error loading settings:", error);
      if (error.code !== 'permission-denied') {
        handleFirestoreError(error, OperationType.GET, 'settings/global');
      }
    });

    return () => unsubscribeSettings();
  }, []);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      // Clean up previous profile listener if it exists
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (currentUser) {
        setIsGuest(false);
        
        const userDocRef = doc(db, 'users', currentUser.uid);
        unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const userProfile: UserProfile = {
              uid: currentUser.uid,
              email: data.email,
              displayName: data.displayName || 'Usuário',
              photoURL: data.photoURL,
              role: data.role || 'customer',
              status: data.status,
              vehicleType: data.vehicleType,
              vehiclePlate: data.vehiclePlate,
              vehicleColor: data.vehicleColor,
              whatsapp: data.whatsapp,
              address: data.address,
              referencePoint: data.referencePoint,
              restaurantId: data.restaurantId,
              cpf: data.cpf,
              subscriptionStatus: data.subscriptionStatus,
              subscriptionDueDate: data.subscriptionDueDate,
              trialEndsAt: data.trialEndsAt,
              theme: data.theme,
            };

            // Ensure admin role for specific emails or UID
            const isAdmin = (currentUser && (ADMIN_EMAILS.includes((currentUser.email || '').toLowerCase()) || ADMIN_UIDS.includes(currentUser.uid!))) || data.role === 'admin';
            
            // Auto-reset black theme (bug fix requested by user)
            if (userProfile.theme?.primaryColor === '#000000' || userProfile.theme?.primaryColor === '#000') {
              const updatedTheme = {
                ...userProfile.theme,
                primaryColor: '#2563eb',
                isGradient: false
              };
              updateDoc(userDocRef, { theme: updatedTheme }).catch(console.error);
              userProfile.theme = updatedTheme as any;
            }

            if ((isAdmin || isGuest) && profile?.role === 'admin') {
              // Initialize database if needed
              initGlobalSettings().catch(console.error);
            }

            if (isAdmin && !isGuest) {
              if (userProfile.role !== 'admin') {
                updateDoc(userDocRef, { role: 'admin' }).catch(e => {
                  handleFirestoreError(e, OperationType.UPDATE, `users/${currentUser.uid}`);
                });
              }
              // Prefetch admin data
              prefetchAdminData();
            }

            if (userProfile.role === 'manager') {
              // Prefetch manager data
              prefetchManagerData(currentUser.uid, userProfile.restaurantId);
            }
            
            setProfile(userProfile);
            localStorage.setItem('user_profile_cache', JSON.stringify(userProfile));
          } else if (!isManualRegistering) {
            // Create profile if it doesn't exist and we are NOT in the middle of a manual registration
            const isAdmin = (currentUser && (ADMIN_EMAILS.includes((currentUser.email || '').toLowerCase()) || ADMIN_UIDS.includes(currentUser.uid!)));
            const newProfile: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email || '',
              displayName: currentUser.displayName || 'Usuário',
              photoURL: currentUser.photoURL || '',
              role: 'admin',
              status: 'online'
            };
            
            setDoc(userDocRef, {
              ...newProfile,
              createdAt: serverTimestamp()
            }).then(() => {
              setProfile(newProfile);
              localStorage.setItem('user_profile_cache', JSON.stringify(newProfile));
            }).catch(e => {
              handleFirestoreError(e, OperationType.CREATE, `users/${currentUser.uid}`);
            });
          }
          setLoading(false);
        }, (error) => {
          // Only handle error if we still have a user (avoid errors on logout)
          if (auth.currentUser) {
            handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
          }
          setLoading(false);
        });
      } else {
        setProfile(null);
        setIsGuest(false);
        setLoading(false);
        localStorage.removeItem('user_profile_cache');
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, [isGuest]);

  // Real-time listeners for Manager Data
  useEffect(() => {
    if (!user || profile?.role !== 'manager' || !managerData.restaurant?.id) return;

    const restaurantId = managerData.restaurant.id;
    const unsubscribes: (() => void)[] = [];

    // Restaurant Listener
    unsubscribes.push(onSnapshot(doc(db, 'restaurants', restaurantId), (snap) => {
      if (snap.exists()) {
        setManagerData(prev => {
          const newData = {
            ...prev,
            restaurant: { id: snap.id, ...snap.data() } as any
          };
          localStorage.setItem('manager_data_cache', JSON.stringify(newData));
          return newData;
        });
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, `restaurants/${restaurantId}`)));

    // Orders Listener
    const ordersQuery = query(
      collection(db, 'orders'),
      where('restaurantId', '==', restaurantId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    unsubscribes.push(onSnapshot(ordersQuery, (snap) => {
      setManagerData(prev => {
        const newData = {
          ...prev,
          orders: snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any))
        };
        localStorage.setItem('manager_data_cache', JSON.stringify(newData));
        return newData;
      });
    }, (err) => handleFirestoreError(err, OperationType.GET, 'orders')));

    // Food Items Listener
    const itemsQuery = query(
      collection(db, 'food_items'),
      where('restaurantId', '==', restaurantId),
      limit(100)
    );
    unsubscribes.push(onSnapshot(itemsQuery, (snap) => {
      setManagerData(prev => {
        const newData = {
          ...prev,
          foodItems: snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any))
        };
        localStorage.setItem('manager_data_cache', JSON.stringify(newData));
        return newData;
      });
    }, (err) => handleFirestoreError(err, OperationType.GET, 'food_items')));

    // Transactions Listener
    const txQuery = query(
      collection(db, 'wallet_transactions'),
      where('ownerUid', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    unsubscribes.push(onSnapshot(txQuery, (snap) => {
      setManagerData(prev => {
        const newData = {
          ...prev,
          transactions: snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any))
        };
        localStorage.setItem('manager_data_cache', JSON.stringify(newData));
        return newData;
      });
    }, (err) => handleFirestoreError(err, OperationType.GET, 'wallet_transactions')));

    // Reviews Listener
    const reviewsQuery = query(
      collection(db, 'reviews'),
      where('restaurantId', '==', restaurantId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    unsubscribes.push(onSnapshot(reviewsQuery, (snap) => {
      setManagerData(prev => {
        const newData = {
          ...prev,
          reviews: snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any))
        };
        localStorage.setItem('manager_data_cache', JSON.stringify(newData));
        return newData;
      });
    }, (err) => handleFirestoreError(err, OperationType.GET, 'reviews')));

    // Rides Listener
    const ridesQuery = query(
      collection(db, 'rides'),
      where('restaurantId', '==', restaurantId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    unsubscribes.push(onSnapshot(ridesQuery, (snap) => {
      setManagerData(prev => {
        const newData = {
          ...prev,
          rides: snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any))
        };
        localStorage.setItem('manager_data_cache', JSON.stringify(newData));
        return newData;
      });
    }, (err) => {
      const errCode = err.code || (err as any).code;
      if (errCode !== 'permission-denied' && !err.message?.toLowerCase().includes('permissions')) {
        handleFirestoreError(err, OperationType.GET, 'rides');
      }
    }));

    // Printers Listener
    const printersQuery = query(
      collection(db, 'printers'),
      where('restaurantId', '==', restaurantId)
    );
    unsubscribes.push(onSnapshot(printersQuery, (snap) => {
      setManagerData(prev => {
        const newData = {
          ...prev,
          printers: snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any))
        };
        localStorage.setItem('manager_data_cache', JSON.stringify(newData));
        return newData;
      });
    }, (err) => handleFirestoreError(err, OperationType.GET, 'printers')));

    return () => unsubscribes.forEach(unsub => unsub());
  }, [user, profile?.role, managerData.restaurant?.id]);

  // Real-time listeners for Admin Data
  useEffect(() => {
    const isAdminUser = (user && (ADMIN_EMAILS.includes((user.email || '').toLowerCase()) || ADMIN_UIDS.includes(user.uid!))) || (profile?.role === 'admin' && profile?.uid && ADMIN_UIDS.includes(profile.uid));
    
    if (!user || !isAdminUser) return;

    const unsubscribes: (() => void)[] = [];

    // Payments Listener
    unsubscribes.push(onSnapshot(query(collection(db, 'payments'), orderBy('createdAt', 'desc'), limit(100)), (snap) => {
      setAdminData(prev => {
        const newData = {
          ...prev,
          payments: snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any))
        };
        localStorage.setItem('admin_data_cache', JSON.stringify(newData));
        return newData;
      });
    }, (err) => handleFirestoreError(err, OperationType.GET, 'payments')));

    // Branches Listener
    unsubscribes.push(onSnapshot(query(collection(db, 'branches'), limit(100)), (snap) => {
      setAdminData(prev => {
        const newData = {
          ...prev,
          branches: snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any))
        };
        localStorage.setItem('admin_data_cache', JSON.stringify(newData));
        return newData;
      });
    }, (err) => handleFirestoreError(err, OperationType.GET, 'branches')));

    return () => unsubscribes.forEach(unsub => unsub());
  }, [user, profile?.role]);


  // signInWithGoogle removed per user request

  const signUpWithEmail = async (email: string, pass: string, name: string, cpf: string, photoURL: string, whatsapp: string, modality?: string, targetRole: 'manager' | 'customer' = 'customer') => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    setIsManualRegistering(true);
    try {
      if (!whatsapp) {
        throw new Error('WhatsApp é obrigatório.');
      }

      // 1. Create the auth user first so we are authenticated for the next steps
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const currentUser = userCredential.user;

      // 2. Now that we are authenticated, check for duplicate CPF in the dedicated collection
      const sanitizedCpf = cpf.replace(/\D/g, '');
      const cpfDocRef = doc(db, 'cpfs', sanitizedCpf);
      const cpfSnap = await getDoc(cpfDocRef);
      
      if (cpfSnap.exists()) {
        // If CPF exists, we must delete the newly created auth user to allow them to try again with correct data
        await currentUser.delete();
        throw new Error('Este CPF já está cadastrado.');
      }
      
      // 3. Register the CPF to prevent others from using it
      await setDoc(cpfDocRef, { uid: currentUser.uid });
      
      // Firebase Auth updateProfile has a strict limit on photoURL length (~2048 chars)
      // If it's a large Base64, we only save it to Firestore
      const authPhotoURL = (photoURL && photoURL.length < 2000) ? photoURL : null;
      await updateProfile(currentUser, { displayName: name, photoURL: authPhotoURL });
      
      const userDocRef = doc(db, 'users', currentUser.uid);
      const newProfile: UserProfile = {
        uid: currentUser.uid,
        email: currentUser.email || '',
        displayName: name,
        photoURL: photoURL || '',
        role: targetRole || 'customer',
        status: 'online',
        cpf: cpf,
        whatsapp: whatsapp || ''
      };

      // If it's a manager, create the restaurant entry immediately
      if (newProfile.role === 'manager') {
        const resRef = doc(collection(db, 'restaurants'));
        newProfile.restaurantId = resRef.id; // Map restaurant to user immediately
        await setDoc(resRef, {
          id: resRef.id,
          id_v3: resRef.id,
          name: name,
          description: 'Nova empresa cadastrada',
          imageUrl: photoURL,
          logoUrl: photoURL,
          ownerUid: currentUser.uid,
          whatsapp: whatsapp,
          status: 'pending',
          modality: modality || 'restaurante',
          openingHours: '09:00',
          closingHours: '22:00',
          createdAt: serverTimestamp()
        });
      }
      
      await setDoc(userDocRef, {
        ...newProfile,
        createdAt: serverTimestamp()
      });
      
      localStorage.setItem('user_profile_cache', JSON.stringify(newProfile));
      
      setProfile(newProfile);

      // If manager, prefetch their specific data immediately
      if (newProfile.role === 'manager') {
        await prefetchManagerData(currentUser.uid, newProfile.restaurantId);
      }
    } catch (error: any) {
      console.error("Erro no cadastro:", error);
      if (error.code === 'auth/operation-not-allowed') {
        throw new Error('O provedor de E-mail/Senha não está ativado no Firebase Console. Por favor, ative-o em Authentication > Sign-in method.');
      }
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('Este e-mail já está em uso. Por favor, use outro e-mail ou faça login.');
      }
      if (error.code === 'permission-denied' || error.message?.includes('permissions')) {
        throw new Error('Erro de permissão ao acessar o banco de dados. Verifique as regras do Firestore.');
      }
      throw error;
    } finally {
      setIsSigningIn(false);
      setIsManualRegistering(false);
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      const currentUser = userCredential.user;
      
      // Force initial profile fetch immediately so the app doesn't wait for listener
      const userDocRef = doc(db, 'users', currentUser.uid);
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const userProfile: UserProfile = {
          uid: currentUser.uid,
          email: data.email,
          displayName: data.displayName || 'Usuário',
          photoURL: data.photoURL,
          role: data.role || 'customer',
          status: data.status,
          restaurantId: data.restaurantId
        } as UserProfile;
        setProfile(userProfile);
        localStorage.setItem('user_profile_cache', JSON.stringify(userProfile));
        
        // If manager, prefetch their specific data immediately
        if (userProfile.role === 'manager') {
          await prefetchManagerData(currentUser.uid, userProfile.restaurantId);
        }
      }
    } catch (error: any) {
      console.error("Erro no login:", error);
      if (error.code === 'auth/operation-not-allowed') {
        throw new Error('O provedor de E-mail/Senha não está ativado no Firebase Console. Por favor, ative-o em Authentication > Sign-in method.');
      }
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        throw new Error('E-mail ou senha incorretos.');
      }
      throw error;
    } finally {
      setIsSigningIn(false);
    }
  };

  const continueAsGuest = (role: UserProfile['role'] = 'customer') => {
    setIsGuest(true);
    setProfile({
      uid: 'guest',
      email: 'guest@aifood.com',
      displayName: 'Visitante',
      role: role,
    });
    setLoading(false);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setIsGuest(false);
    setProfile(null);
    localStorage.removeItem('user_profile_cache');
    localStorage.removeItem('manager_data_cache');
    localStorage.removeItem('admin_data_cache');
  };

  const updateStatus = async (status: 'online' | 'offline') => {
    if (!user) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, { status }, { merge: true });
      setProfile(prev => prev ? { ...prev, status } : null);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const setRole = async (role: UserProfile['role']) => {
    if (!user) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const updates: any = { role };
      
      // If becoming a manager for the first time, set trial
      if (role === 'manager' && !profile?.trialEndsAt) {
        const trialEnd = new Date();
        const trialDays = globalSettings?.trialPeriodDays || 0;
        trialEnd.setDate(trialEnd.getDate() + trialDays);
        updates.subscriptionStatus = 'trial';
        updates.trialEndsAt = trialEnd.toISOString();
      }
      
      await setDoc(userDocRef, updates, { merge: true });
      setProfile(prev => prev ? { ...prev, ...updates } : null);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const updateProfileData = async (data: Partial<Pick<UserProfile, 'displayName' | 'photoURL' | 'whatsapp' | 'address' | 'cpf' | 'referencePoint'>>) => {
    if (!user) return false;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      
      // Optimistic update
      setProfile(prev => prev ? { ...prev, ...data } : null);

      // Sanitize data to remove undefined values for Firestore
      const sanitizedData: any = {};
      if (data.displayName !== undefined) sanitizedData.displayName = data.displayName;
      if (data.photoURL !== undefined) sanitizedData.photoURL = data.photoURL || '';
      if (data.whatsapp !== undefined) sanitizedData.whatsapp = data.whatsapp || '';
      if (data.address !== undefined) sanitizedData.address = data.address || '';
      if (data.cpf !== undefined) sanitizedData.cpf = data.cpf || '';
      if (data.referencePoint !== undefined) sanitizedData.referencePoint = data.referencePoint || '';

      await setDoc(userDocRef, sanitizedData, { merge: true });

      // If manager, also update restaurant image
      if (profile?.role === 'manager' && managerData.restaurant?.id && data.photoURL) {
        try {
          const resRef = doc(db, 'restaurants', managerData.restaurant.id);
          await updateDoc(resRef, { 
            imageUrl: data.photoURL,
            logoUrl: data.photoURL // Update both to ensure consistency
          });
        } catch (resErr) {
          console.error("Error updating restaurant image from profile:", resErr);
        }
      }

      // Profile will be updated by the onSnapshot listener
      return true;
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}`);
      return false;
    }
  };

  const updateTheme = async (theme: UserProfile['theme']) => {
    setLocalTheme(theme);
    localStorage.setItem('app_theme', JSON.stringify(theme));
    
    if (!user || !theme) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      
      // Sanitize theme object to remove undefined values for Firestore
      const sanitizedTheme = {
        mode: theme.mode || 'light',
        primaryColor: theme.primaryColor,
        isGradient: theme.isGradient,
        ...(theme.secondaryColor !== undefined && { secondaryColor: theme.secondaryColor }),
        ...(theme.backgroundImage !== undefined && { backgroundImage: theme.backgroundImage })
      };
      
      await setDoc(userDocRef, { theme: sanitizedTheme }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const updateGlobalSettings = async (settings: Partial<GlobalSettings>) => {
    if (isGuest) {
      console.warn('Cannot update global settings in guest mode');
      return;
    }
    try {
      const settingsDocRef = doc(db, 'settings', 'global');
      await setDoc(settingsDocRef, settings, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'settings/global');
    }
  };

  const activateSubscription = async (userId: string) => {
    try {
      const userDocRef = doc(db, 'users', userId);
      const duration = globalSettings?.subscriptionDurationDays || 30;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + duration);
      
      const updates: Partial<UserProfile> = {
        subscriptionStatus: 'active',
        subscriptionDueDate: dueDate.toISOString()
      };
      
      await setDoc(userDocRef, updates, { merge: true });
      // Profile will be updated by the onSnapshot listener
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const getIdToken = async () => {
    if (!user) return null;
    return await user.getIdToken();
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile: profile || (localTheme ? { theme: localTheme } as UserProfile : null), 
      globalSettings,
      loading, 
      isGuest, 
      isSigningIn, 
      signUpWithEmail,
      signInWithEmail,
      continueAsGuest, 
      signOut, 
      updateStatus, 
      setRole, 
      updateProfileData,
      updateTheme,
      updateGlobalSettings,
      activateSubscription,
      getIdToken,
      refreshWallet,
      adminData,
      managerData,
      commonData,
      prefetchManagerData,
      prefetchAdminData,
      isAdmin: !!(user && (ADMIN_EMAILS.includes((user.email || '').toLowerCase()) || ADMIN_UIDS.includes(user.uid!) || profile?.role === 'admin'))
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
