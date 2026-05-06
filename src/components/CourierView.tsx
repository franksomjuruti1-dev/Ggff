import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  onSnapshot, 
  updateDoc, 
  setDoc,
  doc, 
  query, 
  where, 
  orderBy 
} from 'firebase/firestore';
import { useAuth, OperationType, handleFirestoreError } from '../AuthContext';
import { Bike, MapPin, Package, CheckCircle, LogOut, Power, Navigation, Clock, User, TrendingUp, DollarSign, ChevronRight, Store, Car } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Ride {
  id: string;
  restaurantId: string;
  restaurantName: string;
  origin: { latitude: number; longitude: number };
  destinations: {
    orderId: string;
    customerName: string;
    customerUid: string;
    latitude: number;
    longitude: number;
    address: string;
    referencePoint?: string;
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
  courierWhatsapp?: string;
  createdAt: any;
}

const CourierView: React.FC = () => {
  const { user, profile, signOut, updateStatus } = useAuth();
  const [rides, setRides] = useState<Ride[]>([]);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [rideHistory, setRideHistory] = useState<Ride[]>([]);
  const [view, setView] = useState<'orders' | 'history' | 'profile'>('orders');

  useEffect(() => {
    if (!user || profile?.role !== 'courier') return;

    const ridesRef = collection(db, 'rides');
    
    // Available rides query
    const availableQuery = query(
      ridesRef, 
      where('status', '==', 'searching')
    );

    // Assigned rides query
    const assignedQuery = query(
      ridesRef,
      where('courierUid', '==', user.uid)
    );

    const unsubAvailable = onSnapshot(availableQuery, (snapshot) => {
      const availableData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ride));
      setRides(availableData);
    }, (err) => {
      const errCode = err.code || (err as any).code;
      if (errCode !== 'permission-denied' && !err.message?.toLowerCase().includes('permissions')) {
        handleFirestoreError(err, OperationType.LIST, 'rides');
      }
    });

    const unsubAssigned = onSnapshot(assignedQuery, (snapshot) => {
      const assignedData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ride));
      const active = assignedData.find(r => ['accepted', 'picked_up'].includes(r.status));
      const history = assignedData.filter(r => r.status === 'completed')
        .sort((a, b) => {
          const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime();
          const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime();
          return timeB - timeA;
        });
      
      setActiveRide(active || null);
      setRideHistory(history);
    }, (err) => {
      const errCode = err.code || (err as any).code;
      if (errCode !== 'permission-denied' && !err.message?.toLowerCase().includes('permissions')) {
        handleFirestoreError(err, OperationType.LIST, 'rides');
      }
    });

    return () => {
      unsubAvailable();
      unsubAssigned();
    };
  }, [user, profile]);

  const totalEarnings = rideHistory.reduce((acc, r) => acc + (r.destinations.length * 5), 0);

  const handleAcceptRide = async (rideId: string) => {
    if (!user || !profile) return;
    try {
      const rideRef = doc(db, 'rides', rideId);
      const rideData = rides.find(r => r.id === rideId);
      
      const courierInfo = {
        courierUid: user.uid,
        courierName: profile.displayName || user.displayName,
        courierPhoto: user.photoURL || '',
        courierVehicle: profile.vehicleType || 'Moto',
        courierPlate: profile.vehiclePlate || 'Não informada',
        courierColor: profile.vehicleColor || 'Não informada',
        courierWhatsapp: profile.whatsapp || 'Não informado',
        status: 'accepted' as const
      };

      await updateDoc(rideRef, courierInfo);

      // Update all orders associated with this ride immediately upon acceptance
      if (rideData && rideData.destinations) {
        for (const dest of rideData.destinations) {
          const orderRef = doc(db, 'orders', dest.orderId);
          await updateDoc(orderRef, {
            courierUid: courierInfo.courierUid,
            courierName: courierInfo.courierName,
            courierPhoto: courierInfo.courierPhoto,
            courierVehicle: courierInfo.courierVehicle,
            courierPlate: courierInfo.courierPlate,
            courierColor: courierInfo.courierColor,
            courierWhatsapp: courierInfo.courierWhatsapp,
            // Keep existing order status if it's more advanced, but usually it's 'pending' or 'preparing'
            // Manager sets it to 'preparing' or 'ready' before calling courier
            // When courier accepts, we can mark it as 'accepted' if desired, 
            // but the prompt says just reflect the info.
          });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rides/${rideId}`);
    }
  };

  const handleArrivedAtPickup = async (rideId: string) => {
    try {
      const rideRef = doc(db, 'rides', rideId);
      await updateDoc(rideRef, {
        status: 'arrived_at_pickup'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rides/${rideId}`);
    }
  };

  const handlePickupRide = async (rideId: string) => {
    try {
      const rideRef = doc(db, 'rides', rideId);
      await updateDoc(rideRef, {
        status: 'picked_up'
      });

      // Update all orders in the ride to delivering and include courier info
      if (activeRide) {
        for (const dest of activeRide.destinations) {
          await updateDoc(doc(db, 'orders', dest.orderId), {
            status: 'delivering',
            courierUid: user!.uid,
            courierName: profile?.displayName || user!.displayName,
            courierPhoto: user!.photoURL || '',
            courierVehicle: profile?.vehicleType || 'Moto',
            courierPlate: profile?.vehiclePlate || 'Não informada',
            courierColor: profile?.vehicleColor || 'Não informada',
            deliveryEstimation: '15-25 min' // Default estimation
          });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rides/${rideId}`);
    }
  };

  const handleEnRouteRide = async (rideId: string) => {
    try {
      const rideRef = doc(db, 'rides', rideId);
      await updateDoc(rideRef, {
        status: 'en_route'
      });

      // Update all orders in the ride to en_route
      if (activeRide) {
        for (const dest of activeRide.destinations) {
          await updateDoc(doc(db, 'orders', dest.orderId), {
            status: 'en_route',
            courierUid: user!.uid,
            courierName: profile?.displayName || user!.displayName,
            courierPhoto: user!.photoURL || '',
            courierVehicle: profile?.vehicleType || 'Moto',
            courierPlate: profile?.vehiclePlate || 'Não informada',
            courierColor: profile?.vehicleColor || 'Não informada'
          });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rides/${rideId}`);
    }
  };

  const handleCompleteRide = async (rideId: string) => {
    try {
      const rideRef = doc(db, 'rides', rideId);
      await updateDoc(rideRef, {
        status: 'completed'
      });

      // Update all orders in the ride to delivered
      const ride = activeRide;
      if (ride) {
        for (const dest of ride.destinations) {
          await updateDoc(doc(db, 'orders', dest.orderId), {
            status: 'delivered'
          });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rides/${rideId}`);
    }
  };

  const toggleOnline = () => {
    const newStatus = profile?.status === 'online' ? 'offline' : 'online';
    updateStatus(newStatus);
  };

  if (!user || profile?.role !== 'courier') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <Bike size={64} className="mx-auto text-blue-500" />
          <h2 className="text-2xl font-bold text-white">Acesso Restrito</h2>
          <p className="text-slate-400">Esta área é exclusiva para entregadores parceiros.</p>
          <button onClick={signOut} className="bg-blue-600 text-white px-6 py-2 rounded-full font-bold">Sair</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-app text-slate-900 dark:text-white font-sans pb-24 transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${profile?.status === 'online' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
            <h1 className="text-xl font-black italic tracking-tighter uppercase text-blue-gradient">Entregador</h1>
          </div>
          <div className="flex items-center space-x-4">
            <button 
              onClick={toggleOnline}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                profile?.status === 'online' 
                ? 'bg-emerald-100 text-emerald-600' 
                : 'bg-slate-100 text-slate-600'
              }`}
            >
              <Power size={14} />
              <span>{profile?.status === 'online' ? 'ONLINE' : 'OFFLINE'}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {view === 'orders' && (
            <motion.div 
              key="orders"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              {/* Active Ride */}
              {activeRide && (
                <section className="space-y-4">
                  <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Corrida em Curso</h2>
                  <div className="bg-blue-600 text-white rounded-[2rem] p-6 shadow-xl shadow-blue-500/20 space-y-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2 text-blue-100 text-xs font-bold uppercase tracking-widest">
                          <Store size={14} />
                          <span>Retirada</span>
                        </div>
                        <p className="text-lg font-bold leading-tight">{activeRide.restaurantName}</p>
                      </div>
                      <div className="bg-white/20 p-3 rounded-2xl">
                        {activeRide.vehicleType === 'car' ? <Car size={24} /> : <Bike size={24} />}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center space-x-2 text-blue-100 text-xs font-bold uppercase tracking-widest">
                        <Navigation size={14} />
                        <span>Destinos ({activeRide.destinations.length})</span>
                      </div>
                      <div className="space-y-2">
                        {/* Origin (Restaurant) */}
                        <div className="bg-white/10 p-3 rounded-xl flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-xs font-bold">Retirada: {activeRide.restaurantName}</p>
                            <p className="text-[10px] text-blue-100 italic">Ponto de partida</p>
                          </div>
                          <button 
                            onClick={() => window.open(`https://www.openstreetmap.org/?mlat=${activeRide.origin.latitude}&mlon=${activeRide.origin.longitude}#map=18/${activeRide.origin.latitude}/${activeRide.origin.longitude}`, '_blank')}
                            className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                          >
                            <Navigation size={14} />
                          </button>
                        </div>

                        {activeRide.destinations.map((dest, idx) => (
                          <div key={`${dest.orderId}-${idx}`} className="bg-white/10 p-3 rounded-xl flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-xs font-bold">{dest.customerName}</p>
                              <p className="text-[10px] text-blue-100 line-clamp-1">{dest.address}</p>
                              {dest.referencePoint && (
                                <p className="text-[9px] text-blue-200 mt-0.5 line-clamp-1">Ref: {dest.referencePoint}</p>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              <button 
                                onClick={() => window.open(`https://www.openstreetmap.org/?mlat=${dest.latitude}&mlon=${dest.longitude}#map=18/${dest.latitude}/${dest.longitude}`, '_blank')}
                                className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                              >
                                <Navigation size={14} />
                              </button>
                              <MapPin size={12} className="text-blue-200" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-200">Total Ganhos</span>
                        <p className="text-xl font-black">R$ {(activeRide.destinations.length * 5).toFixed(2)}</p>
                      </div>
                      <div className="flex space-x-2">
                        {activeRide.status === 'accepted' ? (
                          <button 
                            onClick={() => handleArrivedAtPickup(activeRide.id)}
                            className="bg-white text-blue-600 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-blue-50 transition-all"
                          >
                            Cheguei ao Local
                          </button>
                        ) : activeRide.status === 'arrived_at_pickup' ? (
                          <button 
                            onClick={() => handlePickupRide(activeRide.id)}
                            className="bg-white text-blue-600 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-blue-50 transition-all"
                          >
                            Coletar Pedidos
                          </button>
                        ) : activeRide.status === 'picked_up' ? (
                          <button 
                            onClick={() => handleEnRouteRide(activeRide.id)}
                            className="bg-orange-500 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-orange-600 transition-all"
                          >
                            Em rota para o cliente
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleCompleteRide(activeRide.id)}
                            className="bg-emerald-500 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-emerald-600 transition-all"
                          >
                            Finalizar Corrida
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Available Rides */}
              <section className="space-y-4">
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Corridas Disponíveis</h2>
                {profile?.status !== 'online' ? (
                  <div className="bg-white rounded-[2rem] p-12 text-center space-y-4 border border-slate-100">
                    <div className="w-16 h-16 bg-slate-50 rounded-full mx-auto flex items-center justify-center text-slate-300">
                      <Power size={32} />
                    </div>
                    <p className="text-slate-400 font-medium">Fique online para receber corridas.</p>
                  </div>
                ) : rides.length === 0 ? (
                  <div className="bg-white rounded-[2rem] p-12 text-center space-y-4 border border-slate-100">
                    <div className="w-16 h-16 bg-slate-50 rounded-full mx-auto flex items-center justify-center text-slate-300">
                      <Bike size={32} />
                    </div>
                    <p className="text-slate-400 font-medium">Nenhuma corrida disponível no momento.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {(Array.from(new Map(rides.map(r => [r.id, r])).values()) as Ride[]).map((ride, rIdx) => (
                      <motion.div 
                        key={`available-ride-${ride.id}-${rIdx}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all space-y-4"
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                              <Store size={12} />
                              <span>{ride.restaurantName}</span>
                            </div>
                            <p className="font-bold text-slate-700">{ride.destinations.length} Entregas</p>
                            <div className="flex items-center space-x-1 text-blue-600">
                              {ride.vehicleType === 'car' ? <Car size={14} /> : <Bike size={14} />}
                              <span className="text-[10px] font-black uppercase tracking-widest">{ride.vehicleType === 'car' ? 'Carro' : 'Moto'}</span>
                            </div>
                          </div>
                          <div className="bg-blue-50 text-blue-600 p-3 rounded-2xl">
                            <Package size={20} />
                          </div>
                        </div>
                        
                        <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                          <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ganhos</span>
                            <p className="text-lg font-black text-blue-600">R$ {(ride.destinations.length * 5).toFixed(2)}</p>
                          </div>
                          <button 
                            onClick={() => handleAcceptRide(ride.id)}
                            disabled={!!activeRide}
                            className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                              activeRide 
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                              : 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700'
                            }`}
                          >
                            Aceitar
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </section>
            </motion.div>
          )}

          {view === 'history' && (
            <motion.div 
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="bg-blue-gradient text-white rounded-[2.5rem] p-8 shadow-xl shadow-blue-500/20">
                <p className="text-xs font-black uppercase tracking-widest text-blue-100 mb-2">Total Ganhos</p>
                <h2 className="text-4xl font-black italic tracking-tighter">R$ {totalEarnings.toFixed(2)}</h2>
                <div className="mt-6 flex space-x-4">
                  <div className="bg-white/10 px-4 py-2 rounded-xl">
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-100">Corridas</p>
                    <p className="text-lg font-black">{rideHistory.length}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Histórico Recente</h3>
                {rideHistory.length === 0 ? (
                  <div className="bg-white rounded-[2rem] p-12 text-center border border-slate-100">
                    <p className="text-slate-400 text-sm font-medium">Nenhuma corrida realizada ainda.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(Array.from(new Map(rideHistory.map(r => [r.id, r])).values()) as Ride[]).slice(0, 10).map((ride, hIdx) => (
                      <div key={`history-ride-${ride.id}-${hIdx}`} className="bg-slate-50 dark:bg-slate-800/50 grayscale-[0.5] rounded-2xl p-4 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 text-slate-500 rounded-full flex items-center justify-center">
                            <CheckCircle size={20} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-700 line-clamp-1">{ride.restaurantName}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{ride.destinations.length} entregas • {ride.createdAt?.toDate ? ride.createdAt.toDate().toLocaleDateString() : new Date(ride.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <p className="text-sm font-black text-slate-500">+ R$ {(ride.destinations.length * 5).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {view === 'profile' && (
            <motion.div 
              key="profile"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-md mx-auto space-y-8"
            >
              <div className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-sm text-center space-y-6">
                <div className="relative inline-block">
                  <img 
                    src={profile?.photoURL || user?.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName || 'NOME'}&background=2563eb&color=fff`} 
                    className="w-24 h-24 rounded-full border-4 border-blue-50 mx-auto object-cover" 
                    referrerPolicy="no-referrer"
                    alt="Profile"
                  />
                  <div className={`absolute bottom-0 right-0 w-6 h-6 rounded-full border-4 border-white ${profile?.status === 'online' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight italic">{profile?.displayName || user.displayName}</h2>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">Entregador Parceiro</p>
                </div>
                
                <div className="space-y-4 text-left">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2">Dados do Veículo</h3>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="bg-slate-50 p-4 rounded-2xl space-y-1">
                      <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Tipo de Veículo</label>
                      <select 
                        value={profile?.vehicleType || 'Moto'}
                        onChange={(e) => setDoc(doc(db, 'users', user.uid), { vehicleType: e.target.value }, { merge: true })}
                        className="w-full bg-transparent font-bold text-sm outline-none"
                      >
                        <option value="Moto">Moto</option>
                        <option value="Carro">Carro</option>
                        <option value="Bike">Bike</option>
                      </select>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl space-y-1">
                      <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Modelo / Cor</label>
                      <input 
                        type="text"
                        placeholder="Ex: Honda CG 160 Preta"
                        value={profile?.vehicleColor || ''}
                        onChange={(e) => setDoc(doc(db, 'users', user.uid), { vehicleColor: e.target.value }, { merge: true })}
                        className="w-full bg-transparent font-bold text-sm outline-none"
                      />
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl space-y-1">
                      <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Placa</label>
                      <input 
                        type="text"
                        placeholder="ABC-1234"
                        value={profile?.vehiclePlate || ''}
                        onChange={(e) => setDoc(doc(db, 'users', user.uid), { vehiclePlate: e.target.value }, { merge: true })}
                        className="w-full bg-transparent font-bold text-sm outline-none uppercase"
                      />
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl space-y-1">
                      <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">WhatsApp</label>
                      <input 
                        type="tel"
                        placeholder="5511999999999"
                        value={profile?.whatsapp || ''}
                        onChange={(e) => setDoc(doc(db, 'users', user.uid), { whatsapp: e.target.value }, { merge: true })}
                        className="w-full bg-transparent font-bold text-sm outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-2xl">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Avaliação</p>
                    <p className="text-lg font-black text-blue-600">4.9</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nível</p>
                    <p className="text-lg font-black text-blue-600">Ouro</p>
                  </div>
                </div>
                <button 
                  onClick={signOut}
                  className="w-full bg-slate-100 text-slate-600 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-red-50 hover:text-red-600 transition-all"
                >
                  Sair da Conta
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-100 px-8 py-4 flex items-center justify-between safe-bottom z-50">
        <button 
          onClick={() => setView('orders')}
          className={`${view === 'orders' ? 'text-blue-600' : 'text-slate-400'} flex flex-col items-center space-y-1`}
        >
          <Bike size={20} />
          <span className="text-[10px] font-black uppercase tracking-widest">Entregas</span>
        </button>
        <button 
          onClick={() => setView('history')}
          className={`${view === 'history' ? 'text-blue-600' : 'text-slate-400'} flex flex-col items-center space-y-1`}
        >
          <Package size={20} />
          <span className="text-[10px] font-black uppercase tracking-widest">Ganhos</span>
        </button>
        <button 
          onClick={() => setView('profile')}
          className={`${view === 'profile' ? 'text-blue-600' : 'text-slate-400'} flex flex-col items-center space-y-1`}
        >
          <User size={20} />
          <span className="text-[10px] font-black uppercase tracking-widest">Perfil</span>
        </button>
      </nav>
    </div>
  );
};

export default CourierView;
