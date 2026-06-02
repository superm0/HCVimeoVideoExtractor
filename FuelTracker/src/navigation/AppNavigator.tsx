import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, ActivityIndicator } from 'react-native';

import { useAuthStore } from '../store/authStore';
import { useCarStore } from '../store/carStore';
import { useFuelLogStore } from '../store/fuelLogStore';
import { Colors } from '../constants/colors';

import AuthNavigator from './AuthNavigator';
import TabNavigator from './TabNavigator';
import AddCarScreen from '../screens/cars/AddCarScreen';
import CarDetailScreen from '../screens/cars/CarDetailScreen';
import AddFuelLogScreen from '../screens/fuelLog/AddFuelLogScreen';
import FuelHistoryScreen from '../screens/fuelLog/FuelHistoryScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
  const { isAuthenticated, isLoading, loadFromStorage, user } = useAuthStore();
  const { loadCars } = useCarStore();
  const { loadLogs } = useFuelLogStore();

  useEffect(() => {
    loadFromStorage();
  }, []);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadCars(user.id);
      loadLogs(user.id);
    }
  }, [isAuthenticated, user?.id]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.white }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Main" component={TabNavigator} />
          <Stack.Screen
            name="AddCar"
            component={AddCarScreen}
            options={{ presentation: 'modal' }}
          />
          <Stack.Screen
            name="EditCar"
            component={AddCarScreen}
            options={{ presentation: 'modal' }}
          />
          <Stack.Screen name="CarDetail" component={CarDetailScreen} />
          <Stack.Screen
            name="AddFuelLog"
            component={AddFuelLogScreen}
            options={{ presentation: 'modal' }}
          />
          <Stack.Screen name="FuelHistory" component={FuelHistoryScreen} />
        </Stack.Navigator>
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
}
