import React, { useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { Colors } from '../../constants/colors';
import { Theme } from '../../constants/theme';
import { Settings } from '../../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SettingsScreenProps {
  navigation?: unknown;
}

type IoniconName = keyof typeof Ionicons.glyphMap;

interface CurrencyOption {
  code: string;
  symbol: string;
  label: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'GBP', symbol: '£', label: 'British Pound' },
  { code: 'PHP', symbol: '₱', label: 'Philippine Peso' },
  { code: 'AUD', symbol: 'A$', label: 'Australian Dollar' },
];

const APP_VERSION = '1.0.0';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface SectionHeaderProps {
  title: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionHeaderText}>{title}</Text>
  </View>
);

interface IconBadgeProps {
  iconName: IoniconName;
  color: string;
  size?: number;
}

const IconBadge: React.FC<IconBadgeProps> = ({ iconName, color, size = 18 }) => (
  <View style={[styles.iconBadge, { backgroundColor: color + '22' }]}>
    <Ionicons name={iconName} size={size} color={color} />
  </View>
);

interface SettingsRowProps {
  iconName: IoniconName;
  iconColor: string;
  label: string;
  rightElement?: React.ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  destructive?: boolean;
  isLast?: boolean;
}

const SettingsRow: React.FC<SettingsRowProps> = ({
  iconName,
  iconColor,
  label,
  rightElement,
  onPress,
  showChevron = false,
  destructive = false,
  isLast = false,
}) => {
  const content = (
    <View style={[styles.row, isLast && styles.rowLast]}>
      <IconBadge iconName={iconName} color={iconColor} />
      <Text style={[styles.rowLabel, destructive && styles.rowLabelDestructive]}>
        {label}
      </Text>
      <View style={styles.rowRight}>
        {rightElement ?? null}
        {showChevron && (
          <Ionicons
            name="chevron-forward"
            size={16}
            color={Colors.gray400}
            style={styles.chevron}
          />
        )}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.65}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

interface SegmentControlProps {
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
}

const SegmentControl: React.FC<SegmentControlProps> = ({ options, selected, onSelect }) => (
  <View style={styles.segment}>
    {options.map((opt, idx) => (
      <TouchableOpacity
        key={opt}
        onPress={() => onSelect(opt)}
        activeOpacity={0.75}
        style={[
          styles.segmentOption,
          idx === 0 && styles.segmentOptionFirst,
          idx === options.length - 1 && styles.segmentOptionLast,
          selected === opt && styles.segmentOptionSelected,
        ]}
      >
        <Text
          style={[
            styles.segmentOptionText,
            selected === opt && styles.segmentOptionTextSelected,
          ]}
        >
          {opt}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

// ---------------------------------------------------------------------------
// Profile Card
// ---------------------------------------------------------------------------

interface ProfileCardProps {
  name: string;
  email?: string;
  provider?: string;
}

const PROVIDER_LABELS: Record<string, string> = {
  apple: 'Apple',
  google: 'Google',
  facebook: 'Facebook',
  guest: 'Guest',
};

const PROVIDER_COLORS: Record<string, string> = {
  apple: Colors.apple,
  google: Colors.google,
  facebook: Colors.facebook,
  guest: Colors.gray500,
};

const ProfileCard: React.FC<ProfileCardProps> = ({ name, email, provider }) => {
  const initial = name.trim().charAt(0).toUpperCase();
  const providerLabel = provider ? PROVIDER_LABELS[provider] ?? provider : undefined;
  const providerColor = provider ? (PROVIDER_COLORS[provider] ?? Colors.gray500) : Colors.gray500;

  return (
    <View style={styles.profileCard}>
      {/* Avatar */}
      <View style={styles.avatar}>
        {provider === 'guest' ? (
          <Ionicons name="person" size={28} color={Colors.white} />
        ) : (
          <Text style={styles.avatarInitial}>{initial}</Text>
        )}
      </View>

      {/* Info */}
      <View style={styles.profileInfo}>
        <Text style={styles.profileName} numberOfLines={1}>
          {name}
        </Text>
        {email ? (
          <Text style={styles.profileEmail} numberOfLines={1}>
            {email}
          </Text>
        ) : null}
        {providerLabel ? (
          <View style={[styles.providerBadge, { backgroundColor: providerColor + '18' }]}>
            <Text style={[styles.providerBadgeText, { color: providerColor }]}>
              {providerLabel}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Currency Modal
// ---------------------------------------------------------------------------

interface CurrencyModalProps {
  visible: boolean;
  selected: string;
  onSelect: (option: CurrencyOption) => void;
  onClose: () => void;
}

const CurrencyModal: React.FC<CurrencyModalProps> = ({
  visible,
  selected,
  onSelect,
  onClose,
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose}>
      <View style={styles.modalSheet}>
        <View style={styles.modalHandle} />
        <Text style={styles.modalTitle}>Select Currency</Text>

        {CURRENCY_OPTIONS.map((opt, idx) => {
          const isSelected = opt.code === selected;
          const isLast = idx === CURRENCY_OPTIONS.length - 1;
          return (
            <TouchableOpacity
              key={opt.code}
              style={[styles.modalRow, isLast && styles.rowLast]}
              onPress={() => {
                onSelect(opt);
                onClose();
              }}
              activeOpacity={0.65}
            >
              <View style={styles.currencySymbolBadge}>
                <Text style={styles.currencySymbol}>{opt.symbol}</Text>
              </View>
              <View style={styles.currencyInfo}>
                <Text style={styles.currencyCode}>{opt.code}</Text>
                <Text style={styles.currencyLabel}>{opt.label}</Text>
              </View>
              {isSelected && (
                <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </TouchableOpacity>
  </Modal>
);

// ---------------------------------------------------------------------------
// Theme Modal
// ---------------------------------------------------------------------------

type ThemeOption = Settings['theme'];

interface ThemeModalProps {
  visible: boolean;
  selected: ThemeOption;
  onSelect: (theme: ThemeOption) => void;
  onClose: () => void;
}

const THEME_OPTIONS: { value: ThemeOption; label: string; icon: IoniconName }[] = [
  { value: 'light', label: 'Light', icon: 'sunny-outline' },
  { value: 'dark', label: 'Dark', icon: 'moon-outline' },
  { value: 'system', label: 'System Default', icon: 'phone-portrait-outline' },
];

const ThemeModal: React.FC<ThemeModalProps> = ({
  visible,
  selected,
  onSelect,
  onClose,
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose}>
      <View style={styles.modalSheet}>
        <View style={styles.modalHandle} />
        <Text style={styles.modalTitle}>Select Theme</Text>

        {THEME_OPTIONS.map((opt, idx) => {
          const isSelected = opt.value === selected;
          const isLast = idx === THEME_OPTIONS.length - 1;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[styles.modalRow, isLast && styles.rowLast]}
              onPress={() => {
                onSelect(opt.value);
                onClose();
              }}
              activeOpacity={0.65}
            >
              <View style={[styles.iconBadge, { backgroundColor: Colors.gray100 }]}>
                <Ionicons name={opt.icon} size={18} color={Colors.gray600} />
              </View>
              <Text style={styles.themeLabel}>{opt.label}</Text>
              {isSelected && (
                <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </TouchableOpacity>
  </Modal>
);

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

const SettingsScreen: React.FC<SettingsScreenProps> = () => {
  const { user, settings, updateSettings, signOut } = useAuthStore();

  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleDistanceUnit = (value: string) => {
    if (value === 'km' || value === 'mi') {
      updateSettings({ distanceUnit: value });
    }
  };

  const handleVolumeUnit = (value: string) => {
    if (value === 'liters' || value === 'gallons') {
      updateSettings({ volumeUnit: value });
    }
  };

  const handleCurrencySelect = (opt: CurrencyOption) => {
    updateSettings({ currency: opt.code, currencySymbol: opt.symbol });
  };

  const handleThemeSelect = (theme: ThemeOption) => {
    updateSettings({ theme });
  };

  const handleNotificationsToggle = (value: boolean) => {
    updateSettings({ notifications: value });
  };

  const handleRateApp = () => {
    // In production, link to the App Store / Play Store listing
    const url =
      Platform.OS === 'ios'
        ? 'https://apps.apple.com/app/id000000000'
        : 'https://play.google.com/store/apps/details?id=com.fueltracker';
    Linking.openURL(url).catch(() => {
      Alert.alert('Unable to Open', 'Could not open the store listing.');
    });
  };

  const handleShareApp = () => {
    Alert.alert('Share FuelTracker', 'Sharing is available in production builds.');
  };

  const handlePrivacyPolicy = () => {
    Linking.openURL('https://example.com/privacy').catch(() => {});
  };

  const handleTermsOfService = () => {
    Linking.openURL('https://example.com/terms').catch(() => {});
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out? Your local data will be preserved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => {
            signOut().catch((err: unknown) => {
              console.warn('Sign out error:', err);
            });
          },
        },
      ],
    );
  };

  // ── Derived display values ─────────────────────────────────────────────────

  const selectedCurrency = CURRENCY_OPTIONS.find((c) => c.code === settings.currency);
  const currencyDisplay = selectedCurrency
    ? `${selectedCurrency.symbol} ${selectedCurrency.code}`
    : settings.currency;

  const themeDisplay =
    THEME_OPTIONS.find((t) => t.value === settings.theme)?.label ?? 'System Default';

  // ── Guard: if somehow no user, show nothing meaningful ────────────────────

  if (!user) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.emptyCenter}>
          <Text style={styles.emptyText}>Not signed in.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Screen title ── */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Settings</Text>
        </View>

        {/* ── Profile Card ── */}
        <View style={styles.section}>
          <ProfileCard
            name={user.name}
            email={user.email}
            provider={user.provider}
          />
        </View>

        {/* ── App Settings ── */}
        <SectionHeader title="App Settings" />
        <View style={styles.section}>
          {/* Distance Unit */}
          <SettingsRow
            iconName="navigate-outline"
            iconColor={Colors.primary}
            label="Distance Unit"
            rightElement={
              <SegmentControl
                options={['km', 'mi']}
                selected={settings.distanceUnit}
                onSelect={handleDistanceUnit}
              />
            }
          />
          <View style={styles.rowDivider} />

          {/* Volume Unit */}
          <SettingsRow
            iconName="water-outline"
            iconColor={Colors.secondary}
            label="Volume Unit"
            rightElement={
              <SegmentControl
                options={['liters', 'gallons']}
                selected={settings.volumeUnit}
                onSelect={handleVolumeUnit}
              />
            }
          />
          <View style={styles.rowDivider} />

          {/* Currency */}
          <SettingsRow
            iconName="cash-outline"
            iconColor={Colors.accent}
            label="Currency"
            rightElement={
              <Text style={styles.rowValue}>{currencyDisplay}</Text>
            }
            showChevron
            onPress={() => setCurrencyModalVisible(true)}
          />
          <View style={styles.rowDivider} />

          {/* Theme */}
          <SettingsRow
            iconName="color-palette-outline"
            iconColor="#8B5CF6"
            label="Theme"
            rightElement={
              <Text style={styles.rowValue}>{themeDisplay}</Text>
            }
            showChevron
            onPress={() => setThemeModalVisible(true)}
            isLast
          />
        </View>

        {/* ── Reminders ── */}
        <SectionHeader title="Reminders" />
        <View style={styles.section}>
          <SettingsRow
            iconName="notifications-outline"
            iconColor={Colors.warning}
            label="Enable Notifications"
            rightElement={
              <Switch
                value={settings.notifications}
                onValueChange={handleNotificationsToggle}
                trackColor={{ false: Colors.gray200, true: Colors.primaryLight }}
                thumbColor={settings.notifications ? Colors.primary : Colors.gray400}
                ios_backgroundColor={Colors.gray200}
              />
            }
            isLast
          />
        </View>

        {/* ── About ── */}
        <SectionHeader title="About" />
        <View style={styles.section}>
          {/* App Version — non-interactive */}
          <SettingsRow
            iconName="information-circle-outline"
            iconColor={Colors.gray500}
            label="App Version"
            rightElement={
              <Text style={styles.rowValue}>{APP_VERSION}</Text>
            }
          />
          <View style={styles.rowDivider} />

          <SettingsRow
            iconName="star-outline"
            iconColor={Colors.accent}
            label="Rate App"
            showChevron
            onPress={handleRateApp}
          />
          <View style={styles.rowDivider} />

          <SettingsRow
            iconName="share-social-outline"
            iconColor={Colors.secondary}
            label="Share App"
            showChevron
            onPress={handleShareApp}
          />
          <View style={styles.rowDivider} />

          <SettingsRow
            iconName="shield-checkmark-outline"
            iconColor={Colors.primary}
            label="Privacy Policy"
            showChevron
            onPress={handlePrivacyPolicy}
          />
          <View style={styles.rowDivider} />

          <SettingsRow
            iconName="document-text-outline"
            iconColor={Colors.gray500}
            label="Terms of Service"
            showChevron
            onPress={handleTermsOfService}
            isLast
          />
        </View>

        {/* ── Sign Out ── */}
        <View style={styles.signOutWrapper}>
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
            activeOpacity={0.75}
          >
            <Ionicons
              name="log-out-outline"
              size={20}
              color={Colors.danger}
              style={styles.signOutIcon}
            />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* ── Modals ── */}
      <CurrencyModal
        visible={currencyModalVisible}
        selected={settings.currency}
        onSelect={handleCurrencySelect}
        onClose={() => setCurrencyModalVisible(false)}
      />

      <ThemeModal
        visible={themeModalVisible}
        selected={settings.theme}
        onSelect={handleThemeSelect}
        onClose={() => setThemeModalVisible(false)}
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Theme.spacing.xl,
  },

  // ── Page header ──
  pageHeader: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.sm,
  },
  pageTitle: {
    fontSize: Theme.fontSize.xxl,
    fontWeight: Theme.fontWeight.bold,
    color: Colors.gray900,
  },

  // ── Section ──
  section: {
    backgroundColor: Colors.white,
    marginHorizontal: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
    marginBottom: Theme.spacing.sm,
    overflow: 'hidden',
    ...Theme.shadow.sm,
  },
  sectionHeader: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.xs,
  },
  sectionHeaderText: {
    fontSize: Theme.fontSize.sm,
    fontWeight: Theme.fontWeight.semibold,
    color: Colors.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  // ── Rows ──
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowDivider: {
    height: 0,
  },
  rowLabel: {
    flex: 1,
    fontSize: Theme.fontSize.base,
    fontWeight: Theme.fontWeight.medium,
    color: Colors.gray800,
    marginLeft: Theme.spacing.sm,
  },
  rowLabelDestructive: {
    color: Colors.danger,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowValue: {
    fontSize: Theme.fontSize.sm,
    color: Colors.gray500,
    fontWeight: Theme.fontWeight.medium,
    marginRight: Theme.spacing.xs,
  },
  chevron: {
    marginLeft: 2,
  },

  // ── Icon badge ──
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: Theme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Segment control ──
  segment: {
    flexDirection: 'row',
    borderRadius: Theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.gray200,
    overflow: 'hidden',
  },
  segmentOption: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: Colors.white,
    borderRightWidth: 1,
    borderRightColor: Colors.gray200,
  },
  segmentOptionFirst: {
    // no extra style needed — border handled by middle
  },
  segmentOptionLast: {
    borderRightWidth: 0,
  },
  segmentOptionSelected: {
    backgroundColor: Colors.primary,
  },
  segmentOptionText: {
    fontSize: Theme.fontSize.xs,
    fontWeight: Theme.fontWeight.medium,
    color: Colors.gray600,
  },
  segmentOptionTextSelected: {
    color: Colors.white,
    fontWeight: Theme.fontWeight.semibold,
  },

  // ── Profile card ──
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Theme.spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Theme.spacing.md,
    flexShrink: 0,
  },
  avatarInitial: {
    fontSize: Theme.fontSize.xl,
    fontWeight: Theme.fontWeight.bold,
    color: Colors.white,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: Theme.fontSize.md,
    fontWeight: Theme.fontWeight.semibold,
    color: Colors.gray900,
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: Theme.fontSize.sm,
    color: Colors.gray500,
    marginBottom: 6,
  },
  providerBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Theme.borderRadius.full,
  },
  providerBadgeText: {
    fontSize: Theme.fontSize.xs,
    fontWeight: Theme.fontWeight.semibold,
  },

  // ── Sign out ──
  signOutWrapper: {
    marginHorizontal: Theme.spacing.md,
    marginTop: Theme.spacing.sm,
  },
  signOutButton: {
    backgroundColor: Colors.dangerFaded,
    borderRadius: Theme.borderRadius.lg,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.dangerLight,
  },
  signOutIcon: {
    marginRight: Theme.spacing.xs,
  },
  signOutText: {
    fontSize: Theme.fontSize.base,
    fontWeight: Theme.fontWeight.semibold,
    color: Colors.danger,
  },

  // ── Modal ──
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Theme.borderRadius.xl,
    borderTopRightRadius: Theme.borderRadius.xl,
    paddingTop: Theme.spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? Theme.spacing.xl + 16 : Theme.spacing.xl,
    paddingHorizontal: Theme.spacing.md,
    ...Theme.shadow.lg,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.gray200,
    alignSelf: 'center',
    marginBottom: Theme.spacing.md,
  },
  modalTitle: {
    fontSize: Theme.fontSize.lg,
    fontWeight: Theme.fontWeight.bold,
    color: Colors.gray900,
    marginBottom: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.xs,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },

  // ── Currency modal specific ──
  currencySymbolBadge: {
    width: 40,
    height: 40,
    borderRadius: Theme.borderRadius.sm,
    backgroundColor: Colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Theme.spacing.sm,
  },
  currencySymbol: {
    fontSize: Theme.fontSize.md,
    fontWeight: Theme.fontWeight.bold,
    color: Colors.primary,
  },
  currencyInfo: {
    flex: 1,
  },
  currencyCode: {
    fontSize: Theme.fontSize.base,
    fontWeight: Theme.fontWeight.semibold,
    color: Colors.gray800,
  },
  currencyLabel: {
    fontSize: Theme.fontSize.sm,
    color: Colors.gray500,
  },

  // ── Theme modal specific ──
  themeLabel: {
    flex: 1,
    fontSize: Theme.fontSize.base,
    fontWeight: Theme.fontWeight.medium,
    color: Colors.gray800,
    marginLeft: Theme.spacing.sm,
  },

  // ── Empty state ──
  emptyCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: Theme.fontSize.base,
    color: Colors.gray500,
  },

  // ── Bottom padding ──
  bottomPadding: {
    height: Theme.spacing.lg,
  },
});

export default SettingsScreen;
