import React, { useState, useRef } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCarStore } from '../../store/carStore';
import { useAuthStore } from '../../store/authStore';
import { Colors } from '../../constants/colors';
import { Theme } from '../../constants/theme';
import { Car, FuelType } from '../../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AddCarScreenProps {
  navigation: any;
  route: any;
}

interface FormErrors {
  nickname?: string;
  make?: string;
  model?: string;
  year?: string;
  tankCapacity?: string;
  odometer?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FUEL_TYPE_OPTIONS: { value: FuelType; label: string }[] = [
  { value: 'gasoline', label: 'Gasoline' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'electric', label: 'Electric' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'lpg', label: 'LPG' },
  { value: 'cng', label: 'CNG' },
];

const COLOR_OPTIONS: { name: string; hex: string }[] = [
  { name: 'blue', hex: '#3B82F6' },
  { name: 'red', hex: '#EF4444' },
  { name: 'green', hex: '#10B981' },
  { name: 'black', hex: '#1F2937' },
  { name: 'white', hex: '#F9FAFB' },
  { name: 'silver', hex: '#9CA3AF' },
  { name: 'gray', hex: '#6B7280' },
  { name: 'yellow', hex: '#F59E0B' },
  { name: 'orange', hex: '#F97316' },
  { name: 'purple', hex: '#8B5CF6' },
];

const FUEL_TYPE_COLORS: Record<FuelType, string> = {
  gasoline: Colors.fuelTypes.gasoline,
  diesel: Colors.fuelTypes.diesel,
  electric: Colors.fuelTypes.electric,
  hybrid: Colors.fuelTypes.hybrid,
  lpg: Colors.fuelTypes.lpg,
  cng: Colors.fuelTypes.cng,
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface FieldLabelProps {
  label: string;
  required?: boolean;
}

const FieldLabel: React.FC<FieldLabelProps> = ({ label, required }) => (
  <Text style={styles.fieldLabel}>
    {label}
    {required ? <Text style={styles.requiredAsterisk}> *</Text> : null}
  </Text>
);

interface SectionHeaderProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, icon }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionIconCircle}>
      <Ionicons name={icon} size={15} color={Colors.primary} />
    </View>
    <Text style={styles.sectionHeaderText}>{title}</Text>
  </View>
);

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

const AddCarScreen: React.FC<AddCarScreenProps> = ({ navigation, route }) => {
  const existingCar: Car | undefined = route?.params?.car;
  const isEditing = !!existingCar;

  const { user } = useAuthStore();
  const { addCar, updateCar } = useCarStore();

  // ── Form state ─────────────────────────────────────────────────────────────

  const [nickname, setNickname] = useState(existingCar?.nickname ?? '');
  const [make, setMake] = useState(existingCar?.make ?? '');
  const [model, setModel] = useState(existingCar?.model ?? '');
  const [year, setYear] = useState(existingCar?.year ? String(existingCar.year) : '');
  const [licensePlate, setLicensePlate] = useState(existingCar?.licensePlate ?? '');
  const [fuelType, setFuelType] = useState<FuelType>(existingCar?.fuelType ?? 'gasoline');
  const [tankCapacity, setTankCapacity] = useState(
    existingCar?.tankCapacity ? String(existingCar.tankCapacity) : ''
  );
  const [odometer, setOdometer] = useState(
    existingCar?.odometer !== undefined ? String(existingCar.odometer) : ''
  );
  const [selectedColor, setSelectedColor] = useState<string>(
    existingCar?.color ?? 'blue'
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  // ── Refs for focus chaining ────────────────────────────────────────────────

  const makeRef = useRef<TextInput>(null);
  const modelRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);
  const plateRef = useRef<TextInput>(null);
  const tankRef = useRef<TextInput>(null);
  const odometerRef = useRef<TextInput>(null);

  // ── Validation ─────────────────────────────────────────────────────────────

  function validate(): boolean {
    const newErrors: FormErrors = {};

    if (!nickname.trim()) {
      newErrors.nickname = 'Nickname is required';
    }
    if (!make.trim()) {
      newErrors.make = 'Make is required';
    }
    if (!model.trim()) {
      newErrors.model = 'Model is required';
    }
    const yearNum = parseInt(year, 10);
    if (!year.trim()) {
      newErrors.year = 'Year is required';
    } else if (isNaN(yearNum) || yearNum < 1900 || yearNum > new Date().getFullYear() + 2) {
      newErrors.year = 'Enter a valid year';
    }
    if (tankCapacity.trim()) {
      const cap = parseFloat(tankCapacity);
      if (isNaN(cap) || cap <= 0) {
        newErrors.tankCapacity = 'Enter a valid capacity in liters';
      }
    }
    if (odometer.trim()) {
      const odo = parseFloat(odometer);
      if (isNaN(odo) || odo < 0) {
        newErrors.odometer = 'Enter a valid odometer reading';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!validate()) return;
    if (!user) {
      Alert.alert('Error', 'You must be signed in to add a car.');
      return;
    }

    setIsSaving(true);
    try {
      const carPayload = {
        userId: user.id,
        nickname: nickname.trim(),
        make: make.trim(),
        model: model.trim(),
        year: parseInt(year, 10),
        licensePlate: licensePlate.trim() || undefined,
        fuelType,
        tankCapacity: tankCapacity.trim() ? parseFloat(tankCapacity) : undefined,
        odometer: odometer.trim() ? parseFloat(odometer) : 0,
        color: selectedColor,
        isDefault: existingCar?.isDefault ?? false,
      };

      if (isEditing && existingCar) {
        await updateCar(existingCar.id, carPayload);
      } else {
        await addCar(carPayload);
      }

      navigation.goBack();
    } catch (err: unknown) {
      console.warn('Save car error:', err);
      Alert.alert('Error', 'Failed to save car. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  // ── Color helpers ──────────────────────────────────────────────────────────

  function resolveColorHex(name: string): string {
    return COLOR_OPTIONS.find((c) => c.name === name)?.hex ?? Colors.primary;
  }

  const previewColor = resolveColorHex(selectedColor);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <View style={styles.navbar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.navBackButton}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.gray800} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>{isEditing ? 'Edit Car' : 'Add Car'}</Text>
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
          {/* ── Car Preview Banner ──────────────────────────────────────────── */}
          <View style={styles.previewBanner}>
            <View style={[styles.previewIconCircle, { backgroundColor: previewColor + '22' }]}>
              <Ionicons name="car" size={36} color={previewColor} />
            </View>
            <View style={styles.previewInfo}>
              <Text style={styles.previewNickname} numberOfLines={1}>
                {nickname.trim() || 'My Car'}
              </Text>
              <Text style={styles.previewYearMakeModel} numberOfLines={1}>
                {[year, make, model].filter(Boolean).join(' ') || 'Year Make Model'}
              </Text>
            </View>
          </View>

          {/* ================================================================
              SECTION 1 — Basic Information
          ================================================================= */}
          <SectionHeader title="Basic Information" icon="information-circle-outline" />

          {/* Nickname */}
          <View style={styles.fieldGroup}>
            <FieldLabel label="Nickname" required />
            <TextInput
              style={[styles.textInput, errors.nickname ? styles.textInputError : null]}
              placeholder='e.g. "My Honda"'
              placeholderTextColor={Colors.gray400}
              value={nickname}
              onChangeText={(v) => {
                setNickname(v);
                if (errors.nickname) setErrors((e) => ({ ...e, nickname: undefined }));
              }}
              returnKeyType="next"
              onSubmitEditing={() => makeRef.current?.focus()}
              autoCapitalize="words"
            />
            {errors.nickname ? (
              <Text style={styles.errorText}>{errors.nickname}</Text>
            ) : null}
          </View>

          {/* Make */}
          <View style={styles.fieldGroup}>
            <FieldLabel label="Make" required />
            <TextInput
              ref={makeRef}
              style={[styles.textInput, errors.make ? styles.textInputError : null]}
              placeholder='e.g. "Honda"'
              placeholderTextColor={Colors.gray400}
              value={make}
              onChangeText={(v) => {
                setMake(v);
                if (errors.make) setErrors((e) => ({ ...e, make: undefined }));
              }}
              returnKeyType="next"
              onSubmitEditing={() => modelRef.current?.focus()}
              autoCapitalize="words"
            />
            {errors.make ? <Text style={styles.errorText}>{errors.make}</Text> : null}
          </View>

          {/* Model */}
          <View style={styles.fieldGroup}>
            <FieldLabel label="Model" required />
            <TextInput
              ref={modelRef}
              style={[styles.textInput, errors.model ? styles.textInputError : null]}
              placeholder='e.g. "Civic"'
              placeholderTextColor={Colors.gray400}
              value={model}
              onChangeText={(v) => {
                setModel(v);
                if (errors.model) setErrors((e) => ({ ...e, model: undefined }));
              }}
              returnKeyType="next"
              onSubmitEditing={() => yearRef.current?.focus()}
              autoCapitalize="words"
            />
            {errors.model ? <Text style={styles.errorText}>{errors.model}</Text> : null}
          </View>

          {/* Year */}
          <View style={styles.fieldGroup}>
            <FieldLabel label="Year" required />
            <TextInput
              ref={yearRef}
              style={[styles.textInput, errors.year ? styles.textInputError : null]}
              placeholder='e.g. "2020"'
              placeholderTextColor={Colors.gray400}
              value={year}
              onChangeText={(v) => {
                setYear(v);
                if (errors.year) setErrors((e) => ({ ...e, year: undefined }));
              }}
              keyboardType="number-pad"
              returnKeyType="next"
              onSubmitEditing={() => plateRef.current?.focus()}
              maxLength={4}
            />
            {errors.year ? <Text style={styles.errorText}>{errors.year}</Text> : null}
          </View>

          {/* License Plate */}
          <View style={styles.fieldGroup}>
            <FieldLabel label="License Plate" />
            <TextInput
              ref={plateRef}
              style={styles.textInput}
              placeholder='e.g. "ABC-1234" (optional)'
              placeholderTextColor={Colors.gray400}
              value={licensePlate}
              onChangeText={setLicensePlate}
              returnKeyType="next"
              onSubmitEditing={() => tankRef.current?.focus()}
              autoCapitalize="characters"
            />
          </View>

          {/* ================================================================
              SECTION 2 — Fuel & Engine
          ================================================================= */}
          <SectionHeader title="Fuel & Engine" icon="flame-outline" />

          {/* Fuel Type picker */}
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
                        isActive
                          ? styles.segmentOptionTextActive
                          : styles.segmentOptionTextInactive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Tank Capacity */}
          <View style={styles.fieldGroup}>
            <FieldLabel label="Tank Capacity (liters)" />
            <View style={styles.inputWithUnit}>
              <TextInput
                ref={tankRef}
                style={[
                  styles.textInput,
                  styles.inputWithUnitField,
                  errors.tankCapacity ? styles.textInputError : null,
                ]}
                placeholder="e.g. 50"
                placeholderTextColor={Colors.gray400}
                value={tankCapacity}
                onChangeText={(v) => {
                  setTankCapacity(v);
                  if (errors.tankCapacity) setErrors((e) => ({ ...e, tankCapacity: undefined }));
                }}
                keyboardType="decimal-pad"
                returnKeyType="next"
                onSubmitEditing={() => odometerRef.current?.focus()}
              />
              <View style={styles.unitBadge}>
                <Text style={styles.unitBadgeText}>L</Text>
              </View>
            </View>
            {errors.tankCapacity ? (
              <Text style={styles.errorText}>{errors.tankCapacity}</Text>
            ) : null}
          </View>

          {/* ================================================================
              SECTION 3 — Odometer
          ================================================================= */}
          <SectionHeader title="Odometer" icon="speedometer-outline" />

          <View style={styles.fieldGroup}>
            <FieldLabel label="Current Odometer Reading" required />
            <View style={styles.inputWithUnit}>
              <TextInput
                ref={odometerRef}
                style={[
                  styles.textInput,
                  styles.inputWithUnitField,
                  errors.odometer ? styles.textInputError : null,
                ]}
                placeholder="e.g. 45000"
                placeholderTextColor={Colors.gray400}
                value={odometer}
                onChangeText={(v) => {
                  setOdometer(v);
                  if (errors.odometer) setErrors((e) => ({ ...e, odometer: undefined }));
                }}
                keyboardType="number-pad"
                returnKeyType="done"
              />
              <View style={styles.unitBadge}>
                <Text style={styles.unitBadgeText}>km</Text>
              </View>
            </View>
            {errors.odometer ? (
              <Text style={styles.errorText}>{errors.odometer}</Text>
            ) : null}
          </View>

          {/* ================================================================
              SECTION 4 — Appearance
          ================================================================= */}
          <SectionHeader title="Appearance" icon="color-palette-outline" />

          <View style={styles.fieldGroup}>
            <FieldLabel label="Car Color" />
            <View style={styles.colorSwatchRow}>
              {COLOR_OPTIONS.map((colorOpt) => {
                const isSelected = selectedColor === colorOpt.name;
                return (
                  <TouchableOpacity
                    key={colorOpt.name}
                    onPress={() => setSelectedColor(colorOpt.name)}
                    activeOpacity={0.8}
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: colorOpt.hex },
                      colorOpt.hex === '#F9FAFB' && styles.colorSwatchWhite,
                      isSelected && styles.colorSwatchSelected,
                    ]}
                  >
                    {isSelected ? (
                      <Ionicons
                        name="checkmark"
                        size={16}
                        color={
                          colorOpt.hex === '#F9FAFB' || colorOpt.hex === '#F59E0B'
                            ? Colors.gray800
                            : Colors.white
                        }
                      />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Bottom spacing ──────────────────────────────────────────────── */}
          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* ── Sticky submit button ────────────────────────────────────────── */}
        <View style={styles.submitContainer}>
          <TouchableOpacity
            style={[styles.submitButton, isSaving && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            activeOpacity={0.82}
            disabled={isSaving}
          >
            <Ionicons
              name={isEditing ? 'checkmark-circle-outline' : 'add-circle-outline'}
              size={20}
              color={Colors.white}
            />
            <Text style={styles.submitButtonText}>
              {isSaving ? 'Saving…' : isEditing ? 'Update Car' : 'Save Car'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    backgroundColor: Colors.gray50,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  navBackButton: {
    padding: 4,
  },
  navTitle: {
    fontSize: Theme.fontSize.lg,
    fontWeight: Theme.fontWeight.bold,
    color: Colors.gray900,
  },
  navPlaceholder: {
    width: 32,
  },

  // ── Keyboard avoiding / scroll ──
  keyboardAvoiding: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Theme.spacing.md,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.xl,
  },

  // ── Preview banner ──
  previewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
    gap: Theme.spacing.md,
    ...Theme.shadow.sm,
  },
  previewIconCircle: {
    width: 64,
    height: 64,
    borderRadius: Theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  previewInfo: {
    flex: 1,
  },
  previewNickname: {
    fontSize: Theme.fontSize.lg,
    fontWeight: Theme.fontWeight.bold,
    color: Colors.gray900,
    marginBottom: 2,
  },
  previewYearMakeModel: {
    fontSize: Theme.fontSize.sm,
    fontWeight: Theme.fontWeight.medium,
    color: Colors.gray500,
  },

  // ── Section header ──
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
    marginTop: Theme.spacing.lg,
    marginBottom: Theme.spacing.sm,
  },
  sectionIconCircle: {
    width: 26,
    height: 26,
    borderRadius: Theme.borderRadius.full,
    backgroundColor: Colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderText: {
    fontSize: Theme.fontSize.base,
    fontWeight: Theme.fontWeight.bold,
    color: Colors.gray700,
  },

  // ── Field group ──
  fieldGroup: {
    marginBottom: Theme.spacing.md,
  },
  fieldLabel: {
    fontSize: Theme.fontSize.sm,
    fontWeight: Theme.fontWeight.semibold,
    color: Colors.gray700,
    marginBottom: 6,
  },
  requiredAsterisk: {
    color: Colors.danger,
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
    fontWeight: Theme.fontWeight.regular,
    color: Colors.gray900,
  },
  textInputError: {
    borderColor: Colors.danger,
  },
  errorText: {
    fontSize: Theme.fontSize.xs,
    fontWeight: Theme.fontWeight.medium,
    color: Colors.danger,
    marginTop: 4,
    marginLeft: 2,
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
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 13 : 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 48,
  },
  unitBadgeText: {
    fontSize: Theme.fontSize.sm,
    fontWeight: Theme.fontWeight.bold,
    color: Colors.gray500,
  },

  // ── Segmented picker ──
  segmentedPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.xs,
  },
  segmentOption: {
    paddingHorizontal: 13,
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

  // ── Color swatches ──
  colorSwatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.sm,
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: Theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchWhite: {
    borderWidth: 1.5,
    borderColor: Colors.gray200,
  },
  colorSwatchSelected: {
    borderWidth: 3,
    borderColor: Colors.gray700,
  },

  // ── Bottom spacer ──
  bottomSpacer: {
    height: Theme.spacing.xl,
  },

  // ── Submit button ──
  submitContainer: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.md,
    backgroundColor: Colors.gray50,
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
});

export default AddCarScreen;
