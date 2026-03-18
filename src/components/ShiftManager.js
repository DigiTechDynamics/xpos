import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import {
  Clock,
  DollarSign,
  CreditCard,
  Banknote,
  QrCode,
  CheckCircle2,
  AlertCircle,
  X,
  Play,
  Square,
  Receipt,
  TrendingUp,
} from 'lucide-react-native';
import Colors from '../constants/Colors';
import { shiftService } from '../services/shiftService';
import { orderService } from '../services/orderService';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => `$${Number(n || 0).toFixed(2)}`;
const elapsed = (ts) => {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

// ─── Shift Manager Modal ──────────────────────────────────────────────────────
const ShiftManager = ({ visible, user, activeShift, onShiftChange, onClose }) => {
  const [step, setStep] = useState('summary'); // 'summary' | 'open' | 'close'
  const [openingFloat, setOpeningFloat] = useState('');
  const [closingFloat, setClosingFloat] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasReconciled, setHasReconciled] = useState(false);
  const [shiftOrders, setShiftOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  useEffect(() => {
    if (!visible) { setStep('summary'); setError(''); setHasReconciled(false); setClosingFloat(''); setNotes(''); return; }
    if (activeShift) {
      // Load orders for this shift's time range
      setOrdersLoading(true);
      const unsub = orderService.subscribeToOrders(all => {
        const shiftStart = activeShift.openedAt?.toDate?.() || new Date(0);
        const inShift = all.filter(o => {
          const ts = o.timestamp?.toDate?.();
          return ts && ts >= shiftStart;
        });
        setShiftOrders(inShift);
        setOrdersLoading(false);
      });
      return () => unsub();
    }
  }, [visible, activeShift]);

  // Shift stats from orders
  const stats = shiftOrders.reduce((acc, o) => {
    if (o.status === 'voided') return acc;
    acc.totalRevenue += o.totalAmount || 0;
    acc.totalOrders += 1;
    const m = (o.paymentMethod || 'cash').toLowerCase();
    if (m === 'cash') acc.cash += o.totalAmount || 0;
    else if (m === 'card') acc.card += o.totalAmount || 0;
    else acc.qr += o.totalAmount || 0;
    return acc;
  }, { totalRevenue: 0, totalOrders: 0, cash: 0, card: 0, qr: 0 });

  const expectedCash = (activeShift?.openingFloat || 0) + stats.cash;

  const handleOpenShift = async () => {
    setLoading(true); setError('');
    try {
      const shiftId = await shiftService.openShift({
        cashierId: user.uid,
        cashierName: user.email,
        openingFloat: parseFloat(openingFloat) || 0,
      });
      onShiftChange({ id: shiftId, cashierId: user.uid, cashierName: user.email, status: 'open', openingFloat: parseFloat(openingFloat) || 0 });
      setStep('summary');
    } catch (e) {
      setError(e.message || 'Failed to open shift.');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseShift = async () => {
    if (!activeShift) return;
    setLoading(true); setError('');
    try {
      await shiftService.closeShift(activeShift.id, {
        closingFloat: parseFloat(closingFloat) || 0,
        totalCash: stats.cash,
        totalCard: stats.card,
        totalQR: stats.qr,
        totalOrders: stats.totalOrders,
        totalRevenue: stats.totalRevenue,
        notes,
      });
      onShiftChange(null);
      onClose();
    } catch (e) {
      setError(e.message || 'Failed to close shift.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          {/* Header */}
          <View style={s.header}>
            <View style={s.headerLeft}>
              <Clock size={20} color={activeShift ? '#10B981' : Colors.textMuted} />
              <Text style={s.title}>
                {activeShift ? 'Active Shift' : 'No Active Shift'}
              </Text>
              {activeShift && (
                <View style={s.activePill}>
                  <Text style={s.activePillText}>OPEN · {elapsed(activeShift.openedAt)}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={onClose}><X size={18} color={Colors.textMuted} /></TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24 }}>
            {/* ── No shift open ── */}
            {!activeShift && step === 'summary' && (
              <View style={s.emptyState}>
                <Clock size={48} color={Colors.border} />
                <Text style={s.emptyTitle}>No shift is open</Text>
                <Text style={s.emptyText}>Open a shift before processing sales to enable cash reconciliation and shift reports.</Text>
                <TouchableOpacity style={s.openBtn} onPress={() => setStep('open')}>
                  <Play size={16} color="#fff" />
                  <Text style={s.openBtnText}>Open Shift</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── Open shift form ── */}
            {step === 'open' && (
              <View>
                <Text style={s.sectionLabel}>OPENING FLOAT (CASH IN DRAWER)</Text>
                <View style={s.inputRow}>
                  <Text style={s.currSign}>$</Text>
                  <TextInput
                    style={s.bigInput}
                    placeholder="0.00"
                    value={openingFloat}
                    onChangeText={setOpeningFloat}
                    keyboardType="numeric"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
                {error ? <Text style={s.error}>{error}</Text> : null}
                <View style={s.formBtns}>
                  <TouchableOpacity style={s.cancelBtn} onPress={() => setStep('summary')}>
                    <Text style={s.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.confirmBtn} onPress={handleOpenShift} disabled={loading}>
                    {loading ? <ActivityIndicator color="#fff" /> : <>
                      <Play size={15} color="#fff" />
                      <Text style={s.confirmText}>Start Shift</Text>
                    </>}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ── Active shift summary ── */}
            {activeShift && step === 'summary' && (
              <View>
                <View style={s.statsGrid}>
                  <StatBox icon={TrendingUp} label="Revenue" value={fmt(stats.totalRevenue)} color="#10B981" />
                  <StatBox icon={Receipt} label="Orders" value={stats.totalOrders} color="#3B82F6" />
                  <StatBox icon={Banknote} label="Cash" value={fmt(stats.cash)} color="#10B981" />
                  <StatBox icon={CreditCard} label="Card" value={fmt(stats.card)} color="#3B82F6" />
                  <StatBox icon={QrCode} label="QR" value={fmt(stats.qr)} color="#8B5CF6" />
                  <StatBox icon={DollarSign} label="Float" value={fmt(activeShift.openingFloat)} color="#F59E0B" />
                </View>

                <TouchableOpacity style={s.closeShiftBtn} onPress={() => setStep('close')}>
                  <Square size={15} color="#EF4444" />
                  <Text style={s.closeShiftText}>Close Shift</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── Close shift form ── */}
            {activeShift && step === 'close' && (
              <View>
                {!hasReconciled ? (
                  <>
                    <Text style={[s.sectionLabel, { marginTop: 16 }]}>BLIND CLOSE: ACTUAL CASH IN DRAWER</Text>
                    <Text style={{ fontSize: 13, color: Colors.textMuted, marginBottom: 16 }}>
                      Count your drawer and enter the exact cash amount. Expected totals will be revealed after reconciliation.
                    </Text>
                    <View style={s.inputRow}>
                      <Text style={s.currSign}>$</Text>
                      <TextInput
                        style={s.bigInput}
                        placeholder="0.00"
                        value={closingFloat}
                        onChangeText={setClosingFloat}
                        keyboardType="numeric"
                        placeholderTextColor={Colors.textMuted}
                      />
                    </View>
                    
                    <View style={s.formBtns}>
                      <TouchableOpacity style={s.cancelBtn} onPress={() => setStep('summary')}>
                        <Text style={s.cancelText}>Back</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[s.confirmBtn, { backgroundColor: '#3B82F6' }, !closingFloat && {opacity: 0.5}]} 
                        onPress={() => closingFloat ? setHasReconciled(true) : null} 
                        disabled={!closingFloat}
                      >
                        <CheckCircle2 size={15} color="#fff" />
                        <Text style={s.confirmText}>Reconcile</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={s.closeSummary}>
                      <Text style={s.sectionLabel}>SHIFT SUMMARY (REVEALED)</Text>
                      <View style={s.recapRow}><Text style={s.recapLabel}>Opening Float</Text><Text style={s.recapVal}>{fmt(activeShift.openingFloat)}</Text></View>
                      <View style={s.recapRow}><Text style={s.recapLabel}>Cash Sales</Text><Text style={s.recapVal}>{fmt(stats.cash)}</Text></View>
                      <View style={s.recapRow}><Text style={s.recapLabel}>Card/QR Sales</Text><Text style={s.recapVal}>{fmt(stats.card + stats.qr)}</Text></View>
                      <View style={[s.recapRow, { borderTopWidth: 1, borderTopColor: Colors.border, marginTop: 8, paddingTop: 8 }]}>
                        <Text style={[s.recapLabel, { fontWeight: '800', color: Colors.text }]}>Expected Drawer Cash</Text>
                        <Text style={[s.recapVal, { color: Colors.primary }]}>{fmt(expectedCash)}</Text>
                      </View>
                    </View>

                    <Text style={[s.sectionLabel, { marginTop: 16 }]}>ACTUAL CASH IN DRAWER</Text>
                    <View style={[s.inputRow, { opacity: 0.7, backgroundColor: '#F1F5F9' }]}>
                      <Text style={s.currSign}>$</Text>
                      <TextInput
                        style={s.bigInput}
                        value={closingFloat}
                        editable={false}
                      />
                    </View>
                    
                    <View style={[s.varianceRow, { backgroundColor: parseFloat(closingFloat) >= expectedCash ? '#F0FDF4' : '#FFF5F5' }]}>
                      <Text style={s.varianceLabel}>Discrepancy (Overage/Shortage):</Text>
                      <Text style={[s.varianceVal, { color: parseFloat(closingFloat) >= expectedCash ? '#10B981' : '#EF4444' }]}>
                        {parseFloat(closingFloat) >= expectedCash ? '+' : ''}{fmt(parseFloat(closingFloat) - expectedCash)}
                      </Text>
                    </View>

                    <Text style={[s.sectionLabel, { marginTop: 16 }]}>NOTES {Math.abs(parseFloat(closingFloat) - expectedCash) > 0.01 ? '(REQUIRED FOR DISCREPANCY)' : '(OPTIONAL)'}</Text>
                    <TextInput
                      style={s.notesInput}
                      placeholder="Any notes about this shift..."
                      value={notes}
                      onChangeText={setNotes}
                      multiline
                      numberOfLines={3}
                      placeholderTextColor={Colors.textMuted}
                    />

                    {error ? <Text style={s.error}>{error}</Text> : null}

                    <View style={s.formBtns}>
                      <TouchableOpacity style={s.cancelBtn} onPress={() => setHasReconciled(false)}>
                        <Text style={s.cancelText}>Recount</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[s.confirmBtn, { backgroundColor: '#EF4444' }, (Math.abs(parseFloat(closingFloat) - expectedCash) > 0.01 && !notes) && {opacity: 0.5}]} 
                        onPress={handleCloseShift} 
                        disabled={loading || (Math.abs(parseFloat(closingFloat) - expectedCash) > 0.01 && !notes)}
                      >
                        {loading ? <ActivityIndicator color="#fff" /> : <>
                          <Square size={15} color="#fff" />
                          <Text style={s.confirmText}>Confirm & Close</Text>
                        </>}
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const StatBox = ({ icon: Icon, label, value, color }) => (
  <View style={s.statBox}>
    <Icon size={16} color={color} />
    <Text style={s.statLabel}>{label}</Text>
    <Text style={[s.statValue, { color }]}>{value}</Text>
  </View>
);

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  sheet: { backgroundColor: '#fff', borderRadius: 24, width: 480, maxHeight: '85%', overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 18, fontWeight: '800', color: Colors.text },
  activePill: { backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  activePillText: { fontSize: 10, fontWeight: '800', color: '#166534' },

  sectionLabel: { fontSize: 10, fontWeight: '800', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 14, paddingHorizontal: 16, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  currSign: { fontSize: 24, fontWeight: '800', color: Colors.textMuted, marginRight: 4 },
  bigInput: { flex: 1, fontSize: 32, fontWeight: '800', color: Colors.text, paddingVertical: 16 },
  notesInput: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.border, fontSize: 14, color: Colors.text, marginBottom: 16, minHeight: 80 },
  formBtns: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelText: { fontWeight: '700', color: Colors.text, fontSize: 15 },
  confirmBtn: { flex: 2, paddingVertical: 13, borderRadius: 12, backgroundColor: Colors.primary, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  confirmText: { fontWeight: '800', color: '#fff', fontSize: 15 },
  error: { color: '#EF4444', fontSize: 13, fontWeight: '600', marginBottom: 12 },

  emptyState: { alignItems: 'center', paddingVertical: 24, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: Colors.text },
  emptyText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', maxWidth: 300 },
  openBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 13, borderRadius: 12, marginTop: 8 },
  openBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  statBox: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: Colors.border, minWidth: '30%', flex: 1 },
  statLabel: { fontSize: 11, fontWeight: '600', color: Colors.textMuted },
  statValue: { fontSize: 16, fontWeight: '800' },

  closeShiftBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FFF5F5', borderWidth: 1, borderColor: '#FECACA', borderRadius: 12, paddingVertical: 13 },
  closeShiftText: { color: '#EF4444', fontWeight: '800', fontSize: 15 },

  closeSummary: { backgroundColor: '#F8FAFC', borderRadius: 14, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
  recapRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  recapLabel: { fontSize: 13, color: Colors.textMuted },
  recapVal: { fontSize: 13, fontWeight: '700', color: Colors.text },
  varianceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12 },
  varianceLabel: { fontSize: 13, fontWeight: '700', color: Colors.text },
  varianceVal: { fontSize: 15, fontWeight: '800' },
});

export default ShiftManager;
