import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Car } from '../types';
import { generateId } from '../utils/formatters';

interface CarState {
  cars: Car[];
  selectedCarId: string | null;
  isLoading: boolean;
  loadCars: (userId: string) => Promise<void>;
  addCar: (car: Omit<Car, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Car>;
  updateCar: (id: string, data: Partial<Car>) => Promise<void>;
  deleteCar: (id: string) => Promise<void>;
  setDefaultCar: (id: string) => Promise<void>;
  selectCar: (id: string | null) => void;
  getSelectedCar: () => Car | null;
}

export const useCarStore = create<CarState>((set, get) => ({
  cars: [],
  selectedCarId: null,
  isLoading: false,

  loadCars: async (userId) => {
    set({ isLoading: true });
    try {
      const data = await AsyncStorage.getItem(`cars_${userId}`);
      const cars: Car[] = data ? JSON.parse(data) : [];
      const selectedId = cars.find((c) => c.isDefault)?.id ?? cars[0]?.id ?? null;
      set({ cars, selectedCarId: selectedId, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addCar: async (carData) => {
    const userId = carData.userId;
    const isFirst = get().cars.filter((c) => c.userId === userId).length === 0;
    const car: Car = {
      ...carData,
      id: generateId(),
      isDefault: isFirst,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const cars = [...get().cars, car];
    await AsyncStorage.setItem(`cars_${userId}`, JSON.stringify(cars));
    const selectedCarId = isFirst ? car.id : get().selectedCarId;
    set({ cars, selectedCarId });
    return car;
  },

  updateCar: async (id, data) => {
    const cars = get().cars.map((c) =>
      c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c
    );
    const userId = get().cars.find((c) => c.id === id)?.userId;
    if (userId) await AsyncStorage.setItem(`cars_${userId}`, JSON.stringify(cars));
    set({ cars });
  },

  deleteCar: async (id) => {
    const car = get().cars.find((c) => c.id === id);
    if (!car) return;
    const cars = get().cars.filter((c) => c.id !== id);
    await AsyncStorage.setItem(`cars_${car.userId}`, JSON.stringify(cars));
    const selectedCarId =
      get().selectedCarId === id
        ? cars.find((c) => c.userId === car.userId)?.id ?? null
        : get().selectedCarId;
    set({ cars, selectedCarId });
  },

  setDefaultCar: async (id) => {
    const car = get().cars.find((c) => c.id === id);
    if (!car) return;
    const cars = get().cars.map((c) => ({
      ...c,
      isDefault: c.userId === car.userId ? c.id === id : c.isDefault,
    }));
    await AsyncStorage.setItem(`cars_${car.userId}`, JSON.stringify(cars));
    set({ cars, selectedCarId: id });
  },

  selectCar: (id) => set({ selectedCarId: id }),

  getSelectedCar: () => {
    const { cars, selectedCarId } = get();
    return cars.find((c) => c.id === selectedCarId) ?? null;
  },
}));
