import React, { useEffect, useRef } from "react";

const GooglePlacesAutocomplete = () => {
  const mapRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const initMap = () => {
      // Create the map centered on a default location
      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: -33.8688, lng: 151.2195 }, // Default to Sydney, Australia
        zoom: 13,
      });

      // Create the autocomplete object and bind it to the input field
      const autocomplete = new window.google.maps.places.Autocomplete(
        inputRef.current
      );
      autocomplete.bindTo("bounds", map);

      // Set up the event listener for when the user selects a place
      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (!place.geometry) {
          console.log("No details available for the input: '" + place.name + "'");
          return;
        }

        if (place.geometry.viewport) {
          map.fitBounds(place.geometry.viewport);
        } else {
          map.setCenter(place.geometry.location);
          map.setZoom(17); // Zoom to 17 if the place has no viewport
        }

        // Place a marker on the selected location
        new window.google.maps.Marker({
          position: place.geometry.location,
          map: map,
        });
      });
    };

    // Load the Google Maps script dynamically
    const googleMapsScript = document.createElement("script");
    googleMapsScript.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyCKMi4KBlb1RmR_E3AbguOPL2YKjfaCvn4&libraries=places&callback=initMap`;
    googleMapsScript.async = true;
    googleMapsScript.defer = true;
    window.initMap = initMap;
    document.body.appendChild(googleMapsScript);

    return () => {
      // Cleanup: Remove the Google Maps script on component unmount
      document.body.removeChild(googleMapsScript);
    };
  }, []);

  return (
    <div>
      <input
        ref={inputRef}
        id="pac-input"
        type="text"
        placeholder="Search for a place"
        style={{
          marginTop: "10px",
          width: "300px",
          padding: "5px",
          fontSize: "14px",
        }}
      />
      <div
        ref={mapRef}
        id="map"
        style={{
          height: "400px",
          width: "100%",
        }}
      ></div>
    </div>
  );
};

export default GooglePlacesAutocomplete;
