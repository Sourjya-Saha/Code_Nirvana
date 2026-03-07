import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Animated, 
  ImageBackground, 
  FlatList, 
  Image, 
  TextInput, 
  Dimensions 
} from 'react-native';
import SideCON from '../SidemenuCON';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const scale = SCREEN_WIDTH / 375;

const normalize = (size) => {
  return Math.round(scale * size);
};

const ProductItem = ({ item, onPress }) => (
  <TouchableOpacity style={styles.productItem} onPress={onPress}>
    <Image 
      source={{ uri: item.picture_of_the_prod }} 
      style={styles.productImage}
      resizeMode="contain"
    />
    <View style={styles.productDetails}>
      <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
      <Text style={styles.productDescription} numberOfLines={2}>
        {item.description || 'No description available'}
      </Text>
      <View style={styles.priceContainer}>
        <Text style={styles.productPrice}>₹{item.price_per_unit}</Text>
      </View>
    </View>
  </TouchableOpacity>
);

export default function Category({ route, navigation }) {
  const { categoryName, products ,uniqueid } = route.params;
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-SCREEN_WIDTH * 0.7)).current;
  const iconRotate = useRef(new Animated.Value(0)).current;
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState(products);

  const toggleMenu = () => {
    if (isMenuVisible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -SCREEN_WIDTH * 0.7,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(iconRotate, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start(() => setIsMenuVisible(false));
    } else {
      setIsMenuVisible(true);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(iconRotate, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    }
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setFilteredProducts(products);
      return;
    }

    const searchTerm = text.toLowerCase().trim();
    const filtered = products.filter(product => 
      product.name && product.name.toLowerCase().includes(searchTerm)
    );
    setFilteredProducts(filtered);
  };

  const handleProductPress = (product) => {
    navigation.navigate('Product', {
      product: product,
      categoryProducts: products,
      categoryName: categoryName,  
      uniqueid: uniqueid,        
                
    });
  };

  const rotateIcon = iconRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  return (
    <ImageBackground
      source={require('../assets/homepage.jpg')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <View style={styles.fixedHeader}>
          <TouchableOpacity style={styles.menuButton} onPress={toggleMenu}>
            <Animated.View style={{ transform: [{ rotate: rotateIcon }] }}>
              <Text style={styles.menuButtonText}>
                {isMenuVisible ? <Text>X</Text> : <Text>☰</Text>}
              </Text>
            </Animated.View>
          </TouchableOpacity>
          
          <Text style={styles.title}>{categoryName}</Text>
          
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder={`Search in ${categoryName}`}
              placeholderTextColor="#a0a0a0"
              value={searchQuery}
              onChangeText={handleSearch}
            />
          </View>
        </View>

        <FlatList
          data={filteredProducts}
          renderItem={({ item }) => (
            <ProductItem 
              item={item} 
              onPress={() => handleProductPress(item)}
            />
          )}
          keyExtractor={(item, index) => item.id?.toString() || `product-${index}`}
          style={styles.productList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.productListContent}
        />

        <Animated.View style={[
          styles.menuContainer, 
          { transform: [{ translateX: slideAnim }] }
        ]}>
          <SideCON navigation={navigation} toggleMenu={toggleMenu} />
        </Animated.View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(245, 240, 240, 0.28)',
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    zIndex: 2,
    paddingTop: normalize(35),
    paddingBottom: normalize(15),
  },
  title: {
    fontSize: normalize(28),
    marginTop: normalize(30),
    color: '#d2effc',
    fontWeight: 'bold',
    marginBottom: normalize(10),
    textAlign: 'center',
  },
  menuContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_HEIGHT,
    backgroundColor: '#ffffff',
    paddingTop: normalize(80),
    paddingHorizontal: normalize(20),
    zIndex: 5,
    elevation: 5,
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
  },
  menuButton: {
    position: 'absolute',
    top: normalize(40),
    right: normalize(20),
    padding: normalize(5),
    borderRadius: normalize(12),
    zIndex: 10,
  },
  menuButtonText: {
    fontSize: normalize(20),
    color: '#ffffff',
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: normalize(20),
    marginBottom: normalize(15),
  },
  searchInput: {
    flex: 1,
    height: normalize(45),
    backgroundColor: '#ffffff',
    borderRadius: normalize(25),
    paddingHorizontal: normalize(20),
    fontSize: normalize(14),
    color: '#000',
  },
  productList: {
    flex: 1,
    marginTop: normalize(160),
  },
  productListContent: {
    padding: normalize(15),
  },
  productItem: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    marginBottom: normalize(15),
    borderRadius: normalize(10),
    padding: normalize(12),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  productImage: {
    width: SCREEN_WIDTH * 0.25,
    height: SCREEN_WIDTH * 0.25,
    borderRadius: normalize(8),
    marginRight: normalize(12),
  },
  productDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: normalize(16),
    fontWeight: 'bold',
    color: '#333',
    marginBottom: normalize(4),
  },
  productDescription: {
    fontSize: normalize(14),
    color: '#666',
    marginBottom: normalize(8),
  },
  priceContainer: {
    marginTop: normalize(8),
  },
  productPrice: {
    fontSize: normalize(18),
    fontWeight: '600',
    color: '#0a47f0',
  },
  searchInput: {
    flex: 1,
    height: normalize(45),
    backgroundColor: '#ffffff',
    borderRadius: normalize(25),
    paddingHorizontal: normalize(20),
    fontSize: normalize(14),
    color: '#000',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  productListContent: {
    padding: normalize(15),
  },
});