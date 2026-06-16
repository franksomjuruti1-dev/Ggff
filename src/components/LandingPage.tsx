import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Utensils, ShieldCheck, Store, ChevronRight, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../AuthContext';
import AuthModal from './AuthModal';
import SuperRealisticTransition from './SuperRealisticTransition';

interface LandingPageProps {
  onTriggerSplash?: () => void;
  splashTriggered?: boolean;
}

const LandingPage: React.FC<LandingPageProps> = ({ onTriggerSplash, splashTriggered }) => {
  const { profile, loading, user, globalSettings, isSigningIn, prefetchManagerData, prefetchAdminData } = useAuth();
  const navigate = useNavigate();
  const [locationInfo, setLocationInfo] = useState<string>('Porto Velho');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [targetRole, setTargetRole] = useState<'manager' | 'customer'>('customer');
  const [hasCachedProfile] = useState(() => !!localStorage.getItem('user_profile_cache'));

  useEffect(() => {
    // Auto-redirect removed as per user request to stay on landing page on reload
    /*
    if (!loading && user && profile) {
      if (profile.role === 'admin') {
        navigate('/admin', { replace: true });
      } else if (profile.role === 'manager') {
        navigate('/manager', { replace: true });
      } else if (profile.role === 'courier') {
        navigate('/courier', { replace: true });
      } else {
        navigate('/customer', { replace: true });
      }
    }
    */
  }, [loading, user, profile, navigate]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const restaurantId = params.get('restaurantId');
    if (restaurantId) {
      navigate(`/customer?restaurantId=${restaurantId}`, { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (splashTriggered) {
      navigate('/customer');
    }
  }, [splashTriggered, navigate]);

  useEffect(() => {
    if (user && profile && targetRole === 'manager' && profile.role !== 'manager' && profile.role !== 'admin') {
      // If user just logged in and we wanted manager role
      navigate('/manager');
    }
  }, [user, profile, targetRole, navigate]);

  useEffect(() => {
    const fetchAddress = async (lat: number, lon: number) => {
      try {
        const response = await fetch(`/api/geocode?lat=${lat}&lon=${lon}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        
        if (data && data.address) {
          const city = data.address.city || data.address.town || data.address.village || 'Cidade Desconhecida';
          const road = data.address.road || '';
          const suburb = data.address.suburb || data.address.neighbourhood || '';
          
          const shortRoad = road.replace('Rua', 'R.').replace('Avenida', 'Av.');
          const info = `${city}${shortRoad ? ` - ${shortRoad}` : ''}${suburb ? `, ${suburb}` : ''}`;
          setLocationInfo(info);
        } else {
          setLocationInfo('Endereço não encontrado');
        }
      } catch (error) {
        console.error("Erro ao buscar endereço:", error);
        setLocationInfo('Erro ao obter endereço');
      }
    };

    const getPosition = async () => {
      if ("geolocation" in navigator) {
        // Check permission status first to avoid blocking popups automatically
        if ((navigator as any).permissions) {
          try {
            const status = await (navigator as any).permissions.query({ name: 'geolocation' });
            if (status.state === 'prompt' || status.state === 'denied') {
               console.log("[LandingPage] Geolocation not pre-granted, skipping auto-request");
               return;
            }
          } catch (e) {
            console.warn("[LandingPage] Error querying permission status:", e);
          }
        }

        console.log("[LandingPage] Requesting geolocation...");
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            console.log(`[LandingPage] Geolocation success: ${latitude}, ${longitude}`);
            fetchAddress(latitude, longitude);
          },
          (error) => {
            console.error("[LandingPage] Erro de geolocalização:", error);
            if (error.code === error.TIMEOUT) {
              console.log("[LandingPage] Geolocation timeout, retrying with low accuracy...");
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  const { latitude, longitude } = pos.coords;
                  fetchAddress(latitude, longitude);
                },
                (err2) => {
                  console.error("[LandingPage] Geolocation retry failed:", err2);
                  // Fail silently, use Porto Velho as default
                },
                { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
              );
            } else {
              console.warn("[LandingPage] Manual location will be used as fallback");
            }
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      }
    };

    getPosition();
  }, []);

  const handleCustomerClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onTriggerSplash) {
      onTriggerSplash();
    } else {
      setIsTransitioning(true);
    }
  };

  const handleTransitionComplete = () => {
    navigate('/customer');
  };

  if (loading && !hasCachedProfile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const handleManagerClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) {
      setTargetRole('manager');
      setAuthMode('login');
      setIsAuthModalOpen(true);
    } else {
      navigate('/manager');
    }
  };

  return (
    <div className="min-h-screen bg-bg-app text-slate-900 dark:text-white flex flex-col items-center justify-center p-4 md:p-6 font-sans overflow-hidden transition-colors duration-300 relative">
      {/* Background Media */}
      {globalSettings?.splashMediaUrl && (
        <div className="absolute inset-0 z-[-1]">
          {globalSettings.splashMediaType === 'video' ? (
            <video 
              src={globalSettings.splashMediaUrl} 
              autoPlay 
              loop 
              muted 
              playsInline 
              className="w-full h-full object-cover opacity-30 dark:opacity-20" 
            />
          ) : (
            <img 
              src={globalSettings.splashMediaUrl} 
              className="w-full h-full object-cover opacity-30 dark:opacity-20" 
              referrerPolicy="no-referrer"
              alt="Background"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-bg-app/90 via-bg-app/60 to-bg-app/90 dark:from-slate-950/90 dark:via-transparent dark:to-slate-950/90" />
        </div>
      )}

      <AnimatePresence>
        {isTransitioning && (
          <SuperRealisticTransition 
            onComplete={handleTransitionComplete} 
            userName={profile?.displayName || 'Cliente'}
          />
        )}
      </AnimatePresence>

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        initialMode={authMode}
        targetRole={targetRole}
      />

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-4xl w-full text-center space-y-8 md:space-y-12 relative z-10"
      >
        <div className="space-y-2 md:space-y-4">
          <div className="flex flex-col items-center space-y-1 mb-2">
            <div className="flex items-center space-x-1 text-slate-400">
              <MapPin size={12} className="text-blue-500" />
              <span className="text-[10px] font-bold uppercase tracking-widest">{locationInfo}</span>
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-7xl font-black text-blue-gradient uppercase italic leading-tight py-2">
            {globalSettings?.appName || "ifood TUPÃ"}
          </h1>
          <p className="text-lg md:text-2xl font-medium text-slate-500 dark:text-slate-300 italic serif">
            A revolução na entrega de comida
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <div onClick={handleCustomerClick} className="group cursor-pointer">
            <div className="bg-blue-gradient text-white p-6 md:p-8 h-full rounded-3xl shadow-xl shadow-blue-500/20 hover:scale-[1.02] transition-all duration-300 flex flex-col items-center justify-between space-y-4 md:space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
              <Utensils size={40} className="md:w-12 md:h-12" />
              <div className="space-y-1 md:space-y-2">
                <h2 className="text-xl md:text-2xl font-bold uppercase tracking-tight">{globalSettings?.appName || "ifood TUPÃ"}</h2>
              </div>
              <ChevronRight className="group-hover:translate-x-2 transition-transform" />
            </div>
          </div>

          {/* Gestores - Restaurant Managers */}
          <div 
            onClick={handleManagerClick} 
            onMouseEnter={() => prefetchManagerData()}
            className="group"
          >
            <div className="bg-white text-slate-900 p-6 md:p-8 h-full rounded-3xl border-2 border-slate-100 shadow-lg hover:border-blue-500/30 hover:scale-[1.02] transition-all duration-300 flex flex-col items-center justify-between space-y-4 md:space-y-6 cursor-pointer">
              <Store size={40} className="md:w-12 md:h-12 text-blue-600" />
              <div className="space-y-1 md:space-y-2">
                <h2 className="text-xl md:text-2xl font-bold uppercase tracking-tight">Empresa</h2>
                <p className="text-xs md:text-sm text-slate-500">Gerencie seu restaurante e cardápio</p>
              </div>
              <ChevronRight className="group-hover:translate-x-2 transition-transform text-blue-600" />
            </div>
          </div>

        </div>

        {!user && (
          <div className="flex flex-col items-center space-y-4 pt-4">
            {/* Google login removed per user request */}
          </div>
        )}

        <div className="pt-8 md:pt-12">
          <p className="text-[10px] md:text-xs font-mono uppercase tracking-widest opacity-30">
            © 2026 {globalSettings?.appName?.toUpperCase() || "IFOOD TUPÃ"} PLATFORM SYSTEM V2.0
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default LandingPage;
