export interface User {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  provider?: 'apple' | 'google' | 'facebook' | 'guest';
  createdAt: string;
}

export interface Car {
  id: string;
  userId: string;
  nickname: string;
  make: string;
  model: string;
  year: number;
  licensePlate?: string;
  fuelType: FuelType;
  tankCapacity?: number; // liters
  color?: string;
  isDefault: boolean;
  odometer: number; // current odometer in km
  createdAt: string;
  updatedAt: string;
}

export type FuelType = 'gasoline' | 'diesel' | 'electric' | 'hybrid' | 'lpg' | 'cng';

export interface FuelLog {
  id: string;
  userId: string;
  carId: string;
  date: string; // ISO string
  odometer: number; // km at fill-up
  liters: number;
  pricePerLiter: number;
  totalCost: number;
  fullTank: boolean;
  stationName?: string;
  stationLocation?: string;
  notes?: string;
  fuelType: FuelType;
  createdAt: string;
}

export interface ServiceReminder {
  id: string;
  carId: string;
  type: ServiceType;
  dueDate?: string;
  dueOdometer?: number;
  notes?: string;
  completed: boolean;
  createdAt: string;
}

export type ServiceType =
  | 'oil_change'
  | 'tire_rotation'
  | 'brake_check'
  | 'air_filter'
  | 'registration'
  | 'insurance'
  | 'general_service'
  | 'other';

export interface Settings {
  distanceUnit: 'km' | 'mi';
  volumeUnit: 'liters' | 'gallons';
  currency: string;
  currencySymbol: string;
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
}

export interface FuelStats {
  totalFillUps: number;
  totalLiters: number;
  totalCost: number;
  avgConsumption: number; // L/100km
  avgCostPerKm: number;
  lastFillUp?: FuelLog;
  totalDistance: number;
}

export interface MonthlyReport {
  month: string; // YYYY-MM
  fillUps: number;
  liters: number;
  cost: number;
  distance: number;
  avgConsumption: number;
}
