import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCarStore } from '../../store/carStore';
import { useFuelLogStore } from '../../store/fuelLogStore';
import { useAuthStore } from '../../store/authStore';
import { Colors } from '../../constants/colors';
import { Theme } from '../../constants/theme';
import { formatCurrency } from '../../utils/formatters';
import { FuelType, Car } from '../../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AddFuelLogScreenProps {
  navigation: any;
  route: any;
}

type FuelTypeOption = { value: FuelType; label: string };

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FUEL_TYPE_OPTIONS: FuelTypeOption[] = [
  { value: 'gasoline', label: 'Gasoline' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'electric', label: 'Electric' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'lpg', label: 'LPG' },
  { value: 'cng', label: 'CNG' },
];

const FUEL_TYPE_COLORS: Record<FuelType, string> = {
  gasoline: Colors.fuelTypes.gasoline,
  diesel: Colors.fuelTypes.diesel,
  electric: Colors.fuelTypes.electric,
  hybrid: Colors.fuelTypes.hybrid,
  lpg: Colors.fuelTypes.lpg,
  cng: Colors.fuelTypes.cng,
};

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

function resolveCarColor(color?: string): string {
  if (!color) return Colors.primary;
  const lower = color.toLowerCase();
  if (CAR_COLOR_MAP[lower]) return CAR_COLOR_MAP[lower];
  if (color.startsWith('#')) return color;
  return Colors.primary;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function formatDateDisplay(isoDate: string): string {
  // isoDate is YYYY-MM-DD
  const [year, month, day] = isoDate.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface SectionHeaderProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ icon, title, subtitle }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionIconCircle}>
      <Ionicons name={icon} size={15} color={Colors.primary} />
    </View>
    <View style={styles.sectionHeaderText}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
  </View>
);

interface FieldLabelProps {
  label: string;
  required?: boolean;
  hint?: string;
}

const FieldLabel: React.FC<FieldLabelProps> = ({ label, required, hint }) => (
  <View style={styles.fieldLabelRow}>
    <Text style={styles.fieldLabel}>
      {label}
      {required ? <Text style={styles.requiredAsterisk}> *</Text> : null}
    </Text>
    {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
  </View>
);

// ---------------------------------------------------------------------------
// Car Selector Card (horizontal scroll item)
// ---------------------------------------------------------------------------

interface CarSelectorCardProps {
  car: Car;
  isSelected: boolean;
  onPress: () => void;
}

const CarSelectorCard: React.FC<CarSelectorCardProps> = ({ car, isSelected, onPress }) => {
  const carColor = resolveCarColor(car.color);
  return (
    <TouchableOpacity
      style={[styles.carCard, isSelected && styles.carCardSelected]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {isSelected && (
        <View style={styles.carCardCheckmark}>
          <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
        </View>
      )}
      <View style={[styles.carCardIconCircle, { backgroundColor: carColor + '22' }]}>
        <Ionicons name="car" size={22} color={carColor} />
      </View>
      <Text style={[styles.carCardNickname, isSelected && styles.carCardNicknameSelected]} numberOfLines={1}>
        {car.nickname || `${car.make} ${car.model}`}
      </Text>
      <Text style={styles.carCardSub} numberOfLines={1}>
        {car.year} {car.make}
      </Text>
      {car.odometer > 0 && (
        <Text style={styles.carCardOdo}>{car.odometer.toLocaleString()} km</Text>
      )}
    </TouchableOpacity>
  );
};

// ---------------------------------------------------------------------------
// Date Picker Modal
// ---------------------------------------------------------------------------

interface DatePickerModalProps {
  visible: boolean;
  currentDate: string; // YYYY-MM-DD
  onConfirm: (date: string) => void;
  onClose: () => void;
}

const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  currentDate,
  onConfirm,
  onClose,
}) => {
  const [draft, setDraft] = useState(currentDate);

  useEffect(() => {
    if (visible) setDraft(currentDate);
  }, [visible, currentDate]);

  function handleConfirm() {
    // Validate the format YYYY-MM-DD
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(draft)) {
      Alert.alert('Invalid date', 'Please enter a date in YYYY-MM-DD format.');
      return;
    }
    const parsed = new Date(draft);
    if (isNaN(parsed.getTime())) {
      Alert.alert('Invalid date', 'The date you entered is not valid.');
      return;
    }
    onConfirm(draft);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Select Date</Text>
          <Text style={styles.modalSubtitle}>Enter the date of your fill-up</Text>

          <View style={styles.dateInputWrapper}>
            <Ionicons name="calendar-outline" size={18} color={Colors.gray400} style={styles.dateInputIcon} />
            <TextInput
              style={styles.dateInput}
              value={draft}
              onChangeText={setDraft}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.gray400}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
              autoFocus
            />
          </View>

          <View style={styles.modalQuickDates}>
            {[0, 1, 2].map((daysAgo) => {
              const d = new Date();
              d.setDate(d.getDate() - daysAgo);
              const iso = d.toISOString().slice(0, 10);
              const label = daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : '2 days ago';
              return (
                <TouchableOpacity
                  key={iso}
                  style={[styles.quickDateChip, draft === iso && styles.quickDateChipActive]}
                  onPress={() => setDraft(iso)}
                >
                  <Text style={[styles.quickDateText, draft === iso && styles.quickDateTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancelButton} onPress={onClose}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalConfirmButton} onPress={handleConfirm}>
              <Text style={styles.modalConfirmText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

const AddFuelLogScreen: React.FC<AddFuelLogScreenProps> = ({ navigation, route }) => {
  const preselectedCarId: string | undefined = route?.params?.carId;

  const { user, settings } = useAuthStore();
  const { cars } = useCarStore();
  const { addLog } = useFuelLogStore();

  // Filter to user's cars only
  const userCars = cars.filter((c) => c.userId === user?.id);

  // ── Form state ─────────────────────────────────────────────────────────────

  const [selectedCarId, setSelectedCarId] = useState<string | null>(
    preselectedCarId ??
      userCars.find((c) => c.isDefault)?.id ??
      userCars[0]?.id ??
      null
  );
  const [date, setDate] = useState<string>(todayISO());
  const [odometer, setOdometer] = useState<string>('');
  const [fullTank, setFullTank] = useState<boolean>(true);
  const [liters, setLiters] = useState<string>('');
  const [pricePerLiter, setPricePerLiter] = useState<string>('');
  const [totalCost, setTotalCost] = useState<string>('');
  const [fuelType, setFuelType] = useState<FuelType>('gasoline');
  const [stationName, setStationName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [dateModalVisible, setDateModalVisible] = useState<boolean>(false);

  // Track which field was last edited to know what to recalculate
  const [lastPriceEdit, setLastPriceEdit] = useState<'liters' | 'price' | 'total' | null>(null);

  // Odometer warning (not a hard error)
  const [odometerWarning, setOdometerWarning] = useState<string>('');

  // ── Selected car ───────────────────────────────────────────────────────────

  const selectedCar = userCars.find((c) => c.id === selectedCarId) ?? null;

  // Pre-fill odometer and fuel type when car changes
  useEffect(() => {
    if (selectedCar) {
      setOdometer(selectedCar.odometer > 0 ? String(selectedCar.odometer) : '');
      setFuelType(selectedCar.fuelType);
      setOdometerWarning('');
    }
  }, [selectedCarId]);

  // ── Auto-calculation logic ─────────────────────────────────────────────────

  const handleLitersChange = useCallback((val: string) => {
    setLiters(val);
    setLastPriceEdit('liters');
    const l = parseFloat(val);
    const p = parseFloat(pricePerLiter);
    if (!isNaN(l) && !isNaN(p) && l > 0 && p > 0) {
      setTotalCost((l * p).toFixed(2));
    }
  }, [pricePerLiter]);

  const handlePricePerLiterChange = useCallback((val: string) => {
    setPricePerLiter(val);
    setLastPriceEdit('price');
    const l = parseFloat(liters);
    const p = parseFloat(val);
    if (!isNaN(l) && !isNaN(p) && l > 0 && p > 0) {
      setTotalCost((l * p).toFixed(2));
    }
  }, [liters]);

  const handleTotalCostChange = useCallback((val: string) => {
    setTotalCost(val);
    setLastPriceEdit('total');
    // Back-calculate price per liter from total and liters
    const t = parseFloat(val);
    const l = parseFloat(liters);
    if (!isNaN(t) && !isNaN(l) && l > 0 && t > 0) {
      setPricePerLiter((t / l).toFixed(4));
    }
  }, [liters]);

  // Odometer warning check
  const handleOdometerChange = useCallback((val: string) => {
    setOdometer(val);
    const odo = parseFloat(val);
    if (selectedCar && !isNaN(odo) && odo <= selectedCar.odometer && selectedCar.odometer > 0) {
      setOdometerWarning(
        `Warning: entered odometer (${odo.toLocaleString()}) is not higher than car's last reading (${selectedCar.odometer.toLocaleString()} km).`
      );
    } else {
      setOdometerWarning('');
    }
  }, [selectedCar]);

  // ── Validation ─────────────────────────────────────────────────────────────

  function validate(): boolean {
    if (!selectedCar) {
      Alert.alert('No Car Selected', 'Please select which car this fill-up is for.');
      return false;
    }
    const l = parseFloat(liters);
    if (isNaN(l) || l <= 0) {
      Alert.alert('Invalid Liters', 'Please enter a valid number of liters greater than 0.');
      return false;
    }
    const p = parseFloat(pricePerLiter);
    if (isNaN(p) || p <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid price per liter greater than 0.');
      return false;
    }
    return true;
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!validate() || !user || !selectedCar) return;

    const l = parseFloat(liters);
    const p = parseFloat(pricePerLiter);
    const t = parseFloat(totalCost) || l * p;
    const odo = parseFloat(odometer) || selectedCar.odometer;

    setIsSaving(true);
    try {
      await addLog({
        userId: user.id,
        carId: selectedCar.id,
        date: new Date(date).toISOString(),
        odometer: odo,
        liters: l,
        pricePerLiter: p,
        totalCost: t,
        fullTank,
        stationName: stationName.trim() || undefined,
        notes: notes.trim() || undefined,
        fuelType,
      });
      navigation.goBack();
    } catch (err: unknown) {
      console.warn('Save fuel log error:', err);
      Alert.alert('Error', 'Failed to save fill-up. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  const currencySymbol = settings.currencySymbol;
  const calculatedTotal = (() => {
    const l = parseFloat(liters);
    const p = parseFloat(pricePerLiter);
    if (!isNaN(l) && !isNaN(p) && l > 0 && p > 0) return l * p;
    return null;
  })();

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      {/* ── Navbar ──────────────────────────────────────────────────────────── */}
      <View style={styles.navbar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.navCloseButton}
        >
          <Ionicons name="close" size={24} color={Colors.gray700} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Log Fill-up</Text>
        <View style={styles.navPlaceholder} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ================================================================
              CAR SELECTOR
          ================================================================= */}
          <View style={styles.carSelectorSection}>
            <Text style={styles.carSelectorLabel}>Select Car</Text>
            {userCars.length === 0 ? (
              <View style={styles.noCarNotice}>
                <Ionicons name="car-outline" size={18} color={Colors.gray400} />
                <Text style={styles.noCarNoticeText}>
                  No cars found. Add a car first.
                </Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.carSelectorScrollContent}
                style={styles.carSelectorScroll}
              >
                {userCars.map((car) => (
                  <CarSelectorCard
                    key={car.id}
                    car={car}
                    isSelected={car.id === selectedCarId}
                    onPress={() => setSelectedCarId(car.id)}
                  />
                ))}
              </ScrollView>
            )}
          </View>

          {/* ================================================================
              SECTION 1 — Fill-up Details
          ================================================================= */}
          <SectionHeader icon="information-circle-outline" title="Fill-up Details" />

          {/* Date picker */}
          <View style={styles.fieldGroup}>
            <FieldLabel label="Date" required />
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setDateModalVisible(true)}
              activeOpacity={0.75}
            >
              <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
              <Text style={styles.datePickerText}>{formatDateDisplay(date)}</Text>
              <Ionicons name="chevron-down" size={16} color={Colors.gray400} style={styles.datePickerChevron} />
            </TouchableOpacity>
          </View>

          {/* Odometer */}
          <View style={styles.fieldGroup}>
            <FieldLabel
              label="Odometer Reading"
              required
              hint={selectedCar && selectedCar.odometer > 0 ? `Last: ${selectedCar.odometer.toLocaleString()} km` : undefined}
            />
            <View style={styles.inputWithUnit}>
              <TextInput
                style={[styles.textInput, styles.inputWithUnitField]}
                placeholder={selectedCar && selectedCar.odometer > 0 ? String(selectedCar.odometer) : 'e.g. 45200'}
                placeholderTextColor={Colors.gray400}
                value={odometer}
                onChangeText={handleOdometerChange}
                keyboardType="number-pad"
                returnKeyType="next"
              />
              <View style={styles.unitBadge}>
                <Text style={styles.unitBadgeText}>km</Text>
              </View>
            </View>
            {odometerWarning ? (
              <View style={styles.warningRow}>
                <Ionicons name="warning-outline" size={13} color={Colors.warning} />
                <Text style={styles.warningText}>{odometerWarning}</Text>
              </View>
            ) : null}
          </View>

          {/* Full tank toggle */}
          <View style={styles.fieldGroup}>
            <FieldLabel label="Full Tank" hint="Affects consumption accuracy" />
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.toggleOption, !fullTank && styles.toggleOptionActive]}
                onPress={() => setFullTank(false)}
                activeOpacity={0.75}
              >
                <Text style={[styles.toggleOptionText, !fullTank && styles.toggleOptionTextActive]}>
                  No
                </Text>
              </TouchableOpacity>
              <Switch
                value={fullTank}
                onValueChange={setFullTank}
                trackColor={{ false: Colors.gray200, true: Colors.primaryLight }}
                thumbColor={fullTank ? Colors.primary : Colors.gray400}
                style={styles.toggleSwitch}
              />
              <TouchableOpacity
                style={[styles.toggleOption, fullTank && styles.toggleOptionActive]}
                onPress={() => setFullTank(true)}
                activeOpacity={0.75}
              >
                <Text style={[styles.toggleOptionText, fullTank && styles.toggleOptionTextActive]}>
                  Yes
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.toggleCaption}>
              {fullTank
                ? 'Tank was filled to the top — enables accurate consumption tracking.'
                : 'Partial fill-up — excluded from consumption calculations.'}
            </Text>
          </View>

          {/* ================================================================
              SECTION 2 — Fuel Details
          ================================================================= */}
          <SectionHeader icon="flame-outline" title="Fuel Details" />

          {/* Liters */}
          <View style={styles.fieldGroup}>
            <FieldLabel label="Liters Filled" required />
            <View style={styles.inputWithUnit}>
              <TextInput
                style={[styles.textInput, styles.inputWithUnitField]}
                placeholder="e.g. 42.5"
                placeholderTextColor={Colors.gray400}
                value={liters}
                onChangeText={handleLitersChange}
                keyboardType="decimal-pad"
                returnKeyType="next"
              />
              <View style={styles.unitBadge}>
                <Text style={styles.unitBadgeText}>L</Text>
              </View>
            </View>
          </View>

          {/* Price per liter */}
          <View style={styles.fieldGroup}>
            <FieldLabel label="Price per Liter" required />
            <View style={styles.inputWithPrefix}>
              <View style={styles.prefixBadge}>
                <Text style={styles.prefixBadgeText}>{currencySymbol}</Text>
              </View>
              <TextInput
                style={[styles.textInput, styles.inputWithPrefixField]}
                placeholder="e.g. 1.85"
                placeholderTextColor={Colors.gray400}
                value={pricePerLiter}
                onChangeText={handlePricePerLiterChange}
                keyboardType="decimal-pad"
                returnKeyType="next"
              />
            </View>
          </View>

          {/* Total cost */}
          <View style={styles.fieldGroup}>
            <FieldLabel label="Total Cost" hint="Auto-calculated" />
            <View style={styles.inputWithPrefix}>
              <View style={styles.prefixBadge}>
                <Text style={styles.prefixBadgeText}>{currencySymbol}</Text>
              </View>
              <TextInput
                style={[
                  styles.textInput,
                  styles.inputWithPrefixField,
                  calculatedTotal !== null ? styles.textInputCalculated : null,
                ]}
                placeholder="e.g. 78.62"
                placeholderTextColor={Colors.gray400}
                value={totalCost}
                onChangeText={handleTotalCostChange}
                keyboardType="decimal-pad"
                returnKeyType="next"
              />
            </View>
            {calculatedTotal !== null && (
              <Text style={styles.calculatedHint}>
                Calculated: {formatCurrency(calculatedTotal, currencySymbol)}
              </Text>
            )}
          </View>

          {/* Fuel type segmented control */}
          <View style={styles.fieldGroup}>
            <FieldLabel label="Fuel Type" required />
            <View style={styles.segmentedPicker}>
              {FUEL_TYPE_OPTIONS.map((opt) => {
                const isActive = fuelType === opt.value;
                const activeColor = FUEL_TYPE_COLORS[opt.value];
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.segmentOption,
                      isActive
                        ? { backgroundColor: activeColor, borderColor: activeColor }
                        : styles.segmentOptionInactive,
                    ]}
                    onPress={() => setFuelType(opt.value)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.segmentOptionText,
                        isActive ? styles.segmentOptionTextActive : styles.segmentOptionTextInactive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ================================================================
              SECTION 3 — Station (Optional)
          ================================================================= */}
          <SectionHeader icon="location-outline" title="Station" subtitle="Optional" />

          {/* Station name */}
          <View style={styles.fieldGroup}>
            <FieldLabel label="Station Name" />
            <TextInput
              style={styles.textInput}
              placeholder='e.g. "Shell on Main St"'
              placeholderTextColor={Colors.gray400}
              value={stationName}
              onChangeText={setStationName}
              returnKeyType="next"
              autoCapitalize="words"
            />
          </View>

          {/* Notes */}
          <View style={styles.fieldGroup}>
            <FieldLabel
              label="Notes"
              hint={`${notes.length}/200`}
            />
            <TextInput
              style={[styles.textInput, styles.notesInput]}
              placeholder="Any notes about this fill-up..."
              placeholderTextColor={Colors.gray400}
              value={notes}
              onChangeText={(v) => setNotes(v.slice(0, 200))}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              returnKeyType="done"
            />
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* ── Sticky Save Button ───────────────────────────────────────────── */}
        <View style={styles.submitContainer}>
          <TouchableOpacity
            style={[styles.submitButton, isSaving && styles.submitButtonDisabled]}
            onPress={handleSave}
            activeOpacity={0.82}
            disabled={isSaving}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color={Colors.white} />
            <Text style={styles.submitButtonText}>
              {isSaving ? 'Saving…' : 'Save Fill-up'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* ── Date Picker Modal ──────────────────────────────────────────────── */}
      <DatePickerModal
        visible={dateModalVisible}
        currentDate={date}
        onConfirm={setDate}
        onClose={() => setDateModalVisible(false)}
      />
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

  // ── Navbar ──
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  navCloseButton: {
    width: 36,
    height: 36,
    borderRadius: Theme.borderRadius.full,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: Theme.fontSize.lg,
    fontWeight: Theme.fontWeight.bold,
    color: Colors.gray900,
  },
  navPlaceholder: {
    width: 36,
  },

  // ── Keyboard / scroll ──
  keyboardAvoiding: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Theme.spacing.xl,
  },

  // ── Car selector ──
  carSelectorSection: {
    backgroundColor: Colors.white,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
    marginBottom: Theme.spacing.md,
  },
  carSelectorLabel: {
    fontSize: Theme.fontSize.xs,
    fontWeight: Theme.fontWeight.bold,
    color: Colors.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
  },
  carSelectorScroll: {
    flexGrow: 0,
  },
  carSelectorScrollContent: {
    paddingHorizontal: Theme.spacing.md,
    gap: Theme.spacing.sm,
    paddingRight: Theme.spacing.lg,
  },
  noCarNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
  },
  noCarNoticeText: {
    fontSize: Theme.fontSize.sm,
    color: Colors.gray400,
  },

  // ── Car card ──
  carCard: {
    width: 110,
    backgroundColor: Colors.gray50,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    alignItems: 'center',
    position: 'relative',
  },
  carCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryFaded,
  },
  carCardCheckmark: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  carCardIconCircle: {
    width: 44,
    height: 44,
    borderRadius: Theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  carCardNickname: {
    fontSize: Theme.fontSize.sm,
    fontWeight: Theme.fontWeight.semibold,
    color: Colors.gray700,
    textAlign: 'center',
    marginBottom: 2,
  },
  carCardNicknameSelected: {
    color: Colors.primary,
  },
  carCardSub: {
    fontSize: Theme.fontSize.xs,
    color: Colors.gray400,
    textAlign: 'center',
  },
  carCardOdo: {
    fontSize: Theme.fontSize.xs,
    color: Colors.gray400,
    marginTop: 3,
    textAlign: 'center',
  },

  // ── Section header ──
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    marginTop: Theme.spacing.sm,
    marginBottom: Theme.spacing.sm,
  },
  sectionIconCircle: {
    width: 28,
    height: 28,
    borderRadius: Theme.borderRadius.full,
    backgroundColor: Colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sectionHeaderText: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  sectionTitle: {
    fontSize: Theme.fontSize.base,
    fontWeight: Theme.fontWeight.bold,
    color: Colors.gray800,
  },
  sectionSubtitle: {
    fontSize: Theme.fontSize.xs,
    fontWeight: Theme.fontWeight.medium,
    color: Colors.gray400,
  },

  // ── Field group ──
  fieldGroup: {
    paddingHorizontal: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: Theme.fontSize.sm,
    fontWeight: Theme.fontWeight.semibold,
    color: Colors.gray700,
  },
  requiredAsterisk: {
    color: Colors.danger,
  },
  fieldHint: {
    fontSize: Theme.fontSize.xs,
    color: Colors.gray400,
    fontWeight: Theme.fontWeight.medium,
  },

  // ── Text input ──
  textInput: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    borderRadius: Theme.borderRadius.md,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 13 : 10,
    fontSize: Theme.fontSize.base,
    color: Colors.gray900,
  },
  textInputCalculated: {
    color: Colors.primary,
    fontWeight: Theme.fontWeight.semibold,
  },
  notesInput: {
    height: 88,
    paddingTop: Platform.OS === 'ios' ? 13 : 10,
  },

  // ── Input with unit badge ──
  inputWithUnit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  inputWithUnitField: {
    flex: 1,
  },
  unitBadge: {
    backgroundColor: Colors.gray100,
    borderRadius: Theme.borderRadius.sm,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 13 : 10,
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitBadgeText: {
    fontSize: Theme.fontSize.sm,
    fontWeight: Theme.fontWeight.bold,
    color: Colors.gray500,
  },

  // ── Input with prefix badge ──
  inputWithPrefix: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  prefixBadge: {
    backgroundColor: Colors.gray100,
    borderRadius: Theme.borderRadius.sm,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 13 : 10,
    minWidth: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prefixBadgeText: {
    fontSize: Theme.fontSize.base,
    fontWeight: Theme.fontWeight.bold,
    color: Colors.gray500,
  },
  inputWithPrefixField: {
    flex: 1,
  },

  // ── Calculated hint ──
  calculatedHint: {
    fontSize: Theme.fontSize.xs,
    color: Colors.primary,
    fontWeight: Theme.fontWeight.semibold,
    marginTop: 5,
    marginLeft: 2,
  },

  // ── Warning ──
  warningRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    marginTop: 5,
  },
  warningText: {
    flex: 1,
    fontSize: Theme.fontSize.xs,
    color: Colors.warning,
    fontWeight: Theme.fontWeight.medium,
    lineHeight: 16,
  },

  // ── Date picker button ──
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    borderRadius: Theme.borderRadius.md,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 13 : 10,
    gap: Theme.spacing.sm,
  },
  datePickerText: {
    flex: 1,
    fontSize: Theme.fontSize.base,
    color: Colors.gray900,
    fontWeight: Theme.fontWeight.medium,
  },
  datePickerChevron: {
    marginLeft: 'auto',
  },

  // ── Full tank toggle ──
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  toggleOption: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 8,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    backgroundColor: Colors.white,
    minWidth: 52,
    alignItems: 'center',
  },
  toggleOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryFaded,
  },
  toggleOptionText: {
    fontSize: Theme.fontSize.sm,
    fontWeight: Theme.fontWeight.semibold,
    color: Colors.gray500,
  },
  toggleOptionTextActive: {
    color: Colors.primary,
  },
  toggleSwitch: {
    transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }],
  },
  toggleCaption: {
    fontSize: Theme.fontSize.xs,
    color: Colors.gray400,
    marginTop: 6,
    lineHeight: 16,
  },

  // ── Fuel type segmented ──
  segmentedPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.xs,
  },
  segmentOption: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1.5,
  },
  segmentOptionInactive: {
    backgroundColor: Colors.white,
    borderColor: Colors.gray200,
  },
  segmentOptionText: {
    fontSize: Theme.fontSize.sm,
    fontWeight: Theme.fontWeight.semibold,
  },
  segmentOptionTextActive: {
    color: Colors.white,
  },
  segmentOptionTextInactive: {
    color: Colors.gray500,
  },

  // ── Bottom spacer ──
  bottomSpacer: {
    height: Theme.spacing.xl,
  },

  // ── Submit ──
  submitContainer: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.md,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: Theme.borderRadius.md,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.sm,
    ...Theme.shadow.md,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: Theme.fontSize.md,
    fontWeight: Theme.fontWeight.bold,
    color: Colors.white,
  },

  // ── Date Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.lg,
  },
  modalSheet: {
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.xl,
    padding: Theme.spacing.lg,
    width: '100%',
    maxWidth: 380,
    ...Theme.shadow.lg,
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.gray200,
    borderRadius: Theme.borderRadius.full,
    alignSelf: 'center',
    marginBottom: Theme.spacing.md,
  },
  modalTitle: {
    fontSize: Theme.fontSize.lg,
    fontWeight: Theme.fontWeight.bold,
    color: Colors.gray900,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: Theme.fontSize.sm,
    color: Colors.gray500,
    marginBottom: Theme.spacing.md,
  },
  dateInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    borderRadius: Theme.borderRadius.md,
    paddingHorizontal: Theme.spacing.sm,
    marginBottom: Theme.spacing.md,
  },
  dateInputIcon: {
    marginRight: Theme.spacing.xs,
  },
  dateInput: {
    flex: 1,
    fontSize: Theme.fontSize.base,
    color: Colors.gray900,
    paddingVertical: Platform.OS === 'ios' ? 13 : 10,
    fontWeight: Theme.fontWeight.medium,
  },
  modalQuickDates: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
    marginBottom: Theme.spacing.lg,
  },
  quickDateChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    backgroundColor: Colors.white,
    alignItems: 'center',
  },
  quickDateChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryFaded,
  },
  quickDateText: {
    fontSize: Theme.fontSize.xs,
    fontWeight: Theme.fontWeight.semibold,
    color: Colors.gray500,
  },
  quickDateTextActive: {
    color: Colors.primary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: Theme.fontSize.base,
    fontWeight: Theme.fontWeight.semibold,
    color: Colors.gray600,
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: Theme.fontSize.base,
    fontWeight: Theme.fontWeight.bold,
    color: Colors.white,
  },
});

export default AddFuelLogScreen;
