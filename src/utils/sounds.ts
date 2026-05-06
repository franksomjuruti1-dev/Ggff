let currentAlarm: HTMLAudioElement | null = null;

export const playSound = (type: 'message' | 'order' | 'status', loop: boolean = false, customUrl?: string, autoVolume: boolean = false) => {
  const sounds = {
    message: customUrl || 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3',
    order: customUrl || null, // No default sound for orders as requested
    status: 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3'
  };

  const soundUrl = sounds[type as keyof typeof sounds];
  if (!soundUrl) return null;

  const audio = new Audio(soundUrl);
  
  // Se autoVolume estiver ativado, garantimos volume máximo no elemento
  // Nota: Não é possível aumentar o volume do sistema via navegador, 
  // mas garantimos que o áudio em si esteja no máximo.
  audio.volume = 1.0;

  if (type === 'order' && loop) {
    if (currentAlarm) return; // Already playing
    audio.loop = true;
    currentAlarm = audio;
    
    // Vibração se for pedido e autoVolume estiver on
    if (autoVolume && 'vibrate' in navigator) {
      navigator.vibrate([500, 200, 500, 200, 500]);
    }
  }

  audio.play().catch(err => console.log('Erro ao tocar som:', err));
  return audio;
};

export const stopOrderAlarm = () => {
  if (currentAlarm) {
    currentAlarm.pause();
    currentAlarm = null;
  }
};
