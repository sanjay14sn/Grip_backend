const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
// const dotenv = require('dotenv');
// dotenv.config();

// const {
//     MONGODB_URI // Assuming you have this variable set in .env
// } = process.env;

// Connect to MongoDB
// const connectDB = async () => { // Specify return type
//     try {

//         await mongoose.connect(MONGODB_URI);
//         console.log('DB Connected11111');
//     } catch (err) {
//         console.error('DB Connection Error:', err);
//     }
// };

// Define the Migration Model (if not already defined)
const migrationSchema = new mongoose.Schema({
    name: { type: String, required: true },
    timestamp: { type: String, required: true },
    applied: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const MigrationModel = mongoose.model('Migration', migrationSchema);

// Directory containing migration files
const migrationsDir = path.join(__dirname, '../migrations');  // Adjust path

// Apply migrations
async function applyMigrations() {
    // try {
    // Read files from the migrations folder
    const migrationFiles = fs.readdirSync(migrationsDir);

    // Get applied migrations from the "migrations" collection
    const appliedMigrations = await MigrationModel.find();
    const appliedNames = appliedMigrations.map(m => m.name);  // Get names of already applied migrations

    // Loop through each migration file
    for (const file of migrationFiles) {

        const migrationPath = path.join(migrationsDir, file);
        const migrationName = path.basename(file, '.ts');  // Get the migration name (without extension)
        const result = await MigrationModel.findOne({ applied: false });

        // Skip migrations that have already been applied
        if (appliedNames.includes(migrationName) && !result) {
            console.log(`Skipping migration ${migrationName} (already applied)`);
            continue;
        }
        // Import the migration file (require will import .js files)
        const migration = require(migrationPath);
        try {
            // Run the 'up' method of the migration
            console.log(`Applying migration: ${migrationName}`);
            await migration.up(mongoose);

            // Mark migration as applied in the database
            const newMigration = new MigrationModel({
                name: migrationName,
                timestamp: new Date().toISOString(),
                applied: true,
            });

            if (result) {
                result.applied = true;
                await result.save();
            } else {
                await newMigration.save();
            }

            console.log(`Migration ${migrationName} applied successfully..`);
        } catch (error) {
            console.error(`Failed to apply migration ${migrationName}:`, error);
        }
    }

    // Close MongoDB connection after applying migrations
    await mongoose.connection.close();
    console.log('All migrations applied.');
}

// Connect to MongoDB and apply migrations
// connectDB().then(() => {
//     applyMigrations();
// });
// connectDB();
module.exports = applyMigrations;