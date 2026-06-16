import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { motion } from 'motion/react';
import { MapPin, Navigation, AlertTriangle, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';

const LocationCapturePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'idle' | 'requesting' | 'success' | 'error'>('requesting');
  const [errorMsg, setErrorMsg] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const returnUrl = searchParams.get('returnUrl') || '/customer';

  const captureLocation = () => {
    setStatus('requesting');
    setErrorMsg('');

    const uidFromParam = searchParams.get('uid');
    const effectiveUserId = user?.uid || uidFromParam;

    if (!("geolocation" in navigator)) {
      setStatus('error');
      setErrorMsg('Geolocalização não suportada.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lng: longitude });
        setStatus('success');

        // Salva diretamente se tivermos o UID (vencendo limitações de auth na página externa)
        if (effectiveUserId && effectiveUserId !== 'anon') {
          try {
            const userRef = doc(db, 'users', effectiveUserId);
            await updateDoc(userRef, {
              lastLocation: {
                latitude,
                longitude,
                capturedAt: new Date().toISOString(),
                method: 'external_share_capture'
              },
              updatedAt: serverTimestamp()
            });
          } catch (e) {
            console.error("Erro Firestore:", e);
          }
        }

        // Removido redirecionamento automático para cumprir requisito de "não voltar"
        console.log("[LocationCapture] Localização capturada e salva no perfil.");
      },
      (error) => {
        console.error("Erro GPS:", error);
        setStatus('error');
        if (error.code === error.PERMISSION_DENIED) {
          setErrorMsg('Acesso à localização negado. Por favor, ative o GPS e permita o acesso.');
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setErrorMsg('Localização indisponível. Verifique se o GPS está ligado.');
        } else if (error.code === error.TIMEOUT) {
          setErrorMsg('Tempo limite excedido ao obter localização. Tente novamente.');
        } else {
          setErrorMsg('Ocorreu um erro ao capturar sua localização.');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    captureLocation();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[2.5rem] p-10 shadow-2xl border border-slate-100"
      >
        <div className="mb-8 flex justify-center">
          <div className={`w-20 h-20 rounded-3xl flex items-center justify-center ${
            status === 'success' ? 'bg-emerald-100 text-emerald-600' :
            status === 'error' ? 'bg-amber-100 text-amber-600' :
            'bg-brand-blue/10 text-brand-blue'
          }`}>
            {status === 'success' ? <CheckCircle2 size={40} /> :
             status === 'error' ? <AlertTriangle size={40} /> :
             <MapPin size={40} className="animate-bounce" />}
          </div>
        </div>

        <h1 className="text-2xl font-black text-slate-900 mb-4 tracking-tight uppercase italic">
          {status === 'requesting' && 'Capturando sua localização...'}
          {status === 'success' && '✅ Localização capturada com sucesso'}
          {status === 'error' && '⚠️ Falha na Captura'}
        </h1>

        <p className="text-slate-600 mb-10 leading-relaxed font-medium">
          {status === 'requesting' && 'Estamos obtendo sua posição exata para garantir que seu pedido chegue no lugar certo.'}
          {status === 'success' && 'Entre na Xô Fome na Tupã e faça seu pedido. Sua localização foi capturada com sucesso!'}
          {status === 'error' && errorMsg}
        </p>

        {status === 'error' && (
          <div className="space-y-4">
            <button 
              onClick={captureLocation}
              className="w-full py-5 bg-brand-blue text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-brand-blue/20"
            >
              <Navigation size={20} />
              Tentar Novamente
            </button>
            <button 
              onClick={() => navigate('/customer')}
              className="w-full py-4 text-slate-400 font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2"
            >
              <ArrowLeft size={16} />
              Voltar ao Início
            </button>
          </div>
        )}

        {status === 'requesting' && (
          <div className="flex justify-center">
            <Loader2 className="animate-spin text-brand-blue w-8 h-8" />
          </div>
        )}

        {status === 'success' && coords && (
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
            {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
          </div>
        )}
      </motion.div>

      <div className="mt-10">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">XÔ FOME • PLATAFORMA DE DELIVERY</p>
      </div>
    </div>
  );
};

export default LocationCapturePage;
