import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { X, Navigation, Car, Bike, Clock, MapPin, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';

// Custom icons
const createCustomIcon = (iconUrl: string) => L.icon({
  iconUrl,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  shadowSize: [41, 41],
  shadowAnchor: [12, 41]
});

const CarIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/744/744465.png', // Nice car icon
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20]
});

const DestinationIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

const RestaurantIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

interface MapTrackingModalProps {
  id_mch: string;
  orderId: string;
  cityConfig: {
    apiUrl: string;
    apiKey: string;
    authEmail?: string;
    authPassword?: string;
  };
  onClose: () => void;
  destLocation?: { lat: number; lng: number };
  originLocation?: { lat: number; lng: number };
}

const MapRefresher = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
    map.invalidateSize();
  }, [center, map]);
  return null;
};

const MapTrackingModal: React.FC<MapTrackingModalProps> = ({ 
  id_mch, 
  cityConfig, 
  onClose, 
  destLocation, 
  originLocation 
}) => {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [status, setStatus] = useState<string>('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollInterval = useRef<any>(null);

  const fetchStatusAndPosition = async () => {
    try {
      // 1. Check Status
      const statusRes = await axios.get('/api/machine/solicitacaoStatus', {
        params: {
          apiUrl: cityConfig.apiUrl,
          apiKey: cityConfig.apiKey,
          authEmail: cityConfig.authEmail,
          authPassword: cityConfig.authPassword,
          id_mch
        }
      });

      if (statusRes.data.success) {
        const currentStatus = statusRes.data.response?.status;
        setStatus(currentStatus);

        // 2. If Accepted (A) or In Progress (E), get position
        if (currentStatus === 'A' || currentStatus === 'E') {
          const posRes = await axios.get('/api/machine/posicaoCondutor', {
            params: {
              apiUrl: cityConfig.apiUrl,
              apiKey: cityConfig.apiKey,
              authEmail: cityConfig.authEmail,
              authPassword: cityConfig.authPassword,
              id_mch
            }
          });

          if (posRes.data.success && posRes.data.response) {
            const { lat_condutor, lng_condutor } = posRes.data.response;
            if (lat_condutor && lng_condutor) {
              const lat = Number(lat_condutor);
              const lng = Number(lng_condutor);
              if (!isNaN(lat) && !isNaN(lng)) {
                setPosition([lat, lng]);
              }
            }
          }
        } else if (currentStatus === 'F' || currentStatus === 'C') {
          // Completed or Cancelled
          clearInterval(pollInterval.current);
        }
      }
      setLoading(false);
    } catch (err: any) {
      console.error("[Tracking] Error polling:", err);
      // Don't stop polling on single error, might be transient
    }
  };

  useEffect(() => {
    fetchStatusAndPosition();
    pollInterval.current = setInterval(fetchStatusAndPosition, 10000);
    return () => clearInterval(pollInterval.current);
  }, [id_mch]);

  const mapCenter = position || (destLocation ? [destLocation.lat, destLocation.lng] : [-2.5, -44.3]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-10 pointer-events-auto">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white w-full max-w-5xl h-full max-h-[85vh] rounded-[3rem] overflow-hidden shadow-2xl relative flex flex-col"
      >
        {/* Header */}
        <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between bg-blue-gradient text-white flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
              <Navigation className="animate-pulse" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black uppercase tracking-tight italic">Rastreio em Tempo Real</h3>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Acompanhe a localização do seu motorista</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Map Area */}
        <div className="flex-1 relative bg-slate-100">
          {loading && !position ? (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="animate-spin text-brand-blue" size={48} />
              <p className="text-sm font-black uppercase tracking-widest text-slate-400">Buscando Sinal do GPS...</p>
            </div>
          ) : null}

          {status === 'C' && (
            <div className="absolute inset-0 z-20 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center p-10 text-center space-y-4">
              <AlertCircle className="text-red-500" size={64} />
              <h4 className="text-2xl font-black uppercase tracking-tight italic">Corrida Cancelada</h4>
              <p className="text-slate-500 max-w-xs">O rastreio foi encerrado pois a solicitação foi cancelada.</p>
              <button onClick={onClose} className="bg-red-500 text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs">Fechar</button>
            </div>
          )}

          <MapContainer 
            center={mapCenter as [number, number]} 
            zoom={15} 
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ZoomControl position="bottomright" />
            
            {position && (
              <Marker position={position} icon={CarIcon}>
                <Popup>
                  <div className="font-black uppercase text-[10px] tracking-widest text-brand-blue">Motorista</div>
                </Popup>
                <MapRefresher center={position} />
              </Marker>
            )}

            {destLocation && (
              <Marker position={[destLocation.lat, destLocation.lng]} icon={DestinationIcon}>
                <Popup>
                  <div className="font-black uppercase text-[10px] tracking-widest text-red-500">Sua Localização</div>
                </Popup>
              </Marker>
            )}

            {originLocation && (
              <Marker position={[originLocation.lat, originLocation.lng]} icon={RestaurantIcon}>
                <Popup>
                  <div className="font-black uppercase text-[10px] tracking-widest text-orange-500">Restaurante</div>
                </Popup>
              </Marker>
            )}
          </MapContainer>

          {/* Info Card Overlay */}
          <div className="absolute bottom-6 left-6 right-6 z-[1000] pointer-events-none">
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-white/90 backdrop-blur-xl p-6 rounded-[2.5rem] shadow-2xl border border-white gap-6 grid grid-cols-1 md:grid-cols-3 pointer-events-auto"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600">
                  <Car size={24} />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Status</p>
                  <p className="text-sm font-black uppercase italic text-emerald-600">
                    {status === 'A' ? 'A caminho da Coleta' : status === 'E' ? 'Em Entrega' : 'Finalizado'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 border-l border-slate-100 pl-6 h-12">
                <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-brand-blue">
                  <Clock size={24} />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Atualização</p>
                  <p className="text-sm font-black uppercase italic text-brand-blue">A cada 5 seg</p>
                </div>
              </div>

              <div className="flex items-center gap-4 border-l border-slate-100 pl-6">
                <div className="w-10 h-10 bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-600">
                  <MapPin size={20} />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Conexão</p>
                  <p className="text-sm font-black uppercase italic text-orange-600">GPS Estável</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 flex items-center justify-center space-x-2 flex-shrink-0">
          <div className="flex items-center space-x-1.5 bg-emerald-500/10 px-3 py-1.5 rounded-full">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Localização em Tempo Real</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default MapTrackingModal;
