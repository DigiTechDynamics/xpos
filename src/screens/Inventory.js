import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Modal, 
  Alert,
  ActivityIndicator
} from 'react-native';
import { Plus, Edit2, Trash2, Search, X, Package, History, Layers, Combine } from 'lucide-react-native';
import Colors from '../constants/Colors';
import { productService } from '../services/productService';
import { inventoryService } from '../services/inventoryService';
import Sidebar from '../components/Sidebar';

const Inventory = ({ onNavigate, user }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    price: '',
    stock: '0',
    category: 'Electronics',
    status: 'In Stock',
    image: '',
    barcode: '',
    hasVariants: false,
    isBundle: false,
  });
  
  const [variants, setVariants] = useState([]); // [{ sku, attributes: { Size: 'M' }, price: '', stock: '0' }]
  const [bundleItems, setBundleItems] = useState([]); // [{ productId, quantity: 1, name: '' }]

  const [isLogModalVisible, setIsLogModalVisible] = useState(false);
  const [selectedProductLogs, setSelectedProductLogs] = useState([]);
  const [logLoading, setLogLoading] = useState(false);
  const [selectedProductName, setSelectedProductName] = useState('');

  useEffect(() => {
    const unsubscribe = productService.subscribeToProducts((fetchedProducts) => {
      setProducts(fetchedProducts);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    if (!formData.name || !formData.price) {
      Alert.alert("Error", "Name and Price are required.");
      return;
    }

    const price = parseFloat(formData.price);
    const stock = parseInt(formData.stock) || 0;
    
    if (isNaN(price)) {
      Alert.alert("Error", "Invalid price.");
      return;
    }

    try {
      if (editingProduct) {
        const oldStock = editingProduct.stock || 0;
        await productService.updateProduct(editingProduct.id, { 
          ...formData, 
          price, 
          stock,
          variants,
          bundleItems 
        });
        
        // Log manual stock adjustment if changed (only for standard items)
        if (!formData.hasVariants && !formData.isBundle && stock !== oldStock) {
          await inventoryService.logStockMovement(
            editingProduct.id, 
            stock - oldStock, 
            'manual_adjustment'
          );
        }
      } else {
        await productService.addProduct({ 
          ...formData, 
          price, 
          stock,
          variants,
          bundleItems 
        });
      }
      setIsModalVisible(false);
      resetForm();
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to save product.");
    }
  };

  const openLogModal = async (product) => {
    setSelectedProductName(product.name);
    setIsLogModalVisible(true);
    setLogLoading(true);
    try {
      const logs = await inventoryService.getInventoryLogs(product.id);
      setSelectedProductLogs(logs);
    } catch (error) {
      Alert.alert("Error", "Failed to fetch inventory logs.");
    } finally {
      setLogLoading(false);
    }
  };

  const handleDelete = (id) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this product?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => productService.deleteProduct(id) }
      ]
    );
  };

  const openModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        brand: product.brand || '',
        price: product.price.toString(),
        stock: (product.stock || 0).toString(),
        category: product.category || 'Electronics',
        status: product.status || 'In Stock',
        image: product.image || '',
        barcode: product.barcode || '',
        hasVariants: !!product.hasVariants,
        isBundle: !!product.isBundle
      });
      setVariants(product.variants || []);
      setBundleItems(product.bundleItems || []);
    } else {
      setEditingProduct(null);
      resetForm();
      setVariants([]);
      setBundleItems([]);
    }
    setIsModalVisible(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      brand: '',
      price: '',
      stock: '0',
      category: 'Electronics',
      status: 'In Stock',
      image: '',
      barcode: '',
      hasVariants: false,
      isBundle: false
    });
    setVariants([]);
    setBundleItems([]);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchText.toLowerCase()) || 
    (p.brand && p.brand.toLowerCase().includes(searchText.toLowerCase()))
  );

  return (
    <View style={styles.container}>
      <Sidebar onNavigate={onNavigate} activeScreen="Inventory" user={user} />

      
      <View style={styles.mainContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Inventory Management</Text>
          <TouchableOpacity style={styles.addButton} onPress={() => openModal()}>
            <Plus size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add Product</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchBarContainer}>
          <Search size={20} color={Colors.textMuted} />
          <TextInput 
            placeholder="Search inventory..." 
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <ScrollView horizontal style={styles.tableScroll}>
            <View style={styles.tableContainer}>
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={[styles.column, styles.colName]}>Product Name</Text>
                <Text style={[styles.column, styles.colBrand]}>Brand</Text>
                <Text style={[styles.column, styles.colCat]}>Category</Text>
                <Text style={[styles.column, styles.colPrice]}>Price</Text>
                <Text style={[styles.column, styles.colStock]}>Stock</Text>
                <Text style={[styles.column, styles.colStatus]}>Status</Text>
                <Text style={[styles.column, styles.colActions]}>Actions</Text>
              </View>

              {filteredProducts.map((p) => (
                <View key={p.id} style={styles.tableRow}>
                  <Text style={[styles.column, styles.colName]}>{p.name}</Text>
                  <Text style={[styles.column, styles.colBrand]}>{p.brand || '-'}</Text>
                  <Text style={[styles.column, styles.colCat]}>{p.category}</Text>
                  <Text style={[styles.column, styles.colPrice]}>${p.price.toFixed(2)}</Text>
                  <Text style={[styles.column, styles.colStock]}>{p.stock || 0}</Text>
                  <Text style={[styles.column, styles.colStatus]}>
                    <View style={[styles.statusBadge, (p.stock || 0) > 10 ? styles.statusInStock : styles.statusLow]}>
                      <Text style={styles.statusText}>{(p.stock || 0) > 0 ? ( (p.stock || 0) <= 10 ? 'Low Stock' : 'In Stock') : 'Out of Stock'}</Text>
                    </View>
                  </Text>
                  <View style={[styles.column, styles.colActions]}>
                    <TouchableOpacity onPress={() => openLogModal(p)} style={styles.actionIcon}>
                      <History size={18} color={Colors.textMuted} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => openModal(p)} style={styles.actionIcon}>
                      <Edit2 size={18} color={Colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(p.id)} style={styles.actionIcon}>
                      <Trash2 size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </View>

      {/* Add/Edit Modal */}
      <Modal visible={isModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingProduct ? 'Edit Product' : 'Add New Product'}</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={styles.label}>Product Name*</Text>
              <TextInput value={formData.name} onChangeText={(val) => setFormData({...formData, name: val})} style={styles.input} />

              <Text style={styles.label}>Brand</Text>
              <TextInput value={formData.brand} onChangeText={(val) => setFormData({...formData, brand: val})} style={styles.input} />

                <View style={styles.row}>
                  <View style={{flex: 1, marginRight: 10}}>
                    <Text style={styles.label}>Price ($)*</Text>
                    <TextInput value={formData.price} onChangeText={(val) => setFormData({...formData, price: val})} keyboardType="numeric" style={styles.input} />
                  </View>
                  <View style={{flex: 1}}>
                    <Text style={styles.label}>Category</Text>
                    <TextInput value={formData.category} onChangeText={(val) => setFormData({...formData, category: val})} style={styles.input} />
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={{flex: 1, marginRight: 10}}>
                    <Text style={styles.label}>Current Stock</Text>
                    <TextInput value={formData.stock} onChangeText={(val) => setFormData({...formData, stock: val})} keyboardType="numeric" style={styles.input} />
                  </View>
                  <View style={{flex: 1}}>
                    <Text style={styles.label}>Status Hint</Text>
                    <TextInput value={formData.status} onChangeText={(val) => setFormData({...formData, status: val})} placeholder="In Stock / Low" style={styles.input} />
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={{flex: 1, marginRight: 10}}>
                    <Text style={styles.label}>Barcode</Text>
                    <TextInput value={formData.barcode} onChangeText={(val) => setFormData({...formData, barcode: val})} style={styles.input} placeholder="Scan or type barcode" />
                  </View>
                  <View style={{flex: 1}}>
                    <Text style={styles.label}>Image URL</Text>
                    <TextInput value={formData.image} onChangeText={(val) => setFormData({...formData, image: val})} style={styles.input} />
                  </View>
                </View>

                {/* Variants & Bundles Toggles */}
                <View style={[styles.row, { marginTop: 20, gap: 20 }]}>
                  <TouchableOpacity 
                    style={[styles.typeToggle, formData.hasVariants && styles.typeToggleActive]}
                    onPress={() => setFormData({...formData, hasVariants: !formData.hasVariants, isBundle: false})}
                  >
                    <Layers size={18} color={formData.hasVariants ? '#FFF' : Colors.primary} />
                    <Text style={[styles.typeToggleText, formData.hasVariants && {color: '#FFF'}]}>Multiple Variants</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.typeToggle, formData.isBundle && styles.typeToggleActive]}
                    onPress={() => setFormData({...formData, isBundle: !formData.isBundle, hasVariants: false})}
                  >
                    <Combine size={18} color={formData.isBundle ? '#FFF' : Colors.primary} />
                    <Text style={[styles.typeToggleText, formData.isBundle && {color: '#FFF'}]}>Product Bundle</Text>
                  </TouchableOpacity>
                </View>

                {/* Variants Editor */}
                {formData.hasVariants && (
                  <View style={styles.specialSection}>
                    <View style={styles.headerRow}>
                      <Text style={styles.sectionTitle}>Product Variants (Attributes)</Text>
                      <TouchableOpacity 
                        style={styles.smallAddBtn}
                        onPress={() => setVariants([...variants, { id: Math.random().toString(36).substr(2, 9), sku: '', name: '', price: formData.price, stock: '0' }])}
                      >
                        <Plus size={14} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                    {variants.map((v, idx) => (
                      <View key={v.id || idx} style={styles.variantRow}>
                        <TextInput 
                          placeholder="Label (e.g. Small / Red)" 
                          style={[styles.input, { flex: 2, marginRight: 8 }]} 
                          value={v.name}
                          onChangeText={(t) => {
                            const newV = [...variants];
                            newV[idx].name = t;
                            setVariants(newV);
                          }}
                        />
                        <TextInput 
                          placeholder="Price" 
                          keyboardType="numeric"
                          style={[styles.input, { flex: 1, marginRight: 8 }]} 
                          value={v.price}
                          onChangeText={(t) => {
                            const newV = [...variants];
                            newV[idx].price = t;
                            setVariants(newV);
                          }}
                        />
                        <TouchableOpacity onPress={() => setVariants(variants.filter((_, i) => i !== idx))}>
                          <Trash2 size={18} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                {/* Bundle Editor */}
                {formData.isBundle && (
                  <View style={styles.specialSection}>
                    <View style={styles.headerRow}>
                      <Text style={styles.sectionTitle}>Bundle Components</Text>
                    </View>
                    <Text style={{ fontSize: 12, color: Colors.textMuted, marginBottom: 10 }}>
                      Select existing products that make up this bundle.
                    </Text>
                    <View style={{ maxHeight: 200, backgroundColor: '#F8FAFC', padding: 8, borderRadius: 10 }}>
                      {products.filter(p => p.id !== editingProduct?.id && !p.isBundle).slice(0, 5).map(p => {
                        const isAdded = bundleItems.some(bi => bi.productId === p.id);
                        return (
                          <TouchableOpacity 
                            key={p.id} 
                            style={{ padding: 8, flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: '#EEE' }}
                            onPress={() => {
                              if (isAdded) {
                                setBundleItems(bundleItems.filter(bi => bi.productId !== p.id));
                              } else {
                                setBundleItems([...bundleItems, { productId: p.id, name: p.name, quantity: 1 }]);
                              }
                            }}
                          >
                            <Text style={{ color: isAdded ? Colors.primary : Colors.text, fontWeight: isAdded ? '700' : '400' }}>{p.name}</Text>
                            {isAdded ? <X size={14} color="#EF4444" /> : <Plus size={14} color={Colors.primary} />}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    
                    {bundleItems.map((bi, idx) => (
                      <View key={bi.productId} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 10 }}>
                        <Text style={{ flex: 1, fontSize: 13, fontWeight: '600' }}>{bi.name}</Text>
                        <TextInput 
                          keyboardType="numeric"
                          style={[styles.input, { width: 50, padding: 5 }]}
                          value={bi.quantity.toString()}
                          onChangeText={(t) => {
                            const next = [...bundleItems];
                            next[idx].quantity = parseInt(t) || 1;
                            setBundleItems(next);
                          }}
                        />
                        <Text style={{ fontSize: 12, color: Colors.textMuted }}>unit(s)</Text>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save Product</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* History Modal */}
      <Modal visible={isLogModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Inventory Logs: {selectedProductName}</Text>
              <TouchableOpacity onPress={() => setIsLogModalVisible(false)}>
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {logLoading ? (
              <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: 30 }} />
            ) : (
              <ScrollView style={{ maxHeight: 400 }}>
                {selectedProductLogs.length === 0 ? (
                  <Text style={styles.emptyText}>No inventory history found.</Text>
                ) : (
                  selectedProductLogs.map((log) => (
                    <View key={log.id} style={styles.logItem}>
                      <View>
                        <Text style={styles.logReason}>{log.reason?.toUpperCase()}</Text>
                        <Text style={styles.logDate}>{log.timestamp?.toDate().toLocaleString()}</Text>
                      </View>
                      <Text style={[styles.logChange, log.change > 0 ? styles.positive : styles.negative]}>
                        {log.change > 0 ? '+' : ''}{log.change}
                      </Text>
                    </View>
                  ))
                )}
              </ScrollView>
            )}

            <TouchableOpacity style={styles.saveButton} onPress={() => setIsLogModalVisible(false)}>
              <Text style={styles.saveButtonText}>Close</Text>
            </TouchableOpacity>
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
    padding: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  addButton: {
    backgroundColor: Colors.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 8,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  tableScroll: {
    flex: 1,
  },
  tableContainer: {
    minWidth: 800,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    alignItems: 'center',
  },
  tableHeader: {
    backgroundColor: '#F8FAFC',
  },
  column: {
    fontSize: 14,
    color: Colors.text,
  },
  colName: { flex: 3, fontWeight: '600' },
  colBrand: { flex: 2 },
  colCat: { flex: 2 },
  colPrice: { flex: 1.5 },
  colStock: { flex: 1 },
  colStatus: { flex: 2 },
  colActions: { flex: 2, flexDirection: 'row', justifyContent: 'flex-end' },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  statusInStock: { backgroundColor: '#DCFCE7' },
  statusLow: { backgroundColor: '#FEE2E2' },
  statusText: { fontSize: 12, fontWeight: '700', color: Colors.text },
  actionIcon: {
    marginLeft: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalForm: {
    maxHeight: 400,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
  },
  saveButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 30,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  logItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  logReason: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  logDate: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  logChange: {
    fontSize: 16,
    fontWeight: '700',
  },
  positive: { color: '#10B981' },
  negative: { color: '#EF4444' },
  emptyText: {
    textAlign: 'center',
    color: Colors.textMuted,
    marginVertical: 20,
  },
  
  // New Inventory Types
  typeToggle: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: Colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  typeToggleActive: { backgroundColor: Colors.primary },
  typeToggleText: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  
  specialSection: { marginTop: 20, padding: 16, backgroundColor: '#F8FAFC', borderRadius: 16, borderLeftWidth: 4, borderLeftColor: Colors.primary },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: Colors.text, marginBottom: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  smallAddBtn: { backgroundColor: Colors.primary, width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  variantRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
});

export default Inventory;
