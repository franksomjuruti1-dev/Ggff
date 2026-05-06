import React, { useState, useEffect, Suspense, lazy, ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import SplashScreen from './components/SplashScreen';
import { AnimatePresence, motion } from 'motion/react';
import { useAuth } from './AuthContext';
import { Navigation, Star, Utensils, WifiOff, AlertTriangle, Loader2, Database, ShieldAlert, RefreshCw, Bell, X } from 'lucide-react';
import { db, auth } from './firebase';
import { doc, getDocFromServer, collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { initGlobalSettings } from './utils/initDb';
import { initPermissionFlow } from './utils/permissions';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends (React.Component as any) {
  constructor(props: any) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Ocorreu um erro inesperado.";

      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error && parsed.operationType) {
            errorMessage = `Erro no Banco de Dados: ${parsed.error} (${parsed.operationType} em ${parsed.path})`;
          }
        }
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="fixed inset-0 flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 z-[99999]">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 rounded-[40px] p-10 max-w-lg w-full shadow-2xl border-4 border-amber-100 dark:border-amber-900/30 text-center"
          >
            <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/40 rounded-3xl flex items-center justify-center mx-auto mb-8 text-amber-600 dark:text-amber-400">
              <RefreshCw size={40} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-4 tracking-tight leading-tight">
              Estamos realizando uma manutenção rápida ⚙️
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed font-medium">
              Olá! Nosso aplicativo está passando por uma manutenção preventiva no momento para melhorar sua experiência e garantir mais estabilidade.
              <br /><br />
              Em instantes tudo voltará ao normal. Agradecemos pela sua paciência 💛
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-brand-blue text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-xl shadow-brand-blue/20"
            >
              <RefreshCw size={20} />
              Tentar novamente
            </button>
            
            {/* Technical error hidden for users but logged to console */}
            <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800">
              <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] font-black">
                {this.state.error?.code || 'ID do Erro: ' + Math.random().toString(36).substr(2, 9).toUpperCase()}
              </p>
            </div>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Lazy load views for better performance and code splitting
import AdminView from './components/AdminView';
import LandingPage from './components/LandingPage';
import CustomerView from './components/CustomerView';
import ManagerView from './components/ManagerView';
import CourierView from './components/CourierView';
const BranchPublicView = lazy(() => import('./components/BranchPublicView'));
const PermissionManager = lazy(() => import('./components/PermissionManager').then(m => ({ default: m.PermissionManager })));
const PermissionStatusIndicator = lazy(() => import('./components/PermissionManager').then(m => ({ default: m.PermissionStatusIndicator })));

const PageLoader = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-slate-50 dark:bg-slate-950 z-[9999]">
    <motion.div 
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-4"
    >
      <div className="relative">
        <Loader2 className="w-12 h-12 text-brand-blue animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 bg-brand-blue rounded-full animate-pulse" />
        </div>
      </div>
    </motion.div>
  </div>
);

const AnimatedRoutes = ({ triggerSplash, splashComplete }: { triggerSplash: () => void, splashComplete: boolean }) => {
  const location = useLocation();
  const isAdmin = location.pathname === '/admin';
  
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={isAdmin ? { opacity: 1 } : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={isAdmin ? { opacity: 1 } : { opacity: 0, y: -10 }}
        transition={isAdmin ? { duration: 0 } : { duration: 0.2, ease: "easeOut" }}
        className="min-h-screen"
      >
        <Suspense fallback={<PageLoader />}>
          <Routes location={location}>
            <Route path="/" element={<Navigate to="/customer" replace />} />
            <Route path="/home" element={<LandingPage onTriggerSplash={triggerSplash} splashTriggered={splashComplete} />} />
            <Route path="/customer" element={<CustomerView />} />
            <Route path="/manager" element={<ManagerView />} />
            <Route path="/admin" element={<AdminView />} />
            <Route path="/branch/:branchId" element={<BranchPublicView />} />
            <Route path="/courier" element={<CourierView />} />
            <Route path="/store/:restaurantId" element={<CustomerView />} />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
};

const ConnectivityBar = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isPoorConnection, setIsPoorConnection] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check for poor connection using Network Information API
    const checkConnection = () => {
      const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      if (conn) {
        // effectiveType can be 'slow-2g', '2g', '3g', or '4g'
        const isPoor = conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g';
        setIsPoorConnection(isPoor);
      }
    };

    checkConnection();
    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (conn) {
      conn.addEventListener('change', checkConnection);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (conn) {
        conn.removeEventListener('change', checkConnection);
      }
    };
  }, []);

  if (isOnline && !isPoorConnection) return null;

  return (
    <motion.div 
      initial={{ y: -50 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-[10001] p-2 flex items-center justify-center space-x-2 text-white text-[10px] font-black uppercase tracking-widest ${!isOnline ? 'bg-red-600' : 'bg-amber-500'}`}
    >
      {!isOnline ? (
        <>
          <WifiOff size={14} />
          <span>Sem conexão com a internet</span>
        </>
      ) : (
        <>
          <AlertTriangle size={14} />
          <span>Sinal de internet ruim</span>
        </>
      )}
    </motion.div>
  );
};

const ThemeHandler = () => {
  const { profile, globalSettings } = useAuth();
  const location = useLocation();
  
  useEffect(() => {
    const isStoreRoute = location.pathname.startsWith('/store/');
    if (isStoreRoute) {
      // Title will be handled by StoreFront component
    } else if (globalSettings?.appName) {
      document.title = globalSettings.appName;
    }
  }, [globalSettings?.appName, location.pathname]);

  useEffect(() => {
    const root = document.documentElement;
    const isCustomerRoute = location.pathname === '/customer' || location.pathname.startsWith('/store/');
    
    // Determine which theme to use
    // 1. User's custom theme
    // 2. Global admin theme
    // 3. Default theme
    
    const themeToUse = profile?.theme || globalSettings?.globalTheme;
    
    if (themeToUse) {
      let { primaryColor, secondaryColor, isGradient, backgroundImage } = themeToUse as any;
      const mode = (themeToUse as any).mode || 'light';
      
      // Reset if black (as requested by user)
      if (primaryColor === '#000000' || primaryColor === '#000') {
        primaryColor = '#2563eb';
        if (!isGradient) secondaryColor = '#2563eb';
      }
      
      // Mode
      if (mode === 'dark' && !isCustomerRoute) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      
      // Colors
      root.style.setProperty('--primary-color', primaryColor);
      if (isGradient && secondaryColor) {
        root.style.setProperty('--secondary-color', secondaryColor);
      } else {
        root.style.setProperty('--secondary-color', primaryColor);
      }
      
      // Update background color based on primary color
      const isDark = mode === 'dark' && !isCustomerRoute;
      const bgColor = isDark 
        ? `color-mix(in srgb, ${primaryColor}, black 90%)` 
        : `color-mix(in srgb, ${primaryColor}, white 96%)`;
      root.style.setProperty('--bg-color', bgColor);

      // Background Image
      if (backgroundImage) {
        root.style.setProperty('--bg-image', `url(${backgroundImage})`);
      } else {
        root.style.removeProperty('--bg-image');
      }
    } else {
      // Default theme
      root.classList.remove('dark');
      root.style.setProperty('--primary-color', '#2563eb');
      root.style.setProperty('--secondary-color', '#1e40af');
      root.style.removeProperty('--bg-image');
      root.style.setProperty('--bg-color', '#f1f5f9');
    }
  }, [profile?.theme, globalSettings?.globalTheme, location.pathname]);
  
  return (
    <div 
      className="fixed inset-0 z-[-1] pointer-events-none bg-no-repeat bg-center bg-cover bg-fixed opacity-[0.15]"
      style={{ backgroundImage: 'var(--bg-image)' }}
    />
  );
};

const MaintenanceOverlay = () => {
  const { globalSettings, profile } = useAuth();
  
  if (!globalSettings?.maintenanceMode || profile?.role === 'admin') return null;

  return (
    <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 text-center">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-white/10"
      >
        {globalSettings.maintenanceImageUrl && (
          <img 
            src={globalSettings.maintenanceImageUrl} 
            alt="Manutenção" 
            className="w-full h-48 object-cover rounded-2xl mb-6"
            referrerPolicy="no-referrer"
          />
        )}
        <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">
          Sistema em Manutenção
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          {globalSettings.maintenanceMessage || "Estamos realizando melhorias no sistema. Voltaremos em breve!"}
        </p>
        <div className="w-12 h-12 border-4 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto" />
      </motion.div>
    </div>
  );
};

const VisualEffects = () => {
  const { globalSettings } = useAuth();
  const effect = globalSettings?.activeEffect;

  if (!effect || effect === 'none') return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[99999] overflow-hidden">
      {effect === 'snow' && (
        <div className="absolute inset-0 w-full h-full">
          {[...Array(150)].map((_, i) => (
            <motion.div
              key={`snow-flake-${i}`}
              initial={{ 
                y: -20, 
                x: `${Math.random() * 100}vw`,
                opacity: Math.random() * 0.6 + 0.2,
                scale: Math.random() * 0.5 + 0.3
              }}
              animate={{ 
                y: '110vh',
                x: `${(Math.random() * 100)}vw`,
                rotate: Math.random() * 360
              }}
              transition={{ 
                duration: Math.random() * 15 + 10, 
                repeat: Infinity, 
                ease: "linear",
                delay: Math.random() * 20
              }}
              className="absolute w-1.5 h-1.5 bg-white rounded-full blur-[0.5px] shadow-[0_0_5px_rgba(255,255,255,0.8)]"
            />
          ))}
        </div>
      )}

      {effect === 'rocket' && (
        <div className="absolute inset-0">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={`rocket-trail-${i}`}
              initial={{ bottom: -100, left: `${Math.random() * 100}%`, opacity: 0 }}
              animate={{ 
                bottom: '110%', 
                left: `${(Math.random() * 100) + (Math.random() * 20 - 10)}%`,
                opacity: [0, 1, 1, 0],
                scale: [0.5, 1, 1, 0.5]
              }}
              transition={{ 
                duration: Math.random() * 3 + 2, 
                repeat: Infinity, 
                ease: "easeIn",
                delay: Math.random() * 10
              }}
              className="absolute text-blue-400"
            >
              <Navigation size={32} className="-rotate-45" />
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-1 h-12 bg-gradient-to-t from-transparent via-orange-500 to-yellow-400 blur-sm" />
            </motion.div>
          ))}
        </div>
      )}

      {effect === 'easter' && (
        <div className="absolute inset-0">
          {[...Array(15)].map((_, i) => (
            <motion.div
              key={`easter-egg-${i}`}
              initial={{ y: -50, x: `${Math.random() * 100}%`, rotate: 0 }}
              animate={{ 
                y: '100vh', 
                rotate: 360,
                x: `${(Math.random() * 100) + (Math.random() * 10 - 5)}%`
              }}
              transition={{ 
                duration: Math.random() * 8 + 10, 
                repeat: Infinity, 
                ease: "linear",
                delay: Math.random() * 10
              }}
              className="absolute text-amber-400 opacity-60"
            >
              <Utensils size={24} />
            </motion.div>
          ))}
        </div>
      )}

      {effect === 'women_day' && (
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={`wday-star-${i}`}
              initial={{ scale: 0, x: `${Math.random() * 100}%`, y: `${Math.random() * 100}%`, opacity: 0 }}
              animate={{ 
                scale: [0, 1.5, 0],
                opacity: [0, 0.8, 0],
                rotate: [0, 45, 0]
              }}
              transition={{ 
                duration: Math.random() * 4 + 3, 
                repeat: Infinity, 
                ease: "easeInOut",
                delay: Math.random() * 5
              }}
              className="absolute text-pink-400"
            >
              <Star size={24} fill="currentColor" />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

const FirebaseStatus = () => {
  const [status, setStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Try to read a public document to verify connection
        await getDocFromServer(doc(db, 'settings', 'global'));
        setStatus('connected');
      } catch (error: any) {
        console.error('Firebase Connection Error:', error);
        setStatus('error');
        if (error.message?.includes('offline')) {
          setErrorMessage('O cliente está offline. Verifique sua conexão.');
        } else if (error.message?.includes('permission')) {
          setErrorMessage('Erro de permissão. Verifique as regras do Firestore.');
        } else {
          setErrorMessage('Não foi possível conectar ao banco de dados. Verifique a configuração.');
        }
      }
    };

    checkConnection();
  }, []);

  if (status === 'connected' || status === 'checking') return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-80 z-[10002] bg-red-50 dark:bg-red-900/20 border-2 border-red-100 dark:border-red-900/30 p-4 rounded-3xl shadow-2xl backdrop-blur-md"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-xl text-red-600 dark:text-red-400">
          <Database size={20} />
        </div>
        <div className="flex-1">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-400 mb-1">Erro de Conexão</h4>
          <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 leading-tight">{errorMessage}</p>
        </div>
      </div>
    </motion.div>
  );
};

const NotificationListener = () => {
  const { user } = useAuth();
  const [latestNotification, setLatestNotification] = useState<any>(null);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'push_notifications'),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const notification = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        const lastSeenId = localStorage.getItem('lastSeenNotificationId');
        
        if (notification.id !== lastSeenId) {
          setLatestNotification(notification);
          setShowNotification(true);
          localStorage.setItem('lastSeenNotificationId', notification.id);
        }
      }
    }, (error) => {
      // Ignore permission denied for notifications during initial load
      if (error.code !== 'permission-denied') {
        console.error("Error listening for notifications:", error);
      }
    });

    return () => unsubscribe();
  }, [user]);

  if (!showNotification || !latestNotification) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 20, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        className="fixed top-0 left-1/2 -translate-x-1/2 z-[10001] w-full max-w-md px-4"
      >
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-blue-500/20 flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 shrink-0">
            <Bell size={24} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Nova Notificação</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm line-clamp-3">{latestNotification.message}</p>
          </div>
          <button 
            onClick={() => setShowNotification(false)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400"
          >
            <X size={20} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

const MainContent = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [splashComplete, setSplashComplete] = useState(false);
  const { commonData } = useAuth();

  // Prefetch other pages in the background for ultra-fast navigation
  useEffect(() => {
    // Start automated permission flow (Geolocation, etc.)
    initPermissionFlow();

    // Validate connection to Firestore as per integration guidelines
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'settings', 'global'));
        console.log("[Firebase] Firestore connection verified successfully.");
      } catch (error) {
        if (error instanceof Error && error.message.includes('permission-denied')) {
          console.warn("[Firebase] Initial test connection returned permission-denied. This is expected if the user is not yet logged in.");
        } else if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("[Firebase] Please check your internet connection.");
        } else {
          console.error("[Firebase] Firestore test connection error:", error);
        }
      }
    };
    testConnection();

    const prefetchPages = async () => {
      // Wait for the initial page to be fully interactive
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => {
          // Prefetch remaining views
          import('./components/ManagerView');
          import('./components/CourierView');
        }, { timeout: 3000 });
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(() => {
          import('./components/ManagerView');
          import('./components/CourierView');
        }, 5000);
      }
    };

    prefetchPages();
  }, []);

  const triggerSplash = () => {
    setSplashComplete(false);
    setShowSplash(true);
  };

  useEffect(() => {
    if (splashComplete) {
      const hasTriggered = localStorage.getItem('customer_permission_triggered');
      if (!hasTriggered) {
        // Small delay to ensure PermissionManager is mounted and listening
        const timer = setTimeout(() => {
          window.dispatchEvent(new CustomEvent('trigger-permission-check'));
          localStorage.setItem('customer_permission_triggered', 'true');
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [splashComplete]);

  return (
    <>
      <ConnectivityBar />
      <FirebaseStatus />
      <MaintenanceOverlay />
      <NotificationListener />
      <AnimatePresence mode="wait">
        {showSplash ? (
          <SplashScreen 
            key="splash" 
            isLoaded={commonData.isLoaded}
            onComplete={() => {
              setShowSplash(false);
              setSplashComplete(true);
            }} 
          />
        ) : (
          <div key="content">
            <Router>
              <ThemeHandler />
              <AnimatedRoutes triggerSplash={triggerSplash} splashComplete={splashComplete} />
              <Suspense fallback={null}>
                <PermissionManager />
                <PermissionStatusIndicator />
              </Suspense>
            </Router>
          </div>
        )}
      </AnimatePresence>
      <VisualEffects />
    </>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <MainContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}
