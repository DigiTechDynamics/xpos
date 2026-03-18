import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { 
  Users, 
  Shield, 
  User, 
  UserMinus, 
  UserCheck, 
  Plus, 
  RefreshCw,
  Info,
  ChevronRight
} from 'lucide-react-native';
import Colors from '../constants/Colors';
import { authService } from '../services/authService';
import Sidebar from '../components/Sidebar';

const StaffAction = ({ icon: Icon, label, color, onPress, disabled }) => (
  <TouchableOpacity 
    style={[styles.actionBtn, disabled && styles.disabledBtn]} 
    onPress={onPress}
    disabled={disabled}
  >
    <Icon size={16} color={color} />
    <Text style={[styles.actionLabel, { color }]}>{label}</Text>
  </TouchableOpacity>
);

const Staff = ({ onNavigate, user: currentUser }) => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    try {
      const users = await authService.getAllUsers();
      // Sort: Supervisors first, then by email
      setStaff(users.sort((a, b) => {
        if (a.role === 'supervisor' && b.role !== 'supervisor') return -1;
        if (a.role !== 'supervisor' && b.role === 'supervisor') return 1;
        return a.email.localeCompare(b.email);
      }));
    } catch (error) {
      console.error("Load staff error:", error);
      Alert.alert("Error", "Failed to load staff list.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleChangeRole = (staffMember) => {
    if (staffMember.id === currentUser.uid) {
      Alert.alert("Action Refused", "You cannot change your own role to avoid being locked out.");
      return;
    }

    const newRole = staffMember.role === 'supervisor' ? 'cashier' : 'supervisor';
    Alert.alert(
      "Change Role",
      `Promote/Demote ${staffMember.email} to ${newRole.toUpperCase()}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Confirm", 
          onPress: async () => {
            try {
              await authService.updateUserRole(staffMember.id, newRole);
              loadStaff();
            } catch (e) {
              Alert.alert("Error", "Failed to update role.");
            }
          }
        }
      ]
    );
  };

  const handleToggleStatus = (staffMember) => {
    if (staffMember.id === currentUser.uid) {
      Alert.alert("Action Refused", "You cannot disable your own account.");
      return;
    }

    const newState = !staffMember.disabled;
    Alert.alert(
      newState ? "Disable Account" : "Enable Account",
      `${newState ? 'Disable' : 'Enable'} access for ${staffMember.email}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Confirm", 
          onPress: async () => {
            try {
              await authService.toggleUserStatus(staffMember.id, newState);
              loadStaff();
            } catch (e) {
              Alert.alert("Error", "Failed to update status.");
            }
          }
        }
      ]
    );
  };

  const renderStaffItem = ({ item }) => {
    const isSelf = item.id === currentUser.uid;
    const isDisabled = item.disabled === true;

    return (
      <View style={[styles.staffCard, isDisabled && styles.staffCardDisabled]}>
        <View style={styles.staffMain}>
          <View style={[styles.avatarBox, { backgroundColor: item.role === 'supervisor' ? '#DBEAFE' : '#F1F5F9' }]}>
            {item.role === 'supervisor' ? (
              <Shield size={22} color={Colors.primary} />
            ) : (
              <User size={22} color={Colors.textMuted} />
            )}
          </View>
          <View style={styles.staffInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
               <Text style={[styles.staffEmail, isDisabled && { textDecorationLine: 'line-through' }]}>
                 {item.email}
               </Text>
               {isSelf && <View style={styles.selfTag}><Text style={styles.selfTagText}>YOU</Text></View>}
            </View>
            <Text style={styles.staffRole}>{item.role.toUpperCase()}</Text>
          </View>
          <View style={isDisabled ? styles.statusBadgeDisabled : styles.statusBadgeActive}>
            <Text style={styles.statusBadgeText}>{isDisabled ? 'INACTIVE' : 'ACTIVE'}</Text>
          </View>
        </View>

        <View style={styles.staffActions}>
          <StaffAction 
            icon={RefreshCw} 
            label="Change Role" 
            color={Colors.primary} 
            onPress={() => handleChangeRole(item)}
            disabled={isSelf}
          />
          <StaffAction 
            icon={isDisabled ? UserCheck : UserMinus} 
            label={isDisabled ? "Enable Access" : "Disable Access"} 
            color={isDisabled ? "#10B981" : "#EF4444"} 
            onPress={() => handleToggleStatus(item)}
            disabled={isSelf}
          />
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Sidebar onNavigate={onNavigate} activeScreen="Staff" user={currentUser} />

      <View style={styles.mainContent}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Staff Management</Text>
            <Text style={styles.subtitle}>Manage team access, roles, and authorization</Text>
          </View>
          <TouchableOpacity style={styles.refreshBtn} onPress={() => {setRefreshing(true); loadStaff();}}>
            <RefreshCw size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.dashboard}>
          <View style={styles.listSection}>
            {loading ? (
              <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 50 }} />
            ) : (
              <FlatList
                data={staff}
                keyExtractor={(item) => item.id}
                renderItem={renderStaffItem}
                contentContainerStyle={styles.listContent}
                refreshing={refreshing}
                onRefresh={loadStaff}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Users size={48} color={Colors.border} />
                    <Text style={styles.emptyText}>No staff members found.</Text>
                  </View>
                }
              />
            )}
          </View>

          <View style={styles.helpSection}>
            <View style={styles.helpCard}>
              <View style={styles.helpHeader}>
                <Info size={18} color={Colors.primary} />
                <Text style={styles.helpTitle}>How to add new staff</Text>
              </View>
              <Text style={styles.helpText}>
                New employees should register directly through the Login screen using their work email.
              </Text>
              <View style={styles.step}>
                <View style={styles.stepNum}><Text style={styles.stepNumText}>1</Text></View>
                <Text style={styles.stepText}>Staff member registers on xPOS.</Text>
              </View>
              <View style={styles.step}>
                <View style={styles.stepNum}><Text style={styles.stepNumText}>2</Text></View>
                <Text style={styles.stepText}>They appear in this list as "CASHIER".</Text>
              </View>
              <View style={styles.step}>
                <View style={styles.stepNum}><Text style={styles.stepNumText}>3</Text></View>
                <Text style={styles.stepText}>Supervisor promotes them if needed.</Text>
              </View>

              <TouchableOpacity 
                style={styles.instructionBtn}
                onPress={() => Alert.alert("Onboarding", "Registration is handled by the xPOS Login screen. Instruct new staff to click 'Sign Up' (if available) or simply login for the first time if your auth provider supports auto-provisioning.")}
              >
                <Text style={styles.instructionBtnText}>Detailed Instructions</Text>
                <ChevronRight size={16} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.background,
  },
  mainContent: {
    flex: 1,
    padding: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 4,
  },
  refreshBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dashboard: {
    flex: 1,
    flexDirection: 'row',
    gap: 30,
  },
  listSection: {
    flex: 2,
  },
  listContent: {
    paddingBottom: 20,
  },
  helpSection: {
    flex: 1,
  },
  staffCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  staffCardDisabled: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    opacity: 0.7,
  },
  staffMain: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatarBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  staffInfo: {
    marginLeft: 15,
    flex: 1,
  },
  staffEmail: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  staffRole: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textMuted,
    marginTop: 2,
  },
  selfTag: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 10,
  },
  selfTagText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#FFF',
  },
  statusBadgeActive: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusBadgeDisabled: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  staffActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 15,
    gap: 15,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  disabledBtn: {
    opacity: 0.3,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 8,
  },
  helpCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 25,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  helpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginLeft: 10,
  },
  helpText: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 20,
    lineHeight: 20,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
  },
  stepText: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '500',
  },
  instructionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  instructionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textMuted,
    marginTop: 10,
  }
});

export default Staff;
