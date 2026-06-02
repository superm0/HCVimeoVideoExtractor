import { format, parseISO, formatDistanceToNow } from 'date-fns';

export function formatCurrency(amount: number, symbol: string = '$'): string {
  return `${symbol}${amount.toFixed(2)}`;
}

export function formatDistance(km: number, unit: 'km' | 'mi' = 'km'): string {
  if (unit === 'mi') {
    return `${(km * 0.621371).toFixed(0)} mi`;
  }
  return `${km.toFixed(0)} km`;
}

export function formatVolume(liters: number, unit: 'liters' | 'gallons' = 'liters'): string {
  if (unit === 'gallons') {
    return `${(liters * 0.264172).toFixed(2)} gal`;
  }
  return `${liters.toFixed(2)} L`;
}

export function formatConsumption(
  l100km: number,
  distanceUnit: 'km' | 'mi' = 'km',
  volumeUnit: 'liters' | 'gallons' = 'liters'
): string {
  if (distanceUnit === 'mi' && volumeUnit === 'gallons') {
    // Convert L/100km to MPG
    const mpg = 235.215 / l100km;
    return `${mpg.toFixed(1)} mpg`;
  }
  return `${l100km.toFixed(1)} L/100km`;
}

export function formatDate(isoString: string): string {
  return format(parseISO(isoString), 'MMM d, yyyy');
}

export function formatDateShort(isoString: string): string {
  return format(parseISO(isoString), 'MMM d');
}

export function formatMonth(yearMonth: string): string {
  return format(parseISO(`${yearMonth}-01`), 'MMM yyyy');
}

export function formatRelativeTime(isoString: string): string {
  return formatDistanceToNow(parseISO(isoString), { addSuffix: true });
}

export function formatFuelType(type: string): string {
  const map: Record<string, string> = {
    gasoline: 'Gasoline',
    diesel: 'Diesel',
    electric: 'Electric',
    hybrid: 'Hybrid',
    lpg: 'LPG',
    cng: 'CNG',
  };
  return map[type] || type;
}

export function formatServiceType(type: string): string {
  const map: Record<string, string> = {
    oil_change: 'Oil Change',
    tire_rotation: 'Tire Rotation',
    brake_check: 'Brake Check',
    air_filter: 'Air Filter',
    registration: 'Registration',
    insurance: 'Insurance',
    general_service: 'General Service',
    other: 'Other',
  };
  return map[type] || type;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
