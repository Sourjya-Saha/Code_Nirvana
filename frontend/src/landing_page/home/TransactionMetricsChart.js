import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const TransactionMetricsBarChart = ({ totalTransactions, totalTransactionValue, averageTransactionValue, successfulTransactions, failedTransactions }) => {
  // Prepare data for the bar chart
  const data = [
    { name: 'Total ', value: totalTransactions },
    { name: 'Total Value', value: totalTransactionValue },
    { name: 'Avg. Value', value: averageTransactionValue },
    { name: 'Paid', value: successfulTransactions },
    { name: 'Unpaid', value: failedTransactions },
  ];

  return (
    <div style={{ width: '100%', height: '300px' }}>
      {/* Making the chart responsive to the parent container */}
      <ResponsiveContainer width="100%" height="135%">
        <BarChart data={data}>
          
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="value" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
export default TransactionMetricsBarChart;