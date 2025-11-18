import dotenv from 'dotenv';
dotenv.config(); // ✅ Loads environment variables from .env

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { registerPhpApiRoutes } from "./php-api-routes";
// import { phpProxyRouter } from "./php-proxy-routes.js"; // Disabled - using local API only
import { setupVite, serveStatic, log } from "./vite";
import { storage, initStorage } from "./storage";
import bcrypt from 'bcryptjs';

const app = express();

import cors from 'cors';
app.use(cors({
  origin: true, // Allow all origins for Replit proxy environment
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Function to initialize test data
async function initializeTestData() {
  try {
    // Check if data already exists
    const users = await storage.getUsers();
    if (users.length > 0) {
      log("Test data already exists.");
      return;
    }

    log("Initializing test data...");

    // Hash password for security
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password', salt);

    // Create a test user
    const user = await storage.createUser({
      username: "testuser",
      password: hashedPassword,
      fullName: "Test User",
      email: "test.user@company.com",
      avatarUrl: null,
      isActive: true
    });

    // Create a test team
    const team = await storage.createTeam({
      name: "Engineering Team",
      description: "Core engineering team",
      createdBy: user.id,
      isActive: true
    });

    // Add the user to the team
    await storage.addTeamMember({
      teamId: team.id,
      userId: user.id,
      role: "ADMIN"
    });

    // Create a test project
    const project = await storage.createProject({
      name: "Project Management App",
      description: "A comprehensive project management application",
      status: "ACTIVE",
      createdBy: user.id,
      teamId: team.id,
      key: "PROJ", // Project key for work item references
      startDate: new Date(),
      targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days from now
    });

    log("Sample project created successfully!");

    log("Test data initialized successfully!");
  } catch (error) {
    console.error("Error initializing test data:", error);
  }
}

// Import the data generators
import { generateSampleData } from "./data-generator";
import { generateRandomWorkItems } from "./fixed-data-generator";

// Function to create sample users with different role types
async function initializeSampleUsers() {
  try {
    log("Creating sample role-based users if they don't exist...");
    
    // Check if sample users already exist
    const existingUsers = await storage.getUsers();
    const adminExists = existingUsers.some(user => user.role === 'ADMIN');
    const scrumMasterExists = existingUsers.some(user => user.role === 'SCRUM_MASTER');
    const regularUserExists = existingUsers.some(user => user.role === 'USER');
    
    if (adminExists && scrumMasterExists && regularUserExists) {
      log("Sample role-based users already exist.");
      return;
    }
    
    const salt = await bcrypt.genSalt(10);
    
    // Hash different passwords for each user type
    const adminHashedPassword = await bcrypt.hash('admin123', salt);
    const scrumHashedPassword = await bcrypt.hash('scrum123', salt);
    const userHashedPassword = await bcrypt.hash('user123', salt);
    
    const sampleUsers = [];
    
    // Create admin user if not exists
    if (!adminExists) {
      const adminUser = await storage.createUser({
        username: 'admin',
        email: 'admin@example.com',
        password: adminHashedPassword,
        fullName: 'Admin User',
        role: 'ADMIN',
        isActive: true
      });
      
      sampleUsers.push(adminUser);
      log("Created ADMIN user - admin@example.com");
    }
    
    // Create scrum master user if not exists
    if (!scrumMasterExists) {
      const scrumUser = await storage.createUser({
        username: 'scrummaster',
        email: 'scrum@example.com',
        password: scrumHashedPassword,
        fullName: 'Scrum Master',
        role: 'SCRUM_MASTER',
        isActive: true
      });
      
      sampleUsers.push(scrumUser);
      log("Created SCRUM_MASTER user - scrum@example.com");
    }
    
    // Create regular user if not exists
    if (!regularUserExists) {
      const regularUser = await storage.createUser({
        username: 'user',
        email: 'user@example.com',
        password: userHashedPassword,
        fullName: 'Regular User',
        role: 'USER',
        isActive: true
      });
      
      sampleUsers.push(regularUser);
      log("Created USER user - user@example.com");
    }
    
    log(`Created ${sampleUsers.length} sample role-based users successfully.`);
  } catch (error) {
    console.error("Error creating sample users:", error);
  }
}

import session from 'express-session';
import ConnectPgSimple from 'connect-pg-simple';
import { Pool } from 'pg';

// Create PostgreSQL session store for production scalability
const pgSession = ConnectPgSimple(session);

// Create connection pool for sessions using DATABASE_URL
const sessionPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const sessionStore = new pgSession({
  pool: sessionPool,
  tableName: 'user_sessions',
  createTableIfMissing: true
});

// Trust proxy for secure cookies behind Replit's load balancer
app.set('trust proxy', 1);

// Ensure session secret is provided in production
if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET environment variable is required in production');
}

app.use(session({
  name: 'PHPSESSID', // Use 'name' for cookie name
  secret: process.env.SESSION_SECRET || 'bHk29!#dfJslP0qW82@3', // Fallback only for development
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 24 * 60 * 60 * 1000,
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
  }
}));

// Test route to verify session creation
app.get('/api/test-session', (req, res) => {
  (req.session as any).test = 'hello';
  res.json({ message: 'Session set!' });
});

(async () => {
  // Initialize storage first to ensure we use cPanel database
  await initStorage();
  
  // Initialize test data before starting the server
  await initializeTestData();
  
  // Generate sample data first (will be skipped if data already exists)
  await generateSampleData();
  
  const server = await registerRoutes(app);
  
  // Generate additional data in background after server starts (non-blocking)
  const generateBackgroundData = async () => {
    try {
      // Get existing data
      const users = await storage.getUsers();
      if (users.length > 0 && process.env.SEED_ON_START !== 'false') {
        log("Sample data already exists, generating additional items with fixed generator in background...");
        await generateRandomWorkItems(20); // Reduced count for faster startup
        log("Background data generation completed");
      }
    } catch (error) {
      console.error("Error generating additional data:", error);
    }
  };
  
  // Register PHP API routes
  registerPhpApiRoutes(app);
  
  // Register PHP proxy routes
  // app.use('/php', phpProxyRouter); // Disabled - using local API only
  
  // Create sample users for different roles after server is ready
  await initializeSampleUsers();

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = process.env.PORT || 5000;
  server.listen(Number(port), '0.0.0.0', () => {
    log(`✅ Server is running on port ${port}`);
    
    // Start background data generation after server is ready
    void generateBackgroundData().catch(console.error);
  });


})();
