  import React, { useEffect, useState, useRef } from 'react';
  import {
    View,
    Text,
    TouchableOpacity,
    Animated,
    StyleSheet,
    Image,
    ScrollView,
    SafeAreaView,
  } from 'react-native';
  import Cart from './cart';

  export default function Store({ route, navigation }) {
    const { uniqueid, storename, storeid, searchMedicines } = route.params;

    const [products, setProducts] = useState([]);
    const [cartItems, setCartItems] = useState([]);
    const [isMenuVisible, setIsMenuVisible] = useState(false);
    const [selectedProductId, setSelectedProductId] = useState(null);
    const [quantities, setQuantities] = useState({});

    const slideAnim = useRef(new Animated.Value(-300)).current;

    // Toggle Cart Menu
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

    // Fetch Products
    const sendStoreIdToAPI = async () => {
      try {
        const response = await fetch('http://127.0.0.1:5000/getProducts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: storeid }),
        });

        if (!response.ok) throw new Error('Failed to fetch products');
        const data = await response.json();
        setProducts(data);
      } catch (error) {
        console.error('Error:', error.message);
      }
    };

    // Add to Cart
    const addToCart = (product, quantity) => {
      setCartItems((prevCart) => {
        const existingProduct = prevCart.find(
          (item) => item.product_id === product.product_id
        );
        if (existingProduct) {
          return prevCart.map((item) =>
            item.product_id === product.product_id
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
        } else {
          return [...prevCart, { ...product, quantity }];
        }
      });
      setSelectedProductId(null);
    };

    // Increment Quantity
    const incrementQuantity = (productId) => {
      setQuantities((prev) => ({
        ...prev,
        [productId]: (prev[productId] || 1) + 1,
      }));
    };

    // Decrement Quantity
    const decrementQuantity = (productId) => {
      setQuantities((prev) => ({
        ...prev,
        [productId]: Math.max((prev[productId] || 1) - 1, 1),
      }));
    };

    // Update Quantity in Cart
    const updateQuantity = (productId, quantity) => {
      if (quantity < 1) return;
      setCartItems((prevCart) =>
        prevCart.map((item) =>
          item.product_id === productId ? { ...item, quantity } : item
        )
      );
    };

    // Remove from Cart
    const removeFromCart = (productId) => {
      setCartItems((prevCart) =>
        prevCart.filter((item) => item.product_id !== productId)
      );
    };

    // Filter products based on search
    const filteredProducts = products.filter((product) => {
      if (searchMedicines && searchMedicines.length > 0) {
        const searchWords = searchMedicines
          .flatMap((medicine) => medicine.split(/\s+/))
          .map((word) => word.toLowerCase().trim());
        return searchWords.some((word) =>
          product.name.toLowerCase().includes(word)
        );
      }
      return true;
    });

    useEffect(() => {
      sendStoreIdToAPI();
    }, []);

    // Calculate total items and price for floating cart
    const totalItems = cartItems.reduce((total, item) => total + item.quantity, 0);
    const totalPrice = cartItems.reduce(
      (total, item) => total + item.quantity * item.price_per_unit,
      0
    );

    return (
      <SafeAreaView style={styles.container}>
         <Text style={styles.title}>
          
        </Text>
        <Text style={styles.title}>
          Store: {storename} | ID: {storeid} | User: {uniqueid}
        </Text>

        <View style={styles.buttonContainer}>
          {/* <TouchableOpacity style={styles.optionButton}>
            <Text style={styles.optionText}>Handwritten Prescription</Text>
          </TouchableOpacity> */}

          {/* <TouchableOpacity
            style={styles.optionButton}
            onPress={() => navigation.navigate('Printed', { uniqueid, storeid, storename })}
          >
            <Text style={styles.optionText}>Upload Prescription</Text>
          </TouchableOpacity> */}
        </View>

        <Animated.View
          style={[styles.menuContainer, { transform: [{ translateX: slideAnim }] }]}
        >
        <Cart
    uniqueid={uniqueid}
    cartItems={cartItems}
    updateQuantity={updateQuantity}
    removeFromCart={removeFromCart}
    storeid={storeid}
    onClose={toggleMenu}  // Add this line
  />
        </Animated.View>

        <View style={styles.tableContainer}>
          <ScrollView>
            <View style={styles.tableHeader}>
              <Text style={styles.headerText}>Image</Text>
              <Text style={styles.headerText}>Name</Text>
              <Text style={styles.headerText}>Price</Text>
              <Text style={styles.headerText}>Actions</Text>
            </View>

            {filteredProducts.map((item) => (
              <View key={item.product_id} style={styles.row}>
                <Image
                  source={{ uri: item.picture_of_the_prod }}
                  style={styles.image}
                  resizeMode="cover"
                />
                <Text style={styles.cell}>{item.name}</Text>
                <Text style={styles.cell}>
                  Rs {item.price_per_unit.toFixed(2)}
                </Text>
                <View style={styles.actionsContainer}>
                  {selectedProductId === item.product_id ? (
                    <View style={styles.quantityEditor}>
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => decrementQuantity(item.product_id)}
                      >
                        <Text style={styles.quantityButtonText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.quantityText}>
                        {quantities[item.product_id] || 1}
                      </Text>
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => incrementQuantity(item.product_id)}
                      >
                        <Text style={styles.quantityButtonText}>+</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.addToCartButton}
                        onPress={() =>
                          addToCart(item, quantities[item.product_id] || 1)
                        }
                      >
                        <Text style={styles.addToCartButtonText}>Add</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={() => setSelectedProductId(item.product_id)}
                    >
                      <Text style={styles.addButtonText}>+</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {cartItems.length > 0 && (
          <TouchableOpacity 
            style={styles.floatingCart}
            onPress={toggleMenu}
          >
            <View style={styles.floatingCartContent}>
              <View style={styles.cartIconContainer}>
                <Text style={styles.cartIcon}>🛒</Text>
                <Text style={styles.itemCount}>{totalItems} item{totalItems !== 1 ? 's' : ''}</Text>
                <Text style={styles.cartPrice}>• ₹{totalPrice.toFixed(2)}</Text>
              </View>
              <View style={styles.viewCartSection}>
                <Text style={styles.viewCartText}>view cart</Text>
                <Text style={styles.viewCartArrow}>›</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      </SafeAreaView>
    );
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#f4f7ff',
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#0a47f0',
      textAlign: 'center',
      marginVertical: 10,
    },
    tableContainer: {
      flex: 1,
      backgroundColor: '#ffffff',
      borderRadius: 8,
      margin: 10,
      paddingVertical: 5,
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: '#0a47f0',
      borderRadius: 8,
      paddingVertical: 10,
      marginBottom: 5,
    },
    headerText: {
      flex: 1,
      color: '#ffffff',
      fontWeight: 'bold',
      textAlign: 'center',
      fontSize: 14,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 5,
    },
    cell: {
      flex: 1,
      textAlign: 'center',
      fontSize: 14,
      color: '#333',
    },
    image: {
      width: 50,
      height: 50,
      borderRadius: 5,
    },
    addButton: {
      backgroundColor: '#0a47f0',
      borderRadius: 5,
      padding: 10,
    },
    addButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    },
    menuContainer: {
      position: 'absolute',
      width: 300,
      height: '100%',
      backgroundColor: '#ffffff',
      zIndex: 100,
      padding: 10,
      shadowColor: '#000',
      shadowOpacity: 0.3,
      shadowRadius: 5,
      shadowOffset: { width: 2, height: 2 },
    },
    actionsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    quantityEditor: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    quantityButton: {
      backgroundColor: '#0a47f0',
      padding: 5,
      borderRadius: 5,
      marginHorizontal: 5,
    },
    quantityButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    },
    quantityText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#333',
    },
    addToCartButton: {
      backgroundColor: '#0a47f0',
      borderRadius: 5,
      paddingHorizontal: 10,
      paddingVertical: 5,
      marginLeft: 10,
    },
    addToCartButtonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: 'bold',
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: 15,
    },
    optionButton: {
      paddingVertical: 12,
      paddingHorizontal: 20,
      backgroundColor: '#0a47f0',
      borderRadius: 8,
      elevation: 3,
    },
    optionText: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: 'bold',
    },
    floatingCart: {
      position: 'absolute',
      bottom: 10,
      left: 10,
      right: 10,
      backgroundColor: '#0a47f0',
      borderRadius: 4,
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      height: 48,
    },
    floatingCartContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      height: '100%',
    },
    cartIconContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    cartIcon: {
      fontSize: 18,
      color: '#ffffff',
      marginRight: 8,
    },
    itemCount: {
      color: '#ffffff',
      fontSize: 14,
    },
    cartPrice: {
      color: '#ffffff',
      fontSize: 14,
      marginLeft: 8,
    },
    viewCartSection: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    viewCartText: {
      color: '#ffffff',
      fontSize: 14,
      marginRight: 4,
    },
    viewCartArrow: {
      color: '#ffffff',
      fontSize: 18,
      fontWeight: '500',
    },
  });