import React, { useState, useEffect } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, ActivityIndicator, View } from 'react-native';
import Dashboard from './src/screens/Dashboard';
import Inventory from './src/screens/Inventory';
import Reports from './src/screens/Reports';
import Customers from './src/screens/Customers';
import Sales from './src/screens/Sales';
import Login from './src/screens/Login';
import Settings from './src/screens/Settings';
import Staff from './src/screens/Staff';
import { authService } from './src/services/authService';
import Colors from './src/constants/Colors';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState('Dashboard');

  useEffect(() => {
    const unsubscribe = authService.subscribeToAuthChanges((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const renderScreen = () => {
    if (!user) return <Login />;
    
    // RBAC Guard for Cashiers
    const protectedScreens = ['Reports', 'Staff', 'Inventory'];
    if (user.role !== 'supervisor' && protectedScreens.includes(currentScreen)) {
      // Fallback to Dashboard silently for next render
      setTimeout(() => setCurrentScreen('Dashboard'), 0);
      return <Dashboard onNavigate={setCurrentScreen} user={user} />;
    }

    switch (currentScreen) {
      case 'Sales':
        return <Sales onNavigate={setCurrentScreen} user={user} />;
      case 'Reports':
        return <Reports onNavigate={setCurrentScreen} user={user} />;
      case 'Inventory':
        return <Inventory onNavigate={setCurrentScreen} user={user} />;
      case 'Customers':
        return <Customers onNavigate={setCurrentScreen} user={user} />;
      case 'Settings':
        return <Settings onNavigate={setCurrentScreen} user={user} />;
      case 'Staff':
        return <Staff onNavigate={setCurrentScreen} user={user} />;
      case 'Dashboard':
      default:
        return <Dashboard onNavigate={setCurrentScreen} user={user} />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {renderScreen()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});
