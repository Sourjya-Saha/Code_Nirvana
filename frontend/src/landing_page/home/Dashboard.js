import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, AreaChart, Bar, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line } from 'recharts';
import { Doughnut } from 'react-chartjs-2';
import { useAuth } from '../user_login/AuthContext'; // Import the useAuth hook for user context
import './Dashboards.css';
import { ArrowUpRight } from 'lucide-react';
import Sidebar from '../Sidebar';
import Header from './Haeder'; // Corrected the import for Header
import CategorySalesChart from './Piechart';
import './CategorySalesChart.css';
import Nav from './Nav';
import { useNavigate } from 'react-router-dom';
import TransactionMetricCharts from './TransactionMetricsChart'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faBox, 
  faShoppingCart, 
  faLayerGroup, 
  faWarehouse, 
  faRupeeSign, 
  faListAlt, 
  faTimesCircle, 
  faBoxOpen ,
  faCheck, 
  faTimes,
} from '@fortawesome/free-solid-svg-icons';
import { Card, CardContent } from '@mui/material';
import { ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown } from '@mui/icons-material';
import Details from './details';
import Notifications from './Notifications';
import ShipmentOrderDialog from './ShipmentOrder';
import './ShipmentDialog.css';
import MonthlySalesTrendChart from './MonthlySalesTrend';

function Dashboard() {
  const { userId } = useAuth(); // Get the logged-in user context
  const [productsData, setProductsData] = useState([]);
  const [ordersData, setOrdersData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [transactionsData, setTransactionsData] = useState([]);
  const navigate = useNavigate();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  // Function to handle Notifications click
  const handleNotificationsClick = () => {
    setIsNotificationsOpen((prevState) => !prevState);
  };

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // Default to current month
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const parseAPIDateTime = (dateTimeString) => {
    // Explicitly parse the datetime string to handle different formats
    // This creates a Date object that matches the timezone
    const parsedDate = new Date(Date.parse(dateTimeString));
    return parsedDate;
  };
  
  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return; // Check if user is defined
      try {
        const transactionsResponse = await fetch('http://127.0.0.1:5000/get_all_transactions_retailer', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ user_id: userId }),
        });
        const transactions = await transactionsResponse.json();
        setTransactionsData(transactions);
        
        // Fetch products for the logged-in user
        const productsResponse = await fetch('http://127.0.0.1:5000/getProducts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ user_id: userId }), // Include user ID in the request
        });
        const products = await productsResponse.json();
        setProductsData(products);

        // Fetch orders for the logged-in user
        const ordersResponse = await fetch('http://127.0.0.1:5000/getAllOrders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ user_id: userId }), // Use userId here
        });
        const orders = await ordersResponse.json();
        setOrdersData(orders);
        console.log(orders);
        console.log("USERID" , userId)

        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]); // Fetch data whenever userId changes


  

  if (loading) {
    return (
      <div>
        <div className='load'>
          <div className='loader'>Loading...</div>
        </div>
        <p className='lding'>Loading Your Dashboard....</p>
      </div>
    );
  }

  // Calculate metrics
  const productCategories = [...new Set(productsData.map(product => product.category))];
  const totalInventoryValue = productsData.reduce((acc, product) => acc + (product.price_per_unit * product.quantity_of_uom), 0);
  const outOfStockProducts = productsData.filter(product => product.quantity_of_uom === 0).length;
  const calculateTransactionMetrics = (transactions) => {
    if (!transactions || transactions.length === 0) {
      return {
        totalTransactions: 0,
        totalTransactionValue: 0,
        averageTransactionValue: 0,
        successfulTransactions: 0,
        failedTransactions: 0
      };
    }
  
    const totalTransactions = transactions.length;
    const totalTransactionValue = transactions.reduce((sum, transaction) => sum + transaction.total, 0);
    const averageTransactionValue = totalTransactionValue / totalTransactions;
    
    const successfulTransactions = transactions.filter(t => 
      t.status.toLowerCase() === 'paid' || t.status.toLowerCase() === 'paid'
    ).length;
    
    const failedTransactions = totalTransactions - successfulTransactions;
  
    return {
      totalTransactions,
      totalTransactionValue,
      averageTransactionValue,
      successfulTransactions,
      failedTransactions
    };
  };
  
  // In your component's body, before the return statement
  const { 
    totalTransactions, 
    totalTransactionValue, 
    averageTransactionValue,
    successfulTransactions,
    failedTransactions
  } = calculateTransactionMetrics(transactionsData);
  const countOrdersByStatus = (orders) => {
    let paidCount = 0;
    let unpaidCount = 0;

    orders.forEach(order => {
      if (order.status === 'paid') {
        paidCount++;
      } else if (order.status === 'unpaid') {
        unpaidCount++;
      }
    });

    return {
      paid: paidCount,
      unpaid: unpaidCount,
    };
  };

  function countUniqueShelves(products) {
    const shelves = new Set();
    products.forEach(product => {
      if (product.shelf_num) {
        shelves.add(product.shelf_num);
      }
    });
    return shelves.size;
  }

  const totalUniqueShelves = countUniqueShelves(productsData);
  const { paid, unpaid } = countOrdersByStatus(ordersData);
  const unpaidOrders = unpaid;
  const numberOfOrders = ordersData.length;
  const ordersPlaced = paid;
  const numberOfWarehouses = totalUniqueShelves;

  // Prepare data for charts
  const categoryData = productCategories.map(category => ({
    name: category,
    value: productsData.filter(product => product.category === category).reduce((acc, product) => acc + product.quantity, 0),
  }));

  // Generate random sales data for the years


  const getMonthlySalesData = (orders) => {
    const salesDataByYear = {};
    
    orders?.forEach((order) => {
      const date = new Date(Date.parse(order.datetime));
      const year = date.getFullYear();
      const monthIndex = date.getMonth();
      
      if (!salesDataByYear[year]) {
        salesDataByYear[year] = Array(12).fill(0);
      }
      
      salesDataByYear[year][monthIndex] += order.total;
    });
    
    return Object.entries(salesDataByYear).reduce((acc, [year, monthlySales]) => {
      monthlySales.forEach((total, index) => {
        const monthName = new Date(0, index).toLocaleString('default', { month: 'short' });
        acc.push({ year: parseInt(year), month: monthName, total });
      });
      return acc;
    }, []);
  };

  const salesData = getMonthlySalesData(ordersData);
  const sales2023 = salesData.filter(data => data.year === 2023);
  const sales2024 = salesData.filter(data => data.year === 2024);

  // Combine and sort data chronologically
  const combinedData = [...sales2023, ...sales2024].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return new Date(Date.parse(`${a.month} 1, 2000`)) - new Date(Date.parse(`${b.month} 1, 2000`));
  });

  // Calculate month-over-month changes
  const dataWithChanges = combinedData.map((item, index) => {
    if (index === 0) return { ...item, percentageChange: 0 };
    const prevMonth = combinedData[index - 1];
    const percentageChange = prevMonth.total 
      ? ((item.total - prevMonth.total) / prevMonth.total * 100).toFixed(1)
      : 0;
    return { ...item, percentageChange };
  });

  // Get the latest month's percentage change
  const latestChange = dataWithChanges[dataWithChanges.length - 1]?.percentageChange || 0;
  const isPositiveChange = parseFloat(latestChange) >= 0;

  const styles = {
    container: {
      width: '100%',
      maxWidth: '42rem',
      backgroundColor: 'white',
      borderRadius: '0.5rem',
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      padding: '1.5rem',
    },
    header: {
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      marginBottom: '1.5rem',
    },
    subtitle: {
      fontSize: '1.7rem',
      color: 'black',
       fontWeight: 'bold',
    },
    trendIndicator: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
    },
    trendText: {
      fontSize: '1rem',
      fontWeight: 500,
    },
    notificationContainer: {
      alignItems: 'center', // Aligning items vertically (applies only when flex is active)
      justifyContent: 'space-between', // Spacing out elements (applies only when flex is active)
      backgroundColor: '#f8f9fa', // Light background for the container
      padding: '15px', // Adding padding around the container
      borderRadius: '8px', // Rounded corners
      boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)', // Subtle shadow for a card-like effect
      width: '100%', // Ensuring the container takes full width
      margin: '20px auto', // Centering the container with space above and below
      transition: 'all 0.3s ease-in-out', // Smooth transition for changes
    },
    notificationTitle: {
      fontSize: '20px', // Larger font for the title
      fontWeight: 'bold', // Bold title text
      color: '#333', // Dark text color
      margin: 0, // Removing default margin
    },
    notifications: {
      color: 'white', // White text for the notifications
      padding: '10px 15px', // Padding inside the notifications component
      borderRadius: '5px', // Rounded corners for the notifications
      cursor: 'pointer', // Pointer cursor for interactivity
      textAlign: 'center', // Center align content inside the Notifications
      transition: 'all 0.3s ease-in-out', // Smooth transition for styles
    },
    trendArrow: {
      width: '1.5rem',
      height: '1.5rem',
      marginLeft: '0.25rem',
      color: isPositiveChange ? '#22C55E' : '#EF4444',
      transform: isPositiveChange ? 'none' : 'rotate(90deg)',
    },
    dateRange: {
      fontSize: '0.9rem',
      color: '#6B7280',
    },
    tooltipContainer: {
      backgroundColor: 'white',
      padding: '0.5rem',
      borderRadius: '0.375rem',
      border: '1px solid #E5E7EB',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    },
    tooltipTitle: {
      fontWeight: 500,
      marginBottom: '0.25rem',
    },
    tooltipTotal: {
      color: '#4B5563',
      marginBottom: '0.25rem',
    },
    tooltipChange: (isPositive) => ({
      fontWeight: 500,
      color: isPositive ? '#22C55E' : '#EF4444',
    }),
    yAxis: {
      position: 'absolute',
      left: -50,
      top: 0,
      bottom: '24px',
      width: '50px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      borderRight: '1px solid #ddd',
    },
    yAxisLabel: {
      fontSize: '12px',
      color: '#666',
      textAlign: 'right',
      paddingRight: '8px',
      transform: 'translateY(50%)',
    },
    yAxisLine: {
      position: 'absolute',
      left: '50px',
      right: 0,
      borderTop: '1px dashed #eee',
    },
  };
  // const handleOrderShipment = async (product) => {
  //   try {
  //     // Fetch manufacturers list first
  //     const manufacturersResponse = await fetch('http://127.0.0.1:5000/get_manufacturer_users');
  //     if (!manufacturersResponse.ok) throw new Error('Failed to fetch manufacturers list');
  //     const manufacturersList = await manufacturersResponse.json();
  //     console.log('Manufacturers List:', manufacturersList);
  
  //     // Initialize an array to hold all products
  //     const allProducts = [];
  
  //     // Fetch products for each manufacturer one by one
  //     for (let [manufacturerName, manufacturerId] of Object.entries(manufacturersList)) {
  //       try {
  //         const response = await fetch('http://127.0.0.1:5000/getProductsManu', {
  //           method: 'POST',
  //           headers: {
  //             'Content-Type': 'application/json',
  //           },
  //           body: JSON.stringify({ user_id: manufacturerId }),
  //         });
  
  //         if (!response.ok) throw new Error(`Failed to fetch products for manufacturer ID ${manufacturerId}`);
  
  //         const products = await response.json();
  //         console.log(`Products for manufacturer ID ${manufacturerId}:`, products);
  
  //         // Add the manufacturer ID to each product and push it to the allProducts array
  //         const productsWithManufacturerId = products.map(product => ({
  //           ...product,
  //           manufacturerId: manufacturerId
  //         }));
  //         allProducts.push(...productsWithManufacturerId);
  //       } catch (error) {
  //         console.error(`Error fetching products for manufacturer ID ${manufacturerId}:`, error);
  //       }
  //     }
  
  //     console.log('All Products:', allProducts);
  
  //     // Find the product by name, case insensitive and trimmed
  //     const matchedProduct = allProducts.find(p => {
  //       const normalizedProductName = p.name.toLowerCase().trim();  // Normalize the API product name
  //       const normalizedSearchName = product.name.toLowerCase().trim();  // Normalize the searched product name
  
  //       // Log the comparison for debugging
  //       console.log(`Comparing "${normalizedProductName}" with "${normalizedSearchName}"`);
  
  //       return normalizedProductName === normalizedSearchName;
  //     });
  
  //     if (!matchedProduct) {
  //       console.error('Product not found:', product.name);
  //       alert('Product not found in the system.');
  //       return;
  //     }
  
  //     // Get the manufacturer ID for the matched product
  //     const matchingManufacturerId = matchedProduct.manufacturerId;
  
  //     // Log the matchingManufacturerId to debug
  //     console.log('Matching Manufacturer ID:', matchingManufacturerId);
  
  //     // Fetch the manufacturer name by matching the ID from manufacturersList
  //     const manufacturerName = Object.keys(manufacturersList).find(key => manufacturersList[key] === matchingManufacturerId);
  
  //     if (!manufacturerName) {
  //       console.error('Manufacturer name not found for ID:', matchingManufacturerId);
  //       alert('Manufacturer not found.');
  //       return;
  //     }
  
  //     // Log the manufacturer name
  //     console.log('Manufacturer Name:', manufacturerName);
  
  //     // Navigate to AddTransaction with pre-filled data (manufacturer ID and name)
  //     navigate('/addtransaction', {
  //       state: {
  //         preSelectedManufacturer: {
  //           id: matchingManufacturerId,
  //           name: manufacturerName
  //         },
  //         preSelectedProduct: {
  //           name: matchedProduct.name,
  //           price: matchedProduct.price_per_unit
  //         }
  //       }
  //     });
  
  //   } catch (error) {
  //     console.error('Error preparing order shipment:', error);
  //     alert('Failed to prepare order shipment. Please try again.');
  //   }
  // };
  
  const handleOrderShipment = (product) => {
    setSelectedProduct(product);
    setShowOrderDialog(true);
  };
  const handleOrderConfirm = (navigationState) => {
    console.log('Dashboard: Navigating with state:', navigationState);
    navigate('/addtransaction', { state: navigationState });
  };
  
  
  
  
  
  // Modify stockAlerts to include manufacturer information
  const stockAlerts = productsData.map(product => {
    if (product.quantity_of_uom === 0) {
      return { 
        message: `${product.name} is out of stock!`, 
        type: 'out-of-stock', 
        product: product 
      };
    } else if (product.quantity_of_uom < 10) {
      return { 
        message: `${product.name} stock is running low!`, 
        type: 'low-stock', 
        product: product 
      };
    }
    return null;
  }).filter(alert => alert);



  const calculateMetrics = () => {
    if (!ordersData || ordersData.length === 0) return { total: 0, percentChange: 0 };

    // Calculate total revenue
    const total = ordersData.reduce((sum, order) => sum + order.total, 0);

    // Sort orders by datetime
    const sortedOrders = [...ordersData].sort((a, b) => new Date(b.datetime) - new Date(a.datetime));

    // Get the current month and last month
    const currentDate = new Date(sortedOrders[0].datetime);
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    // Calculate current month's total
    const currentMonthTotal = sortedOrders
      .filter(order => {
        const orderDate = new Date(order.datetime);
        return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
      })
      .reduce((sum, order) => sum + order.total, 0);

    // Calculate last month's total (handle year rollover)
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1; // December (11) if current month is January (0)
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const lastMonthTotal = sortedOrders
      .filter(order => {
        const orderDate = new Date(order.datetime);
        return orderDate.getMonth() === lastMonth && orderDate.getFullYear() === lastMonthYear;
      })
      .reduce((sum, order) => sum + order.total, 0);

    // Calculate percent change
    const percentChange = lastMonthTotal ? 
      ((currentMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0;

    return { total, percentChange };
  };

  const { total, percentChange } = calculateMetrics();

  // Prepare chart data
  const chartData = ordersData.map(order => ({
    date: new Date(order.datetime).toLocaleDateString(), // Format the date as a string
    amount: order.total
  }));
  
  
console.log(chartData)



const getDailySalesData = (orders) => { 
  const salesDataByDate = {};

  orders?.forEach((order) => {
    const date = new Date(Date.parse(order.datetime));
    const year = date.getFullYear();
    const monthIndex = date.getMonth();
    const day = date.getDate();
    
    if (year === new Date().getFullYear() && monthIndex === selectedMonth) {
      const dateKey = `${year}-${monthIndex + 1}-${day}`;
      if (!salesDataByDate[dateKey]) {
        salesDataByDate[dateKey] = 0;
      }
      salesDataByDate[dateKey] += order.total;
    }
  });

  if (Object.keys(salesDataByDate).length === 0) {
    // If no sales data for the selected month, return an empty array
    return [];
  }


  const daysInMonth = new Date(new Date().getFullYear(), selectedMonth + 1, 0).getDate();
  const dailySalesData = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = `${new Date().getFullYear()}-${selectedMonth + 1}-${day}`;
    const sales = salesDataByDate[dateKey] || 0;
    dailySalesData.push({
      date: day,
      total: sales
    });
  }

  return dailySalesData;
};

const dailySalesData = getDailySalesData(ordersData);
const monthlyTotal = dailySalesData.reduce((sum, entry) => sum + entry.total, 0);
const maxSales = Math.max(...dailySalesData.map(item => item.total));
const yAxisLabels = Array.from({ length: 6 }, (_, i) => {
  const value = (maxSales * (5 - i) / 5);
  return value.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
});


console.log("Sales Data by Day:", dailySalesData);
console.log("Monthly Total for Selected Month:", monthlyTotal);
console.log("Max Sales:", maxSales);
console.log("Yaxis:" , yAxisLabels)



const calculateTotalSales = (orders) => {
  const sales = {};
  if (!orders || orders.length === 0) return sales; // Safeguard: return empty object if orders is undefined or empty

  orders.forEach(order => {
      if (order.order_details && Array.isArray(order.order_details)) { // Ensure products exists and is an array
          order.order_details.forEach(item => {
              if (!sales[item.product_name]) {
                  sales[item.product_name] = 0;
              }
              sales[item.product_name] += item.total_price;
          });
      }
  });
  return sales;
};




const sales = calculateTotalSales(ordersData);
console.log("Sales data:", sales);

const sortedSales = Object.entries(sales).sort((a, b) => b[1] - a[1]);
const top10Products = sortedSales.slice(0, 10);
console.log("Top 10 products:", top10Products);
const labels = top10Products.map(item => item[0]);
const data = top10Products.map(item => item[1]);
const colors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF0000', '#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d', '#33F6FF', '#F6FF33'];


// Pie Chart Data
const pieChartData = {
    labels,
    datasets: [
        {
            label: 'Top 10 Selling Products',
            data: data,
            backgroundColor: colors,
            borderWidth: 5
        }
    ]
};

const chartOptions = {
    cutout: '60%', // Adjust the thickness of the doughnut
    plugins: {
        legend: {
            display: true, // Enable the legend
            position: 'right', // Position legend to the right of the chart
            labels: {
                color: '#333', // Set the label color
                boxWidth: 30, // Width of the color box
                padding: 10 // Spacing between labels
            }
        },
        tooltip: {
            enabled: true, // Enable tooltips on hover
            callbacks: {
                label: (tooltipItem) => {
                    return `${tooltipItem.label}: ₹${tooltipItem.raw}`; // Customize tooltip labels
                }
            }
        }
    }
};

  return (
    <>
      <div className='dash-board'>
        <Sidebar />
        <div className="dashboard-container">
          <Nav />
          <Header />
          
          <div className="dashboard-metrics">
  <div className="metric-card">
    <div className="metric-header">
      <div className="metric-icon"><i className="fas fa-box"></i></div>
      <h2 className='h2-values'>{productsData.length}</h2>
    </div>
    <p>Number of Products</p>
  </div>
  <div className="metric-card">
    <div className="metric-header">
      <div className="metric-icon"><i className="fas fa-shopping-cart"></i></div>
      <h2>{numberOfOrders}</h2>
    </div>
    <p>Number of Orders</p>
  </div>
  <div className="metric-card">
    <div className="metric-header">
      <div className="metric-icon"><i className="fas fa-layer-group"></i></div>
      <h2>{productCategories.length}</h2>
    </div>
    <p>Number of Categories</p>
  </div>
  <div className="metric-card">
    <div className="metric-header">
      <div className="metric-icon"><i className="fas fa-warehouse"></i></div>
      <h2>{numberOfWarehouses}</h2>
    </div>
    <p>Number of Shelves</p>
  </div>
  <div className="metric-card">
    <div className="metric-header">
      <div className="metric-icon"><i className="fas fa-rupee-sign"></i></div>
      <h2>&#x20b9;{totalInventoryValue.toFixed(1)}</h2>
    </div>
    <p>Total Value of Inventory</p>
  </div>
  <div className="metric-card">
    <div className="metric-header">
      <div className="metric-icon"><i className="fas fa-list-alt"></i></div>
      <h2>{ordersPlaced}</h2>
    </div>
    <p>Number of Orders Placed</p>
  </div>
  <div className="metric-card">
    <div className="metric-header">
      <div className="metric-icon"><i className="fas fa-times-circle"></i></div>
      <h2>{unpaidOrders}</h2>
    </div>
    <p>Unpaid Orders</p>
  </div>
  <div className="metric-card">
    <div className="metric-header">
      <div className="metric-icon"><i className="fas fa-box-open"></i></div>
      <h2>{outOfStockProducts}</h2>
    </div>
    <p>Out of Stock Products</p>
  </div>
  <Card className="revenue-card" style={{ boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)' , borderRadius : "10px" }}>
      <CardContent className="card-content">
        <div className="revenue-details">
          <div>
            <h3 className="revenue-title">Total Revenue</h3>
            <div className="revenue-amount">
              <p className="amount-text"> ₹{total.toFixed(2)}</p>
              <div className="percentage-change">
                <span
                  className={`percentage-text ${
                    percentChange >= 0 ? 'text-green' : 'text-red'
                  }`}
                >
                  {percentChange >= 0 ? (
                    <TrendingUp className="icon" />
                  ) : (
                    <TrendingDown className="icon" />
                  )}
                  {Math.abs(percentChange).toFixed(1)}% from last month
                </span>
              </div>
            </div>
          </div>

          <div className="chart-contain">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#000"
                  strokeWidth={1.5}
                  dot={{ r: 2 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  <div className="metric-card">
  <div className="metric-header">
  <div className="metric-icon"><i className="fas fa-money-bill-wave"></i></div>
    <h2>&#x20b9;{totalTransactionValue.toFixed(2)}</h2>
  </div>
  <p>Total Transaction Value</p>
</div>
<div className="metric-card">
  <div className="metric-header">
    <div className="metric-icon"><FontAwesomeIcon icon={faListAlt} /></div>
    <h2>{totalTransactions}</h2>
  </div>
  <p>Total Transactions</p>
</div>
<div className="metric-card">
  <div className="metric-header">
    <div className="metric-icon"><FontAwesomeIcon icon={faCheck} /></div>
    <h2>{successfulTransactions}</h2>
  </div>
  <p>Successful Transactions</p>
</div>
<div className="metric-card">
  <div className="metric-header">
    <div className="metric-icon"><FontAwesomeIcon icon={faTimes} /></div>
    <h2>{failedTransactions}</h2>
  </div>
  <p>Unpaid Transactions</p>
</div>
</div>
<div
      style={{
        ...styles.notificationContainer,
        display: isNotificationsOpen ? 'block' : 'flex', // Dynamically toggle between 'block' and 'flex'
      }}
    >
      {/* Conditionally render the <p> tag */}
      {!isNotificationsOpen && (
        <p style={styles.notificationTitle}>Check your notifications</p>
      )}

      {/* Notifications Component */}
      <div
        onClick={handleNotificationsClick}
        style={{
          ...styles.notifications,
          width: isNotificationsOpen ? '100%' : 'auto', // Full width when open
        }}
      >
        <Notifications />
      </div>
    </div>


          <div className="dashboard-charts">
         
          <MonthlySalesTrendChart ordersData={ordersData} />
            {/* <div className="chart-card">
            <div >
      <div style={styles.header}>
        <div  style={{
    fontSize: '1.7rem', // Adjust font size
    color: 'rgb(51, 51, 51)', // Dark gray for readability
    // Add spacing above and below
    fontWeight: 'bold', // Make it stand out as a subtitle
    textTransform: 'capitalize', // Capitalize each word for a polished look
    letterSpacing: '1px', // Slight spacing between letters
    borderLeft: '4px solid #36A2EB', // Add a blue vertical accent
    paddingLeft: '10px', // Add space between text and the accent
  }}>
          Monthly Sales Trend
        </div>
        <div style={styles.trendIndicator}>
          <span style={styles.trendText}>
            {isPositiveChange ? 'Trending up' : 'Trending down'} by {Math.abs(latestChange)}% this month
          </span>
          <ArrowUpRight style={styles.trendArrow} />
        </div>
        <div style={styles.dateRange}>
          January - December 2024
        </div>
      </div>
      
      <AreaChart 
        width={580} 
        height={300} 
        data={dataWithChanges}
        margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id="colorTotal1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#E2F1ED" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#E2F1ED" stopOpacity={0.1}/>
          </linearGradient>
          <linearGradient id="colorTotal2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#FFE4E0" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#FFE4E0" stopOpacity={0.1}/>
          </linearGradient>
        </defs>
        <XAxis 
          dataKey="month" 
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#666', fontSize: 14 }}
        />
        <YAxis hide={true} />
        <Tooltip 
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0].payload;
              const isPositive = parseFloat(data.percentageChange) >= 0;
              return (
                <div style={styles.tooltipContainer}>
                  <p style={styles.tooltipTitle}>{`${data.month} ${data.year}`}</p>
                  <p style={styles.tooltipTotal}>{`Total: ${data.total}`}</p>
                  <p style={styles.tooltipChange(isPositive)}>
                    {`Change: ${data.percentageChange}%`}
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Area
          type="monotone"
          dataKey="total"
          stackId="1"
          stroke="#A7D5CA"
          fill="url(#colorTotal1)"
          fillOpacity={1}
        />
        <Area
          type="monotone"
          dataKey="total"
          stackId="1"
          stroke="#FFBDB5"
          fill="url(#colorTotal2)"
          fillOpacity={1}
        />
      </AreaChart>
    </div>
            </div> */}
            <CategorySalesChart data={categoryData} />
            <div className="dashboard-charts">
      <div className="chart-card" style={{ width: '670px' }}>
        <div style={{
          fontSize: '1.7rem',
          color: 'rgb(51, 51, 51)',
          fontWeight: 'bold',
          textTransform: 'capitalize',
          letterSpacing: '1px',
          borderLeft: '4px solid #36A2EB',
          paddingLeft: '10px',
        }}>
          Transaction Metrics
        </div>
        <p className="overview" style={{fontSize:"16px"}}>A breakdown of values of Shipment ordered</p>

        {/* Bar Chart for Transaction Metrics */}
        <TransactionMetricCharts
          totalTransactions={totalTransactions}
          totalTransactionValue={totalTransactionValue}
          averageTransactionValue={averageTransactionValue}
          successfulTransactions={successfulTransactions}
          failedTransactions={failedTransactions}
        />
      </div>
    </div>
           {/* Alert Messages Section */}
<div className='alertbox'>
  {stockAlerts.length > 0 && (
    <div className="alerts">
      {stockAlerts.map((alert, index) => (
        <div key={index} className={`alert ${alert.type}`} style={{display:"flex" , justifyContent:"space-between" , alignItems:"center"}}>
          <span>{alert.message}</span>
          {showOrderDialog && (
          <ShipmentOrderDialog
            product={selectedProduct}
            isOpen={showOrderDialog}
            onClose={() => setShowOrderDialog(false)}
            onConfirm={handleOrderConfirm}
          />
        )}
          <button 
            onClick={() => handleOrderShipment(alert.product)}
            style={{
              marginLeft: '10px',
              padding: '15px 20px',
              backgroundColor: alert.type === 'out-of-stock' ? '#ff0000' : (alert.type === 'low-stock' ? '#ffcc00' : '#007bff'),
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize:'16px',
              fontWeight:'bold',
              marginRight: '10px',  // Added space between buttons
            }}
          >
            Order Shipment
          </button>
          {/* {showOrderDialog && (
  <ShipmentOrderDialog
    product={selectedProduct}
    isOpen={showOrderDialog}
    onClose={() => setShowOrderDialog(false)}
    onConfirm={handleOrderConfirm}
  />
)} */}
        </div>
      ))}
    </div>
  )}
</div>

          </div>
          <div className='' style={{display:"flex"  , gap:"20px" }}>
          <div className="sales-graph-container " style={{ marginTop:"10px"}}>
  <div className="sales-header">
    <div className="title-section">
      <h2  style={{
    fontSize: '1.7rem', // Adjust font size
    color: 'rgb(51, 51, 51)', // Dark gray for readability
    // Add spacing above and below
    fontWeight: 'bold', // Make it stand out as a subtitle
    textTransform: 'capitalize', // Capitalize each word for a polished look
    letterSpacing: '1px', // Slight spacing between letters
    borderLeft: '4px solid #36A2EB', // Add a blue vertical accent
    paddingLeft: '10px',
    position:"relative",
    left:"-25px" // Add space between text and the accent
  }}>Sales Chart</h2>
      <p style={{marginLeft : "0px" , marginTop:"10px" ,   position:"relative",
    left:"-25px"}}>Showing total sales for {months[selectedMonth]}</p>
    </div>
    <div className="controls-section">
      <div className="total-sales">
        <div 
          className="amount" 
          style={{ color: monthlyTotal > 0 ? 'green' : 'red' }}
        >
          ₹{monthlyTotal.toLocaleString('en-IN')}
        </div>
        <div className="label">Total Sales</div>
      </div>
      <select 
        value={selectedMonth}
        onChange={(e) => setSelectedMonth(Number(e.target.value))}
        className="month-selector"
      >
        {months.map((month, index) => (
          <option key={month} value={index}>{month}</option>
        ))}
      </select>
    </div>
  </div>

  <div className="graph-container">
    {dailySalesData.length > 0 ? (
      <>
        <div style={styles.yAxis}>
          {yAxisLabels.map((label, index) => (
            <div key={index} style={{ position: 'relative' }}>
              <div style={styles.yAxisLabel}>{label}</div>
              <div style={{ ...styles.yAxisLine, top: `${index * 20}%` }} />
            </div>
          ))}
        </div>
        <div className="bars-container">
          {dailySalesData.map((item, index) => (
            <div key={index} className="bar-wrapper">
              <div className="tooltip">
                ₹{item.total.toLocaleString('en-IN')}
              </div>
              <div 
                className="bar"
                style={{ height: `${(item.total / maxSales) * 100}%` }}
                title={`₹${item.total.toLocaleString('en-IN')}`}
              />
              {index % 5 === 0 && (
                <div className="date-label">
                  {item.date}
                </div>
              )}
            </div>
          ))}
        </div>
      </>
    ) : (
      <div className="no-data-message">No sales data available for this month.</div>
    )}
  </div>
</div>


<div className="chart-container" style={{position:"relative" , width:"480px" , height:"455px" , marginTop:"10px" , marginBottom:"0px"}}>
    <h3 className="chart-title " style={{
    fontSize: '1.7rem', // Adjust font size
    color: 'rgb(51, 51, 51)', // Dark gray for readability
    // Add spacing above and below
    fontWeight: 'bold', // Make it stand out as a subtitle
    textTransform: 'capitalize', // Capitalize each word for a polished look
    letterSpacing: '1px', // Slight spacing between letters
    borderLeft: '4px solid #36A2EB', // Add a blue vertical accent
    paddingLeft: '10px', // Add space between text and the accent
  }}>Top 10 Selling Products</h3>
    <p className="overview" style={{fontSize:"16px"}}>A breakdown of sales by product</p>
    <Doughnut data={pieChartData} options={chartOptions} height={100} width={100} style={{position:"absolute" , top:"50px" ,    height: "450px",
    width: "450px" }} />
  </div>




</div>
           
        </div>
      </div>
    </>
  );
  
  

}

export default Dashboard;
