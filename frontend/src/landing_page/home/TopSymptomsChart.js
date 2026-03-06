import React, { useState } from 'react';
import { Doughnut } from 'react-chartjs-2';

const TopSymptomsChart = () => {
    const [chartData, setChartData] = useState({
        labels: [],
        datasets: [
            {
                label: 'Top Symptoms Frequency',
                data: [],
                backgroundColor: [
                    '#FF6B6B',
                    '#43C6AC',
                    '#00A8E8',
                    '#FFE66D',
                    '#4CAF50',
                    '#F67280',
                    '#36A2EB',
                    '#FF8C42',
                    '#9C27B0',
                    '#4BC0C0',
                ],
                hoverOffset: 4,
            },
        ],
    });

    const [showChart, setShowChart] = useState(false); // State to control chart display
    const [symptoms, setSymptoms] = useState([]); // State to store the symptoms for labels
    const [loading, setLoading] = useState(false); // Loading state

    const fetchSymptoms = async () => {
        setLoading(true); // Set loading to true before fetching
        try {
            const response = await fetch('http://127.0.0.1:5000/top_symptoms');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            console.log(data);

            // Prepare data for the chart
            const labels = data.map(item => item.symptoms);
            const frequencies = data.map(item => item.frequency);
            console.log(labels);
            console.log(frequencies);

            setSymptoms(labels); // Set symptoms for labels

            setChartData({
                labels: labels,
                datasets: [{
                    ...chartData.datasets[0],
                    data: frequencies,
                }],
            });
            setShowChart(true); // Show the chart after data is fetched
        } catch (error) {
            console.error('There was a problem with the fetch operation:', error);
        } finally {
            setLoading(false); // Set loading to false after fetching is done
        }
    };

    // Chart options to control size
    const options = {
        maintainAspectRatio: false,
        responsive: true,
        plugins: {
            legend: {
                position: 'bottom',
            },
        },
    };

    return (
        <div>
            <button className='medication-fetch-button' onClick={fetchSymptoms} disabled={loading}>
                {loading ? 'Loading...' : 'Show Top Symptoms Chart'}
            </button>

      {loading && (
        <div className='loadd'>
          <div className='loader'>Loading...</div>
        </div>
      )}

            {/* Loading indicator */}
            {loading && <div className="medication-loading">Fetching symptoms data...</div>}

            {/* Show chart only if data is fetched */}
            {showChart && !loading && (
                <div>
                     <h2 style={{
    fontSize: '22px', // Adjust font size
    color: '#6366F1', // Dark gray color
    textAlign: 'center', // Center align text
    margin: '20px 0', // Add space above and below
    fontWeight: 'bold', // Make the text bold
    textTransform: 'uppercase', // Make text uppercase
    letterSpacing: '1.5px', // Add spacing between letters
     // Space between text and underline
    width: 'fit-content', // Fit content width
    marginInline: 'auto' // Center horizontally
  }}>Top symptom frequency</h2>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {/* Symptoms as a list */}
                        <div>
                            <h3>Symptoms:</h3>
                            <ul>
                                {symptoms.map((symptom, index) => (
                                    <li key={index}>{symptom}</li>
                                ))}
                            </ul>
                        </div>
                        {/* Smaller Doughnut Chart */}
                        <div style={{ width: '300px', height: '300px' }}>
                            <Doughnut data={chartData} options={options} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TopSymptomsChart;
