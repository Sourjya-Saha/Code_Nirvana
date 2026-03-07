import React, { useState, useEffect, useRef } from 'react';
import { 
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
  Dimensions,
  Animated,
  useWindowDimensions
} from 'react-native';
import Cart from "../NearestStore/cart";
import { useCart } from '../NearestStore/CartContext'; // ✅ import context

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const scale = SCREEN_WIDTH / 375;
const verticalScale = SCREEN_HEIGHT / 812;

const normalize = (size) => Math.round(scale * size);
const verticalNormalize = (size) => Math.round(verticalScale * size);
const calculateImageDimension = () => {
  const screenWidth = Dimensions.get('window').width;
  return screenWidth < 380 ? '90%' : '80%';
};
const calculateSimilarProductWidth = () => {
  const screenWidth = Dimensions.get('window').width;
  return screenWidth < 380 ? normalize(130) : normalize(150);
};

const SimilarProductCard = ({ product, onPress, onAddToCart }) => (
  <TouchableOpacity style={styles.similarProductCard} onPress={onPress}>
    <Image 
      source={{ uri: product.picture_of_the_prod }}
      style={styles.similarProductImage}
      resizeMode="contain"
    />
    <Text style={styles.similarProductName} numberOfLines={2}>
      {product.name}
    </Text>
    <Text style={styles.similarProductPrice}>₹{product.price_per_unit}</Text>
    <TouchableOpacity 
      style={styles.addButton}
      onPress={() => onAddToCart(product)}
    >
      <Text style={styles.addButtonText}>ADD TO CART</Text>
    </TouchableOpacity>
  </TouchableOpacity>
);

export default function Product({ route, navigation }) {
  const { 
    product, 
    categoryProducts, 
    uniqueid, 
    storeid,
    categoryName,
  } = route.params;

  // ✅ cart state now lives in context — persists across all product screens
  const { cartItems, addToCart, totalItems, totalPrice } = useCart();

  const [similarProducts, setSimilarProducts] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  
  const slideAnim = useRef(new Animated.Value(-300)).current;

  const toggleMenu = () => {
    if (isMenuVisible) {
      Animated.timing(slideAnim, {
        toValue: -300,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setIsMenuVisible(false));
    } else {
      setIsMenuVisible(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  const navigateToCategory = () => {
    navigation.navigate('Category', {
      categoryName: categoryName,
      products: categoryProducts,
      uniqueid: uniqueid,
    });
  };

  const handleIncrement = () => setQuantity(prev => prev + 1);
  const handleDecrement = () => setQuantity(prev => prev > 1 ? prev - 1 : 1);

  const handleSimilarProductPress = (selectedProduct) => {
    navigation.push('Product', {
      product: selectedProduct,
      categoryProducts,
      categoryName,
      uniqueid,
      storeid,
    });
  };
  
  useEffect(() => {
    if (categoryProducts && Array.isArray(categoryProducts)) {
      const filtered = categoryProducts
        .filter(p => p.product_id !== product.product_id)
        .slice(0, 3);
      setSimilarProducts(filtered);
    }
  }, [product, categoryProducts]);

  return (
    <View style={styles.mainContainer}>
      <ImageBackground
        source={require('../assets/homepage.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          <ScrollView 
            style={styles.container} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>

            <View style={styles.productImageContainer}>
              <Image
                source={{ uri: product.picture_of_the_prod }}
                style={styles.productImage}
                resizeMode="contain"
              />
            </View>

            <View style={styles.productInfo}>
              <Text style={styles.productTitle}>{product.name}</Text>
              <Text style={styles.productSize}>
                {product.quantity_of_uom} {product.uom_name}
              </Text>
              
              <View style={styles.priceActionContainer}>
                <Text style={styles.productPrice}>₹{product.price_per_unit}</Text>
                <View style={styles.quantityContainer}>
                  <TouchableOpacity style={styles.quantityButton} onPress={handleDecrement}>
                    <Text style={styles.quantityButtonText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.quantityText}>{quantity}</Text>
                  <TouchableOpacity style={styles.quantityButton} onPress={handleIncrement}>
                    <Text style={styles.quantityButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity 
                style={styles.mainAddButton}
                onPress={() => addToCart(product, quantity)} // ✅ context addToCart
              >
                <Text style={styles.mainAddButtonText}>ADD TO CART</Text>
              </TouchableOpacity>
              
              <View style={styles.descriptionContainer}>
                <Text style={styles.sectionTitle}>Description</Text>
                <Text style={styles.description}>
                  {product.description || 'No description available'}
                </Text>
              </View>

              {similarProducts.length > 0 && (
                <>
                  <View style={styles.similarProductsSection}>
                    <Text style={styles.sectionTitle}>Similar Products</Text>
                    <TouchableOpacity onPress={navigateToCategory}>
                      <Text style={styles.seeMoreText}>see more →</Text>
                    </TouchableOpacity>
                  </View>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.similarProductsContainer}
                  >
                    {similarProducts.map((similarProduct, index) => (
                      <SimilarProductCard
                        key={`${similarProduct.product_id}-${index}`}
                        product={similarProduct}
                        onPress={() => handleSimilarProductPress(similarProduct)}
                        onAddToCart={(p) => addToCart(p, 1)} // ✅ context addToCart
                      />
                    ))}
                  </ScrollView>
                </>
              )}
            </View>
          </ScrollView>

          <Animated.View
            style={[styles.menuContainer, { transform: [{ translateX: slideAnim }] }]}
          >
            {/* ✅ no longer passing cartItems/updateQuantity/removeFromCart as props */}
            <Cart
              uniqueid={uniqueid}
              storeid={storeid}
              onClose={toggleMenu}
            />
          </Animated.View>

          {cartItems.length > 0 && !isMenuVisible && (
            <TouchableOpacity 
              style={styles.floatingCart}
              onPress={toggleMenu}
            >
              <View style={styles.floatingCartContent}>
                <View style={styles.cartIconContainer}>
                  <Text style={styles.cartIcon}>🛒</Text>
                  <Text style={styles.itemCount}>
                    {totalItems} item{totalItems !== 1 ? 's' : ''}
                  </Text>
                  <Text style={styles.cartPrice}>• ₹{totalPrice.toFixed(2)}</Text>
                </View>
                <View style={styles.viewCartSection}>
                  <Text style={styles.viewCartText}>view cart</Text>
                  <Text style={styles.viewCartArrow}>›</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1 },
  backgroundImage: { flex: 1, width: '100%', height: '100%' },
  overlay: { flex: 1, backgroundColor: 'rgba(245, 240, 240, 0.28)' },
  container: { flex: 1 },
  scrollContent: { paddingBottom: verticalNormalize(70) },
  backButton: { position: 'absolute', top: verticalNormalize(20), left: '5%', zIndex: 1, padding: normalize(10) },
  backButtonText: { fontSize: normalize(24), color: '#ffffff', fontWeight: 'bold' },
  productImageContainer: { width: '100%', height: verticalNormalize(280), backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center', marginTop: verticalNormalize(70) },
  productImage: { width: calculateImageDimension(), height: calculateImageDimension(), resizeMode: 'contain' },
  productInfo: { backgroundColor: '#ffffff', borderTopLeftRadius: normalize(30), borderTopRightRadius: normalize(30), padding: '5%', marginTop: verticalNormalize(-30) },
  productTitle: { fontSize: normalize(22), fontWeight: 'bold', color: '#333', marginBottom: '2%' },
  productSize: { fontSize: normalize(14), color: '#666', marginBottom: '2%' },
  priceActionContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4%' },
  productPrice: { fontSize: normalize(20), fontWeight: 'bold', color: '#0a47f0' },
  quantityContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: normalize(8), padding: normalize(4) },
  quantityButton: { width: normalize(26), height: normalize(26), borderRadius: normalize(13), backgroundColor: '#0a47f0', alignItems: 'center', justifyContent: 'center' },
  quantityButtonText: { color: '#ffffff', fontSize: normalize(16), fontWeight: '600' },
  quantityText: { fontSize: normalize(14), fontWeight: '600', color: '#333', paddingHorizontal: normalize(12) },
  mainAddButton: { backgroundColor: '#0a47f0', borderRadius: normalize(8), paddingVertical: verticalNormalize(12), alignItems: 'center', marginBottom: '5%', width: '100%', shadowColor: '#0a47f0', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 },
  mainAddButtonText: { color: '#ffffff', fontSize: normalize(15), fontWeight: '600' },
  descriptionContainer: { marginBottom: verticalNormalize(25) },
  sectionTitle: { fontSize: normalize(16), fontWeight: 'bold', color: '#333', marginBottom: '2%' },
  description: { fontSize: normalize(13), color: '#666', lineHeight: normalize(18) },
  similarProductsSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4%', paddingHorizontal: '2%' },
  seeMoreText: { color: '#0a47f0', fontSize: normalize(13) },
  similarProductsContainer: { padding: normalize(7), marginBottom: verticalNormalize(20) },
  similarProductCard: { width: calculateSimilarProductWidth(), backgroundColor: '#ffffff', marginRight: normalize(12), borderRadius: normalize(12), padding: '3%', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 4 },
  similarProductImage: { width: '100%', aspectRatio: 1, marginBottom: '4%' },
  similarProductName: { fontSize: normalize(13), fontWeight: '500', color: '#333', marginBottom: '2%' },
  similarProductPrice: { fontSize: normalize(14), fontWeight: 'bold', color: '#0a47f0', marginBottom: '4%' },
  addButton: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#0a47f0', borderRadius: normalize(5), paddingVertical: verticalNormalize(6), alignItems: 'center' },
  addButtonText: { color: '#0a47f0', fontSize: normalize(11), fontWeight: '600' },
  menuContainer: { position: 'absolute', width: Math.min(300, SCREEN_WIDTH * 0.8), height: '100%', backgroundColor: '#ffffff', zIndex: 100, padding: '3%', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 5, shadowOffset: { width: 2, height: 2 } },
  floatingCart: { position: 'absolute', bottom: verticalNormalize(10), left: '3%', right: '3%', backgroundColor: '#0a47f0', borderRadius: normalize(4), height: verticalNormalize(48), elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, zIndex: 1000 },
  floatingCartContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: '4%', height: '100%' },
  cartIconContainer: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  cartIcon: { fontSize: normalize(16), color: '#ffffff', marginRight: normalize(8) },
  itemCount: { color: '#ffffff', fontSize: normalize(13), flexShrink: 1 },
  cartPrice: { color: '#ffffff', fontSize: normalize(13), marginLeft: normalize(8), flexShrink: 1 },
  viewCartSection: { flexDirection: 'row', alignItems: 'center' },
  viewCartText: { color: '#ffffff', fontSize: normalize(13), marginRight: normalize(4) },
  viewCartArrow: { color: '#ffffff', fontSize: normalize(16), fontWeight: '500' },
});