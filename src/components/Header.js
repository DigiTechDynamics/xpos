import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Search, LayoutGrid, List, Smartphone, Sparkles, Shirt, Footprints, Watch, AlertTriangle, Clock } from 'lucide-react-native';
import Colors from '../constants/Colors';
import { LOW_STOCK_THRESHOLD } from '../constants/Constants';

const CategoryChip = ({ icon: Icon, label, active, count, onPress }) => (
  <TouchableOpacity 
    style={[styles.chip, active && styles.activeChip]}
    onPress={onPress}
  >
    <Icon size={20} color={active ? '#FFFFFF' : Colors.textMuted} />
    <View style={styles.chipTextContainer}>
      <Text style={[styles.chipLabel, active && styles.activeChipLabel]}>
        {label}
      </Text>
      <Text style={[styles.chipCount, active && styles.activeChipCount]}>
        {count} Items
      </Text>
    </View>
  </TouchableOpacity>
);

const CATEGORIES = [
  { id: 'All', icon: LayoutGrid, label: 'All' },
  { id: 'Electronics', icon: Smartphone, label: 'Electronics' },
  { id: 'Cosmetics', icon: Sparkles, label: 'Cosmetics' },
  { id: 'Fashion', icon: Shirt, label: 'Fashion' },
  { id: 'Shoes', icon: Footprints, label: 'Shoes' },
  { id: 'Accessories', icon: Watch, label: 'Accessories' },
];

const Header = ({ searchText, setSearchText, activeCategory, setActiveCategory, productCounts = {}, onOpenShiftManager, viewMode, setViewMode }) => {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.searchContainer}>
          <Search size={20} color={Colors.textMuted} />
          <TextInput 
            placeholder="Search Product here..." 
            style={styles.searchInput}
            placeholderTextColor={Colors.textMuted}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
        <View style={{ flexDirection: 'row', marginLeft: 15 }}>
          <TouchableOpacity 
            style={[styles.filterButton, viewMode === 'grid' && { backgroundColor: Colors.primary }, { marginLeft: 0, borderRightWidth: 0, borderTopRightRadius: 0, borderBottomRightRadius: 0 }]}
            onPress={() => setViewMode('grid')}
          >
            <LayoutGrid size={20} color={viewMode === 'grid' ? '#FFF' : Colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, viewMode === 'list' && { backgroundColor: Colors.primary }, { marginLeft: 0, borderLeftWidth: 0, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }]}
            onPress={() => setViewMode('list')}
          >
            <List size={20} color={viewMode === 'list' ? '#FFF' : Colors.textMuted} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.filterButton} onPress={onOpenShiftManager}>
          <Clock size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContent}
      >
        {CATEGORIES.map((cat) => (
          <CategoryChip 
            key={cat.id}
            icon={cat.icon} 
            label={cat.label} 
            active={activeCategory === cat.id} 
            count={productCounts[cat.id] || 0}
            onPress={() => setActiveCategory(cat.id)}
          />
        ))}
        {productCounts['Low Stock'] > 0 && (
          <CategoryChip 
            icon={AlertTriangle} 
            label="Low Stock" 
            active={activeCategory === 'Low Stock'} 
            count={productCounts['Low Stock']}
            onPress={() => setActiveCategory('Low Stock')}
          />
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: 'transparent',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 50,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: Colors.text,
  },
  filterButton: {
    width: 50,
    height: 50,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 15,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryScroll: {
    flexGrow: 0,
  },
  categoryContent: {
    paddingRight: 20,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 12,
    marginRight: 12,
    minWidth: 140,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activeChip: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipTextContainer: {
    marginLeft: 10,
  },
  chipLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  activeChipLabel: {
    color: '#FFFFFF',
  },
  chipCount: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  activeChipCount: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
});

export default Header;
