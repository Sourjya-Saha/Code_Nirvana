
{isGeolocationMapOpen && selectedShipmentLocations && (
<div style={styles.container}>
<div style={styles.header}>
  <div style={styles.headerContent}>
    <h1 style={styles.headerTitle}>
      <span style={{color:"orange"}}>Nirvana</span>
      <span style={{color:"blue"}}>-</span>
      <span style={{color:"green"}}>SmartChain</span> Tracking System
    </h1>
    <div style={styles.headerRight}>
            <span style={styles.connectedText}>
              Connected as: Manufacturer
            </span>
            <button 
              className="close-modal-btn" 
              onClick={() => setIsGeolocationMapOpen(false)}
            >
              Close
            </button>
          </div>
  </div>
</div>

<div style={styles.mapContainer}>
<GeolocationMap 
              userRole="start"
              initialStartLocation={selectedShipmentLocations.startLocation}
              initialCheckpoint={selectedShipmentLocations.checkpointLocation}
              initialDestination={selectedShipmentLocations.destinationLocation}
            />
</div>
</div>
)}