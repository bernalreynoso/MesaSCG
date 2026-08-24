import { esTicketAbiertoOperativo } from './statusClassifier';

const businessDaysCache = new Map<string, number>();

/**
 * Calculates business days (excluding Saturdays and Sundays) between two dates.
 * Highly optimized with in-memory caching and algebraic calculation.
 */
export function calculateBusinessDays(startDateStr: string, refDate: Date = new Date()): number {
  if (!startDateStr) return 0;
  
  const refDateKey = `${refDate.getFullYear()}-${refDate.getMonth() + 1}-${refDate.getDate()}`;
  const cacheKey = `${startDateStr.trim()}_${refDateKey}`;
  const cached = businessDaysCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const start = new Date(startDateStr);
  if (isNaN(start.getTime())) return 0;

  const current = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const target = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());

  if (current >= target) {
    businessDaysCache.set(cacheKey, 0);
    return 0;
  }

  // Calculate difference in milliseconds
  const diffTime = target.getTime() - current.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  // Full weeks
  const fullWeeks = Math.floor(diffDays / 7);
  let bDays = fullWeeks * 5;

  // Remaining days
  const remainingDays = diffDays % 7;
  let curDay = current.getDay();

  for (let i = 0; i < remainingDays; i++) {
    curDay = (curDay + 1) % 7;
    if (curDay !== 0 && curDay !== 6) {
      bDays++;
    }
  }

  if (businessDaysCache.size < 5000) {
    businessDaysCache.set(cacheKey, bDays);
  }

  return bDays;
}

/**
 * Checks if a ticket is overdue (>= limitDays business days old and still pending/open)
 */
export function isTicketOverdue(
  fechaCreacion: string,
  estado: string,
  limitDays: number = 5,
  refDate: Date = new Date()
): boolean {
  if (!fechaCreacion || !estado) return false;
  if (!esTicketAbiertoOperativo(estado)) return false;

  const bDays = calculateBusinessDays(fechaCreacion, refDate);
  return bDays >= limitDays;
}
