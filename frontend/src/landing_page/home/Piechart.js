import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { useAuth } from '../user_login/AuthContext'; // Import your useAuth hook
import './CategorySalesChart.css'; // Import the CSS file

const CategorySalesChart = () => {
  const [categoryData, setCategoryData] = useState([]);
  const { userId } = useAuth(); // Retrieve userId from AuthContext

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('http://127.0.0.1:5000/getProducts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ user_id: userId }), // Send user_id in the request body
        });
        const data = await response.json();
        console.log(data)

        // Group products by category and calculate the total quantity for each category
        const productCategories = [...new Set(data.map(product => product.category))];
        const categoryData = productCategories.map(category => ({
          name: category,
          value: data.filter(product => product.category === category).reduce((acc, product) => acc + product.quantity_of_uom, 0),
        }));
 console.log("CATERGORY DATA",categoryData)
        setCategoryData(categoryData);
      } catch (error) {
        console.error('Error fetching product data:', error);
      }
    };

    if (userId) {
      fetchProducts();
    }
  }, [userId]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF0000', '#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d'];

  return (
    <div className="chart-container">
      <h3 className="chart-title" style={{
    fontSize: '1.7rem', // Adjust font size
    color: 'rgb(51, 51, 51)', // Dark gray for readability
    // Add spacing above and below
    fontWeight: 'bold', // Make it stand out as a subtitle
    textTransform: 'capitalize', // Capitalize each word for a polished look
    letterSpacing: '1px', // Slight spacing between letters
    borderLeft: '4px solid #36A2EB', // Add a blue vertical accent
    paddingLeft: '10px', // Add space between text and the accent
  }} >Product Quantities Categorized</h3>
      <p className='overview'>Overview of quantities within different categories</p>
      <PieChart width={600} height={400} className="pie-chart">
        <Pie
          data={categoryData}
          cx="50%"
          cy="50%"
          innerRadius={90}
          outerRadius={150}
          fill="#8884d8"
          paddingAngle={2}
          dataKey="value"
        >
          {categoryData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip className="custom-tooltip" />
        <Legend layout="vertical" align="right" verticalAlign="middle" />
      </PieChart>
    </div>
  );
};

export default CategorySalesChart;
