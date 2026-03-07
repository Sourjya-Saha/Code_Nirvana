import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
  Image,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Global product cache (mirrors HomeCon exactly) ──────────────────────────
let _cachedMap   = null;
let _lastFetch   = null;
const CACHE_MS   = 5 * 60 * 1000;

const getProductCache = async () => {
  if (_cachedMap && _lastFetch && Date.now() - _lastFetch < CACHE_MS) return _cachedMap;
  const res  = await fetch('http://127.0.0.1:5000/getAllProductsGlobal');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  _cachedMap  = new Map();
  data.forEach(p => {
    _cachedMap.set(String(p.product_id), p);
    _cachedMap.set(Number(p.product_id), p);
  });
  _lastFetch = Date.now();
  return _cachedMap;
};

// ─── Custom Toggle ────────────────────────────────────────────────────────────
const CustomToggle = React.memo(({ onToggle }) => {
  const [selected, setSelected] = useState(2);
  const moveAnim = useRef(new Animated.Value(2)).current;

  const handleToggle = useCallback((value) => {
    Animated.spring(moveAnim, { toValue: value, useNativeDriver: true, speed: 14, bounciness: 6 }).start();
    setSelected(value);
    onToggle?.(value);
  }, [moveAnim, onToggle]);

  const translateX = moveAnim.interpolate({ inputRange: [1, 2], outputRange: [0, 108] });

  return (
    <View style={styles.toggleContainer}>
      <View style={styles.toggleWrapper}>
        <Animated.View style={[styles.highlightBg, { transform: [{ translateX }] }]} />
        <TouchableOpacity style={styles.toggleOption} onPress={() => handleToggle(1)} activeOpacity={0.9}>
          <Text style={[styles.toggleText, selected === 1 && styles.selectedText]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toggleOption} onPress={() => handleToggle(2)} activeOpacity={0.9}>
          <Text style={[styles.toggleText, selected === 2 && styles.selectedText]}>My Orders</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

// ─── Status Chip ─────────────────────────────────────────────────────────────
const StatusChip = ({ status }) => {
  const paid = status === 'paid';
  return (
    <View style={[styles.statusChip, paid ? styles.paidChip : styles.unpaidChip]}>
      <Ionicons name={paid ? 'checkmark-circle' : 'time-outline'} size={12} color={paid ? '#16a34a' : '#d97706'} />
      <Text style={[styles.statusText, { color: paid ? '#16a34a' : '#d97706' }]}>
        {paid ? 'Paid' : 'Pending'}
      </Text>
    </View>
  );
};

// ─── Expandable Product Dropdown ─────────────────────────────────────────────
const ProductDropdown = ({ resolvedProducts, visible }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: visible ? 1 : 0,
      useNativeDriver: false,
      speed: 16,
      bounciness: 3,
    }).start();
  }, [visible]);

  const maxHeight = anim.interpolate({
    inputRange:  [0, 1],
    outputRange: [0, Math.min(resolvedProducts.length * 68 + 40, 300)],
  });
  const opacity = anim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0, 1] });

  if (resolvedProducts.length === 0) return null;

  return (
    <Animated.View style={[styles.dropdown, { maxHeight, opacity }]}>
      <View style={styles.dropdownInner}>
        <Text style={styles.dropdownTitle}>Order Items</Text>
        {resolvedProducts.map((p, i) => (
          <View
            key={i}
            style={[styles.dropdownRow, i < resolvedProducts.length - 1 && styles.dropdownRowBorder]}
          >
            <Image
              source={{ uri: p.picture_of_the_prod }}
              style={styles.dropdownImg}
              resizeMode="contain"
            />
            <View style={styles.dropdownInfo}>
              <Text style={styles.dropdownName} numberOfLines={1}>{p.name}</Text>
              <Text style={styles.dropdownCategory}>{p.category}</Text>
            </View>
            <View style={styles.dropdownRight}>
              <Text style={styles.dropdownPrice}>₹{p.price_per_unit}</Text>
              <View style={styles.dropdownQtyBadge}>
                <Text style={styles.dropdownQtyText}>×{p.quantity}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </Animated.View>
  );
};

// ─── Order Card ───────────────────────────────────────────────────────────────
const OrderCard = React.memo(({ item, index, productMap }) => {
  const [expanded, setExpanded] = useState(false);
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const slideAnim  = useRef(new Animated.Value(28)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 380, delay: index * 70, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, speed: 14, bounciness: 4, delay: index * 70, useNativeDriver: true }),
    ]).start();
  }, []);

  // Resolve products — handles multiple possible API shapes
  const resolvedProducts = React.useMemo(() => {
    if (!productMap) return [];
    let details = [];
    if (Array.isArray(item.order_details) && item.order_details.length > 0) {
      details = item.order_details.map(d => ({ pid: d.product_id, qty: d.quantity ?? 1 }));
    } else if (Array.isArray(item.items) && item.items.length > 0) {
      details = item.items.map(d => ({ pid: d.product_id ?? d.id, qty: d.quantity ?? 1 }));
    } else if (Array.isArray(item.product_ids)) {
      details = item.product_ids.map((pid, i) => ({
        pid,
        qty: Array.isArray(item.quantities) ? (item.quantities[i] ?? 1) : 1,
      }));
    }
    return details
      .map(({ pid, qty }) => {
        const prod = productMap.get(String(pid)) ?? productMap.get(Number(pid));
        return prod ? { ...prod, quantity: qty } : null;
      })
      .filter(Boolean);
  }, [item, productMap]);

  const toggleExpand = useCallback(() => {
    setExpanded(v => !v);
    Animated.timing(rotateAnim, {
      toValue: expanded ? 0 : 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [expanded, rotateAnim]);

  const chevronRotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  const thumbs    = resolvedProducts.slice(0, 3);
  const extra     = resolvedProducts.length - 3;
  const itemCount = resolvedProducts.length || (item.order_details?.length ?? 0);

  return (
    <Animated.View style={[styles.cardWrapper, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <TouchableOpacity activeOpacity={0.95} onPress={toggleExpand} style={styles.card}>

        {/* Left panel */}
        <View style={styles.cardLeft}>
          <View style={styles.boxIcon}>
            <Ionicons name="cube-outline" size={20} color="#0a47f0" />
          </View>
          <Text style={styles.deliveryLabel}>
            {item.status === 'paid' ? 'Delivered' : 'Placed'}
          </Text>
          <Text style={styles.dateText}>{item.date_time}</Text>
          <Text style={styles.customerName} numberOfLines={1}>{item.customer_name}</Text>
          {itemCount > 0 && (
            <View style={styles.itemCountBadge}>
              <Text style={styles.itemCountText}>{itemCount} item{itemCount !== 1 ? 's' : ''}</Text>
            </View>
          )}
        </View>

        {/* Right panel */}
        <View style={styles.cardRight}>
          <View style={styles.priceRow}>
            <Text style={styles.priceText}>₹{item.total}</Text>
            <View style={styles.priceRowRight}>
              <StatusChip status={item.status} />
              <Animated.View style={{ transform: [{ rotate: chevronRotate }], marginLeft: 6 }}>
                <Ionicons name="chevron-down" size={16} color="#9ca3af" />
              </Animated.View>
            </View>
          </View>

          {/* Thumbnail strip */}
          {thumbs.length > 0 ? (
            <View style={styles.thumbStrip}>
              {thumbs.map((p, i) => (
                <View key={i} style={styles.thumbBox}>
                  <Image source={{ uri: p.picture_of_the_prod }} style={styles.thumbImg} resizeMode="contain" />
                  {p.quantity > 1 && (
                    <View style={styles.thumbQty}>
                      <Text style={styles.thumbQtyText}>{p.quantity}</Text>
                    </View>
                  )}
                </View>
              ))}
              {extra > 0 && (
                <View style={[styles.thumbBox, styles.extraBox]}>
                  <Text style={styles.extraText}>+{extra}</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.orderIdRow}>
              <Ionicons name="receipt-outline" size={13} color="#9ca3af" />
              <Text style={styles.orderIdText}>Order #{item.order_id}</Text>
            </View>
          )}

          {/* Rate button only */}
          <TouchableOpacity style={styles.rateBtn} activeOpacity={0.8}>
            <Ionicons name="star-outline" size={13} color="#d97706" />
            <Text style={styles.rateText}>Rate Products</Text>
          </TouchableOpacity>
        </View>

      </TouchableOpacity>

      {/* Expandable dropdown */}
      <ProductDropdown resolvedProducts={resolvedProducts} visible={expanded} />
    </Animated.View>
  );
});

// ─── Empty State ─────────────────────────────────────────────────────────────
const EmptyState = () => (
  <View style={styles.emptyContainer}>
    <Ionicons name="bag-outline" size={64} color="#d1d5db" />
    <Text style={styles.emptyTitle}>No orders yet</Text>
    <Text style={styles.emptySubtitle}>Your order history will appear here</Text>
  </View>
);

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function CONorders({ route, navigation }) {
  const { uniqueid } = route.params;

  const [orders,     setOrders]     = useState([]);
  const [productMap, setProductMap] = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadData();
    Animated.timing(headerAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [ordersRes, map] = await Promise.all([
        fetch(`http://127.0.0.1:5000/get_orders/${uniqueid}`),
        getProductCache(),
      ]);
      const result = await ordersRes.json();
      if (result.status === 'success') setOrders(result.data);
      else setError(result.message);
      setProductMap(map);
    } catch {
      setError('Failed to load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleChange = useCallback((value) => {
    if (value === 1) navigation.navigate('HomeCon', { uniqueid });
    else navigation.navigate('CONorders', { uniqueid });
  }, [navigation, uniqueid]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0a47f0" />
        <Text style={styles.loadingText}>Loading your orders…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons name="wifi-outline" size={48} color="#d1d5db" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.screen}>

      <Animated.View style={[styles.header, { opacity: headerAnim }]}>
        <View>
          <Text style={styles.headerEyebrow}>YOUR HISTORY</Text>
          <Text style={styles.headerTitle}>My Orders</Text>
        </View>
        <View style={styles.orderCountBadge}>
          <Text style={styles.orderCountText}>{orders.length}</Text>
        </View>
      </Animated.View>

      <FlatList
        data={orders}
        keyExtractor={(item, i) => item.order_id?.toString() ?? i.toString()}
        renderItem={({ item, index }) => (
          <OrderCard item={item} index={index} productMap={productMap} />
        )}
        contentContainerStyle={[styles.listContent, orders.length === 0 && styles.listEmpty]}
        ListEmptyComponent={<EmptyState />}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.toggleBar}>
        <CustomToggle onToggle={handleToggleChange} />
      </View>

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: '#f3f4f8' },
  centered: { flex: 1, backgroundColor: '#f3f4f8', justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: '#9ca3af', fontWeight: '500' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 44, paddingBottom: 18, paddingHorizontal: 22,
    backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  headerEyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 2, color: '#9ca3af', marginBottom: 2 },
  headerTitle:   { fontSize: 26, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  orderCountBadge: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#0a47f0', justifyContent: 'center', alignItems: 'center' },
  orderCountText:  { fontSize: 16, fontWeight: '700', color: '#ffffff' },

  listContent: { padding: 16, paddingBottom: 110 },
  listEmpty:   { flex: 1, justifyContent: 'center' },

  cardWrapper: { marginBottom: 14 },
  card: {
    backgroundColor: '#ffffff', borderRadius: 18, flexDirection: 'row', overflow: 'hidden',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10 },
      android: { elevation: 3 },
    }),
  },

  cardLeft: { width: 112, backgroundColor: '#f8f9ff', padding: 14, borderRightWidth: 1, borderRightColor: '#e5e7eb' },
  boxIcon:  { width: 36, height: 36, borderRadius: 10, backgroundColor: '#eff3ff', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  deliveryLabel: { fontSize: 12, fontWeight: '700', color: '#111827', lineHeight: 16, marginBottom: 4 },
  dateText:      { fontSize: 10, color: '#9ca3af', fontWeight: '500', marginBottom: 6 },
  customerName:  { fontSize: 11, color: '#6b7280', fontWeight: '600', marginBottom: 6 },
  itemCountBadge:{ backgroundColor: '#eff3ff', alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  itemCountText: { fontSize: 10, color: '#0a47f0', fontWeight: '600' },

  cardRight: { flex: 1, padding: 14 },
  priceRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  priceRowRight: { flexDirection: 'row', alignItems: 'center' },
  priceText: { fontSize: 18, fontWeight: '800', color: '#111827', letterSpacing: -0.3 },

  statusChip:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, gap: 3 },
  paidChip:    { backgroundColor: '#dcfce7' },
  unpaidChip:  { backgroundColor: '#fef3c7' },
  statusText:  { fontSize: 11, fontWeight: '700' },

  thumbStrip: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 4 },
  thumbBox: {
    width: 46, height: 46, borderRadius: 10, backgroundColor: '#f9fafb',
    borderWidth: 1, borderColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center', position: 'relative',
  },
  thumbImg: { width: 38, height: 38 },
  thumbQty: {
    position: 'absolute', top: -5, right: -5, width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#111827', justifyContent: 'center', alignItems: 'center', zIndex: 2,
  },
  thumbQtyText: { fontSize: 8, fontWeight: '800', color: '#fff' },
  extraBox:  { backgroundColor: '#eff3ff', borderColor: '#c7d2fe' },
  extraText: { fontSize: 11, fontWeight: '700', color: '#0a47f0' },

  orderIdRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 },
  orderIdText: { fontSize: 12, color: '#9ca3af', fontWeight: '500' },

  rateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a',
  },
  rateText: { fontSize: 12, fontWeight: '700', color: '#d97706' },

  // Dropdown
  dropdown: {
    overflow: 'hidden', backgroundColor: '#ffffff',
    borderBottomLeftRadius: 18, borderBottomRightRadius: 18,
    borderTopWidth: 1, borderTopColor: '#f0f4ff',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  dropdownInner:    { padding: 14 },
  dropdownTitle:    { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, color: '#9ca3af', marginBottom: 10, textTransform: 'uppercase' },
  dropdownRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  dropdownRowBorder:{ borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  dropdownImg:      { width: 44, height: 44, borderRadius: 8, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', marginRight: 10 },
  dropdownInfo:     { flex: 1 },
  dropdownName:     { fontSize: 13, fontWeight: '600', color: '#111827', marginBottom: 2 },
  dropdownCategory: { fontSize: 11, color: '#9ca3af', fontWeight: '500' },
  dropdownRight:    { alignItems: 'flex-end', gap: 4 },
  dropdownPrice:    { fontSize: 13, fontWeight: '700', color: '#0a47f0' },
  dropdownQtyBadge: { backgroundColor: '#f3f4f6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  dropdownQtyText:  { fontSize: 11, fontWeight: '600', color: '#374151' },

  errorText: { fontSize: 15, color: '#6b7280', textAlign: 'center', paddingHorizontal: 30, fontWeight: '500' },
  retryBtn:  { backgroundColor: '#0a47f0', paddingVertical: 11, paddingHorizontal: 28, borderRadius: 22, marginTop: 4 },
  retryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  emptyContainer: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle:     { fontSize: 20, fontWeight: '700', color: '#374151' },
  emptySubtitle:  { fontSize: 14, color: '#9ca3af', fontWeight: '500' },

  toggleBar:       { position: 'absolute', bottom: 10, left: 0, right: 0, alignItems: 'center', paddingBottom: 10 },
  toggleContainer: { alignItems: 'center', justifyContent: 'center' },
  toggleWrapper: {
    flexDirection: 'row', backgroundColor: '#ffffff', borderRadius: 28,
    position: 'relative', width: 220, height: 48, padding: 3,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  highlightBg: {
    position: 'absolute', width: '48%', height: '87%', backgroundColor: '#000000',
    borderRadius: 24, top: 0, left: 2, bottom: 0, margin: 3, zIndex: 1,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4 },
      android: { elevation: 3 },
    }),
  },
  toggleOption: { flex: 1, alignItems: 'center', justifyContent: 'center', zIndex: 2, height: 42 },
  toggleText:   { fontSize: 15, fontWeight: '600', color: '#6b7280', letterSpacing: 0.3 },
  selectedText: { color: '#ffffff', fontWeight: '700' },
});