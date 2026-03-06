import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { io } from "socket.io-client";

const customMarkerStyle = `
  .custom-marker {
  width: 25px;
  height: 35px;
  background-color: #ff3b30;
  border-radius: 50% 50% 50% 0;
  position: relative;
  top: -15px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3); /* Enhanced shadow */
  border: 2px solid #e60000;
  cursor: pointer;
  transition: transform 0.3s ease, background-color 0.3s ease; /* Add smooth hover transition */
  animation: popIn 0.5s ease-out; /* Marker appears with animation */
  transform: translateX(-50%) rotate(45deg); /* Apply translation and rotation */
}

/* Add hover effect */
.custom-marker:hover {
  background-color: #ff1a1a;
  transform: translateX(-50%) rotate(45deg) scale(1.1); /* Slightly enlarge on hover */
}

.custom-marker::before {
  content: "";
  width: 12px;
  height: 12px;
  background-color: white;
  border-radius: 50%;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(45deg);
  border: 1px solid #e60000;
}

/* Optional: Style when a marker is selected or active */
.custom-marker.selected {
  background-color: #e60000;
  border-color: #ff3b30;
}

.custom-marker.selected::before {
  background-color: #e60000;
  border-color: #ff3b30;
}

`;

const MapComponent = () => {
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const socket = io("http://localhost:3000"); // Connect to backend

  useEffect(() => {
    const styleTag = document.createElement("style");
    styleTag.innerHTML = customMarkerStyle;
    document.head.appendChild(styleTag);

    // Initialize the map
    mapRef.current = L.map("map").setView([0, 0], 16);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(mapRef.current);

    // Watch user location and send to server
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          socket.emit("send-location", { latitude, longitude });
        },
        (err) => console.error(err),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    }

    // Receive location updates
    socket.on("receive-location", (data) => {
      const { id, latitude, longitude } = data;
      console.log(`Marker for ${id}:`, latitude, longitude);

      if (markersRef.current[id]) {
        // Update existing marker
        markersRef.current[id].setLatLng([latitude, longitude]);
      } else {
      
        const customIcon = L.divIcon({
          className: "custom-marker", 
          iconSize: [25, 25], // Custom size of the marker
        });

     
        markersRef.current[id] = L.marker([latitude, longitude], {
          icon: customIcon, 
        }).addTo(mapRef.current);
      }

   
      if (id === socket.id) {
        mapRef.current.setView([latitude, longitude]);
      }
    });

   
    socket.on("user-disconnect", (id) => {
      if (markersRef.current[id]) {
        mapRef.current.removeLayer(markersRef.current[id]);
        delete markersRef.current[id];
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [socket]);

  return <div id="map" style={{ height: "800px", width: "100%", margin: "0 auto", border: "2px solid #ccc" }} />;
};

export default MapComponent;
