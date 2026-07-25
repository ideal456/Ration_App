const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const parseAllRationData = require('../parseData');

// Check if DATABASE_URL is present (e.g. on Render), otherwise use local config variables
const connectionConfig = process.env.DATABASE_URL 
    ? { 
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      }
    : {
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'ration_db',
        password: process.env.DB_PASSWORD || 'postgres',
        port: parseInt(process.env.DB_PORT || '5432', 10),
      };

const client = new Client(connectionConfig);

async function seedDatabase() {
    try {
        await client.connect();
        console.log("✅ Connected to PostgreSQL successfully!");

        // 1. Get all the parsed ration cards from the HTML data files
        const cards = parseAllRationData();
        console.log(`📋 Found ${cards.length} cards in HTML data files.`);

        if (!Array.isArray(cards)) {
            throw new Error("Parsed data is not an array!");
        }

        console.log("⚡ Starting database insertion...");
        let insertedCount = 0;

        // 2. Loop through every card object one by one
        for (const card of cards) {
            // We define our SQL query with placeholders ($1, $2, etc.) for safety
            const queryText = `
                INSERT INTO ration_cards (card_number, holder_name, members, card_type, received, finger_scanned)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (card_number, holder_name) DO NOTHING;
            `;

            // These are the actual values that match the placeholders in order
            const queryValues = [
                card.number,         // matches $1 (card_number)
                card.name,           // matches $2 (holder_name)
                card.members,        // matches $3 (members)
                card.type,           // matches $4 (card_type)
                card.received,       // matches $5 (received)
                card.fingerScanned   // matches $6 (finger_scanned)
            ];

            // 3. Execute the query
            const result = await client.query(queryText, queryValues);

            // If a row was successfully inserted, result.rowCount will be 1.
            // If it was a duplicate, ON CONFLICT kicked in, and result.rowCount will be 0.
            if (result.rowCount > 0) {
                insertedCount++;
            }
        }

        console.log(`🎉 Seeding complete! Added ${insertedCount} new cards to the database.`);

    } catch (error) {
        console.error("❌ Error during database seeding:", error);
    } finally {
        await client.end();
        console.log("🔌 Database connection closed.");
    }
}

seedDatabase();