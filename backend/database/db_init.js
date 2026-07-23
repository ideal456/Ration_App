const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function initDatabase() {
    console.log('🔄 Initializing database schema...');

    // Configuration fallback list
    const connectionConfig = process.env.DATABASE_URL 
        ? { connectionString: process.env.DATABASE_URL }
        : {
            user: process.env.DB_USER || process.env.PGUSER || 'postgres',
            host: process.env.DB_HOST || process.env.PGHOST || 'localhost',
            database: process.env.DB_NAME || process.env.PGDATABASE || 'ration_db',
            password: process.env.DB_PASSWORD || process.env.PGPASSWORD || 'postgres',
            port: parseInt(process.env.DB_PORT || process.env.PGPORT || '5432', 10),
          };

    console.log(`📡 Connecting to database: ${connectionConfig.connectionString ? 'via DATABASE_URL' : `${connectionConfig.host}:${connectionConfig.port}/${connectionConfig.database}`}`);
    
    const client = new Client(connectionConfig);

    try {
        await client.connect();
        console.log('✅ Connected to PostgreSQL database.');

        const schemaPath = path.join(__dirname, 'schema.sql');
        if (!fs.existsSync(schemaPath)) {
            throw new Error(`schema.sql not found at ${schemaPath}`);
        }

        console.log('📂 Reading schema.sql...');
        const sqlSchema = fs.readFileSync(schemaPath, 'utf8');

        console.log('⚡ Executing SQL statements...');
        await client.query(sqlSchema);
        console.log('🎉 Database schema initialized and seeded successfully!');

    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        process.exit(1);
    } finally {
        await client.end();
        console.log('🔌 Disconnected from database.');
    }
}

// Execute if run directly
if (require.main === module) {
    initDatabase();
}

module.exports = initDatabase;
