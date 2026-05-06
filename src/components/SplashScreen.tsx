import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../AuthContext';
import { Volume2 } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
  isLoaded?: boolean;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete, isLoaded }) => {
  const { globalSettings } = useAuth();
  const [textVisible, setTextVisible] = useState(false);
  const [minTimePassed, setMinTimePassed] = useState(false);

  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Minimum time to show the splash animation
    const duration = (globalSettings?.splashScreenDuration || 1.5) * 1000;
    const minTimer = setTimeout(() => {
      setMinTimePassed(true);
    }, duration);

    // Absolute limit for splash screen to prevent getting stuck
    const maxTimer = setTimeout(() => {
      onComplete();
    }, 5000); 

    return () => {
      clearTimeout(minTimer);
      clearTimeout(maxTimer);
    };
  }, [onComplete, globalSettings?.splashScreenDuration]);

  // Trigger completion when both data is loaded and minimum time has passed
  useEffect(() => {
    if (minTimePassed && isLoaded) {
      onComplete();
    }
  }, [minTimePassed, isLoaded, onComplete]);

  const text = globalSettings?.splashText || globalSettings?.appName || "ifood TUPÃ";
  const mediaUrl = globalSettings?.splashMediaUrl;
  const mediaType = globalSettings?.splashMediaType;
  const audioUrl = globalSettings?.splashAudioUrl;
  const [audioError, setAudioError] = useState(false);

  // Attempt to unmute and play with sound as soon as possible
  useEffect(() => {
    if (mediaType === 'video' && videoRef.current) {
      const video = videoRef.current;
      video.muted = false;
      video.volume = 1.0;
      
      const playVideo = async () => {
        try {
          await video.play();
          setIsMuted(false);
        } catch (err) {
          console.warn("Autoplay with sound blocked, falling back to muted:", err);
          video.muted = true;
          setIsMuted(true);
          try {
            await video.play();
          } catch (e) {
            console.error("Video play failed even muted:", e);
          }
        }
      };
      
      playVideo();
    }
  }, [mediaType, mediaUrl]);

  useEffect(() => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play().catch(err => {
        console.warn("Autoplay blocked for audio:", err);
        setAudioError(true);
      });
      return () => {
        audio.pause();
        audio.src = "";
      };
    }
  }, [audioUrl]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col items-center justify-center overflow-hidden"
      onClick={() => {
        // User interaction to help with autoplay if needed
        if (audioUrl) {
          const audio = new Audio(audioUrl);
          audio.play().catch(() => {});
        }
      }}
    >
      {mediaUrl && (
        <div className="absolute inset-0 z-0 animate-in fade-in duration-1000">
          {mediaType === 'video' ? (
            <video 
              ref={videoRef}
              src={mediaUrl} 
              autoPlay 
              muted
              onEnded={onComplete}
              playsInline 
              className="w-full h-full object-cover"
            />
          ) : (
            <img 
              src={mediaUrl} 
              className="w-full h-full object-cover" 
              referrerPolicy="no-referrer"
              alt="Splash Background"
            />
          )}
          {/* High quality gradient overlay for readability without blurring the image */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
          
          {isMuted && mediaType === 'video' && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={(e) => {
                e.stopPropagation();
                if (videoRef.current) {
                  videoRef.current.muted = false;
                  setIsMuted(false);
                  videoRef.current.play().catch(() => {});
                }
              }}
              className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full shadow-lg flex items-center space-x-2 transition-all active:scale-95"
            >
              <Volume2 className="w-5 h-5" />
              <span className="font-bold uppercase tracking-wider text-sm">Ativar Som do Vídeo</span>
            </motion.button>
          )}

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={(e) => {
              e.stopPropagation();
              onComplete();
            }}
            className="absolute top-8 right-8 z-30 bg-black/40 hover:bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 text-white text-xs font-bold uppercase tracking-widest transition-all"
          >
            Pular
          </motion.button>
        </div>
      )}

      <div className="relative flex flex-col items-center z-10">
        {/* Text Writing Animation with strong drop shadow for maximum contrast */}
        <div className="flex space-x-1">
          {text.split("").map((char, index) => (
            <motion.span
              key={`splash-char-${index}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: index * 0.1,
                duration: 0.5,
                ease: "easeOut"
              }}
              className="text-3xl sm:text-4xl md:text-6xl font-black italic uppercase text-white drop-shadow-[0_8px_24px_rgba(0,0,0,0.8)] py-2 px-0.5"
            >
              {char === " " ? "\u00A0" : char}
            </motion.span>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default SplashScreen;
