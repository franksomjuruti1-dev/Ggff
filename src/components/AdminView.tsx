import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import axios from 'axios';
import { db, auth } from '../firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  setDoc,
  deleteDoc, 
  doc, 
  serverTimestamp,
  query,
  getDocs,
  getDoc,
  where,
  orderBy,
  limit,
  increment,
  deleteField,
  runTransaction
} from 'firebase/firestore';
import { useAuth, OperationType, handleFirestoreError } from '../AuthContext';
import AuthModal from './AuthModal';
import { formatTimeInput } from '../utils/format';
import { compressImage } from '../utils/image';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon in Leaflet
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Set default icon for all markers
L.Marker.prototype.options.icon = DefaultIcon;

const UserIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const RestaurantIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const MapRefresher = () => {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
    }, 100);
  }, [map]);
  return null;
};

L.Marker.prototype.options.icon = DefaultIcon;
import { 
  Users, 
  Store, 
  Image as ImageIcon, 
  Trash2, 
  Plus, 
  Palette,
  CheckCircle, 
  XCircle, 
  ShieldAlert, 
  Utensils,
  Globe,
  Link,
  Key,
  Mail,
  Lock,
  MapPin,
  Database,
  Share2,
  MessageCircle,
  Navigation,
  Edit2,
  Save,
  ChevronRight,
  AlertCircle,
  Info,
  Calendar,
  X,
  Star,
  Zap,
  Filter,
  Search,
  ShieldCheck,
  CreditCard,
  Package,
  LayoutDashboard,
  Settings,
  LogOut,
  Clock,
  Percent,
  Bell,
  DollarSign,
  ToggleLeft,
  ToggleRight,
  Settings2,
  History,
  RefreshCw,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Copy,
  Clock as ClockIcon,
  ClipboardList,
  ShoppingBag,
  Volume2,
  Smartphone,
  Phone,
  Music,
  MessageSquare,
  Play,
  Pause,
  ChevronLeft,
  LayoutGrid,
  AlertTriangle,
  BarChart2,
  Eye,
  HelpCircle,
  ExternalLink,
  FileText,
  Printer,
  Download,
  MoreHorizontal,
  Hash,
  User,
  Building2,
  Handshake,
  Loader2,
  LogIn,
  Check,
  Hand,
  Activity,
  Unlink,
  Edit3,
  Minus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ThemeSelector, THEME_OPTIONS } from './ThemeSelector';
import { ClientIconSettings } from './CustomerView';
import GalleryModal from './GalleryModal';
import LiveAppControl from './LiveAppControl';

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  AreaChart,
  Area
} from 'recharts';

interface WeeklyHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

interface DayHours {
  open: string;
  close: string;
  closed: boolean;
  closesForLunch: boolean;
  lunchStart: string;
  lunchEnd: string;
}

interface Wallet {
  id: string;
  ownerUid: string;
  balance: number;
  updatedAt?: any;
}

interface Restaurant {
  id: string;
  name: string;
  ownerUid: string;
  status: string;
  description?: string;
  imageUrl?: string;
  logoUrl?: string;
  latitude?: number;
  longitude?: number;
  city?: string;
  cityId?: string;
  isFamous?: boolean;
  pixConfigType?: 'company' | 'central' | 'none';
  pixKey?: string;
  pixType?: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';
  orderSoundUrl?: string;
  messageSoundUrl?: string;
  whatsapp?: string;
  referencePoint?: string;
  openingHours?: string;
  closingHours?: string;
  autoVolume?: boolean;
  screenOverlay?: boolean;
  subscriptionActive?: boolean;
  subscriptionDueDate?: any;
  customOrderDeduction?: number;
  weeklyHours?: WeeklyHours;
  splitPayConfig?: {
    pixKey: string;
    pixKeyType: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';
    platformFee: number;
    feeType: 'fixed' | 'percent';
    active: boolean;
  };
  subscriptionStatus?: 'active' | 'expired' | 'trial';
  branchId?: string;
  unlimitedCredit?: boolean;
  createdAt?: any;
  modality?: string;
}

interface Order {
  id: string;
  restaurantId: string;
  customerUid: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  items: any[];
  total: number;
  status: string;
  deliveryAddress: string;
  paymentMethod?: string;
  address?: any;
  createdAt: any;
}

interface FoodItem {
  id: string;
  name: string;
  description: string;
  price: number;
  promoPrice?: number;
  imageUrl: string;
  restaurantId: string;
  categoryId: string;
  likesCount: number;
  status: 'active' | 'inactive';
}

interface Branch {
  id: string;
  name: string;
  cityId: string;
  cityName: string;
  createdAt: any;
  password?: string;
  total_restaurantes?: number;
  ganhos_gerais?: number;
  recargas_pix?: number;
  recargas_manuais?: number;
  faturamento_hoje?: number;
}

interface Banner {
  id: string;
  imageUrl: string;
  title: string;
  linkUrl?: string;
  active: boolean;
  mediaType?: 'image' | 'video' | 'gif';
  audioUrl?: string;
  linkType?: 'external' | 'restaurant' | 'product';
  linkId?: string;
  objectPosition?: string;
  cities?: string[];
}

interface GlobalSettings {
  mercadoPagoPublicKey?: string;
  mercadoPagoAccessToken?: string;
  minWalletBalance?: number;
  minRechargeAmount?: number;
  orderDeductionAmount?: number;
  carouselInterval?: number;
  splashScreenDuration?: number;
  centralPixKey?: string;
  centralPixType?: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';
  splitPayEnabled?: boolean;
  monthlyFee?: number;
  defaultDueDay?: number;
  trialPeriodDays?: number;
  subscriptionDurationDays?: number;
  highlightDailyCost?: number;
  appName?: string;
  allCategoryImageUrl?: string;
  splashText?: string;
  splashMediaUrl?: string;
  splashMediaType?: 'image' | 'video';
  splashAudioUrl?: string;
  activeEffect?: 'none' | 'snow' | 'rocket' | 'easter' | 'women_day';
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
  maintenanceMode?: boolean;
  maintenanceMessage?: string;
  maintenanceImageUrl?: string;
  bestRatedFirst?: boolean;
  openFirst?: boolean;
  categoryDisplayConfig?: { [categoryId: string]: { hours: string; phrase: string } };
  globalTheme?: {
    primaryColor: string;
    secondaryColor: string;
    isGradient: boolean;
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
}

interface UserProfile {
  uid: string;
  email: string;
  role: string;
  displayName?: string;
  photoURL?: string;
  phone?: string;
  whatsapp?: string;
  cpf?: string;
  city?: string;
  cityId?: string;
  branchId?: string;
  latitude?: number;
  longitude?: number;
  referencePoint?: string;
  orderCount?: number;
  totalSales?: number;
  createdAt?: any;
  password?: string;
  subscriptionStatus?: 'active' | 'expired' | 'trial';
  subscriptionDueDate?: string;
  trialEndsAt?: string;
}

interface CategorySchedule {
  id: string;
  name: string;
  categoryIds: string[];
  startTime: string;
  endTime: string;
  active: boolean;
}

interface Payment {
  id: string;
  orderId: string;
  amount: number;
  status: string;
  method: string;
  payerEmail: string;
  city?: string;
  createdAt: any;
  date: string;
}

interface Category {
  id: string;
  name: string;
  iconName: string;
  imageUrl?: string;
  active: boolean;
}

interface City {
  id: string;
  name: string;
  apiUrl: string;
  apiKey: string;
  authEmail: string;
  authPassword?: string;
  lat?: number;
  lng?: number;
  status: 'online' | 'offline' | 'testing';
  lastChecked?: string;
  categories?: { id: string; nome: string }[];
  categoriesLastUpdated?: string;
  integrationActive?: boolean;
}

const CitySatelliteMap = React.memo(({ lat, lng, zoom = 15, height = "200px" }: { lat: number | null, lng: number | null, zoom?: number, height?: string }) => {
  if (!lat || !lng) return (
    <div style={{ height }} className="w-full bg-white/5 rounded-2xl flex flex-col items-center justify-center border border-dashed border-white/10 text-slate-500">
      <MapPin size={24} className="mb-2 opacity-20" />
      <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Aguardando Coordenadas</span>
    </div>
  );

  return (
    <div style={{ height }} className="w-full rounded-2xl overflow-hidden border border-white/10 shadow-inner relative z-0">
      <MapContainer 
        key={`${lat}-${lng}`}
        center={[lat, lng]} 
        zoom={zoom} 
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom={false}
        zoomControl={false}
        dragging={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />
        <Marker position={[lat, lng]} />
        <ChangeView center={[lat, lng]} zoom={zoom} />
      </MapContainer>
    </div>
  );
});

const ChangeView = ({ center, zoom }: { center: [number, number], zoom: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom]);
  return null;
};

interface MapSectionProps {
  items: { id: string; name: string; phone?: string; lat: number; lng: number; type: 'user' | 'restaurant' }[];
  title: string;
}

const MapSection = React.memo(({ items, title }: MapSectionProps) => {
  const validItems = items.filter(item => 
    typeof item.lat === 'number' && 
    typeof item.lng === 'number' && 
    !isNaN(item.lat) && 
    !isNaN(item.lng)
  );
  
  if (validItems.length === 0) {
    return (
      <div className="bg-white/5 p-12 rounded-[2.5rem] border border-white/10 text-center opacity-40">
        <MapPin className="mx-auto mb-4" size={48} />
        <p className="text-sm font-black uppercase tracking-widest">Nenhuma localização disponível para {title}</p>
      </div>
    );
  }

  // Find center of all items
  const center = validItems.reduce(
    (acc, item) => ({ lat: acc.lat + item.lat / validItems.length, lng: acc.lng + item.lng / validItems.length }),
    { lat: 0, lng: 0 }
  );

  // Safety check for center coordinates
  if (isNaN(center.lat) || isNaN(center.lng)) {
    center.lat = validItems[0].lat;
    center.lng = validItems[0].lng;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black uppercase tracking-tight italic flex items-center space-x-2">
          <MapPin className="text-blue-400" size={24} />
          <span>{title} no Mapa</span>
        </h3>
        <span className="text-[10px] font-black uppercase tracking-widest opacity-40">
          {validItems.length} Ponto(s) Detectado(s)
        </span>
      </div>
      
      <div className="h-[500px] rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl relative z-0">
        <MapContainer 
          center={[center.lat, center.lng]} 
          zoom={12} 
          style={{ width: '100%', height: '100%' }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
          {validItems.map((item, idx) => (
            <Marker 
              key={`${item.id}-${idx}`} 
              position={[item.lat, item.lng]}
              icon={item.type === 'user' ? UserIcon : RestaurantIcon}
            >
              <Popup>
                <div className="p-1 space-y-1 min-w-[120px]">
                  <p className="font-bold text-xs text-slate-900 uppercase">{item.name}</p>
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">
                    {item.type === 'user' ? 'Cliente' : 'Restaurante'}
                  </p>
                  {item.phone && (
                    <p className="text-[10px] font-bold text-blue-600 flex items-center gap-1">
                      <Phone size={10} />
                      <span>{item.phone}</span>
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
});

interface ProductAvailability {
  [key: string]: {
    active: boolean;
    startTime: string;
    endTime: string;
  };
}

const AdminView: React.FC = () => {
  const { 
    user, 
    profile, 
    loading, 
    isAdmin,
    globalSettings, 
    signOut, 
    getIdToken, 
    updateGlobalSettings, 
    adminData, 
    isGuest 
  } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [restaurants, setRestaurants] = useState<Restaurant[]>(adminData.restaurants || []);
  const [banners, setBanners] = useState<Banner[]>(adminData.banners || []);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [selectedRestaurantForMenu, setSelectedRestaurantForMenu] = useState<Restaurant | null>(null);
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [restaurantProducts, setRestaurantProducts] = useState<any[]>([]);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  
  // Product Form State
  const [productName, setProductName] = useState('');
  const [productDesc, setProductDesc] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productPromoPrice, setProductPromoPrice] = useState('');
  const [productCat, setProductCat] = useState('');
  const [productImg, setProductImg] = useState('');
  const [productIsFlash, setProductIsFlash] = useState(false);
  const [productIsFreeDelivery, setProductIsFreeDelivery] = useState(false);
  const [productStock, setProductStock] = useState('');
  const [productAvailable, setProductAvailable] = useState(true);
  const [productAvailableFrom, setProductAvailableFrom] = useState('');
  const [productAvailableUntil, setProductAvailableUntil] = useState('');
  const [productPreparationTime, setProductPreparationTime] = useState('');
  const [productMaxAddOns, setProductMaxAddOns] = useState('');
  const [productAddOns, setProductAddOns] = useState<any[]>([]);
  const [productAvailability, setProductAvailability] = useState<ProductAvailability>({
    monday: { active: false, startTime: '00:00', endTime: '23:59' },
    tuesday: { active: false, startTime: '00:00', endTime: '23:59' },
    wednesday: { active: false, startTime: '00:00', endTime: '23:59' },
    thursday: { active: false, startTime: '00:00', endTime: '23:59' },
    friday: { active: false, startTime: '00:00', endTime: '23:59' },
    saturday: { active: false, startTime: '00:00', endTime: '23:59' },
    sunday: { active: false, startTime: '00:00', endTime: '23:59' },
  });
  const [showAvailability, setShowAvailability] = useState(false);
  const [categories, setCategories] = useState<Category[]>(adminData.categories || []);
  const [businessCategories, setBusinessCategories] = useState<any[]>([]);
  const [activeCategorySubTab, setActiveCategorySubTab] = useState<'products' | 'modalities' | 'businesses'>('products');
  const [isAddingBusinessCategory, setIsAddingBusinessCategory] = useState(false);
  const [editingBusinessCategory, setEditingBusinessCategory] = useState<any>(null);
  const [busCatName, setBusCatName] = useState('');
  const [busCatImageUrl, setBusCatImageUrl] = useState('');
  const [busCatStatus, setBusCatStatus] = useState<'active' | 'inactive'>('active');
  const [businessCategoriesLimit, setBusinessCategoriesLimit] = useState(10);
  const [users, setUsers] = useState<UserProfile[]>(adminData.users || []);
  const [cities, setCities] = useState<City[]>(adminData.cities || []);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [allOrders, setAllOrders] = useState<any[]>(adminData.orders || []);
  const [wallets, setWallets] = useState<any[]>(adminData.wallets || []);
  const [settings, setSettings] = useState<GlobalSettings>({ 
    carouselInterval: 5,
    splashScreenDuration: 5,
    mercadoPagoPublicKey: '',
    mercadoPagoAccessToken: '',
    manualRechargeUrl: '',
    minWalletBalance: 5,
    minRechargeAmount: 10,
    orderDeductionAmount: 2,
    monthlyFee: 50,
    defaultDueDay: 10,
    trialPeriodDays: 0,
    subscriptionDurationDays: 30,
    highlightDailyCost: 7
  });
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<'restaurants' | 'banners' | 'categories' | 'users' | 'settings' | 'cities' | 'mercadopago' | 'wallet' | 'subscriptions' | 'security' | 'customization' | 'analytics' | 'schedules' | 'orders' | 'partners' | 'realtime_cities'>('restaurants');
  const [selectedRealTimeCity, setSelectedRealTimeCity] = useState<City | null>(null);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [notificationText, setNotificationText] = useState('');
  const [isSendingNotification, setIsSendingNotification] = useState(false);
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'week' | 'month' | 'all'>('today');
  const [adminLogs, setAdminLogs] = useState<any[]>([]);
  
  const [isLinkingModalOpen, setIsLinkingModalOpen] = useState(false);
  const [targetCityForLinking, setTargetCityForLinking] = useState<City | null>(null);
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userSortBy, setUserSortBy] = useState<'recent' | 'orders' | 'sales'>('recent');
  const [userStartDate, setUserStartDate] = useState('');
  const [showAutoCreditConfirm, setShowAutoCreditConfirm] = useState<{ uid: string; name: string; branchId?: string } | null>(null);
  const [userEndDate, setUserEndDate] = useState('');
  
  // Password protection for Admin Panel
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(true);
  const [password, setPassword] = useState('');
  const [unlockError, setUnlockError] = useState(false);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '@Ehbc7890') {
      setIsAdminUnlocked(true);
      sessionStorage.setItem('admin_unlocked', 'true');
      setUnlockError(false);
    } else {
      setUnlockError(true);
      alert('Senha incorreta!');
    }
  };
  const [selectedSupportCityId, setSelectedSupportCityId] = useState('');
  const [citySupportPhone, setCitySupportPhone] = useState('');
  const [bannerSearchTerm, setBannerSearchTerm] = useState('');
  const [storageUsage, setStorageUsage] = useState(0);
  const [restaurantSearchTerm, setRestaurantSearchTerm] = useState('');
  const [walletSearchTerm, setWalletSearchTerm] = useState('');
  const [managerSearchTerm, setManagerSearchTerm] = useState('');
  const [revenueCityFilter, setRevenueCityFilter] = useState('all');
  const [revenueDayFilter, setRevenueDayFilter] = useState(new Date().toISOString().split('T')[0]);
  const [pendingOrderSoundUrl, setPendingOrderSoundUrl] = useState<string | null>(null);
  const [isSavingSound, setIsSavingSound] = useState(false);
  const [pageViews, setPageViews] = useState<any[]>([]);
  const [showRestaurantMap, setShowRestaurantMap] = useState(false);
  const [showUserMap, setShowUserMap] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [isSavingGlobals, setIsSavingGlobals] = useState(false);
  const [showSettingsSuccess, setShowSettingsSuccess] = useState(false);

  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [quickEditRestaurantId, setQuickEditRestaurantId] = useState<string | null>(null);
  const [quickEditName, setQuickEditName] = useState('');
  const [quickEditWhatsapp, setQuickEditWhatsapp] = useState('');
  const [quickEditCity, setQuickEditCity] = useState('');
  const [quickEditStatus, setQuickEditStatus] = useState('');
  const [partnerToDelete, setPartnerToDelete] = useState<string | null>(null);
  const [isDeletingPartnerModalOpen, setIsDeletingPartnerModalOpen] = useState(false);
  const [restaurantToDelete, setRestaurantToDelete] = useState<Restaurant | null>(null);
  const [isDeletingRestaurantModalOpen, setIsDeletingRestaurantModalOpen] = useState(false);
  const [copiedPartnerId, setCopiedPartnerId] = useState<string | null>(null);
  const [creditAmount, setCreditAmount] = useState<string>('');
  const [creditAction, setCreditAction] = useState<'add' | 'remove'>('add');
  const [selectedRestaurantForCredit, setSelectedRestaurantForCredit] = useState<Restaurant | null>(null);
  const [isProcessingCredit, setIsProcessingCredit] = useState(false);
  const [creditMessage, setCreditMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // City Management State
  const [isAddingCity, setIsAddingCity] = useState(false);
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const [cityName, setCityName] = useState('');
  const [cityApiUrl, setCityApiUrl] = useState('');
  const [cityApiKey, setCityApiKey] = useState('');
  const [cityAuthEmail, setCityAuthEmail] = useState('');
  const [cityAuthPassword, setCityAuthPassword] = useState('');
  const [cityLat, setCityLat] = useState<number | null>(null);
  const [cityLng, setCityLng] = useState<number | null>(null);
  const [isSearchingCity, setIsSearchingCity] = useState(false);

  // Juruti Template for new cities
  const JURUTI_TEMPLATE = {
    name: 'Juruti',
    apiUrl: 'https://meupaineldegestao.com.br',
    apiKey: 'mch_api_102PEeeeYfz07k2RQFpD21LE',
    authEmail: 'tupamobilidadeurbana@gmail.com',
    authPassword: '@Ehbc7890',
    lat: -2.1571381,
    lng: -56.0900977
  };

  const [resManagerPassword, setResManagerPassword] = useState('');
  const [originalManagerPassword, setOriginalManagerPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const [restaurantsLimit, setRestaurantsLimit] = useState(20);
  const [usersLimit, setUsersLimit] = useState(3);
  const [bannersLimit, setBannersLimit] = useState(3);
  const [categoriesLimit, setCategoriesLimit] = useState(10);
  const [ordersLimit, setOrdersLimit] = useState(3);
  const [partnersLimit, setPartnersLimit] = useState(3);
  const [realTimeOrdersLimit, setRealTimeOrdersLimit] = useState(3);
  const [splitPayHistory, setSplitPayHistory] = useState<any[]>([]);
  const [citySearch, setCitySearch] = useState('');
  const [showCityColumn, setShowCityColumn] = useState(false);

  // Partner Management State
  const [partners, setPartners] = useState<Branch[]>([]);
  const [isAddingPartner, setIsAddingPartner] = useState(false);
  const [partnerName, setPartnerName] = useState('');
  const [partnerCityId, setPartnerCityId] = useState('');
  const [partnerPassword, setPartnerPassword] = useState('');
  const [partnerViewTab, setPartnerViewTab] = useState<'stats' | 'restaurants'>('stats');
  const [selectedRestaurantInPartnerView, setSelectedRestaurantInPartnerView] = useState<Restaurant | null>(null);
  const [selectedPartner, setSelectedPartner] = useState<Branch | null>(null);
  const [partnerDateStart, setPartnerDateStart] = useState(new Date().toISOString().split('T')[0]);
  const [partnerDateEnd, setPartnerDateEnd] = useState(new Date().toISOString().split('T')[0]);
  const [appliedPartnerDateStart, setAppliedPartnerDateStart] = useState(new Date().toISOString().split('T')[0]);
  const [appliedPartnerDateEnd, setAppliedPartnerDateEnd] = useState(new Date().toISOString().split('T')[0]);
  const [isPartnerViewOpen, setIsPartnerViewOpen] = useState(false);
  const [partnerTransactions, setPartnerTransactions] = useState<any[]>([]);
  const [partnerTransactionFilter, setPartnerTransactionFilter] = useState<'all' | 'manual' | 'recharge' | 'subscription'>('all');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testingCityId, setTestingCityId] = useState<string | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [cityConnectionStatus, setCityConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [cityConnectionError, setCityConnectionError] = useState<string | null>(null);
  const [debouncedCityName, setDebouncedCityName] = useState('');
  const lastTestedRef = useRef('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCityName(cityName);
    }, 100);
    return () => clearTimeout(timer);
  }, [cityName]);

  // Automatic Partner Creation
  useEffect(() => {
    if (!partners.length && !restaurants.length && !users.length) return;

    const createMissingPartners = async () => {
      const citiesWithActivity = new Set<string>();
      restaurants.forEach(r => { if (r.city) citiesWithActivity.add(r.city); });
      users.forEach(u => { if (u.city) citiesWithActivity.add(u.city); });

      for (const cityName of Array.from(citiesWithActivity)) {
        const existingPartner = partners.find(p => p.cityName === cityName);
        if (!existingPartner) {
          try {
            const city = cities.find(c => c.name === cityName);
            const cityId = city?.id || cityName;
            const restaurantsInCity = restaurants.filter(r => r.city === cityName);
            const restaurantIds = restaurantsInCity.map(r => r.id);

            // Calculate historical totals
            const cityTransactions = (partnerTransactions || []).filter(t => {
              if (!t) return false;
              const hasRestaurantId = t.restaurantId && Array.isArray(restaurantIds) && restaurantIds.includes(t.restaurantId);
              const hasCityName = t.cityName === cityName;
              return hasRestaurantId || hasCityName;
            });

            const totalEarnings = cityTransactions.reduce((acc, t) => acc + (Number(t?.amount) || 0), 0);
            const pixRecharges = cityTransactions.filter(t => t?.method === 'pix').reduce((acc, t) => acc + (Number(t?.amount) || 0), 0);
            const manualRecharges = cityTransactions.filter(t => t?.method === 'manual').reduce((acc, t) => acc + (Number(t?.amount) || 0), 0);
            
            const today = new Date().toISOString().split('T')[0];
            const dailyRevenue = cityTransactions.filter(t => {
              if (!t) return false;
              const txDate = t.timestamp?.toDate ? t.timestamp.toDate().toISOString().split('T')[0] : t.date;
              return txDate === today;
            }).reduce((acc, t) => acc + (Number(t?.amount) || 0), 0);

            const branchId = cityName.trim();
            await setDoc(doc(db, 'branches', branchId), {
              name: `Sócio ${cityName}`,
              cityId: cityId,
              cityName: cityName,
              createdAt: serverTimestamp(),
              total_restaurantes: restaurantsInCity.length,
              ganhos_gerais: totalEarnings,
              recargas_pix: pixRecharges,
              recargas_manuais: manualRecharges,
              faturamento_hoje: dailyRevenue
            }, { merge: true }); // Use merge to avoid overwriting existing data

            // Update associations
            for (const res of restaurantsInCity) {
              if (!res.branchId) {
                await updateDoc(doc(db, 'restaurants', res.id), { branchId });
              }
            }
            const usersInCity = users.filter(u => u.city === cityName);
            for (const u of usersInCity) {
              if (!u.branchId) {
                await setDoc(doc(db, 'users', u.uid), { branchId, cityId }, { merge: true });
              }
            }
          } catch (error) {
            console.error(`Error creating automatic partner for ${cityName}:`, error);
          }
        }
      }
    };

    const timer = setTimeout(() => {
      // Only run if we are reasonably sure data is loaded
      if (partners.length > 0 || restaurants.length > 0) {
        createMissingPartners();
      }
    }, 10000);
    return () => clearTimeout(timer);
  }, [restaurants, users, partners, cities, partnerTransactions]);

  // Automatic connection test when API info is filled
  useEffect(() => {
    if (!isAddingCity) {
      setCityConnectionStatus('idle');
      setCityConnectionError(null);
      lastTestedRef.current = '';
      return;
    }

    const canTest = cityApiUrl && cityApiKey && cityName;
    if (!canTest) return;

    // Create a unique key for the current configuration to avoid re-testing the same thing
    const currentConfig = `${cityName}-${cityApiUrl}-${cityApiKey}-${cityAuthEmail}-${cityAuthPassword}-${cityLat}-${cityLng}`;
    if (currentConfig === lastTestedRef.current) return;

    const testTimer = setTimeout(() => {
      lastTestedRef.current = currentConfig;
      testCityConnection({
        id: editingCity?.id || 'temp',
        name: cityName,
        apiUrl: cityApiUrl,
        apiKey: cityApiKey,
        authEmail: cityAuthEmail,
        authPassword: cityAuthPassword,
        lat: cityLat,
        lng: cityLng,
        status: 'offline'
      } as any);
    }, 1000); // Reduced to 1 second for better responsiveness

    return () => clearTimeout(testTimer);
  }, [cityApiUrl, cityApiKey, cityAuthEmail, cityAuthPassword, isAddingCity, cityLat, cityLng, cityName]);

  // Reset city state when closing the form
  useEffect(() => {
    if (!isAddingCity) {
      setCityName('');
      setCityApiUrl('');
      setCityApiKey('');
      setCityAuthEmail('');
      setCityAuthPassword('');
      setCityLat(null);
      setCityLng(null);
      setCityConnectionStatus('idle');
      setCityConnectionError(null);
      lastTestedRef.current = '';
    }
  }, [isAddingCity]);

  // Gallery State
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [galleryTarget, setGalleryTarget] = useState<'banner' | 'category' | null>(null);

  // Banner form
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [bannerLink, setBannerLink] = useState('');
  const [bannerLinkType, setBannerLinkType] = useState<'external' | 'restaurant' | 'product'>('external');
  const [bannerLinkId, setBannerLinkId] = useState('');
  const [bannerAudioUrl, setBannerAudioUrl] = useState('');
  const [bannerMediaType, setBannerMediaType] = useState<'image' | 'video' | 'gif'>('image');
  const [bannerPosition, setBannerPosition] = useState({ x: 50, y: 50 });
  const [bannerCities, setBannerCities] = useState<string[]>([]);

  // Category form
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState('Utensils');
  const [catImageUrl, setCatImageUrl] = useState('');
  const [catStatus, setCatStatus] = useState<'active' | 'inactive'>('active');
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  // Restaurant form
  const [resName, setResName] = useState('');
  const [resModality, setResModality] = useState('');
  const [resStatus, setResStatus] = useState('active');
  const [resOwnerUid, setResOwnerUid] = useState('');
  const [resDesc, setResDesc] = useState('');
  const [resImg, setResImg] = useState('');
  const [resCity, setResCity] = useState('');
  const [resCityId, setResCityId] = useState('');
  const [resBranchId, setResBranchId] = useState('');
  const [resPixConfigType, setResPixConfigType] = useState<'company' | 'central' | 'none'>('none');
  const [resPixKey, setResPixKey] = useState('');
  const [resOrderSoundUrl, setResOrderSoundUrl] = useState('');
  const [resMessageSoundUrl, setResMessageSoundUrl] = useState('');
  const [resPixType, setResPixType] = useState<'cpf' | 'cnpj' | 'email' | 'phone' | 'random'>('cpf');
  const [resWhatsapp, setResWhatsapp] = useState('');
  const [resReferencePoint, setResReferencePoint] = useState('');
  const [resOpen, setResOpen] = useState('08:00');
  const [resClose, setResClose] = useState('22:00');
  const [resAutoVolume, setResAutoVolume] = useState(false);
  const [resScreenOverlay, setResScreenOverlay] = useState(false);
  const [resSubscriptionActive, setResSubscriptionActive] = useState(false);
  const [weeklyHours, setWeeklyHours] = useState<WeeklyHours>({
    monday: { open: '08:00', close: '22:00', closed: false, closesForLunch: false, lunchStart: '12:00', lunchEnd: '14:00' },
    tuesday: { open: '08:00', close: '22:00', closed: false, closesForLunch: false, lunchStart: '12:00', lunchEnd: '14:00' },
    wednesday: { open: '08:00', close: '22:00', closed: false, closesForLunch: false, lunchStart: '12:00', lunchEnd: '14:00' },
    thursday: { open: '08:00', close: '22:00', closed: false, closesForLunch: false, lunchStart: '12:00', lunchEnd: '14:00' },
    friday: { open: '08:00', close: '22:00', closed: false, closesForLunch: false, lunchStart: '12:00', lunchEnd: '14:00' },
    saturday: { open: '08:00', close: '22:00', closed: false, closesForLunch: false, lunchStart: '12:00', lunchEnd: '14:00' },
    sunday: { open: '08:00', close: '22:00', closed: true, closesForLunch: false, lunchStart: '12:00', lunchEnd: '14:00' },
  });
  const [isAddingRestaurant, setIsAddingRestaurant] = useState(false);

  // SplitPay State
  const [editingSplitPay, setEditingSplitPay] = useState<Restaurant | null>(null);
  const [spPixKey, setSpPixKey] = useState('');
  const [spPixType, setSpPixType] = useState<'cpf' | 'cnpj' | 'email' | 'phone' | 'random'>('cpf');
  const [spFee, setSpFee] = useState(0);
  const [spFeeType, setSpFeeType] = useState<'fixed' | 'percent'>('fixed');
  const [spActive, setSpActive] = useState(false);

  useEffect(() => {
    if (!isSettingsLoaded) return; // Bypassed: user/role check removed as requested
    
    const timer = setTimeout(async () => {
      try {
        await setDoc(doc(db, 'settings', 'global'), { 
          mercadoPagoPublicKey: settings.mercadoPagoPublicKey || '',
          mercadoPagoAccessToken: settings.mercadoPagoAccessToken || '',
          manualRechargeUrl: settings.manualRechargeUrl || '',
          centralPixKey: settings.centralPixKey || '',
          centralPixType: settings.centralPixType || 'cpf',
          appName: settings.appName || '',
          allCategoryImageUrl: settings.allCategoryImageUrl || '',
          splashText: settings.splashText || '',
          splashMediaUrl: settings.splashMediaUrl || '',
          splashMediaType: settings.splashMediaType || 'image',
          splashAudioUrl: settings.splashAudioUrl || '',
          activeEffect: settings.activeEffect || 'none',
          highlightDailyCost: settings.highlightDailyCost || 7,
          tupaDeliveryBaseValue: settings.tupaDeliveryBaseValue || 0,
          tupaDeliveryKmValue: settings.tupaDeliveryKmValue || 0,
          tupaDeliveryMinDistance: settings.tupaDeliveryMinDistance || 0,
          tupaDeliveryMaxDistance: settings.tupaDeliveryMaxDistance || 0,
          tupaDeliveryName: settings.tupaDeliveryName || '',
          tupaDeliveryEstimatedTime: settings.tupaDeliveryEstimatedTime || ''
        }, { merge: true });
      } catch (error: any) {
        if (error.code === 'permission-denied') {
          console.warn("Auto-save skipped: Missing permissions. This is expected if you are not an admin.");
        } else {
          console.error("Auto-save error:", error);
          handleFirestoreError(error, OperationType.WRITE, 'settings/global');
        }
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [
    settings.mercadoPagoPublicKey, 
    settings.mercadoPagoAccessToken, 
    settings.manualRechargeUrl,
    settings.centralPixKey, 
    settings.centralPixType,
    settings.appName,
    settings.allCategoryImageUrl,
    settings.splashText,
    settings.splashMediaUrl,
    settings.splashMediaType,
    settings.splashAudioUrl,
    settings.activeEffect,
    settings.tupaDeliveryBaseValue,
    settings.tupaDeliveryKmValue,
    settings.tupaDeliveryMinDistance,
    settings.tupaDeliveryMaxDistance,
    settings.tupaDeliveryName,
    settings.tupaDeliveryEstimatedTime,
    isSettingsLoaded,
    user,
    profile
  ]);

  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | 'pending' | 'preparing' | 'dispatched' | 'completed' | 'cancelled'>('all');
  const [orderRestaurantFilter, setOrderRestaurantFilter] = useState('all');
  const [orderDateFilter, setOrderDateFilter] = useState<'today' | 'yesterday' | 'week' | 'month' | 'all'>('today');
  const filteredOrders = useMemo(() => {
    return allOrders
      .filter(o => {
        const matchesSearch = 
          (o.id?.toLowerCase() || '').includes(orderSearchTerm.toLowerCase()) ||
          o.customerName?.toLowerCase().includes(orderSearchTerm.toLowerCase()) ||
          o.customerEmail?.toLowerCase().includes(orderSearchTerm.toLowerCase());
        
        const matchesStatus = orderStatusFilter === 'all' || o.status === orderStatusFilter;
        const matchesRestaurant = orderRestaurantFilter === 'all' || o.restaurantId === orderRestaurantFilter;
        
        const orderDate = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt || 0);
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const orderDateStr = orderDate.toISOString().split('T')[0];
        
        let matchesDate = true;
        if (orderDateFilter === 'today') matchesDate = orderDateStr === todayStr;
        else if (orderDateFilter === 'yesterday') {
          const yesterday = new Date(now);
          yesterday.setDate(now.getDate() - 1);
          matchesDate = orderDateStr === yesterday.toISOString().split('T')[0];
        } else if (orderDateFilter === 'week') {
          const weekAgo = new Date(now);
          weekAgo.setDate(now.getDate() - 7);
          matchesDate = orderDate >= weekAgo;
        } else if (orderDateFilter === 'month') {
          const monthAgo = new Date(now);
          monthAgo.setMonth(now.getMonth() - 1);
          matchesDate = orderDate >= monthAgo;
        }
        
        return matchesSearch && matchesStatus && matchesRestaurant && matchesDate;
      })
      .sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB.getTime() - dateA.getTime();
      });
  }, [allOrders, orderSearchTerm, orderStatusFilter, orderRestaurantFilter, orderDateFilter]);

  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      
      // Log the action
      await addDoc(collection(db, 'admin_logs'), {
        adminUid: user?.uid || 'public_admin',
        adminEmail: user?.email || 'public@admin.com',
        action: `Alterou status do pedido ${orderId.slice(-8).toUpperCase()} para ${newStatus}`,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const handleCreditAction = async () => {
    if (!selectedRestaurantForCredit || !creditAmount || isNaN(Number(creditAmount)) || isProcessingCredit) return;
    
    setIsProcessingCredit(true);
    setCreditMessage(null);
    
    try {
      const amount = Number(creditAmount);
      const restaurant = selectedRestaurantForCredit;
      const targetUid = restaurant.ownerUid || restaurant.id;
      const actionType = creditAction; // 'add' or 'remove'

      await runTransaction(db, async (transaction) => {
        const walletRef = doc(db, 'wallets', targetUid);
        const walletSnap = await transaction.get(walletRef);
        
        let currentBalance = 0;
        if (walletSnap.exists()) {
          currentBalance = walletSnap.data().balance || 0;
        }
        
        const newBalance = actionType === 'add' ? currentBalance + amount : currentBalance - amount;
        
        transaction.set(walletRef, {
          ownerUid: targetUid,
          balance: newBalance,
          updatedAt: serverTimestamp()
        }, { merge: true });

        // Add to wallet history
        const transRef = doc(collection(db, 'wallet_transactions'));
        transaction.set(transRef, {
          ownerUid: targetUid,
          amount: amount,
          type: actionType,
          status: 'completed',
          description: `Ajuste administrativo (${actionType === 'add' ? 'Adição' : 'Redução'}) por ${user?.email || 'admin@gestao.com'}`,
          createdAt: serverTimestamp()
        });

        // Record Admin Log
        const logRef = doc(collection(db, 'admin_logs'));
        transaction.set(logRef, {
          adminUid: user?.uid || 'admin',
          adminEmail: user?.email || 'admin@gestao.com',
          action: `${actionType === 'add' ? 'Adicionou' : 'Removeu'} R$ ${amount.toFixed(2)} de crédito para o restaurante ${restaurant.name}`,
          timestamp: serverTimestamp()
        });
      });

      // Update Branch Totals (Legacy support for dashboard widgets)
      if (restaurant.branchId) {
        try {
          const branchRef = doc(db, 'branches', restaurant.branchId);
          const incrementAmount = actionType === 'add' ? amount : -amount;
          await updateDoc(branchRef, {
            recargas_manuais: increment(incrementAmount),
            ganhos_gerais: increment(incrementAmount)
          });
        } catch (brErr) {
          console.warn('[Admin] Branch update failed:', brErr);
        }
      }

      setCreditMessage({ 
        type: 'success', 
        text: `Crédito ${actionType === 'add' ? 'adicionado' : 'removido'} com sucesso!` 
      });
      
      setTimeout(() => {
        setIsCreditModalOpen(false);
        setCreditAmount('');
        setCreditMessage(null);
      }, 1500);
      
    } catch (error: any) {
      console.error("Error updating credit:", error);
      const errorMsg = error.message || 'Erro deconhecido';
      setCreditMessage({ 
        type: 'error', 
        text: `Erro ao processar: ${errorMsg}` 
      });
    } finally {
      setIsProcessingCredit(false);
    }
  };

  const handleAutoCredit = async (target: { uid: string; name: string; branchId?: string }) => {
    if (isProcessingCredit) return;
    setIsProcessingCredit(true);
    
    try {
      const targetUid = target.uid;
      const amount = 10;
      const actionType = 'add';

      await runTransaction(db, async (transaction) => {
        const walletRef = doc(db, 'wallets', targetUid);
        const walletSnap = await transaction.get(walletRef);
        
        let currentBalance = 0;
        if (walletSnap.exists()) {
          currentBalance = walletSnap.data().balance || 0;
        }
        
        const newBalance = currentBalance + amount;
        
        transaction.set(walletRef, {
          ownerUid: targetUid,
          balance: newBalance, // Direct numeric increment in transaction
          updatedAt: serverTimestamp()
        }, { merge: true });

        // Add to wallet history
        const transRef = doc(collection(db, 'wallet_transactions'));
        transaction.set(transRef, {
          ownerUid: targetUid,
          amount: amount,
          type: actionType,
          status: 'completed',
          description: `Ajuste automático (+R$ 10) por ${user?.email || 'admin@gestao.com'}`,
          createdAt: serverTimestamp()
        });

        // Record Admin Log
        const logRef = doc(collection(db, 'admin_logs'));
        transaction.set(logRef, {
          adminUid: user?.uid || 'admin',
          adminEmail: user?.email || 'admin@gestao.com',
          action: `Adicionou R$ 10.00 (AUTO) de crédito para ${target.name}`,
          timestamp: serverTimestamp()
        });
      });

      if (target.branchId) {
        try {
          const branchRef = doc(db, 'branches', target.branchId);
          await updateDoc(branchRef, {
            recargas_manuais: increment(amount),
            ganhos_gerais: increment(amount)
          });
        } catch (brErr) {
          console.warn('[Admin] Branch update failed:', brErr);
        }
      }

      setCreditMessage({ type: 'success', text: `R$ 10,00 adicionados com sucesso para ${target.name}!` });
      setTimeout(() => setCreditMessage(null), 3000);
    } catch (error: any) {
      console.error("Error updating auto credit:", error);
      setCreditMessage({ type: 'error', text: 'Erro ao processar crédito automático: ' + (error.message || 'Erro deconhecido') });
      setTimeout(() => setCreditMessage(null), 5000);
    } finally {
      setIsProcessingCredit(false);
    }
  };

  const [categorySchedules, setCategorySchedules] = useState<CategorySchedule[]>([]);

  const [isAddingSchedule, setIsAddingSchedule] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<CategorySchedule | null>(null);
  const [schedName, setSchedName] = useState('');
  const [schedStart, setSchedStart] = useState('08:00');
  const [schedEnd, setSchedEnd] = useState('18:00');
  const [schedCategories, setSchedCategories] = useState<string[]>([]);
  const [schedActive, setSchedActive] = useState(true);

  // Sync with pre-loaded adminData
  useEffect(() => {
    setRestaurants(adminData.restaurants);
    setBanners(adminData.banners);
    setCategories(adminData.categories);
    setUsers(adminData.users);
    setCities(adminData.cities);
    setAllOrders(adminData.orders);
    setWallets(adminData.wallets);
  }, [adminData]);

  useEffect(() => {
    // Global essential listeners are now handled by AuthContext (adminData)
    // We only need to handle cleanup if we had local listeners
    return () => {};
  }, [user]);

  useEffect(() => {
    if (!selectedRestaurantForMenu) {
      setRestaurantProducts([]);
      return;
    }

    const q = query(collection(db, 'food_items'), where('restaurantId', '==', selectedRestaurantForMenu.id));
    const unsub = onSnapshot(q, (snapshot) => {
      setRestaurantProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'food_items'));

    return () => unsub();
  }, [selectedRestaurantForMenu]);

  // Tab-specific listeners
  useEffect(() => {
    if (!user) return;

    let unsubBanners = () => {};
    let unsubProducts = () => {};
    let unsubCategories = () => {};
    let unsubPayments = () => {};
    let unsubSplitHistory = () => {};
    let unsubPageViews = () => {};
    let unsubLogs = () => {};
    let unsubSchedules = () => {};
    let unsubBranches = () => {};
    let unsubBusinessCategories = () => {};
    let unsubWalletTransactions = () => {};
    let unsubWallets = () => {};

    if (activeTab === 'banners') {
      unsubBanners = onSnapshot(collection(db, 'promotional_banners'), (snapshot) => {
        setBanners(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Banner)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'promotional_banners'));
      unsubProducts = onSnapshot(collection(db, 'food_items'), (snapshot) => {
        setAllProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'food_items'));
    }

    if (activeTab === 'categories') {
      unsubCategories = onSnapshot(collection(db, 'categories'), (snapshot) => {
        setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'categories'));
      unsubBusinessCategories = onSnapshot(collection(db, 'business_categories'), (snapshot) => {
        setBusinessCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'business_categories'));
    }

    if (activeTab === 'wallet' || activeTab === 'subscriptions' || activeTab === 'partners' || activeTab === 'mercadopago') {
      unsubPayments = onSnapshot(query(collection(db, 'payments'), orderBy('createdAt', 'desc'), limit(100)), (snapshot) => {
        setPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'payments'));
      
      unsubWalletTransactions = onSnapshot(query(collection(db, 'wallet_transactions'), orderBy('createdAt', 'desc'), limit(200)), (snapshot) => {
        setPartnerTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'wallet_transactions'));
      
      unsubWallets = onSnapshot(collection(db, 'wallets'), (snapshot) => {
        setWallets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'wallets'));
    }

    if (activeTab === 'mercadopago') {
      unsubSplitHistory = onSnapshot(query(collection(db, 'splitpay_history'), orderBy('createdAt', 'desc'), limit(50)), (snapshot) => {
        setSplitPayHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'splitpay_history'));
    }

    if (activeTab === 'analytics') {
      unsubPageViews = onSnapshot(query(collection(db, 'page_views'), orderBy('timestamp', 'desc'), limit(100)), (snapshot) => {
        setPageViews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'page_views'));
    }

    if (activeTab === 'security') {
      unsubLogs = onSnapshot(query(collection(db, 'admin_logs'), orderBy('timestamp', 'desc'), limit(100)), (snapshot) => {
        setAdminLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'admin_logs'));
    }

    if (activeTab === 'schedules') {
      unsubSchedules = onSnapshot(collection(db, 'category_schedules'), (snapshot) => {
        setCategorySchedules(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CategorySchedule)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'category_schedules'));
    }

    if (activeTab === 'partners') {
      unsubBranches = onSnapshot(collection(db, 'branches'), (snapshot) => {
        setPartners(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Branch)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'branches'));
    }

    return () => {
      unsubBanners();
      unsubProducts();
      unsubCategories();
      unsubPayments();
      unsubSplitHistory();
      unsubPageViews();
      unsubLogs();
      unsubSchedules();
      unsubBranches();
      unsubBusinessCategories();
      unsubWalletTransactions();
      unsubWallets();
    };
  }, [user, activeTab]);

  useEffect(() => {
    if (globalSettings) {
      setSettings(prev => ({ ...prev, ...globalSettings }));
      setIsSettingsLoaded(true);
    }
  }, [globalSettings]);

  useEffect(() => {
    const totalDocs = users.length + restaurants.length + payments.length + banners.length + categories.length + cities.length;
    const usage = Math.min(Math.round((totalDocs / 10000) * 100), 100);
    setStorageUsage(usage);
  }, [users, restaurants, payments, banners, categories, cities]);

  // 3-second polling for restaurant wallets as requested
  useEffect(() => {
    if (!user || activeTab !== 'restaurants') return;

    const pollInterval = setInterval(async () => {
      try {
        const walletsSnap = await getDocs(collection(db, 'wallets'));
        const updatedWallets = walletsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setWallets(updatedWallets);
      } catch (error) {
        console.error('Error polling wallets:', error);
      }
    }, 3000); // Restaurado para 3 segundos para feedback imediato conforme lógica original

    return () => clearInterval(pollInterval);
  }, [user, activeTab]);

  const filteredUsers = users
    .filter(u => {
      const matchesSearch = 
        u.displayName?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        u.cpf?.includes(userSearchTerm);
      
      const userOrders = allOrders.filter(o => o.customerUid === u.uid);
      const userDate = u.createdAt?.toDate ? u.createdAt.toDate() : new Date(u.createdAt || 0);
      
      const startDate = userStartDate ? new Date(userStartDate) : null;
      const endDate = userEndDate ? new Date(userEndDate) : null;
      
      if (endDate) endDate.setHours(23, 59, 59, 999);

      const matchesDate = (!startDate || userDate >= startDate) && (!endDate || userDate <= endDate);
      
      return matchesSearch && matchesDate;
    })
    .sort((a, b) => {
      if (userSortBy === 'orders') {
        const aOrders = allOrders.filter(o => o.customerUid === a.uid).length;
        const bOrders = allOrders.filter(o => o.customerUid === b.uid).length;
        return bOrders - aOrders;
      }
      if (userSortBy === 'sales') {
        const aSales = allOrders.filter(o => o.customerUid === a.uid).reduce((acc, o) => acc + (o.total || 0), 0);
        const bSales = allOrders.filter(o => o.customerUid === b.uid).reduce((acc, o) => acc + (o.total || 0), 0);
        return bSales - aSales;
      }
      // Default: recent
      const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return bDate.getTime() - aDate.getTime();
    });

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  const cityStats = useMemo(() => {
    if (activeTab !== 'cities' && activeTab !== 'analytics') return {};
    
    const stats: Record<string, { managers: Set<string>; clients: Set<string> }> = {};

    cities.forEach(city => {
      stats[city.name] = { managers: new Set(), clients: new Set() };
    });

    const getNearestCityName = (lat: number, lng: number) => {
      let nearest = null;
      let minDistance = Infinity;
      cities.forEach(city => {
        if (city.lat && city.lng) {
          const dist = calculateDistance(lat, lng, city.lat, city.lng);
          if (dist < minDistance) {
            minDistance = dist;
            nearest = city.name;
          }
        }
      });
      return minDistance < 50 ? nearest : null; // Only if within 50km
    };

    users.forEach(u => {
      let cityName = u.city;
      
      if (!cityName && u.latitude && u.longitude) {
        cityName = getNearestCityName(u.latitude, u.longitude) || undefined;
      }

      if (cityName && stats[cityName]) {
        if (u.role === 'manager') {
          stats[cityName].managers.add(u.uid);
        } else if (u.role === 'customer') {
          stats[cityName].clients.add(u.uid);
        }
      }
    });

    restaurants.forEach(r => {
      if (r.city && r.ownerUid && stats[r.city]) {
        stats[r.city].managers.add(r.ownerUid);
      }
    });

    allOrders.forEach(o => {
      let cityName = o.city;
      if (!cityName && o.customerLocation?.latitude && o.customerLocation?.longitude) {
        cityName = getNearestCityName(o.customerLocation.latitude, o.customerLocation.longitude) || undefined;
      }
      if (cityName && o.customerUid && stats[cityName]) {
        stats[cityName].clients.add(o.customerUid);
      }
    });

    const result: Record<string, { managers: number; clients: number }> = {};
    Object.keys(stats).forEach(cityName => {
      result[cityName] = {
        managers: stats[cityName].managers.size,
        clients: stats[cityName].clients.size
      };
    });
    return result;
  }, [cities, users, restaurants, allOrders]);

  const [restaurantSortBy, setRestaurantSortBy] = useState<'recent' | 'sales'>('recent');
  const [restaurantStartDate, setRestaurantStartDate] = useState('');
  const [restaurantEndDate, setRestaurantEndDate] = useState('');

  const filteredRestaurants = useMemo(() => {
    return restaurants
      .filter(r => {
        const matchesSearch = 
          r.name?.toLowerCase().includes(restaurantSearchTerm.toLowerCase()) ||
          r.id?.toLowerCase().includes(restaurantSearchTerm.toLowerCase());
        
        const resDate = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt || 0);
        const startDate = restaurantStartDate ? new Date(restaurantStartDate) : null;
        const endDate = restaurantEndDate ? new Date(restaurantEndDate) : null;
        if (endDate) endDate.setHours(23, 59, 59, 999);

        const matchesDate = (!startDate || resDate >= startDate) && (!endDate || resDate <= endDate);
        
        return matchesSearch && matchesDate;
      })
      .sort((a, b) => {
        // Sort by isFamous first (as a proxy for "top rated" since rating field is missing)
        if (a.isFamous && !b.isFamous) return -1;
        if (!a.isFamous && b.isFamous) return 1;

        if (restaurantSortBy === 'sales') {
          const aSales = allOrders.filter(o => o.restaurantId === a.id && o.status === 'completed').reduce((acc, o) => acc + (o.total || 0), 0);
          const bSales = allOrders.filter(o => o.restaurantId === b.id && o.status === 'completed').reduce((acc, o) => acc + (o.total || 0), 0);
          return bSales - aSales;
        }
        const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return bDate.getTime() - aDate.getTime();
      });
  }, [restaurants, restaurantSearchTerm, restaurantStartDate, restaurantEndDate, restaurantSortBy, allOrders]);

  const displayedRestaurants = useMemo(() => {
    return filteredRestaurants.slice(0, restaurantsLimit);
  }, [filteredRestaurants, restaurantsLimit]);

  const displayedBanners = useMemo(() => {
    return banners.slice(0, bannersLimit);
  }, [banners, bannersLimit]);

  const displayedCategories = useMemo(() => {
    return categories.slice(0, categoriesLimit);
  }, [categories, categoriesLimit]);

  const displayedOrders = useMemo(() => {
    return filteredOrders.slice(0, ordersLimit);
  }, [filteredOrders, ordersLimit]);

  const filteredManagers = useMemo(() => {
    return users.filter(u => 
      u.role === 'manager' && (
        u.displayName?.toLowerCase().includes(managerSearchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(managerSearchTerm.toLowerCase())
      )
    );
  }, [users, managerSearchTerm]);

  const displayedUsers = useMemo(() => {
    return filteredUsers.slice(0, usersLimit);
  }, [filteredUsers, usersLimit]);

  const displayedPartners = useMemo(() => {
    return partners.slice(0, partnersLimit);
  }, [partners, partnersLimit]);

  const activeOrders = useMemo(() => {
    return allOrders.filter(o => ['pending', 'accepted', 'preparing', 'delivering'].includes(o.status));
  }, [allOrders]);

  const handleToggleIntegration = async (city: City) => {
    try {
      const newState = !city.integrationActive;
      await updateDoc(doc(db, 'cities', city.id), {
        integrationActive: newState
      });
    } catch (error) {
      console.error("Error toggling integration:", error);
      handleFirestoreError(error, OperationType.UPDATE, `cities/${city.id}`);
    }
  };

  const handleLinkCity = async (sourceCity: City) => {
    if (!targetCityForLinking) return;
    try {
      await updateDoc(doc(db, 'cities', targetCityForLinking.id), {
        apiUrl: (sourceCity.apiUrl || '').trim(),
        apiKey: (sourceCity.apiKey || '').trim(),
        authEmail: (sourceCity.authEmail || '').trim(),
        authPassword: (sourceCity.authPassword || '').trim(),
        categories: sourceCity.categories || [],
        status: 'online',
        integrationActive: true,
        lastChecked: new Date().toISOString()
      });
      setIsLinkingModalOpen(false);
      setTargetCityForLinking(null);
      const catNames = (sourceCity.categories || []).map(c => c.nome).join(', ');
      alert(`Configurações de ${sourceCity.name} replicadas em ${targetCityForLinking.name} com sucesso!\n\nCategorias puxadas: ${catNames || 'Nenhuma'}`);
    } catch (error) {
      console.error("Error linking city:", error);
      handleFirestoreError(error, OperationType.UPDATE, `cities/${targetCityForLinking.id}`);
    }
  };

  const handleUpdateRestaurantDeduction = async (restaurantId: string, amount: number) => {
    try {
      await updateDoc(doc(db, 'restaurants', restaurantId), {
        customOrderDeduction: amount,
        updatedAt: serverTimestamp()
      });
      alert('Taxa personalizada atualizada com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `restaurants/${restaurantId}`);
    }
  };

  const filteredWalletRestaurants = useMemo(() => {
    return restaurants.filter(r => 
      (r.name?.toLowerCase() || '').includes(walletSearchTerm.toLowerCase()) ||
      (r.id?.toLowerCase() || '').includes(walletSearchTerm.toLowerCase())
    );
  }, [restaurants, walletSearchTerm]);

  const displayedRealTimeOrders = useMemo(() => {
    return activeOrders.slice(0, realTimeOrdersLimit);
  }, [activeOrders, realTimeOrdersLimit]);

  useEffect(() => {
    if (!user) return;
    
    // 2FA removed as per user request
    return () => {};
  }, [user]);

  // handleAdminLogin removed for public access

  // Periodic Integration Check for All Cities
  useEffect(() => {
    if (!cities || cities.length === 0) return;

    const checkAllConnections = async () => {
      console.log(`[IntegrationCheck] Periodic check for ${cities.length} cities...`);
      for (const city of cities) {
        // Skip check if recently checked (within last 5 minutes)
        if (city.lastChecked) {
          const lastCheck = new Date(city.lastChecked).getTime();
          const now = new Date().getTime();
          if (now - lastCheck < 5 * 60 * 1000) continue;
        }

        try {
          const response = await axios.get('/api/machine/categorias', {
            params: {
              apiUrl: city.apiUrl,
              apiKey: city.apiKey,
              authEmail: city.authEmail,
              authPassword: city.authPassword,
              cityName: city.name
            },
            timeout: 10000
          });

          const isOnline = response.data.success === true;
          const status = isOnline ? 'online' : 'offline';
          
          if (city.status !== status) {
            await updateDoc(doc(db, 'cities', city.id), {
              status,
              lastChecked: new Date().toISOString(),
              categories: isOnline ? (response.data.response || city.categories) : city.categories
            });
          } else {
            // Just update last checked time
            await updateDoc(doc(db, 'cities', city.id), {
              lastChecked: new Date().toISOString()
            });
          }
        } catch (error: any) {
          const status = error.response?.status;
          const errorMsg = error.response?.data?.error || error.message;
          console.error(`[IntegrationCheck] Failed for ${city.name} (Status: ${status}):`, errorMsg);
          
          if (city.status !== 'offline') {
            await updateDoc(doc(db, 'cities', city.id), {
              status: 'offline',
              lastChecked: new Date().toISOString()
            });
          }
        }
      }
    };

    // Run every 2 minutes
    const interval = setInterval(checkAllConnections, 120000);
    // Runs once on mount
    checkAllConnections();

    return () => clearInterval(interval);
  }, [cities.length]);

  const logAdminAccess = async (action: string, success: boolean) => {
    try {
      await addDoc(collection(db, 'admin_logs'), {
        adminUid: user?.uid || 'public_admin',
        adminEmail: user?.email || 'public@admin.com',
        action,
        success,
        timestamp: serverTimestamp(),
        ip: 'hidden'
      });
    } catch (error) {
      console.error("Error logging admin access:", error);
    }
  };

  const toggleSplitPay = async () => {
    try {
      const newStatus = !settings.splitPayEnabled;
      await setDoc(doc(db, 'settings', 'global'), { splitPayEnabled: newStatus }, { merge: true });
      setSettings(prev => ({ ...prev, splitPayEnabled: newStatus }));
    } catch (error) {
      console.error("Error toggling SplitPay:", error);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const handleAddBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerUrl) {
      alert('Por favor, selecione uma imagem para o banner.');
      return;
    }
    try {
      await addDoc(collection(db, 'promotional_banners'), {
        title: bannerTitle,
        imageUrl: bannerUrl,
        linkUrl: bannerLinkType === 'external' ? bannerLink : null,
        linkType: bannerLinkType,
        linkId: bannerLinkType !== 'external' ? bannerLinkId : null,
        mediaType: bannerMediaType,
        audioUrl: bannerAudioUrl || null,
        objectPosition: `${bannerPosition.x}% ${bannerPosition.y}%`,
        active: true,
        cities: bannerCities,
        ownerUid: user?.uid || 'anonymous_admin',
        createdAt: serverTimestamp()
      });
      
      setBannerTitle('');
      setBannerUrl('');
      setBannerLink('');
      setBannerLinkType('external');
      setBannerLinkId('');
      setBannerAudioUrl('');
      setBannerMediaType('image');
      setBannerPosition({ x: 50, y: 50 });
      setBannerCities([]);
      alert('Banner adicionado com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'promotional_banners');
    }
  };

  const handleAddBusinessCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'business_categories'), {
        name: busCatName,
        imageUrl: busCatImageUrl || 'https://picsum.photos/seed/category/200/200',
        status: busCatStatus,
        active: busCatStatus === 'active',
        order: businessCategories.length,
        createdAt: serverTimestamp()
      });
      setIsAddingBusinessCategory(false);
      setBusCatName('');
      setBusCatImageUrl('');
      setBusCatStatus('active');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'business_categories');
    }
  };

  const handleEditBusinessCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBusinessCategory) return;
    try {
      await updateDoc(doc(db, 'business_categories', editingBusinessCategory.id), {
        name: busCatName,
        imageUrl: busCatImageUrl,
        status: busCatStatus,
        active: busCatStatus === 'active'
      });
      setEditingBusinessCategory(null);
      setBusCatName('');
      setBusCatImageUrl('');
      setBusCatStatus('active');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `business_categories/${editingBusinessCategory.id}`);
    }
  };

  const deleteBusinessCategory = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta categoria de empresa?')) {
      try {
        await deleteDoc(doc(db, 'business_categories', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `business_categories/${id}`);
      }
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'categories'), {
        name: catName,
        iconName: catIcon,
        imageUrl: catImageUrl || 'https://picsum.photos/seed/category/200/200',
        status: catStatus,
        active: catStatus === 'active'
      });
      setCatName('');
      setCatIcon('Utensils');
      setCatImageUrl('');
      setCatStatus('active');
      setIsAddingCategory(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'categories');
    }
  };

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'category_schedules'), {
        name: schedName,
        startTime: schedStart,
        endTime: schedEnd,
        categoryIds: schedCategories,
        active: schedActive
      });
      resetScheduleForm();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'category_schedules');
    }
  };

  const handleEditSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSchedule) return;
    try {
      await updateDoc(doc(db, 'category_schedules', editingSchedule.id), {
        name: schedName,
        startTime: schedStart,
        endTime: schedEnd,
        categoryIds: schedCategories,
        active: schedActive
      });
      resetScheduleForm();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `category_schedules/${editingSchedule.id}`);
    }
  };

  const resetScheduleForm = () => {
    setSchedName('');
    setSchedStart('08:00');
    setSchedEnd('18:00');
    setSchedCategories([]);
    setSchedActive(true);
    setIsAddingSchedule(false);
    setEditingSchedule(null);
  };

  const handleDeleteSchedule = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este horário?')) {
      try {
        await deleteDoc(doc(db, 'category_schedules', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `category_schedules/${id}`);
      }
    }
  };

  const toggleFamousStatus = async (restaurantId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'restaurants', restaurantId), {
        isFamous: !currentStatus
      });
    } catch (error) {
      console.error("Error toggling famous status:", error);
    }
  };

  const toggleRestaurantSubscription = async (id: string, currentStatus: string | undefined) => {
    try {
      const resDoc = await getDoc(doc(db, 'restaurants', id));
      const resData = resDoc.data();
      
      const newStatus = currentStatus === 'active' ? 'expired' : 'active';
      const dueDate = newStatus === 'active' 
        ? new Date(Date.now() + (settings.subscriptionDurationDays || 30) * 24 * 60 * 60 * 1000).toISOString()
        : null;
        
      await updateDoc(doc(db, 'restaurants', id), {
        subscriptionStatus: newStatus,
        subscriptionDueDate: dueDate
      });
      
      // Log the transaction
      await addDoc(collection(db, 'wallet_transactions'), {
        restaurantId: id,
        restaurantName: resData?.name || 'Restaurante',
        branchId: resData?.branchId || '',
        cityId: resData?.cityId || resData?.city || '',
        cityName: resData?.city || '',
        type: 'subscription',
        action: newStatus === 'active' ? 'activation' : 'deactivation',
        amount: newStatus === 'active' ? (settings.monthlyFee || 0) : 0,
        adminUid: user?.uid || 'public_admin',
        adminEmail: user?.email || 'public@admin.com',
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp(),
        date: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `restaurants/${id}`);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRestaurantForMenu) return;

    try {
      const parsedPrice = parseFloat(productPrice);
      if (isNaN(parsedPrice)) {
        alert('Por favor, insira um preço válido.');
        return;
      }

      const productData = {
        name: productName,
        description: productDesc,
        price: parsedPrice,
        promoPrice: productPromoPrice ? parseFloat(productPromoPrice) : null,
        isFlashSale: productIsFlash,
        isDeliveryFree: productIsFreeDelivery,
        category: productCat,
        imageUrl: productImg,
        stock: productStock ? parseInt(productStock) : null,
        available: productAvailable,
        availableFrom: productAvailableFrom || null,
        availableUntil: productAvailableUntil || null,
        preparationTimeMinutes: productPreparationTime ? parseInt(productPreparationTime) : null,
        maxAddOns: productMaxAddOns ? parseInt(productMaxAddOns) : null,
        addOns: productAddOns,
        availability: productAvailability,
        restaurantId: selectedRestaurantForMenu.id,
        cityId: selectedRestaurantForMenu.cityId || selectedRestaurantForMenu.city_id || null,
        city: selectedRestaurantForMenu.city || selectedRestaurantForMenu.cidade || null,
        updatedAt: serverTimestamp()
      };

      if (editingProduct) {
        await updateDoc(doc(db, 'food_items', editingProduct.id), productData);
      } else {
        const productRef = doc(collection(db, 'food_items'));
        await setDoc(productRef, {
          ...productData,
          id: productRef.id,
          id_v3: productRef.id,
          createdAt: serverTimestamp()
        });
      }

      alert('Produto salvo com sucesso!');
      setIsAddingProduct(false);
      setEditingProduct(null);
      resetProductForm();
    } catch (error) {
      handleFirestoreError(error, editingProduct ? OperationType.UPDATE : OperationType.CREATE, 'food_items');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    // Removed confirm as it's blocked in iframes
    setDeletingProductId(productId);
    try {
      await deleteDoc(doc(db, 'food_items', productId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'food_items');
    } finally {
      setDeletingProductId(null);
    }
  };

  const resetProductForm = () => {
    setProductName('');
    setProductDesc('');
    setProductPrice('');
    setProductPromoPrice('');
    setProductCat('');
    setProductImg('');
    setProductIsFlash(false);
    setProductIsFreeDelivery(false);
    setProductStock('');
    setProductAvailable(true);
    setProductAvailableFrom('');
    setProductAvailableUntil('');
    setProductPreparationTime('');
    setProductMaxAddOns('');
    setProductAddOns([]);
    setProductAvailability({
      monday: { active: false, startTime: '00:00', endTime: '23:59' },
      tuesday: { active: false, startTime: '00:00', endTime: '23:59' },
      wednesday: { active: false, startTime: '00:00', endTime: '23:59' },
      thursday: { active: false, startTime: '00:00', endTime: '23:59' },
      friday: { active: false, startTime: '00:00', endTime: '23:59' },
      saturday: { active: false, startTime: '00:00', endTime: '23:59' },
      sunday: { active: false, startTime: '00:00', endTime: '23:59' },
    });
    setShowAvailability(false);
  };

  const startEditingProduct = (product: any) => {
    setEditingProduct(product);
    setProductName(product.name);
    setProductDesc(product.description);
    setProductPrice(product.price.toString());
    setProductPromoPrice(product.promoPrice?.toString() || '');
    setProductCat(product.category);
    setProductImg(product.imageUrl);
    setProductIsFlash(product.isFlashSale || false);
    setProductIsFreeDelivery(product.isDeliveryFree || false);
    setProductStock(product.stock?.toString() || '');
    setProductAvailable(product.available);
    setProductAvailableFrom(product.availableFrom || '');
    setProductAvailableUntil(product.availableUntil || '');
    setProductPreparationTime(product.preparationTimeMinutes?.toString() || '');
    setProductMaxAddOns(product.maxAddOns?.toString() || '');
    setProductAddOns(product.addOns || []);
    if (product.availability) {
      setProductAvailability(product.availability);
      setShowAvailability(true);
    } else {
      setProductAvailability({
        monday: { active: false, startTime: '00:00', endTime: '23:59' },
        tuesday: { active: false, startTime: '00:00', endTime: '23:59' },
        wednesday: { active: false, startTime: '00:00', endTime: '23:59' },
        thursday: { active: false, startTime: '00:00', endTime: '23:59' },
        friday: { active: false, startTime: '00:00', endTime: '23:59' },
        saturday: { active: false, startTime: '00:00', endTime: '23:59' },
        sunday: { active: false, startTime: '00:00', endTime: '23:59' },
      });
      setShowAvailability(false);
    }
    setIsAddingProduct(true);
  };

  const handleDeleteRestaurant = (restaurant: Restaurant) => {
    setRestaurantToDelete(restaurant);
    setIsDeletingRestaurantModalOpen(true);
  };

  const handleDeleteRestaurantConfirmed = async () => {
    if (!restaurantToDelete) return;
    
    try {
      // 1. Fetch and delete all products linked to this restaurant
      const productsQuery = query(collection(db, 'products'), where('restaurantId', '==', restaurantToDelete.id));
      const productsSnapshot = await getDocs(productsQuery);
      
      const deletePromises = productsSnapshot.docs.map(productDoc => 
        deleteDoc(doc(db, 'products', productDoc.id))
      );
      await Promise.all(deletePromises);
      console.log(`[Admin] Deleted ${deletePromises.length} products for restaurant ${restaurantToDelete.name}`);

      // 2. Clear from branch if applicable
      if (restaurantToDelete.branchId) {
        await updateDoc(doc(db, 'branches', restaurantToDelete.branchId), {
          total_restaurantes: increment(-1)
        });
      }

      // 3. Delete the restaurant document
      await deleteDoc(doc(db, 'restaurants', restaurantToDelete.id));
      
      // 4. Also delete the wallet if it exists
      try {
        const walletQuery = query(collection(db, 'wallets'), where('ownerUid', '==', restaurantToDelete.ownerUid));
        const walletSnapshot = await getDocs(walletQuery);
        for (const walletDoc of walletSnapshot.docs) {
          await deleteDoc(doc(db, 'wallets', walletDoc.id));
        }
      } catch (e) {
        console.warn('Could not delete wallet:', e);
      }

      setIsDeletingRestaurantModalOpen(false);
      setRestaurantToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `restaurants/${restaurantToDelete.id}`);
    }
  };

  const toggleBannerStatus = async (id: string, current: boolean) => {
    try {
      await updateDoc(doc(db, 'promotional_banners', id), { active: !current });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `promotional_banners/${id}`);
    }
  };

  const deleteBanner = async (id: string) => {
    if (window.confirm('Excluir banner?')) {
      try {
        await deleteDoc(doc(db, 'promotional_banners', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `promotional_banners/${id}`);
      }
    }
  };

  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);

  const handleEditCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    try {
      await updateDoc(doc(db, 'categories', editingCategory.id), {
        name: catName,
        iconName: catIcon,
        imageUrl: catImageUrl || null,
        status: catStatus,
        active: catStatus === 'active'
      });
      setEditingCategory(null);
      setCatName('');
      setCatIcon('Utensils');
      setCatImageUrl('');
      setCatStatus('active');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `categories/${editingCategory.id}`);
    }
  };

  const handleQuickEditRestaurant = async (resId: string) => {
    try {
      const resRef = doc(db, 'restaurants', resId);
      await updateDoc(resRef, {
        name: quickEditName,
        whatsapp: quickEditWhatsapp,
        city: quickEditCity,
        status: quickEditStatus
      });
      setQuickEditRestaurantId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `restaurants/${resId}`);
    }
  };

  const toggleRestaurantStatus = async (resId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      await updateDoc(doc(db, 'restaurants', resId), { status: newStatus });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `restaurants/${resId}`);
    }
  };

  const handleEditRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRestaurant) return;
    if (!resCityId) {
      alert('Por favor, selecione uma cidade para o restaurante.');
      return;
    }
    try {
      const updateData = {
        name: resName,
        modality: resModality,
        status: resStatus,
        description: resDesc,
        imageUrl: resImg,
        logoUrl: resImg,
        city: resCity,
        cityId: resCityId,
        branchId: resBranchId,
        pixConfigType: resPixConfigType,
        pixKey: resPixKey,
        pixType: resPixType,
        orderSoundUrl: resOrderSoundUrl,
        messageSoundUrl: resMessageSoundUrl,
        whatsapp: resWhatsapp,
        referencePoint: resReferencePoint,
        openingHours: resOpen,
        closingHours: resClose,
        autoVolume: resAutoVolume,
        screenOverlay: resScreenOverlay,
        subscriptionActive: resSubscriptionActive,
        subscriptionDueDate: resSubscriptionActive ? (editingRestaurant.subscriptionDueDate || serverTimestamp()) : null,
        weeklyHours: weeklyHours,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(doc(db, 'restaurants', editingRestaurant.id), updateData);

      // Handle Manager Password Change
      if (resManagerPassword && resManagerPassword !== originalManagerPassword && editingRestaurant.ownerUid) {
        setIsUpdatingPassword(true);
        try {
          let token = null;
          try {
            token = await getIdToken();
          } catch (tErr) {
            console.warn('[Admin] Could not get session token for pwd reset:', tErr);
          }
          
          const response = await fetch('/api/admin/update-user', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
              uid: editingRestaurant.ownerUid,
              password: resManagerPassword
            })
          });

          if (!response.ok) {
            const error = await response.json();
            console.error('[Admin] Password update failed:', error);
          } else {
            console.log('[Admin] Password updated successfully via Auth API');
            // Update Firestore too so it shows correctly next time
            try {
              await updateDoc(doc(db, 'users', editingRestaurant.ownerUid), {
                password: resManagerPassword,
                updatedAt: serverTimestamp()
              });
            } catch (fsErr: any) {
              console.warn('[Admin] Could not update password in Firestore (but API worked):', fsErr.message);
            }
          }
        } catch (pwdErr: any) {
          console.error('[Admin] Error updating manager password:', pwdErr.message);
        } finally {
          setIsUpdatingPassword(false);
        }
      }
      
      // AUTO-SYNC: When restaurant city changes, update all its products automatically
      if (resCity || resCityId) {
        console.log(`[AdminSync] Syncing city for products of restaurant ${editingRestaurant.id}...`);
        const productsSnap = await getDocs(query(collection(db, 'food_items'), where('restaurantId', '==', editingRestaurant.id)));
        for (const productDoc of productsSnap.docs) {
          await updateDoc(productDoc.ref, {
            cityId: resCityId || null,
            city: resCity || null,
            updatedAt: serverTimestamp()
          });
        }
        console.log(`[AdminSync] Synced ${productsSnap.size} products.`);
      }

      setEditingRestaurant(null);
      setResName('');
      setResModality('');
      setResStatus('active');
      setResDesc('');
      setResImg('');
      setResCity('');
      setResCityId('');
      setResBranchId('');
      setResPixConfigType('none');
      setResPixKey('');
      setResPixType('cpf');
      setResOrderSoundUrl('');
      setResMessageSoundUrl('');
      setResWhatsapp('');
      setResReferencePoint('');
      setResOpen('08:00');
      setResClose('22:00');
      setResAutoVolume(false);
      setResScreenOverlay(false);
      setResSubscriptionActive(false);
      setWeeklyHours({
        monday: { open: '08:00', close: '22:00', closed: false, closesForLunch: false, lunchStart: '12:00', lunchEnd: '14:00' },
        tuesday: { open: '08:00', close: '22:00', closed: false, closesForLunch: false, lunchStart: '12:00', lunchEnd: '14:00' },
        wednesday: { open: '08:00', close: '22:00', closed: false, closesForLunch: false, lunchStart: '12:00', lunchEnd: '14:00' },
        thursday: { open: '08:00', close: '22:00', closed: false, closesForLunch: false, lunchStart: '12:00', lunchEnd: '14:00' },
        friday: { open: '08:00', close: '22:00', closed: false, closesForLunch: false, lunchStart: '12:00', lunchEnd: '14:00' },
        saturday: { open: '08:00', close: '22:00', closed: false, closesForLunch: false, lunchStart: '12:00', lunchEnd: '14:00' },
        sunday: { open: '08:00', close: '22:00', closed: true, closesForLunch: false, lunchStart: '12:00', lunchEnd: '14:00' },
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `restaurants/${editingRestaurant.id}`);
    }
  };

  const handleAddRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const validations = [
      { condition: !resName.trim(), message: 'Por favor, preencha o nome do restaurante.', id: 'resNameAdmin' },
      { condition: !resWhatsapp.trim(), message: 'Por favor, informe o WhatsApp da empresa.', id: 'resWhatsappAdmin' },
      { condition: !resCityId, message: 'Por favor, selecione uma cidade para o restaurante.', id: 'resCityAdmin' },
      { condition: !resDesc.trim(), message: 'Por favor, adicione uma descrição para o restaurante.', id: 'resDescAdmin' },
      { condition: !resOpen, message: 'Por favor, informe o horário de abertura geral.', id: 'resOpenAdmin' },
      { condition: !resClose, message: 'Por favor, informe o horário de fechamento geral.', id: 'resCloseAdmin' },
    ];

    const firstError = validations.find(v => v.condition);

    if (firstError) {
      setFormError(firstError.message);
      const element = document.getElementById(firstError.id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.focus();
      }
      return;
    }

    try {
      const restaurantRef = doc(collection(db, 'restaurants'));
      await setDoc(restaurantRef, {
        id: restaurantRef.id,
        id_v3: restaurantRef.id,
        name: resName,
        modality: resModality,
        status: resStatus,
        ownerUid: resOwnerUid || 'anonymous_admin',
        description: resDesc,
        imageUrl: resImg || '',
        city: resCity,
        cityId: resCityId,
        branchId: resBranchId,
        pixConfigType: resPixConfigType,
        pixKey: resPixKey,
        pixType: resPixType,
        orderSoundUrl: resOrderSoundUrl,
        messageSoundUrl: resMessageSoundUrl,
        whatsapp: resWhatsapp,
        referencePoint: resReferencePoint,
        openingHours: resOpen,
        closingHours: resClose,
        autoVolume: resAutoVolume,
        screenOverlay: resScreenOverlay,
        subscriptionActive: resSubscriptionActive,
        subscriptionDueDate: resSubscriptionActive ? serverTimestamp() : null,
        weeklyHours: weeklyHours,
        createdAt: serverTimestamp()
      });

      if (resBranchId) {
        await updateDoc(doc(db, 'branches', resBranchId), {
          total_restaurantes: increment(1)
        });
      }
      setResName('');
      setResModality('');
      setResStatus('active');
      setResOwnerUid('');
      setResDesc('');
      setResImg('');
      setResCity('');
      setResCityId('');
      setResBranchId('');
      setResPixConfigType('none');
      setResPixKey('');
      setResPixType('cpf');
      setResOrderSoundUrl('');
      setResMessageSoundUrl('');
      setResWhatsapp('');
      setResReferencePoint('');
      setResOpen('08:00');
      setResClose('22:00');
      setResAutoVolume(false);
      setResScreenOverlay(false);
      setResSubscriptionActive(false);
      setWeeklyHours({
        monday: { open: '08:00', close: '22:00', closed: false, closesForLunch: false, lunchStart: '12:00', lunchEnd: '14:00' },
        tuesday: { open: '08:00', close: '22:00', closed: false, closesForLunch: false, lunchStart: '12:00', lunchEnd: '14:00' },
        wednesday: { open: '08:00', close: '22:00', closed: false, closesForLunch: false, lunchStart: '12:00', lunchEnd: '14:00' },
        thursday: { open: '08:00', close: '22:00', closed: false, closesForLunch: false, lunchStart: '12:00', lunchEnd: '14:00' },
        friday: { open: '08:00', close: '22:00', closed: false, closesForLunch: false, lunchStart: '12:00', lunchEnd: '14:00' },
        saturday: { open: '08:00', close: '22:00', closed: false, closesForLunch: false, lunchStart: '12:00', lunchEnd: '14:00' },
        sunday: { open: '08:00', close: '22:00', closed: true, closesForLunch: false, lunchStart: '12:00', lunchEnd: '14:00' },
      });
      setIsAddingRestaurant(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'restaurants');
    }
  };

  const startEditingRestaurant = (res: Restaurant) => {
    setEditingRestaurant(res);
    setResName(res.name);
    setResModality(res.modality || '');
    setResStatus(res.status);
    setResDesc(res.description || '');
    setResImg(res.imageUrl || '');
    setResCity(res.city || '');
    setResCityId(res.cityId || '');
    setResBranchId(res.branchId || '');
    setResPixConfigType(res.pixConfigType || 'none');
    setResPixKey(res.pixKey || '');
    setResPixType(res.pixType || 'cpf');
    setResOrderSoundUrl(res.orderSoundUrl || '');
    setResMessageSoundUrl(res.messageSoundUrl || '');
    setResWhatsapp(res.whatsapp || '');
    setResReferencePoint(res.referencePoint || '');
    setResOpen(res.openingHours || '08:00');
    setResClose(res.closingHours || '22:00');
    setResAutoVolume(res.autoVolume || false);
    setResScreenOverlay(res.screenOverlay || false);
    setResSubscriptionActive(res.subscriptionActive || false);
    
    // Fetch current password from users if possible
    // Search in current users state, then in adminData as fallback
    const allUsers = [...users, ...(adminData.users || [])];
    const manager = allUsers.find(u => u.uid === res.ownerUid);
    if (manager) {
      setResManagerPassword(manager.password || 'NÃO DEFINIDA');
      setOriginalManagerPassword(manager.password || '');
    } else {
      setResManagerPassword('');
      setOriginalManagerPassword('');
    }

    if (res.weeklyHours) {
      setWeeklyHours(res.weeklyHours);
    }
  };

  const startEditingCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatIcon(cat.iconName);
    setCatImageUrl(cat.imageUrl || '');
  };

  const deleteCategory = async (id: string) => {
    if (window.confirm('Excluir categoria?')) {
      try {
        await deleteDoc(doc(db, 'categories', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `categories/${id}`);
      }
    }
  };

  useEffect(() => {
    if (debouncedCityName) {
      const geocode = async () => {
        setIsGeocoding(true);
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(debouncedCityName)}`);
          const data = await response.json();
          if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lng = parseFloat(data[0].lng);
            if (!isNaN(lat) && !isNaN(lng)) {
              setCityLat(lat);
              setCityLng(lng);
            } else {
              setCityLat(null);
              setCityLng(null);
            }
          }
        } catch (error) {
          console.error("Geocoding error:", error);
        } finally {
          setIsGeocoding(false);
        }
      };
      geocode();
    } else {
      setCityLat(null);
      setCityLng(null);
    }
  }, [debouncedCityName]);

  const fetchCityCategories = async (apiKey: string, lat?: number | null, lng?: number | null, baseUrl?: string) => {
    if (!auth.currentUser) {
      console.error("User not authenticated. Cannot fetch categories.");
      return [];
    }

    try {
      const params: any = {};
      
      // RULE: Only use lat and lng as per requirements
      if (lat !== null && lng !== null && lat !== undefined && lng !== undefined && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
        params.lat = lat;
        params.lng = lng;
      } else {
        console.warn("Missing required parameters for categories API (lat/lng). Request skipped.");
        return [];
      }

      // Use the configured baseUrl if available, otherwise fallback to default
      const categoriesUrl = baseUrl && !baseUrl.includes('meupaineldegestao.com.br')
        ? (baseUrl.endsWith('/') ? `${baseUrl}integracao/v1/categoria` : `${baseUrl}/integracao/v1/categoria`)
        : 'https://api-vendas.taximachine.com.br/integracao/v1/categoria';

      const headers: any = { 'api-key': apiKey };

      // RULE: Always use GET, no body, params in URL
      const response = await axios.get('/api/proxy/categories', {
        headers,
        params: {
          url: categoriesUrl,
          ...params
        }
      });

      if (response.data.success !== false) {
        return response.data.response || response.data;
      } else {
        console.error("API error:", response.data);
        throw new Error(response.data.error || "Erro desconhecido na API");
      }
    } catch (error: any) {
      console.error("Fetch categories error:", error);
      const details = error.response?.data?.details || error.response?.data || error.message;
      console.error("Fetch categories error details:", details);
      return [];
    }
  };

  const searchCityCoordinates = async (name: string) => {
    if (!name) return;
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(name)}`);
      const data = await response.json();
      if (data && data.length > 0) {
        setCityLat(parseFloat(data[0].lat));
        setCityLng(parseFloat(data[0].lon));
      }
    } catch (error) {
      console.error("Error searching city coordinates:", error);
    }
  };

  const handleSaveCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cityName || !cityApiUrl) {
      alert('Nome e URL são obrigatórios.');
      return;
    }

    if (!auth.currentUser) {
      alert('Você precisa estar logado para salvar uma cidade.');
      return;
    }

    // Check if city already exists
    const existing = cities.find(c => 
      (c.name?.toLowerCase() || '') === cityName.toLowerCase() && 
      (!editingCity || c.id !== editingCity.id)
    );
    if (existing) {
      alert('Esta cidade já está cadastrada.');
      return;
    }

    // Fetch categories before saving
    let categories: any[] = [];
    if (cityApiKey) {
      categories = await fetchCityCategories(
        cityApiKey, 
        cityLat, 
        cityLng, 
        cityApiUrl
      );
    }

    const cityData = {
      name: cityName,
      apiUrl: cityApiUrl,
      apiKey: cityApiKey,
      authEmail: cityAuthEmail,
      authPassword: cityAuthPassword,
      lat: cityLat,
      lng: cityLng,
      categoriesLastUpdated: new Date().toISOString(),
      status: 'online' as const, // Default to online for now as requested
      lastChecked: new Date().toISOString(),
      active: true
    };

    try {
      // Try to verify, but proceed to save regardless
      setIsTestingConnection(true);
      setTestingCityId(editingCity?.id || 'temp');
      setCityConnectionStatus('testing');
      setCityConnectionError(null);

      let apiStatus: 'online' | 'offline' = 'offline';
      let apiCategories = editingCity?.categories || [];

      try {
        const verifyRes = await axios.get('/api/machine/categorias', {
          params: {
            apiUrl: cityApiUrl,
            apiKey: cityApiKey,
            authEmail: cityAuthEmail,
            authPassword: cityAuthPassword,
            cityName: cityName
          },
          timeout: 15000
        });

        if (verifyRes.data.success === true) {
          apiStatus = 'online';
          apiCategories = verifyRes.data.response || [];
          setCityConnectionStatus('success');
        } else {
          // Even if API returns error, we follow requirement to keep it "online" if requested or reachable
          apiStatus = 'online'; 
          setCityConnectionStatus('error');
          setCityConnectionError(verifyRes.data.error || 'API retornou erro na validação.');
        }
      } catch (apiError: any) {
        console.warn("Save city verification failed, but keeping online as requested:", apiError);
        apiStatus = 'online';
        setCityConnectionStatus('error');
        setCityConnectionError(apiError.response?.data?.error || apiError.message);
      }

      const finalCityData = {
        ...cityData,
        status: 'online', // Requirement: Always set to online status
        categories: apiCategories,
        updatedAt: serverTimestamp()
      };

      if (editingCity) {
        await updateDoc(doc(db, 'cities', editingCity.id), finalCityData);
      } else {
        const cityId = cityName.toLowerCase().replace(/\s+/g, '_');
        await setDoc(doc(db, 'cities', cityId), {
          ...finalCityData,
          id: cityId,
          createdAt: serverTimestamp()
        }, { merge: true });
        
        // Ensure branch and user also exist for this city
        const branchRef = doc(db, 'branches', cityId);
        await setDoc(branchRef, {
          id: cityId,
          name: `Franquia ${cityName}`,
          city: cityName,
          total_restaurantes: 0,
          createdAt: serverTimestamp()
        }, { merge: true });

        const userRef = doc(db, 'users', `manager_${cityId}`);
        await setDoc(userRef, {
          uid: `manager_${cityId}`,
          displayName: `Gestor ${cityName}`,
          email: `${cityId}@tupa.com`,
          role: 'manager',
          city: cityName,
          cityId: cityId,
          createdAt: serverTimestamp()
        }, { merge: true });
      }
      setIsAddingCity(false);
      setEditingCity(null);
      setCityName('');
      setCityApiUrl('');
      setCityApiKey('');
      setCityAuthEmail('');
      setCityAuthPassword('');
      setCityLat(null);
      setCityLng(null);
      alert('Cidade salva no sistema com status ONLINE! Verifique o status da conexão na lista abaixo.');
    } catch (error: any) {
      handleFirestoreError(error, editingCity ? OperationType.UPDATE : OperationType.CREATE, 'cities');
    } finally {
      setIsTestingConnection(false);
      setTestingCityId(null);
    }
  };

  const handleDeleteCity = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta configuração de cidade?')) {
      try {
        await deleteDoc(doc(db, 'cities', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `cities/${id}`);
      }
    }
  };

  const uniqueCities = useMemo(() => {
    const seenNames = new Set();
    const seenIds = new Set();
    return cities.filter(city => {
      if (!city.id || !city.name) return false;
      const name = (city.name || '').toLowerCase().trim();
      const isDuplicate = seenNames.has(name) || seenIds.has(city.id);
      if (!isDuplicate) {
        seenNames.add(name);
        seenIds.add(city.id);
      }
      return !isDuplicate;
    });
  }, [cities]);

  const handleAddPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerName || !partnerCityId) return;

    try {
      const city = cities.find(c => c.id === partnerCityId);
      const cityName = city?.name || 'Unknown';
      const restaurantsInCity = restaurants.filter(r => r.city === cityName);
      const restaurantIds = restaurantsInCity.map(r => r.id);

      // Calculate historical totals from existing transactions in memory
      const cityTransactions = partnerTransactions.filter(t => 
        restaurantIds.includes(t.restaurantId) || t.cityName === cityName
      );

      const totalEarnings = cityTransactions.reduce((acc, t) => acc + (t.amount || 0), 0);
      const pixRecharges = cityTransactions.filter(t => t.method === 'pix').reduce((acc, t) => acc + (t.amount || 0), 0);
      const manualRecharges = cityTransactions.filter(t => t.method === 'manual').reduce((acc, t) => acc + (t.amount || 0), 0);
      
      const today = new Date().toISOString().split('T')[0];
      const dailyRevenue = cityTransactions.filter(t => {
        const txDate = t.timestamp?.toDate ? t.timestamp.toDate().toISOString().split('T')[0] : t.date;
        return txDate === today;
      }).reduce((acc, t) => acc + (t.amount || 0), 0);

      // Use city name as ID (sanitized)
      const branchId = cityName.trim();
      await setDoc(doc(db, 'branches', branchId), {
        name: partnerName,
        cityId: partnerCityId,
        cityName: cityName,
        createdAt: serverTimestamp(),
        total_restaurantes: restaurantsInCity.length,
        ganhos_gerais: totalEarnings,
        recargas_pix: pixRecharges,
        recargas_manuais: manualRecharges,
        faturamento_hoje: dailyRevenue
      });

      for (const res of restaurantsInCity) {
        await updateDoc(doc(db, 'restaurants', res.id), { branchId });
      }

      // Associate existing users in the same city
      const usersInCity = users.filter(u => u.city === cityName);
      for (const u of usersInCity) {
        await setDoc(doc(db, 'users', u.uid), { branchId, cityId: partnerCityId }, { merge: true });
      }

      setPartnerName('');
      setPartnerCityId('');
      setIsAddingPartner(false);
      alert(`Filial criada e ${restaurantsInCity.length} restaurantes e ${usersInCity.length} clientes associados!`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'branches');
    }
  };

  const handleDeletePartner = async (id: string) => {
    setPartnerToDelete(id);
    setIsDeletingPartnerModalOpen(true);
  };

  const confirmDeletePartner = async () => {
    if (!partnerToDelete) return;
    
    try {
      // Clear branchId from restaurants associated with this branch
      const restaurantsInBranch = restaurants.filter(r => r.branchId === partnerToDelete);
      for (const res of restaurantsInBranch) {
        await updateDoc(doc(db, 'restaurants', res.id), { branchId: null });
      }

      // Clear branchId from users associated with this branch
      const usersInBranch = users.filter(u => u.branchId === partnerToDelete);
      for (const u of usersInBranch) {
        await setDoc(doc(db, 'users', u.uid), { branchId: null }, { merge: true });
      }

      await deleteDoc(doc(db, 'branches', partnerToDelete));
      setIsDeletingPartnerModalOpen(false);
      setPartnerToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `branches/${partnerToDelete}`);
    }
  };

  const testCityConnection = async (city: City) => {
    if (isTestingConnection) return;
    
    if (!auth.currentUser) {
      setCityConnectionError('Você precisa estar logado para testar a conexão.');
      setIsTestingConnection(false);
      return;
    }

    setIsTestingConnection(true);
    setTestingCityId(city.id);
    setCityConnectionStatus('testing');
    setCityConnectionError(null);

    try {
      // Test using the new machine API endpoints
      // Try Mode 1 (Estimates) first if coordinates are available
      let response;
      if (city.lat !== null && city.lng !== null && city.lat !== undefined && city.lng !== undefined && !isNaN(Number(city.lat)) && !isNaN(Number(city.lng))) {
        response = await axios.get('/api/machine/estimativas', {
          params: {
            cityId: city.id,
            lat_partida: city.lat,
            lng_partida: city.lng,
            lat_desejado: city.lat, // Same as partida for testing purposes or first point
            lng_desejado: city.lng
          }
        });
      } else {
        // Fallback to Mode 2 (Categories)
        response = await axios.get('/api/machine/categorias', {
          params: {
            cityId: city.id,
            cityName: city.name
          }
        });
      }

      const isOnline = response.data.success === true;
      
      if (isOnline) {
        setCityConnectionStatus('success');
        // Only update Firestore if it's a real saved city
        if (city.id !== 'temp') {
          await updateDoc(doc(db, 'cities', city.id), {
            status: 'online',
            lastChecked: new Date().toISOString()
          });
        }
      } else {
        setCityConnectionStatus('error');
        // Handle both 'error' and 'errors' from the API response
        const apiError = response.data.error || (response.data.errors && response.data.errors.join(', ')) || 'Chave da API inválida ou erro na conexão.';
        setCityConnectionError(apiError);
        
        // Don't auto-set to offline unless explicitly requested or if it's not a template city
        // The user says it was working before, so we preserve 'online' status if it's currently online
        if (city.id !== 'temp' && city.status !== 'online') {
          await updateDoc(doc(db, 'cities', city.id), {
            status: 'offline',
            lastChecked: new Date().toISOString()
          });
        }
      }
    } catch (error: any) {
      console.error("Test connection error full details:", error);
      setCityConnectionStatus('error');
      
      // Handle proxy error response details
      const details = error.response?.data?.details;
      const apiError = details?.error || (details?.errors && details?.errors.join(', ')) || error.response?.data?.error || error.message || 'Erro ao conectar com a API.';
      
      setCityConnectionError(apiError);
      
      if (city.id !== 'temp') {
        try {
          await updateDoc(doc(db, 'cities', city.id), {
            status: 'offline',
            lastChecked: new Date().toISOString()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `cities/${city.id}`);
        }
      }
    } finally {
      setIsTestingConnection(false);
      setTestingCityId(null);
    }
  };

  const startEditingCity = (city: City) => {
    setEditingCity(city);
    setCityName(city.name);
    setCityApiUrl(city.apiUrl);
    setCityApiKey(city.apiKey);
    setCityAuthEmail(city.authEmail);
    setCityAuthPassword(city.authPassword || '');
    setCityLat(city.lat || null);
    setCityLng(city.lng || null);
    setCityConnectionStatus('idle');
    setCityConnectionError(null);
    lastTestedRef.current = `${city.name}-${city.apiUrl}-${city.apiKey}-${city.authEmail}-${city.authPassword}-${city.lat}-${city.lng}`;
    setIsAddingCity(true);
  };

  // handlePasswordSubmit removed

  const retrySplitPay = async (item: any) => {
    if (!settings?.mercadoPagoAccessToken) {
      alert('Token do Mercado Pago não configurado!');
      return;
    }

    if (window.confirm(`Deseja tentar reenviar o pagamento de ${formatPrice(item.restaurantAmount)} para o restaurante?`)) {
      try {
        const response = await fetch('/api/split-pay', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            orderId: item.orderId,
            restaurantId: item.restaurantId,
            amount: item.restaurantAmount,
            pixKey: item.pixKeyDest,
            accessToken: settings.mercadoPagoAccessToken
          })
        });

        const data = await response.json();
        
        if (response.ok) {
          alert('SplitPay reenviado com sucesso!');
          // Update status in history
          await updateDoc(doc(db, 'splitpay_history', item.id), {
            status: 'success',
            errorMessage: '',
            retriedAt: new Date().toISOString()
          });
        } else {
          alert(`Erro ao reenviar: ${data.message || 'Erro desconhecido'}`);
          await updateDoc(doc(db, 'splitpay_history', item.id), {
            errorMessage: data.message || 'Erro no reenvio',
            lastRetryAt: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Error retrying split pay:', error);
        alert('Erro ao processar reenvio.');
      }
    }
  };

  const handleSendNotification = async () => {
    if (!notificationText.trim()) return;
    setIsSendingNotification(true);
    try {
      await addDoc(collection(db, 'push_notifications'), {
        message: notificationText,
        createdAt: serverTimestamp(),
        sentBy: user?.uid,
        type: 'broadcast'
      });
      alert('Notificação enviada com sucesso!');
      setNotificationText('');
      setIsNotificationModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'push_notifications');
    } finally {
      setIsSendingNotification(false);
    }
  };

  const handleUpdateGlobalSettings = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e && 'preventDefault' in e) e.preventDefault();
    if (isGuest) {
      alert('Modo demonstração: Alterações não são permitidas.');
      return;
    }
    setIsSavingGlobals(true);
    setShowSettingsSuccess(false);
    
    try {
      const { ...settingsToSave } = settings;
      await setDoc(doc(db, 'settings', 'global'), settingsToSave, { merge: true });
      
      setIsSavingGlobals(false);
      setShowSettingsSuccess(true);
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => setShowSettingsSuccess(false), 3000);
    } catch (error) {
      setIsSavingGlobals(false);
      handleFirestoreError(error, OperationType.WRITE, 'settings/global');
    }
  };

  const handleUpdateUserSubscription = async (userId: string, data: Partial<UserProfile>) => {
    try {
      await setDoc(doc(db, 'users', userId), data, { merge: true });
      alert('Assinatura do usuário atualizada!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const getFilteredPayments = () => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    return payments.filter(p => {
      const matchesDate = (() => {
        if (dateFilter === 'today') return p.date === todayStr;
        if (dateFilter === 'yesterday') return p.date === yesterdayStr;
        if (dateFilter === 'week') {
          const weekAgo = new Date(now);
          weekAgo.setDate(now.getDate() - 7);
          return new Date(p.date) >= weekAgo;
        }
        if (dateFilter === 'month') {
          const monthAgo = new Date(now);
          monthAgo.setMonth(now.getMonth() - 1);
          return new Date(p.date) >= monthAgo;
        }
        return true;
      })();

      return matchesDate;
    });
  };

  const approvedPayments = getFilteredPayments().filter(p => p.status === 'approved');
  const pendingPayments = getFilteredPayments().filter(p => p.status === 'pending' || p.status === 'in_process');
  const rejectedPayments = getFilteredPayments().filter(p => p.status === 'rejected' || p.status === 'cancelled');

  const totalRevenue = approvedPayments.reduce((acc, p) => acc + p.amount, 0);
  const allTimeRevenue = payments.filter(p => p.status === 'approved').reduce((acc, p) => acc + p.amount, 0);
  const totalSplitPayRevenue = splitPayHistory.filter(item => item.status === 'success').reduce((acc, item) => acc + (item.totalAmount || 0), 0);

  const getChartData = () => {
    const filtered = approvedPayments;
    const groups: { [key: string]: number } = {};
    
    filtered.forEach(p => {
      groups[p.date] = (groups[p.date] || 0) + p.amount;
    });

    return Object.keys(groups).sort().map(date => ({
      date: date.split('-').slice(1).reverse().join('/'),
      amount: groups[date]
    }));
  };

  const totalRevenueValue = totalRevenue; // Renamed to avoid conflict if any

  const getCityRevenue = () => {
    const filtered = payments.filter(p => {
      const isSameDay = p.date === revenueDayFilter;
      const isSameCity = revenueCityFilter === 'all' || p.city === revenueCityFilter;
      return isSameDay && isSameCity;
    });

    const cityGroups: { [key: string]: number } = {};
    filtered.forEach(p => {
      const city = p.city || 'Não Informada';
      cityGroups[city] = (cityGroups[city] || 0) + p.amount;
    });

    return Object.entries(cityGroups).map(([city, amount]) => ({ city, amount }));
  };

  const deleteMonthlyData = async () => {
    if (window.confirm('Tem certeza que deseja apagar TODOS os pagamentos e pedidos deste mês? Esta ação é irreversível.')) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const paymentsToDelete = payments.filter(p => {
        const pDate = new Date(p.date);
        return pDate >= startOfMonth;
      });
      
      try {
        for (const p of paymentsToDelete) {
          await deleteDoc(doc(db, 'payments', p.id));
        }

        const ordersRef = collection(db, 'orders');
        const ordersQuery = query(ordersRef, where('createdAt', '>=', startOfMonth));
        const ordersSnapshot = await getDocs(ordersQuery);
        for (const orderDoc of ordersSnapshot.docs) {
          await deleteDoc(doc(db, 'orders', orderDoc.id));
        }

        alert(`${paymentsToDelete.length} pagamentos e ${ordersSnapshot.size} pedidos apagados com sucesso.`);
      } catch (error) {
        console.error("Error deleting monthly data:", error);
        alert('Erro ao apagar dados mensais.');
      }
    }
  };

  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserPassword, setEditUserPassword] = useState('');
  const [editUserCpf, setEditUserCpf] = useState('');

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      let token = null;
      try {
        token = await getIdToken();
      } catch (tErr) {
        console.warn('[Admin] Could not get session token for user edit:', tErr);
      }

      const response = await fetch('/api/admin/update-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          uid: editingUser.uid,
          displayName: editUserName,
          email: editUserEmail,
          password: editUserPassword || undefined,
          cpf: editUserCpf
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Desconhecido' }));
        throw new Error(errorData.error || `Erro API: ${response.status}`);
      }

      setEditingUser(null);
      setEditUserPassword('');
      alert('Usuário atualizado com sucesso!');
    } catch (error) {
      console.error("Error updating user:", error);
      alert(error instanceof Error ? error.message : 'Erro ao atualizar usuário');
    }
  };

  const handleUpdateSplitPayConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSplitPay) return;

    try {
      await updateDoc(doc(db, 'restaurants', editingSplitPay.id), {
        splitPayConfig: {
          pixKey: spPixKey,
          pixKeyType: spPixType,
          platformFee: 50,
          feeType: 'percent',
          active: true
        }
      });
      setEditingSplitPay(null);
      alert('Configuração de SplitPay atualizada! (Taxa fixa de 50% aplicada)');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `restaurants/${editingSplitPay.id}`);
    }
  };

  const startEditingSplitPay = (res: Restaurant) => {
    setEditingSplitPay(res);
    setSpPixKey(res.splitPayConfig?.pixKey || '');
    setSpPixType(res.splitPayConfig?.pixKeyType || 'cpf');
    setSpFee(res.splitPayConfig?.platformFee || 0);
    setSpFeeType(res.splitPayConfig?.feeType || 'fixed');
    setSpActive(res.splitPayConfig?.active || false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'banner' | 'category' | 'business_category' | 'splash' | 'splashAudio' | 'bannerAudio' | 'all_category' | 'res' | 'defaultOrderSound' | 'filterIcon' | 'ordersIcon' | 'cartIcon' | 'colorIcon' | 'product') => {
    const file = e.target.files?.[0];
    if (file) {
      const isLarge = target === 'splash' || target === 'splashAudio' || target === 'banner' || target === 'bannerAudio' || target === 'res' || target === 'defaultOrderSound' || target === 'product';
      const limit = isLarge ? 10 * 1024 * 1024 : 1024 * 1024; // 10MB for large assets, 1MB for others
      
      if (file.size > limit) {
        alert(`O arquivo é muito grande (limite de ${isLarge ? '10MB' : '1MB'} para upload direto). Para arquivos maiores, use uma URL externa.`);
        return;
      }

      // Compress images that go to Firestore to avoid 1MB limit issues
      if (file.type.startsWith('image/') && (target === 'res' || target === 'product' || target === 'category' || target === 'business_category')) {
        try {
          const compressed = await compressImage(file, 800, 800, 0.7);
          if (target === 'res') setResImg(compressed);
          if (target === 'product') setProductImg(compressed);
          if (target === 'category') setCatImageUrl(compressed);
          if (target === 'business_category') setBusCatImageUrl(compressed);
          return;
        } catch (error) {
          console.error('Compression failed, falling back to original:', error);
        }
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (target === 'product') setProductImg(result);
        if (target === 'category') setCatImageUrl(result);
        if (target === 'business_category') setBusCatImageUrl(result);
        if (target === 'banner') {
          setBannerUrl(result);
          const isVideo = file.type.startsWith('video/');
          const isGif = file.type === 'image/gif';
          setBannerMediaType(isVideo ? 'video' : isGif ? 'gif' : 'image');
        }
        if (target === 'bannerAudio') setBannerAudioUrl(result);
        if (target === 'category') setCatImageUrl(result);
        if (target === 'all_category') setSettings({ ...settings, allCategoryImageUrl: result });
        if (target === 'res') setResImg(result);
        if (target === 'defaultOrderSound') setSettings({ ...settings, defaultOrderSoundUrl: result });
        if (target === 'splash') {
          const isVideo = file.type.startsWith('video/');
          setSettings({ 
            ...settings, 
            splashMediaUrl: result, 
            splashMediaType: isVideo ? 'video' : 'image' 
          });
        }
        if (target === 'splashAudio') {
          setSettings({ ...settings, splashAudioUrl: result });
        }
        if (target === 'filterIcon') {
          setSettings({ ...settings, clientIcons: { ...settings.clientIcons, filterIcon: result } as any });
        }
        if (target === 'ordersIcon') {
          setSettings({ ...settings, clientIcons: { ...settings.clientIcons, ordersIcon: result } as any });
        }
        if (target === 'cartIcon') {
          setSettings({ ...settings, clientIcons: { ...settings.clientIcons, cartIcon: result } as any });
        }
        if (target === 'colorIcon') {
          setSettings({ ...settings, clientIcons: { ...settings.clientIcons, colorIcon: result } as any });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSoundUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'order' | 'message') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const url = reader.result as string;
        if (type === 'order') setResOrderSoundUrl(url);
        else setResMessageSoundUrl(url);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGallerySelect = (url: string) => {
    if (galleryTarget === 'banner') setBannerUrl(url);
    if (galleryTarget === 'category') setCatImageUrl(url);
    if (galleryTarget === 'splash') {
      setSettings({ ...settings, splashMediaUrl: url, splashMediaType: 'image' });
    }
    if (galleryTarget === 'res') setResImg(url);
    setIsGalleryOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Verificando credenciais...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin && !isGuest) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center text-red-500 mb-6 border border-red-500/20">
          <ShieldAlert size={40} />
        </div>
        <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-2">Acesso Restrito</h1>
        <p className="text-slate-400 text-sm max-w-md leading-relaxed">
          O Painel Administrativo é exclusivo para usuários autorizados.
          <br />Seu e-mail: <span className="text-blue-400 font-bold">{user?.email}</span>
        </p>
        <div className="mt-8 flex flex-col gap-3 w-full max-w-xs">
          <button 
            onClick={signOut} 
            className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold uppercase tracking-widest text-xs border border-white/10 transition-all"
          >
            Sair e Trocar Conta
          </button>
          <button 
            onClick={() => window.location.href = '/customer'} 
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
          >
            Voltar para o Início
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-app text-white font-sans flex flex-col md:flex-row transition-colors duration-300 overflow-x-hidden max-w-full">
      {/* Mobile Header */}
      <header className="md:hidden h-16 bg-slate-950 border-b border-white/10 flex items-center justify-between px-6 fixed top-0 left-0 right-0 z-[60]">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <ShieldCheck className="text-white" size={20} />
          </div>
          <span className="font-black uppercase tracking-tighter italic text-white">Admin</span>
        </div>
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-2 text-white hover:bg-white/5 rounded-xl transition-all"
        >
          {isMenuOpen ? <X size={24} /> : <Settings2 size={24} />}
        </button>
      </header>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden fixed top-16 left-0 right-0 bg-slate-950 border-b border-white/10 z-[55] overflow-hidden shadow-2xl"
          >
            <div className="p-4 grid grid-cols-2 gap-2 max-h-[70vh] overflow-y-auto">
              {[
                { id: 'orders', label: 'Pedidos', icon: ClipboardList },
                { id: 'restaurants', label: 'Lojas', icon: Store },
                { id: 'banners', label: 'Banners', icon: ImageIcon },
                { id: 'categories', label: 'Categorias', icon: Utensils },
                { id: 'users', label: 'Usuários', icon: Users },
                { id: 'cities', label: 'Cidades', icon: Globe },
                { id: 'realtime_cities', label: 'Tempo Real', icon: Activity },
                { id: 'partners', label: 'Sócios', icon: Handshake },
                { id: 'live_view', label: 'Visualizar App ao Vivo', icon: Eye },
                { id: 'mercadopago', label: 'Pagamentos', icon: CreditCard },
                { id: 'wallet', label: 'Carteira', icon: DollarSign },
                { id: 'subscriptions', label: 'Assinaturas', icon: Calendar },
                { id: 'security', label: 'Segurança', icon: ShieldAlert },
                { id: 'customization', label: 'Customização', icon: Palette },
                { id: 'analytics', label: 'Visualizações', icon: BarChart2 },
                { id: 'schedules', label: 'Horários', icon: Clock },
                { id: 'settings', label: 'Configurações', icon: Settings },
              ].map((item, idx) => (
                <button
                  key={`${item.id}-${idx}`}
                  onClick={() => {
                    setActiveTab(item.id as any);
                    setIsMenuOpen(false);
                  }}
                  className={`flex items-center space-x-3 p-3 rounded-xl transition-all ${
                    activeTab === item.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-white/5'
                  }`}
                >
                  <item.icon size={18} />
                  <span className="text-xs font-bold uppercase tracking-tight">{item.label}</span>
                </button>
              ))}
              <button
                onClick={signOut}
                className="flex items-center space-x-3 p-3 rounded-xl text-red-400 hover:bg-red-400/5 transition-all col-span-2 mt-2 border-t border-white/5 pt-4"
              >
                <LogOut size={18} />
                <span className="text-xs font-bold uppercase tracking-tight">Sair do Painel</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-white/10 flex-col p-6 space-y-8 bg-slate-950">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-black uppercase tracking-tight italic text-blue-400">Painel ADM</h1>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40">{settings.appName || 'ifood TUPÃ'} Control Center</p>
          </div>
          <div className="md:block hidden">
            <ThemeSelector />
          </div>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl space-y-3">
          <div className="flex items-center space-x-2 text-blue-500">
            <ShieldCheck size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">Acesso Administrativo</span>
          </div>
          <p className="text-[9px] text-white/40 leading-relaxed">
            Modo de Acesso Público Ativado
          </p>
        </div>

        <nav className="flex md:flex-col space-x-2 md:space-x-0 md:space-y-2 overflow-x-auto no-scrollbar pb-4 md:pb-0">
          <button 
            onClick={() => setActiveTab('orders')}
            className={`flex-shrink-0 md:w-full flex items-center space-x-3 p-4 rounded-xl transition-all ${activeTab === 'orders' ? 'bg-blue-600 text-white' : 'hover:bg-white/5'}`}
          >
            <ClipboardList size={20} />
            <span className="font-bold uppercase tracking-widest text-xs">Pedidos</span>
          </button>
          <button 
            onClick={() => setActiveTab('restaurants')}
            className={`flex-shrink-0 md:w-full flex items-center space-x-3 p-4 rounded-xl transition-all ${activeTab === 'restaurants' ? 'bg-blue-600 text-white' : 'hover:bg-white/5'}`}
          >
            <Store size={20} />
            <span className="font-bold uppercase tracking-widest text-xs">Restaurantes</span>
          </button>
          <button 
            onClick={() => setActiveTab('banners')}
            className={`flex-shrink-0 md:w-full flex items-center space-x-3 p-4 rounded-xl transition-all ${activeTab === 'banners' ? 'bg-blue-600 text-white' : 'hover:bg-white/5'}`}
          >
            <ImageIcon size={20} />
            <span className="font-bold uppercase tracking-widest text-xs">Banners</span>
          </button>
          <button 
            onClick={() => setActiveTab('categories')}
            className={`flex-shrink-0 md:w-full flex items-center space-x-3 p-4 rounded-xl transition-all ${activeTab === 'categories' ? 'bg-blue-600 text-white' : 'hover:bg-white/5'}`}
          >
            <Plus size={20} />
            <span className="font-bold uppercase tracking-widest text-xs">Categorias</span>
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`flex-shrink-0 md:w-full flex items-center space-x-3 p-4 rounded-xl transition-all ${activeTab === 'users' ? 'bg-blue-600 text-white' : 'hover:bg-white/5'}`}
          >
            <Users size={20} />
            <span className="font-bold uppercase tracking-widest text-xs">Usuários</span>
          </button>
          <button 
            onClick={() => setActiveTab('cities')}
            className={`flex-shrink-0 md:w-full flex items-center space-x-3 p-4 rounded-xl transition-all ${activeTab === 'cities' ? 'bg-blue-600 text-white' : 'hover:bg-white/5'}`}
          >
            <Globe size={20} />
            <span className="font-bold uppercase tracking-widest text-xs">API Cidades</span>
          </button>
          <button 
            onClick={() => setActiveTab('realtime_cities')}
            className={`flex-shrink-0 md:w-full flex items-center space-x-3 p-4 rounded-xl transition-all ${activeTab === 'realtime_cities' ? 'bg-blue-600 text-white' : 'hover:bg-white/5'}`}
          >
            <Activity size={20} />
            <span className="font-bold uppercase tracking-widest text-xs">Cidades Tempo Real</span>
          </button>
          <button 
            onClick={() => setActiveTab('partners')}
            className={`flex-shrink-0 md:w-full flex items-center space-x-3 p-4 rounded-xl transition-all ${activeTab === 'partners' ? 'bg-blue-600 text-white' : 'hover:bg-white/5'}`}
          >
            <Handshake size={20} />
            <span className="font-bold uppercase tracking-widest text-xs">Sócios</span>
          </button>
          <button 
            onClick={() => setActiveTab('mercadopago')}
            className={`flex-shrink-0 md:w-full flex items-center justify-between p-4 rounded-xl transition-all ${activeTab === 'mercadopago' ? 'bg-blue-600 text-white' : 'hover:bg-white/5'}`}
          >
            <div className="flex items-center space-x-3">
              <BarChart3 size={20} />
              <span className="font-bold uppercase tracking-widest text-xs">Mercado Livre</span>
            </div>
            <div className={`w-2 h-2 rounded-full shadow-[0_0_8px] ${settings.mercadoPagoPublicKey && settings.mercadoPagoAccessToken ? 'bg-green-500 shadow-green-500/50' : 'bg-red-500 shadow-red-500/50'}`} />
          </button>
          <button 
            onClick={() => setActiveTab('subscriptions')}
            className={`flex-shrink-0 md:w-full flex items-center space-x-3 p-4 rounded-xl transition-all ${activeTab === 'subscriptions' ? 'bg-blue-600 text-white' : 'hover:bg-white/5'}`}
          >
            <Calendar size={20} />
            <span className="font-bold uppercase tracking-widest text-xs">Mensalidades</span>
          </button>
          <button 
            onClick={() => setActiveTab('wallet')}
            className={`flex-shrink-0 md:w-full flex items-center space-x-3 p-4 rounded-xl transition-all ${activeTab === 'wallet' ? 'bg-blue-600 text-white' : 'hover:bg-white/5'}`}
          >
            <ShieldCheck size={20} />
            <span className="font-bold uppercase tracking-widest text-xs">Carteira</span>
          </button>
          <button 
            onClick={() => setActiveTab('security')}
            className={`flex-shrink-0 md:w-full flex items-center space-x-3 p-4 rounded-xl transition-all ${activeTab === 'security' ? 'bg-blue-600 text-white' : 'hover:bg-white/5'}`}
          >
            <ShieldCheck size={20} />
            <span className="text-xs font-black uppercase tracking-widest hidden md:block">Segurança</span>
          </button>

          <button 
            onClick={() => setActiveTab('customization')}
            className={`flex-shrink-0 md:w-full flex items-center space-x-3 p-4 rounded-xl transition-all ${activeTab === 'customization' ? 'bg-blue-600 text-white' : 'hover:bg-white/5'}`}
          >
            <Palette size={20} />
            <span className="font-bold uppercase tracking-widest text-xs">Customização</span>
          </button>

          <button 
            onClick={() => setActiveTab('analytics')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'analytics' ? 'bg-brand-blue text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-white/5'}`}
          >
            <BarChart2 size={20} />
            <span className="text-xs font-black uppercase tracking-widest">Visualizações</span>
          </button>

          <button 
            onClick={() => setActiveTab('schedules')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'schedules' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-white/5'}`}
          >
            <Clock size={20} />
            <span className="text-xs font-black uppercase tracking-widest">Horários Categorias</span>
          </button>

          <button 
            onClick={() => setActiveTab('settings')}
            className={`flex-shrink-0 md:w-full flex items-center space-x-3 p-4 rounded-xl transition-all ${activeTab === 'settings' ? 'bg-blue-600 text-white' : 'hover:bg-white/5'}`}
          >
            <Package size={20} />
            <span className="font-bold uppercase tracking-widest text-xs">Configurações</span>
          </button>
        </nav>

        <div className="hidden md:block pt-6 border-t border-white/10 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
              <span>Armazenamento</span>
              <span>{storageUsage}%</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-1000 ${storageUsage > 90 ? 'bg-red-500' : storageUsage > 70 ? 'bg-yellow-500' : 'bg-blue-500'}`}
                style={{ width: `${storageUsage}%` }}
              />
            </div>
          </div>
          <p className="text-[10px] font-mono opacity-40 uppercase tracking-widest">Acesso Público Ativado</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto overflow-x-hidden bg-slate-900 max-w-full">
        {activeTab === 'orders' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-4xl font-black uppercase tracking-tighter italic text-white">Gestão de Pedidos</h2>
                <p className="text-slate-400 font-medium uppercase text-[10px] tracking-widest">Acompanhamento em tempo real de todas as vendas</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">Total Filtrado</p>
                    <p className="text-xl font-black text-emerald-400">{formatPrice(filteredOrders.reduce((acc, o) => acc + (o.total || 0), 0))}</p>
                  </div>
                  <div className="w-px h-8 bg-white/10" />
                  <div className="text-right">
                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">Qtd Pedidos</p>
                    <p className="text-xl font-black text-white">{filteredOrders.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="text"
                  placeholder="Buscar por ID, Cliente..."
                  value={orderSearchTerm}
                  onChange={e => setOrderSearchTerm(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:border-blue-500/50 transition-all text-white"
                />
              </div>

              <select 
                value={orderStatusFilter}
                onChange={e => setOrderStatusFilter(e.target.value as any)}
                className="bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white focus:border-blue-500/50 outline-none"
              >
                <option value="all">Todos os Status</option>
                <option value="pending">Pendentes</option>
                <option value="preparing">Preparando</option>
                <option value="dispatched">Em Entrega</option>
                <option value="completed">Concluídos</option>
                <option value="cancelled">Cancelados</option>
              </select>

              <select 
                value={orderRestaurantFilter}
                onChange={e => setOrderRestaurantFilter(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white focus:border-blue-500/50 outline-none"
              >
                <option value="all">Todos os Restaurantes</option>
                {restaurants.map((res, idx) => (
                  <option key={`admin-res-opt-${res.id}-${idx}`} value={res.id}>{res.name}</option>
                ))}
              </select>

              <select 
                value={orderDateFilter}
                onChange={e => setOrderDateFilter(e.target.value as any)}
                className="bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white focus:border-blue-500/50 outline-none"
              >
                <option value="today">Hoje</option>
                <option value="yesterday">Ontem</option>
                <option value="week">Últimos 7 dias</option>
                <option value="month">Último mês</option>
                <option value="all">Todo o histórico</option>
              </select>
            </div>

            {/* Orders List */}
            <div className="space-y-4">
              {filteredOrders.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-20 text-center space-y-4">
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto text-slate-600">
                    <ClipboardList size={40} />
                  </div>
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Nenhum pedido encontrado com os filtros atuais</p>
                </div>
              ) : (
                <>
                  {displayedOrders.map((order, idx) => {
                    const res = restaurants.find(r => r.id === order.restaurantId);
                    const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt || 0);
                    
                    return (
                      <div key={`admin-order-card-${order.id}-${idx}`} className={`${['delivered', 'completed', 'cancelled', 'rejected'].includes(order.status) ? 'bg-slate-50/5 grayscale-[0.5]' : 'bg-white/5'} border border-white/10 rounded-3xl p-6 hover:bg-white/10 transition-all group`}>
                      <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center">
                        <div className="flex-1 space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center text-blue-400">
                                <Hash size={18} />
                              </div>
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">ID do Pedido</p>
                                <p className="text-sm font-black text-white">{order.id.slice(-8).toUpperCase()}</p>
                              </div>
                            </div>
                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                              ['delivered', 'completed', 'cancelled', 'rejected'].includes(order.status) ? 'bg-slate-500/20 text-slate-400' :
                              order.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                              'bg-blue-500/20 text-blue-400'
                            }`}>
                              {order.status === 'pending' ? 'Pendente' :
                               order.status === 'preparing' ? 'Preparando' :
                               order.status === 'dispatched' ? 'Em Entrega' :
                               (order.status === 'delivered' || order.status === 'completed') ? 'Finalizado' :
                               order.status === 'cancelled' ? 'Cancelado' : 
                               order.status === 'rejected' ? 'Rejeitado' : order.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            <div className="space-y-1">
                              <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">Cliente</p>
                              <p className="text-sm font-bold text-white">{order.customerName || 'Cliente Anônimo'}</p>
                              <p className="text-[10px] text-slate-400">{order.customerPhone || 'Sem telefone'}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">Restaurante</p>
                              <p className="text-sm font-bold text-white">{res?.name || 'Restaurante não encontrado'}</p>
                              <p className="text-[10px] text-slate-400">{res?.city || 'Cidade não informada'}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">Data e Hora</p>
                              <p className="text-sm font-bold text-white">{orderDate.toLocaleString('pt-BR')}</p>
                              <p className="text-[10px] text-slate-400">{order.paymentMethod === 'pix' ? 'Pagamento via Pix' : 'Pagamento na Entrega'}</p>
                            </div>
                          </div>
                        </div>

                        <div className="w-full lg:w-px h-px lg:h-16 bg-white/10" />

                        <div className="w-full lg:w-48 flex flex-col items-end justify-center">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Valor Total</p>
                          <p className="text-2xl font-black text-white">{formatPrice(order.total || 0)}</p>
                          
                          <div className="mt-4 flex flex-wrap items-center gap-2 w-full">
                            <button 
                              onClick={() => handleUpdateOrderStatus(order.id, 'preparing')}
                              className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border border-white/10 transition-all ${order.status === 'preparing' ? 'bg-blue-600 text-white' : 'bg-white/5 text-blue-400 hover:bg-blue-600/20'}`}
                            >
                              Preparar
                            </button>
                            <button 
                              onClick={() => handleUpdateOrderStatus(order.id, 'dispatched')}
                              className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border border-white/10 transition-all ${order.status === 'dispatched' ? 'bg-purple-600 text-white' : 'bg-white/5 text-purple-400 hover:bg-purple-600/20'}`}
                            >
                              Entregar
                            </button>
                            <button 
                              onClick={() => handleUpdateOrderStatus(order.id, 'completed')}
                              className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border border-white/10 transition-all ${order.status === 'completed' ? 'bg-emerald-600 text-white' : 'bg-white/5 text-emerald-400 hover:bg-emerald-600/20'}`}
                            >
                              Concluir
                            </button>
                            <button 
                              onClick={() => handleUpdateOrderStatus(order.id, 'cancelled')}
                              className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border border-white/10 transition-all ${order.status === 'cancelled' ? 'bg-red-600 text-white' : 'bg-white/5 text-red-400 hover:bg-red-600/20'}`}
                            >
                              Cancelar
                            </button>
                            
                            <div className="flex-1" />
                            
                            <button 
                              onClick={() => setSelectedOrder(order)}
                              className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 transition-all"
                              title="Ver Detalhes"
                            >
                              <Eye size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredOrders.length > ordersLimit && (
                  <div className="flex justify-center pt-8">
                    <button 
                      onClick={() => setOrdersLimit(prev => prev + 3)}
                      className="px-8 py-3 bg-white/5 border border-white/10 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2"
                    >
                      <Plus size={16} />
                      Ver Mais Pedidos
                    </button>
                  </div>
                )}
              </>
            )}
            </div>
          </div>
        )}

        {/* Order Details Modal */}
        <AnimatePresence>
          {selectedOrder && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedOrder(null)}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-4xl bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              >
                {/* Modal Header */}
                <div className="p-6 md:p-8 border-b border-white/10 flex items-center justify-between bg-white/5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600/20 rounded-2xl flex items-center justify-center text-blue-400">
                      <ClipboardList size={24} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black uppercase tracking-tighter italic text-white flex items-center gap-2">
                        Pedido #{selectedOrder.id.slice(-8).toUpperCase()}
                      </h3>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                        {new Date(selectedOrder.createdAt?.toDate ? selectedOrder.createdAt.toDate() : selectedOrder.createdAt || 0).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedOrder(null)}
                    className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-slate-400"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* Modal Content */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Customer Info */}
                    <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-4">
                      <div className="flex items-center gap-2 text-blue-400">
                        <User size={18} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Cliente</span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-lg font-black text-white">{selectedOrder.customerName || 'Cliente Anônimo'}</p>
                        <p className="text-xs text-slate-400 flex items-center gap-2">
                          <Phone size={12} /> {selectedOrder.customerPhone || 'Sem telefone'}
                        </p>
                        <p className="text-xs text-slate-400 flex items-center gap-2">
                          <Mail size={12} /> {selectedOrder.customerEmail || 'Sem e-mail'}
                        </p>
                      </div>
                    </div>

                    {/* Restaurant Info */}
                    <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-4">
                      <div className="flex items-center gap-2 text-emerald-400">
                        <Store size={18} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Restaurante</span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-lg font-black text-white">
                          {restaurants.find(r => r.id === selectedOrder.restaurantId)?.name || 'Restaurante não encontrado'}
                        </p>
                        <p className="text-xs text-slate-400 flex items-center gap-2">
                          <MapPin size={12} /> {restaurants.find(r => r.id === selectedOrder.restaurantId)?.city || 'Cidade não informada'}
                        </p>
                      </div>
                    </div>

                    {/* Payment Info */}
                    <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-4">
                      <div className="flex items-center gap-2 text-amber-400">
                        <CreditCard size={18} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Pagamento</span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-lg font-black text-white uppercase">
                          {selectedOrder.paymentMethod === 'pix' ? 'Pix' : 'Na Entrega'}
                        </p>
                        <p className="text-xs text-slate-400">
                          Status: <span className="text-emerald-400 font-bold uppercase tracking-widest text-[10px]">Aprovado</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                      <Package size={14} /> Itens do Pedido
                    </h4>
                    <div className="bg-white/5 rounded-3xl border border-white/10 overflow-hidden">
                      <table className="w-full text-left">
                        <thead className="bg-white/5 border-b border-white/10">
                          <tr>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Item</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Qtd</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Preço</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {selectedOrder.items?.map((item: any, idx: number) => (
                            <tr key={`admin-item-row-${selectedOrder.id}-${item.id}-${idx}`} className="hover:bg-white/5 transition-colors">
                              <td className="p-4">
                                <p className="text-sm font-bold text-white">{item.name}</p>
                                {item.observation && (
                                  <p className="text-[10px] text-amber-400 italic mt-1">Obs: {item.observation}</p>
                                )}
                              </td>
                              <td className="p-4 text-center">
                                <span className="px-3 py-1 bg-white/5 rounded-lg text-xs font-bold text-slate-400">
                                  {item.quantity}x
                                </span>
                              </td>
                              <td className="p-4 text-right text-sm font-medium text-slate-400">
                                {formatPrice(item.price || 0)}
                              </td>
                              <td className="p-4 text-right text-sm font-black text-white">
                                {formatPrice((item.price || 0) * (item.quantity || 1))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-white/5 border-t border-white/10">
                          <tr>
                            <td colSpan={3} className="p-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Total do Pedido</td>
                            <td className="p-4 text-right text-xl font-black text-emerald-400">{formatPrice(selectedOrder.total || 0)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* Delivery Address */}
                  {selectedOrder.address && (
                    <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-4">
                      <div className="flex items-center gap-2 text-red-400">
                        <MapPin size={18} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Endereço de Entrega</span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-white">
                          {selectedOrder.address.street}, {selectedOrder.address.number}
                        </p>
                        <p className="text-xs text-slate-400">
                          {selectedOrder.address.neighborhood} - {selectedOrder.address.city}
                        </p>
                        {selectedOrder.address.complement && (
                          <p className="text-xs text-slate-500 italic">Comp: {selectedOrder.address.complement}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="p-6 md:p-8 border-t border-white/10 bg-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Alterar Status:</p>
                    <div className="flex items-center gap-2">
                      {(['pending', 'preparing', 'dispatched', 'completed', 'cancelled'] as const).map(status => (
                        <button
                          key={status}
                          onClick={() => handleUpdateOrderStatus(selectedOrder.id, status)}
                          className={`px-3 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${
                            selectedOrder.status === status 
                              ? 'bg-blue-600 text-white shadow-lg' 
                              : 'bg-white/5 text-slate-400 hover:bg-white/10'
                          }`}
                        >
                          {status === 'pending' ? 'Pendente' :
                           status === 'preparing' ? 'Preparando' :
                           status === 'dispatched' ? 'Entrega' :
                           status === 'completed' ? 'Concluído' : 'Cancelado'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => window.print()}
                      className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                    >
                      <Printer size={16} /> Imprimir
                    </button>
                    <button 
                      onClick={() => setSelectedOrder(null)}
                      className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-500/20 transition-all"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {activeTab === 'schedules' && (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter italic">Horários por Categorias</h2>
              <button 
                onClick={() => setIsAddingSchedule(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center space-x-3"
              >
                <Plus size={20} />
                <span>Adicionar por Horários</span>
              </button>
            </div>

            {isAddingSchedule || editingSchedule ? (
              <form onSubmit={editingSchedule ? handleEditSchedule : handleAddSchedule} className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 space-y-6 max-w-2xl">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nome do Horário</label>
                  <input 
                    type="text"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold uppercase tracking-tight focus:border-blue-500/50 transition-all"
                    placeholder="Ex: Almoço, Jantar..."
                    value={schedName}
                    onChange={(e) => setSchedName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Início</label>
                    <input 
                      type="text" placeholder="00:00"
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold uppercase tracking-tight focus:border-blue-500/50 transition-all"
                      value={schedStart}
                      onChange={(e) => setSchedStart(formatTimeInput(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Fim</label>
                    <input 
                      type="text" placeholder="00:00"
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold uppercase tracking-tight focus:border-blue-500/50 transition-all"
                      value={schedEnd}
                      onChange={(e) => setSchedEnd(formatTimeInput(e.target.value))}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Selecionar Categorias</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {categories.map((cat, idx) => (
                      <button
                        key={`admin-cat-sel-${cat.id}-${idx}`}
                        type="button"
                        onClick={() => {
                          if (schedCategories.includes(cat.id)) {
                            setSchedCategories(schedCategories.filter(id => id !== cat.id));
                          } else {
                            setSchedCategories([...schedCategories, cat.id]);
                          }
                        }}
                        className={`p-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${schedCategories.includes(cat.id) ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <button 
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20"
                  >
                    {editingSchedule ? 'Salvar Alterações' : 'Criar Horário'}
                  </button>
                  <button 
                    type="button"
                    onClick={resetScheduleForm}
                    className="px-8 py-5 rounded-2xl font-black uppercase tracking-widest bg-white/5 hover:bg-white/10 transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categorySchedules.map(schedule => (
                  <motion.div 
                    key={schedule.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/5 p-6 rounded-[2rem] border border-white/10 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-black uppercase tracking-tight italic text-white">{schedule.name}</h3>
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => {
                            setEditingSchedule(schedule);
                            setSchedName(schedule.name);
                            setSchedStart(schedule.startTime);
                            setSchedEnd(schedule.endTime);
                            setSchedCategories(schedule.categoryIds);
                            setSchedActive(schedule.active);
                          }}
                          className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-blue-400"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteSchedule(schedule.id)}
                          className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-red-400"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 text-slate-400">
                      <div className="flex items-center space-x-2">
                        <Clock size={14} className="text-blue-400" />
                        <span className="text-xs font-bold">{schedule.startTime} - {schedule.endTime}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Categorias:</p>
                      <div className="flex flex-wrap gap-2">
                        {Array.from(new Set(schedule.categoryIds || [])).map(catId => {
                          const cat = categories.find(c => c.id === catId);
                          return (
                            <span key={catId} className="px-3 py-1 bg-white/5 rounded-lg text-[10px] font-bold text-slate-300 border border-white/5">
                              {cat?.name || 'Desconhecida'}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                ))}
                {categorySchedules.length === 0 && (
                  <div className="col-span-full py-20 text-center opacity-40">
                    <Clock size={48} className="mx-auto mb-4" />
                    <p className="text-sm font-black uppercase tracking-widest">Nenhum horário configurado</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'partners' && (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                <h2 className="text-4xl font-black uppercase tracking-tighter italic bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent">Gestão de Sócios</h2>
                <div className="flex items-center space-x-2 text-blue-400">
                  <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Monitoramento em tempo real de parceiros regionais</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAddingPartner(true)}
                className="group relative px-8 py-4 bg-blue-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl shadow-blue-500/20 hover:bg-blue-700 transition-all overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <div className="relative flex items-center space-x-2">
                  <Plus size={18} />
                  <span>Novo Sócio</span>
                </div>
              </button>
            </div>

            {isAddingPartner && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900/80 backdrop-blur-xl p-8 rounded-[3rem] border border-white/10 space-y-8 max-w-2xl shadow-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-8">
                  <button onClick={() => setIsAddingPartner(false)} className="p-3 hover:bg-white/5 rounded-2xl transition-all text-white/40 hover:text-white">
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-black uppercase tracking-tight italic text-blue-400">Configurar Novo Sócio</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Defina a região e o nome do parceiro</p>
                </div>

                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (!partnerName || !partnerCityId || !partnerPassword) return;
                  try {
                    const city = cities.find(c => c.id === partnerCityId);
                    const cityName = city?.name || 'Unknown';
                    const branchId = cityName.trim();
                    
                    await setDoc(doc(db, 'branches', branchId), {
                      name: partnerName,
                      cityId: partnerCityId,
                      cityName: cityName,
                      password: partnerPassword,
                      createdAt: serverTimestamp(),
                      total_restaurantes: 0,
                      ganhos_gerais: 0,
                      recargas_pix: 0,
                      recargas_manuais: 0,
                      faturamento_hoje: 0
                    });

                    setPartnerName('');
                    setPartnerCityId('');
                    setPartnerPassword('');
                    setIsAddingPartner(false);
                  } catch (error) {
                    handleFirestoreError(error, OperationType.CREATE, 'branches');
                  }
                }} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-4">Nome do Sócio/Filial</label>
                      <input 
                        required 
                        value={partnerName} 
                        onChange={e => setPartnerName(e.target.value)} 
                        className="w-full p-5 bg-white/5 rounded-[2rem] border border-white/10 focus:ring-2 focus:ring-blue-500/50 transition-all font-bold text-sm" 
                        placeholder="Ex: Sócio Tupã Centro"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-4">Cidade de Atuação</label>
                      <select 
                        required 
                        value={partnerCityId} 
                        onChange={e => setPartnerCityId(e.target.value)} 
                        className="w-full p-5 bg-slate-800 rounded-[2rem] border border-white/10 focus:ring-2 focus:ring-blue-500/50 transition-all font-bold text-sm appearance-none"
                      >
                        <option value="">Selecionar Cidade...</option>
                        {uniqueCities.map((city, idx) => (
                          <option key={`city-opt-1-${city.id}-${idx}`} value={city.id}>{city.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-4">Senha de Acesso</label>
                      <div className="relative">
                        <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                        <input 
                          required 
                          type="text"
                          value={partnerPassword} 
                          onChange={e => setPartnerPassword(e.target.value)} 
                          className="w-full p-5 pl-14 bg-white/5 rounded-[2rem] border border-white/10 focus:ring-2 focus:ring-blue-500/50 transition-all font-bold text-sm" 
                          placeholder="Defina a senha para o sócio..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button type="submit" className="flex-1 bg-blue-600 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-2xl shadow-blue-500/20 hover:bg-blue-700 transition-all">
                      Confirmar Parceiro
                    </button>
                    <button type="button" onClick={() => setIsAddingPartner(false)} className="px-10 py-5 bg-white/5 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-white/10 transition-all">
                      Cancelar
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {displayedPartners.map((partner, idx) => {
                const branchRestaurants = restaurants.filter(r => r.city === partner.cityName || r.branchId === partner.id);
                const branchWalletTotal = branchRestaurants.reduce((acc, res) => {
                  const wallet = wallets.find(w => w.ownerUid === res.ownerUid || w.ownerUid === res.id);
                  return acc + (wallet?.balance || 0);
                }, 0);

                // Calculate real-time totals from transactions
                const branchTransactions = partnerTransactions.filter(t => 
                  t.branchId === partner.id || 
                  t.cityId === partner.cityId || 
                  t.cityName === partner.cityName ||
                  t.city === partner.cityName
                );
                const pixTotal = branchTransactions.filter(t => t.type === 'recharge' && t.method === 'pix').reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
                const manualTotal = branchTransactions.filter(t => t.type === 'recharge' && t.method === 'manual').reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
                
                return (
                  <motion.div 
                    key={`${partner.id}-${idx}`}
                    layout
                    whileHover={{ y: -5 }}
                    className="bg-slate-900/40 backdrop-blur-md border border-white/10 p-8 rounded-[3rem] space-y-8 group hover:border-blue-500/50 transition-all relative overflow-hidden shadow-2xl"
                  >
                    {/* Decorative background element */}
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-600/10 blur-[80px] rounded-full group-hover:bg-blue-600/20 transition-all" />

                    <div className="flex items-start justify-between relative z-10">
                      <div className="flex items-center space-x-5">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-800 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl shadow-blue-500/20 group-hover:scale-110 transition-transform">
                          <Handshake size={32} />
                        </div>
                        <div>
                          <h3 className="text-2xl font-black uppercase tracking-tight italic leading-tight">{partner.name}</h3>
                          <div className="flex items-center space-x-2 text-blue-400/60">
                            <MapPin size={12} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{partner.cityName}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col space-y-2">
                        <button 
                          onClick={() => {
                            const link = `${window.location.origin}/branch/${partner.id}`;
                            navigator.clipboard.writeText(link);
                            setCopiedPartnerId(partner.id);
                            setTimeout(() => setCopiedPartnerId(null), 2000);
                          }}
                          className="p-3 bg-white/5 hover:bg-blue-500/20 text-blue-400 rounded-2xl transition-all relative group/btn"
                        >
                          {copiedPartnerId === partner.id ? <Check size={16} /> : <Link size={16} />}
                          <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-blue-600 text-white text-[8px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap">
                            {copiedPartnerId === partner.id ? 'Copiado!' : 'Copiar Link'}
                          </div>
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedPartner(partner);
                            setIsPartnerViewOpen(true);
                          }}
                          className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl transition-all"
                        >
                          <Eye size={16} />
                        </button>
                        <button 
                          onClick={() => {
                            setPartnerToDelete(partner.id);
                            setIsDeletingPartnerModalOpen(true);
                          }}
                          className="p-3 bg-white/5 hover:bg-red-500/20 text-red-400 rounded-2xl transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4 relative z-10">
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-1">
                        <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Crédito Total</p>
                        <p className="text-xl font-black italic text-emerald-400">{formatPrice(branchWalletTotal)}</p>
                      </div>
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-1">
                        <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Empresas</p>
                        <p className="text-xl font-black italic text-white">{branchRestaurants.length}</p>
                      </div>
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-1">
                        <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Recargas Pix</p>
                        <p className="text-xl font-black italic text-blue-400">R$ {pixTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-1">
                        <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Recargas Manual</p>
                        <p className="text-xl font-black italic text-orange-400">R$ {manualTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/5 relative z-10">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-40 italic">Faturamento Geral</p>
                        <p className="text-2xl font-black italic text-green-400">R$ {partner.ganhos_gerais?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 relative z-10">
                      <div className="bg-white/5 p-5 rounded-[2rem] border border-white/5 hover:bg-white/10 transition-all">
                        <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-2">Faturamento Hoje</p>
                        <p className="text-xl font-black italic text-white">R$ {partner.faturamento_hoje?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}</p>
                      </div>
                      <div className="bg-white/5 p-5 rounded-[2rem] border border-white/5 hover:bg-white/10 transition-all">
                        <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-2">Ganhos Gerais</p>
                        <p className="text-xl font-black italic text-green-400">R$ {partner.ganhos_gerais?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}</p>
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        setSelectedPartner(partner);
                        setIsPartnerViewOpen(true);
                      }}
                      className="w-full py-5 bg-white/5 hover:bg-blue-600 hover:text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center space-x-3 group/view relative z-10"
                    >
                      <span>Analisar Performance</span>
                      <ChevronRight size={16} className="group-hover/view:translate-x-1 transition-transform" />
                    </button>

                    <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </motion.div>
                );
              })}
            </div>

            {partners.length > partnersLimit && (
              <div className="flex justify-center pt-8">
                <button 
                  onClick={() => setPartnersLimit(prev => prev + 3)}
                  className="px-8 py-3 bg-white/5 border border-white/10 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2"
                >
                  <Plus size={16} />
                  Ver Mais Parceiros
                </button>
              </div>
            )}

            {partners.length === 0 && (
                <div className="col-span-full py-32 flex flex-col items-center justify-center space-y-6 opacity-20">
                  <div className="relative">
                    <Handshake size={80} className="text-blue-400" />
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 border-2 border-dashed border-blue-400/30 rounded-full scale-150"
                    />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-xl font-black uppercase tracking-tighter italic">Nenhum Sócio Encontrado</p>
                    <p className="text-[10px] font-black uppercase tracking-widest">Inicie a expansão criando seu primeiro parceiro regional</p>
                  </div>
                </div>
              )}
          </div>
        )}

        {activeTab === 'restaurants' && (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter italic">Gestão de Restaurantes</h2>
                <div className="flex items-center space-x-3 bg-white/5 p-2 rounded-2xl border border-white/10">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-2">Cobrança Mensalidade:</span>
                  <button 
                    onClick={() => updateGlobalSettings({ autoMonthlyBilling: !globalSettings?.autoMonthlyBilling })}
                    className={`relative w-12 h-6 rounded-full transition-all duration-300 ${globalSettings?.autoMonthlyBilling ? 'bg-green-600' : 'bg-slate-700'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${globalSettings?.autoMonthlyBilling ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
              </div>
              <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text"
                    placeholder="Pesquisar restaurante..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-xs font-bold uppercase tracking-tight focus:border-blue-500/50 transition-all"
                    value={restaurantSearchTerm}
                    onChange={(e) => setRestaurantSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex items-center space-x-2 bg-white/5 p-1 rounded-2xl border border-white/10">
                  <button 
                    onClick={() => setRestaurantSortBy('recent')}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${restaurantSortBy === 'recent' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-white/5 opacity-60'}`}
                  >
                    Recentes
                  </button>
                  <button 
                    onClick={() => setRestaurantSortBy('sales')}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${restaurantSortBy === 'sales' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-white/5 opacity-60'}`}
                  >
                    Mais Vendas
                  </button>
                </div>
                <div className="flex items-center space-x-2">
                  <input 
                    type="date" 
                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest focus:ring-0"
                    onChange={(e) => setRestaurantStartDate(e.target.value)}
                  />
                  <span className="text-[10px] opacity-40">até</span>
                  <input 
                    type="date" 
                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest focus:ring-0"
                    onChange={(e) => setRestaurantEndDate(e.target.value)}
                  />
                </div>
                <button 
                  onClick={() => setShowRestaurantMap(!showRestaurantMap)}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-xl text-xs font-bold transition-all ${
                    showRestaurantMap 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                      : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <MapPin size={16} />
                  <span>{showRestaurantMap ? 'Fechar Mapa' : 'Abrir Mapa'}</span>
                </button>
                <button 
                  onClick={() => setIsAddingRestaurant(true)}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all"
                >
                  <Plus size={16} />
                  <span>Novo Restaurante</span>
                </button>
              </div>
            </div>

            <div className="md:hidden relative w-full mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text"
                placeholder="Pesquisar restaurante..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-xs font-bold uppercase tracking-tight focus:border-blue-500/50 transition-all"
                value={restaurantSearchTerm}
                onChange={(e) => setRestaurantSearchTerm(e.target.value)}
              />
            </div>

            <AnimatePresence>
              {showRestaurantMap && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <MapSection 
                    title="Restaurantes"
                    items={restaurants.map(r => ({ 
                      id: r.id, 
                      name: r.name, 
                      lat: r.latitude || 0, 
                      lng: r.longitude || 0, 
                      type: 'restaurant' 
                    }))} 
                  />
                </motion.div>
              )}
            </AnimatePresence>
            
            {(isAddingRestaurant || editingRestaurant) && (
              <form onSubmit={editingRestaurant ? handleEditRestaurant : handleAddRestaurant} className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-6 max-w-4xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black uppercase tracking-tight italic">
                    {editingRestaurant ? 'Editar Restaurante' : 'Novo Restaurante'}
                  </h3>
                  <button type="button" onClick={() => { setEditingRestaurant(null); setIsAddingRestaurant(false); }} className="text-white/40 hover:text-white transition-colors">
                    <X size={24} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Nome do Restaurante</label>
                      <input id="resNameAdmin" required value={resName} onChange={e => setResName(e.target.value)} className="w-full p-4 bg-white/5 rounded-2xl border border-white/10 focus:ring-2 focus:ring-blue-500/50" />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Modalidade</label>
                      <select 
                        required 
                        value={resModality} 
                        onChange={e => setResModality(e.target.value)} 
                        className="w-full p-4 bg-slate-800 rounded-2xl border border-white/10 focus:ring-2 focus:ring-blue-500/50"
                      >
                        <option value="">Selecionar Modalidade...</option>
                        {businessCategories.map((cat, idx) => (
                          <option key={`${cat.id}-${idx}`} value={cat.name}>{cat.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Status</label>
                      <select value={resStatus} onChange={e => setResStatus(e.target.value)} className="w-full p-4 bg-slate-800 rounded-2xl border border-white/10 focus:ring-2 focus:ring-blue-500/50">
                        <option value="active">Ativo</option>
                        <option value="inactive">Inativo</option>
                        <option value="banned">Banido</option>
                      </select>
                    </div>

                    {!editingRestaurant && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40">UID do Dono (Opcional)</label>
                        <input value={resOwnerUid} onChange={e => setResOwnerUid(e.target.value)} className="w-full p-4 bg-white/5 rounded-2xl border border-white/10 focus:ring-2 focus:ring-blue-500/50" placeholder="UID do usuário" />
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40">WhatsApp</label>
                      <input id="resWhatsappAdmin" value={resWhatsapp} onChange={e => setResWhatsapp(e.target.value)} className="w-full p-4 bg-white/5 rounded-2xl border border-white/10 focus:ring-2 focus:ring-blue-500/50" placeholder="(00) 00000-0000" />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Ponto de Referência</label>
                      <input value={resReferencePoint} onChange={e => setResReferencePoint(e.target.value)} className="w-full p-4 bg-white/5 rounded-2xl border border-white/10 focus:ring-2 focus:ring-blue-500/50" placeholder="Ex: Próximo ao mercado X" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Cidade</label>
                        <select 
                          id="resCityAdmin"
                          value={resCity} 
                          onChange={e => {
                            const cityName = e.target.value;
                            setResCity(cityName);
                            const city = cities.find(c => c.name === cityName);
                            if (city) setResCityId(city.id);
                            const branch = partners.find(b => b.cityName === cityName);
                            if (branch) setResBranchId(branch.id);
                          }} 
                          className="w-full p-4 bg-slate-800 rounded-2xl border border-white/10 focus:ring-2 focus:ring-blue-500/50"
                        >
                          <option value="">Nenhuma</option>
                          {uniqueCities.map((city, idx) => (
                            <option key={`res-city-opt-${city.id}-${idx}`} value={city.name}>{city.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Sócio</label>
                        <select 
                          value={resBranchId} 
                          onChange={e => setResBranchId(e.target.value)} 
                          className="w-full p-4 bg-slate-800 rounded-2xl border border-white/10 focus:ring-2 focus:ring-blue-500/50"
                        >
                          <option value="">Nenhum</option>
                          {partners.map((partner, idx) => (
                            <option key={`${partner.id}-${idx}`} value={partner.id}>{partner.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Imagem do Restaurante</label>
                      <div className="flex gap-4 items-center">
                        <label className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center space-x-2 cursor-pointer">
                          <Plus size={16} />
                          <span>Alterar Foto</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => handleFileUpload(e, 'res')} 
                          />
                        </label>
                        {resImg && (
                          <div className="w-16 h-16 rounded-2xl overflow-hidden border border-white/10 flex-shrink-0">
                            <img src={resImg} className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Descrição</label>
                      <textarea id="resDescAdmin" value={resDesc} onChange={e => setResDesc(e.target.value)} className="w-full p-4 bg-white/5 rounded-2xl border border-white/10 min-h-[120px] focus:ring-2 focus:ring-blue-500/50" />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Senha do Gestor (Firestore/Auth)</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input 
                          type="text" 
                          value={resManagerPassword} 
                          onChange={e => setResManagerPassword(e.target.value)} 
                          className="w-full p-4 pl-12 bg-white/5 rounded-2xl border border-white/10 focus:ring-2 focus:ring-blue-500/50 font-mono" 
                          placeholder="Alterar senha do gestor..." 
                        />
                      </div>
                      <p className="text-[8px] font-bold text-slate-500 uppercase px-2 italic">Ao salvar, a senha mudará no Firebase Auth e no cadastro do usuário no Firestore.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Abre às</label>
                        <input id="resOpenAdmin" type="text" inputMode="numeric" placeholder="00:00" value={resOpen} onChange={e => setResOpen(e.target.value)} className="w-full p-4 bg-white/5 rounded-2xl border border-white/10 focus:ring-2 focus:ring-blue-500/50" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Fecha às</label>
                        <input id="resCloseAdmin" type="text" inputMode="numeric" placeholder="00:00" value={resClose} onChange={e => setResClose(e.target.value)} className="w-full p-4 bg-white/5 rounded-2xl border border-white/10 focus:ring-2 focus:ring-blue-500/50" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 border-t border-white/10 pt-6">
                  <h4 className="text-sm font-black uppercase tracking-tight text-blue-400 flex items-center gap-2 italic">
                    <Clock size={16} />
                    <span>Horários de Funcionamento (Semanal)</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {(Object.keys(weeklyHours) as Array<keyof WeeklyHours>).map((day, idx) => (
                      <div key={`weekly-hour-${day}-${idx}`} className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-widest italic opacity-60 capitalize">
                            {day === 'monday' ? 'Segunda' : 
                             day === 'tuesday' ? 'Terça' : 
                             day === 'wednesday' ? 'Quarta' : 
                             day === 'thursday' ? 'Quinta' : 
                             day === 'friday' ? 'Sexta' : 
                             day === 'saturday' ? 'Sábado' : 'Domingo'}
                          </span>
                          <input 
                            type="checkbox" 
                            checked={weeklyHours[day].closed}
                            onChange={e => setWeeklyHours(prev => ({
                              ...prev,
                              [day]: { ...prev[day], closed: e.target.checked }
                            }))}
                            className="rounded border-white/20 bg-white/5 text-blue-600 focus:ring-blue-500"
                          />
                        </div>
                        {!weeklyHours[day].closed ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Almoço?</span>
                              <input 
                                type="checkbox" 
                                checked={weeklyHours[day].closesForLunch}
                                onChange={e => setWeeklyHours(prev => ({
                                  ...prev,
                                  [day]: { ...prev[day], closesForLunch: e.target.checked }
                                }))}
                                className="rounded border-white/20 bg-white/5 text-blue-600 focus:ring-blue-500"
                              />
                            </div>
                            
                            {!weeklyHours[day].closesForLunch ? (
                              <div className="grid grid-cols-2 gap-2">
                                <input 
                                  type="text" inputMode="numeric" placeholder="00:00" value={weeklyHours[day].open}
                                  onChange={e => setWeeklyHours(prev => ({
                                    ...prev,
                                    [day]: { ...prev[day], open: formatTimeInput(e.target.value) }
                                  }))}
                                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-[10px] font-bold"
                                />
                                <input 
                                  type="text" inputMode="numeric" placeholder="00:00" value={weeklyHours[day].close}
                                  onChange={e => setWeeklyHours(prev => ({
                                    ...prev,
                                    [day]: { ...prev[day], close: formatTimeInput(e.target.value) }
                                  }))}
                                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-[10px] font-bold"
                                />
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                  <input 
                                    type="text" inputMode="numeric" placeholder="00:00" value={weeklyHours[day].open}
                                    onChange={e => setWeeklyHours(prev => ({
                                      ...prev,
                                      [day]: { ...prev[day], open: formatTimeInput(e.target.value) }
                                    }))}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-[10px] font-bold"
                                  />
                                  <input 
                                    type="text" inputMode="numeric" placeholder="00:00" value={weeklyHours[day].lunchStart}
                                    onChange={e => setWeeklyHours(prev => ({
                                      ...prev,
                                      [day]: { ...prev[day], lunchStart: formatTimeInput(e.target.value) }
                                    }))}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-[10px] font-bold"
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <input 
                                    type="text" inputMode="numeric" placeholder="00:00" value={weeklyHours[day].lunchEnd}
                                    onChange={e => setWeeklyHours(prev => ({
                                      ...prev,
                                      [day]: { ...prev[day], lunchEnd: formatTimeInput(e.target.value) }
                                    }))}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-[10px] font-bold"
                                  />
                                  <input 
                                    type="text" inputMode="numeric" placeholder="00:00" value={weeklyHours[day].close}
                                    onChange={e => setWeeklyHours(prev => ({
                                      ...prev,
                                      [day]: { ...prev[day], close: formatTimeInput(e.target.value) }
                                    }))}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-[10px] font-bold"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-[10px] font-black text-red-500 uppercase tracking-widest text-center py-2">Fechado</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 border-t border-white/10 pt-6">
                  <h4 className="text-sm font-black uppercase tracking-tight text-blue-400 flex items-center gap-2 italic">
                    <DollarSign size={16} />
                    <span>Configuração de Pix</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Tipo de Configuração</label>
                      <select value={resPixConfigType} onChange={e => setResPixConfigType(e.target.value as any)} className="w-full p-4 bg-slate-800 rounded-2xl border border-white/10 focus:ring-2 focus:ring-blue-500/50">
                        <option value="none">Nenhuma (Padrão)</option>
                        <option value="company">Pix da Empresa</option>
                        <option value="central">Pix da Central</option>
                      </select>
                    </div>
                    {resPixConfigType === 'company' && (
                      <>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Tipo de Chave</label>
                          <select value={resPixType} onChange={e => setResPixType(e.target.value as any)} className="w-full p-4 bg-slate-800 rounded-2xl border border-white/10 focus:ring-2 focus:ring-blue-500/50">
                            <option value="cpf">CPF</option>
                            <option value="cnpj">CNPJ</option>
                            <option value="email">E-mail</option>
                            <option value="phone">Telefone</option>
                            <option value="random">Chave Aleatória</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Chave Pix</label>
                          <input value={resPixKey} onChange={e => setResPixKey(e.target.value)} className="w-full p-4 bg-white/5 rounded-2xl border border-white/10 focus:ring-2 focus:ring-blue-500/50" placeholder="Insira a chave Pix" />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-4 border-t border-white/10 pt-6">
                  <h4 className="text-sm font-black uppercase tracking-tight text-blue-400 flex items-center gap-2 italic">
                    <Volume2 size={16} />
                    <span>Configuração de Sons e Notificações</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Som de Novos Pedidos</label>
                      <div className="flex gap-3 items-center">
                        <label className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center space-x-2 cursor-pointer">
                          <Music size={16} />
                          <span>Selecionar Som</span>
                          <input 
                            type="file" 
                            accept="audio/*" 
                            className="hidden" 
                            onChange={(e) => handleSoundUpload(e, 'order')} 
                          />
                        </label>
                        {resOrderSoundUrl && (
                          <div className="flex items-center space-x-2 bg-white/5 p-2 rounded-2xl border border-white/10">
                            <button 
                              type="button"
                              onClick={() => {
                                const audio = new Audio(resOrderSoundUrl);
                                audio.play();
                              }}
                              className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                            >
                              <Play size={14} />
                            </button>
                            <button 
                              type="button"
                              onClick={() => setResOrderSoundUrl('')}
                              className="p-3 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Som de Novas Mensagens</label>
                      <div className="flex gap-3 items-center">
                        <label className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center space-x-2 cursor-pointer">
                          <MessageSquare size={16} />
                          <span>Selecionar Som</span>
                          <input 
                            type="file" 
                            accept="audio/*" 
                            className="hidden" 
                            onChange={(e) => handleSoundUpload(e, 'message')} 
                          />
                        </label>
                        {resMessageSoundUrl && (
                          <div className="flex items-center space-x-2 bg-white/5 p-2 rounded-2xl border border-white/10">
                            <button 
                              type="button"
                              onClick={() => {
                                const audio = new Audio(resMessageSoundUrl);
                                audio.play();
                              }}
                              className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                            >
                              <Play size={14} />
                            </button>
                            <button 
                              type="button"
                              onClick={() => setResMessageSoundUrl('')}
                              className="p-3 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                          <Calendar size={18} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest">Mensalidade Ativa</p>
                          <p className="text-[8px] font-bold opacity-40 uppercase">Ativa ou desativa a mensalidade</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setResSubscriptionActive(!resSubscriptionActive)}
                        className={`w-12 h-6 rounded-full transition-all relative ${resSubscriptionActive ? 'bg-emerald-500' : 'bg-white/10'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${resSubscriptionActive ? 'right-1' : 'left-1'}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
                          <Volume2 size={18} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest">Volume Automático</p>
                          <p className="text-[8px] font-bold opacity-40 uppercase">Aumenta o volume ao chegar pedido</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setResAutoVolume(!resAutoVolume)}
                        className={`w-12 h-6 rounded-full transition-all relative ${resAutoVolume ? 'bg-blue-600' : 'bg-white/10'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${resAutoVolume ? 'right-1' : 'left-1'}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
                          <Smartphone size={18} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest">Sobreposição de Tela</p>
                          <p className="text-[8px] font-bold opacity-40 uppercase">Obrigatório para notificações</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          const newValue = !resScreenOverlay;
                          setResScreenOverlay(newValue);
                          if (newValue && Notification.permission !== 'granted') {
                            await Notification.requestPermission();
                          }
                        }}
                        className={`w-12 h-6 rounded-full transition-all relative ${resScreenOverlay ? 'bg-amber-500' : 'bg-white/10'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${resScreenOverlay ? 'right-1' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-4 pt-6">
                  {formError && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500"
                    >
                      <AlertTriangle size={20} />
                      <span className="text-xs font-black uppercase tracking-widest">{formError}</span>
                    </motion.div>
                  )}
                  <div className="flex gap-4">
                    <button type="submit" className="flex-1 bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all">
                      {editingRestaurant ? 'Salvar Alterações' : 'Cadastrar Restaurante'}
                    </button>
                    <button type="button" onClick={() => { setEditingRestaurant(null); setIsAddingRestaurant(false); }} className="px-10 py-5 bg-white/5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-white/10 transition-all">
                      Cancelar
                    </button>
                  </div>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 gap-4">
              {displayedRestaurants.map((res, idx) => {
                const resSales = allOrders.filter(o => o.restaurantId === res.id && o.status === 'completed').reduce((acc, o) => acc + (o.total || 0), 0);
                const resOrders = allOrders.filter(o => o.restaurantId === res.id).length;
                const manager = users.find(u => u.uid === res.ownerUid);

                return (
                  <div key={`res-list-1-${res.id}-${idx}`} className="bg-white/5 border border-white/10 p-6 rounded-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 group hover:bg-white/10 transition-all">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 rounded-2xl overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center">
                        {res.imageUrl ? (
                          <img src={res.imageUrl || undefined} className="w-full h-full object-cover" />
                        ) : (
                          <Store size={24} className="text-white/20" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-xl font-bold uppercase tracking-tight italic">{res.name}</h3>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-x-3 gap-y-1">
                          <p className="text-[10px] font-mono opacity-40">ID: {res.id}</p>
                          {res.city && <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">{res.city}</p>}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col space-y-1.5 bg-black/30 p-3 rounded-xl border border-white/10 min-w-[200px]">
                      <p className="text-[8px] font-black uppercase tracking-widest opacity-50 mb-0.5 flex items-center gap-1.5">
                        <Key size={10} className="text-amber-400" />
                        ACESSO DO GESTOR
                      </p>
                      <div className="flex items-center gap-2 group/email cursor-pointer" onClick={() => { navigator.clipboard.writeText(manager?.email || ''); alert('E-mail copiado!'); }}>
                        <Mail size={12} className="text-blue-400 shrink-0" />
                        <p className="text-[10px] font-bold text-slate-200 truncate">{manager?.email || 'Sem e-mail'}</p>
                      </div>
                      <div className="flex items-center gap-2 group/pass cursor-pointer" onClick={() => { navigator.clipboard.writeText(manager?.password || ''); alert('Senha copiada!'); }}>
                        <Lock size={12} className="text-amber-400 shrink-0" />
                        <p className="text-[11px] font-mono font-black tracking-tighter text-amber-200">{manager?.password || '---'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 flex-1 lg:max-w-xs">
                      <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                        <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">Vendas</p>
                        <p className="text-sm font-black text-emerald-400">{formatPrice(resSales)}</p>
                      </div>
                      <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                        <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">Pedidos</p>
                        <p className="text-sm font-black">{resOrders}</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-center space-y-2 bg-black/20 p-3 rounded-xl border border-white/5 min-w-[150px]">
                      <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">Crédito em Carteira</p>
                      <p className="text-sm font-black text-blue-400">
                        {formatPrice(wallets.find(w => w.ownerUid === res.ownerUid || w.ownerUid === res.id)?.balance || 0)}
                      </p>
                      <div className="flex gap-1 w-full">
                        <button 
                          onClick={async () => {
                            try {
                              const newState = !res.unlimitedCredit;
                              await updateDoc(doc(db, 'restaurants', res.id), {
                                unlimitedCredit: newState,
                                // If activating, unblock wallet immediately for instant effect
                                ...(newState ? { isWalletBlocked: false } : {})
                              });
                            } catch (error) {
                              console.error("Error toggling unlimited credit:", error);
                            }
                          }}
                          className={`flex-1 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all border relative overflow-hidden ${
                            res.unlimitedCredit 
                              ? 'bg-emerald-600 text-white border-emerald-400 shadow-lg shadow-emerald-500/40' 
                              : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/20 hover:text-blue-400 animate-pulse ring-1 ring-white/5'
                          }`}
                        >
                          <span className="relative z-10">
                            {res.unlimitedCredit ? 'Crédito Ativo' : 'Crédito Ativar'}
                          </span>
                        </button>
                      </div>

                      <div className="flex gap-1 w-full">
                        <button 
                          onClick={() => {
                            setSelectedRestaurantForCredit(res);
                            setCreditAction('add');
                            setIsCreditModalOpen(true);
                          }}
                          className="px-2 bg-green-600/20 text-green-400 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-green-600 hover:text-white transition-all"
                        >
                          Add
                        </button>
                        <button 
                          onClick={() => setShowAutoCreditConfirm({ uid: res.ownerUid || res.id, name: res.name, branchId: res.branchId })}
                          className="flex-1 bg-blue-600/20 text-blue-400 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all border border-blue-500/30"
                        >
                          Auto
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedRestaurantForCredit(res);
                            setCreditAction('remove');
                            setIsCreditModalOpen(true);
                          }}
                          className="px-2 bg-red-600/20 text-red-400 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all"
                        >
                          Ret
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 w-full lg:w-auto justify-between lg:justify-end">
                      {quickEditRestaurantId === res.id ? (
                        <div className="flex flex-wrap gap-2 bg-black/40 p-3 rounded-2xl border border-blue-500/30">
                          <input 
                            value={quickEditName} 
                            onChange={e => setQuickEditName(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[10px] w-32"
                            placeholder="Nome"
                          />
                          <input 
                            value={quickEditWhatsapp} 
                            onChange={e => setQuickEditWhatsapp(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[10px] w-24"
                            placeholder="WhatsApp"
                          />
                          <select 
                            value={quickEditStatus} 
                            onChange={e => setQuickEditStatus(e.target.value)}
                            className="bg-slate-800 border border-white/10 rounded-lg px-2 py-1 text-[10px]"
                          >
                            <option value="active">Ativo</option>
                            <option value="inactive">Inativo</option>
                            <option value="banned">Banido</option>
                          </select>
                          <button 
                            onClick={() => handleQuickEditRestaurant(res.id)}
                            className="bg-blue-600 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase"
                          >
                            OK
                          </button>
                          <button 
                            onClick={() => setQuickEditRestaurantId(null)}
                            className="bg-white/10 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase"
                          >
                            X
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => toggleRestaurantStatus(res.id, res.status)}
                          className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${res.status === 'active' ? 'bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white' : 'bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white'}`}
                        >
                          {res.status}
                        </button>
                      )}
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => {
                            setSelectedRestaurantForMenu(res);
                            setIsMenuModalOpen(true);
                          }}
                          className="p-3 bg-white/5 hover:bg-emerald-500 hover:text-white rounded-full transition-all"
                          title="Gerenciar Cardápio"
                        >
                          <Utensils size={20} />
                        </button>
                        <button 
                          onClick={() => {
                            setQuickEditRestaurantId(res.id);
                            setQuickEditName(res.name);
                            setQuickEditWhatsapp(res.whatsapp || '');
                            setQuickEditCity(res.city || '');
                            setQuickEditStatus(res.status);
                          }}
                          className="p-3 bg-white/5 hover:bg-blue-500 hover:text-white rounded-full transition-all"
                          title="Edição Rápida"
                        >
                          <Zap size={20} />
                        </button>
                        <button 
                          onClick={() => toggleRestaurantSubscription(res.id, res.subscriptionStatus)}
                          className={`p-3 rounded-full transition-all flex items-center gap-2 ${res.subscriptionStatus === 'active' ? 'bg-emerald-500 text-white' : 'bg-white/5 hover:bg-emerald-500/20 text-emerald-500'}`}
                          title={res.subscriptionStatus === 'active' ? "Desativar Mensalidade" : "Ativar Mensalidade"}
                        >
                          <Calendar size={20} />
                        </button>
                        <button 
                          onClick={() => toggleFamousStatus(res.id, !!res.isFamous)}
                          className={`p-3 rounded-full transition-all flex items-center gap-2 ${res.isFamous ? 'bg-amber-500 text-white' : 'bg-white/5 hover:bg-amber-500/20 text-amber-500'}`}
                          title={res.isFamous ? "Remover dos Famosos" : "Tornar Famoso"}
                        >
                          <Star size={20} fill={res.isFamous ? "currentColor" : "none"} />
                        </button>
                        <button onClick={() => startEditingRestaurant(res)} className="p-3 hover:bg-blue-500 hover:text-white rounded-full transition-all">
                          <Edit2 size={20} />
                        </button>
                        <button onClick={() => handleDeleteRestaurant(res)} className="p-3 hover:bg-red-500 hover:text-white rounded-full transition-all">
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredRestaurants.length > restaurantsLimit && (
              <div className="flex justify-center pt-8">
                <button 
                  onClick={() => setRestaurantsLimit(prev => prev + 3)}
                  className="px-8 py-3 bg-white/5 border border-white/10 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2"
                >
                  <Plus size={16} />
                  Ver Mais Restaurantes
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'banners' && (
          <div className="space-y-12">
            <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter italic">Banners Promocionais</h2>

            <form onSubmit={handleAddBanner} className="bg-white/5 p-6 md:p-8 rounded-3xl border border-white/10 space-y-6 max-w-2xl">
              <h3 className="text-lg font-bold uppercase tracking-tight">Novo Banner</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Título do Banner</label>
                  <input required value={bannerTitle} onChange={e => setBannerTitle(e.target.value)} className="w-full p-4 bg-white/5 rounded-xl border border-white/10 focus:ring-2 focus:ring-blue-500/50" />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Tipo de Link</label>
                  <select 
                    value={bannerLinkType} 
                    onChange={e => {
                      setBannerLinkType(e.target.value as any);
                      setBannerLinkId('');
                      setBannerSearchTerm('');
                    }}
                    className="w-full p-4 bg-white/5 rounded-xl border border-white/10 focus:ring-2 focus:ring-blue-500/50"
                  >
                    <option value="external">Link Externo (URL)</option>
                    <option value="restaurant">Empresa/Restaurante</option>
                    <option value="product">Produto Específico</option>
                  </select>
                </div>

                {bannerLinkType === 'external' ? (
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40">URL do Link</label>
                    <input value={bannerLink} onChange={e => setBannerLink(e.target.value)} className="w-full p-4 bg-white/5 rounded-xl border border-white/10 focus:ring-2 focus:ring-blue-500/50" placeholder="https://exemplo.com" />
                  </div>
                ) : bannerLinkType === 'restaurant' ? (
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Selecionar Empresa</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40">
                        <Search size={16} />
                      </div>
                      <input 
                        placeholder="Pesquisar empresa..."
                        value={bannerSearchTerm}
                        onChange={e => setBannerSearchTerm(e.target.value)}
                        className="w-full p-4 pl-12 bg-white/5 rounded-xl border border-white/10 focus:ring-2 focus:ring-blue-500/50 mb-2"
                      />
                    </div>
                    <select 
                      required
                      value={bannerLinkId} 
                      onChange={e => setBannerLinkId(e.target.value)}
                      className="w-full p-4 bg-white/5 rounded-xl border border-white/10 focus:ring-2 focus:ring-blue-500/50"
                    >
                      <option value="">Selecione uma empresa...</option>
                      {restaurants
                        .filter(r => r.name?.toLowerCase().includes(bannerSearchTerm.toLowerCase()))
                        .map((r, idx) => (
                          <option key={`${r.id}-${idx}`} value={r.id}>{r.name}</option>
                        ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Selecionar Produto</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40">
                        <Search size={16} />
                      </div>
                      <input 
                        placeholder="Pesquisar produto..."
                        value={bannerSearchTerm}
                        onChange={e => setBannerSearchTerm(e.target.value)}
                        className="w-full p-4 pl-12 bg-white/5 rounded-xl border border-white/10 focus:ring-2 focus:ring-blue-500/50 mb-2"
                      />
                    </div>
                    <select 
                      required
                      value={bannerLinkId} 
                      onChange={e => setBannerLinkId(e.target.value)}
                      className="w-full p-4 bg-white/5 rounded-xl border border-white/10 focus:ring-2 focus:ring-blue-500/50"
                    >
                      <option value="">Selecione um produto...</option>
                      {allProducts
                        .filter(p => p.name?.toLowerCase().includes(bannerSearchTerm.toLowerCase()))
                        .map((p, idx) => (
                          <option key={`${p.id}-${idx}`} value={p.id}>{p.name} ({restaurants.find(r => r.id === p.restaurantId)?.name})</option>
                        ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Mídia do Banner (GIF, Vídeo ou Imagem)</label>
                  <div className="flex gap-4 items-center">
                    <label className="flex-1 bg-white/5 border border-white/10 rounded-xl p-4 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center space-x-2 cursor-pointer">
                      <Plus size={16} />
                      <span>Upload Mídia</span>
                      <input 
                        type="file" 
                        accept="image/*,video/*" 
                        className="hidden" 
                        onChange={(e) => handleFileUpload(e, 'banner')} 
                      />
                    </label>
                    {bannerUrl && (
                      <div className="w-full h-48 rounded-2xl overflow-hidden border border-white/10 relative bg-black flex items-center justify-center cursor-move group">
                        {bannerMediaType === 'video' ? (
                          <video 
                            src={bannerUrl} 
                            className="w-full h-full object-cover" 
                            style={{ objectPosition: `${bannerPosition.x}% ${bannerPosition.y}%` }} 
                          />
                        ) : (
                          <img 
                            src={bannerUrl} 
                            className="w-full h-full object-cover select-none" 
                            style={{ objectPosition: `${bannerPosition.x}% ${bannerPosition.y}%` }}
                            onMouseDown={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const handleMouseMove = (moveEvent: MouseEvent) => {
                                const x = ((moveEvent.clientX - rect.left) / rect.width) * 100;
                                const y = ((moveEvent.clientY - rect.top) / rect.height) * 100;
                                setBannerPosition({ 
                                  x: Math.max(0, Math.min(100, x)), 
                                  y: Math.max(0, Math.min(100, y)) 
                                });
                              };
                              const handleMouseUp = () => {
                                window.removeEventListener('mousemove', handleMouseMove);
                                window.removeEventListener('mouseup', handleMouseUp);
                              };
                              window.addEventListener('mousemove', handleMouseMove);
                              window.addEventListener('mouseup', handleMouseUp);
                            }}
                          />
                        )}
                        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest text-white pointer-events-none">
                          Arraste para ajustar: {Math.round(bannerPosition.x)}% {Math.round(bannerPosition.y)}%
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Áudio do Banner (Opcional)</label>
                  <div className="flex gap-4 items-center">
                    <label className="flex-1 bg-white/5 border border-white/10 rounded-xl p-4 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center space-x-2 cursor-pointer">
                      <Plus size={16} />
                      <span>Upload Áudio</span>
                      <input 
                        type="file" 
                        accept="audio/*" 
                        className="hidden" 
                        onChange={(e) => handleFileUpload(e, 'bannerAudio')} 
                      />
                    </label>
                    {bannerAudioUrl && (
                      <div className="w-14 h-14 rounded-xl border border-white/10 flex-shrink-0 flex items-center justify-center bg-blue-600/20 text-blue-400">
                        <ClockIcon size={20} />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Cidades do Banner (Deixe vazio para Global)</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {Array.from(new Set(bannerCities)).map((city, idx) => (
                      <span key={`banner-city-${city}-${idx}`} className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                        {city}
                        <button type="button" onClick={() => setBannerCities(prev => prev.filter(c => c !== city))}>
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                    {bannerCities.length === 0 && (
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-20 italic">Nenhuma cidade selecionada (Global)</span>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select 
                      className="flex-1 p-4 bg-white/5 rounded-xl border border-white/10 focus:ring-2 focus:ring-blue-500/50"
                      onChange={(e) => {
                        if (e.target.value && !bannerCities.includes(e.target.value)) {
                          setBannerCities(prev => [...prev, e.target.value]);
                        }
                        e.target.value = "";
                      }}
                    >
                      <option value="">Selecionar cidade existente...</option>
                      {uniqueCities.map((city, idx) => (
                        <option key={`city-copy-opt-${city.id}-${idx}`} value={city.name}>{city.name}</option>
                      ))}
                    </select>
                    <div className="flex-1 flex gap-2">
                      <input 
                        type="text"
                        placeholder="Ou digite nova cidade..."
                        className="flex-1 p-4 bg-white/5 rounded-xl border border-white/10 focus:ring-2 focus:ring-blue-500/50"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = e.currentTarget.value.trim();
                            if (val && !bannerCities.includes(val)) {
                              setBannerCities(prev => [...prev, val]);
                              e.currentTarget.value = "";
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <button type="submit" className="w-full sm:w-auto bg-blue-600 text-white px-8 py-4 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center space-x-2 hover:bg-blue-700 transition-colors">
                <Plus size={16} />
                <span>Adicionar Banner</span>
              </button>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {displayedBanners.map((banner, idx) => (
                <div key={`${banner.id}-${idx}`} className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden group">
                  <div className="h-48 relative">
                    <img 
                      src={banner.imageUrl} 
                      alt={banner.title} 
                      className="w-full h-full object-cover" 
                      style={{ objectPosition: banner.objectPosition || '50% 50%' }}
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity space-x-4">
                      <button onClick={() => toggleBannerStatus(banner.id, banner.active)} className="p-4 bg-white text-[#141414] rounded-full">
                        {banner.active ? <XCircle size={24} /> : <CheckCircle size={24} />}
                      </button>
                      <button onClick={() => deleteBanner(banner.id)} className="p-4 bg-red-500 text-white rounded-full">
                        <Trash2 size={24} />
                      </button>
                    </div>
                  </div>
                  <div className="p-6 flex flex-col space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold uppercase tracking-tight">{banner.title}</h4>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${banner.active ? 'text-green-400' : 'text-red-400'}`}>
                        {banner.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    {banner.linkUrl && (
                      <p className="text-[10px] font-mono opacity-40 truncate">LINK: {banner.linkUrl}</p>
                    )}
                    {banner.cities && banner.cities.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-2">
                        {Array.from(new Set(banner.cities || [])).map((city, idx) => (
                          <span key={`banner-list-city-${city}-${idx}`} className="bg-white/10 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full opacity-60">
                            {city}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {banners.length > bannersLimit && (
              <div className="flex justify-center pt-8">
                <button 
                  onClick={() => setBannersLimit(prev => prev + 3)}
                  className="px-8 py-3 bg-white/5 border border-white/10 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2"
                >
                  <Plus size={16} />
                  Ver Mais Banners
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'customization' && (
          <div className="space-y-8">
            <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter italic">Customização do App</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white/5 p-6 md:p-8 rounded-[2.5rem] border border-white/10 space-y-6">
                <div className="flex items-center space-x-3 text-blue-400">
                  <Edit2 size={24} />
                  <h3 className="text-xl font-black uppercase tracking-tight italic">Identidade Visual</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Nome do Aplicativo</label>
                    <input 
                      type="text" 
                      value={settings.appName || ''} 
                      onChange={e => setSettings({ ...settings, appName: e.target.value })}
                      placeholder="Ex: iFood Tupã"
                      className="w-full p-4 bg-white/5 rounded-2xl border border-white/10 focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Texto da Animação de Entrada</label>
                    <input 
                      type="text" 
                      value={settings.splashText || ''} 
                      onChange={e => setSettings({ ...settings, splashText: e.target.value })}
                      placeholder="Ex: iFood TUPÃ"
                      className="w-full p-4 bg-white/5 rounded-2xl border border-white/10 focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Duração da Animação (Segundos)</label>
                    <input 
                      type="number" 
                      min="1"
                      max="60"
                      value={settings.splashScreenDuration || 5} 
                      onChange={e => setSettings({ ...settings, splashScreenDuration: parseInt(e.target.value) })}
                      placeholder="Padrão: 5 segundos"
                      className="w-full p-4 bg-white/5 rounded-2xl border border-white/10 focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Mídia da Tela de Início (Splash)</label>
                    <p className="text-[9px] text-blue-400 uppercase font-bold">Proporção Recomendada: 9:16 (Ex: 1080x1920px)</p>
                    
                    <div className="space-y-3">
                      <div className="flex gap-3 items-center">
                        <button 
                          type="button"
                          onClick={() => {
                            setGalleryTarget('splash' as any);
                            setIsGalleryOpen(true);
                          }}
                          className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center space-x-2"
                        >
                          <ImageIcon size={14} />
                          <span>Galeria</span>
                        </button>
                        <label className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center space-x-2 cursor-pointer">
                          <Plus size={14} />
                          <span>Upload Vídeo/Img</span>
                          <input 
                            type="file" 
                            accept="image/*,video/*" 
                            className="hidden" 
                            onChange={(e) => handleFileUpload(e, 'splash')} 
                          />
                        </label>
                      </div>

                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <input 
                            type="text"
                            value={settings.splashMediaUrl || ''}
                            onChange={(e) => {
                              const url = e.target.value;
                              const isVideo = url.match(/\.(mp4|webm|ogg|mov)$|video/i);
                              setSettings({ 
                                ...settings, 
                                splashMediaUrl: url,
                                splashMediaType: isVideo ? 'video' : 'image'
                              });
                            }}
                            placeholder="Ou cole a URL do vídeo/imagem aqui..."
                            className="w-full p-3 bg-white/5 rounded-xl border border-white/10 text-xs focus:ring-2 focus:ring-blue-500/50"
                          />
                          {settings.splashMediaUrl && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-2">
                              <select 
                                value={settings.splashMediaType || 'image'}
                                onChange={(e) => setSettings({ ...settings, splashMediaType: e.target.value as 'image' | 'video' })}
                                className="bg-slate-800 text-[9px] font-bold uppercase p-1 rounded border border-white/10"
                              >
                                <option value="image">IMG</option>
                                <option value="video">VÍDEO</option>
                              </select>
                            </div>
                          )}
                        </div>
                        {settings.splashMediaUrl && (
                          <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10 flex-shrink-0 relative group">
                            {settings.splashMediaType === 'video' ? (
                              <video 
                                src={settings.splashMediaUrl || undefined} 
                                className="w-full h-full object-cover" 
                                autoPlay 
                                muted 
                                loop 
                                playsInline 
                              />
                            ) : (
                              <img src={settings.splashMediaUrl || undefined} className="w-full h-full object-cover" />
                            )}
                            <button 
                              onClick={() => setSettings({ ...settings, splashMediaUrl: undefined, splashMediaType: undefined })}
                              className="absolute inset-0 bg-red-500/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Áudio da Tela de Início (Splash)</label>
                    <p className="text-[9px] text-blue-400 uppercase font-bold">Recomendado: Áudio curto de até 10 segundos</p>
                    <div className="flex gap-4 items-center">
                      <label className="flex-1 bg-white/5 border border-white/10 rounded-xl p-4 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center space-x-2 cursor-pointer">
                        <Plus size={16} />
                        <span>Upload Áudio</span>
                        <input 
                          type="file" 
                          accept="audio/*" 
                          className="hidden" 
                          onChange={(e) => handleFileUpload(e, 'splashAudio')} 
                        />
                      </label>
                      {settings.splashAudioUrl && (
                        <div className="flex items-center space-x-2 bg-white/5 p-2 rounded-xl border border-white/10">
                          <audio src={settings.splashAudioUrl} controls className="h-8 w-32" />
                          <button 
                            onClick={() => setSettings({ ...settings, splashAudioUrl: undefined })}
                            className="p-2 bg-red-500/80 rounded-lg text-white hover:bg-red-600 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Efeito Visual Ativo</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        { id: 'none', name: 'Nenhum', icon: <XCircle size={16} /> },
                        { id: 'snow', name: 'Neve', icon: <RefreshCw size={16} /> },
                        { id: 'rocket', name: 'Foguete', icon: <Navigation size={16} /> },
                        { id: 'easter', name: 'Páscoa', icon: <Utensils size={16} /> },
                        { id: 'women_day', name: 'Dia das Mulheres', icon: <Star size={16} /> }
                      ].map(effect => (
                        <button
                          key={effect.id}
                          onClick={() => setSettings({ ...settings, activeEffect: effect.id as any })}
                          className={`flex items-center justify-center space-x-2 p-4 rounded-2xl border transition-all ${
                            settings.activeEffect === effect.id 
                              ? 'bg-blue-600 border-blue-500 text-white' 
                              : 'bg-white/5 border-white/10 hover:bg-white/10'
                          }`}
                        >
                          {effect.icon}
                          <span className="text-[10px] font-black uppercase tracking-widest">{effect.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button 
                    onClick={handleUpdateGlobalSettings}
                    className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all"
                  >
                    Salvar Customização
                  </button>
                </div>
              </div>

              <div className="bg-white/5 p-6 md:p-8 rounded-[2.5rem] border border-white/10 space-y-6">
                <div className="flex items-center space-x-3 text-emerald-400">
                  <Palette size={24} />
                  <h3 className="text-xl font-black uppercase tracking-tight italic">Ícones do Cliente</h3>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Tamanho Geral dos Ícones</label>
                      <input 
                        type="range" 
                        min="12" 
                        max="48" 
                        value={settings.clientIcons?.size || 20} 
                        onChange={e => setSettings({ ...settings, clientIcons: { ...settings.clientIcons, size: parseInt(e.target.value) } as any })}
                        className="w-full"
                      />
                      <div className="flex justify-between text-[10px] font-bold opacity-40">
                        <span>12px</span>
                        <span>{settings.clientIcons?.size || 20}px</span>
                        <span>48px</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Espaçamento Geral</label>
                      <input 
                        type="range" 
                        min="0" 
                        max="64" 
                        value={settings.clientIcons?.spacing || 24} 
                        onChange={e => setSettings({ ...settings, clientIcons: { ...settings.clientIcons, spacing: parseInt(e.target.value) } as any })}
                        className="w-full"
                      />
                      <div className="flex justify-between text-[10px] font-bold opacity-40">
                        <span>0px</span>
                        <span>{settings.clientIcons?.spacing || 24}px</span>
                        <span>64px</span>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Paleta de Cores (Ícones)</label>
                      <div className="flex flex-wrap gap-2">
                        {THEME_OPTIONS.map((theme) => (
                          <button
                            key={theme.name}
                            onClick={() => setSettings({ 
                              ...settings, 
                              clientIcons: { 
                                ...settings.clientIcons, 
                                color: theme.primary 
                              } as any 
                            })}
                            className={`w-8 h-8 rounded-full border-2 transition-all ${settings.clientIcons?.color === theme.primary ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`}
                            style={{ 
                              background: theme.isGradient 
                                ? `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})` 
                                : theme.primary 
                            }}
                            title={theme.name}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Cor dos Ícones (Padrão)</label>
                      <div className="flex items-center space-x-3">
                        <input 
                          type="color" 
                          value={settings.clientIcons?.color || '#3b82f6'} 
                          onChange={e => setSettings({ ...settings, clientIcons: { ...settings.clientIcons, color: e.target.value } as any })}
                          className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 cursor-pointer"
                        />
                        <input 
                          type="text" 
                          value={settings.clientIcons?.color || ''} 
                          onChange={e => setSettings({ ...settings, clientIcons: { ...settings.clientIcons, color: e.target.value } as any })}
                          placeholder="#3b82f6"
                          className="flex-1 p-2 bg-white/5 rounded-lg border border-white/10 text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {[
                      { id: 'colorIcon', label: 'Ícone de Cores', icon: <Palette size={16} /> },
                      { id: 'filterIcon', label: 'Ícone de Filtro', icon: <Filter size={16} /> },
                      { id: 'ordersIcon', label: 'Ícone de Pedidos', icon: <ClipboardList size={16} /> },
                      { id: 'cartIcon', label: 'Ícone de Carrinho', icon: <ShoppingBag size={16} /> }
                    ].map((item, idx) => (
                      <div key={`icon-setting-${item.id}-${idx}`} className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {item.icon}
                            <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                          </div>
                          <label className="cursor-pointer bg-blue-600/20 text-blue-400 p-2 rounded-lg hover:bg-blue-600/30 transition-all">
                            <ImageIcon size={14} />
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*" 
                              onChange={(e) => handleFileUpload(e, item.id as any)} 
                            />
                          </label>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Tamanho</label>
                            <input 
                              type="range" 
                              min="12" 
                              max="48" 
                              value={settings.clientIcons?.[`${item.id}Size` as keyof ClientIconSettings] || settings.clientIcons?.size || 20} 
                              onChange={e => setSettings({ 
                                ...settings, 
                                clientIcons: { 
                                  ...settings.clientIcons, 
                                  [`${item.id}Size`]: parseInt(e.target.value) 
                                } as any 
                              })}
                              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Espaçamento</label>
                            <input 
                              type="range" 
                              min="0" 
                              max="64" 
                              value={settings.clientIcons?.[`${item.id}Spacing` as keyof ClientIconSettings] !== undefined ? settings.clientIcons?.[`${item.id}Spacing` as keyof ClientIconSettings] : (settings.clientIcons?.spacing || 4)} 
                              onChange={e => setSettings({ 
                                ...settings, 
                                clientIcons: { 
                                  ...settings.clientIcons, 
                                  [`${item.id}Spacing`]: parseInt(e.target.value) 
                                } as any 
                              })}
                              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Escala</label>
                            <input 
                              type="range" 
                              min="0.5" 
                              max="2" 
                              step="0.1"
                              value={settings.clientIcons?.[`${item.id}Scale` as keyof ClientIconSettings] || 1} 
                              onChange={e => setSettings({ 
                                ...settings, 
                                clientIcons: { 
                                  ...settings.clientIcons, 
                                  [`${item.id}Scale`]: parseFloat(e.target.value) 
                                } as any 
                              })}
                              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                            />
                          </div>
                        </div>

                        {settings.clientIcons?.[item.id as keyof typeof settings.clientIcons] && (
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 bg-white/5 p-1">
                              <img src={settings.clientIcons?.[item.id as keyof typeof settings.clientIcons] as string} className="w-full h-full object-contain" />
                            </div>
                            <button 
                              onClick={() => {
                                const newIcons = { ...settings.clientIcons };
                                delete newIcons[item.id as keyof typeof newIcons];
                                setSettings({ ...settings, clientIcons: newIcons as any });
                              }}
                              className="text-red-400 hover:text-red-500"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold uppercase opacity-40">Tamanho Específico</label>
                            <input 
                              type="number" 
                              value={settings.clientIcons?.[`${item.id}Size` as keyof typeof settings.clientIcons] || ''} 
                              onChange={e => setSettings({ ...settings, clientIcons: { ...settings.clientIcons, [`${item.id}Size`]: parseInt(e.target.value) } as any })}
                              placeholder="Default"
                              className="w-full p-2 bg-white/5 rounded-lg border border-white/10 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold uppercase opacity-40">Espaçamento Específico</label>
                            <input 
                              type="number" 
                              value={settings.clientIcons?.[`${item.id}Spacing` as keyof typeof settings.clientIcons] || ''} 
                              onChange={e => setSettings({ ...settings, clientIcons: { ...settings.clientIcons, [`${item.id}Spacing`]: parseInt(e.target.value) } as any })}
                              placeholder="Default"
                              className="w-full p-2 bg-white/5 rounded-lg border border-white/10 text-xs"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase opacity-40">Escala (Zoom): {settings.clientIcons?.[`${item.id}Scale` as keyof typeof settings.clientIcons] || 1}x</label>
                          <input 
                            type="range" 
                            min="0.5" 
                            max="2" 
                            step="0.1"
                            value={settings.clientIcons?.[`${item.id}Scale` as keyof typeof settings.clientIcons] || 1} 
                            onChange={e => setSettings({ ...settings, clientIcons: { ...settings.clientIcons, [`${item.id}Scale`]: parseFloat(e.target.value) } as any })}
                            className="w-full"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <button 
                    onClick={handleUpdateGlobalSettings}
                    className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all"
                  >
                    Salvar Ícones
                  </button>
                </div>
              </div>

              <div className="bg-white/5 p-6 md:p-8 rounded-[2.5rem] border border-white/10 space-y-6">
                <div className="flex items-center space-x-3 text-amber-400">
                  <Star size={24} />
                  <h3 className="text-xl font-black uppercase tracking-tight italic">Preview do Efeito</h3>
                </div>
                <div className="aspect-video bg-slate-950 rounded-3xl border border-white/10 flex items-center justify-center relative overflow-hidden">
                  {settings.splashMediaUrl && (
                    <div className="absolute inset-0 z-0">
                      {settings.splashMediaType === 'video' ? (
                        <video src={settings.splashMediaUrl} autoPlay muted loop playsInline className="w-full h-full object-cover opacity-60" />
                      ) : (
                        <img src={settings.splashMediaUrl} className="w-full h-full object-cover opacity-60" alt="Preview" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/40" />
                    </div>
                  )}
                  
                  <div className="text-center space-y-2 z-10">
                    <h4 className="text-2xl font-black italic text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">{settings.appName || 'Nome do App'}</h4>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/60 drop-shadow-md">Visualização em tempo real</p>
                  </div>
                  
                    {/* Mock effects for preview */}
                  {settings.activeEffect === 'snow' && (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                      {[...Array(60)].map((_, i) => (
                        <motion.div
                          key={`preview-snow-${i}`}
                          initial={{ 
                            y: -10, 
                            x: `${Math.random() * 100}%`,
                            opacity: Math.random() * 0.6 + 0.2,
                            scale: Math.random() * 0.5 + 0.3
                          }}
                          animate={{ 
                            y: 400, 
                            x: `${(Math.random() * 100)}%`,
                            rotate: Math.random() * 360
                          }}
                          transition={{ 
                            duration: Math.random() * 8 + 5, 
                            repeat: Infinity, 
                            ease: "linear",
                            delay: Math.random() * 10
                          }}
                          className="absolute w-1 h-1 bg-white rounded-full blur-[0.3px] shadow-[0_0_3px_rgba(255,255,255,0.8)]"
                        />
                      ))}
                    </div>
                  )}
                  {settings.activeEffect === 'rocket' && (
                    <motion.div
                      animate={{ y: [0, -10, 0], x: [0, 5, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute bottom-4 right-4 text-blue-400"
                    >
                      <Navigation size={32} className="rotate-45" />
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'mercadopago' && (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter italic">Dashboard Financeiro</h2>
                <div className="flex items-center space-x-2 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                  <div className={`w-3 h-3 rounded-full shadow-[0_0_10px] ${settings.mercadoPagoPublicKey && settings.mercadoPagoAccessToken ? 'bg-green-500 shadow-green-500' : 'bg-red-500 shadow-red-500'}`} />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {settings.mercadoPagoPublicKey && settings.mercadoPagoAccessToken ? 'Conectado' : 'Desconectado'}
                  </span>
                </div>
              </div>

              <div className="flex items-center bg-white/5 p-1 rounded-2xl border border-white/10">
                {(['today', 'yesterday', 'week', 'month', 'all'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setDateFilter(f)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${dateFilter === f ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-white/5 opacity-60'}`}
                  >
                    {f === 'today' ? 'Hoje' : f === 'yesterday' ? 'Ontem' : f === 'week' ? '7 Dias' : f === 'month' ? '30 Dias' : 'Tudo'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-emerald-400">
                  <CheckCircle size={24} />
                  <TrendingUp size={20} className="opacity-40" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Total de Pagamentos Aprovados</p>
                <div className="flex flex-col">
                  <h3 className="text-3xl font-black italic tracking-tighter text-emerald-400">{formatPrice(totalSplitPayRevenue)}</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40">
                    Soma de todos os pedidos processados via SplitPay
                  </p>
                </div>
              </div>

              <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-blue-400">
                  <DollarSign size={24} />
                  <TrendingUp size={20} className="opacity-40" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Receita Total (Geral)</p>
                <h3 className="text-3xl font-black italic tracking-tighter">{formatPrice(allTimeRevenue)}</h3>
              </div>

              <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-amber-400">
                  <Clock size={24} />
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Pagamentos Pendentes</p>
                <h3 className="text-3xl font-black italic tracking-tighter">{pendingPayments.length}</h3>
              </div>

              <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-red-400">
                  <XCircle size={24} />
                  <TrendingDown size={20} className="opacity-40" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Pagamentos Recusados</p>
                <h3 className="text-3xl font-black italic tracking-tighter">{rejectedPayments.length}</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 space-y-6">
                <h3 className="text-xl font-black uppercase tracking-tight italic flex items-center space-x-2">
                  <BarChart3 className="text-blue-400" size={24} />
                  <span>Evolução de Vendas</span>
                </h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={getChartData()}>
                      <defs>
                        <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        stroke="#ffffff40" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false} 
                      />
                      <YAxis 
                        stroke="#ffffff40" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false} 
                        tickFormatter={(value) => `R$${value}`}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '1rem' }}
                        itemStyle={{ color: '#3b82f6', fontWeight: 'bold' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="amount" 
                        stroke="#3b82f6" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorAmount)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 space-y-6">
                <h3 className="text-xl font-black uppercase tracking-tight italic flex items-center space-x-2">
                  <History className="text-blue-400" size={24} />
                  <span>Últimos Pagamentos</span>
                </h3>
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {getFilteredPayments().map(p => (
                    <div key={p.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all">
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          p.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : 
                          p.status === 'pending' || p.status === 'in_process' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {p.status === 'approved' ? <CheckCircle size={20} /> : 
                           p.status === 'pending' || p.status === 'in_process' ? <Clock size={20} /> :
                           <XCircle size={20} />}
                        </div>
                        <div>
                          <p className="text-xs font-bold">{p.payerEmail}</p>
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Pedido #{p.orderId?.slice(-6)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-black ${
                          p.status === 'approved' ? 'text-emerald-400' : 
                          p.status === 'pending' || p.status === 'in_process' ? 'text-amber-400' :
                          'text-red-400'
                        }`}>{formatPrice(p.amount)}</p>
                        <p className="text-[8px] font-black uppercase tracking-widest opacity-40">
                          {p.status === 'approved' ? 'Aprovado' : 
                           p.status === 'pending' || p.status === 'in_process' ? 'Pendente' :
                           p.status === 'rejected' ? 'Recusado' : 'Cancelado'}
                        </p>
                      </div>
                    </div>
                  ))}
                  {getFilteredPayments().length === 0 && (
                    <div className="text-center py-12 opacity-20">
                      <DollarSign size={48} className="mx-auto mb-4" />
                      <p className="text-[10px] font-black uppercase tracking-widest">Nenhum pagamento no período</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 space-y-6">
              <h3 className="text-xl font-black uppercase tracking-tight italic flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MapPin className="text-blue-400" size={24} />
                  <span>Faturamento por Cidade</span>
                </div>
                <div className="flex items-center space-x-2">
                  <input 
                    type="date" 
                    value={revenueDayFilter} 
                    onChange={e => setRevenueDayFilter(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest focus:ring-0"
                  />
                  <select 
                    value={revenueCityFilter} 
                    onChange={e => setRevenueCityFilter(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest focus:ring-0"
                  >
                    <option value="all">Todas Cidades</option>
                    {uniqueCities.map((c, idx) => <option key={`revenue-city-opt-${c.id}-${idx}`} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {getCityRevenue().map(({ city, amount }, idx) => (
                  <div key={`city-revenue-${city}-${idx}`} className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">{city}</p>
                    <h4 className="text-2xl font-black italic tracking-tighter text-emerald-400">{formatPrice(amount)}</h4>
                  </div>
                ))}
                {getCityRevenue().length === 0 && (
                  <div className="col-span-full py-8 text-center opacity-20">
                    <p className="text-[10px] font-black uppercase tracking-widest">Nenhum faturamento para os filtros selecionados</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 space-y-6">
              <h3 className="text-xl font-black uppercase tracking-tight italic flex items-center space-x-2">
                <Key className="text-blue-400" size={24} />
                <span>Configuração de API</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Public Key</label>
                  <input 
                    type="text" 
                    value={settings.mercadoPagoPublicKey || ''} 
                    onChange={e => setSettings({...settings, mercadoPagoPublicKey: e.target.value})}
                    className="w-full p-4 bg-white/5 rounded-2xl border border-white/10 font-mono text-sm"
                    placeholder="APP_USR-..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Access Token</label>
                  <input 
                    type="password" 
                    value={settings.mercadoPagoAccessToken || ''} 
                    onChange={e => setSettings({...settings, mercadoPagoAccessToken: e.target.value})}
                    className="w-full p-4 bg-white/5 rounded-2xl border border-white/10 font-mono text-sm"
                    placeholder="APP_USR-..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Link de Recarga Manual</label>
                <div className="relative">
                  <Link className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input 
                    type="url" 
                    value={settings.manualRechargeUrl || ''} 
                    onChange={e => setSettings({...settings, manualRechargeUrl: e.target.value})}
                    className="w-full p-4 pl-12 bg-white/5 rounded-2xl border border-white/10 text-sm"
                    placeholder="https://wa.me/... ou link de pagamento"
                  />
                </div>
                <p className="text-[10px] text-slate-500 italic">Se configurado, esta opção aparecerá para os gestores na carteira de crédito.</p>
              </div>

              <div className="flex flex-col space-y-4">
                <div className="flex items-center justify-center space-x-2 py-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400">
                  <CheckCircle size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Configuração Detectada</span>
                </div>
                <button 
                  onClick={handleUpdateGlobalSettings}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <Save size={16} />
                  Salvar Credenciais
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'subscriptions' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter italic">Gestão de Mensalidades</h2>
              <div className="flex items-center space-x-2 bg-blue-600/10 px-4 py-2 rounded-full border border-blue-600/20">
                <ShieldCheck className="text-blue-400" size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Sistema de Assinaturas Ativo</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 space-y-6">
                  <h3 className="text-lg font-bold uppercase tracking-tight italic text-blue-400">Configuração Geral</h3>
                  <form onSubmit={handleUpdateGlobalSettings} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Valor da Mensalidade (R$)</label>
                      <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input 
                          type="number" 
                          inputMode="decimal"
                          value={settings.monthlyFee || 0} 
                          onChange={e => setSettings({...settings, monthlyFee: parseFloat(e.target.value)})}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 text-sm font-bold"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Dia do Vencimento Padrão</label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input 
                          type="number" 
                          min="1"
                          max="31"
                          value={settings.defaultDueDay || 10} 
                          onChange={e => setSettings({...settings, defaultDueDay: parseInt(e.target.value)})}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 text-sm font-bold"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Período de Teste (Dias)</label>
                      <div className="relative">
                        <ClockIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input 
                          type="number" 
                          value={settings.trialPeriodDays || 0} 
                          onChange={e => setSettings({...settings, trialPeriodDays: parseInt(e.target.value)})}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 text-sm font-bold"
                        />
                      </div>
                    </div>
                    <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20">
                      Salvar Configurações
                    </button>
                  </form>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-3xl space-y-3">
                  <div className="flex items-center space-x-2 text-amber-500">
                    <AlertCircle size={18} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Regra de Bloqueio</span>
                  </div>
                  <p className="text-[10px] opacity-70 leading-relaxed">
                    Gestores com status <span className="font-bold">EXPIRED</span> serão bloqueados automaticamente. O acesso só será liberado após o pagamento da mensalidade ou renovação manual pelo ADM.
                  </p>
                </div>
              </div>

              <div className="lg:col-span-2 bg-white/5 p-8 rounded-[2.5rem] border border-white/10 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black uppercase tracking-tight italic">Status dos Gestores</h3>
                  <div className="flex items-center space-x-4">
                    <div className="relative w-48 hidden md:block">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                      <input 
                        type="text"
                        placeholder="Pesquisar..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-[10px] font-bold uppercase tracking-tight focus:border-blue-500/50 transition-all"
                        value={managerSearchTerm}
                        onChange={(e) => setManagerSearchTerm(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Filter size={16} className="opacity-40" />
                      <select className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest focus:ring-0 cursor-pointer">
                        <option value="all">Todos</option>
                        <option value="active">Ativos</option>
                        <option value="expired">Expirados</option>
                        <option value="trial">Teste</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="md:hidden relative w-full mb-4">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text"
                    placeholder="Pesquisar gestor..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-xs font-bold uppercase tracking-tight focus:border-blue-500/50 transition-all"
                    value={managerSearchTerm}
                    onChange={(e) => setManagerSearchTerm(e.target.value)}
                  />
                </div>

                <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden overflow-x-auto">
                  <table className="w-full text-left min-w-[600px]">
                    <thead>
                      <tr className="border-b border-white/10 text-[10px] font-black uppercase tracking-widest opacity-40">
                        <th className="p-6">Gestor</th>
                        <th className="p-6">WhatsApp</th>
                        <th className="p-6">Status</th>
                        <th className="p-6">Vencimento</th>
                        <th className="p-6 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredManagers.map((u, idx) => (
                        <tr key={`${u.uid}-${idx}`} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="p-6">
                            <div className="flex flex-col">
                              <span className="font-bold text-sm">{u.displayName || u.email}</span>
                              <span className="text-[8px] font-mono opacity-40 uppercase">UID: {u.uid.slice(0, 8)}...</span>
                            </div>
                          </td>
                          <td className="p-6">
                            {u.whatsapp ? (
                              <button 
                                onClick={() => window.open(`https://wa.me/55${u.whatsapp.replace(/\D/g, '')}`, '_blank')}
                                className="flex items-center space-x-2 text-emerald-400 hover:text-emerald-300 transition-colors"
                              >
                                <MessageCircle size={14} />
                                <span className="text-xs font-bold">{u.whatsapp}</span>
                              </button>
                            ) : (
                              <span className="text-[10px] font-black uppercase tracking-widest text-red-500/60">Não informado</span>
                            )}
                          </td>
                          <td className="p-6">
                            <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                              u.subscriptionStatus === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                              u.subscriptionStatus === 'expired' ? 'bg-red-500/20 text-red-400' :
                              'bg-blue-500/20 text-blue-400'
                            }`}>
                              {u.subscriptionStatus || 'trial'}
                            </span>
                          </td>
                          <td className="p-6">
                            <span className="text-xs font-bold opacity-60">
                              {u.subscriptionDueDate ? new Date(u.subscriptionDueDate).toLocaleDateString() : 'A definir'}
                            </span>
                          </td>
                          <td className="p-6 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button 
                                onClick={() => handleUpdateUserSubscription(u.uid, { 
                                  subscriptionStatus: u.subscriptionStatus === 'active' ? 'expired' : 'active',
                                  subscriptionDueDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString()
                                })}
                                className={`p-2 rounded-lg transition-all ${u.subscriptionStatus === 'active' ? 'text-red-400 hover:bg-red-500/20' : 'text-emerald-400 hover:bg-emerald-500/20'}`}
                                title={u.subscriptionStatus === 'active' ? 'Bloquear' : 'Ativar'}
                              >
                                {u.subscriptionStatus === 'active' ? <XCircle size={18} /> : <CheckCircle size={18} />}
                              </button>
                              <button 
                                onClick={() => {
                                  const newDate = prompt('Nova data de vencimento (AAAA-MM-DD):', u.subscriptionDueDate || '');
                                  if (newDate) handleUpdateUserSubscription(u.uid, { subscriptionDueDate: newDate });
                                }}
                                className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-all"
                              >
                                <Calendar size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredManagers.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-12 text-center text-[10px] font-black uppercase tracking-widest opacity-20">
                            Nenhum gestor encontrado
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'mercadopago' && (
          <div className="space-y-8 mt-8">
            {/* SplitPay Section */}
            <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 space-y-8">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-xl font-black uppercase tracking-tight italic flex items-center space-x-2">
                    <CreditCard className="text-blue-400" size={24} />
                    <span>SplitPay Automático</span>
                  </h3>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Divisão automática de pagamentos entre plataforma e empresa</p>
                </div>
                <div className="flex items-center space-x-3 px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle size={20} />
                  <span>SplitPay Automático Ativo</span>
                </div>
              </div>

              {editingSplitPay ? (
                <motion.form 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  onSubmit={handleUpdateSplitPayConfig} 
                  className="bg-white/5 p-6 rounded-3xl border border-blue-500/30 space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold uppercase tracking-tight text-blue-400">Configurar: {editingSplitPay.name}</h4>
                    <button type="button" onClick={() => setEditingSplitPay(null)} className="p-2 hover:bg-white/5 rounded-full">
                      <X size={20} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Chave Pix da Empresa</label>
                      <input 
                        required
                        type="text" 
                        value={spPixKey} 
                        onChange={e => setSpPixKey(e.target.value)}
                        className="w-full p-4 bg-white/5 rounded-2xl border border-white/10 font-bold"
                        placeholder="Chave Pix para repasse"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Tipo de Chave</label>
                      <select 
                        value={spPixType} 
                        onChange={e => setSpPixType(e.target.value as any)}
                        className="w-full p-4 bg-slate-800 rounded-2xl border border-white/10"
                      >
                        <option value="cpf">CPF</option>
                        <option value="cnpj">CNPJ</option>
                        <option value="email">E-mail</option>
                        <option value="phone">Telefone</option>
                        <option value="random">Chave Aleatória</option>
                      </select>
                    </div>
                    <div className="md:col-span-2 bg-blue-500/10 p-4 rounded-2xl border border-blue-500/20">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white">
                          <Percent size={20} />
                        </div>
                        <div>
                          <p className="text-xs font-black uppercase tracking-tight text-blue-400">SplitPay Automático (50/50)</p>
                          <p className="text-[10px] text-blue-400/60 italic">A taxa da plataforma é fixa em 50% para todos os pagamentos.</p>
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-2 space-y-4 pt-4 border-t border-white/10">
                      <h4 className="text-xs font-black uppercase tracking-widest text-blue-400">Configurações de Saldo</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Saldo Mínimo para Receber Pedidos</label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-500 text-sm">R$</span>
                            <input 
                              type="number" 
                              value={settings.minWalletBalance || 5} 
                              onChange={e => setSettings({...settings, minWalletBalance: parseFloat(e.target.value)})}
                              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 text-sm font-bold"
                            />
                          </div>
                          <p className="text-[9px] opacity-40 italic">Se o saldo for menor que este valor, a empresa não aparecerá para os clientes.</p>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Valor de Recarga Mínima</label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-500 text-sm">R$</span>
                            <input 
                              type="number" 
                              value={settings.minRechargeAmount || 50} 
                              onChange={e => setSettings({...settings, minRechargeAmount: parseFloat(e.target.value)})}
                              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 text-sm font-bold"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Custo Diário de Destaque (Tráfego Pago)</label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-500 text-sm">R$</span>
                            <input 
                              type="number" 
                              value={settings.highlightDailyCost || 7} 
                              onChange={e => setSettings({...settings, highlightDailyCost: parseFloat(e.target.value)})}
                              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 text-sm font-bold"
                            />
                          </div>
                          <p className="text-[9px] opacity-40 italic">Valor cobrado por dia para destacar um produto no iFood Tupã.</p>
                        </div>
                      </div>
                      <button 
                        onClick={handleUpdateGlobalSettings}
                        className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                      >
                        Salvar Configurações de Saldo
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button type="submit" className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-blue-700 transition-all">
                      Salvar Configuração
                    </button>
                    <button type="button" onClick={() => setEditingSplitPay(null)} className="px-8 bg-white/5 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs">
                      Cancelar
                    </button>
                  </div>
                </motion.form>
              ) : (
                <div className="space-y-4">
                  <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-white/10 text-[10px] font-black uppercase tracking-widest opacity-40">
                          <th className="p-6">Empresa</th>
                          <th className="p-6">Configuração</th>
                          <th className="p-6">Chave Pix</th>
                          <th className="p-6 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {restaurants.map((res, idx) => (
                          <tr key={`${res.id}-${idx}`} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="p-6">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/10">
                                  <div className="w-full h-full flex items-center justify-center bg-white/5">
                                    {res.imageUrl ? (
                                      <img src={res.imageUrl || undefined} className="w-full h-full object-cover" />
                                    ) : (
                                      <Store size={16} className="text-white/20" />
                                    )}
                                  </div>
                                </div>
                                <span className="font-bold text-sm">{res.name}</span>
                              </div>
                            </td>
                            <td className="p-6">
                              <div className="flex flex-col">
                                <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400">Automático</span>
                                <span className="text-xs font-bold">50% / 50%</span>
                              </div>
                            </td>
                            <td className="p-6">
                              <span className="text-[10px] font-mono opacity-60 truncate max-w-[150px] block">
                                {res.splitPayConfig?.pixKey || 'Não configurada'}
                              </span>
                            </td>
                            <td className="p-6 text-right">
                              <button 
                                onClick={() => startEditingSplitPay(res)}
                                className="p-2 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-all"
                              >
                                <Settings2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* SplitPay History Section */}
            <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 space-y-6">
              <div className="flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-xl font-black uppercase tracking-tight italic flex items-center space-x-2">
                      <History className="text-blue-400" size={24} />
                      <span>Histórico de SplitPay</span>
                    </h3>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Últimas 50 transferências automáticas realizadas</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => {
                          setShowCityColumn(!showCityColumn);
                          if (showCityColumn) setCitySearch('');
                        }}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center space-x-2 ${
                          showCityColumn ? 'bg-blue-500 text-white' : 'bg-white/5 text-blue-400 border border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <MapPin size={14} />
                        <span>Cidades</span>
                      </button>
                      {showCityColumn && (
                        <div className="relative group">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-blue-400 transition-colors" size={14} />
                          <input 
                            type="text"
                            placeholder="Pesquisar cidade..."
                            value={citySearch}
                            onChange={(e) => setCitySearch(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-[10px] font-bold focus:outline-none focus:border-blue-500/50 w-48 transition-all"
                          />
                        </div>
                      )}
                    </div>
                    <div className="text-right bg-white/5 px-6 py-3 rounded-2xl border border-white/10">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Soma Total de Pagamentos</p>
                      <h4 className="text-xl font-black italic text-emerald-400">{formatPrice(totalSplitPayRevenue)}</h4>
                    </div>
                  </div>
                </div>

                {/* Prominent City Header as requested */}
                {showCityColumn && citySearch && (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-blue-500/10 border-l-4 border-blue-500 p-4 rounded-r-2xl"
                  >
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 opacity-60">Filtrando por Cidade</span>
                      <h4 className="text-2xl font-black uppercase tracking-tighter italic text-white">{citySearch}</h4>
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] font-black uppercase tracking-widest opacity-40">
                      <th className="p-6">Data</th>
                      <th className="p-6">Pedido</th>
                      <th className="p-6">Empresa</th>
                      {showCityColumn && <th className="p-6">Cidade</th>}
                      <th className="p-6">Total</th>
                      <th className="p-6">Taxa</th>
                      <th className="p-6">Líquido</th>
                      <th className="p-6">Status</th>
                      <th className="p-6 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {splitPayHistory.filter(item => {
                      if (!showCityColumn || !citySearch) return true;
                      const restaurant = restaurants.find(r => r.id === item.restaurantId);
                      const city = item.cityName || restaurant?.city || '';
                      return city.toLowerCase().includes(citySearch.toLowerCase());
                    }).length > 0 ? (
                      splitPayHistory.filter(item => {
                        if (!showCityColumn || !citySearch) return true;
                        const restaurant = restaurants.find(r => r.id === item.restaurantId);
                        const city = item.cityName || restaurant?.city || '';
                        return city.toLowerCase().includes(citySearch.toLowerCase());
                      }).map((item, idx) => {
                        const restaurant = restaurants.find(r => r.id === item.restaurantId);
                        const cityName = item.cityName || restaurant?.city || 'N/A';
                        return (
                          <tr key={`${item.id}-${idx}`} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="p-6">
                              <span className="text-[10px] font-bold opacity-60">
                                {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString() : 'Recent'}
                              </span>
                            </td>
                            <td className="p-6">
                              <span className="text-[10px] font-mono font-bold">#{item.orderId ? item.orderId.slice(-6) : 'N/A'}</span>
                            </td>
                            <td className="p-6">
                              <span className="text-xs font-bold">
                                {restaurant?.name || 'Empresa'}
                              </span>
                            </td>
                            {showCityColumn && (
                              <td className="p-6">
                                <div className="flex flex-col">
                                  <span className="text-[8px] font-black uppercase tracking-widest text-blue-400 opacity-60">Cidade</span>
                                  <span className="text-[10px] font-bold">{cityName}</span>
                                </div>
                              </td>
                            )}
                            <td className="p-6">
                              <span className="text-xs font-bold">{formatPrice(item.totalAmount || 0)}</span>
                            </td>
                            <td className="p-6">
                              <span className="text-xs font-bold text-red-400">-{formatPrice(item.platformFee || 0)}</span>
                            </td>
                            <td className="p-6">
                              <span className="text-xs font-bold text-emerald-400">{formatPrice(item.restaurantAmount || 0)}</span>
                            </td>
                            <td className="p-6">
                              <div className="flex flex-col space-y-1">
                                <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest w-fit ${
                                  item.status === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                                }`}>
                                  {item.status === 'success' ? 'Sucesso' : 'Erro'}
                                </span>
                                {item.errorMessage && (
                                  <div className="flex flex-col space-y-2">
                                    <span className="text-[8px] text-red-400/60 italic truncate max-w-[100px]" title={item.errorMessage}>
                                      {item.errorMessage}
                                    </span>
                                    {item.status === 'error' && (
                                      <button 
                                        onClick={() => retrySplitPay(item)}
                                        className="text-[8px] font-black uppercase tracking-widest text-blue-400 hover:text-blue-300 flex items-center space-x-1"
                                      >
                                        <RefreshCw size={8} />
                                        <span>Repetir</span>
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="p-6 text-right">
                              <button 
                                onClick={() => deleteDoc(doc(db, 'splitpay_history', item.id))}
                                className="p-2 text-red-400 hover:bg-white/10 rounded-full transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={showCityColumn ? 9 : 8} className="p-12 text-center text-[10px] font-black uppercase tracking-widest opacity-20">
                          Nenhuma operação registrada
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'wallet' && (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter italic">Configurações da Carteira</h2>
              <div className="relative w-full md:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                <input 
                  type="text"
                  placeholder="Pesquisar restaurante..."
                  value={walletSearchTerm}
                  onChange={e => setWalletSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all font-bold uppercase tracking-widest text-[10px]"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-4">
                <form onSubmit={handleUpdateGlobalSettings} className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 space-y-6">
                  <h3 className="text-xl font-black uppercase tracking-tight italic flex items-center gap-2">
                    <Settings2 className="text-blue-400" size={20} />
                    Configurações Globais
                  </h3>
                  
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Saldo Mínimo para Pedidos (R$)</label>
                      <input 
                        type="number" 
                        value={settings.minWalletBalance || 0} 
                        onChange={e => setSettings({...settings, minWalletBalance: parseFloat(e.target.value)})}
                        className="w-full p-4 bg-white/5 rounded-2xl border border-white/10 font-bold"
                      />
                      <p className="text-[9px] opacity-40 italic">Valor mínimo para o gestor aceitar novos pedidos.</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Recarga Mínima (R$)</label>
                      <input 
                        type="number" 
                        value={settings.minRechargeAmount || 0} 
                        onChange={e => setSettings({...settings, minRechargeAmount: parseFloat(e.target.value)})}
                        className="w-full p-4 bg-white/5 rounded-2xl border border-white/10 font-bold"
                      />
                      <p className="text-[9px] opacity-40 italic">Valor mínimo permitido para recarga via Pix.</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Desconto Padrão por Pedido (R$)</label>
                      <input 
                        type="number" 
                        value={settings.orderDeductionAmount || 0} 
                        onChange={e => setSettings({...settings, orderDeductionAmount: parseFloat(e.target.value)})}
                        className="w-full p-4 bg-white/5 rounded-2xl border border-white/10 font-bold"
                      />
                      <p className="text-[9px] opacity-40 italic">Valor descontado automaticamente se não houver taxa personalizada.</p>
                    </div>
                  </div>
                  
                  <button 
                    type="submit" 
                    disabled={isSavingGlobals}
                    className={`w-full py-4 rounded-2xl font-bold uppercase tracking-widest text-xs shadow-lg transition-all flex items-center justify-center gap-2 ${
                      showSettingsSuccess 
                        ? 'bg-emerald-500 text-white shadow-emerald-500/20' 
                        : 'bg-blue-600 text-white shadow-blue-500/20 hover:bg-blue-700'
                    } disabled:opacity-70 disabled:cursor-not-allowed`}
                  >
                    {isSavingGlobals ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        Salvando...
                      </>
                    ) : showSettingsSuccess ? (
                      <>
                        <CheckCircle size={16} />
                        Aplicado com Sucesso
                      </>
                    ) : (
                      'Salvar Globais'
                    )}
                  </button>
                </form>
              </div>

              <div className="lg:col-span-8 space-y-4">
                <h3 className="text-xl font-black uppercase tracking-tight italic flex items-center gap-2">
                  <Utensils className="text-blue-400" size={20} />
                  Taxas Personalizadas por Restaurante
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {filteredWalletRestaurants.map((res) => {
                    const wallet = wallets.find(w => w.ownerUid === res.ownerUid);
                    return (
                      <div key={`wallet-res-${res.id}`} className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4 hover:border-blue-500/30 transition-all group">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-white/5 rounded-2xl overflow-hidden flex items-center justify-center border border-white/10">
                              {res.imageUrl ? (
                                <img src={res.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <Building2 size={24} className="text-white/20" />
                              )}
                            </div>
                            <div>
                              <h4 className="font-bold text-sm uppercase tracking-tight line-clamp-1">{res.name}</h4>
                              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                                Saldo: <span className="font-mono">R$ {wallet?.balance?.toFixed(2) || '0.00'}</span>
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3 pt-2">
                          <label className="text-[9px] font-black uppercase tracking-widest opacity-40">Taxa por Pedido (R$)</label>
                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={12} />
                              <input 
                                type="number"
                                defaultValue={res.customOrderDeduction ?? settings.orderDeductionAmount}
                                key={res.customOrderDeduction ?? 'default'}
                                onBlur={(e) => {
                                  const val = parseFloat(e.target.value);
                                  if (!isNaN(val) && val !== res.customOrderDeduction) {
                                    handleUpdateRestaurantDeduction(res.id, val);
                                  }
                                }}
                                className="w-full bg-slate-900 border border-white/10 rounded-xl py-3 pl-8 pr-4 text-xs font-bold focus:border-blue-500 transition-all"
                                placeholder="Padrão"
                              />
                            </div>
                            <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-[10px] font-black uppercase tracking-widest opacity-40 group-hover:opacity-100 transition-opacity">
                              {res.customOrderDeduction !== undefined ? 'Personalizado' : 'Global'}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {filteredWalletRestaurants.length === 0 && (
                    <div className="col-span-full py-20 text-center opacity-20 bg-white/5 rounded-[2.5rem] border border-dashed border-white/10">
                      <Search className="mx-auto mb-4" size={48} />
                      <p className="text-xs font-black uppercase tracking-widest">Nenhum restaurante encontrado</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black uppercase tracking-tighter italic text-blue-gradient">⚙️ Segurança</h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Configurações de proteção do painel</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8">
              <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 space-y-6">
                <div className="flex items-center space-x-4">
                  <div className="bg-blue-500/10 p-3 rounded-2xl">
                    <ShieldCheck className="text-blue-600" size={24} />
                  </div>
                  <div>
                    <h3 className="font-black uppercase tracking-tight text-slate-800">Segurança do Painel</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Acesso protegido por senha</p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600 uppercase">Status do Acesso</span>
                    <span className="text-[10px] font-black uppercase px-3 py-1 rounded-full bg-emerald-100 text-emerald-600">
                      Protegido
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                    O painel administrativo está configurado para acesso simplificado via senha mestre.
                  </p>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 space-y-6">
                <div className="flex items-center space-x-4">
                  <div className="bg-slate-500/10 p-3 rounded-2xl">
                    <History className="text-slate-600" size={24} />
                  </div>
                  <div>
                    <h3 className="font-black uppercase tracking-tight text-slate-800">Logs de Acesso</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Histórico de tentativas de login</p>
                  </div>
                </div>

                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {adminLogs.length === 0 ? (
                    <p className="text-center py-8 text-[10px] font-bold text-slate-400 uppercase">Nenhum log encontrado</p>
                  ) : (
                    adminLogs.map((log, idx) => (
                      <div key={`admin-log-item-${log.id || idx}-${idx}`} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                        <div className="flex items-center space-x-3">
                          {log.success ? (
                            <CheckCircle className="text-emerald-500" size={14} />
                          ) : (
                            <XCircle className="text-red-500" size={14} />
                          )}
                          <div>
                            <p className="text-[10px] font-black text-slate-700 uppercase">{log.action}</p>
                            <p className="text-[8px] font-bold text-slate-400">{log.timestamp?.toDate ? new Date(log.timestamp.toDate()).toLocaleString() : 'Recent'}</p>
                          </div>
                        </div>
                        <span className="text-[8px] font-mono text-slate-400">{log.email}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'customization' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-4xl font-black uppercase tracking-tighter italic text-white">Customização</h2>
                <p className="text-slate-400 font-medium">Personalize a interface do cliente e configurações globais.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Icon Customization */}
              <div className="bg-slate-900/50 backdrop-blur-md rounded-[2.5rem] p-8 border border-white/10 shadow-2xl space-y-6">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="p-3 bg-blue-600/20 rounded-2xl text-blue-400">
                    <Settings2 size={24} />
                  </div>
                  <h3 className="text-xl font-black uppercase tracking-tight italic text-white">Ícones do Cliente</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Tamanho dos Ícones ({settings.clientIcons?.size || 18}px)</label>
                    <input 
                      type="range" 
                      min="12" 
                      max="48" 
                      value={settings.clientIcons?.size || 18}
                      onChange={(e) => {
                        const newSize = Number(e.target.value);
                        updateGlobalSettings({ 
                          clientIcons: { 
                            ...(globalSettings?.clientIcons || { spacing: 16 }), 
                            size: newSize 
                          } 
                        });
                      }}
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Espaçamento entre Ícones ({settings.clientIcons?.spacing || 16}px)</label>
                    <input 
                      type="range" 
                      min="4" 
                      max="64" 
                      value={settings.clientIcons?.spacing || 16}
                      onChange={(e) => {
                        const newSpacing = Number(e.target.value);
                        updateGlobalSettings({ 
                          clientIcons: { 
                            ...(globalSettings?.clientIcons || { size: 18 }), 
                            spacing: newSpacing 
                          } 
                        });
                      }}
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                    {[
                      { key: 'colorIcon', label: 'Ícone Cor', icon: Palette },
                      { key: 'filterIcon', label: 'Ícone Filtro', icon: Filter },
                      { key: 'ordersIcon', label: 'Ícone Pedidos', icon: ClipboardList },
                      { key: 'cartIcon', label: 'Ícone Carrinho', icon: ShoppingBag },
                    ].map((item) => (
                      <div key={item.key} className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <item.icon size={16} className="text-blue-400" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.label}</span>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="block text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">
                              Tamanho ({settings.clientIcons?.[`${item.key}Size` as keyof typeof settings.clientIcons] || settings.clientIcons?.size || 18}px)
                            </label>
                            <input 
                              type="range" 
                              min="12" 
                              max="64" 
                              value={settings.clientIcons?.[`${item.key}Size` as keyof typeof settings.clientIcons] || settings.clientIcons?.size || 18}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                updateGlobalSettings({ 
                                  clientIcons: { 
                                    ...(globalSettings?.clientIcons || { size: 18, spacing: 16 }), 
                                    [`${item.key}Size`]: val 
                                  } as any
                                });
                              }}
                              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">
                              Escala ({settings.clientIcons?.[`${item.key}Scale` as keyof typeof settings.clientIcons] || 1})
                            </label>
                            <input 
                              type="range" 
                              min="0.5" 
                              max="3" 
                              step="0.1"
                              value={settings.clientIcons?.[`${item.key}Scale` as keyof typeof settings.clientIcons] || 1}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                updateGlobalSettings({ 
                                  clientIcons: { 
                                    ...(globalSettings?.clientIcons || { size: 18, spacing: 16 }), 
                                    [`${item.key}Scale`]: val 
                                  } as any
                                });
                              }}
                              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">
                              Espaçamento ({settings.clientIcons?.[`${item.key}Spacing` as keyof typeof settings.clientIcons] || settings.clientIcons?.spacing || 16}px)
                            </label>
                            <input 
                              type="range" 
                              min="0" 
                              max="64" 
                              value={settings.clientIcons?.[`${item.key}Spacing` as keyof typeof settings.clientIcons] || settings.clientIcons?.spacing || 16}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                updateGlobalSettings({ 
                                  clientIcons: { 
                                    ...(globalSettings?.clientIcons || { size: 18, spacing: 16 }), 
                                    [`${item.key}Spacing`]: val 
                                  } as any
                                });
                              }}
                              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = 'image/*';
                              input.onchange = async (e: any) => {
                                const file = e.target.files[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = async (event) => {
                                    const base64 = event.target?.result as string;
                                    updateGlobalSettings({
                                      clientIcons: { 
                                        ...(globalSettings?.clientIcons || { size: 18, spacing: 16 }), 
                                        [item.key]: base64 
                                      } as any
                                    });
                                  };
                                  reader.readAsDataURL(file);
                                }
                              };
                              input.click();
                            }}
                            className="flex-grow bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                          >
                            {settings.clientIcons?.[item.key as keyof typeof settings.clientIcons] ? 'Substituir' : 'Subir Imagem'}
                          </button>
                          {settings.clientIcons?.[item.key as keyof typeof settings.clientIcons] && (
                            <button 
                              onClick={() => {
                                const newIcons = { ...settings.clientIcons };
                                delete (newIcons as any)[item.key];
                                updateGlobalSettings({ clientIcons: newIcons as any });
                              }}
                              className="p-2 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                        {settings.clientIcons?.[item.key as keyof typeof settings.clientIcons] && (
                          <img 
                            src={settings.clientIcons?.[item.key as keyof typeof settings.clientIcons] as string} 
                            className="w-10 h-10 object-contain rounded-lg bg-white/10 p-1 mx-auto" 
                            alt="Preview"
                            style={{ 
                              transform: `scale(${settings.clientIcons?.[`${item.key}Scale` as keyof typeof settings.clientIcons] || 1})`
                            }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Maintenance & Effects */}
              <div className="space-y-8">
                <div className="bg-slate-900/50 backdrop-blur-md rounded-[2.5rem] p-8 border border-white/10 shadow-2xl space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 bg-amber-600/20 rounded-2xl text-amber-400">
                        <ShieldAlert size={24} />
                      </div>
                      <h3 className="text-xl font-black uppercase tracking-tight italic text-white">Modo Manutenção</h3>
                    </div>
                    <button 
                      onClick={() => updateGlobalSettings({ maintenanceMode: !settings.maintenanceMode })}
                      className={`p-1 rounded-full w-14 transition-colors ${settings.maintenanceMode ? 'bg-amber-600' : 'bg-slate-700'}`}
                    >
                      <div className={`w-6 h-6 bg-white rounded-full transition-transform ${settings.maintenanceMode ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Mensagem de Manutenção</label>
                      <textarea 
                        value={settings.maintenanceMessage || ''}
                        onChange={(e) => updateGlobalSettings({ maintenanceMessage: e.target.value })}
                        placeholder="Estamos em manutenção..."
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-amber-500/50 transition-all min-h-[100px]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Imagem de Manutenção (URL)</label>
                      <div className="flex space-x-2">
                        <input 
                          type="text"
                          value={settings.maintenanceImageUrl || ''}
                          onChange={(e) => updateGlobalSettings({ maintenanceImageUrl: e.target.value })}
                          placeholder="https://..."
                          className="flex-grow bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-amber-500/50 transition-all"
                        />
                        <button 
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*';
                            input.onchange = async (e: any) => {
                              const file = e.target.files[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = async (event) => {
                                  const base64 = event.target?.result as string;
                                  updateGlobalSettings({ maintenanceImageUrl: base64 });
                                };
                                reader.readAsDataURL(file);
                              }
                            };
                            input.click();
                          }}
                          className="p-4 bg-white/5 border border-white/10 rounded-2xl text-slate-400 hover:text-white transition-all"
                        >
                          <ImageIcon size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/50 backdrop-blur-md rounded-[2.5rem] p-8 border border-white/10 shadow-2xl space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 bg-blue-600/20 rounded-2xl text-blue-400">
                        <RefreshCw size={24} />
                      </div>
                      <h3 className="text-xl font-black uppercase tracking-tight italic text-white">Efeitos Visuais</h3>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white">
                        <Star size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-black uppercase tracking-tight text-white">Efeito Nevar</p>
                        <p className="text-[10px] text-slate-500 font-medium">Ativa neve em todo o sistema</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => updateGlobalSettings({ activeEffect: settings.activeEffect === 'snow' ? 'none' : 'snow' })}
                      className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        settings.activeEffect === 'snow' ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400'
                      }`}
                    >
                      {settings.activeEffect === 'snow' ? 'Ativo' : 'Nevar'}
                    </button>
                  </div>
                </div>

                <div className="bg-slate-900/50 backdrop-blur-md rounded-[2.5rem] p-8 border border-white/10 shadow-2xl space-y-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-emerald-600/20 rounded-2xl text-emerald-400">
                      <MessageCircle size={24} />
                    </div>
                    <h3 className="text-xl font-black uppercase tracking-tight italic text-white">Som Padrão do Sistema</h3>
                  </div>

                  <div className="space-y-4">
                    <p className="text-xs text-slate-400 font-medium">Defina o som padrão de novos pedidos para todos os restaurantes que não configuraram um som próprio.</p>
                    <div className="flex items-center space-x-4">
                      <button 
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'audio/*';
                          input.onchange = async (e: any) => {
                            const file = e.target.files[0];
                            if (file) {
                              // Check file size (max 500KB to avoid Firestore document limit)
                              if (file.size > 500 * 1024) {
                                alert('O arquivo de áudio é muito grande! Para garantir o funcionamento do sistema, use um arquivo de no máximo 500KB.');
                                return;
                              }
                              const reader = new FileReader();
                              reader.onload = async (event) => {
                                const base64 = event.target?.result as string;
                                setPendingOrderSoundUrl(base64);
                              };
                              reader.readAsDataURL(file);
                            }
                          };
                          input.click();
                        }}
                        className="flex-grow bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center space-x-2"
                      >
                        <Plus size={16} />
                        <span>{(pendingOrderSoundUrl || settings.defaultOrderSoundUrl) ? 'Alterar Som Padrão' : 'Selecionar Som Padrão'}</span>
                      </button>
                      {(pendingOrderSoundUrl || settings.defaultOrderSoundUrl) && (
                        <button 
                          onClick={() => {
                            const audio = new Audio(pendingOrderSoundUrl || settings.defaultOrderSoundUrl);
                            audio.play();
                          }}
                          className="p-4 bg-emerald-500/20 text-emerald-400 rounded-2xl hover:bg-emerald-500/30 transition-all"
                        >
                          <RefreshCw size={20} />
                        </button>
                      )}
                    </div>

                    {pendingOrderSoundUrl && (
                      <button
                        onClick={async () => {
                          setIsSavingSound(true);
                          await updateGlobalSettings({ defaultOrderSoundUrl: pendingOrderSoundUrl });
                          setPendingOrderSoundUrl(null);
                          setIsSavingSound(false);
                        }}
                        disabled={isSavingSound}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-6 rounded-3xl text-sm font-black uppercase tracking-widest transition-all flex items-center justify-center space-x-3 shadow-2xl shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <Save size={20} />
                        <span>{isSavingSound ? 'Salvando...' : 'SALVAR NOVO SOM PADRÃO'}</span>
                      </button>
                    )}

                    {(pendingOrderSoundUrl || settings.defaultOrderSoundUrl) && (
                      <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                        <span className="text-[10px] font-mono text-slate-500 truncate max-w-[200px]">
                          {(pendingOrderSoundUrl || settings.defaultOrderSoundUrl).substring(0, 50)}...
                        </span>
                        <button 
                          onClick={() => {
                            if (pendingOrderSoundUrl) setPendingOrderSoundUrl(null);
                            else updateGlobalSettings({ defaultOrderSoundUrl: '' });
                          }}
                          className="text-red-400 hover:text-red-300 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-slate-900/50 backdrop-blur-md rounded-[2.5rem] p-8 border border-white/10 shadow-2xl space-y-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-black dark:text-white">
                      <Palette size={24} />
                    </div>
                    <h3 className="text-xl font-black uppercase tracking-tight italic text-white">Tema Global</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <p className="text-xs text-slate-400 font-medium">Defina a cor padrão para todos os usuários. Usuários ainda podem personalizar suas próprias cores.</p>
                    <div className="grid grid-cols-5 gap-2">
                      {['#2563eb', '#dc2626', '#16a34a', '#9333ea', '#ea580c', '#0891b2', '#4f46e5', '#db2777', '#7c3aed', '#0ea5e9'].map((color) => (
                        <button
                          key={color}
                          onClick={() => updateGlobalSettings({ 
                            globalTheme: { 
                              primaryColor: color, 
                              secondaryColor: color, 
                              isGradient: false 
                            } 
                          })}
                          className={`aspect-square rounded-xl border-2 transition-all ${
                            settings.globalTheme?.primaryColor === color ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="color" 
                        value={settings.globalTheme?.primaryColor || '#2563eb'}
                        onChange={(e) => updateGlobalSettings({ 
                          globalTheme: { 
                            primaryColor: e.target.value, 
                            secondaryColor: e.target.value, 
                            isGradient: false 
                          } 
                        })}
                        className="w-12 h-12 rounded-xl bg-transparent border-none cursor-pointer"
                      />
                      <span className="text-xs font-mono text-slate-400 uppercase">{settings.globalTheme?.primaryColor || '#2563eb'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/50 backdrop-blur-md rounded-[2.5rem] p-8 border border-white/10 shadow-2xl space-y-6 mt-8">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-blue-600/20 rounded-2xl text-blue-400">
                      <Navigation size={24} />
                    </div>
                    <h3 className="text-xl font-black uppercase tracking-tight italic text-white">Configurações de Entrega</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="text-sm font-black uppercase tracking-widest text-blue-400">Entrega TUPÃ</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Valor Base (R$)</label>
                          <input 
                            type="number" 
                            inputMode="decimal"
                            step="0.01"
                            value={settings.tupaDeliveryBaseValue || 0}
                            onChange={(e) => updateGlobalSettings({ tupaDeliveryBaseValue: Number(e.target.value) })}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Valor por KM (R$)</label>
                          <input 
                            type="number" 
                            inputMode="decimal"
                            step="0.01"
                            value={settings.tupaDeliveryKmValue || 0}
                            onChange={(e) => updateGlobalSettings({ tupaDeliveryKmValue: Number(e.target.value) })}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-all"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Distância Mínima (KM)</label>
                          <input 
                            type="number" 
                            inputMode="decimal"
                            value={settings.tupaDeliveryMinDistance || 0}
                            onChange={(e) => updateGlobalSettings({ tupaDeliveryMinDistance: Number(e.target.value) })}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Distância Máxima (KM)</label>
                          <input 
                            type="number" 
                            inputMode="decimal"
                            value={settings.tupaDeliveryMaxDistance || 0}
                            onChange={(e) => updateGlobalSettings({ tupaDeliveryMaxDistance: Number(e.target.value) })}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-all"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Nome da Entrega</label>
                        <input 
                          type="text" 
                          value={settings.tupaDeliveryName || ''}
                          onChange={(e) => updateGlobalSettings({ tupaDeliveryName: e.target.value })}
                          placeholder="Ex: TUPÃ Rápida"
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Tempo Estimado</label>
                        <input 
                          type="text" 
                          value={settings.tupaDeliveryEstimatedTime || ''}
                          onChange={(e) => updateGlobalSettings({ tupaDeliveryEstimatedTime: e.target.value })}
                          placeholder="Ex: 20–40 min"
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-sm font-black uppercase tracking-widest text-emerald-400">Entrega da Loja</h4>
                      <p className="text-xs text-slate-400 font-medium leading-relaxed">
                        As taxas de entrega da loja são configuradas individualmente por cada restaurante em seu próprio painel.
                      </p>
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Regra de Cálculo</p>
                        <p className="text-xs text-white font-medium">
                          Quando houver múltiplos restaurantes no pedido, o sistema somará automaticamente as taxas individuais de cada um.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* New Personalization Sections */}
                <div className="bg-slate-900/50 backdrop-blur-md rounded-[2.5rem] p-8 border border-white/10 shadow-2xl space-y-8">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-purple-600/20 rounded-2xl text-purple-400">
                      <Settings2 size={24} />
                    </div>
                    <h3 className="text-xl font-black uppercase tracking-tight italic text-white">Suporte e Contato</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Link de Suporte (URL)</label>
                      <input 
                        type="text" 
                        value={settings.supportLink || ''}
                        onChange={(e) => updateGlobalSettings({ supportLink: e.target.value })}
                        placeholder="https://wa.me/..."
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Telefone Suporte App</label>
                      <input 
                        type="text" 
                        value={settings.appSupportPhone || ''}
                        onChange={(e) => updateGlobalSettings({ appSupportPhone: e.target.value })}
                        placeholder="(00) 00000-0000"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Telefone Suporte Empresa</label>
                      <input 
                        type="text" 
                        value={settings.companySupportPhone || ''}
                        onChange={(e) => updateGlobalSettings({ companySupportPhone: e.target.value })}
                        placeholder="(00) 00000-0000"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-all"
                      />
                    </div>
                  </div>

                  <div className="pt-6 border-t border-white/5">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Suporte por Cidade</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Selecionar Cidade</label>
                        <select 
                          value={selectedSupportCityId}
                          onChange={(e) => {
                            const cityId = e.target.value;
                            setSelectedSupportCityId(cityId);
                            setCitySupportPhone(settings.citySupportNumbers?.[cityId] || '');
                          }}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-all"
                        >
                          <option value="">Selecione uma cidade</option>
                          {cities.reduce((acc: any[], city) => {
                            if (!acc.find(c => c.name === city.name)) {
                              acc.push(city);
                            }
                            return acc;
                          }, []).map(city => (
                            <option key={`city-support-${city.id}`} value={city.id}>{city.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Telefone Suporte (Cidade)</label>
                        <input 
                          type="text" 
                          value={citySupportPhone}
                          onChange={(e) => setCitySupportPhone(e.target.value)}
                          placeholder="(00) 00000-0000"
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-all"
                        />
                      </div>
                      <button
                        onClick={() => {
                          if (!selectedSupportCityId) return;
                          const newCitySupportNumbers = { ...(settings.citySupportNumbers || {}) };
                          if (citySupportPhone) {
                            newCitySupportNumbers[selectedSupportCityId] = citySupportPhone;
                          } else {
                            delete newCitySupportNumbers[selectedSupportCityId];
                          }
                          updateGlobalSettings({ citySupportNumbers: newCitySupportNumbers });
                        }}
                        className="bg-blue-600 text-white font-black uppercase tracking-widest text-[10px] py-4 rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                      >
                        Salvar Suporte Cidade
                      </button>
                    </div>

                    {settings.citySupportNumbers && Object.keys(settings.citySupportNumbers).length > 0 && (
                      <div className="mt-6 space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Cidades com Suporte Específico:</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(settings.citySupportNumbers).map(([cityId, phone]) => {
                            const city = cities.find(c => c.id === cityId);
                            return (
                              <div key={cityId} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 flex items-center space-x-3">
                                <span className="text-xs font-bold text-white">{city?.name || 'Cidade Desconhecida'}:</span>
                                <span className="text-xs text-blue-400 font-mono">{phone}</span>
                                <button 
                                  onClick={() => {
                                    const newCitySupportNumbers = { ...settings.citySupportNumbers };
                                    delete newCitySupportNumbers[cityId];
                                    updateGlobalSettings({ citySupportNumbers: newCitySupportNumbers });
                                  }}
                                  className="text-red-400 hover:text-red-300 transition-colors"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-slate-900/50 backdrop-blur-md rounded-[2.5rem] p-8 border border-white/10 shadow-2xl space-y-8">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-amber-600/20 rounded-2xl text-amber-400">
                      <LayoutGrid size={24} />
                    </div>
                    <h3 className="text-xl font-black uppercase tracking-tight italic text-white">Ordenação e Exibição</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                      <div>
                        <p className="text-sm font-black uppercase tracking-tight text-white">Melhores Avaliados Primeiro</p>
                        <p className="text-[10px] text-slate-500 font-medium">Exibe empresas com maior nota no topo</p>
                      </div>
                      <button 
                        onClick={() => updateGlobalSettings({ bestRatedFirst: !settings.bestRatedFirst })}
                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          settings.bestRatedFirst ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400'
                        }`}
                      >
                        {settings.bestRatedFirst ? 'Ativo' : 'Inativo'}
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                      <div>
                        <p className="text-sm font-black uppercase tracking-tight text-white">Abertas Primeiro</p>
                        <p className="text-[10px] text-slate-500 font-medium">Prioriza empresas abertas na listagem</p>
                      </div>
                      <button 
                        onClick={() => updateGlobalSettings({ openFirst: !settings.openFirst })}
                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          settings.openFirst ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400'
                        }`}
                      >
                        {settings.openFirst ? 'Ativo' : 'Inativo'}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-black uppercase tracking-widest text-amber-400">Categorias Programadas</h4>
                      <button
                        onClick={() => setIsAddingSchedule('new')}
                        className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20"
                      >
                        <Plus size={14} />
                        <span>Adicionar Categorias em Horários</span>
                      </button>
                    </div>

                    {isAddingSchedule && (
                      <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-slate-800/50 border border-white/10 rounded-[2rem] p-6 space-y-6"
                      >
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-black uppercase tracking-widest text-white">Novo Agendamento</h5>
                          <button onClick={() => setIsAddingSchedule(null)} className="text-slate-500 hover:text-white transition-colors">
                            <X size={16} />
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Selecione a Categoria</label>
                            <select 
                              className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white text-xs focus:outline-none focus:border-blue-500/50 transition-all"
                              onChange={(e) => {
                                const catId = e.target.value;
                                if (!catId) return;
                                const config = { ...settings.categoryDisplayConfig };
                                const catConfig = config[catId] || { schedules: [] };
                                const newSchedule = {
                                  startTime: '18:00',
                                  endTime: '22:00',
                                  phrase: 'Ofertas Imperdíveis!',
                                  rankingCriteria: 'orders'
                                };
                                config[catId] = {
                                  ...catConfig,
                                  schedules: [...(catConfig.schedules || []), newSchedule]
                                };
                                updateGlobalSettings({ categoryDisplayConfig: config });
                                setIsAddingSchedule(null);
                              }}
                            >
                              <option value="">Selecione...</option>
                              {categories.map((c, idx) => (
                                <option key={`${c.id}-${idx}`} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    <div className="grid grid-cols-1 gap-4">
                      {categories.map((cat, idx) => (
                        <div key={`${cat.id}-${idx}`} className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-white">{cat.name}</span>
                            <button
                              onClick={() => {
                                const config = { ...settings.categoryDisplayConfig };
                                const catConfig = config[cat.id] || { schedules: [] };
                                const newSchedule = {
                                  startTime: '18:00',
                                  endTime: '22:00',
                                  phrase: 'Ofertas da Noite!',
                                  rankingCriteria: 'orders'
                                };
                                config[cat.id] = {
                                  ...catConfig,
                                  schedules: [...(catConfig.schedules || []), newSchedule]
                                };
                                updateGlobalSettings({ categoryDisplayConfig: config });
                              }}
                              className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:text-emerald-300 transition-colors"
                            >
                              <Plus size={14} />
                              <span>Adicionar Horário</span>
                            </button>
                          </div>

                          <div className="space-y-4">
                            {(settings.categoryDisplayConfig?.[cat.id]?.schedules || []).map((schedule: any, idx: number) => (
                              <div key={`${cat.id}-schedule-${idx}`} className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4 relative group/schedule">
                                <button
                                  onClick={() => {
                                    const config = { ...settings.categoryDisplayConfig };
                                    const schedules = [...config[cat.id].schedules];
                                    schedules.splice(idx, 1);
                                    config[cat.id] = { ...config[cat.id], schedules };
                                    updateGlobalSettings({ categoryDisplayConfig: config });
                                  }}
                                  className="absolute -top-2 -right-2 p-2 bg-red-600 text-white rounded-full opacity-0 group-hover/schedule:opacity-100 transition-opacity shadow-lg z-10"
                                >
                                  <Trash2 size={12} />
                                </button>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Início</label>
                                    <input 
                                      type="text" placeholder="00:00"
                                      value={schedule.startTime}
                                      onChange={(e) => {
                                        const config = { ...settings.categoryDisplayConfig };
                                        const schedules = [...config[cat.id].schedules];
                                        schedules[idx] = { ...schedules[idx], startTime: e.target.value };
                                        config[cat.id] = { ...config[cat.id], schedules };
                                        updateGlobalSettings({ categoryDisplayConfig: config });
                                      }}
                                      className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white text-xs focus:outline-none focus:border-blue-500/50 transition-all"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Fim</label>
                                    <input 
                                      type="text" placeholder="00:00"
                                      value={schedule.endTime}
                                      onChange={(e) => {
                                        const config = { ...settings.categoryDisplayConfig };
                                        const schedules = [...config[cat.id].schedules];
                                        schedules[idx] = { ...schedules[idx], endTime: e.target.value };
                                        config[cat.id] = { ...config[cat.id], schedules };
                                        updateGlobalSettings({ categoryDisplayConfig: config });
                                      }}
                                      className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white text-xs focus:outline-none focus:border-blue-500/50 transition-all"
                                    />
                                  </div>
                                  <div className="col-span-2">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Frase de Destaque</label>
                                    <input 
                                      type="text" 
                                      value={schedule.phrase}
                                      onChange={(e) => {
                                        const config = { ...settings.categoryDisplayConfig };
                                        const schedules = [...config[cat.id].schedules];
                                        schedules[idx] = { ...schedules[idx], phrase: e.target.value };
                                        config[cat.id] = { ...config[cat.id], schedules };
                                        updateGlobalSettings({ categoryDisplayConfig: config });
                                      }}
                                      placeholder="Ex: Ofertas da Noite!"
                                      className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white text-xs focus:outline-none focus:border-blue-500/50 transition-all"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Critério de Ranking</label>
                                  <div className="flex space-x-2">
                                    {[
                                      { id: 'orders', label: 'Mais Pedidos', icon: TrendingUp },
                                      { id: 'rating', label: 'Melhor Avaliados', icon: Star },
                                    ].map((opt) => (
                                      <button
                                        key={opt.id}
                                        onClick={() => {
                                          const config = { ...settings.categoryDisplayConfig };
                                          const schedules = [...config[cat.id].schedules];
                                          schedules[idx] = { ...schedules[idx], rankingCriteria: opt.id };
                                          config[cat.id] = { ...config[cat.id], schedules };
                                          updateGlobalSettings({ categoryDisplayConfig: config });
                                        }}
                                        className={`flex-1 flex items-center justify-center space-x-2 p-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                          schedule.rankingCriteria === opt.id 
                                            ? 'bg-brand-blue text-white shadow-lg shadow-blue-500/20' 
                                            : 'bg-white/5 text-slate-500 hover:bg-white/10'
                                        }`}
                                      >
                                        <opt.icon size={14} />
                                        <span>{opt.label}</span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            ))}

                            {(!settings.categoryDisplayConfig?.[cat.id]?.schedules || settings.categoryDisplayConfig?.[cat.id]?.schedules.length === 0) && (
                              <div className="text-center py-6 bg-white/5 rounded-2xl border border-dashed border-white/10">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nenhum horário configurado</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/50 backdrop-blur-md rounded-[2.5rem] p-8 border border-white/10 shadow-2xl space-y-8">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-red-600/20 rounded-2xl text-red-400">
                      <AlertTriangle size={24} />
                    </div>
                    <h3 className="text-xl font-black uppercase tracking-tight italic text-white">Modo Manutenção</h3>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                      <div>
                        <p className="text-sm font-black uppercase tracking-tight text-white">Ativar Manutenção</p>
                        <p className="text-[10px] text-slate-500 font-medium">Bloqueia o acesso de clientes ao app</p>
                      </div>
                      <button 
                        onClick={() => updateGlobalSettings({ maintenanceMode: !settings.maintenanceMode })}
                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          settings.maintenanceMode ? 'bg-red-600 text-white' : 'bg-white/5 text-slate-400'
                        }`}
                      >
                        {settings.maintenanceMode ? 'Ativo' : 'Inativo'}
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Mensagem de Manutenção</label>
                        <textarea 
                          value={settings.maintenanceMessage || ''}
                          onChange={(e) => updateGlobalSettings({ maintenanceMessage: e.target.value })}
                          placeholder="Ex: Estamos em manutenção para melhorias..."
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-all h-32 resize-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">URL da Imagem de Manutenção</label>
                        <input 
                          type="text" 
                          value={settings.maintenanceImageUrl || ''}
                          onChange={(e) => updateGlobalSettings({ maintenanceImageUrl: e.target.value })}
                          placeholder="https://..."
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-8">
                  <button 
                    onClick={() => alert('Todas as configurações foram salvas com sucesso!')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-12 py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/20 flex items-center space-x-3"
                  >
                    <Save size={20} />
                    <span>Salvar Tudo</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2">
                <h2 className="text-3xl font-black uppercase tracking-tighter italic text-white">Visualizações</h2>
                <p className="text-slate-500 text-xs font-medium uppercase tracking-widest">Acompanhe o tráfego do seu aplicativo</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: 'Hoje', value: pageViews.filter(v => new Date(v.timestamp).toDateString() === new Date().toDateString()).length, icon: Eye, color: 'text-blue-400', bg: 'bg-blue-400/10' },
                { label: 'Este Mês', value: pageViews.filter(v => new Date(v.timestamp).getMonth() === new Date().getMonth()).length, icon: Calendar, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
                { label: 'Total', value: pageViews.length, icon: TrendingUp, color: 'text-amber-400', bg: 'bg-amber-400/10' },
              ].map((stat, idx) => (
                <div key={stat.label} className="bg-slate-900/50 backdrop-blur-md rounded-[2.5rem] p-8 border border-white/10 shadow-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                      <stat.icon size={24} />
                    </div>
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-1">{stat.label}</p>
                  <p className="text-4xl font-black text-white italic tracking-tighter">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="bg-slate-900/50 backdrop-blur-md rounded-[2.5rem] p-8 border border-white/10 shadow-2xl">
              <h3 className="text-xl font-black uppercase tracking-tight italic text-white mb-8">Tráfego nas Últimas 24 Horas</h3>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={(() => {
                    const last24Hours = Array.from({ length: 24 }, (_, i) => {
                      const d = new Date();
                      d.setHours(d.getHours() - (23 - i));
                      return {
                        hour: `${String(d.getHours()).padStart(2, '0')}:00`,
                        views: pageViews.filter(v => {
                          const vd = new Date(v.timestamp);
                          return vd.getHours() === d.getHours() && vd.toDateString() === d.toDateString();
                        }).length
                      };
                    });
                    return last24Hours;
                  })()}>
                    <defs>
                      <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis dataKey="hour" stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '1rem' }}
                      itemStyle={{ color: '#fff', fontSize: '10px', fontWeight: 'bold' }}
                    />
                    <Area type="monotone" dataKey="views" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorViews)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Real-time Orders and Daily Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Real-time Orders */}
              <div className="bg-slate-900/50 backdrop-blur-md rounded-[2.5rem] p-8 border border-white/10 shadow-2xl space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-xl font-black uppercase tracking-tight italic text-white flex items-center space-x-3">
                      <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl">
                        <ShoppingBag size={20} />
                      </div>
                      <span>Pedidos em Tempo Real</span>
                    </h3>
                    <div className="flex items-center space-x-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                        {new Set(allOrders.filter(o => ['pending', 'accepted', 'preparing', 'delivering'].includes(o.status)).map(o => o.customerUid)).size} Clientes
                      </p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                        {new Set(allOrders.filter(o => ['pending', 'accepted', 'preparing', 'delivering'].includes(o.status)).map(o => o.restaurantId)).size} Empresas
                      </p>
                    </div>
                  </div>
                  <span className="px-4 py-1 bg-blue-500/20 text-blue-400 rounded-full text-[10px] font-black uppercase tracking-widest">
                    {allOrders.filter(o => ['pending', 'accepted', 'preparing', 'delivering'].includes(o.status)).length} Ativos
                  </span>
                </div>

                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {displayedRealTimeOrders.map((order, idx) => {
                    const restaurant = restaurants.find(r => r.id === order.restaurantId);
                    const customer = users.find(u => u.uid === order.customerUid);
                    return (
                      <div key={`admin-rt-order-${order.id}-${idx}`} className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-800 overflow-hidden border border-white/10">
                          {restaurant?.imageUrl ? (
                                <img src={restaurant.imageUrl || undefined} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs font-black">{restaurant?.name?.charAt(0)}</div>
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white">{restaurant?.name || 'Empresa'}</p>
                              <p className="text-[10px] text-blue-400 font-black flex items-center space-x-1">
                                <Phone size={10} />
                                <span>{restaurant?.whatsapp || 'N/A'}</span>
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">{order.status}</p>
                            <p className="text-xs font-bold text-white">{formatPrice(order.total || 0)}</p>
                          </div>
                        </div>
                        <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px] font-black text-blue-400 overflow-hidden">
                              <img 
                                src={customer?.photoURL || `https://ui-avatars.com/api/?name=${customer?.displayName || 'NOME'}&background=2563eb&color=fff`} 
                                className="w-full h-full object-cover" 
                                referrerPolicy="no-referrer" 
                              />
                            </div>
                            <span className="text-[10px] font-bold text-slate-400">{customer?.displayName || 'Cliente'}</span>
                          </div>
                          <p className="text-[10px] text-emerald-400 font-black flex items-center space-x-1">
                            <Smartphone size={10} />
                            <span>{customer?.whatsapp || 'N/A'}</span>
                          </p>
                        </div>
                      </div>
                    );
                  })}

                  {activeOrders.length > realTimeOrdersLimit && (
                    <div className="flex justify-center pt-4">
                      <button 
                        onClick={() => setRealTimeOrdersLimit(prev => prev + 3)}
                        className="px-6 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2"
                      >
                        <Plus size={14} />
                        Ver Mais
                      </button>
                    </div>
                  )}

                  {activeOrders.length === 0 && (
                    <div className="text-center py-8 opacity-40">
                      <ShoppingBag size={32} className="mx-auto mb-2" />
                      <p className="text-xs font-bold uppercase tracking-widest">Nenhum pedido ativo agora</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Daily Stats Summary */}
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-900/50 backdrop-blur-md rounded-[2.5rem] p-8 border border-white/10 shadow-2xl">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-emerald-400/10 text-emerald-400 rounded-2xl">
                        <CheckCircle size={24} />
                      </div>
                    </div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Finalizados Hoje</p>
                    <p className="text-4xl font-black text-white italic tracking-tighter">
                      {allOrders.filter(o => ['delivered', 'completed'].includes(o.status) && new Date(o.createdAt?.seconds ? o.createdAt.seconds * 1000 : o.createdAt).toDateString() === new Date().toDateString()).length}
                    </p>
                  </div>
                  <div className="bg-slate-900/50 backdrop-blur-md rounded-[2.5rem] p-8 border border-white/10 shadow-2xl">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-red-400/10 text-red-400 rounded-2xl">
                        <XCircle size={24} />
                      </div>
                    </div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Cancelados Hoje</p>
                    <p className="text-4xl font-black text-white italic tracking-tighter">
                      {allOrders.filter(o => o.status === 'cancelled' && new Date(o.createdAt?.seconds ? o.createdAt.seconds * 1000 : o.createdAt).toDateString() === new Date().toDateString()).length}
                    </p>
                  </div>
                </div>

                {/* Lists of Finished and Cancelled Today */}
                <div className="bg-slate-900/50 backdrop-blur-md rounded-[2.5rem] p-8 border border-white/10 shadow-2xl space-y-6">
                  <h3 className="text-xl font-black uppercase tracking-tight italic text-white">Histórico de Hoje</h3>
                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {(Array.from(new Map(allOrders.filter(o => ['delivered', 'completed', 'cancelled'].includes(o.status) && new Date(o.createdAt?.seconds ? o.createdAt.seconds * 1000 : o.createdAt).toDateString() === new Date().toDateString()).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).map(o => [o.id, o])).values()) as Order[]).map((order, idx) => {
                      const restaurant = restaurants.find(r => r.id === order.restaurantId);
                      const customer = users.find(u => u.uid === order.customerUid);
                      const isCancelled = order.status === 'cancelled';
                      return (
                        <div key={`admin-fin-history-${order.id}-${idx}`} className={`p-4 rounded-2xl border ${isCancelled ? 'bg-red-500/5 border-red-500/10' : 'bg-emerald-500/5 border-emerald-500/10'} space-y-3`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-slate-800 overflow-hidden border border-white/10 flex-shrink-0">
                                {restaurant?.imageUrl ? (
                                  <img src={restaurant.imageUrl || undefined} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-xs font-black">{restaurant?.name?.charAt(0)}</div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-white truncate">{restaurant?.name || 'Empresa'}</p>
                                <p className="text-[10px] text-blue-400 font-black flex items-center space-x-1">
                                  <Phone size={10} />
                                  <span>{restaurant?.whatsapp || 'N/A'}</span>
                                </p>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="flex items-center justify-end space-x-2 mb-1">
                                {isCancelled ? <XCircle size={12} className="text-red-400" /> : <CheckCircle size={12} className="text-emerald-400" />}
                                <span className={`text-[10px] font-black uppercase tracking-widest ${isCancelled ? 'text-red-400' : 'text-emerald-400'}`}>
                                  {isCancelled ? 'Cancelado' : 'Finalizado'}
                                </span>
                              </div>
                              <p className="text-xs font-bold text-white">{formatPrice(order.total || 0)}</p>
                            </div>
                          </div>
                          
                          <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-black text-slate-400 overflow-hidden">
                                {customer?.photoURL ? (
                                  <img src={customer.photoURL} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  customer?.displayName?.charAt(0) || 'C'
                                )}
                              </div>
                              <span className="text-[10px] font-bold text-slate-400">{customer?.displayName || 'Cliente'}</span>
                            </div>
                            <p className="text-[10px] text-emerald-400 font-black flex items-center space-x-1">
                              <Smartphone size={10} />
                              <span>{customer?.whatsapp || 'N/A'}</span>
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    {allOrders.filter(o => ['delivered', 'completed', 'cancelled'].includes(o.status) && new Date(o.createdAt?.seconds ? o.createdAt.seconds * 1000 : o.createdAt).toDateString() === new Date().toDateString()).length === 0 && (
                      <p className="text-center py-8 text-xs font-bold uppercase tracking-widest opacity-40">Nenhum pedido finalizado ou cancelado hoje</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-8">
            <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter italic">Configurações do Painel</h2>
            
            <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 space-y-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-blue-500/10 transition-colors" />
              
              <div className="flex items-center justify-between relative z-10">
                <div className="space-y-1">
                  <h3 className="text-2xl font-black uppercase tracking-tight italic flex items-center space-x-3 text-blue-400">
                    <Package size={32} />
                    <span>Armazenamento do Banco</span>
                  </h3>
                  <p className="text-xs opacity-60">Uso total de recursos do banco de dados em tempo real.</p>
                </div>
                <div className="text-right">
                  <div className="flex items-baseline justify-end space-x-1">
                    <span className="text-5xl font-black italic text-white">{storageUsage}</span>
                    <span className="text-xl font-black italic text-blue-400">%</span>
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Capacidade Utilizada</p>
                </div>
              </div>
              
              <div className="relative h-10 bg-white/5 rounded-2xl overflow-hidden border border-white/10 p-1.5 z-10">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${storageUsage}%` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className={`h-full rounded-xl shadow-lg transition-all duration-500 relative`}
                  style={{
                    background: storageUsage > 90 ? 'linear-gradient(90deg, #ef4444, #f87171)' : 
                               storageUsage > 70 ? 'linear-gradient(90deg, #eab308, #facc15)' : 
                               'linear-gradient(90deg, #3b82f6, #60a5fa)'
                  }}
                >
                  <div className="absolute inset-0 bg-white/20 mix-blend-overlay" />
                </motion.div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-2 relative z-10">
                <div className="bg-white/5 p-5 rounded-3xl border border-white/5 text-center hover:bg-white/10 transition-colors">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Status</p>
                  <div className="flex items-center justify-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${storageUsage > 90 ? 'bg-red-500 animate-ping' : 'bg-emerald-500'}`} />
                    <p className={`text-xs font-bold uppercase ${storageUsage > 90 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {storageUsage > 90 ? 'Crítico' : storageUsage > 70 ? 'Alerta' : 'Saudável'}
                    </p>
                  </div>
                </div>
                <div className="bg-white/5 p-5 rounded-3xl border border-white/5 text-center hover:bg-white/10 transition-colors">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Limite</p>
                  <p className="text-xs font-bold text-white">1.0 GB</p>
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-600">Plano Spark</p>
                </div>
                <div className="bg-white/5 p-5 rounded-3xl border border-white/5 text-center hover:bg-white/10 transition-colors">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Documentos</p>
                  <p className="text-xs font-bold text-white">~{Math.round(storageUsage * 100)}</p>
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-600">Estimativa</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 space-y-6">
                <h3 className="text-xl font-black uppercase tracking-tight italic flex items-center space-x-2 text-red-400">
                  <Trash2 size={24} />
                  <span>Limpeza de Banco de Dados</span>
                </h3>
                <p className="text-xs opacity-60">Ações de manutenção para o banco de dados. Use com cautela.</p>
                <div className="space-y-4">
                  <button 
                    onClick={deleteMonthlyData}
                    className="w-full flex items-center justify-between p-6 bg-red-500/10 border border-red-500/20 rounded-3xl hover:bg-red-500/20 transition-all group"
                  >
                    <div className="text-left">
                      <p className="font-bold text-red-400">Apagar Dados Mensais (Pagamentos e Pedidos)</p>
                      <p className="text-[10px] uppercase tracking-widest opacity-40">Remove todos os registros de pagamentos e pedidos deste mês</p>
                    </div>
                    <ChevronRight className="text-red-400 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>

              <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 space-y-6">
                <h3 className="text-xl font-black uppercase tracking-tight italic flex items-center space-x-2 text-blue-400">
                  <ShieldCheck size={24} />
                  <span>Segurança do Sistema</span>
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                    <div>
                      <p className="text-xs font-bold">Autenticação 2FA</p>
                      <p className="text-[10px] opacity-40">Exigir login Google para ações críticas</p>
                    </div>
                    <div className="w-12 h-6 bg-blue-600 rounded-full relative">
                      <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handleUpdateGlobalSettings} className="bg-white/5 p-6 md:p-8 rounded-3xl border border-white/10 space-y-6 max-w-md">
              <h3 className="text-lg font-bold uppercase tracking-tight italic">Configurações Globais</h3>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Intervalo do Carrossel (Segundos)</label>
                <input 
                  type="number" 
                  min="1"
                  max="60"
                  value={settings.carouselInterval} 
                  onChange={e => setSettings({ ...settings, carouselInterval: parseInt(e.target.value) })}
                  className="w-full p-4 bg-white/5 rounded-xl border border-white/10 focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Duração da Assinatura (Dias)</label>
                <input 
                  type="number" 
                  min="1"
                  value={settings.subscriptionDurationDays} 
                  onChange={e => setSettings({ ...settings, subscriptionDurationDays: parseInt(e.target.value) })}
                  className="w-full p-4 bg-white/5 rounded-xl border border-white/10 focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Valor da Mensalidade (R$)</label>
                <input 
                  type="number" 
                  inputMode="decimal"
                  min="0"
                  value={settings.monthlyFee} 
                  onChange={e => setSettings({ ...settings, monthlyFee: parseFloat(e.target.value) })}
                  className="w-full p-4 bg-white/5 rounded-xl border border-white/10 focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-blue-700 transition-colors">
                Salvar Configurações
              </button>
            </form>
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="space-y-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter italic">Gestão de Categorias</h2>
                <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 w-fit">
                  <button 
                    onClick={() => setActiveCategorySubTab('products')}
                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeCategorySubTab === 'products' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white'}`}
                  >
                    Categorias de Produtos
                  </button>
                  <button 
                    onClick={() => setActiveCategorySubTab('modalities')}
                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeCategorySubTab === 'modalities' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white'}`}
                  >
                    Empresas
                  </button>
                  <button 
                    onClick={() => setActiveCategorySubTab('businesses')}
                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeCategorySubTab === 'businesses' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white'}`}
                  >
                    Lojas Cadastradas
                  </button>
                </div>
              </div>
              <button 
                onClick={() => {
                  if (activeCategorySubTab === 'products') {
                    setIsAddingCategory(true);
                    setEditingCategory(null);
                    setCatName('');
                    setCatImageUrl('');
                  } else if (activeCategorySubTab === 'modalities') {
                    setIsAddingBusinessCategory(true);
                    setEditingBusinessCategory(null);
                    setBusCatName('');
                    setBusCatImageUrl('');
                    setBusCatStatus('active');
                  } else {
                    setActiveTab('restaurants');
                    setIsAddingRestaurant(true);
                    setEditingRestaurant(null);
                  }
                }}
                className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all"
              >
                <Plus size={16} />
                <span>Nova {activeCategorySubTab === 'products' ? 'Categoria' : activeCategorySubTab === 'modalities' ? 'Empresa' : 'Loja'}</span>
              </button>
            </div>

            {activeCategorySubTab === 'products' ? (
              <>
                {/* Special "Todos" Category Image */}
                <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-black uppercase tracking-tight italic">Categoria "Todos"</h3>
                      <p className="text-xs opacity-60">Personalize a imagem da categoria padrão que mostra todos os itens.</p>
                    </div>
                    {settings.allCategoryImageUrl && (
                      <div className="w-16 h-16 rounded-2xl overflow-hidden border border-white/10">
                        <img src={settings.allCategoryImageUrl} className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-4 items-center">
                    <label className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center space-x-2 cursor-pointer">
                      <Plus size={16} />
                      <span>Mudar Imagem "Todos"</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'all_category')} />
                    </label>
                    {settings.allCategoryImageUrl && (
                      <button 
                        onClick={() => setSettings({ ...settings, allCategoryImageUrl: '' })}
                        className="p-4 bg-red-500/10 text-red-400 rounded-2xl border border-red-500/20 hover:bg-red-500/20 transition-all"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
                  </div>
                </div>

                {(isAddingCategory || editingCategory) && (
                  <form onSubmit={editingCategory ? handleEditCategory : handleAddCategory} className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 space-y-6 max-w-2xl">
                    <h3 className="text-xl font-black uppercase tracking-tight italic">
                      {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Nome da Categoria</label>
                        <input required value={catName} onChange={e => setCatName(e.target.value)} className="w-full p-4 bg-white/5 rounded-2xl border border-white/10 focus:ring-2 focus:ring-blue-500/50" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Status</label>
                        <select value={catStatus} onChange={e => setCatStatus(e.target.value as any)} className="w-full p-4 bg-slate-800 rounded-2xl border border-white/10">
                          <option value="active">Ativa</option>
                          <option value="inactive">Inativa</option>
                        </select>
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Imagem da Categoria</label>
                        <div className="flex gap-4 items-center">
                          <label className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center space-x-2 cursor-pointer">
                            <Plus size={16} />
                            <span>Upload Arquivo</span>
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'category')} />
                          </label>
                          {catImageUrl && (
                            <div className="w-16 h-16 rounded-2xl overflow-hidden border border-white/10 flex-shrink-0">
                              <img src={catImageUrl} className="w-full h-full object-cover" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <button type="submit" className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-blue-700 transition-all">
                        {editingCategory ? 'Salvar Alterações' : 'Criar Categoria'}
                      </button>
                      <button type="button" onClick={() => { setIsAddingCategory(false); setEditingCategory(null); }} className="px-8 bg-white/5 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs">
                        Cancelar
                      </button>
                    </div>
                  </form>
                )}

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {categories.slice(0, categoriesLimit).map((cat, idx) => (
                    <div key={`admin-cat-${cat.id}-${idx}`} className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden group hover:border-blue-500/30 transition-all">
                      <div className="h-32 relative">
                        {cat.imageUrl ? (
                          <img src={cat.imageUrl} alt={cat.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-white/5 flex items-center justify-center">
                            <ImageIcon size={32} className="text-white/20" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity space-x-2">
                          <button 
                            onClick={() => {
                              setEditingCategory(cat);
                              setCatName(cat.name);
                              setCatImageUrl(cat.imageUrl);
                              setCatStatus(cat.status || 'active');
                            }}
                            className="p-3 bg-white text-[#141414] rounded-xl"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button onClick={() => deleteCategory(cat.id)} className="p-3 bg-red-500 text-white rounded-xl">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                      <div className="p-4 text-center">
                        <h4 className="font-bold uppercase tracking-tight text-sm">{cat.name}</h4>
                        <span className={`text-[8px] font-black uppercase tracking-widest ${cat.status === 'active' ? 'text-green-400' : 'text-red-400'}`}>
                          {cat.status || 'active'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {categories.length > categoriesLimit && (
                  <div className="flex justify-center pt-8">
                    <button 
                      onClick={() => setCategoriesLimit(prev => prev + 3)}
                      className="px-8 py-3 bg-white/5 border border-white/10 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2"
                    >
                      <Plus size={16} />
                      Ver Mais Categorias
                    </button>
                  </div>
                )}
              </>
            ) : activeCategorySubTab === 'modalities' ? (
              <>
                {(isAddingBusinessCategory || editingBusinessCategory) && (
                  <form onSubmit={editingBusinessCategory ? handleEditBusinessCategory : handleAddBusinessCategory} className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 space-y-6 max-w-2xl">
                    <h3 className="text-xl font-black uppercase tracking-tight italic">
                      {editingBusinessCategory ? 'Editar Empresa' : 'Nova Empresa'}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Nome da Empresa</label>
                        <input required value={busCatName} onChange={e => setBusCatName(e.target.value)} className="w-full p-4 bg-white/5 rounded-2xl border border-white/10 focus:ring-2 focus:ring-blue-500/50" placeholder="Ex: Restaurante, Mercado..." />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Status</label>
                        <select value={busCatStatus} onChange={e => setBusCatStatus(e.target.value as any)} className="w-full p-4 bg-slate-800 rounded-2xl border border-white/10">
                          <option value="active">Ativa</option>
                          <option value="inactive">Inativa</option>
                        </select>
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Imagem da Empresa</label>
                        <div className="flex gap-4 items-center">
                          <label className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center space-x-2 cursor-pointer">
                            <Plus size={16} />
                            <span>Upload Arquivo</span>
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'business_category')} />
                          </label>
                          {busCatImageUrl && (
                            <div className="w-16 h-16 rounded-2xl overflow-hidden border border-white/10 flex-shrink-0">
                              <img src={busCatImageUrl} className="w-full h-full object-cover" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <button type="submit" className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-blue-700 transition-all">
                        {editingBusinessCategory ? 'Salvar Alterações' : 'Criar Empresa'}
                      </button>
                      <button type="button" onClick={() => { setIsAddingBusinessCategory(false); setEditingBusinessCategory(null); }} className="px-8 bg-white/5 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs">
                        Cancelar
                      </button>
                    </div>
                  </form>
                )}

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {businessCategories.slice(0, businessCategoriesLimit).map((cat, idx) => (
                    <div key={`admin-bus-cat-${cat.id}-${idx}`} className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden group hover:border-blue-500/30 transition-all">
                      <div className="h-32 relative">
                        {cat.imageUrl ? (
                          <img src={cat.imageUrl || undefined} alt={cat.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-white/5 flex items-center justify-center">
                            <Store size={32} className="text-white/20" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity space-x-2">
                          <button 
                            onClick={() => {
                              setEditingBusinessCategory(cat);
                              setBusCatName(cat.name);
                              setBusCatImageUrl(cat.imageUrl || '');
                              setBusCatStatus(cat.status || 'active');
                            }}
                            className="p-3 bg-white text-[#141414] rounded-xl"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button onClick={() => deleteBusinessCategory(cat.id)} className="p-3 bg-red-500 text-white rounded-xl">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                      <div className="p-4 text-center">
                        <h4 className="font-bold uppercase tracking-tight text-sm">{cat.name}</h4>
                        <span className={`text-[8px] font-black uppercase tracking-widest ${cat.status === 'active' ? 'text-green-400' : 'text-red-400'}`}>
                          {cat.status || 'active'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {businessCategories.length > businessCategoriesLimit && (
                  <div className="flex justify-center pt-8">
                    <button 
                      onClick={() => setBusinessCategoriesLimit(prev => prev + 3)}
                      className="px-8 py-3 bg-white/5 border border-white/10 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2"
                    >
                      <Plus size={16} />
                      Ver Mais Empresas
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4">
                  {restaurants.map((res, idx) => (
                    <div key={`res-list-2-${res.id}-${idx}`} className="bg-white/5 border border-white/10 p-6 rounded-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 group hover:bg-white/10 transition-all">
                      <div className="flex items-center space-x-4">
                        {res.imageUrl && (
                          <div className="w-16 h-16 rounded-2xl overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center">
                            <img src={res.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                        )}
                        <div className="space-y-1">
                          <h3 className="text-xl font-bold uppercase tracking-tight italic">{res.name}</h3>
                          <p className="text-[10px] font-mono opacity-40">ID: {res.id}</p>
                          {res.city && <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">{res.city}</p>}
                        </div>
                      </div>

                      <div className="flex items-center space-x-4 w-full lg:w-auto justify-between lg:justify-end">
                        <button 
                          onClick={() => toggleRestaurantStatus(res.id, res.status)}
                          className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${res.status === 'active' ? 'bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white' : 'bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white'}`}
                        >
                          {res.status}
                        </button>
                        {res.isWalletBlocked && (
                          <span className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                            <AlertCircle size={10} />
                            Bloqueado (Saldo)
                          </span>
                        )}
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => {
                              setActiveTab('restaurants');
                              setSelectedRestaurantForMenu(res);
                              setIsMenuModalOpen(true);
                            }}
                            className="p-3 bg-white/5 hover:bg-emerald-500 hover:text-white rounded-full transition-all"
                            title="Gerenciar Cardápio"
                          >
                            <Utensils size={20} />
                          </button>
                          <button 
                            onClick={() => {
                              setActiveTab('restaurants');
                              startEditingRestaurant(res);
                            }} 
                            className="p-3 hover:bg-blue-500 hover:text-white rounded-full transition-all"
                          >
                            <Edit2 size={20} />
                          </button>
                          <button onClick={() => handleDeleteRestaurant(res)} className="p-3 hover:bg-red-500 hover:text-white rounded-full transition-all">
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter italic">Gestão de Usuários</h2>
              <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                <button 
                  onClick={() => setIsNotificationModalOpen(true)}
                  className="p-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
                  title="Enviar Notificação Push"
                >
                  <Bell size={20} />
                  <span className="text-[10px] font-black uppercase tracking-widest md:hidden">Notificação</span>
                </button>
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text"
                    placeholder="Pesquisar por nome, email ou CPF..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-xs font-bold uppercase tracking-tight focus:border-blue-500/50 transition-all"
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex items-center space-x-2 bg-white/5 p-1 rounded-2xl border border-white/10">
                  <button 
                    onClick={() => setUserSortBy('recent')}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${userSortBy === 'recent' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-white/5 opacity-60'}`}
                  >
                    Recentes
                  </button>
                  <button 
                    onClick={() => setUserSortBy('orders')}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${userSortBy === 'orders' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-white/5 opacity-60'}`}
                  >
                    Mais Pedidos
                  </button>
                  <button 
                    onClick={() => setUserSortBy('sales')}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${userSortBy === 'sales' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-white/5 opacity-60'}`}
                  >
                    Mais Vendas
                  </button>
                </div>
                <div className="flex items-center space-x-2">
                  <input 
                    type="date" 
                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest focus:ring-0"
                    onChange={(e) => setUserStartDate(e.target.value)}
                  />
                  <span className="text-[10px] opacity-40">até</span>
                  <input 
                    type="date" 
                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest focus:ring-0"
                    onChange={(e) => setUserEndDate(e.target.value)}
                  />
                </div>
                <button 
                  onClick={() => setShowUserMap(!showUserMap)}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-xl text-xs font-bold transition-all ${
                    showUserMap 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                      : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <MapPin size={16} />
                  <span>{showUserMap ? 'Fechar Mapa' : 'Abrir Mapa'}</span>
                </button>
              </div>
            </div>

            <AnimatePresence>
              {showUserMap && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <MapSection 
                    title="Usuários"
                    items={filteredUsers.map(u => ({ 
                      id: u.uid, 
                      name: u.displayName || 'Usuário', 
                      phone: u.phone || u.whatsapp,
                      lat: u.latitude || 0, 
                      lng: u.longitude || 0, 
                      type: 'user' 
                    }))} 
                  />
                </motion.div>
              )}
            </AnimatePresence>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedUsers.map((u, idx) => (
                <div key={`${u.uid}-${idx}`} className="bg-white/5 p-6 rounded-[2rem] border border-white/10 space-y-4 hover:border-blue-500/30 transition-all group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center font-black overflow-hidden">
                        <img 
                          src={u.photoURL || `https://ui-avatars.com/api/?name=${u.displayName || 'NOME'}&background=2563eb&color=fff`} 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer" 
                        />
                      </div>
                      <div>
                        <h3 className="font-bold">{u.displayName}</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-40">{u.role}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">{u.orderCount || 0} Pedidos</p>
                      {u.role === 'manager' && (
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">{formatPrice(u.totalSales || 0)}</p>
                      )}
                      <div className="flex flex-col items-end gap-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">
                          Carteira: {formatPrice(wallets.find(w => w.ownerUid === u.uid)?.balance || 0)}
                        </p>
                        {(u.role === 'courier' || u.role === 'manager') && (
                          <button
                            onClick={() => setShowAutoCreditConfirm({ uid: u.uid, name: u.displayName || u.email, branchId: u.branchId })}
                            className="px-3 py-1 bg-blue-600/20 text-blue-400 text-[8px] font-black uppercase tracking-widest rounded-lg border border-blue-500/30 hover:bg-blue-600 hover:text-white transition-all"
                          >
                            Add Auto (10)
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs opacity-60 flex items-center space-x-2">
                      <Mail size={12} className="text-blue-400" />
                      <span className="font-bold">{u.email}</span>
                      <span className="text-white/20">|</span>
                      <Lock size={12} className="text-amber-400" />
                      <span className="font-mono text-amber-200">{u.password || '---'}</span>
                    </p>
                    {u.cpf && (
                      <p className="text-xs opacity-60 flex items-center space-x-2">
                        <CreditCard size={12} />
                        <span>CPF: {u.cpf}</span>
                      </p>
                    )}
                    {u.referencePoint && (
                      <p className="text-xs opacity-60 flex items-center space-x-2">
                        <MapPin size={12} />
                        <span>Ref: {u.referencePoint}</span>
                      </p>
                    )}
                  </div>
                  
                  {/* Order History Preview */}
                  <div className="pt-2 space-y-2">
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Últimos Pedidos</p>
                    <div className="space-y-1">
                      {(Array.from(new Map(allOrders.filter(o => o.customerUid === u.uid).slice(0, 3).map(o => [o.id, o])).values()) as Order[]).map((order, idx) => (
                        <div key={`admin-user-recent-order-${u.uid}-${order.id}-${idx}`} className="flex items-center justify-between text-[10px] bg-white/5 p-2 rounded-lg border border-white/5">
                          <span className="opacity-60">#{order.id.slice(-6)}</span>
                          <span className="font-bold">{formatPrice(order.total)}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                            order.status === 'delivered' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                      ))}
                      {allOrders.filter(o => o.customerUid === u.uid).length === 0 && (
                        <p className="text-[10px] opacity-20 italic">Nenhum pedido realizado</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 pt-4">
                    <button 
                      onClick={() => {
                        setEditingUser(u);
                        setEditUserName(u.displayName || '');
                        setEditUserEmail(u.email || '');
                        setEditUserCpf(u.cpf || '');
                      }}
                      className="flex-1 bg-white/5 hover:bg-blue-600 text-[10px] font-black uppercase tracking-widest py-3 rounded-xl transition-all"
                    >
                      Editar
                    </button>
                    <button 
                      onClick={() => {
                        if (window.confirm('Tem certeza que deseja excluir este usuário?')) {
                          deleteDoc(doc(db, 'users', u.uid));
                        }
                      }}
                      className="p-3 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {filteredUsers.length > usersLimit && (
              <div className="flex justify-center pt-8">
                <button 
                  onClick={() => setUsersLimit(prev => prev + 3)}
                  className="px-8 py-3 bg-white/5 border border-white/10 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2"
                >
                  <Plus size={16} />
                  Ver Mais Usuários
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'realtime_cities' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-4xl font-black uppercase tracking-tighter italic text-white">Cidades em Tempo Real</h2>
                <p className="text-slate-400 font-medium uppercase text-[10px] tracking-widest">Acompanhamento do que está sendo exibido em cada cidade</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* City List */}
              <div className="lg:col-span-1 space-y-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Selecione uma Cidade</h3>
                <div className="space-y-2">
                  {uniqueCities.map((city, idx) => (
                    <button
                      key={`realtime-city-btn-${city.id}-${idx}`}
                      onClick={() => setSelectedRealTimeCity(city)}
                      className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between group ${
                        selectedRealTimeCity?.id === city.id 
                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20' 
                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Globe size={18} className={selectedRealTimeCity?.id === city.id ? 'text-white' : 'text-blue-400'} />
                        <span className="font-bold uppercase tracking-tight text-xs">{city.name}</span>
                      </div>
                      <ChevronRight size={16} className={`transition-transform ${selectedRealTimeCity?.id === city.id ? 'translate-x-1' : 'opacity-0 group-hover:opacity-100'}`} />
                    </button>
                  ))}
                </div>
              </div>

              {/* City Preview */}
              <div className="lg:col-span-3 space-y-8">
                {selectedRealTimeCity ? (
                  <div className="space-y-8">
                    <div className="flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-3xl">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500/20 rounded-2xl text-blue-400">
                          <Globe size={24} />
                        </div>
                        <div>
                          <h3 className="text-2xl font-black uppercase tracking-tight italic text-white">{selectedRealTimeCity.name}</h3>
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Configurações Ativas</p>
                        </div>
                      </div>

                      <div className="hidden md:block w-48 h-16 rounded-xl overflow-hidden border border-white/10">
                        <CitySatelliteMap lat={selectedRealTimeCity.lat || null} lng={selectedRealTimeCity.lng || null} height="100%" zoom={12} />
                      </div>

                      <button 
                        onClick={() => {
                          setActiveTab('cities');
                          startEditingCity(selectedRealTimeCity);
                        }}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                      >
                        <Edit2 size={16} />
                        <span>Editar Configurações</span>
                      </button>
                    </div>

                    {/* Active Banners */}
                    <section className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Banners Ativos</h3>
                        <span className="bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                          {banners.filter(b => b.city === selectedRealTimeCity.name && b.status === 'active').length} Banners
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {banners.filter(b => b.city === selectedRealTimeCity.name && b.status === 'active').map(banner => (
                          <div key={banner.id} className="relative aspect-[21/9] rounded-2xl overflow-hidden border border-white/10">
                            <img src={banner.imageUrl} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                              <p className="text-xs font-bold text-white uppercase tracking-tight">{banner.name}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* Active Category Schedules */}
                    <section className="space-y-4">
                      <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Horários de Categorias (Agora)</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {categorySchedules.filter(s => {
                          if (!s.active) return false;
                          const now = new Date();
                          const currentTotalSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
                          const parseTime = (t: string) => {
                            const [h, m, s] = t.split(':').map(Number);
                            return h * 3600 + (m || 0) * 60 + (s || 0);
                          };
                          const start = parseTime(s.startTime);
                          const end = parseTime(s.endTime);
                          if (start <= end) return currentTotalSeconds >= start && currentTotalSeconds <= end;
                          return currentTotalSeconds >= start || currentTotalSeconds <= end;
                        }).map(schedule => (
                          <div key={schedule.id} className="bg-blue-600/10 border border-blue-500/20 p-4 rounded-2xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Clock className="text-blue-400" size={18} />
                              <div>
                                <p className="text-xs font-black uppercase tracking-tight text-white">{schedule.name}</p>
                                <p className="text-[10px] font-bold text-blue-400">{schedule.startTime} - {schedule.endTime}</p>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              {Array.from(new Set(schedule.categoryIds || [])).map(catId => (
                                <span key={catId} className="bg-blue-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                                  {categories.find(c => c.id === catId)?.name || 'Cat'}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* Active Products */}
                    <section className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Produtos em Destaque</h3>
                        <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                          {allProducts.filter(p => {
                            const res = restaurants.find(r => r.id === p.restaurantId);
                            return res?.city === selectedRealTimeCity.name && res?.status === 'active';
                          }).length} Produtos
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {(Array.from(new Map(allProducts.filter(p => {
                          const res = restaurants.find(r => r.id === p.restaurantId);
                          return res?.city === selectedRealTimeCity.name && res?.status === 'active';
                        }).slice(0, 12).map(p => [p.id, p])).values()) as FoodItem[]).map((product, idx) => (
                          <div key={`${product.id}-${idx}`} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden group hover:border-blue-500/30 transition-all">
                            <div className="aspect-square relative">
                              <img src={product.imageUrl} className="w-full h-full object-cover" />
                              {product.promoPrice && (
                                <div className="absolute top-2 left-2 bg-emerald-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                                  Promo
                                </div>
                              )}
                            </div>
                            <div className="p-3 space-y-1">
                              <p className="text-[10px] font-black uppercase tracking-tight italic truncate text-white">{product.name}</p>
                              <p className="text-[8px] font-bold text-slate-500 uppercase truncate">
                                {restaurants.find(r => r.id === product.restaurantId)?.name}
                              </p>
                              <p className="text-xs font-black text-emerald-400">
                                {formatPrice(product.promoPrice || product.price)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                ) : (
                  <div className="h-[60vh] flex flex-col items-center justify-center text-center space-y-4 bg-white/5 rounded-[3rem] border-2 border-dashed border-white/10">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center text-slate-500">
                      <Globe size={40} />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-xl font-black uppercase tracking-tight italic text-white">Nenhuma cidade selecionada</h4>
                      <p className="text-sm text-slate-500 max-w-xs mx-auto">
                        Selecione uma cidade na lista ao lado para visualizar o que está sendo exibido em tempo real.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'cities' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter italic">API Cidades</h2>
              <button 
                onClick={() => {
                  setIsAddingCity(true);
                  setEditingCity(null);
                  setCityName(JURUTI_TEMPLATE.name);
                  setCityApiUrl(JURUTI_TEMPLATE.apiUrl);
                  setCityApiKey(JURUTI_TEMPLATE.apiKey);
                  setCityAuthEmail(JURUTI_TEMPLATE.authEmail);
                  setCityAuthPassword(JURUTI_TEMPLATE.authPassword);
                  setCityLat(JURUTI_TEMPLATE.lat);
                  setCityLng(JURUTI_TEMPLATE.lng);
                  setCityConnectionStatus('idle');
                  setCityConnectionError(null);
                  lastTestedRef.current = `${JURUTI_TEMPLATE.name}-${JURUTI_TEMPLATE.apiUrl}`;
                }}
                className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all"
              >
                <Plus size={16} />
                <span>Adicionar Cidade</span>
              </button>
            </div>

            {isAddingCity && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 border border-white/10 p-5 md:p-8 rounded-[2rem] md:rounded-[2.5rem] space-y-6 md:space-y-8 max-w-3xl"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black uppercase tracking-tight italic">
                    {editingCity ? 'Editar Configuração' : 'Nova Configuração de Cidade'}
                  </h3>
                  <button onClick={() => setIsAddingCity(false)} className="p-2 hover:bg-white/5 rounded-full">
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSaveCity} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Nome da Cidade</label>
                        <div className="relative">
                          <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                          <input 
                            required
                            type="text" 
                            value={cityName}
                            onChange={e => setCityName(e.target.value)}
                            placeholder="Ex: São Paulo"
                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 text-sm focus:ring-2 focus:ring-blue-500/50"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => searchCityCoordinates(cityName)}
                        disabled={isSearchingCity || !cityName}
                        className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                      >
                        {isSearchingCity ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
                        Buscar Coordenadas da Cidade
                      </button>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40">URL Base da API</label>
                      <div className="relative">
                        <Link className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input 
                          required
                          type="url" 
                          value={cityApiUrl}
                          onChange={e => setCityApiUrl(e.target.value)}
                          placeholder="https://api.cidade.com/v1"
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 text-sm focus:ring-2 focus:ring-blue-500/50"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40">API KEY</label>
                      <div className="relative">
                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input 
                          type="text" 
                          value={cityApiKey}
                          onChange={e => setCityApiKey(e.target.value)}
                          placeholder="Sua chave de API"
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 text-sm focus:ring-2 focus:ring-blue-500/50"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40">AUTH USER (Email)</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input 
                          type="email" 
                          value={cityAuthEmail}
                          onChange={e => setCityAuthEmail(e.target.value)}
                          placeholder="email@api.com"
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 text-sm focus:ring-2 focus:ring-blue-500/50"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40">AUTH Password</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input 
                          type="text" 
                          value={cityAuthPassword}
                          onChange={e => setCityAuthPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 text-sm focus:ring-2 focus:ring-blue-500/50"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/5 p-6 rounded-3xl space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-500/20 rounded-xl text-blue-400">
                          <Navigation size={18} />
                        </div>
                        <h4 className="text-sm font-black uppercase tracking-tight italic">Coordenadas da Cidade (Opcional)</h4>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Latitude</label>
                        <input 
                          type="number" 
                          step="any"
                          value={cityLat || ''}
                          onChange={e => setCityLat(e.target.value ? parseFloat(e.target.value) : null)}
                          placeholder="Ex: -23.5505"
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Longitude</label>
                        <input 
                          type="number" 
                          step="any"
                          value={cityLng || ''}
                          onChange={e => setCityLng(e.target.value ? parseFloat(e.target.value) : null)}
                          placeholder="Ex: -46.6333"
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500/50"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Localização Satélite (Tempo Real)</label>
                      <CitySatelliteMap lat={cityLat} lng={cityLng} height="300px" zoom={15} />
                    </div>
                  </div>

                  <div className="pt-4 flex flex-col md:flex-row gap-4">
                    <button 
                      type="button"
                      onClick={() => testCityConnection({ 
                        id: editingCity?.id || 'temp', 
                        name: cityName,
                        apiUrl: cityApiUrl,
                        apiKey: cityApiKey,
                        authEmail: cityAuthEmail,
                        authPassword: cityAuthPassword,
                        lat: cityLat,
                        lng: cityLng
                      } as any)}
                      disabled={isTestingConnection}
                      className={`w-full md:flex-1 border py-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center space-x-2 ${
                        cityConnectionStatus === 'success' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' :
                        cityConnectionStatus === 'error' ? 'bg-red-500/10 border-red-500/50 text-red-400' :
                        'bg-white/5 border-white/10 hover:bg-white/10 text-white'
                      }`}
                    >
                      {isTestingConnection ? (
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full" />
                      ) : cityConnectionStatus === 'success' ? (
                        <CheckCircle size={16} />
                      ) : cityConnectionStatus === 'error' ? (
                        <XCircle size={16} />
                      ) : (
                        <Navigation size={16} />
                      )}
                      <span>{
                        cityConnectionStatus === 'success' ? 'Conexão OK' :
                        cityConnectionStatus === 'error' ? 'Erro na Conexão' :
                        'Testar Conexão'
                      }</span>
                    </button>
                    <button 
                      type="submit"
                      className="w-full md:flex-1 bg-blue-600 text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center space-x-2"
                    >
                      <Save size={16} />
                      <span>{editingCity ? 'Salvar Alterações' : 'Criar Cidade'}</span>
                    </button>
                    <button 
                      type="button"
                      onClick={() => setIsAddingCity(false)}
                      className="w-full md:w-auto md:px-8 bg-white/5 border border-white/10 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
                    >
                      Cancelar
                    </button>
                  </div>

                  {/* Connection Status Indicator */}
                  <AnimatePresence>
                    {cityConnectionStatus !== 'idle' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className={`p-4 rounded-2xl border ${
                          cityConnectionStatus === 'testing' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                          cityConnectionStatus === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                          'bg-red-500/10 border-red-500/20 text-red-400'
                        } flex items-center space-x-3`}
                      >
                        <div className={`w-3 h-3 rounded-full ${
                          cityConnectionStatus === 'testing' ? 'bg-blue-500' :
                          cityConnectionStatus === 'success' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' :
                          'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                        }`} />
                        <div className="flex-1">
                          <p className="text-[10px] font-black uppercase tracking-widest">
                            {cityConnectionStatus === 'testing' ? 'Testando conexão...' :
                             cityConnectionStatus === 'success' ? 'Conexão estabelecida com sucesso!' :
                             'Erro na conexão'}
                          </p>
                          {cityConnectionError && (
                            <p className="text-[10px] font-medium opacity-80 mt-1">{cityConnectionError}</p>
                          )}
                        </div>
                        {cityConnectionStatus === 'success' && <CheckCircle size={16} />}
                        {cityConnectionStatus === 'error' && <XCircle size={16} />}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </form>



              </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {uniqueCities.map((city, idx) => (
                <motion.div 
                  key={`city-card-copy-${city.id}-${idx}`}
                  layout
                  className="bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden group hover:border-blue-500/50 transition-all flex flex-col"
                >
                  {/* City Map Header */}
                  <div className="h-48 relative overflow-hidden">
                    <CitySatelliteMap lat={city.lat || null} lng={city.lng || null} height="100%" zoom={14} />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                    <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between">
                      <div>
                        <h3 className="font-black uppercase tracking-tight italic text-white text-xl drop-shadow-lg">{city.name}</h3>
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${
                            testingCityId === city.id ? 'bg-blue-500 animate-pulse' :
                            city.status === 'online' ? 'bg-green-500' : 'bg-red-500'
                          }`} />
                          <span className="text-[10px] font-black uppercase tracking-widest opacity-80 text-white drop-shadow-md">
                            {testingCityId === city.id ? 'Testando...' : city.status}
                          </span>
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <button 
                          onClick={() => handleToggleIntegration(city)}
                          className={`p-2.5 rounded-xl transition-all backdrop-blur-md border border-white/20 shadow-lg flex items-center justify-center ${
                            city.integrationActive 
                              ? 'bg-emerald-500 text-white border-emerald-400' 
                              : 'bg-white/10 text-slate-400 hover:bg-emerald-500/20 hover:text-emerald-400'
                          }`}
                          title={city.integrationActive ? "Integração Ativa" : "Ativar Integração"}
                        >
                          <Zap size={18} fill={city.integrationActive ? "currentColor" : "none"} />
                        </button>
                        <button 
                          onClick={() => startEditingCity(city)}
                          className="p-2.5 bg-blue-500/30 hover:bg-blue-500/50 text-blue-400 rounded-xl transition-all backdrop-blur-md border border-white/20 shadow-lg"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeleteCity(city.id)}
                          className="p-2.5 bg-red-500/30 hover:bg-red-500/50 text-red-400 rounded-xl transition-all backdrop-blur-md border border-white/20 shadow-lg"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-6 flex-1">
                    <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                      <div className="flex items-center space-x-2 text-slate-400">
                        <Link size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">API URL</span>
                      </div>
                      <span className="text-[10px] font-mono opacity-60 truncate max-w-[150px]">{city.apiUrl}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                      <div className="flex items-center space-x-2 text-slate-400">
                        <Mail size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Auth User</span>
                      </div>
                      <span className="text-[10px] font-mono opacity-60">{city.authEmail}</span>
                    </div>

                    {city.categories && city.categories.length > 0 && (
                      <div className="p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10 space-y-2">
                        <div className="flex items-center space-x-2 text-emerald-400">
                          <Package size={12} />
                          <span className="text-[9px] font-black uppercase tracking-widest">Categorias Puladas</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {city.categories.map((cat, cIdx) => (
                            <span 
                              key={`city-cat-${city.id}-${cIdx}`}
                              className="text-[8px] font-black uppercase tracking-widest px-2 py-1 bg-emerald-500/10 text-emerald-300 rounded-lg border border-emerald-500/10"
                            >
                              {cat.nome}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-slate-500">
                      <AlertCircle size={12} />
                      <span className="text-[8px] font-black uppercase tracking-widest">Último Check: {city.lastChecked ? new Date(city.lastChecked).toLocaleString() : 'Nunca'}</span>
                    </div>
                    <button 
                      onClick={() => testCityConnection(city)}
                      disabled={isTestingConnection}
                      className="text-[10px] font-black uppercase tracking-widest text-blue-400 hover:text-blue-300 transition-colors flex items-center space-x-1"
                    >
                      {testingCityId === city.id ? (
                        <RefreshCw size={10} />
                      ) : null}
                      <span>Testar Agora</span>
                    </button>
                  </div>
                  
                  <button 
                    onClick={() => {
                      setTargetCityForLinking(city);
                      setIsLinkingModalOpen(true);
                    }}
                    className="w-full mt-4 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-white/10 hover:text-white transition-all flex items-center justify-center space-x-2"
                  >
                    <Share2 size={12} />
                    <span>Selecionar Cidade (Puxar Config.)</span>
                  </button>
                </div>
              </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Credit Management Modal */}
        <AnimatePresence>
          {isCreditModalOpen && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-slate-900 border border-white/10 w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl"
              >
                <div className="p-8 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-blue-600/20 to-transparent">
                  <div className="flex items-center space-x-3">
                    <div className={`p-3 rounded-2xl ${creditAction === 'add' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {creditAction === 'add' ? <Plus size={24} /> : <Trash2 size={24} />}
                    </div>
                    <div>
                      <h3 className="text-xl font-black uppercase tracking-tight italic">
                        {creditAction === 'add' ? 'Adicionar Crédito' : 'Retirar Crédito'}
                      </h3>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-40">{selectedRestaurantForCredit?.name}</p>
                    </div>
                  </div>
                  <button onClick={() => setIsCreditModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                    <X size={24} />
                  </button>
                </div>

                <div className="p-8 space-y-6">
                  {isProcessingCredit ? (
                    <div className="py-12 flex flex-col items-center justify-center space-y-4">
                      <Loader2 text-blue-500 size={48} />
                      <p className="text-xs font-black uppercase tracking-widest">Processando Transação...</p>
                    </div>
                  ) : creditMessage ? (
                    <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
                      <div className={`p-4 rounded-full ${creditMessage.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {creditMessage.type === 'success' ? <CheckCircle size={48} /> : <AlertCircle size={48} />}
                      </div>
                      <p className="text-sm font-black uppercase tracking-widest">{creditMessage.text}</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Valor do Crédito (R$)</label>
                        <div className="relative">
                          <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                          <input 
                            required
                            type="number" 
                            step="0.01"
                            value={creditAmount}
                            onChange={e => setCreditAmount(e.target.value)}
                            placeholder="0,00"
                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 text-lg font-black focus:ring-2 focus:ring-blue-500/50 transition-all"
                            autoFocus
                          />
                        </div>
                      </div>

                      <div className="pt-4 flex space-x-4">
                        <button 
                          onClick={() => setIsCreditModalOpen(false)}
                          className="flex-1 bg-white/5 border border-white/10 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
                        >
                          Cancelar
                        </button>
                        <button 
                          onClick={handleCreditAction}
                          className={`flex-1 text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg transition-all flex items-center justify-center space-x-2 ${
                            creditAction === 'add' 
                              ? 'bg-green-600 shadow-green-500/20 hover:bg-green-700' 
                              : 'bg-red-600 shadow-red-500/20 hover:bg-red-700'
                          }`}
                        >
                          <Save size={16} />
                          <span>Confirmar {creditAction === 'add' ? 'Adição' : 'Retirada'}</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* City Linking Modal */}
        <AnimatePresence>
          {isLinkingModalOpen && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-slate-900 border border-white/10 w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl"
              >
                <div className="p-8 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-emerald-600/20 to-transparent">
                  <div className="flex items-center space-x-3 text-white">
                    <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400">
                      <Database size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black uppercase tracking-tight italic">Replicação de Configurações</h3>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Transferindo para {targetCityForLinking?.name}</p>
                    </div>
                  </div>
                  <button onClick={() => setIsLinkingModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors text-white">
                    <X size={24} />
                  </button>
                </div>

                <div className="p-8 max-h-[60vh] overflow-y-auto space-y-3">
                  <p className="text-[10px] font-bold text-white/60 mb-4 uppercase tracking-widest">Escolha uma cidade Online para copiar:</p>
                  {cities.filter(c => c.status === 'online' && c.id !== targetCityForLinking?.id).length === 0 ? (
                    <div className="py-8 text-center opacity-40 italic text-xs text-white">Nenhuma cidade online disponível.</div>
                  ) : (
                    cities
                      .filter(c => c.status === 'online' && c.id !== targetCityForLinking?.id)
                      .map((sourceCity, sIdx) => {
                        const sourceCategories = sourceCity.categories || [];
                        return (
                          <button
                            key={`link-city-${sourceCity.id}-${sIdx}`}
                            onClick={() => handleLinkCity(sourceCity)}
                            className="w-full p-5 bg-white/5 border border-white/10 rounded-3xl flex flex-col gap-3 group hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all text-white"
                          >
                            <div className="w-full flex items-center justify-between">
                              <div className="text-left">
                                <p className="font-bold text-sm uppercase tracking-tight italic">{sourceCity.name}</p>
                                <p className="text-[8px] font-black uppercase tracking-widest opacity-40 truncate max-w-[200px]">{sourceCity.apiUrl}</p>
                              </div>
                              <div className="bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] w-2.5 h-2.5 rounded-full" />
                            </div>

                            {sourceCategories.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 border-t border-white/5 pt-3">
                                {sourceCategories.slice(0, 8).map((cat, cIdx) => (
                                  <span key={`source-cat-${sourceCity.id}-${cIdx}`} className="text-[7px] font-black uppercase tracking-widest px-2 py-0.5 bg-white/5 rounded-md opacity-60">
                                    {cat.nome}
                                  </span>
                                ))}
                                {sourceCategories.length > 8 && (
                                  <span className="text-[7px] font-black uppercase tracking-widest px-2 py-0.5 bg-white/5 rounded-md opacity-30">
                                    +{sourceCategories.length - 8}
                                  </span>
                                )}
                              </div>
                            )}
                          </button>
                        );
                      })
                  )}
                </div>
                
                <div className="p-8 bg-slate-950/50 border-t border-white/5">
                  <button 
                    onClick={() => setIsLinkingModalOpen(false)}
                    className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all text-white"
                  >
                    Fechar
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <GalleryModal 
          isOpen={isGalleryOpen} 
          onClose={() => setIsGalleryOpen(false)} 
          onSelect={handleGallerySelect} 
        />

        {activeTab === 'live_view' && (
          <div className="fixed inset-0 z-[100] bg-slate-950">
            <LiveAppControl 
              cities={cities} 
              onClose={() => setActiveTab('analytics')} 
              adminUid={user?.uid || ''}
            />
          </div>
        )}

        <AnimatePresence>
          {editingUser && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-slate-900 border border-white/10 w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl"
              >
                <div className="p-8 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-blue-600/20 to-transparent">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-blue-500/20 rounded-2xl text-blue-400">
                      <Users size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black uppercase tracking-tight italic">Editar Usuário</h3>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-40">ID: {editingUser.uid}</p>
                    </div>
                  </div>
                  <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleEditUser} className="p-8 space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Nome Completo</label>
                      <div className="relative">
                        <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input 
                          required
                          type="text" 
                          value={editUserName}
                          onChange={e => setEditUserName(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 text-sm focus:ring-2 focus:ring-blue-500/50 transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input 
                          required
                          type="email" 
                          value={editUserEmail}
                          onChange={e => setEditUserEmail(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 text-sm focus:ring-2 focus:ring-blue-500/50 transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Senha Atual (Firestore)</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input 
                          readOnly
                          type="text" 
                          value={(editingUser as any).password || 'N/A'}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 text-sm opacity-60 cursor-not-allowed font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Nova Senha (Opcional)</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input 
                          type="password" 
                          value={editUserPassword}
                          onChange={e => setEditUserPassword(e.target.value)}
                          placeholder="Deixe em branco para não alterar"
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 text-sm focus:ring-2 focus:ring-blue-500/50 transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40">CPF</label>
                      <div className="relative">
                        <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input 
                          type="text" 
                          value={editUserCpf}
                          onChange={e => setEditUserCpf(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 text-sm focus:ring-2 focus:ring-blue-500/50 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex space-x-4">
                    <button 
                      type="button"
                      onClick={() => setEditingUser(null)}
                      className="flex-1 bg-white/5 border border-white/10 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center space-x-2"
                    >
                      <Save size={16} />
                      <span>Salvar Alterações</span>
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        {/* Partner Detail View Modal */}
      <AnimatePresence>
        {isPartnerViewOpen && selectedPartner && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 30 }}
              className="bg-slate-900 border border-white/10 w-full max-w-7xl max-h-[95vh] overflow-hidden rounded-[4rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col relative"
            >
              {/* Decorative background elements */}
              <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
              <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />

              {/* Header */}
              <div className="p-10 border-b border-white/10 flex items-center justify-between bg-white/5 backdrop-blur-md relative z-10">
                <div className="flex items-center space-x-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-800 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-blue-500/30">
                    <Handshake size={36} />
                  </div>
                  <div>
                    <div className="flex items-center space-x-3 mb-1">
                      <h2 className="text-3xl font-black uppercase tracking-tighter italic leading-none">{selectedPartner.name}</h2>
                      <div className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-[8px] font-black uppercase tracking-widest border border-blue-500/20">
                        Parceiro Regional
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 text-blue-400/60">
                      <MapPin size={14} />
                      <p className="text-xs font-black uppercase tracking-widest">{selectedPartner.cityName}</p>
                    </div>
                  </div>
                </div>

                {/* Tab Switcher */}
                <div className="flex bg-black/40 p-1.5 rounded-[2rem] border border-white/5">
                  <button 
                    onClick={() => {
                      setPartnerViewTab('stats');
                      setSelectedRestaurantInPartnerView(null);
                    }}
                    className={`px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all flex items-center space-x-2 ${partnerViewTab === 'stats' ? 'bg-blue-600 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                  >
                    <TrendingUp size={14} />
                    <span>Performance</span>
                  </button>
                  <button 
                    onClick={() => {
                      setPartnerViewTab('restaurants');
                      setSelectedRestaurantInPartnerView(null);
                    }}
                    className={`px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all flex items-center space-x-2 ${partnerViewTab === 'restaurants' ? 'bg-blue-600 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                  >
                    <Store size={14} />
                    <span>Restaurantes</span>
                  </button>
                </div>

                <div className="flex items-center space-x-4">
                  {/* Password Field */}
                  <div className="relative group/pass">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400" size={14} />
                    <input 
                      type="text"
                      defaultValue={selectedPartner.password}
                      onBlur={async (e) => {
                        const newPass = e.target.value;
                        if (newPass === selectedPartner.password) return;
                        try {
                          await updateDoc(doc(db, 'branches', selectedPartner.id), { password: newPass });
                        } catch (error) {
                          handleFirestoreError(error, OperationType.UPDATE, `branches/${selectedPartner.id}`);
                        }
                      }}
                      className="bg-white/5 border border-white/10 rounded-2xl py-3 pl-10 pr-4 text-[10px] font-black uppercase tracking-widest focus:border-blue-500/50 transition-all w-40"
                      placeholder="Senha..."
                    />
                  </div>
                  <button 
                    onClick={() => {
                      const link = `${window.location.origin}/branch/${selectedPartner.id}`;
                      navigator.clipboard.writeText(link);
                      setCopiedPartnerId(selectedPartner.id);
                      setTimeout(() => setCopiedPartnerId(null), 2000);
                    }}
                    className="flex items-center space-x-3 px-6 py-4 bg-white/5 hover:bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all group/share"
                  >
                    {copiedPartnerId === selectedPartner.id ? <Check size={16} /> : <Link size={16} className="group-hover/share:rotate-45 transition-transform" />}
                    <span>{copiedPartnerId === selectedPartner.id ? 'Copiado!' : 'Compartilhar Link'}</span>
                  </button>
                  <button 
                    onClick={() => setIsPartnerViewOpen(false)}
                    className="p-5 hover:bg-white/10 rounded-[1.5rem] transition-all text-white/40 hover:text-white"
                  >
                    <X size={28} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-10 space-y-10 no-scrollbar relative z-10">
                {(() => {
                  const branchRestaurants = restaurants.filter(r => r.city === selectedPartner.cityName || r.branchId === selectedPartner.id);
                  const branchRestaurantIds = branchRestaurants.map(r => r.id);
                  
                  const filteredOrders = allOrders.filter(o => {
                    if (!branchRestaurantIds.includes(o.restaurantId) || o.status !== 'completed') return false;
                    const orderDate = o.createdAt?.toDate ? o.createdAt.toDate().toISOString().split('T')[0] : '';
                    return orderDate >= appliedPartnerDateStart && orderDate <= appliedPartnerDateEnd;
                  });

                  const totalRevenue = filteredOrders.reduce((acc, o) => acc + (o.total || 0), 0);

                  // Manual vs Pix Stats
                  const branchWalletTransactions = partnerTransactions.filter(t => {
                    const matchesBranch = t.branchId === selectedPartner.id || 
                                        t.cityId === selectedPartner.cityId || 
                                        t.cityName === selectedPartner.cityName ||
                                        t.city === selectedPartner.cityName;
                    if (!matchesBranch) return false;
                    
                    const tDate = t.date || (t.timestamp?.toDate ? t.timestamp.toDate().toISOString().split('T')[0] : (t.createdAt?.toDate ? t.createdAt.toDate().toISOString().split('T')[0] : ''));
                    return tDate >= appliedPartnerDateStart && tDate <= appliedPartnerDateEnd;
                  });

                  const manualTotal = branchWalletTransactions.filter(t => t.type === 'recharge' && t.method === 'manual').reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
                  const pixTotal = branchWalletTransactions.filter(t => t.type === 'recharge' && t.method === 'pix').reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

                  // Registrations
                  const newUsers = users.filter(u => {
                    if (u.city !== selectedPartner.cityName) return false;
                    const uDate = u.createdAt?.toDate ? u.createdAt.toDate().toISOString().split('T')[0] : '';
                    return uDate >= appliedPartnerDateStart && uDate <= appliedPartnerDateEnd;
                  }).length;

                  const newRestaurants = branchRestaurants.filter(r => {
                    const rDate = r.createdAt?.toDate ? r.createdAt.toDate().toISOString().split('T')[0] : '';
                    return rDate >= appliedPartnerDateStart && rDate <= appliedPartnerDateEnd;
                  }).length;

                  const activeRestaurantsCount = branchRestaurants.filter(r => r.subscriptionStatus === 'active').length;

                  return (
                    <>
                      {/* Header with Totals */}
                      <div className="flex items-center justify-between mb-6 bg-blue-600/10 p-6 rounded-[2rem] border border-blue-500/20">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-blue-600 rounded-2xl text-white">
                            <Zap size={24} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">Total Recargas Pix</p>
                            <p className="text-2xl font-black italic text-white">R$ {pixTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          </div>
                        </div>
                        <div className="h-10 w-px bg-white/10 mx-6" />
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-orange-600 rounded-2xl text-white">
                            <Hand size={24} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-orange-400">Total Recargas Manual</p>
                            <p className="text-2xl font-black italic text-white">R$ {manualTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          </div>
                        </div>
                      </div>

                      {partnerViewTab === 'stats' ? (
                        /* Partner Stats Grid */
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                          <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] space-y-3 hover:bg-white/10 transition-all group/card">
                                  <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Restaurantes</p>
                                    <Store size={14} className="text-blue-400 opacity-40 group-hover/card:opacity-100 transition-opacity" />
                                  </div>
                                  <p className="text-4xl font-black italic">{branchRestaurants.length}</p>
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                    <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">{activeRestaurantsCount} Ativos</p>
                                  </div>
                                </div>

                                <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] space-y-3 hover:bg-white/10 transition-all group/card">
                                  <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Faturamento Período</p>
                                    <TrendingUp size={14} className="text-emerald-400 opacity-40 group-hover/card:opacity-100 transition-opacity" />
                                  </div>
                                  <p className="text-4xl font-black italic text-emerald-400">R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                  <p className="text-[10px] text-white/40 font-black uppercase tracking-widest">{filteredOrders.length} Pedidos Finalizados</p>
                                </div>

                                <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] space-y-3 hover:bg-white/10 transition-all group/card">
                                  <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Recargas Pix</p>
                                    <Zap size={14} className="text-blue-400 opacity-40 group-hover/card:opacity-100 transition-opacity" />
                                  </div>
                                  <p className="text-4xl font-black italic text-blue-400">R$ {pixTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                  <p className="text-[10px] text-white/40 font-black uppercase tracking-widest">Via Gateway Automático</p>
                                </div>

                                <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] space-y-4">
                                  <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Filtro de Período</p>
                                    <Calendar size={14} className="text-white/40" />
                                  </div>
                                  <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-2">
                                      <input 
                                        type="date" 
                                        value={partnerDateStart}
                                        onChange={e => setPartnerDateStart(e.target.value)}
                                        className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-blue-500/50 transition-all"
                                      />
                                      <input 
                                        type="date" 
                                        value={partnerDateEnd}
                                        onChange={e => setPartnerDateEnd(e.target.value)}
                                        className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-blue-500/50 transition-all"
                                      />
                                    </div>
                                    <button 
                                      onClick={() => {
                                        setAppliedPartnerDateStart(partnerDateStart);
                                        setAppliedPartnerDateEnd(partnerDateEnd);
                                      }}
                                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-lg shadow-blue-500/20"
                                    >
                                      <Search size={14} />
                                      <span>Atualizar Dados</span>
                                    </button>
                                  </div>
                                </div>

                                <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] space-y-3 hover:bg-white/10 transition-all group/card">
                                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Recargas Manuais</p>
                                  <p className="text-3xl font-black italic text-orange-400">R$ {manualTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                  <p className="text-[10px] text-white/40 font-black uppercase tracking-widest">Inserções via Painel</p>
                                </div>

                          <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] space-y-3 hover:bg-white/10 transition-all group/card">
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Novos Cadastros</p>
                            <div className="flex justify-between items-end">
                              <div>
                                <p className="text-4xl font-black italic">{newUsers + newRestaurants}</p>
                                <p className="text-[8px] opacity-40 uppercase tracking-widest">No Período</p>
                              </div>
                              <div className="text-right text-[10px] font-black uppercase tracking-widest space-y-1">
                                <p className="text-blue-400">{newUsers} Clientes</p>
                                <p className="text-emerald-400">{newRestaurants} Empresas</p>
                              </div>
                            </div>
                          </div>

                          <div className="md:col-span-2 bg-gradient-to-br from-blue-600/10 to-transparent border border-blue-500/20 p-8 rounded-[2.5rem] flex items-center justify-between group/cta">
                            <div className="space-y-2">
                              <h4 className="text-xl font-black uppercase tracking-tight italic">Relatório de Performance</h4>
                              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Exportar dados consolidados do sócio</p>
                            </div>
                            <button className="p-5 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-500/20 hover:scale-110 transition-all">
                              <Download size={24} />
                            </button>
                          </div>

                          <div className="md:col-span-4 bg-white/5 border border-white/10 p-10 rounded-[3rem] space-y-8">
                            <div className="flex items-center justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-3">
                                  <h3 className="text-2xl font-black uppercase tracking-tight italic text-blue-400">Histórico de Movimentações</h3>
                                  <div className="px-4 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full">
                                    <span className="text-xs font-black text-blue-400 italic">
                                      Total: R$ {branchWalletTransactions
                                        .filter(t => partnerTransactionFilter === 'all' || 
                                          (partnerTransactionFilter === 'manual' && t.type === 'recharge' && t.method === 'manual') ||
                                          (partnerTransactionFilter === 'recharge' && t.type === 'recharge' && t.method === 'pix')
                                        )
                                        .reduce((acc, t) => acc + (Number(t.amount) || 0), 0)
                                        .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Análise detalhada de recargas e transações</p>
                              </div>
                              <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5">
                                {['all', 'manual', 'recharge'].map((f) => (
                                  <button
                                    key={f}
                                    onClick={() => setPartnerTransactionFilter(f as any)}
                                    className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                      partnerTransactionFilter === f 
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                                        : 'text-white/40 hover:text-white'
                                    }`}
                                  >
                                    {f === 'all' ? 'Tudo' : f === 'manual' ? 'Manual' : 'Pix'}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="overflow-x-auto no-scrollbar">
                              <table className="w-full text-left border-separate border-spacing-y-3">
                                <thead>
                                  <tr className="text-[10px] font-black uppercase tracking-widest opacity-40">
                                    <th className="px-6 py-4">Data e Hora</th>
                                    <th className="px-6 py-4">Restaurante / Origem</th>
                                    <th className="px-6 py-4">Tipo de Operação</th>
                                    <th className="px-6 py-4">Método</th>
                                    <th className="px-6 py-4 text-right">Valor Bruto</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {branchWalletTransactions
                                    .filter(t => partnerTransactionFilter === 'all' || 
                                      (partnerTransactionFilter === 'manual' && t.method === 'manual') ||
                                      (partnerTransactionFilter === 'recharge' && t.method === 'pix')
                                    )
                                    .sort((a, b) => {
                                      const dateA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.date || 0);
                                      const dateB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.date || 0);
                                      return dateB.getTime() - dateA.getTime();
                                    })
                                    .slice(0, 50)
                                    .map((t, idx) => {
                                      const tDate = t.timestamp?.toDate ? t.timestamp.toDate() : new Date(t.date || 0);
                                      const restaurant = restaurants.find(r => r.id === t.restaurantId);
                                      
                                      return (
                                        <motion.tr 
                                          key={`transaction-${t.id || idx}-${idx}`}
                                          initial={{ opacity: 0, x: -10 }}
                                          animate={{ opacity: 1, x: 0 }}
                                          transition={{ delay: idx * 0.02 }}
                                          className="group/row"
                                        >
                                          <td className="px-6 py-5 bg-white/5 rounded-l-[1.5rem] border-y border-l border-white/5 group-hover:bg-white/10 transition-all">
                                            <div className="flex flex-col">
                                              <span className="text-xs font-black italic">{tDate.toLocaleDateString('pt-BR')}</span>
                                              <span className="text-[8px] font-bold opacity-40">{tDate.toLocaleTimeString('pt-BR')}</span>
                                            </div>
                                          </td>
                                          <td className="px-6 py-5 bg-white/5 border-y border-white/5 group-hover:bg-white/10 transition-all">
                                            <div className="flex items-center space-x-3">
                                              <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center text-blue-400">
                                                <Store size={14} />
                                              </div>
                                              <span className="text-xs font-bold">{restaurant?.name || t.restaurantName || 'Sistema'}</span>
                                            </div>
                                          </td>
                                          <td className="px-6 py-5 bg-white/5 border-y border-white/5 group-hover:bg-white/10 transition-all">
                                            <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${
                                              t.type === 'recharge' || t.amount > 0 
                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                                : 'bg-red-500/10 text-red-400 border-red-500/20'
                                            }`}>
                                              {t.type === 'recharge' ? 'Recarga' : t.type === 'manual' ? 'Manual' : t.type || 'Transação'}
                                            </span>
                                          </td>
                                          <td className="px-6 py-5 bg-white/5 border-y border-white/5 group-hover:bg-white/10 transition-all">
                                            <div className="flex items-center space-x-2 text-[10px] font-bold opacity-60">
                                              {t.method === 'pix' ? <Zap size={12} className="text-blue-400" /> : <Hand size={12} className="text-orange-400" />}
                                              <span className="uppercase tracking-widest">{t.method || 'N/A'}</span>
                                            </div>
                                          </td>
                                          <td className="px-6 py-5 bg-white/5 rounded-r-[1.5rem] border-y border-r border-white/5 group-hover:bg-white/10 transition-all text-right">
                                            <span className={`text-sm font-black italic ${t.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                              {t.amount > 0 ? '+' : ''} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </span>
                                          </td>
                                        </motion.tr>
                                      );
                                    })}
                                </tbody>
                              </table>
                              {branchWalletTransactions.length === 0 && (
                                <div className="py-20 text-center opacity-20">
                                  <History size={48} className="mx-auto mb-4" />
                                  <p className="text-sm font-black uppercase tracking-widest">Nenhuma movimentação no período</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Partner Restaurants Tab */
                        <div className="space-y-8">
                    {selectedRestaurantInPartnerView ? (
                      /* Restaurant Detail View inside Partner View */
                      <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-8"
                      >
                        <button 
                          onClick={() => setSelectedRestaurantInPartnerView(null)}
                          className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors font-black uppercase tracking-widest text-[10px]"
                        >
                          <ChevronLeft size={16} />
                          <span>Voltar para Lista</span>
                        </button>

                        <div className="bg-white/5 border border-white/10 p-10 rounded-[3rem] space-y-10">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-6">
                              <div className="w-20 h-20 bg-slate-800 rounded-[2rem] overflow-hidden border border-white/10">
                                <img 
                                  src={selectedRestaurantInPartnerView.logoUrl || 'https://picsum.photos/seed/restaurant/200'} 
                                  alt={selectedRestaurantInPartnerView.name}
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                              <div>
                                <h3 className="text-3xl font-black uppercase tracking-tighter italic">{selectedRestaurantInPartnerView.name}</h3>
                                <p className="text-xs font-black uppercase tracking-widest opacity-40">{selectedRestaurantInPartnerView.address}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-4">
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {(() => {
                              const restaurantOrders = allOrders.filter(o => o.restaurantId === selectedRestaurantInPartnerView.id);
                              const today = new Date().toISOString().split('T')[0];
                              const todayOrders = restaurantOrders.filter(o => {
                                const oDate = o.createdAt?.toDate ? o.createdAt.toDate().toISOString().split('T')[0] : '';
                                return oDate === today && o.status === 'completed';
                              });
                              const todayRevenue = todayOrders.reduce((acc, o) => acc + (o.total || 0), 0);
                              const totalRevenue = restaurantOrders.filter(o => o.status === 'completed').reduce((acc, o) => acc + (o.total || 0), 0);

                              return (
                                <>
                                  <div className="bg-black/40 p-8 rounded-[2rem] border border-white/5 space-y-2">
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Pedidos Hoje</p>
                                    <p className="text-4xl font-black italic text-white">{todayOrders.length}</p>
                                  </div>
                                  <div className="bg-black/40 p-8 rounded-[2rem] border border-white/5 space-y-2">
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Faturamento Hoje</p>
                                    <p className="text-4xl font-black italic text-emerald-400">R$ {todayRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                  </div>
                                  <div className="bg-black/40 p-8 rounded-[2rem] border border-white/5 space-y-2">
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Faturamento Total</p>
                                    <p className="text-4xl font-black italic text-blue-400">R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                  </div>
                                </>
                              );
                            })()}
                          </div>

                          <div className="pt-10 border-t border-white/5">
                            <h4 className="text-xl font-black uppercase tracking-tight italic mb-6">Últimos Pedidos</h4>
                            <div className="space-y-4">
                              {(Array.from(new Map(allOrders
                                .filter(o => o.restaurantId === selectedRestaurantInPartnerView.id)
                                .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
                                .slice(0, 5)
                                .map(o => [o.id, o])).values()) as Order[]).map((order, idx) => (
                                  <div key={`admin-res-order-hist-${order.id}-${idx}`} className="bg-white/5 p-6 rounded-2xl flex items-center justify-between group hover:bg-white/10 transition-all">
                                    <div className="flex items-center space-x-4">
                                      <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center text-blue-400">
                                        <ShoppingBag size={18} />
                                      </div>
                                      <div>
                                        <p className="text-xs font-black uppercase tracking-widest">Pedido #{order.id.slice(-6)}</p>
                                        <p className="text-[10px] opacity-40">{order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString('pt-BR') : 'N/A'}</p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-sm font-black italic text-white">R$ {order.total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                      <p className={`text-[8px] font-black uppercase tracking-widest ${
                                        order.status === 'completed' ? 'text-emerald-400' : 'text-orange-400'
                                      }`}>{order.status}</p>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      /* Restaurant List for Partner */
                      <div className="space-y-8">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <h3 className="text-2xl font-black uppercase tracking-tight italic text-blue-400">Empresas Vinculadas</h3>
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Gerencie os restaurantes deste sócio</p>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="relative w-64">
                              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={14} />
                              <input 
                                type="text"
                                placeholder="Vincular novo restaurante..."
                                list="unlinked-restaurants"
                                onKeyPress={async (e) => {
                                  if (e.key === 'Enter') {
                                    const target = e.target as HTMLInputElement;
                                    const restaurantName = target.value;
                                    const restaurant = restaurants.find(r => r.name === restaurantName && r.branchId !== selectedPartner.id);
                                    if (restaurant) {
                                      try {
                                        await updateDoc(doc(db, 'restaurants', restaurant.id), {
                                          branchId: selectedPartner.id,
                                          city: selectedPartner.cityName,
                                          cityId: selectedPartner.cityId
                                        });
                                        target.value = '';
                                      } catch (error) {
                                        handleFirestoreError(error, OperationType.UPDATE, `restaurants/${restaurant.id}`);
                                      }
                                    }
                                  }
                                }}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-10 pr-4 text-[10px] font-black uppercase tracking-widest focus:border-blue-500/50 transition-all"
                              />
                              <datalist id="unlinked-restaurants">
                                {restaurants
                                  .filter(r => r.branchId !== selectedPartner.id)
                                  .map((r, idx) => <option key={`unlinked-res-opt-${r.id}-${idx}`} value={r.name} />)
                                }
                              </datalist>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {(Array.from(new Map(restaurants
                            .filter(r => r.branchId === selectedPartner.id || (r.city === selectedPartner.cityName && !r.branchId))
                            .map(r => [r.id, r])).values()) as Restaurant[]).map((restaurant, idx) => {
                              const today = new Date().toISOString().split('T')[0];
                              const restaurantOrders = allOrders.filter(o => o.restaurantId === restaurant.id);
                              const todayOrdersCount = restaurantOrders.filter(o => {
                                const oDate = o.createdAt?.toDate ? o.createdAt.toDate().toISOString().split('T')[0] : '';
                                return oDate === today && o.status === 'completed';
                              }).length;

                              const todayRevenue = restaurantOrders.filter(o => {
                                const oDate = o.createdAt?.toDate ? o.createdAt.toDate().toISOString().split('T')[0] : '';
                                return oDate === today && o.status === 'completed';
                              }).reduce((acc, o) => acc + (o.total || 0), 0);

                              const wallet = wallets.find(w => w.ownerUid === restaurant.ownerUid || w.ownerUid === restaurant.id);

                              return (
                                <motion.div 
                                  key={`admin-partner-res-${restaurant.id}-${idx}`}
                                  layout
                                  className="bg-white/5 border border-white/10 p-6 rounded-[2.5rem] flex flex-col space-y-6 group hover:border-blue-500/50 transition-all"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                      <div className="w-14 h-14 bg-slate-800 rounded-2xl overflow-hidden border border-white/10 group-hover:scale-110 transition-transform">
                                        <img 
                                          src={restaurant.logoUrl || 'https://picsum.photos/seed/restaurant/200'} 
                                          alt={restaurant.name}
                                          className="w-full h-full object-cover"
                                          referrerPolicy="no-referrer"
                                        />
                                      </div>
                                      <div>
                                        <h4 className="text-lg font-black uppercase tracking-tight italic">{restaurant.name}</h4>
                                        <div className="flex items-center space-x-3">
                                          <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">{todayOrdersCount} Pedidos Hoje</p>
                                          <div className="w-1 h-1 rounded-full bg-white/20" />
                                          <p className="text-[10px] font-black uppercase tracking-widest opacity-40">{restaurant.city}</p>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <button 
                                        onClick={() => setSelectedRestaurantInPartnerView(restaurant)}
                                        className="p-3 bg-white/5 hover:bg-blue-600 text-white rounded-xl transition-all"
                                        title="Entrar no Restaurante"
                                      >
                                        <Eye size={16} />
                                      </button>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                                      <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">Faturamento Hoje</p>
                                      <p className="text-sm font-black italic text-emerald-400">R$ {todayRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                    </div>
                                    <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                                      <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">Saldo em Conta</p>
                                      <p className="text-sm font-black italic text-blue-400">R$ {(wallet?.balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <button 
                                      onClick={() => {
                                        setSelectedRestaurantForCredit(restaurant);
                                        setCreditAction('add');
                                        setIsCreditModalOpen(true);
                                      }}
                                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500/10 text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all"
                                    >
                                      <Plus size={14} />
                                      Adicionar Crédito
                                    </button>
                                    <button 
                                      onClick={() => {
                                        setSelectedRestaurantForCredit(restaurant);
                                        setCreditAction('remove');
                                        setIsCreditModalOpen(true);
                                      }}
                                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-500/10 text-red-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all"
                                    >
                                      <Minus size={14} />
                                      Retirar Crédito
                                    </button>
                                  </div>
                                </motion.div>
                              );
                            })}
                        </div>

                        {restaurants.filter(r => r.branchId === selectedPartner.id || (r.city === selectedPartner.cityName && !r.branchId)).length === 0 && (
                          <div className="py-20 text-center opacity-20">
                            <Store size={48} className="mx-auto mb-4" />
                            <p className="text-sm font-black uppercase tracking-widest">Nenhum restaurante vinculado</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            );
          })()}
        </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
        <AnimatePresence>
          {isNotificationModalOpen && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsNotificationModalOpen(false)}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-slate-900 border border-white/10 w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl relative z-10 p-8 space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black uppercase tracking-tighter italic text-blue-500">Enviar Notificação</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Broadcast para todos os usuários</p>
                  </div>
                  <button onClick={() => setIsNotificationModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mensagem da Notificação</label>
                    <textarea 
                      value={notificationText}
                      onChange={e => setNotificationText(e.target.value)}
                      placeholder="Digite a mensagem que será enviada aos usuários..."
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500/50 transition-all min-h-[120px] resize-none"
                    />
                  </div>

                  <div className="bg-blue-500/10 p-4 rounded-2xl border border-blue-500/20 flex items-start gap-3">
                    <AlertCircle size={18} className="text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] font-medium text-blue-400 leading-relaxed uppercase tracking-tight">
                      Esta mensagem será enviada como uma notificação push para todos os usuários cadastrados na plataforma.
                    </p>
                  </div>

                  <button 
                    onClick={handleSendNotification}
                    disabled={!notificationText.trim() || isSendingNotification}
                    className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSendingNotification ? (
                      <RefreshCw size={16} />
                    ) : (
                      <>
                        <Bell size={16} />
                        Enviar Agora
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {isDeletingRestaurantModalOpen && restaurantToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setIsDeletingRestaurantModalOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="relative bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl space-y-6"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center text-red-500">
                  <Trash2 size={32} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black uppercase tracking-tight italic">Excluir Restaurante?</h3>
                  <p className="text-sm text-slate-400 font-medium leading-relaxed">
                    Você está prestes a excluir <span className="text-white font-bold">{restaurantToDelete.name}</span>. Esta ação removerá permanentemente o restaurante e <span className="text-red-400 font-bold">todos os produtos vinculados</span>.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setIsDeletingRestaurantModalOpen(false)}
                  className="flex-1 px-6 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-widest text-[10px] transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleDeleteRestaurantConfirmed}
                  className="flex-1 px-6 py-4 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-black uppercase tracking-widest text-[10px] transition-all shadow-lg shadow-red-500/20"
                >
                  Sim, Deletar Tudo
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isDeletingPartnerModalOpen && (
            <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsDeletingPartnerModalOpen(false)}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-slate-900 border border-white/10 w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl relative z-10 p-8 space-y-6"
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center text-red-500">
                    <Trash2 size={32} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-black uppercase tracking-tight italic text-white">Excluir Filial?</h3>
                    <p className="text-xs font-medium text-slate-400 leading-relaxed uppercase tracking-tight">
                      Esta ação é irreversível. O link da filial e o subdomínio associado ficarão inválidos imediatamente.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button 
                    onClick={confirmDeletePartner}
                    className="w-full bg-red-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-red-500/20 hover:bg-red-700 transition-all"
                  >
                    Confirmar Exclusão
                  </button>
                  <button 
                    onClick={() => setIsDeletingPartnerModalOpen(false)}
                    className="w-full bg-white/5 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-white/10 transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      <AnimatePresence>
        {isMenuModalOpen && selectedRestaurantForMenu && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsMenuModalOpen(false);
                setSelectedRestaurantForMenu(null);
                setIsAddingProduct(false);
                setEditingProduct(null);
              }}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-6xl max-h-[90vh] bg-slate-900 rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="p-8 border-b border-white/10 flex items-center justify-between bg-white/5">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-3xl flex items-center justify-center">
                    <Utensils size={32} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter italic">Cardápio: {selectedRestaurantForMenu.name}</h2>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Gestão de Produtos e Adicionais</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => {
                      resetProductForm();
                      setEditingProduct(null);
                      setIsAddingProduct(!isAddingProduct);
                    }}
                    className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
                      isAddingProduct ? 'bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20'
                    }`}
                  >
                    {isAddingProduct ? <X size={16} /> : <Plus size={16} />}
                    <span>{isAddingProduct ? 'Cancelar' : 'Novo Produto'}</span>
                  </button>
                  <button 
                    onClick={() => {
                      setIsMenuModalOpen(false);
                      setSelectedRestaurantForMenu(null);
                      setIsAddingProduct(false);
                      setEditingProduct(null);
                    }}
                    className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {isAddingProduct ? (
                  <motion.form 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    onSubmit={handleSaveProduct}
                    className="max-w-4xl mx-auto space-y-8"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Basic Info */}
                      <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 space-y-6">
                        <h3 className="text-lg font-black uppercase tracking-tight italic flex items-center gap-2">
                          <Info size={20} className="text-blue-400" />
                          Informações Básicas
                        </h3>
                        
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Nome do Produto</label>
                            <input required value={productName} onChange={e => setProductName(e.target.value)} className="w-full p-4 bg-white/5 rounded-xl border border-white/10 focus:ring-2 focus:ring-blue-500/50" />
                          </div>
                          
                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Descrição</label>
                            <textarea value={productDesc} onChange={e => setProductDesc(e.target.value)} className="w-full p-4 bg-white/5 rounded-xl border border-white/10 focus:ring-2 focus:ring-blue-500/50 h-24 resize-none" />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Preço (R$)</label>
                              <input required type="number" inputMode="decimal" step="0.01" value={productPrice} onChange={e => setProductPrice(e.target.value)} className="w-full p-4 bg-white/5 rounded-xl border border-white/10 focus:ring-2 focus:ring-blue-500/50" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Preço Promo (Opcional)</label>
                              <input type="number" inputMode="decimal" step="0.01" value={productPromoPrice} onChange={e => setProductPromoPrice(e.target.value)} className="w-full p-4 bg-white/5 rounded-xl border border-white/10 focus:ring-2 focus:ring-blue-500/50" />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Categoria</label>
                            <select required value={productCat} onChange={e => setProductCat(e.target.value)} className="w-full p-4 bg-white/5 rounded-xl border border-white/10 focus:ring-2 focus:ring-blue-500/50">
                              <option value="">Selecione...</option>
                              {categories.map((cat, idx) => <option key={`${cat.id}-${idx}`} value={cat.name}>{cat.name}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Media & Settings */}
                      <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 space-y-6">
                        <h3 className="text-lg font-black uppercase tracking-tight italic flex items-center gap-2">
                          <ImageIcon size={20} className="text-emerald-400" />
                          Mídia e Configurações
                        </h3>

                        <div className="space-y-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Imagem do Produto</label>
                            <div className="flex gap-4 items-center">
                              <label className="flex-1 bg-white/5 border border-white/10 rounded-xl p-4 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center space-x-2 cursor-pointer">
                                <Plus size={16} />
                                <span>Upload Imagem</span>
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'product')} />
                              </label>
                              {productImg && (
                                <div className="w-14 h-14 rounded-xl overflow-hidden border border-white/10 flex-shrink-0">
                                  <img src={productImg} className="w-full h-full object-cover" />
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Estoque</label>
                              <input type="number" value={productStock} onChange={e => setProductStock(e.target.value)} className="w-full p-4 bg-white/5 rounded-xl border border-white/10 focus:ring-2 focus:ring-blue-500/50" placeholder="Ilimitado" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Tempo Prep. (min)</label>
                              <input type="number" value={productPreparationTime} onChange={e => setProductPreparationTime(e.target.value)} className="w-full p-4 bg-white/5 rounded-xl border border-white/10 focus:ring-2 focus:ring-blue-500/50" />
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-4">
                            <label className="flex items-center space-x-3 cursor-pointer group">
                              <div className={`w-12 h-6 rounded-full transition-all relative ${productAvailable ? 'bg-emerald-500' : 'bg-white/10'}`}>
                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${productAvailable ? 'left-7' : 'left-1'}`} />
                              </div>
                              <input type="checkbox" className="hidden" checked={productAvailable} onChange={e => setProductAvailable(e.target.checked)} />
                              <span className="text-[10px] font-black uppercase tracking-widest opacity-60 group-hover:opacity-100">Disponível</span>
                            </label>

                            <label className="flex items-center space-x-3 cursor-pointer group">
                              <div className={`w-12 h-6 rounded-full transition-all relative ${productIsFlash ? 'bg-amber-500' : 'bg-white/10'}`}>
                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${productIsFlash ? 'left-7' : 'left-1'}`} />
                              </div>
                              <input type="checkbox" className="hidden" checked={productIsFlash} onChange={e => setProductIsFlash(e.target.checked)} />
                              <span className="text-[10px] font-black uppercase tracking-widest opacity-60 group-hover:opacity-100">Oferta Relâmpago</span>
                            </label>

                            <label className="flex items-center space-x-3 cursor-pointer group">
                              <div className={`w-12 h-6 rounded-full transition-all relative ${productIsFreeDelivery ? 'bg-blue-500' : 'bg-white/10'}`}>
                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${productIsFreeDelivery ? 'left-7' : 'left-1'}`} />
                              </div>
                              <input type="checkbox" className="hidden" checked={productIsFreeDelivery} onChange={e => setProductIsFreeDelivery(e.target.checked)} />
                              <span className="text-[10px] font-black uppercase tracking-widest opacity-60 group-hover:opacity-100">Entrega Grátis</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Availability Scheduling */}
                    <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-black uppercase tracking-tight italic flex items-center gap-2">
                          <Calendar size={20} className="text-blue-400" />
                          Disponibilidade por Dia e Horário (Opcional)
                        </h3>
                        <button
                          type="button"
                          onClick={() => {
                            if (showAvailability) {
                              setProductAvailability({
                                monday: { active: false, startTime: '00:00', endTime: '23:59' },
                                tuesday: { active: false, startTime: '00:00', endTime: '23:59' },
                                wednesday: { active: false, startTime: '00:00', endTime: '23:59' },
                                thursday: { active: false, startTime: '00:00', endTime: '23:59' },
                                friday: { active: false, startTime: '00:00', endTime: '23:59' },
                                saturday: { active: false, startTime: '00:00', endTime: '23:59' },
                                sunday: { active: false, startTime: '00:00', endTime: '23:59' },
                              });
                            }
                            setShowAvailability(!showAvailability);
                          }}
                          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            showAvailability ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                          }`}
                        >
                          {showAvailability ? 'Remover Agendamento' : 'Configurar Agendamento'}
                        </button>
                      </div>

                      {showAvailability && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day, idx) => (
                            <div key={`product-availability-${day}-${idx}`} className={`p-4 rounded-2xl border transition-all ${
                              productAvailability[day].active ? 'bg-blue-500/10 border-blue-500/50' : 'bg-white/5 border-white/10 opacity-60'
                            }`}>
                              <div className="flex items-center justify-between mb-4">
                                <span className="text-[10px] font-black uppercase tracking-widest">
                                  {day === 'monday' ? 'Segunda' :
                                   day === 'tuesday' ? 'Terça' :
                                   day === 'wednesday' ? 'Quarta' :
                                   day === 'thursday' ? 'Quinta' :
                                   day === 'friday' ? 'Sexta' :
                                   day === 'saturday' ? 'Sábado' : 'Domingo'}
                                </span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={productAvailability[day].active}
                                    onChange={(e) => setProductAvailability({
                                      ...productAvailability,
                                      [day]: { ...productAvailability[day], active: e.target.checked }
                                    })}
                                  />
                                  <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                              </div>
                              
                              {productAvailability[day].active && (
                                <div className="space-y-3">
                                  <div className="space-y-1">
                                    <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Início</label>
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      placeholder="00:00"
                                      value={productAvailability[day].startTime}
                                      onChange={(e) => setProductAvailability({
                                        ...productAvailability,
                                        [day]: { ...productAvailability[day], startTime: formatTimeInput(e.target.value) }
                                      })}
                                      className="w-full p-2 bg-white/5 rounded-lg border border-white/10 text-xs font-bold focus:ring-1 focus:ring-blue-500/50"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Fim</label>
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      placeholder="23:59"
                                      value={productAvailability[day].endTime}
                                      onChange={(e) => setProductAvailability({
                                        ...productAvailability,
                                        [day]: { ...productAvailability[day], endTime: formatTimeInput(e.target.value) }
                                      })}
                                      className="w-full p-2 bg-white/5 rounded-lg border border-white/10 text-xs font-bold focus:ring-1 focus:ring-blue-500/50"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <button 
                      type="submit"
                      className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-3"
                    >
                      <Save size={24} />
                      <span>{editingProduct ? 'Salvar Alterações' : 'Adicionar ao Cardápio'}</span>
                    </button>
                  </motion.form>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {restaurantProducts.map((product, idx) => (
                      <motion.div 
                        key={`${product.id}-${idx}`}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white/5 p-4 rounded-[2.5rem] border border-white/10 flex space-x-4 hover:border-blue-500/30 transition-all group"
                      >
                        <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 bg-black">
                          <img src={product.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                          <div>
                            <div className="flex items-center justify-between">
                              <h4 className="font-black uppercase tracking-tight italic truncate">{product.name}</h4>
                              <span className={`w-2 h-2 rounded-full ${product.available ? 'bg-emerald-500' : 'bg-red-500'}`} />
                            </div>
                            <p className="text-[10px] opacity-40 line-clamp-2 leading-tight">{product.description}</p>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-blue-400">R$ {product.price.toFixed(2)}</span>
                              {product.stock !== null && (
                                <span className="text-[8px] font-bold opacity-40 uppercase">Estoque: {product.stock}</span>
                              )}
                            </div>
                            <div className="flex space-x-2">
                              <button 
                                onClick={() => startEditingProduct(product)}
                                className="p-2 bg-white/5 hover:bg-blue-500 hover:text-white rounded-xl transition-all"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button 
                                onClick={() => handleDeleteProduct(product.id)}
                                disabled={deletingProductId === product.id}
                                className="p-2 bg-white/5 hover:bg-red-500 hover:text-white rounded-xl transition-all disabled:opacity-50"
                              >
                                {deletingProductId === product.id ? (
                                  <Loader2 size={14} />
                                ) : (
                                  <Trash2 size={14} />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    {restaurantProducts.length === 0 && (
                      <div className="col-span-full py-20 text-center opacity-20">
                        <Utensils size={64} className="mx-auto mb-4" />
                        <p className="text-xl font-black uppercase tracking-widest italic">Nenhum produto cadastrado</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Super Admin Floating Bar */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2 bg-slate-950/90 backdrop-blur-xl border border-blue-500/30 p-2 rounded-2xl shadow-2xl shadow-blue-500/20">
        <div className="px-4 py-2 bg-blue-600/20 rounded-xl border border-blue-500/20">
          <p className="text-[8px] font-black uppercase tracking-widest text-blue-400">Vendas Hoje</p>
          <p className="text-sm font-black text-white">{formatPrice(allOrders.filter(o => o.status === 'completed' && new Date(o.createdAt?.toDate ? o.createdAt.toDate() : o.createdAt || 0).toDateString() === new Date().toDateString()).reduce((acc, o) => acc + (o.total || 0), 0))}</p>
        </div>
        <div className="px-4 py-2 bg-emerald-600/20 rounded-xl border border-emerald-500/20">
          <p className="text-[8px] font-black uppercase tracking-widest text-emerald-400">Pedidos</p>
          <p className="text-sm font-black text-white">{allOrders.filter(o => new Date(o.createdAt?.toDate ? o.createdAt.toDate() : o.createdAt || 0).toDateString() === new Date().toDateString()).length}</p>
        </div>
        <div className="w-px h-8 bg-white/10 mx-2" />
        <button 
          onClick={() => {
            setOrderSearchTerm('');
            setOrderStatusFilter('pending');
            setActiveTab('orders');
          }}
          className="p-3 hover:bg-white/5 rounded-xl transition-all text-amber-400 relative"
          title="Pedidos Pendentes"
        >
          <Bell size={20} />
          {allOrders.filter(o => o.status === 'pending').length > 0 && (
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className="p-3 hover:bg-white/5 rounded-xl transition-all text-slate-400"
          title="Configurações Rápidas"
        >
          <Settings size={20} />
        </button>
      </div>

      {/* Auto Credit Confirmation Modal */}
      <AnimatePresence>
        {showAutoCreditConfirm && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-slate-900 border border-white/10 w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl p-8 space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center mx-auto text-blue-400 mb-4 border border-blue-500/30">
                  <DollarSign size={32} />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight italic text-blue-400">Crédito Automático</h3>
                <p className="text-slate-400 text-xs font-bold leading-relaxed uppercase tracking-widest">
                  Deseja adicionar <span className="text-white">R$ 10,00</span> de crédito para <span className="text-blue-400">{showAutoCreditConfirm.name}</span> instantaneamente?
                </p>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setShowAutoCreditConfirm(null)}
                  className="flex-1 bg-white/5 text-slate-400 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={async () => {
                    const target = showAutoCreditConfirm;
                    setShowAutoCreditConfirm(null);
                    await handleAutoCredit(target);
                  }}
                  className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                >
                  {isProcessingCredit ? <RefreshCw size={14} className="animate-spin" /> : 'Confirmar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      </main>
    </div>
  );
};

export default AdminView;
