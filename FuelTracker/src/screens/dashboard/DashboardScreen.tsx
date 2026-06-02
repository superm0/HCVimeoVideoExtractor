import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useCarStore } from '../../store/carStore';
import { useFuelLogStore } from '../../store/fuelLogStore';
import { calculateFuelStats, getMonthlyReports } from '../../utils/calculations';
import {
  formatCurrency,
  formatRelativeTime,
  formatVolume,
  formatDate,
  formatServiceType,
} from '../../utils/formatters';
import { Colors } from '../../constants/colors';
import { Theme } from '../../constants/theme';
import EmptyState from '../../components/common/EmptyState';
import { Car, FuelLog, ServiceReminder } from '../../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DashboardScreenProps {
  navigation: any;
}

type IoniconName = keyof typeof Ionicons.glyphMap;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - Theme.spacing.md * 2 - Theme.spacing.sm) / 2;

const SERVICE_ICON_MAP: Record<string, IoniconName> = {
  oil_change: 'water-outline',
  tire_rotation: 'reload-outline',
  brake_check: 'warning-outline',
  air_filter: 'funnel-outline',
  registration: 'document-text-outline',
  insurance: 'shield-checkmark-outline',
  general_service: 'construct-outline',
  other: 'ellipsis-horizontal-circle-outline',
};

const SERVICE_COLOR_MAP: Record<string, string> = {
  oil_change: Colors.accent,
  tire_rotation: Colors.secondary,
  brake_check: Colors.danger,
  air_filter: Colors.primaryLight,
  registration: Colors.warning,
  insurance: Colors.secondaryDark,
  general_service: Colors.primary,
  other: Colors.gray500,
};

const FUEL_DROP_COLORS: string[] = [
  Colors.primary,
  Colors.secondary,
  Colors.accent,
  Colors.warning,
  Colors.primaryLight,
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatFullDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function getFirstName(fullName: string): string {
  return fullName.trim().split(' ')[0] ?? fullName;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

// ── Header Avatar ──────────────────────────────────────────────────────────

interface HeaderAvatarProps {
  name: string;
  onPress: () => void;
}

const HeaderAvatar: React.FC<HeaderAvatarProps> = ({ name, onPress }) => {
  const initial = name.trim().charAt(0).toUpperCase();
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.avatarButton}>
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarInitial}>{initial}</Text>
      </View>
    </TouchableOpacity>
  );
};

// ── Car Selector Pill ──────────────────────────────────────────────────────

interface CarPillProps {
  car: Car;
  isSelected: boolean;
  onPress: () => void;
}

const CarPill: React.FC<CarPillProps> = ({ car, isSelected, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.75}
    style={[styles.carPill, isSelected ? styles.carPillSelected : styles.carPillUnselected]}
  >
    <Ionicons
      name="car-outline"
      size={14}
      color={isSelected ? Colors.primary : Colors.white}
      style={styles.carPillIcon}
    />
    <Text
      style={[
        styles.carPillText,
        isSelected ? styles.carPillTextSelected : styles.carPillTextUnselected,
      ]}
      numberOfLines={1}
    >
      {car.nickname || `${car.make} ${car.model}`}
    </Text>
    <Text
      style={[
        styles.carPillYear,
        isSelected ? styles.carPillYearSelected : styles.carPillYearUnselected,
      ]}
    >
      {car.year}
    </Text>
  </TouchableOpacity>
);

// ── Quick Stat Card ────────────────────────────────────────────────────────

interface QuickStatCardProps {
  icon: IoniconName;
  label: string;
  value: string;
  iconColor: string;
  iconBg: string;
}

const QuickStatCard: React.FC<QuickStatCardProps> = ({
  icon,
  label,
  value,
  iconColor,
  iconBg,
}) => (
  <View style={[styles.statCard, { width: CARD_WIDTH }]}>
    <View style={[styles.statIconCircle, { backgroundColor: iconBg }]}>
      <Ionicons name={icon} size={20} color={iconColor} />
    </View>
    <Text style={styles.statLabel} numberOfLines={2}>
      {label}
    </Text>
    <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
      {value}
    </Text>
  </View>
);

// ── Section Header ─────────────────────────────────────────────────────────

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, actionLabel, onAction }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {actionLabel && onAction ? (
      <TouchableOpacity onPress={onAction} activeOpacity={0.7}>
        <Text style={styles.sectionAction}>{actionLabel}</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

// ── Fuel Log Row ───────────────────────────────────────────────────────────

interface FuelLogRowProps {
  log: FuelLog;
  carName: string;
  colorIndex: number;
  isLast: boolean;
  onPress: () => void;
}

const FuelLogRow: React.FC<FuelLogRowProps> = ({
  log,
  carName,
  colorIndex,
  isLast,
  onPress,
}) => {
  const dotColor = FUEL_DROP_COLORS[colorIndex % FUEL_DROP_COLORS.length];
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.logRow, isLast && styles.logRowLast]}
    >
      {/* Icon */}
      <View style={[styles.logIconCircle, { backgroundColor: dotColor + '1A' }]}>
        <Ionicons name="water" size={18} color={dotColor} />
      </View>

      {/* Center info */}
      <View style={styles.logInfo}>
        <Text style={styles.logCarName} numberOfLines={1}>
          {carName}
        </Text>
        <Text style={styles.logDate}>{formatDate(log.date)}</Text>
        {log.stationName ? (
          <Text style={styles.logStation} numberOfLines={1}>
            {log.stationName}
          </Text>
        ) : null}
      </View>

      {/* Right: volume + cost */}
      <View style={styles.logRight}>
        <Text style={styles.logLiters}>{formatVolume(log.liters)}</Text>
        <Text style={styles.logCost}>{formatCurrency(log.totalCost)}</Text>
      </View>
    </TouchableOpacity>
  );
};

// ── Service Reminder Card ──────────────────────────────────────────────────

interface ServiceReminderCardProps {
  reminder: ServiceReminder;
  carName: string;
  onPress: () => void;
}

const ServiceReminderCard: React.FC<ServiceReminderCardProps> = ({
  reminder,
  carName,
  onPress,
}) => {
  const icon: IoniconName =
    SERVICE_ICON_MAP[reminder.type] ?? 'construct-outline';
  const color = SERVICE_COLOR_MAP[reminder.type] ?? Colors.gray500;

  let dueLine = '';
  if (reminder.dueDate) {
    dueLine = `Due ${formatDate(reminder.dueDate)}`;
  } else if (reminder.dueOdometer) {
    dueLine = `Due at ${reminder.dueOdometer.toLocaleString()} km`;
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={styles.serviceCard}>
      <View style={[styles.serviceIconCircle, { backgroundColor: color + '1A' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={styles.serviceInfo}>
        <Text style={styles.serviceType}>{formatServiceType(reminder.type)}</Text>
        <Text style={styles.serviceCar} numberOfLines={1}>
          {carName}
        </Text>
        {dueLine ? <Text style={styles.serviceDue}>{dueLine}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={Colors.gray400} />
    </TouchableOpacity>
  );
};

// ── Monthly Bar Chart ──────────────────────────────────────────────────────

interface MonthlyBarProps {
  currentLabel: string;
  currentCost: number;
  prevLabel: string;
  prevCost: number;
  symbol: string;
}

const MonthlyBar: React.FC<MonthlyBarProps> = ({
  currentLabel,
  currentCost,
  prevLabel,
  prevCost,
  symbol,
}) => {
  const maxCost = Math.max(currentCost, prevCost, 1);
  const currentBarFlex = currentCost / maxCost;
  const prevBarFlex = prevCost / maxCost;
  const BAR_MAX_HEIGHT = 80;

  const diff = prevCost > 0 ? ((currentCost - prevCost) / prevCost) * 100 : 0;
  const diffIsPositive = diff > 0;

  return (
    <View style={styles.monthlyCard}>
      <View style={styles.monthlyHeader}>
        <Text style={styles.monthlyTitle}>Monthly Cost Comparison</Text>
        {prevCost > 0 ? (
          <View
            style={[
              styles.diffBadge,
              { backgroundColor: diffIsPositive ? Colors.dangerFaded : Colors.secondaryFaded },
            ]}
          >
            <Ionicons
              name={diffIsPositive ? 'trending-up' : 'trending-down'}
              size={12}
              color={diffIsPositive ? Colors.danger : Colors.secondary}
            />
            <Text
              style={[
                styles.diffText,
                { color: diffIsPositive ? Colors.danger : Colors.secondary },
              ]}
            >
              {diffIsPositive ? '+' : ''}
              {diff.toFixed(1)}%
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.barsContainer}>
        {/* Previous month bar */}
        <View style={styles.barGroup}>
          <View style={[styles.barWrapper, { height: BAR_MAX_HEIGHT }]}>
            <View
              style={[
                styles.bar,
                styles.barPrev,
                { height: BAR_MAX_HEIGHT * prevBarFlex },
              ]}
            />
          </View>
          <Text style={styles.barLabel}>{prevLabel}</Text>
          <Text style={styles.barAmount}>
            {formatCurrency(prevCost, symbol)}
          </Text>
        </View>

        {/* VS divider */}
        <View style={styles.barVsDivider}>
          <Text style={styles.barVsText}>vs</Text>
        </View>

        {/* Current month bar */}
        <View style={styles.barGroup}>
          <View style={[styles.barWrapper, { height: BAR_MAX_HEIGHT }]}>
            <View
              style={[
                styles.bar,
                styles.barCurrent,
                { height: BAR_MAX_HEIGHT * currentBarFlex },
              ]}
            />
          </View>
          <Text style={styles.barLabel}>{currentLabel}</Text>
          <Text style={[styles.barAmount, styles.barAmountCurrent]}>
            {formatCurrency(currentCost, symbol)}
          </Text>
        </View>
      </View>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
  const { user, settings } = useAuthStore();
  const {
    cars,
    selectedCarId,
    selectCar,
    loadCars,
  } = useCarStore();
  const { logs, loadLogs } = useFuelLogStore();

  const [refreshing, setRefreshing] = useState(false);

  // ── Load data on mount ─────────────────────────────────────────────────────

  useEffect(() => {
    if (user) {
      loadCars(user.id);
      loadLogs(user.id);
    }
  }, [user?.id]);

  const handleRefresh = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    await Promise.all([loadCars(user.id), loadLogs(user.id)]);
    setRefreshing(false);
  }, [user?.id]);

  // ── Derived data ───────────────────────────────────────────────────────────

  const userCars = useMemo(
    () => cars.filter((c) => c.userId === user?.id),
    [cars, user?.id]
  );

  const selectedCar = useMemo(
    () => userCars.find((c) => c.id === selectedCarId) ?? userCars[0] ?? null,
    [userCars, selectedCarId]
  );

  // All logs for selected car, newest-first
  const carLogs = useMemo(() => {
    if (!selectedCar) return [];
    return [...logs.filter((l) => l.carId === selectedCar.id)].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [logs, selectedCar]);

  // Stats for selected car
  const stats = useMemo(() => calculateFuelStats(carLogs), [carLogs]);

  // Monthly reports for selected car
  const monthlyReports = useMemo(
    () => getMonthlyReports(carLogs),
    [carLogs]
  );

  // This month and last month cost
  const { currentMonthReport, prevMonthReport } = useMemo(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    return {
      currentMonthReport: monthlyReports.find((r) => r.month === currentMonth) ?? null,
      prevMonthReport: monthlyReports.find((r) => r.month === prevMonth) ?? null,
    };
  }, [monthlyReports]);

  // Recent fill-ups (last 5)
  const recentLogs = useMemo(() => carLogs.slice(0, 5), [carLogs]);

  // Service reminders (all cars belonging to user, not completed)
  // We use a simple in-memory placeholder since ServiceReminder is not in a store yet;
  // derive upcoming ones from an empty array that callers can extend.
  const serviceReminders: ServiceReminder[] = [];

  // ── Month labels ──────────────────────────────────────────────────────────

  const { currentMonthLabel, prevMonthLabel } = useMemo(() => {
    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const fmt = (d: Date) =>
      d.toLocaleDateString('en-US', { month: 'short' });
    return {
      currentMonthLabel: fmt(now),
      prevMonthLabel: fmt(prev),
    };
  }, []);

  // ── Navigation helpers ─────────────────────────────────────────────────────

  const goToAddFuelLog = () => navigation.navigate('AddFuelLog', { carId: selectedCar?.id });
  const goToAllLogs = () => navigation.navigate('FuelLogList', { carId: selectedCar?.id });
  const goToCarDetail = (carId: string) => navigation.navigate('CarDetail', { carId });
  const goToLogDetail = (logId: string) => navigation.navigate('FuelLogDetail', { logId });
  const goToAddReminder = () => navigation.navigate('AddServiceReminder', { carId: selectedCar?.id });
  const goToReminderDetail = (reminderId: string) =>
    navigation.navigate('ServiceReminderDetail', { reminderId });
  const goToNotifications = () => navigation.navigate('Notifications');
  const goToProfile = () => navigation.navigate('Profile');

  // ── Stat helpers ───────────────────────────────────────────────────────────

  const symbol = settings.currencySymbol;

  const totalSpentThisMonth = currentMonthReport?.cost ?? 0;

  const avgConsumptionDisplay =
    stats.avgConsumption > 0
      ? `${stats.avgConsumption.toFixed(1)}`
      : '—';

  const totalDistanceDisplay =
    stats.totalDistance > 0
      ? `${stats.totalDistance.toLocaleString()}`
      : '—';

  const lastFillUpDisplay = stats.lastFillUp
    ? formatRelativeTime(stats.lastFillUp.date)
    : 'No data';

  // ── Empty state guard ──────────────────────────────────────────────────────

  const userName = user?.name ?? 'there';

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.white}
            colors={[Colors.primary]}
          />
        }
      >
        {/* ================================================================
            HEADER — blue gradient
        ================================================================= */}
        <LinearGradient
          colors={[Colors.primaryDark, Colors.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          {/* Top row: greeting + actions */}
          <View style={styles.headerTopRow}>
            <View style={styles.greetingBlock}>
              <Text style={styles.greetingText}>
                {getGreeting()}, {getFirstName(userName)}!
              </Text>
              <Text style={styles.greetingDate}>{formatFullDate(new Date())}</Text>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={goToNotifications}
                activeOpacity={0.75}
                style={styles.headerIconButton}
              >
                <Ionicons name="notifications-outline" size={22} color={Colors.white} />
              </TouchableOpacity>
              <HeaderAvatar name={userName} onPress={goToProfile} />
            </View>
          </View>

          {/* Car selector */}
          {userCars.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carSelectorContent}
              style={styles.carSelector}
            >
              {userCars.map((car) => (
                <CarPill
                  key={car.id}
                  car={car}
                  isSelected={car.id === (selectedCar?.id ?? null)}
                  onPress={() => selectCar(car.id)}
                />
              ))}
              <TouchableOpacity
                onPress={() => navigation.navigate('AddCar')}
                activeOpacity={0.75}
                style={styles.addCarPill}
              >
                <Ionicons name="add" size={16} color={Colors.white} />
                <Text style={styles.addCarPillText}>Add Car</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            <TouchableOpacity
              onPress={() => navigation.navigate('AddCar')}
              activeOpacity={0.8}
              style={styles.noCarBanner}
            >
              <Ionicons name="car-outline" size={18} color={Colors.white} />
              <Text style={styles.noCarBannerText}>
                Tap to add your first car
              </Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.white} />
            </TouchableOpacity>
          )}
        </LinearGradient>

        {/* ================================================================
            QUICK STATS (2×2 grid)
        ================================================================= */}
        <View style={styles.section}>
          <SectionHeader title="Quick Stats" />
          <View style={styles.statsGrid}>
            <QuickStatCard
              icon="cash-outline"
              label="Spent This Month"
              value={formatCurrency(totalSpentThisMonth, symbol)}
              iconColor={Colors.secondary}
              iconBg={Colors.secondaryFaded}
            />
            <QuickStatCard
              icon="speedometer-outline"
              label="Avg Consumption"
              value={avgConsumptionDisplay === '—' ? '—' : `${avgConsumptionDisplay}`}
              iconColor={Colors.primary}
              iconBg={Colors.primaryFaded}
            />
            <QuickStatCard
              icon="navigate-outline"
              label="Total Distance"
              value={totalDistanceDisplay === '—' ? '—' : `${totalDistanceDisplay} km`}
              iconColor={Colors.accent}
              iconBg={Colors.accentFaded}
            />
            <QuickStatCard
              icon="time-outline"
              label="Last Fill-up"
              value={lastFillUpDisplay}
              iconColor={Colors.warning}
              iconBg={Colors.warningFaded}
            />
          </View>
        </View>

        {/* ================================================================
            RECENT FILL-UPS
        ================================================================= */}
        <View style={styles.section}>
          <SectionHeader
            title="Recent Fill-ups"
            actionLabel={recentLogs.length > 0 ? 'See all' : undefined}
            onAction={goToAllLogs}
          />

          <View style={styles.card}>
            {recentLogs.length === 0 ? (
              <EmptyState
                icon="water-outline"
                title="No fill-ups yet"
                subtitle="Record your first refuel to start tracking fuel costs."
                actionLabel="Add Fill-up"
                onAction={goToAddFuelLog}
              />
            ) : (
              recentLogs.map((log, index) => {
                const logCar = userCars.find((c) => c.id === log.carId);
                const carName = logCar
                  ? logCar.nickname || `${logCar.make} ${logCar.model}`
                  : 'Unknown Car';
                return (
                  <FuelLogRow
                    key={log.id}
                    log={log}
                    carName={carName}
                    colorIndex={index}
                    isLast={index === recentLogs.length - 1}
                    onPress={() => goToLogDetail(log.id)}
                  />
                );
              })
            )}
          </View>

          {recentLogs.length > 0 && (
            <TouchableOpacity
              onPress={goToAddFuelLog}
              activeOpacity={0.8}
              style={styles.addFuelButton}
            >
              <Ionicons name="add-circle" size={18} color={Colors.primary} />
              <Text style={styles.addFuelButtonText}>Add Fill-up</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ================================================================
            SERVICE REMINDERS
        ================================================================= */}
        <View style={styles.section}>
          <SectionHeader title="Upcoming Services" />

          <View style={styles.card}>
            {serviceReminders.length === 0 ? (
              <EmptyState
                icon="construct-outline"
                title="No service reminders"
                subtitle="Stay on top of maintenance by adding upcoming service reminders."
                actionLabel="Add Reminder"
                onAction={goToAddReminder}
              />
            ) : (
              serviceReminders.map((reminder) => {
                const reminderCar = userCars.find((c) => c.id === reminder.carId);
                const carName = reminderCar
                  ? reminderCar.nickname || `${reminderCar.make} ${reminderCar.model}`
                  : 'Unknown Car';
                return (
                  <ServiceReminderCard
                    key={reminder.id}
                    reminder={reminder}
                    carName={carName}
                    onPress={() => goToReminderDetail(reminder.id)}
                  />
                );
              })
            )}
          </View>

          {serviceReminders.length > 0 && (
            <TouchableOpacity
              onPress={goToAddReminder}
              activeOpacity={0.8}
              style={styles.addFuelButton}
            >
              <Ionicons name="add-circle" size={18} color={Colors.primary} />
              <Text style={styles.addFuelButtonText}>Add Reminder</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ================================================================
            MONTHLY SUMMARY
        ================================================================= */}
        {(currentMonthReport || prevMonthReport) && (
          <View style={styles.section}>
            <SectionHeader
              title="Monthly Summary"
              actionLabel="Full Report"
              onAction={() => navigation.navigate('Reports')}
            />
            <MonthlyBar
              currentLabel={currentMonthLabel}
              currentCost={currentMonthReport?.cost ?? 0}
              prevLabel={prevMonthLabel}
              prevCost={prevMonthReport?.cost ?? 0}
              symbol={symbol}
            />
          </View>
        )}

        {/* Bottom padding */}
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

  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.lg,
    paddingHorizontal: Theme.spacing.md,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.md,
  },
  greetingBlock: {
    flex: 1,
    marginRight: Theme.spacing.md,
  },
  greetingText: {
    fontSize: Theme.fontSize.xl,
    fontWeight: Theme.fontWeight.bold,
    color: Colors.white,
    marginBottom: 4,
  },
  greetingDate: {
    fontSize: Theme.fontSize.sm,
    fontWeight: Theme.fontWeight.regular,
    color: 'rgba(255,255,255,0.78)',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarButton: {
    // touch target
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.28)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: Theme.fontSize.md,
    fontWeight: Theme.fontWeight.bold,
    color: Colors.white,
  },

  // ── Car selector ────────────────────────────────────────────────────────
  carSelector: {
    flexGrow: 0,
  },
  carSelectorContent: {
    gap: Theme.spacing.sm,
    paddingRight: Theme.spacing.sm,
  },
  carPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Theme.borderRadius.full,
    gap: 5,
  },
  carPillSelected: {
    backgroundColor: Colors.white,
  },
  carPillUnselected: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  carPillIcon: {
    // already inline in component
  },
  carPillText: {
    fontSize: Theme.fontSize.sm,
    fontWeight: Theme.fontWeight.semibold,
    maxWidth: 120,
  },
  carPillTextSelected: {
    color: Colors.primary,
  },
  carPillTextUnselected: {
    color: Colors.white,
  },
  carPillYear: {
    fontSize: Theme.fontSize.xs,
    fontWeight: Theme.fontWeight.regular,
  },
  carPillYearSelected: {
    color: Colors.primaryLight,
  },
  carPillYearUnselected: {
    color: 'rgba(255,255,255,0.7)',
  },
  addCarPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Theme.borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    borderStyle: 'dashed',
    gap: 4,
  },
  addCarPillText: {
    fontSize: Theme.fontSize.sm,
    fontWeight: Theme.fontWeight.medium,
    color: Colors.white,
  },
  noCarBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: Theme.borderRadius.md,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    gap: Theme.spacing.sm,
  },
  noCarBannerText: {
    flex: 1,
    fontSize: Theme.fontSize.base,
    fontWeight: Theme.fontWeight.medium,
    color: Colors.white,
  },

  // ── Sections ────────────────────────────────────────────────────────────
  section: {
    marginTop: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: Theme.fontSize.md,
    fontWeight: Theme.fontWeight.bold,
    color: Colors.gray800,
  },
  sectionAction: {
    fontSize: Theme.fontSize.sm,
    fontWeight: Theme.fontWeight.semibold,
    color: Colors.primary,
  },

  // ── Quick stats grid ─────────────────────────────────────────────────────
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.sm,
  },
  statCard: {
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.md,
    ...Theme.shadow.sm,
  },
  statIconCircle: {
    width: 40,
    height: 40,
    borderRadius: Theme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.sm,
  },
  statLabel: {
    fontSize: Theme.fontSize.xs,
    fontWeight: Theme.fontWeight.medium,
    color: Colors.gray500,
    marginBottom: 4,
    lineHeight: 16,
  },
  statValue: {
    fontSize: Theme.fontSize.lg,
    fontWeight: Theme.fontWeight.bold,
    color: Colors.gray900,
  },

  // ── Card container ───────────────────────────────────────────────────────
  card: {
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.lg,
    overflow: 'hidden',
    ...Theme.shadow.sm,
  },

  // ── Fuel log row ─────────────────────────────────────────────────────────
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
    gap: Theme.spacing.sm,
  },
  logRowLast: {
    borderBottomWidth: 0,
  },
  logIconCircle: {
    width: 40,
    height: 40,
    borderRadius: Theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  logInfo: {
    flex: 1,
  },
  logCarName: {
    fontSize: Theme.fontSize.base,
    fontWeight: Theme.fontWeight.semibold,
    color: Colors.gray800,
    marginBottom: 2,
  },
  logDate: {
    fontSize: Theme.fontSize.sm,
    color: Colors.gray500,
  },
  logStation: {
    fontSize: Theme.fontSize.xs,
    color: Colors.gray400,
    marginTop: 1,
  },
  logRight: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  logLiters: {
    fontSize: Theme.fontSize.sm,
    fontWeight: Theme.fontWeight.medium,
    color: Colors.gray600,
  },
  logCost: {
    fontSize: Theme.fontSize.base,
    fontWeight: Theme.fontWeight.bold,
    color: Colors.gray900,
    marginTop: 2,
  },

  // ── Add fuel button ───────────────────────────────────────────────────────
  addFuelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.xs,
    marginTop: Theme.spacing.sm,
    paddingVertical: Theme.spacing.sm,
    backgroundColor: Colors.primaryFaded,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  addFuelButtonText: {
    fontSize: Theme.fontSize.base,
    fontWeight: Theme.fontWeight.semibold,
    color: Colors.primary,
  },

  // ── Service reminder card ─────────────────────────────────────────────────
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
    gap: Theme.spacing.sm,
  },
  serviceIconCircle: {
    width: 40,
    height: 40,
    borderRadius: Theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceType: {
    fontSize: Theme.fontSize.base,
    fontWeight: Theme.fontWeight.semibold,
    color: Colors.gray800,
    marginBottom: 2,
  },
  serviceCar: {
    fontSize: Theme.fontSize.sm,
    color: Colors.gray500,
  },
  serviceDue: {
    fontSize: Theme.fontSize.xs,
    color: Colors.warning,
    fontWeight: Theme.fontWeight.medium,
    marginTop: 2,
  },

  // ── Monthly bar chart ─────────────────────────────────────────────────────
  monthlyCard: {
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.md,
    ...Theme.shadow.sm,
  },
  monthlyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.md,
  },
  monthlyTitle: {
    fontSize: Theme.fontSize.base,
    fontWeight: Theme.fontWeight.semibold,
    color: Colors.gray700,
  },
  diffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Theme.borderRadius.full,
  },
  diffText: {
    fontSize: Theme.fontSize.xs,
    fontWeight: Theme.fontWeight.bold,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: Theme.spacing.lg,
  },
  barGroup: {
    alignItems: 'center',
    minWidth: 70,
  },
  barWrapper: {
    width: 48,
    justifyContent: 'flex-end',
    marginBottom: Theme.spacing.xs,
  },
  bar: {
    width: 48,
    borderRadius: Theme.borderRadius.sm,
    minHeight: 4,
  },
  barPrev: {
    backgroundColor: Colors.gray200,
  },
  barCurrent: {
    backgroundColor: Colors.primary,
  },
  barLabel: {
    fontSize: Theme.fontSize.sm,
    fontWeight: Theme.fontWeight.medium,
    color: Colors.gray500,
    marginBottom: 2,
  },
  barAmount: {
    fontSize: Theme.fontSize.sm,
    fontWeight: Theme.fontWeight.bold,
    color: Colors.gray700,
  },
  barAmountCurrent: {
    color: Colors.primary,
  },
  barVsDivider: {
    paddingBottom: 36,
  },
  barVsText: {
    fontSize: Theme.fontSize.sm,
    fontWeight: Theme.fontWeight.medium,
    color: Colors.gray400,
  },

  // ── Bottom padding ────────────────────────────────────────────────────────
  bottomPadding: {
    height: Theme.spacing.xl,
  },
});

export default DashboardScreen;
