-- Database Schema for Village Ration Management System

-- 1. Admins Table (For store distributors / village admins)
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) DEFAULT 'village_admin' NOT NULL CHECK (role IN ('village_admin', 'distributor', 'super_admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Families Table (Corresponds to Head of Family metadata)
CREATE TABLE IF NOT EXISTS families (
    id SERIAL PRIMARY KEY,
    head_name VARCHAR(255) NOT NULL,              -- Head of Family (धारक का नाम)
    father_husband_name VARCHAR(255),             -- Father or Husband's name (पिता/पति का नाम)
    mother_name VARCHAR(255),                     -- Mother's name (माता का नाम)
    address TEXT,                                 -- Residential Address
    phone VARCHAR(15),                            -- Contact Number
    card_type VARCHAR(10) NOT NULL CHECK (card_type IN ('APL', 'BPL', 'AAY', 'PHH')), -- Card Type
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Ration Cards Table (1-to-1 link with Family)
CREATE TABLE IF NOT EXISTS ration_cards (
    id SERIAL PRIMARY KEY,
    card_no VARCHAR(50) UNIQUE NOT NULL,          -- Unique Digitized Ration Card Number (डिजिटाइज्ड राशन कार्ड संख्या)
    status VARCHAR(15) DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'inactive')),
    family_id INTEGER UNIQUE NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    issue_date DATE,                              -- Issue Date (राशन कार्ड जारी करने की तिथि)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Members Table (1 Family -> Many Members)
CREATE TABLE IF NOT EXISTS members (
    id SERIAL PRIMARY KEY,
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,                   -- Member Name
    age INTEGER NOT NULL CHECK (age >= 0),        -- Age
    relation_to_head VARCHAR(100) NOT NULL,       -- Relation to head of family (e.g., Self, Wife, Son, Daughter)
    aadhaar_no VARCHAR(20) UNIQUE,                -- Masked Aadhaar Number (e.g., XXXX-XXXX-1234)
    fingerprint_verified BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Stock Items Table (Inventory management)
CREATE TABLE IF NOT EXISTS stock_items (
    id SERIAL PRIMARY KEY,
    item_name VARCHAR(100) UNIQUE NOT NULL,       -- Wheat, Rice, Sugar, Kerosene, etc.
    unit VARCHAR(20) NOT NULL CHECK (unit IN ('kg', 'litre', 'packet')), -- Standard units
    current_quantity NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (current_quantity >= 0.00)
);

-- 6. Distribution Transactions Table (Records each transaction)
CREATE TABLE IF NOT EXISTS distribution_transactions (
    id SERIAL PRIMARY KEY,
    card_id INTEGER NOT NULL REFERENCES ration_cards(id),
    member_id INTEGER NOT NULL REFERENCES members(id), -- The family member who authenticated/received the ration
    item_id INTEGER NOT NULL REFERENCES stock_items(id),
    quantity NUMERIC(10, 2) NOT NULL CHECK (quantity > 0.00),
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    distributor_name VARCHAR(255) NOT NULL,       -- Admin or dealer distributing the ration
    shop_name VARCHAR(255) NOT NULL               -- Name of the FPS (Fair Price Shop)
);

-- --- Indexes ---
-- Index on Ration Card number for fast search queries
CREATE INDEX IF NOT EXISTS idx_ration_cards_card_no ON ration_cards(card_no);

-- Index on Aadhaar number for checking member identities and biometric matches
CREATE INDEX IF NOT EXISTS idx_members_aadhaar_no ON members(aadhaar_no);


-- --- Seed Data ---

-- Family 1: AAY (Antyodaya Card - Most Vulnerable)
-- Head: Surasati (सुरसती), Father: Bhola (भोला), Card Number: 21XXXXXX0054
INSERT INTO families (id, head_name, father_husband_name, mother_name, address, phone, card_type)
VALUES (1, 'सुरसती', 'भोला', 'समुनरी', 'Ward 5, Kurhapar, Azamgarh, UP', '9876543210', 'AAY')
ON CONFLICT (id) DO NOTHING;

INSERT INTO ration_cards (id, card_no, status, family_id, issue_date)
VALUES (1, '21XXXXXX0054', 'active', 1, '2026-03-17')
ON CONFLICT (id) DO NOTHING;

INSERT INTO members (id, family_id, name, age, relation_to_head, aadhaar_no, fingerprint_verified)
VALUES 
(1, 1, 'सुरसती', 62, 'Self', 'XXXX-XXXX-8841', true),
(2, 1, 'राम औतार', 38, 'Son', 'XXXX-XXXX-8842', false),
(3, 1, 'पूजा', 32, 'Daughter-in-law', 'XXXX-XXXX-8843', true)
ON CONFLICT (id) DO NOTHING;


-- Family 2: PHH (Patra Grihasthi - Priority Household)
-- Head: Nisha Yadav (निशा यादव), Husband: Bhanu Pratap Yadav (भानु प्रताप यादव), Card Number: 21XXXXXX0013
INSERT INTO families (id, head_name, father_husband_name, mother_name, address, phone, card_type)
VALUES (2, 'निशा यादव', 'भानु प्रताप यादव', 'फूलमती देवी', 'Ward 2, Kurhapar, Azamgarh, UP', '9876543211', 'PHH')
ON CONFLICT (id) DO NOTHING;

INSERT INTO ration_cards (id, card_no, status, family_id, issue_date)
VALUES (2, '21XXXXXX0013', 'active', 2, '2025-04-19')
ON CONFLICT (id) DO NOTHING;

INSERT INTO members (id, family_id, name, age, relation_to_head, aadhaar_no, fingerprint_verified)
VALUES 
(4, 2, 'निशा यादव', 42, 'Self', 'XXXX-XXXX-1301', true),
(5, 2, 'भानु प्रताप यादव', 46, 'Husband', 'XXXX-XXXX-1302', true),
(6, 2, 'अभिषेक यादव', 18, 'Son', 'XXXX-XXXX-1303', false)
ON CONFLICT (id) DO NOTHING;


-- Family 3: BPL Cardholder
-- Head: Savita Devi (सविता देवी), Husband: Shobhnath (शोभनाथ), Card Number: 21XXXXXX0274
INSERT INTO families (id, head_name, father_husband_name, mother_name, address, phone, card_type)
VALUES (3, 'सविता देवी', 'शोभनाथ', 'फुल्वासी देवी', 'Ward 3, Kurhapar, Azamgarh, UP', '9876543212', 'BPL')
ON CONFLICT (id) DO NOTHING;

INSERT INTO ration_cards (id, card_no, status, family_id, issue_date)
VALUES (3, '21XXXXXX0274', 'active', 3, '2022-07-13')
ON CONFLICT (id) DO NOTHING;

INSERT INTO members (id, family_id, name, age, relation_to_head, aadhaar_no, fingerprint_verified)
VALUES 
(7, 3, 'सविता देवी', 35, 'Self', 'XXXX-XXXX-2741', true),
(8, 3, 'शोभनाथ', 39, 'Husband', 'XXXX-XXXX-2742', false),
(9, 3, 'अमन', 12, 'Son', 'XXXX-XXXX-2743', false)
ON CONFLICT (id) DO NOTHING;


-- Stock Items
INSERT INTO stock_items (id, item_name, unit, current_quantity)
VALUES 
(1, 'Wheat (गेहूं)', 'kg', 1200.00),
(2, 'Rice (चावल)', 'kg', 1800.00),
(3, 'Sugar (चीनी)', 'kg', 250.00)
ON CONFLICT (id) DO NOTHING;


-- Admins
INSERT INTO admins (id, username, password_hash, role)
VALUES (1, 'mamta_admin', '$2b$10$w3e9f4hN8g9F/V8sN8eG6OyG1Z.1aZ6b6v6D6e6E6g6G6h6H6i6I6', 'village_admin')
ON CONFLICT (id) DO NOTHING;
