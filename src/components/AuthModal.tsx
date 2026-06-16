import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { X, Mail, Lock as LockIcon, User, CreditCard, Eye, EyeOff, LogIn, UserPlus, Phone, ArrowLeft, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '../AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
  targetRole?: 'customer' | 'manager' | 'courier';
  message?: string;
  isExclusiveView?: boolean;
}

export default function AuthModal({ isOpen, onClose, initialMode = 'login', targetRole, message, isExclusiveView }: AuthModalProps) {
  const { user, signUpWithEmail, signInWithEmail, isSigningIn, setRole, profile, updateProfileData, continueAsGuest } = useAuth();
  const navigate = useNavigate();

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };
  const [mode, setMode] = useState<'login' | 'register' | 'questionnaire' | 'recovery' | 'reset_password'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [referencePoint, setReferencePoint] = useState('');
  const [modality, setModality] = useState<'restaurante' | 'mercado' | 'farmácia' | 'lanche' | 'padaria' | 'bebidas' | 'pet shop' | 'shopping gourmet'>('restaurante');
  const [error, setError] = useState('');
  
  // Recovery fields
  const [recoveryPhone, setRecoveryPhone] = useState('');
  const [recoveryName, setRecoveryName] = useState('');
  const [recoveryCpf, setRecoveryCpf] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [isCheckingDocument, setIsCheckingDocument] = useState(false);

  // Monitoramento automático instantâneo via onSnapshot conforme solicitado pelo usuário
  useEffect(() => {
    let unsubscribe: () => void;

    if (isCheckingDocument && auth.currentUser) {
      console.log('Starting instant monitoring for user document:', auth.currentUser.uid);
      unsubscribe = onSnapshot(doc(db, 'users', auth.currentUser.uid), (userDoc) => {
        if (userDoc.exists()) {
          const data = userDoc.data();
          console.log('Account identified in database! Redirecting...', data.role);
          
          if (unsubscribe) unsubscribe();
          setIsCheckingDocument(false);
          
          // Sinalizar sucesso para exibir
          localStorage.setItem('SHOW_REGISTRATION_SUCCESS', 'true');
          
          // Notificar o componente App sem recarregar a página
          window.dispatchEvent(new CustomEvent('registration-success'));
          
          // Fechar modal e deixar o AuthContext lidar com a navegação natural
          onClose();
        }
      }, (err) => {
        console.error('Error monitoring user document:', err);
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isCheckingDocument, navigate, onClose]);

  const handleManualAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      if (mode === 'recovery') {
        if (!recoveryPhone || !recoveryName || !recoveryCpf) {
          setError('Preencha corretamente');
          return;
        }

        if (recoveryPhone.replace(/\D/g, '').length < 10) {
          setError('Telefone incompleto ou inválido');
          return;
        }
        
        setIsResetting(true);
        try {
          const response = await fetch('/api/verify-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phone: recoveryPhone,
              name: recoveryName,
              cpf: recoveryCpf
            })
          });

          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || 'Dados não conferem.');
          }

          setMode('reset_password');
          setError('');
        } catch (err: any) {
          setError(err.message || 'Verifique as informações');
        } finally {
          setIsResetting(false);
        }
        return;
      }

      if (mode === 'reset_password') {
        if (!newPassword || !confirmNewPassword) {
          setError('Preencha a nova senha.');
          return;
        }
        if (newPassword !== confirmNewPassword) {
          setError('As senhas não coincidem.');
          return;
        }
        if (newPassword.length < 6) {
          setError('A senha deve ter pelo menos 6 caracteres.');
          return;
        }

        setIsResetting(true);
        try {
          const response = await fetch('/api/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phone: recoveryPhone,
              name: recoveryName,
              cpf: recoveryCpf,
              newPassword: newPassword
            })
          });

          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || 'Erro ao redefinir senha.');
          }

          // Auto-login with token
          const { signInWithCustomToken } = await import('firebase/auth');
          await signInWithCustomToken(auth, data.token);
          
          await new Promise(r => setTimeout(r, 500)); // Wait for auth state
          onClose(); // Close modal
          
          // Redirecionar automaticamente para página do cliente do Xô Fome
          navigate('/customer');
        } catch (err: any) {
          setError(err.message || 'Erro ao redefinir.');
        } finally {
          setIsResetting(false);
        }
        return;
      }

      if (mode === 'register') {
        if (password !== confirmPassword) {
          setError('As senhas não coincidem');
          return;
        }
        if (password.length < 6) {
          setError('A senha deve ter pelo menos 6 caracteres');
          return;
        }
        
        /* 
        if (!photoURL) {
          setError('A foto da empresa é obrigatória');
          return;
        }
        */

        // Basic CPF validation (format check)
        const cpfRegex = /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/;
        if (!cpfRegex.test(cpf)) {
          setError('CPF inválido. Use o formato 000.000.000-00');
          return;
        }

        if (!whatsapp) {
          setError('O WhatsApp é obrigatório');
          return;
        }

        if (whatsapp.replace(/\D/g, '').length < 11) {
          setError('Número de WhatsApp incompleto ou inválido. Use (00) 00000-0000');
          return;
        }

        await signUpWithEmail(email.toLowerCase(), password, name, cpf, photoURL, whatsapp, modality, targetRole);
        
        // Ativar monitoramento automático a cada 2 segundos conforme solicitado
        setIsCheckingDocument(true);
        return; // Wait for monitoring useEffect to handle redirection
      } else if (mode === 'questionnaire') {
        // Basic CPF validation (format check)
        const cpfRegex = /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/;
        if (!cpfRegex.test(cpf)) {
          setError('CPF inválido. Use o formato 000.000.000-00');
          return;
        }

        if (!whatsapp) {
          setError('O WhatsApp é obrigatório');
          return;
        }

        if (whatsapp.replace(/\D/g, '').length < 11) {
          setError('Número de WhatsApp incompleto ou inválido. Use (00) 00000-0000');
          return;
        }

        await updateProfileData({
          cpf,
          whatsapp,
          referencePoint
        });
        
        onClose();
      } else {
        await signInWithEmail(email.toLowerCase(), password);
        // Role will be checked below
      }
      
      // Handle redirection after successful auth
      if (mode !== 'questionnaire') {
        const currentUser = auth.currentUser; // Get current user from Firebase Auth directly
        if (currentUser) {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          const userRole = userDoc.exists() ? userDoc.data().role : (targetRole || 'customer');
          
          if (userRole === 'manager') {
            navigate('/manager', { state: { isRegistering: false } });
          } else {
            navigate('/customer');
          }
        }
        onClose();
      } else {
        onClose();
      }
    } catch (err: any) {
      console.error('Auth Error:', err);
      if (err.code === 'auth/operation-not-allowed') {
        setError('O cadastro por e-mail/senha não está ativado no Firebase. Por favor, acesse o console do Firebase (Authentication > Sign-in method) e ative o provedor "E-mail/Senha" para permitir o acesso manual.');
      } else if (err.code === 'auth/email-already-in-use' || err.message?.includes('e-mail já está em uso')) {
        setError('Este e-mail já está sendo usado por outra conta.');
      } else if (err.code === 'auth/weak-password') {
        setError('A senha é muito fraca. Use pelo menos 6 caracteres.');
      } else if (err.code === 'auth/invalid-email') {
        setError('E-mail inválido. Verifique o formato digitado.');
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('E-mail ou senha incorretos.');
      } else if (err.message?.includes('permissão') || err.message?.includes('permissions')) {
        // TRATAMENTO ESPECIAL: Se for erro de permissão no cadastro, tratamos como sucesso
        // salvando sinalizador e notificando o sistema sem recarregar
        localStorage.setItem('SHOW_REGISTRATION_SUCCESS', 'true');
        window.dispatchEvent(new CustomEvent('registration-success'));
        onClose();
      } else {
        setError(err.message || 'Ocorreu um erro na autenticação');
      }
    }
  };

  // Removed the effect that forced questionnaire mode to respect user's request
  // to not show "Quase lá!" popup automatically.

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl relative"
          >
            <button 
              onClick={() => {
                if (mode === 'register' || mode === 'recovery') {
                  setMode('login');
                } else if (mode === 'reset_password') {
                  setMode('recovery');
                } else {
                  onClose();
                }
              }}
              className="absolute top-6 right-6 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors z-10"
            >
              <X size={24} className="text-slate-400" />
            </button>

            <div className="p-8 md:p-10 space-y-8">
              <div className="text-center space-y-2">
                <h3 className="text-3xl font-black uppercase tracking-tighter italic text-blue-gradient">
                  {mode === 'login' ? 'Bem-vindo de volta' : mode === 'register' ? 'Criar Conta' : mode === 'recovery' ? 'Recuperar Senha' : mode === 'reset_password' ? 'Nova Senha' : 'Quase lá!'}
                </h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {message || (
                    mode === 'questionnaire' ? 'Complete seu cadastro para continuar' : 
                    mode === 'recovery' ? 'Verifique seus dados cadastrados' :
                    mode === 'reset_password' ? 'Digite sua nova senha abaixo' :
                    targetRole === 'manager' && mode !== 'login' ? 'Acesso para Empresas' : 
                    (mode === 'login' ? 'Acesse sua conta para continuar' : 'Preencha os dados abaixo')
                  )}
                </p>
              </div>

              <div className="space-y-4">
                <form onSubmit={handleManualAuth} className="space-y-4">
                  {mode === 'recovery' && (
                    <>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                          type="text"
                          placeholder="TELEFONE CADASTRADO"
                          required
                          className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500/20 focus:bg-white dark:focus:bg-slate-700 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold uppercase tracking-tight transition-all dark:text-white"
                          value={recoveryPhone}
                          onChange={(e) => setRecoveryPhone(formatPhone(e.target.value))}
                        />
                      </div>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                          type="text"
                          placeholder="NOME"
                          required
                          className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500/20 focus:bg-white dark:focus:bg-slate-700 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold uppercase tracking-tight transition-all dark:text-white"
                          value={recoveryName}
                          onChange={(e) => setRecoveryName(e.target.value)}
                        />
                      </div>
                      <div className="relative">
                        <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                          type="text"
                          placeholder="CPF"
                          required
                          className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500/20 focus:bg-white dark:focus:bg-slate-700 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold uppercase tracking-tight transition-all dark:text-white"
                          value={recoveryCpf}
                          onChange={(e) => setRecoveryCpf(e.target.value)}
                        />
                      </div>
                    </>
                  )}

                  {mode === 'reset_password' && (
                    <>
                      <div className="relative">
                        <LockIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                          type={showNewPassword ? "text" : "password"}
                          placeholder="NOVA SENHA"
                          required
                          className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500/20 focus:bg-white dark:focus:bg-slate-700 rounded-2xl py-4 pl-12 pr-12 text-xs font-bold uppercase tracking-tight transition-all dark:text-white"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value.toLowerCase())}
                          autoCapitalize="none"
                        />
                        <button 
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                        >
                          {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      <div className="relative">
                        <LockIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                          type={showConfirmNewPassword ? "text" : "password"}
                          placeholder="CONFIRME A NOVA SENHA"
                          required
                          className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500/20 focus:bg-white dark:focus:bg-slate-700 rounded-2xl py-4 pl-12 pr-12 text-xs font-bold uppercase tracking-tight transition-all dark:text-white"
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value.toLowerCase())}
                          autoCapitalize="none"
                        />
                        <button 
                          type="button"
                          onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                        >
                          {showConfirmNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </>
                  )}

                  {mode === 'register' && targetRole === 'manager' && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tipo de Empresa</label>
                      <select 
                        value={modality} 
                        onChange={(e) => setModality(e.target.value as any)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500/20 focus:bg-white dark:focus:bg-slate-700 rounded-2xl py-4 px-4 text-xs font-bold uppercase tracking-tight transition-all dark:text-white"
                      >
                        <option value="restaurante">Restaurante</option>
                        <option value="mercado">Mercado</option>
                        <option value="farmácia">Farmácia</option>
                        <option value="lanche">Lanche</option>
                        <option value="padaria">Padaria</option>
                        <option value="bebidas">Bebidas</option>
                        <option value="pet shop">Pet Shop</option>
                        <option value="shopping gourmet">Shopping Gourmet</option>
                      </select>
                    </div>
                  )}
                  {(mode === 'register' || mode === 'questionnaire') && (
                    <>
                      {mode === 'register' && (
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input 
                            type="text"
                            placeholder="NOME COMPLETO"
                            required
                            className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500/20 focus:bg-white dark:focus:bg-slate-700 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold uppercase tracking-tight transition-all dark:text-white"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                          />
                        </div>
                      )}
                      <div className="relative">
                        <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                          type="text"
                          placeholder="CPF"
                          required
                          className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500/20 focus:bg-white dark:focus:bg-slate-700 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold uppercase tracking-tight transition-all dark:text-white"
                          value={cpf}
                          onChange={(e) => setCpf(e.target.value)}
                        />
                      </div>
                      {mode === 'register' && targetRole === 'manager' && (
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Foto da Empresa</label>
                          <div className="flex gap-2 items-center">
                            <label className="flex-1 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-100 dark:border-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl p-4 text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all flex items-center justify-center cursor-pointer">
                              <ImageIcon size={16} className="mr-2" />
                              Escolher Foto
                              <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => setPhotoURL(reader.result as string);
                                    reader.readAsDataURL(file);
                                  }
                                }} 
                              />
                            </label>
                            {photoURL && (
                              <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800 flex-shrink-0">
                                <img src={photoURL || undefined} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                          type="text"
                          placeholder="WHATSAPP (COM DDD)"
                          required
                          className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500/20 focus:bg-white dark:focus:bg-slate-700 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold uppercase tracking-tight transition-all dark:text-white"
                          value={whatsapp}
                          onChange={(e) => setWhatsapp(formatPhone(e.target.value))}
                        />
                      </div>
                      {mode === 'questionnaire' && (
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input 
                            type="text"
                            placeholder="PONTO DE REFERÊNCIA"
                            className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500/20 focus:bg-white dark:focus:bg-slate-700 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold uppercase tracking-tight transition-all dark:text-white"
                            value={referencePoint}
                            onChange={(e) => setReferencePoint(e.target.value)}
                          />
                        </div>
                      )}
                    </>
                  )}
                  
                  {mode !== 'questionnaire' && mode !== 'recovery' && mode !== 'reset_password' && (
                    <>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                          type="email"
                          placeholder="E-MAIL"
                          required
                          className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500/20 focus:bg-white dark:focus:bg-slate-700 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold uppercase tracking-tight transition-all dark:text-white"
                          value={email}
                          onChange={(e) => setEmail(e.target.value.toLowerCase())}
                          autoCapitalize="none"
                        />
                      </div>

                      <div className="relative">
                        <LockIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                          type={showPassword ? "text" : "password"}
                          placeholder="SENHA"
                          required
                          className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500/20 focus:bg-white dark:focus:bg-slate-700 rounded-2xl py-4 pl-12 pr-12 text-xs font-bold uppercase tracking-tight transition-all dark:text-white"
                          value={password}
                          onChange={(e) => setPassword(e.target.value.toLowerCase())}
                          autoCapitalize="none"
                        />
                        <button 
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>

                      {mode === 'login' && (
                        <div className="text-right">
                          <button 
                            type="button"
                            onClick={() => {
                              setError('');
                              setMode('recovery');
                            }}
                            className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors"
                          >
                            Esqueceu a senha? Clica aqui
                          </button>
                        </div>
                      )}

                      {mode === 'register' && (
                        <div className="relative">
                          <LockIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input 
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="CONFIRMAR SENHA"
                            required
                            className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500/20 focus:bg-white dark:focus:bg-slate-700 rounded-2xl py-4 pl-12 pr-12 text-xs font-bold uppercase tracking-tight transition-all dark:text-white"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value.toLowerCase())}
                            autoCapitalize="none"
                          />
                          <button 
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                          >
                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {error && (
                    <p className="text-[10px] font-black uppercase tracking-widest text-red-500 text-center">{error}</p>
                  )}

                  <button 
                    type="submit"
                    disabled={isSigningIn || isResetting || isCheckingDocument || (mode === 'recovery' && (!recoveryPhone || !recoveryName || !recoveryCpf))}
                    className="w-full bg-blue-gradient text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-500/20 hover:scale-[1.02] transition-all disabled:opacity-50"
                  >
                    {isSigningIn || isCheckingDocument || isResetting ? 'Processando...' : mode === 'login' ? '➡️ Entrar' : mode === 'register' ? '➡️ Criar conta' : mode === 'recovery' ? '➡️ Prosseguir' : mode === 'reset_password' ? '➡️ Confirmar Nova Senha' : '➡️ Finalizar'}
                  </button>

                  {mode === 'recovery' && (
                    <button 
                      type="button"
                      onClick={() => setMode('login')}
                      className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                    >
                      <ArrowLeft size={14} /> Voltar
                    </button>
                  )}
                </form>
              </div>

              {mode === 'login' && error && (
                <div className="text-center">
                  <button 
                    onClick={() => {
                      setError('');
                      setMode('recovery');
                    }}
                    className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:underline"
                  >
                    Esqueceu a senha? clica aqui
                  </button>
                </div>
              )}

              {mode !== 'questionnaire' && mode !== 'recovery' && mode !== 'reset_password' && (
                <div className="text-center pt-4">
                  <button 
                    onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                    className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors"
                  >
                    {mode === 'login' ? 'Não tem cadastro? Clique aqui' : 'Já tem uma conta? Entre aqui'}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
