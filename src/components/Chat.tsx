import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  doc,
  query, 
  where, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { useAuth, OperationType, handleFirestoreError } from '../AuthContext';
import { Send, MessageSquare, X, Image as ImageIcon, Mic, Paperclip, Play, Square, MapPin, Share2, Zap, CreditCard, DollarSign, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { playSound } from '../utils/sounds';

export interface Message {
  id: string;
  orderId: string;
  senderUid: string;
  senderName: string;
  senderPhotoUrl?: string;
  text?: string;
  imageUrl?: string;
  audioUrl?: string;
  location?: { latitude: number; longitude: number };
  createdAt: any;
}

interface ChatProps {
  orderId: string;
  orderStatus: string;
  onClose?: () => void;
}

const Chat: React.FC<ChatProps> = ({ orderId, orderStatus, onClose }) => {
  const { user, profile, managerData, globalSettings } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [orderData, setOrderData] = useState<any>(null);
  const [customerProfile, setCustomerProfile] = useState<any>(null);
  const [restaurantData, setRestaurantData] = useState<any>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isBalanceLow, setIsBalanceLow] = useState(false);
  const isFinalized = ['delivered', 'rejected', 'cancelled'].includes(orderStatus);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const recordingInterval = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isInitialLoad = useRef(true);

  useEffect(() => {
    if (isRecording) {
      recordingInterval.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (recordingInterval.current) clearInterval(recordingInterval.current);
      setRecordingDuration(0);
    }
    return () => {
      if (recordingInterval.current) clearInterval(recordingInterval.current);
    };
  }, [isRecording]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (profile?.role === 'manager') {
      const wallet = managerData?.wallet;
      const minBalance = globalSettings?.minWalletBalance ?? 5;
      const isAdmin = profile?.role === 'admin';
      
      // If not admin and balance is low
      if (!isAdmin && (!wallet || wallet.balance < minBalance)) {
        // Only restrict if order is still pending
        if (orderStatus === 'pending') {
          setIsBalanceLow(true);
        } else {
          setIsBalanceLow(false);
        }
      } else {
        setIsBalanceLow(false);
      }
    } else {
      setIsBalanceLow(false);
    }
  }, [profile?.role, managerData?.wallet, globalSettings?.minWalletBalance, orderStatus]);

  useEffect(() => {
    if (!orderId) return;

    // 1. Listen to Order
    const orderRef = doc(db, 'orders', orderId);
    const unsubOrder = onSnapshot(orderRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setOrderData(data);

        // 2. Listen to Restaurant
        if (data.restaurantId) {
          const resRef = doc(db, 'restaurants', data.restaurantId);
          onSnapshot(resRef, (resSnap) => {
            if (resSnap.exists()) setRestaurantData({ id: resSnap.id, ...resSnap.data() });
          });
        }

        // 3. Listen to Customer Profile
        if (data.customerUid) {
          const userRef = doc(db, 'users', data.customerUid);
          onSnapshot(userRef, (userSnap) => {
            if (userSnap.exists()) setCustomerProfile({ id: userSnap.id, ...userSnap.data() });
          });
        }
      }
    });

    return () => unsubOrder();
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return;

    const messagesRef = collection(db, 'orders', orderId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      
      if (!isInitialLoad.current && data.length > messages.length) {
        const lastMsg = data[data.length - 1];
        if (lastMsg.senderUid !== user?.uid) {
          playSound('message');
        }
      }
      setMessages(data);
      isInitialLoad.current = false;
    }, (err) => handleFirestoreError(err, OperationType.LIST, `orders/${orderId}/messages`));

    return () => unsubscribe();
  }, [orderId, user?.uid, messages.length]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (text?: string, imageUrl?: string, audioUrl?: string, location?: { latitude: number; longitude: number }) => {
    if (!user || (!text?.trim() && !imageUrl && !audioUrl && !location)) return;

    if (isFinalized) return;

    if (isBalanceLow) {
      const minBalance = globalSettings?.minWalletBalance ?? 5;
      alert(`Saldo insuficiente (Mínimo R$ ${minBalance.toFixed(2)}). Recarregue para enviar mensagens em pedidos pendentes.`);
      return;
    }

    try {
      const photoURL = profile?.role === 'manager' 
        ? (managerData?.restaurant?.imageUrl || profile?.photoURL)
        : profile?.photoURL;

      const messagesRef = collection(db, 'orders', orderId, 'messages');
      await addDoc(messagesRef, {
        orderId: orderId,
        senderUid: user.uid,
        senderName: profile?.displayName || 'Usuário',
        senderPhotoUrl: photoURL || null,
        text: text?.trim() || null,
        imageUrl: imageUrl || null,
        audioUrl: audioUrl || null,
        location: location || null,
        createdAt: serverTimestamp()
      });
      
      setNewMessage('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `orders/${orderId}/messages`);
    }
  };

  const handleSendLocation = () => {
    if ("geolocation" in navigator) {
      console.log("[Chat] Requesting geolocation...");
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log(`[Chat] Geolocation success: ${latitude}, ${longitude}`);
          handleSendMessage(undefined, undefined, undefined, { latitude, longitude });
        },
        (error) => {
          console.error("[Chat] Error getting location:", error);
          if (error.code === error.TIMEOUT) {
            console.log("[Chat] Geolocation timeout, retrying with low accuracy...");
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                const { latitude, longitude } = pos.coords;
                handleSendMessage(undefined, undefined, undefined, { latitude, longitude });
              },
              (err2) => {
                alert("Não foi possível obter sua localização. Verifique as permissões do navegador.");
              },
              { enableHighAccuracy: false, timeout: 15000, maximumAge: 30000 }
            );
          } else {
            alert("Não foi possível obter sua localização. Verifique se o GPS está ligado e se o navegador tem permissão.");
          }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    } else {
      alert("Seu navegador não suporta geolocalização.");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleSendMessage(undefined, reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      stopRecording();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (e) => {
        audioChunks.current.push(e.data);
      };

      mediaRecorder.current.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          handleSendMessage(undefined, undefined, reader.result as string);
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Não foi possível acessar o microfone. Verifique as permissões.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
      
      // Stop all tracks in the stream
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  // No longer returning null for pending/rejected to allow manager to chat at any stage

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col h-[80vh]"
      >
        <div className="bg-blue-gradient p-6 text-white flex flex-col relative overflow-hidden">
          <div className="flex items-center justify-between mb-4 z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md overflow-hidden border border-white/30 flex-shrink-0">
                {restaurantData?.imageUrl || restaurantData?.logoUrl ? (
                  <img src={restaurantData.imageUrl || restaurantData.logoUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-black text-lg">
                    {restaurantData?.name?.charAt(0).toUpperCase() || 'E'}
                  </div>
                )}
              </div>
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 leading-none mb-1">Chat da Empresa</h4>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-black uppercase italic tracking-tight truncate max-w-[120px]">
                    {restaurantData?.name || 'Carregando...'}
                  </p>
                  {restaurantData?.phone && (
                    <a 
                      href={`tel:${restaurantData.phone}`}
                      className="flex items-center gap-1 bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest transition-all"
                    >
                      <Share2 size={10} />
                      <span>Ligar</span>
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {profile?.role === 'manager' && orderData?.paymentMethod && (
                <motion.div 
                  animate={{ opacity: [1, 0.8, 1], scale: [1, 1.05, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  className={`px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-lg border border-white/20 ${
                    orderData.paymentMethod === 'pix' ? 'bg-blue-500' : 'bg-orange-500'
                  }`}
                >
                  {orderData.paymentMethod === 'pix' ? <Zap size={12} fill="currentColor" /> : 
                   orderData.paymentMethod === 'card' ? <CreditCard size={12} /> : 
                   <DollarSign size={12} />}
                  <span className="text-[10px] font-black uppercase tracking-tighter italic">
                    {orderData.paymentMethod === 'pix' ? 'Pix' : 
                     orderData.paymentMethod === 'card' ? 'Cartão' : 
                     'Dinheiro'}
                  </span>
                </motion.div>
              )}
              <button 
                onClick={onClose}
                className="p-2 bg-white/20 hover:bg-white/40 rounded-full transition-all"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="z-10 bg-black/10 rounded-2xl p-3 border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Seu Pedido #{orderId.slice(-6).toUpperCase()}</span>
              <span className="text-xs font-black italic text-emerald-300">R$ {orderData?.total?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="max-h-12 overflow-y-auto no-scrollbar">
              <p className="text-[9px] font-bold opacity-80 text-white/90 leading-relaxed uppercase">
                {orderData?.items?.map((item: any) => `${item.quantity}x ${item.name}`).join(', ') || 'Processando itens...'}
              </p>
            </div>
          </div>
        </div>

        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar bg-slate-50"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4">
              <MessageSquare size={48} strokeWidth={1} />
              <p className="text-center text-[10px] font-black uppercase tracking-widest">Inicie a conversa...</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderUid === user?.uid;
              // The user wants the viewer (me) on the LEFT and the other person on the RIGHT.
              const isRight = !isMe;

              // Determine live photo
              const isCustomer = msg.senderUid === orderData?.customerUid;
              const livePhoto = isCustomer ? customerProfile?.photoURL : restaurantData?.imageUrl;
              const photoToUse = livePhoto || msg.senderPhotoUrl;
              
              const liveName = isCustomer ? customerProfile?.displayName : restaurantData?.name;
              const nameToUse = liveName || msg.senderName;

              return (
                <div 
                  key={msg.id}
                  className={`flex flex-col ${isRight ? 'items-end' : 'items-start'}`}
                >
                  <div className={`flex items-end space-x-2 max-w-[90%] ${isRight ? 'flex-row-reverse space-x-reverse' : 'flex-row'}`}>
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-200 flex-shrink-0 mb-1 border-2 border-white shadow-sm">
                      {photoToUse ? (
                        <img src={photoToUse} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-600 font-bold text-[10px]">
                          {nameToUse.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    
                    <div className={`flex flex-col ${isRight ? 'items-end' : 'items-start'}`}>
                      <span className="text-[8px] text-slate-400 font-black uppercase tracking-widest mb-1 px-1">
                        {isMe ? 'Você' : nameToUse}
                      </span>
                      <div className={`px-4 py-3 rounded-2xl text-xs font-medium shadow-sm space-y-2 ${
                        isRight 
                          ? 'bg-white text-slate-700 rounded-tr-none border border-slate-100' 
                          : 'bg-blue-600 text-white rounded-tl-none'
                      }`}>
                        {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
                        {msg.pixInfo && (
                          <div className={`mt-2 p-3 rounded-xl border flex items-center justify-between gap-3 ${isRight ? 'bg-slate-50 border-slate-200' : 'bg-blue-700/50 border-blue-400/30'}`}>
                            <div className="flex-1 min-w-0">
                              <p className="text-[8px] font-black uppercase tracking-widest opacity-60 mb-0.5">Chave Pix</p>
                              <p className="font-mono text-[10px] break-all">{msg.pixInfo.key}</p>
                            </div>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(msg.pixInfo!.key);
                                alert('copiado com sucesso vai a seu banco e pague');
                              }}
                              className={`p-2 rounded-lg transition-all ${isRight ? 'bg-white hover:bg-slate-100 text-blue-600' : 'bg-blue-500 hover:bg-blue-400 text-white'}`}
                              title="Copiar Chave"
                            >
                              <Copy size={14} />
                            </button>
                          </div>
                        )}
                        {msg.imageUrl && (
                          <img 
                            src={msg.imageUrl} 
                            className="rounded-xl max-w-full h-auto border border-white/10" 
                            alt="Shared"
                            referrerPolicy="no-referrer"
                          />
                        )}
                        {msg.audioUrl && (
                          <audio controls className="h-8 max-w-full">
                            <source src={msg.audioUrl} type="audio/webm" />
                          </audio>
                        )}
                        {msg.location && (
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2 bg-white/10 p-2 rounded-xl">
                              <MapPin size={16} />
                              <span className="text-[10px] font-bold uppercase tracking-widest">Localização em Tempo Real</span>
                            </div>
                            <a 
                              href={`https://www.openstreetmap.org/?mlat=${msg.location.latitude}&mlon=${msg.location.longitude}#map=18/${msg.location.latitude}/${msg.location.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex items-center justify-center space-x-2 w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                isRight 
                                  ? 'bg-blue-600 text-white' 
                                  : 'bg-white text-blue-600'
                              }`}
                            >
                              <Play size={12} />
                              <span>Ver Localização</span>
                            </a>
                            {profile?.role === 'manager' && (
                              <button 
                                onClick={() => {
                                  const url = `https://www.openstreetmap.org/?mlat=${msg.location?.latitude}&mlon=${msg.location?.longitude}#map=18/${msg.location?.latitude}/${msg.location?.longitude}`;
                                  if (navigator.share) {
                                    navigator.share({
                                      title: 'Localização do Cliente',
                                      text: 'Veja a localização exata do cliente:',
                                      url: url
                                    });
                                  } else {
                                    navigator.clipboard.writeText(url);
                                    alert("Link copiado para a área de transferência!");
                                  }
                                }}
                                className={`flex items-center justify-center space-x-2 w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                                  isRight 
                                    ? 'border-blue-100 hover:bg-blue-50' 
                                    : 'border-white/20 hover:bg-white/10'
                                }`}
                              >
                                <Share2 size={12} />
                                <span>Compartilhar</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-6 bg-white border-t border-slate-100">
          {isFinalized ? (
            <div className="flex items-center justify-center py-2 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">
                Pedido finalizado. Chat disponível apenas para visualização.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {isRecording && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex flex-col items-center justify-center space-y-3 pb-4"
                  >
                    <div className="flex items-center gap-1 h-8">
                      {[...Array(12)].map((_, i) => (
                        <motion.div
                          key={`bar-${i}`}
                          animate={{ 
                            height: [4, Math.random() * 24 + 4, 4] 
                          }}
                          transition={{ 
                            repeat: Infinity, 
                            duration: 0.5, 
                            delay: i * 0.05 
                          }}
                          className="w-1 bg-blue-600 rounded-full"
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                      <span className="text-sm font-black italic text-slate-700">{formatDuration(recordingDuration)}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <form 
                onSubmit={(e) => { e.preventDefault(); handleSendMessage(newMessage); }} 
                className="flex items-center space-x-2"
              >
                {!isRecording ? (
                  <>
                    <div className="flex items-center space-x-1">
                      <button 
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 text-slate-400 hover:text-blue-600 transition-all"
                      >
                        <ImageIcon size={18} />
                      </button>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleImageUpload} 
                        className="hidden" 
                        accept="image/*" 
                      />
                      <button 
                        type="button"
                        onClick={toggleRecording}
                        className="p-2 text-slate-400 hover:text-blue-600 transition-all"
                      >
                        <Mic size={18} />
                      </button>
                      {profile?.role === 'customer' && (
                        <button 
                          type="button"
                          onClick={handleSendLocation}
                          className="p-2 text-slate-400 hover:text-blue-600 transition-all"
                          title="Enviar Localização"
                        >
                          <MapPin size={18} />
                        </button>
                      )}
                    </div>
                    
                    <input 
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder={isBalanceLow ? "Saldo insuficiente..." : "Digite sua mensagem..."}
                      disabled={isBalanceLow}
                      className="flex-1 bg-slate-50 border-none rounded-2xl px-6 py-3 text-xs focus:ring-2 focus:ring-blue-500/20 font-bold"
                    />
                    
                    <button 
                      type="submit"
                      disabled={!newMessage.trim() || isBalanceLow}
                      className="bg-blue-600 text-white p-3 rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
                    >
                      <Send size={18} />
                    </button>
                  </>
                ) : (
                  <div className="flex-1 flex items-center gap-3">
                    <button 
                      type="button"
                      onClick={() => {
                        if (mediaRecorder.current && isRecording) {
                          mediaRecorder.current.stop();
                          setIsRecording(false);
                          audioChunks.current = []; // Clear to avoid sending
                          mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-red-100 transition-all"
                    >
                      <X size={16} />
                      <span>Cancelar</span>
                    </button>
                    
                    <button 
                      type="button"
                      onClick={stopRecording}
                      className="flex-1 bg-blue-600 text-white py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 animate-[pulse_1.5s_infinite]"
                    >
                      <Send size={16} />
                      <span>Finalizar e Enviar</span>
                    </button>
                  </div>
                )}
              </form>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Chat;
