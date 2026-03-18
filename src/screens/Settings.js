import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Alert,
  ActivityIndicator
} from 'react-native';
import { Save, Building, MapPin, Phone, Globe, Percent, ArrowLeft, User, Shield, Key } from 'lucide-react-native';
import Colors from '../constants/Colors';
import { settingsService } from '../services/settingsService';
import { authService } from '../services/authService';
import Sidebar from '../components/Sidebar';
import { AlertCircle, CheckCircle2 } from 'lucide-react-native';

const SettingsField = ({ icon: Icon, label, value, onChangeText, keyboardType = 'default', placeholder }) => (
  <View style={styles.fieldContainer}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.inputWrapper}>
      <View style={styles.iconBox}>
        <Icon size={20} color={Colors.primary} />
      </View>
      <TextInput 
        value={value}
        onChangeText={onChangeText}
        style={styles.input}
        keyboardType={keyboardType}
        placeholder={placeholder}
      />
    </View>
  </View>
);

const Settings = ({ onNavigate, user }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    storeName: '',
    address: '',
    phone: '',
    website: '',
    taxRate: '5.0',
    logoText: 'xPOS'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setError('');
    try {
      const data = await settingsService.getSettings();
      setSettings({
        ...data,
        taxRate: data.taxRate.toString()
      });
    } catch (error) {
      console.error("Load settings error:", error);
      setError("Failed to load settings. Reverting to defaults.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');
    setSaving(true);
    console.time('Settings:HandleSave');
    try {
      const taxRate = parseFloat(settings.taxRate);
      if (isNaN(taxRate)) {
        setError("Invalid tax rate. Please enter a number.");
        setSaving(false);
        return;
      }

      await settingsService.updateSettings({
        ...settings,
        taxRate
      });
      console.timeEnd('Settings:HandleSave');
      setSuccess("Settings updated successfully!");
    } catch (error) {
      console.timeEnd('Settings:HandleSave');
      console.error("Save settings error:", error);
      setError("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const isSupervisor = user?.role === 'supervisor';

  const handleResetPassword = async () => {
    setSuccess('');
    setError('');
    try {
      await authService.resetPassword(user.email);
      setSuccess(`Password reset link sent to ${user.email}`);
    } catch (e) {
      setError("Failed to send reset email.");
    }
  };

  return (
    <View style={styles.container}>
      <Sidebar onNavigate={onNavigate} activeScreen="Settings" user={user} />
      <View style={styles.mainContent}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Settings</Text>
            <View style={styles.tabBar}>
              <TouchableOpacity onPress={() => setActiveTab('profile')} style={[styles.tab, activeTab === 'profile' && styles.activeTab]}>
                <Text style={[styles.tabText, activeTab === 'profile' && styles.activeTabText]}>My Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => isSupervisor ? setActiveTab('business') : Alert.alert('Access Denied', 'Only supervisors can edit business settings.')} style={[styles.tab, activeTab === 'business' && styles.activeTab, !isSupervisor && {opacity: 0.5}]}>
                <Text style={[styles.tabText, activeTab === 'business' && styles.activeTabText]}>Business Settings</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {activeTab === 'business' && (
            <TouchableOpacity 
              style={[styles.saveButton, saving && styles.disabledButton]} 
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Save size={20} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <ScrollView style={styles.scrollArea}>
            {error ? (
              <View style={styles.errorBanner}>
                <AlertCircle size={20} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {success ? (
              <View style={styles.successBanner}>
                <CheckCircle2 size={20} color="#10B981" />
                <Text style={styles.successText}>{success}</Text>
              </View>
            ) : null}

            {activeTab === 'profile' ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Employee Profile</Text>
                <View style={[styles.grid, { gap: 20 }]}>
                   <View style={styles.profileBox}>
                      <View style={styles.profileAvatar}>
                        <User size={32} color={Colors.primary} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 20 }}>
                        <Text style={styles.profileEmail}>{user?.email}</Text>
                        <View style={styles.roleTag}>
                           <Shield size={12} color={Colors.primary} />
                           <Text style={styles.roleTagText}>{user?.role?.toUpperCase()}</Text>
                        </View>
                      </View>
                   </View>
                   
                   <View style={{ width: '100%', marginTop: 20 }}>
                      <Text style={[styles.sectionTitle, { fontSize: 14, marginBottom: 10 }]}>Security</Text>
                      <TouchableOpacity style={styles.securityAction} onPress={handleResetPassword}>
                         <Key size={18} color={Colors.text} />
                         <View style={{ marginLeft: 12 }}>
                            <Text style={{ fontWeight: '700', fontSize: 14 }}>Reset Password</Text>
                            <Text style={{ fontSize: 12, color: Colors.textMuted }}>We'll send a link to your email to update your credentials.</Text>
                         </View>
                      </TouchableOpacity>
                   </View>
                </View>
              </View>
            ) : (
              <>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Business Profile</Text>
                  <View style={styles.grid}>
                    <SettingsField 
                      icon={Building} 
                      label="Store Name" 
                      value={settings.storeName}
                      onChangeText={(val) => setSettings({...settings, storeName: val})}
                      placeholder="e.g., My Awesome Store"
                    />
                    <SettingsField 
                      icon={MapPin} 
                      label="Business Address" 
                      value={settings.address}
                      onChangeText={(val) => setSettings({...settings, address: val})}
                      placeholder="123 Street, City"
                    />
                    <SettingsField 
                      icon={Phone} 
                      label="Phone Number" 
                      value={settings.phone}
                      onChangeText={(val) => setSettings({...settings, phone: val})}
                      keyboardType="phone-pad"
                      placeholder="+1 (555) 000-0000"
                    />
                    <SettingsField 
                      icon={Globe} 
                      label="Website" 
                      value={settings.website}
                      onChangeText={(val) => setSettings({...settings, website: val})}
                      placeholder="www.yourstore.com"
                    />
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Financials & Tax</Text>
                  <View style={[styles.grid, { maxWidth: '50%' }]}>
                    <SettingsField 
                      icon={Percent} 
                      label="Tax Rate (%)" 
                      value={settings.taxRate}
                      onChangeText={(val) => setSettings({...settings, taxRate: val})}
                      keyboardType="numeric"
                      placeholder="5.0"
                    />
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Appearance</Text>
                  <View style={[styles.grid, { maxWidth: '50%' }]}>
                     <SettingsField 
                      icon={Building} 
                      label="Logo Text" 
                      value={settings.logoText}
                      onChangeText={(val) => setSettings({...settings, logoText: val})}
                      placeholder="xPOS"
                    />
                  </View>
                </View>
              </>
            )}
          </ScrollView>
        )}
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
  saveButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    height: 48,
    minWidth: 160,
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 8,
  },
  disabledButton: {
    opacity: 0.7,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollArea: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 30,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -10,
  },
  fieldContainer: {
    width: '50%',
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 50,
  },
  iconBox: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  input: {
    flex: 1,
    paddingHorizontal: 15,
    fontSize: 16,
    color: Colors.text,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 12,
    flex: 1,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  successText: {
    color: '#15803D',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 12,
    flex: 1,
  },
  
  // New Styles
  tabBar: { flexDirection: 'row', marginTop: 15, gap: 10 },
  tab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#F1F5F9' },
  activeTab: { backgroundColor: Colors.primary },
  tabText: { fontSize: 13, fontWeight: '700', color: Colors.textMuted },
  activeTabText: { color: '#FFF' },
  
  profileBox: { width: '100%', flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 25, borderRadius: 20, borderWidth: 1, borderColor: Colors.border },
  profileAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 },
  profileEmail: { fontSize: 18, fontWeight: '800', color: Colors.text },
  roleTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 6, gap: 5 },
  roleTagText: { fontSize: 11, fontWeight: '800', color: Colors.primary },
  securityAction: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: Colors.border },
});

export default Settings;
