import React, { useState, useEffect } from 'react';
import {
  Dimensions,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCarStore } from '../../store/carStore';
import { useFuelLogStore } from '../../store/fuelLogStore';
import { calculateFuelStats } from '../../utils/calculations';
import {
  formatCurrency,
  formatDate,
  formatConsumption,
  formatDistance,
  formatServiceType,
} from '../../utils/formatters';
import { Colors } from '../../constants/colors';
import { Theme } from '../../constants/theme';
import { Car, FuelLog, ServiceReminder, ServiceType } from '../../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CarDetailScreenProps {
  navigation: any;
  route: any;
}

type TabKey = 'overview' | 'history' | 'services';

interface LocalServiceReminder {
  id: string;
  carId: string;
  type: ServiceType;
  dueDate?: string;
  dueOdometer?: number;
  notes?: string;
  completed: boolean;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const STAT_CARD_WIDTH = (SCREEN_WIDTH - Theme.spacing.md * 2 - Theme.spacing.sm) / 2;

const CAR_COLOR_MAP: Record<string, string> = {
  red: '#EF4444',
  blue: '#3B82F6',
  green: '#10B981',
  black: '#1F2937',
  white: '#F9FAFB',
  silver: '#9CA3AF',
  gray: '#6B7280',
  yellow: '#F59E0B',
  orange: '#F97316',
  purple: '#8B5CF6',
};

const SERVICE_ICON_MAP: Record<ServiceType, keyof typeof Ionicons.glyphMap> = {
  oil_change: 'water-outline',
  tire_rotation: 'reload-outline',
  brake_check: 'warning-outline',
  air_filter: 'funnel-outline',
  registration: 'document-text-outline',
  insurance: 'shield-checkmark-outline',
  general_service: 'construct-outline',
  other: 'ellipsis-horizontal-circle-outline',
};

const SERVICE_COLOR_MAP: Record<ServiceType, string> = {
  oil_change: Colors.accent,
  tire_rotation: Colors.secondary,
  brake_check: Colors.danger,
  air_filter: Colors.primaryLight,
  registration: Colors.warning,
  insurance: Colors.secondaryDark,
  general_service: Colors.primary,
  other: Colors.gray500,
};

const SERVICE_TYPE_OPTIONS: ServiceType[] = [
  'oil_change',
  'tire_rotation',
  'brake_check',
  'air_filter',
  'registration',
  'insurance',
  'general_service',
  'other',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveCarColor(color?: string): string {
  if (!color) return Colors.primary;
  const lower = color.toLowerCase();
  if (CAR_COLOR_MAP[lower]) return CAR_COLOR_MAP[lower];
  if (color.startsWith('#')) return color;
  return Colors.primary;
}

function generateLocalId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface TabButtonProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
}

const TabButton: React.FC<TabButtonProps> = ({ label, isActive, onPress }) => (
  <TouchableOpacity
    style={[styles.tabButton, isActive && styles.tabButtonActive]}
    onPress={onPress}
    activeOpacity={0.75}
  >
    <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
      {label}
    </Text>
    {isActive ? <View style={styles.tabUnderline} /> : null}
  </TouchableOpacity>
);

interface StatMiniCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  iconColor: string;
  iconBg: string;
}

const StatMiniCard: React.FC<StatMiniCardProps> = ({
  icon,
  label,
  value,
  iconColor,
  iconBg,
}) => (
  <View style={[styles.statCard, { width: STAT_CARD_WIDTH }]}>
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

interface FuelLogRowProps {
  log: FuelLog;
  isLast: boolean;
  onDelete: () => void;
}

const FuelLogRow: React.FC<FuelLogRowProps> = ({ log, isLast, onDelete }) => (
  <TouchableOpacity
    style={[styles.logRow, isLast && styles.logRowLast]}
    onLongPress={() => {
      Alert.alert('Delete Fill-up', 'Remove this fill-up entry?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ]);
    }}
    activeOpacity={0.75}
  >
    {/* Date column */}
    <View style={styles.logDateCol}>
      <Ionicons name="water" size={18} color={Colors.primary} />
      <Text style={styles.logDate}>{formatDate(log.date)}</Text>
    </View>

    {/* Details */}
    <View style={styles.logDetails}>
      <Text style={styles.logLiters}>{log.liters.toFixed(2)} L</Text>
      <Text style={styles.logOdometer}>{log.odometer.toLocaleString()} km</Text>
    </View>

    {/* Right: cost + full tank */}
    <View style={styles.logRight}>
      <Text style={styles.logCost}>{formatCurrency(log.totalCost)}</Text>
      {log.fullTank ? (
        <View style={styles.fullTankBadge}>
          <Text style={styles.fullTankText}>Full</Text>
        </View>
      ) : (
        <View style={styles.partialTankBadge}>
          <Text style={styles.partialTankText}>Partial</Text>
        </View>
      )}
    </View>
  </TouchableOpacity>
);

interface ServiceReminderRowProps {
  reminder: LocalServiceReminder;
  onToggleComplete: () => void;
  onDelete: () => void;
}

const ServiceReminderRow: React.FC<ServiceReminderRowProps> = ({
  reminder,
  onToggleComplete,
  onDelete,
}) => {
  const icon = SERVICE_ICON_MAP[reminder.type] ?? 'construct-outline';
  const color = SERVICE_COLOR_MAP[reminder.type] ?? Colors.gray500;
  const isOverdue =
    !reminder.completed &&
    reminder.dueDate &&
    new Date(reminder.dueDate) < new Date();

  return (
    <TouchableOpacity
      style={styles.serviceRow}
      onLongPress={() => {
        Alert.alert('Service Reminder', 'What would you like to do?', [
          {
            text: reminder.completed ? 'Mark Pending' : 'Mark Complete',
            onPress: onToggleComplete,
          },
          { text: 'Delete', style: 'destructive', onPress: onDelete },
          { text: 'Cancel', style: 'cancel' },
        ]);
      }}
      activeOpacity={0.75}
    >
      <View style={[styles.serviceIconCircle, { backgroundColor: color + '1A' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>

      <View style={styles.serviceInfo}>
        <Text
          style={[
            styles.serviceType,
            reminder.completed && styles.serviceTypeCompleted,
          ]}
        >
          {formatServiceType(reminder.type)}
        </Text>
        {reminder.dueDate ? (
          <Text
            style={[
              styles.serviceDue,
              isOverdue && styles.serviceDueOverdue,
            ]}
          >
            Due {formatDate(reminder.dueDate)}
            {isOverdue ? ' (Overdue)' : ''}
          </Text>
        ) : null}
        {reminder.dueOdometer ? (
          <Text style={styles.serviceDue}>
            Due at {reminder.dueOdometer.toLocaleString()} km
          </Text>
        ) : null}
        {reminder.notes ? (
          <Text style={styles.serviceNotes} numberOfLines={1}>
            {reminder.notes}
          </Text>
        ) : null}
      </View>

      <TouchableOpacity
        onPress={onToggleComplete}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons
          name={reminder.completed ? 'checkmark-circle' : 'ellipse-outline'}
          size={24}
          color={reminder.completed ? Colors.secondary : Colors.gray300}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

const CarDetailScreen: React.FC<CarDetailScreenProps> = ({ navigation, route }) => {
  const carId: string = route?.params?.carId ?? '';
  const { cars } = useCarStore();
  const { logs, deleteLog, getLogsForCar } = useFuelLogStore();

  const car: Car | undefined = cars.find((c) => c.id === carId);

  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [serviceReminders, setServiceReminders] = useState<LocalServiceReminder[]>([]);

  // ── Load service reminders from AsyncStorage ──────────────────────────────

  const STORAGE_KEY = `service_reminders_${carId}`;

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          setServiceReminders(JSON.parse(raw) as LocalServiceReminder[]);
        }
      })
      .catch((err: unknown) => console.warn('Load service reminders error:', err));
  }, [carId]);

  async function persistReminders(updated: LocalServiceReminder[]) {
    setServiceReminders(updated);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (err: unknown) {
      console.warn('Persist service reminders error:', err);
    }
  }

  // ── Derived data ──────────────────────────────────────────────────────────

  const carLogs = car ? getLogsForCar(car.id) : [];
  const stats = calculateFuelStats(carLogs);

  // ── Guard: car not found ──────────────────────────────────────────────────

  if (!car) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.notFoundContainer}>
          <Ionicons name="car-outline" size={48} color={Colors.gray300} />
          <Text style={styles.notFoundText}>Car not found</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.goBackButton}>
            <Text style={styles.goBackText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // At this point car is guaranteed to be defined; capture in a non-nullable binding
  // so TypeScript recognises it as Car (not Car | undefined) inside nested closures.
  const definedCar: Car = car;
  const carColor = resolveCarColor(definedCar.color);

  // ── Service reminder actions ───────────────────────────────────────────────

  function handleAddReminder() {
    Alert.alert(
      'Add Service Reminder',
      'Select service type:',
      [
        ...SERVICE_TYPE_OPTIONS.map((type) => ({
          text: formatServiceType(type),
          onPress: () => {
            const newReminder: LocalServiceReminder = {
              id: generateLocalId(),
              carId: definedCar.id,
              type,
              completed: false,
              createdAt: new Date().toISOString(),
            };
            persistReminders([...serviceReminders, newReminder]);
          },
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ]
    );
  }

  function handleToggleComplete(id: string) {
    const updated = serviceReminders.map((r) =>
      r.id === id ? { ...r, completed: !r.completed } : r
    );
    persistReminders(updated);
  }

  function handleDeleteReminder(id: string) {
    Alert.alert('Delete Reminder', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => persistReminders(serviceReminders.filter((r) => r.id !== id)),
      },
    ]);
  }

  // ── Navigation helpers ─────────────────────────────────────────────────────

  function handleLogFuel() {
    navigation.navigate('AddFuelLog', { carId: definedCar.id });
  }

  function handleEditCar() {
    navigation.navigate('AddCar', { car: definedCar });
  }

  function handleDeleteFuelLog(logId: string) {
    deleteLog(logId).catch((err: unknown) => console.warn('Delete log error:', err));
  }

  // ── Odometer progress (visual: relative to a nice round milestone) ─────────

  const odometerMilestone = Math.ceil((definedCar.odometer + 1) / 50000) * 50000;
  const odometerProgress = Math.min(definedCar.odometer / odometerMilestone, 1);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* ================================================================
          GRADIENT HEADER
      ================================================================= */}
      <LinearGradient
        colors={[Colors.primaryDark, Colors.primaryLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        {/* Nav row */}
        <View style={styles.headerNav}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.headerBackButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerNavTitle} numberOfLines={1}>
            {car.nickname}
          </Text>
          <TouchableOpacity
            onPress={handleEditCar}
            style={styles.headerEditButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="create-outline" size={22} color={Colors.white} />
          </TouchableOpacity>
        </View>

        {/* Car identity row */}
        <View style={styles.headerContent}>
          <View style={[styles.headerCarIconCircle, { backgroundColor: carColor + '33' }]}>
            <Ionicons name="car" size={32} color={Colors.white} />
            {/* Color swatch dot */}
            <View
              style={[
                styles.colorDot,
                { backgroundColor: carColor, borderColor: Colors.white },
              ]}
            />
          </View>

          <View style={styles.headerCarInfo}>
            <Text style={styles.headerCarNickname} numberOfLines={1}>
              {car.nickname}
            </Text>
            <Text style={styles.headerCarYearMakeModel}>
              {car.year} {car.make} {car.model}
            </Text>
            {car.licensePlate ? (
              <View style={styles.headerPlatePill}>
                <Text style={styles.headerPlateText}>{car.licensePlate}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </LinearGradient>

      {/* ================================================================
          TAB BAR
      ================================================================= */}
      <View style={styles.tabBar}>
        <TabButton
          label="Overview"
          isActive={activeTab === 'overview'}
          onPress={() => setActiveTab('overview')}
        />
        <TabButton
          label="Fuel History"
          isActive={activeTab === 'history'}
          onPress={() => setActiveTab('history')}
        />
        <TabButton
          label="Services"
          isActive={activeTab === 'services'}
          onPress={() => setActiveTab('services')}
        />
      </View>

      {/* ================================================================
          TAB CONTENT
      ================================================================= */}

      {/* ── OVERVIEW TAB ──────────────────────────────────────────────────── */}
      {activeTab === 'overview' ? (
        <ScrollView
          style={styles.tabContent}
          contentContainerStyle={styles.tabScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Stats grid */}
          <Text style={styles.tabSectionTitle}>Statistics</Text>
          <View style={styles.statsGrid}>
            <StatMiniCard
              icon="water-outline"
              label="Total Fill-ups"
              value={String(stats.totalFillUps)}
              iconColor={Colors.primary}
              iconBg={Colors.primaryFaded}
            />
            <StatMiniCard
              icon="cash-outline"
              label="Total Cost"
              value={formatCurrency(stats.totalCost)}
              iconColor={Colors.secondary}
              iconBg={Colors.secondaryFaded}
            />
            <StatMiniCard
              icon="speedometer-outline"
              label="Avg Consumption"
              value={
                stats.avgConsumption > 0
                  ? formatConsumption(stats.avgConsumption)
                  : '—'
              }
              iconColor={Colors.warning}
              iconBg={Colors.warningFaded}
            />
            <StatMiniCard
              icon="navigate-outline"
              label="Total Distance"
              value={
                stats.totalDistance > 0
                  ? formatDistance(stats.totalDistance)
                  : '—'
              }
              iconColor={Colors.accent}
              iconBg={Colors.accentFaded}
            />
          </View>

          {/* Odometer */}
          <Text style={styles.tabSectionTitle}>Odometer</Text>
          <View style={styles.odometerCard}>
            <View style={styles.odometerHeader}>
              <View style={styles.odometerLeft}>
                <Ionicons name="speedometer" size={22} color={Colors.primary} />
                <Text style={styles.odometerReading}>
                  {car.odometer.toLocaleString()} km
                </Text>
              </View>
              <Text style={styles.odometerMilestone}>
                / {odometerMilestone.toLocaleString()} km
              </Text>
            </View>
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${odometerProgress * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.odometerSubtext}>
              {((1 - odometerProgress) * odometerMilestone).toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })}{' '}
              km to next milestone
            </Text>
          </View>

          {/* Quick actions */}
          <Text style={styles.tabSectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsRow}>
            <TouchableOpacity
              style={[styles.quickActionButton, styles.quickActionPrimary]}
              onPress={handleLogFuel}
              activeOpacity={0.8}
            >
              <Ionicons name="water" size={20} color={Colors.white} />
              <Text style={styles.quickActionPrimaryText}>Log Fuel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickActionButton, styles.quickActionSecondary]}
              onPress={handleEditCar}
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={20} color={Colors.primary} />
              <Text style={styles.quickActionSecondaryText}>Edit Car</Text>
            </TouchableOpacity>
          </View>

          {/* Last fill-up info */}
          {stats.lastFillUp ? (
            <View style={styles.lastFillUpCard}>
              <View style={styles.lastFillUpHeader}>
                <Ionicons name="time-outline" size={16} color={Colors.gray500} />
                <Text style={styles.lastFillUpLabel}>Last Fill-up</Text>
              </View>
              <Text style={styles.lastFillUpDate}>
                {formatDate(stats.lastFillUp.date)}
              </Text>
              <View style={styles.lastFillUpDetails}>
                <Text style={styles.lastFillUpDetail}>
                  {stats.lastFillUp.liters.toFixed(2)} L
                </Text>
                <View style={styles.lastFillUpDot} />
                <Text style={styles.lastFillUpDetail}>
                  {formatCurrency(stats.lastFillUp.totalCost)}
                </Text>
                <View style={styles.lastFillUpDot} />
                <Text style={styles.lastFillUpDetail}>
                  {stats.lastFillUp.odometer.toLocaleString()} km
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.noDataCard}>
              <Ionicons name="water-outline" size={32} color={Colors.gray300} />
              <Text style={styles.noDataText}>No fill-ups recorded yet</Text>
              <TouchableOpacity
                style={styles.noDataAction}
                onPress={handleLogFuel}
                activeOpacity={0.8}
              >
                <Text style={styles.noDataActionText}>Log your first fill-up</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.tabBottomSpacer} />
        </ScrollView>
      ) : null}

      {/* ── FUEL HISTORY TAB ──────────────────────────────────────────────── */}
      {activeTab === 'history' ? (
        <View style={styles.tabContent}>
          {carLogs.length === 0 ? (
            <View style={styles.emptyTabContainer}>
              <Ionicons name="water-outline" size={48} color={Colors.gray300} />
              <Text style={styles.emptyTabTitle}>No fill-ups yet</Text>
              <Text style={styles.emptyTabSubtitle}>
                Tap the button below to log your first fill-up.
              </Text>
            </View>
          ) : (
            <FlatList
              data={carLogs}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              renderItem={({ item, index }) => (
                <FuelLogRow
                  log={item}
                  isLast={index === carLogs.length - 1}
                  onDelete={() => handleDeleteFuelLog(item.id)}
                />
              )}
              ItemSeparatorComponent={() => null}
            />
          )}

          {/* FAB */}
          <TouchableOpacity
            style={styles.fab}
            onPress={handleLogFuel}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={26} color={Colors.white} />
          </TouchableOpacity>
        </View>
      ) : null}

      {/* ── SERVICES TAB ──────────────────────────────────────────────────── */}
      {activeTab === 'services' ? (
        <View style={styles.tabContent}>
          {serviceReminders.length === 0 ? (
            <View style={styles.emptyTabContainer}>
              <Ionicons name="construct-outline" size={48} color={Colors.gray300} />
              <Text style={styles.emptyTabTitle}>No service reminders</Text>
              <Text style={styles.emptyTabSubtitle}>
                Stay on top of maintenance by adding upcoming service reminders.
              </Text>
              <TouchableOpacity
                style={styles.emptyAddButton}
                onPress={handleAddReminder}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
                <Text style={styles.emptyAddButtonText}>Add Reminder</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView
              style={styles.serviceScroll}
              contentContainerStyle={styles.serviceScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Pending reminders */}
              {serviceReminders.filter((r) => !r.completed).length > 0 ? (
                <>
                  <Text style={styles.serviceGroupLabel}>Pending</Text>
                  <View style={styles.serviceListCard}>
                    {serviceReminders
                      .filter((r) => !r.completed)
                      .map((reminder, index, arr) => (
                        <View key={reminder.id}>
                          <ServiceReminderRow
                            reminder={reminder}
                            onToggleComplete={() => handleToggleComplete(reminder.id)}
                            onDelete={() => handleDeleteReminder(reminder.id)}
                          />
                          {index < arr.length - 1 ? (
                            <View style={styles.serviceRowDivider} />
                          ) : null}
                        </View>
                      ))}
                  </View>
                </>
              ) : null}

              {/* Completed reminders */}
              {serviceReminders.filter((r) => r.completed).length > 0 ? (
                <>
                  <Text style={[styles.serviceGroupLabel, { marginTop: Theme.spacing.md }]}>
                    Completed
                  </Text>
                  <View style={styles.serviceListCard}>
                    {serviceReminders
                      .filter((r) => r.completed)
                      .map((reminder, index, arr) => (
                        <View key={reminder.id}>
                          <ServiceReminderRow
                            reminder={reminder}
                            onToggleComplete={() => handleToggleComplete(reminder.id)}
                            onDelete={() => handleDeleteReminder(reminder.id)}
                          />
                          {index < arr.length - 1 ? (
                            <View style={styles.serviceRowDivider} />
                          ) : null}
                        </View>
                      ))}
                  </View>
                </>
              ) : null}

              <View style={styles.tabBottomSpacer} />
            </ScrollView>
          )}

          {/* Add Reminder FAB */}
          <TouchableOpacity
            style={styles.fab}
            onPress={handleAddReminder}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={26} color={Colors.white} />
          </TouchableOpacity>
        </View>
      ) : null}
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

  // ── Not found ──
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.md,
  },
  notFoundText: {
    fontSize: Theme.fontSize.lg,
    fontWeight: Theme.fontWeight.semibold,
    color: Colors.gray500,
  },
  goBackButton: {
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Theme.borderRadius.md,
  },
  goBackText: {
    color: Colors.white,
    fontWeight: Theme.fontWeight.semibold,
    fontSize: Theme.fontSize.base,
  },

  // ── Header gradient ──
  headerGradient: {
    paddingBottom: Theme.spacing.md,
  },
  headerNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.md,
    paddingTop: Theme.spacing.sm,
    paddingBottom: Theme.spacing.sm,
  },
  headerBackButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerNavTitle: {
    fontSize: Theme.fontSize.lg,
    fontWeight: Theme.fontWeight.bold,
    color: Colors.white,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: Theme.spacing.sm,
  },
  headerEditButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
    paddingTop: Theme.spacing.xs,
    gap: Theme.spacing.md,
  },
  headerCarIconCircle: {
    width: 64,
    height: 64,
    borderRadius: Theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    flexShrink: 0,
  },
  colorDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  headerCarInfo: {
    flex: 1,
    gap: 3,
  },
  headerCarNickname: {
    fontSize: Theme.fontSize.xl,
    fontWeight: Theme.fontWeight.extrabold,
    color: Colors.white,
  },
  headerCarYearMakeModel: {
    fontSize: Theme.fontSize.base,
    fontWeight: Theme.fontWeight.medium,
    color: 'rgba(255,255,255,0.82)',
  },
  headerPlatePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: Theme.borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 2,
  },
  headerPlateText: {
    fontSize: Theme.fontSize.xs,
    fontWeight: Theme.fontWeight.bold,
    color: Colors.white,
    letterSpacing: 0.8,
  },

  // ── Tab bar ──
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
    ...Theme.shadow.sm,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  tabButtonActive: {
    // underline is an absolute child
  },
  tabButtonText: {
    fontSize: Theme.fontSize.sm,
    fontWeight: Theme.fontWeight.medium,
    color: Colors.gray500,
  },
  tabButtonTextActive: {
    color: Colors.primary,
    fontWeight: Theme.fontWeight.bold,
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: '15%',
    right: '15%',
    height: 2.5,
    backgroundColor: Colors.primary,
    borderRadius: Theme.borderRadius.full,
  },

  // ── Tab content ──
  tabContent: {
    flex: 1,
  },
  tabScrollContent: {
    paddingHorizontal: Theme.spacing.md,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.xl,
  },
  tabSectionTitle: {
    fontSize: Theme.fontSize.base,
    fontWeight: Theme.fontWeight.bold,
    color: Colors.gray700,
    marginBottom: Theme.spacing.sm,
    marginTop: Theme.spacing.md,
  },
  tabBottomSpacer: {
    height: Theme.spacing.xxl,
  },

  // ── Stats grid ──
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
    width: 38,
    height: 38,
    borderRadius: Theme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.xs,
  },
  statLabel: {
    fontSize: Theme.fontSize.xs,
    fontWeight: Theme.fontWeight.medium,
    color: Colors.gray500,
    marginBottom: 3,
    lineHeight: 15,
  },
  statValue: {
    fontSize: Theme.fontSize.lg,
    fontWeight: Theme.fontWeight.bold,
    color: Colors.gray900,
  },

  // ── Odometer card ──
  odometerCard: {
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.md,
    ...Theme.shadow.sm,
  },
  odometerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.sm,
  },
  odometerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
  },
  odometerReading: {
    fontSize: Theme.fontSize.xl,
    fontWeight: Theme.fontWeight.extrabold,
    color: Colors.gray900,
  },
  odometerMilestone: {
    fontSize: Theme.fontSize.sm,
    fontWeight: Theme.fontWeight.medium,
    color: Colors.gray400,
  },
  progressBarTrack: {
    height: 10,
    backgroundColor: Colors.gray100,
    borderRadius: Theme.borderRadius.full,
    overflow: 'hidden',
    marginBottom: Theme.spacing.xs,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: Theme.borderRadius.full,
    minWidth: 8,
  },
  odometerSubtext: {
    fontSize: Theme.fontSize.xs,
    fontWeight: Theme.fontWeight.medium,
    color: Colors.gray400,
    textAlign: 'right',
  },

  // ── Quick actions ──
  quickActionsRow: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.sm,
    paddingVertical: 14,
    borderRadius: Theme.borderRadius.md,
    ...Theme.shadow.sm,
  },
  quickActionPrimary: {
    backgroundColor: Colors.primary,
  },
  quickActionPrimaryText: {
    fontSize: Theme.fontSize.base,
    fontWeight: Theme.fontWeight.bold,
    color: Colors.white,
  },
  quickActionSecondary: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  quickActionSecondaryText: {
    fontSize: Theme.fontSize.base,
    fontWeight: Theme.fontWeight.bold,
    color: Colors.primary,
  },

  // ── Last fill-up card ──
  lastFillUpCard: {
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.md,
    marginTop: Theme.spacing.md,
    ...Theme.shadow.sm,
  },
  lastFillUpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
    marginBottom: 4,
  },
  lastFillUpLabel: {
    fontSize: Theme.fontSize.sm,
    fontWeight: Theme.fontWeight.medium,
    color: Colors.gray500,
  },
  lastFillUpDate: {
    fontSize: Theme.fontSize.lg,
    fontWeight: Theme.fontWeight.bold,
    color: Colors.gray900,
    marginBottom: Theme.spacing.xs,
  },
  lastFillUpDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  lastFillUpDetail: {
    fontSize: Theme.fontSize.sm,
    fontWeight: Theme.fontWeight.medium,
    color: Colors.gray600,
  },
  lastFillUpDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.gray300,
  },

  // ── No data card ──
  noDataCard: {
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.lg,
    marginTop: Theme.spacing.md,
    alignItems: 'center',
    gap: Theme.spacing.sm,
    ...Theme.shadow.sm,
  },
  noDataText: {
    fontSize: Theme.fontSize.base,
    fontWeight: Theme.fontWeight.medium,
    color: Colors.gray400,
  },
  noDataAction: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    backgroundColor: Colors.primaryFaded,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  noDataActionText: {
    fontSize: Theme.fontSize.sm,
    fontWeight: Theme.fontWeight.semibold,
    color: Colors.primary,
  },

  // ── Fuel history list ──
  listContent: {
    paddingHorizontal: Theme.spacing.md,
    paddingTop: Theme.spacing.sm,
    paddingBottom: 80, // space for FAB
    backgroundColor: Colors.gray50,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
    gap: Theme.spacing.sm,
  },
  logRowLast: {
    borderBottomWidth: 0,
    borderBottomLeftRadius: Theme.borderRadius.lg,
    borderBottomRightRadius: Theme.borderRadius.lg,
  },
  logDateCol: {
    alignItems: 'center',
    gap: 4,
    width: 54,
    flexShrink: 0,
  },
  logDate: {
    fontSize: Theme.fontSize.xs,
    fontWeight: Theme.fontWeight.medium,
    color: Colors.gray500,
    textAlign: 'center',
  },
  logDetails: {
    flex: 1,
  },
  logLiters: {
    fontSize: Theme.fontSize.base,
    fontWeight: Theme.fontWeight.semibold,
    color: Colors.gray800,
    marginBottom: 2,
  },
  logOdometer: {
    fontSize: Theme.fontSize.sm,
    fontWeight: Theme.fontWeight.regular,
    color: Colors.gray400,
  },
  logRight: {
    alignItems: 'flex-end',
    gap: 4,
    flexShrink: 0,
  },
  logCost: {
    fontSize: Theme.fontSize.base,
    fontWeight: Theme.fontWeight.bold,
    color: Colors.gray900,
  },
  fullTankBadge: {
    backgroundColor: Colors.secondaryFaded,
    borderRadius: Theme.borderRadius.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  fullTankText: {
    fontSize: Theme.fontSize.xs,
    fontWeight: Theme.fontWeight.semibold,
    color: Colors.secondary,
  },
  partialTankBadge: {
    backgroundColor: Colors.gray100,
    borderRadius: Theme.borderRadius.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  partialTankText: {
    fontSize: Theme.fontSize.xs,
    fontWeight: Theme.fontWeight.medium,
    color: Colors.gray400,
  },

  // ── Services ──
  serviceScroll: {
    flex: 1,
  },
  serviceScrollContent: {
    paddingHorizontal: Theme.spacing.md,
    paddingTop: Theme.spacing.md,
    paddingBottom: 80,
  },
  serviceGroupLabel: {
    fontSize: Theme.fontSize.sm,
    fontWeight: Theme.fontWeight.bold,
    color: Colors.gray400,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Theme.spacing.xs,
  },
  serviceListCard: {
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.lg,
    overflow: 'hidden',
    ...Theme.shadow.sm,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 13,
    gap: Theme.spacing.sm,
  },
  serviceRowDivider: {
    height: 1,
    backgroundColor: Colors.gray100,
    marginLeft: 56 + Theme.spacing.md, // indent past icon
  },
  serviceIconCircle: {
    width: 44,
    height: 44,
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
  serviceTypeCompleted: {
    color: Colors.gray400,
    textDecorationLine: 'line-through',
  },
  serviceDue: {
    fontSize: Theme.fontSize.sm,
    fontWeight: Theme.fontWeight.medium,
    color: Colors.gray500,
  },
  serviceDueOverdue: {
    color: Colors.danger,
  },
  serviceNotes: {
    fontSize: Theme.fontSize.xs,
    color: Colors.gray400,
    marginTop: 2,
  },

  // ── Empty tab state ──
  emptyTabContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Theme.spacing.xl,
    gap: Theme.spacing.sm,
  },
  emptyTabTitle: {
    fontSize: Theme.fontSize.lg,
    fontWeight: Theme.fontWeight.bold,
    color: Colors.gray700,
  },
  emptyTabSubtitle: {
    fontSize: Theme.fontSize.base,
    fontWeight: Theme.fontWeight.regular,
    color: Colors.gray400,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
    marginTop: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    backgroundColor: Colors.primaryFaded,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  emptyAddButtonText: {
    fontSize: Theme.fontSize.base,
    fontWeight: Theme.fontWeight.semibold,
    color: Colors.primary,
  },

  // ── FAB ──
  fab: {
    position: 'absolute',
    bottom: Theme.spacing.lg,
    right: Theme.spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadow.lg,
  },
});

export default CarDetailScreen;
