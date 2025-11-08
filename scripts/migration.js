const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { Schema } = mongoose;
dotenv.config();
const {
  // MONGO_USER,
  // MONGO_PASSWORD,
  // MONGO_HOST,
  // MONGO_PORT,
  // MONGO_DB,
  MONGODB_URI
} = process.env;
// Set up the migration schema
const migrationSchema = new Schema({
  name: { type: String, required: true },
  timestamp: { type: String, required: true },
  applied: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const Migration = mongoose.model('Migration', migrationSchema);
// const url = `mongodb+srv://${MONGO_USER}:${MONGO_PASSWORD}@${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}?retryWrites=true&w=majority`;
// console.log(url, 'url');

// Connect to MongoDB
mongoose.connect(MONGODB_URI).then(() => {
  console.log('Connected to MongoDB11111');
}).catch(err => {
  console.error('Error connecting to MongoDB:', err);
});

// Helper function to create a new migration file with up and down methods
async function createMigrationFile(migrationName) {
  // Use the absolute path for the migration directory
  const migrationDir = path.join(__dirname, '../migrations'); // Directory where migration files will be saved
  const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14); // Generate a timestamp (e.g., 20231110123045)

  // Ensure the migration directory exists
  if (!fs.existsSync(migrationDir)) {
    fs.mkdirSync(migrationDir, { recursive: true });  // Ensure the parent directories are also created
  }

  const migrationFileName = `${timestamp}_${migrationName}.ts`;
  const migrationFilePath = path.join(migrationDir, migrationFileName);

  // Migration file template
  const migrationTemplate = `
module.exports = {
  up: async (mongoose:any) => {
    // Code to apply the migration
    // Example: await mongoose.connection.db.collection('users').updateMany({}, { $set: { age: 0 } });
  },
  down: async (mongoose:any) => {
    // Code to undo the migration
    // Example: await mongoose.connection.db.collection('users').updateMany({}, { $unset: { age: "" } });
  }
};
`;

  // Write the migration file
  fs.writeFileSync(migrationFilePath, migrationTemplate.trim());
  console.log(`Migration file created: ${migrationFilePath}`);

  // Save the migration metadata to the database
  const migration = new Migration({
    name: timestamp + '_' + migrationName,
    timestamp: new Date().toISOString(),
    applied: false
  });

  await migration.save();
  console.log(`Migration metadata saved to the database: ${migrationName}`);
}

// Check if a migration name was passed as an argument
const migrationName = process.argv[2];  // `process.argv[2]` will be the first argument after "node createMigration.js"

if (!migrationName) {
  console.error('Error: Migration name is required');
  process.exit(1);
}

// Create the migration file and save metadata
createMigrationFile(migrationName)
  .then(() => {
    mongoose.connection.close();  // Close MongoDB connection after the operation is done
  })
  .catch(err => {
    console.error('Error creating migration file:', err);
    mongoose.connection.close();
  });
