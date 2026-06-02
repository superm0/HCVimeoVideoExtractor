import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../constants/colors';
import { Theme } from '../constants/theme';

import DashboardScreen from '../screens/dashboard/DashboardScreen';
import CarsScreen from '../screens/cars/CarsScreen';
import ReportsScreen from '../screens/reports/ReportsScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import FuelHistoryScreen from '../screens/fuelLog/FuelHistoryScreen';

const Tab = createBottomTabNavigator();

function AddButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.addButton} activeOpacity={0.85}>
      <Ionicons name="add" size={28} color={Colors.white} />
    </TouchableOpacity>
  );
}

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.gray400,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
            Dashboard: { active: 'home', inactive: 'home-outline' },
            Cars: { active: 'car', inactive: 'car-outline' },
            History: { active: 'receipt', inactive: 'receipt-outline' },
            Reports: { active: 'bar-chart', inactive: 'bar-chart-outline' },
            Settings: { active: 'person', inactive: 'person-outline' },
          };
          const icon = icons[route.name];
          return <Ionicons name={focused ? icon?.active : icon?.inactive} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="Cars" component={CarsScreen} />
      <Tab.Screen
        name="AddLog"
        component={DashboardScreen}
        options={({ navigation }) => ({
          tabBarLabel: '',
          tabBarIcon: () => null,
          tabBarButton: () => (
            <AddButton onPress={() => navigation.navigate('AddFuelLog')} />
          ),
        })}
      />
      <Tab.Screen name="Reports" component={ReportsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
    height: Platform.OS === 'ios' ? 88 : 64,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 8,
    ...Theme.shadow.md,
  },
  tabLabel: {
    fontSize: Theme.fontSize.xs,
    fontWeight: Theme.fontWeight.medium,
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Platform.OS === 'ios' ? 16 : 8,
    ...Theme.shadow.lg,
  },
});
