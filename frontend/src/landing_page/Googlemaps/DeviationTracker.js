import React, { useState, useEffect } from 'react';
import './DeviationTracker.css';

const DeviationTracker = ({ cartId }) => {
  const [deviationData, setDeviationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [locations, setLocations] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (isModalOpen) {
      fetchDeviationData();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen, cartId]);

  const fetchDeviationData = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/get_deviation_data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cart_id: cartId }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch deviation data');
      }

      const data = await response.json();

      // Handle no deviation case
      if (data.message === 'No deviation data') {
        setDeviationData({});
        setLoading(false);
        return;
      }

      const sortedData = Object.entries(data)
        .sort((a, b) => new Date(b[1].start.timestamp) - new Date(a[1].start.timestamp))
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

      setDeviationData(sortedData);
      fetchLocationNames(sortedData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchLocationNames = async (data) => {
    const locationCache = {};

    for (const entry of Object.values(data)) {
      const { start, end } = entry;
      const startKey = `${start.location.lat},${start.location.lng}`;
      const endKey = `${end.location.lat},${end.location.lng}`;

      if (!locationCache[startKey]) {
        try {
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${start.location.lat},${start.location.lng}&key=AIzaSyCKMi4KBlb1RmR_E3AbguOPL2YKjfaCvn4`
          );
          const data = await response.json();
          if (data.results[0]) {
            locationCache[startKey] = data.results[0].formatted_address;
          }
        } catch (err) {
          locationCache[startKey] = 'Location unavailable';
        }
      }

      if (!locationCache[endKey]) {
        try {
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${end.location.lat},${end.location.lng}&key=AIzaSyCKMi4KBlb1RmR_E3AbguOPL2YKjfaCvn4`
          );
          const data = await response.json();
          if (data.results[0]) {
            locationCache[endKey] = data.results[0].formatted_address;
          }
        } catch (err) {
          locationCache[endKey] = 'Location unavailable';
        }
      }
    }

    setLocations(locationCache);
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'medium',
    });
  };

  const Modal = () => {
    if (!isModalOpen) return null;

    return (
      <div className="devt-modal__overlay" onClick={() => setIsModalOpen(false)}>
        <div className="devt-modal__content" onClick={e => e.stopPropagation()}>
          <div className="devt-modal__header">
            <div className="devt-modal__title-wrapper">
              <h1 className="devt-modal__title">Deviation Analysis</h1>
            </div>
            <button className="devt-modal__close" onClick={() => setIsModalOpen(false)}>×</button>
          </div>

          {loading && (
            <div className="devt-loading">
              <div className="devt-loading__spinner"></div>
              <p className="devt-loading__text">Loading deviation data...</p>
            </div>
          )}

          {error && (
            <div className="devt-error">
              <span className="devt-error__icon">⚠️</span>
              <p className="devt-error__message">{error}</p>
            </div>
          )}

          {!loading && !error && deviationData && Object.keys(deviationData).length === 0 && (
            <div className="devt-error">
              <span className="devt-error__icon">📭</span>
              <p className="devt-error__message">No deviations recorded for this cart.</p>
            </div>
          )}

          {!loading && !error && deviationData && Object.keys(deviationData).length > 0 && (
            <div className="devt-content">
              {Object.entries(deviationData).map(([key, entry]) => {
                const startKey = `${entry.start.location.lat},${entry.start.location.lng}`;
                const endKey = `${entry.end.location.lat},${entry.end.location.lng}`;

                return (
                  <div key={key} className="devt-card">
                    <div className="devt-card__header">
                      <div className="devt-card__number">
                        <span className="devt-card__number-value">{parseInt(key) + 1}</span>
                        <span className="devt-card__number-label">Deviation</span>
                      </div>
                      <div className="devt-card__distance">
                        <span className="devt-card__distance-value">{entry.start.distance.toFixed(2)}</span>
                        <span className="devt-card__distance-unit">meters</span>
                      </div>
                    </div>

                    <div className="devt-timeline">
                      <div className="devt-timeline__point">
                        <div className="devt-timeline__marker devt-timeline__marker--start"></div>
                        <div className="devt-timeline__content">
                          <h3 className="devt-timeline__title">
                            <span className="devt-timeline__icon">🚩</span>
                            Start Location
                          </h3>
                          <div className="devt-location">{locations[startKey] || 'Loading location...'}</div>
                          <div className="devt-timestamp">
                            <span className="devt-timestamp__icon">🕒</span>
                            <span className="devt-timestamp__value">{formatTimestamp(entry.start.timestamp)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="devt-timeline__connector"></div>

                      <div className="devt-timeline__point">
                        <div className="devt-timeline__marker devt-timeline__marker--end"></div>
                        <div className="devt-timeline__content">
                          <h3 className="devt-timeline__title">
                            <span className="devt-timeline__icon">🏁</span>
                            End Location
                          </h3>
                          <div className="devt-location">{locations[endKey] || 'Loading location...'}</div>
                          <div className="devt-timestamp">
                            <span className="devt-timestamp__icon">🕒</span>
                            <span className="devt-timestamp__value">{formatTimestamp(entry.end.timestamp)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="devt-container">
      <button className="devt-button" onClick={() => setIsModalOpen(true)}>
        <span className="devt-button__icon">📍</span>
        <span className="devt-button__text">View Deviations</span>
      </button>
      <Modal />
    </div>
  );
};

export default DeviationTracker;