import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView, Alert, TouchableOpacity, Vibration, Modal } from 'react-native';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import ProductCard from '../components/ProductCard';
import Cart from '../components/Cart';
import ShiftManager from '../components/ShiftManager';
import Colors from '../constants/Colors';
import { productService } from '../services/productService';
import { orderService } from '../services/orderService';
import { receiptService } from '../services/receiptService';
import { settingsService } from '../services/settingsService';
import { customerService } from '../services/customerService';
import { shiftService } from '../services/shiftService';
import { LOW_STOCK_THRESHOLD } from '../constants/Constants';
import { AlertTriangle, X } from 'lucide-react-native';

const INITIAL_SEED_PRODUCTS = [
  { name: 'iPhone 15 Pro Max 256GB Titanium', price: 1199.99, image: 'https://images.unsplash.com/photo-1696446701796-da61225697cc?w=400', brand: 'Apple', discount: 10, category: 'Electronics', status: 'In Stock' },
  { name: 'Ultra HD Matte Lipstick - Ruby Red', price: 24.50, image: 'https://images.unsplash.com/photo-1586776991134-26640b83b677?w=400', brand: 'Luxe Beauty', category: 'Cosmetics', status: 'In Stock' },
  { name: 'Air Max 270 React Sneakers', price: 150.00, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400', brand: 'Nike', category: 'Shoes', status: 'In Stock' },
  { name: 'Performance Running Tee - Cobalt', price: 35.00, image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400', brand: 'Adidas', category: 'Fashion', status: 'In Stock' },
  { name: 'Organic Lavender Face Oil 50ml', price: 42.00, image: 'https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?w=400', brand: 'Pure Glow', category: 'Cosmetics', status: 'In Stock' },
  { name: 'Smart Noise Cancelling Headphones', price: 299.00, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400', brand: 'Sony', discount: 15, category: 'Electronics', status: 'In Stock' },
];

const Dashboard = ({ onNavigate, user }) => {
  const [products, setProducts] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [showLowStockAlert, setShowLowStockAlert] = useState(true);
  const [taxRate, setTaxRate] = useState(5.0);
  const [activeShift, setActiveShift] = useState(null);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  
  const [variantModalVisible, setVariantModalVisible] = useState(false);
  const [selectedParentProduct, setSelectedParentProduct] = useState(null);
  
  const hasSeedRef = useRef(false);

  useEffect(() => {
    const unsubscribe = productService.subscribeToProducts((fetchedProducts) => {
      if (fetchedProducts.length === 0 && !hasSeedRef.current) {
        hasSeedRef.current = true;
        productService.seedProducts(INITIAL_SEED_PRODUCTS).catch(e =>
          console.warn('Seeding failed (offline?):', e.message)
        );
      } else if (fetchedProducts.length > 0) {
        setProducts(fetchedProducts);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    loadSettings();
  }, []);

  // Load active shift for this user
  useEffect(() => {
    if (user?.uid) {
      shiftService.getActiveShift(user.uid).then(shift => {
        setActiveShift(shift);
      }).catch(() => {});
    }
  }, [user]);

  // Barcode Scanner Integration
  useEffect(() => {
    let buffer = '';
    let lastTime = 0;

    const handleKeyDown = (e) => {
      if (typeof window === 'undefined') return;

      if (e.key === 'Escape') {
        setCartItems([]);
      }
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        window.dispatchEvent(new Event('checkoutShortcut'));
      }

      // Ignore if user is currently typing in an input field natively
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const currentTime = new Date().getTime();
      // Scanners are extremely fast. If delay > 50ms, it's likely human typing.
      if (currentTime - lastTime > 50) {
        buffer = ''; 
      }
      
      if (e.key === 'Enter' && buffer.length > 0) {
        const scannedBarcode = buffer;
        const matchedProduct = products.find(p => p.barcode === scannedBarcode || p.id === scannedBarcode);
        
        if (matchedProduct) {
          // Calculate effective price directly to avoid dependency on handleAdd
          const effectivePrice = matchedProduct.discount && matchedProduct.discount > 0
            ? matchedProduct.price * (1 - matchedProduct.discount / 100)
            : matchedProduct.price;
            
          setCartItems(prev => {
            const existing = prev.find(item => item.id === matchedProduct.id);
            if (existing) {
              return prev.map(item => item.id === matchedProduct.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { ...matchedProduct, effectivePrice, quantity: 1 }];
          });
        } else {
          try { Vibration.vibrate([0, 50, 100, 50]); } catch (e) {}
          Alert.alert('Not Found', `No product matches barcode: ${scannedBarcode}`);
        }
        buffer = '';
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
      
      lastTime = currentTime;
    };

    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [products]);

  const loadSettings = async () => {
    try {
      const settings = await settingsService.getSettings();
      setTaxRate(settings.taxRate || 5.0);
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  // Filter products based on search and category
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchText.toLowerCase()) || 
                         (product.brand && product.brand.toLowerCase().includes(searchText.toLowerCase()));
    
    let matchesCategory = activeCategory === 'All' || product.category === activeCategory;
    if (activeCategory === 'Low Stock') {
      matchesCategory = (product.stock || 0) <= LOW_STOCK_THRESHOLD;
    }
    
    return matchesSearch && matchesCategory;
  });

  // Calculate product counts per category
  const productCounts = products.reduce((acc, product) => {
    const cat = product.category;
    if (cat) {
      acc[cat] = (acc[cat] || 0) + 1;
    }
    acc['All'] = (acc['All'] || 0) + 1;
    if ((product.stock || 0) <= LOW_STOCK_THRESHOLD) {
      acc['Low Stock'] = (acc['Low Stock'] || 0) + 1;
    }
    return acc;
  }, { All: 0, 'Low Stock': 0 });

  const lowStockItems = products.filter(p => (p.stock || 0) <= LOW_STOCK_THRESHOLD);

  const handleAdd = (product, variant = null) => {
    Vibration.vibrate(50);
    
    // If product has variants and none was passed, open modal
    if (product.hasVariants && !variant) {
      setSelectedParentProduct(product);
      setVariantModalVisible(true);
      return;
    }

    const itemToAdd = variant ? {
      ...product,
      id: `${product.id}-${variant.name}`, // Unique ID for cart to distinguish variants
      variantName: variant.name,
      price: parseFloat(variant.price || product.price),
      variantId: variant.id,
    } : product;

    // Apply product-level discount to effectivePrice
    const effectivePrice = itemToAdd.discount && itemToAdd.discount > 0
      ? itemToAdd.price * (1 - itemToAdd.discount / 100)
      : itemToAdd.price;

    setCartItems(prev => {
      const existing = prev.find(item => item.id === itemToAdd.id);
      if (existing) {
        return prev.map(item => item.id === itemToAdd.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...itemToAdd, effectivePrice, quantity: 1 }];
    });

    if (variant) setVariantModalVisible(false);
  };

  const handleRemove = (productId) => {
    setCartItems(prev => prev.map(item => 
      item.id === productId ? { ...item, quantity: Math.max(0, item.quantity - 1) } : item
    ).filter(item => item.quantity > 0));
  };

  // Cart quantity controls used by new Cart.js
  const handleIncrement = (productId) => {
    setCartItems(prev => prev.map(item =>
      item.id === productId ? { ...item, quantity: item.quantity + 1 } : item
    ));
  };

  const handleDecrement = (productId) => {
    setCartItems(prev => prev.map(item =>
      item.id === productId ? { ...item, quantity: Math.max(0, item.quantity - 1) } : item
    ).filter(item => item.quantity > 0));
  };

  const handlePlaceOrder = async (cartPayload = {}) => {
    if (cartItems.length === 0) return;

    // Support both old string API and new object API from Cart.js
    const paymentMethod = typeof cartPayload === 'string' ? cartPayload : (cartPayload.paymentMethod || 'cash');
    const customer = cartPayload.customer || null;
    const discountPct = cartPayload.discountPct || 0;
    const discountAmount = cartPayload.discountAmount || 0;

    const subTotal = cartItems.reduce((sum, item) => sum + ((item.effectivePrice ?? item.price) * item.quantity), 0);
    const afterDiscount = subTotal - discountAmount;
    const tax = afterDiscount * (taxRate / 100);
    const total = afterDiscount + tax;

    // Advanced Payments Extraction
    const tipAmount = cartPayload.tipAmount || 0;
    const finalTotal = cartPayload.finalTotal || (total + tipAmount);
    const payments = cartPayload.payments || [{ method: paymentMethod, amount: finalTotal }];

    const orderData = {
      items: cartItems.map(item => ({
        id: item.id,
        name: item.name,
        price: item.effectivePrice ?? item.price,
        originalPrice: item.price,
        discount: item.discount || 0,
        quantity: item.quantity,
        variantName: item.variantName || null,
        variantId: item.variantId || null,
        isBundle: !!item.isBundle,
        bundleItems: item.bundleItems || null,
      })),
      subTotal,
      discountPct,
      discountAmount,
      tax,
      totalAmount: finalTotal,
      tipAmount,
      paymentMethod,
      payments,
      customerId: customer?.id || null,
      customerName: customer?.name || null,
      user,
    };

    try {
      const orderId = await orderService.submitOrder(orderData);
      const completeOrder = { ...orderData, id: orderId };

      // Update customer loyalty points and spend
      if (customer?.id) {
        await customerService.recordPurchase(customer.id, total, orderId);
      }

      setCartItems([]);

      Alert.alert(
        'Success',
        'Order completed successfully!',
        [
          { text: 'Done', style: 'cancel' },
          { text: 'Share Receipt', onPress: () => receiptService.emailReceipt(completeOrder) },
          { text: 'Print Receipt', onPress: () => receiptService.generateReceipt(completeOrder) },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to submit order.');
    }
  };

  const handleRemoveItem = (productId) => {
    setCartItems(prev => prev.filter(item => item.id !== productId));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  if (error) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }]}>
        <Text style={{ color: '#EF4444', fontSize: 18, fontWeight: '700' }}>Something went wrong</Text>
        <Text style={{ color: '#6B7280', marginTop: 8, textAlign: 'center' }}>{error}</Text>
        <TouchableOpacity onPress={() => { setError(null); setLoading(true); }} style={{ marginTop: 16, padding: 12, backgroundColor: Colors.primary, borderRadius: 8 }}>
          <Text style={{ color: '#fff', fontWeight: '600' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Sidebar onNavigate={onNavigate} activeScreen="Dashboard" />
      
      <View style={styles.mainContent}>
        <Header 
          searchText={searchText}
          setSearchText={setSearchText}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          productCounts={productCounts}
          onOpenShiftManager={() => setShowShiftModal(true)}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />

        {lowStockItems.length > 0 && showLowStockAlert && (
          <View style={styles.alertBanner}>
            <View style={styles.alertLeft}>
              <AlertTriangle size={20} color="#991B1B" />
              <Text style={styles.alertText}>
                {lowStockItems.length} items are running low on stock. 
                Check inventory to restock.
              </Text>
            </View>
            <TouchableOpacity onPress={() => setShowLowStockAlert(false)}>
              <X size={18} color="#991B1B" />
            </TouchableOpacity>
          </View>
        )}
        
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.productGrid}>
            {filteredProducts.map(product => {
              const cartItem = cartItems.find(item => item.id === product.id);
              return (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  onAdd={() => handleAdd(product)}
                  onRemove={() => handleRemove(product.id)}
                  quantity={cartItem ? cartItem.quantity : 0}
                  viewMode={viewMode}
                />
              );
            })}
          </View>
        </ScrollView>
      </View>

      <Cart
        items={cartItems}
        onPlaceOrder={handlePlaceOrder}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
        onIncrement={handleIncrement}
        onDecrement={handleDecrement}
        taxRate={taxRate}
        activeShift={activeShift}
        onRestoreCart={(restoredItems) => setCartItems(restoredItems)}
      />

      <ShiftManager
        visible={showShiftModal}
        user={user}
        activeShift={activeShift}
        onShiftChange={setActiveShift}
        onClose={() => setShowShiftModal(false)}
      />

      {/* Variant Selector Modal */}
      <Modal visible={variantModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.variantSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select Variant</Text>
                <Text style={{ fontSize: 13, color: Colors.textMuted }}>{selectedParentProduct?.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setVariantModalVisible(false)}>
                <X size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            
            <View style={{ paddingVertical: 10 }}>
              {(selectedParentProduct?.variants || []).map((v) => (
                <TouchableOpacity 
                  key={v.id || v.name}
                  style={styles.variantOption}
                  onPress={() => handleAdd(selectedParentProduct, v)}
                >
                  <View>
                    <Text style={styles.variantOptionName}>{v.name}</Text>
                    <Text style={styles.variantOptionPrice}>${parseFloat(v.price || selectedParentProduct.price).toFixed(2)}</Text>
                  </View>
                  <Plus size={18} color={Colors.primary} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
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
  },
  scrollContent: {
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
  },
  alertBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    marginHorizontal: 20,
    marginTop: 0,
    marginBottom: 15,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  alertLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  alertText: {
    marginLeft: 10,
    color: '#991B1B',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Variant Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  variantSheet: { backgroundColor: '#FFF', borderRadius: 20, width: 350, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.text },
  variantOption: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 16, 
    borderRadius: 12, 
    backgroundColor: '#F8FAFC', 
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  variantOptionName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  variantOptionPrice: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
});

export default Dashboard;
