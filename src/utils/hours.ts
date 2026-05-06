
export interface DayHours {
  open: string;
  close: string;
  closed: boolean;
  closesForLunch?: boolean;
  lunchStart?: string;
  lunchEnd?: string;
}

export interface WeeklyHours {
  sunday: DayHours;
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
}

/**
 * Checks if a time string (HH:mm) is within an interval, handling cross-midnight.
 */
export const isTimeInRange = (currentTime: string, openTime: string, closeTime: string) => {
  if (!currentTime || !openTime || !closeTime) return false;
  
  if (closeTime < openTime) {
    // Crosses midnight (e.g., 18:00 to 02:00)
    return currentTime >= openTime || currentTime <= closeTime;
  } else {
    // Standard range (e.g., 08:00 to 18:00)
    return currentTime >= openTime && currentTime <= closeTime;
  }
};

/**
 * Gets the current time components in Porto Velho (GMT-4).
 */
export const getPortoVelhoComponents = (date: Date = new Date()) => {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Porto_Velho',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'long',
    hour12: false
  }).formatToParts(date).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {} as any);
};

export const getPortoVelhoTimeStr = (date: Date = new Date()) => {
  const parts = getPortoVelhoComponents(date);
  return `${parts.hour}:${parts.minute}`;
};

export const getPortoVelhoDay = (date: Date = new Date()) => {
  const dayIndex = date.getDay();
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  // Important: Intl weekday might differ if date is near midnight. 
  // Let's rely on the shifted weekday if needed, but getDay() on the shifted date is safer.
  
  // Actually, a simpler way to get the correct day in Porto Velho:
  const nowPV = new Date(date.toLocaleString('en-US', { timeZone: 'America/Porto_Velho' }));
  return days[nowPV.getDay()];
};

export const getPortoVelhoTime = (date: Date = new Date()) => {
  return new Date(date.toLocaleString('en-US', { timeZone: 'America/Porto_Velho' }));
};

/**
 * Enhanced function to check if a restaurant is open.
 * Handles manual status overrides (ABSOLUTE) and terminal blockers.
 */
export const getRestaurantStatus = (res: any, now: Date = new Date(), ignorePulse: boolean = false) => {
  if (!res) return { isOpen: false, reason: 'invalid' };
  
  // ABSOLUTE MANUAL STATUS: If the manager clicked "Start/Online", the status becomes 'active'.
  // This has priority over almost everything except wallet blocking.
  if (res.status === 'active') {
    // Midnight Disconnect Check: If activated on a different day (Porto Velho time), treat as expired.
    const activatedAt = res.updatedAt?.toDate ? res.updatedAt.toDate() : (res.updatedAt ? new Date(res.updatedAt) : null);
    if (activatedAt) {
      const nowPVDate = getPortoVelhoTime(now);
      const todayPV = nowPVDate.toDateString();
      
      const activatedPVDate = getPortoVelhoTime(activatedAt);
      const activatedToday = activatedPVDate.toDateString();
      
      if (todayPV !== activatedToday) {
        return { isOpen: false, reason: 'paused', scheduleMatch: false };
      }
    }

    return { 
      isOpen: true, 
      reason: 'active', 
      scheduleMatch: true 
    };
  }

  // Terminal blockers (only if not active)
  if (res.isWalletBlocked) return { isOpen: false, reason: 'wallet_blocked' };
  if (res.forceClosed) return { isOpen: false, reason: 'force_closed' };

  // If the manager clicked "Disconnect" or haven't started, it's 'paused' or other.
  return { 
    isOpen: false, 
    reason: 'paused', 
    scheduleMatch: false
  };
};
