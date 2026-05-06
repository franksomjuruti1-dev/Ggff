import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Camera, Mic, MapPin, Settings, X, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from '../firebase';
import { doc, updateDoc, getDocs, collection } from 'firebase/firestore';
import { 
  PermissionType, 
  checkPermissionStatus, 
  getGeolocation, 
  getPermissionErrorMessage,
  LocationData
} from '../utils/permissions';

interface PermissionStatus {
  type: PermissionType;
  status: PermissionState | 'not-requested' | 'unknown';
  label: string;
  icon: React.ReactNode;
  description: string;
}

const STORAGE_PREFIX = 'permission_requested_';

export const PermissionManager: React.FC = () => {
  const [permissions, setPermissions] = useState<PermissionStatus[]>([
    {
      type: 'geolocation',
      status: 'not-requested',
      label: 'Localização',
      icon: <MapPin className="w-5 h-5" />,
      description: 'Para encontrar restaurantes próximos e calcular o tempo de entrega.'
    },
    {
      type: 'camera',
      status: 'not-requested',
      label: 'Câmera',
      icon: <Camera className="w-5 h-5" />,
      description: 'Para escanear QR Codes de pagamento e cupons.'
    },
    {
      type: 'microphone',
      status: 'not-requested',
      label: 'Microfone',
      icon: <Mic className="w-5 h-5" />,
      description: 'Para comandos de voz e suporte em tempo real.'
    }
  ]);

  const [isVisible, setIsVisible] = useState(false);
  const [activePermission, setActivePermission] = useState<PermissionStatus | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleLocationSuccess = useCallback(async (location: LocationData) => {
    const { latitude, longitude } = location;
    
    if (auth.currentUser) {
      try {
        const citiesSnap = await getDocs(collection(db, 'cities'));
        let nearestCity = null;
        let minDistance = Infinity;

        citiesSnap.docs.forEach(doc => {
          const data = doc.data();
          if (data.lat && data.lng) {
            const dist = calculateDistance(latitude, longitude, data.lat, data.lng);
            if (dist < minDistance) {
              minDistance = dist;
              nearestCity = data.name;
            }
          }
        });

        const updates: any = {
          latitude,
          longitude,
          status: 'online'
        };

        if (nearestCity && minDistance < 50) {
          updates.city = nearestCity;
        }

        await updateDoc(doc(db, 'users', auth.currentUser.uid), updates);
      } catch (err) {
        console.error("[PermissionManager] Error updating user location:", err);
      }
    }
    
    // Hide manager if location is success
    setIsVisible(false);
    setIsInitializing(false);
  }, []);

  const refreshPermissions = useCallback(async () => {
    const updated = await Promise.all(
      permissions.map(async (p) => {
        const status = await checkPermissionStatus(p.type);
        return { ...p, status };
      })
    );
    setPermissions(updated);

    // If geolocation is already granted or denied, update the UI
    const geo = updated.find(p => p.type === 'geolocation');
    if (geo) {
      if (geo.status === 'denied') {
        setActivePermission(geo);
        setIsVisible(true);
      } else if (geo.status === 'granted') {
        // Just ensures we don't block if it was granted via system prompt
        if (activePermission?.type === 'geolocation') {
          setIsVisible(false);
        }
      }
    }
  }, [permissions, activePermission]);

  useEffect(() => {
    const handleLocationReady = (e: any) => {
      console.log("[PermissionManager] Location ready event received");
      handleLocationSuccess(e.detail);
    };

    const handleLocationError = (e: any) => {
      console.warn("[PermissionManager] Location error event received", e.detail);
      const error = e.detail;
      
      // If permission denied, we MUST show the blocked UI
      if (error.code === 1) { // PERMISSION_DENIED
        const geo = permissions.find(p => p.type === 'geolocation');
        if (geo) {
          setActivePermission({ ...geo, status: 'denied' });
          setIsVisible(true);
        }
      } else if (error.code === 3) { // TIMEOUT
        // On timeout, we might want to let the user try again manually
        const geo = permissions.find(p => p.type === 'geolocation');
        if (geo) {
          setActivePermission({ ...geo, status: 'prompt' });
          setIsVisible(true);
        }
      }
      setIsInitializing(false);
    };

    window.addEventListener('location-ready', handleLocationReady);
    window.addEventListener('location-error', handleLocationError);

    // Initial check
    refreshPermissions();

    return () => {
      window.removeEventListener('location-ready', handleLocationReady);
      window.removeEventListener('location-error', handleLocationError);
    };
  }, [handleLocationSuccess, permissions, refreshPermissions]);

  const initiateRequest = async (type: PermissionType) => {
    if (type === 'geolocation') {
      try {
        const loc = await getGeolocation();
        handleLocationSuccess(loc);
      } catch (err: any) {
        console.warn("[PermissionManager] Manual geolocation request failed:", err);
        // If it's a real denial, status will update via refresh
        refreshPermissions();
      }
    } else if (type === 'camera') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(t => t.stop());
        refreshPermissions();
        setIsVisible(false);
      } catch (err) {
        console.warn("[PermissionManager] Camera request failed:", err);
        refreshPermissions();
      }
    }
  };

  if (!isVisible || !activePermission) return null;

  const isDenied = activePermission.status === 'denied';
  const errorMessage = activePermission.status === 'denied' 
    ? getPermissionErrorMessage({ type: activePermission.type, code: 1 })
    : activePermission.description;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white dark:bg-zinc-900 rounded-[40px] p-8 max-w-md w-full shadow-2xl border border-zinc-200 dark:border-zinc-800 relative overflow-hidden"
        >
          {/* Accent Glow */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-brand-blue/10 rounded-full blur-3xl" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-5 mb-8">
              <div className={`w-16 h-16 rounded-3xl flex items-center justify-center shadow-inner ${isDenied ? 'bg-red-500/10 text-red-500' : 'bg-brand-blue/10 text-brand-blue'}`}>
                {isDenied ? <AlertCircle className="w-8 h-8" /> : activePermission.icon}
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-black uppercase tracking-tighter italic text-zinc-900 dark:text-white leading-none">
                  {isDenied ? 'Acesso Bloqueado' : 'Permissão Necessária'}
                </h3>
                <p className={`text-[10px] font-black uppercase tracking-widest ${isDenied ? 'text-red-500' : 'text-brand-blue'}`}>
                  Foco na sua experiência: {activePermission.label}
                </p>
              </div>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-3xl p-6 mb-8 border border-zinc-100 dark:border-zinc-800">
              <p className="text-zinc-600 dark:text-zinc-400 text-sm font-medium leading-relaxed">
                {isDenied 
                  ? "Detectamos que as permissões foram negadas no sistema. Para uma experiência completa e segura, siga os passos abaixo para reativar."
                  : activePermission.description}
              </p>
            </div>

            {isDenied ? (
              <div className="space-y-6">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 italic">Guia Rápido:</h4>
                  <div className="grid grid-cols-1 gap-3">
                    {[
                      "Clique no ícone de ajustes na barra de endereço",
                      "Procure por Localização ou Câmera",
                      "Altere para 'Permitir' e recarregue a página"
                    ].map((step, i) => (
                      <div key={`permission-step-${i}`} className="flex items-center gap-3 group">
                        <div className="w-6 h-6 rounded-full bg-brand-blue/10 text-brand-blue flex items-center justify-center text-[10px] font-black shrink-0">
                          {i + 1}
                        </div>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-tight">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 pt-4">
                  <button
                    onClick={() => window.location.reload()}
                    className="w-full py-5 bg-brand-blue text-white rounded-2xl font-black uppercase tracking-widest italic hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-lg shadow-brand-blue/20"
                  >
                    Recarregar App
                    <RefreshCw className="w-5 h-5" />
                  </button>
                  <p className="text-center text-[9px] text-zinc-400 font-bold uppercase tracking-widest leading-none">
                    Configuração detectada automaticamente após recarregar
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <button
                  onClick={() => initiateRequest(activePermission.type)}
                  className="w-full py-5 bg-brand-blue text-white rounded-2xl font-black uppercase tracking-widest italic hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-lg shadow-brand-blue/20"
                >
                  Confirmar e Continuar
                  <CheckCircle2 className="w-5 h-5" />
                </button>
                
                {activePermission.type !== 'geolocation' && (
                  <button
                    onClick={() => setIsVisible(false)}
                    className="w-full py-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs font-black uppercase tracking-widest transition-colors italic"
                  >
                    Ignorar por enquanto
                  </button>
                )}
              </div>
            )}

            <div className="mt-8 flex items-center gap-3 opacity-50">
              <Shield className="w-4 h-4 text-brand-blue" />
              <p className="text-[9px] text-zinc-400 font-black uppercase tracking-widest">
                Segurança HTTPS • Apenas dados necessários
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export const PermissionStatusIndicator: React.FC = () => {
  const [geoStatus, setGeoStatus] = useState<PermissionState | 'unknown'>('unknown');

  useEffect(() => {
    const check = async () => {
      const status = await checkPermissionStatus('geolocation');
      setGeoStatus(status);
    };
    check();
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, []);

  if (geoStatus !== 'denied') return null;

  return (
    <motion.div
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="fixed bottom-24 right-4 z-[9998] flex items-center gap-3 bg-red-600 text-white px-4 py-2 rounded-full shadow-xl"
    >
      <AlertCircle size={18} />
      <span className="text-[10px] font-black uppercase tracking-widest italic">Localização Bloqueada</span>
    </motion.div>
  );
};
