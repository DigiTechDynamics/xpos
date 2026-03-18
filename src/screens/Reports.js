import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Calendar,
  Filter,
  Search,
  XCircle,
  Printer,
  CreditCard,
  Banknote,
  QrCode,
  ChevronDown,
  CheckCircle,
  BarChart2,
  Undo,
  Award,
  Share,
} from 'lucide-react-native';
import Colors from '../constants/Colors';
import { orderService } from '../services/orderService';
import { receiptService } from '../services/receiptService';
import Sidebar from '../components/Sidebar';

// ─── Sub-components ────────────────────────────────────────────────────────

const StatCard = ({ title, value, icon: Icon, color, sub }) => (
  <View style={styles.statCard}>
    <View style={[styles.iconContainer, { backgroundColor: color + '18' }]}>
      <Icon size={22} color={color} />
    </View>
    <View style={styles.statTextContainer}>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  </View>
);

const PaymentIcon = ({ method }) => {
  const m = (method || '').toLowerCase();
  if (m === 'card') return <CreditCard size={14} color="#3B82F6" />;
  if (m === 'qr' || m === 'qr code') return <QrCode size={14} color="#8B5CF6" />;
  return <Banknote size={14} color="#10B981" />;
};

// ─── Main Component ─────────────────────────────────────────────────────────

const DATE_RANGES = ['Today', '7 Days', '30 Days', 'All Time'];
const PAYMENT_FILTERS = ['All', 'Cash', 'Card', 'QR Code'];

const Reports = ({ onNavigate, user }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [dateRange, setDateRange] = useState('30 Days');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState(null);

  const [showRefundModal, setShowRefundModal] = useState(false);
  const [activeRefundOrder, setActiveRefundOrder] = useState(null);
  const [refundSelections, setRefundSelections] = useState({});
  
  const handleConfirmRefund = () => {
    const refundItems = [];
    let refundAmount = 0;
    
    if (!activeRefundOrder) return;
    
    for (const item of activeRefundOrder.items) {
      const qtyToRefund = refundSelections[item.id] || 0;
      if (qtyToRefund > 0) {
        refundItems.push({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: qtyToRefund
        });
        refundAmount += item.price * qtyToRefund;
      }
    }
    
    if (refundItems.length === 0) {
      if (typeof window !== 'undefined') window.alert('Please select items to refund.');
      else Alert.alert('No Items', 'Please select items to refund.');
      return;
    }
    
    orderService.refundOrder(activeRefundOrder, refundItems, refundAmount)
      .then(() => {
        if (typeof window !== 'undefined') window.alert(`$${refundAmount.toFixed(2)} refunded successfully.`);
        else Alert.alert('Refund Processed', `$${refundAmount.toFixed(2)} refunded successfully.`);
        setShowRefundModal(false);
      })
      .catch(e => {
        if (typeof window !== 'undefined') window.alert(e.message);
        else Alert.alert('Error', e.message);
      });
  };

  useEffect(() => {
    const unsubscribe = orderService.subscribeToOrders((fetchedOrders) => {
      setOrders(fetchedOrders);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // ── Date range helper ────────────────────────────────────────────────────
  const getDateCutoff = () => {
    const now = new Date();
    if (dateRange === 'Today') {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    if (dateRange === '7 Days') {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return d;
    }
    if (dateRange === '30 Days') {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      return d;
    }
    return null;
  };

  // ── Filtered orders ───────────────────────────────────────────────────────
  const rangeFilteredOrders = useMemo(() => {
    const cutoff = getDateCutoff();
    return orders.filter(order => {
      const ts = order.timestamp?.toDate ? order.timestamp.toDate() : null;
      if (cutoff && ts && ts < cutoff) return false;
      return true;
    });
  }, [orders, dateRange]);

  const filteredOrders = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return rangeFilteredOrders.filter(order => {
      const matchesSearch =
        order.id.toLowerCase().includes(q) ||
        (order.cashierName || '').toLowerCase().includes(q);
      const matchesPayment =
        paymentFilter === 'All' ||
        (order.paymentMethod || '').toLowerCase() === paymentFilter.toLowerCase() ||
        (paymentFilter === 'QR Code' && (order.paymentMethod || '').toLowerCase() === 'qr');
      return matchesSearch && matchesPayment;
    });
  }, [rangeFilteredOrders, searchQuery, paymentFilter]);

  // ── Metrics ───────────────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const totalRevenue = rangeFilteredOrders.reduce(
      (sum, o) => sum + (o.status !== 'voided' ? o.totalAmount || 0 : 0), 0
    );
    const completedOrders = rangeFilteredOrders.filter(o => o.status !== 'voided');
    const avgOrderValue = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;

    const todayCutoff = new Date();
    todayCutoff.setHours(0, 0, 0, 0);
    const todaySales = orders.filter(o => {
      const ts = o.timestamp?.toDate ? o.timestamp.toDate() : null;
      return ts && ts >= todayCutoff && o.status !== 'voided';
    }).reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    // Top products
    const productStats = {};
    rangeFilteredOrders.forEach(order => {
      if (order.status === 'voided') return;
      (order.items || []).forEach(item => {
        if (!productStats[item.id]) {
          productStats[item.id] = { name: item.name, quantity: 0, revenue: 0 };
        }
        productStats[item.id].quantity += item.quantity || 1;
        productStats[item.id].revenue += item.price * (item.quantity || 1);
      });
    });
    const productArray = Object.values(productStats);
    const topByVolume = [...productArray].sort((a, b) => b.quantity - a.quantity).slice(0, 5);
    const topByRevenue = [...productArray].sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    // 7-day trend (always show last 7 days regardless of filter)
    const trend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toDateString();
      const label = date.toLocaleDateString('en-US', { weekday: 'short' });
      const revenue = orders
        .filter(o => {
          const ts = o.timestamp?.toDate ? o.timestamp.toDate() : null;
          return ts && ts.toDateString() === dateStr && o.status !== 'voided';
        })
        .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      trend.push({ label, revenue, date: dateStr });
    }

    // Payment method breakdown
    const paymentBreakdown = { cash: 0, card: 0, qr: 0 };
    rangeFilteredOrders.forEach(o => {
      if (o.status === 'voided') return;
      const m = (o.paymentMethod || 'cash').toLowerCase();
      if (m === 'card') paymentBreakdown.card += o.totalAmount || 0;
      else if (m === 'qr' || m === 'qr code') paymentBreakdown.qr += o.totalAmount || 0;
      else paymentBreakdown.cash += o.totalAmount || 0;
    });

    return {
      totalRevenue,
      totalOrders: completedOrders.length,
      todaySales,
      avgOrderValue,
      topByVolume,
      topByRevenue,
      trend,
      paymentBreakdown,
      voidedCount: rangeFilteredOrders.filter(o => o.status === 'voided').length,
    };
  }, [rangeFilteredOrders, orders]);

  // ── Void handler ─────────────────────────────────────────────────────────
  const handleVoidOrder = (order) => {
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(
        `Void Order #${order.id.slice(-6).toUpperCase()}?\nThis will restore stock for all items.`
      );
      if (!confirmed) return;
      orderService.voidOrder(order)
        .then(() => window.alert('Order voided and stock restored.'))
        .catch(e => window.alert('Error: ' + (e.message || 'Failed to void order.')));
    } else {
      Alert.alert('Void Order', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Void', style: 'destructive',
          onPress: () => orderService.voidOrder(order)
            .then(() => Alert.alert('Success', 'Order voided.'))
            .catch(e => Alert.alert('Error', e.message || 'Failed.'))
        }
      ]);
    }
  };

  // ── Chart ─────────────────────────────────────────────────────────────────
  const renderChart = () => {
    const maxRevenue = Math.max(...metrics.trend.map(t => t.revenue), 1);
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <BarChart2 size={20} color={Colors.primary} />
          <Text style={styles.cardTitle}>7-Day Revenue Trend</Text>
        </View>
        <View style={styles.chartBars}>
          {metrics.trend.map((day, idx) => {
            const heightPct = day.revenue > 0 ? (day.revenue / maxRevenue) * 100 : 2;
            const isToday = day.date === new Date().toDateString();
            return (
              <View key={idx} style={styles.barItem}>
                <Text style={styles.barValue}>
                  {day.revenue > 0 ? `$${day.revenue >= 1000 ? (day.revenue / 1000).toFixed(1) + 'k' : day.revenue.toFixed(0)}` : ''}
                </Text>
                <View style={styles.barBackground}>
                  <View
                    style={[
                      styles.barFill,
                      { height: `${heightPct}%` },
                      isToday && styles.barFillToday,
                    ]}
                  />
                </View>
                <Text style={[styles.barLabel, isToday && { color: Colors.primary, fontWeight: '700' }]}>
                  {day.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  // ── Payment breakdown ─────────────────────────────────────────────────────
  const renderPaymentBreakdown = () => {
    const { cash, card, qr } = metrics.paymentBreakdown;
    const total = cash + card + qr || 1;
    const items = [
      { label: 'Cash', value: cash, icon: Banknote, color: '#10B981' },
      { label: 'Card', value: card, icon: CreditCard, color: '#3B82F6' },
      { label: 'QR Code', value: qr, icon: QrCode, color: '#8B5CF6' },
    ];
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <DollarSign size={20} color={Colors.primary} />
          <Text style={styles.cardTitle}>Payment Methods</Text>
        </View>
        {items.map(({ label, value, icon: Icon, color }) => {
          const pct = ((value / total) * 100).toFixed(0);
          return (
            <View key={label} style={styles.paymentBreakdownRow}>
              <View style={styles.paymentBreakdownLeft}>
                <Icon size={16} color={color} />
                <Text style={styles.paymentBreakdownLabel}>{label}</Text>
              </View>
              <View style={styles.paymentBreakdownBar}>
                <View style={[styles.paymentBarFill, { width: `${pct}%`, backgroundColor: color }]} />
              </View>
              <Text style={[styles.paymentBreakdownValue, { color }]}>${value.toFixed(0)}</Text>
            </View>
          );
        })}
      </View>
    );
  };

  // ── Top Products ───────────────────────────────────────────────────────────
  const renderTopProducts = () => (
    <View style={styles.topProductsRow}>
      <View style={[styles.card, { flex: 1 }]}>
        <View style={styles.cardHeader}>
          <ShoppingBag size={18} color="#3B82F6" />
          <Text style={styles.cardTitle}>Top by Volume</Text>
        </View>
        {metrics.topByVolume.length === 0
          ? <Text style={styles.emptyText}>No data yet</Text>
          : metrics.topByVolume.map((p, idx) => (
            <View key={idx} style={styles.rankRow}>
              <Text style={[styles.rankNum, { color: Colors.primary }]}>{idx + 1}</Text>
              <Text style={styles.rankName} numberOfLines={1}>{p.name}</Text>
              <Text style={styles.rankStat}>{p.quantity} sold</Text>
            </View>
          ))}
      </View>
      <View style={[styles.card, { flex: 1 }]}>
        <View style={styles.cardHeader}>
          <Award size={18} color="#10B981" />
          <Text style={styles.cardTitle}>Top by Revenue</Text>
        </View>
        {metrics.topByRevenue.length === 0
          ? <Text style={styles.emptyText}>No data yet</Text>
          : metrics.topByRevenue.map((p, idx) => (
            <View key={idx} style={styles.rankRow}>
              <Text style={[styles.rankNum, { color: '#10B981' }]}>{idx + 1}</Text>
              <Text style={styles.rankName} numberOfLines={1}>{p.name}</Text>
              <Text style={styles.rankStat}>${p.revenue.toFixed(0)}</Text>
            </View>
          ))}
      </View>
    </View>
  );

  // ── Transaction row ───────────────────────────────────────────────────────
  const renderOrder = (order) => {
    const isVoided = order.status === 'voided';
    const isExpanded = expandedOrder === order.id;
    return (
      <View key={order.id} style={[styles.orderRow, isVoided && styles.orderRowVoided]}>
        <TouchableOpacity
          style={styles.orderRowMain}
          onPress={() => setExpandedOrder(isExpanded ? null : order.id)}
        >
          <View style={styles.orderLeft}>
            <View style={[styles.orderIconBox, isVoided && { backgroundColor: '#FEE2E2' }]}>
              <ShoppingBag size={18} color={isVoided ? '#EF4444' : Colors.primary} />
            </View>
            <View>
              <View style={styles.orderIdRow}>
                <Text style={styles.orderId}>#{order.id.slice(-6).toUpperCase()}</Text>
                <View style={[styles.statusPill, isVoided ? styles.pillVoided : styles.pillCompleted]}>
                  <Text style={[styles.pillText, isVoided ? styles.pillTextVoided : styles.pillTextCompleted]}>
                    {isVoided ? 'VOIDED' : (order.status === 'partially_refunded' ? 'PARTIAL REFUND' : 'COMPLETED')}
                  </Text>
                </View>
              </View>
              <Text style={styles.orderMeta}>
                {order.cashierName?.split('@')[0] || 'Cashier'} · {' '}
                {order.timestamp?.toDate
                  ? order.timestamp.toDate().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : 'Just now'}
              </Text>
            </View>
          </View>

          <View style={styles.orderRight}>
            <Text style={[styles.orderAmount, isVoided && { color: '#EF4444', textDecorationLine: 'line-through' }]}>
              ${(order.totalAmount || 0).toFixed(2)}
            </Text>
            <View style={styles.orderMethodRow}>
              <PaymentIcon method={order.paymentMethod} />
              <Text style={styles.orderMethod}>{order.paymentMethod?.toUpperCase() || 'CASH'}</Text>
            </View>
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.orderExpanded}>
            <Text style={styles.expandedHeader}>Items in this order:</Text>
            {(order.items || []).map((item, i) => (
              <View key={i} style={styles.expandedItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.expandedItemName} numberOfLines={1}>{item.name}</Text>
                  {item.variantName && (
                    <Text style={{ fontSize: 10, color: Colors.primary, fontWeight: '600' }}>{item.variantName.toUpperCase()}</Text>
                  )}
                </View>
                <Text style={styles.expandedItemQty}>×{item.quantity || 1}</Text>
                <Text style={styles.expandedItemPrice}>${(item.price * (item.quantity || 1)).toFixed(2)}</Text>
              </View>
            ))}
            <View style={styles.expandedSummary}>
              <Text style={styles.expandedSummaryText}>Subtotal: ${(order.subTotal || 0).toFixed(2)}</Text>
              <Text style={styles.expandedSummaryText}>Tax: ${(order.tax || 0).toFixed(2)}</Text>
              <Text style={[styles.expandedSummaryText, { fontWeight: '700' }]}>Total: ${(order.totalAmount || 0).toFixed(2)}</Text>
            </View>
            <View style={styles.expandedActions}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => receiptService.generateReceipt(order)}
              >
                <Printer size={14} color={Colors.primary} />
                <Text style={styles.actionBtnText}>Print Receipt</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => receiptService.emailReceipt(order).catch(e => Alert.alert('Share Error', e.message || 'Error sharing receipt'))}
              >
                <Share size={14} color={Colors.primary} />
                <Text style={styles.actionBtnText}>Share/Email</Text>
              </TouchableOpacity>
              {!isVoided && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.voidBtn]}
                  onPress={() => handleVoidOrder(order)}
                >
                  <XCircle size={14} color="#EF4444" />
                  <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Void Order</Text>
                </TouchableOpacity>
              )}
              {!isVoided && order.status !== 'partially_refunded' && (
                <TouchableOpacity
                  style={[styles.actionBtn]}
                  onPress={() => {
                    setActiveRefundOrder(order);
                    setRefundSelections({});
                    setShowRefundModal(true);
                  }}
                >
                  <Undo size={14} color={Colors.primary} />
                  <Text style={styles.actionBtnText}>Refund Items</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>
    );
  };

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <Sidebar onNavigate={onNavigate} activeScreen="Reports" user={user} />

      <View style={styles.mainContent}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Sales Analytics</Text>
            <Text style={styles.subtitle}>Business performance overview</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TouchableOpacity
              style={[styles.dateRangeBtn, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}
              onPress={() => {
                if (rangeFilteredOrders.length === 0) return Alert.alert('Export', 'No transactions to export.');
                orderService.exportAndShareCSV(rangeFilteredOrders)
                  .catch(e => Alert.alert('Export Error', e.message || 'Error exporting CSV.'));
              }}
            >
              <Text style={[styles.dateRangeBtnText, { color: '#16A34A', fontWeight: '700' }]}>Export CSV</Text>
            </TouchableOpacity>
            <View style={{ position: 'relative' }}>
              <TouchableOpacity
                style={styles.dateRangeBtn}
                onPress={() => setShowDatePicker(!showDatePicker)}
              >
                <Calendar size={16} color={Colors.text} />
                <Text style={styles.dateRangeBtnText}>{dateRange}</Text>
                <ChevronDown size={16} color={Colors.text} />
              </TouchableOpacity>
            {showDatePicker && (
              <View style={styles.dateDropdown}>
                {DATE_RANGES.map(r => (
                  <TouchableOpacity
                    key={r}
                    style={styles.dateDropdownItem}
                    onPress={() => { setDateRange(r); setShowDatePicker(false); }}
                  >
                    {dateRange === r && <CheckCircle size={14} color={Colors.primary} />}
                    <Text style={[styles.dateDropdownText, dateRange === r && { color: Colors.primary, fontWeight: '700' }]}>
                      {r}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          </View>
        </View>

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* KPI cards */}
            <View style={styles.statsGrid}>
              <StatCard title="Total Revenue" value={`$${metrics.totalRevenue.toFixed(2)}`} icon={DollarSign} color="#8B5CF6" sub={`${dateRange}`} />
              <StatCard title="Completed Orders" value={metrics.totalOrders.toString()} icon={ShoppingBag} color="#3B82F6" sub={`${metrics.voidedCount} voided`} />
              <StatCard title="Today's Sales" value={`$${metrics.todaySales.toFixed(2)}`} icon={Calendar} color="#10B981" />
              <StatCard title="Avg. Order Value" value={`$${metrics.avgOrderValue.toFixed(2)}`} icon={TrendingUp} color="#F59E0B" />
            </View>

            {/* Charts row */}
            <View style={styles.chartsRow}>
              <View style={{ flex: 2 }}>{renderChart()}</View>
              <View style={{ flex: 1 }}>{renderPaymentBreakdown()}</View>
            </View>

            {/* Top products */}
            {renderTopProducts()}

            {/* Transaction list */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Transactions</Text>
              <Text style={styles.resultsCount}>{filteredOrders.length} result{filteredOrders.length !== 1 ? 's' : ''}</Text>
            </View>

            {/* Search + filter */}
            <View style={styles.filterRow}>
              <View style={styles.searchBar}>
                <Search size={16} color={Colors.textMuted} />
                <TextInput
                  placeholder="Search by order ID or cashier..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  style={styles.searchInput}
                  placeholderTextColor={Colors.textMuted}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <XCircle size={16} color={Colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                {PAYMENT_FILTERS.map(f => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.chip, paymentFilter === f && styles.chipActive]}
                    onPress={() => setPaymentFilter(f)}
                  >
                    <Text style={[styles.chipText, paymentFilter === f && styles.chipTextActive]}>{f}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Orders */}
            <View style={styles.orderList}>
              {filteredOrders.length > 0
                ? filteredOrders.map(o => renderOrder(o))
                : (
                  <View style={styles.emptyContainer}>
                    <ShoppingBag size={48} color={Colors.border} />
                    <Text style={styles.emptyTitle}>No transactions found</Text>
                    <Text style={styles.emptyText}>Try adjusting your filters or date range.</Text>
                  </View>
                )}
            </View>
          </ScrollView>
        )}
      </View>

      {/* Partial Refund modal */}
      <Modal visible={showRefundModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.sheet, { width: 500, padding: 0 }]}>
            <View style={styles.headerRow}>
              <Text style={styles.titleText}>Partial Refund: {activeRefundOrder?.id.slice(-6).toUpperCase()}</Text>
              <TouchableOpacity onPress={() => setShowRefundModal(false)}>
                <XCircle size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400, padding: 16 }}>
              {activeRefundOrder && (activeRefundOrder.items || []).map(item => {
                const maxQty = item.quantity || 1;
                const currentRefundQty = refundSelections[item.id] || 0;
                
                return (
                  <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderColor: '#F1F5F9' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '600', color: Colors.text }}>{item.name}</Text>
                      <Text style={{ color: Colors.textMuted, fontSize: 13, marginTop: 2 }}>
                        ${item.price.toFixed(2)} each (Max: {maxQty})
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F8FAFC', padding: 4, borderRadius: 8 }}>
                      <TouchableOpacity 
                        style={{ padding: 8, backgroundColor: '#FFF', borderRadius: 4, elevation: 1 }}
                        onPress={() => setRefundSelections(prev => ({
                          ...prev,
                          [item.id]: Math.max(0, currentRefundQty - 1)
                        }))}
                      >
                        <Text style={{ fontSize: 16, fontWeight: '700', color: Colors.primary }}>-</Text>
                      </TouchableOpacity>
                      <Text style={{ fontSize: 16, fontWeight: '700', width: 24, textAlign: 'center', color: Colors.text }}>
                        {currentRefundQty}
                      </Text>
                      <TouchableOpacity 
                        style={{ padding: 8, backgroundColor: '#FFF', borderRadius: 4, elevation: 1 }}
                        onPress={() => setRefundSelections(prev => ({
                          ...prev,
                          [item.id]: Math.min(maxQty, currentRefundQty + 1)
                        }))}
                      >
                        <Text style={{ fontSize: 16, fontWeight: '700', color: Colors.primary }}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
            
            <View style={{ padding: 16, borderTopWidth: 1, borderColor: Colors.border, backgroundColor: '#FAFAF9' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: '600' }}>Refund Total:</Text>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#EF4444' }}>
                  ${(
                    activeRefundOrder ? activeRefundOrder.items.reduce((sum, item) => sum + (item.price * (refundSelections[item.id] || 0)), 0) : 0
                  ).toFixed(2)}
                </Text>
              </View>
              <TouchableOpacity 
                style={{ backgroundColor: '#EF4444', padding: 14, borderRadius: 10, alignItems: 'center' }}
                onPress={handleConfirmRefund}
              >
                <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 16 }}>Process Refund</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', backgroundColor: Colors.background },
  mainContent: { flex: 1, padding: 28, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text },
  subtitle: { fontSize: 14, color: Colors.textMuted, marginTop: 2 },
  dateRangeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFFFFF', paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
  },
  dateRangeBtnText: { fontSize: 14, fontWeight: '600', color: Colors.text },
  dateDropdown: {
    position: 'absolute', top: 48, right: 0, zIndex: 99,
    backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 16,
    elevation: 8, minWidth: 150, overflow: 'hidden',
  },
  dateDropdownItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  dateDropdownText: { fontSize: 14, fontWeight: '600', color: Colors.textMuted },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollArea: { flex: 1 },

  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6, marginBottom: 20 },
  statCard: {
    flex: 1, minWidth: 180, backgroundColor: '#FFFFFF',
    margin: 6, padding: 20, borderRadius: 20,
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  iconContainer: { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  statTextContainer: { flex: 1 },
  statTitle: { fontSize: 13, color: Colors.textMuted, fontWeight: '600', marginBottom: 2 },
  statValue: { fontSize: 22, fontWeight: '800' },
  statSub: { fontSize: 11, color: Colors.textMuted, marginTop: 2, fontWeight: '600' },

  // Charts
  chartsRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 22,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 16,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  chartBars: { flexDirection: 'row', alignItems: 'flex-end', height: 160, gap: 6, paddingTop: 20 },
  barItem: { flex: 1, alignItems: 'center' },
  barValue: { fontSize: 9, fontWeight: '700', color: Colors.textMuted, marginBottom: 4, height: 14 },
  barBackground: {
    width: '70%', height: 110, backgroundColor: '#F1F5F9',
    borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden',
  },
  barFill: { width: '100%', backgroundColor: Colors.primary + 'AA', borderRadius: 6 },
  barFillToday: { backgroundColor: Colors.primary },
  barLabel: { fontSize: 11, fontWeight: '600', color: Colors.textMuted, marginTop: 6 },

  // Payment breakdown
  paymentBreakdownRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 },
  paymentBreakdownLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, width: 72 },
  paymentBreakdownLabel: { fontSize: 13, fontWeight: '600', color: Colors.text },
  paymentBreakdownBar: {
    flex: 1, height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden',
  },
  paymentBarFill: { height: '100%', borderRadius: 4 },
  paymentBreakdownValue: { fontSize: 13, fontWeight: '700', width: 56, textAlign: 'right' },

  // Top products
  topProductsRow: { flexDirection: 'row', gap: 16, marginBottom: 0 },
  rankRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  rankNum: { fontSize: 15, fontWeight: '800', width: 22 },
  rankName: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.text, marginRight: 8 },
  rankStat: { fontSize: 13, fontWeight: '700', color: Colors.textMuted },

  // Section header
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  resultsCount: { fontSize: 13, color: Colors.textMuted, fontWeight: '600' },

  // Search & filter
  filterRow: { marginBottom: 16 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 14,
    height: 48, borderWidth: 1, borderColor: Colors.border, marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 15, color: Colors.text },
  chipScroll: { flexDirection: 'row' },
  chip: {
    paddingHorizontal: 18, paddingVertical: 7, backgroundColor: '#FFFFFF',
    borderRadius: 20, borderWidth: 1, borderColor: Colors.border, marginRight: 8,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  chipTextActive: { color: '#FFFFFF' },

  // Order list
  orderList: {
    backgroundColor: '#FFFFFF', borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 30, overflow: 'hidden',
  },
  orderRow: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  orderRowVoided: { backgroundColor: '#FFF9F9' },
  orderRowMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  orderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  orderIconBox: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  orderIdRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  orderId: { fontSize: 15, fontWeight: '700', color: Colors.text },
  statusPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  pillCompleted: { backgroundColor: '#DCFCE7' },
  pillVoided: { backgroundColor: '#FEE2E2' },
  pillText: { fontSize: 10, fontWeight: '800' },
  pillTextCompleted: { color: '#166534' },
  pillTextVoided: { color: '#991B1B' },
  orderMeta: { fontSize: 12, color: Colors.textMuted, fontWeight: '500' },
  orderRight: { alignItems: 'flex-end' },
  orderAmount: { fontSize: 17, fontWeight: '800', color: Colors.text },
  orderMethodRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  orderMethod: { fontSize: 11, fontWeight: '700', color: Colors.textMuted },

  // Expanded order
  orderExpanded: {
    backgroundColor: '#F8FAFC', borderTopWidth: 1, borderTopColor: Colors.border,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  expandedHeader: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  expandedItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  expandedItemName: { flex: 1, fontSize: 13, color: Colors.text, fontWeight: '500' },
  expandedItemQty: { fontSize: 13, color: Colors.textMuted, marginHorizontal: 8 },
  expandedItemPrice: { fontSize: 13, fontWeight: '700', color: Colors.text },
  expandedSummary: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.border, gap: 4 },
  expandedSummaryText: { fontSize: 13, color: Colors.textMuted, fontWeight: '600' },
  expandedActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 8, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: '#FFFFFF',
  },
  voidBtn: { borderColor: '#FECACA', backgroundColor: '#FFF5F5' },
  actionBtnText: { fontSize: 13, fontWeight: '600', color: Colors.primary },

  // Empty
  emptyContainer: { padding: 48, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.textMuted },
  emptyText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center' },

  // Modals
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  sheet: { backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.border },
  titleText: { fontSize: 18, fontWeight: '800', color: Colors.text },
});

export default Reports;
