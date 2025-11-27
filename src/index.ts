import "reflect-metadata";
import express from "express";
import cors from "cors";
import * as dotenv from "dotenv";
import mongoose from "mongoose";
import { useExpressServer } from "routing-controllers";
import { loadControllers, loadMiddlewares } from "./utils/loaders";
import { connectDB } from "./utils/db";
import fileUpload from "express-fileupload";
import path from "path";
import { SocketService } from "./services/socket.service";
import "./cron/absentAttendanceCron";

// ✅ Load environment variables
console.log("🧩 Loading environment variables...");
dotenv.config();
console.log("✅ .env loaded successfully");
console.log("🔑 Environment Variables Summary:");
console.log({
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  MONGO_URI: process.env.MONGO_URI ? "✅ Loaded" : "❌ Missing",
  JWT_SECRET: process.env.JWT_SECRET ? "✅ Loaded" : "❌ Missing",
});

const { PORT } = process.env;

// ✅ Database connection check
const checkDatabaseConnection = async () => {
  console.log("🔍 Checking MongoDB connection status...");
  try {
    if (!mongoose.connection.db) {
      console.warn("⚠️ Database not yet initialized");
      return { status: "disconnected", error: "Database not initialized" };
    }
    await mongoose.connection.db.admin().ping();
    console.log("✅ Database ping successful");
    return { status: "connected" };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("❌ Database ping failed:", errorMessage);
    return { status: "disconnected", error: errorMessage };
  }
};

// ✅ Initialize server
const initServer = async (): Promise<void> => {
  try {
    console.log("🚀 Initializing server...");

    // --- Load controllers and middlewares ---
    console.log("📦 Loading controllers...");
    const controllers = await loadControllers();
    console.log(`✅ Loaded ${controllers.length} controllers`);

    console.log("⚙️ Loading middlewares...");
    const middlewares = await loadMiddlewares();
    console.log(`✅ Loaded ${middlewares.length} middlewares`);

    const app = express();

    // --- Health check route ---
    console.log("💓 Registering root health check endpoint...");
    app.get("/", async (req, res) => {
      const dbStatus = await checkDatabaseConnection();
      res.json({
        status: "Server is running",
        timestamp: new Date().toISOString(),
        database: dbStatus.status,
        nodeVersion: process.version,
      });
    });

    // --- Global middlewares ---
    console.log("🧰 Setting up global middlewares...");
    app.use(fileUpload());
    console.log("✅ File upload middleware enabled");

    app.use(
      cors({
        origin: "*",
        methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Origin", "Content-Type", "Authorization"],
        credentials: true,
      })
    );
    console.log("✅ CORS middleware enabled");

    // --- Serve static files (works in dev + prod build) ---
    const publicPath = path.resolve(__dirname, "../public");
    app.use("/api/public", express.static(publicPath));
    console.log("🖼️ Static images served from:", publicPath);

    // --- Hook routing-controllers ---
    console.log("🧩 Registering routing-controllers...");
    // useExpressServer(app, {
    //   controllers,
    //   middlewares,
    //   defaultErrorHandler: true,
    //   validation: true,
    // });

    // ✅ Setup routing-controllers (handles JSON internally)
    useExpressServer(app, {
      controllers,
      middlewares,
      defaultErrorHandler: true,
      classTransformer: true,
      validation: {
        whitelist: true,
        forbidNonWhitelisted: true,
        validationError: { target: false },
      },
    });
    console.log("✅ routing-controllers setup completed");

    console.log("✅ routing-controllers setup completed");

    // --- Connect database ---
    console.log("🧠 Connecting to MongoDB...");
    await connectDB();
    console.log("✅ Database connection established");

    // --- Start the server ---
    const serverPort = parseInt(PORT || "3000", 10);
    const server = app.listen(serverPort, () => {
      console.log(`🚀 Server running at http://localhost:${serverPort}`);
      SocketService.initialize(server);
      console.log("📡 Socket service initialized");
    });

    // --- Graceful shutdown handling ---
    const gracefulShutdown = () => {
      console.log("🛑 Received shutdown signal. Closing server...");
      server.close(async () => {
        console.log("✅ HTTP server closed.");
        await mongoose.connection.close();
        console.log("✅ Database connection closed.");
        process.exit(0);
      });
    };

    process.on("SIGTERM", gracefulShutdown);
    process.on("SIGINT", gracefulShutdown);

    console.log("✅ Server initialization complete");
  } catch (error) {
    console.error("❌ Error initializing server:", error);
    process.exit(1);
  }
};

initServer();
