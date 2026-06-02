import { FuelLog, FuelStats, MonthlyReport } from '../types';
import { format, parseISO, startOfMonth, isSameMonth } from 'date-fns';

export function calculateConsumption(liters: number, distanceKm: number): number {
  if (distanceKm <= 0) return 0;
  return (liters / distanceKm) * 100; // L/100km
}

export function calculateFuelStats(logs: FuelLog[]): FuelStats {
  if (logs.length === 0) {
    return {
      totalFillUps: 0,
      totalLiters: 0,
      totalCost: 0,
      avgConsumption: 0,
      avgCostPerKm: 0,
      totalDistance: 0,
    };
  }

  const sorted = [...logs].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const totalLiters = logs.reduce((sum, l) => sum + l.liters, 0);
  const totalCost = logs.reduce((sum, l) => sum + l.totalCost, 0);

  let totalDistance = 0;
  let consumptionLogs: { liters: number; distance: number }[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const distance = sorted[i].odometer - sorted[i - 1].odometer;
    if (distance > 0) {
      totalDistance += distance;
      if (sorted[i].fullTank && sorted[i - 1].fullTank) {
        consumptionLogs.push({ liters: sorted[i].liters, distance });
      }
    }
  }

  const avgConsumption =
    consumptionLogs.length > 0
      ? consumptionLogs.reduce((sum, l) => sum + calculateConsumption(l.liters, l.distance), 0) /
        consumptionLogs.length
      : 0;

  const avgCostPerKm = totalDistance > 0 ? totalCost / totalDistance : 0;

  return {
    totalFillUps: logs.length,
    totalLiters,
    totalCost,
    avgConsumption,
    avgCostPerKm,
    lastFillUp: sorted[sorted.length - 1],
    totalDistance,
  };
}

export function getMonthlyReports(logs: FuelLog[]): MonthlyReport[] {
  if (logs.length === 0) return [];

  const sorted = [...logs].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const monthMap = new Map<string, { logs: FuelLog[]; prevLog?: FuelLog }>();

  sorted.forEach((log, idx) => {
    const month = format(parseISO(log.date), 'yyyy-MM');
    if (!monthMap.has(month)) {
      monthMap.set(month, { logs: [], prevLog: idx > 0 ? sorted[idx - 1] : undefined });
    }
    monthMap.get(month)!.logs.push(log);
  });

  const reports: MonthlyReport[] = [];

  monthMap.forEach(({ logs: monthLogs }, month) => {
    const liters = monthLogs.reduce((sum, l) => sum + l.liters, 0);
    const cost = monthLogs.reduce((sum, l) => sum + l.totalCost, 0);

    let distance = 0;
    for (let i = 1; i < monthLogs.length; i++) {
      const d = monthLogs[i].odometer - monthLogs[i - 1].odometer;
      if (d > 0) distance += d;
    }

    reports.push({
      month,
      fillUps: monthLogs.length,
      liters,
      cost,
      distance,
      avgConsumption: distance > 0 ? calculateConsumption(liters, distance) : 0,
    });
  });

  return reports.sort((a, b) => a.month.localeCompare(b.month));
}

export function kmToMiles(km: number): number {
  return km * 0.621371;
}

export function milesToKm(miles: number): number {
  return miles * 1.60934;
}

export function litersToGallons(liters: number): number {
  return liters * 0.264172;
}

export function gallonsToLiters(gallons: number): number {
  return gallons * 3.78541;
}
