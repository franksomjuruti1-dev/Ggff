import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  getDoc,
  getDocs 
} from 'firebase/firestore';
import { useAuth, OperationType, handleFirestoreError } from '../AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Utensils, Clock, AlertCircle, ShoppingBag } from 'lucide-react';
import { getRestaurantStatus, isTimeInRange, getPortoVelhoTime } from '../utils/hours';

interface Restaurant {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  openingHours: string;
  closingHours: string;
  weeklyHours?: any;
  status: string;
  isWalletBlocked?: boolean;
}

interface FoodItem {
  id: string;
  name: string;
  description: string;
  price: number;
  promoPrice?: number;
  imageUrl: string;
  available: boolean;
  category: string;
  availability?: any;
}

const StoreFront: React.FC = () => {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [activeCategory, setActiveCategory] = useState('Todos');

  // Real-time clock update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!restaurantId) return;

    const fetchData = async () => {
      try {
        const resSnap = await getDoc(doc(db, 'restaurants', restaurantId));
        if (resSnap.exists()) {
          const data = { id: resSnap.id, ...resSnap.data() } as Restaurant;
          setRestaurant(data);
          document.title = data.name;
          setIsOpen(getRestaurantStatus(data, currentTime).isOpen);
        }

        const q = query(collection(db, 'food_items'), where('restaurantId', '==', restaurantId));
        const itemsSnap = await getDocs(q);
        setFoodItems(itemsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as FoodItem)));
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `restaurants/${restaurantId}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [restaurantId]);

  useEffect(() => {
    if (restaurant) {
      const status = getRestaurantStatus(restaurant, currentTime);
      setIsOpen(status.isOpen);
    }
  }, [restaurant, currentTime]);

  const checkIfOpen = (res: Restaurant) => {
    setIsOpen(getRestaurantStatus(res).isOpen);
  };

  const isProductAvailable = (item: FoodItem) => {
    if (!item.available) return false;
    
    // ABSOLUTE MANUAL PRIORITY: If restaurant is active (manual override), 
    // it ignores product weekly hours/availability schedules.
    if (restaurant?.status === 'active') {
      return true;
    }
    
    // Normalize to Porto Velho Time
    const nowPV = getPortoVelhoTime(currentTime);
    
    if (item.availability) {
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const todayKey = days[nowPV.getDay()];
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
    
    return true;
  };

  if (loading) {
    return null;
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-white">
        <AlertCircle size={64} className="text-slate-200 mb-4" />
        <h1 className="text-2xl font-bold text-slate-800">Loja não encontrada</h1>
        <p className="text-slate-500">O link que você acessou pode estar incorreto ou a loja foi removida.</p>
      </div>
    );
  }

  if (restaurant.isWalletBlocked) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-10 text-center space-y-6">
        <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center shadow-inner">
          <AlertCircle size={40} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black uppercase tracking-tighter italic">Vendas Indisponíveis</h2>
          <p className="text-slate-500 max-w-sm font-medium">Este estabelecimento está temporariamente indisponível para receber novos pedidos.</p>
        </div>
        <button 
          onClick={() => window.history.back()}
          className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-slate-800 transition-colors"
        >
          Voltar para Início
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header / Logo */}
      <header className="bg-white pt-12 pb-8 px-4 shadow-sm">
        <div className="max-w-4xl mx-auto flex flex-col items-center">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-xl mb-6 bg-slate-100"
          >
            <img 
              src={restaurant.imageUrl || 'https://picsum.photos/seed/restaurant/400/400'} 
              alt={restaurant.name}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </motion.div>
          <h1 className="text-lg md:text-3xl font-black uppercase tracking-tighter italic text-slate-900 text-center mb-2 break-words max-w-full">
            {restaurant.name}
          </h1>
          <p className="text-slate-500 text-center max-w-md mb-4 font-medium">
            {restaurant.description}
          </p>

          {!isOpen && (
            <div className="bg-red-50 text-red-600 px-6 py-2 rounded-full flex items-center space-x-2 border border-red-100">
              <Clock size={18} />
              <span className="font-bold uppercase tracking-widest text-xs">Loja Fechada no Momento</span>
            </div>
          )}
        </div>
      </header>

      {/* Categories Section */}
      {foodItems.length > 0 && (
        <div className="bg-white sticky top-0 z-30 shadow-sm border-b border-slate-100 overflow-x-auto no-scrollbar">
          <div className="max-w-4xl mx-auto px-4 py-4 flex space-x-4">
            <button
              onClick={() => {
                setActiveCategory('Todos');
                window.scrollTo({ top: 400, behavior: 'smooth' });
              }}
              className={`flex-shrink-0 px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${activeCategory === 'Todos' ? 'bg-brand-blue text-white shadow-lg shadow-blue-500/20' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
            >
              Todos
            </button>
            {Array.from(new Set(foodItems.map(item => item.category || 'Geral'))).map((category, cIdx) => (
              <button
                key={`cat-btn-${category}-${cIdx}`}
                onClick={() => {
                  setActiveCategory(category);
                  const element = document.getElementById(`category-${category}`);
                  if (element) {
                    const offset = 100;
                    const bodyRect = document.body.getBoundingClientRect().top;
                    const elementRect = element.getBoundingClientRect().top;
                    const elementPosition = elementRect - bodyRect;
                    const offsetPosition = elementPosition - offset;
                    window.scrollTo({
                      top: offsetPosition,
                      behavior: 'smooth'
                    });
                  }
                }}
                className={`flex-shrink-0 px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${activeCategory === category ? 'bg-brand-blue text-white shadow-lg shadow-blue-500/20' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Products Section */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        {foodItems.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
            <ShoppingBag size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-400 font-medium italic">Esta empresa ainda não adicionou produtos ao cardápio.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {Array.from(new Set(foodItems.map(item => item.category || 'Geral'))).map((category, cIdx) => (
              <div key={`cat-section-${category}-${cIdx}`} id={`category-${category}`} className="space-y-6 scroll-mt-24">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black uppercase tracking-tight italic text-slate-800">{category}</h2>
                  <div className="h-px flex-grow bg-slate-200 ml-4"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {foodItems.filter(item => (item.category || 'Geral') === category).map((item, idx) => (
                    <motion.div 
                      key={`food-item-${item.id}-${idx}`}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      className="bg-white p-4 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow flex space-x-4 border border-slate-100 group"
                    >
                      <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 bg-slate-100">
                        <img 
                          src={item.imageUrl || 'https://picsum.photos/seed/food/200/200'} 
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="flex-grow flex flex-col justify-between py-1">
                        <div>
                          <h3 className="font-bold text-slate-900 leading-tight mb-1">{item.name}</h3>
                          <p className="text-xs text-slate-500 line-clamp-2">{item.description}</p>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex flex-col">
                            {item.promoPrice ? (
                              <>
                                <span className="text-xs text-slate-400 line-through">R$ {item.price.toFixed(2)}</span>
                                <span className="text-lg font-black text-emerald-600 italic">R$ {item.promoPrice.toFixed(2)}</span>
                              </>
                            ) : (
                              <span className="text-lg font-black text-slate-900 italic">R$ {item.price.toFixed(2)}</span>
                            )}
                          </div>
                          {!isProductAvailable(item) && (
                            <span className="text-[10px] font-bold uppercase tracking-widest text-red-500 bg-red-50 px-2 py-1 rounded-lg">Indisponível</span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-12 text-center text-slate-400 text-xs font-medium uppercase tracking-widest">
        &copy; {new Date().getFullYear()} {restaurant.name} - Todos os direitos reservados
      </footer>
    </div>
  );
};

export default StoreFront;
