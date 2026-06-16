/**
 * Professional Permission Management System
 * Optimized for Mobile (iOS/Android) and WebViews.
 */

export type PermissionType = 'geolocation' | 'camera' | 'microphone';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface PermissionError {
  code: number;
  message: string;
  type: PermissionType;
}

const DEFAULT_GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 12000,
  maximumAge: 0
};

/**
 * Checks if a permission is already granted.
 * Uses navigator.permissions.query with fallback for iOS/older browsers.
 */
export async function checkPermissionStatus(type: PermissionType): Promise<PermissionState | 'unknown'> {
  // Safari and some WebViews don't support navigator.permissions
  if (!navigator.permissions || !navigator.permissions.query) {
    return 'unknown';
  }

  try {
    const name = type === 'geolocation' ? 'geolocation' : type;
    const status = await navigator.permissions.query({ name: name as any });
    return status.state;
  } catch (error) {
    console.warn(`[Permissions] Error querying ${type} status:`, error);
    return 'unknown';
  }
}

/**
 * Main function to get geolocation.
 * Directly calls getCurrentPosition to trigger prompt or get cached permission.
 */
export async function getGeolocation(options: PositionOptions = DEFAULT_GEO_OPTIONS): Promise<LocationData> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject({ code: 0, message: 'Geolocation not supported', type: 'geolocation' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        reject({
          code: error.code,
          message: error.message,
          type: 'geolocation'
        });
      },
      options
    );
  });
}

/**
 * Main function to get camera access.
 */
export async function getCameraAccess(videoOptions: boolean | MediaTrackConstraints = true): Promise<MediaStream> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw { code: 0, message: 'Camera access not supported', type: 'camera' };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: videoOptions });
    return stream;
  } catch (error: any) {
    throw {
      code: 0,
      message: error.name || 'Camera error',
      originalError: error,
      type: 'camera'
    };
  }
}

/**
 * Initializes the permission flow automatically.
 * Tries to get location immediately to check if permission is already granted
 * or to trigger the browser prompt if it's the first time and the context allows it.
 */
export async function initPermissionFlow() {
  console.log("[Permissions] Initializing silent permission check...");
  
  const status = await checkPermissionStatus('geolocation');
  if (status === 'granted') {
    try {
      const location = await getGeolocation();
      console.log("[Permissions] Geolocation refreshed", location);
      window.dispatchEvent(new CustomEvent('location-ready', { detail: location }));
    } catch (error: any) {
      console.warn("[Permissions] Geolocation refresh failed:", error);
    }
  } else {
    console.log("[Permissions] Geolocation not auto-granted, skipping to avoid blocking popup");
  }

  // Camera check
  const cameraStatus = await checkPermissionStatus('camera');
  console.log("[Permissions] Camera status:", cameraStatus);
}

/**
 * Handle common permission errors with user-friendly instructions.
 */
export function getPermissionErrorMessage(error: any): string {
  if (error.type === 'geolocation') {
    switch (error.code) {
      case 1: // PERMISSION_DENIED
        return 'Permissão de localização negada. Por favor, ative a localização nas configurações do seu navegador para continuar.';
      case 2: // POSITION_UNAVAILABLE
        return 'O GPS do seu dispositivo está indisponível ou desativado. Verifique as configurações.';
      case 3: // TIMEOUT
        return 'Tempo esgotado ao tentar obter sua localização. Tente novamente em um local com sinal melhor.';
      default:
        return 'Erro ao obter localização. Verifique as permissões.';
    }
  }
  
  if (error.type === 'camera') {
    const name = error.message; // From getUserMedia error name
    if (name === 'NotAllowedError') return 'Acesso à câmera negado. Ative nas configurações para escanear QR Codes.';
    if (name === 'NotFoundError') return 'Nenhuma câmera encontrada no dispositivo.';
    if (name === 'NotReadableError') return 'A câmera está sendo usada por outro aplicativo.';
    return 'Erro ao acessar a câmera.';
  }

  return 'Ocorreu um erro de permissão.';
}
