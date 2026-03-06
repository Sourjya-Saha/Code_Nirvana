import React, { useState } from 'react';
import './OCR.css';
import { useNavigate } from 'react-router-dom';  // Import useNavigate for navigation
import Sidebar from '../Sidebar';

const OCR = () => {
    const [fileFormat, setFileFormat] = useState('prescription');
    const [file, setFile] = useState(null);
    const [extractedData, setExtractedData] = useState({});
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();  // Initialize useNavigate for redirecting

    const handleFileChange = (event) => {
        setFile(event.target.files[0]);
    };

    const handleExtract = () => {
        if (!file) {
            alert('Please upload a file.');
            return;
        }

        const formData = new FormData();
        formData.append('file_format', fileFormat);
        formData.append('file', file);

        setLoading(true);
        fetch('http://127.0.0.1:5000/extractFromDoc', {
            method: 'POST',
            body: formData,
        })
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                let filteredData = data.message;

                // Filter the 'medicines' field if it exists and contains a list
                if (filteredData.medicines && Array.isArray(filteredData.medicines)) {
                    filteredData.medicines = filteredData.medicines.filter(med => med.length > 1);
                }

                setExtractedData(filteredData);
                setError(null);
            } else {
                setError(data.error || 'Unknown error occurred.');
            }
        })
        .catch(err => {
            setError('Error occurred while extracting data.');
            console.error('Error:', err);
        })
        .finally(() => {
            setLoading(false);
        });
    };

    const handleSubmit = () => {
        if (extractedData.medicines && extractedData.medicines.length > 0) {
            const firstMedicine = extractedData.medicines[0];  // Use only the first medicine for search
            navigate(`/warehouse?search=${encodeURIComponent(firstMedicine)}`);  // Redirect with the single medicine name
        } else {
            alert('No medicines found to search.');
        }
    };

    return (
        <>
            <Sidebar />
            <div className="dash-board">
                <div className="containe">
                    <h1 className="extracter">Prescription Extractor</h1>
                    <form className="uploadForm">
                        <label className="form_doc" htmlFor="file_format">Choose Document Type:</label>
                        <select
                            className="file_format"
                            name="file_format"
                            value={fileFormat}
                            onChange={(e) => setFileFormat(e.target.value)}
                        >
                            <option value="prescription">Prescription</option>
                            <option value="patient_details">Patient Details</option>
                        </select>
                        <br /><br />
                        <label htmlFor="file">Upload File:</label>
                        <input
                            type="file"
                            id="file"
                            className='file_data'
                            name="file"
                            accept=".pdf,.jpeg,.jpg"
                            onChange={handleFileChange}
                        />
                        <br /><br />
                        <button className="extract" type="button" onClick={handleExtract}>
                            {loading ? 'Extracting...' : 'Extract'}
                        </button>
                    </form>

                    {error && <div className="error">{error}</div>}

                    <div id="documentDisplay"></div>

                    <div id="extractedData">
                        <h2>Extracted Data</h2>
                        <div id="dataContainer">
                            {loading ? (
                                <p>Loading data...</p>
                            ) : (
                                Object.keys(extractedData).length > 0 ? (
                                    Object.entries(extractedData).map(([key, value]) => (
                                        <div key={key} className="field-container">
                                            <label>{key}</label>
                                            {Array.isArray(value) ? (
                                                value.length > 0 ? (
                                                    value.map((item, index) => (
                                                        <input key={index} type="text" className='med_data'  value={item} readOnly />
                                                    ))
                                                ) : (
                                                    <p>No valid items found</p>
                                                )
                                            ) : (
                                                <input type="text" className='med_data' value={value} readOnly />
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <p>No data extracted yet.</p>
                                )
                            )}
                        </div>
                    </div>

                    <button id="submitButton" onClick={handleSubmit}>Search Products</button>
                </div>
            </div>
        </>
    );
};

export default OCR;
