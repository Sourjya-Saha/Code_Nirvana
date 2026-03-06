import React, { useState } from 'react';


const SmartCareCenter = () => {
    const [symptoms, setSymptoms] = useState('');
    const [transcription, setTranscription] = useState('');
    const [predictedDisease, setPredictedDisease] = useState(''); // Replace with actual prediction logic
    const [disDes, setDisDes] = useState(''); // Disease description
    const [myPrecautions, setMyPrecautions] = useState([]); // Precautions
    const [medications, setMedications] = useState([]); // Medications
    const [generalMedications, setGeneralMedications] = useState([]); // General recommendations
    const [workout, setWorkout] = useState([]); // Workouts
    const [myDiet, setMyDiet] = useState([]); // Diets

    const handleSpeechRecognition = () => {
        const recognition = new window.webkitSpeechRecognition();
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
            const result = event.results[0][0].transcript;
            setTranscription(result);
        };

        recognition.onend = () => {
            console.log('Speech recognition ended.');
        };

        recognition.start();
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Implement prediction logic here using symptoms
        // For demo purposes only
        setPredictedDisease('Sample Disease'); 
        setDisDes('Sample description of the disease');
        setMyPrecautions(['Wash hands frequently', 'Wear a mask']);
        setMedications(['Aspirin', 'Ibuprofen']);
        setGeneralMedications(['Rest', 'Stay hydrated']);
        setWorkout(['30 minutes of walking', 'Stretching exercises']);
        setMyDiet(['Fruits', 'Vegetables']);
    };

    return (
        <div>
            {/* Navbar */}
            <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
                <div className="container-fluid">
                    <img className="myimg" src="/path/to/img.png" alt="" />
                    <a className="navbar-brand" href="#">Nirvana Smart-Chain</a>
                    <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
                        <span className="navbar-toggler-icon"></span>
                    </button>
                    <div className="collapse navbar-collapse" id="navbarSupportedContent">
                        <ul className="navbar-nav me-auto mb-2 mb-lg-0">
                            <li className="nav-item">
                                <a className="nav-link active" aria-current="page" href="#">Home</a>
                            </li>
                        </ul>
                        <form className="d-flex" role="search">
                            <input className="form-control me-2" type="search" placeholder="Search" aria-label="Search" />
                            <button className="btn btn-outline-success" type="submit">Search</button>
                        </form>
                    </div>
                </div>
            </nav>

            {/* Main form of page */}
            <h1 className="mt-4 my-4 text-center text-green">Nirvana Smart-Chain</h1>
            <div className="container my-4 mt-4" style={{ background: 'black', color: 'white', borderRadius: '15px', padding: '40px' }}>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="symptoms">Select Symptoms:</label>
                        <input
                            type="text"
                            className="form-control"
                            id="symptoms"
                            name="symptoms"
                            value={symptoms}
                            onChange={(e) => setSymptoms(e.target.value)}
                            placeholder="type symptoms such as itching, sleeping, aching etc"
                        />
                    </div>
                    <br />
                    <button type="button" onClick={handleSpeechRecognition} className="btn btn-primary" style={{ marginLeft: '3px', border: '1px solid white', borderRadius: '20px' }}>
                        Start Speech Recognition
                    </button>
                    <br />
                    {/* Display the transcribed text here */}
                    <div id="transcription">{transcription}</div>
                    <br />
                    <button type="submit" className="btn btn-danger btn-lg" style={{ width: '100%', padding: '14px', marginBottom: '5px' }}>Predict</button>
                </form>
            </div>

            {predictedDisease && (
                <div>
                    {/* Results */}
                    <h1 className="text-center my-4 mt-4">Our AI System Results</h1>
                    <div className="container">
                        <div className="result-container">
                            {/* Buttons to toggle display */}
                            <button className="toggle-button" data-bs-toggle="modal" data-bs-target="#diseaseModal">Disease</button>
                            <button className="toggle-button" data-bs-toggle="modal" data-bs-target="#descriptionModal">Description</button>
                            <button className="toggle-button" data-bs-toggle="modal" data-bs-target="#precautionModal">Precaution</button>
                            <button className="toggle-button" data-bs-toggle="modal" data-bs-target="#medicationsModal">Medications</button>
                            <button className="toggle-button" data-bs-toggle="modal" data-bs-target="#workoutsModal">Workouts</button>
                            <button className="toggle-button" data-bs-toggle="modal" data-bs-target="#dietsModal">Diets</button>
                        </div>
                    </div>

                    {/* Disease Modal */}
                    <div className="modal fade" id="diseaseModal" tabIndex="-1" aria-labelledby="diseaseModalLabel" aria-hidden="true">
                        <div className="modal-dialog">
                            <div className="modal-content">
                                <div className="modal-header" style={{ backgroundColor: '#020606', color: 'white' }}>
                                    <h5 className="modal-title" id="diseaseModalLabel">Predicted Disease</h5>
                                    <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                </div>
                                <div className="modal-body">
                                    <p>{predictedDisease}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Description Modal */}
                    <div className="modal fade" id="descriptionModal" tabIndex="-1" aria-labelledby="descriptionModalLabel" aria-hidden="true">
                        <div className="modal-dialog">
                            <div className="modal-content">
                                <div className="modal-header" style={{ backgroundColor: '#020606', color: 'white' }}>
                                    <h5 className="modal-title" id="descriptionModalLabel">Description</h5>
                                    <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                </div>
                                <div className="modal-body">
                                    <p>{disDes}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Precaution Modal */}
                    <div className="modal fade" id="precautionModal" tabIndex="-1" aria-labelledby="precautionModalLabel" aria-hidden="true">
                        <div className="modal-dialog">
                            <div className="modal-content">
                                <div className="modal-header" style={{ backgroundColor: '#020606', color: 'white' }}>
                                    <h5 className="modal-title" id="precautionModalLabel">Precaution</h5>
                                    <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                </div>
                                <div className="modal-body">
                                    <ul>
                                        {myPrecautions.map((precaution, index) => (
                                            <li key={index}>{precaution}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Medications Modal */}
                    <div className="modal fade" id="medicationsModal" tabIndex="-1" aria-labelledby="medicationsModalLabel" aria-hidden="true">
                        <div className="modal-dialog">
                            <div className="modal-content">
                                <div className="modal-header" style={{ backgroundColor: '#020606', color: 'white' }}>
                                    <h5 className="modal-title" id="medicationsModalLabel">Medications</h5>
                                    <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                </div>
                                <div className="modal-body">
                                    <h6>Disease-specific Medications:</h6>
                                    <ul>
                                        {medications.map((med, index) => (
                                            <li key={index}>{med}</li>
                                        ))}
                                    </ul>
                                    <h6>General Symptom-based Recommendations:</h6>
                                    <ul>
                                        {generalMedications.map((med, index) => (
                                            <li key={index}>{med}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Workouts Modal */}
                    <div className="modal fade" id="workoutsModal" tabIndex="-1" aria-labelledby="workoutsModalLabel" aria-hidden="true">
                        <div className="modal-dialog">
                            <div className="modal-content">
                                <div className="modal-header" style={{ backgroundColor: '#020606', color: 'white' }}>
                                    <h5 className="modal-title" id="workoutsModalLabel">Workouts</h5>
                                    <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                </div>
                                <div className="modal-body">
                                    <ul>
                                        {workout.map((exercise, index) => (
                                            <li key={index}>{exercise}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Diets Modal */}
                    <div className="modal fade" id="dietsModal" tabIndex="-1" aria-labelledby="dietsModalLabel" aria-hidden="true">
                        <div className="modal-dialog">
                            <div className="modal-content">
                                <div className="modal-header" style={{ backgroundColor: '#020606', color: 'white' }}>
                                    <h5 className="modal-title" id="dietsModalLabel">Diets</h5>
                                    <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                </div>
                                <div className="modal-body">
                                    <ul>
                                        {myDiet.map((diet, index) => (
                                            <li key={index}>{diet}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SmartCareCenter;
