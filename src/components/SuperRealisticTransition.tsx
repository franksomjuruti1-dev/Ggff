import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from 'lucide-react';

interface SuperRealisticTransitionProps {
  onComplete: () => void;
  userName?: string;
}

const SuperRealisticTransition: React.FC<SuperRealisticTransitionProps> = ({ onComplete, userName = 'Cliente' }) => {
  const [phase, setPhase] = useState<'initial' | 'reveal' | 'fade'>('initial');

  useEffect(() => {
    const sequence = async () => {
      // Phase 1: Initial pause
      await new Promise(resolve => setTimeout(resolve, 800));
      setPhase('reveal');
      
      // Phase 2: Reveal duration
      await new Promise(resolve => setTimeout(resolve, 3500));
      setPhase('fade');
      
      // Phase 3: Final fade
      await new Promise(resolve => setTimeout(resolve, 800));
      onComplete();
    };
    sequence();
  }, [onComplete]);

  const isFeminine = (name: string) => {
    const lowerName = name.trim().toLowerCase().split(' ')[0];
    // Common feminine endings in Portuguese
    return lowerName.endsWith('a') || 
           lowerName.endsWith('ia') || 
           lowerName.endsWith('ina') || 
           lowerName.endsWith('ssa') ||
           lowerName.endsWith('ele') || // Gabriele, etc
           lowerName.endsWith('any') || // Dany, etc
           lowerName.endsWith('ine'); // Aline, etc
  };

  const feminine = isFeminine(userName);
  const haloColor = feminine ? '#D946EF' : '#0F172A'; // Fuchsia/Pink vs Slate-900/Dark

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[10000] bg-white flex items-center justify-center overflow-hidden"
    >
      <div className="relative flex flex-col items-center justify-center w-full h-full">
        {/* Profile Icon with Halo (Behind) */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1.2, opacity: 0.15 }}
          transition={{ type: "spring", damping: 15, stiffness: 50, delay: 0.2 }}
          className="absolute z-0"
        >
          {/* Animated Halo (Aurela) */}
          <motion.div
            animate={{ 
              rotate: 360,
              scale: [1, 1.1, 1],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{ 
              rotate: { duration: 10, repeat: Infinity, ease: "linear" },
              scale: { duration: 3, repeat: Infinity, ease: "easeInOut" },
              opacity: { duration: 3, repeat: Infinity, ease: "easeInOut" }
            }}
            style={{ borderColor: haloColor }}
            className="absolute -inset-20 border-4 border-dashed rounded-full"
          />
          
          <motion.div
            animate={{ 
              boxShadow: [`0 0 40px ${haloColor}20`, `0 0 80px ${haloColor}40`, `0 0 40px ${haloColor}20`]
            }}
            transition={{ duration: 3, repeat: Infinity }}
            className="w-96 h-96 rounded-full bg-white flex items-center justify-center shadow-2xl border border-slate-100 relative"
          >
            <User size={200} className={feminine ? "text-fuchsia-500" : "text-slate-900"} />
          </motion.div>
        </motion.div>

        {/* TUPÃ IFOOD Text (Front) */}
        <motion.div
          initial={{ y: 40, opacity: 0, scale: 0.8 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 1, ease: "easeOut" }}
          className="text-center z-10"
        >
          <div className="flex flex-col items-center">
            <motion.h1 
              className="text-7xl md:text-9xl font-black italic tracking-tighter leading-none"
              style={{ 
                background: 'linear-gradient(to bottom right, #2563EB, #1D4ED8)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.1))'
              }}
            >
              TUPÃ
            </motion.h1>
            <motion.h2 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.6 }}
              className="text-5xl md:text-7xl font-black italic tracking-tighter text-slate-900 mt-[-15px]"
            >
              IFOOD
            </motion.h2>
          </div>
          
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '120%' }}
            transition={{ delay: 1.8, duration: 1 }}
            className="h-1.5 bg-blue-600 mt-6 rounded-full mx-auto"
          />
          
          <motion.p
            initial={{ opacity: 0, letterSpacing: '0.1em' }}
            animate={{ opacity: 1, letterSpacing: '0.6em' }}
            transition={{ delay: 2.2, duration: 1 }}
            className="text-slate-500 font-bold uppercase mt-6 text-sm md:text-base"
          >
            Elegância & Agilidade
          </motion.p>
        </motion.div>
      </div>

      {/* Final Fade Overlay */}
      <AnimatePresence>
        {phase === 'fade' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 bg-white z-[10002]"
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default SuperRealisticTransition;
