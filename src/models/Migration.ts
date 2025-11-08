
import mongoose, { Schema } from 'mongoose';

const migrationSchema = new Schema({
    name: { type: String, required: true },
    timestamp: { type: String, required: true },
    applied: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const migrations = mongoose.model('Migration', migrationSchema);
export default migrations;