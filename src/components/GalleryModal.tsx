import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { XCircle, CheckCircle } from 'lucide-react';

export const GALLERY_IMAGES = [
  'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1473093226795-af9932fe5856?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1567620905732-2d1ec7bb7445?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1484723088339-fe7a77020a7b?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80'
];

interface GalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}

const GalleryModal: React.FC<GalleryModalProps> = ({ isOpen, onClose, onSelect }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-slate-900 border border-white/10 w-full max-w-4xl max-h-[80vh] rounded-[2.5rem] overflow-hidden flex flex-col"
          >
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-xl font-black uppercase tracking-tight italic text-white">Galeria de Imagens</h3>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-white transition-colors">
                <XCircle size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {GALLERY_IMAGES.map((url, idx) => (
                <button 
                  key={url}
                  onClick={() => {
                    onSelect(url);
                    onClose();
                  }}
                  className="aspect-square rounded-2xl overflow-hidden border-2 border-transparent hover:border-blue-500 transition-all group relative"
                >
                  <img src={url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <CheckCircle className="text-white" size={32} />
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default GalleryModal;
