import { useEffect, useState } from 'react';

const useRouteTracking = (socket, currentLocation, routeLegsPolylines, cartId, driverId) => {
  const [isDeviating, setIsDeviating] = useState(false);
  const [deviationStartPoint, setDeviationStartPoint] = useState(null);
  const [routeWaypoints, setRouteWaypoints] = useState([]);
  
  // Convert the polylines into a flat array of waypoints
  useEffect(() => {
    if (routeLegsPolylines.length > 0) {
      const allWaypoints = routeLegsPolylines.flat().map(point => ({
        lat: point.latitude,
        lng: point.longitude
      }));
      setRouteWaypoints(allWaypoints);
    }
  }, [routeLegsPolylines]);

  // Calculate distance between two points using Haversine formula
  const calculateDistance = (point1, point2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (point1.lat * Math.PI) / 180;
    const φ2 = (point2.lat * Math.PI) / 180;
    const Δφ = ((point2.lat - point1.lat) * Math.PI) / 180;
    const Δλ = ((point2.lng - point1.lng) * Math.PI) / 180;

    const a = 
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance;
  };

  // Find nearest point on route
  const findNearestPointOnRoute = (currentPoint) => {
    let minDistance = Infinity;
    let nearestPoint = null;

    routeWaypoints.forEach(waypoint => {
      const distance = calculateDistance(
        { lat: currentPoint.latitude, lng: currentPoint.longitude },
        waypoint
      );
      if (distance < minDistance) {
        minDistance = distance;
        nearestPoint = waypoint;
      }
    });

    return { point: nearestPoint, distance: minDistance };
  };

  // Check for route deviation
  useEffect(() => {
    if (!currentLocation || !socket || routeWaypoints.length === 0) {
      console.log('Skipping deviation check - missing required data:', {
        hasCurrentLocation: !!currentLocation,
        hasSocket: !!socket,
        routeWaypointsLength: routeWaypoints.length
      });
      return;
    }

    const { distance, point } = findNearestPointOnRoute(currentLocation.coords);
    const DEVIATION_THRESHOLD = 50; // 50 meters threshold

    console.log('Deviation Check:', {
      distance,
      threshold: DEVIATION_THRESHOLD,
      isCurrentlyDeviating: isDeviating
    });

    if (distance > DEVIATION_THRESHOLD && !isDeviating) {
      // Start of deviation
      const deviationStart = {
        cart_id: cartId,
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        deviation_data: {
          start: {
            distance: distance,
            location: {
              lat: currentLocation.coords.latitude,
              lng: currentLocation.coords.longitude
            },
            driver_id: driverId,
            timestamp: new Date().toISOString()
          }
        }
      };
      console.log('Emitting Deviation Start:', deviationStart);
      setIsDeviating(true);
      setDeviationStartPoint(deviationStart);
      socket.emit('driver-location-update', deviationStart);
    } 
    else if (distance <= DEVIATION_THRESHOLD && isDeviating) {
      // End of deviation
      const deviationEnd = {
        cart_id: cartId,
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        deviation_data: {
          end: {
            distance: distance,
            location: {
              lat: currentLocation.coords.latitude,
              lng: currentLocation.coords.longitude
            },
            timestamp: new Date().toISOString()
          }
        }
      };
      console.log('Emitting Deviation End:', deviationEnd);
      setIsDeviating(false);
      socket.emit('driver-location-update', deviationEnd);
    } 
    else if (!isDeviating) {
      // Normal location update without deviation
      const locationUpdate = {
        cart_id: cartId,
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        deviation_data: null
      };
      console.log('Emitting Normal Location Update:', locationUpdate);
      socket.emit('driver-location-update', locationUpdate);
    }
  }, [currentLocation, routeWaypoints, isDeviating, socket, cartId, driverId]);

  return { isDeviating, deviationStartPoint };
};

export default useRouteTracking;