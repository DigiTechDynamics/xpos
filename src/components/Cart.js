import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native';
import {
  CreditCard,
  Banknote,
  QrCode,
  User,
  Trash2,
  Minus,
  Plus,
  Tag,
  Search,
  X,
  ChevronDown,
  UserCheck,
  Split,
  Heart,
  Archive,
} from 'lucide-react-native';
import Colors from '../constants/Colors';
import { customerService } from '../services/customerService';

// ─── CartItem row ─────────────────────────────────────────────────────────────
const CartItem = ({ item, onRemove, onIncrement, onDecrement }) => {
  const effective = item.effectivePrice ?? item.price;
  const hasDiscount = item.discount && item.discount > 0;

  return (
    <View style={styles.cartItem}>
      <View style={styles.cartItemInfo}>
        <Text style={styles.cartItemName} numberOfLines={1}>{item.name}</Text>
        <View style={styles.priceRow}>
          {hasDiscount && (
            <Text style={styles.originalPrice}>${item.price.toFixed(2)}</Text>
          )}
          <Text style={styles.cartItemDetail}>
            ${effective.toFixed(2)}{hasDiscount ? ` (-${item.discount}%)` : ''}
          </Text>
        </View>
      </View>

      <View style={styles.qtyControls}>
        <TouchableOpacity style={styles.qtyBtn} onPress={onDecrement}>
          <Minus size={12} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.qtyText}>{item.quantity}</Text>
        <TouchableOpacity style={styles.qtyBtn} onPress={onIncrement}>
          <Plus size={12} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.cartItemRight}>
        <Text style={styles.cartItemTotal}>
          ${(effective * item.quantity).toFixed(2)}
        </Text>
        <TouchableOpacity onPress={onRemove} style={styles.removeBtn}>
          <Trash2 size={13} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Customer search modal ────────────────────────────────────────────────────
const CustomerModal = ({ visible, onClose, onSelect }) => {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!visible) return;
    const unsub = customerService.subscribeToCustomers(data => {
      setCustomers(data);
      setLoading(false);
    });
    return () => unsub();
  }, [visible]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return customers.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.includes(q)
    );
  }, [customers, search]);

  const tierColor = { VIP: '#8B5CF6', Gold: '#F59E0B', Silver: '#64748B', Bronze: '#B45309' };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={cm.overlay}>
        <View style={cm.sheet}>
          <View style={cm.header}>
            <Text style={cm.title}>Select Customer</Text>
            <TouchableOpacity onPress={onClose}><X size={20} color={Colors.textMuted} /></TouchableOpacity>
          </View>
          <View style={cm.searchBox}>
            <Search size={15} color={Colors.textMuted} />
            <TextInput
              style={cm.searchInput}
              placeholder="Search name, email, phone..."
              value={search}
              onChangeText={setSearch}
              placeholderTextColor={Colors.textMuted}
              autoFocus
            />
          </View>
          {loading ? (
            <ActivityIndicator style={{ padding: 24 }} color={Colors.primary} />
          ) : (
            <ScrollView style={cm.list}>
              <TouchableOpacity style={cm.walkingRow} onPress={() => { onSelect(null); onClose(); }}>
                <User size={18} color={Colors.textMuted} />
                <Text style={cm.walkingText}>Walking Customer (no loyalty)</Text>
              </TouchableOpacity>
              {filtered.map(c => (
                <TouchableOpacity key={c.id} style={cm.customerRow} onPress={() => { onSelect(c); onClose(); }}>
                  <View style={[cm.avatar, { backgroundColor: (tierColor[c.tier] || Colors.primary) + '22' }]}>
                    <Text style={[cm.avatarText, { color: tierColor[c.tier] || Colors.primary }]}>
                      {c.name?.[0]?.toUpperCase()}
                    </Text>
                  </View>
                  <View style={cm.cusMeta}>
                    <Text style={cm.cusName}>{c.name}</Text>
                    <Text style={cm.cusEmail}>{c.email || c.phone || '—'}</Text>
                  </View>
                  <View style={[cm.tierBadge, { backgroundColor: (tierColor[c.tier] || Colors.primary) + '22' }]}>
                    <Text style={[cm.tierText, { color: tierColor[c.tier] || Colors.primary }]}>{c.tier || 'Bronze'}</Text>
                  </View>
                </TouchableOpacity>
              ))}
              {filtered.length === 0 && !loading && (
                <Text style={cm.empty}>No customers found</Text>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

// ─── Main Cart ────────────────────────────────────────────────────────────────
const Cart = ({
  items = [],
  onPlaceOrder,
  onRemoveItem,
  onClearCart,
  onIncrement,
  onDecrement,
  taxRate = 5.0,
  activeShift = null,
  onRestoreCart,
}) => {
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [discountPct, setDiscountPct] = useState('');
  const [showDiscount, setShowDiscount] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [tipAmount, setTipAmount] = useState('');
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitCash, setSplitCash] = useState('');
  const [splitCard, setSplitCard] = useState('');
  
  const [parkedCarts, setParkedCarts] = useState([]);
  const [showParkedModal, setShowParkedModal] = useState(false);

  // Prices already account for per-item discounts set on products
  const itemSubTotal = items.reduce((sum, item) => {
    const price = item.effectivePrice ?? item.price;
    return sum + price * item.quantity;
  }, 0);

  // Order-level discount
  const discountAmount = Math.min(
    itemSubTotal,
    itemSubTotal * (Math.max(0, Math.min(100, parseFloat(discountPct) || 0)) / 100)
  );
  const afterDiscount = itemSubTotal - discountAmount;
  const tax = afterDiscount * (taxRate / 100);
  const total = afterDiscount + tax;

  const tierDiscount = { VIP: 10, Gold: 7, Silver: 5, Bronze: 0 };
  const customerDiscountPct = selectedCustomer ? (tierDiscount[selectedCustomer.tier] || 0) : 0;

  const tipVal = parseFloat(tipAmount) || 0;
  const finalTotal = total + tipVal;

  const validSplit = paymentMethod === 'split' 
    ? Math.abs((parseFloat(splitCash) || 0) + (parseFloat(splitCard) || 0) - finalTotal) < 0.01 
    : true;
    
  const handleParkCart = () => {
    if (items.length === 0) return;
    const newParked = {
      id: Date.now().toString(),
      items: [...items],
      customer: selectedCustomer,
      timestamp: new Date(),
      total: finalTotal
    };
    setParkedCarts([...parkedCarts, newParked]);
    onClearCart?.();
    setSelectedCustomer(null);
    setPaymentMethod('cash');
    setDiscountPct('');
    setTipAmount('');
  };

  const handleRestoreCart = (parkedCart) => {
    if (items.length > 0) {
      Alert.alert('Active Cart', 'Please clear or park the current cart before restoring another.');
      return;
    }
    onRestoreCart?.(parkedCart.items);
    setSelectedCustomer(parkedCart.customer);
    setParkedCarts(parkedCarts.filter(c => c.id !== parkedCart.id));
    setShowParkedModal(false);
  };

  // Listen for the global shortcut dispatched from Dashboard.js
  useEffect(() => {
    const handleCheckoutShortcut = () => {
      if (items.length > 0 && validSplit) {
        onPlaceOrder?.({
          paymentMethod: paymentMethod === 'split' ? 'split' : paymentMethod,
          payments: paymentMethod === 'split' ? [
            { method: 'cash', amount: parseFloat(splitCash) || 0 },
            { method: 'card', amount: parseFloat(splitCard) || 0 }
          ].filter(p => p.amount > 0) : [{ method: paymentMethod, amount: finalTotal }],
          tipAmount: tipVal,
          customer: selectedCustomer,
          discountPct: parseFloat(discountPct) || 0,
          discountAmount,
          subTotal: itemSubTotal,
          afterDiscount,
          tax,
          total,
          finalTotal,
        });
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('checkoutShortcut', handleCheckoutShortcut);
      return () => window.removeEventListener('checkoutShortcut', handleCheckoutShortcut);
    }
  }, [
    items, validSplit, paymentMethod, splitCash, splitCard, tipVal, 
    selectedCustomer, discountPct, discountAmount, itemSubTotal, 
    afterDiscount, tax, total, finalTotal, onPlaceOrder
  ]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.title}>New Transaction</Text>
          {parkedCarts.length > 0 && (
            <TouchableOpacity onPress={() => setShowParkedModal(true)} style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
              <Text style={{ fontSize: 11, color: '#D97706', fontWeight: '700' }}>{parkedCarts.length} Parked</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Active shift indicator */}
        {activeShift && (
          <View style={styles.shiftBadge}>
            <Clock size={11} color="#10B981" />
            <Text style={styles.shiftText}>
              Shift: {activeShift.cashierName?.split('@')[0]}
            </Text>
          </View>
        )}

        {/* Customer selector */}
        <TouchableOpacity style={styles.customerBtn} onPress={() => setShowCustomerModal(true)}>
          {selectedCustomer ? <UserCheck size={14} color={Colors.primary} /> : <User size={14} color={Colors.textMuted} />}
          <Text style={[styles.customerBtnText, selectedCustomer && { color: Colors.primary }]}>
            {selectedCustomer ? selectedCustomer.name : 'Walking Customer'}
          </Text>
          <ChevronDown size={13} color={selectedCustomer ? Colors.primary : Colors.textMuted} />
        </TouchableOpacity>

        {/* Loyalty tier auto-discount notice */}
        {selectedCustomer && customerDiscountPct > 0 && (
          <View style={styles.loyaltyNotice}>
            <Tag size={11} color="#10B981" />
            <Text style={styles.loyaltyText}>
              {selectedCustomer.tier} tier — {customerDiscountPct}% loyalty discount applies at checkout
            </Text>
          </View>
        )}
      </View>

      {/* Order type tabs */}
      <View style={styles.orderTypeContainer}>
        <View style={[styles.orderType, styles.activeOrderType]}>
          <Text style={[styles.orderTypeText, styles.activeOrderTypeText]}>Retail Sale</Text>
        </View>
        <View style={styles.orderType}>
          <Text style={styles.orderTypeText}>Wholesale</Text>
        </View>
      </View>

      {/* Items */}
      <ScrollView style={styles.itemList} showsVerticalScrollIndicator={false}>
        {items.length > 0 ? (
          <>
            {items.map((item, index) => (
              <CartItem
                key={item.id || index}
                item={item}
                onRemove={() => onRemoveItem?.(item.id)}
                onIncrement={() => onIncrement?.(item.id)}
                onDecrement={() => onDecrement?.(item.id)}
              />
            ))}
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 10 }}>
              <TouchableOpacity style={styles.clearCartBtn} onPress={onClearCart}>
                <Trash2 size={13} color="#EF4444" />
                <Text style={styles.clearCartText}>Clear Cart</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.clearCartBtn} onPress={handleParkCart}>
                <Archive size={13} color={Colors.primary} />
                <Text style={[styles.clearCartText, { color: Colors.primary }]}>Park Cart</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <Text style={styles.emptyText}>{'Cart is empty\nAdd products to get started'}</Text>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {/* Discount toggle */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <TouchableOpacity
            style={[styles.discountToggle, { marginBottom: 0 }]}
            onPress={() => { setShowDiscount(!showDiscount); if (showDiscount) setDiscountPct(''); }}
          >
            <Tag size={13} color={Colors.primary} />
            <Text style={styles.discountToggleText}>
              {showDiscount ? 'Remove discount' : 'Add discount'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.discountToggle, { marginBottom: 0 }]}
            onPress={() => { setShowTip(!showTip); if (showTip) setTipAmount(''); }}
          >
            <Heart size={13} color={Colors.primary} />
            <Text style={styles.discountToggleText}>
              {showTip ? 'Remove tip' : 'Add tip'}
            </Text>
          </TouchableOpacity>
        </View>

        {showDiscount && (
          <View style={styles.discountRow}>
            <TextInput
              style={styles.discountInput}
              placeholder="0"
              value={discountPct}
              onChangeText={v => setDiscountPct(v.replace(/[^0-9.]/g, ''))}
              keyboardType="numeric"
              placeholderTextColor={Colors.textMuted}
            />
            <Text style={styles.discountPctSign}>% off</Text>
            {discountAmount > 0 && (
              <Text style={styles.discountSaving}>-${discountAmount.toFixed(2)}</Text>
            )}
          </View>
        )}

        {showTip && (
          <View style={[styles.discountRow, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
            <Text style={[styles.discountPctSign, { color: '#3B82F6' }]}>Tip $</Text>
            <TextInput
              style={[styles.discountInput, { color: '#3B82F6', textAlign: 'left', flex: 1 }]}
              placeholder="0.00"
              value={tipAmount}
              onChangeText={v => setTipAmount(v.replace(/[^0-9.]/g, ''))}
              keyboardType="numeric"
            />
          </View>
        )}

        {/* Totals */}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Sub Total</Text>
          <Text style={styles.summaryValue}>${itemSubTotal.toFixed(2)}</Text>
        </View>
        {discountAmount > 0 && (
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: '#10B981' }]}>Discount ({discountPct}%)</Text>
            <Text style={[styles.summaryValue, { color: '#10B981' }]}>-${discountAmount.toFixed(2)}</Text>
          </View>
        )}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Tax {taxRate}%</Text>
          <Text style={styles.summaryValue}>${tax.toFixed(2)}</Text>
        </View>
        {tipVal > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tip Amount</Text>
            <Text style={styles.summaryValue}>${tipVal.toFixed(2)}</Text>
          </View>
        )}
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalValue}>${finalTotal.toFixed(2)}</Text>
        </View>

        {/* Payment methods */}
        <View style={styles.paymentMethods}>
          {[
            { id: 'cash', label: 'Cash', Icon: Banknote },
            { id: 'card', label: 'Card', Icon: CreditCard },
            { id: 'split', label: 'Split', Icon: Split },
          ].map(({ id, label, Icon }) => (
            <TouchableOpacity
              key={id}
              style={[styles.paymentMethod, paymentMethod === id && styles.activePaymentMethod]}
              onPress={() => {
                setPaymentMethod(id);
                if (id === 'split') setShowSplitModal(true);
              }}
            >
              <Icon size={22} color={paymentMethod === id ? Colors.secondary : Colors.textMuted} />
              <Text style={[styles.paymentMethodText, paymentMethod === id && styles.activePaymentMethodText]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {paymentMethod === 'split' && (
          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 12, color: validSplit ? '#10B981' : '#EF4444', textAlign: 'center', fontWeight: '600' }}>
              {validSplit ? 'Split balance matches total' : 'Split balance does not match total'}
            </Text>
            <TouchableOpacity onPress={() => setShowSplitModal(true)} style={{ marginTop: 4 }}>
              <Text style={{ color: Colors.primary, textAlign: 'center', fontSize: 12, fontWeight: '700' }}>Edit Split Amounts</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={[styles.placeOrderButton, (items.length === 0 || !validSplit) && styles.disabledButton]}
          onPress={() => onPlaceOrder?.({
            paymentMethod: paymentMethod === 'split' ? 'split' : paymentMethod,
            payments: paymentMethod === 'split' ? [
              { method: 'cash', amount: parseFloat(splitCash) || 0 },
              { method: 'card', amount: parseFloat(splitCard) || 0 }
            ].filter(p => p.amount > 0) : [{ method: paymentMethod, amount: finalTotal }],
            tipAmount: tipVal,
            customer: selectedCustomer,
            discountPct: parseFloat(discountPct) || 0,
            discountAmount,
            subTotal: itemSubTotal,
            afterDiscount,
            tax,
            total,
            finalTotal,
          })}
          disabled={items.length === 0 || !validSplit}
        >
          <Text style={styles.placeOrderText}>Complete Sale</Text>
          <Text style={styles.placeOrderSub}>
            {paymentMethod.toUpperCase()}{selectedCustomer ? ` · ${selectedCustomer.name}` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Split payment modal */}
      <Modal visible={showSplitModal} transparent animationType="fade">
        <View style={cm.overlay}>
          <View style={[cm.sheet, { width: 320, padding: 20 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
              <Text style={cm.title}>Split Payment</Text>
              <TouchableOpacity onPress={() => setShowSplitModal(false)}>
                <X size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: 15, textAlign: 'center' }}>Total: ${finalTotal.toFixed(2)}</Text>
            
            <Text style={{ color: Colors.textMuted, fontSize: 12, marginBottom: 4 }}>Cash Amount</Text>
            <View style={[cm.searchBox, { margin: 0, marginBottom: 15 }]}>
              <TextInput
                style={cm.searchInput}
                keyboardType="numeric"
                placeholder="0.00"
                value={splitCash}
                onChangeText={setSplitCash}
              />
            </View>

            <Text style={{ color: Colors.textMuted, fontSize: 12, marginBottom: 4 }}>Card Amount</Text>
            <View style={[cm.searchBox, { margin: 0, marginBottom: 20 }]}>
              <TextInput
                style={cm.searchInput}
                keyboardType="numeric"
                placeholder="0.00"
                value={splitCard}
                onChangeText={setSplitCard}
              />
            </View>

            <TouchableOpacity
              style={[styles.placeOrderButton, !validSplit && styles.disabledButton]}
              disabled={!validSplit}
              onPress={() => setShowSplitModal(false)}
            >
              <Text style={styles.placeOrderText}>Confirm Split</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Parked Carts modal */}
      <Modal visible={showParkedModal} transparent animationType="fade">
        <View style={cm.overlay}>
          <View style={[cm.sheet, { width: 440 }]}>
            <View style={cm.header}>
              <Text style={cm.title}>Parked Carts</Text>
              <TouchableOpacity onPress={() => setShowParkedModal(false)}>
                <X size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {parkedCarts.map(cart => (
                <View key={cart.id} style={cm.walkingRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700', fontSize: 14, color: Colors.text }}>
                      {cart.customer ? cart.customer.name : 'Walking Customer'}
                    </Text>
                    <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 2 }}>
                      {cart.items.length} items • ${cart.total.toFixed(2)}
                    </Text>
                    <Text style={{ color: Colors.textMuted, fontSize: 11, marginTop: 2 }}>
                      {cart.timestamp.toLocaleTimeString()}
                    </Text>
                  </View>
                  <TouchableOpacity 
                    style={{ backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}
                    onPress={() => handleRestoreCart(cart)}
                  >
                    <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>Resume</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {parkedCarts.length === 0 && (
                <Text style={{ textAlign: 'center', padding: 20, color: Colors.textMuted }}>No parked carts.</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Customer modal */}
      <CustomerModal
        visible={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        onSelect={setSelectedCustomer}
      />
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { width: 330, backgroundColor: '#FFFFFF', height: '100%', padding: 16, borderLeftWidth: 1, borderLeftColor: Colors.border },
  header: { marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '700', color: Colors.text },
  shiftBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  shiftText: { fontSize: 11, color: '#10B981', fontWeight: '600' },
  customerBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, backgroundColor: '#F8FAFC', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: Colors.border },
  customerBtnText: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  loyaltyNotice: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6, backgroundColor: '#F0FDF4', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  loyaltyText: { fontSize: 11, color: '#10B981', fontWeight: '600', flex: 1 },
  orderTypeContainer: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 8, padding: 3, marginBottom: 12 },
  orderType: { flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: 6 },
  activeOrderType: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 2 },
  orderTypeText: { fontSize: 12, fontWeight: '600', color: Colors.textMuted },
  activeOrderTypeText: { color: Colors.secondary },
  itemList: { flex: 1 },
  cartItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 6 },
  cartItemInfo: { flex: 1 },
  cartItemName: { fontSize: 13, fontWeight: '600', color: Colors.text },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  originalPrice: { fontSize: 10, color: Colors.textMuted, textDecorationLine: 'line-through' },
  cartItemDetail: { fontSize: 11, color: Colors.textMuted },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: { width: 24, height: 24, borderRadius: 6, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  qtyText: { fontSize: 13, fontWeight: '700', color: Colors.text, minWidth: 18, textAlign: 'center' },
  cartItemRight: { alignItems: 'flex-end', gap: 4 },
  cartItemTotal: { fontSize: 13, fontWeight: '700', color: Colors.text },
  removeBtn: { padding: 2 },
  clearCartBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, marginTop: 4, gap: 5 },
  clearCartText: { color: '#EF4444', fontSize: 12, fontWeight: '600' },
  emptyText: { textAlign: 'center', color: Colors.textMuted, marginTop: 40, lineHeight: 22 },
  footer: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 12 },
  discountToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  discountToggleText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  discountRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, backgroundColor: '#F0FDF4', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#BBF7D0' },
  discountInput: { width: 48, fontSize: 18, fontWeight: '800', color: Colors.primary, textAlign: 'center' },
  discountPctSign: { fontSize: 14, fontWeight: '700', color: Colors.textMuted },
  discountSaving: { fontSize: 13, fontWeight: '800', color: '#10B981', marginLeft: 'auto' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  summaryLabel: { fontSize: 13, color: Colors.textMuted },
  summaryValue: { fontSize: 13, fontWeight: '600', color: Colors.text },
  totalRow: { marginTop: 6, marginBottom: 12 },
  totalLabel: { fontSize: 16, fontWeight: '700', color: Colors.text },
  totalValue: { fontSize: 16, fontWeight: '700', color: Colors.secondary },
  paymentMethods: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  paymentMethod: { alignItems: 'center', width: '30%', padding: 8, borderRadius: 8, borderWidth: 1.5, borderColor: Colors.border },
  activePaymentMethod: { borderColor: Colors.secondary, backgroundColor: '#EEF9F3' },
  paymentMethodText: { fontSize: 10, color: Colors.textMuted, marginTop: 4, textAlign: 'center', fontWeight: '600' },
  activePaymentMethodText: { color: Colors.secondary },
  placeOrderButton: { backgroundColor: Colors.secondary, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  disabledButton: { opacity: 0.4 },
  placeOrderText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  placeOrderSub: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '600', marginTop: 2 },
});

const cm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  sheet: { backgroundColor: '#fff', borderRadius: 20, width: 440, maxHeight: '75%', overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontSize: 18, fontWeight: '800', color: Colors.text },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, margin: 16, backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 14, height: 44, borderWidth: 1, borderColor: Colors.border },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text },
  list: { maxHeight: 380 },
  walkingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  walkingText: { fontSize: 14, fontWeight: '600', color: Colors.textMuted },
  customerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  avatar: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 15, fontWeight: '800' },
  cusMeta: { flex: 1 },
  cusName: { fontSize: 14, fontWeight: '700', color: Colors.text },
  cusEmail: { fontSize: 12, color: Colors.textMuted },
  tierBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  tierText: { fontSize: 11, fontWeight: '800' },
  empty: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', padding: 24 },
});

export default Cart;
