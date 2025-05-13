import type { IUser } from "@/models/user.model";
import User from "@/models/user.model";
import type { Server as HttpServer } from "http";
import { Server, type Socket } from "socket.io";
import { verifyAccessToken } from "./utils/token";

interface AuthenticatedSocket extends Socket {
  user?: IUser;
}

// Map to store active connections by user ID
const activeConnections = new Map<string, AuthenticatedSocket[]>();

export const initializeSocket = (httpServer: HttpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingTimeout: 60000, // 60 seconds
    pingInterval: 25000, // 25 seconds
  });

  console.log('[Socket.IO] Server created');

  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    const socketId = socket.id;
    console.log(`[Socket.IO][${socketId}] Authentication attempt started`);
    
    try {
      const token = socket.handshake.auth.token;
      console.log(`[Socket.IO][${socketId}] Token received:`, token ? '***masked***' : 'none');

      if (!token) {
        console.log(`[Socket.IO][${socketId}] Authentication failed - no token provided`);
        return next(new Error("Authentication error: Token not provided"));
      }

      // Verify token
      const decoded = verifyAccessToken(token);
      console.log(`[Socket.IO][${socketId}] Token decoded:`, decoded);

      if (!decoded || !decoded.userId) {
        console.log(`[Socket.IO][${socketId}] Authentication failed - invalid token structure`);
        return next(new Error("Authentication error: Invalid token"));
      }

      // Get user from database
      console.log(`[Socket.IO][${socketId}] Fetching user from database...`);
      const user = await User.findById(decoded.userId).populate({
        path: "roles",
      });

      if (!user) {
        console.log(`[Socket.IO][${socketId}] Authentication failed - user not found`);
        return next(new Error("Authentication error: User not found"));
      }

      // Attach user to socket
      socket.user = user;
      console.log(`[Socket.IO][${socketId}] Authentication successful for user:`, {
        userId: user._id,
        email: user.email,
        roles: user.roles.map((r: any) => r.name || r)
      });
      
      next();
    } catch (error) {
      console.error(`[Socket.IO][${socketId}] Authentication error:`, error);
      next(new Error(`Authentication error: ${(error as Error).message}`));
    }
  });

  // Connection handler
  io.on("connection", (socket: AuthenticatedSocket) => {
    const socketId = socket.id;
    console.log(`[Socket.IO][${socketId}] New connection established`);
    
    if (!socket.user || !socket.user._id) {
      console.log(`[Socket.IO][${socketId}] Connection rejected - no user attached`);
      socket.disconnect();
      return;
    }

    const userId = socket.user._id.toString();
    console.log(`[Socket.IO][${socketId}] User connected: ${userId}`);

    // Store connection in the map
    if (!activeConnections.has(userId)) {
      console.log(`[Socket.IO][${socketId}] First connection for user ${userId}`);
      activeConnections.set(userId, []);
    } else {
      console.log(`[Socket.IO][${socketId}] Additional connection for user ${userId}. Total connections: ${activeConnections.get(userId)?.length || 0 + 1}`);
    }
    
    activeConnections.get(userId)?.push(socket);
    console.log(`[Socket.IO] Active connections count:`, {
      totalUsers: activeConnections.size,
      totalSockets: Array.from(activeConnections.values()).flat().length
    });

    // Ping to keep connection alive
    const pingInterval = setInterval(() => {
      console.log(`[Socket.IO][${socketId}] Sending ping to user ${userId}`);
      socket.emit("ping");
    }, 30000); // 30 seconds

    // Disconnect handler
    socket.on("disconnect", (reason) => {
      console.log(`[Socket.IO][${socketId}] User disconnected: ${userId}. Reason: ${reason}`);

      // Clear ping interval
      clearInterval(pingInterval);
      console.log(`[Socket.IO][${socketId}] Cleared ping interval`);

      // Remove socket from active connections
      const userSockets = activeConnections.get(userId) || [];
      const updatedSockets = userSockets.filter((s) => s.id !== socket.id);

      if (updatedSockets.length > 0) {
        activeConnections.set(userId, updatedSockets);
        console.log(`[Socket.IO][${socketId}] Updated connections for user ${userId}. Remaining: ${updatedSockets.length}`);
      } else {
        activeConnections.delete(userId);
        console.log(`[Socket.IO][${socketId}] Last connection removed for user ${userId}`);
      }

      console.log(`[Socket.IO] Updated active connections count:`, {
        totalUsers: activeConnections.size,
        totalSockets: Array.from(activeConnections.values()).flat().length
      });
    });

    // Add event listeners for debugging
    socket.onAny((event, ...args) => {
      console.log(`[Socket.IO][${socketId}] Event received: ${event}`, args);
    });
  });

  console.log('[Socket.IO] Server initialization complete');
  return io;
};

// Function to send notification to specific roles
export const notifyRoles = (roles: string[], event: string, data: any) => {
  console.log(`[Socket.IO] Notifying roles: ${roles.join(', ')} with event: ${event}`, data);
  
  // Get all active connections
  for (const [userId, sockets] of activeConnections.entries()) {
    // Get the first socket to check user roles (all sockets for same user have same roles)
    const socket = sockets[0];

    if (socket && socket.user) {
      // Check if user has any of the specified roles
      const hasRole = roles.some((role) => {
        if (socket.user && socket.user.roles) {
          return socket.user.roles.some(
            (userRole: any) => userRole.name === role || (typeof userRole === "object" && userRole.name === role),
          );
        }
        return false;
      });

      if (hasRole) {
        console.log(`[Socket.IO] User ${userId} has required role. Sending event to ${sockets.length} sockets`);
        // Send notification to all sockets of this user
        sockets.forEach((s) => {
          console.log(`[Socket.IO] Emitting event to socket ${s.id}`);
          s.emit(event, data);
        });
      } else {
        console.log(`[Socket.IO] User ${userId} doesn't have required roles`);
      }
    }
  }

  console.log('[Socket.IO] Notification process completed');
};