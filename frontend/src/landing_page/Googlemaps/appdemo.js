// Backend modifications with routing (server.js)
const express = require("express");
const app = express();
const http = require("http");
const socketio = require("socket.io");
const cors = require("cors");

const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: "http://localhost:3001",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    credentials: true,
  },
});

// Enhanced state management
const state = {
  currentRoute: null,
  driverLocation: null,
  connectedUsers: new Map(),
  driverUpdateHistory: [],
  deviationHistory: [],
  activeRoutes: new Map()
};
function calculateDistance(point1, point2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = point1.lat * Math.PI/180;
  const φ2 = point2.lat * Math.PI/180;
  const Δφ = (point2.lat - point1.lat) * Math.PI/180;
  const Δλ = (point2.lng - point1.lng) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

app.use(cors());

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  const role = socket.handshake.query.role;
  state.connectedUsers.set(socket.id, { role, lastUpdate: new Date() });
  // Handle user role assignment
  socket.on("user-role", ({ role }) => {
    state.connectedUsers.set(socket.id, { role, lastUpdate: new Date() });
    console.log(`User ${socket.id} registered as ${role}`);
  });
  socket.on("route-created", (routeData) => {
    console.log("New route created:", routeData);
    state.currentRoute = routeData;
    state.activeRoutes.set(socket.id, routeData);
    io.emit("route-broadcast", routeData);
  });
  // Enhanced driver location handling
  socket.on("driver-location-update", (data) => {
    const userInfo = state.connectedUsers.get(socket.id);
    
    if (userInfo?.role === 'driver') {
      state.driverLocation = {
        ...data,
        lastUpdate: new Date().toISOString()
      };

      // Check for route deviation
      if (state.currentRoute) {
        const waypoints = state.currentRoute.waypoints;
        let minDistance = Infinity;
        
        // Find minimum distance to route
        for (let i = 0; i < waypoints.length - 1; i++) {
          const distance = calculateDistance(
            { lat: data.latitude, lng: data.longitude },
            waypoints[i]
          );
          minDistance = Math.min(minDistance, distance);
        }

        // If deviation detected
        if (minDistance > 100) { // 100 meters threshold
          const deviationData = {
            timestamp: new Date().toISOString(),
            driverId: socket.id,
            location: { lat: data.latitude, lng: data.longitude },
            distance: minDistance,
            message: `Driver deviated ${Math.round(minDistance)}m from planned route`
          };

          state.deviationHistory.push(deviationData);
          io.emit("route-deviation", deviationData);
        }
      }

      // Broadcast location update
      socket.broadcast.emit("driver-location-update", state.driverLocation);
      state.driverUpdateHistory.push(state.driverLocation);
    }
  });

  // Handle route updates
  socket.on("route-saved", (routeData) => {
    console.log("Route saved:", routeData);
    state.activeRoutes.set(socket.id, routeData);
  });
  socket.on("request-initial-state", () => {
    socket.emit("initial-state", {
      driverLocation: state.driverLocation,
      currentRoute: state.currentRoute,
      deviationHistory: state.deviationHistory
    });
    
    // If there's an active route, send it to the new client
    if (state.currentRoute) {
      socket.emit("route-broadcast", {
        waypoints: state.currentRoute.waypoints || [],
        metadata: {
          startLocation: state.currentRoute.startLocation,
          checkpoint: state.currentRoute.checkpoint,
          destination: state.currentRoute.destination,
          checkpointCoords: state.currentRoute.checkpointCoords,
          destinationCoords: state.currentRoute.destinationCoords,
          startTime: state.currentRoute.startTime
        }
      });
    }
  });
    
  // Handle disconnection
  socket.on("disconnect", () => {
    const userInfo = state.connectedUsers.get(socket.id);
    if (userInfo?.role === 'driver') {
      // Clear driver location when driver disconnects
      state.driverLocation = null;
      socket.broadcast.emit("driver-disconnected");
    }
    state.connectedUsers.delete(socket.id);
    console.log("Client disconnected:", socket.id);
  });
});

// Add diagnostic endpoint
app.get("/status", (req, res) => {
  res.json({
    connectedUsers: Array.from(state.connectedUsers.entries()),
    activeRoutes: Array.from(state.activeRoutes.entries()),
    lastDriverUpdate: state.driverLocation,
    deviationHistory: state.deviationHistory,
    updateCount: state.driverUpdateHistory.length
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});