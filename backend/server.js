const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const initDatabase = require('./database/db_init');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Database connection configuration
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

const pool = new Pool(connectionConfig);

app.get('/api/status', (req, res) => {
    res.json({
        status: "success",
        message: "Backend server is up and running!"
    });
});

// Fetch all ration cards from the database
app.get('/api/ration-cards', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM ration_cards ORDER BY id ASC');
        
        // Map database columns to the format the frontend expects
        const cards = result.rows.map(row => ({
            id: row.id,
            number: row.card_number,
            name: row.holder_name,
            members: row.members,
            type: row.card_type,
            received: row.received,
            fingerScanned: row.finger_scanned,
            distributionDate: row.distribution_date
        }));
        
        res.json(cards);
    } catch (err) {
        console.error("Error fetching ration cards:", err);
        res.status(500).json({ error: "Failed to fetch ration cards from database." });
    }
});

// Update status of a specific ration card
app.put('/api/ration-cards/:id', async (req, res) => {
    const { id } = req.params;
    const { received, fingerScanned, distributionDate } = req.body;
    
    try {
        const queryText = `
            UPDATE ration_cards 
            SET received = $1, finger_scanned = $2, distribution_date = $3
            WHERE id = $4
            RETURNING *;
        `;
        const values = [received, fingerScanned, distributionDate, parseInt(id, 10)];
        const result = await pool.query(queryText, values);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Ration card not found." });
        }
        
        const updatedRow = result.rows[0];
        res.json({
            message: "Status updated successfully!",
            card: {
                id: updatedRow.id,
                number: updatedRow.card_number,
                name: updatedRow.holder_name,
                members: updatedRow.members,
                type: updatedRow.card_type,
                received: updatedRow.received,
                fingerScanned: updatedRow.finger_scanned,
                distributionDate: updatedRow.distribution_date
            }
        });
    } catch (err) {
        console.error("Error updating ration card:", err);
        res.status(500).json({ error: "Failed to update ration card." });
    }
});

// Reset status for all ration cards
app.post('/api/ration-cards/reset', async (req, res) => {
    try {
        const queryText = `
            UPDATE ration_cards 
            SET received = FALSE, finger_scanned = FALSE, distribution_date = NULL;
        `;
        await pool.query(queryText);
        res.json({ message: "All statuses reset successfully!" });
    } catch (err) {
        console.error("Error resetting ration cards:", err);
        res.status(500).json({ error: "Failed to reset ration cards." });
    }
});

initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Database initialization failed:", err);
    process.exit(1);
  });