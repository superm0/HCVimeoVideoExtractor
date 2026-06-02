import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { Theme } from '../../constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  icon?: React.ReactNode;
  size?: ButtonSize;
}

const variantStyles: Record<
  ButtonVariant,
  { container: ViewStyle; text: { color: string } }
> = {
  primary: {
    container: {
      backgroundColor: Colors.primary,
      borderWidth: 0,
    },
    text: { color: Colors.white },
  },
  secondary: {
    container: {
      backgroundColor: Colors.gray100,
      borderWidth: 0,
    },
    text: { color: Colors.gray700 },
  },
  outline: {
    container: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: Colors.primary,
    },
    text: { color: Colors.primary },
  },
  danger: {
    container: {
      backgroundColor: Colors.danger,
      borderWidth: 0,
    },
    text: { color: Colors.white },
  },
};

const sizeStyles: Record<
  ButtonSize,
  { paddingVertical: number; paddingHorizontal: number; fontSize: number; iconGap: number }
> = {
  sm: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    fontSize: Theme.fontSize.sm,
    iconGap: 4,
  },
  md: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    fontSize: Theme.fontSize.base,
    iconGap: 6,
  },
  lg: {
    paddingVertical: 16,
    paddingHorizontal: 28,
    fontSize: Theme.fontSize.md,
    iconGap: 8,
  },
};

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  icon,
  size = 'md',
}) => {
  const isDisabled = disabled || loading;
  const currentVariant = variantStyles[variant];
  const currentSize = sizeStyles[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
      style={[
        styles.base,
        currentVariant.container,
        {
          paddingVertical: currentSize.paddingVertical,
          paddingHorizontal: currentSize.paddingHorizontal,
        },
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={currentVariant.text.color}
        />
      ) : (
        <View style={[styles.inner, { gap: currentSize.iconGap }]}>
          {icon && <View style={styles.iconWrapper}>{icon}</View>}
          <Text
            style={[
              styles.text,
              { color: currentVariant.text.color, fontSize: currentSize.fontSize },
            ]}
          >
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: Theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: Theme.fontWeight.semibold,
  },
});

export default Button;
