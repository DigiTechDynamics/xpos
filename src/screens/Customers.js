import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native';
import {
  Users,
  Search,
  Plus,
  Edit3,
  Trash2,
  X,
  Star,
  ShoppingBag,
  DollarSign,
  Phone,
  Mail,
  MapPin,
  User,
  Award,
  ChevronRight,
  XCircle,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react-native';
import Colors from '../constants/Colors';
import { customerService } from '../services/customerService';
import Sidebar from '../components/Sidebar';

// ─── Tier logic ─────────────────────────────────────────────────────────────
const getTier = (spend) => {
  if (spend >= 5000) return { label: 'VIP', color: '#8B5CF6', bg: '#8B5CF618' };
  if (spend >= 1000) return { label: 'Gold', color: '#F59E0B', bg: '#F59E0B18' };
  if (spend >= 200) return { label: 'Silver', color: '#64748B', bg: '#64748B18' };
  return { label: 'Bronze', color: '#B45309', bg: '#B4530918' };
};

// ─── Customer Form Modal ─────────────────────────────────────────────────────
const CustomerModal = ({ visible, customer, onClose, onSave }) => {
  const isEdit = !!customer;
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (customer) {
      setForm({
        name: customer.name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        address: customer.address || '',
        notes: customer.notes || '',
      });
    } else {
      setForm({ name: '', email: '', phone: '', address: '', notes: '' });
    }
    setError('');
  }, [customer, visible]);

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name is required.'); return; }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Please enter a valid email address.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave(form);
      onClose();
    } catch (e) {
      setError(e.message || 'Failed to save customer.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          {/* Header */}
          <View style={modal.header}>
            <Text style={modal.title}>{isEdit ? 'Edit Customer' : 'New Customer'}</Text>
            <TouchableOpacity onPress={onClose} style={modal.closeBtn}>
              <X size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={modal.body} showsVerticalScrollIndicator={false}>
            {/* Feedback */}
            {error ? (
              <View style={modal.feedbackError}>
                <AlertCircle size={16} color="#EF4444" />
                <Text style={modal.feedbackErrorText}>{error}</Text>
              </View>
            ) : null}

            {/* Fields */}
            <FormField label="Full Name *" placeholder="e.g. John Doe" value={form.name} onChangeText={v => setForm(p => ({ ...p, name: v }))} icon={User} />
            <FormField label="Email" placeholder="john@example.com" value={form.email} onChangeText={v => setForm(p => ({ ...p, email: v }))} icon={Mail} keyboardType="email-address" />
            <FormField label="Phone" placeholder="+1 (555) 000-0000" value={form.phone} onChangeText={v => setForm(p => ({ ...p, phone: v }))} icon={Phone} keyboardType="phone-pad" />
            <FormField label="Address" placeholder="123 Main St, City" value={form.address} onChangeText={v => setForm(p => ({ ...p, address: v }))} icon={MapPin} />
            <FormField label="Notes" placeholder="Any notes about this customer..." value={form.notes} onChangeText={v => setForm(p => ({ ...p, notes: v }))} multiline />
          </ScrollView>

          {/* Actions */}
          <View style={modal.footer}>
            <TouchableOpacity style={modal.cancelBtn} onPress={onClose}>
              <Text style={modal.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[modal.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={modal.saveBtnText}>{isEdit ? 'Save Changes' : 'Add Customer'}</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const FormField = ({ label, icon: Icon, multiline, ...props }) => (
  <View style={modal.fieldGroup}>
    <Text style={modal.label}>{label}</Text>
    <View style={[modal.inputWrapper, multiline && { height: 80, alignItems: 'flex-start' }]}>
      {Icon ? <Icon size={16} color={Colors.textMuted} style={{ marginTop: multiline ? 12 : 0 }} /> : null}
      <TextInput
        style={[modal.input, multiline && { height: 70, textAlignVertical: 'top' }]}
        multiline={multiline}
        placeholderTextColor={Colors.textMuted}
        {...props}
      />
    </View>
  </View>
);

// ─── Customer Detail Panel ────────────────────────────────────────────────────
const CustomerDetail = ({ customer, onEdit, onDelete, onClose }) => {
  const tier = getTier(customer.totalSpend || 0);
  return (
    <View style={detail.panel}>
      <View style={detail.header}>
        <TouchableOpacity onPress={onClose} style={detail.backBtn}>
          <X size={18} color={Colors.textMuted} />
        </TouchableOpacity>
        <View style={detail.actions}>
          <TouchableOpacity style={detail.editBtn} onPress={onEdit}>
            <Edit3 size={15} color={Colors.primary} />
            <Text style={detail.editBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={detail.deleteBtn} onPress={onDelete}>
            <Trash2 size={15} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Avatar */}
      <View style={detail.avatarContainer}>
        <View style={[detail.avatar, { backgroundColor: tier.bg }]}>
          <Text style={[detail.avatarInitial, { color: tier.color }]}>
            {(customer.name || 'C')[0].toUpperCase()}
          </Text>
        </View>
        <Text style={detail.name}>{customer.name}</Text>
        <View style={[detail.tierBadge, { backgroundColor: tier.bg }]}>
          <Award size={12} color={tier.color} />
          <Text style={[detail.tierText, { color: tier.color }]}>{tier.label}</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={detail.statsRow}>
        <View style={detail.stat}>
          <DollarSign size={16} color="#8B5CF6" />
          <Text style={detail.statValue}>${(customer.totalSpend || 0).toFixed(2)}</Text>
          <Text style={detail.statLabel}>Total Spent</Text>
        </View>
        <View style={detail.statDivider} />
        <View style={detail.stat}>
          <ShoppingBag size={16} color="#3B82F6" />
          <Text style={detail.statValue}>{customer.totalOrders || 0}</Text>
          <Text style={detail.statLabel}>Orders</Text>
        </View>
        <View style={detail.statDivider} />
        <View style={detail.stat}>
          <Star size={16} color="#F59E0B" />
          <Text style={detail.statValue}>{customer.loyaltyPoints || 0}</Text>
          <Text style={detail.statLabel}>Loyalty Pts</Text>
        </View>
      </View>

      {/* Contact info */}
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={detail.infoSection}>
          <Text style={detail.sectionTitle}>Contact Info</Text>
          {customer.email ? (
            <View style={detail.infoRow}>
              <Mail size={15} color={Colors.textMuted} />
              <Text style={detail.infoText}>{customer.email}</Text>
            </View>
          ) : null}
          {customer.phone ? (
            <View style={detail.infoRow}>
              <Phone size={15} color={Colors.textMuted} />
              <Text style={detail.infoText}>{customer.phone}</Text>
            </View>
          ) : null}
          {customer.address ? (
            <View style={detail.infoRow}>
              <MapPin size={15} color={Colors.textMuted} />
              <Text style={detail.infoText}>{customer.address}</Text>
            </View>
          ) : null}
          {!customer.email && !customer.phone && !customer.address ? (
            <Text style={detail.emptyInfo}>No contact info added.</Text>
          ) : null}
        </View>

        {customer.notes ? (
          <View style={detail.infoSection}>
            <Text style={detail.sectionTitle}>Notes</Text>
            <Text style={detail.notesText}>{customer.notes}</Text>
          </View>
        ) : null}

        {customer.lastPurchaseAt ? (
          <View style={detail.infoSection}>
            <Text style={detail.sectionTitle}>Last Purchase</Text>
            <Text style={detail.infoText}>
              {customer.lastPurchaseAt.toDate
                ? customer.lastPurchaseAt.toDate().toLocaleDateString('en-US', { dateStyle: 'long' })
                : 'N/A'}
            </Text>
          </View>
        ) : null}

        <View style={detail.infoSection}>
          <Text style={detail.sectionTitle}>Member Since</Text>
          <Text style={detail.infoText}>
            {customer.createdAt?.toDate
              ? customer.createdAt.toDate().toLocaleDateString('en-US', { dateStyle: 'long' })
              : 'N/A'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

// ─── Customer Row ─────────────────────────────────────────────────────────────
const CustomerRow = ({ customer, onSelect, isSelected }) => {
  const tier = getTier(customer.totalSpend || 0);
  return (
    <TouchableOpacity
      style={[styles.customerRow, isSelected && styles.customerRowSelected]}
      onPress={() => onSelect(customer)}
    >
      <View style={[styles.customerAvatar, { backgroundColor: tier.bg }]}>
        <Text style={[styles.customerAvatarText, { color: tier.color }]}>
          {(customer.name || 'C')[0].toUpperCase()}
        </Text>
      </View>
      <View style={styles.customerRowInfo}>
        <View style={styles.customerRowTop}>
          <Text style={styles.customerName}>{customer.name}</Text>
          <View style={[styles.tierPill, { backgroundColor: tier.bg }]}>
            <Text style={[styles.tierPillText, { color: tier.color }]}>{tier.label}</Text>
          </View>
        </View>
        <Text style={styles.customerEmail} numberOfLines={1}>
          {customer.email || customer.phone || 'No contact info'}
        </Text>
      </View>
      <View style={styles.customerRowRight}>
        <Text style={styles.customerSpend}>${(customer.totalSpend || 0).toFixed(0)}</Text>
        <Text style={styles.customerOrders}>{customer.totalOrders || 0} orders</Text>
      </View>
      <ChevronRight size={16} color={Colors.textMuted} />
    </TouchableOpacity>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
const Customers = ({ onNavigate, user }) => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [toast, setToast] = useState(null);

  const FILTERS = ['All', 'VIP', 'Gold', 'Silver', 'Bronze'];

  useEffect(() => {
    const unsub = customerService.subscribeToCustomers((data) => {
      setCustomers(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Summary metrics ────────────────────────────────────────────────────────
  const summary = useMemo(() => {
    const totalRevenue = customers.reduce((s, c) => s + (c.totalSpend || 0), 0);
    const vip = customers.filter(c => getTier(c.totalSpend || 0).label === 'VIP').length;
    const avgSpend = customers.length > 0 ? totalRevenue / customers.length : 0;
    return { total: customers.length, totalRevenue, vip, avgSpend };
  }, [customers]);

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return customers.filter(c => {
      const matchesSearch = !q ||
        c.name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(q);
      const matchesTier = selectedFilter === 'All' || getTier(c.totalSpend || 0).label === selectedFilter;
      return matchesSearch && matchesTier;
    });
  }, [customers, searchQuery, selectedFilter]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleSave = async (form) => {
    if (editingCustomer) {
      await customerService.updateCustomer(editingCustomer.id, form);
      // Refresh selected customer
      setSelectedCustomer(prev => prev ? { ...prev, ...form } : null);
      showToast('Customer updated successfully!');
    } else {
      await customerService.addCustomer(form);
      showToast('Customer added successfully!');
    }
    setEditingCustomer(null);
  };

  const handleDelete = async (customer) => {
    const confirmed = typeof window !== 'undefined'
      ? window.confirm(`Delete ${customer.name}? This cannot be undone.`)
      : true;
    if (!confirmed) return;
    try {
      await customerService.deleteCustomer(customer.id);
      setSelectedCustomer(null);
      showToast('Customer deleted.', 'error');
    } catch (e) {
      showToast('Failed to delete customer.', 'error');
    }
  };

  const openAdd = () => {
    setEditingCustomer(null);
    setModalVisible(true);
  };

  const openEdit = (customer) => {
    setEditingCustomer(customer);
    setModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <Sidebar onNavigate={onNavigate} activeScreen="Customers" user={user} />

      {/* Main content */}
      <View style={styles.mainContent}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Customers</Text>
            <Text style={styles.subtitle}>{summary.total} registered customers</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
            <Plus size={18} color="#fff" />
            <Text style={styles.addBtnText}>Add Customer</Text>
          </TouchableOpacity>
        </View>

        {/* Summary cards */}
        <View style={styles.summaryRow}>
          <SummaryCard icon={Users} label="Total Customers" value={summary.total} color="#3B82F6" />
          <SummaryCard icon={DollarSign} label="Total Revenue" value={`$${summary.totalRevenue.toFixed(0)}`} color="#8B5CF6" />
          <SummaryCard icon={Award} label="VIP Customers" value={summary.vip} color="#F59E0B" />
          <SummaryCard icon={Star} label="Avg. Spend" value={`$${summary.avgSpend.toFixed(0)}`} color="#10B981" />
        </View>

        {/* Search + filters */}
        <View style={styles.filterRow}>
          <View style={styles.searchBar}>
            <Search size={16} color={Colors.textMuted} />
            <TextInput
              placeholder="Search by name, email or phone..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
              placeholderTextColor={Colors.textMuted}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <XCircle size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {FILTERS.map(f => (
              <TouchableOpacity
                key={f}
                style={[styles.chip, selectedFilter === f && styles.chipActive]}
                onPress={() => setSelectedFilter(f)}
              >
                <Text style={[styles.chipText, selectedFilter === f && styles.chipTextActive]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* List */}
        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <View style={styles.listWrapper}>
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {filtered.length > 0 ? filtered.map(c => (
                <CustomerRow
                  key={c.id}
                  customer={c}
                  isSelected={selectedCustomer?.id === c.id}
                  onSelect={setSelectedCustomer}
                />
              )) : (
                <View style={styles.emptyContainer}>
                  <Users size={52} color={Colors.border} />
                  <Text style={styles.emptyTitle}>
                    {customers.length === 0 ? 'No customers yet' : 'No results found'}
                  </Text>
                  <Text style={styles.emptyText}>
                    {customers.length === 0
                      ? 'Add your first customer to start tracking loyalty.'
                      : 'Try a different search or filter.'}
                  </Text>
                  {customers.length === 0 && (
                    <TouchableOpacity style={styles.emptyAddBtn} onPress={openAdd}>
                      <Plus size={16} color="#fff" />
                      <Text style={styles.emptyAddBtnText}>Add First Customer</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </ScrollView>

            {/* Detail panel */}
            {selectedCustomer && (
              <CustomerDetail
                customer={selectedCustomer}
                onEdit={() => openEdit(selectedCustomer)}
                onDelete={() => handleDelete(selectedCustomer)}
                onClose={() => setSelectedCustomer(null)}
              />
            )}
          </View>
        )}
      </View>

      {/* Modal */}
      <CustomerModal
        visible={modalVisible}
        customer={editingCustomer}
        onClose={() => { setModalVisible(false); setEditingCustomer(null); }}
        onSave={handleSave}
      />

      {/* Toast */}
      {toast && (
        <View style={[styles.toast, toast.type === 'error' ? styles.toastError : styles.toastSuccess]}>
          {toast.type === 'error'
            ? <AlertCircle size={16} color="#fff" />
            : <CheckCircle2 size={16} color="#fff" />}
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      )}
    </View>
  );
};

// ─── Summary Card ─────────────────────────────────────────────────────────────
const SummaryCard = ({ icon: Icon, label, value, color }) => (
  <View style={styles.summaryCard}>
    <View style={[styles.summaryIcon, { backgroundColor: color + '18' }]}>
      <Icon size={20} color={color} />
    </View>
    <View>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
    </View>
  </View>
);

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', backgroundColor: Colors.background },
  mainContent: { flex: 1, padding: 28, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text },
  subtitle: { fontSize: 14, color: Colors.textMuted, marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.primary, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 12 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Summary
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 22 },
  summaryCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: Colors.border },
  summaryIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  summaryLabel: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
  summaryValue: { fontSize: 20, fontWeight: '800' },

  // Filters
  filterRow: { marginBottom: 16 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, height: 46, borderWidth: 1, borderColor: Colors.border, marginBottom: 10 },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text },
  chipScroll: { flexDirection: 'row' },
  chip: { paddingHorizontal: 16, paddingVertical: 6, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: Colors.border, marginRight: 8 },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  chipTextActive: { color: '#fff' },

  // List
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listWrapper: { flex: 1, flexDirection: 'row', gap: 16 },
  list: { flex: 1, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: Colors.border },
  customerRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 14 },
  customerRowSelected: { backgroundColor: '#F0FDF4' },
  customerAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  customerAvatarText: { fontSize: 18, fontWeight: '800' },
  customerRowInfo: { flex: 1 },
  customerRowTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  customerName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  tierPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  tierPillText: { fontSize: 10, fontWeight: '800' },
  customerEmail: { fontSize: 13, color: Colors.textMuted },
  customerRowRight: { alignItems: 'flex-end', marginRight: 8 },
  customerSpend: { fontSize: 15, fontWeight: '800', color: Colors.text },
  customerOrders: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },

  // Empty
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textMuted },
  emptyText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center' },
  emptyAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primary, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, marginTop: 8 },
  emptyAddBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Toast
  toast: { position: 'absolute', bottom: 28, left: '50%', transform: [{ translateX: -150 }], width: 300, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingVertical: 14, borderRadius: 14 },
  toastSuccess: { backgroundColor: Colors.primary },
  toastError: { backgroundColor: '#EF4444' },
  toastText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

// ─── Detail panel styles ──────────────────────────────────────────────────────
const detail = StyleSheet.create({
  panel: { width: 300, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { padding: 6 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F0FDF4', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: Colors.border },
  editBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 13 },
  deleteBtn: { padding: 8, backgroundColor: '#FFF5F5', borderRadius: 8, borderWidth: 1, borderColor: '#FECACA' },
  avatarContainer: { alignItems: 'center', paddingVertical: 24 },
  avatar: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarInitial: { fontSize: 28, fontWeight: '900' },
  name: { fontSize: 20, fontWeight: '800', color: Colors.text, marginBottom: 8 },
  tierBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  tierText: { fontSize: 12, fontWeight: '800' },
  statsRow: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: Colors.border },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 14, gap: 4 },
  statValue: { fontSize: 16, fontWeight: '800', color: Colors.text },
  statLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '600' },
  statDivider: { width: 1, backgroundColor: Colors.border },
  infoSection: { padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  infoText: { fontSize: 14, color: Colors.text, fontWeight: '500' },
  emptyInfo: { fontSize: 13, color: Colors.textMuted, fontStyle: 'italic' },
  notesText: { fontSize: 14, color: Colors.textMuted, lineHeight: 20 },
});

// ─── Modal styles ─────────────────────────────────────────────────────────────
const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  sheet: { backgroundColor: '#fff', borderRadius: 24, width: 480, maxHeight: '85%', overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontSize: 20, fontWeight: '800', color: Colors.text },
  closeBtn: { padding: 6 },
  body: { padding: 24 },
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: Colors.border, height: 48 },
  input: { flex: 1, fontSize: 15, color: Colors.text },
  feedbackError: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF5F5', borderWidth: 1, borderColor: '#FECACA', borderRadius: 10, padding: 12, marginBottom: 16 },
  feedbackErrorText: { color: '#DC2626', fontSize: 13, fontWeight: '600', flex: 1 },
  footer: { flexDirection: 'row', gap: 12, padding: 24, borderTopWidth: 1, borderTopColor: Colors.border },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelBtnText: { color: Colors.text, fontWeight: '700', fontSize: 15 },
  saveBtn: { flex: 2, paddingVertical: 13, borderRadius: 12, backgroundColor: Colors.primary, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

export default Customers;
