-- ============================================
-- Simple Database Schema for Ration Card System
-- ============================================

CREATE TABLE IF NOT EXISTS ration_cards (
    id SERIAL PRIMARY KEY,
    card_number VARCHAR(50) UNIQUE NOT NULL,
    holder_name VARCHAR(255) NOT NULL,
    members INTEGER NOT NULL,
    card_type VARCHAR(10) NOT NULL,
    received BOOLEAN DEFAULT FALSE,
    finger_scanned BOOLEAN DEFAULT FALSE,
    distribution_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE ration_cards ADD COLUMN IF NOT EXISTS distribution_date TIMESTAMP;