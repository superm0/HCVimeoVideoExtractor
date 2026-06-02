import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, startOfMonth, subMonths, isAfter } from 'date-fns';
import { useCarStore } from '../../store/carStore';
import { useFuelLogStore } from '../../store/fuelLogStore';
import { useAuthStore } from '../../store/authStore';
import { Colors } from '../../constants/colors';
import { Theme } from '../../constants/theme';
import { formatCurrency, formatVolume, formatDate, formatFuelType } from '../../utils/formatters';
import { FuelLog, FuelType } from '../../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FuelHistoryScreenProps {
  navigation: any;
}

type DateRangeFilter = 'this_month' | 'last_3_months' | 'this_year' | 'all';

interface SectionData {
  title: string;
  monthKey: string;
  totalCost: number;
  totalLiters: number;
  data: FuelLog[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const DATE_RANGE_OPTIONS: { value: DateRangeFilter; label: string }[] = [
  { value: 'this_month', label: 'This Month' },
  { value: 'last_3_months', label: 'Last 3 Months' },
  { value: 'this_year', label: 'This Year' },
  { value: 'all', label: 'All Time' },
];

const FUEL_TYPE_COLORS: Record<FuelType, string> = {
  gasoline: Colors.fuelTypes.gasoline,
  diesel: Colors.fuelTypes.diesel,
  electric: Colors.fuelTypes.electric,
  hybrid: Colors.fuelTypes.hybrid,
  lpg: Colors.fuelTypes.lpg,
  cng: Colors.fuelTypes.cng,
};

function getCutoffDate(range: DateRangeFilter): Date | null {
  const now = new Date();
  switch (range) {
    case 'this_month':
      return startOfMonth(now);
    case 'last_3_months':
      return startOfMonth(subMonths(now, 2));
    case 'this_year':
      return new Date(now.getFullYear(), 0, 1);
    case 'all':
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

// ── Car Filter Dropdown (simple inline list) ───────────────────────────────

interface CarFilterBarProps {
  carOptions: { id: string | null; label: string }[];
  selectedCarId: string | null;
  onSelect: (id: string | null) => void;
}

const CarFilterBar: React.FC<CarFilterBarProps> = ({ carOptions, selectedCarId, onSelect }) => (
  <View style={styles.carFilterScroll}>
    {carOptions.map((opt) => {
      const isActive = opt.id === selectedCarId;
      return (
        <TouchableOpacity
          key={opt.id ?? '__all__'}
          style={[styles.carFilterChip, isActive && styles.carFilterChipActive]}
          onPress={() => onSelect(opt.id)}
          activeOpacity={0.75}
        >
          <Text style={[styles.carFilterChipText, isActive && styles.carFilterChipTextActive]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

// ── Date Range Filter ──────────────────────────────────────────────────────

interface DateRangeBarProps {
  selected: DateRangeFilter;
  onSelect: (v: DateRangeFilter) => void;
}

const DateRangeBar: React.FC<DateRangeBarProps> = ({ selected, onSelect }) => (
  <View style={styles.dateRangeBar}>
    {DATE_RANGE_OPTIONS.map((opt) => {
      const isActive = opt.value === selected;
      return (
        <TouchableOpacity
          key={opt.value}
          style={[styles.dateRangeChip, isActive && styles.dateRangeChipActive]}
          onPress={() => onSelect(opt.value)}
          activeOpacity={0.75}
        >
          <Text style={[styles.dateRangeChipText, isActive && styles.dateRangeChipTextActive]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

// ── Summary Strip ──────────────────────────────────────────────────────────

interface SummaryStripProps {
  fillUpsCount: number;
  totalLiters: number;
  totalCost: number;
  currencySymbol: string;
}

const SummaryStrip: React.FC<SummaryStripProps> = ({
  fillUpsCount,
  totalLiters,
  totalCost,
  currencySymbol,
}) => (
  <View style={styles.summaryStrip}>
    <View style={styles.summaryItem}>
      <Text style={styles.summaryValue}>{fillUpsCount}</Text>
      <Text style={styles.summaryLabel}>Fill-ups</Text>
    </View>
    <View style={styles.summaryDivider} />
    <View style={styles.summaryItem}>
      <Text style={styles.summaryValue}>{formatVolume(totalLiters)}</Text>
      <Text style={styles.summaryLabel}>Volume</Text>
    </View>
    <View style={styles.summaryDivider} />
    <View style={styles.summaryItem}>
      <Text style={styles.summaryValue}>{formatCurrency(totalCost, currencySymbol)}</Text>
      <Text style={styles.summaryLabel}>Total Cost</Text>
    </View>
  </View>
);

// ── Section Header ─────────────────────────────────────────────────────────

interface MonthSectionHeaderProps {
  title: string;
  totalCost: number;
  totalLiters: number;
  currencySymbol: string;
}

const MonthSectionHeader: React.FC<MonthSectionHeaderProps> = ({
  title,
  totalCost,
  totalLiters,
  currencySymbol,
}) => (
  <View style={styles.monthSectionHeader}>
    <Text style={styles.monthSectionTitle}>{title}</Text>
    <View style={styles.monthSectionRight}>
      <Text style={styles.monthSectionLiters}>{formatVolume(totalLiters)}</Text>
      <Text style={styles.monthSectionCost}>{formatCurrency(totalCost, currencySymbol)}</Text>
    </View>
  </View>
);

// ── Fuel Log Row Card ──────────────────────────────────────────────────────

interface FuelLogRowProps {
  log: FuelLog;
  carName: string;
  currencySymbol: string;
  onPress: () => void;
}

const FuelLogRowCard: React.FC<FuelLogRowProps> = ({ log, carName, currencySymbol, onPress }) => {
  const fuelColor = FUEL_TYPE_COLORS[log.fuelType] ?? Colors.primary;

  return (
    <TouchableOpacity
      style={styles.logCard}
      onPress={onPress}
      activeOpacity={0.72}
    >
      {/* Left: fuel drop icon in colored circle */}
      <View style={[styles.logIconCircle, { backgroundColor: fuelColor + '1A' }]}>
        <Ionicons name="water" size={20} color={fuelColor} />
      </View>

      {/* Center: car name, date, station */}
      <View style={styles.logCenter}>
        <Text style={styles.logCarName} numberOfLines={1}>{carName}</Text>
        <Text style={styles.logDate}>{formatDate(log.date)}</Text>
        {log.stationName ? (
          <Text style={styles.logStation} numberOfLines={1}>
            <Ionicons name="location-outline" size={11} color={Colors.gray400} />
            {' '}{log.stationName}
          </Text>
        ) : null}
        <View style={styles.logFuelTypePill}>
          <Text style={[styles.logFuelTypeText, { color: fuelColor }]}>
            {formatFuelType(log.fuelType)}
          </Text>
        </View>
      </View>

      {/* Right: liters, cost, full-tank dot */}
      <View style={styles.logRight}>
        <Text style={styles.logLiters}>{formatVolume(log.liters)}</Text>
        <Text style={styles.logCost}>{formatCurrency(log.totalCost, currencySymbol)}</Text>
        {log.fullTank && (
          <View style={styles.fullTankBadge}>
            <View style={[styles.fullTankDot, { backgroundColor: Colors.secondary }]} />
            <Text style={styles.fullTankText}>Full</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

// ── Empty State ────────────────────────────────────────────────────────────

interface EmptyProps {
  onAddPress: () => void;
  isFiltered: boolean;
}

const EmptyHistoryState: React.FC<EmptyProps> = ({ onAddPress, isFiltered }) => (
  <View style={styles.emptyContainer}>
    <View style={styles.emptyIconCircle}>
      <Ionicons name="water-outline" size={36} color={Colors.gray300} />
    </View>
    <Text style={styles.emptyTitle}>
      {isFiltered ? 'No fill-ups match your filters' : 'No fill-ups yet'}
    </Text>
    <Text style={styles.emptySubtitle}>
      {isFiltered
        ? 'Try changing the date range or car filter.'
        : 'Start tracking your fuel usage by logging your first fill-up.'}
    </Text>
    {!isFiltered && (
      <TouchableOpacity style={styles.emptyAction} onPress={onAddPress} activeOpacity={0.8}>
        <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
        <Text style={styles.emptyActionText}>Add Fill-up</Text>
      </TouchableOpacity>
    )}
  </View>
);

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

const FuelHistoryScreen: React.FC<FuelHistoryScreenProps> = ({ navigation }) => {
  const { user, settings } = useAuthStore();
  const { cars } = useCarStore();
  const { logs } = useFuelLogStore();

  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRangeFilter>('all');

  // ── Derived data ───────────────────────────────────────────────────────────

  const userCars = useMemo(
    () => cars.filter((c) => c.userId === user?.id),
    [cars, user?.id]
  );

  const carOptions = useMemo(() => [
    { id: null, label: 'All Cars' },
    ...userCars.map((c) => ({ id: c.id, label: c.nickname || `${c.make} ${c.model}` })),
  ], [userCars]);

  // All logs for this user, filtered by car and date
  const filteredLogs = useMemo(() => {
    const cutoff = getCutoffDate(dateRange);
    return logs
      .filter((l) => {
        if (l.userId !== user?.id) return false;
        if (selectedCarId !== null && l.carId !== selectedCarId) return false;
        if (cutoff !== null) {
          const logDate = parseISO(l.date);
          // Keep only logs on or after the cutoff date
          if (logDate.getTime() < cutoff.getTime()) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [logs, user?.id, selectedCarId, dateRange]);

  // Summary stats for the filtered set
  const summaryStats = useMemo(() => ({
    fillUpsCount: filteredLogs.length,
    totalLiters: filteredLogs.reduce((s, l) => s + l.liters, 0),
    totalCost: filteredLogs.reduce((s, l) => s + l.totalCost, 0),
  }), [filteredLogs]);

  // Group by month for SectionList
  const sections: SectionData[] = useMemo(() => {
    const monthMap = new Map<string, FuelLog[]>();
    for (const log of filteredLogs) {
      const monthKey = format(parseISO(log.date), 'yyyy-MM');
      if (!monthMap.has(monthKey)) monthMap.set(monthKey, []);
      monthMap.get(monthKey)!.push(log);
    }

    const result: SectionData[] = [];
    // monthMap iteration order is insertion order — filteredLogs is newest-first
    // so month keys are in newest-first order
    monthMap.forEach((monthLogs, monthKey) => {
      const monthDate = parseISO(`${monthKey}-01`);
      const title = format(monthDate, 'MMMM yyyy');
      const totalCost = monthLogs.reduce((s, l) => s + l.totalCost, 0);
      const totalLiters = monthLogs.reduce((s, l) => s + l.liters, 0);
      result.push({ title, monthKey, totalCost, totalLiters, data: monthLogs });
    });

    return result;
  }, [filteredLogs]);

  const isFiltered = selectedCarId !== null || dateRange !== 'all';
  const currencySymbol = settings.currencySymbol;

  // ── Navigation ─────────────────────────────────────────────────────────────

  const goToAddFuelLog = () => navigation.navigate('AddFuelLog');
  const goToLogDetail = (logId: string) => navigation.navigate('FuelLogDetail', { logId });

  // ── Helpers ────────────────────────────────────────────────────────────────

  function getCarName(carId: string): string {
    const car = userCars.find((c) => c.id === carId);
    if (!car) return 'Unknown Car';
    return car.nickname || `${car.make} ${car.model}`;
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Fuel History</Text>
        <TouchableOpacity
          style={styles.headerFilterButton}
          onPress={() => {
            // Reset filters on tap — a simple UX for "clear filters"
            setSelectedCarId(null);
            setDateRange('all');
          }}
          activeOpacity={0.75}
        >
          <Ionicons
            name={isFiltered ? 'funnel' : 'funnel-outline'}
            size={20}
            color={isFiltered ? Colors.primary : Colors.gray600}
          />
          {isFiltered && <View style={styles.filterActiveDot} />}
        </TouchableOpacity>
      </View>

      {/* ── Filter bar ──────────────────────────────────────────────────────── */}
      <View style={styles.filterBarWrapper}>
        {userCars.length > 1 && (
          <CarFilterBar
            carOptions={carOptions}
            selectedCarId={selectedCarId}
            onSelect={setSelectedCarId}
          />
        )}
        <DateRangeBar selected={dateRange} onSelect={setDateRange} />
      </View>

      {/* ── Summary strip ───────────────────────────────────────────────────── */}
      <SummaryStrip
        fillUpsCount={summaryStats.fillUpsCount}
        totalLiters={summaryStats.totalLiters}
        totalCost={summaryStats.totalCost}
        currencySymbol={currencySymbol}
      />

      {/* ── SectionList ─────────────────────────────────────────────────────── */}
      {sections.length === 0 ? (
        <EmptyHistoryState onAddPress={goToAddFuelLog} isFiltered={isFiltered} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <MonthSectionHeader
              title={section.title}
              totalCost={section.totalCost}
              totalLiters={section.totalLiters}
              currencySymbol={currencySymbol}
            />
          )}
          renderItem={({ item }) => (
            <FuelLogRowCard
              log={item}
              carName={getCarName(item.carId)}
              currencySymbol={currencySymbol}
              onPress={() => goToLogDetail(item.id)}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
          SectionSeparatorComponent={() => <View style={styles.sectionSeparator} />}
        />
      )}

      {/* ── FAB ─────────────────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={goToAddFuelLog}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color={Colors.white} />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.gray50,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.md,
    paddingTop: Theme.spacing.sm,
    paddingBottom: Theme.spacing.xs,
    backgroundColor: Colors.gray50,
  },
  headerTitle: {
    fontSize: Theme.fontSize.xxl,
    fontWeight: Theme.fontWeight.bold,
    color: Colors.gray900,
  },
  headerFilterButton: {
    width: 38,
    height: 38,
    borderRadius: Theme.borderRadius.full,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadow.sm,
    position: 'relative',
  },
  filterActiveDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    borderWidth: 1.5,
    borderColor: Colors.white,
  },

  // ── Filter bar ──
  filterBarWrapper: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
    paddingBottom: Theme.spacing.sm,
  },
  carFilterScroll: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    paddingHorizontal: Theme.spacing.md,
    paddingTop: Theme.spacing.sm,
    paddingBottom: Theme.spacing.xs,
    gap: Theme.spacing.xs,
  },
  carFilterChip: {
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    backgroundColor: Colors.white,
  },
  carFilterChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryFaded,
  },
  carFilterChipText: {
    fontSize: Theme.fontSize.sm,
    fontWeight: Theme.fontWeight.semibold,
    color: Colors.gray500,
  },
  carFilterChipTextActive: {
    color: Colors.primary,
  },
  dateRangeBar: {
    flexDirection: 'row',
    paddingHorizontal: Theme.spacing.md,
    gap: Theme.spacing.xs,
  },
  dateRangeChip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    backgroundColor: Colors.white,
    alignItems: 'center',
  },
  dateRangeChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  dateRangeChipText: {
    fontSize: Theme.fontSize.xs,
    fontWeight: Theme.fontWeight.semibold,
    color: Colors.gray500,
  },
  dateRangeChipTextActive: {
    color: Colors.white,
  },

  // ── Summary strip ──
  summaryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    marginHorizontal: Theme.spacing.md,
    marginTop: Theme.spacing.sm,
    marginBottom: Theme.spacing.xs,
    borderRadius: Theme.borderRadius.lg,
    paddingVertical: Theme.spacing.md,
    ...Theme.shadow.sm,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: Theme.fontSize.md,
    fontWeight: Theme.fontWeight.bold,
    color: Colors.gray900,
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: Theme.fontSize.xs,
    fontWeight: Theme.fontWeight.medium,
    color: Colors.gray400,
  },
  summaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.gray100,
  },

  // ── Section list ──
  listContent: {
    paddingHorizontal: Theme.spacing.md,
    paddingTop: Theme.spacing.sm,
    paddingBottom: 96, // FAB clearance
  },
  itemSeparator: {
    height: Theme.spacing.xs,
  },
  sectionSeparator: {
    height: Theme.spacing.xs,
  },

  // ── Month section header ──
  monthSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: 4,
  },
  monthSectionTitle: {
    fontSize: Theme.fontSize.base,
    fontWeight: Theme.fontWeight.bold,
    color: Colors.gray700,
  },
  monthSectionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  monthSectionLiters: {
    fontSize: Theme.fontSize.sm,
    fontWeight: Theme.fontWeight.medium,
    color: Colors.gray500,
  },
  monthSectionCost: {
    fontSize: Theme.fontSize.sm,
    fontWeight: Theme.fontWeight.bold,
    color: Colors.gray700,
  },

  // ── Log card ──
  logCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.md,
    gap: Theme.spacing.sm,
    ...Theme.shadow.sm,
  },
  logIconCircle: {
    width: 44,
    height: 44,
    borderRadius: Theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  logCenter: {
    flex: 1,
    gap: 2,
  },
  logCarName: {
    fontSize: Theme.fontSize.base,
    fontWeight: Theme.fontWeight.semibold,
    color: Colors.gray800,
  },
  logDate: {
    fontSize: Theme.fontSize.sm,
    fontWeight: Theme.fontWeight.bold,
    color: Colors.gray600,
  },
  logStation: {
    fontSize: Theme.fontSize.xs,
    color: Colors.gray400,
    marginTop: 1,
  },
  logFuelTypePill: {
    alignSelf: 'flex-start',
    marginTop: 3,
  },
  logFuelTypeText: {
    fontSize: Theme.fontSize.xs,
    fontWeight: Theme.fontWeight.semibold,
  },
  logRight: {
    alignItems: 'flex-end',
    flexShrink: 0,
    gap: 3,
  },
  logLiters: {
    fontSize: Theme.fontSize.lg,
    fontWeight: Theme.fontWeight.bold,
    color: Colors.gray900,
  },
  logCost: {
    fontSize: Theme.fontSize.sm,
    fontWeight: Theme.fontWeight.medium,
    color: Colors.gray500,
  },
  fullTankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  fullTankDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  fullTankText: {
    fontSize: Theme.fontSize.xs,
    fontWeight: Theme.fontWeight.semibold,
    color: Colors.secondary,
  },

  // ── Empty state ──
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Theme.spacing.xl,
    paddingBottom: Theme.spacing.xxl,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: Theme.borderRadius.full,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.md,
  },
  emptyTitle: {
    fontSize: Theme.fontSize.lg,
    fontWeight: Theme.fontWeight.bold,
    color: Colors.gray700,
    textAlign: 'center',
    marginBottom: Theme.spacing.xs,
  },
  emptySubtitle: {
    fontSize: Theme.fontSize.sm,
    color: Colors.gray400,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Theme.spacing.lg,
  },
  emptyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
    backgroundColor: Colors.primaryFaded,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.sm + 2,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  emptyActionText: {
    fontSize: Theme.fontSize.base,
    fontWeight: Theme.fontWeight.semibold,
    color: Colors.primary,
  },

  // ── FAB ──
  fab: {
    position: 'absolute',
    bottom: Theme.spacing.xl,
    right: Theme.spacing.lg,
    width: 58,
    height: 58,
    borderRadius: Theme.borderRadius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadow.lg,
  },
});

export default FuelHistoryScreen;
