import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { db } from '../firebase';
import axios from 'axios';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  query, 
  where, 
  orderBy,
  getDoc,
  getDocs,
  serverTimestamp,
  limit,
  increment
} from 'firebase/firestore';
import { playSound, stopOrderAlarm } from '../utils/sounds';
import { useAuth, OperationType, handleFirestoreError } from '../AuthContext';
import { getRestaurantStatus } from '../utils/hours';
import Chat, { Message } from './Chat';
import AuthModal from './AuthModal';
import { ThemeSelector } from './ThemeSelector';
import GalleryModal from './GalleryModal';
import { QRCodeCanvas } from 'qrcode.react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { isRestaurantOpen } from './CustomerView';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { Plus, Minus, Edit2, Trash2, Clock, Store, Utensils, LogOut, ChevronRight, ChevronDown, LogIn, X, XCircle, Edit, Package, Star, Bike, Car, MapPin, Image as ImageIcon, MessageSquare, Copy, ExternalLink, Share2, Globe, ShieldCheck, RefreshCw, DollarSign, MessageCircle, ShieldAlert, CreditCard, User, ChevronLeft, ClipboardList, QrCode, Download, TrendingUp, TrendingDown, Calendar, Volume2, Smartphone, Music, Play, Pause, Printer, Bluetooth, Check, CheckCircle, Navigation, Video, Zap, History, ArrowUpRight, ArrowDownRight, Loader2, Search, Flame, AlertCircle, AlertTriangle, Lock as LockIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { compressImage } from '../utils/image';
import { formatTimeInput } from '../utils/format';

const mockCouriers = [
  { name: 'João Silva', phone: '(14) 99876-5432', vehicle: 'Honda CG 160', plate: 'ABC-1234', color: 'Vermelha', year: '2022', photo: 'https://i.pravatar.cc/150?u=joao' },
  { name: 'Maria Oliveira', phone: '(14) 99765-4321', vehicle: 'Yamaha Fazer 250', plate: 'XYZ-5678', color: 'Preta', year: '2023', photo: 'https://i.pravatar.cc/150?u=maria' },
  { name: 'Pedro Santos', phone: '(14) 99654-3210', vehicle: 'Honda Biz 125', plate: 'KJH-9012', color: 'Branca', year: '2021', photo: 'https://i.pravatar.cc/150?u=pedro' },
  { name: 'Ana Costa', phone: '(14) 99543-2109', vehicle: 'Yamaha Factor 150', plate: 'LMN-3456', color: 'Azul', year: '2022', photo: 'https://i.pravatar.cc/150?u=ana' },
  { name: 'Lucas Ferreira', phone: '(14) 99432-1098', vehicle: 'Honda CB 300F', plate: 'PQR-7890', color: 'Dourada', year: '2024', photo: 'https://i.pravatar.cc/150?u=lucas' }
];

import { QRCodeSVG } from 'qrcode.react';

interface DayHours {
  open: string;
  close: string;
  closed: boolean;
  closesForLunch?: boolean;
  lunchStart?: string;
  lunchEnd?: string;
}

interface WeeklyHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
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

interface Restaurant {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  logoUrl?: string;
  openingHours: string;
  closingHours: string;
  weeklyHours?: WeeklyHours;
  status: string;
  ownerUid: string;
  whatsapp: string;
  latitude?: number;
  longitude?: number;
  referencePoint?: string;
  welcomeEmailMessage?: string;
  modality?: 'restaurante' | 'mercado' | 'farmácia' | 'lanche' | 'padaria' | 'bebidas' | 'pet shop' | 'shopping gourmet';
  pixConfigType?: 'company' | 'central' | 'none';
  pixKey?: string;
  pixType?: string;
  orderSoundUrl?: string;
  messageSoundUrl?: string;
  autoVolume?: boolean;
  screenOverlay?: boolean;
  forceClosed?: boolean;
  city?: string;
  cityId?: string;
  splitPayConfig?: {
    pixKey: string;
    pixKeyType: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';
    platformFee: number;
    feeType: 'fixed' | 'percent';
    active: boolean;
  };
  deliveryConfigured?: boolean;
  deliveryFeeType?: 'km' | 'free' | 'fixed';
  deliveryFeePerKm?: number;
  freeDeliveryKm?: number;
  isDeliveryFree?: boolean;
  minOrderValue?: number;
  autoPrintOrders?: boolean;
  monthlyBillingEnabled?: boolean;
  isWalletBlocked?: boolean;
  customOrderDeduction?: number;
  branchId?: string;
  unlimitedCredit?: boolean;
  employees?: string[];
  acceptedPaymentMethods?: string[];
  orderColorConfig?: {
    warningMinutes: number;
    criticalMinutes: number;
  };
  activityExpiresAt?: any;
}

interface AddOn {
  id: string;
  name: string;
  price?: number;
  imageUrl?: string;
  isFixed?: boolean;
}

interface FoodItem {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  price: number;
  promoPrice?: number;
  isFlashSale?: boolean;
  flashSaleStart?: any;
  category: string;
  imageUrl: string;
  available: boolean;
  stock?: number | null;
  availableFrom?: string;
  availableUntil?: string;
  addOns?: AddOn[];
  maxAddOns?: number;
  preparationTimeMinutes?: number;
  highlightUntil?: any;
  isDeliveryFree?: boolean;
  availability?: ProductAvailability;
}

interface Review {
  id: string;
  restaurantId: string;
  customerUid: string;
  customerName: string;
  rating: number;
  comment: string;
  createdAt: any;
}

interface MarketingPopup {
  id: string;
  imageUrl: string;
  linkUrl: string;
  active: boolean;
  ownerUid: string;
}

interface Banner {
  id: string;
  imageUrl: string;
  title: string;
  active: boolean;
  ownerUid: string;
  objectPosition?: string;
  cities?: string[];
}

interface Ride {
  id: string;
  restaurantId: string;
  restaurantName: string;
  machineRequestId?: string;
  cityId?: string;
  orderId?: string;
  destinations: {
    orderId: string;
    customerName: string;
    address: string;
    latitude?: number;
    longitude?: number;
  }[];
  customerUids?: string[];
  vehicleType: 'motorcycle' | 'car';
  categoryName?: string;
  estimatedCost?: number;
  estimatedDistance?: number;
  status: 'searching' | 'pending_acceptance' | 'accepted' | 'arrived_at_pickup' | 'picked_up' | 'en_route' | 'completed' | 'cancelled';
  courierUid?: string;
  courierName?: string;
  courierPhoto?: string;
  courierVehicle?: string;
  courierPlate?: string;
  courierColor?: string;
  courierYear?: string;
  courierWhatsapp?: string;
  createdAt: any;
  updatedAt?: any;
}

interface Order {
  id: string;
  restaurantId: string;
  customerUid: string;
  customerName?: string;
  items: any[];
  total: number;
  status: 'pending' | 'preparing' | 'ready' | 'delivering' | 'en_route' | 'delivered' | 'rejected' | 'cancelled';
  deliveryAddress: string;
  deliveryOption?: 'normal' | 'fast' | 'pickup';
  deliveryFee?: number;
  deliveryEstimate?: string;
  tableNumber?: string;
  customerLocation?: { latitude: number; longitude: number };
  assignedEmployees?: string[];
  updatedAt?: any;
  createdAt: any;
  paymentMethod?: string;
  customerWhatsapp?: string;
  tupaCategory?: string;
}

interface Wallet {
  id: string;
  balance: number;
  ownerUid: string;
}

interface WalletTransaction {
  id: string;
  type: 'recharge' | 'deduction';
  amount: number;
  description: string;
  createdAt: any;
}

interface PixPayment {
  id: string;
  paymentId: string;
  qrCode: string;
  qrCodeBase64: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  amount: number;
  isSubscription?: boolean;
}

interface GlobalSettings {
  mercadoPagoPublicKey?: string;
  mercadoPagoAccessToken?: string;
  minWalletBalance?: number;
  minRechargeAmount?: number;
  orderDeductionAmount?: number;
  monthlyFee?: number;
  defaultDueDay?: number;
  trialPeriodDays?: number;
  businessRegistrationPhone?: string;
}

interface SplitPayHistory {
  id: string;
  orderId: string;
  restaurantId: string;
  totalAmount: number;
  platformFee: number;
  restaurantAmount: number;
  pixKeyDest: string;
  status: 'success' | 'error';
  errorMessage?: string;
  createdAt: any;
}

interface Printer {
  id: string;
  restaurantId: string;
  name: string;
  type: 'escpos';
  connection: 'network' | 'usb' | 'bluetooth';
  ip?: string;
  port?: number;
  paperSize: '58mm' | '80mm';
  active: boolean;
  autoPrint: boolean;
}

interface Category {
  id: string;
  name: string;
  icon?: string;
  order?: number;
}

interface ProductAvailability {
  [key: string]: {
    active: boolean;
    startTime: string;
    endTime: string;
  };
}

const formatTimeDiff = (order: any, currentTime: Date) => {
  if (!order.createdAt) return '00:00:00';
  
  let start: Date;
  if (typeof order.createdAt.toDate === 'function') {
    start = order.createdAt.toDate();
  } else if (order.createdAt instanceof Date) {
    start = order.createdAt;
  } else {
    start = new Date(order.createdAt);
  }
  
  if (isNaN(start.getTime())) {
    start = currentTime;
  }
  
  let end = currentTime;
  if (['delivered', 'cancelled', 'rejected'].includes(order.status) && order.updatedAt) {
    let parsedEnd: Date | null = null;
    if (typeof order.updatedAt.toDate === 'function') {
      parsedEnd = order.updatedAt.toDate();
    } else if (order.updatedAt instanceof Date) {
      parsedEnd = order.updatedAt;
    } else {
      parsedEnd = new Date(order.updatedAt);
    }
    if (parsedEnd && !isNaN(parsedEnd.getTime())) {
      end = parsedEnd;
    }
  }
  
  const diff = Math.max(0, end.getTime() - start.getTime());
  
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const getOrderColor = (order: any, currentTime: Date, limitMinutes: number) => {
  if (!order.createdAt) return { border: 'border-slate-100', text: 'text-slate-400', isExpired: false };
  
  let start: Date;
  if (typeof order.createdAt.toDate === 'function') {
    start = order.createdAt.toDate();
  } else if (order.createdAt instanceof Date) {
    start = order.createdAt;
  } else {
    start = new Date(order.createdAt);
  }
  
  if (isNaN(start.getTime())) {
    start = currentTime;
  }
  
  let end = currentTime;
  if (['delivered', 'cancelled', 'rejected'].includes(order.status) && order.updatedAt) {
    let parsedEnd: Date | null = null;
    if (typeof order.updatedAt.toDate === 'function') {
      parsedEnd = order.updatedAt.toDate();
    } else if (order.updatedAt instanceof Date) {
      parsedEnd = order.updatedAt;
    } else {
      parsedEnd = new Date(order.updatedAt);
    }
    if (parsedEnd && !isNaN(parsedEnd.getTime())) {
      end = parsedEnd;
    }
  }
  
  const diffMinutes = (end.getTime() - start.getTime()) / 60000;
  const isFinished = ['delivered', 'cancelled', 'rejected'].includes(order.status);
  const isExpired = diffMinutes >= limitMinutes && !isFinished;
  
  if (isFinished) return { border: 'border-slate-200 shadow-sm', text: 'text-slate-400', isExpired: false, isFinished: true };
  if (diffMinutes >= limitMinutes) return { border: 'border-red-500 shadow-lg shadow-red-500/20', text: 'text-red-500', isExpired };
  return { border: 'border-emerald-500 shadow-lg shadow-emerald-500/20', text: 'text-emerald-500', isExpired };
};

const safeFormatDate = (dateField: any): string => {
  if (!dateField) return 'N/A';
  try {
    let d: Date;
    if (typeof dateField.toDate === 'function') {
      d = dateField.toDate();
    } else if (dateField instanceof Date) {
      d = dateField;
    } else if (typeof dateField === 'object' && dateField.seconds !== undefined) {
      d = new Date(dateField.seconds * 1000);
    } else {
      d = new Date(dateField);
    }
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleString('pt-BR');
  } catch (e) {
    return 'N/A';
  }
};

const safeFormatDateOnly = (dateField: any): string => {
  if (!dateField) return 'N/A';
  try {
    let d: Date;
    if (typeof dateField.toDate === 'function') {
      d = dateField.toDate();
    } else if (dateField instanceof Date) {
      d = dateField;
    } else if (typeof dateField === 'object' && dateField.seconds !== undefined) {
      d = new Date(dateField.seconds * 1000);
    } else {
      d = new Date(dateField);
    }
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('pt-BR');
  } catch (e) {
    return 'N/A';
  }
};

const safeFormatTimeOnly = (dateField: any): string => {
  if (!dateField) return 'N/A';
  try {
    let d: Date;
    if (typeof dateField.toDate === 'function') {
      d = dateField.toDate();
    } else if (dateField instanceof Date) {
      d = dateField;
    } else if (typeof dateField === 'object' && dateField.seconds !== undefined) {
      d = new Date(dateField.seconds * 1000);
    } else {
      d = new Date(dateField);
    }
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleTimeString('pt-BR');
  } catch (e) {
    return 'N/A';
  }
};

const safeGetDate = (dateField: any): Date | null => {
  if (!dateField) return null;
  try {
    let d: Date;
    if (typeof dateField.toDate === 'function') {
      d = dateField.toDate();
    } else if (dateField instanceof Date) {
      d = dateField;
    } else if (typeof dateField === 'object' && dateField.seconds !== undefined) {
      d = new Date(dateField.seconds * 1000);
    } else {
      d = new Date(dateField);
    }
    if (isNaN(d.getTime())) return null;
    return d;
  } catch (e) {
    return null;
  }
};

const ManagerView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, globalSettings, isGuest, isSigningIn, continueAsGuest, signOut, setRole, commonData, managerData, refreshWallet, loading } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const isPremium = profile?.subscriptionStatus === 'active';
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(managerData?.restaurant || null);
  const [hasScrolledToOrders, setHasScrolledToOrders] = useState(false);

  // Smooth scroll to orders section when restaurant data is loaded
  useEffect(() => {
    if (restaurant && !hasScrolledToOrders) {
      const timer = setTimeout(() => {
        const element = document.getElementById('orders-section');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          setHasScrolledToOrders(true);
        }
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [restaurant, hasScrolledToOrders]);
  
  // Sync local state when managerData is preloaded or updated
  useEffect(() => {
    if (managerData?.restaurant) {
      setRestaurant(managerData.restaurant);
      setResPixConfigType(managerData.restaurant.pixConfigType || 'none');
      setResPixKey(managerData.restaurant.pixKey || '');
      setResPixType(managerData.restaurant.pixType || 'cpf');
      setResPixReceiver(managerData.restaurant.pixReceiver || '');
      setResAcceptedPayments(managerData.restaurant.acceptedPaymentMethods || ['pix', 'cash', 'card']);
      setResDesc(managerData.restaurant.description || '');
      setResOpen(managerData.restaurant.openingHours || '08:00');
      setResClose(managerData.restaurant.closingHours || '22:00');
      setResImg(managerData.restaurant.imageUrl || '');
      setResOrderSoundUrl(managerData.restaurant.orderSoundUrl || '');
      setResMessageSoundUrl(managerData.restaurant.messageSoundUrl || '');
      setResForceClosed(managerData.restaurant.forceClosed || false);
      if (managerData.restaurant.weeklyHours) setWeeklyHours(managerData.restaurant.weeklyHours);
      setResScreenOverlay(managerData.restaurant.screenOverlay || false);
    }
    if (Array.isArray(managerData?.foodItems)) setFoodItems(managerData.foodItems);
    if (Array.isArray(managerData?.rides)) setRides(managerData.rides);
    if (Array.isArray(managerData?.reviews)) setReviews(managerData.reviews);
    if (Array.isArray(managerData?.popups)) setPopups(managerData.popups);
    if (Array.isArray(managerData?.banners)) setBanners(managerData.banners);
  }, [managerData]);

  const [cityData, setCityData] = useState<City | null>(null);
  const [apiCategories, setApiCategories] = useState<{ id: string | number; nome: string; preco?: number; distancia?: number }[]>([]);
  const [searchingForCourier, setSearchingForCourier] = useState<Record<string, boolean>>({});
  const [noCourierFound, setNoCourierFound] = useState<Record<string, boolean>>({});
  const [showNoCourierPopup, setShowNoCourierPopup] = useState(false);
  const [categoryLoading, setCategoryLoading] = useState<Record<string, string | number | null>>({});
  const [selectedCourierDetails, setSelectedCourierDetails] = useState<any>(null);
  const [categoryMode, setCategoryMode] = useState<'mode1' | 'mode2' | null>(null);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [resName, setResName] = useState(managerData?.restaurant?.name || '');
  const [resWhatsapp, setResWhatsapp] = useState(managerData?.restaurant?.whatsapp || '');
  const [resModality, setResModality] = useState<'restaurante' | 'mercado' | 'farmácia' | 'lanche' | 'padaria' | 'bebidas' | 'pet shop' | 'shopping gourmet'>(managerData?.restaurant?.modality || 'restaurante');
  const [resReferencePoint, setResReferencePoint] = useState(managerData?.restaurant?.referencePoint || '');
  const [resAutoVolume, setResAutoVolume] = useState(managerData?.restaurant?.autoVolume || false);
  const [resAutoPrintOrders, setResAutoPrintOrders] = useState(managerData?.restaurant?.autoPrintOrders ?? true);
  const [resMonthlyBillingEnabled, setResMonthlyBillingEnabled] = useState(managerData?.restaurant?.monthlyBillingEnabled || false);
  const [resCity, setResCity] = useState(managerData?.restaurant?.city || '');
  const [resCityId, setResCityId] = useState(managerData?.restaurant?.cityId || '');
  const [resLat, setResLat] = useState<number | null>(managerData?.restaurant?.latitude || null);
  const [resLon, setResLon] = useState<number | null>(managerData?.restaurant?.longitude || null);
  const [resPixConfigType, setResPixConfigType] = useState<'company' | 'central' | 'none'>(managerData?.restaurant?.pixConfigType || 'company');
  const [resPixKey, setResPixKey] = useState(managerData?.restaurant?.pixKey || '');
  const [resPixType, setResPixType] = useState<string>(managerData?.restaurant?.pixType || 'cpf');
  const [resPixReceiver, setResPixReceiver] = useState(managerData?.restaurant?.pixReceiver || '');
  const [resAcceptedPayments, setResAcceptedPayments] = useState<string[]>(managerData?.restaurant?.acceptedPaymentMethods || ['pix', 'cash', 'card']);
  const [resDesc, setResDesc] = useState(managerData?.restaurant?.description || '');
  const [resOpen, setResOpen] = useState(managerData?.restaurant?.openingHours || '08:00');
  const [resClose, setResClose] = useState(managerData?.restaurant?.closingHours || '22:00');
  const [resImg, setResImg] = useState(managerData?.restaurant?.imageUrl || '');
  const [resOrderSoundUrl, setResOrderSoundUrl] = useState(managerData?.restaurant?.orderSoundUrl || '');
  const [resMessageSoundUrl, setResMessageSoundUrl] = useState(managerData?.restaurant?.messageSoundUrl || '');
  const [resForceClosed, setResForceClosed] = useState(managerData?.restaurant?.forceClosed || false);
  const [weeklyHours, setWeeklyHours] = useState<WeeklyHours>(managerData?.restaurant?.weeklyHours || {
    monday: { open: '08:00', close: '22:00', closed: false, closesForLunch: false, lunchStart: '12:00', lunchEnd: '14:00' },
    tuesday: { open: '08:00', close: '22:00', closed: false, closesForLunch: false, lunchStart: '12:00', lunchEnd: '14:00' },
    wednesday: { open: '08:00', close: '22:00', closed: false, closesForLunch: false, lunchStart: '12:00', lunchEnd: '14:00' },
    thursday: { open: '08:00', close: '22:00', closed: false, closesForLunch: false, lunchStart: '12:00', lunchEnd: '14:00' },
    friday: { open: '08:00', close: '22:00', closed: false, closesForLunch: false, lunchStart: '12:00', lunchEnd: '14:00' },
    saturday: { open: '08:00', close: '22:00', closed: false, closesForLunch: false, lunchStart: '12:00', lunchEnd: '14:00' },
    sunday: { open: '08:00', close: '22:00', closed: true, closesForLunch: false, lunchStart: '12:00', lunchEnd: '14:00' },
  });
  const [isCreating, setIsCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [resScreenOverlay, setResScreenOverlay] = useState(managerData?.restaurant?.screenOverlay || false);
  const [foodItems, setFoodItems] = useState<FoodItem[]>(managerData?.foodItems || []);
  const [optimisticStatuses, setOptimisticStatuses] = useState<Record<string, Order['status']>>({});
  
  const orders = useMemo(() => {
    if (Object.keys(optimisticStatuses).length === 0) return managerData.orders || [];
    return (managerData.orders || []).map(o => 
      optimisticStatuses[o.id] ? { ...o, status: optimisticStatuses[o.id] } : o
    );
  }, [managerData.orders, optimisticStatuses]);

  useEffect(() => {
    if (Object.keys(optimisticStatuses).length === 0) return;
    const statusRank: Record<string, number> = { pending: 0, preparing: 1, ready: 2, delivered: 3, rejected: 4, cancelled: 5 };
    setOptimisticStatuses(prev => {
      const next = { ...prev };
      let changed = false;
      Object.keys(next).forEach(id => {
        const realOrder = (managerData?.orders || []).find(o => o.id === id);
        if (realOrder && statusRank[realOrder.status] >= statusRank[next[id]]) {
          delete next[id];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [managerData.orders]);

  const [rides, setRides] = useState<Ride[]>(Array.isArray(managerData?.rides) ? managerData.rides : []);
  const [reviews, setReviews] = useState<Review[]>(Array.isArray(managerData?.reviews) ? managerData.reviews : []);
  const [popups, setPopups] = useState<MarketingPopup[]>(Array.isArray(managerData?.popups) ? managerData.popups : []);
  const [banners, setBanners] = useState<Banner[]>(Array.isArray(managerData?.banners) ? managerData.banners : []);
  const [categories, setCategories] = useState<Category[]>(Array.isArray(commonData?.categories) ? commonData.categories : []);
  const [activeTab, setActiveTab] = useState<'menu' | 'orders' | 'reviews' | 'finance' | 'billing' | 'printers'>('orders');
  const [isEditingRestaurant, setIsEditingRestaurant] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editingItem, setEditingItem] = useState<FoodItem | null>(null);
  const [itemAddOns, setItemAddOns] = useState<AddOn[]>([]);
  const [isAddingPopup, setIsAddingPopup] = useState(false);
  const [editingPopup, setEditingPopup] = useState<MarketingPopup | null>(null);
  const [isAddingBanner, setIsAddingBanner] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [confirmingRideCancellation, setConfirmingRideCancellation] = useState<{orderId: string, rideId?: string} | null>(null);
  const [finalizingOrderId, setFinalizingOrderId] = useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [showStepTutorial, setShowStepTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [filterStatus, setFilterStatus] = useState('all');
  const [orderFilterDate, setOrderFilterDate] = useState<string>('');
  const [closedOrdersLimit, setClosedOrdersLimit] = useState<number>(0);

  useEffect(() => {
    setClosedOrdersLimit(0);
  }, [filterStatus, orderFilterDate]);

  const getOrderDateString = (o: any) => {
    if (!o || !o.createdAt) return '';
    const dObj = o.createdAt.seconds ? new Date(o.createdAt.seconds * 1000) : new Date(o.createdAt);
    const yyyy = dObj.getFullYear();
    const mm = String(dObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dObj.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const processedOrdersData = useMemo(() => {
    const uniqueOrders = Array.from(new Map(orders.map(o => [o.id, o])).values()) as Order[];
    
    const filtered = uniqueOrders.filter(o => {
      const matchesStatus = filterStatus === 'all' || 
        (filterStatus === 'cancelled' ? (o.status === 'cancelled' || o.status === 'rejected') : o.status === filterStatus);
      const matchesDate = !orderFilterDate || getOrderDateString(o) === orderFilterDate;
      return matchesStatus && matchesDate;
    });

    const sorted = [...filtered].sort((a, b) => {
      const priority: any = { pending: 0, preparing: 1, ready: 2, delivering: 3, en_route: 4, delivered: 5, rejected: 6, cancelled: 7 };
      if (priority[a.status] !== priority[b.status]) {
        return priority[a.status] - priority[b.status];
      }
      return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
    });

    const active = sorted.filter(o => !['delivered', 'completed', 'cancelled', 'rejected'].includes(o.status));
    const closed = sorted.filter(o => ['delivered', 'completed', 'cancelled', 'rejected'].includes(o.status));

    return { active, sortedAll: sorted, closed };
  }, [orders, filterStatus, orderFilterDate]);

  const displayedClosedOrders = useMemo(() => {
    return processedOrdersData.closed.slice(0, closedOrdersLimit);
  }, [processedOrdersData.closed, closedOrdersLimit]);

  const finalOrdersToRender = useMemo(() => {
    return [...processedOrdersData.active, ...displayedClosedOrders];
  }, [processedOrdersData.active, displayedClosedOrders]);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [menuSearchTerm, setMenuSearchTerm] = useState('');
  const [loadingOrders, setLoadingOrders] = useState<Record<string, boolean>>({});
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isConfiguringColors, setIsConfiguringColors] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [managerLocation, setManagerLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Capture Manager's live location
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setManagerLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => console.warn("[Manager] GPS error:", error.message),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  const deepRefresh = () => {
    setIsRefreshing(true);
    // Clear all persistent UI locks for orders
    setCourierSticky({});
    setSearchingForCourier({});
    setNoCourierFound({});
    lastKnownCouriers.current = {}; 
    setTimeout(() => setIsRefreshing(false), 800);
  };
  const [warningMinutes, setWarningMinutes] = useState(managerData.restaurant?.orderColorConfig?.warningMinutes || 15);
  const [criticalMinutes, setCriticalMinutes] = useState(managerData.restaurant?.orderColorConfig?.criticalMinutes || 15);
  const [subscriptionTimeLeft, setSubscriptionTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  useEffect(() => {
    if (!profile?.subscriptionDueDate || profile?.subscriptionStatus !== 'active') {
      setSubscriptionTimeLeft(null);
      return;
    }

    const interval = setInterval(() => {
      if (!profile?.subscriptionDueDate) return;
      const now = new Date().getTime();
      const dueDate = new Date(profile.subscriptionDueDate).getTime();
      if (isNaN(dueDate)) return;
      const diff = dueDate - now;

      if (diff <= 0) {
        setSubscriptionTimeLeft(null);
        clearInterval(interval);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setSubscriptionTimeLeft({ days, hours, minutes, seconds });
    }, 1000);

    return () => clearInterval(interval);
  }, [profile?.subscriptionDueDate, profile?.subscriptionStatus]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [printers, setPrinters] = useState<Printer[]>(Array.isArray(managerData?.printers) ? managerData.printers : []);
  const [isAddingPrinter, setIsAddingPrinter] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<Printer | null>(null);
  const [isTestingPrinter, setIsTestingPrinter] = useState(false);

  const [wallet, setWallet] = useState<Wallet | null>(managerData?.wallet || null);
  const minBalance = globalSettings?.minWalletBalance ?? 5;
  const isBalanceLow = useMemo(() => {
    // Constant hardcoded global admin list for absolute bypass
    const globalAdmins = [
      'tupamobilidade@gmail.com',
      'entrega.rapida247@gmail.com', 
      'ifoodtupa4@gmail.com', 
      'foddtopmendes@gmail.com',
      'franksomjuruti1@gmail.com',
      'franksomjuruti@gmail.com'
    ];
    const isGlobalAdmin = user?.email && globalAdmins.includes(user.email.toLowerCase());

    if (isGlobalAdmin || isGuest) return false;
    
    // CRITICAL: If unlimited credit is active, balance is NEVER considered low for blocking purposes
    if (restaurant?.unlimitedCredit) return false;

    if (!wallet) return true; // Bloqueia por padrão se a carteira não estiver carregada
    
    // Se o balanço for positivo (mesmo que baixo), permitimos o uso mas mostramos aviso se < minBalance
    // Mas para o bloqueio real visual, só bloqueamos se for <= 0
    return wallet.balance <= 0;
  }, [wallet, minBalance, user, isGuest, restaurant?.unlimitedCredit]);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>(Array.isArray(managerData?.transactions) ? managerData.transactions : []);
  const [activePixPayment, setActivePixPayment] = useState<PixPayment | null>(null);
  const [isGeneratingPix, setIsGeneratingPix] = useState(false);
  const [isRecharging, setIsRecharging] = useState(false);
  const [rechargeTab, setRechargeTab] = useState<'credit' | 'subscription'>('credit');
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [isSavingItem, setIsSavingItem] = useState(false);
  const [pixError, setPixError] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [masterKey, setMasterKey] = useState('');
  const [isMasterAuthenticated, setIsMasterAuthenticated] = useState(true);
  const [billingDate, setBillingDate] = useState(new Date().toISOString().split('T')[0]);
  const [billingRange, setBillingRange] = useState<'today' | 'yesterday' | 'custom'>('today');
  const [showLowCreditModal, setShowLowCreditModal] = useState(false);
  const [hasDismissedLowCreditModal, setHasDismissedLowCreditModal] = useState(() => {
    return localStorage.getItem('hasDismissedLowCreditModal') === 'true';
  });

  const dismissLowCreditModal = (recharge = false) => {
    setShowLowCreditModal(false);
    setHasDismissedLowCreditModal(true);
    localStorage.setItem('hasDismissedLowCreditModal', 'true');
    if (recharge) setIsRecharging(true);
  };
  const [isActivationModalOpen, setIsActivationModalOpen] = useState(false);
  const [activationType, setActivationType] = useState<'overlay' | 'volume'>('overlay');
  const [isDeletingAccountModalOpen, setIsDeletingAccountModalOpen] = useState(false);

  const billingRef = useRef<HTMLDivElement>(null);
  const [usbDevice, setUsbDevice] = useState<any>(null);
  const [bluetoothDevices, setBluetoothDevices] = useState<any[]>([]);
  const [isScanningBluetooth, setIsScanningBluetooth] = useState(false);
  const [isConnectingBluetooth, setIsConnectingBluetooth] = useState(false);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);

  const [splitPayHistory, setSplitPayHistory] = useState<SplitPayHistory[]>([]);
  const [isEditingSplitPay, setIsEditingSplitPay] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [spPixKey, setSpPixKey] = useState('');
  const [spPixType, setSpPixType] = useState<'cpf' | 'cnpj' | 'email' | 'phone' | 'random'>('cpf');
  const [galleryTarget, setGalleryTarget] = useState<'item' | 'popup' | 'banner' | 'restaurant'>('item');
  const [isAssigningEmployees, setIsAssigningEmployees] = useState<string | null>(null);
  const [newEmployeeName, setNewEmployeeName] = useState('');
  
  const [tableActions, setTableActions] = useState<any[]>([]);
  const [activeTableAction, setActiveTableAction] = useState<any>(null);

  useEffect(() => {
    if (!restaurant) return;
    
    const path = 'table_actions';
    const q = query(
      collection(db, path),
      where('restaurantId', '==', restaurant.id),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const actions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTableActions(actions);
      
      if (actions.length > 0) {
        // Only show popup for the newest pending action
        setActiveTableAction(actions[0]);
        playSound('order');
      }
    }, (error) => {
      console.error('Error listening to table actions:', error);
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, [restaurant]);

  const isRegistering = user && !isGuest && managerData.isPreloaded && (
    (!managerData.restaurant && !restaurant)
  );

  // Sync food items with restaurant
  useEffect(() => {
    if (!restaurant?.id) {
      setFoodItems([]);
      return;
    }

    console.log('[ManagerView] Subscribing to food_items for restaurant:', restaurant.id);
    const q = query(collection(db, 'food_items'), where('restaurantId', '==', restaurant.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FoodItem));
      console.log('[ManagerView] Received', items.length, 'food items.');
      setFoodItems(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'food_items');
    });

    return () => unsubscribe();
  }, [restaurant?.id]);

  useEffect(() => {
    const hasTriggered = localStorage.getItem('manager_permission_triggered');
    if (!hasTriggered) {
      // Trigger permission check when entering ManagerView
      window.dispatchEvent(new CustomEvent('trigger-permission-check'));
      localStorage.setItem('manager_permission_triggered', 'true');
    }
  }, []);

  // Mock data for guest mode
  const guestRestaurant: Restaurant = {
    id: 'guest-res',
    name: 'Restaurante Exemplo (Visitante)',
    description: 'Este é um restaurante de demonstração para visitantes.',
    imageUrl: 'https://picsum.photos/seed/guest/800/600',
    whatsapp: '(69) 99999-0000',
    openingHours: '09:00',
    closingHours: '21:00',
    status: 'active',
    ownerUid: 'guest'
  };

  const guestItems: FoodItem[] = [
    { id: '1', restaurantId: 'guest-res', name: 'Hambúrguer Gourmet', description: 'Pão brioche, blend 180g, queijo cheddar.', price: 35.90, category: 'Lanches', imageUrl: 'https://picsum.photos/seed/burger/400/400', available: true },
    { id: '2', restaurantId: 'guest-res', name: 'Batata Frita', description: 'Porção individual crocante.', price: 15.00, category: 'Acompanhamentos', imageUrl: 'https://picsum.photos/seed/fries/400/400', available: true }
  ];

  // Form states
  const [isCallingCourier, setIsCallingCourier] = useState(false);
  const lastKnownCouriers = useRef<Record<string, any>>({});
  const [courierSticky, setCourierSticky] = useState<Record<string, boolean>>({});
  const callingOrders = useRef<Set<string>>(new Set());
  const [vehicleType, setVehicleType] = useState<'motorcycle' | 'car'>('motorcycle');
  const [deliveryMethod, setDeliveryMethod] = useState<'tupa' | 'own'>('tupa');
  const [showTupaCategories, setShowTupaCategories] = useState<string | null>(null);
  const [showEmpresaLink, setShowEmpresaLink] = useState<string | null>(null);

  const [searchParams] = useSearchParams();
  const [showTutorial, setShowTutorial] = useState(false);
  const [activeChatOrderId, setActiveChatOrderId] = useState<string | null>(null);
  const [isConfirmingOnline, setIsConfirmingOnline] = useState(false);
  const [isEditingDelivery, setIsEditingDelivery] = useState(false);
  const [delFeeType, setDelFeeType] = useState<'km' | 'free' | 'fixed'>('km');
  const [delFeePerKm, setDelFeePerKm] = useState('0');
  const [delFreeKm, setDelFreeKm] = useState('0');
  const [delIsFree, setDelIsFree] = useState(false);
  const [resMinOrderValue, setResMinOrderValue] = useState('0');
  const [showDeliveryNotification, setShowDeliveryNotification] = useState(false);

  const handleConfirmActivity = async () => {
    if (!restaurant) return;
    
    try {
      const updateData: any = {
        updatedAt: serverTimestamp(),
        status: 'active',
        forceClosed: false // Explicitly clear any manual closure
      };

      await updateDoc(doc(db, 'restaurants', restaurant.id), updateData);
      console.log("[Manager] Restaurant is now ONLINE (Manual Override).");
      setIsConfirmingOnline(false); // Close the confirmation modal automatically
    } catch (error) {
      console.error("Error setting restaurant online:", error);
    }
  };

  const handleDisconnect = async () => {
    if (!restaurant) return;
    try {
      await updateDoc(doc(db, 'restaurants', restaurant.id), {
        status: 'paused',
        forceClosed: true, // Mark as manually closed
        updatedAt: serverTimestamp()
      });
      console.log("[Manager] Restaurant is now OFFLINE (Manual Override).");
    } catch (error) {
      console.error("Error setting restaurant offline:", error);
    }
  };

  useEffect(() => {
    if (restaurant && activeTab === 'orders') {
      if (!restaurant.deliveryConfigured) {
        setShowDeliveryNotification(true);
        if (!isEditingDelivery) {
          setDelFeeType(restaurant?.deliveryFeeType || 'km');
          setDelFeePerKm(restaurant?.deliveryFeePerKm?.toString() || '0');
          setDelFreeKm(restaurant?.freeDeliveryKm?.toString() || '0');
          setDelIsFree(restaurant?.isDeliveryFree || false);
          setIsEditingDelivery(true);
        }
      } else {
        setShowDeliveryNotification(false);
      }
    }
  }, [restaurant?.deliveryConfigured, activeTab, isEditingDelivery]);

  const handleSaveDelivery = async () => {
    if (!restaurant) return;
    try {
      await updateDoc(doc(db, 'restaurants', restaurant.id), {
        deliveryConfigured: true,
        deliveryFeeType: delFeeType,
        deliveryFeePerKm: parseFloat(delFeePerKm),
        freeDeliveryKm: parseFloat(delFreeKm),
        isDeliveryFree: delIsFree
      });
      setIsEditingDelivery(false);
      setShowDeliveryNotification(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `restaurants/${restaurant.id}`);
    }
  };
  const [orderForCourierSelection, setOrderForCourierSelection] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get('tutorial') === 'true') {
      setShowTutorial(true);
    }
  }, [searchParams]);

  const dismissStepTutorial = () => {
    setShowStepTutorial(false);
    if (user) {
      localStorage.setItem(`hasSeenStepTutorial_${user.uid}`, 'true');
    }
  };

  const handleAuthModalClose = () => {
    setIsAuthModalOpen(false);
    if (!user && !isGuest) {
      navigate('/');
    }
  };

  const handleFinishTutorial = () => {
    setShowTutorial(false);
    if (!user || isGuest) {
      setIsAuthModalOpen(true);
    }
  };

  const handleDeleteAccountConfirmed = async () => {
    if (!user || isGuest) return;
    
    try {
      // 1. If has restaurant, delete it and its products
      if (restaurant) {
        // Delete products
        const productsQuery = query(collection(db, 'food_items'), where('restaurantId', '==', restaurant.id));
        const productsSnapshot = await getDocs(productsQuery);
        const delPromises = productsSnapshot.docs.map(d => deleteDoc(doc(db, 'food_items', d.id)));
        await Promise.all(delPromises);

        // Delete restaurant
        await deleteDoc(doc(db, 'restaurants', restaurant.id));
        
        // Update branch count if needed
        if (restaurant.branchId) {
          try {
            await updateDoc(doc(db, 'branches', restaurant.branchId), {
              total_restaurantes: increment(-1)
            });
          } catch (e) {
            console.warn('Could not update branch count:', e);
          }
        }
      }

      // 2. Delete wallet
      if (wallet) {
        await deleteDoc(doc(db, 'wallets', wallet.id));
      }

      // 3. Delete user profile
      await deleteDoc(doc(db, 'users', user.uid));

      // 4. Sign out and redirect
      await signOut();
      navigate('/');
      setIsDeletingAccountModalOpen(false);
      alert('Sua conta e todos os dados vinculados foram excluídos com sucesso.');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}`);
    }
  };

  useEffect(() => {
    const requestManagerPermissions = async () => {
      try {
        // Request Bluetooth
        if ('bluetooth' in navigator) {
          await (navigator as any).bluetooth.getAvailability();
        }
        
        // Request USB
        if ('usb' in navigator) {
          await (navigator as any).usb.getDevices();
        }
      } catch (err) {
        console.warn("Manager permissions (Bluetooth/USB) denied or not available:", err);
      }
    };

    requestManagerPermissions();
  }, []);

  // Auto-detect city based on GPS during registration or if missing
  const [isDetectingCity, setIsDetectingCity] = useState(false);
  useEffect(() => {
    if (user && !isGuest && !resCity) {
      const detectCity = async (lat: number, lon: number) => {
        setIsDetectingCity(true);
        setResLat(lat);
        setResLon(lon);
        try {
          const response = await fetch(`/api/geocode?lat=${lat}&lon=${lon}`);
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          const data = await response.json();
          
          if (data && data.address) {
            const cityName = data.address.city || data.address.town || data.address.village || data.address.state || 'Localização Detectada';
            setResCity(cityName);
            
            if (commonData.cities.length > 0) {
              // Normalize names for better matching
              const normalize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
              const normalizedDetected = normalize(cityName);
              
              const matchedCity = commonData.cities.find((c: any) => normalize(c.name) === normalizedDetected);
              
              if (matchedCity) {
                setResCityId(matchedCity.id);
                console.log(`[ManagerView] Auto-detected city matching registered city: ${matchedCity.name}`);
              }
            }
          }
        } catch (error) {
          console.error("[ManagerView] Error auto-detecting city:", error);
        } finally {
          setIsDetectingCity(false);
        }
      };

      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            detectCity(latitude, longitude);
          },
          (error) => {
            console.warn("[ManagerView] Geolocation denied for city detection:", error);
            setIsDetectingCity(false);
          },
          { timeout: 10000, enableHighAccuracy: true }
        );
      }
    }
  }, [user, isGuest, commonData.cities, resCity]);

  const renderDeliveryNotification = () => (
    <AnimatePresence>
      {showDeliveryNotification && (
        <motion.div 
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] w-[90%] max-w-md"
        >
          <div className="bg-orange-500 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between border-2 border-orange-400">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-2 rounded-xl">
                <ShieldAlert size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest leading-tight">Ação Necessária</p>
                <p className="text-xs font-bold">Configure o valor da entrega para continuar</p>
              </div>
            </div>
            <button 
              onClick={() => {
                setDelFeeType(restaurant?.deliveryFeeType || 'km');
                setDelFeePerKm(restaurant?.deliveryFeePerKm?.toString() || '0');
                setDelFreeKm(restaurant?.freeDeliveryKm?.toString() || '0');
                setDelIsFree(restaurant?.isDeliveryFree || false);
                setIsEditingDelivery(true);
              }}
              className="bg-white text-orange-500 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-50 transition-colors"
            >
              Configurar
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const renderDeliveryConfigModal = () => (
    <AnimatePresence>
      {isEditingDelivery && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => restaurant?.deliveryConfigured && setIsEditingDelivery(false)}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
          >
            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                    <Bike size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tighter italic text-blue-gradient">Configurar Entrega</h3>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Defina como cobrará o frete</p>
                  </div>
                </div>
                {restaurant?.deliveryConfigured && (
                  <button onClick={() => setIsEditingDelivery(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                    <X size={24} />
                  </button>
                )}
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <button 
                    onClick={() => setDelFeeType('km')}
                    className={`p-3 rounded-2xl border-2 text-center transition-all ${delFeeType === 'km' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-400'}`}
                  >
                    <p className="text-[10px] font-black uppercase tracking-widest">Por KM</p>
                  </button>
                  <button 
                    onClick={() => setDelFeeType('fixed')}
                    className={`p-3 rounded-2xl border-2 text-center transition-all ${delFeeType === 'fixed' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-400'}`}
                  >
                    <p className="text-[10px] font-black uppercase tracking-widest">Fixo</p>
                  </button>
                  <button 
                    onClick={() => setDelFeeType('free')}
                    className={`p-3 rounded-2xl border-2 text-center transition-all ${delFeeType === 'free' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-400'}`}
                  >
                    <p className="text-[10px] font-black uppercase tracking-widest">Grátis</p>
                  </button>
                </div>

                {delFeeType === 'km' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Valor por KM (R$)</label>
                      <input 
                        type="number"
                        inputMode="decimal"
                        value={delFeePerKm}
                        onChange={(e) => setDelFeePerKm(e.target.value)}
                        className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all"
                        placeholder="Ex: 2.50"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">KM Grátis até</label>
                      <input 
                        type="number"
                        inputMode="decimal"
                        value={delFreeKm}
                        onChange={(e) => setDelFreeKm(e.target.value)}
                        className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all"
                        placeholder="Ex: 2"
                      />
                    </div>
                  </div>
                )}

                {delFeeType === 'fixed' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Valor Fixo (R$)</label>
                    <input 
                      type="number"
                      inputMode="decimal"
                      value={delFeePerKm}
                      onChange={(e) => setDelFeePerKm(e.target.value)}
                      className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all"
                      placeholder="Ex: 7.00"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                      <DollarSign size={16} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Entrega Grátis</p>
                      <p className="text-[8px] text-slate-400">Ativar para todos os pedidos</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setDelIsFree(!delIsFree)}
                    className={`w-12 h-6 rounded-full transition-all relative ${delIsFree ? 'bg-emerald-500' : 'bg-slate-300'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${delIsFree ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>
              </div>

              <button 
                onClick={handleSaveDelivery}
                className="w-full bg-blue-gradient text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Salvar Configurações
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  const renderLowCreditModal = () => (
    <AnimatePresence>
      {showLowCreditModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => dismissLowCreditModal()}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
          >
            <div className="p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-red-500 text-white rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-red-500/20 animate-bounce">
                <ShieldAlert size={40} />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black uppercase tracking-tight italic text-red-600 dark:text-red-400">Saldo Insuficiente</h3>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                  Seu saldo de crédito está abaixo do limite de <strong>R$ {minBalance.toFixed(2).replace('.', ',')}</strong>. Devido a isso, você pode visualizar os pedidos, mas não poderá aceitá-los até adicionar novos créditos.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => dismissLowCreditModal(true)}
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                >
                  <CreditCard size={18} />
                  <span>Adicionar Créditos Agora</span>
                </button>
                <button 
                  onClick={() => dismissLowCreditModal()}
                  className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  Voltar
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  const renderTutorialOverlay = () => {
    const steps = [
      {
        title: "1. O Pedido Chega",
        description: "Assim que um cliente faz um pedido, você recebe uma notificação sonora e visual instantânea na sua aba de pedidos.",
        icon: <ClipboardList size={48} className="text-blue-500" />,
        color: "bg-blue-50"
      },
      {
        title: "2. Preparação",
        description: "Você aceita o pedido e começa a preparar. O cliente consegue ver em tempo real que você já está cuidando de tudo!",
        icon: <Utensils size={48} className="text-orange-500" />,
        color: "bg-orange-50"
      },
      {
        title: "3. Escolha do Entregador",
        description: "Quando estiver quase pronto, você solicita um entregador. O sistema busca o mais próximo ou você pode escolher um de sua confiança.",
        icon: <Bike size={48} className="text-emerald-500" />,
        color: "bg-emerald-50"
      }
    ];

    return (
      <AnimatePresence>
        {showTutorial && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTutorial(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-2xl relative z-10 flex flex-col"
            >
              <div className="p-8 md:p-12 space-y-8">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter italic text-blue-600">Tutorial de Gestão</h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Aprenda como funciona o processo</p>
                  </div>
                  <button 
                    onClick={handleFinishTutorial}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="relative overflow-hidden">
                  <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${tutorialStep * 100}%)` }}>
                    {steps.map((step, idx) => (
                      <div key={`tutorial-step-${idx}`} className="w-full flex-shrink-0 space-y-8">
                        <div className={`w-24 h-24 ${step.color} rounded-3xl flex items-center justify-center mx-auto shadow-inner`}>
                          {step.icon}
                        </div>
                        <div className="text-center space-y-4 px-4">
                          <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight italic">{step.title}</h3>
                          <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-md mx-auto">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4">
                  <div className="flex space-x-2">
                    {steps.map((_, idx) => (
                      <div 
                        key={`tutorial-dot-${idx}`}
                        className={`h-1.5 rounded-full transition-all duration-300 ${idx === tutorialStep ? 'w-8 bg-blue-600' : 'w-2 bg-slate-200 dark:bg-slate-800'}`}
                      />
                    ))}
                  </div>
                  <div className="flex space-x-4">
                    {tutorialStep > 0 && (
                      <button 
                        onClick={() => setTutorialStep(prev => prev - 1)}
                        className="p-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl hover:scale-110 transition-transform"
                      >
                        <ChevronLeft size={20} />
                      </button>
                    )}
                    {tutorialStep < steps.length - 1 ? (
                      <button 
                        onClick={() => setTutorialStep(prev => prev + 1)}
                        className="p-4 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20 hover:scale-110 transition-transform"
                      >
                        <ChevronRight size={20} />
                      </button>
                    ) : (
                      <button 
                        onClick={handleFinishTutorial}
                        className="bg-emerald-500 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all"
                      >
                        Começar Agora
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Visual Arrows indicating flow */}
              <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 flex justify-between px-4 pointer-events-none opacity-20">
                {tutorialStep > 0 && <ChevronLeft size={48} className="animate-pulse" />}
                {tutorialStep < steps.length - 1 && <ChevronRight size={48} className="animate-pulse" />}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    );
  };

  const handlePurchaseHighlight = async () => {
    if (!selectedProductForHighlight || !highlightDays || !restaurant || !wallet || !globalSettings) return;
    
    const days = parseInt(highlightDays);
    const dailyCost = globalSettings.highlightDailyCost || 7;
    const totalCost = days * dailyCost;

    if (wallet.balance < totalCost) {
      alert(`Saldo insuficiente! Você precisa de R$ ${totalCost.toFixed(2)} para ativar este destaque.`);
      return;
    }

    setIsProcessingHighlight(true);
    try {
      // 1. Deduct from wallet
      await updateDoc(doc(db, 'wallets', wallet.id), {
        balance: wallet.balance - totalCost,
        updatedAt: serverTimestamp()
      });

      // 2. Record transaction
      await addDoc(collection(db, 'wallet_transactions'), {
        walletId: wallet.id,
        ownerUid: user?.uid,
        restaurantId: restaurant?.id,
        restaurantName: restaurant?.name,
        branchId: restaurant?.branchId || '',
        cityId: restaurant?.cityId || restaurant?.city || '',
        cityName: restaurant?.city || '',
        type: 'deduction',
        amount: totalCost,
        description: `Destaque de produto: ${foodItems.find(i => i.id === selectedProductForHighlight)?.name} por ${days} dias`,
        createdAt: serverTimestamp(),
        timestamp: serverTimestamp(),
        date: new Date().toISOString().split('T')[0]
      });

      // 3. Update product highlight
      const highlightUntil = new Date();
      highlightUntil.setDate(highlightUntil.getDate() + days);
      
      await updateDoc(doc(db, 'food_items', selectedProductForHighlight), {
        highlightUntil: highlightUntil
      });
      
      alert('Destaque ativado com sucesso!');
      setIsPaidTrafficModalOpen(false);
      setSelectedProductForHighlight('');
      setHighlightDays('1');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'food_items');
    } finally {
      setIsProcessingHighlight(false);
    }
  };

  const renderPaidTrafficModal = () => (
    <AnimatePresence>
      {isPaidTrafficModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsPaidTrafficModalOpen(false)}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[3rem] overflow-hidden shadow-2xl relative z-10 p-8 space-y-6"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-2xl font-black uppercase tracking-tighter italic text-blue-600">Ativar Destaque</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aumente a visibilidade do seu produto</p>
              </div>
              <button onClick={() => setIsPaidTrafficModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Selecione o Produto</label>
                <select 
                  value={selectedProductForHighlight}
                  onChange={e => setSelectedProductForHighlight(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">Escolha um produto...</option>
                  {foodItems.map((item, idx) => (
                    <option key={`${item.id}-${idx}`} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Quantidade de Dias</label>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setHighlightDays(prev => Math.max(1, parseInt(prev) - 1).toString())}
                    className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                  >
                    <Minus size={20} />
                  </button>
                  <input 
                    type="number"
                    value={highlightDays}
                    onChange={e => setHighlightDays(e.target.value)}
                    className="flex-1 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-center font-black text-lg focus:ring-2 focus:ring-blue-500/20"
                  />
                  <button 
                    onClick={() => setHighlightDays(prev => (parseInt(prev) + 1).toString())}
                    className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-[2rem] space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Valor por dia</span>
                  <span className="font-black text-blue-700 dark:text-blue-300">R$ {(globalSettings?.highlightDailyCost || 7).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-blue-100 dark:border-blue-800">
                  <span className="text-xs font-black uppercase tracking-widest text-blue-800 dark:text-blue-200">Total a Pagar</span>
                  <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
                    R$ {(parseInt(highlightDays || '0') * (globalSettings?.highlightDailyCost || 7)).toFixed(2)}
                  </span>
                </div>
              </div>

              <button 
                onClick={handlePurchaseHighlight}
                disabled={!selectedProductForHighlight || isProcessingHighlight}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isProcessingHighlight ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <>
                    <CreditCard size={16} />
                    Confirmar e Pagar
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  const renderWalletHistoryModal = () => (
    <AnimatePresence>
      {isWalletHistoryOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsWalletHistoryOpen(false)}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-2xl relative z-10 p-8 flex flex-col max-h-[80vh]"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="space-y-1">
                <h3 className="text-2xl font-black uppercase tracking-tighter italic text-blue-600">Histórico da Carteira</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Acompanhe suas recargas e deduções</p>
              </div>
              <button onClick={() => setIsWalletHistoryOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
              {walletTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 opacity-40">
                  <History size={48} className="mb-4" />
                  <p className="text-sm font-black uppercase tracking-widest">Nenhuma transação encontrada</p>
                </div>
              ) : (
                walletTransactions.map((tx, idx) => (
                <div key={`wallet-tx-${tx.id || idx}-${idx}`} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'recharge' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {tx.type === 'recharge' ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-tight dark:text-white">{tx.description || (tx.type === 'recharge' ? 'Recarga de Crédito' : 'Dedução de Crédito')}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          {safeFormatDate(tx.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-black ${tx.type === 'recharge' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {tx.type === 'recharge' ? '+' : '-'} R$ {tx.amount.toFixed(2)}
                      </p>
                      {tx.method && (
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">{tx.method === 'pix' ? 'PIX' : 'Manual'}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  const getMinutesPassed = (createdAt: any) => {
    const date = safeGetDate(createdAt);
    if (!date) return 0;
    const diff = Math.floor((new Date().getTime() - date.getTime()) / 60000);
    return diff;
  };

  useEffect(() => {
    if (!orders.length) return;
    // This useEffect was redundant and causing audio glitches
  }, [orders.length, user?.uid]);

  // Machine API Status Polling
  useEffect(() => {
    if (!rides.length || !cityData) return;

    const activeMachineRides = rides.filter(r => 
      r.machineRequestId && 
      !['completed', 'cancelled'].includes(r.status) &&
      r.restaurantId === restaurant?.id
    );

    if (activeMachineRides.length === 0) return;

    const pollInterval = setInterval(async () => {
      for (const ride of activeMachineRides) {
        try {
          const response = await axios.get('/api/machine/solicitacaoStatus', {
            params: {
              cityId: cityData.id,
              apiUrl: cityData.apiUrl,
              apiKey: cityData.apiKey,
              authEmail: cityData.authEmail,
              authPassword: cityData.authPassword,
              id_mch: ride.machineRequestId
            }
          });

          if (response.data.success && response.data.response) {
            const apiStatus = response.data.response.status; // D, G, P, A, E, F, C, N
            
            // Map Machine API status to our status
            let newStatus: Ride['status'] = ride.status;
            let courierDetails: any = {};

            // Mapping:
            // D = Distribuindo -> searching
            // G = Aguardando aceite -> pending_acceptance
            // P = Pendente -> searching (or pending)
            // A = Aceita -> accepted
            // E = Em andamento -> en_route
            // F = Finalizada -> completed
            // C = Cancelada -> cancelled
            // N = Não atendida -> cancelled (or unfulfilled)
            
            const statusStr = String(apiStatus).toUpperCase();
            
            if (statusStr === 'D' || statusStr === 'P') {
              newStatus = 'searching';
            } else if (statusStr === 'G') {
              newStatus = 'pending_acceptance';
            } else if (statusStr === 'A') {
              newStatus = 'accepted';
            } else if (statusStr === 'E') {
              newStatus = 'en_route';
            } else if (statusStr === 'F') {
              newStatus = 'completed';
            } else if (statusStr === 'C' || statusStr === 'N') {
              newStatus = 'cancelled';
            }

            // If status is A, E or F, we might want to get more details (driver name etc)
            // We'll need the 'id' (not id_mch) which we can try searching for in /api/machine/solicitacao
            if (['accepted', 'pending_acceptance', 'en_route', 'completed'].includes(newStatus) && !ride.courierName) {
              try {
                 const listResp = await axios.get('/api/machine/solicitacao', {
                   params: {
                     cityId: cityData.id,
                     apiUrl: cityData.apiUrl,
                     apiKey: cityData.apiKey,
                     authEmail: cityData.authEmail,
                     authPassword: cityData.authPassword
                   }
                 });
                 
                 if (listResp.data.success && listResp.data.response) {
                   const matchingReq = listResp.data.response.find((r: any) => String(r.id_mch) === String(ride.machineRequestId) || r.id === ride.machineRequestId);
                   if (matchingReq && matchingReq.id) {
                     // Now get specific details using Step 4
                     const detailResp = await axios.get('/api/machine/rideDetails', {
                       params: {
                         apiUrl: cityData.apiUrl,
                         apiKey: cityData.apiKey,
                         authEmail: cityData.authEmail,
                         authPassword: cityData.authPassword,
                         id: matchingReq.id
                       }
                     });
                     
                     if (detailResp.data && detailResp.data.driver) {
                       courierDetails = {
                         courierName: detailResp.data.driver.name,
                         courierWhatsapp: detailResp.data.driver.phone,
                         courierVehicle: detailResp.data.driver.vehicle || 'Moto',
                         courierPlate: detailResp.data.driver.plate || '',
                         courierPhoto: detailResp.data.driver.photo || ''
                       };
                     }
                   }
                 }
              } catch (detailError) {
                console.warn("Error fetching extra ride details:", detailError);
              }
            }

            if (newStatus !== ride.status || (courierDetails.courierName && !ride.courierName)) {
              // Also clear searching state if found via background poll
              const orderId = ride.orderId || (ride.destinations && ride.destinations[0]?.orderId);
              if (orderId && ['accepted', 'en_route', 'completed'].includes(newStatus)) {
                setSearchingForCourier(prev => ({ ...prev, [orderId]: false }));
              }

              await updateDoc(doc(db, 'rides', ride.id), {
                status: newStatus,
                ...courierDetails,
                updatedAt: serverTimestamp()
              });

              // If ride is completed/cancelled, also update order status if needed
              if (newStatus === 'completed' || newStatus === 'cancelled') {
                const destinations = ride.destinations || [];
                // If destinations is empty, try to use orderId at root
                const orderIds = destinations.length > 0 ? destinations.map((d: any) => d.orderId) : [ride.orderId];
                
                for (const orderId of orderIds.filter(Boolean)) {
                  const orderRef = doc(db, 'orders', orderId);
                  const newOrderStatus = newStatus === 'completed' ? 'delivered' : 'cancelled';
                  
                  // Check current status to avoid redundant updates
                  const orderSnap = await getDoc(orderRef);
                  if (orderSnap.exists() && orderSnap.data().status !== newOrderStatus) {
                    await updateDoc(orderRef, { 
                      status: newOrderStatus,
                      updatedAt: serverTimestamp()
                    });
                    console.log(`[Sync] Updated order ${orderId} to ${newOrderStatus} based on ride ${ride.id}`);
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error("Polling error for ride", ride.id, error);
        }
      }
    }, 4000); // Polling faster (4s) for driver acceptance monitoring
    
    return () => clearInterval(pollInterval);
  }, [rides, cityData, restaurant?.id]);

  useEffect(() => {
    if (!restaurant?.city) {
      setCityData(null);
      return;
    }

    const q = query(collection(db, 'cities'), where('name', '==', restaurant.city));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setCityData({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as City);
      } else {
        setCityData(null);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'cities');
    });

    return () => unsubscribe();
  }, [restaurant?.city]);

  useEffect(() => {
    const fetchCategoriesFromApi = async () => {
      // PROMPT REQUIREMENT: Initial load from static cityData if available (instantly show replicated categories)
      if (cityData?.categories && cityData.categories.length > 0) {
        const initialMapped = cityData.categories.map((c: any, idx: number) => ({
          id: c.id || c.nome || `cat-init-${idx}`,
          nome: c.nome || 'Categoria',
          preco: 0
        }));
        setApiCategories(initialMapped);
      } else {
        setApiCategories([]);
      }
      
      // Only proceed with API calls if we have triggers and enough config
      if ((!showTupaCategories && !orderForCourierSelection) || !cityData?.apiKey) {
        return;
      }
      
      // If integration is DISABLED in Firestore, we stop here (but we already set the static list if it existed)
      if (!cityData?.integrationActive) {
        return;
      }
      
      setIsLoadingCategories(true);
      setCategoryMode(null);
      try {
        // Find the actual order object to get coordinates and value
        const currentOrderId = showTupaCategories || orderForCourierSelection;
        const currentOrder = orders.find(o => o.id === currentOrderId);
        
        // Mode 1: Multicategory Estimates (Preferential)
        const hasDest = currentOrder?.customerLocation?.latitude && currentOrder?.customerLocation?.longitude;
        const canEstimate = (restaurant?.latitude && restaurant?.longitude);

        if (hasDest && canEstimate) {
          try {
            const response = await axios.get('/api/machine/estimativas', {
              params: {
                cityId: cityData.id,
                lat_partida: restaurant?.latitude,
                lng_partida: restaurant?.longitude,
                lat_desejado: currentOrder.customerLocation.latitude,
                lng_desejado: currentOrder.customerLocation.longitude
              }
            });

            const categorias = response.data.categorias;
            
            if (Array.isArray(categorias) && categorias.length > 0) {
              const mapped = categorias.map((c: any, cIdx: number) => ({
                id: `cat-mode1-${cIdx}-${c.id || c.categoria_id || 'no-id'}`,
                nome: c.categoria_nome || c.nome || 'Categoria',
                preco: Number(c.valor_total || c.estimativa_valor || c.valor || c.preco || 0),
                distancia: Number(c.estimativa_distancia || c.distancia || c.km || c.km_distancia || 0)
              }));
              setApiCategories(mapped);
              setCategoryMode('mode1');
              setIsLoadingCategories(false);
              return;
            }
          } catch (mode1Error) {
            console.warn("Mode 1 (Estimates) failed, falling back to Mode 2:", mode1Error);
          }
        }

        // Mode 2: Simple Categories List (Fallback)
        const response = await axios.get('/api/machine/categorias', {
          params: { cityId: cityData.id }
        });

        if (response.data.success) {
          const categoriesData = response.data.categorias || response.data.response || [];
          const mapped = categoriesData.map((c: any, cIdx: number) => ({
            id: `cat-mode2-${cIdx}-${c.id || 'no-id'}`,
            nome: c.categoria_nome || c.nome || 'Categoria',
            preco: Number(c.valor_total || c.estimativa_valor || c.preco || c.valor || 0)
          }));
          setApiCategories(mapped);
          setCategoryMode('mode2');
        } else {
          console.error("[ManagerView] Categories fetch success=false:", response.data);
          // Fallback to Firestore categories if API fails
          if (cityData.categories && cityData.categories.length > 0) {
            console.warn("API Mode 2 success=false, keeping Firestore categories.");
          }
        }
      } catch (error) {
        console.error("Fetch categories execution error:", error);
      } finally {
        setIsLoadingCategories(false);
      }
    };

    fetchCategoriesFromApi();
  }, [showTupaCategories, orderForCourierSelection, cityData, restaurant, orders]);

  const parsePhone = (phone: string) => {
    if (!phone) return { codigo_pais: '55', codigo_area: '69', telefone: '' };
    
    // 1. Remover todos os caracteres não numéricos
    const clean = phone.replace(/\D/g, '');
    
    // 2. Se o número começar com "55", remover
    const semPais = clean.startsWith('55') ? clean.slice(2) : clean;

    // 3. Separar corretamente: codigo_area (2 dígitos) e telefone (restante)
    const ddd = semPais.slice(0, 2) || '69';
    const numero = semPais.slice(2) || '';

    return {
      codigo_pais: '55',
      codigo_area: ddd,
      telefone: numero
    };
  };

  const handleCallCourier = async (singleOrderId: string, selectedCategoryId?: string | number, selectedCategoryName?: string, selectedPrice?: number, selectedDistance?: number) => {
    if (callingOrders.current.has(singleOrderId)) {
      console.warn(`[TaxiMachine] Chamada já em curso para o pedido ${singleOrderId}. Ignorando duplicata.`);
      return;
    }
    callingOrders.current.add(singleOrderId);
    
    console.log(`[TaxiMachine] Dispatch trigger for order: ${singleOrderId}`, { catId: selectedCategoryId, catName: selectedCategoryName, price: selectedPrice, distance: selectedDistance });
    
    // 1. SET UI STATE IMMEDIATELY - THIS IS PRIORITY FOR ANIMATION
    setSearchingForCourier(prev => ({ ...prev, [singleOrderId]: true }));
    setNoCourierFound(prev => ({ ...prev, [singleOrderId]: false }));
    setCategoryLoading(prev => ({ ...prev, [singleOrderId]: selectedCategoryName || selectedCategoryId || 'Entrega' }));
    setIsCallingCourier(true);
    setOrderForCourierSelection(null);
    setShowTupaCategories(null);

    if (!restaurant) {
      console.error("[Manager] Restaurant data missing");
      setSearchingForCourier(prev => ({ ...prev, [singleOrderId]: false }));
      setIsCallingCourier(false);
      return;
    }
    
    if (!cityData) {
      alert("Aguarde o carregamento dos dados da cidade...");
      setSearchingForCourier(prev => ({ ...prev, [singleOrderId]: false }));
      setIsCallingCourier(false);
      return;
    }
    
    if (!cityData.integrationActive) {
      alert(`Integração desativada para ${cityData.name}`);
      setSearchingForCourier(prev => ({ ...prev, [singleOrderId]: false }));
      setIsCallingCourier(false);
      return;
    }

    try {
      const order = orders.find(o => o.id === singleOrderId);
      if (!order) {
        throw new Error("Pedido não encontrado na lista.");
      }

      // 1. Obter Localização do "Ponto de Partida" (Empresa)
      // Prioridade absoluta para as coordenadas cadastradas no restaurante como solicitado pelo usuário
      let currentLat = restaurant.latitude;
      let currentLng = restaurant.longitude;

      // Se o restaurante NÃO tiver coordenadas, tenta GPS (managerLocation) ou Padrão da Cidade
      if (!currentLat || !currentLng) {
        if (managerLocation) {
          currentLat = managerLocation.latitude;
          currentLng = managerLocation.longitude;
          console.log("[Manager] Localização obtida via GPS em tempo real (managerLocation):", currentLat, currentLng);
        } else {
          alert("Localização da loja não capturada (GPS indisponível e sem coordenadas fixas). Por favor, habilite o GPS ou cadastre as coordenadas nas configurações.");
          setSearchingForCourier(prev => ({ ...prev, [singleOrderId]: false }));
          setIsCallingCourier(false);
          return;
        }
      }

      // 2. Preparar dados
      const restaurantPhone = parsePhone(restaurant.whatsapp || '69999999999');
      const customerPhone = parsePhone(
        (order as any).customerPhone || 
        (order as any).customerWhatsapp || 
        (order as any).phone || 
        (order as any).customer?.phone || 
        (order as any).customer?.whatsapp ||
        ''
      );

      const itemNamesList = order.items.map(item => `${item.quantity}x ${item.name}`).join(', ');
      const currentTimeStr = new Date().toLocaleTimeString('pt-BR');

      const customerPhoneStr = `${customerPhone.codigo_area}${customerPhone.telefone}`;
      const referencePoint = (order as any).deliveryReferencePoint || (order as any).referencePoint || '';

      // REGRAS DO USUÁRIO (API TUPÃ):
      // - dados_cadastro deve ser objeto com codigo_pais, codigo_area e telefone
      // - Não usar 'observacao', mas sim 'info_antes_aceite' e 'info_apos_aceite'
      const dispatchData: any = {
        dados_cadastro: customerPhone,
        dados_passageiro: {
          ...customerPhone,
          nome: order.customerName || 'Cliente'
        },
        forma_pagamento: 'D',
        valor_total: order.total || 0,
        info_antes_aceite: `HORA: ${currentTimeStr} | PRODUTOS: ${itemNamesList}`,
        info_apos_aceite: `CLIENTE: ${order.customerName || 'Nao informado'} | PEDIDO #${order.id.slice(-6).toUpperCase()} | CONTATO: ${customerPhoneStr}${referencePoint ? `\nPONTO DE REFERÊNCIA: ${referencePoint}` : ''}`,
        partida: {
          endereco: restaurant.address || `${restaurant.name} - ${restaurant.city}`,
          bairro: restaurant.neighborhood || 'Centro',
          cidade: restaurant.city || cityData.name || 'Porto Velho',
          estado: cityData.state || 'RO',
          lat: currentLat,
          lng: currentLng
        },
        desejado: {
          endereco: order.deliveryAddress,
          bairro: (order as any).neighborhood || 'Bairro',
          cidade: restaurant.city || cityData.name || 'Porto Velho',
          estado: cityData.state || 'RO',
          lat: order.customerLocation?.latitude || (cityData.lat ? cityData.lat + 0.01 : -8.7562),
          lng: order.customerLocation?.longitude || (cityData.lng ? cityData.lng + 0.01 : -63.9139)
        }
      };

      if (selectedCategoryId && Number(selectedCategoryId) > 0) {
        dispatchData.categoria_id = Number(selectedCategoryId);
      } else if (selectedCategoryName) {
        dispatchData.categoria_nome = selectedCategoryName;
      }

      console.log("[TaxiMachine] Abrindo solicitação organizada...", dispatchData);
      
      const metadata = {
        restaurantId: restaurant.id,
        restaurantName: (restaurant.name && restaurant.name !== 'NOME' && restaurant.name !== 'Usuário') ? restaurant.name : (globalSettings?.appName || 'Empresa'),
        orderId: order.id,
        customerUids: [order.customerUid],
        categoryName: selectedCategoryName || 'Entrega',
        estimatedCost: selectedPrice || 0,
        estimatedDistance: selectedDistance || 0,
        customerAddress: {
          street: (order as any).street || order.deliveryAddress?.split(',')[0]?.trim() || '',
          number: (order as any).number || '',
          neighborhood: (order as any).neighborhood || 'Centro',
          city: (order as any).city || restaurant.city || cityData.name || 'Porto Velho',
          state: cityData.state || 'RO',
          referencePoint: (order as any).deliveryReferencePoint || (order as any).referencePoint || ''
        },
        destinations: [{
          orderId: order.id,
          customerName: order.customerName || 'Cliente',
          customerUid: order.customerUid,
          address: order.deliveryAddress,
          referencePoint: (order as any).deliveryReferencePoint || (order as any).referencePoint || ''
        }]
      };

      let response;
      try {
        response = await axios.post('/api/machine/dispatch', {
          cityId: cityData.id,
          dispatchData,
          metadata
        });

        // Some systems might return success: false with 200 for validation errors
        if (!response.data.success && (response.data.status === 400 || response.data.error?.includes('400') || response.data.message?.toLowerCase().includes('invalida'))) {
          throw { response: { status: 400, data: response.data } };
        }
      } catch (error: any) {
        const apiErrors = error.response?.data?.errors;
        const errorMsg = (apiErrors && apiErrors.length > 0) 
          ? apiErrors[0].message 
          : (error.response?.data?.error || error.message || '');

        // Se for erro de "Sem motoristas", não adianta tentar "Heavy Correction", pois o problema não é o dado
        if (errorMsg.includes("motoristas disponíveis") || errorMsg.includes("motoristas por perto")) {
          throw error; 
        }

        if (error.response?.status === 400 || error.status === 400) {
          console.warn("[TaxiMachine] Erro 400 (Bad Request). Aplicando auto-correção pesada e re-tentando...");
          const errorDetail = error.response?.data ? JSON.stringify(error.response.data) : 'Sem detalhes';
          console.error("[TaxiMachine] Detalhe do Erro 400:", errorDetail);
          
          // Auto-fix dispatch data
          const fixedData = { ...dispatchData };
          
          // Defaults from city config or coordinates
          const defaultLat = cityData.lat || -8.7612; 
          const defaultLng = cityData.lng || -63.9039;

          // Fix Origin (Partida)
          if (!fixedData.partida.lat) fixedData.partida.lat = defaultLat;
          if (!fixedData.partida.lng) fixedData.partida.lng = defaultLng;
          if (!fixedData.partida.endereco) fixedData.partida.endereco = restaurant.address || `${cityData.name}, ${cityData.state || 'RO'}`;

          // Fix Destination (Desejado)
          if (!fixedData.desejado.lat) fixedData.desejado.lat = defaultLat + 0.005; // Pequeno offset se faltar tudo
          if (!fixedData.desejado.lng) fixedData.desejado.lng = defaultLng + 0.005;
          if (!fixedData.desejado.endereco) fixedData.desejado.endereco = order.deliveryAddress || `Entrega em ${cityData.name}`;

          // Force state and basic payment
          fixedData.partida.estado = cityData.state || 'RO';
          fixedData.desejado.estado = cityData.state || 'RO';
          fixedData.forma_pagamento = 'D'; // Forçar dinheiro no retry também

          // Check if categoria_id is mandatory - if still missing, try to find a default
          if (!fixedData.categoria_id && !fixedData.categoria_nome) {
            fixedData.categoria_nome = 'Entrega';
          }

          console.log("[TaxiMachine] Re-enviando CORREÇÃO FINAL:", fixedData);

          response = await axios.post('/api/machine/dispatch', {
            cityId: cityData.id,
            dispatchData: fixedData,
            metadata
          });
        } else {
          throw error;
        }
      }

      if (response.data.success) {
        const id_mch = response.data.response?.id_mch;
        const internalRideId = response.data.internalRideId;
        console.log("[TaxiMachine] Solicitação aberta com ID:", id_mch, "Internal ID:", internalRideId);
        
        // Update the order with the chosen delivery fee and category
        try {
          const oldFee = order.deliveryFee || 0;
          const newFee = selectedPrice || oldFee;
          const newTotal = order.total - oldFee + newFee;

          await updateDoc(doc(db, 'orders', order.id), {
            deliveryFee: newFee,
            tupaCategory: selectedCategoryName || 'XÔ FOME',
            total: newTotal,
            updatedAt: serverTimestamp()
          });
        } catch (e) {
          handleFirestoreError(e, OperationType.UPDATE, `orders/${order.id}`);
          console.warn("Failed to update order with Tupa details", e);
        }

        // Start polling for status using the backend-created ID
        if (internalRideId) {
          // Explicitly save the estimated values chosen by the manager
          if (selectedPrice || selectedDistance) {
            updateDoc(doc(db, 'rides', internalRideId), {
              estimatedCost: selectedPrice || 0,
              estimatedDistance: selectedDistance || 0
            }).catch(e => console.warn("Failed to update extra ride info", e));
          }
          setSearchingForCourier(prev => ({ ...prev, [singleOrderId]: false }));
          startPollingRideStatus(order.id, id_mch, internalRideId);
        } else {
          // Fallback if backend didn't return ID (shouldn't happen with new logic)
          console.warn("[TaxiMachine] No internalRideId returned from server. Creating manual stub...");
          const rideRef = await addDoc(collection(db, 'rides'), {
            restaurantId: restaurant.id,
            machineRequestId: id_mch,
            orderId: order.id,
            status: 'searching',
            estimatedCost: selectedPrice || 0,
            estimatedDistance: selectedDistance || 0,
            createdAt: serverTimestamp()
          });
          setSearchingForCourier(prev => ({ ...prev, [singleOrderId]: false }));
          startPollingRideStatus(order.id, id_mch, rideRef.id);
        }
        
      } else {
        const apiErrors = response.data.errors;
        const errorMsg = (apiErrors && apiErrors.length > 0) 
          ? apiErrors[0].message 
          : (response.data.error || response.data.message || 'Erro desconhecido');
        
        if (errorMsg.includes("motoristas disponíveis") || errorMsg.includes("motoristas por perto")) {
          setNoCourierFound(prev => ({ ...prev, [singleOrderId]: true }));
          setShowNoCourierPopup(true);
        } else {
          alert(`Erro na integração: ${errorMsg}`);
        }
        setCategoryLoading(prev => ({ ...prev, [singleOrderId]: null }));
        setSearchingForCourier(prev => ({ ...prev, [singleOrderId]: false }));
      }

    } catch (error: any) {
      console.error("[TaxiMachine] Erro no despacho:", error);
      const apiErrors = error.response?.data?.errors;
      const errorMsg = (apiErrors && apiErrors.length > 0) 
        ? apiErrors[0].message 
        : (error.response?.data?.error || error.message);
      
      if (errorMsg.includes("motoristas disponíveis") || errorMsg.includes("motoristas por perto")) {
        setNoCourierFound(prev => ({ ...prev, [singleOrderId]: true }));
        setShowNoCourierPopup(true);
      } else {
        alert(`Erro ao chamar entregador: ${errorMsg}`);
      }
      setCategoryLoading(prev => ({ ...prev, [singleOrderId]: null }));
      setSearchingForCourier(prev => ({ ...prev, [singleOrderId]: false }));
    } finally {
      setIsCallingCourier(false);
      callingOrders.current.delete(singleOrderId);
    }
  };

  const startPollingRideStatus = (orderId: string, id_mch: string, rideFirestoreId: string) => {
    console.log(`[TaxiMachine] Iniciando monitoramento da corrida ${id_mch} (Intervalo: 2s)...`);
    
    const pollInterval = setInterval(async () => {
      if (!cityData) return clearInterval(pollInterval);
      
      try {
        // 0. Check if order or city data still relevant
        if (!cityData || !orderId) return clearInterval(pollInterval);

        // 1. Check if ride was cancelled or deleted locally first
        const rideSnap = await getDoc(doc(db, 'rides', rideFirestoreId));
        if (!rideSnap.exists()) {
          console.warn(`[TaxiMachine] Corrida ${rideFirestoreId} não encontrada no Firestore. Parando polling.`);
          return clearInterval(pollInterval);
        }
        
        if (rideSnap.data().status === 'cancelled') {
          console.log(`[TaxiMachine] Corrida ${id_mch} cancelada no Firestore. Parando polling.`);
          setSearchingForCourier(prev => ({ ...prev, [orderId]: false }));
          return clearInterval(pollInterval);
        }

        // 1. Check Status
        // Constant endpoint: /api/machine/solicitacaoStatus
        const statusRes = await axios.get('/api/machine/solicitacaoStatus', {
          params: {
            cityId: cityData.id,
            id_mch: id_mch
          }
        });

          if (statusRes.data.success) {
            const statusData = statusRes.data.response || statusRes.data;
            const status = String(statusData.status || statusData.resStatus || '').toUpperCase();
            console.log(`[TaxiMachine] Status da corrida ${id_mch}: ${status}`);

            let newStatus = '';
            if (status === 'A') newStatus = 'accepted';
            if (status === 'E') newStatus = 'en_route';
            if (status === 'F') newStatus = 'completed';
            if (status === 'C' || status === 'N') newStatus = 'cancelled';
            if (status === 'G') newStatus = 'pending_acceptance';

            // If it's a state that should stop the "Searching" UI
            if (['A', 'E', 'F', 'C', 'N', 'G'].includes(status)) {
              console.log(`[TaxiMachine] Transição detectada: ${status} -> ${newStatus}`);
              
              // 1. Update status in Firestore immediately so UI updates
              const rideRef = doc(db, 'rides', rideFirestoreId);
              await updateDoc(rideRef, { 
                status: newStatus || 'accepted',
                updatedAt: serverTimestamp()
              });

              // Stop local loading state immediately
              setSearchingForCourier(prev => ({ ...prev, [orderId]: false }));
              setCategoryLoading(prev => ({ ...prev, [orderId]: null }));

              // 2. If Accepted, get driver details
              if (status === 'A' || status === 'E' || status === 'F') {
                try {
                  console.log(`[TaxiMachine] Buscando detalhes do condutor...`);
                  const detailsRes = await axios.get('/api/machine/solicitacao', { params: { cityId: cityData.id, id_mch } });
                  const rawData = detailsRes.data.response || detailsRes.data;
                  const driver = Array.isArray(rawData) ? rawData[0] : rawData;

                   if (driver) {
                     const courierInfo = {
                       courierName: driver.nome_condutor || driver.condutor_nome || driver.nome || driver.name || driver.condutor?.nome || '',
                       courierWhatsapp: driver.telefone_condutor || driver.condutor_telefone || driver.telefone || driver.phone || driver.celular || driver.condutor?.telefone || '',
                       courierVehicle: driver.veiculo_modelo || driver.veiculo || driver.veiculo_nome || driver.veiculo_doc || driver.condutor?.veiculo || '',
                       courierPlate: driver.placa_veiculo || driver.veiculo_placa || driver.plate || driver.veiculo_prefixo || driver.placa || driver.condutor?.placa || '',
                       courierPhoto: driver.condutor_foto || driver.foto_condutor || driver.foto || driver.photo || driver.foto_url || driver.condutor?.foto || '',
                       courierId: driver.condutor_id || driver.id || driver.id_condutor || driver.condutor?.id || ''
                     };

                  await updateDoc(rideRef, {
                    ...courierInfo,
                    updatedAt: serverTimestamp()
                  });

                  // Update order as well
                  const orderRef = doc(db, 'orders', orderId);
                  await updateDoc(orderRef, {
                    status: status === 'F' ? 'delivered' : 'delivering',
                    courierName: courierInfo.courierName,
                    courierInfo: {
                      name: courierInfo.courierName,
                      phone: courierInfo.courierWhatsapp,
                      vehicle: courierInfo.courierVehicle,
                      plate: courierInfo.courierPlate,
                      photo: courierInfo.courierPhoto
                    },
                    updatedAt: serverTimestamp()
                  });
                }
              } catch (detailsErr) {
                console.warn("[TaxiMachine] Falha ao obter detalhes do condutor:", detailsErr);
              }
            }

            // After 'A', 'F', 'C', 'N', we can stop polling in frontend as server.ts handles the rest or it's terminal
            if (['A', 'F', 'C', 'N', 'E'].includes(status)) {
               console.log(`[TaxiMachine] Loop de polling encerrado para status: ${status}`);
               clearInterval(pollInterval);
            }
          }
        }
      } catch (error) {
        console.error("[TaxiMachine] Erro no monitoramento (polling):", error);
      }
    }, 15000); // Polling every 15 seconds to avoid 429 errors (coordinated with backend)
  };

  const cancelRideLogic = async (orderId: string, rideId?: string, isOrderAlreadyUpdating = false) => {
    setIsCancelling(true);
    try {
      let ridesToCancel = [];
      if (rideId) {
        const r = rides.find(r => r.id === rideId);
        if (r) ridesToCancel.push(r);
      } else {
        // Find all non-terminal rides for this order
        // TaxiMachine Terminal Statuses: F (Finalizada), C (Cancelada), N (Não atendida)
        // Our Mapping: F -> completed, C/N -> cancelled
        ridesToCancel = rides.filter(r => 
          (r.orderId === orderId || r.destinations?.some(d => d.orderId === orderId)) && 
          !['completed', 'cancelled', 'rejected', 'delivered'].includes(r.status)
        );
      }

      if (ridesToCancel.length === 0) {
        console.warn(`[TaxiMachine] Nenhuma corrida ativa para cancelar (Order: ${orderId}). Status da API: F, C ou N já podem ter sido atingidos.`);
      }

      for (const rideToCancel of ridesToCancel) {
        // machineRequestId is usually the id_mch
        const idMch = rideToCancel.machineRequestId || rideToCancel.id_mch;
        
        if (idMch && cityData) {
          try {
            console.log(`[TaxiMachine] Enviando comando de cancelamento para ID: ${idMch}...`);
            // Call Real API to cancel
            const cancelRes = await axios.post('/api/machine/cancelar', {
              apiUrl: cityData.apiUrl,
              apiKey: cityData.apiKey,
              authEmail: cityData.authEmail,
              authPassword: cityData.authPassword,
              id_mch: String(idMch), // Ensure string format
              motivo_id: '1'
            });
            console.log(`[TaxiMachine] Resposta da API de cancelamento (${idMch}):`, cancelRes.data);
          } catch (apiErr: any) {
            console.error(`[TaxiMachine] Falha no cancelamento da API (${idMch}):`, apiErr.response?.data || apiErr.message);
            // We continue anyway to sync local state
          }
        } else if (!idMch) {
          console.warn(`[TaxiMachine] Corrida ${rideToCancel.id} não possui id_mch vinculado para cancelamento remoto.`);
        }

        // Always update local status to cancelled in Firestore
        await updateDoc(doc(db, 'rides', rideToCancel.id), { 
          status: 'cancelled',
          updatedAt: serverTimestamp() 
        });
        console.log(`[TaxiMachine] Corrida ${rideToCancel.id} marcada como cancelada localmente.`);
      }
      
      // Update the order back to 'ready' if it was in a delivery state
      const order = orders.find(o => o.id === orderId);
      if (order && (['delivering', 'en_route', 'delivery'].includes(order.status) || (order as any).deliveryMethod === 'tupa' || (order as any).courierAssigned)) {
        await updateDoc(doc(db, 'orders', orderId), {
          status: 'ready',
          deliveryMethod: null,
          courierInfo: null,
          courierName: null,
          courierUid: null,
          courierWhatsapp: null,
          courierAssigned: false,
          courierPhoto: null,
          courierVehicle: null,
          courierPlate: null,
          courierColor: null,
          updatedAt: serverTimestamp()
        });
      }
      
      setSearchingForCourier(prev => ({ ...prev, [orderId]: false }));
      setSelectedCourierDetails(null);
      setCategoryLoading(prev => ({ ...prev, [orderId]: null }));
      setCourierSticky(prev => ({ ...prev, [orderId]: false }));
      // Clear persistent memory for this specific order
      if (lastKnownCouriers.current[orderId]) {
        delete lastKnownCouriers.current[orderId];
      }
      return true;
    } catch (error: any) {
      console.error("Error in cancelRideLogic:", error);
      throw error;
    } finally {
      setIsCancelling(false);
    }
  };

  const handleCancelRide = async (orderId: string, rideId?: string, skipConfirm = false) => {
    if (!skipConfirm && !window.confirm('Tem certeza que deseja cancelar esta corrida na TUPÃ?')) return false;
    try {
      await cancelRideLogic(orderId, rideId);
      if (!skipConfirm) alert('Corrida cancelada com sucesso!');
      return true;
    } catch (error: any) {
      if (!skipConfirm) alert(`Erro ao cancelar: ${error.response?.data?.error || error.message}`);
      return false;
    }
  };

  const shareLocationWhatsApp = (order: Order) => {
    const mapsUrl = order.customerLocation?.latitude && order.customerLocation?.longitude && order.customerLocation.latitude !== 0 && order.customerLocation.longitude !== 0
      ? `https://www.google.com/maps?q=${order.customerLocation.latitude},${order.customerLocation.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.deliveryAddress)}`;
    
    const itemsList = order.items.map(item => `• ${item.quantity}x ${item.name}`).join('\n');
    const customerWhatsapp = (order as any).customerWhatsapp || 'Não informado';
    
    const message = `Olá! Aqui está a localização para entrega 🚚📍\n\n👤 Cliente: ${order.customerName || 'Não informado'}\n📱 WhatsApp do cliente: ${customerWhatsapp} (caso precise falar com o cliente)\n\n🧾 Pedido: #${order.id}\n🍽️ Itens do pedido:\n${itemsList}\n\n📍 Endereço: ${order.deliveryAddress || 'Não informado'}\n\n🗺️ Abrir no Google Maps:\n${mapsUrl}\n\n✅ Boa entrega! Qualquer dúvida, entre em contato com o cliente pelo WhatsApp. 💬🚀`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const [isAddingManualOrder, setIsAddingManualOrder] = useState(false);
  const [manualOrderItems, setManualOrderItems] = useState<{id: string, name: string, price: number, quantity: number}[]>([]);
  const [manualOrderCustomerName, setManualOrderCustomerName] = useState('');
  const [manualOrderAddress, setManualOrderAddress] = useState('');
  const [manualOrderPaymentMethod, setManualOrderPaymentMethod] = useState<'pix' | 'card' | 'cash'>('cash');

  const handleCreateManualOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant || !user) return;
    if (manualOrderItems.length === 0) {
      alert('Adicione pelo menos um item ao pedido.');
      return;
    }

    try {
      const total = manualOrderItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
      const orderData = {
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        customerUid: user.uid,
        customerName: manualOrderCustomerName || 'Pedido Manual',
        items: manualOrderItems,
        total,
        status: 'pending',
        deliveryAddress: manualOrderAddress || 'Retirada no Balcão',
        paymentMethod: manualOrderPaymentMethod,
        createdAt: serverTimestamp(),
        isManual: true
      };

      await addDoc(collection(db, 'orders'), orderData);
      alert('Pedido manual criado com sucesso!');
      setIsAddingManualOrder(false);
      setManualOrderItems([]);
      setManualOrderCustomerName('');
      setManualOrderAddress('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'orders');
    }
  };

  const addManualItem = (item: FoodItem) => {
    setManualOrderItems(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { id: item.id, name: item.name, price: item.promoPrice || item.price, quantity: 1 }];
    });
  };

  const removeManualItem = (id: string) => {
    setManualOrderItems(prev => prev.filter(i => i.id !== id));
  };

  const [activeOrderPix, setActiveOrderPix] = useState<any>(null);

  const [itemName, setItemName] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemPromoPrice, setItemPromoPrice] = useState('');
  const [itemIsFlash, setItemIsFlash] = useState(false);
  const [itemIsFreeDelivery, setItemIsFreeDelivery] = useState(false);
  const [itemCat, setItemCat] = useState('');
  const [itemImg, setItemImg] = useState('');
  const [itemVideoUrl, setItemVideoUrl] = useState('');
  const [itemStock, setItemStock] = useState<string>('');
  const [itemAvailableFrom, setItemAvailableFrom] = useState<string>('');
  const [itemAvailableUntil, setItemAvailableUntil] = useState<string>('');
  const [itemAvailable, setItemAvailable] = useState<boolean>(true);
  const [itemPreparationTime, setItemPreparationTime] = useState('');
  const [itemMaxAddOns, setItemMaxAddOns] = useState('');
  const [showAvailability, setShowAvailability] = useState(true);
  const [itemAvailability, setItemAvailability] = useState<ProductAvailability>({
    monday: { active: true, startTime: '00:00', endTime: '23:59' },
    tuesday: { active: true, startTime: '00:00', endTime: '23:59' },
    wednesday: { active: true, startTime: '00:00', endTime: '23:59' },
    thursday: { active: true, startTime: '00:00', endTime: '23:59' },
    friday: { active: true, startTime: '00:00', endTime: '23:59' },
    saturday: { active: true, startTime: '00:00', endTime: '23:59' },
    sunday: { active: true, startTime: '00:00', endTime: '23:59' },
  });

  const [isPaidTrafficModalOpen, setIsPaidTrafficModalOpen] = useState(false);
  const [isWalletHistoryOpen, setIsWalletHistoryOpen] = useState(false);

  useEffect(() => {
    if (isWalletHistoryOpen) {
      refreshWallet();
    }
  }, [isWalletHistoryOpen, refreshWallet]);
  const [selectedProductForHighlight, setSelectedProductForHighlight] = useState<string>('');
  const [highlightDays, setHighlightDays] = useState('1');
  const [isProcessingHighlight, setIsProcessingHighlight] = useState(false);

  const [printerName, setPrinterName] = useState('');
  const [printerType, setPrinterType] = useState<'escpos'>('escpos');
  const [printerConnection, setPrinterConnection] = useState<'network' | 'usb' | 'bluetooth'>('network');
  const [printerIp, setPrinterIp] = useState('');
  const [printerPort, setPrinterPort] = useState('9100');
  const [printerPaperSize, setPrinterPaperSize] = useState<'58mm' | '80mm'>('80mm');
  const [printerActive, setPrinterActive] = useState(true);
  const [printerAutoPrint, setPrinterAutoPrint] = useState(true);

  const handleSavePrinter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant || !user) return;

    try {
      const printerData: any = {
        restaurantId: restaurant.id,
        name: printerName,
        type: printerType,
        connection: printerConnection,
        ip: printerIp,
        port: parseInt(printerPort),
        paperSize: printerPaperSize,
        active: printerActive,
        autoPrint: printerAutoPrint,
        createdAt: serverTimestamp()
      };

      // Optimistic update
      if (editingPrinter) {
        const optimisticPrinter = { ...editingPrinter, ...printerData, createdAt: editingPrinter.createdAt };
        setPrinters(prev => prev.map(p => p.id === editingPrinter.id ? optimisticPrinter : p));
        await updateDoc(doc(db, 'printers', editingPrinter.id), printerData);
      } else {
        const tempId = 'temp-' + Date.now();
        const optimisticPrinter = { id: tempId, ...printerData, createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } };
        setPrinters(prev => [optimisticPrinter, ...prev]);
        await addDoc(collection(db, 'printers'), printerData);
      }

      setIsAddingPrinter(false);
      setEditingPrinter(null);
      setPrinterName('');
      setPrinterIp('');
      setPrinterPort('9100');
      setPrinterActive(true);
      setPrinterAutoPrint(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'printers');
    }
  };

  const handleDeletePrinter = async (id: string) => {
    // Removed window.confirm as it's blocked in iframes
    setDeletingItemId(id);
    const previousPrinters = [...printers];
    setPrinters(prev => prev.filter(p => p.id !== id));
    try {
      await deleteDoc(doc(db, 'printers', id));
    } catch (error) {
      setPrinters(previousPrinters);
      handleFirestoreError(error, OperationType.DELETE, `printers/${id}`);
    } finally {
      setDeletingItemId(null);
    }
  };

  const generateEscPosOrderFrontend = (order: any, paperSize: string = "80mm") => {
    const esc = "\x1B";
    const gs = "\x1D";
    const lineFeed = "\n";
    
    let commands = "";
    
    // Initialize
    commands += esc + "@";
    
    // Center alignment
    commands += esc + "a" + "\x01";
    
    // Double height and width for title
    commands += gs + "!" + "\x11";
    commands += `PEDIDO #${order.id.slice(-6).toUpperCase()}${lineFeed}`;
    
    // Reset text size
    commands += gs + "!" + "\x00";
    commands += `--------------------------------${lineFeed}`;
    
    // Left alignment
    commands += esc + "a" + "\x00";
    
    commands += `Cliente: ${order.customerName || "Nao informado"}${lineFeed}`;
    if (order.customerPhone) {
      commands += `Tel: ${order.customerPhone}${lineFeed}`;
    }
    commands += `Data: ${new Date().toLocaleString("pt-BR")}${lineFeed}`;
    commands += `--------------------------------${lineFeed}`;
    
    commands += `ITENS DO PEDIDO:${lineFeed}`;
    order.items.forEach((item: any) => {
      const qty = item.quantity.toString().padStart(2, "0");
      commands += `${qty}x ${item.name}${lineFeed}`;
      if (item.notes) {
        commands += `   Obs: ${item.notes}${lineFeed}`;
      }
      if (item.addOns && item.addOns.length > 0) {
        item.addOns.forEach((addon: any) => {
          commands += `   + ${addon.name}${lineFeed}`;
        });
      }
    });
    
    commands += `--------------------------------${lineFeed}`;
    
    if (order.notes) {
      commands += `OBSERVACOES:${lineFeed}`;
      commands += `${order.notes}${lineFeed}`;
      commands += `--------------------------------${lineFeed}`;
    }
    
    commands += `ENDERECO DE ENTREGA:${lineFeed}`;
    commands += `${order.deliveryAddress}${lineFeed}`;
    commands += `--------------------------------${lineFeed}`;
    
    commands += `PAGAMENTO: ${order.paymentMethod?.toUpperCase() || "PIX"}${lineFeed}`;
    commands += `TOTAL: R$ ${order.total.toFixed(2)}${lineFeed}`;
    
    commands += `--------------------------------${lineFeed}`;
    commands += lineFeed + lineFeed + lineFeed;
    
    // Cut paper
    commands += gs + "V" + "\x41" + "\x03";
    
    return new TextEncoder().encode(commands);
  };

  const printEscPos = async (data: Uint8Array, printer: Printer) => {
    if (printer.connection === 'usb') {
      if (!usbDevice) {
        alert('Impressora USB não conectada.');
        return false;
      }
      try {
        await usbDevice.transferOut(1, data);
        return true;
      } catch (error) {
        console.error('USB Print error:', error);
        return false;
      }
    } else if (printer.connection === 'bluetooth') {
      // Find the connected device
      const device = bluetoothDevices.find(d => d.gatt?.connected);
      if (!device) {
        alert('Impressora Bluetooth não conectada.');
        return false;
      }
      try {
        const service = await device.gatt.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
        const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');
        await characteristic.writeValue(data);
        return true;
      } catch (error) {
        console.error('Bluetooth Print error:', error);
        return false;
      }
    }
    return false;
  };

  const handleTestPrinter = async (printer: Printer) => {
    if (isTestingPrinter) return;
    setIsTestingPrinter(true);
    try {
      if (printer.connection === 'network') {
        const response = await fetch('/api/test-print', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ip: printer.ip,
            port: printer.port,
            name: printer.name
          })
        });
        const data = await response.json();
        if (data.success) {
          alert('Comando de teste enviado com sucesso!');
        } else {
          alert('Erro ao conectar com a impressora: ' + (data.error || 'Erro desconhecido'));
        }
      } else {
        const esc = "\x1B";
        const gs = "\x1D";
        const lineFeed = "\n";
        let testCmd = esc + "@" + esc + "a" + "\x01" + `TESTE DE IMPRESSAO${lineFeed}` + `Impressora: ${printer.name}${lineFeed}` + `Conexao: ${printer.connection.toUpperCase()}${lineFeed}` + lineFeed + lineFeed + gs + "V" + "\x41" + "\x03";
        const success = await printEscPos(new TextEncoder().encode(testCmd), printer);
        if (success) alert('Teste enviado com sucesso!');
      }
    } catch (error) {
      alert('Erro ao testar impressora.');
    } finally {
      setIsTestingPrinter(false);
    }
  };

  const handlePrintOrder = async (orderId: string, orderDataObj?: Order, isAuto: boolean = false) => {
    if (!restaurant) return;
    try {
      // Check for local printers first
      const localPrinters = printers.filter(p => 
        p.active && 
        (p.connection === 'usb' || p.connection === 'bluetooth') &&
        (!isAuto || p.autoPrint)
      );
      
      if (localPrinters.length > 0) {
        const order = orderDataObj || orders.find(o => o.id === orderId);
        if (order) {
          const data = generateEscPosOrderFrontend(order);
          for (const printer of localPrinters) {
            await printEscPos(data, printer);
          }
        }
      }

      // Always notify server for network printers
      // The server will filter by autoPrint if needed, or we can pass it
      const response = await fetch('/api/print-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          restaurantId: restaurant.id,
          isAuto
        })
      });
      const data = await response.json();
      if (data.success) {
        // Silent success
      }
    } catch (error) {
      console.error('Erro ao imprimir pedido:', error);
    }
  };

  const [popupImg, setPopupImg] = useState('');
  const [popupLink, setPopupLink] = useState('');
  const [popupActive, setPopupActive] = useState(true);

  const [bannerImg, setBannerImg] = useState('');
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerActive, setBannerActive] = useState(true);
  const [bannerPosition, setBannerPosition] = useState({ x: 50, y: 50 });

  const [hasSentAccessEmail, setHasSentAccessEmail] = useState(false);
  const isInitialOrdersLoad = useRef(true);
  const prevOrdersCount = useRef(0);

  useEffect(() => {
    if (user && profile && profile.role === 'customer') {
      setRole('manager');
    }
  }, [user, profile]);

  // Pre-fill registration form with profile data for instant readiness
  useEffect(() => {
    if (user && profile && profile.role === 'customer') {
      if (!resName) setResName(profile.displayName || '');
      if (!resWhatsapp) setResWhatsapp(profile.whatsapp || '');
      if (!resImg) setResImg(profile.photoURL || '');
    }
  }, [user, profile]);

  // Sync with pre-loaded manager data
  useEffect(() => {
    if (isGuest) {
      setRestaurant(guestRestaurant);
      setFoodItems(guestItems);
      return;
    }

    if (managerData.isPreloaded) {
      const data = managerData.restaurant as Restaurant;
      if (data) {
        setRestaurant(data);
        setResName(data.name);
        setResDesc(data.description);
        setResWhatsapp(data.whatsapp || '');
        setResReferencePoint(data.referencePoint || '');
        setResOpen(data.openingHours);
        setResClose(data.closingHours);
        setResImg(data.imageUrl);
        setResCity(data.city || '');
        setResCityId(data.cityId || '');
        setResLat(data.latitude || null);
        setResLon(data.longitude || null);
        setResPixConfigType(data.pixConfigType || 'none');
        setResPixKey(data.pixKey || '');
        setResPixType(data.pixType || 'cpf');
        setResOrderSoundUrl(data.orderSoundUrl || '');
        setResMonthlyBillingEnabled(data.monthlyBillingEnabled || false);
        setResMessageSoundUrl(data.messageSoundUrl || '');
        setResAutoVolume(data.autoVolume || false);
        setResScreenOverlay(data.screenOverlay || false);
        setResForceClosed(data.forceClosed || false);
        setResMinOrderValue(String(data.minOrderValue || 0));
        if (data.weeklyHours) {
          setWeeklyHours(prev => ({ ...prev, ...data.weeklyHours }));
        }
      } else if ((profile?.photoURL || user?.photoURL) && !resImg) {
        setResImg(profile?.photoURL || user?.photoURL || '');
      }

      setPopups(Array.isArray(managerData.popups) ? managerData.popups : []);
      setBanners(Array.isArray(managerData.banners) ? managerData.banners : []);
      setFoodItems(Array.isArray(managerData.foodItems) ? managerData.foodItems : []);
      setReviews(Array.isArray(managerData.reviews) ? managerData.reviews : []);
      setRides(Array.isArray(managerData.rides) ? managerData.rides : []);
      setWallet(managerData.wallet || null);
      setWalletTransactions(Array.isArray(managerData.transactions) ? managerData.transactions : []);
      setSplitPayHistory(Array.isArray(managerData.splitPayHistory) ? managerData.splitPayHistory : []);
      setPrinters(Array.isArray(managerData.printers) ? managerData.printers : []);
    }
  }, [managerData, isGuest, profile, user]);

  // Sync with common categories
  useEffect(() => {
    if (commonData.isLoaded) {
      setCategories(commonData.categories);
    }
  }, [commonData.categories, commonData.isLoaded]);

  // Side effects for orders (auto-print, tutorials)
  useEffect(() => {
    if (!orders.length || isGuest || !restaurant) return;

    if (!isInitialOrdersLoad.current && orders.length > prevOrdersCount.current) {
      const newOrdersCount = orders.length - prevOrdersCount.current;
      const newOrders = orders.slice(0, newOrdersCount);
      
      if (restaurant.autoPrintOrders !== false) {
        newOrders.forEach(order => {
          handlePrintOrder(order.id, order, true);
        });
      }

      if (prevOrdersCount.current === 0 && user) {
        const hasSeen = localStorage.getItem(`hasSeenOrderTutorial_${user.uid}`);
        if (!hasSeen) {
          setShowTutorial(true);
          localStorage.setItem(`hasSeenOrderTutorial_${user.uid}`, 'true');
        }
      }
    }
    
    prevOrdersCount.current = orders.length;
    isInitialOrdersLoad.current = false;
  }, [orders, restaurant, isGuest, user]);

  // Side effects for food items (tutorial)
  useEffect(() => {
    if (isGuest || !user) return;
    
    if (foodItems.length === 0 && orders.length === 0 && managerData.isPreloaded) {
      const hasSeen = localStorage.getItem(`hasSeenStepTutorial_${user.uid}`);
      if (!hasSeen) setShowStepTutorial(true);
    } else {
      setShowStepTutorial(false);
    }
  }, [foodItems.length, orders.length, managerData.isPreloaded, isGuest, user]);

  // Wallet creation fallback
  useEffect(() => {
    if (managerData.isPreloaded && !managerData.wallet && user && !isGuest) {
      setDoc(doc(db, 'wallets', user.uid), {
        ownerUid: user.uid,
        balance: 0,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      }, { merge: true }).catch(err => handleFirestoreError(err, OperationType.CREATE, 'wallets'));
    }
  }, [managerData.isPreloaded, managerData.wallet, user, isGuest]);

  // Low credit notification upon entry
  useEffect(() => {
    // Only show if:
    // 1. Data is preloaded
    // 2. Wallet exists
    // 3. Restaurant exists (not in registration phase)
    // 4. Not an admin (admins don't pay)
    // 5. Not a guest
    if (managerData.isPreloaded && wallet && restaurant && !isAdmin && !isGuest) {
      // Use the component-level minBalance defined at line 583
      
      // If balance is high, reset dismissal state so it can show again later if it drops
      if (wallet.balance >= minBalance && hasDismissedLowCreditModal) {
        setHasDismissedLowCreditModal(false);
        localStorage.removeItem('hasDismissedLowCreditModal');
      }

      // Show modal if balance is low and not already shown/dismissed
      if (wallet.balance < minBalance && !showLowCreditModal && !hasDismissedLowCreditModal) {
        setShowLowCreditModal(true);
      }
    }
  }, [managerData.isPreloaded, wallet, restaurant, isAdmin, isGuest, globalSettings?.minWalletBalance, hasDismissedLowCreditModal, showLowCreditModal]);

  const handleCreateRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreating) return;
    setIsCreating(true);
    setFormError(null);
    if (!user || !profile) {
      setIsCreating(false);
      return;
    }
    
      // Comprehensive Validation
      const validations = [
        { condition: !resName.trim(), message: 'Por favor, preencha o nome do restaurante.', id: 'resNameCreate' },
        { condition: !resWhatsapp.trim(), message: 'Por favor, informe o WhatsApp da empresa.', id: 'resWhatsappCreate' },
        { condition: !resDesc.trim(), message: 'Por favor, adicione uma descrição para o restaurante.', id: 'resDescCreate' },
        { condition: !resOpen, message: 'Por favor, informe o horário de abertura geral.', id: 'resOpenCreate' },
        { condition: !resClose, message: 'Por favor, informe o horário de fechamento geral.', id: 'resCloseCreate' },
        { condition: resAcceptedPayments.length === 0, message: 'Por favor, selecione ao menos uma forma de pagamento aceita.', id: 'resPaymentMethodsCreate' },
      ];

    const firstError = validations.find(v => v.condition);

    if (firstError) {
      setFormError(firstError.message);
      setIsCreating(false);
      const element = document.getElementById(firstError.id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.focus();
      }
      return;
    }

    if (profile.role === 'customer') {
      try {
        await setRole('manager');
      } catch (e) {
        console.error("Error setting role to manager:", e);
        setFormError('Erro ao preparar seu perfil. Tente novamente.');
        setIsCreating(false);
        return;
      }
    } else if (profile.role !== 'manager' && profile.role !== 'admin') {
      setFormError('Acesso negado. Você não tem permissão para criar empresas.');
      setIsCreating(false);
      return;
    }
    
    try {
      let resolvedCityId = resCityId;
      let resolvedCity = resCity;

      if (!resolvedCityId || !resolvedCity) {
        if (resLat != null && resLon != null && commonData.cities && commonData.cities.length > 0) {
          let closestCity: any = null;
          let minDistance = Infinity;
          for (const city of commonData.cities) {
            const cLat = city.latitude != null ? city.latitude : city.lat;
            const cLng = city.longitude != null ? city.longitude : city.lng;
            if (cLat != null && cLng != null && !isNaN(cLat) && !isNaN(cLng)) {
              const distance = Math.sqrt(Math.pow(cLat - resLat, 2) + Math.pow(cLng - resLon, 2));
              if (distance < minDistance) {
                minDistance = distance;
                closestCity = city;
              }
            }
          }
          if (closestCity) {
            resolvedCityId = closestCity.id;
            resolvedCity = closestCity.name;
            console.log(`[RestaurantAutoCity] Resolved restaurant city during creation to ${resolvedCity} (ID: ${resolvedCityId}) based on GPS coordinates (${resLat}, ${resLon})`);
          }
        }
      }

      const newRestaurantData = {
        name: resName,
        description: resDesc,
        whatsapp: resWhatsapp,
        modality: resModality,
        referencePoint: resReferencePoint,
        city: resolvedCity,
        cityId: resolvedCityId,
        latitude: resLat,
        longitude: resLon,
        openingHours: resOpen,
        closingHours: resClose,
        weeklyHours: weeklyHours,
        imageUrl: resImg || '',
        logoUrl: resImg || '',
        pixConfigType: resPixConfigType,
        pixKey: resPixKey,
        pixType: resPixType,
        pixReceiver: resPixReceiver,
        orderSoundUrl: resOrderSoundUrl,
        messageSoundUrl: resMessageSoundUrl,
        autoVolume: resAutoVolume,
        autoPrintOrders: resAutoPrintOrders,
        screenOverlay: resScreenOverlay,
        monthlyBillingEnabled: resMonthlyBillingEnabled,
        deliveryFeeType: delFeeType,
        deliveryFeePerKm: parseFloat(delFeePerKm) || 0,
        deliveryFreeKm: parseFloat(delFreeKm) || 0,
        minOrderValue: parseFloat(resMinOrderValue) || 0,
        deliveryConfigured: true,
        status: 'active',
        ownerUid: user.uid,
        acceptedPaymentMethods: resAcceptedPayments,
        createdAt: serverTimestamp()
      };

      // Generate ID first for optimistic update
      const docRef = doc(collection(db, 'restaurants'));
      
      const resWithId = {
        id: docRef.id,
        id_v3: docRef.id,
        ...newRestaurantData
      };

      // Optimistic update to enter dashboard immediately
      setRestaurant({ 
        ...resWithId,
        createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as any
      } as Restaurant);
      
      setIsEditingRestaurant(false);
      setIsCreating(false);

      // Perform write
      await setDoc(docRef, resWithId);

      // Link restaurant to user profile and ensure manager role
      if (user?.uid) {
        await updateDoc(doc(db, 'users', user.uid), {
          restaurantId: docRef.id,
          role: 'manager'
        });
      }

    } catch (error) {
      console.error("Error creating restaurant:", error);
      handleFirestoreError(error, OperationType.CREATE, 'restaurants');
      setIsCreating(false);
    }
  };

  useEffect(() => {
    if (finalizingOrderId) {
      // Small delay to ensure the button is rendered
      setTimeout(() => {
        const element = document.getElementById(`confirm-finalize-${finalizingOrderId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }
  }, [finalizingOrderId]);

  const [isOrderAlarmPlaying, setIsOrderAlarmPlaying] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const alarmRef = useRef<HTMLAudioElement | null>(null);

  // Notification Permission Request
  useEffect(() => {
    if (profile?.role === 'manager' || profile?.role === 'admin') {
      if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'default') {
        window.Notification.requestPermission();
      }
    }
  }, [profile]);

  // Persistent Order Alarm Logic
  useEffect(() => {
    const pendingOrders = orders.filter(o => o.status === 'pending');
    if (pendingOrders.length > 0) {
      if (!isOrderAlarmPlaying) {
        setIsOrderAlarmPlaying(true);
        playSound('order', true, restaurant?.orderSoundUrl, restaurant?.autoVolume);
        
        // Browser Notification
        if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'granted' && document.hidden) {
          try {
            new window.Notification('Novo Pedido!', {
              body: `Você tem ${pendingOrders.length} pedido(s) pendente(s).`,
              icon: restaurant?.imageUrl || '/logo.png',
              tag: 'new-order'
            });
          } catch (err) {
            console.warn('Could not display notification:', err);
          }
        }
      }
    } else {
      if (isOrderAlarmPlaying) {
        setIsOrderAlarmPlaying(false);
        stopOrderAlarm();
      }
    }
  }, [orders, isOrderAlarmPlaying, restaurant?.orderSoundUrl, restaurant?.imageUrl]);

  // Unread Messages Logic - Refined to match CustomerView robustness
  const messageUnsubsRef = useRef<Record<string, () => void>>({});
  const isInitialMessagesLoad = useRef(true);

  useEffect(() => {
    if (!user || profile?.role !== 'manager') {
      Object.values(messageUnsubsRef.current).forEach((unsub) => {
        if (typeof unsub === 'function') unsub();
      });
      messageUnsubsRef.current = {};
      return;
    }

    const orderIds = orders.map(o => o.id);
    
    // Subscribe to new orders
    orderIds.forEach(orderId => {
      if (!messageUnsubsRef.current[orderId]) {
        const messagesRef = collection(db, 'orders', orderId, 'messages');
        const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(20));
        
        messageUnsubsRef.current[orderId] = onSnapshot(q, (snapshot) => {
          const newMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
          if (activeChatOrderId !== orderId) {
            // Count messages not from the manager
            const unread = newMessages.filter(m => m.senderUid !== user.uid).length;
            if (unread > 0 && !isInitialMessagesLoad.current) {
              playSound('message', false, restaurant?.messageSoundUrl, restaurant?.autoVolume);
            }
            setUnreadCounts(prev => ({ ...prev, [orderId]: unread }));
          } else {
            setUnreadCounts(prev => ({ ...prev, [orderId]: 0 }));
          }
        }, (err) => {
          if (err.code === 'permission-denied') return;
          handleFirestoreError(err, OperationType.LIST, `orders/${orderId}/messages`);
        });
      }
    });

    // Unsubscribe from orders no longer in list
    Object.keys(messageUnsubsRef.current).forEach(orderId => {
      if (!orderIds.includes(orderId)) {
        const unsub = messageUnsubsRef.current[orderId];
        if (typeof unsub === 'function') unsub();
        delete messageUnsubsRef.current[orderId];
        setUnreadCounts(prev => {
          const next = { ...prev };
          delete next[orderId];
          return next;
        });
      }
    });

    isInitialMessagesLoad.current = false;
    return () => {
      // We don't unsub everything on every re-render, only when user leaves or order is removed
    };
  }, [orders.length, activeChatOrderId, user?.uid, restaurant?.messageSoundUrl]);

  const handleUpdateRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;
    
    if (!resName || !resDesc) {
      const firstError = !resName ? 'resNameUpdate' : 'resDescUpdate';
      document.getElementById(firstError)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      document.getElementById(firstError)?.focus();
      return;
    }

    try {
      let resolvedCityId = resCityId;
      let resolvedCity = resCity;

      if (!resolvedCityId || !resolvedCity) {
        if (resLat != null && resLon != null && commonData.cities && commonData.cities.length > 0) {
          let closestCity: any = null;
          let minDistance = Infinity;
          for (const city of commonData.cities) {
            const cLat = city.latitude != null ? city.latitude : city.lat;
            const cLng = city.longitude != null ? city.longitude : city.lng;
            if (cLat != null && cLng != null && !isNaN(cLat) && !isNaN(cLng)) {
              const distance = Math.sqrt(Math.pow(cLat - resLat, 2) + Math.pow(cLng - resLon, 2));
              if (distance < minDistance) {
                minDistance = distance;
                closestCity = city;
              }
            }
          }
          if (closestCity) {
            resolvedCityId = closestCity.id;
            resolvedCity = closestCity.name;
            console.log(`[RestaurantAutoCity] Resolved restaurant city during update to ${resolvedCity} (ID: ${resolvedCityId}) based on GPS coordinates (${resLat}, ${resLon})`);
          }
        }
      }

      const updateData = {
        name: resName,
        description: resDesc,
        whatsapp: resWhatsapp,
        modality: resModality,
        referencePoint: resReferencePoint,
        city: resolvedCity,
        cityId: resolvedCityId,
        latitude: resLat,
        longitude: resLon,
        openingHours: resOpen,
        closingHours: resClose,
        weeklyHours: weeklyHours,
        forceClosed: resForceClosed,
        imageUrl: resImg,
        logoUrl: resImg,
        pixConfigType: resPixConfigType,
        pixKey: resPixKey,
        pixType: resPixType,
        pixReceiver: resPixReceiver,
        orderSoundUrl: resOrderSoundUrl,
        messageSoundUrl: resMessageSoundUrl,
        autoVolume: resAutoVolume,
        autoPrintOrders: resAutoPrintOrders,
        screenOverlay: resScreenOverlay,
        deliveryFeeType: delFeeType,
        isDeliveryFree: delFeeType === 'free',
        deliveryFeePerKm: parseFloat(delFeePerKm) || 0,
        deliveryFreeKm: parseFloat(delFreeKm) || 0,
        minOrderValue: parseFloat(resMinOrderValue) || 0,
        acceptedPaymentMethods: resAcceptedPayments,
        deliveryConfigured: true,
        monthlyBillingEnabled: resMonthlyBillingEnabled,
        updatedAt: serverTimestamp()
      };

      // Optimistic update
      setRestaurant(prev => prev ? { ...prev, ...updateData } : null);
      setIsEditingRestaurant(false);

      // Perform write in background
      try {
        await updateDoc(doc(db, 'restaurants', restaurant.id), updateData);
        
        // AUTO-SYNC: When restaurant city changes, update all its products automatically
        if (updateData.cityId || updateData.city) {
          console.log(`[AutoSync] Syncing city for products of restaurant ${restaurant.id}...`);
          const productsSnap = await getDocs(query(collection(db, 'food_items'), where('restaurantId', '==', restaurant.id)));
          for (const productDoc of productsSnap.docs) {
            await updateDoc(productDoc.ref, {
              cityId: updateData.cityId || null,
              city: updateData.city || null,
              updatedAt: serverTimestamp()
            });
          }
          console.log(`[AutoSync] Synced ${productsSnap.size} products.`);
        }
      } catch (error) {
        console.error("Error updating restaurant or syncing products:", error);
        handleFirestoreError(error, OperationType.UPDATE, `restaurants/${restaurant.id}`);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `restaurants/${restaurant.id}`);
    }
  };

  const handleRefreshData = async () => {
    if (!restaurant) return;
    try {
      const docSnap = await getDoc(doc(db, 'restaurants', restaurant.id));
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() } as Restaurant;
        setRestaurant(data);
        setResName(data.name);
        setResDesc(data.description);
        setResWhatsapp(data.whatsapp || '');
        setResModality(data.modality || 'restaurante');
        setResOpen(data.openingHours);
        setResClose(data.closingHours);
        setResImg(data.imageUrl);
        if (data.weeklyHours) setWeeklyHours(data.weeklyHours);
        setResPixConfigType(data.pixConfigType || 'none');
        setResPixKey(data.pixKey || '');
        setResPixType(data.pixType || 'cpf');
        setResOrderSoundUrl(data.orderSoundUrl || '');
        setResMessageSoundUrl(data.messageSoundUrl || '');
        setResAcceptedPayments(data.acceptedPaymentMethods || ['pix', 'cash', 'card']);
        alert('Dados carregados com sucesso!');
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingItem(true);
    console.log('[ProductSave] handleSaveItem triggered.');
    
    if (!restaurant || !user || !profile) {
      console.error('[ProductSave] Missing essential data:', { restaurant: !!restaurant, user: !!user, profile: !!profile });
      setIsSavingItem(false);
      return;
    }
    
    if (profile.role !== 'manager' && profile.role !== 'admin') {
      alert('Você precisa ter cargo de Gestor para salvar itens.');
      setIsSavingItem(false);
      return;
    }

    if (!itemImg) {
      const errMsg = 'Por favor, selecione uma imagem para o prato.';
      console.warn('[ProductSave] Validation failed:', errMsg);
      alert(errMsg);
      document.getElementById('item-image-upload')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setIsSavingItem(false);
      return;
    }
    
    // Validate add-ons have images
    for (let i = 0; i < itemAddOns.length; i++) {
      const addon = itemAddOns[i];
      if (!addon.imageUrl) {
        const errMsg = `O adicional "${addon.name || 'Sem nome'}" precisa de uma foto da galeria do dispositivo.`;
        console.warn('[ProductSave] Add-on validation failed:', errMsg);
        alert(errMsg);
        document.getElementById(`addon-image-upload-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setIsSavingItem(false);
        return;
      }
    }

    try {
      console.log('[ProductSave] Preparing data. Price raw:', itemPrice);
      
      const cleanPrice = itemPrice.toString().replace(',', '.');
      const parsedPrice = parseFloat(cleanPrice);
      if (isNaN(parsedPrice)) {
        alert('Por favor, insira um preço válido.');
        setIsSavingItem(false);
        return;
      }

      let productCityId = restaurant.cityId || resCityId || null;
      let productCityName = restaurant.city || resCity || null;

      if (!productCityId || !productCityName) {
        const rLat = restaurant.latitude != null ? restaurant.latitude : resLat;
        const rLon = restaurant.longitude != null ? restaurant.longitude : resLon;

        if (rLat != null && rLon != null && commonData.cities && commonData.cities.length > 0) {
          let closestCity: any = null;
          let minDistance = Infinity;
          for (const city of commonData.cities) {
            const cLat = city.latitude != null ? city.latitude : city.lat;
            const cLng = city.longitude != null ? city.longitude : city.lng;
            if (cLat != null && cLng != null && !isNaN(cLat) && !isNaN(cLng)) {
              const distance = Math.sqrt(Math.pow(cLat - rLat, 2) + Math.pow(cLng - rLon, 2));
              if (distance < minDistance) {
                minDistance = distance;
                closestCity = city;
              }
            }
          }
          if (closestCity) {
            productCityId = closestCity.id;
            productCityName = closestCity.name;
            console.log(`[ProductSave] Resolved product city to ${productCityName} (ID: ${productCityId}) based on restaurant GPS coordinates (${rLat}, ${rLon})`);
          }
        }
      }

      const itemData: any = {
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        cityId: productCityId,
        city: productCityName,
        name: itemName,
        description: itemDesc,
        price: parsedPrice,
        promoPrice: itemPromoPrice ? parseFloat(itemPromoPrice.replace(',', '.')) : null,
        isFlashSale: itemIsFlash,
        isDeliveryFree: itemIsFreeDelivery,
        flashSaleStart: itemIsFlash ? (editingItem?.isFlashSale ? (editingItem.flashSaleStart || serverTimestamp()) : serverTimestamp()) : null,
        flashSaleEnd: itemIsFlash ? (editingItem?.isFlashSale ? (editingItem.flashSaleEnd || serverTimestamp()) : serverTimestamp()) : null,
        category: itemCat,
        imageUrl: itemImg,
        available: itemAvailable,
        stock: itemStock ? parseInt(itemStock) : null,
        availableFrom: itemAvailableFrom || null,
        availableUntil: itemAvailableUntil || null,
        availability: itemAvailability,
        addOns: itemAddOns,
        maxAddOns: itemMaxAddOns ? parseInt(itemMaxAddOns) : null,
        videoUrl: itemVideoUrl || null,
        preparationTimeMinutes: itemPreparationTime ? parseInt(itemPreparationTime) : null,
        updatedAt: serverTimestamp()
      };

      console.log('[ProductSave] Final data to Firestore:', itemData);

      if (editingItem) {
        console.log('[ProductSave] Updating existing item:', editingItem.id);
        const optimisticItem = { ...editingItem, ...itemData, updatedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } };
        setFoodItems(prev => prev.map(item => item.id === editingItem.id ? optimisticItem : item));
        
        await updateDoc(doc(db, 'food_items', editingItem.id), {
          ...itemData,
          id_v3: editingItem.id
        });
        console.log('[ProductSave] Successfully updated in Firestore.');
      } else {
        const itemRef = doc(collection(db, 'food_items'));
        console.log('[ProductSave] Creating new item with ID:', itemRef.id);
        const optimisticItem = { 
          id: itemRef.id, 
          id_v3: itemRef.id,
          ...itemData, 
          createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
          updatedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }
        } as any;
        setFoodItems(prev => [optimisticItem, ...prev]);

        await setDoc(itemRef, {
          ...itemData,
          createdAt: serverTimestamp(),
          id: itemRef.id,
          id_v3: itemRef.id
        });
        console.log('[ProductSave] Successfully created in Firestore.');
      }

      alert('Produto salvo com sucesso no cardápio!');
      setIsAddingItem(false);
      setEditingItem(null);
      setItemName('');
      setItemDesc('');
      setItemPrice('');
      setItemPromoPrice('');
      setItemCat('');
      setItemImg('');
      setItemVideoUrl('');
      setItemStock('');
      setItemAvailableFrom('');
      setItemAvailableUntil('');
      setItemPreparationTime('');
      setItemIsFlash(false);
      setItemAddOns([]);
      setItemAvailable(true);
      setItemAvailability({
        monday: { active: true, startTime: '00:00', endTime: '23:59' },
        tuesday: { active: true, startTime: '00:00', endTime: '23:59' },
        wednesday: { active: true, startTime: '00:00', endTime: '23:59' },
        thursday: { active: true, startTime: '00:00', endTime: '23:59' },
        friday: { active: true, startTime: '00:00', endTime: '23:59' },
        saturday: { active: true, startTime: '00:00', endTime: '23:59' },
        sunday: { active: true, startTime: '00:00', endTime: '23:59' },
      });
      setShowAvailability(true);
    } catch (error: any) {
      console.error('[ProductSave] CRITICAL ERROR:', error);
      handleFirestoreError(error, OperationType.WRITE, 'food_items');
    } finally {
      setIsSavingItem(false);
    }
  };

  const handleSavePopup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!popupImg) {
      alert('Por favor, selecione uma imagem para o pop-up.');
      return;
    }

    try {
      const popupData: any = {
        imageUrl: popupImg,
        linkUrl: popupLink,
        active: popupActive,
        ownerUid: user.uid,
        createdAt: serverTimestamp()
      };

      // Optimistic update
      if (editingPopup) {
        const optimisticPopup = { ...editingPopup, ...popupData, createdAt: editingPopup.createdAt };
        setPopups(prev => prev.map(p => p.id === editingPopup.id ? optimisticPopup : p));
        await updateDoc(doc(db, 'marketing_popups', editingPopup.id), popupData);
      } else {
        const tempId = 'temp-' + Date.now();
        const optimisticPopup = { id: tempId, ...popupData, createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } };
        setPopups(prev => [optimisticPopup, ...prev]);
        await addDoc(collection(db, 'marketing_popups'), popupData);
      }

      setIsAddingPopup(false);
      setEditingPopup(null);
      setPopupImg('');
      setPopupLink('');
      setPopupActive(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'marketing_popups');
    }
  };

  const handleDeletePopup = async (id: string) => {
    // Removed window.confirm as it's blocked in iframes
    setDeletingItemId(id);
    const previousPopups = [...popups];
    setPopups(prev => prev.filter(p => p.id !== id));
    try {
      await deleteDoc(doc(db, 'marketing_popups', id));
    } catch (error) {
      setPopups(previousPopups);
      handleFirestoreError(error, OperationType.DELETE, `marketing_popups/${id}`);
    } finally {
      setDeletingItemId(null);
    }
  };

  const handleDeleteReview = async (id: string) => {
    // Removed window.confirm as it's blocked in iframes
    setDeletingItemId(id);
    const previousReviews = [...reviews];
    setReviews(prev => prev.filter(r => r.id !== id));
    try {
      await deleteDoc(doc(db, 'reviews', id));
    } catch (error) {
      setReviews(previousReviews);
      handleFirestoreError(error, OperationType.DELETE, `reviews/${id}`);
    } finally {
      setDeletingItemId(null);
    }
  };

  const handleDeleteItem = async (id: string) => {
    // Removed window.confirm as it's blocked in iframes and user requested direct animation + delete
    setDeletingItemId(id);

    try {
      await deleteDoc(doc(db, 'food_items', id));
      // No need for optimistic update if we show a loader and wait for the real delete
      // But we can still do it if we want it to feel fast.
      // The user specifically asked for "animação carregando e apagar do banco de dados"
      setFoodItems(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `food_items/${id}`);
    } finally {
      setDeletingItemId(null);
    }
  };

  const handleFinalizeOrder = async (orderId: string) => {
    try {
      // Find current ride to persist courier info
      const ride = rides.find(r => (r.orderId === orderId || r.destinations?.some(d => d.orderId === orderId)) && r.status !== 'cancelled');
      
      const updateData: any = {
        status: 'delivered',
        updatedAt: serverTimestamp()
      };

      // Persist courier info to order if we found a ride
      if (ride) {
        updateData.courierName = ride.courierName;
        updateData.courierPhoto = ride.courierPhoto;
        updateData.courierVehicle = ride.vehicleType === 'car' ? 'Carro' : 'Moto'; // Normalized vehicle type
        updateData.courierPlate = ride.courierPlate;
        updateData.courierColor = ride.courierColor || '';
        updateData.courierUid = ride.courierUid;
        updateData.courierWhatsapp = ride.courierWhatsapp;
      }

      // Update order status
      await updateDoc(doc(db, 'orders', orderId), updateData);
      
      setSearchingForCourier(prev => ({ ...prev, [orderId]: false }));
      setCategoryLoading(prev => ({ ...prev, [orderId]: null }));
      setCourierSticky(prev => ({ ...prev, [orderId]: false }));

      // Update ride status if exists
      if (ride) {
        await updateDoc(doc(db, 'rides', ride.id), {
          status: 'completed',
          updatedAt: serverTimestamp()
        });
      }
      
      alert('Pedido e entrega finalizados com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: Order['status'], reason?: string) => {
    // TOTAL OPTIMISTIC UPDATE: Move UI instantly regardless of background logic
    setOptimisticStatuses(prev => ({ ...prev, [orderId]: newStatus }));
    
    setLoadingOrders(prev => ({ ...prev, [orderId]: true }));
    console.log(`Updating order ${orderId} to status ${newStatus}`);
    
    let success = false;
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) {
        return;
      }

      if (newStatus === 'preparing') {
        // Prevent double deduction if order is already being prepared or further
        if (order.status !== 'pending') {
          console.log("Order accepted or processed");
          return;
        }

        // Sync wallet balance before check to ensure accuracy
        const currentWallet = await refreshWallet().catch(() => null);
        const activeWallet = currentWallet || wallet;
        
        // Stop the alarm immediately when accepting a new order
        stopOrderAlarm();
        setIsOrderAlarmPlaying(false);
        
        // Check wallet balance
        const globalAdmins = [
          'tupamobilidade@gmail.com',
          'entrega.rapida247@gmail.com', 
          'ifoodtupa4@gmail.com', 
          'foddtopmendes@gmail.com',
          'franksomjuruti1@gmail.com',
          'franksomjuruti@gmail.com'
        ];
        const isGlobalAdmin = user?.email && globalAdmins.includes(user.email.toLowerCase());
        const hasUnlimitedCredit = restaurant?.unlimitedCredit === true;

        if (!isGlobalAdmin && !hasUnlimitedCredit) {
          if (!activeWallet) {
            console.warn("Wallet missing or loading");
          } else if (!globalSettings) {
            console.warn("Global Settings missing");
          } else {
            const deduction = restaurant?.customOrderDeduction ?? (globalSettings.orderDeductionAmount || 2);
            
            // Deduct credit using server API to bypass client-side security restrictions
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

              const response = await fetch('/api/manager/deduct-order-credit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({
                  ownerUid: restaurant?.ownerUid || user?.uid,
                  amount: deduction,
                  orderId: orderId,
                  restaurantId: restaurant?.id,
                  restaurantName: restaurant?.name,
                  branchId: restaurant?.branchId || '',
                  cityId: restaurant?.cityId || restaurant?.city || '',
                  cityName: restaurant?.city || ''
                })
              });
              
              clearTimeout(timeoutId);

              if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                console.warn('API credit deduction error (ignored for seamless acceptance):', errData.error);
              } else {
                await refreshWallet().catch(() => null);
              }
            } catch (error: any) {
              console.error("Error deducting credit (ignored):", error);
            }
          }
        }
      }

      const updateData: any = { 
        status: newStatus,
        updatedAt: serverTimestamp()
      };

      if (reason) {
        updateData.cancellationReason = reason;
      }

      if (newStatus === 'delivered') {
        const ride = (rides || []).find(r => (r.orderId === orderId || r.destinations?.some(d => d.orderId === orderId)) && r.status !== 'cancelled');
        if (ride) {
          updateData.courierName = ride.courierName;
          updateData.courierPhoto = ride.courierPhoto;
          updateData.courierVehicle = ride.vehicleType === 'car' ? 'Carro' : 'Moto';
          updateData.courierPlate = ride.courierPlate;
          updateData.courierColor = ride.courierColor || '';
          updateData.courierUid = ride.courierUid;
          updateData.courierWhatsapp = ride.courierWhatsapp;
          
          await updateDoc(doc(db, 'rides', ride.id), {
            status: 'completed',
            updatedAt: serverTimestamp()
          }).catch(e => console.error("Error updating ride to completed:", e));
        }
      }

      if (newStatus === 'cancelled' || newStatus === 'rejected') {
        updateData.courierInfo = null;
        updateData.courierName = null;
        updateData.courierUid = null;
        updateData.courierWhatsapp = null;
        updateData.courierPhoto = null;
        updateData.courierVehicle = null;
        updateData.courierPlate = null;
        updateData.courierColor = null;
      }

      await updateDoc(doc(db, 'orders', orderId), updateData);
      
      setSearchingForCourier(prev => ({ ...prev, [orderId]: false }));
      setCategoryLoading(prev => ({ ...prev, [orderId]: null }));
      setCourierSticky(prev => ({ ...prev, [orderId]: false }));
      
      if (newStatus === 'ready' || newStatus === 'rejected' || newStatus === 'cancelled') {
        try {
          await cancelRideLogic(orderId, undefined, true);
        } catch (e) {
          console.error("Failed to auto-cancel ride during order status change:", e);
        }
      }

      success = true;
    } catch (error) {
      console.error("Error updating order status:", error);
      // Rollback optimistic status on error
      setOptimisticStatuses(prev => {
        if (!prev[orderId]) return prev;
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
    } finally {
      if (!success) {
        setOptimisticStatuses(prev => {
          if (!prev[orderId]) return prev;
          const next = { ...prev };
          delete next[orderId];
          return next;
        });
      }
      setLoadingOrders(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const handleAssignEmployee = async (orderId: string, employeeName: string) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      const currentAssigned = order.assignedEmployees || [];
      if (currentAssigned.includes(employeeName)) {
        const updated = currentAssigned.filter(name => name !== employeeName);
        await updateDoc(doc(db, 'orders', orderId), {
          assignedEmployees: updated,
          updatedAt: serverTimestamp()
        });
      } else {
        await updateDoc(doc(db, 'orders', orderId), {
          assignedEmployees: [...currentAssigned, employeeName],
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'orders');
    }
  };

  const handleAddEmployee = async () => {
    if (!newEmployeeName.trim() || !restaurant) return;
    try {
      const currentEmployees = restaurant.employees || [];
      if (currentEmployees.includes(newEmployeeName.trim())) {
        alert('Este funcionário já está cadastrado.');
        return;
      }
      await updateDoc(doc(db, 'restaurants', restaurant.id), {
        employees: [...currentEmployees, newEmployeeName.trim()]
      });
      setNewEmployeeName('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'restaurants');
    }
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!bannerImg) {
      alert('Por favor, selecione uma imagem para o banner.');
      return;
    }

    try {
      const bannerData: any = {
        imageUrl: bannerImg,
        title: bannerTitle,
        active: bannerActive,
        ownerUid: user.uid,
        objectPosition: `${bannerPosition.x}% ${bannerPosition.y}%`,
        createdAt: serverTimestamp()
      };

      // Optimistic update
      if (editingBanner) {
        const optimisticBanner = { ...editingBanner, ...bannerData, createdAt: editingBanner.createdAt };
        setBanners(prev => prev.map(b => b.id === editingBanner.id ? optimisticBanner : b));
        await updateDoc(doc(db, 'promotional_banners', editingBanner.id), bannerData);
      } else {
        const tempId = 'temp-' + Date.now();
        const optimisticBanner = { id: tempId, ...bannerData, createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } };
        setBanners(prev => [optimisticBanner, ...prev]);
        await addDoc(collection(db, 'promotional_banners'), bannerData);
      }

      setIsAddingBanner(false);
      setEditingBanner(null);
      setBannerImg('');
      setBannerTitle('');
      setBannerActive(true);
      setBannerPosition({ x: 50, y: 50 });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'promotional_banners');
    }
  };

  const handleGeneratePix = async (isSubscription: boolean = false) => {
    if (!user || !globalSettings?.mercadoPagoAccessToken) {
      alert('Configuração do Mercado Pago não encontrada.');
      return;
    }

    const amount = isSubscription ? (globalSettings.monthlyFee || 50) : parseFloat(rechargeAmount);
    if (!isSubscription && (isNaN(amount) || amount < (globalSettings.minRechargeAmount || 10))) {
      alert(`O valor mínimo para recarga é R$${(globalSettings.minRechargeAmount || 10).toFixed(2)}`);
      return;
    }

    setIsGeneratingPix(true);
    setPixError(null);
    console.log(`[PIX] Triggering PIX generation. Amount: ${amount}, Subscription: ${isSubscription}`);

    try {
      const response = await fetch('/api/create-pix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: amount,
          description: isSubscription ? `Assinatura Mensal - ${globalSettings?.appName || 'ifood TUPÃ'}` : `Recarga de crédito gestor - ${globalSettings?.appName || 'ifood TUPÃ'}`,
          email: 'pagamentos@aifood.com',
          firstName: user.displayName?.split(' ')[0] || 'Gestor',
          lastName: user.displayName?.split(' ').slice(1).join(' ') || 'Tupã',
          accessToken: globalSettings.mercadoPagoAccessToken,
          orderId: `RECHARGE_${Date.now()}`
        })
      });

      console.log(`[PIX] API Response status: ${response.status}`);
      
      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.error(`[PIX] Non-JSON response:`, text);
        throw new Error(`Erro no servidor: ${text.slice(0, 100)}...`);
      }
      
      if (!response.ok || data.error || data.status === 400) {
        console.error(`[PIX] API reported error:`, data);
        throw new Error(data.message || data.error || 'Erro ao gerar Pix no Mercado Pago');
      }

      if (!data.id || !data.point_of_interaction) {
        console.error(`[PIX] Incomplete interaction data:`, data);
        throw new Error('Resposta do Mercado Pago incompleta (campos obrigatórios ausentes)');
      }

      const pixData: PixPayment = {
        id: 'pending-' + Date.now(), // Temporary ID until Firestore confirms
        paymentId: data.id.toString(),
        qrCode: data.point_of_interaction.transaction_data.qr_code,
        qrCodeBase64: data.point_of_interaction.transaction_data.qr_code_base64,
        status: 'pending',
        amount: amount
      };

      console.log(`[PIX] Success! Payment ID: ${pixData.paymentId}. Showing QR Code immediately.`);
      setActivePixPayment(pixData);

      // Record in Firestore in the background
      addDoc(collection(db, 'pix_payments'), {
        paymentId: pixData.paymentId,
        qrCode: pixData.qrCode,
        qrCodeBase64: pixData.qrCodeBase64,
        status: pixData.status,
        amount: pixData.amount,
        ownerUid: user.uid,
        isSubscription,
        createdAt: serverTimestamp()
      }).then((docRef) => {
        console.log(`[PIX] Recorded in Firestore with doc ID: ${docRef.id}`);
        setActivePixPayment(prev => prev && prev.paymentId === pixData.paymentId ? { ...prev, id: docRef.id } : prev);
        startPollingPayment(data.id.toString(), docRef.id, amount, isSubscription);
      }).catch(err => {
        console.error("[PIX] Firestore record error:", err);
        // Fallback: still poll if we have the payment ID
        startPollingPayment(data.id.toString(), '', amount, isSubscription);
      });
    } catch (error: any) {
      console.error("[PIX] Critical Error generating Pix:", error);
      const errorMessage = error.message || 'Erro desconhecido na geração do Pix';
      setPixError(errorMessage);
      alert('Erro ao gerar pagamento Pix: ' + errorMessage);
    } finally {
      setIsGeneratingPix(false);
    }
  };

  const handleApprovedPayment = async (docId: string, amount: number, isSubscription: boolean = false) => {
    try {
      // Check if already approved to avoid double processing
      const docRef = doc(db, 'pix_payments', docId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists() && docSnap.data().status === 'approved') {
        console.log("Payment already processed by server/webhook");
        setActivePixPayment(null);
        setIsRecharging(false);
        return;
      }

      // Update Pix Payment Status
      await updateDoc(docRef, { status: 'approved' });
      
      if (isSubscription) {
        // Update user subscription using activateSubscription from AuthContext if available
        // or fallback to manual update
        try {
          const userDocRef = doc(db, 'users', user!.uid);
          const duration = globalSettings?.subscriptionDurationDays || 30;
          const nextDueDate = new Date();
          nextDueDate.setDate(nextDueDate.getDate() + duration);
          
          await updateDoc(userDocRef, {
            subscriptionStatus: 'active',
            subscriptionDueDate: nextDueDate.toISOString()
          });
          alert('Assinatura renovada com sucesso!');
        } catch (err) {
          console.error("Error activating subscription:", err);
          alert('Erro ao ativar assinatura.');
        }
      } else {
        // Update Wallet Balance
        let currentWallet = wallet;
        
        if (!currentWallet) {
          // Try to find wallet if not in state
          const q = query(collection(db, 'wallets'), where('ownerUid', '==', user!.uid), limit(1));
          const snap = await getDocs(q);
          if (!snap.empty) {
            currentWallet = { id: snap.docs[0].id, ...snap.docs[0].data() } as Wallet;
          } else {
            // Create new wallet if still missing
            // Use user.uid as ID to prevent duplicates
            const walletRef = doc(db, 'wallets', user!.uid);
            await setDoc(walletRef, {
              ownerUid: user!.uid,
              balance: 0,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            }, { merge: true });
            currentWallet = { id: user!.uid, ownerUid: user!.uid, balance: 0 };
          }
        }

        if (currentWallet) {
          await updateDoc(doc(db, 'wallets', currentWallet.id), {
            balance: increment(amount),
            updatedAt: serverTimestamp()
          });

          // Record Transaction
          await addDoc(collection(db, 'wallet_transactions'), {
            walletId: currentWallet.id,
            ownerUid: user?.uid,
            restaurantId: restaurant?.id,
            restaurantName: restaurant?.name,
            branchId: restaurant?.branchId || '',
            cityId: restaurant?.cityId || restaurant?.city || '',
            cityName: restaurant?.city || '',
            type: 'recharge',
            method: 'pix',
            amount: amount,
            description: 'Recarga Pix Mercado Pago',
            createdAt: serverTimestamp(),
            timestamp: serverTimestamp(),
            date: new Date().toISOString().split('T')[0]
          });
        }
        alert('Pagamento aprovado! Seu saldo foi atualizado.');
      }

      // Execute SplitPay for Recharge/Subscription (50/50 split to specific CPF)
      try {
        const platformFee = amount * 0.5;
        const rechargePixKey = '04367829286';
        const rechargePixType = 'cpf';

        console.log(`Executing SplitPay for ${isSubscription ? 'Subscription' : 'Recharge'}: R$ ${platformFee.toFixed(2)} to ${rechargePixKey}`);

        await fetch('/api/split-pay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: `${isSubscription ? 'SUB' : 'RECHARGE'}_${Date.now()}`,
            restaurantId: 'SYSTEM_PAYMENT',
            amount: platformFee,
            pixKey: rechargePixKey,
            pixKeyType: rechargePixType,
            accessToken: globalSettings.mercadoPagoAccessToken
          })
        });

        // Record in splitpay_history
        await addDoc(collection(db, 'splitpay_history'), {
          orderId: `${isSubscription ? 'SUB' : 'RECHARGE'}_${docId}`,
          restaurantId: 'SYSTEM_PAYMENT',
          totalAmount: amount,
          platformFee: platformFee,
          restaurantAmount: amount - platformFee,
          pixKey: rechargePixKey,
          status: 'success',
          type: isSubscription ? 'subscription_split' : 'recharge_split',
          createdAt: serverTimestamp()
        });
      } catch (splitError) {
        console.error("Error executing SplitPay:", splitError);
      }

      setActivePixPayment(null);
      setIsRecharging(false);
    } catch (error) {
      console.error("Error handling approved payment:", error);
    }
  };

  const startPollingPayment = (paymentId: string, docId: string, amount: number, isSubscription: boolean = false) => {
    if (pollingInterval) clearInterval(pollingInterval);

    if (!paymentId || paymentId === 'undefined' || paymentId === 'null') {
      console.error("[PIX] Invalid paymentId for polling:", paymentId);
      return;
    }

    console.log(`[PIX] Starting monitor for Payment ID: ${paymentId} (Doc Ref: ${docId || 'none yet'})`);

    // Monitor status via query as fallback if we don't have docId yet or as primary if we do
    const q = query(collection(db, 'pix_payments'), where('paymentId', '==', paymentId), limit(1));
    const unsub = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        const data = docSnap.data();
        console.log(`[PIX] Real-time status update: ${data.status}`);
        if (data.status === 'approved') {
          console.log("[PIX] SUCCESS! Status updated to approved in Firestore.");
          // We found the approved status!
          handleApprovedPayment(docSnap.id, amount, isSubscription);
          unsub();
          if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
          }
        }
      }
    }, (err) => {
      console.error("[PIX] Firestore listener error:", err);
    });

    const interval = setInterval(async () => {
      if (!globalSettings?.mercadoPagoAccessToken) return;

      try {
        console.log(`[PIX] Polling API status for ${paymentId}...`);
        const response = await fetch(`/api/check-payment/${paymentId}`, {
          headers: {
            'Authorization': `Bearer ${globalSettings.mercadoPagoAccessToken}`
          }
        });

        if (!response.ok) {
          console.error(`[PIX] API Polling error (${response.status})`);
          return;
        }

        const data = await response.json();
        console.log(`[PIX] API Status: ${data.status}`);

        if (data.status === 'approved') {
          console.log("[PIX] API approved! Finalizing...");
          clearInterval(interval);
          setPollingInterval(null);
          unsub();
          
          // Need to find the docId if not provided
          let finalDocId = docId;
          if (!finalDocId) {
            const snap = await getDocs(q);
            if (!snap.empty) finalDocId = snap.docs[0].id;
          }
          
          if (finalDocId) {
            await handleApprovedPayment(finalDocId, amount, isSubscription);
          } else {
            console.error("[PIX] Could not find Firestore document to approve payment.");
          }
        } else if (data.status === 'rejected' || data.status === 'cancelled') {
          console.warn(`[PIX] Payment ${data.status}`);
          clearInterval(interval);
          setPollingInterval(null);
          unsub();
          
          let finalDocId = docId;
          if (!finalDocId) {
            const snap = await getDocs(q);
            if (!snap.empty) finalDocId = snap.docs[0].id;
          }
          
          if (finalDocId) {
            await updateDoc(doc(db, 'pix_payments', finalDocId), { status: data.status });
          }
          alert(`O pagamento foi ${data.status === 'rejected' ? 'recusado' : 'cancelado'}.`);
          setActivePixPayment(null);
        }
      } catch (error) {
        console.error("[PIX] Polling catch error:", error);
      }
    }, 4000); 

    setPollingInterval(interval);
  };

  useEffect(() => {
    if (!user || !globalSettings?.mercadoPagoAccessToken) return;

    const checkPendingPayments = async () => {
      try {
        const q = query(
          collection(db, 'pix_payments'),
          where('ownerUid', '==', user.uid),
          where('status', '==', 'pending')
        );
        const snapshot = await getDocs(q);
        
        for (const docSnap of snapshot.docs) {
          const pixData = docSnap.data() as PixPayment;
          const paymentId = pixData.paymentId;
          
          const response = await fetch(`/api/check-payment/${paymentId}`, {
            headers: {
              'Authorization': `Bearer ${globalSettings.mercadoPagoAccessToken}`
            }
          });
          const data = await response.json();

          if (data.status === 'approved') {
            await handleApprovedPayment(docSnap.id, pixData.amount, pixData.isSubscription || false);
          } else if (data.status === 'cancelled' || data.status === 'rejected') {
            await updateDoc(doc(db, 'pix_payments', docSnap.id), { status: data.status });
          }
        }
      } catch (error) {
        console.error("Error checking pending payments:", error);
      }
    };

    checkPendingPayments();
  }, [user, globalSettings, wallet]);

  useEffect(() => {
    if (!activePixPayment?.id) return;

    console.log("Setting up real-time listener for PIX payment:", activePixPayment.id);
    const unsub = onSnapshot(doc(db, 'pix_payments', activePixPayment.id), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.status === 'approved') {
          console.log("PIX Payment approved detected via onSnapshot!");
          handleApprovedPayment(snapshot.id, data.amount, data.isSubscription || false);
        } else if (data.status === 'rejected' || data.status === 'cancelled') {
          alert('O pagamento foi recusado ou cancelado.');
          setActivePixPayment(null);
        }
      }
    });

    return () => unsub();
  }, [activePixPayment?.id]);

  useEffect(() => {
    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [pollingInterval]);

  const handleDeleteBanner = async (id: string) => {
    // Removed window.confirm as it's blocked in iframes
    setDeletingItemId(id);
    const previousBanners = [...banners];
    setBanners(prev => prev.filter(b => b.id !== id));
    try {
      await deleteDoc(doc(db, 'promotional_banners', id));
    } catch (error) {
      setBanners(previousBanners);
      handleFirestoreError(error, OperationType.DELETE, `promotional_banners/${id}`);
    } finally {
      setDeletingItemId(null);
    }
  };

  const openGallery = (target: 'item' | 'popup' | 'banner' | 'restaurant') => {
    setGalleryTarget(target);
    setIsGalleryOpen(true);
  };

  const handleGallerySelect = (url: string) => {
    switch (galleryTarget) {
      case 'item': setItemImg(url); break;
      case 'popup': setPopupImg(url); break;
      case 'banner': setBannerImg(url); break;
      case 'restaurant': setResImg(url); break;
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'item' | 'popup' | 'banner' | 'restaurant' | 'addon' | 'video', index?: number) => {
    const file = e.target.files?.[0];
    if (file) {
      if (target === 'video') {
        const reader = new FileReader();
        reader.onloadend = () => {
          setItemVideoUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
        return;
      }
      try {
        const compressedUrl = await compressImage(file, 800, 800, 0.7);
        switch (target) {
          case 'item': setItemImg(compressedUrl); break;
          case 'popup': setPopupImg(compressedUrl); break;
          case 'banner': setBannerImg(compressedUrl); break;
          case 'restaurant': setResImg(compressedUrl); break;
          case 'addon':
            if (index !== undefined) {
              const newAddOns = [...itemAddOns];
              newAddOns[index].imageUrl = compressedUrl;
              setItemAddOns(newAddOns);
            }
            break;
        }
      } catch (error) {
        console.error("Error compressing image:", error);
        const reader = new FileReader();
        reader.onloadend = () => {
          const url = reader.result as string;
          switch (target) {
            case 'item': setItemImg(url); break;
            case 'popup': setPopupImg(url); break;
            case 'banner': setBannerImg(url); break;
            case 'restaurant': setResImg(url); break;
            case 'addon':
              if (index !== undefined) {
                const newAddOns = [...itemAddOns];
                newAddOns[index].imageUrl = url;
                setItemAddOns(newAddOns);
              }
              break;
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const isSubscriptionActive = () => {
    if (isGuest) return true;
    if (profile?.role === 'admin') return true;
    
    // If auto monthly billing is not explicitly enabled globally, subscription is always considered active
    if (globalSettings?.autoMonthlyBilling !== true) return true;

    // If the specific restaurant doesn't have monthly billing enabled, it's also active
    if (restaurant && !restaurant.monthlyBillingEnabled) return true;

    if (profile?.subscriptionStatus === 'active') return true;
    
    // Check trial
    if (profile?.trialEndsAt) {
      const trialEnd = new Date(profile.trialEndsAt);
      if (trialEnd > new Date()) return true;
    }

    // Check due date
    if (profile?.subscriptionDueDate) {
      const dueDate = new Date(profile.subscriptionDueDate);
      if (dueDate > new Date()) return true;
    }

    return false;
  };

  const isBlocked = !isSubscriptionActive();

  const restaurantLink = restaurant ? `${window.location.origin}/store/${restaurant.id}` : '';

  const downloadQRCode = () => {
    const canvas = document.getElementById('store-qrcode') as HTMLCanvasElement;
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `qrcode-${restaurant?.name || 'loja'}.png`;
      link.href = url;
      link.click();
    }
  };

  if (isBlocked && profile?.role === 'manager') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white/5 border border-white/10 rounded-[2.5rem] p-10 text-center space-y-6 shadow-2xl"
        >
          <div className="w-24 h-24 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldAlert size={48} />
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tighter italic">Acesso Bloqueado</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Sua assinatura mensal está expirada ou o período de teste terminou. 
            Para continuar utilizando a plataforma, regularize seu pagamento.
          </p>
          <div className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Valor da Mensalidade</p>
            <p className="text-2xl font-black italic">R$ {globalSettings?.monthlyFee?.toFixed(2) || '50,00'}</p>
          </div>
          <button 
            onClick={() => setActiveTab('finance')}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center space-x-2"
          >
            <CreditCard size={18} />
            <span>Ir para Pagamentos</span>
          </button>
          <button 
            onClick={signOut}
            className="w-full bg-white/5 text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-white/10 transition-all border border-white/10"
          >
            Sair da Conta
          </button>
        </motion.div>
      </div>
    );
  }

  const handleMasterLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (masterKey === 'TUPA2024') {
      setIsMasterAuthenticated(true);
      localStorage.setItem('manager_master_auth', 'true');
    } else {
      alert('Chave Mestra incorreta!');
    }
  };

  const toggleStatus = async (field: 'overlayActive' | 'autoVolumeActive') => {
    if (!restaurant) return;
    const currentValue = restaurant[field as keyof Restaurant];
    if (!currentValue) {
      setActivationType(field === 'overlayActive' ? 'overlay' : 'volume');
      setIsActivationModalOpen(true);
    } else {
      await updateDoc(doc(db, 'restaurants', restaurant.id), { [field]: false });
    }
  };

  const confirmActivation = async () => {
    if (!restaurant) return;
    const field = activationType === 'overlay' ? 'overlayActive' : 'autoVolumeActive';
    await updateDoc(doc(db, 'restaurants', restaurant.id), { [field]: true });
    setIsActivationModalOpen(false);
  };

  const getBillingData = () => {
    let filteredOrders = orders.filter(o => o.status === 'delivered');
    
    if (billingRange === 'today') {
      const today = new Date().toISOString().split('T')[0];
      filteredOrders = filteredOrders.filter(o => {
        const date = o.createdAt?.toDate ? o.createdAt.toDate().toISOString().split('T')[0] : '';
        return date === today;
      });
    } else if (billingRange === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      filteredOrders = filteredOrders.filter(o => {
        const date = o.createdAt?.toDate ? o.createdAt.toDate().toISOString().split('T')[0] : '';
        return date === yesterdayStr;
      });
    } else if (billingRange === 'custom') {
      filteredOrders = filteredOrders.filter(o => {
        const date = o.createdAt?.toDate ? o.createdAt.toDate().toISOString().split('T')[0] : '';
        return date === billingDate;
      });
    }

    const total = filteredOrders.reduce((acc, o) => acc + o.total, 0);
    const count = filteredOrders.length;
    
    // Group by hour for the chart
    const chartData = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}h`,
      total: 0
    }));

    filteredOrders.forEach(o => {
      const date = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
      const hour = date.getHours();
      chartData[hour].total += o.total;
    });

    return { total, chartData, count };
  };

  const handleDownloadBillingPDF = async () => {
    if (!billingRef.current) return;
    setIsDownloadingPDF(true);
    try {
      const canvas = await html2canvas(billingRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          // Fix for html2canvas not supporting modern color functions like color-mix, oklch, etc.
          // We remove or replace problematic styles in the cloned document
          
          const processRule = (rule: CSSRule, parent: CSSStyleSheet | CSSGroupingRule) => {
            try {
              if (rule instanceof CSSStyleRule) {
                if (rule.cssText && (rule.cssText.includes('color-mix') || rule.cssText.includes('oklch') || rule.cssText.includes('color('))) {
                  // Try to find the index and delete it
                  const rules = Array.from(parent.cssRules);
                  const index = rules.indexOf(rule);
                  if (index !== -1) {
                    parent.deleteRule(index);
                  }
                }
              } else if (rule instanceof CSSGroupingRule) {
                // Handle Media Queries, etc.
                const subRules = Array.from(rule.cssRules);
                for (let i = subRules.length - 1; i >= 0; i--) {
                  processRule(subRules[i], rule);
                }
              }
            } catch (e) {}
          };

          const styleSheets = Array.from(clonedDoc.styleSheets);
          styleSheets.forEach(sheet => {
            try {
              const rules = Array.from(sheet.cssRules);
              for (let i = rules.length - 1; i >= 0; i--) {
                processRule(rules[i], sheet);
              }
            } catch (e) {}
          });

          // Also check inline styles on all elements and remove problematic ones
          const allElements = clonedDoc.getElementsByTagName('*');
          for (let i = 0; i < allElements.length; i++) {
            const el = allElements[i] as HTMLElement;
            if (el.style) {
              const style = el.style;
              for (let j = style.length - 1; j >= 0; j--) {
                const prop = style[j];
                const val = style.getPropertyValue(prop);
                if (val && (val.includes('color-mix') || val.includes('oklch') || val.includes('color('))) {
                  style.removeProperty(prop);
                }
              }
            }
          }
          
          // Add a global style to the cloned document to override any problematic variables
          const style = clonedDoc.createElement('style');
          style.innerHTML = `
            * { 
              color-mix: none !important; 
              oklch: none !important;
            }
            :root {
              --bg-color: #f1f5f9 !important;
            }
          `;
          clonedDoc.head.appendChild(style);
        }
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`faturamento-${billingDate}.pdf`);
    } catch (error: any) {
      if (error.name === 'NotFoundError' || error.name === 'AbortError') {
        console.log('User cancelled PDF download or element not found');
        return;
      }
      console.error('Error generating PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  const connectUSB = async () => {
    try {
      const nav = navigator as any;
      if (!nav.usb) {
        alert('Seu navegador não suporta conexão USB.');
        return;
      }
      const device = await nav.usb.requestDevice({ filters: [] });
      await device.open();
      if (device.configuration === null) await device.selectConfiguration(1);
      await device.claimInterface(0);
      setUsbDevice(device);
      alert(`Impressora USB conectada: ${device.productName}`);
    } catch (error: any) {
      if (error.name === 'NotFoundError' || error.name === 'AbortError') {
        // User cancelled the requestDevice() chooser
        return;
      }
      console.error('USB Connection error:', error);
      alert('Erro ao conectar via USB.');
    }
  };

  const scanBluetooth = async () => {
    const nav = navigator as any;
    if (!nav.bluetooth) {
      alert('Seu navegador não suporta conexão Bluetooth.');
      return;
    }
    setIsScanningBluetooth(true);
    try {
      const device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'] // Common printer service
      });
      setBluetoothDevices(prev => {
        if (prev.find(d => d.id === device.id)) return prev;
        return [...prev, device];
      });
    } catch (error: any) {
      if (error.name === 'NotFoundError' || error.name === 'AbortError') {
        // User cancelled the requestDevice() chooser
        return;
      }
      console.error('Bluetooth Scan error:', error);
    } finally {
      setIsScanningBluetooth(false);
    }
  };

  const connectBluetooth = async (device: any) => {
    setIsConnectingBluetooth(true);
    try {
      const server = await device.gatt.connect();
      setBluetoothDevices(prev => prev.map(d => d.id === device.id ? device : d));
      setPrinterName(device.name || 'Impressora Bluetooth');
      setPrinterIp(device.id);
      alert(`Impressora Bluetooth conectada: ${device.name || 'Dispositivo'}`);
    } catch (error) {
      console.error('Bluetooth Connection error:', error);
      alert('Erro ao conectar com a impressora Bluetooth.');
    } finally {
      setIsConnectingBluetooth(false);
    }
  };

  // Master login screen removed

  // If user is logged in but role is not manager/admin, we should probably redirect or set role
  // But the useEffect handles setting role to manager if they are customer

  if (!user && !isGuest) {
    return (
      <div className="min-h-screen bg-bg-app flex flex-col items-center justify-center p-6 relative">
        {!loading ? (
          <AuthModal isOpen={true} onClose={() => navigate('/home')} targetRole="manager" />
        ) : (
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Carregando Painel do Gestor...</p>
          </div>
        )}
      </div>
    );
  }

  // Optimized skeleton loader condition for instant feel
  if (!isGuest && !location.state?.isRegistering && (!profile || (!managerData.isPreloaded && profile.role !== 'customer' && !restaurant && !managerData.restaurant))) {
    return (
      <div className="min-h-screen bg-bg-app flex flex-col transition-colors duration-300">
        <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 px-4 md:px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
              <div>
                <div className="h-6 w-40 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse mb-2" />
                <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-8 w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={`manager-skeleton-stats-${i}`} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
                  <div className="w-12 h-4 bg-slate-100 dark:bg-slate-800 rounded-full animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  const renderTableActionPopup = () => {
    if (!activeTableAction) return null;
    
    return (
      <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 md:p-8 bg-black/80 backdrop-blur-md" id="table-action-popup">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          className="bg-white max-w-2xl w-full rounded-[3rem] shadow-2xl p-8 md:p-12 text-center space-y-8"
        >
          <div className="flex flex-col items-center gap-4">
            <div className="p-6 bg-red-50 text-red-500 rounded-full animate-pulse">
              <ShieldAlert size={64} />
            </div>
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter italic text-red-600">ATENÇÃO MESA {activeTableAction.tableNumber}</h2>
          </div>

          <div className="space-y-4">
            <p className="text-xl md:text-3xl font-black uppercase tracking-tight text-slate-800">
              {activeTableAction.customerName}
            </p>
            <p className="text-2xl md:text-4xl font-black uppercase tracking-widest text-brand-blue bg-blue-50 py-4 rounded-3xl">
              {activeTableAction.action}
            </p>
            {activeTableAction.comment && (
              <p className="text-lg text-slate-500 italic p-6 bg-slate-50 rounded-2xl">
                "{activeTableAction.comment}"
              </p>
            )}
          </div>

          <button 
            onClick={async () => {
              const actionId = activeTableAction.id;
              try {
                await updateDoc(doc(db, 'table_actions', actionId), {
                  status: 'visualized',
                  updatedAt: serverTimestamp()
                });
                setActiveTableAction(null);
                stopOrderAlarm();
              } catch (e) {
                console.error(e);
                handleFirestoreError(e, OperationType.UPDATE, `table_actions/${actionId}`);
              }
            }}
            className="w-full bg-slate-800 text-white py-6 rounded-3xl font-black uppercase tracking-widest text-xl shadow-xl hover:bg-slate-900 transition-all"
          >
            OK, ENTENDIDO!
          </button>
        </motion.div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-bg-app text-slate-900 dark:text-white font-sans pb-20 md:pb-0 transition-colors duration-300">
      {renderTableActionPopup()}
      {renderLowCreditModal()}
      {renderTutorialOverlay()}
      {renderPaidTrafficModal()}
      {renderWalletHistoryModal()}
      {renderDeliveryNotification()}
      {renderDeliveryConfigModal()}

      {/* Header and Universal Alerts */}
      <div className="sticky top-0 z-50 flex flex-col">
        {/* Alerta de Saldo Crítico Universal */}
        {isBalanceLow && (
          <div className="bg-red-600 text-white px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 z-[45] shadow-lg">
            <ShieldAlert size={18} />
            <span>Sua carteira está sem crédito! Suas vendas foram pausadas até o saldo ser regularizado.</span>
            <button 
              onClick={() => setIsRecharging(true)}
              className="ml-4 bg-white text-red-600 px-4 py-1 rounded-full text-[8px] font-black hover:bg-slate-100 transition-all shadow-sm"
            >
              RECARREGAR AGORA
            </button>
          </div>
        )}

        {/* Header */}
        <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 px-4 md:px-6 py-4 w-full">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-2">
                <button 
                  onClick={() => toggleStatus('overlayActive')}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center space-x-2 ${restaurant?.overlayActive ? 'bg-emerald-500 text-white' : 'bg-red-600 text-white'}`}
                >
                  <div className={`w-2 h-2 rounded-full ${restaurant?.overlayActive ? 'bg-white' : 'bg-white/50'}`} />
                  <span>Sobreposição</span>
                </button>
                <button 
                  onClick={() => toggleStatus('autoVolumeActive')}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center space-x-2 ${restaurant?.autoVolumeActive ? 'bg-emerald-500 text-white' : 'bg-red-600 text-white'}`}
                >
                  <div className={`w-2 h-2 rounded-full ${restaurant?.autoVolumeActive ? 'bg-white' : 'bg-white/50'}`} />
                  <span>Volume Auto</span>
                </button>
              </div>
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 bg-blue-gradient rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                <Store size={20} />
              </div>
              <button 
                onClick={() => window.open(restaurantLink, '_blank')}
                className="mt-1 text-[8px] font-black uppercase tracking-widest text-blue-600 hover:underline flex items-center gap-1"
              >
                <Globe size={10} />
                Loja
              </button>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black italic tracking-tighter uppercase text-blue-gradient">Painel do Gestor</h1>
                <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[8px] font-black uppercase tracking-widest rounded-full border border-blue-100 dark:border-blue-800">Xô Fome</span>
              </div>
              <div className="flex flex-col mt-0.5">
                {managerLocation ? (
                  <span className="text-[7px] font-black uppercase tracking-tighter text-slate-400 dark:text-slate-500 animate-pulse">
                    📍 GPS LOJA: {managerLocation.latitude.toFixed(6)}, {managerLocation.longitude.toFixed(6)}
                  </span>
                ) : (
                  <span className="text-[7px] font-black uppercase tracking-tighter text-red-400 animate-bounce">
                    📍 Localização não capturada
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isGuest && <span className="text-[10px] font-black uppercase tracking-widest text-orange-500">Modo Visualização</span>}
                <button 
                  onClick={() => navigate('/customer')}
                  className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all flex items-center gap-2 border border-blue-200 dark:border-blue-800 shadow-sm"
                >
                  <ChevronLeft size={12} />
                  Ir para Xô Fome
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <ThemeSelector />
            {restaurant && wallet && (
              <div className="hidden md:flex flex-col items-end">
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Saldo Carteira</span>
                <span className={`text-sm font-black ${wallet.balance < (globalSettings?.minWalletBalance || 5) ? 'text-red-500' : 'text-green-600'}`}>
                  R$ {wallet.balance.toFixed(2)}
                </span>
                <button 
                  onClick={() => setIsWalletHistoryOpen(true)}
                  className="text-[8px] font-black uppercase tracking-widest text-blue-600 hover:underline flex items-center gap-1 mt-1"
                >
                  <History size={10} />
                  Ver Histórico
                </button>
              </div>
            )}
            <div className="relative">
              <button 
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center space-x-3 hover:bg-slate-50 p-1 pr-3 rounded-full transition-colors border border-transparent hover:border-slate-100"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 leading-tight">Gestor</p>
                  <p className="text-xs font-bold leading-tight dark:text-white">{profile?.displayName || user?.displayName?.split(' ')[0]}</p>
                </div>
                <div className="w-10 h-10 rounded-full border-2 border-blue-600 p-0.5">
                  <img 
                    src={profile?.photoURL || user?.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName || 'Usuário'}&background=2563eb&color=fff`} 
                    className="w-full h-full rounded-full object-cover" 
                    referrerPolicy="no-referrer"
                    alt="Profile"
                  />
                </div>
              </button>

              <div className="mt-2 flex justify-center">
                <button 
                  onClick={() => window.open(restaurantLink, '_blank')}
                  className="text-[8px] font-black uppercase tracking-widest text-blue-600 hover:underline flex items-center gap-1"
                >
                  <Globe size={10} />
                  Visualizar loja
                </button>
              </div>

              <AnimatePresence>
                {isProfileMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsProfileMenuOpen(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 py-3 z-50 overflow-hidden"
                    >
                      <div className="px-4 py-3 border-b border-slate-50 dark:border-slate-800 mb-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Conta Conectada</p>
                        <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{profile?.email || user?.email}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <LockIcon size={10} className="text-amber-500" />
                          <p className="text-[10px] font-mono font-bold text-slate-500 truncate select-all">{profile?.password || '********'}</p>
                        </div>
                        <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mt-1">{profile?.role === 'admin' ? 'Administrador Master' : 'Gestor de Restaurante'}</p>
                      </div>

                      <button 
                        onClick={() => {
                          if (restaurant) {
                            setResName(restaurant.name);
                            setResDesc(restaurant.description || '');
                            setResWhatsapp(restaurant.whatsapp);
                            setResReferencePoint(restaurant.referencePoint || '');
                            setResOpen(restaurant.openingHours || '09:00');
                            setResClose(restaurant.closingHours || '22:00');
                            if (restaurant.weeklyHours) setWeeklyHours(restaurant.weeklyHours);
                            setResImg(restaurant.imageUrl || '');
                            setResPixConfigType(restaurant.pixConfigType || 'none');
                            setResPixKey(restaurant.pixKey || '');
                            setResPixType(restaurant.pixType || 'cpf');
                            setResOrderSoundUrl(restaurant.orderSoundUrl || '');
                            setResMessageSoundUrl(restaurant.messageSoundUrl || '');
                            setResAutoVolume(restaurant.autoVolume || false);
                            setResAutoPrintOrders(restaurant.autoPrintOrders ?? true);
                            setResScreenOverlay(restaurant.screenOverlay || false);
                            setResForceClosed(restaurant.forceClosed || false);
                            setDelFeeType(restaurant.deliveryFeeType || 'km');
                            setDelFeePerKm(String(restaurant.deliveryFeePerKm || 0));
                            setDelFreeKm(String(restaurant.deliveryFreeKm || 0));
                            setResCity(restaurant.city || '');
                           setResCityId(restaurant.cityId || '');
                           setResCity(restaurant.city || '');
                           setResCityId(restaurant.cityId || '');
                           setIsEditingRestaurant(true);
                          }
                          setIsProfileMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center space-x-3"
                      >
                        <Edit size={16} />
                        <span>Editar Empresa</span>
                      </button>
                      
                      <button 
                        onClick={() => {
                          setIsDeletingAccountModalOpen(true);
                          setIsProfileMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center space-x-3"
                      >
                        <Trash2 size={16} />
                        <span>Deletar Conta</span>
                      </button>

                      <button 
                        onClick={() => {
                          signOut();
                          setIsProfileMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center space-x-3"
                      >
                        <LogOut size={16} />
                        <span>Sair da Conta</span>
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>
    </div>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-8">
        {/* Low Credit Notification */}
        {restaurant && wallet && !isAdmin && !isRegistering && !restaurant.unlimitedCredit && wallet.balance < (globalSettings?.minWalletBalance || 5) && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 p-6 rounded-[2rem] flex flex-col md:flex-row items-center gap-6 shadow-sm"
          >
            <div className="w-14 h-14 bg-red-600 text-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-red-500/20">
              <ShieldAlert size={32} />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-xl font-black uppercase tracking-tight italic mb-1 text-red-600 dark:text-red-400">LOJA BLOQUEADA!</h3>
              <p className="text-sm font-bold text-red-500 dark:text-red-300 leading-relaxed uppercase tracking-tight">
                Seu saldo de R$ {wallet.balance.toFixed(2)} está abaixo do mínimo (R$ {(globalSettings?.minWalletBalance || 5).toFixed(2)}).
                Sua loja está <span className="underline decoration-wavy">INDISPONÍVEL</span> para os clientes. Recarregue agora para voltar a vender!
              </p>
            </div>
            <button 
              onClick={() => setIsRecharging(true)}
              className="w-full md:w-auto px-8 py-4 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all shadow-xl flex items-center justify-center gap-2"
            >
              <CreditCard size={18} />
              <span>RECARREGAR AGORA</span>
            </button>
          </motion.div>
        )}

        {/* Subscription Countdown */}
        {subscriptionTimeLeft && (
          <div className="mb-4 bg-gradient-to-r from-amber-500 to-orange-600 rounded-[2rem] p-6 text-white shadow-lg shadow-amber-500/20">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-white/20 rounded-2xl">
                  <Clock size={24} />
                </div>
                <div>
                  <h4 className="font-black uppercase tracking-tight italic">Sua assinatura expira em:</h4>
                  <p className="text-[10px] text-white/70 font-bold uppercase tracking-widest">Aproveite todos os recursos premium</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex flex-col items-center">
                  <span className="text-2xl font-black">{subscriptionTimeLeft.days}</span>
                  <span className="text-[8px] font-black uppercase tracking-widest opacity-70">Dias</span>
                </div>
                <div className="text-2xl font-black opacity-30">:</div>
                <div className="flex flex-col items-center">
                  <span className="text-2xl font-black">{String(subscriptionTimeLeft.hours).padStart(2, '0')}</span>
                  <span className="text-[8px] font-black uppercase tracking-widest opacity-70">Horas</span>
                </div>
                <div className="text-2xl font-black opacity-30">:</div>
                <div className="flex flex-col items-center">
                  <span className="text-2xl font-black">{String(subscriptionTimeLeft.minutes).padStart(2, '0')}</span>
                  <span className="text-[8px] font-black uppercase tracking-widest opacity-70">Min</span>
                </div>
                <div className="text-2xl font-black opacity-30">:</div>
                <div className="flex flex-col items-center">
                  <span className="text-2xl font-black">{String(subscriptionTimeLeft.seconds).padStart(2, '0')}</span>
                  <span className="text-[8px] font-black uppercase tracking-widest opacity-70">Seg</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Wallet Section */}
        {restaurant && wallet && (
          <section className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 dark:bg-blue-900/10 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
            <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                  <ShieldCheck size={24} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-black uppercase tracking-tight italic dark:text-white">Carteira de Crédito</h3>
                  <div className="flex items-center space-x-3">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Saldo Atual</span>
                      <span className={`text-2xl font-black ${wallet.balance < (globalSettings?.minWalletBalance || 5) ? 'text-red-600' : 'text-green-600'}`}>
                        R$ {wallet.balance.toFixed(2)}
                      </span>
                    </div>
                    <div className="h-8 w-px bg-slate-100 dark:bg-slate-800" />
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Mínimo Necessário</span>
                      <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
                        R$ {(globalSettings?.minWalletBalance || 5).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto">
                <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-100 dark:border-slate-700 shrink-0">
                  <div className={`w-2 h-2 rounded-full shadow-[0_0_6px] ${globalSettings?.mercadoPagoAccessToken ? 'bg-green-500 shadow-green-500/50' : 'bg-red-500 shadow-red-500/50'}`} />
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Mercado Pago</span>
                </div>
                <div className="flex flex-col gap-2 w-full sm:w-auto">
                  {globalSettings?.manualRechargeUrl && (
                    <button 
                      onClick={() => window.open(globalSettings.manualRechargeUrl, '_blank')}
                      className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center space-x-2"
                    >
                      <ExternalLink size={16} />
                      <span className="whitespace-nowrap">Recarga Manual</span>
                    </button>
                  )}
                  <button 
                    onClick={() => setIsRecharging(true)}
                    className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg transition-all flex items-center justify-center space-x-2 ${
                      profile?.subscriptionStatus === 'active' 
                      ? 'bg-gradient-to-r from-amber-400 to-amber-600 text-white shadow-amber-500/20 hover:from-amber-500 hover:to-amber-700' 
                      : 'bg-blue-600 text-white shadow-blue-500/20 hover:bg-blue-700'
                    }`}
                  >
                    {profile?.subscriptionStatus === 'active' ? <ShieldCheck size={16} /> : <Plus size={16} />}
                    <span className="whitespace-nowrap">{profile?.subscriptionStatus === 'active' ? 'Mensalidade Ativa' : 'Adicionar Crédito'}</span>
                  </button>
                  <button 
                    onClick={() => setIsWalletHistoryOpen(true)}
                    className="px-6 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center space-x-2"
                  >
                    <History size={16} />
                    <span className="whitespace-nowrap">Ver Histórico</span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}
        
        {/* Status Section */}
        {restaurant && (
          <section className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden relative group">
            <div className={`absolute top-0 right-0 w-24 h-24 ${restaurant.status === 'active' ? 'bg-emerald-50 dark:bg-emerald-900/10' : 'bg-red-50 dark:bg-red-900/10'} rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110`} />
            <div className="relative flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${restaurant.status === 'active' ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-red-600 shadow-red-500/20'}`}>
                  {restaurant.status === 'active' ? <Zap size={24} /> : <XCircle size={24} />}
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-tight italic dark:text-white">Controle de Operação</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className={`w-2 h-2 rounded-full ${restaurant.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {restaurant.status === 'active' ? 'Loja está ONLINE e recebendo pedidos' : 'Loja está OFFLINE (Pausada)'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {restaurant.status !== 'active' ? (
                  <button 
                    onClick={() => setIsConfirmingOnline(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-2"
                  >
                    <CheckCircle size={16} />
                    COMEÇAR / ESTOU ONLINE
                  </button>
                ) : (
                  <button 
                    onClick={handleDisconnect}
                    className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-red-500/20 active:scale-95 transition-all flex items-center gap-2"
                  >
                    <LogOut size={16} />
                    DESCONECTAR
                  </button>
                )}
              </div>
            </div>

            {/* Manual Status Error Checker */}
            {restaurant.status === 'active' && !getRestaurantStatus(restaurant, currentTime).isOpen && (
              <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 animate-pulse">
                <AlertTriangle className="text-red-600" size={20} />
                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase tracking-tight text-red-600">Erro de Visibilidade Detectado</p>
                  <p className="text-[9px] font-bold text-red-400 uppercase">
                    Você está "Online", mas o sistema bloqueou sua loja: {
                      getRestaurantStatus(restaurant, currentTime).reason === 'wallet_blocked' 
                      ? 'BLOQUEIO POR SALDO (Recarregue sua carteira)' 
                      : 'RESTRIÇÃO DO SISTEMA. Contate o suporte.'
                    }
                  </p>
                </div>
              </div>
            )}
            
            {restaurant.status === 'active' && getRestaurantStatus(restaurant, currentTime).isOpen && (
              <div className="mt-4 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3">
                <ShieldCheck className="text-emerald-600" size={20} />
                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase tracking-tight text-emerald-600">Prioridade Manual Ativa</p>
                  <p className="text-[9px] font-bold text-emerald-400 uppercase">
                    Sua loja está FORÇADA ONLINE e visível para todos os clientes, ignorando horários automáticos.
                  </p>
                </div>
              </div>
            )}
          </section>
        )}

        <AnimatePresence>
          {isConfirmingOnline && (
            <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsConfirmingOnline(false)}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl relative z-10 p-8 flex flex-col items-center text-center space-y-6 border border-white/10"
              >
                <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-500/20">
                  <Zap size={32} />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-xl font-black uppercase tracking-tighter italic text-emerald-600">Ficar Online Agora?</h3>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Sua loja ficará aberta IMEDIATAMENTE. Lembre-se: por segurança, o sistema desconecta automaticamente à meia-noite todos os dias.
                  </p>
                </div>

                <div className="flex w-full gap-3">
                  <button 
                    onClick={() => setIsConfirmingOnline(false)}
                    className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-500 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all"
                  >
                    AGORA NÃO
                  </button>
                  <button 
                    onClick={async () => {
                      setIsConfirmingOnline(false);
                      await handleConfirmActivity();
                    }}
                    className="flex-[1.5] bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={14} />
                    SIM, COMEÇAR
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Restaurant Info */}
        <section className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 md:p-8 shadow-sm border border-slate-100 dark:border-slate-800 relative">
          {restaurant && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex flex-col gap-4 w-full">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white">
                      <ExternalLink size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Link da sua Loja</p>
                      <p className="text-xs font-bold text-blue-600 dark:text-blue-400 truncate max-w-[200px] md:max-w-md">{restaurantLink}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(restaurantLink);
                        alert('Link copiado!');
                      }}
                      className="p-3 bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all shadow-sm"
                      title="Copiar Link"
                    >
                      <Copy size={18} />
                    </button>
                    <button 
                      onClick={() => navigate(`/store/${restaurant.id}?fromManager=true`)}
                      className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                    >
                      <Share2 size={16} />
                      Abrir Loja
                    </button>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-blue-100 dark:border-blue-800/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm hidden">
                      <QRCodeCanvas 
                        id="store-qrcode"
                        value={restaurantLink}
                        size={128}
                        level="H"
                        includeMargin={true}
                      />
                    </div>
                    <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white">
                      <QrCode size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Divulgação</p>
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">QR Code para sua loja</p>
                    </div>
                  </div>
                  <button 
                    onClick={downloadQRCode}
                    className="w-full md:w-auto bg-emerald-500 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                  >
                    <Download size={16} />
                    Baixar QR Code
                  </button>
                </div>
                
                {/* Hidden QR Code for canvas capture */}
                <div className="hidden">
                  <QRCodeCanvas 
                    id="store-qrcode"
                    value={restaurantLink}
                    size={512}
                    level="H"
                    includeMargin={true}
                  />
                </div>
              </div>
            </div>
          )}

          {isRegistering ? (
            <form onSubmit={handleCreateRestaurant} className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-2xl font-black uppercase tracking-tight italic text-blue-gradient">Cadastre sua Empresa</h3>
                  <p className="text-slate-400 text-sm">Selecione o tipo de negócio e preencha os dados.</p>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Tipo de Empresa</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: 'restaurante', label: 'Restaurante', icon: <Utensils size={18} /> },
                    { id: 'mercado', label: 'Mercado', icon: <Store size={18} /> },
                    { id: 'farmácia', label: 'Farmácia', icon: <ShieldCheck size={18} /> },
                    { id: 'lanche', label: 'Lanches', icon: <Flame size={18} /> },
                    { id: 'padaria', label: 'Padaria', icon: <Package size={18} /> },
                    { id: 'bebidas', label: 'Bebidas', icon: <Utensils size={18} /> },
                    { id: 'pet shop', label: 'Pet Shop', icon: <User size={18} /> },
                    { id: 'shopping gourmet', label: 'Gourmet', icon: <Star size={18} /> }
                  ].map((mod) => (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => setResModality(mod.id as any)}
                      className={`flex flex-col items-center justify-center p-4 rounded-3xl border-2 transition-all space-y-2 ${resModality === mod.id ? 'border-blue-600 bg-blue-50 text-blue-600 shadow-lg shadow-blue-500/10' : 'border-slate-100 text-slate-400 hover:border-blue-200'}`}
                    >
                      {mod.icon}
                      <span className="text-[10px] font-black uppercase tracking-widest">{mod.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nome do Restaurante</label>
                  <input 
                    id="resNameCreate"
                    type="text" required value={resName} onChange={e => setResName(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Ex: Pizzaria do João"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Imagem do Restaurante</label>
                  <div className="flex gap-2 items-center">
                    <label className="flex-1 bg-blue-50 border-2 border-blue-100 text-blue-600 rounded-2xl p-4 text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all flex items-center justify-center cursor-pointer">
                      Escolher Foto
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => handleFileUpload(e, 'restaurant')} 
                      />
                    </label>
                    <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-100 flex-shrink-0 bg-slate-50 flex items-center justify-center">
                      {resImg ? (
                        <img src={resImg} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <Store size={20} className="text-slate-300" />
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">WhatsApp da Empresa</label>
                  <input 
                    id="resWhatsappCreate"
                    type="text" required value={resWhatsapp} onChange={e => setResWhatsapp(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500/20"
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ponto de Referência</label>
                  <input 
                    id="resReferencePointCreate"
                    type="text" value={resReferencePoint} onChange={e => setResReferencePoint(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Ex: Próximo ao mercado X"
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Descrição *</label>
                  <textarea 
                    id="resDescCreate"
                    required value={resDesc} onChange={e => setResDesc(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500/20 min-h-[80px]"
                    placeholder="Conte um pouco sobre seu restaurante..."
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cidade da Empresa *</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Auto layout */}
                    <div className="bg-slate-50 border-none rounded-2xl p-4 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                          <MapPin size={18} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Localização por GPS</span>
                          {isDetectingCity ? (
                            <div className="flex items-center gap-2 mt-0.5">
                              <Loader2 size={12} className="animate-spin text-blue-500" />
                              <span className="text-xs font-bold text-slate-600 italic">Buscando...</span>
                            </div>
                          ) : (
                            <span className="text-sm font-black text-slate-700 dark:text-slate-800 uppercase italic tracking-tighter">{resCity || 'Não detectado'}</span>
                          )}
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => {
                          setResCity('');
                          if ("geolocation" in navigator) {
                            setIsDetectingCity(true);
                            navigator.geolocation.getCurrentPosition(
                              (position) => {
                                const { latitude, longitude } = position.coords;
                                setResLat(latitude);
                                setResLon(longitude);
                                fetch(`/api/geocode?lat=${latitude}&lon=${longitude}`)
                                  .then(res => res.json())
                                  .then(data => {
                                    if (data && data.address) {
                                      const cityName = data.address.city || data.address.town || data.address.village || data.address.state || 'Localização Detectada';
                                      setResCity(cityName);
                                      const normalizedDetected = cityName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
                                      if (commonData.cities.length > 0) {
                                        const matchedCity = commonData.cities.find((c: any) => c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() === normalizedDetected);
                                        if (matchedCity) {
                                          setResCityId(matchedCity.id);
                                        }
                                      }
                                    }
                                  })
                                  .catch(err => console.error("Error geocoding:", err))
                                  .finally(() => setIsDetectingCity(false));
                              },
                              (err) => {
                                console.warn(err);
                                setIsDetectingCity(false);
                              }
                            );
                          }
                        }}
                        disabled={isDetectingCity}
                        className="p-3 hover:bg-blue-100 rounded-xl transition-all text-blue-600 flex items-center gap-2 group disabled:opacity-50"
                        title="Detectar por GPS"
                      >
                        <RefreshCw size={16} className={`group-hover:rotate-180 transition-transform duration-500 ${isDetectingCity ? 'animate-spin' : ''}`} />
                      </button>
                    </div>

                    {/* Manual layout */}
                    <div className="bg-slate-50 border-none rounded-2xl p-4 space-y-2 shadow-sm flex flex-col justify-center">
                      <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Selecionar Cidade</span>
                      <select
                        value={resCityId}
                        onChange={(e) => {
                          const id = e.target.value;
                          setResCityId(id);
                          const matchedCity = commonData.cities.find((c: any) => c.id === id);
                          if (matchedCity) {
                            setResCity(matchedCity.name);
                            const cLat = matchedCity.latitude != null ? matchedCity.latitude : matchedCity.lat;
                            const cLng = matchedCity.longitude != null ? matchedCity.longitude : matchedCity.lng;
                            if (cLat != null) setResLat(parseFloat(cLat as any));
                            if (cLng != null) setResLon(parseFloat(cLng as any));
                          } else {
                            setResCity('');
                          }
                        }}
                        className="w-full bg-white border-none rounded-xl p-2.5 text-xs font-black uppercase tracking-widest text-slate-700 focus:ring-2 focus:ring-blue-500/20"
                        required
                      >
                        <option value="">Selecione sua cidade...</option>
                        {commonData.cities.map((city: any) => (
                          <option key={city.id} value={city.id}>{city.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 space-y-3">
                  <label id="resPaymentMethodsCreate" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Formas de Pagamento Aceitas *</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { id: 'pix', label: 'Pix', icon: <Zap size={16} /> },
                      { id: 'cash', label: 'Dinheiro', icon: <DollarSign size={16} /> },
                      { id: 'card', label: 'Cartão de Crédito', icon: <CreditCard size={16} /> }
                    ].map((method) => (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => {
                          if (resAcceptedPayments.includes(method.id)) {
                            setResAcceptedPayments(resAcceptedPayments.filter(p => p !== method.id));
                            if (method.id === 'pix' && resPixConfigType === 'company') {
                              setResPixConfigType('none');
                            }
                          } else {
                            setResAcceptedPayments([...resAcceptedPayments, method.id]);
                            if (method.id === 'pix' && resPixConfigType === 'none') {
                              setResPixConfigType('company');
                            }
                          }
                        }}
                        className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                          resAcceptedPayments.includes(method.id)
                            ? 'border-blue-600 bg-blue-50 text-blue-600'
                            : 'border-slate-100 text-slate-400 hover:border-blue-200'
                        }`}
                      >
                        {method.icon}
                        <span className="text-xs font-bold">{method.label}</span>
                        {resAcceptedPayments.includes(method.id) && <CheckCircle size={14} className="ml-auto" />}
                      </button>
                    ))}
                  </div>
                  {resAcceptedPayments.length === 0 && (
                    <p className="text-[10px] text-red-500 font-bold uppercase italic">Selecione pelo menos uma forma de pagamento.</p>
                  )}

                  <AnimatePresence>
                    {resAcceptedPayments.includes('pix') && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Zap size={16} className="text-blue-600" />
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-600">Configurar Chave Pix</h4>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Tipo de Chave</label>
                              <select 
                                value={resPixType} 
                                onChange={e => setResPixType(e.target.value)}
                                className="w-full bg-white border-none rounded-xl p-3 text-xs font-bold focus:ring-2 focus:ring-blue-500/20"
                              >
                                <option value="cpf">CPF</option>
                                <option value="cnpj">CNPJ</option>
                                <option value="email">E-mail</option>
                                <option value="phone">Telefone</option>
                                <option value="random">Chave Aleatória</option>
                              </select>
                            </div>
                            <div className="space-y-2">
                              <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Chave Pix</label>
                              <input 
                                type="text" 
                                value={resPixKey} 
                                onChange={e => setResPixKey(e.target.value)}
                                placeholder="Informe sua chave Pix"
                                className="w-full bg-white border-none rounded-xl p-3 text-xs font-bold focus:ring-2 focus:ring-blue-500/20"
                              />
                            </div>
                            <div className="space-y-2 sm:col-span-2">
                              <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Nome do Destinatário (Opcional)</label>
                              <input 
                                type="text" 
                                value={resPixReceiver} 
                                onChange={e => setResPixReceiver(e.target.value)}
                                placeholder="Nome que aparece no banco"
                                className="w-full bg-white border-none rounded-xl p-3 text-xs font-bold focus:ring-2 focus:ring-blue-500/20"
                              />
                            </div>
                          </div>
                          <p className="text-[8px] text-blue-500 italic uppercase font-bold text-center">Esta chave será enviada automaticamente para o cliente no chat do pedido.</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="md:col-span-2">
                  <div className="p-6 bg-red-50 rounded-3xl border-2 border-red-100 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h4 className="text-xs font-black uppercase tracking-widest text-red-600 italic">Fechamento Forçado</h4>
                        <p className="text-[10px] text-red-400 font-bold uppercase tracking-tight">Ative para fechar a loja imediatamente, ignorando os horários automáticos.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setResForceClosed(!resForceClosed)}
                        className={`w-14 h-7 rounded-full transition-all relative ${resForceClosed ? 'bg-red-500' : 'bg-slate-200'}`}
                      >
                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${resForceClosed ? 'left-8' : 'left-1 shadow-sm'}`} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 p-4 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status Atual (Baseado no horário da cidade)</p>
                    <p className="text-[8px] text-slate-400 font-bold uppercase">O status abaixo reflete as configurações que você está definindo agora.</p>
                  </div>
                  <div className={`flex items-center space-x-2 px-4 py-2 rounded-2xl ${
                    getRestaurantStatus({
                      status: 'active',
                      openingHours: resOpen,
                      closingHours: resClose,
                      weeklyHours: weeklyHours,
                      forceClosed: resForceClosed
                    }).isOpen ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                  }`}>
                    <div className={`w-2 h-2 rounded-full animate-pulse ${
                      getRestaurantStatus({
                        status: 'active',
                        openingHours: resOpen,
                        closingHours: resClose,
                        weeklyHours: weeklyHours,
                        forceClosed: resForceClosed
                      }).isOpen ? 'bg-emerald-500' : 'bg-red-500'
                    }`} />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      {getRestaurantStatus({
                        status: 'active',
                        openingHours: resOpen,
                        closingHours: resClose,
                        weeklyHours: weeklyHours,
                        forceClosed: resForceClosed
                      }).isOpen ? 'Aberto Agora' : 'Fechado Agora'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Abertura Geral</label>
                  <input 
                    id="resOpenCreate"
                    type="text" inputMode="numeric" placeholder="00:00" value={resOpen} onChange={e => setResOpen(formatTimeInput(e.target.value))}
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fechamento Geral</label>
                  <input 
                    id="resCloseCreate"
                    type="text" inputMode="numeric" placeholder="00:00" value={resClose} onChange={e => setResClose(formatTimeInput(e.target.value))}
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="md:col-span-2 space-y-4">
                  <div className="p-6 bg-slate-50 rounded-3xl space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest italic">Configuração de Pix</h4>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tipo de Configuração</label>
                      <select 
                        id="resPixConfigTypeCreate"
                        value={resPixConfigType}
                        onChange={e => setResPixConfigType(e.target.value as any)}
                        className="w-full bg-white border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="none">Sem Pix (Apenas Informativo)</option>
                        <option value="company">Loja (Próprio Pix)</option>
                        <option value="central">Pix Centralizado</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 space-y-4">
                  <div className="p-6 bg-slate-50 rounded-3xl space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest italic flex items-center gap-2">
                      <Bike size={16} />
                      <span>Configuração de Entrega</span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tipo de Cobrança</label>
                        <select 
                          id="resDelFeeTypeCreate"
                          value={delFeeType} 
                          onChange={e => setDelFeeType(e.target.value as any)}
                          className="w-full bg-white border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500/20"
                        >
                          <option value="km">Por KM</option>
                          <option value="fixed">Fixo</option>
                          <option value="free">Grátis</option>
                        </select>
                      </div>
                      {delFeeType === 'free' && (
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pedido Mínimo p/ Entrega Grátis? (R$)</label>
                          <input 
                            type="number" step="0.01" placeholder="Ex: 10.00"
                            value={resMinOrderValue} onChange={e => setResMinOrderValue(e.target.value)}
                            className="w-full bg-white border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500/20"
                          />
                        </div>
                      )}
                      {delFeeType !== 'free' && (
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            {delFeeType === 'km' ? 'Valor por KM (R$)' : 'Valor Fixo (R$)'}
                          </label>
                          <input 
                            type="number" step="0.01" value={delFeePerKm} onChange={e => setDelFeePerKm(e.target.value)}
                            className="w-full bg-white border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500/20"
                          />
                        </div>
                      )}
                      {delFeeType === 'km' && (
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">KM Grátis até</label>
                          <input 
                            type="number" step="0.1" value={delFreeKm} onChange={e => setDelFreeKm(e.target.value)}
                            className="w-full bg-white border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500/20"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 space-y-4">
                  <div className="p-6 bg-slate-50 rounded-3xl space-y-6">
                    <h4 className="text-xs font-black uppercase tracking-widest italic">Configuração de Sons e Notificações</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Som de Novos Pedidos</label>
                        <div className="flex gap-2">
                          <label className="flex-1 bg-white border border-slate-200 text-slate-600 rounded-2xl p-4 text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center justify-center cursor-pointer">
                            Selecionar Som
                            <input type="file" accept="audio/*" className="hidden" onChange={e => handleSoundUpload(e, 'order')} />
                          </label>
                          {resOrderSoundUrl && (
                            <button 
                              type="button"
                              onClick={() => new Audio(resOrderSoundUrl).play()}
                              className="w-12 h-12 bg-blue-500 text-white rounded-2xl flex items-center justify-center hover:bg-blue-600 transition-all"
                            >
                              <span className="text-xs">▶</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Som de Novas Mensagens</label>
                        <div className="flex gap-2">
                          <label className="flex-1 bg-white border border-slate-200 text-slate-600 rounded-2xl p-4 text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center justify-center cursor-pointer">
                            Selecionar Som
                            <input type="file" accept="audio/*" className="hidden" onChange={e => handleSoundUpload(e, 'message')} />
                          </label>
                          {resMessageSoundUrl && (
                            <button 
                              type="button"
                              onClick={() => new Audio(resMessageSoundUrl).play()}
                              className="w-12 h-12 bg-blue-500 text-white rounded-2xl flex items-center justify-center hover:bg-blue-600 transition-all"
                            >
                              <span className="text-xs">▶</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100">
                        <div className="space-y-1">
                          <span className="text-xs font-black uppercase tracking-tight italic">Volume Automático</span>
                          <p className="text-[10px] text-slate-400">Aumenta o volume ao chegar pedido</p>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={resAutoVolume}
                          onChange={e => setResAutoVolume(e.target.checked)}
                          className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100">
                        <div className="space-y-1">
                          <span className="text-xs font-black uppercase tracking-tight italic">Sobreposição de Tela</span>
                          <p className="text-[10px] text-slate-400">Obrigatório para notificações</p>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={resScreenOverlay}
                          onChange={e => setResScreenOverlay(e.target.checked)}
                          className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Horários de Funcionamento (Semanal)</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {(Object.keys(weeklyHours) as Array<keyof WeeklyHours>).map((day) => (
                      <div key={day} className="bg-slate-50 p-4 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase tracking-tight italic capitalize">
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
                            className="rounded text-blue-600 focus:ring-blue-500"
                          />
                        </div>
                        {!weeklyHours[day].closed ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fecha p/ Almoço?</span>
                              <input 
                                type="checkbox" 
                                checked={weeklyHours[day].closesForLunch}
                                onChange={e => setWeeklyHours(prev => ({
                                  ...prev,
                                  [day]: { ...prev[day], closesForLunch: e.target.checked }
                                }))}
                                className="rounded text-blue-600 focus:ring-blue-500"
                              />
                            </div>
                            
                            {!weeklyHours[day].closesForLunch ? (
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Abre</label>
                                  <input 
                                    type="text" placeholder="00:00" value={weeklyHours[day].open}
                                    onChange={e => setWeeklyHours(prev => ({
                                      ...prev,
                                      [day]: { ...prev[day], open: formatTimeInput(e.target.value) }
                                    }))}
                                    className="w-full bg-white border-none rounded-lg p-2 text-[10px] font-bold focus:ring-2 focus:ring-blue-500/20"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Fecha</label>
                                  <input 
                                    type="text" placeholder="00:00" value={weeklyHours[day].close}
                                    onChange={e => setWeeklyHours(prev => ({
                                      ...prev,
                                      [day]: { ...prev[day], close: formatTimeInput(e.target.value) }
                                    }))}
                                    className="w-full bg-white border-none rounded-lg p-2 text-[10px] font-bold focus:ring-2 focus:ring-blue-500/20"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Manhã Abre</label>
                                    <input 
                                      type="text" placeholder="00:00" value={weeklyHours[day].open}
                                      onChange={e => setWeeklyHours(prev => ({
                                        ...prev,
                                        [day]: { ...prev[day], open: formatTimeInput(e.target.value) }
                                      }))}
                                      className="w-full bg-white border-none rounded-lg p-2 text-[10px] font-bold focus:ring-2 focus:ring-blue-500/20"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Manhã Fecha</label>
                                    <input 
                                      type="text" placeholder="00:00" value={weeklyHours[day].lunchStart}
                                      onChange={e => setWeeklyHours(prev => ({
                                        ...prev,
                                        [day]: { ...prev[day], lunchStart: formatTimeInput(e.target.value) }
                                      }))}
                                      className="w-full bg-white border-none rounded-lg p-2 text-[10px] font-bold focus:ring-2 focus:ring-blue-500/20"
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Tarde Abre</label>
                                    <input 
                                      type="text" placeholder="00:00" value={weeklyHours[day].lunchEnd}
                                      onChange={e => setWeeklyHours(prev => ({
                                        ...prev,
                                        [day]: { ...prev[day], lunchEnd: formatTimeInput(e.target.value) }
                                      }))}
                                      className="w-full bg-white border-none rounded-lg p-2 text-[10px] font-bold focus:ring-2 focus:ring-blue-500/20"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Tarde Fecha</label>
                                    <input 
                                      type="text" placeholder="00:00" value={weeklyHours[day].close}
                                      onChange={e => setWeeklyHours(prev => ({
                                        ...prev,
                                        [day]: { ...prev[day], close: formatTimeInput(e.target.value) }
                                      }))}
                                      className="w-full bg-white border-none rounded-lg p-2 text-[10px] font-bold focus:ring-2 focus:ring-blue-500/20"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-[10px] font-bold text-red-500 uppercase tracking-widest text-center py-2">Fechado</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {formError && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600"
                >
                  <XCircle size={20} />
                  <span className="text-xs font-bold uppercase tracking-widest">{formError}</span>
                </motion.div>
              )}
              <button 
                type="submit"
                disabled={isCreating}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <span>Salvar e Ir para o Painel</span>
                )}
              </button>
            </form>
          ) : isEditingRestaurant ? (
            <form onSubmit={handleUpdateRestaurant} className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <h3 className="text-xl font-black uppercase tracking-tight italic">Editar Restaurante</h3>
                  <button 
                    type="button" 
                    onClick={handleRefreshData}
                    className="flex items-center space-x-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                    title="Carregar dados do servidor"
                  >
                    <RefreshCw size={14} />
                    <span>Carregar</span>
                  </button>
                </div>
                <button type="button" onClick={() => setIsEditingRestaurant(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Modalidade da Empresa</label>
                  <select 
                    value={resModality} 
                    onChange={e => setResModality(e.target.value as any)}
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="restaurante">Restaurante</option>
                    <option value="mercado">Mercado</option>
                    <option value="farmácia">Farmácia</option>
                    <option value="lanche">Lanche</option>
                    <option value="padaria">Padaria</option>
                    <option value="bebidas">Bebidas</option>
                    <option value="pet shop">Pet Shop</option>
                    <option value="shopping gourmet">Shopping Gourmet</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nome do Restaurante</label>
                  <input 
                    id="resNameUpdate"
                    type="text" required value={resName} onChange={e => setResName(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Imagem do Restaurante</label>
                  <div className="flex gap-2 items-center">
                    <label className="flex-1 bg-blue-50 border-2 border-blue-100 text-blue-600 rounded-2xl p-4 text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all flex items-center justify-center cursor-pointer">
                      Alterar Foto
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => handleFileUpload(e, 'restaurant')} 
                      />
                    </label>
                    <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-100 flex-shrink-0 bg-slate-50 flex items-center justify-center">
                      {resImg ? (
                        <img src={resImg} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <Store size={20} className="text-slate-300" />
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">WhatsApp da Empresa</label>
                  <input 
                    type="text" required value={resWhatsapp} onChange={e => setResWhatsapp(e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ponto de Referência</label>
                  <input 
                    type="text" value={resReferencePoint} onChange={e => setResReferencePoint(e.target.value)}
                    placeholder="Ex: Próximo ao mercado X"
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Descrição</label>
                  <textarea 
                    id="resDescUpdate"
                    required value={resDesc} onChange={e => setResDesc(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500/20 min-h-[80px]"
                  />
                </div>

                <div className="md:col-span-2 space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Formas de Pagamento Aceitas *</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { id: 'pix', label: 'Pix', icon: <Zap size={16} /> },
                      { id: 'cash', label: 'Dinheiro', icon: <DollarSign size={16} /> },
                      { id: 'card', label: 'Cartão de Crédito', icon: <CreditCard size={16} /> }
                    ].map((method) => (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => {
                          if (resAcceptedPayments.includes(method.id)) {
                            setResAcceptedPayments(resAcceptedPayments.filter(p => p !== method.id));
                            if (method.id === 'pix' && resPixConfigType === 'company') {
                              setResPixConfigType('none');
                            }
                          } else {
                            setResAcceptedPayments([...resAcceptedPayments, method.id]);
                            if (method.id === 'pix' && resPixConfigType === 'none') {
                              setResPixConfigType('company');
                            }
                          }
                        }}
                        className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                          resAcceptedPayments.includes(method.id)
                            ? 'border-blue-600 bg-blue-50 text-blue-600'
                            : 'border-slate-100 text-slate-400 hover:border-blue-200'
                        }`}
                      >
                        {method.icon}
                        <span className="text-xs font-bold">{method.label}</span>
                        {resAcceptedPayments.includes(method.id) && <CheckCircle size={14} className="ml-auto" />}
                      </button>
                    ))}
                  </div>
                  {resAcceptedPayments.length === 0 && (
                    <p className="text-[10px] text-red-500 font-bold uppercase italic">Selecione pelo menos uma forma de pagamento.</p>
                  )}

                  <AnimatePresence>
                    {resAcceptedPayments.includes('pix') && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Zap size={16} className="text-blue-600" />
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-600">Configurar Chave Pix</h4>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Tipo de Chave</label>
                              <select 
                                value={resPixType} 
                                onChange={e => setResPixType(e.target.value)}
                                className="w-full bg-white border-none rounded-xl p-3 text-xs font-bold focus:ring-2 focus:ring-blue-500/20"
                              >
                                <option value="cpf">CPF</option>
                                <option value="cnpj">CNPJ</option>
                                <option value="email">E-mail</option>
                                <option value="phone">Telefone</option>
                                <option value="random">Chave Aleatória</option>
                              </select>
                            </div>
                            <div className="space-y-2">
                              <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Chave Pix</label>
                              <input 
                                type="text" 
                                value={resPixKey} 
                                onChange={e => setResPixKey(e.target.value)}
                                placeholder="Informe sua chave Pix"
                                className="w-full bg-white border-none rounded-xl p-3 text-xs font-bold focus:ring-2 focus:ring-blue-500/20"
                              />
                            </div>
                            <div className="space-y-2 sm:col-span-2">
                              <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Nome do Destinatário (Opcional)</label>
                              <input 
                                type="text" 
                                value={resPixReceiver} 
                                onChange={e => setResPixReceiver(e.target.value)}
                                placeholder="Nome que aparece no banco"
                                className="w-full bg-white border-none rounded-xl p-3 text-xs font-bold focus:ring-2 focus:ring-blue-500/20"
                              />
                            </div>
                          </div>
                          <p className="text-[8px] text-blue-500 italic uppercase font-bold text-center">Esta chave será enviada automaticamente para o cliente no chat do pedido.</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cidade da Empresa *</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Auto layout */}
                    <div className="bg-slate-50 border-none rounded-2xl p-4 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                          <MapPin size={18} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Localização por GPS</span>
                          {isDetectingCity ? (
                            <div className="flex items-center gap-2 mt-0.5">
                              <Loader2 size={12} className="animate-spin text-blue-500" />
                              <span className="text-xs font-bold text-slate-600 italic">Buscando...</span>
                            </div>
                          ) : (
                            <span className="text-sm font-black text-slate-700 dark:text-slate-800 uppercase italic tracking-tighter">{resCity || 'Não detectado'}</span>
                          )}
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => {
                          setResCity('');
                          if ("geolocation" in navigator) {
                            setIsDetectingCity(true);
                            navigator.geolocation.getCurrentPosition(
                              (position) => {
                                const { latitude, longitude } = position.coords;
                                setResLat(latitude);
                                setResLon(longitude);
                                fetch(`/api/geocode?lat=${latitude}&lon=${longitude}`)
                                  .then(res => res.json())
                                  .then(data => {
                                    if (data && data.address) {
                                      const cityName = data.address.city || data.address.town || data.address.village || data.address.state || 'Localização Detectada';
                                      setResCity(cityName);
                                      const normalizedDetected = cityName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
                                      if (commonData.cities.length > 0) {
                                        const matchedCity = commonData.cities.find((c: any) => c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() === normalizedDetected);
                                        if (matchedCity) {
                                          setResCityId(matchedCity.id);
                                        }
                                      }
                                    }
                                  })
                                  .catch(err => console.error("Error geocoding:", err))
                                  .finally(() => setIsDetectingCity(false));
                              },
                              (err) => {
                                console.warn(err);
                                setIsDetectingCity(false);
                              }
                            );
                          }
                        }}
                        disabled={isDetectingCity}
                        className="p-3 hover:bg-blue-100 rounded-xl transition-all text-blue-600 flex items-center gap-2 group disabled:opacity-50"
                        title="Detectar por GPS"
                      >
                        <RefreshCw size={16} className={`group-hover:rotate-180 transition-transform duration-500 ${isDetectingCity ? 'animate-spin' : ''}`} />
                      </button>
                    </div>

                    {/* Manual layout */}
                    <div className="bg-slate-50 border-none rounded-2xl p-4 space-y-2 shadow-sm flex flex-col justify-center">
                      <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Selecionar Cidade</span>
                      <select
                        value={resCityId}
                        onChange={(e) => {
                          const id = e.target.value;
                          setResCityId(id);
                          const matchedCity = commonData.cities.find((c: any) => c.id === id);
                          if (matchedCity) {
                            setResCity(matchedCity.name);
                            const cLat = matchedCity.latitude != null ? matchedCity.latitude : matchedCity.lat;
                            const cLng = matchedCity.longitude != null ? matchedCity.longitude : matchedCity.lng;
                            if (cLat != null) setResLat(parseFloat(cLat as any));
                            if (cLng != null) setResLon(parseFloat(cLng as any));
                          } else {
                            setResCity('');
                          }
                        }}
                        className="w-full bg-white border-none rounded-xl p-2.5 text-xs font-black uppercase tracking-widest text-slate-700 focus:ring-2 focus:ring-blue-500/20"
                        required
                      >
                        <option value="">Selecione sua cidade...</option>
                        {commonData.cities.map((city: any) => (
                          <option key={city.id} value={city.id}>{city.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {!resCity && !isDetectingCity && (
                    <p className="text-[8px] text-red-500 font-bold uppercase mt-1 italic">Por favor, selecione ou detecte uma cidade para continuar.</p>
                  )}
                  <p className="text-[8px] text-slate-400 italic mt-1">Sua cidade e localização serão salvas automaticamente.</p>
                </div>
                <div className="md:col-span-2 p-4 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status Atual (Baseado no horário da cidade)</p>
                    <p className="text-[8px] text-slate-400 font-bold uppercase">O status abaixo reflete as configurações que você está editando agora.</p>
                  </div>
                  <div className={`flex items-center space-x-2 px-4 py-2 rounded-2xl ${
                    isRestaurantOpen({
                      ...restaurant,
                      openingHours: resOpen,
                      closingHours: resClose,
                      weeklyHours: weeklyHours,
                      forceClosed: resForceClosed,
                      status: 'active'
                    } as any, currentTime) ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                  }`}>
                    <div className={`w-2 h-2 rounded-full animate-pulse ${
                      isRestaurantOpen({
                        ...restaurant,
                        openingHours: resOpen,
                        closingHours: resClose,
                        weeklyHours: weeklyHours,
                        forceClosed: resForceClosed,
                        status: 'active'
                      } as any, currentTime) ? 'bg-emerald-500' : 'bg-red-500'
                    }`} />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      {isRestaurantOpen({
                        ...restaurant,
                        openingHours: resOpen,
                        closingHours: resClose,
                        weeklyHours: weeklyHours,
                        forceClosed: resForceClosed,
                        status: 'active'
                      } as any, currentTime) ? 'Aberto Agora' : 'Fechado Agora'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 md:col-span-2">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Abertura Geral</label>
                    <input 
                      type="text" inputMode="numeric" placeholder="00:00" value={resOpen} onChange={e => setResOpen(formatTimeInput(e.target.value))}
                      className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fechamento Geral</label>
                    <input 
                      type="text" inputMode="numeric" placeholder="00:00" value={resClose} onChange={e => setResClose(formatTimeInput(e.target.value))}
                      className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>
                <div className="md:col-span-2 space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Configuração de Pix</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Tipo de Configuração</label>
                      <select 
                        value={resPixConfigType} 
                        onChange={e => setResPixConfigType(e.target.value as any)}
                        className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="none">Sem Pix (Apenas Informativo)</option>
                        <option value="company">Loja (Próprio Pix)</option>
                        <option value="central">Usar Pix da Central</option>
                      </select>
                    </div>
                    {resPixConfigType === 'company' && (
                      <>
                        <div className="space-y-2">
                          <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Tipo de Chave</label>
                          <select 
                            value={resPixType} 
                            onChange={e => setResPixType(e.target.value)}
                            className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500/20"
                          >
                            <option value="cpf">CPF</option>
                            <option value="cnpj">CNPJ</option>
                            <option value="email">E-mail</option>
                            <option value="phone">Telefone</option>
                            <option value="random">Chave Aleatória</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Chave Pix</label>
                          <input 
                            type="text" 
                            value={resPixKey} 
                            onChange={e => setResPixKey(e.target.value)}
                            placeholder="Sua chave pix aqui"
                            className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500/20"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2 space-y-4 border-t border-slate-100 pt-6">
                  <h4 className="text-sm font-black uppercase tracking-tight text-blue-600 flex items-center gap-2 italic">
                    <Bike size={16} />
                    <span>Configuração de Entrega</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tipo de Cobrança</label>
                      <select 
                        value={delFeeType} 
                        onChange={e => setDelFeeType(e.target.value as any)}
                        className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="km">Por KM</option>
                        <option value="fixed">Fixo</option>
                        <option value="free">Grátis</option>
                      </select>
                    </div>
                    {delFeeType === 'free' && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Até qual valor mínimo para entrega grátis? (R$)</label>
                        <input 
                          type="number" 
                          step="0.01"
                          placeholder="Ex: 10.00"
                          value={resMinOrderValue} 
                          onChange={e => setResMinOrderValue(e.target.value)}
                          className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500/20"
                        />
                        <p className="text-[8px] text-blue-500 font-bold uppercase italic">Se o cliente pedir abaixo deste valor, ele será avisado sobre o pedido mínimo.</p>
                      </div>
                    )}
                    {delFeeType !== 'free' && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          {delFeeType === 'km' ? 'Valor por KM (R$)' : 'Valor Fixo (R$)'}
                        </label>
                        <input 
                          type="number" 
                          step="0.01"
                          value={delFeePerKm} 
                          onChange={e => setDelFeePerKm(e.target.value)}
                          className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                    )}
                    {delFeeType === 'km' && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">KM Grátis até</label>
                        <input 
                          type="number" 
                          step="0.1"
                          value={delFreeKm} 
                          onChange={e => setDelFreeKm(e.target.value)}
                          className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2 space-y-4 border-t border-slate-100 pt-6">
                  <h4 className="text-sm font-black uppercase tracking-tight text-blue-600 flex items-center gap-2 italic">
                    <Volume2 size={16} />
                    <span>Configuração de Sons e Notificações</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Som de Novos Pedidos</label>
                      <div className="flex gap-3 items-center">
                        <label className="flex-1 bg-blue-50 border-2 border-blue-100 text-blue-600 rounded-2xl p-4 text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all flex items-center justify-center space-x-2 cursor-pointer">
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
                          <div className="flex items-center space-x-2 bg-slate-50 p-2 rounded-2xl border border-slate-100">
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
                              className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Som de Novas Mensagens</label>
                      <div className="flex gap-3 items-center">
                        <label className="flex-1 bg-blue-50 border-2 border-blue-100 text-blue-600 rounded-2xl p-4 text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all flex items-center justify-center space-x-2 cursor-pointer">
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
                          <div className="flex items-center space-x-2 bg-slate-50 p-2 rounded-2xl border border-slate-100">
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
                              className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg">
                          <Printer size={18} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest">Impressão Automática</p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase">Imprimir novos pedidos automaticamente</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setResAutoPrintOrders(!resAutoPrintOrders)}
                        className={`w-12 h-6 rounded-full transition-all relative ${resAutoPrintOrders ? 'bg-emerald-500' : 'bg-slate-200'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${resAutoPrintOrders ? 'right-1' : 'left-1'}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-500/10 text-red-600 rounded-lg">
                          <CreditCard size={18} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest">Cobrança Mensal</p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase">Ativar cobrança de assinatura mensal</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setResMonthlyBillingEnabled(!resMonthlyBillingEnabled)}
                        className={`w-12 h-6 rounded-full transition-all relative ${resMonthlyBillingEnabled ? 'bg-red-500' : 'bg-slate-200'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${resMonthlyBillingEnabled ? 'right-1' : 'left-1'}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg">
                          <Volume2 size={18} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest">Volume Automático</p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase">Aumenta o volume ao chegar pedido</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setResAutoVolume(!resAutoVolume)}
                        className={`w-12 h-6 rounded-full transition-all relative ${resAutoVolume ? 'bg-blue-600' : 'bg-slate-200'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${resAutoVolume ? 'right-1' : 'left-1'}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/10 text-amber-600 rounded-lg">
                          <Smartphone size={18} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest">Sobreposição de Tela</p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase">Obrigatório para notificações</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          const newValue = !resScreenOverlay;
                          setResScreenOverlay(newValue);
                          if (newValue && typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission !== 'granted') {
                            try {
                              await window.Notification.requestPermission();
                            } catch (err) {
                              console.warn('Error requesting notification permission:', err);
                            }
                          }
                        }}
                        className={`w-12 h-6 rounded-full transition-all relative ${resScreenOverlay ? 'bg-amber-500' : 'bg-slate-200'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${resScreenOverlay ? 'right-1' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="md:col-span-2 space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Horários de Funcionamento (Semanal)</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {(Object.keys(weeklyHours) as Array<keyof WeeklyHours>).map((day) => (
                      <div key={day} className="bg-slate-50 p-4 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase tracking-tight italic capitalize">
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
                            className="rounded text-blue-600 focus:ring-blue-500"
                          />
                        </div>
                        {!weeklyHours[day].closed ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fecha p/ Almoço?</span>
                              <input 
                                type="checkbox" 
                                checked={weeklyHours[day].closesForLunch}
                                onChange={e => setWeeklyHours(prev => ({
                                  ...prev,
                                  [day]: { ...prev[day], closesForLunch: e.target.checked }
                                }))}
                                className="rounded text-blue-600 focus:ring-blue-500"
                              />
                            </div>
                            
                            {!weeklyHours[day].closesForLunch ? (
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Abre</label>
                                  <input 
                                    type="text" placeholder="00:00" value={weeklyHours[day].open}
                                    onChange={e => setWeeklyHours(prev => ({
                                      ...prev,
                                      [day]: { ...prev[day], open: formatTimeInput(e.target.value) }
                                    }))}
                                    className="w-full bg-white border-none rounded-lg p-2 text-[10px] font-bold focus:ring-2 focus:ring-blue-500/20"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Fecha</label>
                                  <input 
                                    type="text" placeholder="00:00" value={weeklyHours[day].close}
                                    onChange={e => setWeeklyHours(prev => ({
                                      ...prev,
                                      [day]: { ...prev[day], close: formatTimeInput(e.target.value) }
                                    }))}
                                    className="w-full bg-white border-none rounded-lg p-2 text-[10px] font-bold focus:ring-2 focus:ring-blue-500/20"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Manhã Abre</label>
                                    <input 
                                      type="text" placeholder="00:00" value={weeklyHours[day].open}
                                      onChange={e => setWeeklyHours(prev => ({
                                        ...prev,
                                        [day]: { ...prev[day], open: formatTimeInput(e.target.value) }
                                      }))}
                                      className="w-full bg-white border-none rounded-lg p-2 text-[10px] font-bold focus:ring-2 focus:ring-blue-500/20"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Manhã Fecha</label>
                                    <input 
                                      type="text" placeholder="00:00" value={weeklyHours[day].lunchStart}
                                      onChange={e => setWeeklyHours(prev => ({
                                        ...prev,
                                        [day]: { ...prev[day], lunchStart: formatTimeInput(e.target.value) }
                                      }))}
                                      className="w-full bg-white border-none rounded-lg p-2 text-[10px] font-bold focus:ring-2 focus:ring-blue-500/20"
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Tarde Abre</label>
                                    <input 
                                      type="text" placeholder="00:00" value={weeklyHours[day].lunchEnd}
                                      onChange={e => setWeeklyHours(prev => ({
                                        ...prev,
                                        [day]: { ...prev[day], lunchEnd: formatTimeInput(e.target.value) }
                                      }))}
                                      className="w-full bg-white border-none rounded-lg p-2 text-[10px] font-bold focus:ring-2 focus:ring-blue-500/20"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Tarde Fecha</label>
                                    <input 
                                      type="text" placeholder="00:00" value={weeklyHours[day].close}
                                      onChange={e => setWeeklyHours(prev => ({
                                        ...prev,
                                        [day]: { ...prev[day], close: formatTimeInput(e.target.value) }
                                      }))}
                                      className="w-full bg-white border-none rounded-lg p-2 text-[10px] font-bold focus:ring-2 focus:ring-blue-500/20"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-[10px] font-bold text-red-500 uppercase tracking-widest text-center py-2">Fechado</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <button 
                type="submit"
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all"
              >
                Salvar Alterações
              </button>
            </form>
          ) : (
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="w-full md:w-48 h-48 rounded-[2rem] overflow-hidden shadow-xl shadow-blue-500/10 bg-slate-100 flex items-center justify-center relative group">
                {restaurant?.imageUrl ? (
                  <img src={restaurant.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <Store size={64} className="text-slate-300" />
                )}
              </div>
              <div className="flex-1 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <h2 className="text-lg md:text-3xl font-black uppercase tracking-tighter italic break-words">{restaurant?.name}</h2>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => navigate(`/customer?restaurantId=${restaurant?.id}`)}
                      className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-2xl text-xs font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                    >
                      <Utensils size={16} />
                      <span>Fazer Pedido (Modo Cliente)</span>
                    </button>
                    <button 
                      onClick={() => {
                        if (restaurant) {
                          setResName(restaurant.name);
                          setResDesc(restaurant.description || '');
                          setResWhatsapp(restaurant.whatsapp);
                          setResReferencePoint(restaurant.referencePoint || '');
                          setResOpen(restaurant.openingHours || '09:00');
                          setResClose(restaurant.closingHours || '22:00');
                          if (restaurant.weeklyHours) setWeeklyHours(restaurant.weeklyHours);
                          setResImg(restaurant.imageUrl || '');
                          setResPixConfigType(restaurant.pixConfigType || 'none');
                          setResPixKey(restaurant.pixKey || '');
                          setResPixType(restaurant.pixType || 'cpf');
                          setResOrderSoundUrl(restaurant.orderSoundUrl || '');
                          setResMessageSoundUrl(restaurant.messageSoundUrl || '');
                          setResAutoVolume(restaurant.autoVolume || false);
                          setResScreenOverlay(restaurant.screenOverlay || false);
                          setResForceClosed(restaurant.forceClosed || false);
                          setResMinOrderValue(String(restaurant.minOrderValue || 0));
                          setDelFeeType(restaurant.deliveryFeeType || 'km');
                          setDelFeePerKm(String(restaurant.deliveryFeePerKm || 0));
                          setDelFreeKm(String(restaurant.deliveryFreeKm || 0));
                          setResMonthlyBillingEnabled(restaurant.monthlyBillingEnabled || false);
                          setIsEditingRestaurant(true);
                        }
                      }} 
                      className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-blue-50 hover:text-blue-600 transition-all"
                    >
                      <Edit size={20} />
                    </button>
                  </div>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">{restaurant?.description}</p>
                <div className="flex flex-wrap items-center gap-6 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {restaurant?.minOrderValue > 0 && (
                    <div className="flex items-center space-x-2 text-amber-500 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100 italic">
                      <AlertCircle size={14} />
                      <span>Pedido Mínimo: R$ {restaurant.minOrderValue.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                    <Clock size={14} />
                    <span>{restaurant?.openingHours} - {restaurant?.closingHours}</span>
                  </div>
                  <div className={`flex items-center space-x-2 ${restaurant && getRestaurantStatus(restaurant, currentTime).isOpen ? 'text-emerald-500' : 'text-red-500'}`}>
                    <div className={`w-2 h-2 rounded-full ${restaurant && getRestaurantStatus(restaurant, currentTime).isOpen ? 'bg-emerald-500' : 'bg-red-600'}`} />
                    <span>{restaurant && getRestaurantStatus(restaurant, currentTime).isOpen ? 'Aberto' : 'Fechado'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Paid Traffic Section */}
        {restaurant && (
          <div className="mb-8 space-y-4">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-[2rem] p-6 text-white shadow-xl shadow-blue-500/20 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <TrendingUp size={24} className="text-blue-200" />
                  <h3 className="text-xl font-black uppercase tracking-tight italic">Tráfego Pago</h3>
                </div>
                <p className="text-blue-100 text-sm font-medium">Coloque seus produtos em destaque com esta opção e aumente suas vendas!</p>
              </div>
              <button 
                onClick={() => setIsPaidTrafficModalOpen(true)}
                className="bg-white text-blue-600 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-105 transition-all shadow-lg"
              >
                Ativar Destaque
              </button>
            </div>

            {/* Active Highlights Countdown */}
            {foodItems.filter(item => {
              const hDate = safeGetDate(item.highlightUntil);
              return hDate && hDate.getTime() > Date.now() - 600000;
            }).length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {foodItems.filter(item => {
                  const hDate = safeGetDate(item.highlightUntil);
                  return hDate && hDate.getTime() > Date.now() - 600000;
                }).map((item, idx) => {
                  const hDate = safeGetDate(item.highlightUntil);
                  const timeLeft = hDate ? hDate.getTime() - currentTime.getTime() : 0;
                  const isExpired = timeLeft <= 0;
                  
                  const diff = Math.abs(timeLeft);
                  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

                  return (
                    <motion.div 
                      key={`highlight-item-${item.id}-${idx}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`rounded-3xl p-4 shadow-lg border-2 flex items-center gap-4 transition-all ${isExpired ? 'bg-red-50 dark:bg-red-900/20 border-red-500 text-red-500' : 'bg-white dark:bg-slate-900 border-blue-100 dark:border-blue-900/30'}`}
                    >
                      <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0">
                        <img src={item.imageUrl || undefined} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-black uppercase tracking-tight italic text-xs truncate ${isExpired ? 'text-red-600' : ''}`}>{item.name}</h4>
                        <div className={`flex items-center gap-2 ${isExpired ? 'text-red-500' : 'text-blue-600 dark:text-blue-400'}`}>
                          <Clock size={12} />
                          <span className="text-[10px] font-black uppercase tracking-widest">
                            {isExpired ? 'Destaque Expirado' : `${days}d ${hours}h ${minutes}m restantes`}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        {restaurant && (
          <div className="flex space-x-4 border-b border-slate-100 overflow-x-auto no-scrollbar cursor-grab active:cursor-grabbing select-none"
            onMouseDown={(e) => {
              const el = e.currentTarget;
              let startX = e.pageX - el.offsetLeft;
              let scrollLeft = el.scrollLeft;
              
              const onMouseMove = (e: MouseEvent) => {
                const x = e.pageX - el.offsetLeft;
                const walk = (x - startX) * 2;
                el.scrollLeft = scrollLeft - walk;
              };
              
              const onMouseUp = () => {
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);
              };
              
              window.addEventListener('mousemove', onMouseMove);
              window.addEventListener('mouseup', onMouseUp);
            }}
          >
            <button 
              onClick={() => setActiveTab('menu')}
              className={`flex-shrink-0 pb-4 text-sm font-black uppercase tracking-widest transition-all relative ${
                activeTab === 'menu' ? 'text-blue-600' : 'text-slate-400'
              }`}
            >
              Cardápio
              {activeTab === 'menu' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-full" />}
            </button>
            <button 
              onClick={() => setActiveTab('orders')}
              className={`flex-shrink-0 pb-4 text-sm font-black uppercase tracking-widest transition-all relative flex items-center space-x-2 ${
                activeTab === 'orders' ? 'text-blue-600' : 'text-slate-400'
              }`}
            >
              <span>Pedidos</span>
              {orders.filter(o => o.status === 'pending').length > 0 && (
                <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                  {orders.filter(o => o.status === 'pending').length}
                </span>
              )}
              {activeTab === 'orders' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-full" />}
            </button>
            <button 
              onClick={() => setActiveTab('reviews')}
              className={`flex-shrink-0 pb-4 text-sm font-black uppercase tracking-widest transition-all relative ${
                activeTab === 'reviews' ? 'text-blue-600' : 'text-slate-400'
              }`}
            >
              Avaliações
              {activeTab === 'reviews' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-full" />}
            </button>
            <button 
              onClick={() => setActiveTab('billing')}
              className={`flex-shrink-0 pb-4 text-sm font-black uppercase tracking-widest transition-all relative ${
                activeTab === 'billing' ? 'text-blue-600' : 'text-slate-400'
              }`}
            >
              Faturamento
              {activeTab === 'billing' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-full" />}
            </button>
            <button 
              onClick={() => setActiveTab('finance')}
              className={`flex-shrink-0 pb-4 text-sm font-black uppercase tracking-widest transition-all relative ${
                activeTab === 'finance' ? 'text-blue-600' : 'text-slate-400'
              }`}
            >
              Financeiro
              {activeTab === 'finance' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-full" />}
            </button>
            <button 
              onClick={() => setActiveTab('printers')}
              className={`flex-shrink-0 pb-4 text-sm font-black uppercase tracking-widest transition-all relative ${
                activeTab === 'printers' ? 'text-blue-600' : 'text-slate-400'
              }`}
            >
              Impressoras
              {activeTab === 'printers' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-full" />}
            </button>
          </div>
        )}

        {/* Menu Management */}
        {restaurant && activeTab === 'menu' && (
          <section className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h3 className="text-xl md:text-2xl font-black uppercase tracking-tighter italic">Cardápio</h3>
              <div className="flex items-center gap-4">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text"
                    placeholder="Pesquisar produtos..."
                    value={menuSearchTerm}
                    onChange={(e) => setMenuSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-100 rounded-full text-xs font-bold focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div className="relative">
                  <button 
                    onClick={() => setIsAddingItem(true)}
                    className={`flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-full text-xs font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all ${showStepTutorial ? 'ring-4 ring-blue-400 ring-offset-4 animate-bounce' : ''}`}
                  >
                    <Plus size={16} />
                    <span>Adicionar Item</span>
                  </button>
                  {showStepTutorial && (
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-lg text-[10px] font-black whitespace-nowrap shadow-xl flex items-center gap-2 z-50">
                      <span>Comece cadastrando seu primeiro produto!</span>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          dismissStepTutorial();
                        }}
                        className="hover:text-blue-200 transition-colors"
                      >
                        <X size={12} />
                      </button>
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 border-8 border-transparent border-t-blue-600" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {isAddingItem && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-[2rem] p-6 md:p-8 shadow-xl border border-blue-100"
              >
                <form onSubmit={handleSaveItem} className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-black uppercase tracking-tight italic">
                      {editingItem ? 'Editar Item' : 'Novo Item'}
                    </h4>
                    <button type="button" onClick={() => { setIsAddingItem(false); setEditingItem(null); }} className="text-slate-400 hover:text-slate-600">
                      <X size={24} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nome do Prato</label>
                      <input 
                        type="text" required value={itemName} onChange={e => setItemName(e.target.value)}
                        className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Preço</label>
                      <input 
                        type="number" inputMode="decimal" step="0.01" required value={itemPrice} onChange={e => setItemPrice(e.target.value)}
                        placeholder="R$"
                        className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Categoria</label>
                      <select 
                        required 
                        value={itemCat} 
                        onChange={e => setItemCat(e.target.value)}
                        className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="">Selecione uma categoria</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.name}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Promoção</label>
                      <input 
                        type="number" inputMode="decimal" step="0.01" value={itemPromoPrice} onChange={e => setItemPromoPrice(e.target.value)}
                        placeholder="R$"
                        className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tempo de Preparo (Minutos)</label>
                      <input 
                        type="number" required value={itemPreparationTime} onChange={e => setItemPreparationTime(e.target.value)}
                        placeholder="Ex: 30"
                        className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                    <div className="flex items-center space-x-4">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Promoção Relâmpago?</label>
                      <input 
                        type="checkbox" checked={itemIsFlash} onChange={e => setItemIsFlash(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex items-center space-x-4">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Produto Disponível?</label>
                      <input 
                        type="checkbox" checked={itemAvailable} onChange={e => setItemAvailable(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex items-center space-x-4">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Entrega Grátis para este Produto?</label>
                      <input 
                        type="checkbox" checked={itemIsFreeDelivery} onChange={e => setItemIsFreeDelivery(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Imagem do Prato</label>
                      <div className="flex flex-col gap-3">
                        <div className="flex gap-2 items-center">
                          <label className="flex-1 bg-blue-50 border-2 border-blue-100 text-blue-600 rounded-2xl p-4 text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all flex items-center justify-center cursor-pointer relative overflow-hidden">
                            <span>Escolher da Galeria</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                              onChange={(e) => handleFileUpload(e, 'item')} 
                            />
                          </label>
                        </div>
                        {itemImg && (
                          <div className="relative w-full h-32 rounded-2xl overflow-hidden border border-slate-100">
                            <img src={itemImg || undefined} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            <button 
                              type="button"
                              onClick={() => setItemImg('')}
                              className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full shadow-lg"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vídeo do Produto (Opcional)</label>
                      <div className="flex flex-col gap-3">
                        <div className="flex gap-2 items-center">
                          <label className="flex-1 bg-blue-50 border-2 border-blue-100 text-blue-600 rounded-2xl p-4 text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all flex items-center justify-center gap-2 cursor-pointer relative overflow-hidden">
                            <Video size={14} />
                            <span>Upload de Vídeo</span>
                            <input 
                              type="file" 
                              accept="video/*" 
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                              onChange={(e) => handleFileUpload(e, 'video')} 
                            />
                          </label>
                        </div>
                        {itemVideoUrl && (
                          <div className="relative w-full h-32 rounded-2xl overflow-hidden border border-slate-100 bg-black">
                            <video src={itemVideoUrl} className="w-full h-full object-contain" />
                            <button 
                              type="button"
                              onClick={() => setItemVideoUrl('')}
                              className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full shadow-lg"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="md:col-span-2 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Adicionais (Opcional)</label>
                          <p className="text-[8px] text-slate-400">Adicionais marcados como "Fixo" serão adicionados automaticamente.</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Limite de Opcionais</label>
                            <input 
                              type="number" 
                              value={itemMaxAddOns} 
                              onChange={e => setItemMaxAddOns(e.target.value)}
                              placeholder="Sem limite"
                              className="w-16 bg-slate-50 border-none rounded-lg p-2 text-[10px] font-bold focus:ring-2 focus:ring-blue-500/20"
                            />
                          </div>
                          <button 
                            type="button"
                            onClick={() => setItemAddOns(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), name: '', price: 0, isFixed: false }])}
                            className="text-blue-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 hover:underline"
                          >
                            <Plus size={12} />
                            Adicionar Novo
                          </button>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {itemAddOns.map((addon, index) => (
                          <div key={`addon-edit-${addon.id || index}-${index}`} className="bg-slate-50 p-4 rounded-2xl space-y-3 border border-slate-100">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <span className="text-[10px] font-black uppercase text-slate-400">Adicional #{index + 1}</span>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    checked={addon.isFixed} 
                                    onChange={e => {
                                      const newAddOns = [...itemAddOns];
                                      newAddOns[index].isFixed = e.target.checked;
                                      setItemAddOns(newAddOns);
                                    }}
                                    className="rounded text-blue-600 focus:ring-blue-500 w-3 h-3"
                                  />
                                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-600">Fixo?</span>
                                </label>
                              </div>
                              <button 
                                type="button" 
                                onClick={() => setItemAddOns(prev => prev.filter(a => a.id !== addon.id))}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div className="space-y-1">
                                <label className="text-[8px] font-black uppercase text-slate-400">Nome</label>
                                <input 
                                  type="text" value={addon.name} 
                                  onChange={e => {
                                    const newAddOns = [...itemAddOns];
                                    newAddOns[index].name = e.target.value;
                                    setItemAddOns(newAddOns);
                                  }}
                                  className="w-full bg-white border-none rounded-xl p-2 text-xs focus:ring-2 focus:ring-blue-500/20"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[8px] font-black uppercase text-slate-400">Preço (Opcional)</label>
                                <input 
                                  type="number" step="0.01" value={addon.price || ''} 
                                  onChange={e => {
                                    const newAddOns = [...itemAddOns];
                                    newAddOns[index].price = e.target.value ? parseFloat(e.target.value) : undefined;
                                    setItemAddOns(newAddOns);
                                  }}
                                  placeholder="R$ 0,00"
                                  className="w-full bg-white border-none rounded-xl p-2 text-xs focus:ring-2 focus:ring-blue-500/20"
                                />
                              </div>
                              <div className="space-y-1" id={`addon-image-upload-${index}`}>
                                <label className="text-[8px] font-black uppercase text-slate-400">Foto (Obrigatória)</label>
                                <div className="flex gap-2">
                                  <div className="flex-1 relative">
                                    <div className="w-full bg-white border-none rounded-xl p-2 text-[10px] font-bold text-slate-500 flex items-center justify-between pointer-events-none">
                                      <span className="truncate">{addon.imageUrl ? 'Imagem Selecionada' : 'Selecionar da Galeria'}</span>
                                      <ImageIcon size={12} className="text-blue-500" />
                                    </div>
                                    <input 
                                      type="file"
                                      accept="image/*"
                                      onChange={(e) => handleFileUpload(e, 'addon', index)}
                                      className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
                                    />
                                  </div>
                                  {addon.imageUrl && (
                                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200">
                                      <img src={addon.imageUrl} className="w-full h-full object-cover" />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Descrição</label>
                      <textarea 
                        required value={itemDesc} onChange={e => setItemDesc(e.target.value)}
                        className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500/20 h-24"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Estoque (Vazio para infinito)</label>
                      <input 
                        type="number" value={itemStock} onChange={e => setItemStock(e.target.value)}
                        className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500/20"
                        placeholder="Ex: 50"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Disponível De</label>
                        <input 
                          type="text" placeholder="00:00" value={itemAvailableFrom} onChange={e => setItemAvailableFrom(formatTimeInput(e.target.value))}
                          className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Disponível Até</label>
                        <input 
                          type="text" placeholder="00:00" value={itemAvailableUntil} onChange={e => setItemAvailableUntil(formatTimeInput(e.target.value))}
                          className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                    </div>

                    {/* Availability Scheduling */}
                    <div className="md:col-span-2 space-y-6 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar size={18} className="text-blue-600" />
                          <h5 className="text-sm font-black uppercase tracking-tight italic">Disponibilidade por Dia e Horário (Opcional)</h5>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (showAvailability) {
                              setItemAvailability({
                                monday: { active: true, startTime: '00:00', endTime: '23:59' },
                                tuesday: { active: true, startTime: '00:00', endTime: '23:59' },
                                wednesday: { active: true, startTime: '00:00', endTime: '23:59' },
                                thursday: { active: true, startTime: '00:00', endTime: '23:59' },
                                friday: { active: true, startTime: '00:00', endTime: '23:59' },
                                saturday: { active: true, startTime: '00:00', endTime: '23:59' },
                                sunday: { active: true, startTime: '00:00', endTime: '23:59' },
                              });
                            }
                            setShowAvailability(!showAvailability);
                          }}
                          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            showAvailability ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                          }`}
                        >
                          {showAvailability ? 'Remover Agendamento' : 'Configurar Agendamento'}
                        </button>
                      </div>

                      {showAvailability && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                            <div key={day} className={`p-4 rounded-2xl border transition-all ${
                              itemAvailability[day].active ? 'bg-white border-blue-500 shadow-sm' : 'bg-slate-100/50 border-transparent opacity-60'
                            }`}>
                              <div className="flex items-center justify-between mb-4">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">
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
                                    checked={itemAvailability[day].active}
                                    onChange={(e) => setItemAvailability({
                                      ...itemAvailability,
                                      [day]: { ...itemAvailability[day], active: e.target.checked }
                                    })}
                                  />
                                  <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                              </div>
                              
                              {itemAvailability[day].active && (
                                <div className="space-y-3">
                                  <div className="space-y-1">
                                    <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Início</label>
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      placeholder="00:00"
                                      value={itemAvailability[day].startTime}
                                      onChange={(e) => setItemAvailability({
                                        ...itemAvailability,
                                        [day]: { ...itemAvailability[day], startTime: formatTimeInput(e.target.value) }
                                      })}
                                      className="w-full p-2 bg-slate-50 rounded-lg border border-slate-100 text-xs font-bold focus:ring-1 focus:ring-blue-500/50"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Fim</label>
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      placeholder="23:59"
                                      value={itemAvailability[day].endTime}
                                      onChange={(e) => setItemAvailability({
                                        ...itemAvailability,
                                        [day]: { ...itemAvailability[day], endTime: formatTimeInput(e.target.value) }
                                      })}
                                      className="w-full p-2 bg-slate-50 rounded-lg border border-slate-100 text-xs font-bold focus:ring-1 focus:ring-blue-500/50"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <button 
                    type="submit"
                    disabled={isSavingItem}
                    className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {isSavingItem && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    <span>{editingItem ? 'Atualizar Item' : 'Adicionar ao Cardápio'}</span>
                  </button>
                </form>
              </motion.div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {foodItems
                .filter(item => (item.name?.toLowerCase() || '').includes(menuSearchTerm.toLowerCase()) || (item.description?.toLowerCase() || '').includes(menuSearchTerm.toLowerCase()))
                .map((item, idx) => (
                <div key={`menu-item-${item.id}-${idx}`} className="bg-white rounded-[2rem] p-4 flex space-x-4 shadow-sm border border-slate-100 group hover:shadow-xl hover:shadow-blue-500/5 transition-all">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0">
                    <img src={item.imageUrl || undefined} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-black uppercase tracking-tight italic truncate">{item.name}</h4>
                        <button
                          onClick={async () => {
                            try {
                              await updateDoc(doc(db, 'food_items', item.id), { available: !item.available });
                            } catch (error) {
                              handleFirestoreError(error, OperationType.UPDATE, `food_items/${item.id}`);
                            }
                          }}
                          className={`w-8 h-4 rounded-full relative transition-colors ${item.available ? 'bg-emerald-500' : 'bg-red-500'}`}
                        >
                          <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${item.available ? 'right-0.5' : 'left-0.5'}`} />
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400 line-clamp-2 leading-tight">{item.description}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-blue-600">R$ {item.price.toFixed(2)}</span>
                        {item.stock !== null && item.stock !== undefined && (
                          <span className="text-[8px] font-bold text-slate-400 uppercase">Estoque: {item.stock}</span>
                        )}
                        {(item.availableFrom || item.availableUntil) && (
                          <span className="text-[8px] font-bold text-slate-400 uppercase">
                            {item.availableFrom || '00:00'} - {item.availableUntil || '23:59'}
                          </span>
                        )}
                        {!item.available && (
                          <span className="text-[8px] font-black text-red-500 uppercase italic">Indisponível</span>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => {
                            setEditingItem(item);
                            setItemName(item.name);
                            setItemDesc(item.description);
                            setItemPrice(item.price.toString());
                            setItemPromoPrice(item.promoPrice?.toString() || '');
                            setItemIsFlash(item.isFlashSale || false);
                            setItemIsFreeDelivery(item.isDeliveryFree || false);
                            setItemCat(item.category);
                            setItemImg(item.imageUrl);
                            setItemVideoUrl(item.videoUrl || '');
                            setItemStock(item.stock?.toString() || '');
                            setItemAvailableFrom(item.availableFrom || '');
                            setItemAvailableUntil(item.availableUntil || '');
                            setItemAvailable(item.available);
                            if (item.availability) {
                              setItemAvailability(item.availability);
                              setShowAvailability(true);
                            } else {
                              setItemAvailability({
                                monday: { active: true, startTime: '00:00', endTime: '23:59' },
                                tuesday: { active: true, startTime: '00:00', endTime: '23:59' },
                                wednesday: { active: true, startTime: '00:00', endTime: '23:59' },
                                thursday: { active: true, startTime: '00:00', endTime: '23:59' },
                                friday: { active: true, startTime: '00:00', endTime: '23:59' },
                                saturday: { active: true, startTime: '00:00', endTime: '23:59' },
                                sunday: { active: true, startTime: '00:00', endTime: '23:59' },
                              });
                              setShowAvailability(true);
                            }
                            setItemPreparationTime(item.preparationTimeMinutes?.toString() || '');
                            setItemMaxAddOns(item.maxAddOns?.toString() || '');
                            setIsAddingItem(true);
                          }} 
                          className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:text-blue-600 transition-colors"
                        >
                          <Edit size={14} />
                        </button>
                        <button 
                          onClick={() => handleDeleteItem(item.id)} 
                          disabled={deletingItemId === item.id}
                          className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:text-red-500 transition-colors disabled:opacity-50"
                        >
                          {deletingItemId === item.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Reviews Panel */}
        {restaurant && activeTab === 'billing' && (
          <motion.div 
            ref={billingRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black uppercase tracking-tight italic">Faturamento</h2>
              <button 
                onClick={handleDownloadBillingPDF}
                disabled={isDownloadingPDF}
                className="flex items-center space-x-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all disabled:opacity-50"
              >
                {isDownloadingPDF ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <Download size={16} />
                )}
                <span>Baixar PDF</span>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-emerald-100 dark:bg-emerald-500/10 rounded-2xl text-emerald-600">
                    <DollarSign size={24} />
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => setBillingRange('today')}
                      className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase ${billingRange === 'today' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
                    >
                      Hoje
                    </button>
                    <button 
                      onClick={() => setBillingRange('yesterday')}
                      className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase ${billingRange === 'yesterday' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
                    >
                      Ontem
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Total Vendido</p>
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                    R$ {getBillingData().total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </h3>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-500/10 rounded-2xl text-blue-600">
                    <ClipboardList size={24} />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Total de Pedidos</p>
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                    {getBillingData().count}
                  </h3>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-blue-100 dark:bg-blue-500/10 rounded-2xl text-blue-600">
                      <Calendar size={24} />
                    </div>
                    <div>
                      <h3 className="font-black uppercase tracking-tight text-slate-900 dark:text-white">Filtro Customizado</h3>
                      <p className="text-slate-400 text-xs font-medium">Selecione uma data específica</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="date"
                      value={billingDate}
                      onChange={(e) => {
                        setBillingDate(e.target.value);
                        setBillingRange('custom');
                      }}
                      className="bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Desempenho de Vendas</h3>
                  <p className="text-slate-400 text-sm font-medium">Volume de vendas por hora</p>
                </div>
                <div className="flex items-center space-x-2 text-emerald-500 font-black italic">
                  <TrendingUp size={20} />
                  <span>+12.5%</span>
                </div>
              </div>
              
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={getBillingData().chartData}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="hour" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }}
                      tickFormatter={(value) => `R$${value}`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        border: 'none', 
                        borderRadius: '1rem',
                        color: '#fff',
                        fontWeight: 'bold'
                      }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="total" 
                      stroke="#2563eb" 
                      strokeWidth={4}
                      fillOpacity={1} 
                      fill="url(#colorTotal)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        )}
        {restaurant && activeTab === 'reviews' && (
          <section className="space-y-6">
            <div className="space-y-4">
              {reviews.length === 0 ? (
                <p className="text-center text-slate-400 py-12">Nenhuma avaliação recebida.</p>
              ) : (
                (Array.from(new Map(reviews.map(r => [r.id, r])).values()) as Review[]).map(review => (
                  <div key={review.id} className="bg-white rounded-[2rem] p-6 border border-slate-100 flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-black uppercase tracking-tight italic">{review.customerName}</span>
                        <div className="flex">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} size={10} fill={review.rating >= s ? '#2563eb' : 'none'} className={review.rating >= s ? 'text-blue-600' : 'text-slate-200'} />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-slate-600">{review.comment}</p>
                      <p className="text-[10px] text-slate-300">{safeFormatDateOnly(review.createdAt)}</p>
                    </div>
                    <button 
                      onClick={() => handleDeleteReview(review.id)} 
                      disabled={deletingItemId === review.id}
                      className="p-2 text-slate-300 hover:text-red-500 transition-colors disabled:opacity-50"
                    >
                      {deletingItemId === review.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* Marketing Panel */}
        {restaurant && activeTab === 'marketing' && (
          <section className="space-y-12">
            {/* Banners Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl md:text-2xl font-black uppercase tracking-tighter italic">Banners Promocionais</h3>
                <button 
                  onClick={() => setIsAddingBanner(true)}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-full text-xs font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all"
                >
                  <Plus size={16} />
                  <span>Novo Banner</span>
                </button>
              </div>

              {isAddingBanner && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-[2rem] p-8 shadow-xl border border-blue-100"
                >
                  <form onSubmit={handleSaveBanner} className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-black uppercase tracking-tight italic">Configurar Banner</h4>
                      <button type="button" onClick={() => { setIsAddingBanner(false); setEditingBanner(null); }} className="text-slate-400 hover:text-slate-600">
                        <X size={24} />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Imagem do Banner</label>
                        <div className="flex flex-col gap-3">
                          <div className="flex gap-2 items-center">
                            <label className="flex-1 bg-blue-50 border-2 border-blue-100 text-blue-600 rounded-2xl p-4 text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all flex items-center justify-center cursor-pointer">
                              Escolher da Galeria
                              <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={(e) => handleFileUpload(e, 'banner')} 
                              />
                            </label>
                            <button 
                              type="button"
                              onClick={() => openGallery('banner')}
                              className="p-4 bg-slate-100 text-slate-400 rounded-2xl hover:bg-slate-200 transition-all flex items-center justify-center"
                              title="Banco de Imagens"
                            >
                              <ImageIcon size={18} />
                            </button>
                          </div>
                          {bannerImg && (
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pré-visualização Mobile (Arraste para ajustar)</label>
                                <button 
                                  type="button"
                                  onClick={() => setBannerImg('')}
                                  className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-600 transition-colors"
                                >
                                  Remover Imagem
                                </button>
                              </div>
                              <div className="relative w-full aspect-[4/5] max-w-[280px] mx-auto rounded-[3rem] overflow-hidden border-8 border-slate-900 shadow-2xl bg-black group cursor-move">
                                <img 
                                  src={bannerImg || undefined} 
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
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent p-6">
                                  <h3 className="text-lg font-black text-white uppercase tracking-tighter italic leading-none">{bannerTitle || 'Título do Banner'}</h3>
                                </div>
                                <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest text-white pointer-events-none">
                                  {Math.round(bannerPosition.x)}% {Math.round(bannerPosition.y)}%
                                </div>
                              </div>
                              <p className="text-[10px] text-center text-slate-400 font-medium">Esta é a visão exata do cliente no celular.</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Título do Banner</label>
                        <input 
                          type="text" required value={bannerTitle} onChange={e => setBannerTitle(e.target.value)}
                          placeholder="Ex: Promoção de Verão"
                          className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                      <div className="flex items-center space-x-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ativo?</label>
                        <input 
                          type="checkbox" checked={bannerActive} onChange={e => setBannerActive(e.target.checked)}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold">Salvar Banner</button>
                  </form>
                </motion.div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {banners.map((banner, idx) => (
                  <div key={`mgr-banner-${banner.id}-${idx}`} className="bg-white rounded-[2rem] overflow-hidden border border-slate-100 shadow-sm group relative">
                    <div className="h-48 relative">
                      <img 
                        src={banner.imageUrl || undefined} 
                        className="w-full h-full object-cover" 
                        style={{ objectPosition: banner.objectPosition || '50% 50%' }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                        <h4 className="text-white font-black uppercase italic tracking-tighter">{banner.title}</h4>
                      </div>
                      <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${banner.active ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                        {banner.active ? 'Ativo' : 'Inativo'}
                      </div>
                    </div>
                    <div className="p-4 flex justify-end space-x-2">
                      <button 
                        onClick={() => {
                          setEditingBanner(banner);
                          setBannerImg(banner.imageUrl);
                          setBannerTitle(banner.title);
                          setBannerActive(banner.active);
                          if (banner.objectPosition) {
                            const [x, y] = banner.objectPosition.split(' ').map(p => parseFloat(p));
                            setBannerPosition({ x, y });
                          } else {
                            setBannerPosition({ x: 50, y: 50 });
                          }
                          setIsAddingBanner(true);
                        }}
                        className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:text-blue-600 transition-colors"
                      >
                        <Edit size={14} />
                      </button>
                      <button 
                        onClick={() => handleDeleteBanner(banner.id)} 
                        disabled={deletingItemId === banner.id}
                        className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:text-red-500 transition-colors disabled:opacity-50"
                      >
                        {deletingItemId === banner.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pop-ups Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl md:text-2xl font-black uppercase tracking-tighter italic">Pop-ups de Marketing</h3>
                <button 
                  onClick={() => setIsAddingPopup(true)}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-full text-xs font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all"
                >
                  <Plus size={16} />
                  <span>Novo Pop-up</span>
                </button>
              </div>

              {isAddingPopup && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-[2rem] p-8 shadow-xl border border-blue-100"
                >
                  <form onSubmit={handleSavePopup} className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-black uppercase tracking-tight italic">Configurar Pop-up</h4>
                      <button type="button" onClick={() => { setIsAddingPopup(false); setEditingPopup(null); }} className="text-slate-400 hover:text-slate-600">
                        <X size={24} />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Imagem do Pop-up</label>
                        <div className="flex flex-col gap-3">
                          <div className="flex gap-2 items-center">
                            <label className="flex-1 bg-blue-50 border-2 border-blue-100 text-blue-600 rounded-2xl p-4 text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all flex items-center justify-center cursor-pointer">
                              Escolher da Galeria
                              <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={(e) => handleFileUpload(e, 'popup')} 
                              />
                            </label>
                            {/* Gallery button removed */}
                          </div>
                          {popupImg && (
                            <div className="relative w-full h-32 rounded-2xl overflow-hidden border border-slate-100">
                              <img src={popupImg || undefined} className="w-full h-full object-cover" />
                              <button 
                                type="button"
                                onClick={() => setPopupImg('')}
                                className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full shadow-lg"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Link de Destino (Opcional)</label>
                        <input 
                          type="url" value={popupLink} onChange={e => setPopupLink(e.target.value)}
                          placeholder="https://exemplo.com"
                          className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                      <div className="flex items-center space-x-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ativo?</label>
                        <input 
                          type="checkbox" checked={popupActive} onChange={e => setPopupActive(e.target.checked)}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold">Salvar Pop-up</button>
                  </form>
                </motion.div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {popups.map((popup, idx) => (
                  <div key={`mgr-popup-${popup.id}-${idx}`} className="bg-white rounded-[2rem] overflow-hidden border border-slate-100 shadow-sm group">
                    <div className="h-40 relative">
                      <img src={popup.imageUrl || undefined} className="w-full h-full object-cover" />
                      <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${popup.active ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                        {popup.active ? 'Ativo' : 'Inativo'}
                      </div>
                    </div>
                    <div className="p-4 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 truncate max-w-[150px]">{popup.linkUrl || 'Sem link'}</span>
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => {
                            setEditingPopup(popup);
                            setPopupImg(popup.imageUrl);
                            setPopupLink(popup.linkUrl);
                            setPopupActive(popup.active);
                            setIsAddingPopup(true);
                          }}
                          className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:text-blue-600 transition-colors"
                        >
                          <Edit size={14} />
                        </button>
                        <button 
                          onClick={() => handleDeletePopup(popup.id)} 
                          disabled={deletingItemId === popup.id}
                          className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:text-red-500 transition-colors disabled:opacity-50"
                        >
                          {deletingItemId === popup.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Orders Panel */}
        {restaurant && activeTab === 'orders' && (
          <section id="orders-section" className="space-y-6">
            {!restaurant.cityId && (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between gap-3 text-amber-800">
                <div className="flex items-center gap-3">
                  <AlertCircle size={20} className="text-amber-600" />
                  <div>
                    <p className="text-xs font-black uppercase tracking-tight">Sua empresa não está vinculada a uma cidade!</p>
                    <p className="text-[10px] font-medium opacity-70">Para que seus produtos apareçam corretamente em Porto Velho ou outra cidade, configure a localização nas configurações da sua empresa.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsEditingRestaurant(true)}
                  className="bg-amber-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap shadow-md shadow-amber-600/20"
                >
                  Configurar Cidade
                </button>
              </div>
            )}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-black uppercase tracking-tighter italic text-slate-900">Gestão de Pedidos</h3>
                  <button 
                    onClick={() => setIsConfiguringColors(true)}
                    className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all shadow-sm"
                    title="Configurar cores dos pedidos"
                  >
                    <Clock size={20} />
                  </button>
                  <button 
                    onClick={() => {
                      setEditingPrinter(null);
                      setPrinterName('');
                      setPrinterIp('');
                      setPrinterPort('9100');
                      setPrinterConnection('network');
                      setPrinterPaperSize('80mm');
                      setPrinterActive(true);
                      setPrinterAutoPrint(true);
                      setIsAddingPrinter(true);
                    }}
                    className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all shadow-sm"
                    title="Configurar Impressora Térmica"
                  >
                    <Printer size={20} />
                  </button>
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Acompanhe e gerencie suas vendas em tempo real</p>
              </div>
              
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => {
                    if (isBalanceLow) {
                      setShowLowCreditModal(true);
                      return;
                    }
                    setIsAddingManualOrder(true);
                  }}
                  disabled={isBalanceLow}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all ${
                    isBalanceLow 
                      ? 'bg-slate-400 text-white cursor-not-allowed opacity-70' 
                      : 'bg-emerald-600 text-white shadow-emerald-500/20 hover:bg-emerald-700 hover:scale-[1.02] active:scale-95'
                  }`}
                >
                  <Plus size={14} />
                  <span>Novo Pedido Manual</span>
                </button>
              </div>
            </div>

            {isBalanceLow && (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-red-50 border-2 border-red-100 p-6 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-red-500/5"
              >
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 shadow-inner">
                    <ShieldAlert size={28} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-lg font-black uppercase tracking-tight italic text-red-600 leading-none">Saldo Insuficiente</p>
                    <p className="text-xs font-bold text-red-800/60 leading-tight">
                      Você atingiu o limite mínimo de R$ {minBalance.toFixed(2)}. 
                      As interações com pedidos foram bloqueadas.
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsRecharging(true)}
                  className="w-full md:w-auto bg-red-600 text-white px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-600/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <CreditCard size={16} />
                  Recarregar Agora
                </button>
              </motion.div>
            )}

            {/* Status Filter Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                <button 
                  onClick={deepRefresh}
                  className="flex items-center gap-2 px-4 py-3 bg-white hover:bg-slate-50 text-slate-700 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest border-2 border-slate-100 shadow-sm group"
                >
                  <RefreshCw size={14} className={`text-slate-400 group-hover:rotate-180 transition-transform duration-500 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Recarregar página
                </button>
              </div>

              {/* Date Filter Input */}
              <div className="flex items-center gap-2 bg-white px-4 py-2 border-2 border-slate-100 rounded-2xl shadow-sm self-start sm:self-auto">
                <Calendar size={16} className="text-slate-400" />
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 whitespace-nowrap">Buscar por Data:</span>
                <input 
                  type="date"
                  value={orderFilterDate}
                  onChange={(e) => setOrderFilterDate(e.target.value)}
                  className="bg-transparent border-none text-slate-700 text-xs font-bold outline-none focus:ring-0 p-1"
                />
                {orderFilterDate && (
                  <button 
                    onClick={() => setOrderFilterDate('')}
                    className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-600 px-2 pl-3 py-1.5 rounded-xl border border-red-100 bg-red-50/50 hover:bg-red-55 transition-all shadow-sm font-black"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar cursor-grab active:cursor-grabbing select-none"
              onMouseDown={(e) => {
                const el = e.currentTarget;
                let startX = e.pageX - el.offsetLeft;
                let scrollLeft = el.scrollLeft;
                
                const onMouseMove = (e: MouseEvent) => {
                  const x = e.pageX - el.offsetLeft;
                  const walk = (x - startX) * 2;
                  el.scrollLeft = scrollLeft - walk;
                };
                
                const onMouseUp = () => {
                  window.removeEventListener('mousemove', onMouseMove);
                  window.removeEventListener('mouseup', onMouseUp);
                };
                
                window.addEventListener('mousemove', onMouseMove);
                window.addEventListener('mouseup', onMouseUp);
              }}
            >
              {[
                { id: 'all', label: 'Todos', activeClass: 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' },
                { id: 'pending', label: 'Pendentes', activeClass: 'bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-500/20' },
                { id: 'preparing', label: 'Em Preparo', activeClass: 'bg-amber-600 border-amber-600 text-white shadow-lg shadow-amber-500/20' },
                { id: 'ready', label: 'Prontos', activeClass: 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-500/20' },
                { id: 'delivering', label: 'Em Entrega', activeClass: 'bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-500/20' },
                { id: 'en_route', label: 'Em Rota', activeClass: 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/20' },
                { id: 'delivered', label: 'Entregues', activeClass: 'bg-slate-600 border-slate-600 text-white shadow-lg shadow-slate-500/20' },
                { id: 'cancelled', label: 'Canceladas', activeClass: 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-500/20' }
              ].map((status, idx) => (
                <button
                  key={`filter-${status.id}-${idx}`}
                  onClick={() => setFilterStatus(status.id)}
                  className={`flex-shrink-0 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all border-2 ${
                    filterStatus === status.id
                      ? status.activeClass
                      : `bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50`
                  }`}
                >
                  {status.label}
                  <span className={`ml-2 px-2 py-0.5 rounded-lg text-[9px] ${
                    filterStatus === status.id ? 'bg-white/20' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {status.id === 'all' 
                      ? orders.filter(o => !orderFilterDate || getOrderDateString(o) === orderFilterDate).length 
                      : status.id === 'cancelled'
                        ? orders.filter(o => (!orderFilterDate || getOrderDateString(o) === orderFilterDate) && (o.status === 'cancelled' || o.status === 'rejected')).length
                        : orders.filter(o => (!orderFilterDate || getOrderDateString(o) === orderFilterDate) && o.status === status.id).length}
                  </span>
                </button>
              ))}
            </div>

            {processedOrdersData.active.length + processedOrdersData.closed.length === 0 ? (
              <div className="bg-white rounded-[3rem] p-20 text-center border-2 border-dashed border-slate-100 space-y-6">
                <div className="w-24 h-24 bg-slate-50 rounded-full mx-auto flex items-center justify-center text-slate-200">
                  <Package size={48} strokeWidth={1} />
                </div>
                <div className="space-y-2">
                  <p className="text-slate-800 font-black uppercase tracking-widest text-sm">Nenhum pedido encontrado</p>
                  <p className="text-slate-400 text-xs font-medium">Não há pedidos com o status selecionado no momento.</p>
                </div>
              </div>
            ) : (
              <AnimatePresence mode='popLayout'>
                {!isRefreshing && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="grid grid-cols-1 xl:grid-cols-2 gap-6"
                  >
                        {finalOrdersToRender.map((order) => {
              const uniqueOrderKey = `order-card-v2-${order.id}`;
          const orderColor = getOrderColor(order, currentTime, warningMinutes);
          const isExpired = orderColor.isExpired;
          const isWhitePhase = isExpired && currentTime.getSeconds() % 2 === 0;

          return (
            <motion.div 
              key={uniqueOrderKey}
              initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`${(orderColor.isFinished || isBalanceLow) ? 'bg-slate-100 grayscale opacity-80' : 'bg-white'} rounded-3xl border-2 shadow-sm hover:shadow-lg transition-all group overflow-hidden relative ${isWhitePhase ? 'border-white' : orderColor.border}`}
                        >
                        {(() => {
                          const ride = rides.find(r => (r.orderId === order.id || r.destinations?.some(d => d.orderId === order.id)) && r.status !== 'cancelled');
                          const isTupaAccepted = ride?.status === 'accepted' || ride?.status === 'arrived_at_pickup' || (order as any).courierAssigned;
                          const isTupaArrived = ride?.status === 'arrived_at_pickup';
                          const estimatedCost = ride?.estimatedCost;
                          const estimatedDistance = ride?.estimatedDistance;

                          return (
                            <>
                        {/* Payment Method Header Pulse (Pix, Dinheiro, Cartão) */}
                        {order.paymentMethod && (
                          <motion.div 
                            animate={{ opacity: [1, 0.8, 1] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            className={`w-full py-4 px-6 flex items-center justify-center gap-4 ${
                              order.paymentMethod === 'pix' ? 'bg-blue-600' : 'bg-orange-600'
                            } text-white shadow-lg relative z-20 border-b-4 border-white/10`}
                          >
                            <motion.div
                              animate={{ scale: [1, 1.15, 1] }}
                              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                              className="flex items-center justify-center"
                            >
                              {order.paymentMethod === 'pix' ? <Zap size={24} fill="currentColor" /> : 
                               order.paymentMethod === 'card' ? <CreditCard size={24} /> : 
                               <DollarSign size={24} />}
                            </motion.div>
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-90 leading-none mb-1">Forma de Pagamento</span>
                              <span className="text-xl font-black uppercase tracking-tighter italic leading-none">
                                {order.paymentMethod === 'pix' ? 'Pix' : 
                                 order.paymentMethod === 'card' ? 'Cartão de Crédito' : 
                                 'Dinheiro'}
                              </span>
                            </div>
                          </motion.div>
                        )}

                        {/* Order Timer */}
                        <div className={`absolute top-16 right-2 px-3 py-1 rounded-full border-2 font-black text-[9px] tracking-widest uppercase shadow-sm flex items-center gap-1.5 z-10 ${isWhitePhase ? 'bg-red-600 text-white border-red-600' : `bg-white/90 backdrop-blur-sm ${orderColor.border} ${orderColor.text}`}`}>
                          <Clock size={10} />
                          {formatTimeDiff(order, currentTime)}
                        </div>

                        <div className="p-6 space-y-4">
                          <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full grayscale-0 ${
                                order.status === 'pending' ? 'bg-orange-100 text-orange-600' :
                                order.status === 'preparing' ? 'bg-blue-100 text-blue-600' :
                                order.status === 'ready' ? 'bg-emerald-100 text-emerald-600' :
                                order.status === 'delivering' ? 'bg-purple-100 text-purple-600' :
                                order.status === 'en_route' ? 'bg-indigo-100 text-indigo-600' :
                                order.status === 'delivered' ? 'bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.5)]' :
                                order.status === 'cancelled' ? 'bg-slate-500 text-white' :
                                order.status === 'rejected' ? 'bg-red-100 text-red-600' :
                                'bg-slate-200 text-slate-500'
                              }`}>
                                {order.status === 'pending' ? 'Pendente' :
                                 order.status === 'preparing' ? 'Em Preparo' :
                                 order.status === 'ready' ? 'Pronto' :
                                 order.status === 'delivering' ? 'Em Entrega' :
                                 order.status === 'en_route' ? 'Em Rota' :
                                 order.status === 'delivered' ? 'Finalizado' :
                                 order.status === 'cancelled' ? 'Cancelado' :
                                 'Rejeitado'}
                              </span>
                              <span className="text-[9px] text-slate-400 font-bold tracking-widest">#{order.id.slice(-6).toUpperCase()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-lg font-black text-slate-800 italic uppercase tracking-tighter leading-none">
                                {order.customerName || 'Cliente'}
                              </h4>
                              {order.customerWhatsapp && (
                                <button 
                                  onClick={() => {
                                    if (isBalanceLow) {
                                      setShowLowCreditModal(true);
                                      return;
                                    }
                                    window.open(`https://wa.me/${order.customerWhatsapp!.replace(/\D/g, '')}`, '_blank');
                                  }}
                                  className={`px-2.5 py-1 text-white rounded-lg transition-all shadow-sm flex items-center gap-1.5 group/wa ${
                                    isBalanceLow ? 'bg-slate-400 cursor-not-allowed opacity-60' : 'bg-emerald-500 hover:bg-emerald-600'
                                  }`}
                                  title={isBalanceLow ? "Saldo insuficiente" : "Abrir WhatsApp do cliente"}
                                >
                                  <MessageCircle size={10} fill="currentColor" className="group-hover/wa:scale-110 transition-transform" />
                                  <motion.span
                                    animate={{ opacity: [1, 0.6, 1] }}
                                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                                    className="text-[8px] font-black uppercase tracking-widest"
                                  >
                                    WhatsApp
                                  </motion.span>
                                </button>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-slate-500">
                              <MapPin size={10} className="text-blue-500" />
                              <p className="text-[10px] font-bold uppercase tracking-tight truncate max-w-[200px]">
                                {order.deliveryAddress}
                              </p>
                            </div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                              {safeFormatDate(order.createdAt)}
                            </p>

                            {/* Assigned Employees */}
                            {order.assignedEmployees && order.assignedEmployees.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {order.assignedEmployees.map((emp, idx) => (
                                  <motion.div
                                    key={`${order.id}-emp-${idx}`}
                                    animate={{ scale: [1, 1.05, 1] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                    className="bg-blue-600 text-white text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full flex items-center gap-1 shadow-sm"
                                  >
                                    <User size={8} />
                                    <span>{emp}</span>
                                    <span className="animate-pulse ml-1 opacity-75">Responsável</span>
                                  </motion.div>
                                ))}
                              </div>
                            )}

                            {/* Assign Button */}
                            <button 
                              onClick={() => {
                                if (isBalanceLow) {
                                  setShowLowCreditModal(true);
                                  return;
                                }
                                setIsAssigningEmployees(order.id);
                              }}
                              disabled={isBalanceLow}
                              className={`mt-2 text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ${
                                isBalanceLow ? 'text-slate-400 cursor-not-allowed' : 'text-blue-600 hover:text-blue-700'
                              }`}
                            >
                              <Plus size={10} />
                              <span>Atribuir Funcionário</span>
                            </button>
                            
                            {/* Delivery Estimate */}
                            <div className="mt-2 flex items-center gap-2">
                              <Clock size={12} className="text-blue-500" />
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Previsão:</span>
                                <input 
                                  type="text"
                                  defaultValue={order.deliveryEstimate || ''}
                                  placeholder="Ex: 30-40 min"
                                  onBlur={(e) => {
                                    if (e.target.value !== order.deliveryEstimate) {
                                      updateDoc(doc(db, 'orders', order.id), {
                                        deliveryEstimate: e.target.value
                                      }).catch(console.error);
                                    }
                                  }}
                                  className="bg-slate-50 border-none rounded-lg px-2 py-1 text-[10px] font-bold w-24 focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <motion.div
                              animate={isTupaAccepted ? {
                                scale: [1, 1.1, 1],
                                opacity: [1, 0.7, 1]
                              } : {}}
                              transition={{
                                duration: 1,
                                repeat: Infinity,
                                ease: "easeInOut"
                              }}
                            >
                              <p className={`text-2xl font-black tracking-tighter ${isTupaAccepted ? 'text-blue-700 bg-blue-50 px-2 py-1 rounded-xl border-2 border-blue-200' : 'text-blue-600'}`}>
                                R$ {order.total.toFixed(2)}
                              </p>
                            </motion.div>
                            <span className="text-[8px] font-bold text-blue-400 uppercase tracking-widest">Total</span>
                          </div>
                        </div>

                        {/* Highlighted Delivery Estimate when Courier Arrives */}
                        {isTupaArrived && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="mx-6 p-4 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl border-2 border-white/20 shadow-xl flex items-center justify-between text-white relative overflow-hidden group"
                          >
                            <div className="absolute inset-0 bg-white/10 animate-pulse" />
                            <div className="relative z-10 flex items-center gap-4">
                              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                                <Bike size={24} className="animate-bounce" />
                              </div>
                              <div className="space-y-0.5">
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-80">Estimativa de Entrega</p>
                                <h5 className="text-lg font-black italic uppercase tracking-tighter">Tupã Chegou!</h5>
                              </div>
                            </div>
                            <div className="relative z-10 text-right space-y-0.5">
                              <div className="flex flex-col items-end">
                                <span className="text-xl font-black">R$ {(estimatedCost || 0).toFixed(2)}</span>
                                <span className="text-[10px] font-black uppercase opacity-70">{(estimatedDistance || 0).toFixed(1)} km percorridos</span>
                              </div>
                            </div>
                            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/5 rounded-full blur-2xl" />
                          </motion.div>
                        )}

                        <div className="space-y-3">
                          <div className="flex items-start gap-2 text-slate-600 bg-slate-50 p-3 rounded-xl">
                            <MapPin size={14} className="mt-0.5 text-blue-500" />
                            <p className="text-[11px] font-bold leading-relaxed">{order.deliveryAddress}</p>
                          </div>
                          
                          <div className="grid grid-cols-1 gap-1.5">
                            {order.items.map((item: any, idx: number) => (
                              <div key={`order-${order.id}-item-${idx}-${item.id || 'no-id'}`} className="flex flex-col p-2 bg-white rounded-lg border border-slate-100">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 flex items-center justify-center bg-blue-50 text-blue-600 rounded text-[9px] font-black">{item.quantity}x</span>
                                    <span className="text-[11px] font-bold text-slate-700">{item.name}</span>
                                  </div>
                                  <span className="text-[11px] font-black text-slate-400">R$ {((item.price + (item.selectedAddOns || []).reduce((sum: number, a: any) => sum + (a.price || 0), 0)) * item.quantity).toFixed(2)}</span>
                                </div>
                                {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                                  <div className="mt-1 pl-7 flex flex-wrap gap-1">
                                    {item.selectedAddOns.map((addon: any, aIdx: number) => (
                                      <span key={`order-${order.id}-item-${idx}-addon-${aIdx}-${addon.id || 'no-id'}`} className="text-[8px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
                                        + {addon.name} {addon.price > 0 && `(R$ ${addon.price.toFixed(2)})`}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                            {(order.deliveryFee > 0 || order.deliveryOption === 'pickup') && (
                              <div className="flex items-center justify-between p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                                <div className="flex items-center gap-2">
                                  <Bike size={14} className="text-emerald-600" />
                                  <span className="text-[11px] font-bold text-emerald-700 leading-tight">
                                    {order.deliveryOption === 'pickup' ? 'Retirada no Local' : 
                                     (order.deliveryOption === 'fast' || order.tupaCategory) ? (
                                       <span className="flex flex-col">
                                         <span className="text-[8px] font-black uppercase tracking-tighter opacity-60">Entrega TUPÃ Selecionada</span>
                                         <span className="text-[12px] font-black italic text-emerald-900">
                                           {typeof order.tupaCategory === 'object' ? (order.tupaCategory as any)?.name : (order.tupaCategory || 'O cliente optou pela Xô Fome')}
                                         </span>
                                       </span>
                                     ) : 'Taxa de Entrega (Normal)'}
                                    {order.tableNumber && !order.tupaCategory && ` - Mesa: ${order.tableNumber}`}
                                  </span>
                                </div>
                                <div className="flex flex-col items-end">
                                  {(order.deliveryOption === 'fast' || order.tupaCategory) && (
                                    <span className="text-[8px] font-black uppercase text-emerald-500 mb-0.5">Valor da Corrida</span>
                                  )}
                                  <span className={`font-black ${order.deliveryOption === 'fast' || order.tupaCategory ? 'text-lg text-emerald-700' : 'text-[11px] text-emerald-600'}`}>
                                    R$ {order.deliveryFee.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            )}

                            {(order as any).customerTupaNote && (
                              <div className="p-3 bg-orange-50 border-2 border-orange-100 rounded-xl">
                                <div className="flex items-start gap-2">
                                  <AlertCircle size={14} className="text-orange-600 mt-0.5" />
                                  <p className="text-[10px] font-black text-orange-700 uppercase tracking-tight leading-tight">
                                    {(order as any).customerTupaNote}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total do Pedido</span>
                          <motion.span 
                            animate={isTupaAccepted ? { opacity: [1, 0.5, 1] } : {}}
                            transition={{ duration: 0.8, repeat: Infinity }}
                            className="text-lg font-black text-blue-gradient italic"
                          >
                            R$ {order.total.toFixed(2)}
                          </motion.span>
                        </div>

                        {/* Order Actions - Moved to bottom and highlighted */}
                        <div className="pt-4 space-y-4">
                          {/* Botões de Chat e Imprimir - Só aparecem se o saldo estiver ok ou o pedido já tiver sido aceito */}
                          {(!isBalanceLow || order.status !== 'pending') && (
                            <div className="flex items-center gap-3">
                              <button 
                                onClick={() => setActiveChatOrderId(order.id)}
                                className="flex-1 p-4 rounded-2xl transition-all group/chat relative flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-blue-600 hover:text-white"
                              >
                                <MessageSquare size={20} className="group-hover/chat:scale-110 transition-transform" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Chat</span>
                                {unreadCounts[order.id] > 0 && (
                                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[8px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white animate-bounce">
                                    {unreadCounts[order.id]}
                                  </span>
                                )}
                              </button>

                              <button 
                                onClick={() => handlePrintOrder(order.id, order)}
                                className="flex-1 p-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl hover:bg-blue-600 hover:text-white transition-all group/print flex items-center justify-center gap-2"
                                title="Imprimir Pedido"
                              >
                                <Printer size={20} className="group-hover/print:scale-110 transition-transform" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Imprimir</span>
                              </button>
                            </div>
                          )}

                          <div className="flex flex-col gap-3">
                            {order.status === 'pending' && (
                              <div className="flex flex-col gap-3">
                                {!isBalanceLow ? (
                                  <>
                                    <button 
                                      onClick={() => handleUpdateOrderStatus(order.id, 'preparing')}
                                      disabled={loadingOrders[order.id]}
                                      className="w-full py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-3 bg-blue-600 text-white shadow-blue-500/20 hover:bg-blue-700 hover:scale-[1.02] active:scale-95"
                                    >
                                      {loadingOrders[order.id] ? (
                                        <Loader2 size={22} className="animate-spin" />
                                      ) : (
                                        <CheckCircle size={22} />
                                      )}
                                      {loadingOrders[order.id] ? 'Processando...' : 'Aceitar Pedido'}
                                    </button>
                                    <button 
                                      onClick={() => setCancellingOrderId(order.id)}
                                      className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white"
                                    >
                                      <XCircle size={18} />
                                      Rejeitar Pedido
                                    </button>
                                  </>
                                ) : (
                                  <div className="flex flex-col items-center justify-center py-6 px-4 bg-slate-100 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                                    <AlertTriangle className="text-amber-500 mb-2" size={24} />
                                    <p className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 text-center tracking-widest">
                                      {(!wallet ? 'Carregando Carteira...' : 'Carteira sem Saldo p/ Aceitar')}
                                    </p>
                                    <button 
                                      onClick={() => setIsRecharging(true)}
                                      className="mt-3 text-[10px] font-black uppercase text-blue-500 hover:underline"
                                    >
                                      Recarregar Agora
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            {order.status === 'preparing' && (
                              <div className="flex flex-col gap-3">
                                <button 
                                  onClick={() => handleUpdateOrderStatus(order.id, 'ready')}
                                  disabled={loadingOrders[order.id]}
                                  className="w-full py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-3 bg-emerald-600 text-white shadow-emerald-500/20 hover:bg-emerald-700 hover:scale-[1.02] active:scale-95"
                                >
                                  {loadingOrders[order.id] ? (
                                    <Loader2 size={22} className="animate-spin" />
                                  ) : (
                                    <CheckCircle size={22} />
                                  )}
                                  {loadingOrders[order.id] ? 'Processando...' : 'Marcar como Pronto'}
                                </button>
                                <button 
                                  onClick={() => setCancellingOrderId(order.id)}
                                  className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white"
                                >
                                  <XCircle size={18} />
                                  Cancelar Pedido
                                </button>
                              </div>
                            )}

                            {(['ready', 'delivering', 'en_route', 'delivery', 'delivered', 'cancelled', 'rejected'].includes(order.status)) && (
                              <div className="flex flex-col gap-4">
                                {(() => {
                                  const relevantRides = rides.filter(r => (r.orderId === order.id || r.destinations?.some(d => d.orderId === order.id)) && r.status !== 'cancelled');
                                  // Prioritize rides with courier info, then accepted rides, then searching ones
                                  const ride = relevantRides.find(r => !!(r.courierName || r.condutor_nome)) || 
                                               relevantRides.find(r => !['searching', 'pending_acceptance'].includes(r.status)) || 
                                               relevantRides[0];
                                  
                                  const isStoreDelivery = (order as any).deliveryMethod === 'store';
                                  const isPickup = (order as any).deliveryOption === 'pickup' || (order as any).deliveryMethod === 'pickup';
                                  
                                  const rawCourierName = ride?.courierName || (order as any).courierName || (order as any).nome_condutor || ride?.condutor_nome || (order as any).courierInfo?.name || ((order as any).courierInfo as any)?.nome_condutor || '';
                                  const rawCourierPhoto = ride?.courierPhoto || (order as any).courierPhoto || ride?.condutor_foto || (order as any).courierInfo?.photo || '';
                                  const rawCourierVehicle = ride?.courierVehicle || (order as any).courierVehicle || ride?.veiculo_modelo || (order as any).courierInfo?.vehicle || '';
                                  const rawCourierPlate = ride?.courierPlate || (order as any).courierPlate || ride?.veiculo_placa || (order as any).placa_veiculo || (order as any).courierInfo?.plate || ((order as any).courierInfo as any)?.placa_veiculo || '';
                                  const rawCourierColor = ride?.courierColor || (order as any).courierColor || ride?.veiculo_cor || (order as any).courierInfo?.color || '';
                                  const rawCourierUid = ride?.courierUid || (order as any).courierUid || (order as any).courierInfo?.uid;
                                  const rawCourierWhatsapp = ride?.courierWhatsapp || (order as any).courierWhatsapp || ride?.condutor_telefone || (order as any).telefone_condutor || (order as any).courierInfo?.phone || ((order as any).courierInfo as any)?.telefone_condutor || ((order as any).courierInfo as any)?.whatsapp;

                                  // Persistent memory: If we see data, save it to the ref to avoid flickers
                                  if (rawCourierName && (!lastKnownCouriers.current[order.id] || lastKnownCouriers.current[order.id].name !== rawCourierName)) {
                                    lastKnownCouriers.current[order.id] = {
                                      name: rawCourierName,
                                      photo: rawCourierPhoto,
                                      vehicle: rawCourierVehicle,
                                      plate: rawCourierPlate,
                                      color: rawCourierColor,
                                      uid: rawCourierUid,
                                      whatsapp: rawCourierWhatsapp
                                    };
                                  }

                                  const displayCourierName = rawCourierName || lastKnownCouriers.current[order.id]?.name;
                                  const displayCourierPhoto = rawCourierPhoto || lastKnownCouriers.current[order.id]?.photo;
                                  const displayCourierVehicle = rawCourierVehicle || lastKnownCouriers.current[order.id]?.vehicle;
                                  const displayCourierPlate = rawCourierPlate || lastKnownCouriers.current[order.id]?.plate;
                                  const displayCourierColor = rawCourierColor || lastKnownCouriers.current[order.id]?.color;
                                  const displayCourierUid = rawCourierUid || lastKnownCouriers.current[order.id]?.uid;
                                  const displayCourierWhatsapp = rawCourierWhatsapp || lastKnownCouriers.current[order.id]?.whatsapp;

                                  const isTupaDelivery = ride !== undefined || !!displayCourierName || (order as any).deliveryMethod === 'tupa';
                                  // Robust assignment check: If we have a name OR a non-searching ride status OR we previously locked this order as "assigned" in DB or session
                                  const courierAssigned = !!displayCourierName || (ride && !['searching', 'cancelled'].includes(ride.status)) || (order as any).courierAssigned || courierSticky[order.id];
                                  
                                  // Lock the state so it never returns to searching state even if ride object flickers
                                  if (courierAssigned && !courierSticky[order.id]) {
                                    setTimeout(() => setCourierSticky(prev => ({ ...prev, [order.id]: true })), 0);
                                  }

                                  const isFinalized = ['delivered', 'cancelled', 'rejected', 'completed'].includes(order.status);
                                  
                                  return (
                                    <div className="space-y-4">
                                      {/* Phase 1: Main Order Actions - Only show if NOT finalized */}
                                      {!isFinalized && (
                                        <div className="grid grid-cols-2 gap-3">
                                          {finalizingOrderId !== order.id ? (
                                            <button 
                                              onClick={() => setFinalizingOrderId(order.id)}
                                              className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg transition-all hover:scale-[1.02] active:scale-95 shadow-emerald-500/20"
                                            >
                                              <Check size={18} />
                                              Finalizar Pedido
                                            </button>
                                          ) : (
                                            <motion.button 
                                              initial={{ opacity: 0, scale: 0.9 }}
                                              animate={{ opacity: 1, scale: 1 }}
                                              onClick={() => {
                                                handleFinalizeOrder(order.id);
                                                setFinalizingOrderId(null);
                                              }}
                                              className="w-full py-4 bg-yellow-400 text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest animate-flashing border-2 border-white shadow-xl"
                                            >
                                              Confirmar
                                            </motion.button>
                                          )}
                                          
                                          <button 
                                            onClick={() => setCancellingOrderId(order.id)}
                                            className="w-full py-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 hover:bg-red-600 hover:text-white"
                                          >
                                            <XCircle size={18} />
                                            Cancelar Pedido
                                          </button>
                                        </div>
                                      )}

                                      {/* Phase 2: Delivery Management Section */}
                                      {!isPickup && (
                                        <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
                                          <div className="flex items-center justify-between px-1">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Logística de Entrega</p>
                                            {isStoreDelivery && (
                                              <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded leading-none italic">Entregador Próprio</span>
                                            )}
                                          </div>
                                          <AnimatePresence mode="popLayout">
                                            {noCourierFound[order.id] && !searchingForCourier[order.id] && !courierAssigned && (
                                              <motion.div
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                className="pb-4"
                                              >
                                                <div className="flex flex-col items-center justify-center gap-3 py-8 bg-red-50 dark:bg-red-900/10 rounded-[2.5rem] border-2 border-red-100 dark:border-red-900/20 shadow-sm text-center px-4">
                                                  <div className="w-12 h-12 bg-red-100 dark:bg-red-800 rounded-full flex items-center justify-center text-red-600 shadow-sm">
                                                    <AlertTriangle size={24} />
                                                  </div>
                                                  <div className="space-y-2">
                                                    <p className="text-[12px] font-black uppercase tracking-widest text-red-600 dark:text-red-400">
                                                      Não tem entregador neste momento
                                                    </p>
                                                    <button 
                                                      onClick={() => setShowTupaCategories(order.id)}
                                                      className="bg-red-600 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 hover:scale-105 transition-all active:scale-95"
                                                    >
                                                      Tentar Novamente?
                                                    </button>
                                                  </div>
                                                </div>
                                              </motion.div>
                                            )}
                                            {isFinalized && isTupaDelivery && (
                                              <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="pb-4"
                                              >
                                                <div className="flex items-center justify-center gap-2 py-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-[2rem] border-2 border-emerald-100 dark:border-emerald-900/20 shadow-sm">
                                                  <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-800 rounded-full flex items-center justify-center text-emerald-600">
                                                    <CheckCircle size={18} />
                                                  </div>
                                                  <span className="text-[11px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 italic">
                                                    Entregador Tupã realizado com sucesso
                                                  </span>
                                                </div>
                                              </motion.div>
                                            )}

                                            {/* Case A: Searching for Courier Animation */}
                                            {(((searchingForCourier && searchingForCourier[order.id]) || (ride && ride.status === 'searching')) && !courierAssigned && !isFinalized) ? (
                                              <motion.div 
                                                key={`searching-${order.id}`}
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                className="flex flex-col items-center justify-center py-10 space-y-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-[2.5rem] border-2 border-blue-200 dark:border-blue-900/30 animate-pulse-scale relative overflow-hidden min-h-[180px]"
                                              >
                                                <div className="absolute inset-0 bg-blue-500/5 animate-pulse" />
                                                <div className="relative z-10 flex flex-col items-center gap-4">
                                                  <div className="relative">
                                                    <div className="w-16 h-16 border-4 border-blue-200 dark:border-blue-800 rounded-full"></div>
                                                    <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                      <Bike className="text-blue-600 animate-bounce" size={24} />
                                                    </div>
                                                  </div>
                                                  <div className="text-center space-y-2 px-6">
                                                    <h5 className="text-sm font-black uppercase tracking-widest text-blue-600 italic">Buscando Entregador...</h5>
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-tight">
                                                      Solicitando {categoryLoading[order.id] || 'TUPÃ'} em {cityData?.name || 'sua cidade'}
                                                    </p>
                                                    <div className="flex items-center justify-center gap-2 pt-2">
                                                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce"></div>
                                                    </div>
                                                    <button 
                                                      onClick={() => {
                                                        setConfirmingRideCancellation({ orderId: order.id, rideId: ride?.id });
                                                      }}
                                                      disabled={isCancelling}
                                                      className="mt-6 px-6 py-2 bg-red-100 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                      {isCancelling ? 'Cancelando...' : 'Cancelar Busca'}
                                                    </button>
                                                  </div>
                                                </div>
                                              </motion.div>
                                            ) : courierAssigned ? (
                                              <motion.div 
                                                key={`assigned-${order.id}`}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="space-y-4"
                                              >
                                                <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-800/50 rounded-[2.5rem] border-2 border-blue-100 dark:border-blue-900/30 shadow-xl relative overflow-visible">
                                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-500/30 z-20">
                                                      Entrega em Andamento
                                                    </div>
                                                  <div className="absolute top-0 right-0 p-3">
                                                    {ride && ride.status !== 'searching' && (
                                                      <div className="flex items-center gap-1.5 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                                                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                                        <span className="text-[8px] font-black uppercase text-emerald-600 tracking-widest">Ao Vivo</span>
                                                      </div>
                                                    )}
                                                  </div>

                                                  <div className="w-full space-y-4">
                                                    {/* Status Banner */}
                                                    <div className="flex flex-col items-center justify-center py-2">
                                                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">
                                                        {ride?.status === 'pending_acceptance' && 'Aguardando Aceite...'}
                                                        {(ride?.status === 'accepted' || (!ride && courierAssigned && order.status === 'preparing')) && (
                                                          <motion.span 
                                                            animate={{ scale: [1, 1.05, 1], color: ['#2563eb', '#059669', '#2563eb'] }}
                                                            transition={{ duration: 1, repeat: Infinity }}
                                                            className="font-black flex items-center gap-2"
                                                          >
                                                            <CheckCircle size={14} /> Motorista Aceitou!
                                                          </motion.span>
                                                        )}
                                                        {(ride?.status === 'arrived_at_pickup' || ride?.status === 'picked_up' || (!ride && courierAssigned && (order.status === 'ready' || order.status === 'delivering'))) && 'No Estabelecimento'}
                                                        {(ride?.status === 'en_route' || (!ride && courierAssigned && order.status === 'en_route')) && 'Em Rota de Entrega'}
                                                        {(ride?.status === 'completed' || order.status === 'delivered') && 'Entrega Finalizada'}
                                                        {(!ride && courierAssigned && !['preparing', 'ready', 'delivering', 'en_route', 'delivered'].includes(order.status) && ride?.status !== 'accepted') && 'Motorista Vinculado'}
                                                      </p>
                                                    </div>

                                                    {/* Compact Driver Info Banner */}
                                                    <div className="bg-slate-50 dark:bg-slate-900/40 rounded-[2rem] p-4 border border-blue-50 dark:border-blue-900/10 shadow-sm">
                                                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                                        <div className="flex items-center gap-4 w-full sm:w-auto">
                                                          <div className="relative shrink-0">
                                                            <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                                                              {(ride?.vehicleType === 'car' || displayCourierVehicle?.toLowerCase().includes('car') || (order as any).courierVehicle === 'Carro' || (order as any).courierInfo?.vehicle?.toLowerCase().includes('car')) ? <Car size={28} /> : <Bike size={28} />}
                                                            </div>
                                                            {displayCourierPhoto && (
                                                              <div className="absolute -top-1 -right-1 w-6 h-6 rounded-lg border-2 border-white dark:border-slate-800 overflow-hidden shadow-md">
                                                                <img src={displayCourierPhoto} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                              </div>
                                                            )}
                                                          </div>
                                                          <div className="flex flex-col min-w-0">
                                                            <h5 className="text-[13px] font-black text-slate-800 dark:text-white uppercase italic leading-tight">
                                                              {displayCourierName || 'Buscando...'}
                                                            </h5>
                                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight flex items-center gap-2">
                                                              <span className="truncate">{displayCourierVehicle || 'Veículo'}</span>
                                                              {displayCourierColor && <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />}
                                                              <span className="text-blue-500 truncate">{displayCourierColor}</span>
                                                            </p>
                                                            {ride?.estimatedArrival && (
                                                              <div className="flex items-center gap-1 mt-0.5">
                                                                <Navigation size={10} className="text-orange-500 animate-pulse" />
                                                                <span className="text-[9px] font-black uppercase text-orange-600">Chega em {ride.estimatedArrival}</span>
                                                              </div>
                                                            )}
                                                          </div>
                                                        </div>

                                                        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                                                          <div className="flex flex-col items-center sm:items-end">
                                                            <span className="text-[7px] font-black uppercase text-slate-400 tracking-widest mb-0.5">Placa</span>
                                                            <span className="text-[11px] font-black text-slate-800 dark:text-white tracking-widest bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-inner">
                                                              {displayCourierPlate || '---'}
                                                            </span>
                                                          </div>

                                                          {displayCourierWhatsapp && (
                                                            <a 
                                                              href={isBalanceLow ? "#" : `https://wa.me/${displayCourierWhatsapp.replace(/\D/g, '')}`}
                                                              target="_blank"
                                                              rel="noopener noreferrer"
                                                              className={`p-3 rounded-2xl border flex items-center justify-center shadow-lg transition-all active:scale-95 ${
                                                                isBalanceLow ? 'bg-slate-100 border-slate-200 opacity-50' : 'bg-emerald-500 border-emerald-400 text-white hover:bg-emerald-600'
                                                              }`}
                                                            >
                                                              <MessageSquare size={20} />
                                                            </a>
                                                          )}
                                                        </div>
                                                      </div>
                                                    </div>
                                                  </div>

                                                  {!isFinalized && (
                                                    <div className="flex gap-2 w-full">
                                                      <button 
                                                        onClick={() => {
                                                          setConfirmingRideCancellation({ orderId: order.id, rideId: ride?.id });
                                                        }}
                                                        disabled={isCancelling}
                                                        className="flex-1 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-600 hover:text-white transition-all border border-red-100 dark:border-red-900/10 disabled:opacity-50 disabled:cursor-not-allowed"
                                                      >
                                                        {isCancelling ? <RefreshCw size={14} className="animate-spin" /> : <XCircle size={14} />}
                                                        {isCancelling ? 'Processando' : 'Canc. Corrida'}
                                                      </button>
                                                      <button 
                                                        onClick={() => {
                                                          if (isBalanceLow) {
                                                            setShowLowCreditModal(true);
                                                            return;
                                                          }
                                                          const whatsapp = displayCourierWhatsapp || '5500000000000';
                                                          window.open(`https://wa.me/${whatsapp.replace(/\D/g, '')}`, '_blank');
                                                        }}
                                                        disabled={isBalanceLow}
                                                        className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all border ${
                                                          isBalanceLow ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white border-emerald-100 dark:border-emerald-900/10'
                                                        }`}
                                                      >
                                                        <MessageSquare size={14} />
                                                        WhatsApp
                                                      </button>
                                                    </div>
                                                  )}
                                                </div>

                                                <div className="bg-orange-600 p-4 rounded-3xl flex flex-col gap-3 shadow-lg shadow-orange-600/20">
                                                  <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                      <Clock size={16} className="text-white/80" />
                                                      <p className="text-[9px] font-black uppercase tracking-widest text-white/80">Previsão de Chegada</p>
                                                    </div>
                                                    <p className="text-sm font-black text-white">
                                                      {ride?.estimatedArrival || (order.status === 'delivered' ? '--' : '10 min')}
                                                    </p>
                                                  </div>
                                                  
                                                  {isTupaDelivery && (
                                                    <div className="pt-3 border-t border-white/10 space-y-1 text-center">
                                                      <p className="text-[9px] font-bold text-white uppercase tracking-widest leading-tight">
                                                        <span className="text-yellow-300">{displayCourierName || 'Motorista'}</span> da categoria <span className="text-yellow-300">{(typeof order.tupaCategory === 'object' ? (order.tupaCategory as any)?.name : (order.tupaCategory || 'Xô Fome'))}</span> a caminho
                                                      </p>
                                                      <div className="bg-white/10 rounded-xl py-2 px-3">
                                                        <p className="text-[10px] font-black text-white uppercase tracking-widest">
                                                          Valor a ser pago: <span className="text-yellow-300 text-xs">R$ {order.deliveryFee?.toFixed(2) || '0,00'}</span>
                                                        </p>
                                                      </div>
                                                    </div>
                                                  )}
                                                </div>

                                                {!isFinalized && !courierAssigned && (
                                                  <button 
                                                    onClick={async () => {
                                                      if (window.confirm('Deseja cancelar a busca Tupã e escolher a logística de entrega novamente?')) {
                                                        await handleCancelRide(order.id, undefined, true);
                                                        // cancelRideLogic already clears deliveryMethod and courierInfo
                                                      }
                                                    }}
                                                    className="w-full py-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100 dark:border-emerald-900/10"
                                                  >
                                                    <User size={14} />
                                                    Remover Tupã e Trocar Logística
                                                  </button>
                                                )}
                                                {!isFinalized && (
                                                  <button 
                                                    onClick={() => shareLocationWhatsApp(order)}
                                                    className="w-full mt-2 py-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100 dark:border-emerald-900/10"
                                                  >
                                                    <MessageSquare size={14} />
                                                    Mandar manual p/ WhatsApp...
                                                  </button>
                                                )}
                                              </motion.div>
                                            ) : isStoreDelivery && !ride ? (
                                              <motion.div 
                                                key={`store-${order.id}`}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="space-y-3"
                                              >
                                                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 flex items-center justify-between">
                                                  <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center text-emerald-600">
                                                      <User size={20} />
                                                    </div>
                                                    <div>
                                                      <p className="text-xs font-black text-slate-700 dark:text-slate-200">Entregador Próprio</p>
                                                      <p className="text-[8px] font-bold text-slate-400 uppercase">Usando logística da loja</p>
                                                    </div>
                                                  </div>
                                                {!isFinalized && (
                                                  <button 
                                                    onClick={() => {
                                                      if (isBalanceLow) {
                                                        setShowLowCreditModal(true);
                                                        return;
                                                      }
                                                      updateDoc(doc(db, 'orders', order.id), { deliveryMethod: null });
                                                      setOrderForCourierSelection(order.id);
                                                    }}
                                                    disabled={isBalanceLow}
                                                    className={`text-[9px] font-black uppercase transition-all ${
                                                      isBalanceLow ? 'text-slate-400 cursor-not-allowed' : 'text-red-500 hover:text-red-600'
                                                    }`}
                                                  >
                                                    Mudar Logística
                                                  </button>
                                                )}
                                                </div>
                                                
                                                {!isFinalized && (
                                                  <button 
                                                    onClick={() => {
                                                      if (isBalanceLow) {
                                                        setShowLowCreditModal(true);
                                                        return;
                                                      }
                                                      shareLocationWhatsApp(order);
                                                    }}
                                                    disabled={isBalanceLow}
                                                    className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg ${
                                                      isBalanceLow ? 'bg-slate-400 text-white cursor-not-allowed opacity-70' : 'bg-emerald-600 text-white shadow-emerald-500/20 hover:bg-emerald-700'
                                                    }`}
                                                  >
                                                    <Share2 size={16} />
                                                    Enviar WhatsApp p/ Entregador
                                                  </button>
                                                )}
                                              </motion.div>
                                            ) : (
                                              <motion.div 
                                                key={`selection-${order.id}`}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="space-y-4"
                                              >
                                                <div className={`grid ${isFinalized ? 'grid-cols-1' : 'grid-cols-2'} gap-2`}>
                                                  {(isFinalized && isTupaDelivery) ? (
                                                    <button 
                                                      className="py-4 bg-blue-600 opacity-50 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg cursor-not-allowed"
                                                      disabled
                                                    >
                                                      <Bike size={16} />
                                                      Entregador Tupã
                                                    </button>
                                                  ) : (
                                                    <button 
                                                      onClick={() => {
                                                        if (isBalanceLow) {
                                                          setShowLowCreditModal(true);
                                                          return;
                                                        }
                                                        updateDoc(doc(db, 'orders', order.id), { deliveryMethod: 'store' });
                                                        shareLocationWhatsApp(order);
                                                      }}
                                                      disabled={isBalanceLow || isFinalized}
                                                      className={`py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg ${
                                                        isBalanceLow ? 'bg-slate-400 text-white cursor-not-allowed opacity-70' : isFinalized ? 'opacity-50 cursor-not-allowed bg-emerald-600' : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                                      }`}
                                                    >
                                                      <User size={16} />
                                                      Entregador Loja
                                                    </button>
                                                  )}
                                                  
                                                  {!isFinalized && (
                                                    <button 
                                                      onClick={() => {
                                                        if (isBalanceLow) {
                                                          setShowLowCreditModal(true);
                                                          return;
                                                        }
                                                        setShowTupaCategories(order.id);
                                                      }}
                                                      disabled={isBalanceLow}
                                                      className={`py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg ${
                                                        isBalanceLow ? 'bg-slate-400 text-white cursor-not-allowed opacity-70' : (showTupaCategories === order.id) ? 'bg-blue-700 ring-2 ring-blue-400 ring-offset-2' : 'bg-blue-600 hover:bg-blue-700'
                                                      } text-white`}
                                                    >
                                                      <Bike size={16} />
                                                      Entregador Tupã
                                                    </button>
                                                  )}
                                                </div>

                                                {/* Category selection is handled via handleCallCourier which is the original stable logic */}
                                                {showTupaCategories === order.id && apiCategories?.length > 0 && (
                                                  <div className="col-span-2 grid grid-cols-2 gap-2 p-2 bg-blue-50/30 rounded-2xl border border-blue-100">
                                                    {apiCategories.map((cat: any, cIdx: number) => (
                                                      <button
                                                        key={`cat-sel-${order.id}-${cat.id}-${cIdx}`}
                                                        onClick={() => handleCallCourier(order.id, cat.id, (cat as any).nome, cat.preco || cat.estimativa_valor, cat.distancia)}
                                                        className="p-3 bg-white hover:bg-blue-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm flex flex-col items-center gap-1 group"
                                                      >
                                                        <span className="group-hover:text-white">{cat.nome}</span>
                                                        <span className="text-[8px] opacity-40 group-hover:opacity-100 italic">
                                                          R$ {(cat.preco || cat.estimativa_valor || cat.valor || 0).toFixed(2).replace('.', ',')}
                                                        </span>
                                                      </button>
                                                    ))}
                                                  </div>
                                                )}
                                              </motion.div>
                                            )}
                                          </AnimatePresence>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            )}

                            {order.status === 'delivered' && (
                              <div className="w-full text-center py-4 bg-slate-50 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 border border-slate-100">
                                Pedido Entregue
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                    );
                  })()}
                </motion.div>
              );
            })}
                  </motion.div>
                )}
              </AnimatePresence>
            )}

            {processedOrdersData.closed.length > 0 && (
              <div className="flex flex-col items-center justify-center gap-3 py-6 bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-100 mt-6">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-bold">
                  Pedidos finalizados: {processedOrdersData.closed.length} total ({Math.max(0, processedOrdersData.closed.length - closedOrdersLimit)} ocultados)
                </span>
                <div className="flex items-center gap-3">
                  {processedOrdersData.closed.length > closedOrdersLimit && (
                    <button
                      onClick={() => setClosedOrdersLimit(prev => prev + 5)}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-lg hover:shadow-blue-500/25 transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-95"
                    >
                      <ChevronDown size={14} />
                      <span>Ver mais 5 pedidos</span>
                    </button>
                  )}
                  {closedOrdersLimit > 0 && (
                    <button
                      onClick={() => setClosedOrdersLimit(0)}
                      className="px-6 py-3 bg-white hover:bg-slate-50 text-slate-600 font-black uppercase tracking-widest text-[10px] rounded-2xl border-2 border-slate-100 shadow-sm transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-95"
                    >
                      <X size={14} className="text-slate-400" />
                      <span>Ocultar todos</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Finance Panel */}
        {restaurant && activeTab === 'finance' && (
          <section className="space-y-8">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-2xl font-black uppercase tracking-tighter italic">Gestão Financeira</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Acompanhe seus ganhos e status da assinatura</p>
              </div>
            </div>

            {/* Subscription Status Card */}
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <h4 className="font-black uppercase tracking-tight italic">Status da Assinatura</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Sua licença de uso da plataforma</p>
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  profile?.subscriptionStatus === 'active' ? 'bg-amber-100 text-amber-600 border border-amber-200 shadow-sm shadow-amber-500/10' :
                  profile?.subscriptionStatus === 'expired' ? 'bg-red-100 text-red-600' :
                  'bg-blue-100 text-blue-600'
                }`}>
                  {profile?.subscriptionStatus === 'active' ? 'Premium Dourado' : 
                   profile?.subscriptionStatus === 'expired' ? 'Expirada' : 'Período de Teste'}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-50">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Próximo Vencimento</p>
                  <p className="font-bold text-slate-700">
                    {profile?.subscriptionDueDate ? new Date(profile.subscriptionDueDate).toLocaleDateString() : 
                     profile?.trialEndsAt ? new Date(profile.trialEndsAt).toLocaleDateString() : 'A definir'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Valor Mensal</p>
                  <p className="font-bold text-slate-700">R$ {globalSettings?.monthlyFee?.toFixed(2) || '50,00'}</p>
                </div>
              </div>

              {profile?.subscriptionStatus === 'active' && (
                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex items-center gap-3">
                  <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-white shrink-0">
                    <Zap size={16} />
                  </div>
                  <p className="text-[10px] text-amber-700 font-bold uppercase leading-relaxed">
                    Modo Premium Ativo: Você não paga taxas por pedido enquanto sua assinatura estiver ativa!
                  </p>
                </div>
              )}

              <button 
                onClick={() => {
                  window.open('https://www.mercadopago.com.br', '_blank');
                }}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-slate-800 transition-all flex items-center justify-center space-x-2"
              >
                <CreditCard size={18} />
                <span>Pagar Mensalidade</span>
              </button>
            </div>

            {/* Split Pay History */}
            <div className="space-y-4">
              <h4 className="text-lg font-black uppercase tracking-tight italic">Histórico de Repasses</h4>
              <div className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Data</th>
                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Pedido</th>
                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Total</th>
                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Taxa</th>
                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Seu Repasse</th>
                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {splitPayHistory.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-12 text-center text-slate-400 italic text-sm">Nenhum repasse registrado ainda.</td>
                        </tr>
                      ) : (
                        splitPayHistory.map((history, idx) => (
                          <tr key={`split-pay-hist-${history.id}-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-6">
                              <p className="text-xs font-bold text-slate-700">
                                {safeFormatDateOnly(history.createdAt)}
                              </p>
                              <p className="text-[9px] text-slate-400">
                                {safeFormatTimeOnly(history.createdAt)}
                              </p>
                            </td>
                            <td className="p-6">
                              <span className="text-[10px] font-mono font-bold text-slate-400">#{history.orderId.slice(-6).toUpperCase()}</span>
                            </td>
                            <td className="p-6">
                              <span className="text-xs font-bold text-slate-700">R$ {history.totalAmount.toFixed(2)}</span>
                            </td>
                            <td className="p-6">
                              <span className="text-xs font-bold text-red-500">- R$ {history.platformFee.toFixed(2)}</span>
                            </td>
                            <td className="p-6">
                              <span className="text-xs font-black text-emerald-600">R$ {history.restaurantAmount.toFixed(2)}</span>
                            </td>
                            <td className="p-6">
                              <div className="flex items-center space-x-2">
                                <div className={`w-2 h-2 rounded-full ${history.status === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                <span className={`text-[9px] font-black uppercase tracking-widest ${history.status === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
                                  {history.status === 'success' ? 'Concluído' : 'Erro'}
                                </span>
                              </div>
                              {history.errorMessage && (
                                <p className="text-[8px] text-red-400 mt-1 max-w-[150px] truncate" title={history.errorMessage}>
                                  {history.errorMessage}
                                </p>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Printers Management */}
        {restaurant && activeTab === 'printers' && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-xl md:text-2xl font-black uppercase tracking-tighter italic">Impressoras Térmicas</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Configure suas impressoras ESC/POS para pedidos automáticos</p>
              </div>
              <button 
                onClick={() => {
                  setEditingPrinter(null);
                  setPrinterName('');
                  setPrinterIp('');
                  setPrinterPort('9100');
                  setPrinterConnection('network');
                  setPrinterPaperSize('80mm');
                  setIsAddingPrinter(true);
                }}
                className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-full text-xs font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all"
              >
                <Plus size={16} />
                <span>Adicionar Impressora</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {printers.length === 0 ? (
                <div className="col-span-full py-12 text-center bg-white dark:bg-slate-900 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-800">
                  <Printer size={48} className="mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-400 italic text-sm">Nenhuma impressora cadastrada.</p>
                </div>
              ) : (
                printers.map((printer, idx) => (
                  <motion.div 
                    key={`printer-li-${printer.id}-${idx}`}
                    layout
                    className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${printer.active ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                          <Printer size={20} />
                        </div>
                        <div>
                          <h4 className="font-black uppercase tracking-tight italic text-sm">{printer.name}</h4>
                          <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">{printer.connection === 'network' ? `IP: ${printer.ip}:${printer.port}` : printer.connection}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {printer.autoPrint && (
                          <div className="px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest bg-blue-100 text-blue-600 flex items-center gap-1">
                            <Zap size={8} />
                            Auto
                          </div>
                        )}
                        <div className={`px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${printer.active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                          {printer.active ? 'Ativa' : 'Inativa'}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Papel</p>
                        <p className="text-[10px] font-bold">{printer.paperSize}</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Protocolo</p>
                        <p className="text-[10px] font-bold uppercase">{printer.type}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <button 
                        onClick={() => handleTestPrinter(printer)}
                        disabled={isTestingPrinter}
                        className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-50 hover:text-blue-600 transition-all flex items-center justify-center gap-2"
                      >
                        {isTestingPrinter ? <RefreshCw size={12} className="animate-spin" /> : <Play size={12} />}
                        Teste
                      </button>
                      <button 
                        onClick={() => {
                          setEditingPrinter(printer);
                          setPrinterName(printer.name);
                          setPrinterIp(printer.ip || '');
                          setPrinterPort(printer.port.toString());
                          setPrinterConnection(printer.connection);
                          setPrinterPaperSize(printer.paperSize);
                          setPrinterActive(printer.active);
                          setPrinterAutoPrint(printer.autoPrint);
                          setIsAddingPrinter(true);
                        }}
                        className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all"
                      >
                        <Edit size={14} />
                      </button>
                      <button 
                        onClick={() => handleDeletePrinter(printer.id)}
                        disabled={deletingItemId === printer.id}
                        className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all disabled:opacity-50"
                      >
                        {deletingItemId === printer.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </section>
        )}

        {/* Activation Modal */}
        <AnimatePresence>
          {isActivationModalOpen && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl"
              >
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-blue-gradient text-white text-center">
                  <div className="w-16 h-16 bg-white/20 rounded-2xl mx-auto flex items-center justify-center mb-4">
                    {activationType === 'overlay' ? <ShieldAlert size={32} /> : <RefreshCw size={32} />}
                  </div>
                  <h3 className="text-xl font-black uppercase tracking-tight italic">
                    Ativar {activationType === 'overlay' ? 'Sobreposição' : 'Volume Automático'}
                  </h3>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Siga as instruções para ativar</p>
                </div>
                
                <div className="p-8 space-y-6">
                  <div className="space-y-4 text-center">
                    <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">
                      {activationType === 'overlay' 
                        ? 'Para garantir que você nunca perca um pedido, ative a sobreposição de tela nas configurações do seu navegador/dispositivo.' 
                        : 'O volume automático garante que o alerta sonoro seja ouvido mesmo se o dispositivo estiver com volume baixo.'}
                    </p>
                    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                      <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-2 text-left">Passo a Passo:</p>
                      <ul className="text-left text-xs space-y-2 text-slate-500 dark:text-slate-400 list-disc pl-4">
                        <li>Clique no botão "Ativar Agora" abaixo</li>
                        <li>Conceda as permissões necessárias</li>
                        <li>O sistema fará um teste sonoro/visual</li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex flex-col space-y-3">
                    <button 
                      onClick={confirmActivation}
                      className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all"
                    >
                      Ativar Agora
                    </button>
                    <button 
                      onClick={() => setIsActivationModalOpen(false)}
                      className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        {/* Printer Modal */}
        <AnimatePresence>
          {isAddingPrinter && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl"
              >
                <form onSubmit={handleSavePrinter} className="p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black uppercase tracking-tight italic">
                      {editingPrinter ? 'Editar Impressora' : 'Nova Impressora'}
                    </h3>
                    <button type="button" onClick={() => setIsAddingPrinter(false)} className="text-slate-400 hover:text-slate-600">
                      <X size={24} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nome da Impressora</label>
                      <input 
                        type="text" required value={printerName} onChange={e => setPrinterName(e.target.value)}
                        placeholder="Ex: Cozinha, Balcão"
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Conexão</label>
                        <select 
                          value={printerConnection}
                          onChange={e => setPrinterConnection(e.target.value as any)}
                          className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500/20"
                        >
                          <option value="network">Rede (IP)</option>
                          <option value="usb">USB</option>
                          <option value="bluetooth">Bluetooth</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Papel</label>
                        <select 
                          value={printerPaperSize}
                          onChange={e => setPrinterPaperSize(e.target.value as any)}
                          className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500/20"
                        >
                          <option value="80mm">80mm</option>
                          <option value="58mm">58mm</option>
                        </select>
                      </div>
                    </div>

                    {printerConnection === 'network' && (
                      <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2 space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Endereço IP</label>
                          <input 
                            type="text" required value={printerIp} onChange={e => setPrinterIp(e.target.value)}
                            placeholder="192.168.1.100"
                            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500/20"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Porta</label>
                          <input 
                            type="number" required value={printerPort} onChange={e => setPrinterPort(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500/20"
                          />
                        </div>
                      </div>
                    )}

                    {printerConnection === 'usb' && (
                      <div className="space-y-4">
                        <button 
                          type="button"
                          onClick={connectUSB}
                          className="w-full flex items-center justify-center space-x-2 bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl hover:bg-slate-200 transition-all"
                        >
                          <Printer size={18} />
                          <span className="text-xs font-bold uppercase tracking-widest">
                            {usbDevice ? `Conectado: ${usbDevice.productName}` : 'Conectar Impressora USB'}
                          </span>
                        </button>
                        {usbDevice && (
                          <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl border border-emerald-100 dark:border-emerald-500/20 flex items-center space-x-2">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Máquina Conectada</span>
                          </div>
                        )}
                      </div>
                    )}

                    {printerConnection === 'bluetooth' && (
                      <div className="space-y-4">
                        <button 
                          type="button"
                          onClick={scanBluetooth}
                          disabled={isScanningBluetooth}
                          className="w-full flex items-center justify-center space-x-2 bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl hover:bg-slate-200 transition-all disabled:opacity-50"
                        >
                          {isScanningBluetooth ? <RefreshCw size={18} className="animate-spin" /> : <Bluetooth size={18} />}
                          <span className="text-xs font-bold uppercase tracking-widest">Procurar Impressoras</span>
                        </button>

                        {bluetoothDevices.length > 0 && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Dispositivos Encontrados</label>
                            <div className="grid grid-cols-1 gap-2">
                              {bluetoothDevices.map((device, idx) => (
                                <button
                                  key={`bt-dev-1-${device.id}-${idx}`}
                                  type="button"
                                  onClick={() => connectBluetooth(device)}
                                  className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-blue-500 transition-all"
                                >
                                  <span className="text-xs font-bold">{device.name || 'Dispositivo Desconhecido'}</span>
                                  <ChevronRight size={14} className="text-slate-400" />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                        <div className="space-y-1">
                          <span className="text-xs font-black uppercase tracking-tight italic">Impressora Ativa</span>
                          <p className="text-[10px] text-slate-400">Habilitar para uso</p>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={printerActive}
                          onChange={e => setPrinterActive(e.target.checked)}
                          className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                        <div className="space-y-1">
                          <span className="text-xs font-black uppercase tracking-tight italic">Auto-Imprimir</span>
                          <p className="text-[10px] text-slate-400">Imprimir novos pedidos</p>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={printerAutoPrint}
                          onChange={e => setPrinterAutoPrint(e.target.checked)}
                          className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all"
                  >
                    {editingPrinter ? 'Salvar Alterações' : 'Cadastrar Impressora'}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* Recharge/Subscription Modal */}
      <AnimatePresence>
        {isRecharging && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black uppercase tracking-tight italic">Pagamentos</h3>
                    <div className="flex items-center space-x-2">
                      <p className="text-slate-400 text-xs font-medium">Escolha como deseja pagar.</p>
                      <div className="flex items-center space-x-1.5 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                        <div className={`w-1.5 h-1.5 rounded-full ${globalSettings?.mercadoPagoAccessToken ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="text-[7px] font-black uppercase tracking-widest text-slate-400">MP</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => { setIsRecharging(false); setActivePixPayment(null); }} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <X size={24} />
                  </button>
                </div>

                {!activePixPayment && (
                  <div className="flex p-1 bg-slate-100 rounded-2xl">
                    <button 
                      onClick={() => setRechargeTab('credit')}
                      className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${rechargeTab === 'credit' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Créditos
                    </button>
                    <button 
                      onClick={() => setRechargeTab('subscription')}
                      className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${rechargeTab === 'subscription' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Mensalidade
                    </button>
                  </div>
                )}

                {!activePixPayment ? (
                  <div className="space-y-6">
                    {rechargeTab === 'credit' ? (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Valor da Recarga (R$)</label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">R$</span>
                            <input 
                              type="number" 
                              inputMode="decimal"
                              step="0.01"
                              value={rechargeAmount}
                              onChange={e => setRechargeAmount(e.target.value)}
                              className="w-full bg-slate-50 border-none rounded-2xl p-4 pl-12 text-xl font-black focus:ring-2 focus:ring-blue-500/20"
                              placeholder="0,00"
                              min={globalSettings?.minRechargeAmount || 10}
                            />
                          </div>
                          <p className="text-[9px] text-slate-400 italic">Mínimo permitido: R$ {(globalSettings?.minRechargeAmount || 10).toFixed(2)}</p>
                        </div>
                        <button 
                          onClick={() => handleGeneratePix(false)}
                          disabled={isGeneratingPix || !rechargeAmount || parseFloat(rechargeAmount) < (globalSettings?.minRechargeAmount || 10)}
                          className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:bg-slate-400 flex items-center justify-center space-x-3"
                        >
                          {isGeneratingPix ? (
                            <>
                              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              <span>Gerando Pix...</span>
                            </>
                          ) : (
                            <>
                              <Plus size={20} />
                              <span>Gerar QR Code Pix</span>
                            </>
                          )}
                        </button>
                        {rechargeAmount && parseFloat(rechargeAmount) < (globalSettings?.minRechargeAmount || 10) && (
                          <p className="text-[10px] text-red-500 font-bold text-center">
                            O valor mínimo para recarga é R$ {(globalSettings?.minRechargeAmount || 10).toFixed(2)}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 space-y-2">
                          <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Valor da Mensalidade</p>
                          <p className="text-3xl font-black text-blue-600 italic">R$ {globalSettings?.monthlyFee?.toFixed(2) || '50,00'}</p>
                          <p className="text-[9px] text-blue-400 leading-tight">A assinatura libera o recebimento de pedidos ilimitados por 30 dias, independente do saldo em conta.</p>
                        </div>
                        <button 
                          onClick={() => handleGeneratePix(true)}
                          disabled={isGeneratingPix}
                          className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg shadow-slate-500/20 hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center justify-center space-x-3"
                        >
                          {isGeneratingPix ? (
                            <>
                              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              <span>Gerando Pix...</span>
                            </>
                          ) : (
                            <>
                              <CreditCard size={20} />
                              <span>Pagar Mensalidade</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6 text-center">
                    {pixError && (
                      <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
                        <AlertTriangle size={16} />
                        <span className="flex-1 text-left">{pixError}</span>
                      </div>
                    )}

                    <div className="relative inline-block mx-auto">
                      <div className="bg-white p-6 rounded-3xl border-4 border-slate-100 shadow-inner">
                        {activePixPayment.qrCode ? (
                          <div className="flex flex-col items-center gap-4">
                            <QRCodeSVG 
                              value={activePixPayment.qrCode}
                              size={256}
                              level="H"
                              includeMargin={true}
                              className="w-56 h-56 mx-auto sm:w-64 sm:h-64"
                            />
                          </div>
                        ) : activePixPayment.qrCodeBase64 ? (
                          <img 
                            src={`data:image/png;base64,${activePixPayment.qrCodeBase64}`} 
                            className="w-56 h-56 mx-auto sm:w-64 sm:h-64" 
                            alt="QR Code Pix" 
                            referrerPolicy="no-referrer" 
                            style={{ imageRendering: 'pixelated' }}
                          />
                        ) : (
                          <div className="w-56 h-56 mx-auto flex items-center justify-center bg-slate-50 rounded-2xl text-slate-200 sm:w-64 sm:h-64">
                            <QrCode size={64} />
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-600">Pix Copia e Cola</p>
                      <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <code className="text-[10px] flex-1 truncate font-mono text-slate-400 select-all">{activePixPayment.qrCode}</code>
                        <button 
                          onClick={() => {
                            if (navigator.clipboard && navigator.clipboard.writeText) {
                              navigator.clipboard.writeText(activePixPayment.qrCode)
                                .then(() => alert('Código Copiado! Use o "Pix Copia e Cola" no seu banco.'))
                                .catch(() => {
                                  // Fallback for some mobile browsers
                                  const el = document.createElement('textarea');
                                  el.value = activePixPayment.qrCode;
                                  document.body.appendChild(el);
                                  el.select();
                                  document.execCommand('copy');
                                  document.body.removeChild(el);
                                  alert('Código Copiado!');
                                });
                            } else {
                              const el = document.createElement('textarea');
                              el.value = activePixPayment.qrCode;
                              document.body.appendChild(el);
                              el.select();
                              document.execCommand('copy');
                              document.body.removeChild(el);
                              alert('Código Copiado!');
                            }
                          }}
                          className="p-2 bg-white rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-2xl flex items-center space-x-3 text-blue-600">
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-left leading-tight">Aguardando confirmação do pagamento...</p>
                    </div>

                    <p className="text-[10px] text-slate-400">Assim que o pagamento for aprovado, seu {rechargeTab === 'credit' ? 'saldo' : 'assinatura'} será atualizado automaticamente.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <GalleryModal 
        isOpen={isGalleryOpen} 
        onClose={() => setIsGalleryOpen(false)} 
        onSelect={handleGallerySelect} 
      />

      {/* Chat Modal */}
      <AnimatePresence>
        {activeChatOrderId && (
          <Chat 
            orderId={activeChatOrderId} 
            orderStatus={orders.find(o => o.id === activeChatOrderId)?.status || ''} 
            isManagerView={true}
            onClose={() => setActiveChatOrderId(null)}
          />
        )}
      </AnimatePresence>

      {/* Courier Selection Modal */}
      <AnimatePresence>
        {orderForCourierSelection && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black uppercase tracking-tight italic text-blue-600">Chamar Entregador</h3>
                    <p className="text-slate-400 text-xs font-medium">Escolha quem fará a entrega deste pedido.</p>
                  </div>
                  <button onClick={() => setOrderForCourierSelection(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <X size={24} />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <button 
                    onClick={async () => {
                      const orderId = orderForCourierSelection;
                      try {
                        await updateDoc(doc(db, 'orders', orderId), {
                          deliveryMethod: 'store',
                          updatedAt: serverTimestamp()
                        });
                        setOrderForCourierSelection(null);
                        alert('Entrega marcada como própria da loja.');
                      } catch (error) {
                        handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
                      }
                    }}
                    className="group relative overflow-hidden bg-emerald-50 hover:bg-emerald-100 p-6 rounded-3xl border-2 border-emerald-100 hover:border-emerald-500 transition-all text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                        <Store size={24} />
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-emerald-800 uppercase tracking-tighter italic">Entregador da Loja</h4>
                        <p className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-widest">Você mesmo gerencia a entrega</p>
                      </div>
                    </div>
                  </button>

                  <button 
                    onClick={() => {
                      setShowTupaCategories(orderForCourierSelection);
                      setOrderForCourierSelection(null);
                    }}
                    className="group relative overflow-hidden bg-blue-50 hover:bg-blue-100 p-6 rounded-3xl border-2 border-blue-100 hover:border-blue-500 transition-all text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
                        <Bike size={24} />
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-blue-800 uppercase tracking-tighter italic">Entregador da Tupã</h4>
                        <p className="text-[10px] font-bold text-blue-600/70 uppercase tracking-widest">Solicitar entregador da plataforma</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cancellation Modal */}
      <AnimatePresence>
        {cancellingOrderId && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black uppercase tracking-tight italic text-red-600">Cancelar Pedido</h3>
                    <p className="text-slate-400 text-xs font-medium">Informe o motivo do cancelamento para o cliente.</p>
                  </div>
                  <button onClick={() => { setCancellingOrderId(null); setCancellationReason(''); }} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Motivo do Cancelamento</label>
                    <textarea 
                      value={cancellationReason}
                      onChange={e => setCancellationReason(e.target.value)}
                      className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-red-500/20 min-h-[120px]"
                      placeholder="Ex: Produto indisponível, restaurante fechando..."
                    />
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => { setCancellingOrderId(null); setCancellationReason(''); }}
                      className="flex-1 bg-slate-100 text-slate-400 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px]"
                    >
                      Voltar
                    </button>
                    <button 
                      disabled={!cancellationReason || isCancelling}
                      onClick={async () => {
                        setIsCancelling(true);
                        await handleUpdateOrderStatus(cancellingOrderId, 'cancelled', cancellationReason);
                        setIsCancelling(false);
                        setCancellingOrderId(null);
                        setCancellationReason('');
                      }}
                      className="flex-[2] bg-red-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-red-500/20 hover:bg-red-700 transition-all disabled:opacity-50"
                    >
                      {isCancelling ? 'Cancelando...' : 'Confirmar Cancelamento'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Ride Cancellation Confirmation Modal */}
      <AnimatePresence>
        {confirmingRideCancellation && (
          <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl p-8 space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto text-red-600 mb-4">
                  <XCircle size={32} />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight italic text-red-600">Cancelar Corrida?</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs font-bold leading-relaxed uppercase tracking-widest">
                  Tem certeza que deseja cancelar esta busca ou corrida? Isso interromperá a entrega atual.
                </p>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setConfirmingRideCancellation(null)}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-400 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px]"
                >
                  Voltar
                </button>
                <button 
                  onClick={async () => {
                    if (isCancelling) return;
                    const { orderId, rideId } = confirmingRideCancellation;
                    try {
                      await handleCancelRide(orderId, rideId, true);
                      await updateDoc(doc(db, 'orders', orderId), { deliveryMethod: null, updatedAt: serverTimestamp() });
                      setConfirmingRideCancellation(null);
                    } catch (err: any) {
                      alert(`Erro ao cancelar: ${err.message}`);
                    }
                  }}
                  disabled={isCancelling}
                  className="flex-1 bg-red-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-red-500/20 hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isCancelling ? <RefreshCw size={14} className="animate-spin" /> : 'Confirmar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Printer Modal */}
      <AnimatePresence>
        {isAddingPrinter && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-blue-gradient text-white">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-black uppercase tracking-tight italic">
                    {editingPrinter ? 'Editar Impressora' : 'Nova Impressora'}
                  </h3>
                  <button onClick={() => setIsAddingPrinter(false)} className="text-white/60 hover:text-white transition-colors">
                    <X size={24} />
                  </button>
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Configure sua impressora térmica ESC/POS</p>
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Nome da Impressora</label>
                    <input 
                      type="text"
                      value={printerName}
                      onChange={(e) => setPrinterName(e.target.value)}
                      placeholder="Ex: Cozinha, Balcão"
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Conexão</label>
                      <select 
                        value={printerConnection}
                        onChange={(e) => setPrinterConnection(e.target.value as any)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                      >
                        <option value="network">Rede (IP)</option>
                        <option value="bluetooth">Bluetooth</option>
                        <option value="usb" disabled>USB (Em breve)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Papel</label>
                      <select 
                        value={printerPaperSize}
                        onChange={(e) => setPrinterPaperSize(e.target.value as any)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                      >
                        <option value="58mm">58mm</option>
                        <option value="80mm">80mm</option>
                      </select>
                    </div>
                  </div>

                  {printerConnection === 'network' && (
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2 space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Endereço IP</label>
                        <input 
                          type="text"
                          value={printerIp}
                          onChange={(e) => setPrinterIp(e.target.value)}
                          placeholder="192.168.1.100"
                          className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Porta</label>
                        <input 
                          type="text"
                          value={printerPort}
                          onChange={(e) => setPrinterPort(e.target.value)}
                          placeholder="9100"
                          className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                      </div>
                    </div>
                  )}

                  {printerConnection === 'bluetooth' && (
                    <div className="space-y-4">
                      <button 
                        onClick={scanBluetooth}
                        disabled={isScanningBluetooth}
                        className="w-full flex items-center justify-center space-x-2 py-3 bg-blue-50 text-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all"
                      >
                        {isScanningBluetooth ? <RefreshCw size={14} className="animate-spin" /> : <Bluetooth size={14} />}
                        <span>{isScanningBluetooth ? 'Procurando...' : 'Procurar Impressoras'}</span>
                      </button>

                      {bluetoothDevices.length > 0 && (
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Dispositivos Encontrados</label>
                          <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                            {bluetoothDevices.map((device, idx) => (
                              <button
                                key={`bt-dev-2-${device.id}-${idx}`}
                                disabled={isConnectingBluetooth}
                                onClick={() => connectBluetooth(device)}
                                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${printerIp === device.id ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50'}`}
                              >
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs font-bold">{device.name || 'Dispositivo Sem Nome'}</span>
                                  {device.gatt?.connected && (
                                    <span className="text-[8px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full font-black uppercase tracking-widest">Conectado</span>
                                  )}
                                </div>
                                {isConnectingBluetooth && printerIp === device.id ? (
                                  <RefreshCw size={12} className="animate-spin" />
                                ) : (
                                  printerIp === device.id && <Check size={14} />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                      <input 
                        type="checkbox"
                        id="printer-active"
                        checked={printerActive}
                        onChange={(e) => setPrinterActive(e.target.checked)}
                        className="w-5 h-5 rounded-lg text-blue-600 focus:ring-blue-500 border-slate-300"
                      />
                      <div className="flex flex-col">
                        <label htmlFor="printer-active" className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">
                          Impressora Ativa
                        </label>
                        <span className="text-[8px] text-slate-400">Habilitar para uso</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                      <input 
                        type="checkbox"
                        id="printer-autoprint"
                        checked={printerAutoPrint}
                        onChange={(e) => setPrinterAutoPrint(e.target.checked)}
                        className="w-5 h-5 rounded-lg text-blue-600 focus:ring-blue-500 border-slate-300"
                      />
                      <div className="flex flex-col">
                        <label htmlFor="printer-autoprint" className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">
                          Auto-Imprimir
                        </label>
                        <span className="text-[8px] text-slate-400">Imprimir novos pedidos</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button 
                    onClick={() => setIsAddingPrinter(false)}
                    className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-400 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleSavePrinter}
                    className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all"
                  >
                    {editingPrinter ? 'Salvar Alterações' : 'Cadastrar Impressora'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Manual Order Modal */}
      <AnimatePresence>
        {isAddingManualOrder && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              key="manual-order-modal"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-4xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-black uppercase tracking-tighter italic">Novo Pedido Manual</h3>
                <button onClick={() => setIsAddingManualOrder(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                {/* Item Selection */}
                <div className="flex-1 p-6 overflow-y-auto border-r border-slate-100 space-y-6">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Selecione os Itens</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {foodItems.map((item, idx) => (
                      <button 
                        key={`manual-item-${item.id}-${idx}`}
                        onClick={() => addManualItem(item)}
                        className="flex items-center space-x-3 p-3 bg-slate-50 rounded-2xl hover:bg-blue-50 transition-all text-left group"
                      >
                        <img src={item.imageUrl || undefined} className="w-12 h-12 rounded-xl object-cover" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate group-hover:text-blue-600">{item.name}</p>
                          <p className="text-[10px] text-slate-400">R$ {(item.promoPrice || item.price).toFixed(2)}</p>
                        </div>
                        <Plus size={16} className="text-slate-300 group-hover:text-blue-600" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Order Summary & Form */}
                <div className="w-full md:w-80 bg-slate-50 p-6 overflow-y-auto space-y-6">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Resumo do Pedido</h4>
                  
                  <div className="space-y-3">
                    {manualOrderItems.length === 0 ? (
                      <p className="text-center text-[10px] text-slate-400 py-4 italic">Nenhum item selecionado</p>
                    ) : (
                      manualOrderItems.map((item, idx) => (
                        <div key={`manual-order-item-${item.id}-${idx}`} className="flex items-center justify-between bg-white p-3 rounded-xl shadow-sm">
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold truncate">{item.quantity}x {item.name}</p>
                            <p className="text-[8px] text-slate-400">R$ {(item.price * item.quantity).toFixed(2)}</p>
                          </div>
                          <button onClick={() => removeManualItem(item.id)} className="p-1 text-slate-300 hover:text-red-500">
                            <X size={14} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">Total</span>
                      <span className="text-lg font-black text-blue-600">
                        R$ {manualOrderItems.reduce((acc, i) => acc + (i.price * i.quantity), 0).toFixed(2)}
                      </span>
                    </div>

                    <form onSubmit={handleCreateManualOrder} className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Nome do Cliente</label>
                        <input 
                          type="text" 
                          value={manualOrderCustomerName} 
                          onChange={e => setManualOrderCustomerName(e.target.value)}
                          placeholder="Ex: João Silva"
                          className="w-full bg-white border-none rounded-xl p-3 text-xs focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Endereço / Mesa</label>
                        <input 
                          type="text" 
                          value={manualOrderAddress} 
                          onChange={e => setManualOrderAddress(e.target.value)}
                          placeholder="Ex: Rua A, 123 ou Mesa 5"
                          className="w-full bg-white border-none rounded-xl p-3 text-xs focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Pagamento</label>
                        <select 
                          value={manualOrderPaymentMethod}
                          onChange={e => setManualOrderPaymentMethod(e.target.value as any)}
                          className="w-full bg-white border-none rounded-xl p-3 text-xs focus:ring-2 focus:ring-blue-500/20"
                        >
                          <option value="cash">Dinheiro</option>
                          <option value="pix">PIX</option>
                          <option value="card">Cartão</option>
                        </select>
                      </div>
                      <button 
                        type="submit"
                        className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all"
                      >
                        Finalizar Pedido
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Courier Category Selection Modal (Tupã) */}

      {/* Courier Category Selection Modal (Tupã) */}
      <AnimatePresence>
        {showTupaCategories && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black uppercase tracking-tight italic text-blue-600">Categorias TUPÃ</h3>
                    <p className="text-slate-400 text-xs font-medium">Selecione o tipo de veículo para a entrega.</p>
                  </div>
                  <button onClick={() => setShowTupaCategories(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-3 max-h-[400px] overflow-y-auto no-scrollbar pr-2">
                  {isLoadingCategories ? (
                    <div className="py-12 flex flex-col items-center justify-center space-y-4">
                      <Loader2 size={40} className="animate-spin text-blue-500" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Consultando API {cityData?.name}...</p>
                    </div>
                  ) : apiCategories.length > 0 ? (
                    apiCategories.map((cat, idx) => {
                      const isLoading = categoryLoading[showTupaCategories] === cat.id;
                      return (
                        <button 
                          key={`cat-list-modal-${cat.id}-${idx}`}
                          disabled={isLoading}
                          onClick={() => {
                            handleCallCourier(showTupaCategories, cat.id, cat.nome, cat.preco, cat.distancia);
                            setShowTupaCategories(null);
                          }}
                          className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all group disabled:opacity-50"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                              {isLoading ? <Loader2 size={18} className="animate-spin" /> : (cat.nome?.toLowerCase()?.includes('moto') ? <Bike size={24} /> : <Car size={24} />)}
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-black text-slate-700 dark:text-slate-200">{cat.nome}</p>
                              <div className="flex items-center gap-2">
                                <p className="text-[10px] font-bold text-blue-500 italic">
                                  R$ {(cat.preco || cat.estimativa_valor || cat.valor || 0).toFixed(2).replace('.', ',')}
                                </p>
                                {cat.distancia && (
                                  <span className="text-[8px] font-black uppercase text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                                    {cat.distancia.toFixed(1)} km
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <ChevronRight size={20} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                        </button>
                      );
                    })
                  ) : (
                    <div className="py-12 text-center space-y-4 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                      <AlertCircle size={40} className="mx-auto text-amber-500" />
                      <div>
                        <p className="text-sm font-black text-slate-700 dark:text-slate-200">Nenhuma categoria ativa</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Verifique as configurações em API Cidades</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                   <p className="text-[9px] font-black uppercase text-center text-slate-400 tracking-widest">
                     Categorias baseadas na cidade: {cityData?.name || 'Não Identificada'}
                   </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {selectedCourierDetails && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[32px] overflow-hidden shadow-2xl"
            >
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <button 
                    onClick={() => handleCancelRide(selectedCourierDetails.orderId, selectedCourierDetails.id)}
                    className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all flex items-center gap-2"
                  >
                    <XCircle size={14} />
                    Cancelar Corrida
                  </button>
                  <button onClick={() => setSelectedCourierDetails(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                    <X size={20} className="text-slate-400" />
                  </button>
                </div>

                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-24 h-24 rounded-full border-4 border-blue-500 p-1 bg-white dark:bg-slate-800 shadow-xl">
                    <img 
                      src={selectedCourierDetails.courierPhoto || `https://i.pravatar.cc/150?u=${selectedCourierDetails.courierUid}`} 
                      alt={selectedCourierDetails.courierName}
                      className="w-full h-full object-cover rounded-full"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">{selectedCourierDetails.courierName}</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Entregador Verificado</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                  <div className="space-y-1">
                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Veículo</p>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{selectedCourierDetails.courierVehicle}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Placa</p>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{selectedCourierDetails.courierPlate}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Cor</p>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{selectedCourierDetails.courierColor}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Ano</p>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{selectedCourierDetails.courierYear || '2022'}</p>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    const whatsappUrl = `https://wa.me/${selectedCourierDetails.courierWhatsapp.replace(/\D/g, '')}`;
                    window.open(whatsappUrl, '_blank');
                  }}
                  className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-700 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  <MessageCircle size={22} />
                  Falar com Motorista
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

        {/* Order Color Configuration Modal */}
        <AnimatePresence>
          {isConfiguringColors && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm"
              onClick={() => setIsConfiguringColors(false)}
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white rounded-[3rem] p-8 max-w-sm w-full shadow-2xl space-y-6"
                onClick={e => e.stopPropagation()}
              >
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mx-auto">
                    <Clock size={32} />
                  </div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter italic">Cores dos Pedidos</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Configure os alertas de tempo</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full" />
                      Tempo Limite (Minutos)
                    </label>
                    <input 
                      type="text" 
                      inputMode="numeric"
                      value={warningMinutes || ''}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        setWarningMinutes(val === '' ? 0 : Number(val));
                        setCriticalMinutes(val === '' ? 0 : Number(val));
                      }}
                      className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-red-500/20"
                      placeholder="Ex: 15"
                    />
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                      O pedido ficará com borda verde até atingir este tempo, depois ficará vermelha.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button 
                    onClick={async () => {
                      if (!restaurant) return;
                      try {
                        await updateDoc(doc(db, 'restaurants', restaurant.id), {
                          orderColorConfig: {
                            warningMinutes,
                            criticalMinutes
                          }
                        });
                        setIsConfiguringColors(false);
                      } catch (error) {
                        console.error("Error saving color config:", error);
                        alert("Erro ao salvar configurações.");
                      }
                    }}
                    className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all"
                  >
                    Salvar Configuração
                  </button>
                  <button 
                    onClick={() => setIsConfiguringColors(false)}
                    className="w-full bg-slate-100 text-slate-600 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isAssigningEmployees && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsAssigningEmployees(null)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[3rem] overflow-hidden shadow-2xl relative z-10 p-8 space-y-6"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black uppercase tracking-tighter italic text-blue-600">Atribuir Funcionário</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Selecione os responsáveis pelo pedido</p>
                  </div>
                  <button onClick={() => setIsAssigningEmployees(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Novo funcionário..."
                      value={newEmployeeName}
                      onChange={(e) => setNewEmployeeName(e.target.value)}
                      className="flex-1 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-blue-500/20"
                    />
                    <button 
                      onClick={handleAddEmployee}
                      className="bg-blue-600 text-white p-4 rounded-2xl hover:bg-blue-700 transition-colors"
                    >
                      <Plus size={20} />
                    </button>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-2 no-scrollbar">
                    {(() => {
                      const order = orders.find(o => o.id === isAssigningEmployees);
                      const restaurantEmployees = restaurant?.employees || [];
                      
                      if (!order) return null;

                      if (restaurantEmployees.length === 0) {
                        return <p className="text-center text-slate-400 text-xs py-4">Nenhum funcionário cadastrado.</p>;
                      }

                      return restaurantEmployees.map((emp, idx) => {
                        const isAssigned = order.assignedEmployees?.includes(emp);
                        return (
                          <button
                            key={`${order.id}-emp-select-${emp}-${idx}`}
                            onClick={() => handleAssignEmployee(order.id, emp)}
                            className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${
                              isAssigned 
                                ? 'bg-blue-50 text-blue-600 border-2 border-blue-200' 
                                : 'bg-slate-50 text-slate-600 border-2 border-transparent hover:border-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isAssigned ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>
                                <User size={16} />
                              </div>
                              <span className="text-sm font-bold">{emp}</span>
                            </div>
                            {isAssigned && <CheckCircle size={20} className="text-blue-600" />}
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>

                <button 
                  onClick={() => setIsAssigningEmployees(null)}
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all"
                >
                  Concluir
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showNoCourierPopup && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[3rem] overflow-hidden shadow-2xl border-4 border-red-50 dark:border-red-900/10"
              >
                <div className="p-10 text-center space-y-8">
                  <div className="relative mx-auto w-24 h-24">
                    <div className="relative w-24 h-24 bg-red-50 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-600 shadow-inner">
                      <AlertTriangle size={48} />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white italic leading-none">Sem Motoristas disponíveis!</h3>
                    <p className="text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest text-[10px] leading-relaxed max-w-[240px] mx-auto opacity-80">
                      Infelizmente não encontramos nenhum entregador TUPÃ disponível para realizar sua entrega neste momento.
                    </p>
                  </div>

                  <div className="space-y-3 pt-2">
                    <button
                      onClick={() => setShowNoCourierPopup(false)}
                      className="w-full bg-red-600 text-white py-6 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-red-700 transition-all shadow-xl shadow-red-600/30 active:scale-95 flex items-center justify-center gap-3"
                    >
                      <span>Entendido e fechar</span>
                    </button>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">
                      Tente novamente em alguns instantes
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isDeletingAccountModalOpen && (
            <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[3rem] overflow-hidden shadow-2xl border-4 border-red-50 dark:border-red-900/10"
              >
                <div className="p-10 text-center space-y-8">
                  <div className="relative mx-auto w-24 h-24">
                    <div className="relative w-24 h-24 bg-red-50 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-600 shadow-inner">
                      <Trash2 size={48} />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white italic leading-none">Excluir sua conta?</h3>
                    <p className="text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest text-[10px] leading-relaxed max-w-[280px] mx-auto opacity-80">
                      Esta ação é irreversível. Todas as suas informações, restaurante, produtos e histórico serão <span className="text-red-500 underline">excluídos permanentemente</span>.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3">
                    <button
                      onClick={handleDeleteAccountConfirmed}
                      className="w-full bg-red-600 text-white py-6 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-red-700 transition-all shadow-xl shadow-red-600/30 active:scale-95 flex items-center justify-center gap-3"
                    >
                      <Trash2 size={18} />
                      <span>Sim, Excluir Definitivamente</span>
                    </button>
                    <button
                      onClick={() => setIsDeletingAccountModalOpen(false)}
                      className="w-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white py-6 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-slate-200 dark:hover:bg-white/10 transition-all active:scale-95"
                    >
                      Cancelar e Voltar
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      <AuthModal isOpen={isAuthModalOpen} onClose={handleAuthModalClose} targetRole="manager" />
    </div>
  );
};

export default ManagerView;
