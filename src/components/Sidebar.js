import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { 
  BarChart3, 
  Package, 
  Users, 
  LayoutDashboard, 
  ShoppingCart, 
  Settings, 
  LogOut,
  User as UserIcon
} from 'lucide-react-native';
import Colors from '../constants/Colors';
import { productService } from '../services/productService';
import { authService } from '../services/authService';
import { LOW_STOCK_THRESHOLD } from '../constants/Constants';

const SidebarItem = ({ icon: Icon, label, active, onPress }) => (
  <TouchableOpacity 
    style={[styles.item, active && styles.activeItem]}
    onPress={onPress}
  >
    <Icon 
      size={24} 
      color={active ? '#FFFFFF' : Colors.primary} 
    />
    <Text style={[styles.label, active && styles.activeLabel]}>
      {label}
    </Text>
    {label === 'Inventory' && label === 'Inventory' && (
      <View style={styles.badgeContainer} />
    )}
  </TouchableOpacity>
);

const SidebarItemWithBadge = ({ icon: Icon, label, active, onPress, hasBadge }) => (
  <TouchableOpacity 
    style={[styles.item, active && styles.activeItem]}
    onPress={onPress}
  >
    <View>
      <Icon 
        size={24} 
        color={active ? '#FFFFFF' : Colors.primary} 
      />
      {hasBadge && (
        <View style={styles.badgeDot} />
      )}
    </View>
    <Text style={[styles.label, active && styles.activeLabel]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const Sidebar = ({ onNavigate, activeScreen, user }) => {
  const [hasLowStock, setHasLowStock] = useState(false);

  useEffect(() => {
    const unsubscribe = productService.subscribeToProducts((products) => {
      const lowStock = products.some(p => (p.stock || 0) <= LOW_STOCK_THRESHOLD);
      setHasLowStock(lowStock);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error("Logout failed:", error.message);
    }
  };

  const isSupervisor = user?.role === 'supervisor';

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <View style={styles.logo}>
          <ShoppingCart size={24} color="#FFFFFF" />
        </View>
        <Text style={styles.logoText}>xPOS</Text>
      </View>

      <View style={styles.menuContainer}>
        <SidebarItem 
          icon={LayoutDashboard} 
          label="Dashboard" 
          active={activeScreen === 'Dashboard'} 
          onPress={() => onNavigate && onNavigate('Dashboard')}
        />
        <SidebarItem 
          icon={ShoppingCart} 
          label="Sales" 
          active={activeScreen === 'Sales'}
          onPress={() => onNavigate && onNavigate('Sales')}
        />
        <SidebarItemWithBadge 
          icon={Package} 
          label="Inventory" 
          active={activeScreen === 'Inventory'}
          onPress={() => onNavigate && onNavigate('Inventory')}
          hasBadge={hasLowStock}
        />
        <SidebarItem 
          icon={Users} 
          label="Customers" 
          active={activeScreen === 'Customers'}
          onPress={() => onNavigate && onNavigate('Customers')}
        />
        <SidebarItem 
          icon={BarChart3} 
          label="Reports" 
          active={activeScreen === 'Reports'}
          onPress={() => onNavigate && onNavigate('Reports')}
        />
        <SidebarItem 
          icon={Settings} 
          label="Settings" 
          active={activeScreen === 'Settings'}
          onPress={() => onNavigate && onNavigate('Settings')}
        />
        {isSupervisor && (
          <SidebarItem 
            icon={Users} 
            label="Staff" 
            active={activeScreen === 'Staff'}
            onPress={() => onNavigate && onNavigate('Staff')}
          />
        )}
      </View>

      <View style={styles.userSection}>
        <View style={styles.avatar}>
          <UserIcon size={20} color={Colors.primary} />
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>
            {user?.email?.split('@')[0] || 'Cashier'}
          </Text>
          <Text style={styles.userRole}>
            {isSupervisor ? 'Supervisor' : 'Cashier'}
          </Text>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.logoutContainer}
        onPress={handleLogout}
      >
        <LogOut size={24} color={Colors.primary} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 240,
    height: '100%',
    backgroundColor: '#FFFFFF',
    paddingVertical: 20,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginLeft: 12,
  },
  menuContainer: {
    flex: 1,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginVertical: 4,
  },
  activeItem: {
    backgroundColor: Colors.primary,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    marginRight: 20,
  },
  label: {
    fontSize: 16,
    color: Colors.textMuted,
    marginLeft: 15,
  },
  activeLabel: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    textTransform: 'capitalize',
  },
  userRole: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  logoutContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 'auto',
  },
  logoutText: {
    fontSize: 16,
    color: Colors.textMuted,
    marginLeft: 15,
  },
  badgeDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  }
});

export default Sidebar;
