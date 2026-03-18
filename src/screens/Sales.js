import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {
  ShoppingBag,
  Search,
  Download,
  Printer,
  RotateCcw,
  XCircle,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  CreditCard,
  Banknote,
  QrCode,
  Calendar,
  Receipt,
  TrendingUp,
  RefreshCw,
  X,
  ChevronRight,
  Clock,
  User,
  Package,
  Minus,
  Plus,
  Mail,
} from 'lucide-react-native';
import Colors from '../constants/Colors';
import { orderService } from '../services/orderService';
import { receiptService } from '../services/receiptService';
import Sidebar from '../components/Sidebar';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// ─── Constants ───────────────────────────────────────────────────────────────
const PAYMENT_FILTERS = ['All', 'Cash', 'Card', 'QR Code'];
const STATUS_FILTERS = ['All', 'Completed', 'Refunded', 'Voided'];
const DATE_RANGES = ['Today', '7 Days', '30 Days', 'All Time'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const PaymentIcon = ({ method, size = 14 }) => {
  const m = (method || '').toLowerCase();
  if (m === 'card') return <CreditCard size={size} color="#3B82F6" />;
  if (m === 'qr' || m === 'qr code') return <QrCode size={size} color="#8B5CF6" />;
  return <Banknote size={size} color="#10B981" />;
};

const StatusPill = ({ status }) => {
  const config = {
    completed: { bg: '#DCFCE7', text: '#166534' },
    refunded:  { bg: '#FEF3C7', text: '#92400E' },
    voided:    { bg: '#FEE2E2', text: '#991B1B' },
  }[status] || { bg: '#F1F5F9', text: '#64748B' };

  return (
    <View style={[pill.badge, { backgroundColor: config.bg }]}>
      <Text style={[pill.text, { color: config.text }]}>{status?.toUpperCase()}</Text>
    </View>
  );
};

// ─── Refund Modal ─────────────────────────────────────────────────────────────
const RefundModal = ({ visible, order, onClose, onConfirm }) => {
  const [selected, setSelected] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (order) {
      const init = {};
      (order.items || []).forEach(item => { init[item.id] = 0; });
      setSelected(init);
    }
    setError('');
  }, [order, visible]);

  if (!order) return null;

  const refundItems = (order.items || []).filter(item => selected[item.id] > 0).map(item => ({
    ...item,
    quantity: selected[item.id],
  }));
  const refundAmount = refundItems.reduce((s, i) => s + i.price * i.quantity, 0);

  const handleConfirm = async () => {
    if (refundItems.length === 0) { setError('Select at least one item to refund.'); return; }
    setSaving(true);
    setError('');
    try {
      await onConfirm(order, refundItems, refundAmount);
      onClose();
    } catch (e) {
      setError(e.message || 'Refund failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={rm.overlay}>
        <View style={rm.sheet}>
          <View style={rm.header}>
            <View>
              <Text style={rm.title}>Process Refund</Text>
              <Text style={rm.subtitle}>Order #{order.id?.slice(-6).toUpperCase()}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={rm.closeBtn}>
              <X size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={rm.body} showsVerticalScrollIndicator={false}>
            <Text style={rm.sectionLabel}>SELECT ITEMS TO REFUND</Text>

            {(order.items || []).map(item => {
              const qty = selected[item.id] || 0;
              return (
                <View key={item.id} style={rm.itemRow}>
                  <View style={rm.itemInfo}>
                    <Text style={rm.itemName}>{item.name}</Text>
                    <Text style={rm.itemPrice}>${item.price.toFixed(2)} × {item.quantity}</Text>
                  </View>
                  <View style={rm.qtyControl}>
                    <TouchableOpacity
                      style={rm.qtyBtn}
                      onPress={() => setSelected(p => ({ ...p, [item.id]: Math.max(0, (p[item.id] || 0) - 1) }))}
                    >
                      <Minus size={14} color={Colors.text} />
                    </TouchableOpacity>
                    <Text style={rm.qtyVal}>{qty}</Text>
                    <TouchableOpacity
                      style={rm.qtyBtn}
                      onPress={() => setSelected(p => ({ ...p, [item.id]: Math.min(item.quantity, (p[item.id] || 0) + 1) }))}
                    >
                      <Plus size={14} color={Colors.text} />
                    </TouchableOpacity>
                  </View>
                  <Text style={rm.itemSubtotal}>${(item.price * qty).toFixed(2)}</Text>
                </View>
              );
            })}

            {error ? (
              <View style={rm.errorRow}>
                <AlertCircle size={15} color="#EF4444" />
                <Text style={rm.errorText}>{error}</Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={rm.footer}>
            <View style={rm.refundTotal}>
              <Text style={rm.refundTotalLabel}>Refund Amount</Text>
              <Text style={rm.refundTotalValue}>${refundAmount.toFixed(2)}</Text>
            </View>
            <View style={rm.footerBtns}>
              <TouchableOpacity style={rm.cancelBtn} onPress={onClose}>
                <Text style={rm.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[rm.confirmBtn, (saving || refundItems.length === 0) && { opacity: 0.5 }]}
                onPress={handleConfirm}
                disabled={saving || refundItems.length === 0}
              >
                {saving
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={rm.confirmText}>Confirm Refund</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── Transaction Detail Panel ─────────────────────────────────────────────────
const TransactionDetail = ({ order, onClose, onVoid, onRefund, onPrint, onEmail }) => {
  const isVoided = order.status === 'voided';
  const isRefunded = order.status === 'refunded';
  const canAct = !isVoided;

  return (
    <View style={td.panel}>
      <View style={td.header}>
        <View>
          <Text style={td.orderId}>#{order.id?.slice(-6).toUpperCase()}</Text>
          <StatusPill status={order.status || 'completed'} />
        </View>
        <TouchableOpacity onPress={onClose}>
          <X size={18} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Meta */}
        <View style={td.metaSection}>
          <View style={td.metaRow}>
            <Clock size={15} color={Colors.textMuted} />
            <Text style={td.metaText}>
              {order.timestamp?.toDate
                ? order.timestamp.toDate().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
                : 'Just now'}
            </Text>
          </View>
          <View style={td.metaRow}>
            <User size={15} color={Colors.textMuted} />
            <Text style={td.metaText}>{order.cashierName?.split('@')[0] || 'Cashier'}</Text>
          </View>
          <View style={td.metaRow}>
            <PaymentIcon method={order.paymentMethod} size={15} />
            <Text style={td.metaText}>{(order.paymentMethod || 'Cash').toUpperCase()}</Text>
          </View>
        </View>

        {/* Items */}
        <View style={td.section}>
          <Text style={td.sectionTitle}>ITEMS</Text>
          {(order.items || []).map((item, i) => (
            <View key={i} style={td.itemRow}>
              <View style={td.itemDot} />
              <Text style={td.itemName} numberOfLines={1}>{item.name}</Text>
              <Text style={td.itemQty}>×{item.quantity}</Text>
              <Text style={td.itemTotal}>${(item.price * item.quantity).toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={td.section}>
          <Text style={td.sectionTitle}>TOTALS</Text>
          <View style={td.totalRow}><Text style={td.totalLabel}>Subtotal</Text><Text style={td.totalVal}>${(order.subTotal || 0).toFixed(2)}</Text></View>
          <View style={td.totalRow}><Text style={td.totalLabel}>Tax</Text><Text style={td.totalVal}>${(order.tax || 0).toFixed(2)}</Text></View>
          {order.refundedAmount > 0 && (
            <View style={td.totalRow}>
              <Text style={[td.totalLabel, { color: '#F59E0B' }]}>Refunded</Text>
              <Text style={[td.totalVal, { color: '#F59E0B' }]}>-${(order.refundedAmount || 0).toFixed(2)}</Text>
            </View>
          )}
          <View style={[td.totalRow, td.grandTotal]}>
            <Text style={td.grandLabel}>Total</Text>
            <Text style={td.grandVal}>${(order.totalAmount || 0).toFixed(2)}</Text>
          </View>
        </View>

        {/* Refund history */}
        {(order.refunds || []).length > 0 && (
          <View style={td.section}>
            <Text style={td.sectionTitle}>REFUND HISTORY</Text>
            {order.refunds.map((r, i) => (
              <View key={i} style={td.refundHistoryRow}>
                <Text style={td.refundHistoryDate}>{new Date(r.refundedAt).toLocaleDateString()}</Text>
                <Text style={td.refundHistoryAmount}>-${Number(r.amount).toFixed(2)}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Actions */}
      <View style={td.actions}>
        <TouchableOpacity style={td.actionBtn} onPress={() => onPrint(order)}>
          <Printer size={15} color={Colors.primary} />
          <Text style={td.actionBtnText}>Print</Text>
        </TouchableOpacity>
        <TouchableOpacity style={td.actionBtn} onPress={() => onEmail(order)}>
          <Mail size={15} color={Colors.primary} />
          <Text style={td.actionBtnText}>Email</Text>
        </TouchableOpacity>
        {canAct && (
          <>
            <TouchableOpacity style={[td.actionBtn, td.refundBtn]} onPress={() => onRefund(order)}>
              <RotateCcw size={15} color="#F59E0B" />
              <Text style={[td.actionBtnText, { color: '#F59E0B' }]}>Refund</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[td.actionBtn, td.voidBtn]} onPress={() => onVoid(order)}>
              <XCircle size={15} color="#EF4444" />
              <Text style={[td.actionBtnText, { color: '#EF4444' }]}>Void</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
const Sales = ({ onNavigate, user }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateRange, setDateRange] = useState('30 Days');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundTarget, setRefundTarget] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const unsub = orderService.subscribeToOrders(data => {
      setOrders(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Date range cutoff ──────────────────────────────────────────────────────
  const dateCutoff = useMemo(() => {
    const now = new Date();
    if (dateRange === 'Today') { const d = new Date(now); d.setHours(0,0,0,0); return d; }
    if (dateRange === '7 Days') { const d = new Date(now); d.setDate(d.getDate()-7); return d; }
    if (dateRange === '30 Days') { const d = new Date(now); d.setDate(d.getDate()-30); return d; }
    return null;
  }, [dateRange]);

  // ── KPI summary ────────────────────────────────────────────────────────────
  const summary = useMemo(() => {
    const inRange = orders.filter(o => {
      const ts = o.timestamp?.toDate ? o.timestamp.toDate() : null;
      return !dateCutoff || (ts && ts >= dateCutoff);
    });
    const completed = inRange.filter(o => o.status !== 'voided');
    const revenue = completed.reduce((s, o) => s + (o.totalAmount || 0), 0);
    const refundedAmt = completed.reduce((s, o) => s + (o.refundedAmount || 0), 0);
    const cashTotal = completed.filter(o => (o.paymentMethod||'cash').toLowerCase() === 'cash').reduce((s,o)=>s+(o.totalAmount||0),0);
    const cardTotal = completed.filter(o => (o.paymentMethod||'').toLowerCase() === 'card').reduce((s,o)=>s+(o.totalAmount||0),0);
    const qrTotal = completed.filter(o => ['qr','qr code'].includes((o.paymentMethod||'').toLowerCase())).reduce((s,o)=>s+(o.totalAmount||0),0);

    const todayCutoff = new Date(); todayCutoff.setHours(0,0,0,0);
    const todayRev = orders.filter(o => {
      const ts = o.timestamp?.toDate ? o.timestamp.toDate() : null;
      return ts && ts >= todayCutoff && o.status !== 'voided';
    }).reduce((s,o)=>s+(o.totalAmount||0),0);

    return {
      totalRevenue: revenue,
      totalOrders: completed.length,
      returns: completed.filter(o => o.status === 'refunded').length,
      refundedAmt,
      netRevenue: revenue - refundedAmt,
      todayRevenue: todayRev,
      cashTotal,
      cardTotal,
      qrTotal,
    };
  }, [orders, dateCutoff]);

  // ── Filtered orders ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return orders.filter(o => {
      const ts = o.timestamp?.toDate ? o.timestamp.toDate() : null;
      if (dateCutoff && ts && ts < dateCutoff) return false;
      if (q && !o.id.toLowerCase().includes(q) && !(o.cashierName||'').toLowerCase().includes(q)) return false;
      if (paymentFilter !== 'All') {
        const m = (o.paymentMethod||'cash').toLowerCase();
        if (paymentFilter === 'Cash' && m !== 'cash') return false;
        if (paymentFilter === 'Card' && m !== 'card') return false;
        if (paymentFilter === 'QR Code' && !['qr','qr code'].includes(m)) return false;
      }
      if (statusFilter !== 'All' && (o.status||'completed').toLowerCase() !== statusFilter.toLowerCase()) return false;
      return true;
    });
  }, [orders, dateCutoff, searchQuery, paymentFilter, statusFilter]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleVoid = async (order) => {
    const confirmed = typeof window !== 'undefined'
      ? window.confirm(`Void Order #${order.id.slice(-6).toUpperCase()}? This will restore stock.`)
      : true;
    if (!confirmed) return;
    try {
      await orderService.voidOrder(order);
      if (selectedOrder?.id === order.id) setSelectedOrder(null);
      showToast('Order voided and stock restored.');
    } catch (e) {
      showToast(e.message || 'Failed to void order.', 'error');
    }
  };

  const handleRefund = (order) => {
    setRefundTarget(order);
    setShowRefundModal(true);
  };

  const confirmRefund = async (order, items, amount) => {
    await orderService.refundOrder(order, items, amount);
    if (selectedOrder?.id === order.id) {
      setSelectedOrder(prev => ({ ...prev, status: 'refunded', refundedAmount: (prev.refundedAmount||0) + amount }));
    }
    showToast(`Refund of $${amount.toFixed(2)} processed.`);
  };

  const handleExportCSV = async () => {
    try {
      const csv = orderService.exportToCSV(filtered);
      const filename = `sales_${dateRange.replace(' ','_')}_${new Date().toISOString().slice(0,10)}.csv`;

      if (Platform.OS === 'web') {
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const fileUri = `${FileSystem.documentDirectory}${filename}`;
        await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri);
        } else {
          showToast('Sharing not available on this device.', 'error');
          return;
        }
      }
      showToast('CSV exported successfully.');
    } catch (error) {
      showToast('Failed to export CSV.', 'error');
    }
  };

  // ── Render row ─────────────────────────────────────────────────────────────
  const renderRow = (order) => {
    const isSelected = selectedOrder?.id === order.id;
    const ts = order.timestamp?.toDate ? order.timestamp.toDate() : null;
    return (
      <TouchableOpacity
        key={order.id}
        style={[styles.row, isSelected && styles.rowSelected]}
        onPress={() => setSelectedOrder(isSelected ? null : order)}
      >
        <View style={styles.rowIcon}>
          <Receipt size={18} color={order.status === 'voided' ? '#EF4444' : Colors.primary} />
        </View>
        <View style={styles.rowMain}>
          <View style={styles.rowTop}>
            <Text style={styles.rowOrderId}>#{order.id.slice(-6).toUpperCase()}</Text>
            <StatusPill status={order.status || 'completed'} />
          </View>
          <Text style={styles.rowMeta}>
            {order.cashierName?.split('@')[0] || 'Cashier'} · {ts ? ts.toLocaleDateString('en-US', {month:'short',day:'numeric'}) + ' ' + ts.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}) : 'Just now'}
          </Text>
        </View>
        <View style={styles.rowRight}>
          <View style={styles.rowPaymentRow}>
            <PaymentIcon method={order.paymentMethod} />
          </View>
          <Text style={[
            styles.rowAmount,
            order.status === 'voided' && { textDecorationLine: 'line-through', color: Colors.textMuted },
          ]}>
            ${(order.totalAmount || 0).toFixed(2)}
          </Text>
        </View>
        <ChevronRight size={16} color={Colors.textMuted} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Sidebar onNavigate={onNavigate} activeScreen="Sales" user={user} />

      <View style={styles.main}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Sales</Text>
            <Text style={styles.subtitle}>Transaction management & reporting</Text>
          </View>
          <View style={styles.headerActions}>
            {/* Date picker */}
            <View style={{ position: 'relative' }}>
              <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(!showDatePicker)}>
                <Calendar size={15} color={Colors.text} />
                <Text style={styles.dateBtnText}>{dateRange}</Text>
                <ChevronDown size={15} color={Colors.text} />
              </TouchableOpacity>
              {showDatePicker && (
                <View style={styles.dateDrop}>
                  {DATE_RANGES.map(r => (
                    <TouchableOpacity key={r} style={styles.dateDropItem} onPress={() => { setDateRange(r); setShowDatePicker(false); }}>
                      {r === dateRange && <CheckCircle2 size={14} color={Colors.primary} />}
                      <Text style={[styles.dateDropText, r === dateRange && { color: Colors.primary, fontWeight:'700' }]}>{r}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            {/* Export */}
            <TouchableOpacity style={styles.exportBtn} onPress={handleExportCSV}>
              <Download size={15} color={Colors.primary} />
              <Text style={styles.exportBtnText}>Export CSV</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* KPI Cards */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.kpiScroll}>
          <KpiCard label="Net Revenue" value={`$${summary.netRevenue.toFixed(2)}`} icon={TrendingUp} color="#8B5CF6" />
          <KpiCard label="Transactions" value={summary.totalOrders} icon={Receipt} color="#3B82F6" />
          <KpiCard label="Today's Sales" value={`$${summary.todayRevenue.toFixed(2)}`} icon={Calendar} color="#10B981" />
          <KpiCard label="Total Refunds" value={summary.returns} icon={RotateCcw} color="#F59E0B" sub={`$${summary.refundedAmt.toFixed(2)} refunded`} />
          <KpiCard label="Cash" value={`$${summary.cashTotal.toFixed(2)}`} icon={Banknote} color="#10B981" />
          <KpiCard label="Card" value={`$${summary.cardTotal.toFixed(2)}`} icon={CreditCard} color="#3B82F6" />
          <KpiCard label="QR Code" value={`$${summary.qrTotal.toFixed(2)}`} icon={QrCode} color="#8B5CF6" />
        </ScrollView>

        {/* Search & filters */}
        <View style={styles.filterBar}>
          <View style={styles.searchBox}>
            <Search size={15} color={Colors.textMuted} />
            <TextInput
              placeholder="Search by order ID or cashier..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
              placeholderTextColor={Colors.textMuted}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <XCircle size={15} color={Colors.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {PAYMENT_FILTERS.map(f => (
              <TouchableOpacity key={f} style={[styles.chip, paymentFilter === f && styles.chipActive]} onPress={() => setPaymentFilter(f)}>
                <Text style={[styles.chipText, paymentFilter === f && styles.chipTextActive]}>{f}</Text>
              </TouchableOpacity>
            ))}
            <View style={styles.chipDivider} />
            {STATUS_FILTERS.map(f => (
              <TouchableOpacity key={f} style={[styles.chip, statusFilter === f && styles.chipActive]} onPress={() => setStatusFilter(f)}>
                <Text style={[styles.chipText, statusFilter === f && styles.chipTextActive]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.loader}><ActivityIndicator size="large" color={Colors.primary} /></View>
        ) : (
          <View style={styles.contentArea}>
            {/* Transaction list */}
            <View style={styles.listCard}>
              <View style={styles.listHeader}>
                <Text style={styles.listTitle}>Transactions</Text>
                <Text style={styles.listCount}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</Text>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {filtered.length > 0
                  ? filtered.map(o => renderRow(o))
                  : (
                    <View style={styles.emptyState}>
                      <ShoppingBag size={50} color={Colors.border} />
                      <Text style={styles.emptyTitle}>No transactions found</Text>
                      <Text style={styles.emptyText}>Adjust your filters to see more results.</Text>
                    </View>
                  )
                }
              </ScrollView>
            </View>

            {/* Detail panel */}
            {selectedOrder && (
              <TransactionDetail
                order={selectedOrder}
                onClose={() => setSelectedOrder(null)}
                onVoid={handleVoid}
                onRefund={handleRefund}
                onPrint={receiptService.generateReceipt}
                onEmail={receiptService.emailReceipt}
              />
            )}
          </View>
        )}
      </View>

      {/* Refund modal */}
      <RefundModal
        visible={showRefundModal}
        order={refundTarget}
        onClose={() => { setShowRefundModal(false); setRefundTarget(null); }}
        onConfirm={confirmRefund}
      />

      {/* Toast */}
      {toast && (
        <View style={[styles.toast, toast.type === 'error' ? styles.toastError : styles.toastSuccess]}>
          {toast.type === 'error'
            ? <AlertCircle size={15} color="#fff" />
            : <CheckCircle2 size={15} color="#fff" />}
          <Text style={styles.toastText}>{toast.msg}</Text>
        </View>
      )}
    </View>
  );
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
const KpiCard = ({ icon: Icon, label, value, color, sub }) => (
  <View style={kpi.card}>
    <View style={[kpi.icon, { backgroundColor: color + '18' }]}>
      <Icon size={18} color={color} />
    </View>
    <View>
      <Text style={kpi.label}>{label}</Text>
      <Text style={[kpi.value, { color }]}>{value}</Text>
      {sub ? <Text style={kpi.sub}>{sub}</Text> : null}
    </View>
  </View>
);

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', backgroundColor: Colors.background },
  main: { flex: 1, padding: 28, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text },
  subtitle: { fontSize: 14, color: Colors.textMuted, marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, borderWidth: 1, borderColor: Colors.border },
  dateBtnText: { fontSize: 14, fontWeight: '600', color: Colors.text },
  dateDrop: { position: 'absolute', top: 46, right: 0, zIndex: 99, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: Colors.border, shadowColor: '#000', shadowOffset: { width:0, height:8 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 8, minWidth: 150, overflow: 'hidden' },
  dateDropItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  dateDropText: { fontSize: 14, fontWeight: '600', color: Colors.textMuted },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, borderWidth: 1, borderColor: Colors.border },
  exportBtnText: { fontSize: 14, fontWeight: '600', color: Colors.primary },

  kpiScroll: { flexDirection: 'row', marginBottom: 20 },

  filterBar: { marginBottom: 16 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, height: 46, borderWidth: 1, borderColor: Colors.border, marginBottom: 10 },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text },
  chipRow: { flexDirection: 'row' },
  chip: { paddingHorizontal: 16, paddingVertical: 6, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: Colors.border, marginRight: 8 },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  chipTextActive: { color: '#fff' },
  chipDivider: { width: 1, backgroundColor: Colors.border, marginRight: 8, marginVertical: 4 },

  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  contentArea: { flex: 1, flexDirection: 'row', gap: 16 },

  listCard: { flex: 1, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  listTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  listCount: { fontSize: 13, fontWeight: '600', color: Colors.textMuted },

  row: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 12 },
  rowSelected: { backgroundColor: '#F0FDF4' },
  rowIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
  rowMain: { flex: 1 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  rowOrderId: { fontSize: 15, fontWeight: '700', color: Colors.text },
  rowMeta: { fontSize: 12, color: Colors.textMuted },
  rowRight: { alignItems: 'flex-end', gap: 3 },
  rowPaymentRow: { flexDirection: 'row', alignItems: 'center' },
  rowAmount: { fontSize: 16, fontWeight: '800', color: Colors.text },

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 48, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.textMuted },
  emptyText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center' },

  toast: { position: 'absolute', bottom: 28, left: '50%', transform: [{ translateX: -160 }], width: 320, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingVertical: 13, borderRadius: 14 },
  toastSuccess: { backgroundColor: Colors.primary },
  toastError: { backgroundColor: '#EF4444' },
  toastText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

const kpi = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginRight: 12, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: Colors.border, minWidth: 160 },
  icon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
  value: { fontSize: 20, fontWeight: '800' },
  sub: { fontSize: 10, color: Colors.textMuted, fontWeight: '600', marginTop: 1 },
});

const td = StyleSheet.create({
  panel: { width: 320, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', flexDirection: 'column' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  orderId: { fontSize: 18, fontWeight: '800', color: Colors.text, marginBottom: 6 },
  metaSection: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  metaText: { fontSize: 13, color: Colors.text, fontWeight: '500' },
  section: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  sectionTitle: { fontSize: 10, fontWeight: '800', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  itemDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary },
  itemName: { flex: 1, fontSize: 13, color: Colors.text, fontWeight: '500' },
  itemQty: { fontSize: 12, color: Colors.textMuted },
  itemTotal: { fontSize: 13, fontWeight: '700', color: Colors.text },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  totalLabel: { fontSize: 13, color: Colors.textMuted },
  totalVal: { fontSize: 13, fontWeight: '600', color: Colors.text },
  grandTotal: { marginTop: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.border },
  grandLabel: { fontSize: 15, fontWeight: '800', color: Colors.text },
  grandVal: { fontSize: 17, fontWeight: '800', color: Colors.primary },
  refundHistoryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  refundHistoryDate: { fontSize: 12, color: Colors.textMuted },
  refundHistoryAmount: { fontSize: 12, fontWeight: '700', color: '#F59E0B' },
  actions: { flexDirection: 'row', padding: 12, gap: 8, borderTopWidth: 1, borderTopColor: Colors.border },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, backgroundColor: '#fff' },
  refundBtn: { borderColor: '#FEF3C7', backgroundColor: '#FFFBEB' },
  voidBtn: { borderColor: '#FECACA', backgroundColor: '#FFF5F5' },
  actionBtnText: { fontSize: 13, fontWeight: '700', color: Colors.primary },
});

const pill = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  text: { fontSize: 10, fontWeight: '800' },
});

const rm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  sheet: { backgroundColor: '#fff', borderRadius: 24, width: 500, maxHeight: '80%', overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 24, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontSize: 20, fontWeight: '800', color: Colors.text },
  subtitle: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  closeBtn: { padding: 6 },
  body: { padding: 24 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 14 },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  itemPrice: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  qtyControl: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qtyBtn: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  qtyVal: { fontSize: 15, fontWeight: '700', color: Colors.text, width: 24, textAlign: 'center' },
  itemSubtotal: { width: 64, textAlign: 'right', fontSize: 14, fontWeight: '700', color: Colors.text },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF5F5', borderRadius: 10, padding: 12, marginTop: 14, borderWidth: 1, borderColor: '#FECACA' },
  errorText: { color: '#DC2626', fontSize: 13, fontWeight: '600', flex: 1 },
  footer: { padding: 24, borderTopWidth: 1, borderTopColor: Colors.border },
  refundTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  refundTotalLabel: { fontSize: 15, fontWeight: '700', color: Colors.text },
  refundTotalValue: { fontSize: 22, fontWeight: '900', color: Colors.primary },
  footerBtns: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelText: { fontWeight: '700', color: Colors.text, fontSize: 15 },
  confirmBtn: { flex: 2, paddingVertical: 13, borderRadius: 12, backgroundColor: '#F59E0B', alignItems: 'center' },
  confirmText: { fontWeight: '800', color: '#fff', fontSize: 15 },
});

export default Sales;
