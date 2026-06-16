import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { db } from '../firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc,
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  doc,
  getDoc,
  getDocs,
  deleteDoc,
  setDoc,
  limit,
  increment,
  startAfter
} from 'firebase/firestore';
import { Search, ShoppingBag, MapPin, Star, Clock, Utensils, ChevronRight, Users, ArrowLeft, Plus, Minus, Package, Trash2, CheckCircle2, Zap, MessageSquare, X, Navigation, Navigation2, Store, Bike, Car, ArrowDownWideNarrow, Filter, ClipboardList, Image as ImageIcon, Edit2, Edit, LogOut, User, Shield, ShieldCheck, Copy, Flame, ChevronLeft, Truck, Video, AlertCircle, Headphones, Headset, AlertTriangle, Check, TrendingUp, RefreshCw, Hash, Loader2, ExternalLink, Info, Mail, MessageCircle, Heart, Settings2, Camera, CreditCard, BellRing, ShieldAlert, Map as MapIcon, Lock, Unlock, CupSoda, Pizza, Cake } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icon issue
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});
import { getRestaurantStatus, isTimeInRange, getPortoVelhoTime } from '../utils/hours';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  TouchSensor,
  MouseSensor
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ThemeSelector } from './ThemeSelector';
import { useAuth, OperationType, handleFirestoreError } from '../AuthContext';
import { formatPrice } from '../utils/format';
import Chat from './Chat';
import AuthModal from './AuthModal';
import MapTrackingModal from './MapTrackingModal';
import axios from 'axios';
import { playSound } from '../utils/sounds';
import { compressImage } from '../utils/image';

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

interface Restaurant {
  id: string;
  name: string;
  ownerUid: string;
  description: string;
  imageUrl: string;
  openingHours: string;
  closingHours: string;
  weeklyHours?: WeeklyHours;
  status: string;
  rating?: number;
  latitude?: number;
  longitude?: number;
  city?: string;
  isFamous?: boolean;
  modality?: 'restaurante' | 'mercado' | 'farmácia' | 'lanche' | 'padaria' | 'bebidas' | 'pet shop' | 'shopping gourmet';
  pixConfigType?: 'company' | 'central' | 'none';
  pixKey?: string;
  pixType?: string;
  deliveryConfigured?: boolean;
  deliveryFeeType?: 'km' | 'free' | 'fixed';
  deliveryFeePerKm?: number;
  freeDeliveryKm?: number;
  isDeliveryFree?: boolean;
  minOrderValue?: number;
  forceClosed?: boolean;
  likesCount?: number;
  ranking?: number;
  order?: number;
  logoUrl?: string;
  logo?: string;
  customOrderDeduction?: number;
  acceptedPaymentMethods?: string[];
  createdAt?: any;
  isWalletBlocked?: boolean;
  activityExpiresAt?: any;
}

interface Banner {
  id: string;
  imageUrl: string;
  title: string;
  active: boolean;
  linkUrl?: string;
  mediaType?: 'image' | 'video' | 'gif';
  audioUrl?: string;
  linkType?: 'external' | 'restaurant' | 'product';
  linkId?: string;
  objectPosition?: string;
  cities?: string[];
}

export interface ClientIconSettings {
  size?: number;
  spacing?: number;
  color?: string;
  filterIcon?: string;
  filterIconSize?: number;
  filterIconSpacing?: number;
  ordersIcon?: string;
  ordersIconSize?: number;
  ordersIconSpacing?: number;
  cartIcon?: string;
  cartIconSize?: number;
  cartIconSpacing?: number;
  colorIcon?: string;
  colorIconSize?: number;
  colorIconSpacing?: number;
  filterIconScale?: number;
  ordersIconScale?: number;
  cartIconScale?: number;
  colorIconScale?: number;
}

interface GlobalSettings {
  carouselInterval: number;
  appName?: string;
  activeEffect?: 'none' | 'snow' | 'rocket' | 'easter' | 'women_day';
  mercadoPagoPublicKey?: string;
  mercadoPagoAccessToken?: string;
  minWalletBalance?: number;
  minRechargeAmount?: number;
  orderDeductionAmount?: number;
  centralPixKey?: string;
  centralPixType?: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';
  splitPayEnabled?: boolean;
  monthlyFee?: number;
  defaultDueDay?: number;
  trialPeriodDays?: number;
  highlightDailyCost?: number;
  clientIcons?: ClientIconSettings;
  businessRegistrationPhone?: string;
}

interface Category {
  id: string;
  name: string;
  iconName: string;
  imageUrl?: string;
  active: boolean;
  order?: number;
  status?: 'active' | 'inactive';
}

const renderCategoryIcon = (iconName: string, size: number = 24, className?: string) => {
  const normalized = (iconName || '').toLowerCase().trim();
  switch (normalized) {
    case 'cupsoda':
    case 'cup':
    case 'bebidas':
      return <CupSoda size={size} className={className} />;
    case 'pizza':
      return <Pizza size={size} className={className} />;
    case 'cake':
    case 'doces':
      return <Cake size={size} className={className} />;
    case 'zap':
    case 'acais':
    case 'açaís':
      return <Zap size={size} className={className} />;
    case 'store':
    case 'padaria':
      return <Store size={size} className={className} />;
    case 'bike':
      return <Bike size={size} className={className} />;
    case 'car':
      return <Car size={size} className={className} />;
    case 'utensils':
    default:
      return <Utensils size={size} className={className} />;
  }
};

interface AddOn {
  id: string;
  name: string;
  price?: number;
  imageUrl?: string;
  isFixed?: boolean;
}

interface ProductAvailability {
  monday: { active: boolean; startTime: string; endTime: string };
  tuesday: { active: boolean; startTime: string; endTime: string };
  wednesday: { active: boolean; startTime: string; endTime: string };
  thursday: { active: boolean; startTime: string; endTime: string };
  friday: { active: boolean; startTime: string; endTime: string };
  saturday: { active: boolean; startTime: string; endTime: string };
  sunday: { active: boolean; startTime: string; endTime: string };
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
  preparationTimeMinutes?: number;
  highlightUntil?: any;
  isDeliveryFree?: boolean;
  addOns?: AddOn[];
  maxAddOns?: number;
  likesCount?: number;
  order?: number;
  availability?: ProductAvailability;
}

interface Review {
  id: string;
  restaurantId: string;
  customerUid: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  rating: number;
  comment: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  likesCount?: number;
  createdAt: any;
  productId?: string;
}

interface Like {
  id: string;
  userId: string;
  itemId: string;
  itemType: 'restaurant' | 'product' | 'review';
  createdAt: any;
}

interface MarketingPopup {
  id: string;
  imageUrl: string;
  linkUrl: string;
  active: boolean;
}

interface CartItem extends FoodItem {
  quantity: number;
  selectedAddOns?: AddOn[];
}

interface Ride {
  id: string;
  restaurantId: string;
  restaurantName: string;
  machineRequestId?: string;
  destinations: {
    orderId: string;
    customerName: string;
    customerUid: string;
    address: string;
    latitude?: number;
    longitude?: number;
  }[];
  customerUids?: string[];
  vehicleType: 'motorcycle' | 'car';
  status: 'searching' | 'pending_acceptance' | 'accepted' | 'arrived_at_pickup' | 'picked_up' | 'en_route' | 'completed' | 'cancelled';
  courierUid?: string;
  courierName?: string;
  courierPhoto?: string;
  courierVehicle?: string;
  courierPlate?: string;
  courierColor?: string;
  estimatedArrival?: string;
  createdAt: any;
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
}

interface CategorySchedule {
  id: string;
  name: string;
  categoryIds: string[];
  startTime: string;
  endTime: string;
  active: boolean;
}

interface City {
  id: string;
  name: string;
  apiUrl: string;
  apiKey: string;
  authEmail?: string;
  authPassword?: string;
  lat?: number | null;
  lng?: number | null;
  usar_localizacao?: boolean;
  cidade?: string;
  endereco?: string;
  bairro?: string;
  estado?: string;
  status: 'online' | 'offline' | 'error';
  lastChecked: string;
  categories: any[];
  categoriesLastUpdated?: string;
  active: boolean;
}

const getStatusPercentage = (status: string) => {
  switch (status) {
    case 'searching': return 10;
    case 'pending_acceptance': return 20;
    case 'accepted': return 40;
    case 'arrived_at_pickup': return 55;
    case 'picked_up': return 70;
    case 'en_route': return 85;
    case 'completed': return 100;
    default: return 0;
  }
};

const getStatusLabelText = (status: string) => {
  switch (status) {
    case 'searching': return 'Buscando Entregador...';
    case 'pending_acceptance': return 'Aguardando Aceite...';
    case 'accepted': return 'Motorista Aceitou';
    case 'arrived_at_pickup': return 'Na Loja Preparando Retirada';
    case 'picked_up': return 'Pedido Coletado';
    case 'en_route': return 'A Caminho do Endereço';
    case 'completed': return 'Entrega Finalizada';
    default: return 'Processando';
  }
};

const BannerPopup = ({ banner, onClose }: { banner: Banner; onClose: () => void }) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (banner.audioUrl && audioRef.current) {
      audioRef.current.play().catch(e => console.log("Audio play blocked", e));
    }
  }, [banner.audioUrl]);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
      />
      <motion.div 
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.9 }}
        className="bg-white w-full max-w-lg rounded-[3rem] overflow-hidden shadow-2xl relative z-10"
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 z-10 p-3 bg-white/90 backdrop-blur-sm text-slate-900 rounded-full shadow-lg hover:scale-110 transition-transform"
        >
          <X size={20} />
        </button>
        <div className="aspect-[4/5] relative">
          {banner.mediaType === 'video' ? (
            <video 
              src={banner.imageUrl || undefined} 
              autoPlay 
              loop 
              muted={!banner.audioUrl} 
              className="w-full h-full object-cover" 
              style={{ objectPosition: banner.objectPosition || '50% 50%' }}
            />
          ) : (
            <img 
              src={banner.imageUrl || undefined} 
              className="w-full h-full object-cover" 
              style={{ objectPosition: banner.objectPosition || '50% 50%' }}
              referrerPolicy="no-referrer" 
            />
          )}
          
          {banner.audioUrl && (
            <audio ref={audioRef} src={banner.audioUrl} loop className="hidden" />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent flex flex-col justify-end p-10 space-y-4">
          <h3 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter italic leading-none">{banner.title}</h3>
          <button 
            onClick={onClose}
            className="w-full bg-blue-gradient text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-500/20"
          >
            Aproveitar Agora
          </button>
        </div>
      </div>
    </motion.div>
  </div>
  );
};

interface Order {
  id: string;
  restaurantId: string;
  customerUid: string;
  customerName?: string;
  items: any[];
  total: number;
  status: 'pending' | 'preparing' | 'ready' | 'delivering' | 'en_route' | 'delivered' | 'rejected' | 'cancelled';
  deliveryAddress: string;
  deliveryOption?: 'normal' | 'fast';
  deliveryFee?: number;
  restaurantName?: string;
  restaurantLogo?: string;
  paymentMethod?: string;
  createdAt: any;
}

const VerifiedBadge = () => (
  <span className="inline-flex items-center justify-center bg-blue-500 rounded-full p-0.5 ml-1 flex-shrink-0">
    <svg viewBox="0 0 24 24" className="w-2 h-2 text-white fill-current" aria-hidden="true">
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
    </svg>
  </span>
);

const getTimeRemaining = (restaurant: Restaurant, now: Date) => {
  const status = getRestaurantStatus(restaurant, now);
  
  if (!status.isOpen) {
    if (restaurant.isWalletBlocked) return { status: 'closed', text: 'Indisponível (Saldo)' };
    if (status.reason === 'expired') return { status: 'closed', text: 'Indisponível' };
    if (status.reason === 'paused') return { status: 'closed', text: 'Pausado' };
    if (status.reason === 'force_closed') return { status: 'closed', text: 'Fechado Manualmente' };
    return { status: 'closed', text: 'Fechado' };
  }

  // If manually active, return a simplified "Open" status to override schedule calculation
  if (restaurant.status === 'active') {
    return { status: 'open', text: 'Aberto (Manual)' };
  }

  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const nowPV = getPortoVelhoTime(now);
  
  // Helper to get hours for a specific date
  const getHoursForDate = (date: Date) => {
    const dayName = dayNames[date.getDay()] as keyof WeeklyHours;
    return restaurant.weeklyHours?.[dayName] || { 
      open: restaurant.openingHours || '08:00', 
      close: restaurant.closingHours || '22:00', 
      closed: false,
      closesForLunch: false
    };
  };

  const currentHours = getHoursForDate(now);
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(now.getDate() - 1);
  const yesterdayHours = getHoursForDate(yesterdayDate);

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Check if we are in the "late night" part of yesterday's hours
  if (!yesterdayHours.closed) {
    try {
      const [openH, openM] = yesterdayHours.open.split(':').map(Number);
      const [closeH, closeM] = yesterdayHours.close.split(':').map(Number);
      const openMinutes = openH * 60 + openM;
      const closeMinutes = closeH * 60 + closeM;

      if (closeMinutes < openMinutes) {
        const closeDate = new Date(now);
        closeDate.setHours(closeH, closeM, 0, 0);
        
        if (now < closeDate) {
          const diff = closeDate.getTime() - now.getTime();
          const h = Math.floor(diff / 3600000);
          const m = Math.floor((diff % 3600000) / 60000);
          return { status: 'open', text: `Fecha em ${h}h ${m}m` };
        }
      }
    } catch (e) {}
  }

  if (!currentHours.closed) {
    try {
      const [openH, openM] = currentHours.open.split(':').map(Number);
      const [closeH, closeM] = currentHours.close.split(':').map(Number);
      const openMinutes = openH * 60 + openM;
      const closeMinutes = closeH * 60 + closeM;

      const openDate = new Date(now);
      openDate.setHours(openH, openM, 0, 0);

      const closeDate = new Date(now);
      closeDate.setHours(closeH, closeM, 0, 0);
      if (closeMinutes < openMinutes) closeDate.setDate(closeDate.getDate() + 1);

      // If currently in the main open range
      if (now >= openDate && now < closeDate) {
        // Check for lunch break
        if (currentHours.closesForLunch && currentHours.lunchStart && currentHours.lunchEnd) {
          const [lSH, lSM] = currentHours.lunchStart.split(':').map(Number);
          const [lEH, lEM] = currentHours.lunchEnd.split(':').map(Number);
          const lSMin = lSH * 60 + lSM;
          const lEMin = lEH * 60 + lEM;

          if (currentMinutes >= lSMin && currentMinutes < lEMin) {
            // We are in lunch break. Next opening is lunchEnd.
            const nextOpenDate = new Date(now);
            nextOpenDate.setHours(lEH, lEM, 0, 0);
            const diff = nextOpenDate.getTime() - now.getTime();
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            return { status: 'opening', text: `Abre em ${h > 0 ? h + 'h ' : ''}${m}m` };
          }

          if (currentMinutes < lSMin) {
            // Open now, but will close for lunch
            const nextCloseDate = new Date(now);
            nextCloseDate.setHours(lSH, lSM, 0, 0);
            const diff = nextCloseDate.getTime() - now.getTime();
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            return { status: 'open', text: `Pausa em ${h > 0 ? h + 'h ' : ''}${m}m` };
          }
        }

        // Open now and no lunch break or already past lunch break
        const diff = closeDate.getTime() - now.getTime();
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        return { status: 'open', text: `Fecha em ${h}h ${m}m` };
      }

      // If not yet open today
      if (now < openDate) {
        const diff = openDate.getTime() - now.getTime();
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        return { status: 'opening', text: `Abre em ${h > 0 ? h + 'h ' : ''}${m}m` };
      }
    } catch (e) {}
  }

  // If closed today or already past closing time, find next opening
  for (let i = 1; i <= 7; i++) {
    const nextDate = new Date(now);
    nextDate.setDate(now.getDate() + i);
    const nextHours = getHoursForDate(nextDate);
    
    if (!nextHours.closed) {
      try {
        const [nextOpenH, nextOpenM] = nextHours.open.split(':').map(Number);
        const nextOpenDate = new Date(nextDate);
        nextOpenDate.setHours(nextOpenH, nextOpenM, 0, 0);
        
        const diff = nextOpenDate.getTime() - now.getTime();
        const days = Math.floor(diff / 86400000);
        const h = Math.floor((diff % 86400000) / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        
        let timeStr = '';
        if (days > 0) timeStr += `${days}d `;
        if (h > 0) timeStr += `${h}h `;
        timeStr += `${m}m`;
        
        return { status: 'closed', text: `Abre em ${timeStr}` };
      } catch (e) {}
    }
  }

  return { status: 'closed', text: 'Fechado' };
};

export const isRestaurantOpen = (res: Restaurant, now: Date) => {
  return getRestaurantStatus(res, now).isOpen;
};

const getTimeUntilClose = (res: Restaurant, now: Date) => {
  if (!res.weeklyHours) return null;
  
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = days[now.getDay()] as keyof WeeklyHours;
  const hours = res.weeklyHours[today];
  
  if (!hours || hours.closed || !hours.close) return null;
  
  try {
    const [closeH, closeM] = hours.close.split(':').map(Number);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const closeMinutes = closeH * 60 + (closeM || 0);
    
    if (currentMinutes < closeMinutes) {
      const diff = closeMinutes - currentMinutes;
      const h = Math.floor(diff / 60);
      const m = diff % 60;
      if (h > 0) return `${h}h ${m}m para fechar`;
      return `${m}m para fechar`;
    }
  } catch (e) {}
  return null;
};

const isProductAvailable = (item: FoodItem, now: Date, restaurant?: Restaurant | null) => {
  // Normalize date to Porto Velho time for all internal calculations
  const nowPV = getPortoVelhoTime(now);
  
  if (restaurant) {
    const status = getRestaurantStatus(restaurant, now);
    if (!status.isOpen) return false;

    // ABSOLUTE MANUAL PRIORITY: If restaurant is active (manual override), 
    // it ignores product weekly hours/availability schedules.
    if (restaurant.status === 'active') {
      if (item.available === false) return false;
      if (item.stock !== undefined && item.stock !== null && item.stock <= 0) return false;
      return true;
    }
  }
  
  // Normal logic for non-active or when status is inherited
  if (item.available === false) return false;
  if (item.stock !== undefined && item.stock !== null && item.stock <= 0) return false;
  
  const dayOfWeek = nowPV.getDay(); 
  const daysMap: { [key: number]: keyof ProductAvailability } = {
    0: 'sunday',
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday'
  };

  if (item.availability) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayKey = days[nowPV.getDay()] as keyof ProductAvailability;
    const todaySchedule = item.availability[todayKey];
    
    if (todaySchedule && todaySchedule.active) {
      const currentTimeStr = `${nowPV.getHours().toString().padStart(2, '0')}:${nowPV.getMinutes().toString().padStart(2, '0')}`;
      if (!isTimeInRange(currentTimeStr, todaySchedule.startTime, todaySchedule.endTime)) {
        return false;
      }
    } else if (todaySchedule && !todaySchedule.active) {
      return false;
    }
  }

  if (item.availableFrom || item.availableUntil) {
    const currentTimeStr = `${nowPV.getHours().toString().padStart(2, '0')}:${nowPV.getMinutes().toString().padStart(2, '0')}`;
    if (item.availableFrom && currentTimeStr < item.availableFrom) return false;
    if (item.availableUntil && currentTimeStr > item.availableUntil) return false;
  }
  
  return true;
};

const getProductUnavailabilityReason = (item: FoodItem, now: Date, restaurant?: Restaurant | null) => {
  if (restaurant && !isRestaurantOpen(restaurant, now)) {
    return 'Loja Fechada';
  }
  if (!item.available) return 'Indisponível';
  if (item.stock !== undefined && item.stock !== null && item.stock <= 0) return 'Sem Estoque';
  
  if (item.availableFrom || item.availableUntil) {
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    if (item.availableFrom) {
      const [h, m] = item.availableFrom.split(':').map(Number);
      if (currentMinutes < h * 60 + m) return `Disponível às ${item.availableFrom}`;
    }
    
    if (item.availableUntil) {
      const [h, m] = item.availableUntil.split(':').map(Number);
      if (currentMinutes > h * 60 + m) return `Encerrado às ${item.availableUntil}`;
    }
  }
  
  return null;
};

const HoursModal = ({ restaurant, onClose, currentTime }: { restaurant: Restaurant; onClose: () => void; currentTime: Date }) => {
  if (!restaurant.weeklyHours) return null;
  const days = [
    { key: 'monday', label: 'Segunda-feira' },
    { key: 'tuesday', label: 'Terça-feira' },
    { key: 'wednesday', label: 'Quarta-feira' },
    { key: 'thursday', label: 'Quinta-feira' },
    { key: 'friday', label: 'Sexta-feira' },
    { key: 'saturday', label: 'Sábado' },
    { key: 'sunday', label: 'Domingo' },
  ];

  const timeInfo = getTimeRemaining(restaurant, currentTime);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl"
      >
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-blue-gradient text-white">
          <div className="space-y-1">
            <h3 className="text-xl font-black uppercase tracking-tight italic">Horários de Funcionamento</h3>
            <div className="text-[10px] font-black uppercase tracking-widest opacity-70 flex items-center min-w-0">
              <span className="truncate">{restaurant.name}</span>
              <VerifiedBadge />
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>
        <div className="p-8 space-y-4">
          <div className={`p-4 rounded-2xl flex items-center justify-between ${timeInfo.status === 'open' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
            <div className="flex items-center space-x-2">
              <Clock size={16} className={timeInfo.status === 'open' ? 'animate-pulse' : ''} />
              <span className="text-xs font-black uppercase tracking-widest">Status Atual</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-black uppercase tracking-widest">{timeInfo.text}</span>
              {timeInfo.status === 'open' && (
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
              )}
            </div>
          </div>
          {days.map((day) => {
            const hours = restaurant.weeklyHours![day.key as keyof WeeklyHours];
            return (
              <div key={day.key} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <span className="text-sm font-bold text-slate-600">{day.label}</span>
                <div className="text-right">
                  {hours.closed ? (
                    <span className="text-xs font-black uppercase tracking-widest text-red-500">Fechado</span>
                  ) : (
                    <span className="text-sm font-mono font-bold text-slate-900">{hours.open} - {hours.close}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="p-8 bg-slate-50">
          <button 
            onClick={onClose}
            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg"
          >
            Entendi
          </button>
        </div>
      </motion.div>
    </div>
  );
};

interface CustomerViewProps {
  adminMode?: boolean;
  forcedCityId?: string;
  featureFlags?: {
    delivery: boolean;
    pickup: boolean;
    payments: boolean;
    chat: boolean;
  };
}

const MapController = ({ center }: { center: { lat: number; lng: number } | null }) => {
  const map = useMap();
  useEffect(() => {
    if (center && center.lat && center.lng) {
      map.setView([center.lat, center.lng], 18);
      setTimeout(() => {
        map.invalidateSize();
      }, 250);
    }
  }, [center, map]);
  return null;
};

const MapEvents = ({ onCenterChange, onZoomChange }: { onCenterChange: (center: { lat: number; lng: number }) => void, onZoomChange: (zoomValue: number) => void }) => {
  useMapEvents({
    dragend: (e) => {
      const center = e.target.getCenter();
      onCenterChange({ lat: center.lat, lng: center.lng });
    },
    zoomend: (e) => {
      onZoomChange(e.target.getZoom());
    }
  });
  return null;
};

const SatelliteMapEvents = ({ onCenterChange }: { onCenterChange: (center: { lat: number; lng: number }) => void }) => {
  useMapEvents({
    moveend: (e) => {
      const center = e.target.getCenter();
      onCenterChange({ lat: center.lat, lng: center.lng });
    }
  });
  return null;
};

const CustomerView: React.FC<CustomerViewProps> = ({ adminMode, forcedCityId, featureFlags }) => {
  const [searchParams] = useSearchParams();
  const { restaurantId: routeRestaurantId } = useParams<{ restaurantId: string }>();
  const navigate = useNavigate();
  const restaurantIdParam = routeRestaurantId || searchParams.get('restaurantId');
  const fromManager = searchParams.get('fromManager') === 'true';
  const isIndividualLink = !!routeRestaurantId;
  const isStoreView = isIndividualLink || fromManager;

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (adminMode) {
      // In admin mode, we might want to prefetch more data or set specific states
      console.log("CustomerView running in Admin Mode");
    }
  }, [adminMode]);

  const { 
    user, 
    profile, 
    globalSettings, 
    loading, 
    isGuest, 
    isSigningIn, 
    signOut, 
    updateProfileData, 
    commonData, 
    setRole,
    prefetchManagerData,
    prefetchAdminData,
    isAdmin: isMasterAdmin
  } = useAuth();
  const isAdmin = () => isMasterAdmin || profile?.role === 'admin';
  const [restaurants, setRestaurants] = useState<Restaurant[]>(commonData.restaurants);
  const [cities, setCities] = useState<City[]>(commonData.cities);

  useEffect(() => {
    if (forcedCityId && cities.length > 0) {
      const city = cities.find(c => c.id === forcedCityId);
      if (city) {
        setActiveCity(city);
      }
    }
  }, [forcedCityId, cities]);
  const [branches, setBranches] = useState<any[]>([]);
  const [activeCity, setActiveCity] = useState<City | null>(null);
  const [isManualCity, setIsManualCity] = useState<boolean>(() => {
    return localStorage.getItem('manual_city_selected') === 'true';
  });

  const redirectToExternalLocationCapture = () => {
    console.log("[CustomerView] Iniciando captura automática de localização...");
    
    if (!navigator.geolocation) {
      alert("Localização não capturada: seu navegador não suporta geolocalização.");
      return;
    }

    setIsWaitingNative(true);
    setLocationInfo('Capturando...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        console.log("[CustomerView] Localização capturada automaticamente:", latitude, longitude);
        setUserLocation({ latitude, longitude });
        setIsNativeLocationActive(true);
        sessionStorage.setItem('native_location_active', 'true');
        fetchAddress(latitude, longitude);
        setIsWaitingNative(false);
      },
      (error) => {
        console.error("[CustomerView] Erro na captura automática:", error);
        setIsWaitingNative(false);
        // Silently fail, we already have a default location
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(() => {
    const saved = localStorage.getItem('user_location');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.latitude && parsed.longitude) return parsed;
      } catch (e) {}
    }
    // Default to Porto Velho to avoid "blocking" state
    return { latitude: -8.7618, longitude: -63.9039 };
  });
  const [isNativeLocationActive, setIsNativeLocationActive] = useState<boolean>(
    sessionStorage.getItem('native_location_active') === 'true'
  );
  const [isWaitingNative, setIsWaitingNative] = useState<boolean>(false);
  const [locationInfo, setLocationInfo] = useState<string>(() => {
    return localStorage.getItem('user_location_info') || 'Porto Velho';
  });
  const [userCity, setUserCity] = useState<string>('');
  
  // Advanced Address Management
  interface SavedAddress {
    id: string;
    name: string;
    shortAddress?: string;
    neighborhood?: string;
    fullAddress: string;
    latitude: number;
    longitude: number;
    createdAt: any;
    isCurrent?: boolean;
  }
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<SavedAddress | null>(null);
  const [isManagerUnlocked, setIsManagerUnlocked] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('user_id')) {
      const uid = localStorage.getItem('user_id');
      return localStorage.getItem(`manager_unlocked_${uid}`) === 'true';
    }
    return false;
  });
  const [showManagerLockModal, setShowManagerLockModal] = useState(false);
  const [managerLockPass, setManagerLockPass] = useState('');
  const [managerPlaceholder, setManagerPlaceholder] = useState('');

  useEffect(() => {
    if (!showManagerLockModal) {
      setManagerPlaceholder('');
      return;
    }
    const fullText = "senha...";
    let i = 0;
    let deleting = false;
    let timer: any;

    const animate = () => {
      setManagerPlaceholder(fullText.substring(0, i));
      if (!deleting && i === fullText.length) {
        deleting = true;
        timer = setTimeout(animate, 1500);
      } else if (deleting && i === 0) {
        deleting = false;
        timer = setTimeout(animate, 500);
      } else {
        i = deleting ? i - 1 : i + 1;
        timer = setTimeout(animate, deleting ? 80 : 150);
      }
    };

    animate();
    return () => clearTimeout(timer);
  }, [showManagerLockModal]);

  const [profileFormData, setProfileFormData] = useState({
    displayName: '',
    email: '',
    cpf: '',
    password: ''
  });

  useEffect(() => {
    if (profile) {
      setProfileFormData({
        displayName: profile.displayName || '',
        email: profile.email || '',
        cpf: profile.cpf || profile.taxId || '',
        password: ''
      });
    }
  }, [profile]);

  const toggleMainAddress = async (addrId: string) => {
    if (!user) return;
    
    // 1. Optimistic UI update for list state
    setSavedAddresses(prev => prev.map(addr => ({
      ...addr,
      isCurrent: addr.id === addrId
    })));

    const selected = savedAddresses.find(a => a.id === addrId);
    if (selected) {
      // 2. Instant header update
      setUserLocation({ latitude: selected.latitude, longitude: selected.longitude });
      setLocationInfo(selected.shortAddress || selected.name);
      
      // 3. Find and set the active city based on coordinates (Fixed fields lat/lng)
      if (cities.length > 0) {
        let closestCity = null;
        let minDistance = Infinity;

        cities.forEach(city => {
          if (city.lat && city.lng && !isNaN(city.lat) && !isNaN(city.lng)) {
            const dist = Math.sqrt(
              Math.pow(city.lat - selected.latitude, 2) + 
              Math.pow(city.lng - selected.longitude, 2)
            );
            if (dist < minDistance) {
              minDistance = dist;
              closestCity = city;
            }
          }
        });

        if (closestCity && minDistance < 0.1) {
          setActiveCity(closestCity);
          setIsManualCity(true);
          localStorage.setItem('manual_city_selected', 'true');
          localStorage.setItem('active_city_v2_id', closestCity.id);
          if (user?.uid) {
            updateProfileData({ cityId: closestCity.id, city: closestCity.name })
              .catch(err => console.error("Error saving city to profile from main address toggle:", err));
          }
        }
      }
    }

    try {
      // 4. Persistence in Background
      const batch: any[] = [];
      savedAddresses.forEach(addr => {
        const addrRef = doc(db, `users/${user.uid}/addresses`, addr.id);
        if (addr.id === addrId) {
          batch.push(updateDoc(addrRef, { isCurrent: true }));
        } else if (addr.isCurrent) {
          batch.push(updateDoc(addrRef, { isCurrent: false }));
        }
      });
      await Promise.all(batch);
    } catch (e) {
      console.error("Error toggling main address:", e);
      // Fallback on error - re-fetch to sync
      fetchSavedAddresses();
    }
  };
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isSatelliteMapOpen, setIsSatelliteMapOpen] = useState(false);
  const [isCitySelectModalOpen, setIsCitySelectModalOpen] = useState(false);
  const [isTypingOnSatellite, setIsTypingOnSatellite] = useState(false);
  const [satelliteSearchQuery, setSatelliteSearchQuery] = useState('');
  const [satelliteSearchResults, setSatelliteSearchResults] = useState<any[]>([]);
  const [isSearchingSatelliteQuery, setIsSearchingSatelliteQuery] = useState(false);
  const [hasSelectedFromSatelliteSearch, setHasSelectedFromSatelliteSearch] = useState(false);
  const [satelliteMapCenter, setSatelliteMapCenter] = useState<{ lat: number; lng: number }>({ lat: -8.7618, lng: -63.9039 });
  const [satelliteMarkerPosition, setSatelliteMarkerPosition] = useState<{ lat: number; lng: number }>({ lat: -8.7618, lng: -63.9039 });
  const [satelliteAddress, setSatelliteAddress] = useState<string>('Buscando endereço...');
  const [isSearchingSatelliteAddress, setIsSearchingSatelliteAddress] = useState(false);
  const [locationModalCity, setLocationModalCity] = useState<City | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [zoom, setZoom] = useState(15);
  const [selectedAddressResult, setSelectedAddressResult] = useState<any>(null);
  const [isConfirmingLocation, setIsConfirmingLocation] = useState(false);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [addressSearchResults, setAddressSearchResults] = useState<any[]>([]);
  const [addressSearchQuery, setAddressSearchQuery] = useState('');
  const [banners, setBanners] = useState<Banner[]>(commonData.banners);
  const [categories, setCategories] = useState<Category[]>(commonData.categories);
  const [marketingPopups, setMarketingPopups] = useState<MarketingPopup[]>([]);
  const [allWallets, setAllWallets] = useState<Wallet[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [showPopup, setShowPopup] = useState<MarketingPopup | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdminSecretPromptOpen, setIsAdminSecretPromptOpen] = useState(false);
  const [adminSecretPassword, setAdminSecretPassword] = useState('');
  const [adminAuthError, setAdminAuthError] = useState(false);

  const handleAdminSecretAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminSecretPassword === '@Ehbc7890') {
      sessionStorage.setItem('admin_unlocked', 'true');
      setIsAdminSecretPromptOpen(false);
      setAdminSecretPassword('');
      navigate('/admin');
    } else {
      setAdminAuthError(true);
      setTimeout(() => setAdminAuthError(false), 2000);
    }
  };
  
  const checkAdminCommand = (value: string) => {
    if (value.toLowerCase() === 'entrar no painel do adm') {
      setIsAdminSecretPromptOpen(true);
      return true;
    }
    return false;
  };
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [restaurantMenu, setRestaurantMenu] = useState<FoodItem[]>([]);
  const [restaurantReviews, setRestaurantReviews] = useState<Review[]>([]);
  const [allReviews, setAllReviews] = useState<Review[]>([]);
  const [selectedProductForReview, setSelectedProductForReview] = useState<FoodItem | null>(null);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [selectedReviewForDetails, setSelectedReviewForDetails] = useState<Review | null>(null);
  const [reviewToDelete, setReviewToDelete] = useState<Review | null>(null);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewMedia, setNewReviewMedia] = useState<{ url: string, type: 'image' | 'video' } | null>(null);
  const [isUploadingReviewMedia, setIsUploadingReviewMedia] = useState(false);
  const [restaurantSearchTerm, setRestaurantSearchTerm] = useState('');
  const [restaurantActiveCategory, setRestaurantActiveCategory] = useState('Todos');
  const [isRestaurantSearchOpen, setIsRestaurantSearchOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartViewTab, setCartViewTab] = useState<'cart' | 'favorites'>('cart');
  const [selectedFavoriteProductIds, setSelectedFavoriteProductIds] = useState<string[]>([]);
  const [isOrdering, setIsOrdering] = useState(false);
  const [isSavingCheckoutInfo, setIsSavingCheckoutInfo] = useState(false);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [optimisticOrders, setOptimisticOrders] = useState<any[]>([]);
  const [rides, setRides] = useState<Ride[]>([]);
  const [view, setView] = useState<'home' | 'restaurant' | 'orders' | 'search-results'>('home');
  const [allProducts, setAllProducts] = useState<FoodItem[]>(commonData.foodItems);
  const [lastProductDoc, setLastProductDoc] = useState<any>(null);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);
  const [isPaginationLoading, setIsPaginationLoading] = useState(false);

  // Reset pagination state and fetch available products to be filtered client-side by cityRestaurants
  useEffect(() => {
    if (!activeCity) {
      if (commonData.foodItems && commonData.foodItems.length > 0) {
        setAllProducts(commonData.foodItems);
      }
      return;
    }

    let isSubscribed = true;
    console.log('[CustomerView] Active city changed to:', activeCity.name, 'Fetching available products...');
    
    const fetchCityProducts = async () => {
      setIsPaginationLoading(true);
      try {
        const foodItemsRef = collection(db, 'food_items');
        const q = query(
          foodItemsRef,
          where('available', '==', true),
          limit(300)
        );
        const snap = await getDocs(q);
        if (isSubscribed) {
          const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as FoodItem));
          console.log(`[CustomerView] Loaded ${items.length} total active products across database to be filtered strictly by city restaurants...`);
          setAllProducts(items);
          
          if (snap.docs.length > 0) {
            setLastProductDoc(snap.docs[snap.docs.length - 1]);
            setHasMoreProducts(snap.docs.length >= 300);
          } else {
            setLastProductDoc(null);
            setHasMoreProducts(false);
          }
        }
      } catch (err) {
        console.error('[CustomerView] Error fetching city products:', err);
      } finally {
        if (isSubscribed) {
          setIsPaginationLoading(false);
        }
      }
    };

    fetchCityProducts();

    return () => {
      isSubscribed = false;
    };
  }, [activeCity, commonData.foodItems]);

  const fetchNextProductsBatch = async () => {
    if (isPaginationLoading) return;
    setIsPaginationLoading(true);
    try {
      const foodItemsRef = collection(db, 'food_items');
      const constraints: any[] = [
        where('available', '==', true),
        limit(50)
      ];
      
      if (lastProductDoc) {
        constraints.push(startAfter(lastProductDoc));
      }

      const q = query(foodItemsRef, ...constraints);
      
      const snap = await getDocs(q);
      if (snap.empty) {
        setHasMoreProducts(false);
      } else {
        const newItems = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as FoodItem));
        setAllProducts(prev => {
          const merged = [...prev];
          newItems.forEach(item => {
            if (!merged.some(p => p.id === item.id)) {
              merged.push(item);
            }
          });
          return merged;
        });
        setLastProductDoc(snap.docs[snap.docs.length - 1]);
        if (snap.docs.length < 50) {
          setHasMoreProducts(false);
        }
      }
    } catch (err) {
      console.error('[CustomerView] Error fetching next products pagination batch:', err);
    } finally {
      setIsPaginationLoading(false);
    }
  };
  const [sortBy, setSortBy] = useState<'default' | 'cheapest' | 'rated' | 'closest'>('default');
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [distanceFilter, setDistanceFilter] = useState<number | null>(null);
  const [activeModality, setActiveModality] = useState<string>('Todos');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [orderStep, setOrderStep] = useState<'cart' | 'payment' | 'confirmation' | 'idle'>('idle');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const isInitialOrdersLoad = useRef(true);
  const prevOrderStatuses = useRef<Record<string, string>>({});
  const [showHoursModal, setShowHoursModal] = useState<Restaurant | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [orderToReview, setOrderToReview] = useState<any>(null);
  const [productRatings, setProductRatings] = useState<Record<string, number>>({});
  const [productComments, setProductComments] = useState<Record<string, string>>({});
  const [showBannerPopup, setShowBannerPopup] = useState<Banner | null>(null);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarType, setSidebarType] = useState<'restaurants' | 'categories'>('restaurants');
  const [sidebarSearchTerm, setSidebarSearchTerm] = useState('');
  const [typingPlaceholder, setTypingPlaceholder] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const fullPlaceholder = "O que você quer comer hoje?";
  const typingSpeed = 150;
  const deletingSpeed = 100;
  const pauseTime = 2000;

  useEffect(() => {
    const handleTyping = () => {
      if (!isDeleting) {
        if (typingPlaceholder.length < fullPlaceholder.length) {
          setTypingPlaceholder(fullPlaceholder.substring(0, typingPlaceholder.length + 1));
        } else {
          setTimeout(() => setIsDeleting(true), pauseTime);
        }
      } else {
        if (typingPlaceholder.length > 0) {
          setTypingPlaceholder(fullPlaceholder.substring(0, typingPlaceholder.length - 1));
        } else {
          setIsDeleting(false);
        }
      }
    };

    const timer = setTimeout(handleTyping, isDeleting ? deletingSpeed : typingSpeed);
    return () => clearTimeout(timer);
  }, [typingPlaceholder, isDeleting]);

  const [showAllFeaturedModal, setShowAllFeaturedModal] = useState(false);
  const [categorySchedules, setCategorySchedules] = useState<CategorySchedule[]>([]);
  const hasManuallySelectedCategory = useRef(false);
  const [settings, setSettings] = useState<GlobalSettings>({ carouselInterval: 5 });
  const [userLikes, setUserLikes] = useState<Like[]>([]);
  const [trackingRide, setTrackingRide] = useState<Ride | null>(null);
  const [adminConfirmModal, setAdminConfirmModal] = useState<{
    type: 'confirm' | 'prompt';
    title: string;
    message: string;
    defaultValue?: string;
    onConfirm: (value?: string) => void;
  } | null>(null);

  useEffect(() => {
    if (!user) {
      setUserLikes([]);
      return;
    }

    const q = query(collection(db, 'likes'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const likes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Like));
      setUserLikes(likes);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'likes');
    });

    return () => unsubscribe();
  }, [user]);

  const toggleLike = async (itemId: string, itemType: 'restaurant' | 'product' | 'review') => {
    if (!user) {
      // If not logged in, we could potentially show the auth modal
      // For now, let's just return
      return;
    }

    const likeId = `${user.uid}_${itemId}`;
    const existingLike = userLikes.find(l => l.itemId === itemId && l.itemType === itemType);
    
    const collectionName = itemType === 'restaurant' ? 'restaurants' : 
                          itemType === 'product' ? 'food_items' : 'reviews';

    try {
      if (existingLike) {
        // Unlike
        await deleteDoc(doc(db, 'likes', likeId));
        await updateDoc(doc(db, collectionName, itemId), {
          likesCount: increment(-1)
        });
      } else {
        // Like
        await setDoc(doc(db, 'likes', likeId), {
          userId: user.uid,
          itemId: itemId,
          itemType: itemType,
          createdAt: serverTimestamp()
        });
        await updateDoc(doc(db, collectionName, itemId), {
          likesCount: increment(1)
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, collectionName);
    }
  };

  const LikeButton = ({ itemId, itemType, count, className = "", onAdminClick }: { itemId: string, itemType: 'restaurant' | 'product' | 'review', count?: number, className?: string, onAdminClick?: (e: React.MouseEvent) => void }) => {
    const isLiked = userLikes.some(l => l.itemId === itemId && l.itemType === itemType);
    
    return (
      <button 
        onClick={(e) => {
          e.stopPropagation();
          if (onAdminClick && adminMode) {
            onAdminClick(e);
          } else {
            toggleLike(itemId, itemType);
          }
        }}
        className={`flex items-center gap-1 group transition-all ${className}`}
      >
        <motion.div
          whileTap={{ scale: 0.8 }}
          animate={isLiked ? { scale: [1, 1.2, 1] } : {}}
          transition={{ duration: 0.3 }}
        >
          <Heart 
            size={18} 
            className={`transition-all ${isLiked ? 'fill-red-500 text-red-500' : 'text-slate-400 group-hover:text-slate-500'}`} 
          />
        </motion.div>
        {count !== undefined && count > 0 && (
          <span className={`text-[10px] font-bold ${isLiked ? 'text-red-500' : 'text-slate-400'}`}>
            {count}
          </span>
        )}
      </button>
    );
  };

  // DND Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent, type: 'restaurant' | 'product' | 'category') => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      if (type === 'restaurant') {
        const oldIndex = cityRestaurants.findIndex((r) => r.id === active.id as string);
        const newIndex = cityRestaurants.findIndex((r) => r.id === over.id as string);
        
        const newOrder = arrayMove(cityRestaurants, oldIndex, newIndex) as Restaurant[];
        setRestaurants(prev => {
          const otherRestaurants = prev.filter(r => !cityRestaurants.find(cr => cr.id === r.id));
          return [...otherRestaurants, ...newOrder];
        });

        // Persist to Firebase
        try {
          for (let i = 0; i < newOrder.length; i++) {
            await updateDoc(doc(db, 'restaurants', newOrder[i].id), {
              order: i,
              updatedAt: serverTimestamp()
            });
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, 'restaurants_order');
        }
      } else if (type === 'product') {
        const oldIndex = restaurantMenu.findIndex((p) => p.id === active.id as string);
        const newIndex = restaurantMenu.findIndex((p) => p.id === over.id as string);
        
        const newOrder = arrayMove(restaurantMenu, oldIndex, newIndex) as any[];
        setRestaurantMenu(newOrder);

        // Persist to Firebase
        try {
          for (let i = 0; i < newOrder.length; i++) {
            await updateDoc(doc(db, 'food_items', newOrder[i].id), {
              order: i,
              updatedAt: serverTimestamp()
            });
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, 'food_items_order');
        }
      } else if (type === 'category') {
        const cats = isExclusiveView ? restaurantCategories : filteredCategories;
        const oldIndex = cats.findIndex((c) => c.id === active.id as string);
        const newIndex = cats.findIndex((c) => c.id === over.id as string);
        
        const newOrder = arrayMove(cats, oldIndex, newIndex) as any[];
        
        // Update local state
        setCategories(prev => {
          const otherCats = prev.filter(c => !cats.find(cc => cc.id === c.id));
          return [...otherCats, ...newOrder];
        });
        
        // Persist to Firebase
        try {
          for (let i = 0; i < newOrder.length; i++) {
            await updateDoc(doc(db, 'categories', newOrder[i].id), {
              order: i,
              updatedAt: serverTimestamp()
            });
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, 'categories_order');
        }
      }
    }
  };

  const SortableItem = ({ id, type, children, disabled }: { id: string, type: 'restaurant' | 'product' | 'category', children: React.ReactNode, disabled?: boolean, key?: any }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging
    } = useSortable({ 
      id, 
      disabled,
      data: { type }
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      zIndex: isDragging ? 100 : 'auto',
      opacity: isDragging ? 0.8 : 1,
    };

    return (
      <div 
        ref={setNodeRef} 
        style={style} 
        className="relative group"
        {...(adminMode && !disabled ? { ...attributes, ...listeners } : {})}
      >
        {children}
        {adminMode && !disabled && (
          <div 
            className="absolute top-2 left-2 p-2 bg-blue-600 text-white rounded-full transition-opacity cursor-grab active:cursor-grabbing z-20 shadow-lg"
          >
            <Zap size={14} />
          </div>
        )}
      </div>
    );
  };

  const handleAdminAction = async (action: string, data: any) => {
    if (!adminMode) return;

    try {
      switch (action) {
        case 'toggle_restaurant_status':
          await updateDoc(doc(db, 'restaurants', data.id), {
            status: data.status === 'active' ? 'paused' : 'active',
            updatedAt: serverTimestamp()
          });
          break;
        case 'update_product_price':
          await updateDoc(doc(db, 'food_items', data.id), {
            price: parseFloat(data.price),
            updatedAt: serverTimestamp()
          });
          break;
        case 'delete_review':
          await deleteDoc(doc(db, 'reviews', data.id));
          break;
        case 'update_restaurant_ranking':
          await updateDoc(doc(db, 'restaurants', data.id), {
            ranking: data.ranking,
            updatedAt: serverTimestamp()
          });
          break;
        case 'delete_restaurant':
          setAdminConfirmModal({
            type: 'confirm',
            title: '🚨 EXCLUIR EMPRESA',
            message: `Tem certeza que deseja excluir permanentemente ${data.name}? Isso também excluirá TODOS os produtos dela.`,
            onConfirm: async () => {
              try {
                // Delete products first
                const productsSnap = await getDocs(query(collection(db, 'food_items'), where('restaurantId', '==', data.id)));
                const delPromises = productsSnap.docs.map(d => deleteDoc(d.ref));
                await Promise.all(delPromises);
                
                // Delete restaurant
                await deleteDoc(doc(db, 'restaurants', data.id));
                
                if (selectedRestaurant?.id === data.id) {
                  setView('home');
                  setSelectedRestaurant(null);
                }
              } catch (error) {
                console.error('Error deleting restaurant and products:', error);
                alert('Erro ao excluir empresa.');
              }
              setAdminConfirmModal(null);
            }
          });
          break;
        case 'delete_product':
          setAdminConfirmModal({
            type: 'confirm',
            title: '🚨 EXCLUIR PRODUTO',
            message: `Tem certeza que deseja excluir permanentemente ${data.name}?`,
            onConfirm: async () => {
              await deleteDoc(doc(db, 'food_items', data.id));
              setAdminConfirmModal(null);
            }
          });
          break;
        case 'update_restaurant_likes':
          setAdminConfirmModal({
            type: 'prompt',
            title: '👍 EDITAR LIKES',
            message: 'Digite o novo número de likes:',
            defaultValue: (data.likesCount || 0).toString(),
            onConfirm: async (value) => {
              const newLikes = parseInt(value || '');
              if (!isNaN(newLikes)) {
                await updateDoc(doc(db, 'restaurants', data.id), {
                  likesCount: newLikes,
                  updatedAt: serverTimestamp()
                });
              }
              setAdminConfirmModal(null);
            }
          });
          break;
        case 'update_restaurant_rating':
          setAdminConfirmModal({
            type: 'prompt',
            title: '⭐ EDITAR AVALIAÇÃO',
            message: 'Digite a nova avaliação (0-5):',
            defaultValue: (data.rating || 0).toString(),
            onConfirm: async (value) => {
              const newRating = parseFloat(value || '');
              if (!isNaN(newRating) && newRating >= 0 && newRating <= 5) {
                await updateDoc(doc(db, 'restaurants', data.id), {
                  rating: newRating,
                  updatedAt: serverTimestamp()
                });
              }
              setAdminConfirmModal(null);
            }
          });
          break;
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `admin_action_${action}`);
    }
  };

  const uniqueCities = useMemo(() => {
    const seenNames = new Set();
    const seenIds = new Set();
    return cities.filter(city => {
      if (!city.id || !city.name) return false;
      const name = city.name.toLowerCase().trim();
      const isDuplicate = seenNames.has(name) || seenIds.has(city.id);
      if (!isDuplicate) {
        seenNames.add(name);
        seenIds.add(city.id);
      }
      return !isDuplicate;
    });
  }, [cities]);

  const cityRestaurants = useMemo(() => {
    if (!activeCity) return restaurants;
    
    const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const activeCityName = normalize(activeCity.name);

    console.log('Filtering restaurants for city:', activeCity.name);

    return restaurants.filter(r => {
      // Regra: No modo administrador, mostramos todos
      if (adminMode) return true;

      // Regra de Ouro: Se a carteira do restaurante está bloqueada por falta de saldo,
      // ele não deve aparecer para os clientes DE FORMA ALGUMA.
      if (r.isWalletBlocked === true) {
        return false;
      }

      // Se o restaurante possui latitude e longitude válidas cadastradas, identificamos geograficamente a qual cidade ele pertence
      const rLat = parseFloat(r.latitude as any);
      const rLng = parseFloat(r.longitude as any);
      if (!isNaN(rLat) && !isNaN(rLng) && rLat !== 0 && rLng !== 0) {
        let closestCityId: string | null = null;
        let minDistance = Infinity;
        for (const city of cities) {
          const cLat = parseFloat((city.latitude != null ? city.latitude : city.lat) as any);
          const cLng = parseFloat((city.longitude != null ? city.longitude : city.lng) as any);
          if (!isNaN(cLat) && !isNaN(cLng)) {
            const distance = Math.sqrt(Math.pow(cLat - rLat, 2) + Math.pow(cLng - rLng, 2));
            if (distance < minDistance) {
              minDistance = distance;
              closestCityId = city.id;
            }
          }
        }
        // Confiança de distância: Se a distância em graus é menor ou igual a 1.5 (~165km),
        // temos certeza geográfica que pertence a essa cidade.
        if (closestCityId && minDistance <= 1.5) {
          return closestCityId === activeCity.id;
        }
      }

      // Fallback para mapear se pelo menos o ID ou o nome textual bater com a cidade selecionada
      if (r.cityId && r.cityId === activeCity.id) return true;
      if (r.city && normalize(r.city) === activeCityName) return true;

      const hasNoCity = !r.city || r.city === "NÃO DEFINIDO" || r.city === "UNDEFINED";
      const hasNoCityId = !r.cityId || r.cityId === "NÃO DEFINIDO" || r.cityId === "UNDEFINED";
      
      if (hasNoCity && hasNoCityId) {
        if (cities.length === 1) {
          console.log(`Restaurant ${r.name} has no city, but only one city exists. Showing it.`);
          return true;
        }
      }

      return false;
    });
  }, [restaurants, activeCity, cities, adminMode]);

  const cityProducts = useMemo(() => {
    if (!activeCity) return allProducts;
    const restaurantIds = new Set(cityRestaurants.map(r => r.id));
    
    console.log('Filtering products. Active city:', activeCity.name, 'Restaurants in city:', cityRestaurants.length);

    return allProducts.filter(p => {
      // O produto deve pertencer estritamente a um restaurante ativo desta cidade
      const belongs = restaurantIds.has(p.restaurantId);
      if (!belongs && allProducts.length < 50) {
        console.log(`Product ${p.name} filtered out. RestId: ${p.restaurantId} not in active city restaurants.`);
      }
      return belongs;
    });
  }, [allProducts, cityRestaurants, activeCity]);

  const cityBanners = useMemo(() => {
    if (!activeCity) return banners.filter(b => b.active !== false);
    const restaurantIds = new Set(cityRestaurants.map(r => r.id));
    return banners.filter(banner => {
      // If banner is deactivated, do not show it
      if (banner.active === false) return false;

      // If banner has specific cities, check if active city is included (handle case-insensitive and ID fallback)
      if (banner.cities && banner.cities.length > 0) {
        const hasMatchedCity = banner.cities.some((c: string) => 
          c && activeCity && (
            c.toLowerCase().trim() === activeCity.name.toLowerCase().trim() ||
            c.toLowerCase().trim() === activeCity.id?.toLowerCase().trim()
          )
        );
        if (!hasMatchedCity) return false;
      }

      if (banner.linkType === 'restaurant' && banner.linkId) {
        return restaurantIds.has(banner.linkId);
      }
      if (banner.linkType === 'product' && banner.linkId) {
        const product = allProducts.find(p => p.id === banner.linkId);
        return product && restaurantIds.has(product.restaurantId);
      }
      // External links or banners without specific cities are global (if they pass other filters)
      return true;
    });
  }, [banners, cityRestaurants, allProducts, activeCity]);

  const flashSaleItems = useMemo(() => {
    return cityProducts.filter(p => p.isFlashSale);
  }, [cityProducts]);

  const featuredProductsBySchedule = useMemo(() => {
    if (!activeCity) return [];
    
    const now = currentTime;
    const currentTotalSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

    const activeSchedulesList = categorySchedules.filter(s => {
      if (!s.active) return false;
      
      const parseTime = (t: string) => {
        const [h, m, s] = t.split(':').map(Number);
        return h * 3600 + (m || 0) * 60 + (s || 0);
      };

      const start = parseTime(s.startTime);
      const end = parseTime(s.endTime);
      
      if (start <= end) {
        return currentTotalSeconds >= start && currentTotalSeconds <= end;
      } else {
        return currentTotalSeconds >= start || currentTotalSeconds <= end;
      }
    });

    return activeSchedulesList.map(schedule => {
      const categoryNames = (schedule.categoryIds || [])
        .map(id => categories.find(c => c.id === id)?.name)
        .filter((name): name is string => !!name);

      if (categoryNames.length === 0) return null;

      const productsInCategories = cityProducts.filter(p => categoryNames.includes(p.category || ''));
      
      if (productsInCategories.length === 0) return null;

      let sortedProducts = [...productsInCategories];
      sortedProducts.sort((a, b) => {
        const resA = restaurants.find(r => r.id === a.restaurantId);
        const resB = restaurants.find(r => r.id === b.restaurantId);
        return (resB?.rating || 0) - (resA?.rating || 0);
      });

      return {
        ...schedule,
        products: sortedProducts
      };
    }).filter((s): s is any => s !== null);
  }, [categorySchedules, cityProducts, restaurants, activeCity, categories, currentTime]);

  const cartSuggestions = useMemo(() => {
    if (cart.length === 0) return [];
    
    const restaurantIdsInCart = Array.from(new Set(cart.map(item => item.restaurantId)));
    const categoriesInCart = Array.from(new Set(cart.map(item => (item.category || '') as string)));
    const cartItemIds = new Set(cart.map(item => item.id));
    
    const sameRestaurantProducts = allProducts.filter(p => 
      restaurantIdsInCart.includes(p.restaurantId) && 
      !cartItemIds.has(p.id) &&
      p.available
    );

    const isDrink = (cat: string) => {
      const lower = cat.toLowerCase();
      return lower.includes('bebida') || lower.includes('suco') || lower.includes('refrigerante') || 
             lower.includes('cerveja') || lower.includes('vinho') || lower.includes('drink') || 
             lower.includes('água') || lower.includes('agua');
    };

    const hasFoodInCart = categoriesInCart.some((cat: string) => !isDrink(cat));
    const hasDrinksInCart = categoriesInCart.some((cat: string) => isDrink(cat));

    // Prioritize products from categories NOT in the cart
    const suggestions = [...sameRestaurantProducts].sort((a, b) => {
      const aCat = a.category || '';
      const bCat = b.category || '';
      
      const aIsDrink = isDrink(aCat);
      const bIsDrink = isDrink(bCat);

      // If we have food but no drinks, prioritize drinks
      if (hasFoodInCart && !hasDrinksInCart) {
        if (aIsDrink && !bIsDrink) return -1;
        if (!aIsDrink && bIsDrink) return 1;
      }
      
      // If we have drinks but no food, prioritize food
      if (hasDrinksInCart && !hasFoodInCart) {
        if (!aIsDrink && bIsDrink) return -1;
        if (aIsDrink && !bIsDrink) return 1;
      }

      // Otherwise, prioritize categories not in cart
      const aInCartCat = categoriesInCart.includes(aCat);
      const bInCartCat = categoriesInCart.includes(bCat);
      
      if (!aInCartCat && bInCartCat) return -1;
      if (aInCartCat && !bInCartCat) return 1;
      
      return 0;
    });

    return suggestions.slice(0, 15);
  }, [cart, allProducts]);

  const [orderFilter, setOrderFilter] = useState<'all' | 'recent'>('all');
  const [highlightedProductId, setHighlightedProductId] = useState<string | null>(null);

  const handleReorder = (orderItems: any[]) => {
    orderItems.forEach(item => {
      let product = allProducts.find(p => p.id === item.id);
      if (!product) {
        // Fallback to order data if product not found in current menu
        product = {
          id: item.id,
          name: item.name,
          price: item.price,
          imageUrl: item.imageUrl || '',
          restaurantId: item.restaurantId,
          restaurantName: item.restaurantName,
          available: true,
          description: '',
          category: ''
        } as FoodItem;
      }
      addToCart(product, item.selectedAddOns || []);
    });
    setIsCartOpen(true);
  };

  const navigateToProduct = (productId: string, restaurantId: string) => {
    const restaurant = restaurants.find(r => r.id === restaurantId);
    if (restaurant) {
      setSelectedRestaurant(restaurant);
      setView('restaurant');
      setHighlightedProductId(productId);
    }
  };

  const navigateToRestaurant = (restaurantId: string) => {
    const restaurant = restaurants.find(r => r.id === restaurantId);
    if (restaurant) {
      setSelectedRestaurant(restaurant);
      setView('restaurant');
    }
  };

  const getProductImage = (productId: string, savedImageUrl?: string) => {
    const product = allProducts.find(p => p.id === productId);
    return savedImageUrl || product?.imageUrl || 'https://picsum.photos/seed/product/400/400';
  };

  const getRestaurantLogo = (restaurantId: string, savedLogoUrl?: string) => {
    const restaurant = restaurants.find(r => r.id === restaurantId);
    return restaurant?.logoUrl || savedLogoUrl || null;
  };

  useEffect(() => {
    if (highlightedProductId && view === 'restaurant') {
      const element = document.getElementById(`product-${highlightedProductId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => setHighlightedProductId(null), 2000);
      }
    }
  }, [highlightedProductId, view]);

  // Track page view
  useEffect(() => {
    const trackView = async () => {
      const path = 'page_views';
      try {
        await addDoc(collection(db, path), {
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          path: window.location.pathname
        });
      } catch (error) {
        console.error('Error tracking page view:', error);
        handleFirestoreError(error, OperationType.CREATE, path);
      }
    };
    trackView();
  }, []);


  // Bridge function defined once at component level
  const fetchAddress = useCallback(async (lat: number, lon: number) => {
    try {
      const response = await fetch(`/api/geocode?lat=${lat}&lon=${lon}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      
      if (data && data.address) {
        const city = data.address.city || data.address.town || data.address.village || 'Cidade Desconhecida';
        const road = data.address.road || '';
        const suburb = data.address.suburb || data.address.neighbourhood || data.address.district || '';
        const houseNumber = data.address.house_number || '';
        
        const shortRoad = road.replace('Rua', 'R.').replace('Avenida', 'Av.');
        const info = `${suburb ? `${suburb}, ` : ''}${shortRoad}${houseNumber ? `, ${houseNumber}` : ''}`;
        setLocationInfo(info);
        setUserCity(city);
      } else {
        setLocationInfo('Endereço não encontrado');
      }
    } catch (error) {
      console.error("Erro ao buscar endereço:", error);
      setLocationInfo('Erro ao obter endereço');
    }
  }, []);

  const fetchSatelliteAddress = useCallback(async (lat: number, lon: number) => {
    setIsSearchingSatelliteAddress(true);
    try {
      const response = await fetch(`/api/geocode?lat=${lat}&lon=${lon}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      
      if (data && data.address) {
        const city = data.address.city || data.address.town || data.address.village || 'Porto Velho';
        const road = data.address.road || data.address.pedestrian || '';
        const suburb = data.address.suburb || data.address.neighbourhood || data.address.district || '';
        const houseNumber = data.address.house_number || '';
        
        const shortRoad = road.replace('Rua', 'R.').replace('Avenida', 'Av.');
        const info = `${suburb ? `${suburb}, ` : ''}${shortRoad}${houseNumber ? `, ${houseNumber}` : ''}`;
        setSatelliteAddress(info || data.display_name || 'Endereço identificado');
      } else {
        setSatelliteAddress('Endereço não encontrado');
      }
    } catch (error) {
      console.error("Erro satellite geocode:", error);
      setSatelliteAddress('Erro ao obter endereço');
    } finally {
      setIsSearchingSatelliteAddress(false);
    }
  }, []);

  const handleSatelliteAddressSearch = async (queryStr: string) => {
    if (!queryStr || queryStr.trim().length < 3) {
      setSatelliteSearchResults([]);
      return;
    }
    
    setIsSearchingSatelliteQuery(true);
    try {
      const cityName = locationModalCity?.name?.trim() || 'Porto Velho';
      const fullQuery = `${queryStr}, ${cityName}, Brasil`;
      const response = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(fullQuery)}&limit=10&lang=pt`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.features && data.features.length > 0) {
          const results = data.features
            .map((f: any) => normalizeAddressResult(f, 'photon'))
            .filter(Boolean);
          setSatelliteSearchResults(results);
          return;
        }
      }
      
      const nomResponse = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullQuery)}&limit=10&addressdetails=1&countrycodes=br`);
      if (nomResponse.ok) {
        const nomData = await nomResponse.json();
        const results = nomData
          .map((n: any) => normalizeAddressResult(n, 'nominatim'))
          .filter(Boolean);
        setSatelliteSearchResults(results);
      }
    } catch (error) {
      console.error("Error searching satellite address:", error);
    } finally {
      setIsSearchingSatelliteQuery(false);
    }
  };

  const confirmSatelliteLocation = useCallback(() => {
    if (!satelliteMarkerPosition) return;
    
    const newLoc = { latitude: satelliteMarkerPosition.lat, longitude: satelliteMarkerPosition.lng };
    setUserLocation(newLoc);
    setLocationInfo(satelliteAddress);
    
    // Save to localStorage so it is remembered
    localStorage.setItem('user_location', JSON.stringify(newLoc));
    localStorage.setItem('user_location_info', satelliteAddress);
    
    // Find closest city
    if (cities.length > 0) {
      let closestCity = null;
      let minDistance = Infinity;

      cities.forEach(city => {
        if (city.lat && city.lng && !isNaN(city.lat) && !isNaN(city.lng)) {
          const dist = Math.sqrt(
            Math.pow(city.lat - satelliteMarkerPosition.lat, 2) + 
            Math.pow(city.lng - satelliteMarkerPosition.lng, 2)
          );
          if (dist < minDistance) {
            minDistance = dist;
            closestCity = city;
          }
        }
      });

      if (closestCity) {
        setActiveCity(closestCity);
        console.log("[CustomerView] Satellite update active city:", (closestCity as any).name);
      }
    }
    
    setIsSatelliteMapOpen(false);
  }, [satelliteMarkerPosition, satelliteAddress, cities]);

  const getPosition = useCallback(async (bypassNativeCheck: boolean = false) => {
    // Se já temos localização nativa, não forçamos requisição do navegador (evita conflito WebView)
    if (!bypassNativeCheck && (isNativeLocationActive || sessionStorage.getItem('native_location_active') === 'true') && userLocation) {
      console.log("[CustomerView] Using active native bridge location");
      fetchAddress(userLocation.latitude, userLocation.longitude);
      return;
    }

    if ("geolocation" in navigator) {
      // Check permission status first to avoid blocking popups automatically
      if (!bypassNativeCheck && (navigator as any).permissions) {
        try {
          const status = await (navigator as any).permissions.query({ name: 'geolocation' });
          if (status.state === 'denied') {
             console.log("[CustomerView] Geolocation denied by user, skipping request");
             return;
          }
          if (status.state === 'prompt' && !bypassNativeCheck) {
             console.log("[CustomerView] Geolocation requires prompt, skipping auto-request to avoid blocking");
             return;
          }
        } catch (e) {
          console.warn("[CustomerView] Error querying permission status:", e);
        }
      }

      console.log("[CustomerView] Requesting geolocation...");
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log(`[CustomerView] Geolocation success: ${latitude}, ${longitude}`);
          setUserLocation({ latitude, longitude });
          fetchAddress(latitude, longitude);
        },
        (error) => {
          console.error("[CustomerView] Erro de geolocalização:", error);
          if (error.code === error.TIMEOUT) {
            console.log("[CustomerView] Geolocation timeout, retrying with low accuracy...");
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                const { latitude, longitude } = pos.coords;
                setUserLocation({ latitude, longitude });
                fetchAddress(latitude, longitude);
              },
              (err2) => {
                console.error("[CustomerView] Geolocation retry failed:", err2);
                // Fail silently
              },
              { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
            );
          } else {
            // Permission denied or other error
            console.warn("[CustomerView] Manual location will be used as fallback");
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  }, [userLocation, fetchAddress, isNativeLocationActive]);

  // Native Location Bridge (para APK Android)
  useEffect(() => {
    (window as any).updateNativeLocation = (lat: number, lng: number, accuracy?: number) => {
      console.log(`[Bridge CP] Nativo update: ${lat}, ${lng} (acc: ${accuracy})`);
      const newLoc = { latitude: lat, longitude: lng };
      setUserLocation(newLoc);
      setIsNativeLocationActive(true);
      setIsWaitingNative(false);
      sessionStorage.setItem('native_location_active', 'true');
      // Trigger address update immediately when native bridge calls
      fetchAddress(lat, lng);
    };
    // If we're in a WebView environment, tell the UI we're expecting native updates
    if (!userLocation && (window.navigator.userAgent.toLowerCase().includes('messenger') || 
        window.navigator.userAgent.toLowerCase().includes('android'))) {
      setIsWaitingNative(true);
    }
    return () => {
      delete (window as any).updateNativeLocation;
    };
  }, [fetchAddress, userLocation]);

  // Listener para atualizações de localização externa via Firestore (AuthContext profile)
  useEffect(() => {
    if (profile?.lastLocation) {
      const { latitude, longitude, capturedAt } = profile.lastLocation;
      const now = new Date();
      const captureDate = new Date(capturedAt);
      
      // Se a captura foi recente (últimos 5 minutos), aplicamos
      if (now.getTime() - captureDate.getTime() < 300000) {
        console.log("[CustomerView] New location detected via Profile Sync:", latitude, longitude);
        setUserLocation({ latitude, longitude });
        fetchAddress(latitude, longitude);
      }
    }
  }, [profile?.lastLocation, fetchAddress]);

  // Initial position trigger
  useEffect(() => {
    // 0. Handle Deep Link / Redirect params
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    if (lat && lng) {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      if (!isNaN(latitude) && !isNaN(longitude)) {
        console.log("[CustomerView] Location received from URL params:", latitude, longitude);
        setUserLocation({ latitude, longitude });
        fetchAddress(latitude, longitude);
        // Quando recebe via URL (externo), consideramos como escolha do usuário
        setIsManualCity(false); 
        return;
      }
    }

    // 1. Initial Load from Cache
    const savedLoc = localStorage.getItem('user_location');
    const savedInfo = localStorage.getItem('user_location_info');
    if (savedLoc && savedInfo) {
      try {
        const parsed = JSON.parse(savedLoc);
        if (parsed.latitude && parsed.longitude) {
          setUserLocation(parsed);
          setLocationInfo(savedInfo);
          console.log("[CustomerView] Loaded location from Cache:", savedInfo);
          return; // Stop here if we have cache
        }
      } catch(e) {}
    }

    // 2. Auth Priority: Se não logado e não guest, pede cadastro primeiro
    if (!user && !isGuest && !loading) {
      setIsAuthModalOpen(true);
      return;
    }

    // 3. Try GPS
    getPosition();
    
    // Fallback: If after 6 seconds we still have no location, use defaults or saved
    const timer = setTimeout(() => {
      // Use raw localStorage check to avoid stale closure of userLocation state
      const checkLoc = localStorage.getItem('user_location');
      if (!checkLoc) {
        if (savedAddresses.length > 0) {
           const current = savedAddresses.find(a => a.isCurrent) || savedAddresses[0];
           setUserLocation({ latitude: current.latitude, longitude: current.longitude });
           setLocationInfo(current.shortAddress || current.name);
           console.log("[CustomerView] Auto-selected saved address:", current.name);
        } else {
           // We already have a default Porto Velho coordinate set in the state initializer
           console.log("[CustomerView] Using Porto Velho as default location");
        }
      }
    }, 6000);
    
    return () => clearTimeout(timer);
  }, [user, isGuest, loading]);

  // Persist location to localStorage
  useEffect(() => {
    if (userLocation && locationInfo && locationInfo !== 'Buscando localização...') {
      localStorage.setItem('user_location', JSON.stringify(userLocation));
      localStorage.setItem('user_location_info', locationInfo);
    }
  }, [userLocation, locationInfo]);

  // Advanced Address Management Logic
  const fetchSavedAddresses = useCallback(async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, `users/${user.uid}/addresses`),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const addrs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SavedAddress));
      setSavedAddresses(addrs);
      
      // Auto-carregar o endereço principal (isCurrent)
      const current = addrs.find(a => a.isCurrent);
      if (current) {
        setUserLocation({ latitude: current.latitude, longitude: current.longitude });
        setLocationInfo(current.shortAddress || current.name || current.fullAddress);
      } else if (!userLocation && addrs.length > 0) {
        const first = addrs[0];
        setUserLocation({ latitude: first.latitude, longitude: first.longitude });
        setLocationInfo(first.shortAddress || first.name || first.fullAddress);
      }
    } catch (e) {
      console.error("Error fetching saved addresses:", e);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchSavedAddresses();
  }, [user, fetchSavedAddresses]);

  const deleteSavedAddress = async (addrId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/addresses`, addrId));
      fetchSavedAddresses();
      setAddressToDelete(null);
    } catch (e) {
      console.error("Error deleting address:", e);
    }
  };

  const addressSearchTimeout = useRef<NodeJS.Timeout | null>(null);

  const normalizeAddressResult = (res: any, source: 'photon' | 'nominatim') => {
    const cityName = locationModalCity?.name || '';
    const cityLower = cityName.toLowerCase().trim();
    const cityBase = cityName.split('-')[0].trim().toLowerCase();

    if (source === 'photon') {
      const p = res.properties;
      let neighbourhood = p.district || p.suburb || p.locality || "";
      
      const neighLower = neighbourhood.toLowerCase().trim();
      if (neighLower === cityLower || neighLower === cityBase || cityLower.includes(neighLower) || cityBase.includes(neighLower)) {
        neighbourhood = "";
      }
      
      // Ensure the city matches (less strict check to avoid missing valid suggestions)
      const resCity = (p.city || p.county || '').toLowerCase().trim();
      const isMatch = !resCity || 
                      resCity === cityLower || 
                      resCity === cityBase || 
                      cityLower.includes(resCity) || 
                      resCity.includes(cityBase) ||
                      cityName.toLowerCase().includes(resCity);
                      
      if (!isMatch) {
         console.warn(`[AddressSearch] Skipping result ${p.name} as city ${resCity} doesn't match ${cityLower}`);
         // Still allow some results if it's very close or if city is missing
         if (resCity.length > 3) return null;
      }

      return {
        name: p.name || p.street || "Endereço Encontrado",
        display_name: res.display_name || [p.name || p.street, p.housenumber, neighbourhood, p.city].filter(Boolean).join(', '),
        lat: String(res.geometry.coordinates[1]),
        lon: String(res.geometry.coordinates[0]),
        address: {
          road: p.street || p.name || '',
          neighbourhood: neighbourhood,
          house_number: p.housenumber || '',
          city: p.city || ''
        }
      };
    } else {
      // Nominatim
      const addr = res.address || {};
      let neighbourhood = addr.neighbourhood || addr.suburb || addr.city_district || addr.locality || "";
      const neighLower = neighbourhood.toLowerCase().trim();

      if (neighLower === cityLower || neighLower === cityBase || cityLower.includes(neighLower) || cityBase.includes(neighLower)) {
        neighbourhood = "";
      }
      
      const resCity = (addr.city || addr.town || addr.village || addr.municipality || '').toLowerCase().trim();
      const isMatch = !resCity || 
                      resCity === cityLower || 
                      resCity === cityBase || 
                      cityLower.includes(resCity) || 
                      resCity.includes(cityBase) ||
                      cityName.toLowerCase().includes(resCity);
      
      if (!isMatch) {
         if (resCity.length > 3) return null;
      }
      
      return {
        name: res.name || addr.road || addr.pedestrian || "Endereço Encontrado",
        display_name: res.display_name,
        lat: String(res.lat),
        lon: String(res.lon),
        address: {
          road: addr.road || addr.pedestrian || '',
          neighbourhood: neighbourhood,
          house_number: addr.house_number || '',
          city: addr.city || addr.town || ''
        }
      };
    }
  };

  const handleAddressSearch = async (queryStr: string) => {
    if (!queryStr || queryStr.trim().length < 3 || !locationModalCity) {
      setAddressSearchResults([]);
      return;
    }
    
    setIsSearchingAddress(true);
    try {
      const cityName = locationModalCity.name.trim();
      const fullQuery = `${queryStr}, ${cityName}, Brasil`;
      const response = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(fullQuery)}&limit=15&lang=pt`);
      const data = await response.json();
      
      if (data && data.features && data.features.length > 0) {
        const results = data.features
          .map((f: any) => normalizeAddressResult(f, 'photon'))
          .filter(Boolean); // Remote nulls from invalid cities
        
        setAddressSearchResults(results);
      } else {
        const nomResponse = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullQuery)}&limit=10&addressdetails=1&countrycodes=br`);
        if (nomResponse.ok) {
          const nomData = await nomResponse.json();
          const results = nomData
            .map((n: any) => normalizeAddressResult(n, 'nominatim'))
            .filter(Boolean);
          setAddressSearchResults(results);
        }
      }
    } catch (error) {
      console.error("Error searching address:", error);
      try {
        const fullQuery = `${queryStr}, ${locationModalCity.name}, Brasil`;
        const nomResponse = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullQuery)}&limit=8&addressdetails=1&countrycodes=br`);
        const nomData = await nomResponse.json();
        const results = nomData.map((n: any) => normalizeAddressResult(n, 'nominatim'));
        setAddressSearchResults(results);
      } catch (e) {
        console.error("[Search] All search providers failed", e);
      }
    } finally {
      setIsSearchingAddress(false);
    }
  };

  const selectAddressFromSearch = async (result: any) => {
    try {
      const lat = parseFloat(result.lat);
      const lng = parseFloat(result.lon);
      if (isNaN(lat) || isNaN(lng)) throw new Error("Invalid coordinates");
      
      const coords = { lat, lng };
      setSelectedAddressResult(result);
      setMarkerPosition(coords);
      setMapCenter(coords);
      setZoom(16);
      setIsConfirmingLocation(true);
    } catch (error) {
      console.error("Error selecting address:", error);
    }
  };

  const confirmLocation = async () => {
    if (!markerPosition) return;
    
    setIsSearchingAddress(true);
    try {
      let shortAddr = "";
      let fullAddr = "";
      let neighborhood = "";

      // Prioritize selected search result if it matches current marker position
      const hasSelectionMatch = selectedAddressResult && 
        Math.abs(parseFloat(selectedAddressResult.lat) - markerPosition.lat) < 0.0001 &&
        Math.abs(parseFloat(selectedAddressResult.lon) - markerPosition.lng) < 0.0001;

      if (hasSelectionMatch) {
        shortAddr = selectedAddressResult.name;
        fullAddr = selectedAddressResult.display_name;
        neighborhood = selectedAddressResult.address?.neighbourhood || selectedAddressResult.address?.suburb || '';
      } else {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${markerPosition.lat}&lon=${markerPosition.lng}&addressdetails=1`);
        const result = await response.json();
        
        fullAddr = (result && result.display_name) || "Endereço desconhecido";
        const addrDetails = (result && result.address) || {};
        
        const street = addrDetails.road || addrDetails.pedestrian || addrDetails.suburb || '';
        
        // Filter out city name from neighborhood
        const cityName = locationModalCity?.name?.toLowerCase() || 'porto velho';
        neighborhood = addrDetails.neighbourhood || addrDetails.suburb || addrDetails.city_district || addrDetails.locality || '';
        
        if (neighborhood.toLowerCase().includes(cityName) || cityName.includes(neighborhood.toLowerCase())) {
          neighborhood = '';
        }

        const number = addrDetails.house_number || '';

        shortAddr = street ? `${street}${number ? ', ' + number : ''}` : (result && result.name) || (fullAddr && fullAddr.split(',')[0]) || "Endereço desconhecido";
      }

      const newLoc = { latitude: markerPosition.lat, longitude: markerPosition.lng };
      setUserLocation(newLoc);
      setLocationInfo(shortAddr);

      // Add: Instant activeCity update on confirmation
      if (cities.length > 0) {
        let closestCity = null;
        let minDistance = Infinity;

        cities.forEach(city => {
          if (city.lat && city.lng && !isNaN(city.lat) && !isNaN(city.lng)) {
            const dist = Math.sqrt(
              Math.pow(city.lat - markerPosition.lat, 2) + 
              Math.pow(city.lng - markerPosition.lng, 2)
            );
            if (dist < minDistance) {
              minDistance = dist;
              closestCity = city;
            }
          }
        });

        if (closestCity && minDistance < 0.1) {
          setActiveCity(closestCity);
          if (user?.uid) {
            updateProfileData({ cityId: closestCity.id, city: closestCity.name })
              .catch(err => console.error("Erro ao salvar cidade no perfil (satélite):", err));
          }
        }
      }
      
      if (user) {
        try {
          // ENSURE ONLY ONE PRIMARY ADDRESS: Update others to false before adding new primary
          const q = query(collection(db, `users/${user.uid}/addresses`), where("isCurrent", "==", true));
          const snap = await getDocs(q);
          const updateBatches = snap.docs.map(docSnap => updateDoc(docSnap.ref, { isCurrent: false }));
          if (updateBatches.length > 0) await Promise.all(updateBatches);

          await addDoc(collection(db, `users/${user.uid}/addresses`), {
            name: shortAddr,
            shortAddress: shortAddr,
            neighborhood: neighborhood,
            fullAddress: fullAddr,
            latitude: markerPosition.lat,
            longitude: markerPosition.lng,
            isCurrent: true,
            createdAt: serverTimestamp()
          });
          await fetchSavedAddresses();
        } catch (e) {
          console.error("Error saving address:", e);
        }
      }
      
      setIsAddressModalOpen(false);
      setIsConfirmingLocation(false);
      setAddressSearchQuery('');
      setAddressSearchResults([]);
      setLocationModalCity(null);
      setSelectedAddressResult(null);
    } catch (e) {
      console.error("Error confirming location:", e);
    } finally {
      setIsSearchingAddress(false);
    }
  };

  // Sync location to Firestore for manager visibility
  useEffect(() => {
    if (user && userLocation) {
      updateDoc(doc(db, 'users', user.uid), {
        lastLatitude: userLocation.latitude,
        lastLongitude: userLocation.longitude,
        locationUpdatedAt: serverTimestamp()
      }).catch(err => console.error("Error syncing user location:", err));
    }
  }, [userLocation, user?.uid]);

  const deliveryOptionsRef = useRef<HTMLDivElement>(null);

  // Auto-select pickup and scroll for individual links
  useEffect(() => {
    if (orderStep === 'confirmation' && isStoreView) {
      setDeliveryOption('pickup');
      // Small delay to ensure render
      setTimeout(() => {
        deliveryOptionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }, [orderStep, isStoreView]);
  const isExclusiveView = !!restaurantIdParam || !!searchParams.get('r');

  // Header Ray Animation Styles
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'exclusive-ray-animation';
    style.innerHTML = `
      @keyframes ray-shine {
        0% { left: -150%; opacity: 0; }
        20% { opacity: 1; }
        80% { opacity: 1; }
        100% { left: 150%; opacity: 0; }
      }
      .ray-effect {
        position: relative;
        overflow: hidden;
      }
      .ray-effect::after {
        content: "";
        position: absolute;
        top: -100%;
        left: -150%;
        width: 100%;
        height: 300%;
        background: linear-gradient(
          115deg,
          transparent 0%,
          transparent 40%,
          rgba(255, 255, 255, 0.3) 50%,
          transparent 60%,
          transparent 100%
        );
        transform: rotate(-15deg);
        animation: ray-shine 3s infinite linear;
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);
    return () => {
      const existing = document.getElementById('exclusive-ray-animation');
      if (existing) existing.remove();
    };
  }, []);

  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [showCheckoutInfoModal, setShowCheckoutInfoModal] = useState(false);
  const [checkoutName, setCheckoutName] = useState('');
  const [selectedProductForMedia, setSelectedProductForMedia] = useState<FoodItem | null>(null);
  const [selectedProductForAddOns, setSelectedProductForAddOns] = useState<FoodItem | null>(null);
  const [selectedAddOns, setSelectedAddOns] = useState<AddOn[]>([]);
  const [tableNumber, setTableNumber] = useState('');
  const [deliveryOption, setDeliveryOption] = useState<'normal' | 'fast' | 'pickup'>('normal');
  const [tupaEstimates, setTupaEstimates] = useState<Record<string, any[]>>({});
  const [isLoadingTupaEstimates, setIsLoadingTupaEstimates] = useState(false);
  const [selectedTupaCategories, setSelectedTupaCategories] = useState<Record<string, any>>({});
  const [estimatesError, setEstimatesError] = useState<{ resId: string, message: string } | null>(null);

  useEffect(() => {
    const fetchTupaEstimates = async () => {
      if (deliveryOption !== 'fast' || !activeCity) {
        return;
      }

      if (!userLocation) {
        setEstimatesError({ resId: 'global', message: 'Localização do cliente não capturada. Verifique o GPS.' });
        return;
      }

      setIsLoadingTupaEstimates(true);
      setEstimatesError(null);
      try {
        const uniqueRestaurantIds = Array.from(new Set(cart.map(item => item.restaurantId)));
        const estimates: Record<string, any[]> = {};

        for (const resId of uniqueRestaurantIds) {
          const restaurant = restaurants.find(r => r.id === resId);
          if (!restaurant || !restaurant.latitude || !restaurant.longitude) continue;

          try {
            console.log(`[TupaEstimates] Fetching estimates for restaurant ${resId}...`, {
              cityId: activeCity.id,
              lat_partida: restaurant.latitude,
              lng_partida: restaurant.longitude,
              lat_desejado: userLocation.latitude,
              lng_desejado: userLocation.longitude
            });

            let response: any = { data: { success: false } };
            
            // Always try to fetch from server if we have a city ID. 
            // The server will look up the API key in its own DB if it's missing from the client-side object.
            if (activeCity.id) {
              try {
                // Ensure coordinates are fixed to numbers and valid
                const pLat = Number(restaurant.latitude || 0);
                const pLng = Number(restaurant.longitude || 0);
                const dLat = Number(userLocation.latitude || 0);
                const dLng = Number(userLocation.longitude || 0);

                if (pLat !== 0 && pLng !== 0 && dLat !== 0 && dLng !== 0) {
                  response = await axios.get('/api/machine/estimativas', {
                    params: {
                      cityId: activeCity.id,
                      lat_partida: pLat.toString(),
                      lng_partida: pLng.toString(),
                      lat_desejado: dLat.toString(),
                      lng_desejado: dLng.toString()
                    }
                  });
                } else {
                  console.warn("[TupaEstimates] Invalid coordinates suppressed:", { pLat, pLng, dLat, dLng });
                }
              } catch (mode1ApiErr) {
                console.warn("[TupaEstimates] Mode 1 API failed:", mode1ApiErr);
              }
            }

            console.log(`[TupaEstimates] Response for ${resId}:`, response.data);

            let currentMapped: any[] = [];
            let errorFromApi = null;

            if (response.data.success !== false && Array.isArray(response.data.categorias)) {
              currentMapped = response.data.categorias.map((c: any, cIdx: number) => ({
                id: c.id || c.categoria_id || `api-cat-cust-${cIdx}`,
                nome: c.categoria_nome || c.nome || 'Categoria',
                preco: Number(c.valor_total || c.estimativa_valor || c.valor || c.preco || 0),
                distancia: Number(c.estimativa_distancia || c.distancia || c.km || c.km_distancia || 0)
              }));
            } else if (response.data.success === false) {
              errorFromApi = response.data.errors?.[0]?.message || 'Não é possível realizar este trajeto.';
              setEstimatesError({ resId, message: errorFromApi });
            }

            // Fallback 1: Try simple categories list if Mode 1 returned nothing
            if (currentMapped.length === 0) {
              try {
                console.log(`[TupaEstimates] Falling back to Mode 2 (Categorias) for city ${activeCity.id}`);
                const catRes = await axios.get('/api/machine/categorias', {
                  params: { cityId: activeCity.id }
                });
                if (catRes.data.success) {
                  const rawCats = catRes.data.categorias || catRes.data.response || [];
                  currentMapped = rawCats.map((c: any, cIdx: number) => ({
                    id: c.id || `api-cat-sec-${cIdx}`,
                    nome: c.categoria_nome || c.nome || 'Categoria',
                    preco: Number(c.valor_total || c.estimativa_valor || c.preco || c.valor || 0),
                    distancia: 0
                  }));
                }
              } catch (catErr) {
                console.warn("Fallback Mode 2 Categories failed:", catErr);
              }
            }

            // Fallback 2: Use Firestore static categories if API is still empty
            if (currentMapped.length === 0 && activeCity.categories && activeCity.categories.length > 0) {
              console.log("[TupaEstimates] Falling back to Firestore static categories");
              currentMapped = activeCity.categories.map((c: any, cIdx: number) => ({
                id: c.id || c.categoria_id || `api-cat-static-${cIdx}`,
                nome: c.nome || c.categoria_nome || 'Categoria',
                preco: 0,
                distancia: 0
              }));
            }

            if (currentMapped.length > 0) {
              estimates[resId as any] = currentMapped;
              
              // Auto-select first category if none selected for this restaurant
              setSelectedTupaCategories((prev: any) => {
                if (!prev[resId as any]) {
                  return { ...prev, [resId as any]: currentMapped[0] };
                }
                return prev;
              });
            }
          } catch (err) {
            console.error(`Error fetching estimates for restaurant ${resId}:`, err);
          }
        }
        setTupaEstimates(estimates);
      } catch (error) {
        console.error("Fetch Tupa estimates error:", error);
      } finally {
        setIsLoadingTupaEstimates(false);
      }
    };

    fetchTupaEstimates();
  }, [deliveryOption, userLocation, activeCity, cart, restaurants]);

  const [checkoutWhatsapp, setCheckoutWhatsapp] = useState('');

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const [checkoutAddress, setCheckoutAddress] = useState('');
  const [checkoutReferencePoint, setCheckoutReferencePoint] = useState('');
  const [galleryTarget, setGalleryTarget] = useState<'item' | 'popup' | 'banner' | 'restaurant' | 'profile'>('item');

  useEffect(() => {
    if (showCheckoutInfoModal && profile) {
      setCheckoutName(profile.displayName || '');
      setCheckoutWhatsapp(profile.whatsapp || '');
    }
  }, [showCheckoutInfoModal, profile]);

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [activePixPayment, setActivePixPayment] = useState<PixPayment | null>(null);
  const [activeOrderPix, setActiveOrderPix] = useState<any>(null);

  useEffect(() => {
    if (isExclusiveView && selectedRestaurant) {
      document.title = selectedRestaurant.name;
    } else if (globalSettings?.appName) {
      document.title = globalSettings.appName;
    }
  }, [isExclusiveView, selectedRestaurant, globalSettings]);
  const [isRecharging, setIsRecharging] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [isGeneratingPix, setIsGeneratingPix] = useState(false);
  const [isGeneratingOrderPix, setIsGeneratingOrderPix] = useState(false);
  const [showPixInfo, setShowPixInfo] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<any>(null);
  const [pollingInterval, setPollingInterval] = useState<any>(null);

  const [isAddingPopup, setIsAddingPopup] = useState(false);
  const [popupImg, setPopupImg] = useState('');
  const [popupLink, setPopupLink] = useState('');
  const [popupActive, setPopupActive] = useState(true);

  const [isAddingBanner, setIsAddingBanner] = useState(false);
  const [bannerImg, setBannerImg] = useState('');
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerActive, setBannerActive] = useState(true);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [showCitySelector, setShowCitySelector] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [allPermissionsGranted, setAllPermissionsGranted] = useState(true);

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const geoStatus = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        
        const updateStatus = () => {
          setAllPermissionsGranted(geoStatus.state === 'granted');
        };

        geoStatus.onchange = updateStatus;
        updateStatus();
      } catch (e) {
        // Fallback
      }
    };
    checkPermissions();
  }, []);

  const handleOpenPermissions = () => {
    window.dispatchEvent(new CustomEvent('show-permission-modal'));
  };

  const TableNumberModal = () => (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl p-8 space-y-6"
      >
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Hash size={32} />
          </div>
          <h3 className="text-xl font-black uppercase tracking-tighter italic text-slate-800">Número da Mesa</h3>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Por favor, informe o número da sua mesa para continuarmos.</p>
        </div>

        <div className="space-y-4">
          <input 
            type="text"
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            placeholder="EX: 05"
            className="w-full bg-slate-50 border-none rounded-2xl py-4 text-center text-2xl font-black italic focus:ring-2 focus:ring-blue-500/20"
            autoFocus
          />
          
          <button 
            onClick={() => {
              if (tableNumber.trim()) {
                setShowTableNumberModal(false);
                placeOrder();
              }
            }}
            className="w-full bg-blue-gradient text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-500/20 hover:scale-[1.02] transition-all"
          >
            Confirmar e Pedir
          </button>
          
          <button 
            onClick={() => setShowTableNumberModal(false)}
            className="w-full text-slate-400 py-2 text-[10px] font-black uppercase tracking-widest"
          >
            Cancelar
          </button>
        </div>
      </motion.div>
    </div>
  );

  const [tempName, setTempName] = useState('');
  const [showTableNumberModal, setShowTableNumberModal] = useState(false);
  const [showFinishOrderModal, setShowFinishOrderModal] = useState<any>(null);
  const [selectedTableAction, setSelectedTableAction] = useState<{label: string, action: string} | null>(null);
  const [isSendingTableAction, setIsSendingTableAction] = useState(false);

  const handleTableAction = async (order: any, action: string, comment?: string) => {
    const path = 'table_actions';
    setIsSendingTableAction(true);
    try {
      await addDoc(collection(db, path), {
        orderId: order.id,
        restaurantId: order.restaurantId,
        customerName: profile?.displayName || user?.displayName || 'Cliente',
        customerUid: user?.uid,
        tableNumber: order.tableNumber,
        action,
        comment: comment || '',
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setSelectedTableAction(null);
      setShowFinishOrderModal(null);
    } catch (error) {
      console.error('Error sending table action:', error);
      handleFirestoreError(error, OperationType.CREATE, path);
      alert('Erro ao enviar solicitação.');
    } finally {
      setIsSendingTableAction(false);
    }
  };

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMessage, setAuthModalMessage] = useState<string | undefined>(undefined);
  const [searchSuggestion, setSearchSuggestion] = useState<string | null>(null);

  const getSimilarity = (s1: string, s2: string) => {
    let longer = s1;
    let shorter = s2;
    if (s1.length < s2.length) {
      longer = s2;
      shorter = s1;
    }
    let longerLength = longer.length;
    if (longerLength === 0) {
      return 1.0;
    }
    return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength.toString());
  };

  const editDistance = (s1: string, s2: string) => {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();
    let costs = new Array();
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0)
          costs[j] = j;
        else {
          if (j > 0) {
            let newValue = costs[j - 1];
            if (s1.charAt(i - 1) !== s2.charAt(j - 1))
              newValue = Math.min(Math.min(newValue, lastValue),
                costs[j]) + 1;
            costs[j - 1] = lastValue;
            lastValue = newValue;
          }
        }
      }
      if (i > 0)
        costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  };
  const [targetRole, setTargetRole] = useState<'customer' | 'manager' | 'courier'>('customer');

  useEffect(() => {
    if (user && profile && targetRole === 'manager' && profile.role !== 'manager' && profile.role !== 'admin') {
      // If user just logged in and we wanted manager role
      navigate('/manager', { state: { isRegistering: true } });
    }
  }, [user, profile, targetRole, navigate]);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<any | null>(null);

  const handleUpdateOrderItem = async (orderId: string, itemIdx: number, delta: number) => {
    const order = activeOrders.find(o => o.id === orderId);
    if (!order) return;

    const newItems = [...order.items];
    const item = { ...newItems[itemIdx] };
    const newQuantity = Math.max(1, item.quantity + delta);
    
    if (newQuantity === item.quantity) return;
    
    item.quantity = newQuantity;
    newItems[itemIdx] = item;

    const newTotal = newItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);

    try {
      await updateDoc(doc(db, 'orders', orderId), {
        items: newItems,
        total: newTotal
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const handleRemoveOrderItem = async (orderId: string, itemIdx: number) => {
    const order = activeOrders.find(o => o.id === orderId);
    if (!order) return;

    const newItems = order.items.filter((_: any, idx: number) => idx !== itemIdx);
    
    if (newItems.length === 0) {
      try {
        await deleteDoc(doc(db, 'orders', orderId));
        setEditingOrderId(null);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `orders/${orderId}`);
      }
      return;
    }

    const newTotal = newItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);

    try {
      await updateDoc(doc(db, 'orders', orderId), {
        items: newItems,
        total: newTotal
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  useEffect(() => {
    if (fromManager) {
      setDeliveryOption('pickup');
    }
  }, [fromManager]);

  useEffect(() => {
    const autoAddCity = async () => {
      if (!user || !userCity || userCity === 'Cidade Desconhecida') return;
      
      // Update profile with city if missing
      if (profile && !profile.city) {
        try {
          const cityObj = cities.find(c => c.name.toLowerCase() === userCity.toLowerCase());
          const branchObj = branches.find(b => b.cityName.toLowerCase() === userCity.toLowerCase());
          
          await setDoc(doc(db, 'users', user.uid), {
            city: userCity,
            cityId: cityObj?.id || '',
            branchId: branchObj?.id || ''
          }, { merge: true });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
        }
      }

      // Check if city already exists in our cities list
      const cityExists = cities.some(c => c.name.toLowerCase() === userCity.toLowerCase());
      
      if (!cityExists) {
        try {
          await addDoc(collection(db, 'cities'), {
            name: userCity,
            active: true,
            status: 'online',
            lastChecked: new Date().toISOString(),
            apiUrl: '',
            apiKey: '',
            categories: []
          });
          console.log(`Cidade ${userCity} adicionada automaticamente.`);
        } catch (error) {
          // Ignore error if it's already added by another user concurrently
          console.error("Erro ao adicionar cidade automaticamente:", error);
        }
      }
    };

    autoAddCity();
  }, [userCity, cities, user, profile]);

  useEffect(() => {
    if (!user) {
      setWallet(null);
      return;
    }

    const unsubWallet = onSnapshot(doc(db, 'wallets', user.uid), (snap) => {
      if (snap.exists()) {
        setWallet({ id: snap.id, ...snap.data() } as Wallet);
      } else {
        // Fallback to query if document with UID as ID doesn't exist yet (for legacy wallets)
        const walletQuery = query(collection(db, 'wallets'), where('ownerUid', '==', user.uid), limit(1));
        getDocs(walletQuery).then(snapshot => {
          if (!snapshot.empty) {
            setWallet({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Wallet);
          } else {
            setWallet(null);
          }
        });
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, `wallets/${user.uid}`));

    const transactionsQuery = query(collection(db, 'wallet_transactions'), where('ownerUid', '==', user.uid), orderBy('createdAt', 'desc'), limit(20));
    const unsubTransactions = onSnapshot(transactionsQuery, (snapshot) => {
      setWalletTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WalletTransaction)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'wallet_transactions'));

    return () => {
      unsubWallet();
      unsubTransactions();
    };
  }, [user]);

  const handleGeneratePix = async () => {
    if (!user || !globalSettings?.mercadoPagoAccessToken) {
      alert('Configuração do Mercado Pago não encontrada.');
      return;
    }

    const amount = parseFloat(rechargeAmount);
    if (isNaN(amount) || amount < (globalSettings.minRechargeAmount || 10)) {
      alert(`O valor mínimo para recarga é R$${(globalSettings.minRechargeAmount || 10).toFixed(2)}`);
      return;
    }

    setIsGeneratingPix(true);
    try {
      const response = await fetch('/api/create-pix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: amount,
          description: 'Recarga de crédito parceiro - ifood TUPÃ',
          email: user.email || 'pagamentos@aifood.com',
          firstName: user.displayName?.split(' ')[0] || 'Parceiro',
          lastName: user.displayName?.split(' ').slice(1).join(' ') || 'Tupã',
          accessToken: globalSettings.mercadoPagoAccessToken,
          orderId: `RECHARGE_${user.uid}_${Date.now()}`
        })
      });

      const data = await response.json();
      
      if (data.status === 400 || data.error) {
        throw new Error(data.message || 'Erro ao gerar Pix');
      }

      const pixData: PixPayment = {
        id: '', 
        paymentId: data.id.toString(),
        qrCode: data.point_of_interaction.transaction_data.qr_code,
        qrCodeBase64: data.point_of_interaction.transaction_data.qr_code_base64,
        status: 'pending',
        amount: amount
      };

      const docRef = await addDoc(collection(db, 'pix_payments'), {
        ...pixData,
        ownerUid: user.uid,
        createdAt: serverTimestamp()
      });

      setActivePixPayment({ ...pixData, id: docRef.id });
      startPollingPayment(data.id.toString(), docRef.id, amount);
    } catch (error: any) {
      console.error("Error generating Pix:", error);
      alert('Erro ao gerar pagamento Pix: ' + error.message);
    } finally {
      setIsGeneratingPix(false);
    }
  };

  const executeSplitPay = async (orderId: string, restaurantId: string, totalAmount: number) => {
    if (!globalSettings?.mercadoPagoAccessToken) return;

    try {
      const restaurant = restaurants.find(r => r.id === restaurantId);
      if (!restaurant || !restaurant.splitPayConfig?.pixKey) {
        console.log("SplitPay not configured for this restaurant (missing Pix Key)");
        return;
      }

      const config = restaurant.splitPayConfig;
      
      // Enforce 50/50 Split as requested by user
      const platformFee = totalAmount * 0.5;
      const restaurantAmount = totalAmount * 0.5;

      if (restaurantAmount <= 0) {
        console.log("Restaurant amount is zero or negative, skipping split");
        return;
      }

      console.log(`Executing Automatic 50/50 SplitPay for Order #${orderId}. Total: ${totalAmount}, Split: ${restaurantAmount}`);

      // Call our server-side API
      const response = await fetch('/api/split-pay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderId,
          restaurantId,
          amount: restaurantAmount,
          pixKey: config.pixKey,
          pixKeyType: config.pixKeyType || 'random',
          accessToken: globalSettings.mercadoPagoAccessToken
        })
      });

      const data = await response.json();
      const status = response.ok ? 'success' : 'error';

      // Log history
      await addDoc(collection(db, 'splitpay_history'), {
        orderId,
        restaurantId,
        totalAmount,
        platformFee,
        restaurantAmount,
        pixKeyDest: config.pixKey,
        status,
        errorMessage: response.ok ? '' : (data.data?.message || data.message || 'Erro no servidor'),
        createdAt: serverTimestamp()
      });

      if (response.ok) {
        console.log("SplitPay executed successfully");
      } else {
        console.error("SplitPay failed:", data);
      }

    } catch (error) {
      console.error("Error executing SplitPay:", error);
      await addDoc(collection(db, 'splitpay_history'), {
        orderId,
        restaurantId,
        totalAmount,
        status: 'error',
        errorMessage: error instanceof Error ? error.message : String(error),
        createdAt: serverTimestamp()
      });
    }
  };

  const startPollingOrderPayment = (paymentId: string, orderIds: string[], restaurantId: string, amount: number) => {
    if (!paymentId || paymentId === 'undefined' || paymentId === 'null') {
      console.error("Invalid paymentId for order polling:", paymentId);
      return;
    }

    const interval = setInterval(async () => {
      if (!globalSettings?.mercadoPagoAccessToken) return;

      try {
        console.log(`Polling order payment status for ${paymentId}...`);
        const response = await fetch(`/api/check-payment/${paymentId}`, {
          headers: {
            'Authorization': `Bearer ${globalSettings.mercadoPagoAccessToken}`
          }
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error(`Order polling error (${response.status}):`, errorData);
          return;
        }

        const data = await response.json();

        if (data.status === 'approved') {
          clearInterval(interval);
          
          // Update all orders in the batch
          for (const orderId of orderIds) {
            await updateDoc(doc(db, 'orders', orderId), { 
              status: 'confirmed',
              paymentStatus: 'approved'
            });
          }
          
          // Execute SplitPay for the main restaurant (or handle split for all)
          await executeSplitPay(orderIds[0], restaurantId, amount);
          
          alert('Pagamento aprovado! Seu pedido está sendo preparado.');
          setActiveOrderPix(null);
        } else if (data.status === 'rejected' || data.status === 'cancelled') {
          clearInterval(interval);
          for (const orderId of orderIds) {
            await updateDoc(doc(db, 'orders', orderId), { 
              status: 'cancelled',
              paymentStatus: data.status 
            });
          }
          alert('O pagamento do pedido foi recusado ou cancelado.');
          setActiveOrderPix(null);
        }
      } catch (error) {
        console.error("Error polling order payment:", error);
      }
    }, 3000); // Increased to 3 seconds

    return interval;
  };

  const handleApprovedPayment = async (docId: string, amount: number) => {
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

      await updateDoc(docRef, { status: 'approved' });
      
      if (wallet) {
        await updateDoc(doc(db, 'wallets', wallet.id), {
          balance: increment(amount),
          updatedAt: serverTimestamp()
        });

        await addDoc(collection(db, 'wallet_transactions'), {
          walletId: wallet.id,
          ownerUid: user?.uid,
          type: 'recharge',
          amount: amount,
          method: 'pix',
          cityId: profile?.cityId || '',
          cityName: profile?.city || '',
          branchId: profile?.branchId || '',
          description: 'Recarga Pix Mercado Pago',
          createdAt: serverTimestamp(),
          timestamp: serverTimestamp(),
          date: new Date().toISOString().split('T')[0]
        });

        // Update branch totals
        if (profile?.branchId) {
          const branchRef = doc(db, 'branches', profile.branchId);
          await updateDoc(branchRef, {
            recargas_pix: increment(amount),
            ganhos_gerais: increment(amount),
            faturamento_hoje: increment(amount)
          });
        }

        // Execute SplitPay for Recharge (50/50 split to specific CPF)
        try {
          const platformFee = amount * 0.5;
          const rechargePixKey = '04367829286';
          const rechargePixType = 'cpf';

          await fetch('/api/split-pay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: `RECHARGE_${Date.now()}`,
              restaurantId: 'SYSTEM_RECHARGE',
              amount: platformFee,
              pixKey: rechargePixKey,
              pixKeyType: rechargePixType,
              accessToken: globalSettings.mercadoPagoAccessToken
            })
          });

          // Record in splitpay_history
          await addDoc(collection(db, 'splitpay_history'), {
            orderId: `RECHARGE_${docId}`,
            restaurantId: 'SYSTEM_RECHARGE',
            totalAmount: amount,
            platformFee: platformFee,
            restaurantAmount: amount - platformFee,
            pixKey: rechargePixKey,
            status: 'success',
            type: 'recharge_split',
            createdAt: serverTimestamp()
          });
        } catch (splitError) {
          console.error("Error executing SplitPay for recharge:", splitError);
        }
      }

      alert('Pagamento aprovado! Seu saldo foi atualizado.');
      setActivePixPayment(null);
      setIsRecharging(false);
    } catch (error) {
      console.error("Error handling approved payment:", error);
    }
  };

  const startPollingPayment = (paymentId: string, docId: string, amount: number) => {
    if (pollingInterval) clearInterval(pollingInterval);

    if (!paymentId || paymentId === 'undefined' || paymentId === 'null') {
      console.error("Invalid paymentId for polling:", paymentId);
      return;
    }

    const interval = setInterval(async () => {
      if (!globalSettings?.mercadoPagoAccessToken) return;

      try {
        console.log(`Polling payment status for ${paymentId}...`);
        const response = await fetch(`/api/check-payment/${paymentId}`, {
          headers: {
            'Authorization': `Bearer ${globalSettings.mercadoPagoAccessToken}`
          }
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error(`Polling error (${response.status}):`, errorData);
          return;
        }

        const data = await response.json();

        if (data.status === 'approved') {
          clearInterval(interval);
          setPollingInterval(null);
          await handleApprovedPayment(docId, amount);
        } else if (data.status === 'rejected' || data.status === 'cancelled') {
          clearInterval(interval);
          setPollingInterval(null);
          await updateDoc(doc(db, 'pix_payments', docId), { status: data.status });
          alert('O pagamento foi recusado ou cancelado.');
          setActivePixPayment(null);
        }
      } catch (error) {
        console.error("Error polling payment:", error);
      }
    }, 3000); // Increased to 3 seconds

    setPollingInterval(interval);
  };

  useEffect(() => {
    if (!activePixPayment?.id) return;

    console.log("Setting up real-time listener for PIX payment:", activePixPayment.id);
    const unsub = onSnapshot(doc(db, 'pix_payments', activePixPayment.id), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.status === 'approved') {
          console.log("PIX Payment approved detected via onSnapshot!");
          handleApprovedPayment(snapshot.id, data.amount);
        } else if (data.status === 'rejected' || data.status === 'cancelled') {
          alert('O pagamento foi recusado ou cancelado.');
          setActivePixPayment(null);
        }
      }
    }, (error) => {
      console.error("Error monitoring PIX payment:", error);
    });

    return () => unsub();
  }, [activePixPayment?.id]);

  useEffect(() => {
    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [pollingInterval]);

  const handleSavePopup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await addDoc(collection(db, 'marketing_popups'), {
        imageUrl: popupImg,
        linkUrl: popupLink,
        active: popupActive,
        ownerUid: user.uid,
        createdAt: serverTimestamp()
      });
      setIsAddingPopup(false);
      setPopupImg('');
      setPopupLink('');
      alert('Pop-up criado com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'marketing_popups');
    }
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await addDoc(collection(db, 'promotional_banners'), {
        imageUrl: bannerImg,
        title: bannerTitle,
        active: bannerActive,
        ownerUid: user.uid,
        createdAt: serverTimestamp()
      });
      setIsAddingBanner(false);
      setBannerImg('');
      setBannerTitle('');
      // alert('Banner criado com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'promotional_banners');
    }
  };

  const handleDeletePopup = async (id: string) => {
    setAdminConfirmModal({
      type: 'confirm',
      title: 'Excluir Pop-up',
      message: 'Tem certeza que deseja excluir este pop-up?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'marketing_popups', id));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `marketing_popups/${id}`);
        }
        setAdminConfirmModal(null);
      }
    });
  };

  const handleDeleteBanner = async (id: string) => {
    setAdminConfirmModal({
      type: 'confirm',
      title: 'Excluir Banner',
      message: 'Tem certeza que deseja excluir este banner?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'promotional_banners', id));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `promotional_banners/${id}`);
        }
        setAdminConfirmModal(null);
      }
    });
  };

  const openGallery = (target: 'item' | 'popup' | 'banner' | 'restaurant' | 'profile') => {
    setGalleryTarget(target);
    setIsGalleryOpen(true);
  };

  const handleGallerySelect = (url: string) => {
    if (galleryTarget === 'profile') {
      updateProfileData({ photoURL: url });
    }
    setIsGalleryOpen(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'item' | 'popup' | 'banner' | 'restaurant' | 'profile') => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedUrl = await compressImage(file, 800, 800, 0.7);
        if (target === 'profile') {
          updateProfileData({ photoURL: compressedUrl });
        }
      } catch (error) {
        console.error("Error compressing image:", error);
        // Fallback to original if compression fails (though unlikely)
        const reader = new FileReader();
        reader.onloadend = () => {
          const url = reader.result as string;
          if (target === 'profile') {
            updateProfileData({ photoURL: url });
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };
  const [activeChatOrderId, setActiveChatOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (activeChatOrderId) {
      setUnreadCounts(prev => ({ ...prev, [activeChatOrderId]: 0 }));
    }
  }, [activeChatOrderId]);
  
  useEffect(() => {
    if (restaurantIdParam && restaurants.length > 0) {
      const restaurant = restaurants.find(r => r.id === restaurantIdParam);
      if (restaurant) {
        setSelectedRestaurant(restaurant);
        setView('restaurant');
      }
    }
  }, [restaurantIdParam, restaurants]);

  useEffect(() => {
    const settingsRef = doc(db, 'settings', 'global');
    const unsubSettings = onSnapshot(settingsRef, (doc) => {
      if (doc.exists()) {
        setSettings(doc.data() as GlobalSettings);
      }
    }, (err) => {
      if (err.code !== 'permission-denied') {
        handleFirestoreError(err, OperationType.GET, 'settings/global');
      } else {
        console.warn('Settings access denied, using defaults');
      }
    });
    return () => unsubSettings();
  }, []);

  useEffect(() => {
    setCurrentBannerIndex(0);
  }, [cityBanners.length]);

  useEffect(() => {
    if (cityBanners.length > 1) {
      const intervalDelay = (settings.carouselInterval || 5) * 1000;
      const timer = setInterval(() => {
        setCurrentBannerIndex((prev) => (prev + 1) % cityBanners.length);
      }, intervalDelay);
      return () => clearInterval(timer);
    }
  }, [cityBanners.length, currentBannerIndex, settings.carouselInterval]);

  useEffect(() => {
    if (cities.length === 0) return;
    
    // Se o usuário já possui uma cidade ativa selecionada ou se carregou do perfil/cache, não sobrescrevemos de forma alguma automaticamente!
    if (activeCity) return;

    // 0. Prioridade absoluta: carregar a cidade cadastrada no perfil do cliente se estiver logado
    if (profile && profile.cityId) {
      const match = cities.find(c => c.id === profile.cityId);
      if (match) {
        if (!activeCity || activeCity.id !== match.id) {
          console.log("[CustomerView] Cidade carregada do perfil de usuário:", match.name);
          setActiveCity(match);
        }
        return;
      }
    }

    // 1. Try to match by userCity name exactly (from Geocoding)
    if (userCity && userCity !== 'Cidade Desconhecida') {
      const normalizedUserCity = userCity.split('-')[0].trim().toLowerCase();
      const match = cities.find(c => {
        const normalizedDBName = (c.name || '').split('-')[0].trim().toLowerCase();
        return normalizedDBName === normalizedUserCity;
      });
      
      if (match) {
        if (!activeCity || (activeCity as any).id !== match.id) {
          console.log("[CustomerView] City matched by name:", match.name);
          setActiveCity(match);
        }
        return;
      }
    }

    // 2. Try to find the closest city if userLocation is available
    if (userLocation && userLocation.latitude && userLocation.longitude) {
      let closestCity = null;
      let minDistance = Infinity;

      cities.forEach(city => {
        // Handle both possible coordinate naming conventions
        const cLat = city.latitude || city.lat;
        const cLng = city.longitude || city.lng;
        
        if (cLat && cLng && !isNaN(cLat) && !isNaN(cLng)) {
          const dist = Math.sqrt(
            Math.pow(cLat - userLocation.latitude, 2) + 
            Math.pow(cLng - userLocation.longitude, 2)
          );
          if (dist < minDistance) {
            minDistance = dist;
            closestCity = city;
          }
        }
      });

      // RIGIDEZ: Só aceita se a distância for menor que ~30km (0.3 graus)
      if (closestCity && minDistance < 0.3) {
        if (!activeCity || (activeCity as any).id !== (closestCity as any).id) {
          console.log("[CustomerView] Cidade próxima detectada dentro do raio de segurança:", (closestCity as any).name);
          setActiveCity(closestCity);
        }
        return;
      }
    }

    // 3. Hub Priority: Preferir Capitais Regionais se nada foi encontrado
    if (!activeCity) {
      const hub = cities.find(c => 
        (c.name || '').toLowerCase().includes('porto velho') || 
        (c.name || '').toLowerCase().includes('tupa')
      );
      if (hub) {
        setActiveCity(hub);
        return;
      }
    }

    // 4. Fallback: Only if STILL null and first visit
    if (!activeCity && cities.length > 0 && !isManualCity) {
      // Cache check
      const cachedCityId = localStorage.getItem('active_city_v2_id');
      if (cachedCityId) {
        const cachedMatch = cities.find(c => c.id === cachedCityId);
        if (cachedMatch) {
          setActiveCity(cachedMatch);
          return;
        }
      }
      
      // Se detectamos uma localização mas não achamos cidade próxima (ex: Juruti),
      // evitamos forçar uma cidade distante (Canoinhas).
      if (userLocation) {
        const cLat = cities[0].latitude || cities[0].lat;
        const cLng = cities[0].longitude || cities[0].lng;
        if (cLat && cLng) {
          const dist = Math.sqrt(Math.pow(cLat - userLocation.latitude, 2) + Math.pow(cLng - userLocation.longitude, 2));
          // Se o padrão estiver a mais de 100km (1.0 graus aprox), não forçamos.
          if (dist > 1.0) {
            console.log("[CustomerView] Not forcing distant fallback city:", cities[0].name);
            return;
          }
        }
      }

      // Se chegamos aqui, ou está perto o suficiente ou não temos localização.
      // Priorizamos Hubs globais se o fallback forçado for necessário.
      const portoVelho = cities.find(c => c.name.toLowerCase().includes('porto velho'));
      if (portoVelho) {
        setActiveCity(portoVelho);
      } else {
        setActiveCity(cities[0]);
      }
    }
  }, [cities, userCity, userLocation, activeCity, isManualCity, profile]);

  // Sync categories state with the global food categories from AuthContext
  useEffect(() => {
    let finalCategories: Category[] = [];

    // Se existirem categorias no banco de dados, nós as usamos diretamente.
    if (commonData.categories && commonData.categories.length > 0) {
      finalCategories = commonData.categories
        .filter(c => c && (typeof c.name === 'string' || typeof c.nome === 'string') && c.active !== false && c.status !== 'inactive')
        .map(c => ({
          id: c.id,
          name: (c.name || c.nome).trim(),
          iconName: c.iconName || 'Utensils',
          imageUrl: c.imageUrl || '',
          active: true,
          status: 'active'
        } as Category));
    }

    setCategories(finalCategories);
  }, [commonData.categories]);

  // Sync general lists (restaurants, cities, banners, food items) with pre-loaded data from AuthContext
  useEffect(() => {
    if (commonData.restaurants.length > 0) {
      setRestaurants(commonData.restaurants);
      
      if (selectedRestaurant) {
        const updatedRes = commonData.restaurants.find(r => r.id === selectedRestaurant.id);
        if (updatedRes) {
          setSelectedRestaurant(updatedRes);
        }
      }
    }
    if (commonData.cities.length > 0) setCities(commonData.cities);
    if (commonData.banners.length > 0) setBanners(commonData.banners);
    if (commonData.foodItems.length > 0) setAllProducts(commonData.foodItems);
  }, [commonData, selectedRestaurant]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const branchesSnap = await getDocs(collection(db, 'branches'));
        setBranches(branchesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        
        const popupsRef = collection(db, 'marketing_popups');
        const popupsQuery = query(popupsRef, where('active', '==', true));
        const popupsSnap = await getDocs(popupsQuery);
        setMarketingPopups(popupsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MarketingPopup)));

        const reviewsSnap = await getDocs(collection(db, 'reviews'));
        setAllReviews(reviewsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review)));

        const schedulesSnap = await getDocs(collection(db, 'category_schedules'));
        setCategorySchedules(schedulesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CategorySchedule)));
      } catch (err: any) {
        if (err.code === 'permission-denied') return;
        handleFirestoreError(err, OperationType.LIST, 'common_fetch_customer');
      }
    };
    
    fetchData();
  }, []);

  const getScheduleTimeRemaining = (endTime: string) => {
    if (!endTime || typeof endTime !== 'string') return '';
    const now = currentTime;
    const currentTotalSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    
    const parts = endTime.split(':').map(Number);
    const h = parts[0];
    const m = parts[1] || 0;
    const s = parts[2] || 0;
    
    let endTotalSeconds = h * 3600 + m * 60 + s;
    
    let diff = endTotalSeconds - currentTotalSeconds;
    if (diff < 0) diff += 24 * 3600; // Handle overnight
    
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const activeSchedulesMemo = useMemo(() => {
    if (!categorySchedules || !Array.isArray(categorySchedules)) return [];
    const now = currentTime;
    const currentDay = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'][now.getDay()];
    const currentTotalSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

    return (categorySchedules as any[]).filter(s => {
      if (!s || !s.active) return false;
      
      const parseTime = (t: string) => {
        if (!t || typeof t !== 'string') return 0;
        const parts = t.split(':');
        const h = parseInt(parts[0]) || 0;
        const m = parseInt(parts[1]) || 0;
        const second = parseInt(parts[2]) || 0;
        return h * 3600 + m * 60 + second;
      };

      const start = parseTime(s.startTime);
      const end = parseTime(s.endTime);
      
      if (start <= end) {
        return currentTotalSeconds >= start && currentTotalSeconds <= end;
      } else {
        return currentTotalSeconds >= start || currentTotalSeconds <= end;
      }
    });
  }, [categorySchedules, currentTime]);

  useEffect(() => {
    if (activeSchedulesMemo.length > 0 && Array.isArray(activeSchedulesMemo) && !hasManuallySelectedCategory.current) {
      const firstActiveSchedule = activeSchedulesMemo[0];
      if (firstActiveSchedule && firstActiveSchedule.categoryIds && firstActiveSchedule.categoryIds.length > 0) {
        const scheduledCatId = firstActiveSchedule.categoryIds[0];
        const category = categories.find(c => c.id === scheduledCatId);
        if (category && activeCategory !== category.name) {
          setActiveCategory(category.name);
        }
      }
    }
  }, [activeSchedulesMemo, categories, activeCategory]);

  useEffect(() => {
    let unsubWallets: (() => void) | null = null;
    let unsubUsers: (() => void) | null = null;

    if (profile?.role === 'admin' && !isGuest && user) {
      unsubWallets = onSnapshot(collection(db, 'wallets'), (snapshot) => {
        setAllWallets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Wallet)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'wallets'));

      unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
        setAllUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));
    }

    return () => {
      if (unsubWallets) unsubWallets();
      if (unsubUsers) unsubUsers();
    };
  }, [profile?.role]);

  useEffect(() => {
    if (selectedRestaurant) {
      const fetchRestaurantData = async () => {
        try {
          const foodItemsRef = collection(db, 'food_items');
          const menuQuery = query(foodItemsRef, where('restaurantId', '==', selectedRestaurant.id), where('available', '==', true));
          const menuSnap = await getDocs(menuQuery);
          setRestaurantMenu(menuSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as FoodItem)));

          const reviewsRef = collection(db, 'reviews');
          const reviewsQuery = query(reviewsRef, where('restaurantId', '==', selectedRestaurant.id), orderBy('createdAt', 'desc'));
          const reviewsSnap = await getDocs(reviewsQuery);
          setRestaurantReviews(reviewsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review)));
        } catch (err) {
          handleFirestoreError(err, OperationType.LIST, 'restaurant_data_fetch');
        }
      };

      fetchRestaurantData();
    }
  }, [selectedRestaurant]);

  useEffect(() => {
    if (user) {
      const ordersRef = collection(db, 'orders');
      const ordersQuery = query(ordersRef, where('customerUid', '==', user.uid), orderBy('createdAt', 'desc'));
      
      const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
        const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        
        if (!isInitialOrdersLoad.current) {
          orders.forEach((order: any) => {
            const prevStatus = prevOrderStatuses.current[order.id];
            if (prevStatus && prevStatus !== order.status) {
              playSound('status');
              
              // If order was delivered, show review modal
              if (order.status === 'delivered' && prevStatus !== 'delivered') {
                setOrderToReview(order);
                setShowReviewModal(true);
              }
            }
          });
        }
        
        const newStatuses: Record<string, string> = {};
        orders.forEach((order: any) => {
          newStatuses[order.id] = order.status;
        });
        prevOrderStatuses.current = newStatuses;
        
        setActiveOrders(orders);
        isInitialOrdersLoad.current = false;
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'orders'));

      const ridesRef = collection(db, 'rides');
      const ridesQuery = query(
        ridesRef, 
        where('status', '!=', 'completed'),
        where('customerUids', 'array-contains', user.uid)
      );
      const unsubRides = onSnapshot(ridesQuery, (snapshot) => {
        setRides(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ride)));
      }, (err) => {
        // Ignore permission denied for rides if user is not in any ride
        const errCode = err.code || (err as any).code;
        if (errCode === 'permission-denied' || err.message?.toLowerCase().includes('permissions')) {
          console.log("User not in any active ride or permission denied, ignoring for rides list");
          setRides([]);
          return;
        }
        handleFirestoreError(err, OperationType.LIST, 'rides');
      });

      return () => {
        unsubscribe();
        unsubRides();
      };
    }
  }, [user]);

  const addToCart = (item: FoodItem, addOns?: AddOn[]) => {
    if (!user && !isGuest) {
      setTargetRole('customer');
      setAuthModalMessage('Crie sua conta ou faça login para adicionar produtos ao carrinho');
      setIsAuthModalOpen(true);
      return;
    }

    if (item.addOns && item.addOns.length > 0 && !addOns) {
      setSelectedProductForAddOns(item);
      setSelectedAddOns(item.addOns.filter(a => a.isFixed || false));
      return;
    }

    setCart(prev => {
      const existing = prev.find(i => 
        i.id === item.id && 
        JSON.stringify(i.selectedAddOns || []) === JSON.stringify(addOns || [])
      );
      if (existing) {
        return prev.map(i => 
          (i.id === item.id && JSON.stringify(i.selectedAddOns || []) === JSON.stringify(addOns || [])) 
          ? { ...i, quantity: i.quantity + 1 } 
          : i
        );
      }
      return [...prev, { ...item, quantity: 1, selectedAddOns: addOns }];
    });
    
    setSelectedProductForAddOns(null);
    setSelectedAddOns([]);
  };

  const removeFromCart = (itemId: string, selectedAddOns?: AddOn[]) => {
    setCart(prev => {
      const existing = prev.find(i => 
        i.id === itemId && 
        JSON.stringify(i.selectedAddOns || []) === JSON.stringify(selectedAddOns || [])
      );
      if (existing && existing.quantity > 1) {
        return prev.map(i => 
          (i.id === itemId && JSON.stringify(i.selectedAddOns || []) === JSON.stringify(selectedAddOns || [])) 
          ? { ...i, quantity: i.quantity - 1 } 
          : i
        );
      }
      return prev.filter(i => 
        !(i.id === itemId && JSON.stringify(i.selectedAddOns || []) === JSON.stringify(selectedAddOns || []))
      );
    });
  };

  const clearItemFromCart = (itemId: string, selectedAddOns?: AddOn[]) => {
    setCart(prev => prev.filter(i => 
      !(i.id === itemId && JSON.stringify(i.selectedAddOns || []) === JSON.stringify(selectedAddOns || []))
    ));
  };

  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  const attentionCount = useMemo(() => {
    // Ongoing orders (pending, deliveries happening or pending actions)
    const ongoingStatuses = ['pending', 'preparing', 'ready', 'delivering', 'en_route'];
    const ongoingCount = (activeOrders || []).filter(o => ongoingStatuses.includes(o.status)).length;
    
    // Total unread messages across all active orders
    const totalUnread = Object.values(unreadCounts).reduce((acc: number, count: number) => acc + count, 0);
    
    return ongoingCount + totalUnread;
  }, [activeOrders, unreadCounts]);

  // Unread Messages Logic - Stabilized to avoid Unexpected State assertion
  const messageUnsubsRef = useRef<Record<string, () => void>>({});

  useEffect(() => {
    if (!user) {
      (Object.values(messageUnsubsRef.current) as Array<() => void>).forEach(unsub => {
        if (typeof unsub === 'function') unsub();
      });
      messageUnsubsRef.current = {};
      return;
    }

    const orderIds = activeOrders.map(o => o.id);
    
    // Subscribe to new orders
    orderIds.forEach(orderId => {
      if (!messageUnsubsRef.current[orderId]) {
        console.log(`[Messages] Starting listener for order: ${orderId}`);
        const messagesRef = collection(db, 'orders', orderId, 'messages');
        const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(20));
        
        messageUnsubsRef.current[orderId] = onSnapshot(q, (snapshot) => {
          const newMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
          if (activeChatOrderId !== orderId) {
            const unread = newMessages.filter(m => m.senderUid !== user.uid).length;
            setUnreadCounts(prev => ({ ...prev, [orderId]: unread }));
          } else {
            setUnreadCounts(prev => ({ ...prev, [orderId]: 0 }));
          }
        }, (err) => {
          // Ignore permission-denied for individual order message lists
          if (err.code === 'permission-denied') return;
          handleFirestoreError(err, OperationType.LIST, `orders/${orderId}/messages`);
        });
      }
    });

    // Unsubscribe from orders no longer in activeOrders
    Object.keys(messageUnsubsRef.current).forEach(orderId => {
      if (!orderIds.includes(orderId)) {
        console.log(`[Messages] Stopping listener for order: ${orderId}`);
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

    return () => {
      // We don't cleanup everything here because we want to keep listeners across activeOrders changes
      // unless the user logs out or component unmounts entirely (handled by another useEffect or unmount)
    };
  }, [activeOrders.length, activeChatOrderId, user?.uid]);

  // Total cleanup on unmount
  useEffect(() => {
    return () => {
      (Object.values(messageUnsubsRef.current) as Array<() => void>).forEach(unsub => {
        if (typeof unsub === 'function') unsub();
      });
      messageUnsubsRef.current = {};
    };
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-600';
      case 'preparing': return 'bg-blue-100 text-blue-600';
      case 'ready': return 'bg-emerald-100 text-emerald-600';
      case 'delivering': return 'bg-indigo-100 text-indigo-600';
      case 'en_route': return 'bg-purple-100 text-purple-600';
      case 'delivered': 
      case 'cancelled': 
      case 'rejected': return 'bg-slate-400 text-white shadow-sm';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const getStatusLabel = (status: string, deliveryOption?: string) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'preparing': return 'Preparando';
      case 'ready': 
        return deliveryOption === 'pickup' ? 'Pronto para Retirada' : 'Entregador a caminho';
      case 'delivering': return 'Em Entrega';
      case 'en_route': return 'Em Rota (Motorista Chegando)';
      case 'delivered': return 'Finalizado';
      case 'cancelled': return 'Cancelado';
      case 'rejected': return 'Rejeitado';
      default: return status;
    }
  };

  const calculateDeliveryFee = () => {
    if (deliveryOption === 'pickup' as any) return 0;
    
    // Get all unique restaurants in cart
    const uniqueRestaurantIds = Array.from(new Set(cart.map(item => item.restaurantId)));
    const cartRestaurants = restaurants.filter(r => uniqueRestaurantIds.includes(r.id));
    
    if (deliveryOption === 'fast') {
      // TUPÃ Delivery: Sum of selected categories for each restaurant
      let totalTupaFee = 0;
      uniqueRestaurantIds.forEach((resId: any) => {
        const selectedCat = (selectedTupaCategories as any)[resId];
        if (selectedCat) {
          totalTupaFee += Number(selectedCat.valor_total || selectedCat.preco || selectedCat.valor || 0);
        } else {
          // Fallback to base value if no category selected/available yet
          totalTupaFee += globalSettings?.tupaDeliveryBaseValue || 7.00;
        }
      });
      return totalTupaFee;
    }
    
    // Store Delivery: Sum of each restaurant's fee
    let totalFee = 0;
    cartRestaurants.forEach(res => {
      if (res.isDeliveryFree) return;
      
      if (res.deliveryFeeType === 'fixed') {
        totalFee += res.deliveryFeePerKm || 0;
      } else if (res.deliveryFeeType === 'km' && userLocation && res.latitude && res.longitude) {
        const dist = calculateDistance(userLocation.latitude, userLocation.longitude, res.latitude, res.longitude);
        if (!(res.freeDeliveryKm && dist <= res.freeDeliveryKm)) {
          totalFee += dist * (res.deliveryFeePerKm || 0);
        }
      }
    });
    
    return totalFee;
  };

  const placeOrder = async (overrideProfile?: any) => {
    if (!user && !isGuest) {
      setTargetRole('customer');
      setAuthModalMessage('Crie sua conta ou faça login para finalizar seu pedido');
      setIsAuthModalOpen(true);
      return;
    }

    if (isGuest && !tableNumber) {
      setShowTableNumberModal(true);
      return;
    }

    if (cart.length === 0) {
      console.log("Cart empty");
      return;
    }

    // Ensure we have a payment method
    if (!selectedPaymentMethod) {
      setOrderStep('payment');
      return;
    }

    setIsOrdering(true);
    
    // Check if customer info is complete
    const currentProfile = overrideProfile || profile;

    // Check minimum order value per restaurant
    const uniqueRestaurantIds = Array.from(new Set(cart.map(item => item.restaurantId)));
    for (const resId of uniqueRestaurantIds) {
      const restaurant = restaurants.find(r => r.id === resId);
      if (restaurant && restaurant.minOrderValue && restaurant.minOrderValue > 0) {
        const restaurantItems = cart.filter(item => item.restaurantId === resId);
        const restaurantItemsTotal = restaurantItems.reduce((acc, item) => {
          const price = item.isFlashSale ? (isFlashSaleActive(item) ? (item.promoPrice || item.price) : item.price) : (item.promoPrice || item.price);
          const addOnsTotal = (item.selectedAddOns || []).reduce((sum, a) => sum + (a.price || 0), 0);
          return acc + ((price + addOnsTotal) * item.quantity);
        }, 0);
        
        if (restaurantItemsTotal < restaurant.minOrderValue) {
          setIsOrdering(false);
          alert(`Pedido mínimo para ${restaurant.name} é R$ ${restaurant.minOrderValue.toFixed(2)}. Seu pedido atual é R$ ${restaurantItemsTotal.toFixed(2)}.`);
          return;
        }
      }
    }

    if (!isGuest && (!currentProfile?.displayName || !currentProfile?.whatsapp || !currentProfile?.address || !currentProfile?.referencePoint)) {
      setIsOrdering(false);
      setCheckoutName(currentProfile?.displayName || '');
      setCheckoutWhatsapp(currentProfile?.whatsapp || '');
      setCheckoutAddress(currentProfile?.address || locationInfo || '');
      setCheckoutReferencePoint(currentProfile?.referencePoint || '');
      setShowCheckoutInfoModal(true);
      return;
    }

    try {
      const uniqueRestaurantIds = Array.from(new Set(cart.map(item => item.restaurantId)));
      const cartRestaurants = restaurants.filter(r => uniqueRestaurantIds.includes(r.id));
      
      const totalDeliveryFee = calculateDeliveryFee();
      const itemsTotal = cart.reduce((acc, item) => {
        const price = item.isFlashSale ? (isFlashSaleActive(item) ? (item.promoPrice || item.price) : item.price) : (item.promoPrice || item.price);
        const addOnsTotal = (item.selectedAddOns || []).reduce((sum, a) => sum + (a.price || 0), 0);
        return acc + ((price + addOnsTotal) * item.quantity);
      }, 0);
      const grandTotal = itemsTotal + totalDeliveryFee;

      const ordersRef = collection(db, 'orders');
      const orderIds: string[] = [];
      
      // We'll use the first restaurant's PIX config for the whole order if it's mixed
      // Or use central PIX if available
      const mainRestaurant = cartRestaurants[0];
      let pixKeyToUse = '';
      let pixTypeToUse = '';

      if (selectedPaymentMethod === 'pix') {
        if (mainRestaurant.pixConfigType === 'company') {
          pixKeyToUse = mainRestaurant.pixKey || '';
          pixTypeToUse = mainRestaurant.pixType || 'cpf';
        } else if (mainRestaurant.pixConfigType === 'central' || uniqueRestaurantIds.length > 1) {
          pixKeyToUse = globalSettings?.centralPixKey || '';
          pixTypeToUse = globalSettings?.centralPixType || 'cpf';
        }
      }

      // Create an order for each restaurant
      for (const resId of uniqueRestaurantIds) {
        const restaurant = restaurants.find(r => r.id === resId);
        if (!restaurant) continue;

        const restaurantItems = cart.filter(item => item.restaurantId === resId);
        const restaurantItemsTotal = restaurantItems.reduce((acc, item) => {
          const price = item.isFlashSale ? (isFlashSaleActive(item) ? (item.promoPrice || item.price) : item.price) : (item.promoPrice || item.price);
          return acc + (price * item.quantity);
        }, 0);

        // Calculate this restaurant's portion of delivery fee
        let resDeliveryFee = 0;
        let tupaCategoryData = null;

        if (deliveryOption === 'fast') {
          // Garante que tupaCategoryData seja preenchido mesmo que o estado esteja momentaneamente vazio
          // Tenta pegar a categoria selecionada, se não houver, pega a primeira disponível nas estimativas
          let selectedCat = (selectedTupaCategories as any)[restaurant.id];
          
          if (!selectedCat && tupaEstimates[restaurant.id] && tupaEstimates[restaurant.id].length > 0) {
            selectedCat = tupaEstimates[restaurant.id][0];
          }

          if (selectedCat) {
            resDeliveryFee = Number(selectedCat.valor_total || selectedCat.preco || selectedCat.valor || 0);
            tupaCategoryData = {
              id: selectedCat.id || selectedCat.categoria_id,
              name: selectedCat.nome || selectedCat.categoria_nome,
              distance: Number(selectedCat.distancia || selectedCat.km_distancia || 0),
              price: resDeliveryFee
            };
          } else {
            // Fallback total se não houver estimativas
            resDeliveryFee = globalSettings?.tupaDeliveryBaseValue || 7.00;
            tupaCategoryData = {
              id: 'default',
              name: globalSettings?.tupaDeliveryName || 'Xô Fome Entrega',
              distance: 0,
              price: resDeliveryFee
            };
          }
        } else if (deliveryOption !== 'pickup') {
          if (!restaurant.isDeliveryFree) {
            if (restaurant.deliveryFeeType === 'fixed') {
              resDeliveryFee = restaurant.deliveryFeePerKm || 0;
            } else if (restaurant.deliveryFeeType === 'km' && userLocation && restaurant.latitude && restaurant.longitude) {
              const dist = calculateDistance(userLocation.latitude, userLocation.longitude, restaurant.latitude, restaurant.longitude);
              if (!(restaurant.freeDeliveryKm && dist <= restaurant.freeDeliveryKm)) {
                resDeliveryFee = dist * (restaurant.deliveryFeePerKm || 0);
              }
            }
          }
        }

        const orderData = {
          restaurantId: restaurant.id,
          restaurantOwnerUid: restaurant.ownerUid || '',
          restaurantName: restaurant.name || 'Restaurante',
          restaurantLogo: restaurant.imageUrl || '',
          customerUid: user?.uid || currentProfile?.uid || 'guest',
          customerName: overrideProfile?.displayName || currentProfile?.displayName || user?.displayName || 'Visitante',
          customerWhatsapp: overrideProfile?.whatsapp || currentProfile?.whatsapp || '',
          items: restaurantItems.map(item => ({
            id: item.id,
            name: item.name || 'Produto',
            price: item.isFlashSale ? (isFlashSaleActive(item) ? (item.promoPrice || item.price) : item.price) : (item.promoPrice || item.price),
            quantity: item.quantity,
            imageUrl: item.imageUrl || '',
            selectedAddOns: item.selectedAddOns || [],
            restaurantId: item.restaurantId,
            restaurantName: (item as any).restaurantName || restaurant.name || ''
          })),
          total: restaurantItemsTotal + resDeliveryFee,
          deliveryFee: resDeliveryFee,
          tupaCategory: tupaCategoryData,
          status: 'pending',
          paymentMethod: selectedPaymentMethod || 'cash',
          deliveryOption: isGuest ? 'pickup' : (deliveryOption || 'normal'),
          customerTupaNote: deliveryOption === 'fast' ? `o cliente selecionou esta categoria ${tupaCategoryData?.name || 'Xô Fome'} e está ciente que o valor ser pago a mais no pedido é de R$ ${resDeliveryFee.toFixed(2)}` : null,
          tableNumber: (isGuest || deliveryOption === 'pickup') ? (tableNumber || '') : null,
          pixKey: pixKeyToUse || '',
          pixType: pixTypeToUse || 'cpf',
          city: activeCity?.name || '',
          deliveryAddress: overrideProfile?.address || currentProfile?.address || 'Endereço não informado',
          deliveryReferencePoint: overrideProfile?.referencePoint || currentProfile?.referencePoint || '',
          customerLocation: userLocation || null,
          createdAt: serverTimestamp(),
          isMixedOrder: uniqueRestaurantIds.length > 1,
          parentTotal: grandTotal // Store the total the user actually paid
        };

        const docRef = await addDoc(ordersRef, orderData);
        orderIds.push(docRef.id);

        // Salva a cidade ativa no cadastro do cliente se ele estiver logado
        if (user?.uid && activeCity) {
          try {
            await updateProfileData({ cityId: activeCity.id, city: activeCity.name });
            console.log(`[CustomerView] Cidade salva no cadastro do cliente ao fazer pedido: ${activeCity.name}`);
          } catch (profileError) {
            console.error("Erro ao salvar cidade no perfil do usuário no pedido:", profileError);
          }
        }

        // Salva automaticamente o endereço do pedido nos endereços salvos do perfil se o usuário estiver logado
        if (user?.uid && orderIds.length === 1) {
          try {
            const deliveryAddressStr = orderData.deliveryAddress;
            const customerLocation = orderData.customerLocation;
            if (deliveryAddressStr && deliveryAddressStr !== 'Endereço não informado') {
              // 1. Buscamos do Firestore todas as localizações já salvas pelo usuário para verificar duplicados
              const addrQuery = query(collection(db, `users/${user.uid}/addresses`));
              const addrSnap = await getDocs(addrQuery);
              const existingAddrs = addrSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as any));

              const isAlreadySaved = existingAddrs.some(addr => 
                addr.fullAddress && addr.fullAddress.toLowerCase().trim() === deliveryAddressStr.toLowerCase().trim()
              );
              
              if (!isAlreadySaved) {
                // 2. Extrai um nome curto simples do endereço (ex: primeira parte antes da vírgula)
                const shortAddr = deliveryAddressStr.split(',')[0].trim();
                const neighborhood = deliveryAddressStr.split(',')[2]?.trim() || '';
                
                // 3. Define todos os outros endereços como isCurrent: false se formos salvar o novo como atual
                const currentQuery = query(collection(db, `users/${user.uid}/addresses`), where("isCurrent", "==", true));
                const currentSnap = await getDocs(currentQuery);
                const updateBatches = currentSnap.docs.map(docSnap => updateDoc(docSnap.ref, { isCurrent: false }));
                if (updateBatches.length > 0) await Promise.all(updateBatches);

                await addDoc(collection(db, `users/${user.uid}/addresses`), {
                  name: shortAddr,
                  shortAddress: shortAddr,
                  neighborhood: neighborhood,
                  fullAddress: deliveryAddressStr,
                  latitude: customerLocation ? customerLocation.latitude : -8.7618,
                  longitude: customerLocation ? customerLocation.longitude : -63.9039,
                  isCurrent: true,
                  createdAt: serverTimestamp()
                });
                
                console.log("[CustomerView] Novo endereço do pedido salvo com sucesso em endereços salvos do perfil.");
                await fetchSavedAddresses();
              } else {
                // Se já estiver salvo na lista de endereços, apenas marcamos como atual/isCurrent se ainda não for
                const matchingAddr = existingAddrs.find(addr => 
                  addr.fullAddress && addr.fullAddress.toLowerCase().trim() === deliveryAddressStr.toLowerCase().trim()
                );
                if (matchingAddr && !matchingAddr.isCurrent) {
                  const currentQuery = query(collection(db, `users/${user.uid}/addresses`), where("isCurrent", "==", true));
                  const currentSnap = await getDocs(currentQuery);
                  const updateBatches = currentSnap.docs.map(docSnap => updateDoc(docSnap.ref, { isCurrent: false }));
                  if (updateBatches.length > 0) await Promise.all(updateBatches);

                  await updateDoc(doc(db, `users/${user.uid}/addresses`, matchingAddr.id), {
                    isCurrent: true
                  });
                  console.log("[CustomerView] Endereço do pedido existente atualizado como atual do perfil.");
                  await fetchSavedAddresses();
                }
              }
            }
          } catch (addrError) {
            console.error("Erro ao salvar endereço automático do pedido:", addrError);
          }
        }

        // Optimistic update for orders list
        setOptimisticOrders(prev => [...prev, { id: docRef.id, ...orderData, createdAt: new Date() }]);
      }

      if (selectedPaymentMethod === 'pix') {
        // Use the first order ID for the PIX generation (it represents the whole batch)
        const mainOrderId = orderIds[0];
        
        if (globalSettings?.splitPayEnabled && mainRestaurant.splitPayConfig?.active && globalSettings?.mercadoPagoAccessToken) {
          setIsGeneratingOrderPix(true);
          try {
            const response = await fetch('/api/create-pix', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                amount: grandTotal,
                description: `Pedido #${mainOrderId} - ${uniqueRestaurantIds.length > 1 ? 'Múltiplos Restaurantes' : mainRestaurant.name}`,
                email: user.email || 'pagamentos@aifood.com',
                firstName: profile?.displayName?.split(' ')[0] || 'Cliente',
                lastName: profile?.displayName?.split(' ').slice(1).join(' ') || 'Fiel',
                accessToken: globalSettings.mercadoPagoAccessToken,
                orderId: mainOrderId
              })
            });
            const data = await response.json();
            if (response.ok) {
              const pixData = {
                id: data.id,
                qrCode: data.point_of_interaction.transaction_data.qr_code,
                qrCodeBase64: data.point_of_interaction.transaction_data.qr_code_base64,
                amount: grandTotal
              };
              setActiveOrderPix(pixData);
              startPollingOrderPayment(data.id, orderIds, mainRestaurant.id, grandTotal);
            } else {
              // Fallback
              if (pixKeyToUse) {
                setPlacedOrder({ id: mainOrderId, total: grandTotal, pixKey: pixKeyToUse, pixType: pixTypeToUse });
                setShowPixInfo(true);
              }
            }
          } catch (error) {
            console.error("Error generating MP Pix:", error);
            if (pixKeyToUse) {
              setPlacedOrder({ id: mainOrderId, total: grandTotal, pixKey: pixKeyToUse, pixType: pixTypeToUse });
              setShowPixInfo(true);
            }
          } finally {
            setIsGeneratingOrderPix(false);
          }
        } else if (pixKeyToUse) {
          setPlacedOrder({ id: orderIds[0], total: grandTotal, pixKey: pixKeyToUse, pixType: pixTypeToUse });
          setShowPixInfo(true);
        }
      }

      try {
        // Decrement stock and increment orderCount
        for (const item of cart) {
          const product = allProducts.find(p => p.id === item.id);
          if (product) {
            const updates: any = {};
            if (product.stock !== undefined && product.stock !== null) {
              updates.stock = Math.max(0, product.stock - item.quantity);
            }
            updates.orderCount = (product.orderCount || 0) + item.quantity;
            await updateDoc(doc(db, 'food_items', item.id), updates);
          }
        }
      } catch (stockError) {
        console.error("Error updating stock:", stockError);
      }
      
      setCart([]);
      setTableNumber('');
      setIsCartOpen(false);
      setOrderStep('idle');
      setSelectedPaymentMethod('');
      setView('orders');
      
      // Auto-open chat for the first order and send automatic message
      if (orderIds.length > 0) {
        const firstOrderId = orderIds[0];
        setActiveChatOrderId(firstOrderId);
        
        // Send automatic message from restaurant for each order
        for (let i = 0; i < orderIds.length; i++) {
          const oId = orderIds[i];
          const currentResId = uniqueRestaurantIds[i] || uniqueRestaurantIds[0];
          const restaurant = cartRestaurants.find(r => r.id === currentResId);
          
          try {
            // Get order total to display in the PIX message
            const orderDoc = await getDoc(doc(db, 'orders', oId));
            const orderData = orderDoc.data();
            const total = orderData?.total || 0;

            let welcomeText = 'Oi tudo bem? estamos no aguardo do pagamento do seu pedido!';
            let pixData = null;

            if (selectedPaymentMethod === 'pix') {
              let key = '';
              let type = '';
              let receiver = '';

              if (restaurant?.pixConfigType === 'company') {
                key = restaurant.pixKey || '';
                type = restaurant.pixType || 'cpf';
                receiver = restaurant.pixReceiver || '';
              } else if (restaurant?.pixConfigType === 'central' || uniqueRestaurantIds.length > 1) {
                key = globalSettings?.centralPixKey || '';
                type = globalSettings?.centralPixType || 'cpf';
                receiver = globalSettings?.centralPixReceiver || '';
              }

              if (key) {
                welcomeText += `\n\nEssa é a nossa chave PIX para o valor de R$ ${total.toFixed(2)}:\n\n${key}\n(${type.toUpperCase()})`;
                if (receiver) {
                  welcomeText += `\n\nDestinatário: ${receiver}`;
                }
                pixData = { key, type, amount: total, receiver };
              }
            }

            await addDoc(collection(db, 'orders', oId, 'messages'), {
              orderId: oId,
              senderUid: restaurant?.ownerUid || 'system',
              senderName: restaurant?.name || 'Empresa',
              text: welcomeText,
              pixInfo: pixData,
              createdAt: serverTimestamp()
            });
          } catch (msgErr) {
            console.error("Error sending auto message:", msgErr);
          }
        }
      }

      playSound('order');
      
      // Clear optimistic orders after a delay to allow Firestore to sync
      setTimeout(() => {
        setOptimisticOrders([]);
      }, 5000);
      
    } catch (error) {
      console.error("Error placing order:", error);
      handleFirestoreError(error, OperationType.CREATE, 'orders');
    } finally {
      setIsOrdering(false);
    }
  };

  const handleReviewMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit size to 5MB for base64 storage
    if (file.size > 5 * 1024 * 1024) {
      alert('O arquivo é muito grande. O limite é 5MB.');
      return;
    }

    setIsUploadingReviewMedia(true);
    try {
      const isVideo = file.type.startsWith('video/');
      
      if (!isVideo && file.type.startsWith('image/')) {
        const compressed = await compressImage(file, 600, 600, 0.6);
        setNewReviewMedia({ url: compressed, type: 'image' });
      } else if (isVideo) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setNewReviewMedia({ url: reader.result as string, type: 'video' });
        };
        reader.readAsDataURL(file);
      } else {
        alert('Formato de arquivo não suportado. Use imagens ou vídeos.');
      }
    } catch (error) {
      console.error("Error uploading media:", error);
      alert('Erro ao processar o arquivo.');
    } finally {
      setIsUploadingReviewMedia(false);
    }
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isGuest) {
      setAuthModalMessage('Crie sua conta ou faça login para deixar uma avaliação');
      setIsAuthModalOpen(true);
      return;
    }
    
    try {
      const reviewsRef = collection(db, 'reviews');
      const restaurantId = orderToReview?.restaurantId || selectedRestaurant?.id;

      if (!restaurantId) return;

      // Check if user already reviewed this restaurant (if not editing)
      if (!editingReviewId && !selectedProductForReview) {
        const existingReview = restaurantReviews.find(r => r.customerUid === user.uid && !r.productId);
        if (existingReview) {
          alert('Você já avaliou esta empresa. Você pode editar sua avaliação existente.');
          return;
        }
      }
      
      const reviewData = {
        restaurantId,
        customerUid: user.uid,
        customerName: profile?.displayName || user.displayName || 'Cliente',
        customerEmail: user.email || '',
        customerPhone: profile?.whatsapp || '',
        rating: newReviewRating,
        comment: newReviewComment,
        mediaUrl: newReviewMedia?.url || null,
        mediaType: newReviewMedia?.type || null,
        updatedAt: serverTimestamp()
      };

      if (editingReviewId) {
        await updateDoc(doc(db, 'reviews', editingReviewId), reviewData);
      } else {
        // 1. Add Restaurant Review
        if (newReviewComment && !selectedProductForReview) {
          await addDoc(reviewsRef, {
            ...reviewData,
            createdAt: serverTimestamp()
          });
        }

        // 2. Add Product Reviews
        const productIds = Object.keys(productRatings);
        for (const pid of productIds) {
          if (productRatings[pid] > 0) {
            await addDoc(reviewsRef, {
              restaurantId,
              productId: pid,
              customerUid: user.uid,
              customerName: profile?.displayName || user.displayName || 'Cliente',
              customerEmail: user.email || '',
              customerPhone: profile?.whatsapp || '',
              rating: productRatings[pid],
              comment: productComments[pid] || '',
              createdAt: serverTimestamp()
            });
          }
        }
      }

      setNewReviewComment('');
      setNewReviewRating(5);
      setNewReviewMedia(null);
      setEditingReviewId(null);
      setProductRatings({});
      setProductComments({});
      setSelectedProductForReview(null);
      setShowReviewModal(false);
      setOrderToReview(null);
      
      if (!editingReviewId) {
        setView('home');
        setSelectedRestaurant(null);
        setIsCartOpen(false);
        setOrderStep('idle');
        alert('Obrigado pelas suas avaliações!');
      } else {
        alert('Avaliação atualizada com sucesso!');
      }
    } catch (error) {
      handleFirestoreError(error, editingReviewId ? OperationType.UPDATE : OperationType.CREATE, 'reviews');
    }
  };

  const handleDeleteReview = async (review: Review) => {
    try {
      await deleteDoc(doc(db, 'reviews', review.id));
      setReviewToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `reviews/${review.id}`);
    }
  };

  const getAverageRating = (id: string, isProduct: boolean, manualRating?: number) => {
    const relevantReviews = allReviews.filter(r => isProduct ? r.productId === id : (r.restaurantId === id && !r.productId));
    
    // Prioritize manual rating if provided (admin override)
    if (manualRating !== undefined && manualRating !== null) {
      return { rating: manualRating.toFixed(1), count: relevantReviews.length };
    }
    
    if (relevantReviews.length === 0) return { rating: "0.0", count: 0 };
    
    const sum = relevantReviews.reduce((acc, r) => acc + r.rating, 0);
    const avg = sum / relevantReviews.length;
    return { rating: avg.toFixed(1), count: relevantReviews.length };
  };

  const isNewRestaurant = (createdAt: any) => {
    if (!createdAt) return false;
    const createdDate = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return createdDate > oneWeekAgo;
  };

  const StarRating = ({ ratingData, size = 12, variant = 'stars', onClick }: { ratingData: { rating: string; count: number }; size?: number; variant?: 'stars' | 'numeric'; onClick?: (e: React.MouseEvent) => void }) => {
    const r = parseFloat(ratingData.rating);
    
    if (variant === 'numeric') {
      return (
        <div 
          onClick={onClick}
          className={`flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full ${onClick ? 'cursor-pointer hover:bg-slate-200' : ''}`}
        >
          <span className="text-[10px] font-black text-slate-700 dark:text-slate-200">
            {ratingData.rating}⭐
          </span>
        </div>
      );
    }

    return (
      <div 
        onClick={onClick}
        className={`flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg ${onClick ? 'cursor-pointer hover:bg-slate-200' : ''}`}
      >
        <div className="flex items-center">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star 
              key={star}
              size={size} 
              fill={r >= star ? "#fbbf24" : "none"} 
              className={r >= star ? "text-amber-400" : "text-slate-300 dark:text-slate-600"} 
            />
          ))}
        </div>
        <span className="text-[10px] font-black text-slate-700 dark:text-slate-200">
          {ratingData.count === 0 ? "Novo" : `${ratingData.rating} (${ratingData.count})`}
        </span>
      </div>
    );
  };

  const isFlashSaleActive = (item: FoodItem) => {
    if (!item.isFlashSale || !item.flashSaleStart) return false;
    
    const startTime = item.flashSaleStart.toDate ? item.flashSaleStart.toDate().getTime() : new Date(item.flashSaleStart).getTime();
    const now = new Date().getTime();
    const fiveHoursInMs = 5 * 60 * 60 * 1000;
    
    return (now - startTime) < fiveHoursInMs;
  };

  const FlashSaleTimer = ({ item }: { item: FoodItem }) => {
    const [timeLeft, setTimeLeft] = useState<string>('');

    useEffect(() => {
      const updateTimer = () => {
        if (!item.flashSaleStart) return;
        
        const startTime = item.flashSaleStart.toDate ? item.flashSaleStart.toDate().getTime() : new Date(item.flashSaleStart).getTime();
        const now = new Date().getTime();
        const fiveHoursInMs = 5 * 60 * 60 * 1000;
        const endTime = startTime + fiveHoursInMs;
        const diff = endTime - now;

        if (diff <= 0) {
          setTimeLeft('Encerrado');
          return;
        }

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }, [item.flashSaleStart]);

    return (
      <div className="flex items-center space-x-1 text-[10px] font-black text-orange-500 bg-orange-50 dark:bg-orange-950/30 px-2 py-1 rounded-lg border border-orange-100 dark:border-orange-900/30">
        <Clock size={10} className="animate-pulse" />
        <span>{timeLeft}</span>
      </div>
    );
  };

  useEffect(() => {
    if (banners.length > 0 && !sessionStorage.getItem('bannerPopupShown')) {
      setShowBannerPopup(banners[0]);
    }
  }, [banners]);

  useEffect(() => {
    if (marketingPopups.length > 0 && !sessionStorage.getItem('popupShown')) {
      setShowPopup(marketingPopups[0]);
    }
  }, [marketingPopups]);

  const handleCloseBannerPopup = () => {
    setShowBannerPopup(null);
    sessionStorage.setItem('bannerPopupShown', 'true');
  };

  const handleCloseMarketingPopup = () => {
    setShowPopup(null);
    sessionStorage.setItem('popupShown', 'true');
  };

  const cartTotal = cart.reduce((acc, item) => {
    const price = item.isFlashSale ? (isFlashSaleActive(item) ? (item.promoPrice || item.price) : item.price) : (item.promoPrice || item.price);
    const addOnsTotal = (item.selectedAddOns || []).reduce((sum, addon) => sum + (addon.price || 0), 0);
    return acc + ((price + addOnsTotal) * item.quantity);
  }, 0);

  const restaurantsWithUnmetMinOrder = useMemo(() => {
    const uniqueRestaurantIds = Array.from(new Set(cart.map(item => item.restaurantId)));
    return uniqueRestaurantIds.map(resId => {
      const restaurant = restaurants.find(r => r.id === resId);
      if (!restaurant) return null;
      if (!restaurant.minOrderValue || restaurant.minOrderValue <= 0) return null;
      
      const resItems = cart.filter(item => item.restaurantId === resId);
      const resItemsTotal = resItems.reduce((acc, item) => {
        const price = item.isFlashSale ? (isFlashSaleActive(item) ? (item.promoPrice || item.price) : item.price) : (item.promoPrice || item.price);
        const addOnsTotal = (item.selectedAddOns || []).reduce((sum, addon) => sum + (addon.price || 0), 0);
        return acc + ((price + addOnsTotal) * item.quantity);
      }, 0);
      
      if (resItemsTotal < restaurant.minOrderValue) {
        return {
          id: resId,
          name: restaurant.name,
          minOrderValue: restaurant.minOrderValue,
          currentTotal: resItemsTotal
        };
      }
      return null;
    }).filter(Boolean) as { id: string; name: string; minOrderValue: number; currentTotal: number }[];
  }, [cart, restaurants, currentTime]);

  const hasUnmetMinOrder = restaurantsWithUnmetMinOrder.length > 0;

  const isMixedOrder = new Set(cart.map(item => item.restaurantId)).size > 1;
  const uniqueRestaurantsInCart = useMemo(() => {
    const restaurantIds = Array.from(new Set(cart.map(item => item.restaurantId)));
    return restaurants.filter(r => restaurantIds.includes(r.id));
  }, [cart, restaurants]);

  const handleNavigateToRestaurant = (restaurantId: string) => {
    const restaurant = restaurants.find(r => r.id === restaurantId);
    if (restaurant) {
      setSelectedRestaurant(restaurant);
      setIsCartOpen(false);
      setRestaurantSearchTerm('');
      setRestaurantActiveCategory('Todos');
      setIsRestaurantSearchOpen(false);
      setView('restaurant');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

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

  const isTupaDeliveryDisabled = useMemo(() => {
    if (!userLocation || !globalSettings?.tupaDeliveryMaxDistance) return false;
    
    const uniqueRestaurantIds = Array.from(new Set(cart.map(item => item.restaurantId)));
    const cartRestaurants = restaurants.filter(r => uniqueRestaurantIds.includes(r.id));
    
    return cartRestaurants.some(res => {
      if (!res.latitude || !res.longitude) return false;
      const dist = calculateDistance(userLocation.latitude, userLocation.longitude, res.latitude, res.longitude);
      return dist > (globalSettings.tupaDeliveryMaxDistance || 50);
    });
  }, [userLocation, globalSettings, cart, restaurants]);

  const getEstimatedDeliveryTime = () => {
    if (deliveryOption === 'fast') {
      return globalSettings?.tupaDeliveryEstimatedTime || '25-40 min';
    }
    
    // For store delivery, if mixed order, we should probably show the longest time
    const uniqueRestaurantIds = Array.from(new Set(cart.map(item => item.restaurantId)));
    const cartRestaurants = restaurants.filter(r => uniqueRestaurantIds.includes(r.id));
    
    if (cartRestaurants.length === 0) return '30-45 min';
    
    let maxTime = 0;
    cartRestaurants.forEach(res => {
      if (!userLocation || !res.latitude || !res.longitude) {
        maxTime = Math.max(maxTime, 45);
        return;
      }
      const dist = calculateDistance(userLocation.latitude, userLocation.longitude, res.latitude, res.longitude);
      const prepTime = cart.filter(item => item.restaurantId === res.id).reduce((max, item) => Math.max(max, item.preparationTimeMinutes || 0), 0) || 20;
      const totalMin = 15 + Math.round(dist * 5) + prepTime;
      maxTime = Math.max(maxTime, totalMin);
    });
    
    return `${maxTime}-${maxTime + 15} min`;
  };

  const filteredRestaurants = useMemo(() => {
    let filtered = cityRestaurants.filter(r => {
      const matchesSearch = !searchTerm || 
                           r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (r.modality && r.modality.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesModality = activeModality === 'Todos' || 
                             (activeModality === 'Famosos' ? (r.isFamous || parseFloat(getAverageRating(r.id, false, r.rating).rating) >= 5.0) : (r.modality && r.modality.toLowerCase() === activeModality.toLowerCase()));
      
      // Check if restaurant is active based on balance/subscription
      if (profile?.role === 'admin' && allWallets.length > 0 && allUsers.length > 0) {
        const ownerWallet = allWallets.find(w => w.ownerUid === r.ownerUid);
        const ownerProfile = allUsers.find(u => u.uid === r.ownerUid);
        const minBalance = globalSettings?.minWalletBalance || 5;
        
        const isOwnerAdmin = ownerProfile?.role === 'admin';
        const hasBalance = isOwnerAdmin || (ownerWallet && ownerWallet.balance >= minBalance);
        const hasActiveSubscription = isOwnerAdmin || ownerProfile?.subscriptionStatus === 'active' || ownerProfile?.subscriptionStatus === 'trial';
        
        const isFinanciallyActive = isOwnerAdmin || hasBalance || hasActiveSubscription;
        if (!isFinanciallyActive) return false;
      }
      
      return matchesSearch && matchesModality;
    });

    // Sorting
    return filtered.sort((a, b) => {
      // Manual Ranking first
      if ((a.ranking || 0) !== (b.ranking || 0)) {
        return (b.ranking || 0) - (a.ranking || 0);
      }

      const openA = isRestaurantOpen(a, currentTime);
      const openB = isRestaurantOpen(b, currentTime);

      // Open restaurants first
      if (openA && !openB) return -1;
      if (!openA && openB) return 1;

      if (sortBy === 'rated') {
        const ratingA = parseFloat(getAverageRating(a.id, false, a.rating).rating);
        const ratingB = parseFloat(getAverageRating(b.id, false, b.rating).rating);
        return ratingB - ratingA;
      }

      if (sortBy === 'closest' && userLocation && a.latitude && a.longitude && b.latitude && b.longitude) {
        const distA = calculateDistance(userLocation.latitude, userLocation.longitude, a.latitude, a.longitude);
        const distB = calculateDistance(userLocation.latitude, userLocation.longitude, b.latitude, b.longitude);
        return distA - distB;
      }

      return 0;
    });
  }, [cityRestaurants, searchTerm, activeModality, profile, allWallets, allUsers, globalSettings, sortBy, userLocation]);

  useEffect(() => {
    if (selectedRestaurant) {
      setActiveCategory('Todos');
      setSearchTerm('');
    }
  }, [selectedRestaurant]);

  const filteredCategories = useMemo(() => {
    // Nós NÃO filtramos as categorias para ocultá-las se não houver produtos na cidade ativa.
    // O usuário deseja que todas as categorias salvas no front-end (lanches, bebidas, etc) e banco apareçam sempre.
    let baseCategories = categories;

    return baseCategories.filter(cat => {
      if (!cat || !cat.id) return false;
      // Garante que a categoria está ativa
      if (cat.status === 'inactive' || cat.active === false) return false;

      // Busca todos os cronogramas (schedules) que incluem esta categoria
      const catSchedules = categorySchedules.filter(s => s && Array.isArray(s.categoryIds) && s.categoryIds.includes(cat.id));
      
      // Se não houver cronogramas configurados para esta categoria, ela está sempre visível
      if (catSchedules.length === 0) return true;

      // Se houver cronogramas, verifica se há algum ativo no ciclo atual
      return activeSchedulesMemo.some(s => s && Array.isArray(s.categoryIds) && s.categoryIds.includes(cat.id));
    });
  }, [categories, categorySchedules, activeSchedulesMemo]);

  // Debug logging for product visibility
  useEffect(() => {
    if (commonData.isLoaded) {
      console.log('--- Product Visibility Debug ---');
      console.log('Total Products in DB:', commonData.foodItems.length);
      console.log('Total Restaurants in DB:', commonData.restaurants.length);
      if (commonData.restaurants.length > 0) {
        console.log('Restaurants Cities:', commonData.restaurants.map(r => `${r.name}: ${r.city || 'NO CITY'} (${r.cityId || 'NO ID'})`).join(', '));
      }
      console.log('Active City:', activeCity?.name, `(${activeCity?.id})`);
      console.log('Active Categories:', filteredCategories.map(c => c.name).join(', '));
      console.log('Restaurants in Active City:', cityRestaurants.length);
      console.log('Products in Active City:', cityProducts.length);
      console.log('Featured Products (Paid):', featuredProducts.length);
      console.log('Featured Products (Scheduled):', featuredProductsBySchedule.reduce((acc, s) => acc + s.products.length, 0));
      if (featuredProducts.length > 0) {
        console.log('Sample Featured Product:', featuredProducts[0].name, 'Highlight Until:', featuredProducts[0].highlightUntil);
      }
      if (activeSchedulesMemo.length > 0) {
        console.log('Active Schedules:', activeSchedulesMemo);
      }
      
      if (cityProducts.length === 0 && commonData.foodItems.length > 0) {
        console.warn('WARNING: Products exist but none match the active city/restaurants!');
        const resIds = new Set(cityRestaurants.map(r => r.id));
        const activeResIds = new Set(cityRestaurants.filter(r => r.status === 'active').map(r => r.id));
        const sampleProduct = commonData.foodItems[0];
        const sampleRes = commonData.restaurants.find(r => r.id === sampleProduct.restaurantId);
        console.log('Sample Product Restaurant ID:', sampleProduct.restaurantId);
        console.log('Sample Restaurant City Name:', sampleRes?.city || 'NOT SET');
        console.log('Sample Restaurant City ID:', sampleRes?.cityId || 'NOT SET');
        console.log('Is Sample Product in City Restaurants?', resIds.has(sampleProduct.restaurantId));
        console.log('Is Sample Product in ACTIVE City Restaurants?', activeResIds.has(sampleProduct.restaurantId));
        
        if (!sampleRes?.city && !sampleRes?.cityId) {
          console.warn(`CRITICAL WARNING: Restaurant ${sampleRes?.name} has NO city or cityId assigned! It will not show up in any city view.`);
        }
        
        if (resIds.has(sampleProduct.restaurantId) && !activeResIds.has(sampleProduct.restaurantId)) {
          const res = cityRestaurants.find(r => r.id === sampleProduct.restaurantId);
          console.warn(`WARNING: Restaurant ${res?.name} is in the city but its status is ${res?.status}! Only active restaurants show products.`);
        }
      }
      console.log('--------------------------------');
    }
  }, [commonData, activeCity, cityRestaurants, cityProducts, filteredCategories]);

  const filteredRestaurantMenu = useMemo(() => {
    // We should NOT filter by global categories when viewing a specific restaurant, 
    // unless the user has explicitly selected a category within that restaurant's menu.
    let filtered = [...restaurantMenu];
    
    const term = restaurantSearchTerm.toLowerCase();
    if (term) {
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(term) || 
        item.description?.toLowerCase().includes(term) ||
        item.category?.toLowerCase().includes(term)
      );
    }
    
    if (restaurantActiveCategory !== 'Todos') {
      filtered = filtered.filter(item => item.category === restaurantActiveCategory);
    }
    
    return filtered;
  }, [restaurantMenu, restaurantSearchTerm, restaurantActiveCategory, filteredCategories]);

  const restaurantCategories = useMemo(() => {
    const catsInMenu = new Set(restaurantMenu.map(item => item.category).filter(Boolean));
    return filteredCategories.filter(cat => catsInMenu.has(cat.name));
  }, [restaurantMenu, filteredCategories]);

  const filteredProducts = useMemo(() => {
    const activeCategoryNames = new Set(filteredCategories.map(c => c.name));
    
    const results = cityProducts.filter(product => {
      // Se houver uma categoria ativa selecionada no slider (diferente de 'Todos'), filtramos estritamente por ela
      if (activeCategory !== 'Todos') {
        const prodCat = (product.category || '').toLowerCase().trim();
        const activeCat = activeCategory.toLowerCase().trim();
        const matchedCatObj = categories.find(c => c.name.toLowerCase().trim() === activeCat);
        const matchedCatId = matchedCatObj?.id?.toLowerCase().trim();
        
        if (prodCat !== activeCat && (!matchedCatId || prodCat !== matchedCatId)) {
          return false;
        }
      }

      // Se a categoria do produto estiver explicitamente inativa globalmente, não mostramos
      if (product.category) {
        const prodCatLower = product.category.toLowerCase().trim();
        const isGlobalCatActive = categories.some(c => 
          (c.name.toLowerCase().trim() === prodCatLower || c.id.toLowerCase().trim() === prodCatLower) &&
          c.status !== 'inactive' && c.active !== false
        );
        // Só desconsideramos o produto se ele pertencer a uma categoria cadastrada que está desativada
        const categoryExists = categories.some(c => c.name.toLowerCase().trim() === prodCatLower || c.id.toLowerCase().trim() === prodCatLower);
        if (categoryExists && !isGlobalCatActive) {
          return false;
        }
      }

      const matchesSearch = !searchTerm || 
                           product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           product.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(product.category);
      const matchesPrice = maxPrice === null || (product.promoPrice || product.price) <= maxPrice;
      
      let matchesDistance = true;
      if (distanceFilter && userLocation) {
        const res = cityRestaurants.find(r => r.id === product.restaurantId);
        if (res && res.latitude && res.longitude) {
          const dist = calculateDistance(userLocation.latitude, userLocation.longitude, res.latitude, res.longitude);
          matchesDistance = dist <= distanceFilter;
        } else {
          matchesDistance = false;
        }
      }

      return matchesSearch && matchesCategory && matchesPrice && matchesDistance;
    });

    // Fuzzy search for suggestions
    if (results.length === 0 && searchTerm.length > 2) {
      let bestMatch: string | null = null;
      let highestSim = 0;
      
      allProducts.forEach(p => {
        const sim = getSimilarity(searchTerm, p.name);
        if (sim > highestSim && sim > 0.6) {
          highestSim = sim;
          bestMatch = p.name;
        }
      });
      
      if (bestMatch && bestMatch.toLowerCase() !== searchTerm.toLowerCase()) {
        setSearchSuggestion(bestMatch);
      } else {
        setSearchSuggestion(null);
      }
    } else {
      setSearchSuggestion(null);
    }

    // Sorting
    return results.sort((a, b) => {
      const resA = restaurants.find(r => r.id === a.restaurantId);
      const resB = restaurants.find(r => r.id === b.restaurantId);
      
      const openA = resA ? isRestaurantOpen(resA, currentTime) : false;
      const openB = resB ? isRestaurantOpen(resB, currentTime) : false;

      // Open restaurants first
      if (openA && !openB) return -1;
      if (!openA && openB) return 1;

      if (sortBy === 'cheapest') {
        return (a.promoPrice || a.price) - (b.promoPrice || b.price);
      }
      
      if (sortBy === 'closest' && userLocation && resA && resB && resA.latitude && resA.longitude && resB.latitude && resB.longitude) {
        const distA = calculateDistance(userLocation.latitude, userLocation.longitude, resA.latitude, resA.longitude);
        const distB = calculateDistance(userLocation.latitude, userLocation.longitude, resB.latitude, resB.longitude);
        return distA - distB;
      }

      return 0;
    });
  }, [cityProducts, searchTerm, activeCategory, filteredCategories, selectedCategories, maxPrice, distanceFilter, userLocation, cityRestaurants, categories, allProducts, restaurants, sortBy]);

  const allMatchedProducts = useMemo(() => {
    if (!searchTerm) return [];
    
    const matching = cityProducts.filter(product => {
      const matchName = product.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchDesc = product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase());
      return matchName || matchDesc;
    });

    return matching.sort((a, b) => {
      const resA = restaurants.find(r => r.id === a.restaurantId);
      const resB = restaurants.find(r => r.id === b.restaurantId);
      
      const priceA = a.promoPrice || a.price;
      const priceB = b.promoPrice || b.price;

      const distA = resA && resA.latitude && resA.longitude && userLocation
        ? calculateDistance(userLocation.latitude, userLocation.longitude, resA.latitude, resA.longitude)
        : 999999;
      const distB = resB && resB.latitude && resB.longitude && userLocation
        ? calculateDistance(userLocation.latitude, userLocation.longitude, resB.latitude, resB.longitude)
        : 999999;

      const scoreA = priceA + (distA < 999999 ? distA * 1.5 : 0);
      const scoreB = priceB + (distB < 999999 ? distB * 1.5 : 0);

      if (scoreA !== scoreB) {
        return scoreA - scoreB;
      }
      return priceA - priceB;
    });
  }, [cityProducts, searchTerm, userLocation, restaurants]);

  const searchSuggestionsProducts = useMemo(() => {
    return allMatchedProducts.slice(0, 5);
  }, [allMatchedProducts]);

  const favoritedProducts = useMemo(() => {
    const productLikeIds = new Set(userLikes.filter(l => l.itemType === 'product').map(l => l.itemId));
    const uniqueProducts = new Map<string, FoodItem>();
    allProducts.forEach(p => {
      if (productLikeIds.has(p.id)) {
        uniqueProducts.set(p.id, p);
      }
    });
    cityProducts.forEach(p => {
      if (productLikeIds.has(p.id)) {
        uniqueProducts.set(p.id, p);
      }
    });
    return Array.from(uniqueProducts.values());
  }, [userLikes, allProducts, cityProducts]);

  const selectedFavoritesTotal = useMemo(() => {
    return favoritedProducts
      .filter(p => selectedFavoriteProductIds.includes(p.id))
      .reduce((sum, p) => sum + (p.promoPrice || p.price), 0);
  }, [favoritedProducts, selectedFavoriteProductIds]);

  const featuredProducts = useMemo(() => {
    return cityProducts.filter(p => {
      if (!p.highlightUntil) return false;
      const highlightDate = p.highlightUntil.toDate ? p.highlightUntil.toDate() : new Date(p.highlightUntil);
      return highlightDate > new Date();
    });
  }, [cityProducts]);

  const handleBannerClick = (banner: Banner) => {
    if (banner.linkType === 'restaurant' && banner.linkId) {
      const restaurant = restaurants.find(r => r.id === banner.linkId);
      if (restaurant) {
        setSelectedRestaurant(restaurant);
        setView('restaurant');
      }
    } else if (banner.linkType === 'product' && banner.linkId) {
      const product = allProducts.find(p => p.id === banner.linkId);
      if (product) {
        const restaurant = restaurants.find(r => r.id === product.restaurantId);
        if (restaurant) {
          setSelectedRestaurant(restaurant);
          setView('restaurant');
        }
      }
    } else if (banner.linkUrl) {
      window.open(banner.linkUrl, '_blank');
    } else {
      setShowBannerPopup(banner);
    }
  };

  const isTupaClient = profile?.email === 'delivery.projeto.app@gmail.com' || globalSettings?.appName?.toLowerCase().includes('tupã');

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={(event) => {
        const type = event.active.data.current?.type;
        if (type === 'restaurant') {
          handleDragEnd(event, 'restaurant');
        } else if (type === 'product') {
          handleDragEnd(event, 'product');
        }
      }}
    >
      <div 
        className="min-h-screen bg-bg-app text-slate-900 dark:text-white font-sans pb-20 md:pb-0 transition-colors duration-300 overflow-x-hidden"
      >
      {/* Header */}
      <header className={`sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 px-4 md:px-6 ${isExclusiveView ? 'pt-0.5 pb-0.5 md:pt-1 md:pb-1' : 'pt-2 pb-1 md:pt-4 md:pb-2 shadow-sm'}`}>
        {fromManager && (
          <div className="max-w-7xl mx-auto mb-2">
            <button 
              onClick={() => navigate('/manager')}
              className="w-full md:w-auto bg-slate-900 text-white py-2 px-6 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20"
            >
              <ChevronLeft size={16} />
              Voltar ao Painel do Gestor
            </button>
          </div>
        )}
        <div className={`max-w-7xl mx-auto flex flex-col ${isTupaClient ? '' : 'md:flex-row md:items-center'} gap-1 md:gap-4`}>
            <div className="flex items-end justify-between w-full md:w-auto gap-2">
            <div className="flex flex-col min-w-0">
              {isExclusiveView ? (
                selectedRestaurant && (
                  <div className="flex items-center space-x-3 mb-1">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden border-2 border-blue-600 shadow-sm">
                      <img src={selectedRestaurant.imageUrl || undefined} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <h1 className="text-xl md:text-3xl font-black italic uppercase text-slate-900 dark:text-white leading-tight flex items-center min-w-0 ray-effect w-fit">
                        <span className="truncate">{selectedRestaurant.name}</span>
                        <VerifiedBadge />
                      </h1>
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowHoursModal(selectedRestaurant);
                        }}
                        className="flex items-center space-x-1 text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:text-blue-600 transition-colors"
                      >
                        <Clock size={10} className={getTimeRemaining(selectedRestaurant, currentTime).status === 'open' ? 'text-emerald-500' : 'text-red-500'} />
                        <span>{getTimeRemaining(selectedRestaurant, currentTime).status === 'open' ? 'Aberto' : 'Fechado'} • {getTimeRemaining(selectedRestaurant, currentTime).text}</span>
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <>
                  <div className="flex flex-col mb-1 relative">
                    <div 
                      onClick={() => setShowCitySelector(!showCitySelector)}
                      className="flex items-center space-x-1.5 cursor-pointer group hover:text-blue-500 transition-colors"
                    >
                      <MapPin size={10} className="text-blue-500 shrink-0 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] md:text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white truncate">
                        {activeCity ? activeCity.name : 'Selecione sua Cidade'}
                      </span>
                      <ChevronRight size={10} className={`text-slate-400 shrink-0 transition-transform ${showCitySelector ? 'rotate-90' : ''}`} />
                    </div>
                    
                    <div className="flex items-center space-x-2 mt-0.5">
                      <span className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[120px] md:max-w-[200px]">
                        {locationInfo}
                      </span>
                    <button
                        onClick={() => setIsCitySelectModalOpen(true)}
                        className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[6px] md:text-[8px] font-black uppercase tracking-widest rounded-full hover:bg-blue-100 transition-colors border border-blue-100 dark:border-blue-900/30"
                      >
                        <RefreshCw size={8} />
                        Mudar localização
                      </button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {showCitySelector && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 p-2 z-[60]"
                      >
                        <div className="text-[8px] font-black uppercase tracking-widest text-slate-400 px-3 py-2 border-b border-slate-50 dark:border-slate-700 mb-1">
                          Selecione sua Cidade
                        </div>
                        <div className="max-h-64 overflow-y-auto custom-scrollbar">
                          {uniqueCities.map(city => (
                            <button
                              key={city.id}
                              onClick={async () => {
                                setActiveCity(city);
                                setIsManualCity(true);
                                localStorage.setItem('manual_city_selected', 'true');
                                localStorage.setItem('active_city_v2_id', city.id);
                                setShowCitySelector(false);
                                
                                if (user?.uid) {
                                  try {
                                    await updateProfileData({ cityId: city.id, city: city.name });
                                    console.log(`[CustomerView] Cidade salva no cadastro do cliente: ${city.name}`);
                                  } catch (err) {
                                    console.error("Erro ao salvar cidade no cadastro:", err);
                                  }
                                }
                              }}
                              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all ${activeCity?.id === city.id ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-300'}`}
                            >
                              <span>{city.name}</span>
                              {activeCity?.name === city.name && <Check size={12} />}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <h1 
                    onClick={() => setView('home')}
                    className="text-sm md:text-2xl font-black italic uppercase text-blue-gradient cursor-pointer truncate max-w-[150px] md:max-w-none leading-tight pt-0.5 pb-0.5"
                  >
                    {globalSettings?.appName || 'Xô Fome'}
                  </h1>
                </>
              )}
              {view !== 'home' && !isExclusiveView && (
                <button 
                  onClick={() => setView('home')}
                  className="flex items-center space-x-2 text-[9px] font-black uppercase tracking-widest text-emerald-600 animate-blink text-left mt-0.5 group"
                >
                  <ArrowLeft size={10} className="animate-back-arrow" />
                  <span>Início</span>
                </button>
              )}
            </div>
            
            <div 
              className={`${isTupaClient ? 'flex' : 'flex md:hidden'} items-center shrink-0 relative z-[60]`}
            >
              {isTupaClient && (
                <div className="flex items-center">
                  <div className="flex items-center space-x-1 mr-2">
                    <button 
                      onClick={() => setIsFilterModalOpen(true)}
                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-blue-500"
                    >
                      <Filter size={18} className={selectedCategories.length > 0 || distanceFilter || maxPrice ? 'text-blue-600' : ''} />
                    </button>
                    <button 
                      onClick={() => setView('orders')}
                      className={`p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors relative ${view === 'orders' ? 'text-blue-600' : 'text-amber-500'} ${attentionCount > 0 ? 'animate-[pulse_1.5s_ease-in-out_infinite]' : ''}`}
                    >
                      <ClipboardList size={18} />
                      {attentionCount > 0 && (
                        <motion.span 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1 -right-1 bg-red-600 text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-white shadow-sm z-10"
                        >
                          {attentionCount}
                        </motion.span>
                      )}
                    </button>
                    <button 
                      onClick={() => setIsCartOpen(true)}
                      className="relative p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-emerald-500"
                    >
                      <ShoppingBag size={18} />
                      {cart.length > 0 && (
                        <span className="absolute top-0.5 right-0.5 bg-emerald-600 text-white text-[7px] font-bold w-3.5 h-3.5 flex items-center justify-center rounded-full border-2 border-white">
                          {cart.reduce((acc, i) => acc + i.quantity, 0)}
                        </span>
                      )}
                    </button>
                  </div>
                  <div className="flex items-center space-x-2">
                    {!allPermissionsGranted && (
                      <button 
                        onClick={handleOpenPermissions}
                        className="p-1.5 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition-all animate-pulse"
                        title="Permissões Pendentes"
                      >
                        <Shield size={18} />
                      </button>
                    )}
                    {user ? (
                      <button 
                        onClick={() => setIsProfileModalOpen(true)}
                        onMouseEnter={() => {
                          if (user) prefetchManagerData(user.uid);
                          if (isMasterAdmin) prefetchAdminData();
                        }}
                        className="instagram-ring"
                      >
                        <div className="w-8 h-8 rounded-full overflow-hidden relative z-10">
                          <img 
                            src={profile?.photoURL || user.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName || 'NOME'}&background=2563eb&color=fff`} 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer"
                            alt="Profile"
                          />
                        </div>
                      </button>
                    ) : (
                      <button 
                        onClick={() => {
                          setTargetRole('customer');
                          setAuthModalMessage('Entre para gerenciar seu perfil e pedidos');
                          setIsAuthModalOpen(true);
                        }}
                        className="p-2 bg-brand-blue text-white rounded-xl"
                      >
                        <User size={18} />
                      </button>
                    )}
                  </div>
                </div>
              )}
              
              {!isTupaClient && (
                <div className="flex items-center space-x-1 relative z-[80] bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm p-1 rounded-full">
                  {isExclusiveView ? (
                    <>
                      <button 
                        onClick={() => setView('orders')}
                        className={`p-2 rounded-xl transition-all relative ${view === 'orders' ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20' : 'bg-brand-blue/10 text-brand-blue'} ${attentionCount > 0 ? 'animate-[pulse_1.5s_ease-in-out_infinite]' : ''}`}
                        style={{ 
                          marginRight: `${globalSettings?.clientIcons?.ordersIconSpacing !== undefined ? globalSettings.clientIcons.ordersIconSpacing : (globalSettings?.clientIcons?.spacing || 4)}px`,
                          transform: `scale(${globalSettings?.clientIcons?.ordersIconScale || 1})`
                        }}
                      >
                        {globalSettings?.clientIcons?.ordersIcon ? (
                          <img src={globalSettings.clientIcons.ordersIcon} alt="Orders" style={{ width: globalSettings.clientIcons.ordersIconSize || globalSettings.clientIcons.size || 18, height: globalSettings.clientIcons.ordersIconSize || globalSettings.clientIcons.size || 18 }} className="object-contain" />
                        ) : (
                          <ClipboardList size={globalSettings?.clientIcons?.ordersIconSize || globalSettings?.clientIcons?.size || 18} />
                        )}
                        {attentionCount > 0 && (
                          <motion.span 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-white shadow-sm z-10"
                          >
                            {attentionCount}
                          </motion.span>
                        )}
                      </button>
                      <button 
                        onClick={() => setIsCartOpen(true)}
                        className="relative p-2 bg-emerald-50 text-emerald-600 rounded-xl transition-all"
                        style={{ 
                          marginRight: `${globalSettings?.clientIcons?.cartIconSpacing !== undefined ? globalSettings.clientIcons.cartIconSpacing : (globalSettings?.clientIcons?.spacing || 4)}px`,
                          transform: `scale(${globalSettings?.clientIcons?.cartIconScale || 1})`
                        }}
                      >
                        {globalSettings?.clientIcons?.cartIcon ? (
                          <img src={globalSettings.clientIcons.cartIcon} alt="Cart" style={{ width: globalSettings.clientIcons.cartIconSize || globalSettings.clientIcons.size || 18, height: globalSettings.clientIcons.cartIconSize || globalSettings.clientIcons.size || 18 }} className="object-contain" />
                        ) : (
                          <ShoppingBag size={globalSettings?.clientIcons?.cartIconSize || globalSettings?.clientIcons?.size || 18} />
                        )}
                        {cart.length > 0 && (
                          <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-[8px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-white">
                            {cart.reduce((acc, i) => acc + i.quantity, 0)}
                          </span>
                        )}
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center">
                      <button 
                        onClick={() => setIsFilterModalOpen(true)}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors relative"
                        style={{ 
                          marginRight: `${globalSettings?.clientIcons?.filterIconSpacing !== undefined ? globalSettings.clientIcons.filterIconSpacing : (globalSettings?.clientIcons?.spacing || 4)}px`,
                          transform: `scale(${globalSettings?.clientIcons?.filterIconScale || 1})`
                        }}
                      >
                        {globalSettings?.clientIcons?.filterIcon ? (
                          <img src={globalSettings.clientIcons.filterIcon} alt="Filter" style={{ width: globalSettings.clientIcons.filterIconSize || globalSettings.clientIcons.size || 18, height: globalSettings.clientIcons.filterIconSize || globalSettings.clientIcons.size || 18 }} className="object-contain" />
                        ) : (
                          <Filter 
                            size={globalSettings?.clientIcons?.filterIconSize || globalSettings?.clientIcons?.size || 18} 
                            className={selectedCategories.length > 0 || distanceFilter || maxPrice ? 'text-blue-600' : ''} 
                            style={{ color: globalSettings?.clientIcons?.color || (selectedCategories.length > 0 || distanceFilter || maxPrice ? undefined : '#3b82f6') }}
                          />
                        )}
                        {(selectedCategories.length > 0 || distanceFilter || maxPrice) && (
                          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-brand-blue rounded-full border border-white" />
                        )}
                      </button>
                      <button 
                        onClick={() => setView('orders')}
                        className={`p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors relative ${view === 'orders' ? 'text-blue-600' : ''} ${attentionCount > 0 ? 'animate-[pulse_1.5s_ease-in-out_infinite]' : ''}`}
                        style={{ 
                          marginRight: `${globalSettings?.clientIcons?.ordersIconSpacing !== undefined ? globalSettings.clientIcons.ordersIconSpacing : (globalSettings?.clientIcons?.spacing || 4)}px`,
                          transform: `scale(${globalSettings?.clientIcons?.ordersIconScale || 1})`,
                          color: view === 'orders' ? undefined : (globalSettings?.clientIcons?.color || '#f59e0b')
                        }}
                      >
                        <div className="relative">
                          {globalSettings?.clientIcons?.ordersIcon ? (
                            <img src={globalSettings.clientIcons.ordersIcon} alt="Orders" style={{ width: globalSettings.clientIcons.ordersIconSize || globalSettings.clientIcons.size || 18, height: globalSettings.clientIcons.ordersIconSize || globalSettings.clientIcons.size || 18 }} className="object-contain" />
                          ) : (
                            <ClipboardList size={globalSettings?.clientIcons?.ordersIconSize || globalSettings?.clientIcons?.size || 18} />
                          )}
                          {attentionCount > 0 && (
                            <motion.span 
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute -top-1 -right-1 bg-red-600 text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-white shadow-sm z-10"
                            >
                              {attentionCount}
                            </motion.span>
                          )}
                        </div>
                      </button>
                      <button 
                        onClick={() => setIsCartOpen(true)}
                        className="relative p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                        style={{ 
                          marginRight: `${globalSettings?.clientIcons?.cartIconSpacing !== undefined ? globalSettings.clientIcons.cartIconSpacing : (globalSettings?.clientIcons?.spacing || 4)}px`,
                          transform: `scale(${globalSettings?.clientIcons?.cartIconScale || 1})`,
                          color: globalSettings?.clientIcons?.color || '#10b981'
                        }}
                      >
                        {globalSettings?.clientIcons?.cartIcon ? (
                          <img src={globalSettings.clientIcons.cartIcon} alt="Cart" style={{ width: globalSettings.clientIcons.cartIconSize || globalSettings.clientIcons.size || 18, height: globalSettings.clientIcons.cartIconSize || globalSettings.clientIcons.size || 18 }} className="object-contain" />
                        ) : (
                          <ShoppingBag size={globalSettings?.clientIcons?.cartIconSize || globalSettings?.clientIcons?.size || 18} />
                        )}
                        {cart.length > 0 && (
                          <span className="absolute top-0.5 right-0.5 bg-emerald-600 text-white text-[7px] font-bold w-3.5 h-3.5 flex items-center justify-center rounded-full">
                            {cart.reduce((acc, i) => acc + i.quantity, 0)}
                          </span>
                        )}
                      </button>
                    </div>
                  )}
                  <div className="relative z-[60]">
                    <button 
                      onClick={() => {
                        if (!user) {
                          setTargetRole('customer');
                          setAuthModalMessage('Entre para gerenciar seu perfil e pedidos');
                          setIsAuthModalOpen(true);
                        } else {
                          setIsProfileModalOpen(true);
                        }
                      }}
                      disabled={isSigningIn}
                      className="instagram-ring disabled:opacity-50 transition-all active:scale-95"
                    >
                      <div className="w-8 h-8 rounded-full overflow-hidden relative z-10 border-2 border-white shadow-md">
                        <img 
                          src={profile?.photoURL || user?.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName || 'USER'}&background=2563eb&color=fff`} 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                          alt="Profile" 
                        />
                      </div>
                    </button>
                  </div>
                </div>
              )}
          </div>
        </div>
        
        {!isExclusiveView ? (
            <div className="flex-1 relative flex items-center mt-4 border-t border-slate-100 dark:border-slate-800 pt-4 md:pt-0 md:border-0 md:mt-0 z-10">
              {/* Lightning Ray Effect */}
              <div className="lightning-ray animate-lightning-ray" />
              
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" size={16} />
              <input 
                type="text" 
                placeholder={typingPlaceholder}
                className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl py-3 pl-12 pr-16 text-sm focus:ring-2 focus:ring-blue-500/20 transition-all dark:text-white dark:placeholder-slate-500"
                value={searchTerm}
                onChange={(e) => {
                  const val = e.target.value;
                  if (checkAdminCommand(val)) {
                    setSearchTerm('');
                    return;
                  }
                  setSearchTerm(val);
                  if (view !== 'home' && view !== 'restaurant' && view !== 'search-results') setView('home');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchTerm.trim()) {
                    setView('search-results');
                  }
                }}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <ThemeSelector 
                  showDarkMode={false} 
                  size={globalSettings?.clientIcons?.colorIconSize || globalSettings?.clientIcons?.size || 20}
                  customIcon={globalSettings?.clientIcons?.colorIcon}
                  scale={globalSettings?.clientIcons?.colorIconScale || 1}
                />
              </div>

              {searchTerm && view !== 'search-results' && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden z-[100] max-h-[420px] overflow-y-auto">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sugestões de Produtos</span>
                    {allMatchedProducts.length > 5 && (
                      <button
                        onClick={() => setView('search-results')}
                        className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline"
                      >
                        Ver todos ({allMatchedProducts.length}) <ChevronRight size={10} />
                      </button>
                    )}
                  </div>

                  {/* Products in Search Suggestions (Max 5, cheapest & closest) */}
                  {searchSuggestionsProducts.map((product, pIdx) => {
                    const productRestaurant = restaurants.find(r => r.id === product.restaurantId);
                    const isAvailable = isProductAvailable(product, currentTime, productRestaurant);
                    const distance = productRestaurant && productRestaurant.latitude && productRestaurant.longitude && userLocation
                      ? calculateDistance(userLocation.latitude, userLocation.longitude, productRestaurant.latitude, productRestaurant.longitude)
                      : null;

                    return (
                      <div 
                        key={`search-suggest-prod-${product.id}-${pIdx}`}
                        onClick={() => {
                          if (!isAvailable) return;
                          addToCart(product, []);
                          setCartViewTab('cart');
                          setIsCartOpen(true);
                          setSearchTerm('');
                        }}
                        className={`p-3 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center space-x-3 cursor-pointer border-b border-slate-50 dark:border-slate-800 ${!isAvailable ? 'opacity-65 cursor-not-allowed' : ''}`}
                      >
                        <div className="relative shrink-0 w-12 h-12 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800">
                          <img 
                            src={product.imageUrl || `https://picsum.photos/seed/${product.id}/100/100`} 
                            className={`w-full h-full object-cover ${!isAvailable ? 'grayscale opacity-50' : ''}`}
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider truncate max-w-[120px]">
                              {productRestaurant?.name || 'Xô Fome'}
                            </p>
                            {distance !== null && (
                              <span className="text-[8px] text-slate-400 font-extrabold flex items-center gap-0.5 shrink-0">
                                <MapPin size={8} className="text-rose-500" />
                                {distance.toFixed(1)} km
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-0.5">
                            <p className="text-sm font-bold dark:text-white leading-tight truncate">{product.name}</p>
                            {!isAvailable && (
                              <span className="text-[8px] bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400 font-black uppercase tracking-widest px-1.5 py-0.5 rounded leading-none shrink-0 border border-red-200/50 dark:border-red-900/40">
                                Indisponível
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">{product.description}</p>
                          
                          <div className="flex items-center justify-between mt-1">
                            <div className="flex items-baseline space-x-1">
                              {(product.promoPrice || (product.isFlashSale && isFlashSaleActive(product))) && (
                                <span className="text-[10px] text-red-500 font-bold line-through">{formatPrice(product.price)}</span>
                              )}
                              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-black italic">
                                {formatPrice(product.isFlashSale ? (isFlashSaleActive(product) ? (product.promoPrice || product.price) : product.price) : (product.promoPrice || product.price))}
                              </p>
                            </div>
                            
                            {product.preparationTimeMinutes && (
                              <div className="flex items-center space-x-1 text-[9px] text-slate-400 font-bold">
                                <Clock size={9} />
                                <span>{product.preparationTimeMinutes} min</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Resturants match notification (optional link, let's keep it simple or allow direct matching) */}
                  {searchSuggestionsProducts.length === 0 && (
                    <div className="p-6 text-center space-y-4">
                      <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full mx-auto flex items-center justify-center text-slate-300">
                        <Search size={22} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-black uppercase tracking-widest text-slate-400 italic">Nenhum resultado encontrado</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Quer cadastrar sua empresa?</p>
                        <button 
                          onClick={() => {
                            setTargetRole('manager');
                            setAuthModalMessage('Cadastre sua empresa e comece a vender agora!');
                            setIsAuthModalOpen(true);
                          }}
                          className="mt-2 bg-blue-gradient text-white px-5 py-1.5 rounded-xl font-black uppercase tracking-widest text-[8px] shadow-lg shadow-blue-500/20"
                        >
                          Fazer Cadastro
                        </button>
                      </div>
                    </div>
                  )}

                  {/* See More ("Ver Mais") option */}
                  {allMatchedProducts.length > 0 && (
                    <div 
                      onClick={() => setView('search-results')}
                      className="p-3 bg-blue-50/50 hover:bg-blue-50 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-center cursor-pointer border-t border-slate-100 dark:border-slate-800 transition-colors"
                    >
                      <span className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center justify-center gap-1.5">
                        Ver mais resultados ({allMatchedProducts.length})
                        <ChevronRight size={14} />
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 relative flex items-center mt-4 border-t border-slate-100 dark:border-slate-800 pt-4 md:pt-0 md:border-0 md:mt-0 z-0">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" size={16} />
              <input 
                type="text" 
                placeholder={`Pesquisar em ${selectedRestaurant?.name}...`}
                className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl py-3 pl-12 pr-16 text-sm focus:ring-2 focus:ring-blue-500/20 transition-all dark:text-white dark:placeholder-slate-500"
                value={searchTerm}
                onChange={(e) => {
                  const val = e.target.value;
                  if (checkAdminCommand(val)) {
                    setSearchTerm('');
                    return;
                  }
                  setSearchTerm(val);
                }}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <ThemeSelector 
                  showDarkMode={false} 
                  size={globalSettings?.clientIcons?.colorIconSize || globalSettings?.clientIcons?.size || 20}
                  customIcon={globalSettings?.clientIcons?.colorIcon}
                  scale={globalSettings?.clientIcons?.colorIconScale || 1}
                />
              </div>

              {searchTerm && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden z-[100] max-h-[400px] overflow-y-auto">
                  {/* Products in Search (Restaurant View) */}
                  {filteredProducts.slice(0, 6).map((product, pIdx) => (
                    <div 
                      key={`search-prod-res-${product.id}-${pIdx}`}
                      onClick={() => {
                        const productRestaurant = restaurants.find(r => r.id === product.restaurantId);
                        if (productRestaurant) {
                          setSelectedRestaurant(productRestaurant);
                          setView('restaurant');
                          setSearchTerm('');
                        }
                      }}
                      className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center space-x-3 cursor-pointer border-b border-slate-50 dark:border-slate-800 last:border-0"
                    >
                      <img 
                        src={product.imageUrl || `https://picsum.photos/seed/${product.id}/100/100`} 
                        className="w-12 h-12 rounded-xl object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold dark:text-white leading-tight truncate">{product.name}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">{product.description}</p>
                        <div className="flex items-center justify-between mt-1">
                          <div className="flex flex-col">
                            {(product.promoPrice || (product.isFlashSale && isFlashSaleActive(product))) && (
                              <span className="text-xs text-red-500 font-bold line-through leading-none">{formatPrice(product.price)}</span>
                            )}
                            <p className="text-xs text-emerald-600 font-black italic leading-tight">
                              {formatPrice(product.isFlashSale ? (isFlashSaleActive(product) ? (product.promoPrice || product.price) : product.price) : (product.promoPrice || product.price))}
                            </p>
                          </div>
                          {product.preparationTimeMinutes && (
                            <div className="flex items-center space-x-1 text-[10px] text-slate-400 font-bold">
                              <Clock size={10} />
                              <span>{product.preparationTimeMinutes} min</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredProducts.length === 0 && (
                    <div className="p-6 text-center space-y-4">
                      <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full mx-auto flex items-center justify-center text-slate-300">
                        <Search size={24} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-black uppercase tracking-widest text-slate-400 italic">Nenhum produto</p>
                        {searchSuggestion && (
                          <button 
                            onClick={() => setSearchTerm(searchSuggestion)}
                            className="text-xs font-bold text-brand-blue hover:underline"
                          >
                            Você quis dizer: <span className="italic">"{searchSuggestion}"</span>?
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

            <div 
              className={`${isTupaClient ? 'hidden' : 'hidden md:flex'} items-center relative z-[80]`}
            >
              {isExclusiveView && (
                <div className="h-8 w-px bg-slate-100 dark:bg-slate-800 mx-2" />
              )}

              {!isExclusiveView && (
                <button 
                  onClick={() => setIsFilterModalOpen(true)}
                  className="flex flex-col items-center space-y-1 text-blue-500 hover:text-blue-600 transition-colors relative"
                  style={{ 
                    marginRight: `${globalSettings?.clientIcons?.filterIconSpacing !== undefined ? globalSettings.clientIcons.filterIconSpacing : (globalSettings?.clientIcons?.spacing || 24)}px`,
                    transform: `scale(${globalSettings?.clientIcons?.filterIconScale || 1})`
                  }}
                >
                  {globalSettings?.clientIcons?.filterIcon ? (
                    <img src={globalSettings.clientIcons.filterIcon} alt="Filter" style={{ width: globalSettings.clientIcons.filterIconSize || globalSettings.clientIcons.size || 20, height: globalSettings.clientIcons.filterIconSize || globalSettings.clientIcons.size || 20 }} className="object-contain" />
                  ) : (
                    <Filter size={globalSettings?.clientIcons?.filterIconSize || globalSettings?.clientIcons?.size || 20} className={selectedCategories.length > 0 || distanceFilter || maxPrice ? 'text-blue-600' : ''} />
                  )}
                  {(selectedCategories.length > 0 || distanceFilter || maxPrice) && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-brand-blue rounded-full border border-white" />
                  )}
                </button>
              )}
              <button 
                onClick={() => setView('orders')}
                className={`flex flex-col items-center space-y-1 transition-colors ${view === 'orders' ? 'text-blue-600' : 'text-amber-500 hover:text-amber-600'} ${isExclusiveView ? 'bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-2xl' : ''} ${attentionCount > 0 ? 'animate-[pulse_1.5s_ease-in-out_infinite]' : ''}`}
                style={{ 
                  marginRight: `${globalSettings?.clientIcons?.ordersIconSpacing !== undefined ? globalSettings.clientIcons.ordersIconSpacing : (globalSettings?.clientIcons?.spacing || 24)}px`,
                  transform: `scale(${globalSettings?.clientIcons?.ordersIconScale || 1})`
                }}
              >
                <div className="relative">
                  {globalSettings?.clientIcons?.ordersIcon ? (
                    <img src={globalSettings.clientIcons.ordersIcon} alt="Orders" style={{ width: globalSettings.clientIcons.ordersIconSize || globalSettings.clientIcons.size || 20, height: globalSettings.clientIcons.ordersIconSize || globalSettings.clientIcons.size || 20 }} className="object-contain" />
                  ) : (
                    <Package size={globalSettings?.clientIcons?.ordersIconSize || globalSettings?.clientIcons?.size || 20} />
                  )}
                  {attentionCount > 0 && (
                    <motion.span 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-white shadow-sm z-10"
                    >
                      {attentionCount}
                    </motion.span>
                  )}
                </div>
              </button>
              <button 
                onClick={() => setIsCartOpen(true)}
                className={`relative p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-emerald-500 hover:text-emerald-600 ${isExclusiveView ? 'bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 rounded-2xl flex items-center space-x-2' : ''}`}
                style={{ 
                  marginRight: `${globalSettings?.clientIcons?.cartIconSpacing !== undefined ? globalSettings.clientIcons.cartIconSpacing : (globalSettings?.clientIcons?.spacing || 24)}px`,
                  transform: `scale(${globalSettings?.clientIcons?.cartIconScale || 1})`
                }}
              >
                {globalSettings?.clientIcons?.cartIcon ? (
                  <img src={globalSettings.clientIcons.cartIcon} alt="Cart" style={{ width: globalSettings.clientIcons.cartIconSize || globalSettings.clientIcons.size || 24, height: globalSettings.clientIcons.cartIconSize || globalSettings.clientIcons.size || 24 }} className="object-contain" />
                ) : (
                  <ShoppingBag size={globalSettings?.clientIcons?.cartIconSize || globalSettings?.clientIcons?.size || 24} />
                )}
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                    {cart.reduce((acc, i) => acc + i.quantity, 0)}
                  </span>
                )}
              </button>
              {!isTupaClient && user ? (
                <button 
                  onClick={() => setIsProfileModalOpen(true)}
                  className="flex items-center space-x-3 hover:bg-slate-50 dark:hover:bg-slate-800 p-1 pr-3 rounded-full transition-colors"
                >
                  <div className="text-right">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 leading-tight">Olá,</p>
                    <p className="text-sm font-bold leading-tight dark:text-white">{profile?.displayName || user.displayName?.split(' ')[0]}</p>
                  </div>
                  <div className="instagram-ring">
                    <div className="w-10 h-10 rounded-full overflow-hidden relative z-10">
                      <img 
                        src={profile?.photoURL || user?.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName || 'NOME'}&background=2563eb&color=fff`} 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer"
                        alt="Profile" 
                      />
                    </div>
                  </div>
                </button>
              ) : !isTupaClient ? (
                <div className="relative">
                  <button 
                    onClick={() => {
                      setTargetRole('customer');
                      setAuthModalMessage('Entre para gerenciar seu perfil e pedidos');
                      setIsAuthModalOpen(true);
                    }}
                    disabled={isSigningIn}
                    className="bg-brand-blue text-white px-6 py-2 rounded-full text-sm font-bold hover:bg-brand-blue/90 transition-colors shadow-lg shadow-brand-blue/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSigningIn ? 'Entrando...' : 'Entrar'}
                  </button>
                </div>
              ) : null}
            </div>
        </div>
      </header>

      <main className={`max-w-7xl mx-auto px-4 md:px-6 ${isExclusiveView ? 'py-3 md:py-4' : 'py-6 md:py-8'}`}>

        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8 md:space-y-12"
            >
              {/* Banners */}
              {!isExclusiveView && (cityBanners.length > 0 || (!commonData.isLoaded && restaurants.length === 0)) && (
                <div className="space-y-4">
                  <section className="relative h-[180px] md:h-[350px] rounded-[2rem] overflow-hidden shadow-2xl shadow-blue-500/10">
                    {restaurants.length === 0 && !commonData.isLoaded ? (
                      <div className="w-full h-full bg-slate-100 dark:bg-slate-800 animate-pulse" />
                    ) : (
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={cityBanners[currentBannerIndex]?.id}
                          initial={{ opacity: 0, x: 100 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -100 }}
                          transition={{ duration: 0.5 }}
                          className="absolute inset-0 cursor-pointer"
                          onClick={() => handleBannerClick(cityBanners[currentBannerIndex])}
                        >
                          {cityBanners[currentBannerIndex]?.mediaType === 'video' ? (
                            <video 
                              src={cityBanners[currentBannerIndex]?.imageUrl || undefined} 
                              autoPlay 
                              loop 
                              muted 
                              className="w-full h-full object-cover" 
                              style={{ objectPosition: cityBanners[currentBannerIndex]?.objectPosition || '50% 50%' }}
                            />
                          ) : (
                            <img 
                              src={cityBanners[currentBannerIndex]?.imageUrl || undefined} 
                              alt={cityBanners[currentBannerIndex]?.title}
                              className="w-full h-full object-cover"
                              style={{ objectPosition: cityBanners[currentBannerIndex]?.objectPosition || '50% 50%' }}
                              referrerPolicy="no-referrer"
                            />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent flex items-end p-6 md:p-12">
                            <h2 className="text-2xl md:text-5xl font-black text-white uppercase tracking-tighter italic leading-none">
                              {cityBanners[currentBannerIndex]?.title}
                            </h2>
                          </div>
                        </motion.div>
                      </AnimatePresence>
                    )}
                  </section>

                  {/* Dots indicator underneath the banner slide */}
                  {cityBanners.length > 1 && (
                    <div className="flex justify-center items-center space-x-2.5 py-1">
                      {cityBanners.map((_, idx) => (
                        <button
                          key={`banner-dot-${idx}`}
                          onClick={() => setCurrentBannerIndex(idx)}
                          className={`w-2 h-2 rounded-full transition-all duration-300 transform hover:scale-125 focus:outline-none ${
                            idx === currentBannerIndex 
                              ? 'bg-brand-blue scale-125' 
                              : 'bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600'
                          }`}
                          style={idx === currentBannerIndex ? { backgroundColor: 'var(--primary-color)' } : {}}
                          title={`Ver banner ${idx + 1}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Flash Sales */}
              {!isExclusiveView && (flashSaleItems.length > 0 || (!commonData.isLoaded && restaurants.length === 0)) && (
                <section className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Zap size={24} className="text-orange-500 fill-orange-500 animate-pulse" />
                    <h3 className="text-xl md:text-2xl font-black uppercase tracking-tighter italic text-orange-500">Promoção Relâmpago!</h3>
                  </div>
                  <div className="flex space-x-6 overflow-x-auto no-scrollbar pb-4 -mx-4 px-4 md:mx-0 md:px-0">
                  {flashSaleItems.length > 0 && Array.from(new Map(flashSaleItems.filter((item: any) => {
                    const isCityMatch = cityRestaurants.some((r: any) => r.id === item.restaurantId);
                    return isCityMatch && isFlashSaleActive(item);
                  }).map((item: any) => [item.id, item])).values()).map((item: any, idx) => (
                    <motion.div 
                      key={`flash-sale-${item.id}`}
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="min-w-[160px] max-w-[160px] bg-brand-blue text-white rounded-[2rem] p-3 shadow-xl border-2 border-orange-100 dark:border-orange-900/30 relative overflow-hidden group flex flex-col space-y-3"
                        >
                          <div className="absolute top-0 right-0 bg-orange-500 text-white px-2 py-0.5 rounded-bl-xl text-[8px] font-black uppercase tracking-widest animate-bounce z-10">
                            Piscando!
                          </div>
                          <div className="w-full aspect-square rounded-2xl overflow-hidden relative">
                            <img src={item.imageUrl || undefined} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                            <div className="absolute bottom-0 left-0 right-0">
                              <FlashSaleTimer item={item} />
                            </div>
                          </div>
                          <div className="flex-1 space-y-1">
                            <h4 className="font-black uppercase tracking-tight italic text-[10px] truncate text-slate-900 dark:text-white">{item.name}</h4>
                            <div className="flex flex-col">
                              <span className="text-red-500 font-bold line-through text-xs">{formatPrice(item.price)}</span>
                              <span className="text-orange-600 font-black text-sm">{formatPrice(item.promoPrice)}</span>
                            </div>
                            <button 
                              onClick={() => {
                                const res = restaurants.find(r => r.id === item.restaurantId);
                                if (res) {
                                  setSelectedRestaurant(res);
                                  setView('restaurant');
                                }
                              }}
                              className="w-full bg-orange-500 text-white py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-orange-600 transition-all mt-1"
                            >
                              Aproveitar
                            </button>
                          </div>
                        </motion.div>
                      ))
                    }
                  </div>
                </section>
              )}

              {/* Famosos na Tupã */}
              {!isExclusiveView && activeModality === 'Famosos' && (cityRestaurants.filter(r => r.isFamous || parseFloat(getAverageRating(r.id, false, r.rating).rating) >= 5.0).length > 0 || (!commonData.isLoaded && restaurants.length === 0)) && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg md:text-xl font-black uppercase tracking-tight italic text-amber-600 flex items-center gap-2">
                      <Store size={20} />
                      Famosos na Tupã
                    </h3>
                    <button 
                      onClick={() => {
                        setActiveModality('Famosos');
                        setSidebarType('restaurants');
                        setIsSidebarOpen(true);
                      }}
                      className="text-[10px] font-black uppercase tracking-widest text-amber-600 hover:underline flex items-center gap-1"
                    >
                      Ver Mais <ChevronRight size={12} />
                    </button>
                  </div>
                  <div className="flex space-x-6 overflow-x-auto no-scrollbar pb-4 -mx-4 px-4 md:mx-0 md:px-0">
                    {restaurants.length === 0 && !commonData.isLoaded ? (
                      [1, 2, 3, 4].map(i => (
                        <div key={`skeleton-restaurants-${i}`} className="flex flex-col items-center space-y-3 animate-pulse flex-shrink-0">
                          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-slate-200 dark:bg-slate-700" />
                          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-12" />
                        </div>
                      ))
                    ) : (
                      (Array.from(new Map(cityRestaurants.filter(r => !r.isWalletBlocked && (r.isFamous || parseFloat(getAverageRating(r.id, false, r.rating).rating) >= 5.0)).map(r => [r.id, r])).values()) as Restaurant[]).map((restaurant, idx) => (
                        <div 
                          key={`famous-res-extra-${restaurant.id}`}
                          onClick={() => {
                            setSelectedRestaurant(restaurant);
                            setView('restaurant');
                          }}
                          className="flex flex-col items-center space-y-2 cursor-pointer group flex-shrink-0"
                        >
                          <div className="relative">
                            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-[1.5px] border-brand-blue shadow-lg group-hover:scale-110 transition-transform duration-300">
                              <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                                {(restaurant.logoUrl || restaurant.imageUrl) ? (
                                  <img 
                                    src={restaurant.logoUrl || restaurant.imageUrl || undefined} 
                                    className="w-full h-full object-cover" 
                                    referrerPolicy="no-referrer" 
                                  />
                                ) : (
                                  <Store size={32} className="text-slate-300" />
                                )}
                              </div>
                            </div>
                            <div className="absolute -top-1 -right-1 z-10 flex flex-col gap-1 items-end">
                              <div className="bg-amber-500 text-white p-1 rounded-full shadow-md scale-75">
                                <ShieldCheck size={10} />
                              </div>
                              <LikeButton itemId={restaurant.id} itemType="restaurant" count={restaurant.likesCount} className="bg-white dark:bg-slate-800 p-1 rounded-full shadow-md scale-75" />
                            </div>
                          </div>
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white text-center max-w-[80px] truncate flex items-center gap-1">
                            {restaurant.name}
                            <VerifiedBadge />
                          </h4>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              )}



              {/* Modalities Filter */}
              {!isExclusiveView && (
                <section className="space-y-4">
                  <div className="flex space-x-3 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 md:mx-0 md:px-0">
                    {['Todos', 'Famosos', 'restaurante', 'mercado', 'farmácia', 'lanche', 'padaria', 'bebidas', 'pet shop', 'shopping gourmet'].map((mod) => (
                      <button
                        key={mod}
                        onClick={() => {
                          setActiveModality(mod);
                          if (view !== 'home') setView('home');
                        }}
                        className={`flex-shrink-0 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${activeModality.toLowerCase() === mod.toLowerCase() ? 'bg-brand-blue text-white border-brand-blue shadow-lg shadow-blue-500/20' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-700 hover:bg-slate-50'}`}
                      >
                        {mod}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Restaurants Section (Moved up) */}
              {!isExclusiveView && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="bg-brand-blue text-white px-4 py-1 rounded-full shadow-lg shadow-blue-500/20">
                      <h3 className="text-[10px] font-black uppercase tracking-widest italic">EMPRESAS</h3>
                    </div>
                    <button 
                      onClick={() => {
                        setSidebarType('restaurants');
                        setIsSidebarOpen(true);
                      }}
                      className="text-[10px] font-black uppercase tracking-widest text-brand-blue hover:underline flex items-center gap-1"
                    >
                      Ver Mais <ChevronRight size={12} />
                    </button>
                  </div>
                  <div className="flex space-x-6 overflow-x-auto no-scrollbar pb-4 -mx-4 px-4 md:mx-0 md:px-0">
                    {filteredRestaurants.length === 0 ? (
                      profile?.role === 'manager' ? (
                        <div className="w-full py-12 flex flex-col items-center justify-center space-y-4 bg-blue-50 dark:bg-blue-900/20 rounded-[2.5rem] border-2 border-dashed border-blue-200 dark:border-blue-900/30 shadow-inner">
                          <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-xl text-blue-500">
                            <Package size={32} />
                          </div>
                          <div className="text-center px-6 space-y-2">
                            <p className="text-base font-black uppercase tracking-widest text-slate-900 dark:text-white italic">Seu Painel de Gestor</p>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                              Você já possui acesso como gestor. Cadastre seus produtos e comece a vender agora!
                            </p>
                          </div>
                          <div className="flex flex-col sm:flex-row items-center gap-4">
                            <button 
                              onClick={() => navigate('/manager')}
                              className="bg-blue-gradient text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-500/20 hover:scale-105 transition-all"
                            >
                              Ir para Meus Produtos
                            </button>
                            <button 
                              onClick={() => navigate('/manager?tab=settings')}
                              className="bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-all"
                            >
                              Configurar Empresa
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full py-12 flex flex-col items-center justify-center space-y-4 bg-slate-50 dark:bg-slate-900/50 rounded-[2.5rem] border-2 border-dashed border-slate-100 dark:border-slate-800">
                          <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-xl text-slate-300">
                            <Store size={32} />
                          </div>
                          <div className="text-center space-y-1">
                            <p className="text-sm font-black uppercase tracking-widest text-slate-400 italic">Não tem nenhuma empresa cadastrada</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Abra sua conta agora e comece a lucrar!</p>
                          </div>
                          {(() => {
                            const rawPhone = (activeCity?.id 
                              ? (globalSettings?.citySupportNumbers?.[activeCity.id] || 
                                 Object.entries(globalSettings?.citySupportNumbers || {}).find(([id]) => {
                                   const city = cities.find(c => c.id === id);
                                   return city?.name === activeCity.name;
                                 })?.[1])
                              : null) || globalSettings?.appSupportPhone || globalSettings?.companySupportPhone || globalSettings?.supportPhone;
                            const cleanPhone = rawPhone ? rawPhone.replace(/\D/g, '') : '69999999999';
                            const finalPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
                            const whatsAppLink = `https://wa.me/${finalPhone}?text=${encodeURIComponent('Olá, gostaria de cadastrar minha empresa no Xô Fome!')}`;
                            
                            return (
                              <a 
                                href={whatsAppLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-blue-gradient text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-500/20 hover:scale-105 transition-all text-center inline-block"
                              >
                                Quero me Cadastrar
                              </a>
                            );
                          })()}
                        </div>
                      )
                    ) : (
                      <SortableContext 
                        items={Array.from(new Set(filteredRestaurants.map(r => r.id)))}
                        strategy={rectSortingStrategy}
                        disabled={!adminMode}
                      >
                        {(Array.from(new Map(filteredRestaurants.map(r => [r.id, r])).values()) as Restaurant[]).map((restaurant, idx) => {
                          const timeInfo = getTimeRemaining(restaurant, currentTime);
                          const distance = userLocation && restaurant.latitude && restaurant.longitude 
                            ? calculateDistance(userLocation.latitude, userLocation.longitude, restaurant.latitude, restaurant.longitude).toFixed(1)
                            : null;

                          return (
                            <SortableItem key={`${restaurant.id}-${idx}`} id={restaurant.id} type="restaurant" disabled={!adminMode}>
                              <div 
                                onClick={() => {
                                  setSelectedRestaurant(restaurant);
                                  setView('restaurant');
                                }}
                                className="flex flex-col items-center space-y-2 cursor-pointer group flex-shrink-0"
                              >
                                <div className="relative">
                                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-[1.5px] border-white dark:border-slate-800 shadow-md group-hover:scale-110 transition-transform duration-300">
                                    <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                                      {(restaurant.logoUrl || restaurant.imageUrl) ? (
                                        <img src={restaurant.logoUrl || restaurant.imageUrl || undefined} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                      ) : (
                                        <Store size={32} className="text-slate-300" />
                                      )}
                                    </div>
                                    {distance && (
                                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[7px] font-black py-0.5 text-center">
                                        {distance} km
                                      </div>
                                    )}
                                  </div>
                                  <div className="absolute -top-1 -right-1 z-10 flex flex-col gap-1 items-end">
                                    <LikeButton 
                                      itemId={restaurant.id} 
                                      itemType="restaurant" 
                                      count={restaurant.likesCount} 
                                      className="bg-white dark:bg-slate-800 p-1 rounded-full shadow-md scale-75" 
                                      onAdminClick={(e) => {
                                        e.stopPropagation();
                                        handleAdminAction('update_restaurant_likes', restaurant);
                                      }}
                                    />
                                    {adminMode && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleAdminAction('delete_restaurant', restaurant);
                                        }}
                                        className="bg-red-500 text-white p-1 rounded-full shadow-md scale-75 hover:bg-red-600 transition-colors"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-col items-center">
                                  <div className="text-[10px] font-black uppercase tracking-tight text-slate-600 dark:text-slate-300 w-20 text-center flex items-center justify-center min-w-0">
                                    <span className="truncate">{restaurant.name}</span>
                                    <VerifiedBadge />
                                  </div>
                                  <div className="flex items-center justify-center gap-2 mt-1">
                                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest truncate max-w-[60px] text-center">
                                      {restaurant.modality || 'Restaurante'}
                                    </p>
                                  </div>
                                  {isNewRestaurant(restaurant.createdAt) && (
                                    <span className="text-[8px] font-black text-blue-500 uppercase italic">novo</span>
                                  )}
                                </div>
                                <div className="flex flex-col items-center space-y-0.5">
                                  <div className={`text-[7px] font-black uppercase italic ${timeInfo.status === 'open' ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {timeInfo.text}
                                  </div>
                                  <div className="flex items-center space-x-1 text-[8px] font-black text-slate-400 uppercase italic">
                                    <Clock size={8} className={timeInfo.status === 'open' ? 'text-emerald-500' : 'text-red-500'} />
                                    <span>{timeInfo.status === 'open' ? 'Aberto' : 'Fechado'}</span>
                                  </div>
                                </div>
                                <StarRating 
                                  ratingData={getAverageRating(restaurant.id, false, restaurant.rating)} 
                                  size={10} 
                                  onClick={adminMode ? (e) => {
                                    e.stopPropagation();
                                    handleAdminAction('update_restaurant_rating', restaurant);
                                  } : undefined}
                                />
                                
                                {adminMode && (
                                  <div className="flex items-center space-x-2 mt-2">
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAdminAction('toggle_restaurant_status', restaurant);
                                      }}
                                      className={`p-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${restaurant.status === 'active' ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'}`}
                                    >
                                      {restaurant.status === 'active' ? 'Pausar' : 'Ativar'}
                                    </button>
                                    <div className="flex items-center space-x-1">
                                      <span className="text-[8px] font-black uppercase opacity-40">Rank:</span>
                                      <input 
                                        type="number"
                                        defaultValue={restaurant.ranking || 0}
                                        onClick={(e) => e.stopPropagation()}
                                        onBlur={(e) => {
                                          if (parseInt(e.target.value) !== (restaurant.ranking || 0)) {
                                            handleAdminAction('update_restaurant_ranking', { id: restaurant.id, ranking: parseInt(e.target.value) });
                                          }
                                        }}
                                        className="w-10 bg-white/10 border border-white/20 rounded-md p-0.5 text-[8px] font-black text-center"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </SortableItem>
                          );
                        })}
                      </SortableContext>
                    )}
                  </div>
                </section>
              )}

              {/* Categories */}
              <section id="categories-section" className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="bg-brand-blue text-white px-4 py-1 rounded-full shadow-lg shadow-blue-500/20">
                    <h3 className="text-[10px] font-black uppercase tracking-widest italic">CATEGORIAS</h3>
                  </div>
                  <button 
                    onClick={() => {
                      setSidebarType('categories');
                      setIsSidebarOpen(true);
                    }}
                    className="text-[10px] font-black uppercase tracking-widest text-brand-blue hover:underline flex items-center gap-1"
                  >
                    Ver Mais <ChevronRight size={12} />
                  </button>
                </div>
                <div className="flex space-x-4 md:space-x-8 overflow-x-auto no-scrollbar pb-4 -mx-4 px-4 md:mx-0 md:px-0">
                  {restaurants.length === 0 && !commonData.isLoaded ? (
                    [1, 2, 3, 4, 5, 6].map(i => (
                      <div key={`skeleton-categories-${i}`} className="flex flex-col items-center space-y-3 animate-pulse flex-shrink-0">
                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-slate-100 dark:bg-slate-800" />
                        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded w-12" />
                      </div>
                    ))
                  ) : (
                    <>
                      <div 
                        onClick={() => {
                          setActiveCategory('Todos');
                          hasManuallySelectedCategory.current = true;
                          const element = document.getElementById('products-section');
                          if (element) {
                            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }
                        }}
                        className="flex flex-col items-center space-y-3 cursor-pointer group flex-shrink-0"
                      >
                        <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center transition-all duration-300 ${activeCategory === 'Todos' ? 'bg-blue-gradient text-white shadow-xl shadow-blue-500/30' : 'bg-white dark:bg-slate-800 text-slate-950 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-100 dark:border-slate-700'}`}>
                          <Utensils size={24} className="md:w-8 md:h-8" />
                        </div>
                        <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-brand-blue opacity-100">Todos</span>
                      </div>
                      <SortableContext 
                        items={Array.from(new Set((isExclusiveView ? restaurantCategories : filteredCategories).map(c => c.id)))}
                        strategy={verticalListSortingStrategy}
                        disabled={!adminMode}
                      >
                        {(Array.from(new Map((isExclusiveView ? restaurantCategories : filteredCategories).map(c => [c.id, c])).values()) as Category[]).map((cat, idx) => (
                          <SortableItem key={`cat-main-${cat.id}-${idx}`} id={cat.id} type="category" disabled={!adminMode}>
                            <div 
                              onClick={() => {
                                setActiveCategory(cat.name);
                                hasManuallySelectedCategory.current = true;
                                const element = document.getElementById('products-section');
                                if (element) {
                                  element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }
                              }}
                              className="flex flex-col items-center space-y-3 cursor-pointer group flex-shrink-0"
                            >
                              <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center transition-all duration-300 overflow-hidden ${activeCategory === cat.name ? 'bg-blue-gradient text-white shadow-xl shadow-blue-500/30' : 'bg-white dark:bg-slate-800 text-slate-950 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-100 dark:border-slate-700'}`}>
                                {cat.imageUrl ? (
                                  <img src={cat.imageUrl || undefined} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : null}
                              </div>
                              <div className="flex flex-col items-center">
                                <span className="text-[10px] md:text-xs font-extrabold uppercase tracking-widest text-slate-950 dark:text-slate-950 opacity-100">{cat.name}</span>
                                {activeSchedulesMemo.filter(s => s && Array.isArray(s.categoryIds) && s.categoryIds.includes(cat.id)).map(schedule => (
                                  <div key={`cat-schedule-${cat.id}-${schedule.id}`} className="flex flex-col items-center">
                                    <span className="text-[8px] font-black text-brand-blue uppercase tracking-widest animate-pulse">
                                      {schedule.name}
                                    </span>
                                    <span className="text-[7px] font-bold text-slate-400">
                                      Finaliza às {schedule && schedule.endTime && typeof schedule.endTime === 'string' ? (schedule.endTime.split(':').length === 2 ? `${schedule.endTime}:00` : schedule.endTime) : '--:--'}
                                    </span>
                                    <span className="text-[7px] font-black text-emerald-500 uppercase">
                                      {schedule && typeof schedule.endTime === 'string' ? getScheduleTimeRemaining(schedule.endTime) : ''}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </SortableItem>
                        ))}
                      </SortableContext>
                    </>
                  )}
                </div>
              </section>
              
              {/* Exclusive View Products */}
              {isExclusiveView && selectedRestaurant && (
                <section className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="bg-brand-blue text-white px-4 py-1 rounded-full shadow-lg shadow-blue-500/20">
                      <h3 className="text-[10px] font-black uppercase tracking-widest italic">PRODUTOS</h3>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    <SortableContext 
                      items={Array.from(new Set(filteredRestaurantMenu.map(p => p.id)))}
                      strategy={rectSortingStrategy}
                      disabled={!adminMode}
                    >
                      {(Array.from(new Map(filteredRestaurantMenu.map(p => [p.id, p])).values()) as FoodItem[]).map((item, idx) => (
                        <SortableItem key={`food-main-${item.id}`} id={item.id} type="product" disabled={!adminMode}>
                          <motion.div 
                            whileHover={{ y: -5 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                              if (isProductAvailable(item, currentTime, selectedRestaurant)) {
                                addToCart(item);
                              }
                            }}
                            className={`bg-white dark:bg-slate-900 rounded-[2rem] p-3 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all flex flex-col space-y-3 group cursor-pointer relative overflow-hidden ${!isProductAvailable(item, currentTime, selectedRestaurant) ? 'opacity-60 cursor-not-allowed' : ''}`}
                          >
                            <div className="w-full aspect-square rounded-2xl overflow-hidden relative">
                              <img 
                                src={item.imageUrl || undefined} 
                                alt={item.name} 
                                className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ${!isProductAvailable(item, currentTime, selectedRestaurant) ? 'grayscale' : ''}`} 
                                referrerPolicy="no-referrer" 
                              />
                              {adminMode && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAdminAction('delete_product', item);
                                  }}
                                  className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                            <div className="flex-1 space-y-2">
                              <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-tight italic leading-tight text-sm truncate">{item.name}</h4>
                              <div className="flex items-center justify-between">
                                <span className="text-emerald-600 font-black text-sm">{formatPrice(item.price)}</span>
                                <div className="bg-brand-blue/10 text-brand-blue p-2 rounded-xl">
                                  <Plus size={16} />
                                </div>
                              </div>
                              
                              {adminMode && (
                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                                  <input 
                                    type="number"
                                    step="0.01"
                                    defaultValue={item.price}
                                    onClick={(e) => e.stopPropagation()}
                                    onBlur={(e) => {
                                      if (parseFloat(e.target.value) !== item.price) {
                                        handleAdminAction('update_product_price', { id: item.id, price: e.target.value });
                                      }
                                    }}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1 text-[10px] font-bold"
                                  />
                                </div>
                              )}
                            </div>
                          </motion.div>
                        </SortableItem>
                      ))}
                    </SortableContext>
                  </div>
                </section>
              )}

              {/* Featured Products (Tráfego Pago) */}
              {!isExclusiveView && featuredProducts.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="bg-brand-blue text-white px-4 py-1 rounded-full shadow-lg shadow-blue-500/20">
                      <h3 className="text-[10px] font-black uppercase tracking-widest italic flex items-center gap-2">
                        <Zap size={14} className="fill-white" />
                        PRODUTOS EM DESTAQUE
                      </h3>
                    </div>
                    <button 
                      onClick={() => setShowAllFeaturedModal(true)}
                      className="text-[10px] font-black uppercase tracking-widest text-brand-blue hover:underline flex items-center gap-1"
                    >
                      Ver Mais <ChevronRight size={12} />
                    </button>
                  </div>
                  <div className="flex space-x-6 overflow-x-auto no-scrollbar pb-4 -mx-4 px-4 md:mx-0 md:px-0">
                    {(Array.from(new Map(featuredProducts.map(p => [p.id, p])).values()) as FoodItem[]).map((product, fIdx) => {
                      const productRestaurant = restaurants.find(r => r.id === product.restaurantId);
                      return (
                        <motion.div 
                          key={`featured-food-${product.id}-${fIdx}`}
                          whileHover={{ scale: 1.05 }}
                          className="min-w-[160px] max-w-[160px] bg-white dark:bg-slate-900 rounded-[2rem] p-3 shadow-xl border-2 border-blue-100 dark:border-blue-900/30 relative overflow-hidden group flex flex-col space-y-3"
                          onClick={() => {
                            if (productRestaurant) {
                              setSelectedRestaurant(productRestaurant);
                              setView('restaurant');
                            }
                          }}
                        >
                          <div className="w-full aspect-square rounded-2xl overflow-hidden relative">
                            <img src={product.imageUrl || undefined} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                            <div className="absolute top-2 right-2 bg-brand-blue text-white px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg">
                              Destaque
                            </div>
                          </div>
                          <div className="flex-1 space-y-1">
                            <h4 className="font-black uppercase tracking-tight italic text-[10px] truncate text-slate-900 dark:text-white">{product.name}</h4>
                            <div className="flex flex-col">
                              {product.promoPrice ? (
                                <>
                                  <span className="text-red-500 font-bold line-through text-xs">{formatPrice(product.price)}</span>
                                  <span className="text-emerald-600 font-black text-sm">{formatPrice(product.promoPrice)}</span>
                                </>
                              ) : (
                                <span className="text-emerald-600 font-black text-sm">{formatPrice(product.price)}</span>
                              )}
                            </div>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                const res = restaurants.find(r => r.id === product.restaurantId);
                                if (res) {
                                  setSelectedRestaurant(res);
                                  setView('restaurant');
                                }
                              }}
                              className="w-full bg-brand-blue text-white py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all mt-1"
                            >
                              Ver Loja
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Scheduled Category Products (Priority) */}
              {!isExclusiveView && featuredProductsBySchedule.length > 0 && (
                <section className="space-y-6">
                  {featuredProductsBySchedule.map((schedule: any, sIdx: number) => (
                    <div key={`schedule-group-${schedule.id}-${sIdx}`} className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="bg-brand-blue text-white px-4 py-1 rounded-full shadow-lg shadow-blue-500/20 flex items-center gap-2">
                          <Clock size={12} className="animate-pulse" />
                          <h3 className="text-[10px] font-black uppercase tracking-widest italic">
                            {schedule.name} • FINALIZA EM {getScheduleTimeRemaining(schedule.endTime)}
                          </h3>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 md:gap-8">
                        {(Array.from(new Map((schedule.products as any[]).map(p => [p.id, p])).values()) as any[]).map((product: any) => {
                          const productRestaurant = restaurants.find(r => r.id === product.restaurantId);
                          return (
                            <motion.div 
                              key={`scheduled-prod-${schedule.id}-${product.id}`}
                              whileHover={{ y: -8 }}
                              className="group cursor-pointer bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 border border-slate-100 dark:border-slate-800"
                              onClick={() => {
                                if (productRestaurant) {
                                  setSelectedRestaurant(productRestaurant);
                                  setView('restaurant');
                                }
                              }}
                            >
                              <div className="aspect-square relative overflow-hidden">
                                <img 
                                  src={product.imageUrl || `https://picsum.photos/seed/${product.id}/800/600`} 
                                  alt={product.name}
                                  className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ${!isProductAvailable(product, currentTime, productRestaurant) ? 'grayscale opacity-50' : ''}`}
                                  referrerPolicy="no-referrer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedProductForMedia(product);
                                  }}
                                />
                                {isFlashSaleActive(product) && (
                                  <div className="absolute bottom-4 left-4 right-4">
                                    <FlashSaleTimer item={product} />
                                  </div>
                                )}
                                {!isProductAvailable(product, currentTime, productRestaurant) && (
                                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-4">
                                    <span className="bg-white text-slate-900 px-4 py-2 rounded-2xl font-black uppercase tracking-widest text-[10px] italic shadow-xl text-center leading-tight">
                                      {getProductUnavailabilityReason(product, currentTime, productRestaurant)}
                                    </span>
                                  </div>
                                )}
                                {((product.promoPrice && !product.isFlashSale) || isFlashSaleActive(product)) && (
                                  <div className={`absolute top-4 left-4 ${isFlashSaleActive(product) ? 'bg-orange-500' : 'bg-brand-blue'} text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest`}>
                                    {isFlashSaleActive(product) ? 'Oferta Relâmpago' : 'Promoção'}
                                  </div>
                                )}
                              </div>
                              <div className="p-3 space-y-2">
                                <div className="flex items-center justify-between gap-1">
                                  <h4 className="text-xs font-black uppercase tracking-tight italic leading-tight truncate flex-1 text-slate-900 dark:text-white">{product.name}</h4>
                                  <button 
                                    disabled={!isProductAvailable(product, currentTime, productRestaurant)}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (isProductAvailable(product, currentTime, productRestaurant)) {
                                        addToCart(product);
                                      }
                                    }}
                                    className={`p-2 rounded-xl transition-all ${isProductAvailable(product, currentTime, productRestaurant) ? 'bg-brand-blue text-white shadow-lg shadow-blue-500/20 hover:scale-110' : 'bg-slate-100 text-slate-300'}`}
                                  >
                                    <Plus size={14} />
                                  </button>
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className="flex flex-col">
                                    {product.promoPrice ? (
                                      <>
                                        <span className="text-xs text-red-500 font-bold line-through">{formatPrice(product.price)}</span>
                                        <span className="text-sm font-black text-emerald-600">{formatPrice(product.promoPrice)}</span>
                                      </>
                                    ) : (
                                      <span className="text-sm font-black text-emerald-600">{formatPrice(product.price)}</span>
                                    )}
                                  </div>
                                  {productRestaurant && (
                                    <div className="flex items-center space-x-1">
                                      <Star size={8} className="text-amber-400 fill-current" />
                                      <span className="text-[8px] font-bold text-slate-500">{productRestaurant.rating || 'N/A'}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </section>
              )}

              {/* Products Section */}
              {!isExclusiveView && restaurants.length > 0 && (
                <section id="products-section" className="space-y-6 scroll-mt-20">
                  <div className="flex items-center justify-between">
                    <div className="bg-brand-blue text-white px-4 py-1 rounded-full shadow-lg shadow-blue-500/20">
                      <h3 className="text-[10px] font-black uppercase tracking-widest italic">
                        {activeCategory === 'Todos' ? 'DESTAQUE' : activeCategory.toUpperCase()}
                      </h3>
                    </div>
                  </div>

                  {searchTerm && (
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center space-x-2">
                        <Search size={16} className="text-slate-400" />
                        <span className="text-sm font-bold text-slate-500 italic">
                          Resultados para "{searchTerm}"
                        </span>
                      </div>
                      {searchSuggestion && (
                        <button 
                          onClick={() => setSearchTerm(searchSuggestion)}
                          className="text-xs text-brand-blue font-bold hover:underline text-left"
                        >
                          Você quis dizer: <span className="italic">{searchSuggestion}</span>?
                        </button>
                      )}
                    </div>
                  )}

                  {filteredProducts.length === 0 ? (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 md:p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 space-y-6 shadow-xl shadow-blue-500/5"
                    >
                      <div className="flex flex-col items-center space-y-4">
                        <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-300">
                          <Search size={40} />
                        </div>
                        <div className="space-y-2">
                          <h4 className="text-xl font-black uppercase tracking-tight italic text-slate-800 dark:text-white">Nenhum produto encontrado</h4>
                          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                            Não encontramos nenhum produto nesta categoria. Que tal ser o primeiro a cadastrar sua empresa e produtos aqui?
                          </p>
                          <button 
                            onClick={() => {
                              setTargetRole('manager');
                              setAuthModalMessage('Cadastre sua empresa e comece a vender agora!');
                              setIsAuthModalOpen(true);
                            }}
                            className="mt-4 bg-blue-gradient text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-500/20 hover:scale-105 transition-all"
                          >
                            Fazer Cadastro
                          </button>
                        </div>
                        {searchTerm && (
                          <button 
                            onClick={() => setSearchTerm('')}
                            className="text-brand-blue font-black uppercase tracking-widest text-xs hover:underline"
                          >
                            Limpar pesquisa
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 md:gap-8">
                      {(Array.from(new Map(filteredProducts.map(p => [p.id, p])).values()) as FoodItem[]).map((product, pIdx) => {
                        const productRestaurant = restaurants.find(r => r.id === product.restaurantId);
                        return (
                          <motion.div 
                            key={`search-global-${product.id}-${pIdx}`}
                            whileHover={{ y: -8 }}
                            className="group cursor-pointer bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 border border-slate-100 dark:border-slate-800"
                            onClick={() => {
                              if (productRestaurant) {
                                setSelectedRestaurant(productRestaurant);
                                setView('restaurant');
                              }
                            }}
                          >
                            <div className="aspect-square relative overflow-hidden">
                              <img 
                                src={product.imageUrl || `https://picsum.photos/seed/${product.id}/800/600`} 
                                alt={product.name}
                                className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ${!isProductAvailable(product, currentTime, productRestaurant) ? 'grayscale opacity-50' : ''}`}
                                referrerPolicy="no-referrer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedProductForMedia(product);
                                }}
                              />
                              {isFlashSaleActive(product) && (
                                <div className="absolute bottom-4 left-4 right-4">
                                  <FlashSaleTimer item={product} />
                                </div>
                              )}
                              {!isProductAvailable(product, currentTime, productRestaurant) && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-4">
                                  <span className="bg-white text-slate-900 px-4 py-2 rounded-2xl font-black uppercase tracking-widest text-[10px] italic shadow-xl text-center leading-tight">
                                    {getProductUnavailabilityReason(product, currentTime, productRestaurant)}
                                  </span>
                                </div>
                              )}
                              {((product.promoPrice && !product.isFlashSale) || isFlashSaleActive(product)) && (
                                <div className={`absolute top-4 left-4 ${isFlashSaleActive(product) ? 'bg-orange-500' : 'bg-brand-blue'} text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest`}>
                                  {isFlashSaleActive(product) ? 'Oferta Relâmpago' : 'Promoção'}
                                </div>
                              )}
                            </div>
                            <div className="p-3 space-y-2">
                              <div className="flex items-center justify-between gap-1">
                                <h4 className="text-xs font-black uppercase tracking-tight italic leading-tight truncate flex-1 text-slate-900 dark:text-white">{product.name}</h4>
                                <button 
                                  disabled={!isProductAvailable(product, currentTime, productRestaurant)}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isProductAvailable(product, currentTime, productRestaurant)) {
                                      addToCart(product);
                                    }
                                  }}
                                  className={`${!isProductAvailable(product, currentTime, productRestaurant) ? 'bg-slate-200 cursor-not-allowed' : 'bg-brand-blue shadow-brand-blue/20 hover:scale-110'} text-white p-1.5 rounded-xl shadow-lg transition-transform`}
                                >
                                  <Plus size={14} />
                                </button>
                              </div>
                            <p className="text-[10px] font-medium text-slate-400 line-clamp-1 leading-tight">{product.description}</p>
                            <div className="pt-1 flex flex-col">
                              {(product.promoPrice || (product.isFlashSale && isFlashSaleActive(product))) && (
                                <span className="text-xs text-red-500 font-bold line-through leading-none">{formatPrice(product.price)}</span>
                              )}
                              <span className="text-emerald-600 dark:text-emerald-400 font-black text-sm italic leading-tight">
                                {formatPrice(isFlashSaleActive(product) ? (product.promoPrice || product.price) : (product.isFlashSale ? product.price : (product.promoPrice || product.price)))}
                              </span>
                              {(product.isDeliveryFree || productRestaurant?.isDeliveryFree) && (
                                <div className="flex items-center gap-1 text-emerald-500 mt-1">
                                  <Bike size={10} />
                                  <span className="text-[8px] font-black uppercase tracking-widest italic">Grátis</span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center justify-between pt-1">
                              <div className="flex flex-col space-y-0.5">
                                <div className="flex items-center space-x-1">
                                  <div className="w-4 h-4 rounded-full overflow-hidden border border-slate-100">
                                    <img 
                                      src={productRestaurant?.imageUrl || `https://picsum.photos/seed/${product.restaurantId}/100/100`} 
                                      className="w-full h-full object-cover"
                                      referrerPolicy="no-referrer"
                                    />
                                  </div>
                                   <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 truncate max-w-[60px]">
                                     {productRestaurant?.name}
                                   </span>
                                </div>
                                <div className="flex items-center gap-1 text-[8px] font-black uppercase text-brand-blue">
                                  <Clock size={8} />
                                  <span>{product.preparationTimeMinutes ? `${product.preparationTimeMinutes + 20} min` : '30-45 min'}</span>
                                </div>
                              </div>
                              <div className="scale-75 origin-right">
                                <StarRating ratingData={getAverageRating(product.id, true)} variant="numeric" />
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                    </div>
                    {hasMoreProducts && (
                      <div className="flex justify-center pt-8">
                        <button
                          onClick={fetchNextProductsBatch}
                          disabled={isPaginationLoading}
                          className="flex items-center gap-2 bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white px-8 py-3.5 rounded-[1.75rem] font-black uppercase tracking-widest text-[11px] shadow-md hover:shadow-xl hover:scale-105 active:scale-95 disabled:opacity-50 transition-all disabled:pointer-events-none italic"
                        >
                          {isPaginationLoading ? (
                            <>
                              <Loader2 size={16} className="animate-spin text-brand-blue" />
                              Carregando produtos...
                            </>
                          ) : (
                            <>
                              <TrendingUp size={14} className="text-emerald-500" />
                              Ver mais produtos
                            </>
                          )}
                        </button>
                      </div>
                    )}
                    </>
                  )}
                </section>
              )}

              {/* Restaurants as Icons (Removed because it was moved up) */}

            {/* Empty State or Persistent Join Us Card */}
            {!isExclusiveView && (
              <section className="pt-8 pb-12">
                {restaurants.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 md:p-12 text-center border-2 border-dashed border-white/20 space-y-6 shadow-xl shadow-brand-blue/5"
                  >
                    <div className="flex flex-col items-center space-y-4">
                      <motion.div
                        animate={{ 
                          scale: [1, 1.2, 1],
                          rotate: [0, 5, -5, 0],
                          filter: ["drop-shadow(0 0 0px #f97316)", "drop-shadow(0 0 15px #f97316)", "drop-shadow(0 0 0px #f97316)"]
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="text-orange-500"
                      >
                        <Flame size={64} fill="currentColor" />
                      </motion.div>
                      <div className="space-y-4">
                        <p className="text-lg md:text-xl font-black text-slate-900 dark:text-white leading-tight italic uppercase">
                          Não temos nenhuma empresa cadastrada em{' '}
                          <motion.span
                            animate={{ opacity: [1, 0.5, 1], scale: [1, 1.05, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="text-orange-500 inline-block"
                          >
                            {userCity || 'sua região'}
                          </motion.span>{' '}
                          ainda. Quer ser o primeiro? Faça o cadastro agora e fature por ser o pioneiro!
                        </p>
                        <button 
                          onClick={() => {
                            if (globalSettings?.businessRegistrationPhone) {
                              const cleanPhone = globalSettings.businessRegistrationPhone.replace(/\D/g, '');
                              window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent('Olá! Gostaria de cadastrar minha empresa no Xô Fome.')}`, '_blank');
                            } else {
                              navigate('/manager?tutorial=true', { state: { isRegistering: true } });
                            }
                          }}
                          className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg shadow-orange-500/20 transition-all hover:scale-105 active:scale-95"
                        >
                          Fazer cadastro
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    className="bg-blue-gradient rounded-[3rem] p-8 md:p-12 text-center space-y-6 shadow-2xl shadow-blue-500/20"
                  >
                    <div className="flex flex-col items-center space-y-4">
                      <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-white">
                        <Store size={32} />
                      </div>
                      <div className="space-y-4">
                        <p className="text-lg md:text-xl font-black text-white leading-tight italic uppercase">
                          Ainda temos poucas empresas cadastradas. Quer faturar vendendo seus produtos?
                        </p>
                        <button 
                          onClick={() => {
                            if (globalSettings?.businessRegistrationPhone) {
                              const cleanPhone = globalSettings.businessRegistrationPhone.replace(/\D/g, '');
                              window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent('Olá! Gostaria de cadastrar minha empresa no Xô Fome.')}`, '_blank');
                            } else {
                              navigate('/manager?tutorial=true', { state: { isRegistering: true } });
                            }
                          }}
                          className="bg-white text-brand-blue px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg transition-all hover:scale-105 active:scale-95"
                        >
                          Cadastrar empresa
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </section>
            )}
          </motion.div>
          )}

          {view === 'search-results' && (
            <motion.div
              key="search-results"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              {/* Back to home / Header bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setView('home')}
                    className="p-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-2xl transition-all flex items-center justify-center shrink-0 border border-slate-100 dark:border-slate-800"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <div>
                    <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight italic text-blue-900 dark:text-white">
                      Resultados da Busca
                    </h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1 mt-0.5">
                      <Search size={12} className="text-blue-500" />
                      <span>{allMatchedProducts.length} itens correspondentes para "{searchTerm}"</span>
                    </p>
                  </div>
                </div>

                {/* Switch back or clear */}
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setView('home');
                  }}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-widest transition-all align-self-start md:align-self-auto"
                >
                  Limpar pesquisa e voltar
                </button>
              </div>

              {/* Matched Products List */}
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="bg-brand-blue text-white px-4 py-1.5 rounded-full shadow-lg shadow-blue-500/20">
                    <h4 className="text-[10px] font-black uppercase tracking-widest italic flex items-center gap-1">
                      <ShoppingBag size={12} />
                      Produtos ({allMatchedProducts.length})
                    </h4>
                  </div>
                </div>

                {allMatchedProducts.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-slate-900 rounded-[3rem] p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 space-y-4"
                  >
                    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full mx-auto flex items-center justify-center text-slate-300">
                      <Search size={32} />
                    </div>
                    <div>
                      <h4 className="text-base font-black uppercase tracking-tight italic text-slate-800 dark:text-white">Nenhum produto encontrado</h4>
                      <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1 uppercase tracking-wider font-bold">
                        Tente pesquisar com termos mais simples ou confira em outra cidade.
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                    {allMatchedProducts.map((product) => {
                      const productRestaurant = restaurants.find(r => r.id === product.restaurantId);
                      const isAvailable = isProductAvailable(product, currentTime, productRestaurant);
                      const distance = productRestaurant && productRestaurant.latitude && productRestaurant.longitude && userLocation
                        ? calculateDistance(userLocation.latitude, userLocation.longitude, productRestaurant.latitude, productRestaurant.longitude)
                        : null;

                      return (
                        <div
                          key={`search-all-prod-${product.id}`}
                          onClick={() => {
                            if (!isAvailable) return;
                            addToCart(product, []);
                            setCartViewTab('cart');
                            setIsCartOpen(true);
                          }}
                          className={`bg-white dark:bg-slate-900 rounded-[2.5rem] p-4 border-2 border-slate-50 dark:border-slate-800 hover:border-slate-100 dark:hover:border-slate-700 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 flex flex-col h-full group cursor-pointer relative ${!isAvailable ? 'opacity-65 cursor-not-allowed' : ''}`}
                        >
                          {/* Image */}
                          <div className="w-full aspect-square rounded-[1.8rem] overflow-hidden bg-slate-50 dark:bg-slate-800 relative shrink-0 border border-slate-100/50 dark:border-slate-800">
                            <img
                              src={product.imageUrl || `https://picsum.photos/seed/${product.id}/200/200`}
                              className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${!isAvailable ? 'grayscale opacity-50' : ''}`}
                              referrerPolicy="no-referrer"
                            />
                            {product.isFlashSale && isFlashSaleActive(product) && isAvailable && (
                              <div className="absolute top-3 left-3 bg-red-500 text-white px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest animate-pulse">
                                OFERTA
                              </div>
                            )}
                            {!isAvailable && (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-3">
                                <span className="bg-white text-slate-900 px-3 py-1.5 rounded-xl font-black uppercase tracking-widest text-[9px] italic shadow-xl text-center leading-tight">
                                  {getProductUnavailabilityReason(product, currentTime, productRestaurant) || 'Indisponível'}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="flex-1 flex flex-col justify-between mt-3 space-y-2">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <p className="text-[9px] text-blue-600 dark:text-blue-400 font-extrabold uppercase tracking-widest truncate max-w-[120px]">
                                  {productRestaurant?.name || 'Xô Fome'}
                                </p>
                                {distance !== null && (
                                  <span className="text-[8px] text-slate-400 font-extrabold flex items-center gap-0.5 shrink-0">
                                    <MapPin size={8} className="text-rose-500" />
                                    {distance.toFixed(1)} km
                                  </span>
                                )}
                              </div>
                              <h4 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white line-clamp-1 group-hover:text-blue-600 transition-colors">
                                {product.name}
                              </h4>
                              <p className="text-[10px] text-slate-400 line-clamp-2 leading-snug">
                                {product.description}
                              </p>
                            </div>

                            <div className="flex items-baseline justify-between pt-1 border-t border-slate-50 dark:border-slate-800/60 mt-1">
                              <div>
                                {(product.promoPrice || (product.isFlashSale && isFlashSaleActive(product))) && (
                                  <span className="text-[10px] text-slate-400 line-through block leading-none">
                                    {formatPrice(product.price)}
                                  </span>
                                )}
                                <span className="text-sm font-black italic text-emerald-600 dark:text-emerald-400 leading-none">
                                  {formatPrice(product.isFlashSale ? (isFlashSaleActive(product) ? (product.promoPrice || product.price) : product.price) : (product.promoPrice || product.price))}
                                </span>
                              </div>

                              {product.preparationTimeMinutes && (
                                <span className="text-[9px] text-slate-400 font-bold flex items-center gap-0.5 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-lg">
                                  <Clock size={8} />
                                  {product.preparationTimeMinutes} m
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </motion.div>
          )}

          {view === 'restaurant' && selectedRestaurant && (
            <motion.div 
              key="restaurant"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              {!isExclusiveView && (
                <button 
                  onClick={() => setView('home')}
                  className="flex items-center space-x-2 text-slate-400 hover:text-brand-blue transition-colors font-black uppercase tracking-widest text-[10px]"
                >
                  <ArrowLeft size={16} />
                  <span>Voltar para Início</span>
                </button>
              )}

              {isExclusiveView ? (
                <>
                  <div className="flex flex-col items-center space-y-6 py-8">
                    <div className="w-32 h-32 md:w-48 md:h-48 rounded-full overflow-hidden border-4 border-white dark:border-slate-800 shadow-2xl">
                      <img 
                        src={selectedRestaurant.imageUrl || undefined} 
                        alt={selectedRestaurant.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    
                    <div className="flex flex-col items-center space-y-2">
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowHoursModal(selectedRestaurant);
                        }}
                        className={`${getTimeRemaining(selectedRestaurant, currentTime).status === 'open' ? 'bg-emerald-500' : 'bg-red-500'} text-white px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest flex items-center justify-center space-x-2 cursor-pointer hover:scale-105 transition-transform mx-auto w-fit shadow-lg shadow-emerald-500/20`}
                      >
                        <span>
                          {getTimeRemaining(selectedRestaurant, currentTime).status === 'open' ? 'Aberto' : 'Fechado'}
                        </span>
                        <Clock size={14} />
                      </div>
                      
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 animate-pulse">
                        {getTimeRemaining(selectedRestaurant, currentTime).text}
                      </div>
                    </div>
                    
                    {/* Detailed Hours Preview */}
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center space-x-2">
                      <span>Horário de hoje:</span>
                      <span className="text-slate-600 dark:text-slate-300">
                        {(() => {
                          const day = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
                          const hours = selectedRestaurant.weeklyHours?.[day];
                          if (!hours || hours.closed) return 'Fechado';
                          return `${hours.open} - ${hours.close}`;
                        })()}
                      </span>
                    </div>
                  </div>

                      <div className="text-center space-y-4">
                        <div className="flex flex-col items-center">
                          <div className="flex items-center gap-4">
                            <h2 className="text-base sm:text-2xl md:text-6xl font-black text-slate-900 dark:text-white italic tracking-tighter uppercase flex items-center justify-center min-w-0 px-6 max-w-full">
                              <span className="truncate">{selectedRestaurant.name}</span>
                              <VerifiedBadge />
                            </h2>
                            <LikeButton itemId={selectedRestaurant.id} itemType="restaurant" count={selectedRestaurant.likesCount} className="scale-150" />
                          </div>
                          {isNewRestaurant(selectedRestaurant.createdAt) && (
                        <span className="text-xs font-black text-blue-500 uppercase italic">novo</span>
                      )}
                    </div>
                    <p className="text-slate-400 text-sm font-medium max-w-xl mx-auto">{selectedRestaurant.description}</p>
                  </div>
                </>
              ) : (
                <div className="relative h-48 md:h-80 rounded-[3rem] overflow-hidden group shadow-2xl shadow-blue-500/10">
                  <img 
                    src={selectedRestaurant.imageUrl || undefined} 
                    alt={selectedRestaurant.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent flex items-end p-8 md:p-12">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                      <div className="flex flex-col items-start">
                        <h2 className="text-base sm:text-2xl md:text-5xl font-black text-white italic tracking-tighter uppercase flex items-center min-w-0 max-w-full pr-4">
                          <span className="truncate">{selectedRestaurant.name}</span>
                          <VerifiedBadge />
                        </h2>
                        <LikeButton itemId={selectedRestaurant.id} itemType="restaurant" count={selectedRestaurant.likesCount} className="ml-4" />
                        {isNewRestaurant(selectedRestaurant.createdAt) && (
                          <span className="text-xs font-black text-blue-400 uppercase italic">novo</span>
                        )}
                      </div>
                        <div className="flex flex-col items-start space-y-1">
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowHoursModal(selectedRestaurant);
                            }}
                            className={`${isRestaurantOpen(selectedRestaurant, currentTime) ? 'bg-emerald-500' : 'bg-red-500'} text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center space-x-1 cursor-pointer hover:scale-105 transition-transform`}
                          >
                            <span>
                              {isRestaurantOpen(selectedRestaurant, currentTime) 
                                ? 'Aberto' 
                                : 'Fechado'}
                            </span>
                            <Clock size={10} />
                          </div>
                          <div className="text-[8px] font-black uppercase tracking-widest text-white/80 animate-pulse">
                            {getTimeRemaining(selectedRestaurant, currentTime).text}
                          </div>
                        </div>
                      </div>
                      <p className="text-slate-200 text-sm font-medium max-w-xl line-clamp-2">{selectedRestaurant.description}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className={isExclusiveView ? "space-y-12" : "grid grid-cols-1 lg:grid-cols-3 gap-12"}>
                <div className={isExclusiveView ? "space-y-12" : "lg:col-span-2 space-y-12"}>
                  {!isExclusiveView && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <StarRating ratingData={getAverageRating(selectedRestaurant.id, false, selectedRestaurant.rating)} size={20} />
                        <span className="text-sm font-bold text-slate-400">
                          {allReviews.filter(r => r.restaurantId === selectedRestaurant.id && !r.productId).length} avaliações
                        </span>
                      </div>
                      <button 
                        onClick={() => {
                          setSelectedProductForReview(null);
                          setOrderStep('idle'); // Just to scroll or focus if needed, but we'll show the form below
                        }}
                        className="bg-brand-blue text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest"
                      >
                        Avaliar Empresa
                      </button>
                    </div>
                  )}

                  <section className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-xl md:text-2xl font-black uppercase tracking-tighter italic">Cardápio</h3>
                          <button 
                            onClick={() => setIsRestaurantSearchOpen(!isRestaurantSearchOpen)}
                            className={`p-2 rounded-xl transition-all ${isRestaurantSearchOpen ? 'bg-brand-blue text-white' : 'bg-slate-100 text-slate-400'}`}
                          >
                            <Search size={18} />
                          </button>
                        </div>
                        
                        <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pb-2 max-w-[60%] md:max-w-none">
                          <button
                            onClick={() => setRestaurantActiveCategory('Todos')}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${restaurantActiveCategory === 'Todos' ? 'bg-brand-blue text-white shadow-lg shadow-blue-500/20' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                          >
                            Todos
                          </button>
                          {(Array.from(new Map(restaurantCategories.map(c => [c.id, c])).values()) as Category[]).map(cat => (
                            <button
                              key={cat.id}
                              onClick={() => setRestaurantActiveCategory(cat.name)}
                              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${restaurantActiveCategory === cat.name ? 'bg-brand-blue text-white shadow-lg shadow-blue-500/20' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                            >
                              {cat.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      <AnimatePresence>
                        {isRestaurantSearchOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="relative">
                              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                              <input 
                                type="text"
                                placeholder="Pesquisar no cardápio..."
                                value={restaurantSearchTerm}
                                onChange={(e) => {
                                  if (checkAdminCommand(e.target.value)) {
                                    setRestaurantSearchTerm('');
                                    return;
                                  }
                                  setRestaurantSearchTerm(e.target.value);
                                }}
                                className="w-full bg-slate-100 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-brand-blue transition-all"
                                autoFocus
                              />
                              {restaurantSearchTerm && (
                                <button 
                                  onClick={() => setRestaurantSearchTerm('')}
                                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                  <X size={16} />
                                </button>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    
                    {!isRestaurantOpen(selectedRestaurant, currentTime) && (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 p-6 rounded-[2rem] text-center space-y-2">
                        {selectedRestaurant.isWalletBlocked ? (
                          <AlertTriangle size={32} className="text-amber-500 mx-auto mb-2" />
                        ) : (
                          <Clock size={32} className="text-red-500 mx-auto mb-2" />
                        )}
                        <h4 className={`text-lg font-black uppercase tracking-tight italic ${selectedRestaurant.isWalletBlocked ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                          {selectedRestaurant.isWalletBlocked ? 'Empresa Indisponível' : 'Empresa Fechada'}
                        </h4>
                        <p className={`${selectedRestaurant.isWalletBlocked ? 'text-amber-500/70' : 'text-red-500/70'} text-sm font-medium`}>
                          {selectedRestaurant.isWalletBlocked 
                            ? 'Esta empresa está temporariamente indisponível para novos pedidos.' 
                            : 'No momento a empresa está fechada. Você pode visualizar o cardápio, mas não é possível realizar pedidos agora.'}
                        </p>
                      </div>
                    )}

                    {restaurantMenu.length === 0 ? (
                      <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-700 space-y-4">
                        <Utensils size={48} className="text-slate-200 dark:text-slate-700 mx-auto" />
                        <div className="space-y-1">
                          <p className="text-lg font-black uppercase tracking-tight italic text-slate-400">Cardápio Vazio</p>
                          <p className="text-slate-400 text-sm font-medium">Esta empresa ainda não adicionou produtos ao cardápio.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {filteredRestaurantMenu.map((item, idx) => (
                          <motion.div 
                            key={`menu-item-${item.id}-${idx}`}
                            id={`product-${item.id}`}
                            whileHover={{ y: -5 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                              if (isProductAvailable(item, currentTime, selectedRestaurant)) {
                                addToCart(item);
                              }
                            }}
                            className={`bg-white dark:bg-slate-900 rounded-[2rem] p-3 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all flex flex-col space-y-3 group cursor-pointer relative overflow-hidden ${!isProductAvailable(item, currentTime, selectedRestaurant) ? 'opacity-60 cursor-not-allowed' : ''}`}
                          >
                            <div className="w-full aspect-square rounded-2xl overflow-hidden relative">
                              <img 
                                src={item.imageUrl || undefined} 
                                alt={item.name} 
                                className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ${!isProductAvailable(item, currentTime, selectedRestaurant) ? 'grayscale' : ''}`} 
                                referrerPolicy="no-referrer" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedProductForMedia(item);
                                }}
                              />
                              {!isProductAvailable(item, currentTime, selectedRestaurant) && (
                                <div className="absolute inset-0 bg-black/20 flex items-center justify-center p-1">
                                  <span className="text-[8px] font-black text-white uppercase italic bg-black/60 px-2 py-1 rounded-lg text-center leading-tight">
                                    {getProductUnavailabilityReason(item, currentTime, selectedRestaurant)}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 space-y-2">
                              <div className="flex justify-between items-start gap-1">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-tight italic leading-tight text-sm truncate">{item.name}</h4>
                                  <p className="text-[10px] text-slate-400 line-clamp-1">{item.description}</p>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  {cart.find(i => i.id === item.id) && (
                                    <span className="bg-brand-blue text-white text-[10px] font-black px-2 py-1 rounded-lg shadow-lg animate-bounce flex-shrink-0">
                                      {cart.find(i => i.id === item.id)?.quantity}x
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                  {(item.promoPrice || (item.isFlashSale && isFlashSaleActive(item))) && (
                                    <span className="text-xs text-red-500 font-bold line-through leading-none">{formatPrice(item.price)}</span>
                                  )}
                                  <div className="flex items-center gap-2">
                                    <span className="text-emerald-600 font-black text-sm leading-tight">
                                      {formatPrice(item.isFlashSale ? (isFlashSaleActive(item) ? (item.promoPrice || item.price) : item.price) : (item.promoPrice || item.price))}
                                    </span>
                                    <LikeButton itemId={item.id} itemType="product" count={item.likesCount} />
                                  </div>
                                  {(item.isDeliveryFree || selectedRestaurant?.isDeliveryFree) && (
                                    <div className="flex items-center gap-1 text-emerald-500 mt-1">
                                      <Bike size={10} />
                                      <span className="text-[8px] font-black uppercase tracking-widest italic">Grátis</span>
                                    </div>
                                  )}
                                  <div className="scale-75 origin-left -ml-2">
                                    <StarRating ratingData={getAverageRating(item.id, true)} variant="numeric" />
                                  </div>
                                </div>
                                <div 
                                  className={`${!isProductAvailable(item, currentTime, selectedRestaurant) ? 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600' : 'bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue dark:text-brand-blue group-hover:bg-brand-blue group-hover:text-white transition-all'} p-2 rounded-xl`}
                                >
                                  <Plus size={16} />
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* Reviews Section */}
                  {!isExclusiveView && (
                    <section className="space-y-8">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl md:text-2xl font-black uppercase tracking-tighter italic">Avaliações</h3>
                      <div className="flex items-center space-x-2 text-brand-blue bg-brand-blue/10 px-4 py-2 rounded-full">
                        <Star size={16} fill="currentColor" />
                        <span className="text-xs font-black">
                          {(() => {
                            const rd = getAverageRating(selectedRestaurant.id, false, selectedRestaurant.rating);
                            return rd.count === 0 ? "Novo" : `${rd.rating} (${rd.count})`;
                          })()}
                        </span>
                      </div>
                    </div>

                    {user && (() => {
                      const hasReviewedStore = restaurantReviews.some(r => r.customerUid === user.uid && !r.productId);
                      
                      // Se já avaliou a loja e não está editando nem avaliando um produto específico, esconde o formulário
                      if (hasReviewedStore && !editingReviewId && !selectedProductForReview) {
                        return (
                          <div className="bg-blue-50 rounded-[2rem] p-6 border border-blue-100 text-center space-y-3">
                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-brand-blue mx-auto shadow-sm">
                              <ShieldCheck size={24} />
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm font-black text-slate-900 uppercase tracking-tighter italic">Você já avaliou esta empresa!</p>
                              <p className="text-[10px] text-slate-500 font-medium">Use os botões de editar ou apagar no seu comentário abaixo se desejar fazer alterações.</p>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <form onSubmit={handleAddReview} className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                {editingReviewId ? 'Editando sua Avaliação:' : (selectedProductForReview ? `Nota para ${selectedProductForReview.name}:` : 'Sua Nota:')}
                              </span>
                              <div className="flex space-x-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button 
                                    key={`rating-star-main-${star}`}
                                    type="button"
                                    onClick={() => setNewReviewRating(star)}
                                    className={`${newReviewRating >= star ? 'text-brand-blue' : 'text-slate-200'} transition-colors`}
                                  >
                                    <Star size={20} fill={newReviewRating >= star ? 'currentColor' : 'none'} />
                                  </button>
                                ))}
                              </div>
                            </div>
                            {(selectedProductForReview || editingReviewId) && (
                              <button 
                                type="button"
                                onClick={() => {
                                  setSelectedProductForReview(null);
                                  setEditingReviewId(null);
                                  setNewReviewComment('');
                                  setNewReviewRating(5);
                                }}
                                className="text-[8px] font-black uppercase tracking-widest text-slate-400"
                              >
                                Cancelar
                              </button>
                            )}
                          </div>
                          <textarea 
                            value={newReviewComment}
                            onChange={(e) => setNewReviewComment(e.target.value)}
                            placeholder={selectedProductForReview ? "O que você achou deste produto?" : "O que você achou deste restaurante?"}
                            className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500/20 h-24"
                            required
                          />

                          {/* Media Upload and Preview */}
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <label className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors">
                                <Camera size={14} />
                                <span>Anexar Foto/Vídeo</span>
                                <input 
                                  type="file" 
                                  accept="image/*,video/*" 
                                  className="hidden" 
                                  onChange={handleReviewMediaUpload}
                                  disabled={isUploadingReviewMedia}
                                />
                              </label>
                              {isUploadingReviewMedia && (
                                <div className="flex items-center gap-2 text-[8px] font-black text-brand-blue uppercase animate-pulse">
                                  <RefreshCw size={10} className="animate-spin" />
                                  Carregando...
                                </div>
                              )}
                            </div>

                            {newReviewMedia && (
                              <div className="relative w-24 h-24 group">
                                {newReviewMedia.type === 'video' ? (
                                  <video src={newReviewMedia.url} className="w-full h-full object-cover rounded-2xl border-2 border-brand-blue" />
                                ) : (
                                  <img src={newReviewMedia.url} className="w-full h-full object-cover rounded-2xl border-2 border-brand-blue" referrerPolicy="no-referrer" />
                                )}
                                <button 
                                  type="button"
                                  onClick={() => setNewReviewMedia(null)}
                                  className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            )}
                          </div>

                          <button 
                            type="submit"
                            className="w-full bg-blue-gradient text-white py-3 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-500/20"
                          >
                            {editingReviewId ? 'Salvar Alterações' : (selectedProductForReview ? 'Enviar Avaliação do Produto' : 'Enviar Avaliação da Empresa')}
                          </button>
                        </form>
                      );
                    })()}

                    <div className="space-y-4">
                      {restaurantReviews.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                          <p className="text-slate-400 font-medium italic">Nenhuma avaliação ainda. Seja o primeiro!</p>
                        </div>
                      ) : (
                        (Array.from(new Map(restaurantReviews.map(r => [r.id, r])).values()) as Review[]).map((review) => {
                          const isReviewOwner = review.customerUid === user?.uid;
                          const isRestaurantOwner = selectedRestaurant?.ownerUid === user?.uid;

                          return (
                            <div 
                              key={review.id} 
                              onClick={() => {
                                if (isRestaurantOwner) {
                                  setSelectedReviewForDetails(review);
                                }
                              }}
                              className={`bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4 relative transition-all ${isRestaurantOwner ? 'cursor-pointer hover:border-brand-blue/30 hover:shadow-md' : ''}`}
                            >
                              <div className="absolute top-4 right-4 flex items-center space-x-2">
                                {isReviewOwner && (
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingReviewId(review.id);
                                      setNewReviewComment(review.comment);
                                      setNewReviewRating(review.rating);
                                      if (review.mediaUrl && review.mediaType) {
                                        setNewReviewMedia({ url: review.mediaUrl, type: review.mediaType });
                                      } else {
                                        setNewReviewMedia(null);
                                      }
                                      // Scroll to form
                                      window.scrollTo({ top: document.querySelector('form')?.offsetTop ? document.querySelector('form')!.offsetTop - 100 : 0, behavior: 'smooth' });
                                    }}
                                    className="text-brand-blue hover:bg-blue-50 p-2 rounded-full transition-colors"
                                    title="Editar comentário"
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                )}
                                {(isAdmin() || isReviewOwner) && (
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setReviewToDelete(review);
                                    }}
                                    className="text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors"
                                    title="Excluir comentário"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 font-bold">
                                    {review.customerName?.[0] || 'C'}
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold flex items-center gap-2">
                                      {review.customerName}
                                      {isRestaurantOwner && <Info size={12} className="text-brand-blue" />}
                                    </p>
                                    {review.productId && (
                                      <p className="text-[8px] font-black uppercase tracking-widest text-brand-blue">
                                        Produto: {allProducts.find(p => p.id === review.productId)?.name || 'Produto Excluído'}
                                      </p>
                                    )}
                                    <p className="text-[10px] text-slate-400">
                                      {review.createdAt?.toDate ? review.createdAt.toDate().toLocaleDateString() : 'Recentemente'}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-1 text-brand-blue">
                                  {[...Array(5)].map((_, i) => (
                                    <Star 
                                      key={`review-star-${review.id}-${i}`} 
                                      size={12} 
                                      fill={i < review.rating ? "currentColor" : "none"} 
                                      className={i >= review.rating ? "text-slate-200" : ""}
                                    />
                                  ))}
                                </div>
                              </div>
                              <p className="text-sm text-slate-600 leading-relaxed italic">"{review.comment}"</p>
                              
                              {review.mediaUrl && (
                                <div className="mt-4">
                                  {review.mediaType === 'video' ? (
                                    <video 
                                      src={review.mediaUrl} 
                                      className="w-24 h-24 md:w-32 md:h-32 object-cover rounded-2xl cursor-pointer hover:scale-105 transition-transform border border-slate-100" 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(review.mediaUrl, '_blank');
                                      }}
                                    />
                                  ) : (
                                    <img 
                                      src={review.mediaUrl} 
                                      className="w-24 h-24 md:w-32 md:h-32 object-cover rounded-2xl cursor-pointer hover:scale-105 transition-transform border border-slate-100" 
                                      referrerPolicy="no-referrer"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(review.mediaUrl, '_blank');
                                      }}
                                    />
                                  )}
                                </div>
                              )}

                              <div className="flex justify-end">
                                <LikeButton itemId={review.id} itemType="review" count={review.likesCount} />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </section>
                  )}
                </div>

                <div className="hidden lg:block">
                  <div className="sticky top-32 bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl space-y-8">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-black uppercase tracking-tighter italic">Seu Carrinho</h3>
                      <div className="flex items-center space-x-2">
                        {cart.length > 0 && (
                          <button 
                            onClick={() => {
                              setCart([]);
                              setIsCartOpen(false);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-red-500 hover:bg-red-50 rounded-xl transition-all group"
                            title="Limpar Carrinho"
                          >
                            <Trash2 size={16} className="group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Limpar</span>
                          </button>
                        )}
                        <ShoppingBag size={20} className="text-brand-blue" />
                      </div>
                    </div>

                    {cart.length === 0 ? (
                      <div className="py-12 text-center space-y-4">
                        <div className="w-16 h-16 bg-slate-50 rounded-full mx-auto flex items-center justify-center text-slate-200">
                          <ShoppingBag size={32} />
                        </div>
                        <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Carrinho Vazio</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="space-y-4 max-h-[400px] overflow-y-auto no-scrollbar pr-2">
                          {cart.map((item, idx) => (
                            <div key={`${item.id}-${idx}-${JSON.stringify(item.selectedAddOns || [])}`} className="flex items-center space-x-3 group">
                              <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-100 flex-shrink-0">
                                <img 
                                  src={getProductImage(item.id, item.imageUrl)} 
                                  alt={item.name} 
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-black uppercase tracking-tight italic group-hover:text-brand-blue transition-colors truncate">{item.name}</p>
                                {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                                  <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest truncate">
                                    + {item.selectedAddOns.map(a => a.name).join(', ')}
                                  </p>
                                )}
                                <p className="text-[10px] text-emerald-600 font-bold">
                                  {formatPrice((item.isFlashSale ? (isFlashSaleActive(item) ? (item.promoPrice || item.price) : item.price) : (item.promoPrice || item.price)) + (item.selectedAddOns || []).reduce((sum, a) => sum + (a.price || 0), 0))}
                                </p>
                              </div>
                              <div className="flex items-center space-x-2">
                                <div className="flex items-center space-x-3 bg-slate-50 rounded-full px-3 py-1">
                                  <button onClick={() => removeFromCart(item.id, item.selectedAddOns)} className="text-slate-400 hover:text-red-500 transition-colors"><Minus size={14} /></button>
                                  <span className="text-xs font-black w-4 text-center">{item.quantity}</span>
                                  <button onClick={() => addToCart(item, item.selectedAddOns)} className="text-slate-400 hover:text-brand-blue transition-colors"><Plus size={14} /></button>
                                </div>
                                <button 
                                  onClick={() => clearItemFromCart(item.id, item.selectedAddOns)}
                                  className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                  title="Remover item"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="pt-6 border-t border-slate-100 space-y-6">
                          {hasUnmetMinOrder && (
                            <div className="space-y-4">
                              {restaurantsWithUnmetMinOrder.map(unmet => (
                                <motion.div 
                                  key={`unmet-min-order-${unmet.id}`} 
                                  initial={{ scale: 0.95 }}
                                  animate={{ 
                                    scale: [1, 1.05, 1],
                                    backgroundColor: ['rgba(254, 242, 242, 1)', 'rgba(254, 226, 226, 1)', 'rgba(254, 242, 242, 1)']
                                  }}
                                  transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                                  className="p-6 bg-red-50 rounded-[2.5rem] border-4 border-red-200 flex flex-col space-y-4 shadow-2xl shadow-red-500/20 relative overflow-hidden"
                                >
                                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-100 rounded-full blur-2xl opacity-50" />
                                  
                                  <div className="flex items-center justify-between relative z-10">
                                    <div className="flex items-center gap-3">
                                      <div className="bg-red-500 p-2 rounded-xl text-white animate-bounce shadow-lg">
                                        <AlertCircle size={24} />
                                      </div>
                                      <div className="flex flex-col">
                                        <h4 className="text-sm font-black uppercase tracking-tighter text-red-600 italic leading-none">Atenção!</h4>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-red-400">Pedido Mínimo Obrigatório</p>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="space-y-2 relative z-10">
                                    <p className="text-[11px] font-bold text-slate-700 leading-tight">
                                      A empresa <span className="text-red-600 font-black uppercase underline decoration-2">{unmet.name}</span> optou pelo valor mínimo para ativação da <span className="text-emerald-500 font-black italic text-sm">ENTREGA GRÁTIS</span> a partir de:
                                    </p>
                                    
                                    <div className="bg-white/80 backdrop-blur-sm p-4 rounded-3xl border-2 border-red-50 flex items-center justify-center shadow-inner">
                                      <span className="text-4xl font-black text-red-600 italic tracking-tighter drop-shadow-sm">
                                        {formatPrice(unmet.minOrderValue)}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="text-center pt-2 relative z-10">
                                    <div className="bg-red-600 text-white py-2 px-4 rounded-full inline-block shadow-lg">
                                      <p className="text-xs font-black uppercase tracking-widest">
                                        Faltam <span className="text-yellow-300">{formatPrice(unmet.minOrderValue - unmet.currentTotal)}</span>
                                      </p>
                                    </div>
                                    <p className="text-[9px] font-bold text-red-400 uppercase tracking-widest mt-2 animate-pulse">Adicione mais itens para continuar</p>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Subtotal</span>
                            <span className="text-lg font-black text-emerald-600">{formatPrice(cartTotal)}</span>
                          </div>
                          <button 
                            onClick={placeOrder}
                            disabled={isOrdering || (featureFlags && !featureFlags.payments) || hasUnmetMinOrder}
                            className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
                              hasUnmetMinOrder 
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                                : 'bg-blue-gradient text-white shadow-blue-500/20 hover:scale-[1.02] animate-pulse'
                            }`}
                          >
                            {isOrdering ? (
                              <>
                                <RefreshCw size={16} className="animate-spin" />
                                Processando...
                              </>
                            ) : (featureFlags && !featureFlags.payments ? 'Pagamentos Temporariamente Indisponíveis' : 'Finalizar Pedido')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'orders' && (
            <motion.div 
              key="orders"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-6">
                  <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tighter italic">Meus Pedidos</h2>
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button 
                      onClick={() => setOrderFilter('all')}
                      className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${orderFilter === 'all' ? 'bg-white text-brand-blue shadow-sm' : 'text-slate-400'}`}
                    >
                      Todos
                    </button>
                    <button 
                      onClick={() => setOrderFilter('recent')}
                      className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${orderFilter === 'recent' ? 'bg-white text-brand-blue shadow-sm' : 'text-slate-400'}`}
                    >
                      Recentes
                    </button>
                  </div>
                </div>
                <button 
                  onClick={() => isExclusiveView ? setView('restaurant') : setView('home')}
                  className="text-[10px] font-black uppercase tracking-widest text-brand-blue bg-brand-blue/10 px-4 py-2 rounded-full hover:bg-brand-blue hover:text-white transition-all"
                >
                  {isExclusiveView ? 'Voltar para Loja' : 'Continuar Comprando'}
                </button>
              </div>

              {(activeOrders.length === 0 && optimisticOrders.length === 0) ? (
                <div className="bg-white rounded-[3rem] p-12 md:p-20 text-center border border-slate-100 space-y-6 shadow-sm">
                  <div className="w-24 h-24 bg-slate-50 rounded-full mx-auto flex items-center justify-center text-slate-200">
                    <Package size={48} />
                  </div>
                  <div className="space-y-2">
                    <p className="text-lg font-black uppercase tracking-tight italic">Nenhum pedido ainda</p>
                    <p className="text-slate-400 text-sm font-medium">Que tal pedir algo delicioso agora?</p>
                  </div>
                  <button 
                    onClick={() => isExclusiveView ? setView('restaurant') : setView('home')}
                    className="bg-blue-gradient text-white px-10 py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:scale-105 transition-all"
                  >
                    {isExclusiveView ? 'Voltar para Loja' : 'Explorar Restaurantes'}
                  </button>
                </div>
              ) : (
                <div className="space-y-12">
                  {(() => {
                    const allOrders = ([...optimisticOrders, ...activeOrders] as any[]).reduce((acc: any[], current) => {
                      const x = acc.find(item => item.id === current.id);
                      if (!x) {
                        return acc.concat([current]);
                      } else {
                        return acc;
                      }
                    }, []);
                    const uniqueOrders = Array.from(new Map(allOrders.filter((o: any) => o && o.id).map((o: any) => [o.id, o])).values()) as any[];
                    
                    if (orderFilter === 'recent') {
                      // Modern Product History View
                      const recentProducts = uniqueOrders.slice(0, 10).reduce((acc: any[], order: any) => {
                        (order.items || []).forEach((item: any) => {
                          const existing = acc.find(p => p.id === item.id);
                          if (!existing) {
                            acc.push({
                              ...item,
                              restaurantId: item.restaurantId || order.restaurantId,
                              restaurantName: item.restaurantName || order.restaurantName,
                              restaurantLogo: order.restaurantLogo,
                              lastOrdered: order.createdAt,
                              recentOrderId: order.id
                            });
                          }
                        });
                        return acc;
                      }, []);

                      return (
                        <div className="space-y-8" key="view-recent">
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                            {recentProducts.map((product, idx) => (
                              <motion.div
                                key={`recent-prod-${product.id}-${idx}`}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.05 }}
                                className="group bg-white rounded-[2rem] overflow-hidden border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all"
                              >
                                <div className="relative aspect-square overflow-hidden">
                                  <img 
                                    src={getProductImage(product.id, product.imageUrl)} 
                                    alt={product.name}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <div className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-brand-blue shadow-lg">
                                      <RefreshCw size={20} className="animate-spin-slow" />
                                    </div>
                                  </div>
                                  <div className="absolute top-3 left-3">
                                    <div className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg border border-white/20 shadow-sm flex items-center gap-1.5">
                                      {getRestaurantLogo(product.restaurantId, product.restaurantLogo) && (
                                        <img src={getRestaurantLogo(product.restaurantId, product.restaurantLogo)} className="w-3 h-3 rounded-full object-cover" />
                                      )}
                                      <span className="text-[8px] font-black uppercase tracking-widest text-slate-600 truncate max-w-[60px]">
                                        {product.restaurantName}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="absolute top-3 right-3 z-20">
                                    <LikeButton 
                                      itemId={product.id} 
                                      itemType="product" 
                                      className="p-2 bg-white/95 backdrop-blur-sm rounded-full shadow-md hover:scale-110 active:scale-95 transition-all text-rose-500 hover:text-rose-600 border border-slate-50"
                                    />
                                  </div>
                                </div>
                                <div className="p-4 space-y-3">
                                  <div>
                                    <h5 className="text-[11px] font-black uppercase tracking-tight text-slate-800 truncate group-hover:text-brand-blue transition-colors">
                                      {product.name}
                                    </h5>
                                    <div className="flex items-center justify-between">
                                      <div className="flex flex-col">
                                        {(product.promoPrice || (product.isFlashSale && isFlashSaleActive(product))) && (
                                          <span className="text-xs text-red-500 font-bold line-through leading-none">{formatPrice(product.price)}</span>
                                        )}
                                        <span className="text-xs font-black text-orange-500 leading-tight">
                                          {formatPrice(product.isFlashSale ? (isFlashSaleActive(product) ? (product.promoPrice || product.price) : product.price) : (product.promoPrice || product.price))}
                                        </span>
                                      </div>
                                      <button 
                                        onClick={() => navigateToProduct(product.id, product.restaurantId)}
                                        className="text-slate-300 hover:text-brand-blue transition-colors"
                                      >
                                        <ExternalLink size={12} />
                                      </button>
                                    </div>
                                  </div>
                                  <button 
                                    onClick={() => handleReorder([product])}
                                    className="w-full bg-brand-blue/10 text-brand-blue py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-brand-blue hover:text-white transition-all"
                                  >
                                    <RefreshCw size={12} />
                                    Pedir de novo
                                  </button>
                                </div>
                              </motion.div>
                            ))}
                          </div>

                          {/* Also show the recent orders in a more compact, modern way below */}
                          <div className="space-y-4">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Últimos Pedidos</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {uniqueOrders.slice(0, 3).map((order, oIdx) => {
                                const isFinished = ['delivered', 'cancelled', 'rejected'].includes(order.status);
                                return (
                                  <div key={`recent-order-card-${order.id}`} className={`rounded-[2rem] p-5 border border-slate-100 flex items-center justify-between group transition-all ${isFinished ? 'bg-slate-50/50 grayscale shadow-none' : 'bg-white hover:shadow-xl'}`}>
                                    <div className="flex items-center space-x-4">
                                      <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center border border-slate-100 shadow-sm transition-transform group-hover:scale-105">
                                        {getRestaurantLogo(order.restaurantId, order.restaurantLogo) ? (
                                          <img src={getRestaurantLogo(order.restaurantId, order.restaurantLogo)} alt={order.restaurantName} className="w-full h-full object-cover rounded-2xl" referrerPolicy="no-referrer" />
                                        ) : (
                                          <Store size={20} className="text-slate-300" />
                                        )}
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <div className="flex items-center space-x-1">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-brand-blue">{order.restaurantName}</p>
                                            <VerifiedBadge />
                                          </div>
                                          <span className={`text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full grayscale-0 ${getStatusColor(order.status)}`}>
                                            {getStatusLabel(order.status, order.deliveryOption)}
                                          </span>
                                        </div>
                                        <p className="text-[8px] font-black uppercase text-slate-400 mt-0.5">PEDIDO: #{order.id}</p>
                                        <p className="text-xs font-bold text-slate-500 mt-1">
                                          {order.items.length} {order.items.length === 1 ? 'item' : 'itens'} • {formatPrice(order.total)}
                                        </p>
                                      </div>
                                    </div>
                                      <div className="text-right flex flex-col items-end gap-2">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                          {order.createdAt?.toDate 
                                            ? order.createdAt.toDate().toLocaleDateString('pt-BR') 
                                            : new Date(order.createdAt).toLocaleDateString('pt-BR')}
                                        </p>
                                        <div className="flex items-center gap-3">
                                          {unreadCounts[order.id] > 0 && (
                                            <div className="flex items-center gap-1.5 animate-bounce bg-red-50 px-2 py-1 rounded-full border border-red-100">
                                              <MessageSquare size={10} className="text-red-500 fill-red-500" />
                                              <span className="text-[9px] font-black text-red-600">{unreadCounts[order.id]}</span>
                                            </div>
                                          )}
                                          <button 
                                            onClick={() => setOrderFilter('all')}
                                            className="text-[9px] font-black uppercase tracking-widest text-brand-blue hover:underline"
                                          >
                                            Ver Detalhes
                                          </button>
                                        </div>
                                      </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // Grouped "All Orders" View
                    // Group orders made within 60 seconds of each other
                    const groupedOrdersByTime = (uniqueOrders.reduce((acc: any[], order: any) => {
                      const orderTime = order.createdAt?.toDate ? order.createdAt.toDate().getTime() : new Date(order.createdAt).getTime();
                      const group = acc.find(g => Math.abs(g.time - orderTime) < 60000);
                      
                      if (group) {
                        group.orders.push(order);
                      } else {
                        acc.push({
                          time: orderTime,
                          orders: [order]
                        });
                      }
                      return acc;
                    }, []) as any[]).sort((a, b) => b.time - a.time);

                        return groupedOrdersByTime.map((group, groupIdx) => {
                          // Group orders within this time slot by restaurant
                          const restaurantsInGroup = group.orders.reduce((acc: any, order: any) => {
                            if (!acc[order.restaurantId]) {
                              acc[order.restaurantId] = {
                                id: order.restaurantId,
                                name: order.restaurantName,
                                logo: order.restaurantLogo,
                                orders: [],
                                total: 0,
                                status: order.status,
                                deliveryOption: order.deliveryOption,
                                deliveryEstimate: order.deliveryEstimate,
                                items: []
                              };
                            }
                            acc[order.restaurantId].orders.push(order);
                            acc[order.restaurantId].total += order.total;
                            // Use the most advanced status or the first one
                            acc[order.restaurantId].items.push(...order.items);
                            return acc;
                          }, {});

                          const mainOrder = group.orders[0]; // For overall card info like date

                          const isCancelled = group.orders.every((o: any) => ['cancelled', 'rejected'].includes(o.status));
                          const isDelivered = group.orders.every((o: any) => o.status === 'delivered');
                          const allFinished = isCancelled || isDelivered;

                          return (
                            <motion.div 
                              key={`group-all-real-${groupIdx}-${group.time}-${group.orders.map((o: any) => o.id).join('-')}`}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`${allFinished ? 'bg-slate-50/80 grayscale-[0.8] opacity-95' : 'bg-white'} ${isCancelled ? 'torn-paper overflow-hidden opacity-80' : ''} rounded-2xl md:rounded-[3rem] p-4 md:p-10 border border-slate-100 shadow-xl space-y-4 md:space-y-8 relative overflow-hidden`}
                            >
                          {isDelivered && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 transition-colors">
                              <div className="absolute inset-0 bg-slate-100/20 mix-blend-multiply" />
                              <motion.div 
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 0.15 }}
                                className="flex flex-col items-center gap-4"
                              >
                                <div className="bg-brand-blue text-white p-6 rounded-full shadow-2xl border-8 border-white/50">
                                  <CheckCircle2 size={120} strokeWidth={3} />
                                </div>
                                <div className="bg-brand-blue text-white px-8 py-3 rounded-2xl shadow-xl border-4 border-white/30">
                                  <span className="text-2xl font-black uppercase tracking-[0.3em] italic">Finalizado</span>
                                </div>
                              </motion.div>
                            </div>
                          )}
                          
                          {isCancelled && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                              <div className="absolute inset-0 bg-slate-100/20 mix-blend-multiply" />
                              <motion.div 
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 0.15 }}
                                className="flex flex-col items-center gap-4"
                              >
                                <div className="bg-red-500 text-white p-6 rounded-full shadow-2xl border-8 border-white/50">
                                  <X size={120} strokeWidth={3} />
                                </div>
                                <div className="bg-red-500 text-white px-8 py-3 rounded-2xl shadow-xl border-4 border-white/30">
                                  <span className="text-2xl font-black uppercase tracking-[0.3em] italic">Cancelado</span>
                                </div>
                              </motion.div>
                            </div>
                          )}
                          <div className="flex items-center justify-between border-b border-slate-100 pb-6">
                            <div className="flex items-center space-x-4">
                              <div className="w-12 h-12 bg-brand-blue/10 rounded-2xl flex items-center justify-center text-brand-blue">
                                <Package size={24} />
                              </div>
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Pedido Realizado em</p>
                                <p className="text-lg font-black uppercase tracking-tight italic text-slate-800">
                                  {mainOrder.createdAt?.toDate 
                                    ? mainOrder.createdAt.toDate().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) 
                                    : new Date(mainOrder.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Total do Grupo</p>
                              <p className="text-2xl font-black text-orange-500">
                                {formatPrice(group.orders.reduce((sum: number, o: any) => sum + o.total, 0))}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-10">
                            {Object.values(restaurantsInGroup).map((res: any, resIdx: number) => {
                              const mainOrderForRes = res.orders[0];
                              const ride = rides.find(r => r.destinations?.some(d => d.orderId === mainOrderForRes.id) && r.status !== 'cancelled');
                              
                              const displayCourierName = ride?.courierName || mainOrderForRes.courierName || mainOrderForRes.nome_condutor || mainOrderForRes.courierInfo?.name || (mainOrderForRes.courierInfo as any)?.nome_condutor || '';
                              const displayCourierPhoto = ride?.courierPhoto || mainOrderForRes.courierPhoto || mainOrderForRes.courierInfo?.photo || '';
                              const displayCourierVehicle = (ride?.courierVehicle || mainOrderForRes.courierVehicle || mainOrderForRes.courierInfo?.vehicle || '');
                              const displayCourierPlate = ride?.courierPlate || mainOrderForRes.courierPlate || mainOrderForRes.placa_veiculo || mainOrderForRes.courierInfo?.plate || (mainOrderForRes.courierInfo as any)?.placa_veiculo || '';
                              const displayCourierColor = ride?.courierColor || mainOrderForRes.courierColor || mainOrderForRes.courierInfo?.color || '';
                              const displayCourierUid = ride?.courierUid || mainOrderForRes.courierUid || mainOrderForRes.courierInfo?.uid;
                              const displayCourierWhatsapp = ride?.courierWhatsapp || mainOrderForRes.courierWhatsapp || mainOrderForRes.telefone_condutor || mainOrderForRes.courierInfo?.phone || (mainOrderForRes.courierInfo as any)?.telefone_condutor || (mainOrderForRes.courierInfo as any)?.whatsapp;

                              const isSearching = ride && ride.status === 'searching';
                              const courierAssigned = !!displayCourierName;
                              const isFinished = ['delivered', 'cancelled', 'rejected'].includes(res.status);

                              return (
                                <div key={`group-res-${res.id}-${resIdx}-${mainOrderForRes?.id || ''}`} className={`space-y-6 ${isFinished && !courierAssigned ? 'grayscale shadow-none' : ''}`}>
                                  <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-4">
                                    <div className="w-14 h-14 rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
                                      {getRestaurantLogo(res.id, res.logo) ? (
                                        <img 
                                          src={getRestaurantLogo(res.id, res.logo)} 
                                          alt={res.name} 
                                          className="w-full h-full object-cover"
                                          referrerPolicy="no-referrer"
                                        />
                                      ) : (
                                        <div className="w-full h-full bg-slate-50 flex items-center justify-center text-slate-300">
                                          <Store size={24} />
                                        </div>
                                      )}
                                    </div>
                                    <div>
                                      <div className="flex items-center space-x-2">
                                        <h4 className="text-xl font-black uppercase tracking-tight italic text-slate-800">{res.name}</h4>
                                        <VerifiedBadge />
                                      </div>
                                          <div className="flex flex-col gap-1 mt-0.5">
                                            <div className="flex items-center gap-2">
                                              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">PEDIDO: #{mainOrderForRes.id}</span>
                                              <div className="w-1 h-1 bg-slate-300 rounded-full" />
                                              <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full grayscale-0 ${getStatusColor(res.status)}`}>
                                                {getStatusLabel(res.status, res.deliveryOption)}
                                              </span>
                                            </div>
                                            <div className="flex items-center space-x-2 mt-0.5">
                                              <span className="text-[10px] text-slate-400 font-bold tracking-widest">
                                                {res.items.length} {res.items.length === 1 ? 'item' : 'itens'}
                                              </span>
                                            </div>
                                          </div>
                                    </div>
                                  </div>
                                </div>

                                {((ride && ride.status) || courierAssigned) && (
                                  <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-brand-blue/5 border border-brand-blue/10 rounded-[2.5rem] p-4 md:p-8 space-y-4 md:space-y-8"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <div className={`p-3 rounded-2xl ${(isSearching) ? 'bg-blue-500 animate-pulse' : 'bg-brand-blue'} text-white shadow-lg shadow-blue-500/20`}>
                                          <Truck size={24} />
                                        </div>
                                        <div>
                                          <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-blue">
                                            {getStatusLabelText(ride?.status || (courierAssigned ? 'accepted' : ''))}
                                          </p>
                                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Frota Tupã • Logística Especializada</p>
                                        </div>
                                      </div>
                                      {!isFinished && (
                                        <div className="bg-emerald-500/10 backdrop-blur-sm px-4 py-2 rounded-full border border-emerald-500/20 flex items-center gap-2">
                                          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                                          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Rastreio Ativo</span>
                                        </div>
                                      )}
                                    </div>

                                    {courierAssigned && (
                                      <div className="flex flex-col items-center text-center space-y-4 md:space-y-6 py-2 md:py-4">
                                        {/* Bonequinho Driver Icon */}
                                        <div className="relative group">
                                          <div className="absolute inset-0 bg-brand-blue rounded-[1.5rem] md:rounded-[2.5rem] blur-3xl opacity-20 group-hover:opacity-40 transition-opacity" />
                                          <div className="w-16 h-16 md:w-32 md:h-32 bg-brand-blue rounded-[1.5rem] md:rounded-[2.5rem] border-2 md:border-8 border-white dark:border-slate-800 shadow-2xl overflow-hidden relative z-10 flex items-center justify-center">
                                            <Bike className="text-white animate-bounce w-8 h-8 md:w-16 md:h-16" />
                                          </div>
                                          
                                          {/* Floating Tracking Button Overlapping the Photo/Car */}
                                          {ride?.machineRequestId && !isFinished && (
                                            <motion.button 
                                              initial={{ scale: 0.8, opacity: 0 }}
                                              animate={{ 
                                                scale: [1, 1.05, 1],
                                                opacity: 1,
                                                boxShadow: [
                                                  "0 0 0 0px rgba(16, 185, 129, 0.4)",
                                                  "0 0 0 10px rgba(16, 185, 129, 0)",
                                                  "0 0 0 0px rgba(16, 185, 129, 0)"
                                                ]
                                              }}
                                              transition={{ 
                                                scale: { repeat: Infinity, duration: 1.5, ease: "easeInOut" },
                                                boxShadow: { repeat: Infinity, duration: 1.5, ease: "easeOut" }
                                              }}
                                              whileHover={{ scale: 1.1, zIndex: 100 }}
                                              whileTap={{ scale: 0.95 }}
                                              onClick={() => setTrackingRide(ride)}
                                              className="absolute -bottom-4 md:-bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-emerald-500 text-white px-3 md:px-6 py-1.5 md:py-4 rounded-[1rem] md:rounded-[2rem] shadow-[0_10px_30px_rgba(16,185,129,0.3)] flex flex-col items-center gap-0.5 border-2 md:border-4 border-white dark:border-slate-800 transition-all"
                                            >
                                              <div className="flex items-center gap-1.5 md:gap-2">
                                                <Navigation size={14} className="animate-bounce md:w-[18px] md:h-[18px]" />
                                                <span className="text-[10px] md:text-[12px] font-black uppercase tracking-widest whitespace-nowrap">Localização em Tempo Real</span>
                                              </div>
                                              <span className="text-[7px] md:text-[8px] font-bold opacity-90 uppercase tracking-tighter">Clique para abrir</span>
                                            </motion.button>
                                          )}

                                          <div className="absolute -bottom-1 md:-bottom-4 right-0 p-1.5 md:p-4 bg-blue-600 text-white rounded-[0.8rem] md:rounded-[1.5rem] border-2 md:border-4 border-white dark:border-slate-800 shadow-2xl z-20">
                                            {(ride?.vehicleType === 'car' || displayCourierVehicle?.toLowerCase().includes('car') || mainOrderForRes.courierVehicle === 'Carro' || (mainOrderForRes.courierInfo as any)?.vehicle?.toLowerCase().includes('car')) ? <Car className="w-4 h-4 md:w-7 md:h-7" /> : <Bike className="w-4 h-4 md:w-7 md:h-7" />}
                                          </div>
                                        </div>

                                        <div className="space-y-1 md:space-y-4 w-full pt-4 md:pt-8 text-center sm:text-left">
                                          <div className="space-y-0.5 md:space-y-1">
                                            <h5 className="text-[13px] md:text-3xl font-black uppercase tracking-tighter italic text-slate-800 dark:text-white leading-tight break-words">
                                              {displayCourierName || 'Buscando Entregador...'}
                                            </h5>
                                            <p className="text-[8px] md:text-sm font-black uppercase tracking-[0.15em] md:tracking-[0.3em] text-brand-blue">Entregador Tupã • Em Rota</p>
                                          </div>
 
                                          <div className="grid grid-cols-2 gap-2 md:gap-4 max-w-2xl mx-auto w-full">
                                            <div className="bg-white dark:bg-slate-900/50 p-3 md:p-5 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center">
                                              <span className="text-[7px] md:text-[9px] font-black uppercase tracking-widest text-slate-400">Veículo</span>
                                              <span className="text-[10px] md:text-sm font-black text-slate-800 dark:text-white uppercase italic truncate w-full text-center">
                                                {displayCourierVehicle || '---'}
                                              </span>
                                            </div>
                                            <div className="bg-white dark:bg-slate-900/50 p-3 md:p-5 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center">
                                              <span className="text-[7px] md:text-[9px] font-black uppercase tracking-widest text-slate-400">Placa</span>
                                              <span className="text-[10px] md:text-sm font-black text-slate-800 dark:text-white tracking-widest uppercase">
                                                {displayCourierPlate || '---'}
                                              </span>
                                            </div>
                                            <button 
                                              onClick={() => ride?.machineRequestId && setTrackingRide(ride)}
                                              className={`bg-orange-500 p-3 md:p-5 rounded-[1.5rem] md:rounded-[2rem] border border-orange-400 shadow-lg shadow-orange-500/20 flex flex-col items-center justify-center text-white transition-all hover:scale-105 active:scale-95 group ${!ride?.machineRequestId ? 'opacity-90' : 'cursor-pointer hover:bg-orange-600'}`}
                                            >
                                              <span className="text-[7px] md:text-[9px] font-black uppercase tracking-widest text-white/70 group-hover:text-white">Previsão</span>
                                              <div className="flex items-center gap-1.5 md:gap-2">
                                                <span className="text-[10px] md:text-sm font-black italic uppercase">
                                                  {ride?.estimatedArrival || (isFinished ? '--' : '10-15 min')}
                                                </span>
                                              </div>
                                            </button>

                                            {(displayCourierWhatsapp && (
                                              ride?.status === 'A' || 
                                              ride?.status === 'E' || 
                                              ride?.status === 'accepted' || 
                                              ride?.status === 'in_progress' || 
                                              ride?.status === 'shipping' || 
                                              (!isFinished && courierAssigned)
                                            )) && (
                                              <a 
                                                href={`https://wa.me/${displayCourierWhatsapp.replace(/\D/g, '')}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="bg-emerald-500/10 dark:bg-emerald-500/5 p-3 md:p-5 rounded-[1.5rem] md:rounded-[2rem] border border-emerald-500/20 shadow-sm flex flex-col items-center justify-center transition-all hover:bg-emerald-600 hover:text-white group"
                                              >
                                                <span className="text-[7px] md:text-[9px] font-black uppercase tracking-widest text-emerald-600 group-hover:text-white/80">WhatsApp</span>
                                                <div className="flex items-center gap-1.5 md:gap-2">
                                                  <span className="text-[10px] md:text-sm font-black text-emerald-700 dark:text-emerald-400 group-hover:text-white">
                                                    Contato
                                                  </span>
                                                  <MessageCircle size={12} className="text-emerald-500 group-hover:text-white animate-bounce md:w-4 md:h-4" />
                                                </div>
                                              </a>
                                            )}
                                          </div>

                                          {/* Status Percentage Progress */}
                                          {!isFinished && (
                                            <div className="pt-2 md:pt-4 space-y-2 md:space-y-3 px-2 md:px-4">
                                              <div className="flex items-center justify-between">
                                                <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.2em] text-slate-400">Progresso</span>
                                                <span className="text-[8px] md:text-[10px] font-black text-brand-blue bg-brand-blue/10 px-2 md:px-3 py-0.5 md:py-1 rounded-full">
                                                  {getStatusPercentage(ride?.status || 'accepted')}%
                                                </span>
                                              </div>
                                              <div className="w-full h-2 md:h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <motion.div 
                                                  initial={{ width: 0 }}
                                                  animate={{ width: `${getStatusPercentage(ride?.status || 'accepted')}%` }}
                                                  className="h-full bg-blue-gradient relative"
                                                >
                                                  <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)25%,transparent 25%,transparent 50%,rgba(255,255,255,0.2)50%,rgba(255,255,255,0.2)75%,transparent 75%,transparent)] bg-[length:1rem_1rem] animate-shimmer" />
                                                </motion.div>
                                              </div>
                                              <div className="flex justify-between text-[6px] md:text-[7px] font-black uppercase tracking-tighter md:tracking-widest text-slate-400">
                                                <span>Prepando</span>
                                                <span>Retirando</span>
                                                <span>A Caminho</span>
                                                <span>Chegando</span>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </motion.div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {(res.items || []).map((item: any, idx: number) => (
                                    <div key={`all-order-item-${res.id}-${item.id || idx}-${idx}`} className="flex items-center space-x-4 bg-slate-50/50 p-4 rounded-[2rem] border border-slate-100 group hover:bg-white hover:shadow-lg transition-all">
                                      <div className="w-16 h-16 rounded-2xl overflow-hidden border border-slate-100 flex-shrink-0">
                                        <img 
                                          src={getProductImage(item.id, item.imageUrl)} 
                                          alt={item.name} 
                                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                          referrerPolicy="no-referrer"
                                        />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-[11px] font-black uppercase tracking-tight text-slate-800 truncate">{item.quantity}x {item.name}</p>
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">REF: {item.id ? item.id.slice(-6).toUpperCase() : (item.ref || 'N/A')}</p>
                                        {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                                          <p className="text-[9px] text-slate-400 font-medium truncate">
                                            {item.selectedAddOns.map((a: any) => a.name).join(', ')}
                                          </p>
                                        )}
                                        <div className="flex items-center gap-3 mt-1">
                                          <p className="text-xs font-black text-orange-500">{formatPrice((item.price || 0) * (item.quantity || 1))}</p>
                                          <button 
                                            onClick={() => handleReorder([item])}
                                            className="flex items-center gap-1.5 bg-brand-blue/10 text-brand-blue px-3 py-1.5 rounded-xl hover:bg-brand-blue hover:text-white transition-all text-[9px] font-black uppercase tracking-widest"
                                          >
                                            <RefreshCw size={10} />
                                            <span>Repetir</span>
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                    <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                                  <div className="flex items-center gap-4">
                                    {res.deliveryEstimate && (
                                      <div className="flex items-center space-x-2 text-brand-blue bg-brand-blue/5 px-4 py-2 rounded-2xl border border-brand-blue/10">
                                        <Clock size={14} className="animate-pulse" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Previsão: {res.deliveryEstimate}</span>
                                      </div>
                                    )}
                                    
                                    <button 
                                      onClick={() => setActiveChatOrderId(res.orders[0].id)}
                                      className={`flex items-center space-x-2 px-6 py-2.5 rounded-2xl transition-all font-black uppercase tracking-widest text-[10px] relative ${unreadCounts[res.orders[0].id] > 0 ? 'bg-red-600 text-white shadow-lg shadow-red-600/20 animate-pulse' : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600'}`}
                                    >
                                      <div className="relative">
                                        <MessageSquare size={14} className={unreadCounts[res.orders[0].id] > 0 ? 'fill-white' : ''} />
                                        <motion.span 
                                          initial={{ scale: 0 }}
                                          animate={{ scale: 1 }}
                                          className={`absolute -top-2.5 -right-2.5 text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 shadow-md ${
                                            unreadCounts[res.orders[0].id] > 0 
                                              ? 'bg-white text-red-600 border-red-500' 
                                              : 'bg-emerald-600 text-white border-white'
                                          }`}
                                        >
                                          {unreadCounts[res.orders[0].id] || 0}
                                        </motion.span>
                                      </div>
                                      <span>Chat do Pedido</span>
                                    </button>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    {res.orders.some((o: any) => o.status === 'pending') && (
                                      <button 
                                        onClick={() => setEditingOrderId(editingOrderId === res.orders[0].id ? null : res.orders[0].id)}
                                        className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                                        title="Editar Pedido"
                                      >
                                        <Edit size={14} />
                                      </button>
                                    )}
                                    {res.orders.some((o: any) => o.status !== 'cancelled' && o.status !== 'delivered' && o.status !== 'rejected') && (
                                      <button 
                                        onClick={() => setOrderToCancel(res)}
                                        className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                        title="Cancelar Pedido"
                                      >
                                        <X size={14} />
                                      </button>
                                    )}
                                    {res.orders.some((o: any) => o.tableNumber) && (
                                      <button 
                                        onClick={() => setShowFinishOrderModal(res.orders[0])}
                                        className="flex items-center gap-2 px-6 py-2.5 bg-brand-blue text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-500/20 hover:scale-105 transition-all"
                                      >
                                        <CheckCircle2 size={14} />
                                        <span>Finalizar Pedido</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                                {Object.values(restaurantsInGroup).length > 1 && <div className="border-b border-slate-100 pt-4" />}
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    );
                  })
                })()}
              </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

      <AnimatePresence>
        {showFinishOrderModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl p-8 space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tighter italic text-slate-800">Finalizar Pedido</h3>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-relaxed">Você está na Mesa {showFinishOrderModal.tableNumber}. Como podemos ajudar?</p>
              </div>

              <div className="space-y-4">
                {!selectedTableAction ? (
                  [
                    { label: 'Chamar Garçom', action: 'Chamar Garçom', icon: <BellRing size={18} />, color: 'bg-orange-500' },
                    { label: 'Fazer Outro Pedido', action: 'Fazer Outro Pedido', icon: <Plus size={18} />, color: 'bg-emerald-500' },
                    { label: 'Fazer Reclamação', action: 'Fazer Reclamação', icon: <ShieldAlert size={18} />, color: 'bg-red-500' },
                  ].map((opt) => (
                    <button 
                      key={opt.action}
                      disabled={isSendingTableAction}
                      onClick={() => setSelectedTableAction(opt)}
                      className={`w-full ${opt.color} text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50`}
                    >
                      {opt.icon}
                      <span>{opt.label}</span>
                    </button>
                  ))
                ) : (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="p-6 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 text-center">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Confirmar Solicitação</p>
                      <p className="text-xl font-black uppercase tracking-tight text-slate-800">{selectedTableAction.label}</p>
                    </div>
                    
                    <div className="flex gap-4">
                      <button 
                        onClick={() => setSelectedTableAction(null)}
                        className="flex-1 bg-slate-100 text-slate-400 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all"
                      >
                        Cancelar
                      </button>
                      <button 
                        disabled={isSendingTableAction}
                        onClick={() => handleTableAction(showFinishOrderModal, selectedTableAction.action)}
                        className="flex-2 bg-brand-blue text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        {isSendingTableAction ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                        <span>Confirmar</span>
                      </button>
                    </div>
                  </div>
                )}
                
                {!selectedTableAction && (
                  <button 
                    onClick={() => setShowFinishOrderModal(null)}
                    className="w-full text-slate-400 py-2 text-[10px] font-black uppercase tracking-widest"
                  >
                    Voltar
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 z-[150] bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-[160] w-[85%] max-w-sm bg-white dark:bg-slate-950 shadow-2xl flex flex-col"
            >
              <div className="pt-32 pb-6 px-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tighter italic text-blue-gradient">
                    {sidebarType === 'restaurants' ? 'Empresas' : 'Categorias'}
                  </h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {sidebarType === 'restaurants' ? 'Explore os parceiros' : 'Navegue por tipo'}
                  </p>
                </div>
                <button 
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                  <X size={24} className="text-slate-400" />
                </button>
              </div>

              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    placeholder={sidebarType === 'restaurants' ? "Pesquisar empresas..." : "Pesquisar categorias..."}
                    value={sidebarSearchTerm}
                    onChange={(e) => {
                      if (checkAdminCommand(e.target.value)) {
                        setSidebarSearchTerm('');
                        return;
                      }
                      setSidebarSearchTerm(e.target.value);
                    }}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20 transition-all outline-none text-slate-900 dark:text-white"
                  />
                  {sidebarSearchTerm && (
                    <button 
                      onClick={() => setSidebarSearchTerm('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {sidebarType === 'restaurants' && (
                <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 overflow-x-auto no-scrollbar flex space-x-2 bg-slate-50/50 dark:bg-slate-900/50">
                  {['Todos', 'Famosos', 'restaurante', 'mercado', 'farmácia', 'lanche', 'padaria', 'bebidas', 'pet shop', 'shopping gourmet'].map((mod) => (
                    <button
                      key={mod}
                      onClick={() => setActiveModality(mod)}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border ${activeModality.toLowerCase() === mod.toLowerCase() ? 'bg-brand-blue text-white border-brand-blue shadow-lg shadow-blue-500/20' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-700 hover:bg-slate-50'}`}
                    >
                      {mod}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex-grow overflow-y-auto p-6 space-y-6 no-scrollbar">
                {sidebarType === 'restaurants' ? (
                  <div className="grid grid-cols-1 gap-4">
                    {cityRestaurants.filter(r => {
                      const matchesSearch = r.name.toLowerCase().includes(sidebarSearchTerm.toLowerCase()) ||
                                            (r.modality && r.modality.toLowerCase().includes(sidebarSearchTerm.toLowerCase()));
                      const matchesModality = activeModality === 'Todos' || 
                                             (activeModality === 'Famosos' ? (r.isFamous || parseFloat(getAverageRating(r.id, false, r.rating).rating) >= 5.0) : (r.modality && r.modality.toLowerCase() === activeModality.toLowerCase()));
                      return matchesSearch && matchesModality;
                    }).length === 0 ? (
                      profile?.role === 'manager' ? (
                        <div className="py-12 flex flex-col items-center justify-center space-y-4 bg-blue-50 dark:bg-blue-900/20 rounded-[2.5rem] border-2 border-dashed border-blue-200 dark:border-blue-900/30">
                          <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-xl text-blue-500">
                            <Package size={32} />
                          </div>
                          <div className="text-center px-6 space-y-1">
                            <p className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white italic">Boas-vindas, Gestor!</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Sua empresa está pronta. Agora falta cadastrar seus produtos para começar a vender.</p>
                          </div>
                          <button 
                            onClick={() => {
                              navigate('/manager');
                              setIsSidebarOpen(false);
                            }}
                            className="bg-blue-gradient text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-500/20 hover:scale-105 transition-all"
                          >
                            Cadastrar Produtos
                          </button>
                        </div>
                      ) : (
                        <div className="py-12 flex flex-col items-center justify-center space-y-4 bg-slate-50 dark:bg-slate-900/50 rounded-[2.5rem] border-2 border-dashed border-slate-100 dark:border-slate-800">
                          <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-xl text-slate-300">
                            <Store size={32} />
                          </div>
                          <div className="text-center px-6 space-y-1">
                            <p className="text-sm font-black uppercase tracking-widest text-slate-400 italic">Não tem nenhuma empresa cadastrada</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Seja o primeiro a cadastrar sua empresa aqui!</p>
                          </div>
                          <button 
                            onClick={() => {
                              setTargetRole('manager');
                              setAuthModalMessage('Cadastre sua empresa e comece a vender agora!');
                              setIsAuthModalOpen(true);
                              setIsSidebarOpen(false);
                            }}
                            className="bg-blue-gradient text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-500/20 hover:scale-105 transition-all"
                          >
                            Fazer Cadastro
                          </button>
                        </div>
                      )
                    ) : (
                      (Array.from(new Map(cityRestaurants
                        .filter(r => {
                          const matchesSearch = r.name.toLowerCase().includes(sidebarSearchTerm.toLowerCase()) ||
                                                (r.modality && r.modality.toLowerCase().includes(sidebarSearchTerm.toLowerCase()));
                          const matchesModality = activeModality === 'Todos' || 
                                                 (activeModality === 'Famosos' ? (r.isFamous || parseFloat(getAverageRating(r.id, false, r.rating).rating) >= 5.0) : (r.modality && r.modality.toLowerCase() === activeModality.toLowerCase()));
                          return matchesSearch && matchesModality;
                        })
                        .map(r => [r.id, r])).values()) as Restaurant[]).map((restaurant, idx) => {
                          const timeInfo = getTimeRemaining(restaurant, currentTime);
                          return (
                            <div 
                              key={`${restaurant.id}-${idx}`}
                              onClick={() => {
                                setSelectedRestaurant(restaurant);
                                setView('restaurant');
                                setIsSidebarOpen(false);
                              }}
                              className="flex items-center space-x-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-3xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer group"
                            >
                              {(restaurant.logoUrl || restaurant.imageUrl) && (
                                <div className="w-16 h-16 rounded-full overflow-hidden shadow-md flex-shrink-0 border border-slate-100 dark:border-slate-800">
                                  <img 
                                    src={restaurant.logoUrl || restaurant.imageUrl || undefined} 
                                    alt={restaurant.name}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                              )}
                              <div className="flex-grow min-w-0">
                                <div className="flex items-center space-x-1">
                                  <h4 className="text-sm font-black uppercase tracking-tight text-slate-800 dark:text-white truncate">{restaurant.name}</h4>
                                  <VerifiedBadge />
                                </div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{restaurant.modality || 'Restaurante'}</p>
                                <div className="flex items-center space-x-2 mt-1">
                                  <div className={`text-[8px] font-black uppercase italic ${timeInfo.status === 'open' ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {timeInfo.text}
                                  </div>
                                </div>
                              </div>
                              <ChevronRight size={16} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                            </div>
                          );
                        })
                    )}
                    <button 
                      onClick={() => {
                        setSidebarType('categories');
                        setSidebarSearchTerm('');
                      }}
                      className="w-full p-4 mt-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all flex items-center justify-center space-x-2"
                    >
                      <Plus size={14} />
                      <span>Ver Categorias</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div 
                      onClick={() => {
                        setActiveCategory('Todos');
                        hasManuallySelectedCategory.current = true;
                        setIsSidebarOpen(false);
                      }}
                      className={`flex flex-col items-center space-y-3 p-6 rounded-3xl transition-all cursor-pointer ${activeCategory === 'Todos' ? 'bg-blue-gradient text-white shadow-xl shadow-blue-500/20' : 'bg-slate-50 dark:bg-slate-900 text-slate-950 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    >
                      <Utensils size={32} />
                      <span className="text-[10px] font-black uppercase tracking-widest text-brand-blue opacity-100">Todos</span>
                    </div>
                    {(Array.from(new Map((filteredCategories || [])
                      .filter(c => c && c.id && c.name && c.name.toLowerCase().includes((sidebarSearchTerm || '').toLowerCase()))
                      .map(c => [c.id, c])).values()) as Category[]).map((cat, idx) => (
                        <div 
                          key={`sidebar-cat-${cat.id}-${idx}`} 
                          onClick={() => {
                            setActiveCategory(cat.name);
                            hasManuallySelectedCategory.current = true;
                            setIsSidebarOpen(false);
                          }}
                          className={`flex flex-col items-center space-y-3 p-6 rounded-3xl transition-all cursor-pointer overflow-hidden ${activeCategory === cat.name ? 'bg-blue-gradient text-white shadow-xl shadow-blue-500/20' : 'bg-slate-50 dark:bg-slate-900 text-slate-950 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                        >
                          {cat.imageUrl ? (
                            <img src={cat.imageUrl || undefined} className="w-12 h-12 object-cover rounded-xl" referrerPolicy="no-referrer" />
                          ) : null}
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] font-extrabold uppercase tracking-widest text-center text-slate-950 dark:text-slate-950 opacity-100">{cat.name}</span>
                            {Array.isArray(activeSchedulesMemo) && activeSchedulesMemo.filter(s => s && Array.isArray(s.categoryIds) && s.categoryIds.includes(cat.id)).map(schedule => (
                              <div key={schedule.id} className="flex flex-col items-center">
                                <span className="text-[8px] font-black text-brand-blue uppercase tracking-widest animate-pulse">
                                  {schedule.name}
                                </span>
                                <span className="text-[7px] font-bold text-slate-400">
                                  Finaliza às {schedule.endTime ? (schedule.endTime.split(':').length === 2 ? `${schedule.endTime}:00` : schedule.endTime) : '--:--'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    <button 
                      onClick={() => {
                        setSidebarType('restaurants');
                        setSidebarSearchTerm('');
                      }}
                      className="col-span-2 w-full p-4 mt-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all flex items-center justify-center space-x-2"
                    >
                      <Plus size={14} />
                      <span>Ver Empresas</span>
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBannerPopup && (
          <BannerPopup 
            banner={showBannerPopup} 
            onClose={handleCloseBannerPopup} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showHoursModal && (
          <HoursModal 
            restaurant={showHoursModal} 
            onClose={() => setShowHoursModal(null)} 
            currentTime={currentTime} 
          />
        )}
      </AnimatePresence>
      
      {showTableNumberModal && <TableNumberModal />}

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => {
          setIsAuthModalOpen(false);
          setAuthModalMessage(undefined);
        }} 
        targetRole={targetRole}
        message={authModalMessage}
        isExclusiveView={isExclusiveView}
      />

      {/* Review Modal */}
      <AnimatePresence>
        {showReviewModal && orderToReview && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 50 }}
              className="bg-white w-full max-w-md rounded-[3rem] overflow-hidden shadow-2xl"
            >
              <div className="p-8 space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 size={40} />
                  </div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter italic text-emerald-600">Pedido Entregue!</h3>
                  <p className="text-slate-400 text-xs font-medium">O que você achou da sua experiência com a {orderToReview.restaurantName}?</p>
                </div>

                <form onSubmit={handleAddReview} className="space-y-6">
                  <div className="space-y-4">
                      <div className="flex flex-col items-center space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Avalie o Restaurante:</p>
                        <div className="flex space-x-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={`rating-star-modal-${star}`}
                              type="button"
                            onClick={() => setNewReviewRating(star)}
                            className={`${newReviewRating >= star ? 'text-brand-blue' : 'text-slate-200'} transition-colors`}
                          >
                            <Star size={32} fill={newReviewRating >= star ? 'currentColor' : 'none'} />
                          </button>
                        ))}
                      </div>
                    </div>

                    <textarea 
                      value={newReviewComment}
                      onChange={(e) => setNewReviewComment(e.target.value)}
                      placeholder="Conte-nos mais sobre o restaurante..."
                      className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500/20 h-24"
                    />

                    {/* Media Upload and Preview for Modal */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-center gap-3">
                        <label className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors">
                          <Camera size={14} />
                          <span>Anexar Foto/Vídeo</span>
                          <input 
                            type="file" 
                            accept="image/*,video/*" 
                            className="hidden" 
                            onChange={handleReviewMediaUpload}
                            disabled={isUploadingReviewMedia}
                          />
                        </label>
                        {isUploadingReviewMedia && (
                          <div className="flex items-center gap-2 text-[8px] font-black text-brand-blue uppercase animate-pulse">
                            <RefreshCw size={10} className="animate-spin" />
                            Carregando...
                          </div>
                        )}
                      </div>

                      {newReviewMedia && (
                        <div className="relative w-24 h-24 mx-auto group">
                          {newReviewMedia.type === 'video' ? (
                            <video src={newReviewMedia.url} className="w-full h-full object-cover rounded-2xl border-2 border-brand-blue" />
                          ) : (
                            <img src={newReviewMedia.url} className="w-full h-full object-cover rounded-2xl border-2 border-brand-blue" referrerPolicy="no-referrer" />
                          )}
                          <button 
                            type="button"
                            onClick={() => setNewReviewMedia(null)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {orderToReview.items && orderToReview.items.length > 0 && (
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Avalie os Produtos:</p>
                      <div className="space-y-6 max-h-[300px] overflow-y-auto no-scrollbar pr-2">
                        {orderToReview.items.map((item: any, idx: number) => (
                          <div key={`${item.id}-${idx}`} className="space-y-3 p-4 bg-slate-50 rounded-2xl">
                            <p className="text-xs font-black uppercase tracking-tight italic">{item.name}</p>
                            <div className="flex justify-center space-x-2">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => setProductRatings(prev => ({ ...prev, [item.id]: star }))}
                                  className={`${(productRatings[item.id] || 0) >= star ? 'text-brand-blue' : 'text-slate-200'} transition-colors`}
                                >
                                  <Star size={20} fill={(productRatings[item.id] || 0) >= star ? 'currentColor' : 'none'} />
                                </button>
                              ))}
                            </div>
                            <input 
                              type="text"
                              value={productComments[item.id] || ''}
                              onChange={(e) => setProductComments(prev => ({ ...prev, [item.id]: e.target.value }))}
                              placeholder="Comentário sobre o produto (opcional)"
                              className="w-full bg-white border-none rounded-xl p-3 text-[10px] focus:ring-2 focus:ring-blue-500/10"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button 
                    type="submit"
                    className="w-full bg-blue-gradient text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-500/20"
                  >
                    Enviar Avaliações
                  </button>
                  
                  <button 
                    type="button"
                    onClick={() => {
                      setShowReviewModal(false);
                      setOrderToReview(null);
                      setView('home');
                      setSelectedRestaurant(null);
                    }}
                    className="w-full text-slate-400 py-2 text-[10px] font-black uppercase tracking-widest"
                  >
                    Pular por enquanto
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Profile Modal */}
      <AnimatePresence>
        {isProfileModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-blue-gradient text-white">
                <div className="space-y-1">
                  <h3 className="text-xl font-black uppercase tracking-tight italic">Meu Perfil</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Gerencie seus dados</p>
                </div>
                <div className="flex items-center space-x-2">
                  {!routeRestaurantId && (
                    <button 
                      onClick={() => {
                        if (isManagerUnlocked) {
                          setIsProfileModalOpen(false);
                          navigate('/manager', { state: { isRegistering: profile?.role === 'customer' } });
                        } else {
                          setShowManagerLockModal(true);
                        }
                      }}
                      onMouseEnter={() => {
                        if (user) prefetchManagerData(user.uid);
                      }}
                      className={`px-6 py-4 rounded-2xl transition-all text-sm font-black uppercase tracking-widest flex flex-col items-center justify-center space-y-1 shadow-xl relative overflow-hidden ${
                        isManagerUnlocked 
                        ? 'bg-white text-brand-blue border-2 border-brand-blue animate-pulse-scale shadow-brand-blue/20' 
                        : 'bg-slate-100 text-slate-400 border-2 border-slate-200 grayscale'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        {isManagerUnlocked ? <Store size={20} /> : <Lock size={20} />}
                        <span>Empresa</span>
                      </div>
                      <span className="text-[8px] font-bold opacity-70 lowercase">
                        {isManagerUnlocked ? 'Painel do restaurante' : 'Toque para desbloquear'}
                      </span>
                    </button>
                  )}
                  <button onClick={() => {
                    setIsProfileModalOpen(false);
                    setIsEditingProfile(false);
                  }} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <X size={24} />
                  </button>
                </div>
              </div>
              
              <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto no-scrollbar">
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative group !p-1.5 !rounded-full">
                    <label 
                      className="w-16 h-16 rounded-full overflow-hidden shadow-xl relative z-10 cursor-pointer hover:opacity-80 transition-opacity border-2 border-white dark:border-slate-800"
                    >
                      <img 
                        src={profile?.photoURL || user?.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName || 'NOME'}&background=2563eb&color=fff`} 
                        className="w-full h-full object-cover rounded-full" 
                        referrerPolicy="no-referrer"
                        alt="Profile" 
                      />
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => handleFileUpload(e, 'profile')} 
                      />
                    </label>
                    <label 
                      className="absolute bottom-0 right-0 p-2 bg-brand-blue text-white rounded-full shadow-lg cursor-pointer hover:scale-110 transition-transform z-20 border-2 border-white"
                    >
                      <Camera size={12} />
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => handleFileUpload(e, 'profile')} 
                      />
                    </label>
                  </div>
                  
                  <div className="text-center w-full">
                    {!isEditingProfile ? (
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <h4 className="text-2xl font-black uppercase tracking-tight italic text-blue-gradient">
                            {profile?.displayName || 'Usuário'}
                          </h4>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{profile?.email}</p>
                          {profile?.cpf && <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CPF: {profile.cpf}</p>}
                        </div>
                        <button 
                          onClick={() => setIsEditingProfile(true)}
                          className="px-6 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-colors flex items-center mx-auto space-x-2"
                        >
                          <Edit2 size={14} />
                          <span>Editar Perfil</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3 p-4 bg-slate-50 rounded-3xl border-2 border-slate-100">
                        <div className="space-y-4">
                          <div className="text-left space-y-1">
                            <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-2">Nome Completo</label>
                            <input
                              type="text"
                              value={profileFormData.displayName}
                              onChange={(e) => setProfileFormData(prev => ({ ...prev, displayName: e.target.value }))}
                              className="w-full bg-white border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-brand-blue/20"
                              placeholder="Seu nome"
                            />
                          </div>
                          <div className="text-left space-y-1">
                            <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-2">E-mail</label>
                            <input
                              type="email"
                              value={profileFormData.email}
                              onChange={(e) => setProfileFormData(prev => ({ ...prev, email: e.target.value }))}
                              className="w-full bg-white border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-brand-blue/20"
                              placeholder="seu@email.com"
                            />
                          </div>
                          <div className="text-left space-y-1">
                            <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-2">CPF</label>
                            <input
                              type="text"
                              value={profileFormData.cpf}
                              onChange={(e) => setProfileFormData(prev => ({ ...prev, cpf: e.target.value }))}
                              className="w-full bg-white border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-brand-blue/20"
                              placeholder="000.000.000-00"
                            />
                          </div>
                          <div className="text-left space-y-1">
                            <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-2">Nova Senha (opcional)</label>
                            <input
                              type="password"
                              value={profileFormData.password}
                              onChange={(e) => setProfileFormData(prev => ({ ...prev, password: e.target.value }))}
                              className="w-full bg-white border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-brand-blue/20"
                              placeholder="••••••••"
                            />
                          </div>
                        </div>
                        <div className="flex space-x-2 pt-2">
                          <button
                            onClick={async () => {
                              try {
                                const updateData: any = {
                                  displayName: profileFormData.displayName.trim(),
                                  cpf: profileFormData.cpf.trim()
                                };
                                await updateProfileData(updateData);
                                
                                // Se o e-mail mudou, poderíamos tentar updateEmail aqui,
                                // mas exige re-autenticação em produção. 
                                // Para este ambiente, o updateDoc no authContext já resolve a exibição.
                                
                                setIsEditingProfile(false);
                                alert("Perfil atualizado com sucesso!");
                              } catch (e) {
                                console.error("Error updating profile:", e);
                                alert("Erro ao atualizar perfil.");
                              }
                            }}
                            className="flex-1 bg-brand-blue text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand-blue/20"
                          >
                            Salvar Dados
                          </button>
                          <button
                            onClick={() => setIsEditingProfile(false)}
                            className="px-4 bg-white text-slate-400 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Saved Addresses Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Endereços Salvos</h5>
                    <button 
                      onClick={() => {
                        setIsProfileModalOpen(false);
                        setIsAddressModalOpen(true);
                      }}
                      className="text-[10px] font-black text-brand-blue uppercase tracking-widest flex items-center space-x-1"
                    >
                      <Plus size={14} />
                      <span>Novo</span>
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {savedAddresses.length === 0 ? (
                      <div className="py-8 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-100">
                        <MapPin size={24} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-[9px] font-black uppercase text-slate-400">Nenhum endereço salvo</p>
                      </div>
                    ) : (
                      savedAddresses.map((addr) => (
                        <div 
                          key={`profile-addr-${addr.id}`}
                          className={`group relative flex items-center p-4 rounded-3xl border-2 transition-all cursor-pointer ${
                            addr.isCurrent 
                              ? 'border-brand-blue bg-blue-50/30' 
                              : 'border-slate-50 hover:border-slate-100'
                          }`}
                          onClick={() => toggleMainAddress(addr.id)}
                        >
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                            addr.isCurrent ? 'bg-brand-blue text-white' : 'bg-slate-100 text-slate-400'
                          }`}>
                            <MapPin size={18} />
                          </div>
                          <div className="ml-4 flex-1 min-w-0 pr-8">
                            <h6 className="text-[10px] font-black uppercase tracking-tight truncate">{addr.name}</h6>
                            <p className="text-[9px] font-bold text-slate-400 truncate">{addr.fullAddress}</p>
                            {addr.isCurrent && (
                              <span className="text-[7px] font-black uppercase tracking-widest text-brand-blue bg-white px-2 py-0.5 rounded-full mt-1 inline-block border border-blue-100 shadow-sm">
                                Principal
                              </span>
                            )}
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setAddressToDelete(addr);
                            }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-3">
                  {(() => {
                    const supportLink = globalSettings?.supportLink;
                    const citySupportPhone = activeCity?.id 
                      ? (globalSettings?.citySupportNumbers?.[activeCity.id] || 
                         Object.entries(globalSettings?.citySupportNumbers || {}).find(([id]) => {
                           const city = cities.find(c => c.id === id);
                           return city?.name === activeCity.name;
                         })?.[1])
                      : null;
                    const supportPhone = citySupportPhone || globalSettings?.appSupportPhone || globalSettings?.companySupportPhone;
                    
                    let finalLink = null;
                    if (supportLink && !citySupportPhone) {
                      finalLink = supportLink;
                    } else if (supportPhone) {
                      const cleanPhone = supportPhone.replace(/\D/g, '');
                      finalLink = `https://wa.me/55${cleanPhone}`;
                    }

                    if (!finalLink) return null;

                    return (
                      <a 
                        href={finalLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center space-x-3 text-brand-blue bg-blue-50 hover:bg-blue-100 transition-all py-4 rounded-2xl font-black uppercase tracking-widest text-xs"
                      >
                        <Headset size={18} />
                        <span>Suporte Técnico</span>
                      </a>
                    );
                  })()}

                  <button 
                    onClick={() => {
                      signOut();
                      setIsProfileModalOpen(false);
                    }}
                    className="w-full flex items-center justify-center space-x-3 text-red-500 bg-red-50 hover:bg-red-100 transition-all py-4 rounded-2xl font-black uppercase tracking-widest text-xs"
                  >
                    <LogOut size={18} />
                    <span>Sair da Conta</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Manager Lock Modal */}
      <AnimatePresence>
        {showManagerLockModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl space-y-6"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center border-4 border-slate-50">
                  <Lock size={32} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xl font-black uppercase tracking-tight italic text-blue-gradient">Área Restrita</h4>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Insira a senha da empresa</p>
                </div>
              </div>

              <div className="space-y-4">
                <input
                  type="password"
                  value={managerLockPass}
                  onChange={(e) => setManagerLockPass(e.target.value)}
                  placeholder={managerPlaceholder}
                  className="w-full bg-slate-100 border-none rounded-2xl px-6 py-4 text-center text-lg font-black tracking-[0.3em] focus:ring-2 focus:ring-brand-blue/20"
                  autoFocus
                />
                
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => {
                      if (managerLockPass === '****') {
                        setIsManagerUnlocked(true);
                        if (user) localStorage.setItem(`manager_unlocked_${user.uid}`, 'true');
                        setShowManagerLockModal(false);
                        setManagerLockPass('');
                        // Alert success
                      } else {
                        alert("Senha incorreta");
                        setManagerLockPass('');
                      }
                    }}
                    className="py-4 bg-brand-blue text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-brand-blue/20"
                  >
                    Desbloquear
                  </button>
                  <button 
                    onClick={() => {
                      setShowManagerLockModal(false);
                      setManagerLockPass('');
                    }}
                    className="py-4 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase tracking-widest text-[10px]"
                  >
                    Voltar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Address Deletion Confirmation */}
      <AnimatePresence>
        {addressToDelete && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-xs rounded-[2rem] p-8 text-center space-y-6"
            >
              <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto">
                <Trash2 size={32} />
              </div>
              <div className="space-y-2">
                <h4 className="text-lg font-black uppercase tracking-tight">Excluir Endereço?</h4>
                <p className="text-xs text-slate-400 font-medium leading-relaxed">
                  Tem certeza que deseja apagar o endereço <span className="font-bold text-slate-600 block">{addressToDelete.name}</span>?
                </p>
              </div>
              <div className="flex flex-col space-y-2">
                <button 
                  onClick={() => deleteSavedAddress(addressToDelete.id)}
                  className="w-full py-4 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-red-500/20"
                >
                  Sim, Excluir
                </button>
                <button 
                  onClick={() => setAddressToDelete(null)}
                  className="w-full py-4 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase tracking-widest text-[10px]"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Filter Modal */}
      <AnimatePresence>
        {isFilterModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-blue-gradient text-white">
                <div className="space-y-1">
                  <h3 className="text-xl font-black uppercase tracking-tight italic">Filtros Avançados</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Personalize sua busca</p>
                </div>
                <button onClick={() => setIsFilterModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>
              <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto no-scrollbar">
                {/* Categories Multi-select */}
                <div className="space-y-4">
                  <div className="bg-brand-blue text-white px-4 py-1 rounded-full shadow-lg shadow-blue-500/20 scale-75 origin-left inline-block">
                    <h4 className="text-[10px] font-black uppercase tracking-widest italic">CATEGORIAS</h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(new Set(['Todos', ...filteredCategories.map(c => c.name)])).map((cat, idx) => (
                      <button
                        key={`cat-filter-${cat}-${idx}`}
                        onClick={() => {
                          if (cat === 'Todos') {
                            setSelectedCategories([]);
                            return;
                          }
                          setSelectedCategories(prev => 
                            prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
                          );
                        }}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          (cat === 'Todos' && selectedCategories.length === 0) || selectedCategories.includes(cat)
                            ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20'
                            : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Distance Filter */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Distância Máxima (km)</h4>
                  <div className="flex items-center space-x-4">
                    <input 
                      type="range" 
                      min="1" 
                      max="50" 
                      step="1"
                      value={distanceFilter || 50}
                      onChange={(e) => setDistanceFilter(Number(e.target.value))}
                      className="flex-1 accent-blue-600"
                    />
                    <span className="text-sm font-black text-brand-blue w-12 text-right">{distanceFilter || 50}km</span>
                  </div>
                </div>

                {/* Price Filter */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Preço Máximo (R$)</h4>
                  <div className="relative">
                    <input 
                      type="number" 
                      placeholder="Ex: 50"
                      value={maxPrice || ''}
                      onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : null)}
                      className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                {/* Sort By */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Ordenar por</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'default', label: 'Padrão', icon: Filter },
                      { id: 'cheapest', label: 'Mais Barato', icon: ArrowDownWideNarrow },
                      { id: 'rated', label: 'Melhor Avaliado', icon: Star },
                      { id: 'closest', label: 'Mais Próximo', icon: MapPin },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setSortBy(opt.id as any)}
                        className={`flex items-center space-x-2 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          sortBy === opt.id ? 'bg-brand-blue text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                        }`}
                      >
                        <opt.icon size={14} />
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-8 bg-slate-50 flex space-x-4">
                <button 
                  onClick={() => {
                    setSelectedCategories([]);
                    setDistanceFilter(null);
                    setMaxPrice(null);
                    setSortBy('default');
                  }}
                  className="flex-1 bg-white text-slate-400 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-slate-100"
                >
                  Limpar
                </button>
                <button 
                  onClick={() => setIsFilterModalOpen(false)}
                  className="flex-1 bg-blue-gradient text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-500/20"
                >
                  Aplicar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Order Workflow Modal */}
      <AnimatePresence>
        {orderStep !== 'idle' && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 50 }}
              className="bg-white w-full max-w-md rounded-[3rem] overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              {orderStep === 'payment' && (
                <div className="p-8 space-y-8">
                  <div className="text-center space-y-2">
                    <h3 className="text-2xl font-black uppercase tracking-tighter italic text-blue-gradient">Forma de Pagamento</h3>
                    <p className="text-slate-400 text-xs font-medium">Como você deseja pagar seu pedido?</p>
                  </div>
                  <div className="space-y-3">
                    {(() => {
                      const uniqueRestaurantIds = Array.from(new Set(cart.map(item => item.restaurantId)));
                      const cartRestaurants = restaurants.filter(r => uniqueRestaurantIds.includes(r.id));
                      const acceptedMethods = cartRestaurants.length > 0 
                        ? cartRestaurants.reduce((acc, res) => {
                            const resMethods = res.acceptedPaymentMethods || ['pix', 'cash', 'card'];
                            return acc.filter(m => resMethods.includes(m));
                          }, ['pix', 'cash', 'card'])
                        : ['pix', 'cash', 'card'];

                      return [
                        { id: 'pix', label: 'PIX', icon: Zap },
                        { id: 'cash', label: 'Dinheiro', icon: ShoppingBag },
                        { id: 'card', label: 'Cartão de Crédito', icon: CreditCard },
                      ].filter(m => acceptedMethods.includes(m.id)).map((method) => (
                        <button
                          key={method.id}
                          onClick={() => {
                            setSelectedPaymentMethod(method.id);
                            if (method.id !== 'pix' && deliveryOption === 'fast') {
                              setDeliveryOption('normal');
                              setSelectedTupaCategories({});
                            }
                          }}
                          className={`w-full flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${
                            selectedPaymentMethod === method.id 
                              ? 'border-brand-blue bg-brand-blue/10 text-brand-blue' 
                              : 'border-slate-100 hover:border-blue-200'
                          }`}
                        >
                          <div className="flex items-center space-x-4">
                            <method.icon size={20} />
                            <div className="text-left">
                              <span className="font-bold text-sm block leading-none">{method.label}</span>
                              {(method.id === 'cash' || method.id === 'card') && (
                                <span className="text-[10px] text-slate-400 font-medium leading-tight block mt-1">
                                  entrega mais demorada (entregador da loja)
                                </span>
                              )}
                            </div>
                          </div>
                          {selectedPaymentMethod === method.id && <CheckCircle2 size={20} />}
                        </button>
                      ));
                    })()}
                  </div>
                  <div className="flex space-x-4">
                    <button 
                      onClick={() => {
                        setOrderStep('idle');
                        setIsCartOpen(true);
                      }}
                      className="flex-1 bg-slate-100 text-slate-400 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px]"
                    >
                      Cancelar
                    </button>
                    <button 
                      disabled={!selectedPaymentMethod}
                      onClick={() => setOrderStep('confirmation')}
                      className="flex-1 bg-blue-gradient text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-blue-500/20 disabled:opacity-50"
                    >
                      Próximo
                    </button>
                  </div>
                </div>
              )}

              {orderStep === 'confirmation' && (
                <div className="p-8 space-y-6">
                  <div className="text-center space-y-4">
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mx-auto"
                    >
                      <MapPin size={32} />
                    </motion.div>
                    <div className="space-y-1">
                      <h3 className="text-2xl font-black uppercase tracking-tighter italic text-blue-gradient">Seu endereço é este?</h3>
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Confirme o local da entrega</p>
                    </div>
                  </div>
                  
                  {/* Location Info Display with Interaction */}
                  <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-[2.5rem] border-2 border-slate-100 dark:border-slate-700 shadow-sm space-y-5">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-white dark:bg-slate-700 rounded-2xl flex items-center justify-center text-blue-500 shadow-sm shrink-0 mt-1">
                        <MapPin size={24} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Endereço Identificado</p>
                        <p className="text-sm font-black text-slate-800 dark:text-white leading-tight italic line-clamp-2">"{locationInfo}"</p>
                        {userLocation && (
                          <div className="mt-2 flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                            <p className="text-[8px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Localização Confirmada por GPS</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => {
                        setIsCitySelectModalOpen(true);
                      }}
                      className="w-full flex items-center justify-center gap-2 p-4 bg-white dark:bg-slate-900 text-blue-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-50 transition-all border-2 border-blue-100 dark:border-blue-900/30 shadow-sm"
                    >
                      <RefreshCw size={14} />
                      Alterar Endereço
                    </button>
                  </div>

                  {/* Delivery Options */}
                  <div ref={deliveryOptionsRef} className="space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Opções de Entrega</p>
                    <div className="grid grid-cols-1 gap-3">
                      {(!featureFlags || featureFlags.delivery) && (
                        <button 
                          onClick={() => {
                            setDeliveryOption('normal');
                            setSelectedTupaCategories({});
                          }}
                          className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${deliveryOption === 'normal' ? 'border-brand-blue bg-brand-blue/10' : 'border-slate-100 bg-white'}`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${deliveryOption === 'normal' ? 'border-brand-blue' : 'border-slate-300'}`}>
                              {deliveryOption === 'normal' && <div className="w-2.5 h-2.5 bg-brand-blue rounded-full" />}
                            </div>
                            <div className="text-left">
                              <p className="text-xs font-black uppercase tracking-tight italic">Entrega Normal (Loja)</p>
                              <p className="text-[10px] text-slate-500 font-medium">Tempo estimado: {getEstimatedDeliveryTime()}</p>
                            </div>
                          </div>
                          <Truck size={20} className={deliveryOption === 'normal' ? 'text-brand-blue' : 'text-slate-300'} />
                        </button>
                      )}

                      {(!featureFlags || featureFlags.delivery) && selectedPaymentMethod === 'pix' && (
                        <div className="space-y-3">
                          <button 
                            onClick={() => setDeliveryOption('fast')}
                            disabled={isTupaDeliveryDisabled}
                            className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${deliveryOption === 'fast' ? 'border-orange-500 bg-orange-50' : 'border-slate-100 bg-white'} ${isTupaDeliveryDisabled ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                          >
                            <div className="flex items-center space-x-3">
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${deliveryOption === 'fast' ? 'border-orange-500' : 'border-slate-300'}`}>
                                {deliveryOption === 'fast' && <div className="w-2.5 h-2.5 bg-orange-500 rounded-full" />}
                              </div>
                              <div className="text-left">
                                <p className="text-xs font-black uppercase tracking-tight italic">{globalSettings?.tupaDeliveryName || 'Entrega Xô Fome (Rápido)'}</p>
                                <p className="text-[10px] text-slate-500 font-medium">Tempo estimado: {globalSettings?.tupaDeliveryEstimatedTime || '15-25 min'}</p>
                                {isTupaDeliveryDisabled && (
                                  <p className="text-[8px] text-red-500 font-bold uppercase mt-1">Fora do raio de entrega</p>
                                )}
                              </div>
                            </div>
                            <Zap size={20} className={deliveryOption === 'fast' ? 'text-orange-500' : 'text-slate-300'} />
                          </button>

                          {deliveryOption === 'fast' && !isTupaDeliveryDisabled && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="pl-8 space-y-2 overflow-hidden pb-2"
                            >
                              <div className="flex items-center justify-between items-end mb-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-orange-500/60">Selecione a Categoria</p>
                                {isLoadingTupaEstimates && (
                                   <div className="flex items-center space-x-1">
                                      <Loader2 size={10} className="animate-spin text-orange-500" />
                                      <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Calculando...</span>
                                   </div>
                                )}
                              </div>

                              <div className="space-y-3">
                                {Object.entries(tupaEstimates).length > 0 ? (
                                  Object.entries(tupaEstimates).map(([resId, categories]) => {
                                    const restaurant = restaurants.find(r => r.id === resId);
                                    return (
                                      <div key={resId} className="space-y-2">
                                        {Object.keys(tupaEstimates).length > 1 && (
                                          <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 truncate flex items-center gap-1">
                                            <Store size={8} /> {restaurant?.name}
                                          </p>
                                        )}
                                        <div className="flex flex-col gap-2">
                                          {(categories as any[]).map((cat, catIdx) => (
                                            <button
                                              key={`${cat.id}-${catIdx}`}
                                              onClick={() => setSelectedTupaCategories((prev: any) => ({ ...prev, [resId as any]: cat }))}
                                              className={`flex items-center gap-3 p-4 rounded-3xl border-2 transition-all ${selectedTupaCategories[resId as any]?.id === cat.id ? 'bg-orange-50 border-orange-500 shadow-lg shadow-orange-500/10' : 'bg-slate-50 border-transparent hover:bg-slate-100 hover:border-slate-200'}`}
                                            >
                                              <div className={`p-3 rounded-2xl ${selectedTupaCategories[resId as any]?.id === cat.id ? 'bg-orange-500 text-white' : 'bg-white text-slate-400'} shadow-sm`}>
                                                {cat.nome.toLowerCase().includes('moto') ? <Bike size={18} /> : <Car size={18} />}
                                              </div>
                                              <div className="flex-1 text-left">
                                                <p className={`text-[11px] font-black uppercase tracking-tight italic leading-tight ${selectedTupaCategories[resId as any]?.id === cat.id ? 'text-orange-950' : 'text-slate-900'}`}>{cat.nome}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{cat.distancia > 0 ? `${cat.distancia}km` : 'Estimado'}</p>
                                                  <div className="w-1 h-1 rounded-full bg-slate-300" />
                                                  <p className="text-[9px] font-black text-orange-600 uppercase">
                                                    {formatPrice(cat.preco || 0)}
                                                  </p>
                                                </div>
                                              </div>
                                              {selectedTupaCategories[resId as any]?.id === cat.id && (
                                                <CheckCircle2 size={16} className="text-orange-500" />
                                              )}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })
                                ) : !isLoadingTupaEstimates && (
                                  <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-200">
                                    <p className="text-[9px] font-bold text-slate-500 text-center uppercase tracking-widest">
                                      {estimatesError ? (
                                        <span className="text-red-500">{estimatesError.message}</span>
                                      ) : (
                                        'Nenhuma categoria disponível para esta rota'
                                      )}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </div>
                      )}

                      {(!featureFlags || featureFlags.pickup) && fromManager && (
                        <button 
                          onClick={() => {
                            setDeliveryOption('pickup');
                            setSelectedTupaCategories({});
                          }}
                          className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${deliveryOption === 'pickup' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 bg-white'}`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${deliveryOption === 'pickup' ? 'border-emerald-500' : 'border-slate-300'}`}>
                              {deliveryOption === 'pickup' && <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />}
                            </div>
                            <div className="text-left">
                              <p className="text-xs font-black uppercase tracking-tight italic">Retirada no local</p>
                              <p className="text-[10px] text-slate-500 font-medium">Você retira na loja</p>
                            </div>
                          </div>
                          <Store size={20} className={deliveryOption === 'pickup' ? 'text-emerald-500' : 'text-slate-300'} />
                        </button>
                      )}
                    </div>
                  </div>

                  {(deliveryOption === 'pickup' || isStoreView) && (
                    <div className="space-y-3 p-6 bg-emerald-50 rounded-[2rem] border-2 border-emerald-100 animate-pulse-subtle">
                      <div className="flex items-center space-x-2 mb-1">
                        <Hash size={16} className="text-emerald-600" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Número da Mesa</p>
                      </div>
                      <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-tight mb-2 italic">Digite o número da mesa para identificarmos seu pedido</p>
                      <input 
                        type="text"
                        value={tableNumber}
                        onChange={(e) => setTableNumber(e.target.value)}
                        placeholder="Ex: 05"
                        className="w-full bg-white border-2 border-emerald-100 rounded-2xl py-4 px-6 text-sm font-black focus:ring-4 focus:ring-emerald-500/10 placeholder:text-emerald-200"
                      />
                    </div>
                  )}

                  {/* Order Summary */}
                  <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Produtos</span>
                      <span className="text-sm font-bold text-slate-600">{formatPrice(cartTotal)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Entrega</span>
                      <span className="text-sm font-bold text-emerald-600">
                        {calculateDeliveryFee() === 0 
                          ? 'Grátis' 
                          : formatPrice(calculateDeliveryFee())}
                      </span>
                    </div>
                    <div className="h-px bg-slate-200" />
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black uppercase tracking-widest text-slate-800">Total a pagar</span>
                      <span className="text-xl font-black text-blue-gradient italic">
                        {formatPrice(cartTotal + calculateDeliveryFee())}
                      </span>
                    </div>
                  </div>

                  <div className="flex space-x-4">
                    <button 
                      onClick={() => setOrderStep('payment')}
                      className="flex-1 bg-slate-100 text-slate-400 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px]"
                    >
                      Voltar
                    </button>
                    <button 
                      onClick={placeOrder}
                      disabled={isOrdering}
                      className="flex-1 bg-blue-gradient text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-blue-500/20"
                    >
                      {isOrdering ? 'Enviando...' : 'Confirmar e Pedir'}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Product Media Modal */}
      <AnimatePresence>
        {selectedProductForMedia && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-4xl aspect-video md:aspect-auto md:max-h-[90vh] rounded-[2rem] overflow-hidden shadow-2xl bg-slate-900"
            >
              <button 
                onClick={() => setSelectedProductForMedia(null)}
                className="absolute top-6 right-6 z-10 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-2xl flex items-center justify-center transition-all"
              >
                <X size={24} />
              </button>

              <div className="w-full h-full flex items-center justify-center">
                {selectedProductForMedia.videoUrl ? (
                  <video 
                    src={selectedProductForMedia.videoUrl || undefined} 
                    controls 
                    autoPlay 
                    className="max-w-full max-h-full object-contain" 
                  />
                ) : (
                  <img 
                    src={selectedProductForMedia.imageUrl || undefined} 
                    alt={selectedProductForMedia.name}
                    className="max-w-full max-h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Pix Info Modal */}
      <AnimatePresence>
        {showPixInfo && placedOrder && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 50 }}
              className="bg-white w-full max-w-md rounded-[3rem] overflow-hidden shadow-2xl"
            >
              <div className="p-8 space-y-8 text-center">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <Zap size={40} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black uppercase tracking-tighter italic text-emerald-600">Pedido Realizado!</h3>
                  <p className="text-slate-400 text-xs font-medium">Para confirmar seu pedido, realize o pagamento via Pix.</p>
                </div>

                <div className="bg-slate-50 p-6 rounded-[2rem] space-y-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Chave Pix ({placedOrder.pixType})</p>
                    <p className="text-lg font-black text-slate-900 break-all">{placedOrder.pixKey}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Valor Total</p>
                    <p className="text-2xl font-black text-brand-blue">{formatPrice(placedOrder.total)}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(placedOrder.pixKey);
                      alert('copiado com sucesso vai a seu banco e pague');
                    }}
                    className="w-full bg-blue-gradient text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-500/20 flex items-center justify-center space-x-2"
                  >
                    <Copy size={18} />
                    <span>Copiar Chave Pix</span>
                  </button>
                  <button 
                    onClick={() => {
                      setShowPixInfo(false);
                      setPlacedOrder(null);
                    }}
                    className="w-full bg-slate-100 text-slate-600 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px]"
                  >
                    Já realizei o pagamento
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mercado Pago Order Pix Modal */}
      <AnimatePresence>
        {activeOrderPix && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 50 }}
              className="bg-white w-full max-w-md rounded-[3rem] overflow-hidden shadow-2xl"
            >
              <div className="p-8 space-y-6 text-center">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <Zap size={40} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black uppercase tracking-tighter italic text-emerald-600">Pagamento do Pedido</h3>
                  <p className="text-slate-400 text-xs font-medium">Escaneie o QR Code ou copie a chave para pagar seu pedido.</p>
                </div>

                {activeOrderPix.qrCodeBase64 && (
                  <div className="bg-white p-4 rounded-3xl shadow-inner border-2 border-slate-50 mx-auto w-fit">
                    <img 
                      src={`data:image/png;base64,${activeOrderPix.qrCodeBase64}`} 
                      alt="QR Code Pix" 
                      className="w-48 h-48"
                    />
                  </div>
                )}

                <div className="bg-slate-50 p-6 rounded-[2rem] space-y-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Valor do Pedido</p>
                    <p className="text-2xl font-black text-brand-blue">{formatPrice(activeOrderPix.amount)}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(activeOrderPix.qrCode);
                      alert('copiado com sucesso vai a seu banco e pague');
                    }}
                    className="w-full bg-blue-gradient text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-500/20 flex items-center justify-center space-x-2"
                  >
                    <Copy size={18} />
                    <span>Copiar Código Pix</span>
                  </button>
                  <button 
                    onClick={() => setActiveOrderPix(null)}
                    className="w-full bg-slate-100 text-slate-600 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px]"
                  >
                    Fechar
                  </button>
                </div>
                
                <div className="flex items-center justify-center space-x-2 text-slate-400">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Aguardando confirmação...</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Loading Modal for Pix Generation */}
      <AnimatePresence>
        {isGeneratingOrderPix && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-8 rounded-[2.5rem] shadow-2xl text-center space-y-4"
            >
              <div className="w-16 h-16 border-4 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="font-black uppercase tracking-widest text-xs text-slate-600">Gerando Pagamento Pix...</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Persistent Bottom Cart Bar */}
      <AnimatePresence>
        {cart.length > 0 && orderStep === 'idle' && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 left-0 right-0 z-50 hidden md:block"
          >
            <div className="bg-slate-900 text-white p-4 shadow-2xl flex flex-col space-y-2 border-t border-white/10 backdrop-blur-xl">
              {isMixedOrder && (
                <div className="bg-orange-500/10 border border-orange-500/20 px-4 py-3 rounded-xl flex flex-col space-y-3 mb-2 animate-pulse">
                  <div className="flex items-start space-x-3">
                    <AlertCircle size={14} className="text-orange-500 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-orange-200 leading-tight">
                        <span className="text-orange-500 font-black uppercase tracking-widest mr-1">Atenção:</span>
                        Você selecionou produtos de empresas diferentes. Por isso, a taxa de entrega será maior.
                      </p>
                      <p className="text-[9px] font-bold text-white/90 leading-tight">
                        Recomendamos que faça o pedido de apenas uma empresa para obter desconto na entrega.
                      </p>
                      <p className="text-[8px] text-orange-200/70 leading-tight italic">
                        Dica: se o mesmo produto estiver disponível em uma das lojas que você já escolheu, vale a pena fazer todo o pedido nela. Assim, você paga apenas uma taxa de entrega e o valor total fica mais barato.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                    {uniqueRestaurantsInCart.map((restaurant, idx) => (
                      <button 
                        key={`${restaurant.id}-${idx}`} 
                        onClick={() => handleNavigateToRestaurant(restaurant.id)}
                        className="flex items-center space-x-2 bg-white/5 px-2 py-1 rounded-lg border border-white/5 hover:bg-white/10 transition-all active:scale-95"
                      >
                        <img 
                          src={restaurant.imageUrl || `https://picsum.photos/seed/${restaurant.id}/100/100`} 
                          alt={restaurant.name}
                          className="w-4 h-4 rounded-full object-cover border border-white/10"
                          referrerPolicy="no-referrer"
                        />
                        <span className="text-[8px] font-black uppercase tracking-widest text-white/70 truncate max-w-[100px]">
                          {restaurant.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pb-2">
                    {cart.map((item, idx) => {
                      const itemRestaurant = restaurants.find(r => r.id === item.restaurantId);
                      return (
                        <div key={`${item.id}-${idx}-${JSON.stringify(item.selectedAddOns || [])}`} className="flex-shrink-0 relative group">
                          <div className="w-12 h-12 rounded-2xl overflow-hidden border border-white/10">
                            <img src={item.imageUrl || undefined} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                          <div className="absolute -top-1 -right-1 flex flex-col space-y-1">
                            <button 
                              onClick={() => clearItemFromCart(item.id, item.selectedAddOns)}
                              className="bg-red-500 text-white p-1 rounded-full shadow-lg hover:scale-110 transition-transform"
                            >
                              <X size={10} />
                            </button>
                            <span className="bg-brand-blue text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full border border-slate-900">
                              {item.quantity}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-col items-center">
                            <p className="text-[8px] font-black uppercase tracking-tight text-slate-400 truncate w-12 text-center">
                              {item.name}
                            </p>
                            {itemRestaurant && (
                              <button 
                                onClick={() => handleNavigateToRestaurant(itemRestaurant.id)}
                                className="flex items-center space-x-1 mt-0.5 bg-white/5 px-1 rounded-md hover:bg-white/10 transition-all active:scale-95"
                              >
                                <img 
                                  src={itemRestaurant.imageUrl || `https://picsum.photos/seed/${itemRestaurant.id}/50/50`} 
                                  className="w-2 h-2 rounded-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                                <span className="text-[5px] font-black uppercase tracking-widest text-slate-500 truncate max-w-[30px]">
                                  {itemRestaurant.name}
                                </span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              <div className="flex items-center space-x-4 ml-4 pr-2">
                <div className="text-right">
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">Total</p>
                  <p className="text-sm font-black italic text-emerald-600 whitespace-nowrap">{formatPrice(cartTotal)}</p>
                </div>
                <button 
                  onClick={() => setOrderStep('payment')}
                  className="bg-blue-gradient px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-500/20 hover:scale-105 transition-transform flex-shrink-0"
                >
                  Pedir
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recharge Modal */}
      <AnimatePresence>
        {isRecharging && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black uppercase tracking-tight italic">Recarregar Saldo</h3>
                    <div className="flex items-center space-x-2">
                      <p className="text-slate-400 text-xs font-medium">Pagamento via Pix com aprovação imediata.</p>
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

                {!activePixPayment ? (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Valor da Recarga (R$)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">R$</span>
                        <input 
                          type="number" 
                          value={rechargeAmount}
                          onChange={(e) => setRechargeAmount(e.target.value)}
                          className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-6 text-lg font-black focus:ring-2 focus:ring-blue-500/20"
                          placeholder="0,00"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2 pt-2">
                        {[20, 50, 100, 200].map((amount) => (
                          <button
                            key={amount}
                            onClick={() => setRechargeAmount(amount.toString())}
                            className="px-4 py-2 bg-slate-50 hover:bg-brand-blue/10 hover:text-brand-blue rounded-xl text-xs font-bold transition-all border border-slate-100"
                          >
                            R$ {amount}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button 
                      onClick={handleGeneratePix}
                      disabled={isGeneratingPix || !rechargeAmount || parseFloat(rechargeAmount) < (globalSettings?.minRechargeAmount || 10)}
                      className="w-full bg-blue-gradient text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center space-x-3"
                    >
                      {isGeneratingPix ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Plus size={18} />
                          <span>Gerar Pix de R$ {parseFloat(rechargeAmount || '0').toFixed(2)}</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6 text-center">
                    <div className="bg-slate-50 p-8 rounded-[2rem] flex flex-col items-center space-y-4">
                      <div className="bg-white p-4 rounded-3xl shadow-sm">
                        <img src={`data:image/png;base64,${activePixPayment.qrCodeBase64}`} alt="QR Code Pix" className="w-48 h-48" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Escaneie o QR Code ou copie o código</p>
                        <p className="text-lg font-black text-brand-blue">R$ {activePixPayment.amount.toFixed(2)}</p>
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(activePixPayment.qrCode);
                        alert('copiado com sucesso vai a seu banco e pague');
                      }}
                      className="w-full bg-slate-100 text-slate-600 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center space-x-2 hover:bg-slate-200 transition-all"
                    >
                      <Copy size={16} />
                      <span>Copiar Código Pix</span>
                    </button>

                    <div className="flex items-center justify-center space-x-3 text-brand-blue">
                      <div className="w-4 h-4 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
                      <span className="text-[10px] font-black uppercase tracking-widest animate-pulse">Aguardando Pagamento...</span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeChatOrderId && (
          <Chat 
            orderId={activeChatOrderId} 
            orderStatus={activeOrders.find(o => o.id === activeChatOrderId)?.status || ''} 
            isManagerView={false}
            onClose={() => setActiveChatOrderId(null)}
          />
        )}
      </AnimatePresence>

      {/* Marketing Pop-up */}
      <AnimatePresence>
        {showPopup && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseMarketingPopup}
              className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative max-w-lg w-full bg-white rounded-[3rem] overflow-hidden shadow-2xl z-10"
            >
              <button 
                onClick={handleCloseMarketingPopup}
                className="absolute top-4 right-4 z-10 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-all"
              >
                <X size={20} />
              </button>
              <div 
                className="cursor-pointer"
                onClick={() => {
                  if (showPopup.linkUrl) window.open(showPopup.linkUrl, '_blank');
                  handleCloseMarketingPopup();
                }}
              >
                <img src={showPopup.imageUrl || undefined} className="w-full h-auto" referrerPolicy="no-referrer" />
                <div className="p-8 text-center space-y-4">
                  <h3 className="text-2xl font-black uppercase tracking-tighter italic text-blue-gradient">Oferta Especial!</h3>
                  <p className="text-slate-400 text-sm font-medium">Clique na imagem para aproveitar esta oportunidade incrível que preparamos para você.</p>
                  <button className="w-full bg-blue-gradient text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-500/20">
                    Ver Detalhes
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cart Overlay (Mobile) */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="fixed bottom-0 left-0 right-0 md:left-auto md:right-0 md:top-0 md:h-screen md:w-[450px] bg-white rounded-t-[3rem] md:rounded-t-none md:rounded-l-[3rem] z-[70] flex flex-col h-[90vh] md:h-screen safe-bottom shadow-2xl"
            >
              <div className="p-6 flex items-center justify-between border-b border-slate-50">
                <button 
                  onClick={() => {
                    setCart([]);
                    setIsCartOpen(false);
                  }} 
                  className="text-xs font-black uppercase tracking-widest text-red-500"
                >
                  Limpar
                </button>
                <div className="w-12 h-1.5 bg-slate-100 rounded-full" />
                <button 
                  onClick={() => {
                    setIsCartOpen(false);
                    setSelectedRestaurant(null);
                  }}
                  className="p-2 bg-slate-50 rounded-full text-slate-400"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <ShoppingBag size={20} className="text-slate-800 dark:text-white" />
                    <h3 className="text-lg font-black uppercase tracking-tighter italic text-slate-800 dark:text-white">Sua Sacola</h3>
                  </div>
                  <button 
                    onClick={() => {
                      setCartViewTab(prev => prev === 'cart' ? 'favorites' : 'cart');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-1.5 shadow-sm border ${
                      cartViewTab === 'favorites' 
                        ? 'bg-red-500 text-white border-red-500 shadow-md shadow-red-500/20' 
                        : 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/40 hover:bg-rose-100 dark:hover:bg-rose-900/40'
                    }`}
                  >
                    <Heart size={12} className={cartViewTab === 'favorites' ? 'fill-white text-white' : 'fill-rose-500 text-rose-500'} />
                    Favoritos
                  </button>
                </div>

                {cartViewTab === 'cart' ? (
                  <div className="space-y-6">
                    {isMixedOrder && (
                      <div className="bg-orange-50/80 border border-orange-100 p-5 rounded-3xl flex flex-col space-y-4 animate-pulse">
                        <div className="flex items-start space-x-3">
                          <AlertCircle size={18} className="text-orange-500 flex-shrink-0 mt-0.5" />
                          <div className="space-y-2">
                            <p className="text-[11px] font-black text-orange-900 leading-tight uppercase tracking-tight">
                              Você selecionou produtos de empresas diferentes. Por isso, a taxa de entrega será maior.
                            </p>
                            <p className="text-[10px] font-bold text-orange-800 leading-tight">
                              Recomendamos que faça o pedido de apenas uma empresa para obter desconto na entrega.
                            </p>
                            <div className="bg-white/40 p-3 rounded-xl border border-orange-200/50">
                              <p className="text-[9px] text-orange-800/80 leading-relaxed italic font-medium">
                                <span className="font-black uppercase mr-1">Dica:</span>
                                se o mesmo produto estiver disponível em uma das lojas que você já escolheu, vale a pena fazer todo o pedido nela. Assim, você paga apenas uma taxa de entrega e o valor total fica mais barato.
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-3 pt-3 border-t border-orange-200/50">
                          {uniqueRestaurantsInCart.map((restaurant, idx) => (
                            <button 
                              key={`${restaurant.id}-${idx}`} 
                              onClick={() => handleNavigateToRestaurant(restaurant.id)}
                              className="flex items-center space-x-2 bg-white/60 px-3 py-1.5 rounded-xl border border-orange-200 shadow-sm hover:bg-white transition-all active:scale-95"
                            >
                              <img 
                                src={restaurant.imageUrl || `https://picsum.photos/seed/${restaurant.id}/100/100`} 
                                alt={restaurant.name}
                                className="w-6 h-6 rounded-full object-cover border border-orange-300"
                                referrerPolicy="no-referrer"
                              />
                              <span className="text-[9px] font-black uppercase tracking-widest text-orange-900 truncate max-w-[100px]">
                                {restaurant.name}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {cart.length === 0 ? (
                      <div className="py-12 text-center space-y-4">
                        <div className="w-16 h-16 bg-slate-50 rounded-full mx-auto flex items-center justify-center text-slate-300">
                          <ShoppingBag size={32} />
                        </div>
                        <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Sacola Vazia</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {cart.map((item, idx) => {
                          const itemRestaurant = restaurants.find(r => r.id === item.restaurantId);
                          return (
                            <div key={`${item.id}-${idx}-${JSON.stringify(item.selectedAddOns || [])}`} className="flex items-center space-x-4 p-4 bg-slate-50/50 rounded-3xl border border-slate-100/50">
                              <div className="w-16 h-16 rounded-2xl overflow-hidden border border-slate-100 flex-shrink-0 shadow-sm">
                                <img 
                                  src={getProductImage(item.id, item.imageUrl)} 
                                  alt={item.name} 
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                              <div className="flex-1 min-w-0 space-y-1">
                                <p className="text-sm font-black uppercase tracking-tight italic truncate text-slate-900">{item.name}</p>
                                {itemRestaurant && (
                                  <button 
                                    onClick={() => handleNavigateToRestaurant(itemRestaurant.id)}
                                    className="flex items-center space-x-2 bg-white px-2 py-1 rounded-lg border border-slate-100 w-fit hover:bg-slate-50 transition-all active:scale-95"
                                  >
                                    <img 
                                      src={itemRestaurant.imageUrl || `https://picsum.photos/seed/${itemRestaurant.id}/50/50`} 
                                      className="w-4 h-4 rounded-full object-cover"
                                      referrerPolicy="no-referrer"
                                    />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                                      {itemRestaurant.name}
                                    </span>
                                  </button>
                                )}
                                <div className="flex flex-col">
                                  {(item.promoPrice || (item.isFlashSale && isFlashSaleActive(item))) && (
                                    <span className="text-xs text-red-500 font-bold line-through leading-none">{formatPrice(item.price)}</span>
                                  )}
                                  <p className="text-xs text-emerald-600 font-bold leading-tight">
                                    {formatPrice(item.isFlashSale ? (isFlashSaleActive(item) ? (item.promoPrice || item.price) : item.price) : (item.promoPrice || item.price))}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-3 bg-white rounded-full px-4 py-2 shadow-sm border border-slate-100">
                                <button onClick={() => removeFromCart(item.id, item.selectedAddOns)} className="text-slate-400 hover:text-red-500 transition-colors"><Minus size={14} /></button>
                                <span className="text-xs font-black w-4 text-center">{item.quantity}</span>
                                <button onClick={() => addToCart(item, item.selectedAddOns)} className="text-slate-400 hover:text-blue-500 transition-colors"><Plus size={14} /></button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {favoritedProducts.length === 0 ? (
                      <div className="py-12 text-center space-y-4">
                        <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/30 rounded-full mx-auto flex items-center justify-center text-rose-500">
                          <Heart size={32} />
                        </div>
                        <div className="space-y-1">
                          <p className="text-slate-700 dark:text-slate-300 text-sm font-black uppercase tracking-wide">Nenhum Favorito Ainda</p>
                          <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider max-w-[200px] mx-auto leading-normal">
                            Dê um like em produtos no cardápio para salvá-los aqui!
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {favoritedProducts.map((item) => {
                          const itemRestaurant = restaurants.find(r => r.id === item.restaurantId);
                          const isSelected = selectedFavoriteProductIds.includes(item.id);
                          
                          return (
                            <div 
                              key={`fav-drawer-item-${item.id}`} 
                              onClick={() => {
                                setSelectedFavoriteProductIds(prev => 
                                  prev.includes(item.id) 
                                    ? prev.filter(id => id !== item.id) 
                                    : [...prev, item.id]
                                );
                              }}
                              className={`flex items-center space-x-4 p-4 bg-slate-50/50 dark:bg-slate-900/40 rounded-3xl border transition-all duration-300 cursor-pointer ${
                                isSelected 
                                  ? 'border-red-500 bg-red-50/20 dark:border-red-600 dark:bg-red-950/10' 
                                  : 'border-slate-100/50 dark:border-slate-800 hover:border-slate-200'
                              }`}
                            >
                              {/* Quadradinho uma lacuna checkboxes */}
                              <div className="flex-shrink-0">
                                <div 
                                  className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${
                                    isSelected 
                                      ? 'bg-red-500 border-red-500 text-white scale-110 shadow-md shadow-red-500/20' 
                                      : 'border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-800'
                                  }`}
                                >
                                  {isSelected && <Check size={14} strokeWidth={3} />}
                                </div>
                              </div>

                              <div className="w-16 h-16 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 flex-shrink-0 shadow-sm">
                                <img 
                                  src={getProductImage(item.id, item.imageUrl)} 
                                  alt={item.name} 
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              </div>

                              <div className="flex-1 min-w-0 space-y-1">
                                <p className="text-sm font-black uppercase tracking-tight italic truncate text-slate-900 dark:text-white">{item.name}</p>
                                {itemRestaurant && (
                                  <div className="flex items-center space-x-2 bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-800 w-fit">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                      {itemRestaurant.name}
                                    </span>
                                  </div>
                                )}
                                <div className="flex flex-col">
                                  {(item.promoPrice || (item.isFlashSale && isFlashSaleActive(item))) && (
                                    <span className="text-xs text-red-500 font-bold line-through leading-none">{formatPrice(item.price)}</span>
                                  )}
                                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold leading-tight">
                                    {formatPrice(item.isFlashSale ? (isFlashSaleActive(item) ? (item.promoPrice || item.price) : item.price) : (item.promoPrice || item.price))}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {cartViewTab === 'cart' && cartSuggestions.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-black uppercase tracking-widest text-slate-400">Precisa de mais alguma coisa?</h4>
                    <div className="flex space-x-4 overflow-x-auto no-scrollbar pb-4 -mx-6 px-6">
                      {cartSuggestions.map((p, idx) => {
                        const restaurant = restaurants.find(r => r.id === p.restaurantId);
                        const isMixed = Array.from(new Set(cart.map(item => item.restaurantId))).length > 1;

                        return (
                          <motion.div 
                            key={`${p.id}-${idx}`}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => addToCart(p)}
                            className="flex-shrink-0 w-48 bg-slate-50 rounded-[2rem] p-4 space-y-3 border border-transparent hover:border-blue-500/20 transition-all"
                          >
                            <div className="aspect-square rounded-2xl overflow-hidden bg-white relative">
                              <img src={getProductImage(p.id, p.imageUrl)} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              {isMixed && restaurant && (
                                <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg border border-slate-100">
                                  <p className="text-[6px] font-black uppercase tracking-widest truncate max-w-[60px]">{restaurant.name}</p>
                                </div>
                              )}
                            </div>
                            <div className="space-y-1">
                              <h5 className="text-[10px] font-black uppercase tracking-tight italic truncate">{p.name}</h5>
                              <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest line-clamp-2 h-6 leading-tight">{p.description}</p>
                              <div className="flex items-center justify-between pt-1">
                                <span className="text-[10px] font-black text-emerald-600">{formatPrice(p.price)}</span>
                                <div className="p-1.5 bg-white rounded-lg shadow-sm text-blue-600">
                                  <Plus size={12} />
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-8 border-t border-slate-50 space-y-4 bg-white">
                {cartViewTab === 'cart' ? (
                  <>
                    {hasUnmetMinOrder && (
                      <div className="space-y-4">
                        {restaurantsWithUnmetMinOrder.map(unmet => (
                          <motion.div 
                            key={unmet.id} 
                            initial={{ scale: 0.95 }}
                            animate={{ scale: [0.98, 1.02, 0.98] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                            className="p-5 bg-red-50 rounded-[2.5rem] border-2 border-red-100 flex flex-col space-y-2 shadow-xl shadow-red-500/10"
                          >
                            <div className="flex items-center gap-2">
                              <AlertCircle size={20} className="text-red-500 animate-bounce" />
                              <h4 className="text-[11px] font-black uppercase tracking-tighter text-red-600 italic">Pedido Mínimo</h4>
                            </div>
                            <p className="text-[10px] font-bold text-slate-700 leading-tight">
                              Esta empresa optou pelo valor mínimo para ativação da <span className="text-emerald-500 font-black italic">ENTREGA GRÁTIS</span> a partir de:
                            </p>
                            <div className="bg-white/60 p-3 rounded-2xl flex items-center justify-center">
                              <span className="text-3xl font-black text-red-600 italic tracking-tighter">
                                {formatPrice(unmet.minOrderValue)}
                              </span>
                            </div>
                            <div className="text-center pt-1">
                              <p className="text-[10px] font-black uppercase tracking-widest text-red-400">
                                Faltam apenas <span className="text-red-600">{formatPrice(unmet.minOrderValue - unmet.currentTotal)}</span> para liberar!
                              </p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-widest text-slate-400">Total</span>
                      <span className="text-2xl font-black text-emerald-600">{formatPrice(cartTotal)}</span>
                    </div>
                    <button 
                      onClick={() => {
                        if (cart.length > 0 && !hasUnmetMinOrder) {
                          setOrderStep('payment');
                          setIsCartOpen(false);
                        }
                      }}
                      disabled={cart.length === 0 || hasUnmetMinOrder}
                      className={`w-full py-5 rounded-3xl font-black uppercase tracking-widest text-xs shadow-2xl transition-all disabled:opacity-50 ${
                        hasUnmetMinOrder 
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                          : 'bg-blue-gradient text-white shadow-blue-500/30 animate-pulse'
                      }`}
                    >
                      Continuar
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-widest text-slate-400">Soma Selecionados</span>
                      <span className="text-2xl font-black text-rose-600 dark:text-rose-400">{formatPrice(selectedFavoritesTotal)}</span>
                    </div>
                    <button 
                      onClick={() => {
                        const selectedProds = favoritedProducts.filter(p => selectedFavoriteProductIds.includes(p.id));
                        if (selectedProds.length === 0) return;
                        
                        // Add each selected product to the cart with quantity 1
                        selectedProds.forEach(prod => {
                          addToCart(prod, []);
                        });
                        
                        // Switch view tab back to 'cart' so they can see finalized order details
                        setCartViewTab('cart');
                      }}
                      disabled={selectedFavoriteProductIds.length === 0}
                      className="w-full py-5 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-3xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-rose-500/20 transition-all disabled:opacity-50"
                    >
                      Fazer pedido
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Persistent Cart Bar */}
      <AnimatePresence>
        {cart.length > 0 && !isCartOpen && orderStep === 'idle' && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 left-0 right-0 z-[55] p-3 md:p-6 bg-white/80 backdrop-blur-xl border-t border-slate-100 md:hidden safe-bottom"
          >
            <motion.button 
              onClick={() => setIsCartOpen(true)}
              animate={{ scale: [1, 1.01, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="relative w-full bg-emerald-600 text-white p-3 md:p-5 rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-between shadow-2xl shadow-emerald-500/40 overflow-hidden group"
            >
              {/* Ray/Shimmer Effect */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 -left-[100%] w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-25deg] animate-shimmer" />
              </div>

              <div className="flex items-center space-x-3 md:space-x-4 relative z-10">
                <div className="bg-white/20 p-2 md:p-3 rounded-xl md:rounded-2xl backdrop-blur-md">
                  <ShoppingBag size={16} className="md:w-5 md:h-5" />
                </div>
                <div className="text-left">
                  <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100 block mb-0.5">Sua Sacola</span>
                  <span className="text-[10px] md:text-sm font-black uppercase tracking-widest flex items-center">
                    Ver Sacola
                    <Zap size={10} className="ml-1.5 text-yellow-300 animate-pulse md:w-3 md:h-3" />
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 md:gap-4 relative z-10">
                <div className="flex flex-col items-end">
                  <span className="text-[7px] md:text-[8px] font-black uppercase tracking-widest text-emerald-200">{cart.length} {cart.length === 1 ? 'item' : 'itens'}</span>
                  <span className="text-sm md:text-xl font-black italic tracking-tighter">{formatPrice(cartTotal)}</span>
                </div>
                <div className="bg-white/20 p-1.5 md:p-2 rounded-lg md:rounded-xl">
                  <ChevronRight size={16} className="md:w-5 md:h-5" />
                </div>
              </div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Nav Removed as requested */}
      {/* Gallery Modal */}
      <AnimatePresence>
        {isGalleryOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsGalleryOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tighter italic">Banco de Imagens</h2>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Escolha uma imagem profissional</p>
                </div>
                <button onClick={() => setIsGalleryOpen(false)} className="p-4 bg-slate-50 rounded-2xl text-slate-400 hover:bg-slate-100 transition-all">
                  <X size={20} />
                </button>
              </div>
              <div className="p-8 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-3 gap-4">
                  {[
                    'food', 'burger', 'pizza', 'sushi', 'pasta', 'salad', 'dessert', 'drink', 'restaurant', 'chef', 'delivery', 'market'
                  ].map((keyword) => (
                    <button 
                      key={keyword}
                      onClick={() => handleGallerySelect(`https://picsum.photos/seed/${keyword}/800/600`)}
                      className="group relative aspect-video rounded-3xl overflow-hidden border-4 border-transparent hover:border-brand-blue transition-all"
                    >
                      <img 
                        src={`https://picsum.photos/seed/${keyword}/400/300`} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-all duration-500" 
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-all flex items-end p-4">
                        <span className="text-white text-[10px] font-black uppercase tracking-widest">{keyword}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-8 bg-slate-50 flex justify-end">
                <button 
                  onClick={() => setIsGalleryOpen(false)}
                  className="px-8 py-4 bg-white text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest shadow-sm hover:bg-slate-100 transition-all"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Checkout Info Modal */}
      <AnimatePresence>
        {showCheckoutInfoModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-slate-100 bg-blue-gradient text-white">
                <h3 className="text-xl font-black uppercase tracking-tight italic">Dados de Entrega</h3>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Precisamos dessas informações para seu pedido</p>
              </div>
              
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Seu Nome Completo</label>
                  <input 
                    type="text" 
                    value={checkoutName} 
                    onChange={e => setCheckoutName(e.target.value)}
                    placeholder="Como devemos te chamar?"
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">WhatsApp para Contato</label>
                  <input 
                    type="tel" 
                    value={checkoutWhatsapp} 
                    onChange={e => setCheckoutWhatsapp(formatPhone(e.target.value))}
                    placeholder="(00) 00000-0000"
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Endereço de Entrega</label>
                  <input 
                    type="text" 
                    value={checkoutAddress} 
                    onChange={e => setCheckoutAddress(e.target.value)}
                    placeholder="Rua, Número, Bairro"
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ponto de Referência</label>
                  <input 
                    type="text" 
                    value={checkoutReferencePoint} 
                    onChange={e => setCheckoutReferencePoint(e.target.value)}
                    placeholder="Ex: Próximo ao mercado X"
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <button 
                  disabled={isSavingCheckoutInfo}
                  onClick={async () => {
                    if (!checkoutName || !checkoutWhatsapp || !checkoutAddress || !checkoutReferencePoint) {
                      alert('Por favor, preencha todos os campos, incluindo o ponto de referência.');
                      return;
                    }

                    if (checkoutWhatsapp.replace(/\D/g, '').length < 11) {
                      alert('O número de WhatsApp está incompleto ou inválido. Use (00) 00000-0000');
                      return;
                    }
                    
                    setIsSavingCheckoutInfo(true);
                    try {
                      const updatedData = { 
                        displayName: checkoutName, 
                        whatsapp: checkoutWhatsapp,
                        address: checkoutAddress,
                        referencePoint: checkoutReferencePoint
                      };
                      await updateProfileData(updatedData);
                      
                      // Automatically try to place order again with the new data
                      await placeOrder(updatedData);
                      setShowCheckoutInfoModal(false);
                    } catch (error) {
                      console.error("Erro ao atualizar perfil:", error);
                      alert("Erro ao salvar dados. Tente novamente.");
                    } finally {
                      setIsSavingCheckoutInfo(false);
                    }
                  }}
                  className="w-full bg-blue-gradient text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSavingCheckoutInfo ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      Salvando...
                    </>
                  ) : (
                    'Salvar e Continuar'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add-on Selection Modal */}
      <AnimatePresence>
        {selectedProductForAddOns && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setSelectedProductForAddOns(null)}
          >
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-xl font-black uppercase tracking-tighter italic">{selectedProductForAddOns.name}</h3>
                    <p className="text-xs text-slate-400 font-medium">{selectedProductForAddOns.description}</p>
                  </div>
                  <button 
                    onClick={() => setSelectedProductForAddOns(null)}
                    className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Escolha seus acompanhamentos</h4>
                    {selectedProductForAddOns.maxAddOns && (
                      <span className="text-[10px] font-black uppercase tracking-widest text-brand-blue bg-brand-blue/10 px-3 py-1 rounded-full">
                        Máximo: {selectedProductForAddOns.maxAddOns}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                    {selectedProductForAddOns.addOns?.map(addon => {
                      const isSelected = selectedAddOns.some(a => a.id === addon.id);
                      const isDisabled = !isSelected && selectedProductForAddOns.maxAddOns !== undefined && 
                                       selectedAddOns.filter(a => !a.isFixed).length >= selectedProductForAddOns.maxAddOns;

                      return (
                        <button
                          key={addon.id}
                          disabled={addon.isFixed || (isDisabled && !addon.isFixed)}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedAddOns(prev => prev.filter(a => a.id !== addon.id));
                            } else {
                              setSelectedAddOns(prev => [...prev, addon]);
                            }
                          }}
                          className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                            isSelected 
                              ? 'border-brand-blue bg-brand-blue/5' 
                              : 'border-slate-100 dark:border-slate-800 hover:border-brand-blue/30'
                          } ${addon.isFixed ? 'opacity-70 cursor-default' : ''} ${(isDisabled && !addon.isFixed) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-slate-100">
                            <img 
                              src={addon.imageUrl || `https://picsum.photos/seed/${addon.id}/200/200`} 
                              alt={addon.name}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-black uppercase tracking-tight italic">{addon.name}</p>
                              {addon.isFixed && (
                                <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Fixo</span>
                              )}
                            </div>
                            <p className="text-[10px] font-bold text-emerald-600">
                              {addon.price && addon.price > 0 ? formatPrice(addon.price) : 'Grátis'}
                            </p>
                          </div>
                          {!addon.isFixed && (
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                              isSelected ? 'border-brand-blue bg-brand-blue' : 'border-slate-200'
                            }`}>
                              {isSelected && <Check size={12} className="text-white" />}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    onClick={() => addToCart(selectedProductForAddOns, selectedAddOns)}
                    className="w-full bg-blue-gradient text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-500/20 hover:scale-[1.02] transition-all"
                  >
                    Adicionar ao Carrinho • {formatPrice(
                      (selectedProductForAddOns.isFlashSale ? (isFlashSaleActive(selectedProductForAddOns) ? (selectedProductForAddOns.promoPrice || selectedProductForAddOns.price) : selectedProductForAddOns.price) : (selectedProductForAddOns.promoPrice || selectedProductForAddOns.price)) + 
                      selectedAddOns.reduce((sum, a) => sum + (a.price || 0), 0)
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Modals for "See More" */}
      <AnimatePresence>
        {showAllFeaturedModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAllFeaturedModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              className="bg-white dark:bg-slate-900 w-full max-w-6xl max-h-[90vh] rounded-[2rem] overflow-hidden shadow-2xl relative z-10 flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-xl font-black uppercase italic text-slate-900 dark:text-white">Produtos em Destaque</h3>
                <button onClick={() => setShowAllFeaturedModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto no-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {featuredProducts.length > 0 && Array.from(new Map(featuredProducts.map((item: any) => [item.id, item])).values()).map((item: any, idx) => (
                    <motion.div 
                      key={`featured-item-${item.id}`}
                      whileHover={{ y: -5 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        const productRestaurant = restaurants.find(r => r.id === item.restaurantId);
                        if (productRestaurant) {
                          if (isProductAvailable(item as any, currentTime, productRestaurant)) {
                            setSelectedRestaurant(productRestaurant);
                            setView('restaurant');
                            setShowAllFeaturedModal(false);
                            addToCart(item as any);
                          }
                        }
                      }}
                      className={`bg-white dark:bg-slate-900 rounded-[2rem] p-3 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all flex flex-col space-y-3 group cursor-pointer relative overflow-hidden`}
                    >
                      <div className="w-full aspect-square rounded-2xl overflow-hidden relative">
                        <img 
                          src={item.imageUrl || undefined} 
                          alt={item.name} 
                          className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-500`} 
                          referrerPolicy="no-referrer" 
                        />
                      </div>
                      <div className="flex-1 space-y-2">
                        <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-tight italic leading-tight text-sm truncate">{item.name}</h4>
                        <div className="flex items-center justify-between">
                          <span className="text-emerald-600 font-black text-sm">{formatPrice(item.price)}</span>
                          <div className="bg-brand-blue/10 text-brand-blue p-2 rounded-xl">
                            <Plus size={16} />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Review Details Modal (For Owners) */}
      <AnimatePresence>
        {selectedReviewForDetails && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm"
            onClick={() => setSelectedReviewForDetails(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[3rem] p-8 max-w-md w-full shadow-2xl space-y-6 relative"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setSelectedReviewForDetails(null)}
                className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>

              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-20 h-20 bg-brand-blue/10 rounded-full flex items-center justify-center text-brand-blue">
                  <Users size={40} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-black uppercase tracking-tighter italic">Dados do Cliente</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Informações Privadas para o Dono</p>
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <div className="bg-slate-50 p-4 rounded-2xl space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white rounded-xl text-brand-blue shadow-sm">
                      <Users size={16} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nome</p>
                      <p className="text-sm font-bold">{selectedReviewForDetails.customerName}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white rounded-xl text-brand-blue shadow-sm">
                      <Mail size={16} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">E-mail</p>
                      <p className="text-sm font-bold">{selectedReviewForDetails.customerEmail || 'Não informado'}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white rounded-xl text-brand-blue shadow-sm">
                      <MessageCircle size={16} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">WhatsApp</p>
                      <p className="text-sm font-bold">{selectedReviewForDetails.customerPhone || 'Não informado'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-2xl">
                  <p className="text-[10px] font-black uppercase tracking-widest text-brand-blue mb-2">Comentário Original</p>
                  <p className="text-xs text-slate-600 italic leading-relaxed">"{selectedReviewForDetails.comment}"</p>
                </div>
              </div>

              <button 
                onClick={() => setSelectedReviewForDetails(null)}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl transition-all hover:scale-[1.02]"
              >
                Fechar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
        {/* City Selection Modal for Alterar Endereço */}
        <AnimatePresence>
          {isCitySelectModalOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md"
              onClick={() => setIsCitySelectModalOpen(false)}
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl relative border border-slate-100 dark:border-slate-800 p-6 flex flex-col space-y-4"
                onClick={e => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black uppercase tracking-tighter italic text-blue-gradient">Selecione a cidade</h3>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Para abrir o mapa satélite correto</p>
                  </div>
                  <button 
                    onClick={() => setIsCitySelectModalOpen(false)} 
                    className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-750 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* City List */}
                <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                  {cities.length > 0 ? (
                    Array.from(new Map(cities.filter(c => c && c.name).map(city => [city.name.trim().toLowerCase(), city])).values()).map((city: any) => (
                      <button
                        key={city.id}
                        onClick={() => {
                          setIsCitySelectModalOpen(false);
                          setLocationModalCity(city);
                          setIsTypingOnSatellite(false);
                          setSatelliteSearchQuery('');
                          setSatelliteSearchResults([]);
                          setHasSelectedFromSatelliteSearch(false);
                          const selectedLat = city.lat || -8.7618;
                          const selectedLng = city.lng || -63.9039;
                          setSatelliteMapCenter({ lat: selectedLat, lng: selectedLng });
                          setSatelliteMarkerPosition({ lat: selectedLat, lng: selectedLng });
                          fetchSatelliteAddress(selectedLat, selectedLng);
                          setIsSatelliteMapOpen(true);
                        }}
                        className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-2 border-transparent hover:border-blue-500 transition-all text-left group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white dark:bg-slate-700 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-blue-500 group-hover:scale-110 transition-all shadow-sm">
                            <MapIcon size={18} className="group-hover:text-blue-500 transition-colors" />
                          </div>
                          <div>
                            <p className="text-xs font-black uppercase tracking-tight text-slate-800 dark:text-white">{city.name}</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Toque para selecionar</p>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                      </button>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 text-center py-4">Nenhuma cidade disponível</p>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Satellite Map Selection Modal */}
        <AnimatePresence>
          {isSatelliteMapOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[120] flex items-center justify-center md:p-4 bg-slate-900/80 backdrop-blur-md"
              onClick={() => setIsSatelliteMapOpen(false)}
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-white dark:bg-slate-900 w-full h-full md:max-w-5xl md:h-[90vh] md:rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col"
                onClick={e => e.stopPropagation()}
              >
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="text-xl font-black uppercase tracking-tighter italic text-blue-gradient">Qual sua localização?</h3>
                      <p className="text-slate-400 text-[9px] font-bold uppercase tracking-wider">Arraste o mapa para posicionar o alfinete 📍 no local de entrega</p>
                    </div>
                    <button 
                      onClick={() => setIsSatelliteMapOpen(false)} 
                      className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-750 transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {/* Map Area */}
                <div className="flex-1 relative overflow-hidden bg-slate-950">
                  <MapContainer
                    center={[satelliteMapCenter.lat, satelliteMapCenter.lng]}
                    zoom={17}
                    style={{ width: '100%', height: '100%', zIndex: 0 }}
                    zoomControl={false}
                    attributionControl={false}
                  >
                    <TileLayer
                      attribution='&copy; Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    />
                    {/* Camada híbrida transparente com vias de trânsito e estradas */}
                    <TileLayer
                      attribution='&copy; Esri, HERE, Garmin, mapmyIndia, © OpenStreetMap contributors'
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}"
                      opacity={0.9}
                    />
                    {/* Camada híbrida transparente contendo nomes de bairros, comércios, empresas e pontos de interesse */}
                    <TileLayer
                      attribution='&copy; Esri, HERE, Garmin, © OpenStreetMap contributors'
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                      opacity={1.0}
                    />
                    <SatelliteMapEvents 
                      onCenterChange={(center) => {
                        setSatelliteMarkerPosition(center);
                        fetchSatelliteAddress(center.lat, center.lng);
                      }}
                    />
                    <MapController center={satelliteMapCenter} />
                  </MapContainer>

                  {/* Absolute Search Input floating over the map */}
                  {isTypingOnSatellite && (
                    <motion.div 
                      initial={{ opacity: 0, y: -15 }} 
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute top-4 left-4 right-4 z-[100] max-w-lg mx-auto pointer-events-auto"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="relative">
                        <input
                          type="text"
                          value={satelliteSearchQuery}
                          onChange={(e) => {
                            setSatelliteSearchQuery(e.target.value);
                            handleSatelliteAddressSearch(e.target.value);
                          }}
                          placeholder="Digite o endereço..."
                          className="w-full px-5 py-4 bg-white dark:bg-slate-900 rounded-2xl border-2 border-blue-500 focus:outline-none text-xs font-black shadow-2xl dark:text-white placeholder-slate-400 text-slate-800 focus:border-blue-600 transition-all text-center uppercase tracking-widest animate-pulse focus:animate-none"
                          style={{ animationDuration: '2s' }}
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-slate-400">
                          {isSearchingSatelliteQuery ? (
                            <Loader2 size={16} className="animate-spin text-blue-500" />
                          ) : (
                            <Search size={16} />
                          )}
                        </div>
                      </div>

                      {/* Autocomplete suggestions lists */}
                      {satelliteSearchResults.length > 0 && (
                        <div className="mt-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl max-h-[180px] overflow-y-auto shadow-2xl divide-y divide-slate-100 dark:divide-slate-800 z-[110] relative" onClick={(e) => e.stopPropagation()}>
                          {satelliteSearchResults.map((res: any, idx: number) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const lat = parseFloat(res.lat);
                                const lng = parseFloat(res.lon);
                                if (!isNaN(lat) && !isNaN(lng)) {
                                  setSatelliteMapCenter({ lat, lng });
                                  setSatelliteMarkerPosition({ lat, lng });
                                  setSatelliteAddress(res.display_name || res.name);
                                  setHasSelectedFromSatelliteSearch(true);
                                  setSatelliteSearchResults([]);
                                }
                              }}
                              className="w-full text-left p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors flex items-center gap-2.5"
                            >
                              <MapPin size={14} className="text-blue-500 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-[11px] font-black italic text-slate-800 dark:text-white leading-tight truncate">
                                  {res.name}
                                </p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider truncate">
                                  {[res.address?.neighbourhood, res.address?.city].filter(Boolean).join(' - ')}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Physical Center Fixed Pin Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[10] select-none">
                     <div className="flex flex-col items-center -translate-y-5">
                        <motion.div 
                          animate={{ y: isSearchingSatelliteAddress ? [-3, 3, -3] : 0 }}
                          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                          className="text-4xl filter drop-shadow-[0_8px_10px_rgba(0,0,0,0.6)]"
                        >
                          📍
                        </motion.div>
                        <div className="w-2.5 h-1 bg-black/60 rounded-full blur-[1px] mt-1 shrink-0" />
                     </div>
                  </div>

                  {/* Top-Right GPS Quick Action Button */}
                  <div className="absolute top-4 right-4 z-[10]">
                     <button
                       type="button"
                       onClick={() => {
                         if ("geolocation" in navigator) {
                           navigator.geolocation.getCurrentPosition(
                             (pos) => {
                               const posCo = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                               setSatelliteMapCenter(posCo);
                               setSatelliteMarkerPosition(posCo);
                               fetchSatelliteAddress(pos.coords.latitude, pos.coords.longitude);
                             },
                             (err) => console.error("GPS error:", err),
                             { enableHighAccuracy: true, timeout: 10000 }
                           );
                         }
                       }}
                       className="p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center animate-bounce shadow-blue-500/10"
                     >
                       <Navigation size={18} />
                     </button>
                  </div>
                </div>

                {/* Footer details & Action */}
                <div className="p-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shrink-0 space-y-4">
                  {/* Alert Phrase */}
                  {hasSelectedFromSatelliteSearch && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-amber-500/10 border-2 border-amber-500/30 text-amber-700 dark:text-amber-400 p-3.5 rounded-2.5xl text-[10px] font-black uppercase tracking-wider text-center flex items-center justify-center gap-2 animate-pulse leading-snug"
                    >
                      <span>🏠</span>
                      <span>Essa é sua casa? Confirme com atenção para a entrega não demorar</span>
                    </motion.div>
                  )}



                  <div className="flex items-start space-x-3.5 bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-100 dark:border-slate-750 shadow-sm min-h-[72px]">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
                      {isSearchingSatelliteAddress ? (
                        <Loader2 size={20} className="animate-spin" />
                      ) : (
                        <MapPin size={20} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Endereço Selecionado</p>
                      <p className="text-xs font-black text-slate-800 dark:text-white leading-tight italic line-clamp-2">
                        {isSearchingSatelliteAddress ? 'Identificando localização...' : `"${satelliteAddress}"`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (isTypingOnSatellite) {
                          setIsTypingOnSatellite(false);
                          setSatelliteSearchQuery('');
                          setSatelliteSearchResults([]);
                        } else {
                          setIsTypingOnSatellite(true);
                        }
                      }}
                      className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black uppercase tracking-widest text-[9px] hover:bg-slate-200 transition-all text-center flex items-center justify-center gap-1.5"
                    >
                      <Search size={14} />
                      {isTypingOnSatellite ? 'Arrastar Mapa' : 'Digitar Endereço'}
                    </button>
                    
                    <button
                      type="button"
                      onClick={confirmSatelliteLocation}
                      disabled={isSearchingSatelliteAddress}
                      className="flex-[2] py-4 bg-blue-600 disabled:bg-blue-400 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-blue-500/20 hover:scale-[1.01] hover:bg-blue-700 transition-all flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 size={14} />
                      Confirmar Endereço
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Address Selection Modal */}
        <AnimatePresence>
          {isAddressModalOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md"
              onClick={() => setIsAddressModalOpen(false)}
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-lg max-h-[85vh] shadow-2xl relative overflow-hidden flex flex-col"
                onClick={e => e.stopPropagation()}
              >
                <div className="relative h-40 md:h-48 bg-blue-600 flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 opacity-40 pointer-events-none">
                     <img src="https://images.unsplash.com/photo-1518186285589-2f7649de83e0?auto=format&fit=crop&q=80&w=1000" className="w-full h-full object-cover scale-110" alt="Brazil Map" />
                     <div className="absolute inset-0 bg-gradient-to-t from-blue-600/80 to-transparent" />
                  </div>
                  <div className="relative z-10 text-center px-4">
                    <motion.div 
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="w-20 h-20 bg-white/20 backdrop-blur-xl rounded-[2rem] shadow-2xl flex items-center justify-center text-white mx-auto mb-3 border border-white/30"
                    >
                       <MapPin size={40} className="drop-shadow-lg" />
                    </motion.div>
                    <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white drop-shadow-md">Qual sua localização?</h3>
                    <p className="text-white/70 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Sua fome não pode esperar</p>
                  </div>
                  <button onClick={() => setIsAddressModalOpen(false)} className="absolute top-4 right-4 p-2 bg-white/50 dark:bg-black/50 backdrop-blur-md rounded-full hover:bg-white transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <div className="p-4 md:p-6 flex-1 flex flex-col overflow-hidden">
                  {!locationModalCity ? (
                    <div className="flex-1 flex flex-col overflow-hidden">
                      <div className="mb-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Primeiro, selecione sua cidade:</p>
                        <h4 className="text-xl font-black text-slate-800 dark:text-white leading-tight">Em qual cidade você está?</h4>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1 pb-4">
                        {cities.length > 0 ? (
                          // Remove duplicates by Name (ensure case-insensitive or exact)
                          Array.from(new Map(cities.map(city => [city.name.trim().toLowerCase(), city])).values()).map((city: any) => (
                            <button
                              key={city.id}
                              onClick={() => setLocationModalCity(city)}
                              className="w-full flex items-center justify-between p-5 rounded-3xl bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-2 border-transparent hover:border-blue-500 transition-all text-left group"
                            >
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white dark:bg-slate-700 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-blue-500 group-hover:scale-110 transition-all shadow-sm">
                                  <Store size={24} />
                                </div>
                                <div>
                                  <p className="text-sm font-black uppercase tracking-tight text-slate-800 dark:text-white">{city.name}</p>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Selecionar esta cidade</p>
                                </div>
                              </div>
                              <ChevronRight size={20} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                            </button>
                          ))
                        ) : (
                          <div className="py-20 text-center">
                            <Loader2 className="animate-spin text-blue-500 mx-auto mb-4" size={32} />
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Carregando cidades disponíveis...</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col overflow-hidden">
                      {isConfirmingLocation ? (
                        <div className="flex-1 flex flex-col overflow-hidden">
                           <div className="mb-4 flex items-center justify-between">
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Verifique os detalhes</p>
                                <h4 className="text-lg font-black text-slate-800 dark:text-white leading-tight">
                                   {(selectedAddressResult?.address?.road || selectedAddressResult?.name || 'Localização selecionada')}
                                </h4>
                                <p className="text-[11px] font-medium text-blue-500 mt-1 flex items-center gap-1.5">
                                   <MapPin size={12} />
                                   {selectedAddressResult?.address?.neighbourhood || 'Bairro não identificado'}
                                </p>
                              </div>
                              <button 
                                onClick={() => setIsConfirmingLocation(false)}
                                className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-500"
                              >
                                <ArrowLeft size={18} />
                              </button>
                           </div>
                           
                           <div className="flex-1 rounded-[2rem] overflow-hidden border-2 border-slate-100 dark:border-slate-800 relative shadow-inner">
                              <MapContainer
                                center={[mapCenter?.lat || -8.7619, mapCenter?.lng || -63.9039]}
                                zoom={zoom}
                                style={{ width: '100%', height: '100%', zIndex: 0 }}
                                zoomControl={false}
                                attributionControl={false}
                              >
                                <TileLayer
                                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                                />
                                <TileLayer
                                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                  url="https://{s}.tile.openstreetmap.org/{z}/{y}/{x}.png"
                                  opacity={0.3}
                                />
                                {markerPosition && (
                                  <>
                                    <Marker position={[markerPosition.lat, markerPosition.lng]} />
                                    <MapController center={markerPosition} />
                                  </>
                                )}
                                <MapEvents 
                                  onCenterChange={(center) => {
                                    setMarkerPosition(center);
                                    setSelectedAddressResult(null);
                                  }}
                                  onZoomChange={(zoomValue) => setZoom(zoomValue)} 
                                />
                              </MapContainer>
                           </div>

                           <div className="mt-6">
                              <button 
                                onClick={confirmLocation}
                                disabled={isSearchingAddress}
                                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-500/30 flex items-center justify-center gap-2 hover:bg-blue-700 transition-all disabled:opacity-50"
                              >
                                {isSearchingAddress ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                                Confirmar Localização
                              </button>
                           </div>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col overflow-hidden">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                               <div className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                                  <p className="text-[9px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                                    <Store size={10} />
                                    {locationModalCity.name}
                                  </p>
                               </div>
                            </div>
                            <button 
                              onClick={() => {
                                setLocationModalCity(null);
                                setAddressSearchQuery('');
                                setAddressSearchResults([]);
                              }}
                              className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-500 flex items-center gap-1 transition-colors"
                            >
                              Trocar Cidade
                              <RefreshCw size={10} />
                            </button>
                          </div>

                          <div className="relative mb-6">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                              type="text"
                              placeholder={`Digite seu endereço em ${locationModalCity.name}...`}
                              value={addressSearchQuery}
                              onChange={(e) => {
                                const val = e.target.value;
                                setAddressSearchQuery(val);
                                
                                if (addressSearchTimeout.current) clearTimeout(addressSearchTimeout.current);
                                
                                addressSearchTimeout.current = setTimeout(() => {
                                  handleAddressSearch(val);
                                }, 600);
                              }}
                              className="w-full pl-12 pr-4 py-4 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl text-xs font-black uppercase tracking-widest placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                            />
                            {isSearchingAddress && (
                              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                <Loader2 className="animate-spin text-blue-500" size={18} />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-1">
                            {/* Search Results */}
                            {addressSearchResults.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Sugestões de Endereço</p>
                                {addressSearchResults.map((result: any, idx) => (
                                  <button
                                    key={`search-res-${idx}`}
                                    onClick={() => selectAddressFromSearch(result)}
                                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:border-blue-500 transition-all text-left group"
                                  >
                                    <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-500 shrink-0 group-hover:bg-blue-500 group-hover:text-white transition-all">
                                      <MapIcon size={18} />
                                    </div>
                                    <div className="min-w-0 flex-1 overflow-hidden text-left py-1">
                                      <div className="flex flex-col gap-1.5">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <p className="text-xs font-black uppercase tracking-tight text-slate-800 dark:text-white">
                                            Rua: <span className="text-blue-600 dark:text-blue-400">
                                              {(result.address?.road || result.address?.pedestrian || result.name || 'Identificando...')}
                                            </span>
                                          </p>
                                          {result.address?.house_number ? (
                                            <div className="bg-emerald-500 text-white px-2 py-0.5 rounded-lg text-[9px] font-black uppercase shadow-sm">
                                              Nº {result.address.house_number}
                                            </div>
                                          ) : (
                                            <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-lg text-[8px] font-bold uppercase border border-amber-200 dark:border-amber-800">
                                              S/ Nº
                                            </div>
                                          )}
                                        </div>
                                        
                                        <div className="flex items-center gap-2">
                                          {(result.address?.neighbourhood || result.address?.suburb || result.address?.district) ? (
                                            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                                              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Bairro:</span>
                                              <p className="text-[10px] font-black uppercase tracking-tighter text-slate-700 dark:text-slate-200 truncate max-w-[120px]">
                                                {result.address?.neighbourhood || result.address?.suburb || result.address?.district}
                                              </p>
                                            </div>
                                          ) : (
                                            <p className="text-[9px] font-bold text-slate-400 italic">Bairro não identificado</p>
                                          )}
                                        </div>

                                        <div className="bg-red-500 p-3 rounded-xl border-2 border-red-600 mt-2 shadow-md">
                                           <div className="flex items-start gap-2 text-white leading-tight">
                                              <MapPin size={16} className="shrink-0 mt-0.5" />
                                              <div className="flex flex-col min-w-0 flex-1">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-red-100 mb-1">Referência do Endereço:</span>
                                                <p className="text-[12px] font-black break-words leading-tight italic drop-shadow-sm">
                                                  {result.display_name}
                                                </p>
                                              </div>
                                           </div>
                                        </div>
                                      </div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* GPS Button */}
                            {!addressSearchQuery && (
                              <button 
                                 onClick={() => {
                                   getPosition(true);
                                   // We could also show map for GPS, but user asked for search flow
                                   setIsAddressModalOpen(false);
                                 }}
                                 className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-blue-600 text-white font-black uppercase tracking-widest text-[10px] hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                              >
                                <Zap size={16} />
                                Usar minha localização atual (GPS)
                              </button>
                            )}

                            {/* Saved Addresses */}
                            {!addressSearchQuery && (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between ml-1">
                                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Endereços em {locationModalCity.name}</p>
                                  <span className="text-[8px] font-bold text-slate-300">{savedAddresses.length} salvos</span>
                                </div>
                                
                                {savedAddresses.length === 0 ? (
                                  <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                                     <MapPin size={24} className="mx-auto text-slate-300 mb-2" />
                                     <p className="text-[10px] font-black uppercase tracking-tight text-slate-400">Nenhum endereço salvo ainda</p>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    {savedAddresses.filter(addr => addr.fullAddress.toLowerCase().includes(locationModalCity.name.toLowerCase())).map((addr) => (
                                      <div 
                                        key={addr.id}
                                        className="group relative flex items-center animate-fade-in"
                                      >
                                        <button
                                          onClick={() => {
                                            setUserLocation({ latitude: addr.latitude, longitude: addr.longitude });
                                            setLocationInfo(addr.shortAddress || addr.name);
                                            setIsAddressModalOpen(false);
                                          }}
                                          className={`flex-1 flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                                            userLocation?.latitude === addr.latitude && userLocation?.longitude === addr.longitude
                                            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10'
                                            : 'bg-white dark:bg-slate-800 border-slate-50 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600'
                                          }`}
                                        >
                                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                                            userLocation?.latitude === addr.latitude && userLocation?.longitude === addr.longitude
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                                          }`}>
                                            <Store size={18} />
                                          </div>
                                          <div className="min-w-0 pr-10 overflow-hidden flex-1">
                                            <p className="text-[10px] font-black uppercase tracking-tight truncate dark:text-white">
                                              {addr.neighborhood || addr.shortAddress || addr.name}
                                            </p>
                                            <p className="text-[9px] font-medium text-slate-400 truncate italic">
                                              {addr.shortAddress || 'Endereço salvo'}
                                            </p>
                                          </div>
                                        </button>
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            deleteSavedAddress(addr.id);
                                          }}
                                          className="absolute right-3 p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                   <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                      <ShieldCheck size={10} className="text-emerald-500" />
                      Seus dados estão seguros
                   </p>
                   <button 
                    onClick={() => setAddressSearchQuery('')}
                    className="text-[10px] font-black uppercase tracking-widest text-blue-500 hover:underline"
                   >
                     Limpar Busca
                   </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      {/* Order Cancel Confirmation Modal */}
        <AnimatePresence>
          {orderToCancel && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm"
              onClick={() => setOrderToCancel(null)}
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white rounded-[3rem] p-8 max-w-sm w-full shadow-2xl space-y-6 text-center"
                onClick={e => e.stopPropagation()}
              >
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-500 mx-auto">
                  <X size={40} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black uppercase tracking-tighter italic">Cancelar Pedido?</h3>
                  <p className="text-sm text-slate-500 font-medium">Tem certeza que deseja cancelar os pedidos de {orderToCancel.name}? Esta ação não pode ser desfeita.</p>
                </div>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={async () => {
                      for (const o of orderToCancel.orders) {
                        await updateDoc(doc(db, 'orders', o.id), { 
                          status: 'cancelled',
                          cancellationReason: 'Cancelado pelo cliente'
                        });
                      }
                      setOrderToCancel(null);
                    }}
                    className="w-full bg-red-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-red-500/20 transition-all hover:bg-red-600"
                  >
                    Sim, Cancelar
                  </button>
                  <button 
                    onClick={() => setOrderToCancel(null)}
                    className="w-full bg-slate-100 text-slate-600 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all hover:bg-slate-200"
                  >
                    Voltar
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Order Edit Modal */}
        <AnimatePresence>
          {editingOrderId && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm"
              onClick={() => setEditingOrderId(null)}
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white rounded-[3rem] p-8 max-w-md w-full shadow-2xl space-y-6"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black uppercase tracking-tighter italic">Editar Pedido</h3>
                  <button onClick={() => setEditingOrderId(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 no-scrollbar">
                  {activeOrders.find(o => o.id === editingOrderId)?.items.map((item: any, idx: number) => (
                    <div key={`${editingOrderId}-edit-item-${idx}`} className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200">
                          <img src={getProductImage(item.id, item.imageUrl)} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-tight text-slate-800">{item.name}</p>
                          <p className="text-xs font-black text-emerald-600">{formatPrice(item.price)}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center bg-white rounded-xl border border-slate-200 p-1">
                          <button 
                            onClick={() => handleUpdateOrderItem(editingOrderId, idx, -1)}
                            className="p-1 hover:bg-slate-50 rounded-lg text-slate-400"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-8 text-center text-xs font-black">{item.quantity}</span>
                          <button 
                            onClick={() => handleUpdateOrderItem(editingOrderId, idx, 1)}
                            className="p-1 hover:bg-slate-50 rounded-lg text-slate-400"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        <button 
                          onClick={() => handleRemoveOrderItem(editingOrderId, idx)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-400">Novo Total</span>
                    <span className="text-xl font-black text-emerald-600">
                      {formatPrice(activeOrders.find(o => o.id === editingOrderId)?.total || 0)}
                    </span>
                  </div>
                  <button 
                    onClick={() => {
                      const order = activeOrders.find(o => o.id === editingOrderId);
                      if (order) {
                        const restaurant = restaurants.find(r => r.id === order.restaurantId);
                        if (restaurant) {
                          setSelectedRestaurant(restaurant);
                          setView('restaurant');
                          setEditingOrderId(null);
                        }
                      }
                    }}
                    className="w-full bg-emerald-50 text-emerald-600 py-4 rounded-2xl font-black uppercase tracking-widest text-xs mb-3 hover:bg-emerald-600 hover:text-white transition-all"
                  >
                    Adicionar mais itens
                  </button>
                  <button 
                    onClick={() => setEditingOrderId(null)}
                    className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl transition-all hover:scale-[1.02]"
                  >
                    Concluir Edição
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Real-time Tracking Modal */}
        <AnimatePresence>
          {trackingRide && activeCity && (
            <MapTrackingModal 
              id_mch={trackingRide.machineRequestId || ''}
              orderId={trackingRide.destinations?.[0]?.orderId || ''}
              cityConfig={{
                apiUrl: activeCity.apiUrl,
                apiKey: activeCity.apiKey,
                authEmail: activeCity.authEmail,
                authPassword: activeCity.authPassword
              }}
              onClose={() => setTrackingRide(null)}
              destLocation={
                trackingRide.destinations?.[0] 
                  ? { lat: (trackingRide.destinations[0] as any).latitude, lng: (trackingRide.destinations[0] as any).longitude } 
                  : undefined
              }
              originLocation={
                (trackingRide as any).restaurant_lat 
                  ? { lat: (trackingRide as any).restaurant_lat, lng: (trackingRide as any).restaurant_lng }
                  : undefined
              }
            />
          )}
        </AnimatePresence>

        {/* Review Delete Confirmation Modal */}
        <AnimatePresence>
          {reviewToDelete && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm"
              onClick={() => setReviewToDelete(null)}
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white rounded-[3rem] p-8 max-w-sm w-full shadow-2xl space-y-6 text-center"
                onClick={e => e.stopPropagation()}
              >
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-500 mx-auto">
                  <Trash2 size={40} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black uppercase tracking-tighter italic">Excluir Avaliação?</h3>
                  <p className="text-sm text-slate-500 font-medium">Tem certeza que deseja remover seu comentário? Esta ação não pode ser desfeita.</p>
                </div>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => handleDeleteReview(reviewToDelete)}
                    className="w-full bg-red-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-red-500/20 transition-all hover:bg-red-600"
                  >
                    Sim, Excluir
                  </button>
                  <button 
                    onClick={() => setReviewToDelete(null)}
                    className="w-full bg-slate-100 text-slate-600 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all hover:bg-slate-200"
                  >
                    Cancelar
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Admin Action Confirmation/Prompt Modal */}
        <AnimatePresence>
          {isAdminSecretPromptOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white dark:bg-slate-900 w-full max-w-sm p-8 rounded-[2.5rem] shadow-2xl border border-white/10 relative overflow-hidden"
              >
                {/* Background Accent */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl opacity-50" />
                
                <div className="relative text-center space-y-6">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-500/10 rounded-3xl flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400">
                    <ShieldCheck size={32} />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black uppercase tracking-tighter italic text-slate-900 dark:text-white">Acesso Mestre</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Insira a credencial de segurança para prosseguir ao painel administrativo.</p>
                  </div>

                  <form onSubmit={handleAdminSecretAuth} className="space-y-4">
                    <div className="relative">
                      <input 
                        type="password"
                        placeholder="SENHA..."
                        value={adminSecretPassword}
                        onChange={(e) => setAdminSecretPassword(e.target.value)}
                        className={`w-full bg-slate-100 dark:bg-slate-800 border-2 ${adminAuthError ? 'border-red-500 animate-shake' : 'border-transparent focus:border-blue-500'} py-4 px-6 rounded-2xl text-center font-black uppercase tracking-widest text-sm outline-none transition-all dark:text-white`}
                        autoFocus
                      />
                    </div>
                    
                    <div className="flex flex-col gap-3">
                      <button 
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98]"
                      >
                        Desbloquear Painel
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          setIsAdminSecretPromptOpen(false);
                          setAdminSecretPassword('');
                        }}
                        className="w-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 py-2 font-black uppercase tracking-widest text-[10px] transition-all"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {adminConfirmModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md"
              onClick={() => setAdminConfirmModal(null)}
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 max-w-sm w-full shadow-2xl space-y-6 text-center border border-white/10"
                onClick={e => e.stopPropagation()}
              >
                <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 mx-auto">
                  {adminConfirmModal.type === 'confirm' ? <AlertTriangle size={40} /> : <Settings2 size={40} />}
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black uppercase tracking-tighter italic text-slate-900 dark:text-white">
                    {adminConfirmModal.title}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                    {adminConfirmModal.message}
                  </p>
                </div>

                {adminConfirmModal.type === 'prompt' && (
                  <input 
                    autoFocus
                    type="text"
                    defaultValue={adminConfirmModal.defaultValue}
                    className="w-full bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-center font-black text-xl focus:border-blue-500 outline-none transition-all"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        adminConfirmModal.onConfirm((e.target as HTMLInputElement).value);
                      }
                    }}
                    id="admin-prompt-input"
                  />
                )}

                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => {
                      if (adminConfirmModal.type === 'prompt') {
                        const input = document.getElementById('admin-prompt-input') as HTMLInputElement;
                        adminConfirmModal.onConfirm(input?.value);
                      } else {
                        adminConfirmModal.onConfirm();
                      }
                    }}
                    className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-500/20 transition-all hover:bg-blue-700"
                  >
                    {adminConfirmModal.type === 'confirm' ? 'Confirmar' : 'Salvar Alteração'}
                  </button>
                  <button 
                    onClick={() => setAdminConfirmModal(null)}
                    className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    Cancelar
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  </DndContext>
);
};

export default CustomerView;
