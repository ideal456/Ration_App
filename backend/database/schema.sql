-- ============================================
-- Simple Database Schema for Ration Card System
-- ============================================

CREATE TABLE IF NOT EXISTS ration_cards (
    id SERIAL PRIMARY KEY,
    card_number VARCHAR(50) NOT NULL,
    holder_name VARCHAR(255) NOT NULL,
    members INTEGER NOT NULL,
    card_type VARCHAR(10) NOT NULL,
    received BOOLEAN DEFAULT FALSE,
    finger_scanned BOOLEAN DEFAULT FALSE,
    distribution_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE ration_cards ADD COLUMN IF NOT EXISTS distribution_date TIMESTAMP;

-- Drop the old unique constraint on card_number
ALTER TABLE ration_cards DROP CONSTRAINT IF EXISTS ration_cards_card_number_key;

-- Drop unique_card_holder if it exists to allow re-creation without error
ALTER TABLE ration_cards DROP CONSTRAINT IF EXISTS unique_card_holder;

-- Add new composite unique constraint
ALTER TABLE ration_cards ADD CONSTRAINT unique_card_holder UNIQUE (card_number, holder_name);