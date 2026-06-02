import React, { useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { Colors } from '../../constants/colors';
import { Theme } from '../../constants/theme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type LoadingKey = 'apple' | 'google' | 'facebook' | 'guest' | null;

interface WelcomeScreenProps {
  // Navigation prop is accepted but unused; auth state change in the store
  // triggers the AppNavigator to switch stacks automatically.
  navigation?: unknown;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const HERO_HEIGHT = SCREEN_HEIGHT * 0.4;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface SocialButtonProps {
  label: string;
  iconName: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  backgroundColor: string;
  textColor: string;
  borderColor?: string;
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
}

const SocialButton: React.FC<SocialButtonProps> = ({
  label,
  iconName,
  iconColor,
  backgroundColor,
  textColor,
  borderColor,
  loading,
  disabled,
  onPress,
}) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.8}
    style={[
      styles.socialButton,
      {
        backgroundColor,
        borderWidth: borderColor ? 1.5 : 0,
        borderColor: borderColor ?? 'transparent',
        opacity: disabled && !loading ? 0.5 : 1,
      },
    ]}
  >
    {loading ? (
      <ActivityIndicator size="small" color={textColor} />
    ) : (
      <>
        <View style={styles.socialIconWrap}>
          <Ionicons name={iconName} size={20} color={iconColor} />
        </View>
        <Text style={[styles.socialButtonText, { color: textColor }]}>{label}</Text>
        {/* Spacer mirrors icon width so label stays centered */}
        <View style={styles.socialIconWrap} />
      </>
    )}
  </TouchableOpacity>
);

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

const WelcomeScreen: React.FC<WelcomeScreenProps> = () => {
  const [loading, setLoading] = useState<LoadingKey>(null);

  const { signInWithApple, signInWithGoogle, signInWithFacebook, signInAsGuest } =
    useAuthStore();

  const isAnyLoading = loading !== null;

  const handlePress = async (key: LoadingKey, action: () => Promise<void>) => {
    if (isAnyLoading) return;
    setLoading(key);
    try {
      await action();
    } catch (error) {
      // In production surface an Alert here.
      console.warn('Auth error:', error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero gradient ── */}
        <LinearGradient
          colors={[Colors.primaryDark, Colors.primary, Colors.primaryLight]}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={styles.hero}
        >
          {/* Decorative circles for depth */}
          <View style={styles.circleTopRight} />
          <View style={styles.circleBottomLeft} />

          <View style={styles.heroContent}>
            {/* Icon badge */}
            <View style={styles.iconBadge}>
              <Ionicons name="car-sport" size={64} color={Colors.white} />
            </View>

            <Text style={styles.appName}>FuelTracker</Text>
            <Text style={styles.tagline}>Track every drop, save every dollar</Text>
          </View>
        </LinearGradient>

        {/* ── Bottom white card ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Get Started</Text>
          <Text style={styles.cardSubtitle}>
            Sign in to sync across devices or continue as guest
          </Text>

          {/* Social auth buttons */}
          <View style={styles.buttonGroup}>
            {/* Apple */}
            <SocialButton
              label="Continue with Apple"
              iconName="logo-apple"
              iconColor={Colors.white}
              backgroundColor={Colors.apple}
              textColor={Colors.white}
              loading={loading === 'apple'}
              disabled={isAnyLoading}
              onPress={() => handlePress('apple', signInWithApple)}
            />

            {/* Google */}
            <SocialButton
              label="Continue with Google"
              iconName="logo-google"
              iconColor={Colors.google}
              backgroundColor={Colors.white}
              textColor={Colors.gray800}
              borderColor={Colors.gray200}
              loading={loading === 'google'}
              disabled={isAnyLoading}
              onPress={() => handlePress('google', signInWithGoogle)}
            />

            {/* Facebook */}
            <SocialButton
              label="Continue with Facebook"
              iconName="logo-facebook"
              iconColor={Colors.white}
              backgroundColor={Colors.facebook}
              textColor={Colors.white}
              loading={loading === 'facebook'}
              disabled={isAnyLoading}
              onPress={() => handlePress('facebook', signInWithFacebook)}
            />
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Guest button */}
          <TouchableOpacity
            onPress={() => handlePress('guest', signInAsGuest)}
            disabled={isAnyLoading}
            activeOpacity={0.75}
            style={[
              styles.guestButton,
              isAnyLoading && loading !== 'guest' && styles.guestButtonDisabled,
            ]}
          >
            {loading === 'guest' ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Text style={styles.guestButtonText}>Continue as Guest</Text>
            )}
          </TouchableOpacity>

          {/* Footer */}
          <Text style={styles.footer}>
            By continuing, you agree to our{' '}
            <Text style={styles.footerLink}>Terms</Text>
            {' & '}
            <Text style={styles.footerLink}>Privacy Policy</Text>
          </Text>
        </View>
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
    backgroundColor: Colors.white,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },

  // ── Hero ──
  hero: {
    height: HERO_HEIGHT,
    minHeight: 280,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleTopRight: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  circleBottomLeft: {
    position: 'absolute',
    bottom: -80,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  heroContent: {
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.xl,
  },
  iconBadge: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.md,
    // Subtle inner border
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  appName: {
    fontSize: 32,
    fontWeight: Theme.fontWeight.bold,
    color: Colors.white,
    letterSpacing: 0.5,
    marginBottom: Theme.spacing.xs,
  },
  tagline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.82)',
    textAlign: 'center',
    letterSpacing: 0.2,
  },

  // ── Card ──
  card: {
    flex: 1,
    backgroundColor: Colors.white,
    borderTopLeftRadius: Theme.borderRadius.xl,
    borderTopRightRadius: Theme.borderRadius.xl,
    marginTop: -Theme.borderRadius.xl,
    paddingTop: Theme.spacing.xl,
    paddingHorizontal: Theme.spacing.lg,
    paddingBottom: Platform.OS === 'android' ? Theme.spacing.xl : Theme.spacing.lg,
    // Top shadow for depth over hero
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: Theme.fontWeight.bold,
    color: Colors.gray900,
    marginBottom: Theme.spacing.xs,
  },
  cardSubtitle: {
    fontSize: Theme.fontSize.base,
    color: Colors.gray500,
    marginBottom: Theme.spacing.lg,
    lineHeight: 22,
  },

  // ── Buttons ──
  buttonGroup: {
    gap: Theme.spacing.sm,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Theme.borderRadius.md,
    paddingVertical: 14,
    paddingHorizontal: Theme.spacing.md,
    minHeight: 52,
    ...Theme.shadow.sm,
  },
  socialIconWrap: {
    width: 28,
    alignItems: 'center',
  },
  socialButtonText: {
    flex: 1,
    textAlign: 'center',
    fontSize: Theme.fontSize.base,
    fontWeight: Theme.fontWeight.semibold,
    letterSpacing: 0.1,
  },

  // ── Divider ──
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Theme.spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.gray200,
  },
  dividerText: {
    marginHorizontal: Theme.spacing.sm,
    fontSize: Theme.fontSize.sm,
    color: Colors.gray400,
    fontWeight: Theme.fontWeight.medium,
  },

  // ── Guest ──
  guestButton: {
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    backgroundColor: 'transparent',
  },
  guestButtonDisabled: {
    opacity: 0.5,
  },
  guestButtonText: {
    fontSize: Theme.fontSize.base,
    fontWeight: Theme.fontWeight.semibold,
    color: Colors.primary,
  },

  // ── Footer ──
  footer: {
    marginTop: Theme.spacing.md,
    fontSize: Theme.fontSize.xs,
    color: Colors.gray400,
    textAlign: 'center',
    lineHeight: 16,
  },
  footerLink: {
    color: Colors.primary,
    fontWeight: Theme.fontWeight.medium,
  },
});

export default WelcomeScreen;
