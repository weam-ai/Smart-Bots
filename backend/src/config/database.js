const mongoose = require("mongoose");
const {
  DB_CONNECTION,
  DB_USERNAME,
  DB_PASSWORD,
  DB_HOST,
  DB_PORT,
  DB_DATABASE,
  MONOGODB_URI,
} = require("./env");

// Database connection configuration
const connectDB = async () => {
  try {
    const dbConfigure = `${DB_USERNAME}:${DB_PASSWORD}`;

    // Build MongoDB URI based on connection type
    let mongoURI;
    if (MONOGODB_URI) {
      mongoURI = MONOGODB_URI;
    } else if (DB_CONNECTION === "mongodb+srv") {
      // MongoDB Atlas - no port number allowed
      mongoURI = `${DB_CONNECTION}://${dbConfigure}@${DB_HOST}/${DB_DATABASE}?retryWrites=true&w=majority&readPreference=nearest`;
    } else {
      // Local MongoDB - include port number
      mongoURI = `${DB_CONNECTION}://${dbConfigure}@${DB_HOST}:${DB_PORT}/${DB_DATABASE}?retryWrites=true&w=majority&readPreference=nearest`;
    }

    const conn = await mongoose.connect(mongoURI, {
      // Modern connection options
      maxPoolSize: 10, // Maintain up to 10 socket connections
    });

    // Handle connection events
    mongoose.connection.on("error", (err) => {
      console.error("MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.log("MongoDB disconnected");
    });

    // Graceful shutdown
    process.on("SIGINT", async () => {
      await mongoose.connection.close();
      console.log("MongoDB connection closed through app termination");
      process.exit(0);
    });
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
};

module.exports = connectDB;
