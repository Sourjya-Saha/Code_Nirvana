import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { ArrowUpRight } from 'lucide-react';

const MonthlySalesTrendChart = ({ ordersData }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [dataWithChanges, setDataWithChanges] = useState([]);
  const [latestChange, setLatestChange] = useState(0);
  const [isPositiveChange, setIsPositiveChange] = useState(true);
  const [availableYears, setAvailableYears] = useState([]);

  // Styles for the chart
  const styles = {
    container: {
      width: '100%',
      padding: '1.5rem',
      backgroundColor: 'white',
      borderRadius: '0.5rem',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    },
    header: {
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      marginBottom: '1.5rem',
    },
    headerSection: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
    },
    title: {
      fontSize: '1.7rem',
      color: 'rgb(51, 51, 51)',
      fontWeight: 'bold',
      textTransform: 'capitalize',
      letterSpacing: '1px',
      borderLeft: '4px solid #36A2EB',
      paddingLeft: '10px',
    },
    yearSelector: {
      padding: '0.5rem',
      borderRadius: '0.25rem',
      border: '1px solid #ccc',
      fontSize: '1rem',
      marginLeft: '1rem',
      cursor: 'pointer',
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
    trendArrow: {
      width: '1.5rem',
      height: '1.5rem',
      marginLeft: '0.25rem',
      color: '#22C55E', // Will be dynamically set
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
    tooltipChange: {
      fontWeight: 500,
      color: '#22C55E', // Will be dynamically set
    },
  };

  // Process data when ordersData or selectedYear changes
  useEffect(() => {
    if (!ordersData || ordersData.length === 0) return;

    // Extract all years from orders data
    const years = [...new Set(ordersData.map(order => {
      const date = new Date(Date.parse(order.datetime));
      return date.getFullYear();
    }))].sort();

    setAvailableYears(years);

    // If no years are available, or the selectedYear is not in the available years
    if (years.length === 0 || !years.includes(selectedYear)) {
      if (years.length > 0) {
        setSelectedYear(years[years.length - 1]); // Set to the most recent year
      }
      return;
    }

    const getMonthlySalesData = (orders, year) => {
      const monthlySales = Array(12).fill(0);
      
      orders.forEach((order) => {
        const date = new Date(Date.parse(order.datetime));
        const orderYear = date.getFullYear();
        const monthIndex = date.getMonth();
        
        if (orderYear === year) {
          monthlySales[monthIndex] += order.total;
        }
      });
      
      return monthlySales.map((total, index) => {
        const monthName = new Date(0, index).toLocaleString('default', { month: 'short' });
        return { year, month: monthName, total };
      });
    };

    const salesData = getMonthlySalesData(ordersData, selectedYear);
    
    // Calculate month-over-month changes
    const dataWithChanges = salesData.map((item, index) => {
      if (index === 0) return { ...item, percentageChange: 0 };
      const prevMonth = salesData[index - 1];
      const percentageChange = prevMonth.total 
        ? ((item.total - prevMonth.total) / prevMonth.total * 100).toFixed(1)
        : 0;
      return { ...item, percentageChange };
    });

    setDataWithChanges(dataWithChanges);

    // Get the latest month's percentage change
    const latestChange = dataWithChanges[dataWithChanges.length - 1]?.percentageChange || 0;
    setLatestChange(latestChange);
    setIsPositiveChange(parseFloat(latestChange) >= 0);

  }, [ordersData, selectedYear]);

  const tooltipContent = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isPositive = parseFloat(data.percentageChange) >= 0;
      return (
        <div style={styles.tooltipContainer}>
          <p style={styles.tooltipTitle}>{`${data.month} ${data.year}`}</p>
          <p style={styles.tooltipTotal}>{`Total: ₹${data.total.toLocaleString('en-IN')}`}</p>
          <p style={{...styles.tooltipChange, color: isPositive ? '#22C55E' : '#EF4444'}}>
            {`Change: ${data.percentageChange}%`}
          </p>
        </div>
      );
    }
    return null;
  };

  // If there's no data, show a message
  if (!dataWithChanges || dataWithChanges.length === 0) {
    return (
    
        <div style={styles.container}>
          <div style={styles.header}>
            <div style={styles.headerSection}>
              <div style={styles.title}>Monthly Sales Trend</div>
              <select 
                style={styles.yearSelector}
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                disabled={availableYears.length === 0}
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{textAlign: 'center', padding: '2rem'}}>
            No sales data available for {selectedYear}
          </div>
        </div>
      
    );
  }

  return (
    <div className="chart-card">
    
        <div style={styles.header}>
          <div style={styles.headerSection}>
            <div style={styles.title}>Monthly Sales Trend</div>
            <select 
              style={styles.yearSelector}
              value={selectedYear} 
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div style={styles.trendIndicator}>
            <span style={styles.trendText}>
              {isPositiveChange ? 'Trending up' : 'Trending down'} by {Math.abs(latestChange)}% this month
            </span>
            <ArrowUpRight 
              style={{
                ...styles.trendArrow,
                color: isPositiveChange ? '#22C55E' : '#EF4444',
                transform: isPositiveChange ? 'none' : 'rotate(90deg)',
              }} 
            />
          </div>
          <div style={styles.dateRange}>
            January - December {selectedYear}
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
          <Tooltip content={tooltipContent} />
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
  );
};

export default MonthlySalesTrendChart;