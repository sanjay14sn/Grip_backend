import { Server, Socket } from "socket.io";
import http from "http";

export class SocketService {
  private static instance: SocketService;
  private io!: Server;

  private constructor() { }

  static initialize(server: http.Server): SocketService {
    if (this.instance) {
      return this.instance;
    }

    this.instance = new SocketService();
    this.instance.io = new Server(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      },
    });

    this.instance.registerCoreListeners();
    console.log("🔌 Socket.IO initialised");
    return this.instance;
  }

  /**
   * Emit a custom event to a specific member's private room.
   * Front-end should first call `socket.emit("registerResp", memberId)` so
   * the server puts that socket in a room named with the memberId.
   */
  static emitToMember(memberId: string, event: string, payload: any): void {
    if (!this.instance) {
      console.warn("SocketService not initialised; cannot emit event.");
      return;
    }
    this.instance.io.to(memberId).emit(event, payload);
  }

  static getInstance(): SocketService {
    if (!this.instance) {
      throw new Error(
        "SocketService not initialised. Call initialize() first."
      );
    }
    return this.instance;
  }
  private registerCoreListeners(): void {
    this.io.on("connection", (socket: Socket) => {
      console.log("🚀 New socket connection", socket.id);

      socket.on("registerResp", (memberId: string) => {
        if (memberId) {
          socket.join(memberId);
          socket.emit("registered");
          console.log(`✅ Socket ${socket.id} joined ${memberId}`);
        }
      });

      socket.on("disconnect", (reason) => {
        console.log(`⚡ Socket ${socket.id} disconnected (${reason})`);
      });
    });
  }
}
