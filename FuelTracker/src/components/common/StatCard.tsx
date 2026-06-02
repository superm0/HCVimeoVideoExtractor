import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../constants/colors';
import { Theme } from '../../constants/theme';
import Card from './Card';

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  trend?: number;
  color?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  unit,
  icon,
  trend,
  color = Colors.primary,
}) => {
  const hasTrend = trend !== undefined && trend !== null;
  const trendIsPositive = hasTrend && trend! > 0;
  const trendIsNegative = hasTrend && trend! < 0;
  const trendColor = trendIsPositive
    ? Colors.secondary
    : trendIsNegative
    ? Colors.danger
    : Colors.gray400;
  const trendIcon: keyof typeof Ionicons.glyphMap = trendIsPositive
    ? 'trending-up'
    : trendIsNegative
    ? 'trending-down'
    : 'remove';
  const trendText = hasTrend
    ? `${trendIsPositive ? '+' : ''}${trend!.toFixed(1)}%`
    : '';

  // Build a faded background from the provided color by using low opacity overlay trick
  // We create a wrapper with a light tint using opacity on the icon circle.
  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        {icon ? (
          <View style={[styles.iconCircle, { backgroundColor: color + '1A' }]}>
            <Ionicons name={icon} size={24} color={color} />
          </View>
        ) : null}

        <View style={styles.info}>
          <Text style={styles.label} numberOfLines={1}>
            {label}
          </Text>
          <View style={styles.valueRow}>
            <Text style={[styles.value, { color }]}>{value}</Text>
            {unit ? <Text style={styles.unit}>{unit}</Text> : null}
          </View>

          {hasTrend ? (
            <View style={styles.trendRow}>
              <Ionicons name={trendIcon} size={14} color={trendColor} />
              <Text style={[styles.trendText, { color: trendColor }]}>
                {trendText}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: Theme.spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: Theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  info: {
    flex: 1,
  },
  label: {
    fontSize: Theme.fontSize.sm,
    fontWeight: Theme.fontWeight.medium,
    color: Colors.gray500,
    marginBottom: 2,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  value: {
    fontSize: Theme.fontSize.xxl,
    fontWeight: Theme.fontWeight.bold,
  },
  unit: {
    fontSize: Theme.fontSize.sm,
    fontWeight: Theme.fontWeight.medium,
    color: Colors.gray400,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  trendText: {
    fontSize: Theme.fontSize.xs,
    fontWeight: Theme.fontWeight.semibold,
  },
});

export default StatCard;
