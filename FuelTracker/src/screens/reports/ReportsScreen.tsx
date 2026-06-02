import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { useCarStore } from '../../store/carStore';
import { useFuelLogStore } from '../../store/fuelLogStore';
import { useAuthStore } from '../../store/authStore';
import {
  calculateFuelStats,
  getMonthlyReports,
  calculateConsumption,
} from '../../utils/calculations';
import {
  formatCurrency,
  formatMonth,
  formatConsumption,
  formatDistance,
  formatVolume,
} from '../../utils/formatters';
import { Colors } from '../../constants/colors';
import { Theme } from '../../constants/theme';
import EmptyState from '../../components/common/EmptyState';
import {
  format,
  parseISO,
  subMonths,
  isAfter,
  isBefore,
  startOfMonth,
  endOfMonth,
} from 'date-fns';
import { FuelLog, Car } from '../../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReportsScreenProps {
  navigation: any;
}

type TimePeriod = '3M' | '6M' | '1Y' | 'All';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 48;
const CHART_HEIGHT = 200;

const PERIOD_LABELS: TimePeriod[] = ['3M', '6M', '1Y', 'All'];

const CHART_CONFIG = {
  backgroundColor: '#fff',
  backgroundGradientFrom: '#fff',
  backgroundGradientTo: '#fff',
  color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
  strokeWidth: 2,
  barPercentage: 0.7,
  decimalPlaces: 1,
  propsForDots: {
    r: '4',
    strokeWidth: '2',
    stroke: Colors.primary,
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCarLabel(car: Car): string {
  return car.nickname || `${car.make} ${car.model}`;
}

function filterLogsByPeriod(logs: FuelLog[], period: TimePeriod): FuelLog[] {
  if (period === 'All') return logs;
  const now = new Date();
  const monthsBack = period === '3M' ? 3 : period === '6M' ? 6 : 12;
  // Align cutoff to start of that month for clean boundaries
  const cutoff = startOfMonth(subMonths(now, monthsBack));
  return logs.filter((l) => isAfter(parseISO(l.date), cutoff));
}

function filterLogsByPreviousPeriod(logs: FuelLog[], period: TimePeriod): FuelLog[] {
  if (period === 'All') return [];
  const now = new Date();
  const monthsBack = period === '3M' ? 3 : period === '6M' ? 6 : 12;
  const cutoff = startOfMonth(subMonths(now, monthsBack));
  const prevCutoff = startOfMonth(subMonths(now, monthsBack * 2));
  // Include logs up to end of last month of previous period
  const cutoffEnd = endOfMonth(subMonths(cutoff, 1));
  return logs.filter((l) => {
    const d = parseISO(l.date);
    return isAfter(d, prevCutoff) && isBefore(d, cutoffEnd);
  });
}

function percentChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

function avgDaysBetweenFillups(logs: FuelLog[]): number {
  if (logs.length < 2) return 0;
  const sorted = [...logs].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  let totalDays = 0;
  for (let i = 1; i < sorted.length; i++) {
    const diff =
      (new Date(sorted[i].date).getTime() - new Date(sorted[i - 1].date).getTime()) /
      (1000 * 60 * 60 * 24);
    totalDays += diff;
  }
  return totalDays / (sorted.length - 1);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

// ── Section Card ─────────────────────────────────────────────────────────────

interface SectionCardProps {
  title: string;
  children: React.ReactNode;
  icon?: keyof typeof Ionicons.glyphMap;
}

const SectionCard: React.FC<SectionCardProps> = ({ title, children, icon }) => (
  <View style={styles.sectionCard}>
    <View style={styles.sectionCardHeader}>
      {icon ? (
        <View style={styles.sectionCardIconBg}>
          <Ionicons name={icon} size={16} color={Colors.primary} />
        </View>
      ) : null}
      <Text style={styles.sectionCardTitle}>{title}</Text>
    </View>
    {children}
  </View>
);

// ── Summary Pill ─────────────────────────────────────────────────────────────

interface SummaryPillProps {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
}

const SummaryPill: React.FC<SummaryPillProps> = ({
  label,
  value,
  icon,
  iconColor,
  iconBg,
}) => (
  <View style={styles.summaryPill}>
    <View style={[styles.summaryPillIcon, { backgroundColor: iconBg }]}>
      <Ionicons name={icon} size={18} color={iconColor} />
    </View>
    <Text style={styles.summaryPillValue} numberOfLines={1} adjustsFontSizeToFit>
      {value}
    </Text>
    <Text style={styles.summaryPillLabel} numberOfLines={2}>
      {label}
    </Text>
  </View>
);

// ── Comparison Row ────────────────────────────────────────────────────────────

interface ComparisonRowProps {
  label: string;
  current: string;
  previous: string;
  change: number;
  lowerIsBetter?: boolean;
}

const ComparisonRow: React.FC<ComparisonRowProps> = ({
  label,
  current,
  previous,
  change,
  lowerIsBetter = false,
}) => {
  const hasChange = change !== 0;
  const isImprovement = lowerIsBetter ? change < 0 : change > 0;
  const changeColor = hasChange
    ? isImprovement
      ? Colors.secondary
      : Colors.danger
    : Colors.gray400;
  const changeIcon: keyof typeof Ionicons.glyphMap =
    change > 0 ? 'arrow-up' : change < 0 ? 'arrow-down' : 'remove';

  return (
    <View style={styles.compRow}>
      <Text style={styles.compRowLabel}>{label}</Text>
      <View style={styles.compRowValues}>
        <View style={styles.compValueBlock}>
          <Text style={styles.compValueText}>{current}</Text>
        </View>
        <View style={styles.compValueBlock}>
          <Text style={[styles.compValueText, styles.compValuePrev]}>{previous}</Text>
        </View>
        {hasChange ? (
          <View style={[styles.compChangeBadge, { backgroundColor: changeColor + '18' }]}>
            <Ionicons name={changeIcon} size={11} color={changeColor} />
            <Text style={[styles.compChangeText, { color: changeColor }]}>
              {Math.abs(change).toFixed(1)}%
            </Text>
          </View>
        ) : (
          <View style={styles.compChangeBadge}>
            <Text style={[styles.compChangeText, { color: Colors.gray400 }]}>—</Text>
          </View>
        )}
      </View>
    </View>
  );
};

// ── Car Cost Bar ──────────────────────────────────────────────────────────────

interface CarCostBarProps {
  label: string;
  cost: number;
  totalCost: number;
  color: string;
  symbol: string;
}

const CarCostBar: React.FC<CarCostBarProps> = ({ label, cost, totalCost, color, symbol }) => {
  const pct = totalCost > 0 ? (cost / totalCost) * 100 : 0;
  return (
    <View style={styles.carCostBarRow}>
      <View style={styles.carCostBarLeft}>
        <View style={[styles.carCostDot, { backgroundColor: color }]} />
        <Text style={styles.carCostLabel} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <View style={styles.carCostBarTrack}>
        <View
          style={[
            styles.carCostBarFill,
            { width: `${Math.max(pct, 2)}%` as any, backgroundColor: color },
          ]}
        />
      </View>
      <View style={styles.carCostBarRight}>
        <Text style={styles.carCostPct}>{pct.toFixed(0)}%</Text>
        <Text style={styles.carCostValue}>{formatCurrency(cost, symbol)}</Text>
      </View>
    </View>
  );
};

// ── Fill-up Timeline Dot ───────────────────────────────────────────────────────

interface FillupDotProps {
  date: string;
  isFirst: boolean;
  isLast: boolean;
}

const FillupDot: React.FC<FillupDotProps> = ({ date, isFirst, isLast }) => (
  <View style={styles.timelineDotWrapper}>
    {!isFirst && <View style={styles.timelineLine} />}
    <View style={styles.timelineDot} />
    {!isLast && <View style={styles.timelineLine} />}
    <Text style={styles.timelineDotLabel}>{format(parseISO(date), 'MMM d')}</Text>
  </View>
);

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

const ReportsScreen: React.FC<ReportsScreenProps> = ({ navigation }) => {
  const { user, settings } = useAuthStore();
  const { cars } = useCarStore();
  const { logs } = useFuelLogStore();

  const [selectedCarId, setSelectedCarId] = useState<string | null>(null); // null = All
  const [period, setPeriod] = useState<TimePeriod>('6M');

  const symbol = settings.currencySymbol;

  // ── Derived: user's cars ──────────────────────────────────────────────────

  const userCars = useMemo(
    () => cars.filter((c) => c.userId === user?.id),
    [cars, user?.id]
  );

  // ── Derived: filtered logs ────────────────────────────────────────────────

  const baseLogs = useMemo(() => {
    return logs.filter((l) => {
      if (!userCars.find((c) => c.id === l.carId)) return false;
      if (selectedCarId !== null && l.carId !== selectedCarId) return false;
      return true;
    });
  }, [logs, userCars, selectedCarId]);

  const periodLogs = useMemo(() => filterLogsByPeriod(baseLogs, period), [baseLogs, period]);
  const prevPeriodLogs = useMemo(
    () => filterLogsByPreviousPeriod(baseLogs, period),
    [baseLogs, period]
  );

  // ── Empty state guard ─────────────────────────────────────────────────────

  if (baseLogs.length === 0) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Reports & Analytics</Text>
        </View>
        <EmptyState
          icon="bar-chart-outline"
          title="No data yet"
          subtitle="Add fuel logs to start seeing analytics and reports."
        />
      </SafeAreaView>
    );
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  const stats = calculateFuelStats(periodLogs);
  const prevStats = calculateFuelStats(prevPeriodLogs);

  // ── Monthly reports (for charts) ──────────────────────────────────────────

  const monthlyReports = getMonthlyReports(periodLogs);

  // ── Period range label using formatMonth ──────────────────────────────────

  const periodRangeLabel = useMemo(() => {
    if (monthlyReports.length === 0) return '';
    const first = monthlyReports[0].month;
    const last = monthlyReports[monthlyReports.length - 1].month;
    if (first === last) return formatMonth(first);
    return `${formatMonth(first)} – ${formatMonth(last)}`;
  }, [monthlyReports]);

  // ── Line chart data (consumption L/100km per month) ───────────────────────

  const lineChartData = useMemo(() => {
    const reports = monthlyReports.slice(-8);
    if (reports.length === 0) {
      return {
        labels: ['—'],
        datasets: [{ data: [0], color: (opacity = 1) => `rgba(37,99,235,${opacity})` }],
      };
    }
    const labels = reports.map((r) => format(parseISO(`${r.month}-01`), 'MMM'));
    const data = reports.map((r) =>
      r.avgConsumption > 0 ? parseFloat(r.avgConsumption.toFixed(1)) : 0
    );
    const safeData = data.every((d) => d === 0) ? data.map(() => 0.1) : data;
    return {
      labels,
      datasets: [
        {
          data: safeData,
          color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
          strokeWidth: 2,
        },
      ],
    };
  }, [monthlyReports]);

  // ── Bar chart data (monthly costs) ────────────────────────────────────────

  const barChartData = useMemo(() => {
    const reports = monthlyReports.slice(-7);
    if (reports.length === 0) {
      return { labels: ['—'], datasets: [{ data: [0] }] };
    }
    const labels = reports.map((r) => format(parseISO(`${r.month}-01`), 'MMM'));
    const data = reports.map((r) => parseFloat(r.cost.toFixed(2)));
    return {
      labels,
      datasets: [{ data }],
    };
  }, [monthlyReports]);

  // ── Comparison metrics ────────────────────────────────────────────────────

  const compMetrics = useMemo(
    () => [
      {
        label: 'Avg L/100km',
        current:
          stats.avgConsumption > 0 ? formatConsumption(stats.avgConsumption) : '—',
        previous:
          prevStats.avgConsumption > 0 ? formatConsumption(prevStats.avgConsumption) : '—',
        change: percentChange(stats.avgConsumption, prevStats.avgConsumption),
        lowerIsBetter: true,
      },
      {
        label: 'Total Cost',
        current: formatCurrency(stats.totalCost, symbol),
        previous: formatCurrency(prevStats.totalCost, symbol),
        change: percentChange(stats.totalCost, prevStats.totalCost),
        lowerIsBetter: true,
      },
      {
        label: 'Total Volume',
        current: formatVolume(stats.totalLiters),
        previous: formatVolume(prevStats.totalLiters),
        change: percentChange(stats.totalLiters, prevStats.totalLiters),
        lowerIsBetter: true,
      },
      {
        label: 'Total Distance',
        current: formatDistance(stats.totalDistance),
        previous: formatDistance(prevStats.totalDistance),
        change: percentChange(stats.totalDistance, prevStats.totalDistance),
        lowerIsBetter: false,
      },
    ],
    [stats, prevStats, symbol]
  );

  // ── Fill-up frequency ─────────────────────────────────────────────────────

  const fillupTimeline = useMemo(() => {
    const sorted = [...periodLogs].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    return sorted.slice(-10);
  }, [periodLogs]);

  const avgDays = useMemo(() => avgDaysBetweenFillups(periodLogs), [periodLogs]);

  // ── Cost breakdown by car ─────────────────────────────────────────────────

  const carCostBreakdown = useMemo(() => {
    const totalCost = periodLogs.reduce((s, l) => s + l.totalCost, 0);
    return userCars
      .map((car, idx) => {
        const carLogs = periodLogs.filter((l) => l.carId === car.id);
        const cost = carLogs.reduce((s, l) => s + l.totalCost, 0);
        return {
          car,
          cost,
          totalCost,
          color: Colors.chart[idx % Colors.chart.length],
        };
      })
      .filter((c) => c.cost > 0)
      .sort((a, b) => b.cost - a.cost);
  }, [periodLogs, userCars]);

  // ── Best & Worst consumption ──────────────────────────────────────────────

  const { bestLog, worstLog } = useMemo(() => {
    const sorted = [...periodLogs].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    type ConsEntry = { log: FuelLog; consumption: number };
    const entries: ConsEntry[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const dist = sorted[i].odometer - sorted[i - 1].odometer;
      if (dist > 0 && sorted[i].fullTank && sorted[i - 1].fullTank) {
        entries.push({
          log: sorted[i],
          consumption: calculateConsumption(sorted[i].liters, dist),
        });
      }
    }
    if (entries.length === 0) return { bestLog: null, worstLog: null };
    const best = entries.reduce(
      (min, e) => (e.consumption < min.consumption ? e : min),
      entries[0]
    );
    const worst = entries.reduce(
      (max, e) => (e.consumption > max.consumption ? e : max),
      entries[0]
    );
    return { bestLog: best, worstLog: worst };
  }, [periodLogs]);

  // ── Summary card values ───────────────────────────────────────────────────

  const summaryCards = useMemo(
    () => [
      {
        label: 'Total Cost',
        value: formatCurrency(stats.totalCost, symbol),
        icon: 'cash-outline' as keyof typeof Ionicons.glyphMap,
        iconColor: Colors.secondary,
        iconBg: Colors.secondaryFaded,
      },
      {
        label: 'Total Volume',
        value: formatVolume(stats.totalLiters),
        icon: 'water-outline' as keyof typeof Ionicons.glyphMap,
        iconColor: Colors.primary,
        iconBg: Colors.primaryFaded,
      },
      {
        label: 'Avg Efficiency',
        value:
          stats.avgConsumption > 0 ? formatConsumption(stats.avgConsumption) : '—',
        icon: 'speedometer-outline' as keyof typeof Ionicons.glyphMap,
        iconColor: Colors.accent,
        iconBg: Colors.accentFaded,
      },
      {
        label: 'Total Distance',
        value: stats.totalDistance > 0 ? formatDistance(stats.totalDistance) : '—',
        icon: 'navigate-outline' as keyof typeof Ionicons.glyphMap,
        iconColor: Colors.warning,
        iconBg: Colors.warningFaded,
      },
      {
        label: 'Cost / km',
        value:
          stats.avgCostPerKm > 0
            ? `${symbol}${stats.avgCostPerKm.toFixed(3)}`
            : '—',
        icon: 'trending-up-outline' as keyof typeof Ionicons.glyphMap,
        iconColor: Colors.primaryDark,
        iconBg: Colors.primaryFaded,
      },
    ],
    [stats, symbol]
  );

  // ── Export CSV ────────────────────────────────────────────────────────────

  const handleExportCSV = async () => {
    const headers = [
      'Date',
      'Car',
      'Odometer (km)',
      'Liters',
      'Price/L',
      'Total Cost',
      'Full Tank',
      'Station',
    ];
    const rows = [...periodLogs]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map((l) => {
        const car = userCars.find((c) => c.id === l.carId);
        const carName = car ? getCarLabel(car) : l.carId;
        return [
          format(parseISO(l.date), 'yyyy-MM-dd'),
          `"${carName}"`,
          l.odometer.toString(),
          l.liters.toFixed(2),
          l.pricePerLiter.toFixed(3),
          l.totalCost.toFixed(2),
          l.fullTank ? 'Yes' : 'No',
          `"${l.stationName ?? ''}"`,
        ].join(',');
      });
    const csv = [headers.join(','), ...rows].join('\n');
    try {
      await Share.share({
        message: csv,
        title: 'FuelTracker Export',
      });
    } catch {
      // User dismissed share sheet — no action needed
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ================================================================
            HEADER
        ================================================================= */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Reports & Analytics</Text>
          {periodRangeLabel ? (
            <Text style={styles.headerSubtitle}>{periodRangeLabel}</Text>
          ) : null}
        </View>

        {/* ================================================================
            CAR SELECTOR
        ================================================================= */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carSelectorContent}
          style={styles.carSelector}
        >
          <TouchableOpacity
            onPress={() => setSelectedCarId(null)}
            activeOpacity={0.75}
            style={[
              styles.filterPill,
              selectedCarId === null ? styles.filterPillActive : styles.filterPillInactive,
            ]}
          >
            <Ionicons
              name="layers-outline"
              size={13}
              color={selectedCarId === null ? Colors.white : Colors.gray600}
              style={styles.filterPillIcon}
            />
            <Text
              style={[
                styles.filterPillText,
                selectedCarId === null
                  ? styles.filterPillTextActive
                  : styles.filterPillTextInactive,
              ]}
            >
              All Cars
            </Text>
          </TouchableOpacity>

          {userCars.map((car) => (
            <TouchableOpacity
              key={car.id}
              onPress={() => setSelectedCarId(car.id)}
              activeOpacity={0.75}
              style={[
                styles.filterPill,
                selectedCarId === car.id ? styles.filterPillActive : styles.filterPillInactive,
              ]}
            >
              <Ionicons
                name="car-outline"
                size={13}
                color={selectedCarId === car.id ? Colors.white : Colors.gray600}
                style={styles.filterPillIcon}
              />
              <Text
                style={[
                  styles.filterPillText,
                  selectedCarId === car.id
                    ? styles.filterPillTextActive
                    : styles.filterPillTextInactive,
                ]}
                numberOfLines={1}
              >
                {getCarLabel(car)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ================================================================
            PERIOD TOGGLE
        ================================================================= */}
        <View style={styles.periodToggleRow}>
          {PERIOD_LABELS.map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setPeriod(p)}
              activeOpacity={0.8}
              style={[
                styles.periodToggleBtn,
                period === p ? styles.periodToggleBtnActive : styles.periodToggleBtnInactive,
              ]}
            >
              <Text
                style={[
                  styles.periodToggleBtnText,
                  period === p
                    ? styles.periodToggleBtnTextActive
                    : styles.periodToggleBtnTextInactive,
                ]}
              >
                {p}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ================================================================
            SUMMARY CARDS (horizontal scroll)
        ================================================================= */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.summaryCardsContent}
          style={styles.summaryCardsScroll}
        >
          {summaryCards.map((card) => (
            <SummaryPill key={card.label} {...card} />
          ))}
        </ScrollView>

        {/* ================================================================
            SECTION CARDS
        ================================================================= */}
        <View style={styles.cardsContainer}>

          {/* ── Line Chart: Consumption Over Time ────────────────────────── */}
          <SectionCard title="Fuel Consumption Over Time" icon="trending-up-outline">
            {periodLogs.length < 2 ? (
              <View style={styles.chartPlaceholder}>
                <Ionicons name="analytics-outline" size={32} color={Colors.gray300} />
                <Text style={styles.chartPlaceholderText}>
                  Not enough data for this period
                </Text>
              </View>
            ) : (
              <>
                <LineChart
                  data={lineChartData}
                  width={CHART_WIDTH}
                  height={CHART_HEIGHT}
                  chartConfig={CHART_CONFIG}
                  bezier
                  style={styles.chart}
                  fromZero
                  withDots
                  withInnerLines
                  withOuterLines={false}
                  withVerticalLabels
                  withHorizontalLabels
                  yAxisSuffix=" L"
                />
                <Text style={styles.chartAxisNote}>L/100km by month</Text>
              </>
            )}
          </SectionCard>

          {/* ── Bar Chart: Monthly Cost ───────────────────────────────────── */}
          <SectionCard title="Monthly Cost" icon="bar-chart-outline">
            {periodLogs.length === 0 ? (
              <View style={styles.chartPlaceholder}>
                <Ionicons name="analytics-outline" size={32} color={Colors.gray300} />
                <Text style={styles.chartPlaceholderText}>
                  Not enough data for this period
                </Text>
              </View>
            ) : (
              <>
                <BarChart
                  data={barChartData}
                  width={CHART_WIDTH}
                  height={CHART_HEIGHT}
                  chartConfig={CHART_CONFIG}
                  style={styles.chart}
                  showValuesOnTopOfBars
                  fromZero
                  withInnerLines
                  yAxisLabel={symbol}
                  yAxisSuffix=""
                />
                <Text style={styles.chartAxisNote}>Monthly fuel cost ({symbol})</Text>
              </>
            )}
          </SectionCard>

          {/* ── Consumption Comparison ────────────────────────────────────── */}
          {period !== 'All' && (
            <SectionCard title="Consumption Comparison" icon="git-compare-outline">
              <View style={styles.compHeaderRow}>
                <View style={styles.compHeaderSpacer} />
                <View style={styles.compHeaderValues}>
                  <Text style={[styles.compHeaderLabel, styles.compHeaderCurrent]}>
                    This Period
                  </Text>
                  <Text style={[styles.compHeaderLabel, styles.compHeaderPrev]}>
                    Last Period
                  </Text>
                  <Text style={styles.compHeaderChange}>Δ</Text>
                </View>
              </View>
              {compMetrics.map((m) => (
                <ComparisonRow key={m.label} {...m} />
              ))}
            </SectionCard>
          )}

          {/* ── Fill-up Frequency ─────────────────────────────────────────── */}
          <SectionCard title="Fill-up Frequency" icon="calendar-outline">
            {fillupTimeline.length === 0 ? (
              <View style={styles.chartPlaceholder}>
                <Text style={styles.chartPlaceholderText}>No fill-ups in this period</Text>
              </View>
            ) : (
              <>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.timelineContent}
                  style={styles.timelineScroll}
                >
                  {fillupTimeline.map((log, idx) => (
                    <FillupDot
                      key={log.id}
                      date={log.date}
                      isFirst={idx === 0}
                      isLast={idx === fillupTimeline.length - 1}
                    />
                  ))}
                </ScrollView>
                <View style={styles.frequencyStatRow}>
                  <Ionicons name="time-outline" size={15} color={Colors.gray500} />
                  <Text style={styles.frequencyStatText}>
                    {avgDays > 0
                      ? `Avg ${avgDays.toFixed(1)} days between fill-ups`
                      : 'Not enough data to calculate frequency'}
                  </Text>
                </View>
                <View style={styles.frequencyCountRow}>
                  <Ionicons name="water-outline" size={15} color={Colors.primary} />
                  <Text style={styles.frequencyCountText}>
                    {periodLogs.length} fill-up
                    {periodLogs.length !== 1 ? 's' : ''} this period
                  </Text>
                </View>
              </>
            )}
          </SectionCard>

          {/* ── Cost Breakdown by Car ──────────────────────────────────────── */}
          {userCars.length > 1 && (
            <SectionCard title="Cost Breakdown" icon="pie-chart-outline">
              {carCostBreakdown.length === 0 ? (
                <View style={styles.chartPlaceholder}>
                  <Text style={styles.chartPlaceholderText}>
                    No cost data in this period
                  </Text>
                </View>
              ) : (
                <View style={styles.carCostList}>
                  {carCostBreakdown.map((entry) => (
                    <CarCostBar
                      key={entry.car.id}
                      label={getCarLabel(entry.car)}
                      cost={entry.cost}
                      totalCost={entry.totalCost}
                      color={entry.color}
                      symbol={symbol}
                    />
                  ))}
                </View>
              )}
            </SectionCard>
          )}

          {/* ── Best vs Worst Efficiency ───────────────────────────────────── */}
          <SectionCard title="Best vs Worst Efficiency" icon="trophy-outline">
            {!bestLog || !worstLog ? (
              <View style={styles.chartPlaceholder}>
                <Ionicons name="analytics-outline" size={32} color={Colors.gray300} />
                <Text style={styles.chartPlaceholderText}>
                  Need at least 2 consecutive full-tank fill-ups to compare efficiency
                </Text>
              </View>
            ) : (
              <>
                {/* Best row */}
                <View style={styles.bestWorstRow}>
                  <View
                    style={[
                      styles.bestWorstIconCircle,
                      { backgroundColor: Colors.secondaryFaded },
                    ]}
                  >
                    <Ionicons name="arrow-down-circle" size={22} color={Colors.secondary} />
                  </View>
                  <View style={styles.bestWorstInfo}>
                    <Text style={styles.bestWorstBadge}>Best</Text>
                    <Text style={styles.bestWorstConsumption}>
                      {formatConsumption(bestLog.consumption)}
                    </Text>
                    <Text style={styles.bestWorstDate}>
                      {format(parseISO(bestLog.log.date), 'MMM d, yyyy')}
                      {bestLog.log.stationName ? ` · ${bestLog.log.stationName}` : ''}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.bestWorstBadgeChip,
                      { backgroundColor: Colors.secondaryFaded },
                    ]}
                  >
                    <Text
                      style={[styles.bestWorstBadgeChipText, { color: Colors.secondaryDark }]}
                    >
                      Low
                    </Text>
                  </View>
                </View>

                <View style={styles.bestWorstDivider} />

                {/* Worst row */}
                <View style={styles.bestWorstRow}>
                  <View
                    style={[
                      styles.bestWorstIconCircle,
                      { backgroundColor: Colors.dangerFaded },
                    ]}
                  >
                    <Ionicons name="arrow-up-circle" size={22} color={Colors.danger} />
                  </View>
                  <View style={styles.bestWorstInfo}>
                    <Text style={styles.bestWorstBadge}>Worst</Text>
                    <Text style={[styles.bestWorstConsumption, { color: Colors.danger }]}>
                      {formatConsumption(worstLog.consumption)}
                    </Text>
                    <Text style={styles.bestWorstDate}>
                      {format(parseISO(worstLog.log.date), 'MMM d, yyyy')}
                      {worstLog.log.stationName ? ` · ${worstLog.log.stationName}` : ''}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.bestWorstBadgeChip,
                      { backgroundColor: Colors.dangerFaded },
                    ]}
                  >
                    <Text style={[styles.bestWorstBadgeChipText, { color: Colors.danger }]}>
                      High
                    </Text>
                  </View>
                </View>

                {/* Improvement indicator */}
                {bestLog.consumption < worstLog.consumption && (
                  <View style={styles.improvementRow}>
                    <Ionicons name="checkmark-circle" size={15} color={Colors.secondary} />
                    <Text style={styles.improvementText}>
                      {(
                        ((worstLog.consumption - bestLog.consumption) /
                          worstLog.consumption) *
                        100
                      ).toFixed(1)}
                      % range between best and worst fill-up efficiency
                    </Text>
                  </View>
                )}
              </>
            )}
          </SectionCard>
        </View>

        {/* ================================================================
            EXPORT BUTTON
        ================================================================= */}
        <View style={styles.exportContainer}>
          <TouchableOpacity
            onPress={handleExportCSV}
            activeOpacity={0.8}
            style={styles.exportButton}
          >
            <Ionicons name="download-outline" size={18} color={Colors.white} />
            <Text style={styles.exportButtonText}>Export CSV</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Theme.spacing.xl,
  },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    paddingHorizontal: Theme.spacing.md,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  headerTitle: {
    fontSize: Theme.fontSize.xxl,
    fontWeight: Theme.fontWeight.bold,
    color: Colors.gray900,
  },
  headerSubtitle: {
    fontSize: Theme.fontSize.sm,
    fontWeight: Theme.fontWeight.regular,
    color: Colors.gray500,
    marginTop: 2,
  },

  // ── Car selector ──────────────────────────────────────────────────────────
  carSelector: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
    flexGrow: 0,
  },
  carSelectorContent: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    gap: Theme.spacing.sm,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Theme.borderRadius.full,
  },
  filterPillActive: {
    backgroundColor: Colors.primary,
  },
  filterPillInactive: {
    backgroundColor: Colors.gray100,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  filterPillIcon: {
    marginRight: 5,
  },
  filterPillText: {
    fontSize: Theme.fontSize.sm,
    fontWeight: Theme.fontWeight.semibold,
    maxWidth: 120,
  },
  filterPillTextActive: {
    color: Colors.white,
  },
  filterPillTextInactive: {
    color: Colors.gray600,
  },

  // ── Period toggle ─────────────────────────────────────────────────────────
  periodToggleRow: {
    flexDirection: 'row',
    marginHorizontal: Theme.spacing.md,
    marginTop: Theme.spacing.md,
    backgroundColor: Colors.gray100,
    borderRadius: Theme.borderRadius.md,
    padding: 3,
  },
  periodToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: Theme.borderRadius.sm,
  },
  periodToggleBtnActive: {
    backgroundColor: Colors.white,
    ...Theme.shadow.sm,
  },
  periodToggleBtnInactive: {
    backgroundColor: 'transparent',
  },
  periodToggleBtnText: {
    fontSize: Theme.fontSize.sm,
    fontWeight: Theme.fontWeight.semibold,
  },
  periodToggleBtnTextActive: {
    color: Colors.primary,
  },
  periodToggleBtnTextInactive: {
    color: Colors.gray500,
  },

  // ── Summary pills (horizontal scroll) ────────────────────────────────────
  summaryCardsScroll: {
    flexGrow: 0,
    marginTop: Theme.spacing.md,
  },
  summaryCardsContent: {
    paddingHorizontal: Theme.spacing.md,
    gap: Theme.spacing.sm,
  },
  summaryPill: {
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.md,
    width: 130,
    ...Theme.shadow.sm,
  },
  summaryPillIcon: {
    width: 36,
    height: 36,
    borderRadius: Theme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.sm,
  },
  summaryPillValue: {
    fontSize: Theme.fontSize.lg,
    fontWeight: Theme.fontWeight.bold,
    color: Colors.gray900,
    marginBottom: 3,
  },
  summaryPillLabel: {
    fontSize: Theme.fontSize.xs,
    fontWeight: Theme.fontWeight.medium,
    color: Colors.gray500,
    lineHeight: 15,
  },

  // ── Cards container ───────────────────────────────────────────────────────
  cardsContainer: {
    paddingHorizontal: Theme.spacing.md,
    marginTop: Theme.spacing.md,
    gap: Theme.spacing.md,
  },

  // ── Section card ──────────────────────────────────────────────────────────
  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.md,
    ...Theme.shadow.sm,
  },
  sectionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
    gap: Theme.spacing.sm,
  },
  sectionCardIconBg: {
    width: 28,
    height: 28,
    borderRadius: Theme.borderRadius.sm,
    backgroundColor: Colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCardTitle: {
    fontSize: Theme.fontSize.md,
    fontWeight: Theme.fontWeight.bold,
    color: Colors.gray800,
    flex: 1,
  },

  // ── Charts ────────────────────────────────────────────────────────────────
  chart: {
    borderRadius: Theme.borderRadius.md,
    marginLeft: -Theme.spacing.md,
  },
  chartAxisNote: {
    fontSize: Theme.fontSize.xs,
    color: Colors.gray400,
    textAlign: 'center',
    marginTop: Theme.spacing.xs,
  },
  chartPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.xl,
    gap: Theme.spacing.sm,
  },
  chartPlaceholderText: {
    fontSize: Theme.fontSize.sm,
    color: Colors.gray400,
    textAlign: 'center',
    lineHeight: 20,
  },

  // ── Comparison ────────────────────────────────────────────────────────────
  compHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
    paddingBottom: Theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  compHeaderSpacer: {
    flex: 1,
  },
  compHeaderValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  compHeaderLabel: {
    fontSize: Theme.fontSize.xs,
    fontWeight: Theme.fontWeight.bold,
    width: 72,
    textAlign: 'center',
  },
  compHeaderCurrent: {
    color: Colors.primary,
  },
  compHeaderPrev: {
    color: Colors.gray400,
  },
  compHeaderChange: {
    fontSize: Theme.fontSize.xs,
    fontWeight: Theme.fontWeight.bold,
    color: Colors.gray500,
    width: 52,
    textAlign: 'center',
  },
  compRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray50,
  },
  compRowLabel: {
    flex: 1,
    fontSize: Theme.fontSize.sm,
    fontWeight: Theme.fontWeight.medium,
    color: Colors.gray700,
  },
  compRowValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  compValueBlock: {
    width: 72,
    alignItems: 'center',
  },
  compValueText: {
    fontSize: Theme.fontSize.sm,
    fontWeight: Theme.fontWeight.semibold,
    color: Colors.gray800,
    textAlign: 'center',
  },
  compValuePrev: {
    color: Colors.gray400,
    fontWeight: Theme.fontWeight.regular,
  },
  compChangeBadge: {
    width: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: Theme.borderRadius.full,
    gap: 2,
  },
  compChangeText: {
    fontSize: Theme.fontSize.xs,
    fontWeight: Theme.fontWeight.bold,
  },

  // ── Fill-up timeline ──────────────────────────────────────────────────────
  timelineScroll: {
    flexGrow: 0,
    marginBottom: Theme.spacing.sm,
  },
  timelineContent: {
    alignItems: 'center',
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.xs,
  },
  timelineDotWrapper: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
    zIndex: 1,
  },
  timelineLine: {
    height: 2,
    width: 20,
    backgroundColor: Colors.gray200,
  },
  timelineDotLabel: {
    position: 'absolute',
    top: 14,
    fontSize: 9,
    color: Colors.gray500,
    textAlign: 'center',
    width: 36,
    left: -13,
  },
  frequencyStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
    marginTop: 28,
    paddingTop: Theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  frequencyStatText: {
    fontSize: Theme.fontSize.sm,
    color: Colors.gray600,
  },
  frequencyCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
    marginTop: Theme.spacing.xs,
  },
  frequencyCountText: {
    fontSize: Theme.fontSize.sm,
    fontWeight: Theme.fontWeight.medium,
    color: Colors.primary,
  },

  // ── Car cost breakdown ────────────────────────────────────────────────────
  carCostList: {
    gap: 12,
  },
  carCostBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  carCostBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: 90,
  },
  carCostDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  carCostLabel: {
    fontSize: Theme.fontSize.xs,
    fontWeight: Theme.fontWeight.medium,
    color: Colors.gray700,
    flex: 1,
  },
  carCostBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.gray100,
    borderRadius: 4,
    overflow: 'hidden',
  },
  carCostBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  carCostBarRight: {
    width: 72,
    alignItems: 'flex-end',
  },
  carCostPct: {
    fontSize: Theme.fontSize.xs,
    fontWeight: Theme.fontWeight.bold,
    color: Colors.gray700,
  },
  carCostValue: {
    fontSize: Theme.fontSize.xs,
    color: Colors.gray500,
    marginTop: 1,
  },

  // ── Best vs Worst ─────────────────────────────────────────────────────────
  bestWorstRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Theme.spacing.sm,
    gap: Theme.spacing.sm,
  },
  bestWorstIconCircle: {
    width: 40,
    height: 40,
    borderRadius: Theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  bestWorstInfo: {
    flex: 1,
  },
  bestWorstBadge: {
    fontSize: Theme.fontSize.xs,
    fontWeight: Theme.fontWeight.semibold,
    color: Colors.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  bestWorstConsumption: {
    fontSize: Theme.fontSize.lg,
    fontWeight: Theme.fontWeight.bold,
    color: Colors.secondary,
    marginBottom: 2,
  },
  bestWorstDate: {
    fontSize: Theme.fontSize.xs,
    color: Colors.gray500,
  },
  bestWorstBadgeChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Theme.borderRadius.full,
    flexShrink: 0,
  },
  bestWorstBadgeChipText: {
    fontSize: Theme.fontSize.xs,
    fontWeight: Theme.fontWeight.bold,
  },
  bestWorstDivider: {
    height: 1,
    backgroundColor: Colors.gray100,
    marginVertical: Theme.spacing.xs,
  },
  improvementRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Theme.spacing.xs,
    marginTop: Theme.spacing.sm,
    paddingTop: Theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  improvementText: {
    fontSize: Theme.fontSize.xs,
    color: Colors.gray600,
    flex: 1,
    lineHeight: 18,
  },

  // ── Export ────────────────────────────────────────────────────────────────
  exportContainer: {
    paddingHorizontal: Theme.spacing.md,
    marginTop: Theme.spacing.lg,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Theme.borderRadius.md,
    paddingVertical: Theme.spacing.md,
    ...Theme.shadow.md,
  },
  exportButtonText: {
    fontSize: Theme.fontSize.base,
    fontWeight: Theme.fontWeight.bold,
    color: Colors.white,
  },

  // ── Bottom padding ────────────────────────────────────────────────────────
  bottomPadding: {
    height: Theme.spacing.xl,
  },
});

export default ReportsScreen;
