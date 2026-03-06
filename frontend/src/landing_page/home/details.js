import React, { useEffect, useState } from 'react';
import Sidebar from '../Sidebar';
import Nav from './Nav';
import { Doughnut, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, Title, Tooltip, Legend, ArcElement, BarElement, CategoryScale, LinearScale } from 'chart.js';
import { BarChart, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useAuth } from '../user_login/AuthContext';
import { PieChart, Pie, Cell } from "recharts";

import './Dashboard.css';
import './ProductList.css';

ChartJS.register(Title, Tooltip, Legend, ArcElement, BarElement, CategoryScale, LinearScale);

const Details = () => {
    const [productsData, setProductsData] = useState([]);
    const [ordersData, setOrdersData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const { userId } = useAuth();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const productsResponse = await fetch('http://127.0.0.1:5000/getProducts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: userId }),
                });
                const products = await productsResponse.json();
                setProductsData(products);

                const ordersResponse = await fetch('http://127.0.0.1:5000/getAllOrders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: userId }),
                });
                const orders = await ordersResponse.json();
                setOrdersData(orders);

                setLoading(false);
            } catch (error) {
                console.error('Error fetching data:', error);
                setLoading(false);
            }
        };

        if (userId) {
            fetchData();
        }
    }, [userId]);

    if (loading) {
        return (
            <div>
                <div className='load'>
                    <div className='loader'>Loading...</div>
                </div>
                <p className='lding'>Loading Your Details....</p>
            </div>
        );
    }

    const calculateTopSellingProducts = () => {
        const productSales = {};
        if (!ordersData || ordersData.length === 0) return [];

        ordersData.forEach(order => {
            order.order_details.forEach(item => {
                const { product_name, quantity, total_price } = item;
                if (productSales[product_name]) {
                    productSales[product_name].totalSales += total_price;
                    productSales[product_name].quantity += quantity;
                } else {
                    productSales[product_name] = {
                        totalSales: total_price,
                        quantity: quantity,
                    };
                }
            });
        });

        return Object.entries(productSales)
            .map(([name, salesData]) => {
                const product = productsData.find(product => product.name === name);
                return product
                    ? { ...product, totalSales: salesData.totalSales, quantitySold: salesData.quantity }
                    : { name, totalSales: salesData.totalSales, quantitySold: salesData.quantity };
            })
            .sort((a, b) => b.totalSales - a.totalSales)
            .slice(0, 5);
    };

    const calculateRestockProducts = () => {
        return productsData.filter(product => product.quantity_of_uom < 10);
    };

    const topSellingProducts = calculateTopSellingProducts();
    const restockProducts = calculateRestockProducts();

    const calculateTotalSales = (orders) => {
        const sales = {};
        if (!orders || orders.length === 0) return sales;

        orders.forEach(order => {
            if (order.order_details && Array.isArray(order.order_details)) {
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

    const calculateOrderValues = (orders) => {
        const values = orders.map(order => order.total);
        const average = values.reduce((sum, value) => sum + value, 0) / values.length || 0;
        const mid = Math.floor(values.length / 2);
        const median = values.length % 2 !== 0
            ? values[mid]
            : (values[mid - 1] + values[mid]) / 2;
        const highest = Math.max(...values);
        const lowest = Math.min(...values);
        const totalOrders = orders.length;
        const totalRevenue = values.reduce((sum, value) => sum + value, 0);
        return { average, highest, lowest, totalOrders, totalRevenue, median };
    };

    const sales = calculateTotalSales(ordersData);
    const sortedSales = Object.entries(sales).sort((a, b) => b[1] - a[1]);
    const top10Products = sortedSales.slice(0, 10);
    const labels = top10Products.map(item => item[0]);
    const data = top10Products.map(item => item[1]);

    const { average, highest, lowest, median } = calculateOrderValues(ordersData);
    const colors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF0000', '#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d', '#33F6FF', '#F6FF33'];

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
        cutout: '60%',
        plugins: {
            legend: {
                display: true,
                position: 'right',
                labels: {
                    color: '#333',
                    boxWidth: 30,
                    padding: 10
                }
            },
            tooltip: {
                enabled: true,
                callbacks: {
                    label: (tooltipItem) => {
                        return `${tooltipItem.label}: ₹${tooltipItem.raw}`;
                    }
                }
            }
        }
    };

    const barChartData = {
        labels: [
            'Average Order Value',
            'Highest Order Value',
            'Lowest Order Value',
            'Median Order Value'
        ],
        datasets: [
            {
                label: 'Order Values',
                data: [average, highest, lowest, median],
                backgroundColor: ['#FF6384', '#36A2EB', '#8884d8', '#4BC0C0'],
                borderColor: ['#FF6384', '#36A2EB', '#8884d8', '#4BC0C0'],
                borderWidth: 0,
                barPercentage: 0.5,
                categoryPercentage: 0.7
            }
        ]
    };

    const options = {
        scales: {
            x: { grid: { display: false } },
            y: {
                grid: { display: false },
                ticks: { beginAtZero: true }
            }
        }
    };

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

        if (Object.keys(salesDataByDate).length === 0) return [];

        const daysInMonth = new Date(new Date().getFullYear(), selectedMonth + 1, 0).getDate();
        const dailySalesData = [];

        for (let day = 1; day <= daysInMonth; day++) {
            const dateKey = `${new Date().getFullYear()}-${selectedMonth + 1}-${day}`;
            const sales = salesDataByDate[dateKey] || 0;
            dailySalesData.push({ date: day, total: sales });
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

    const styles = {
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

    return (
        <>
            <div className='dash-board'>
                <Sidebar />
                <div className='dashboard-container' style={{ paddingBottom: "20px", paddingLeft: "0px", paddingRight: "0px" }}>
                    <Nav />
                    <div className="product-list" style={{ padding: "0px", paddingLeft: "10px", paddingBottom: "15px", paddingTop: "20px" }}>
                        <div className="table-container">

                            {/* Top Selling Products */}
                            <div className="table-section">
                                <h2 style={{
                                    fontSize: '24px',
                                    color: '#333',
                                    textAlign: 'center',
                                    margin: '20px 0',
                                    fontWeight: 'bold',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1.5px',
                                    borderBottom: '2px solid #FF6384',
                                    paddingBottom: '10px',
                                    width: 'fit-content',
                                    marginInline: 'auto'
                                }}>Top Selling Products</h2>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Image</th>
                                            <th>Name</th>
                                            <th>Category</th>
                                            <th>Price</th>
                                            <th>Total Sales</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {topSellingProducts.map(product => (
                                            <tr key={product.id}>
                                                <td>
                                                    <img
                                                        src={`data:image/jpeg;base64,${product.picture_of_the_prod}`}
                                                        alt={product.name}
                                                        className="table-image"
                                                    />
                                                </td>
                                                <td>{product.name}</td>
                                                <td>{product.category}</td>
                                                <td>₹{product.price_per_unit}</td>
                                                <td>₹{product.totalSales}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Products to Restock */}
                            <div className="table-section">
                                <h2 style={{
                                    fontSize: '24px',
                                    color: '#333',
                                    textAlign: 'center',
                                    margin: '20px 0',
                                    fontWeight: 'bold',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1.5px',
                                    borderBottom: '2px solid #FF6384',
                                    paddingBottom: '10px',
                                    width: 'fit-content',
                                    marginInline: 'auto'
                                }}>Products to Restock</h2>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Image</th>
                                            <th>Name</th>
                                            <th>Category</th>
                                            <th>Quantity</th>
                                            <th>Price</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {restockProducts.map(product => (
                                            <tr key={product.id}>
                                                <td>
                                                    <img
                                                        src={`data:image/jpeg;base64,${product.picture_of_the_prod}`}
                                                        alt={product.name}
                                                        className="table-image"
                                                    />
                                                </td>
                                                <td>{product.name}</td>
                                                <td>{product.category}</td>
                                                <td>{product.quantity_of_uom}</td>
                                                <td>₹{product.price_per_unit}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                        </div>
                    </div>

                    <div className="statistics">

                        {/* Sales Graph */}
                        <div className="sales-graph-container">
                            <div className="sales-header">
                                <div className="title-section">
                                    <h2 style={{
                                        fontSize: '1.7rem',
                                        color: 'rgb(51, 51, 51)',
                                        fontWeight: 'bold',
                                        textTransform: 'capitalize',
                                        letterSpacing: '1px',
                                        borderLeft: '4px solid #36A2EB',
                                        paddingLeft: '10px',
                                        position: "relative",
                                        left: "-25px"
                                    }}>Sales Chart - Interactive</h2>
                                    <p style={{ marginLeft: "0px", marginTop: "10px", position: "relative", left: "-25px" }}>
                                        Showing total sales for {months[selectedMonth]}
                                    </p>
                                </div>
                                <div className="controls-section">
                                    <div className="total-sales">
                                        <div className="amount" style={{ color: monthlyTotal > 0 ? 'green' : 'red' }}>
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
                                                        <div className="date-label">{item.date}</div>
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

                        {/* Order Values Bar Chart */}
                        <div className='chart-container-bar' style={{ marginTop: "0px" }}>
                            <div>
                                <h2 className='titless' style={{
                                    fontSize: '1.7rem',
                                    color: 'black',
                                    fontWeight: 'bold',
                                    marginBottom: '0px',
                                    textTransform: 'capitalize',
                                    letterSpacing: '1px',
                                    borderLeft: '4px solid #36A2EB',
                                    paddingLeft: '10px',
                                }}>Order Values Statistics</h2>
                                <p style={{ fontSize: "16px", color: "#666", marginBottom: "20px" }}>
                                    Graph based on Order value
                                </p>
                                <Bar data={barChartData} options={options} />
                            </div>
                        </div>

                    </div>

                </div>
            </div>
        </>
    );
};

export default Details;