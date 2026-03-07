import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Animated, 
  ImageBackground, 
  FlatList, 
  Image, 
  ActivityIndicator, 
  Platform, 
  Dimensions,
  TextInput 
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import _, { uniqueId } from 'lodash';
import SideCON from './SidemenuCON';

// Cache configuration
let cachedProducts = null;
let lastFetchTime = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CategoryItem = React.memo(({ item, navigation, onPress }) => (
  <TouchableOpacity 
    style={styles.categoryBox} 
    onPress={() => onPress(item)}
    activeOpacity={0.7}
  >
    <View style={styles.imageContainer}>
      <Image
        source={{ uri: item.image }}
        style={styles.categoryImage}
        defaultSource={require('./assets/homepage.jpg')}
        resizeMode="contain"
        fadeDuration={0}
      />
    </View>
    <Text style={styles.categoryText} numberOfLines={2}>
      {item.category}
    </Text>
  </TouchableOpacity>
));

const CategoryGrid = React.memo(({ onCategorySelect, navigation, uniqueid }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCategories = useCallback(async () => {
    try {
      if (cachedProducts && lastFetchTime && (Date.now() - lastFetchTime < CACHE_DURATION)) {
        setCategories(cachedProducts);
        setLoading(false);
        if (onCategorySelect) {
          onCategorySelect(cachedProducts);
        }
        return;
      }

      const API_URL = 'http://127.0.0.1:5000/getAllProductsGlobal';
      const response = await fetch(API_URL);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();

      if (data) {
        const categoryGroups = _.groupBy(data, 'category');
        const categoryBoxes = Object.entries(categoryGroups)
          .map(([category, products]) => ({
            id: category,
            category: category.charAt(0).toUpperCase() + category.slice(1).toLowerCase(),
            image: products[0].picture_of_the_prod,
            products: products
          }))
          .filter(item => item.image);

        cachedProducts = categoryBoxes;
        lastFetchTime = Date.now();

        setCategories(categoryBoxes);
        if (onCategorySelect) {
          onCategorySelect(categoryBoxes);
        }
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError(`Failed to load categories: ${err.message}`);
      setLoading(false);
    }
  }, [onCategorySelect]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleCategoryPress = useCallback((item) => {
    navigation.navigate('Category', {
      categoryName: item.category,
      products: item.products,
      uniqueid: uniqueid
    });
  }, [navigation, uniqueid]);

  if (loading) {
    return (
      <View style={[styles.categoryContainer, styles.centerContent]}>
        <ActivityIndicator size="large" color="#0a47f0" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.categoryContainer, styles.centerContent]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={fetchCategories}
          activeOpacity={0.8}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.categoryMainContainer}>
      <Text style={styles.categoryTitle}>Shop by Category</Text>
      <FlatList
        data={categories}
        renderItem={({ item }) => (
          <CategoryItem 
            item={item} 
            navigation={navigation}
            onPress={handleCategoryPress}
          />
        )}
        keyExtractor={item => item.id}
        numColumns={4}
        contentContainerStyle={styles.categoryGrid}
        removeClippedSubviews={true}
        maxToRenderPerBatch={4}
        initialNumToRender={4}
        windowSize={2}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
        getItemLayout={(data, index) => ({
          length: 100,
          offset: 100 * Math.floor(index / 4),
          index,
        })}
      />
    </View>
  );
});

const CustomToggle = React.memo(({ onToggle }) => {
  const [selected, setSelected] = useState(1);
  const moveAnim = useRef(new Animated.Value(1)).current;

  const handleToggle = useCallback((value) => {
    Animated.spring(moveAnim, {
      toValue: value,
      useNativeDriver: true,
      speed: 14,
      bounciness: 6,
    }).start();
    setSelected(value);
    if (onToggle) {
      onToggle(value);
    }
  }, [moveAnim, onToggle]);

  const translateX = moveAnim.interpolate({
    inputRange: [1, 2],
    outputRange: [0, 108],
  });

  return (
    <View style={styles.toggleContainer}>
      <View style={styles.toggleWrapper}>
        <Animated.View 
          style={[
            styles.highlightBg, 
            { transform: [{ translateX }] }
          ]} 
        />
        <TouchableOpacity 
          style={styles.toggleOption}
          onPress={() => handleToggle(1)}
          activeOpacity={0.9}
        >
          <Text style={[
            styles.toggleText, 
            selected === 1 && styles.selectedText
          ]}>
            Home
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.toggleOption}
          onPress={() => handleToggle(2)}
          activeOpacity={0.9}
        >
          <Text style={[
            styles.toggleText, 
            selected === 2 && styles.selectedText
          ]}>
            My Orders
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

export default function HomeCon({ route, navigation }) {
  const { uniqueid } = route.params;
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-SCREEN_WIDTH * 0.7)).current;
  const iconRotate = useRef(new Animated.Value(0)).current;
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [categories, setCategories] = useState([]);

  const toggleMenu = useCallback(() => {
    const toValue = isMenuVisible ? -SCREEN_WIDTH * 0.7 : 0;
    const rotateValue = isMenuVisible ? 0 : 1;

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(iconRotate, {
        toValue: rotateValue,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start(() => setIsMenuVisible(!isMenuVisible));
  }, [isMenuVisible, slideAnim, iconRotate]);

  const handleToggleChange = useCallback((value) => {
    if(value === 1) {
      navigation.navigate('HomeCon', { uniqueid });
    } else {
      navigation.navigate('CONorders', { uniqueid });
    }
  }, [navigation, uniqueid]);

  // NEW: Navigate to Product Detail
  const handleProductPress = useCallback((product) => {
    navigation.navigate('Product', {
      product: product,
      // Since this is a global search, we find the sibling products in the same category
      categoryProducts: categories.find(cat => cat.category.toLowerCase() === product.category.toLowerCase())?.products || [product],
      categoryName: product.category,
      uniqueid: uniqueid,
    });
  }, [navigation, uniqueid, categories]);

  const rotateIcon = iconRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  const performSearch = useCallback(
    _.debounce((query) => {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }
    
      const lowercaseQuery = query.toLowerCase().trim();
      const filteredResults = categories.flatMap(category => 
        category.products ? 
          category.products.filter(product => 
            (product.name && product.name.toLowerCase().includes(lowercaseQuery)) ||
            (product.category && product.category.toLowerCase().includes(lowercaseQuery))
          ) : []
      );
    
      setSearchResults(filteredResults);
    }, 300),
    [categories]
  );

  const handleSearchChange = useCallback((text) => {
    setSearchQuery(text);
    performSearch(text);
  }, [performSearch]);

  return (
    <ImageBackground
      source={require('./assets/homepage.jpg')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <View style={styles.fixedHeader}>
          <TouchableOpacity 
            style={styles.menuButton} 
            onPress={toggleMenu}
            activeOpacity={0.8}
          >
            <Animated.View style={{ transform: [{ rotate: rotateIcon }] }}>
              <Text style={styles.menuButtonText}>
                {isMenuVisible ? <Text>✕</Text> : <Text>☰</Text>}
              </Text>
            </Animated.View>
          </TouchableOpacity>
          
          <Text style={styles.title}>Welcome Back!</Text>
          
          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search medicines, categories..."
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={handleSearchChange}
            />
          </View>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.smallButton}
              onPress={() => navigation.navigate('Neareststore', { uniqueid })}
              activeOpacity={0.85}
            >
              <View style={styles.buttonIconContainer}>
                <Text style={styles.buttonIcon}>📍</Text>
              </View>
              <Text style={styles.smallButtonText}>Shop from{'\n'}Nearest Store</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.smallButton}
              onPress={() => navigation.navigate('Authentic', { uniqueid })}
              activeOpacity={0.85}
            >
              <View style={styles.buttonIconContainer}>
                <Text style={styles.buttonIcon}>✓</Text>
              </View>
              <Text style={styles.smallButtonText}>Verify Product{'\n'}Authenticity</Text>
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          data={searchResults.length > 0 ? searchResults : [{ key: 'categories' }]}
          renderItem={({ item }) => 
            item.key === 'categories' ? (
              <CategoryGrid 
                onCategorySelect={setCategories} 
                navigation={navigation}
                uniqueid={uniqueid}
              />
            ) : (
              <TouchableOpacity 
                style={styles.searchResultItem}
                activeOpacity={0.7}
                onPress={() => handleProductPress(item)} // ADDED: Trigger navigation here
              >
                <Image 
                  source={{ uri: item.picture_of_the_prod }} 
                  style={styles.searchResultImage} 
                  resizeMode="contain"
                />
                <View style={styles.searchResultTextContainer}>
                  <Text style={styles.searchResultTitle} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.searchResultSubtitle} numberOfLines={1}>{item.category}</Text>
                  <Text style={styles.searchResultPrice}>₹{item.price_per_unit}</Text>
                </View>
              </TouchableOpacity>
            )
          }
          keyExtractor={(item, index) => item.id?.toString() || `search-${index}`}
          style={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          windowSize={2}
          maxToRenderPerBatch={1}
          removeClippedSubviews={true}
          initialNumToRender={1}
          keyboardShouldPersistTaps="handled"
          onEndReachedThreshold={0.5}
          bounces={false}
        />

        <Animated.View style={[styles.menuContainer, { transform: [{ translateX: slideAnim }] }]}>
          <SideCON uniqueid={uniqueid} navigation={navigation} toggleMenu={toggleMenu} />
        </Animated.View>

        <View style={styles.toggleContainerBottom}>
          <CustomToggle onToggle={handleToggleChange} />
        </View>
      </View>
    </ImageBackground>
  );
}

// ... styles remain the same

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(245, 245, 250, 0.35)',
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    zIndex: 2,
    paddingTop: 35,
    paddingBottom: 15,
  },
  scrollContent: {
    flex: 1,
    marginTop: 190,
  },
  title: {
    fontSize: 32,
    color: '#ffffff',
    fontWeight: '700',
    marginBottom: 6,
    marginLeft: -80,
    textAlign: 'center',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  menuContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 250,
    height: '120%',
    backgroundColor: '#ffffff',
    paddingTop: 80,
    paddingHorizontal: 20,
    zIndex: 5,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 4, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  menuButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    backdropFilter: 'blur(10px)',
    zIndex: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  menuButtonText: {
    fontSize: 22,
    color: '#ffffff',
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
    position: 'relative',
  },
  searchIcon: {
    position: 'absolute',
    left: 35,
    fontSize: 18,
    zIndex: 1,
  },
  searchInput: {
    flex: 1,
    height: 48,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingLeft: 45,
    paddingRight: 20,
    fontSize: 15,
    color: '#1f2937',
    fontWeight: '500',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  searchResultItem: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    marginHorizontal: 15,
    marginVertical: -9,
    marginTop: 15,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  searchResultImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: '#f9fafb',
  },
  searchResultTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  searchResultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    letterSpacing: 0.2,
  },
  searchResultSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
    fontWeight: '500',
  },
  searchResultPrice: {
    fontSize: 15,
    color: '#0a47f0',
    fontWeight: '700',
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 5,
    marginBottom: 10,
  },
  smallButton: {
    width: '40%',
    height: 52,
    backgroundColor: '#ffffff',
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 15,
    ...Platform.select({
      ios: {
        shadowColor: '#0a47f0',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  buttonIconContainer: {
    marginBottom: 2,
  },
  buttonIcon: {
    fontSize: 16,
  },
  smallButtonText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#0a47f0',
    textAlign: 'center',
    letterSpacing: 0.3,
    lineHeight: 15,
  },
  categoryMainContainer: {
    padding: 10,
    backgroundColor: 'transparent',
  },
  categoryTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1f2937',
    padding: 4,
    marginBottom: 12,
    marginLeft: 4,
    letterSpacing: 0.3,
  },
  categoryGrid: {
    paddingHorizontal: 2,
  },
  categoryBox: {
    flex: 1,
    margin: 2,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 4,
    maxWidth: '100%',
    minWidth: '20%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 4,
    padding: 4,
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  categoryText: {
    fontSize: 9,
    color: '#374151',
    textAlign: 'center',
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 0.2,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: '#0a47f0',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#0a47f0',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  toggleContainerBottom: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: 10,
  },
  toggleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleWrapper: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 28,
    position: 'relative',
    width: 220,
    height: 48,
    padding: 3,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  highlightBg: {
    position: 'absolute',
    width: '48%',
    height: '87%',
    backgroundColor: '#000000',
    borderRadius: 24,
    top: 0,
    left: 2,
    bottom: 0,
    margin: 3,
    zIndex: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  toggleOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    height: 42,
  },
  toggleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
    letterSpacing: 0.3,
  },
  selectedText: {
    color: '#ffffff',
    fontWeight: '700',
  },
}); 
