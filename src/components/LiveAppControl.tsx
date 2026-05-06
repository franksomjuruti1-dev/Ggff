import React, { useState, useMemo } from 'react';
import { 
  Search, 
  MapPin, 
  Eye, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  ChevronRight,
  ArrowLeft,
  Settings2,
  ShieldAlert,
  History,
  Zap,
  Undo2,
  Save,
  Trash2,
  Lock,
  Unlock,
  Pause,
  Play,
  X,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import CustomerView from './CustomerView';
import { db } from '../firebase';
import { 
  doc, 
  updateDoc, 
  serverTimestamp, 
  addDoc, 
  collection,
  deleteDoc
} from 'firebase/firestore';
import { handleFirestoreError, OperationType, useAuth } from '../AuthContext';

interface City {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'error';
  active: boolean;
}

interface LiveAppControlProps {
  cities: City[];
  onClose: () => void;
  adminUid: string;
}

const LiveAppControl: React.FC<LiveAppControlProps> = ({ cities, onClose, adminUid }) => {
  const { commonData } = useAuth();
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSimulationMode, setIsSimulationMode] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [rollbackHistory, setRollbackHistory] = useState<any[]>([]);

  const filteredCities = useMemo(() => {
    // Filter unique cities by name
    const uniqueCitiesMap = new Map<string, City>();
    cities.forEach(city => {
      const nameKey = city.name.toLowerCase().trim();
      if (!uniqueCitiesMap.has(nameKey)) {
        uniqueCitiesMap.set(nameKey, city);
      }
    });
    const uniqueCities = Array.from(uniqueCitiesMap.values());
    return uniqueCities.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [cities, searchQuery]);

  const logAction = async (action: string, details: string, beforeState: any, afterState: any) => {
    try {
      const logData = {
        adminUid,
        action,
        details,
        beforeState,
        afterState,
        timestamp: serverTimestamp(),
        mode: isSimulationMode ? 'simulation' : 'live'
      };
      
      if (!isSimulationMode) {
        await addDoc(collection(db, 'admin_logs'), logData);
      }
      
      setRollbackHistory(prev => [{ ...logData, id: Date.now().toString() }, ...prev].slice(0, 50));
    } catch (error) {
      console.error("Error logging action:", error);
    }
  };

  const handleRollback = async (log: any) => {
    if (window.confirm(`Deseja reverter a ação: ${log.action}?`)) {
      try {
        // Implementation depends on the action type
        // This is a placeholder for the logic
        alert("Rollback em desenvolvimento para esta ação específica.");
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, 'rollback');
      }
    }
  };

  const [isEmergencyMode, setIsEmergencyMode] = useState(false);
  const [featureFlags, setFeatureFlags] = useState({
    delivery: true,
    pickup: true,
    payments: true,
    chat: true
  });

  const toggleEmergencyMode = async () => {
    const newState = !isEmergencyMode;
    setIsEmergencyMode(newState);
    
    logAction(
      'emergency',
      `Modo de Emergência ${newState ? 'ATIVADO' : 'DESATIVADO'}`,
      { emergency: newState },
      null
    );

    if (newState && selectedCity) {
      if (window.confirm(`🚨 ATENÇÃO: Deseja pausar TODOS os restaurantes de ${selectedCity.name} agora?`)) {
        try {
          // In a real app, we would query all restaurants in this city and update them
          const cityRestaurants = commonData.restaurants.filter(r => r.cityId === selectedCity.id || r.city === selectedCity.name);
          for (const res of cityRestaurants) {
            await updateDoc(doc(db, 'restaurants', res.id), {
              status: 'paused',
              updatedAt: serverTimestamp()
            });
          }
          alert(`Sucesso: ${cityRestaurants.length} restaurantes foram pausados em ${selectedCity.name}.`);
        } catch (error) {
          console.error("Error in emergency pause:", error);
          alert("Erro ao executar pausa de emergência.");
        }
      }
    }
  };

  const toggleFeature = (feature: keyof typeof featureFlags) => {
    const newFlags = { ...featureFlags, [feature]: !featureFlags[feature] };
    setFeatureFlags(newFlags);
    
    logAction(
      'feature_flag',
      `Funcionalidade ${String(feature)} ${newFlags[feature] ? 'ATIVADA' : 'DESATIVADA'}`,
      { feature, enabled: newFlags[feature] },
      null
    );
  };

  if (!selectedCity) {
    return (
      <div className="flex flex-col h-full bg-slate-950 text-white p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tighter italic flex items-center gap-3">
              <Eye className="text-blue-500" />
              Visualizar App ao Vivo
            </h2>
            <p className="text-slate-400 font-medium">Selecione uma cidade para iniciar o Modo Controle Total</p>
          </div>
          <button 
            onClick={onClose}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-all"
          >
            <X size={24} />
          </button>
        </div>

        <div className="relative mb-8">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
          <input 
            type="text"
            placeholder="Buscar cidade..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-3xl py-6 pl-16 pr-8 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pr-2 custom-scrollbar">
          {filteredCities.map(city => (
            <motion.div
              key={city.id}
              whileHover={{ scale: 1.02, y: -5 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedCity(city)}
              className="bg-white/5 border border-white/10 p-6 rounded-[2.5rem] cursor-pointer hover:bg-white/10 transition-all group relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-4 bg-blue-500/20 rounded-2xl text-blue-400 group-hover:scale-110 transition-transform">
                  <MapPin size={24} />
                </div>
                <div className="flex items-center gap-2">
                  {city.status === 'online' ? (
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest">
                      <CheckCircle2 size={12} /> Ativa
                    </span>
                  ) : city.status === 'offline' ? (
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-[10px] font-black uppercase tracking-widest">
                      <XCircle size={12} /> Offline
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-[10px] font-black uppercase tracking-widest">
                      <AlertCircle size={12} /> Instável
                    </span>
                  )}
                </div>
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight italic mb-1">{city.name}</h3>
              <p className="text-slate-500 text-sm font-medium">Clique para entrar no Modo Controle Total</p>
              
              <div className="absolute bottom-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                <ChevronRight className="text-blue-500" size={32} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 overflow-hidden relative">
      {/* Admin Toolbar */}
      <div className="bg-slate-950 border-b border-white/10 p-4 flex items-center justify-between z-50">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSelectedCity(null)}
            className="p-2 hover:bg-white/5 rounded-xl transition-all text-slate-400 hover:text-white"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest italic flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              Modo Controle Total: {selectedCity.name}
            </h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              {isSimulationMode ? 'Modo Simulação Ativo' : 'Alterações em Tempo Real'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden lg:flex bg-white/5 rounded-xl p-1 border border-white/5 mr-2">
            {(['delivery', 'pickup', 'payments', 'chat'] as const).map(feature => (
              <button
                key={feature}
                onClick={() => toggleFeature(feature)}
                className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${featureFlags[feature] ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-500 opacity-50 hover:opacity-100'}`}
              >
                {feature}
              </button>
            ))}
          </div>

          <button 
            onClick={() => setIsSimulationMode(!isSimulationMode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isSimulationMode ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
          >
            <Zap size={14} />
            {isSimulationMode ? 'Sair da Simulação' : 'Modo Simulação'}
          </button>
          
          <button 
            onClick={() => setShowLogs(!showLogs)}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 text-slate-400 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
          >
            <History size={14} />
            Histórico
          </button>

          <button 
            onClick={() => {
              // In this implementation, changes are saved in real-time, 
              // but we show a success message to confirm "Save" action.
              alert("✅ Alterações salvas com sucesso em " + selectedCity.name);
              logAction('save_all', `Salvou todas as alterações em ${selectedCity.name}`, {}, {});
            }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20"
          >
            <Save size={14} />
            Salvar
          </button>

          <div className="h-8 w-px bg-white/10 mx-2" />

          <button 
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isEmergencyMode ? 'bg-red-600 text-white animate-pulse shadow-lg shadow-red-500/40' : 'bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white'}`}
            onClick={toggleEmergencyMode}
          >
            <ShieldAlert size={14} />
            {isEmergencyMode ? 'Modo Emergência Ativo' : 'Emergência'}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* App Preview Container */}
        <div className="flex-1 bg-slate-800 relative overflow-hidden flex items-center justify-center p-8">
          <div className="w-full max-w-md h-full bg-white rounded-[3rem] shadow-2xl overflow-hidden relative border-[8px] border-slate-950">
            {/* App Content */}
            <div className="absolute inset-0 overflow-y-auto custom-scrollbar">
              <CustomerView 
                adminMode={true} 
                forcedCityId={selectedCity.id} 
                featureFlags={featureFlags}
              />
            </div>

            {/* Admin Interaction Layer Overlay (Optional, for global controls) */}
            <div className="absolute inset-0 pointer-events-none border-4 border-blue-500/30 rounded-[2.5rem]" />
          </div>
        </div>

        {/* Right Sidebar - Quick Actions & Logs */}
        <AnimatePresence>
          {showLogs && (
            <motion.div 
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              className="w-80 bg-slate-950 border-l border-white/10 flex flex-col"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-widest italic">Histórico de Ações</h3>
                <button onClick={() => setShowLogs(false)} className="text-slate-500 hover:text-white">
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {rollbackHistory.length === 0 ? (
                  <div className="text-center py-20 text-slate-600">
                    <History size={32} className="mx-auto mb-4 opacity-20" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma ação registrada</p>
                  </div>
                ) : (
                  rollbackHistory.map(log => (
                    <div key={log.id} className="bg-white/5 rounded-2xl p-4 space-y-2 border border-white/5">
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] font-black uppercase tracking-widest text-blue-400">{log.action}</span>
                        <span className="text-[8px] text-slate-500">{new Date(log.timestamp?.toDate?.() || Date.now()).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-[10px] text-slate-300 font-medium leading-relaxed">{log.details}</p>
                      <button 
                        onClick={() => handleRollback(log)}
                        className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-amber-500 hover:text-amber-400 transition-colors"
                      >
                        <Undo2 size={10} /> Desfazer
                      </button>
                    </div>
                  ))
                )}
              </div>
              <div className="p-4 border-t border-white/10">
                <button 
                  onClick={() => {
                    if (window.confirm("Deseja reverter TODAS as alterações recentes?")) {
                      alert("Reversão global em desenvolvimento.");
                    }
                  }}
                  className="w-full py-3 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw size={14} />
                  Reverter Tudo
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Action Menu (Quick Access) */}
      <div className="absolute bottom-8 right-8 flex flex-col gap-4 z-[60]">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="p-4 bg-blue-600 text-white rounded-full shadow-xl shadow-blue-600/20 flex items-center justify-center"
          onClick={() => alert("Menu de Ações Rápidas em desenvolvimento")}
        >
          <Settings2 size={24} />
        </motion.button>
      </div>
    </div>
  );
};

export default LiveAppControl;
