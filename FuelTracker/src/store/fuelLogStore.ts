import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FuelLog } from '../types';
import { generateId } from '../utils/formatters';

interface FuelLogState {
  logs: FuelLog[];
  isLoading: boolean;
  loadLogs: (userId: string) => Promise<void>;
  addLog: (log: Omit<FuelLog, 'id' | 'createdAt'>) => Promise<FuelLog>;
  updateLog: (id: string, data: Partial<FuelLog>) => Promise<void>;
  deleteLog: (id: string) => Promise<void>;
  getLogsForCar: (carId: string) => FuelLog[];
}

export const useFuelLogStore = create<FuelLogState>((set, get) => ({
  logs: [],
  isLoading: false,

  loadLogs: async (userId) => {
    set({ isLoading: true });
    try {
      const data = await AsyncStorage.getItem(`fuel_logs_${userId}`);
      const logs: FuelLog[] = data ? JSON.parse(data) : [];
      set({ logs, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addLog: async (logData) => {
    const log: FuelLog = {
      ...logData,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    const logs = [...get().logs, log];
    await AsyncStorage.setItem(`fuel_logs_${logData.userId}`, JSON.stringify(logs));
    set({ logs });
    return log;
  },

  updateLog: async (id, data) => {
    const logs = get().logs.map((l) => (l.id === id ? { ...l, ...data } : l));
    const userId = get().logs.find((l) => l.id === id)?.userId;
    if (userId) await AsyncStorage.setItem(`fuel_logs_${userId}`, JSON.stringify(logs));
    set({ logs });
  },

  deleteLog: async (id) => {
    const log = get().logs.find((l) => l.id === id);
    if (!log) return;
    const logs = get().logs.filter((l) => l.id !== id);
    await AsyncStorage.setItem(`fuel_logs_${log.userId}`, JSON.stringify(logs));
    set({ logs });
  },

  getLogsForCar: (carId) => {
    return get()
      .logs.filter((l) => l.carId === carId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },
}));
