import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Plus, Minus, Tag, AlertTriangle } from 'lucide-react-native';
import Colors from '../constants/Colors';
import { LOW_STOCK_THRESHOLD } from '../constants/Constants';

const ProductCard = ({ product, onAdd, onRemove, quantity = 0, viewMode = 'grid' }) => {
  if (viewMode === 'list') {
    return (
      <View style={[styles.card, styles.listCard]}>
        <View style={{ flex: 2, paddingLeft: 12, justifyContent: 'center' }}>
          <Text style={styles.name} numberOfLines={1}>{product.name}</Text>
          <Text style={styles.brand}>{product.brand || 'Generic'}</Text>
        </View>

        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'flex-end', paddingRight: 10 }}>
          <Text style={styles.price}>${product.price.toFixed(2)}</Text>
        </View>

        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{product.status || 'In Stock'}</Text>
            </View>
            {(product.stock || 0) <= LOW_STOCK_THRESHOLD && (
              <View style={[styles.tag, { backgroundColor: '#FEE2E2' }]}>
                <Text style={[styles.tagText, { color: '#EF4444' }]}>Low ({product.stock})</Text>
              </View>
            )}
          </View>
        </View>

        <View style={{ width: 120, justifyContent: 'center', alignItems: 'center', paddingRight: 10 }}>
          {quantity > 0 ? (
            <View style={[styles.quantityContainer, {width: 100}]}>
              <TouchableOpacity style={styles.qtyButton} onPress={onRemove}>
                <Minus size={16} color={Colors.primary} />
              </TouchableOpacity>
              <Text style={styles.quantity}>{quantity}</Text>
              <TouchableOpacity style={styles.qtyButton} onPress={onAdd}>
                <Plus size={16} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={[styles.addButton, {width: 100}]} onPress={onAdd}>
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {product.discount && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{product.discount}% Off</Text>
        </View>
      )}
      
      <Image 
        source={{ uri: product.image }} 
        style={styles.image} 
        resizeMode="cover"
      />
      
      <View style={styles.details}>
        <Text style={styles.brand} numberOfLines={1}>
          {product.brand || 'Generic'}
        </Text>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.price}>${product.price.toFixed(2)}</Text>
          <View style={styles.tagContainer}>
            <View style={styles.tag}>
              <Tag size={12} color={Colors.textMuted} />
              <Text style={styles.tagText}>
                {product.status || 'In Stock'}
              </Text>
            </View>
            {(product.stock || 0) <= LOW_STOCK_THRESHOLD && (
              <View style={[styles.tag, { backgroundColor: '#FEE2E2', marginLeft: 6 }]}>
                <AlertTriangle size={12} color="#EF4444" />
                <Text style={[styles.tagText, { color: '#EF4444' }]}>Low ({product.stock})</Text>
              </View>
            )}
          </View>
        </View>

        {quantity > 0 ? (
          <View style={styles.quantityContainer}>
            <TouchableOpacity style={styles.qtyButton} onPress={onRemove}>
              <Minus size={16} color={Colors.primary} />
            </TouchableOpacity>
            <Text style={styles.quantity}>{quantity}</Text>
            <TouchableOpacity style={styles.qtyButton} onPress={onAdd}>
              <Plus size={16} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.addButton} onPress={onAdd}>
            <Text style={styles.addButtonText}>Add to Cart</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '31%', // For grid layout on web
    minWidth: 150,
    margin: '1%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  listCard: {
    width: '100%',
    flexDirection: 'row',
    height: 70,
    minHeight: 70,
    alignItems: 'center',
    paddingVertical: 10,
  },
  badge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    zIndex: 1,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  image: {
    width: '100%',
    height: 120,
  },
  details: {
    padding: 12,
  },
  brand: {
    fontSize: 10,
    textTransform: 'uppercase',
    color: Colors.textMuted,
    fontWeight: '700',
    marginBottom: 4,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    height: 40,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.secondary,
  },
  tagContainer: {
    flexDirection: 'row',
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textMuted,
    marginLeft: 4,
  },
  addButton: {
    borderWidth: 1,
    borderColor: Colors.secondary,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: Colors.secondary,
    fontSize: 14,
    fontWeight: '600',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingVertical: 4,
  },
  qtyButton: {
    padding: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  quantity: {
    marginHorizontal: 15,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
});

export default ProductCard;
