import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  setDoc,
  addDoc, 
  serverTimestamp,
  getDoc,
  orderBy,
  or,
  increment
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth, OperationType, handleFirestoreError } from '../AuthContext';
import { 
  Building2, 
  Users, 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  Search, 
  Plus, 
  Minus, 
  History,
  Clock,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  ToggleLeft,
  ToggleRight,
  Loader2,
  MapPin,
  Store,
  ShoppingBag,
  Key,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Branch {
  id: string;
  name: string;
  cityId: string;
  cityName?: string;
  createdAt: any;
  total_restaurantes?: number;
  ganhos_gerais?: number;
  recargas_pix?: number;
  recargas_manuais?: number;
  faturamento_hoje?: number;
  password?: string;
}

interface Restaurant {
  id: string;
  name: string;
  ownerUid: string;
  cityId: string;
  branchId?: string;
  isFamous?: boolean;
  subscriptionActive?: boolean;
  subscriptionDueDate?: any;
}

interface Wallet {
  id: string;
  ownerUid: string;
  balance: number;
}

interface Transaction {
  id: string;
  restaurantId: string;
  amount: number;
  type: 'credit' | 'debit' | 'subscription' | 'recharge';
  method: 'manual' | 'pix' | 'card';
  description: string;
  createdAt: any;
  branchId?: string;
  cityId?: string;
  cityName?: string;
}

const BranchPublicView: React.FC = () => {
  const { branchId } = useParams<{ branchId: string }>();
  const { user, profile, isGuest } = useAuth();
  const [branch, setBranch] = useState<Branch | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [wallets, setWallets] = useState<Record<string, Wallet>>({});
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateStart, setDateStart] = useState(new Date().toISOString().split('T')[0]);
  const [dateEnd, setDateEnd] = useState(new Date().toISOString().split('T')[0]);
  const [appliedDateStart, setAppliedDateStart] = useState(new Date().toISOString().split('T')[0]);
  const [appliedDateEnd, setAppliedDateEnd] = useState(new Date().toISOString().split('T')[0]);
  const [transactionFilter, setTransactionFilter] = useState<'all' | 'manual' | 'recharge' | 'subscription'>('all');
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  useEffect(() => {
    if (!branchId) return;

    const branchRef = doc(db, 'branches', branchId);
    const unsubscribeBranch = onSnapshot(branchRef, (doc) => {
      if (doc.exists()) {
        setBranch({ id: doc.id, ...doc.data() } as Branch);
      }
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.GET, `branches/${branchId}`));

    const qRestaurants = query(
      collection(db, 'restaurants'), 
      or(where('branchId', '==', branchId), where('city', '==', branch?.cityName || ''))
    );
    const unsubscribeRestaurants = onSnapshot(qRestaurants, (snapshot) => {
      const restData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Restaurant));
      setRestaurants(restData);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'restaurants'));

    let unsubscribeUsers = () => {};
    let unsubscribeOrders = () => {};
    let unsubscribeWallets = () => {};
    let unsubscribeTransactions = () => {};

    // Only attach sensitive listeners if user is authenticated and is admin
    // Guests (Public Admins) will not have access to these collections in Firestore
    if (profile?.role === 'admin' && !isGuest && user) {
      const qUsers = query(
        collection(db, 'users'),
        where('city', '==', branch?.cityName || '')
      );
      unsubscribeUsers = onSnapshot(qUsers, (snapshot) => {
        setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));

      const qOrders = query(
        collection(db, 'orders'),
        where('city', '==', branch?.cityName || '')
      );
      unsubscribeOrders = onSnapshot(qOrders, (snapshot) => {
        setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'orders'));

      unsubscribeWallets = onSnapshot(collection(db, 'wallets'), (snapshot) => {
        const walletMap: Record<string, Wallet> = {};
        snapshot.docs.forEach(doc => {
          const data = doc.data() as Wallet;
          walletMap[data.ownerUid] = { id: doc.id, ...data };
        });
        setWallets(walletMap);
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'wallets'));

      if (branchId) {
        const qTransactions = query(
          collection(db, 'wallet_transactions'), 
          or(where('branchId', '==', branchId), where('cityName', '==', branch?.cityName || '')),
          orderBy('createdAt', 'desc')
        );
        
        unsubscribeTransactions = onSnapshot(qTransactions, (snapshot) => {
          const transData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
          setTransactions(transData);
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'wallet_transactions'));
      }
    }

    return () => {
      unsubscribeBranch();
      unsubscribeRestaurants();
      unsubscribeUsers();
      unsubscribeOrders();
      unsubscribeWallets();
      unsubscribeTransactions();
    };
  }, [branchId, branch?.cityName]);

  const filteredRestaurants = useMemo(() => {
    return restaurants.filter(r => 
      r.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [restaurants, searchTerm]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesType = transactionFilter === 'all' || 
        (transactionFilter === 'manual' && t.method === 'manual') ||
        (transactionFilter === 'recharge' && (t.method === 'pix' || t.type === 'recharge')) ||
        (transactionFilter === 'subscription' && t.type === 'subscription');
      
      const tDateObj = t.timestamp?.toDate ? t.timestamp.toDate() : (t.createdAt?.toDate ? t.createdAt.toDate() : (t.date ? new Date(t.date) : null));
      if (!tDateObj) return matchesType;
      
      const transDate = tDateObj.toISOString().split('T')[0];
      const matchesDate = transDate >= appliedDateStart && transDate <= appliedDateEnd;
      
      return matchesType && matchesDate;
    });
  }, [transactions, transactionFilter, appliedDateStart, appliedDateEnd]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (o.status !== 'completed') return false;
      if (!o.createdAt) return true;
      const oDate = o.createdAt.toDate().toISOString().split('T')[0];
      return oDate >= appliedDateStart && oDate <= appliedDateEnd;
    });
  }, [orders, appliedDateStart, appliedDateEnd]);

  const stats = useMemo(() => {
    const totalRevenue = filteredTransactions
      .filter(t => t.type === 'recharge' || t.type === 'subscription')
      .reduce((acc, t) => acc + t.amount, 0);

    const orderRevenue = filteredOrders.reduce((acc, o) => acc + o.total, 0);

    const manualCredits = filteredTransactions
      .filter(t => t.method === 'manual' && (t.type === 'recharge' || t.type === 'credit'))
      .reduce((acc, t) => acc + t.amount, 0);

    const normalRecharges = filteredTransactions
      .filter(t => t.type === 'recharge' && t.method !== 'manual')
      .reduce((acc, t) => acc + t.amount, 0);

    const generalEarnings = manualCredits + normalRecharges;

    const subscriptionPayments = filteredTransactions
      .filter(t => t.type === 'subscription')
      .reduce((acc, t) => acc + t.amount, 0);
    
    return {
      restaurantCount: restaurants.length,
      customerCount: users.length,
      orderCount: filteredOrders.length,
      totalRevenue,
      orderRevenue,
      manualCredits,
      normalRecharges,
      generalEarnings,
      subscriptionPayments
    };
  }, [restaurants, users, filteredOrders, filteredTransactions]);

  const handleCreditAction = async (restaurant: Restaurant, amount: number, type: 'credit' | 'debit') => {
    try {
      const wallet = wallets[restaurant.ownerUid || restaurant.id];
      const finalAmount = type === 'credit' ? amount : -amount;

      if (wallet) {
        await updateDoc(doc(db, 'wallets', wallet.id), {
          balance: (wallet.balance || 0) + finalAmount,
          updatedAt: serverTimestamp()
        });
      } else {
        const targetUid = restaurant.ownerUid || restaurant.id;
        await setDoc(doc(db, 'wallets', targetUid), {
          ownerUid: targetUid,
          balance: finalAmount,
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp()
        }, { merge: true });
      }

      // Update branch totals
      if (branchId) {
        const branchRef = doc(db, 'branches', branchId);
        const incrementAmount = type === 'credit' ? amount : -amount;
        await updateDoc(branchRef, {
          recargas_manuais: increment(incrementAmount),
          ganhos_gerais: increment(incrementAmount),
          faturamento_hoje: increment(incrementAmount)
        });
      }

      await addDoc(collection(db, 'wallet_transactions'), {
        ownerUid: restaurant.ownerUid || restaurant.id,
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        branchId,
        cityId: branch?.cityId || '',
        cityName: branch?.cityName || '',
        amount: Math.abs(amount),
        type: type === 'credit' ? 'recharge' : 'deduction',
        method: 'manual',
        description: `Ajuste manual de saldo via filial`,
        adminUid: user?.uid || 'public_admin',
        adminEmail: user?.email || 'public@admin.com',
        createdAt: serverTimestamp(),
        timestamp: serverTimestamp(),
        date: new Date().toISOString().split('T')[0]
      });

      // Log the action in general logs
      await addDoc(collection(db, 'admin_logs'), {
        adminUid: user?.uid || 'public_admin',
        adminEmail: user?.email || 'public@admin.com',
        action: `${type === 'credit' ? 'Adicionou' : 'Removeu'} R$ ${amount.toFixed(2)} de crédito para o restaurante ${restaurant.name} via filial`,
        timestamp: serverTimestamp()
      });

    } catch (error) {
      console.error('Error updating credit:', error);
    }
  };

  const toggleSubscription = async (restaurant: Restaurant) => {
    try {
      const newStatus = !restaurant.subscriptionActive;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      await updateDoc(doc(db, 'restaurants', restaurant.id), {
        subscriptionActive: newStatus,
        subscriptionDueDate: newStatus ? dueDate : null
      });

      await addDoc(collection(db, 'wallet_transactions'), {
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        branchId,
        cityId: branch?.cityId || '',
        cityName: branch?.cityName || '',
        amount: 0,
        type: 'subscription',
        method: 'manual',
        description: `Assinatura ${newStatus ? 'ativada' : 'desativada'} via filial`,
        createdAt: serverTimestamp(),
        timestamp: serverTimestamp(),
        date: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      console.error('Error toggling subscription:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-blue animate-spin" />
      </div>
    );
  }

  if (!branch) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div>
          <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h1 className="text-2xl font-black text-slate-900 mb-2">Filial não encontrada</h1>
          <p className="text-slate-500">O link que você acessou pode estar incorreto ou a filial foi removida.</p>
        </div>
      </div>
    );
  }

  if (!isPasswordVerified && branch.password) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-slate-900 rounded-[3rem] p-10 border border-white/10 shadow-2xl text-center space-y-8"
        >
          <div className="w-20 h-20 bg-blue-600/20 rounded-[2rem] flex items-center justify-center text-blue-400 mx-auto">
            <Lock size={40} />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white uppercase tracking-tight italic">Acesso Restrito</h2>
            <p className="text-sm font-bold text-white/40 uppercase tracking-widest">Informe sua senha de sócio</p>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
              <input 
                type="password"
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setPasswordError(false);
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    if (passwordInput === branch.password) {
                      setIsPasswordVerified(true);
                    } else {
                      setPasswordError(true);
                    }
                  }
                }}
                placeholder="Sua senha..."
                className={`w-full bg-white/5 border ${passwordError ? 'border-red-500/50' : 'border-white/10'} rounded-2xl py-4 pl-12 pr-4 text-white font-bold focus:border-blue-500/50 transition-all outline-none`}
              />
            </div>
            
            {passwordError && (
              <motion.p 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[10px] font-black uppercase tracking-widest text-red-400"
              >
                Senha incorreta. Tente novamente.
              </motion.p>
            )}

            <button 
              onClick={() => {
                if (passwordInput === branch.password) {
                  setIsPasswordVerified(true);
                } else {
                  setPasswordError(true);
                }
              }}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 active:scale-95"
            >
              Entrar no Painel
            </button>
          </div>

          <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest leading-relaxed">
            Se você esqueceu sua senha, entre em contato com o administrador do sistema.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-brand-blue/10 rounded-2xl flex items-center justify-center text-brand-blue">
                <Building2 size={24} />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900 leading-tight">{branch.name}</h1>
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <MapPin size={10} />
                  Filial ID: {branch.id.slice(0, 8)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-brand-blue/10 rounded-2xl text-brand-blue">
                <Users size={20} />
              </div>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Clientes</h3>
            </div>
            <p className="text-3xl font-black text-slate-900">{stats.customerCount}</p>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-brand-blue/10 rounded-2xl text-brand-blue">
                <Store size={20} />
              </div>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Restaurantes</h3>
            </div>
            <p className="text-3xl font-black text-slate-900">{branch.total_restaurantes || stats.restaurantCount}</p>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-purple-100 rounded-2xl text-purple-600">
                <ShoppingBag size={20} />
              </div>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pedidos (Período)</h3>
            </div>
            <p className="text-3xl font-black text-slate-900">{stats.orderCount}</p>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-emerald-100 rounded-2xl text-emerald-600">
                <TrendingUp size={20} />
              </div>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vendas (Período)</h3>
            </div>
            <p className="text-3xl font-black text-slate-900">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.orderRevenue)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-emerald-100 rounded-2xl text-emerald-600">
                <TrendingUp size={20} />
              </div>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ganhos Gerais (Recargas)</h3>
            </div>
            <p className="text-3xl font-black text-slate-900">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(branch.ganhos_gerais || stats.generalEarnings)}
            </p>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-blue-100 rounded-2xl text-blue-600">
                <TrendingUp size={20} />
              </div>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Recargas PIX</h3>
            </div>
            <p className="text-3xl font-black text-slate-900">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(branch.recargas_pix || stats.normalRecharges)}
            </p>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-amber-100 rounded-2xl text-amber-600">
                <DollarSign size={20} />
              </div>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Créditos Manuais</h3>
            </div>
            <p className="text-3xl font-black text-slate-900">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(branch.recargas_manuais || stats.manualCredits)}
            </p>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-purple-100 rounded-2xl text-purple-600">
                <Calendar size={20} />
              </div>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Faturamento Hoje</h3>
            </div>
            <p className="text-3xl font-black text-slate-900">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(branch.faturamento_hoje || 0)}
            </p>
          </div>
        </div>

        {/* Date Filter Bar */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm mb-8">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-brand-blue/10 rounded-2xl text-brand-blue">
                <Calendar size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Faturamento por Período</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Selecione as datas para filtrar</p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Início</label>
                  <input 
                    type="date" 
                    value={dateStart}
                    onChange={(e) => setDateStart(e.target.value)}
                    className="text-xs font-bold bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-blue/20 transition-all"
                  />
                </div>
                <div className="h-px w-4 bg-slate-200 mt-4"></div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Fim</label>
                  <input 
                    type="date" 
                    value={dateEnd}
                    onChange={(e) => setDateEnd(e.target.value)}
                    className="text-xs font-bold bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-blue/20 transition-all"
                  />
                </div>
              </div>
              
              <button 
                onClick={() => {
                  setAppliedDateStart(dateStart);
                  setAppliedDateEnd(dateEnd);
                }}
                className="flex items-center gap-2 px-6 py-2.5 bg-brand-blue text-white rounded-xl text-xs font-black hover:bg-brand-blue/90 transition-all shadow-lg shadow-brand-blue/20 active:scale-95 mt-4 sm:mt-0"
              >
                <Search size={16} />
                PESQUISAR
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Restaurants List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900">Gestão de Restaurantes</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text"
                  placeholder="Buscar restaurante..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-white border border-slate-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {filteredRestaurants.map((restaurant, idx) => (
                <div key={`${restaurant.id}-${idx}`} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="font-black text-slate-900">{restaurant.name}</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID: {restaurant.id.slice(0, 8)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Saldo Atual</p>
                      <p className="text-xl font-black text-brand-blue">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(wallets[restaurant.ownerUid || restaurant.id]?.balance || 0)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {profile?.role === 'admin' && (
                      <div className="space-y-3">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ações Rápidas</p>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => {
                              const amount = prompt('Valor para adicionar:');
                              if (amount) handleCreditAction(restaurant, parseFloat(amount), 'credit');
                            }}
                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-50 text-emerald-600 rounded-2xl text-xs font-black hover:bg-emerald-100 transition-colors"
                          >
                            <Plus size={16} />
                            Adicionar
                          </button>
                          <button 
                            onClick={() => {
                              const amount = prompt('Valor para retirar:');
                              if (amount) handleCreditAction(restaurant, parseFloat(amount), 'debit');
                            }}
                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-50 text-red-600 rounded-2xl text-xs font-black hover:bg-red-100 transition-colors"
                          >
                            <Minus size={16} />
                            Retirar
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mensalidade</p>
                      <button 
                        onClick={() => toggleSubscription(restaurant)}
                        className={`w-full flex items-center justify-between p-3 rounded-2xl border-2 transition-all ${
                          restaurant.subscriptionActive 
                            ? 'border-brand-blue bg-brand-blue/5 text-brand-blue' 
                            : 'border-slate-100 bg-slate-50 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Calendar size={16} />
                          <span className="text-xs font-black uppercase tracking-widest">
                            {restaurant.subscriptionActive ? 'Ativa' : 'Inativa'}
                          </span>
                        </div>
                        {restaurant.subscriptionActive ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Transaction History */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900">Histórico</h2>
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-slate-400" />
                <select 
                  value={transactionFilter}
                  onChange={(e) => setTransactionFilter(e.target.value as any)}
                  className="bg-transparent border-none text-[11px] font-black uppercase tracking-widest text-slate-500 outline-none cursor-pointer"
                >
                  <option value="all">Todos</option>
                  <option value="manual">Manual</option>
                  <option value="recharge">Recargas</option>
                  <option value="subscription">Mensalidades</option>
                </select>
              </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
              <div className="max-h-[600px] overflow-y-auto p-4 space-y-4">
                {filteredTransactions.length === 0 ? (
                  <div className="py-12 text-center">
                    <History className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Nenhuma transação</p>
                  </div>
                ) : (
                  filteredTransactions.map((t, idx) => {
                    const tDateObj = t.timestamp?.toDate ? t.timestamp.toDate() : (t.createdAt?.toDate ? t.createdAt.toDate() : (t.date ? new Date(t.date) : null));
                    const displayDate = tDateObj ? tDateObj.toLocaleString('pt-BR') : 'N/A';
                    const isPositive = t.type === 'recharge' || t.type === 'subscription' || t.amount > 0;
                    
                    return (
                      <div key={`${t.id}-${idx}`} className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl">
                        <div className={`p-2 rounded-xl ${
                          isPositive ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                        }`}>
                          {isPositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs font-black text-slate-900 truncate">
                              {restaurants.find(r => r.id === t.restaurantId)?.name || t.restaurantName || 'Restaurante'}
                            </p>
                            <p className={`text-xs font-black ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                              {isPositive ? '+' : '-'}
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(t.amount))}
                            </p>
                          </div>
                          <p className="text-[10px] font-bold text-slate-500 mb-2">{t.description}</p>
                          <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-widest text-slate-400">
                            <div className="flex items-center gap-1">
                              <Clock size={10} />
                              {displayDate}
                            </div>
                            <div className="flex items-center gap-1">
                              <Filter size={10} />
                              {t.method || t.type}
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin size={10} />
                              {t.cityName || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BranchPublicView;
