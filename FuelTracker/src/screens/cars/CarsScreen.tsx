import React, { useEffect } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCarStore } from '../../store/carStore';
import { useAuthStore } from '../../store/authStore';
import { useFuelLogStore } from '../../store/fuelLogStore';
import { Colors } from '../../constants/colors';
import { Theme } from '../../constants/theme';
import EmptyState from '../../components/common/EmptyState';
import { formatFuelType, formatDate } from '../../utils/formatters';
import { Car } from '../../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CarsScreenProps {
  navigation: any;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
  // If stored as hex already
  if (color.startsWith('#')) return color;
  return Colors.primary;
}

const FUEL_TYPE_COLORS: Record<string, string> = {
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

interface CarCardProps {
  car: Car;
  lastFillUpDate: string | null;
  onPress: () => void;
  onSetDefault: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const CarCard: React.FC<CarCardProps> = ({
  car,
  lastFillUpDate,
  onPress,
  onSetDefault,
  onEdit,
  onDelete,
}) => {
  const iconBgColor = resolveCarColor(car.color);
  const fuelColor = FUEL_TYPE_COLORS[car.fuelType] ?? Colors.primary;

  const handleLongPress = () => {
    Alert.alert(
      car.nickname,
      'What would you like to do?',
      [
        { text: 'Edit', onPress: onEdit },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      onLongPress={handleLongPress}
      activeOpacity={0.72}
    >
      {/* Top row: icon | info | badges */}
      <View style={styles.cardTop}>
        {/* Left: colored icon circle */}
        <View style={[styles.carIconCircle, { backgroundColor: iconBgColor + '22' }]}>
          <Ionicons name="car" size={26} color={iconBgColor} />
        </View>

        {/* Center: nickname + year/make/model + plate */}
        <View style={styles.cardCenter}>
          <Text style={styles.cardNickname} numberOfLines={1}>
            {car.nickname}
          </Text>
          <Text style={styles.cardYearMakeModel} numberOfLines={1}>
            {car.year} {car.make} {car.model}
          </Text>
          {car.licensePlate ? (
            <View style={styles.platePill}>
              <Text style={styles.plateText}>{car.licensePlate}</Text>
            </View>
          ) : null}
        </View>

        {/* Right: badges + star */}
        <View style={styles.cardRight}>
          <View style={[styles.fuelBadge, { backgroundColor: fuelColor + '1A' }]}>
            <Text style={[styles.fuelBadgeText, { color: fuelColor }]}>
              {formatFuelType(car.fuelType)}
            </Text>
          </View>
          {car.isDefault ? (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultBadgeText}>Default</Text>
            </View>
          ) : null}
          <TouchableOpacity
            onPress={onSetDefault}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.starButton}
          >
            <Ionicons
              name={car.isDefault ? 'star' : 'star-outline'}
              size={20}
              color={car.isDefault ? Colors.accent : Colors.gray300}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.cardDivider} />

      {/* Bottom row: odometer | last fill-up */}
      <View style={styles.cardBottom}>
        <View style={styles.cardBottomItem}>
          <Ionicons name="speedometer-outline" size={14} color={Colors.gray400} />
          <Text style={styles.cardBottomText}>
            {car.odometer.toLocaleString()} km
          </Text>
        </View>
        <View style={styles.cardBottomItem}>
          <Ionicons name="calendar-outline" size={14} color={Colors.gray400} />
          <Text style={styles.cardBottomText}>
            {lastFillUpDate ? `Last fill: ${lastFillUpDate}` : 'No fill-ups yet'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

const CarsScreen: React.FC<CarsScreenProps> = ({ navigation }) => {
  const { user } = useAuthStore();
  const { cars, loadCars, deleteCar, setDefaultCar } = useCarStore();
  const { logs, loadLogs } = useFuelLogStore();

  // Load data on mount
  useEffect(() => {
    if (user?.id) {
      loadCars(user.id);
      loadLogs(user.id);
    }
  }, [user?.id]);

  // Filter cars that belong to this user
  const userCars = cars.filter((c) => c.userId === user?.id);

  // Helpers
  const getLastFillUpDate = (carId: string): string | null => {
    const carLogs = logs
      .filter((l) => l.carId === carId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (carLogs.length === 0) return null;
    return formatDate(carLogs[0].date);
  };

  const handleAddCar = () => {
    navigation.navigate('AddCar');
  };

  const handleCarPress = (car: Car) => {
    navigation.navigate('CarDetail', { carId: car.id });
  };

  const handleEditCar = (car: Car) => {
    navigation.navigate('AddCar', { car });
  };

  const handleDeleteCar = (car: Car) => {
    Alert.alert(
      'Delete Car',
      `Are you sure you want to delete "${car.nickname}"? All fuel logs for this car will remain but will no longer be linked.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteCar(car.id).catch((err: unknown) => {
              console.warn('Delete car error:', err);
            });
          },
        },
      ],
    );
  };

  const handleSetDefault = (car: Car) => {
    if (car.isDefault) return;
    setDefaultCar(car.id).catch((err: unknown) => {
      console.warn('Set default car error:', err);
    });
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Cars</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddCar}
          activeOpacity={0.75}
        >
          <Ionicons name="add" size={22} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {/* List / Empty state */}
      {userCars.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyState
            icon="car-outline"
            title="No cars yet"
            subtitle="Add your first car to start tracking fuel"
            actionLabel="Add Car"
            onAction={handleAddCar}
          />
        </View>
      ) : (
        <FlatList
          data={userCars}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <CarCard
              car={item}
              lastFillUpDate={getLastFillUpDate(item.id)}
              onPress={() => handleCarPress(item)}
              onSetDefault={() => handleSetDefault(item)}
              onEdit={() => handleEditCar(item)}
              onDelete={() => handleDeleteCar(item)}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
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
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.sm,
    backgroundColor: Colors.gray50,
  },
  headerTitle: {
    fontSize: Theme.fontSize.xxl,
    fontWeight: Theme.fontWeight.bold,
    color: Colors.gray900,
  },
  addButton: {
    width: 38,
    height: 38,
    borderRadius: Theme.borderRadius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadow.sm,
  },

  // ── Empty ──
  emptyContainer: {
    flex: 1,
  },

  // ── List ──
  listContent: {
    paddingHorizontal: Theme.spacing.md,
    paddingTop: Theme.spacing.sm,
    paddingBottom: Theme.spacing.xl + Theme.spacing.md,
  },
  separator: {
    height: Theme.spacing.sm,
  },

  // ── Card ──
  card: {
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.lg,
    paddingHorizontal: Theme.spacing.md,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.sm,
    ...Theme.shadow.md,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Theme.spacing.sm,
  },
  carIconCircle: {
    width: 50,
    height: 50,
    borderRadius: Theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  cardCenter: {
    flex: 1,
    gap: 3,
  },
  cardNickname: {
    fontSize: Theme.fontSize.md,
    fontWeight: Theme.fontWeight.bold,
    color: Colors.gray900,
  },
  cardYearMakeModel: {
    fontSize: Theme.fontSize.sm,
    fontWeight: Theme.fontWeight.medium,
    color: Colors.gray600,
  },
  platePill: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.gray100,
    borderRadius: Theme.borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 2,
  },
  plateText: {
    fontSize: Theme.fontSize.xs,
    fontWeight: Theme.fontWeight.semibold,
    color: Colors.gray500,
    letterSpacing: 0.5,
  },
  cardRight: {
    alignItems: 'flex-end',
    gap: 5,
    flexShrink: 0,
  },
  fuelBadge: {
    borderRadius: Theme.borderRadius.full,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  fuelBadgeText: {
    fontSize: Theme.fontSize.xs,
    fontWeight: Theme.fontWeight.semibold,
  },
  defaultBadge: {
    backgroundColor: Colors.accentFaded,
    borderRadius: Theme.borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  defaultBadgeText: {
    fontSize: Theme.fontSize.xs,
    fontWeight: Theme.fontWeight.semibold,
    color: Colors.accent,
  },
  starButton: {
    marginTop: 2,
  },

  // ── Card divider ──
  cardDivider: {
    height: 1,
    backgroundColor: Colors.gray100,
    marginTop: Theme.spacing.sm,
    marginBottom: Theme.spacing.xs,
  },

  // ── Card bottom ──
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  cardBottomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardBottomText: {
    fontSize: Theme.fontSize.xs,
    fontWeight: Theme.fontWeight.medium,
    color: Colors.gray500,
  },
});

export default CarsScreen;
