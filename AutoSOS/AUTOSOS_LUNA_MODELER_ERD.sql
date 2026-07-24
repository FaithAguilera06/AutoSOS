-- =====================================================
-- AutoSOS Database ERD for Luna Modeler
-- =====================================================
-- This script creates the complete database schema with all relationships
-- Copy and paste this into Luna Modeler to generate the ERD

-- =====================================================
-- 1. CREATE ENUMS (Custom Data Types)
-- =====================================================

-- User roles
CREATE TYPE user_role AS ENUM ('client', 'mechanic', 'admin');

-- Booking status
CREATE TYPE booking_status AS ENUM ('pending', 'matched', 'in_progress', 'completed', 'cancelled');

-- Availability status
CREATE TYPE availability_status AS ENUM ('available', 'not_available');

-- Transaction types
CREATE TYPE transaction_type AS ENUM ('topup', 'payment', 'refund', 'withdrawal');

-- Transaction status
CREATE TYPE transaction_status AS ENUM ('pending', 'approved', 'rejected', 'completed', 'failed');

-- Payment methods
CREATE TYPE payment_method AS ENUM ('gcash', 'facial_recognition', 'bank_transfer', 'cash');

-- Model types
CREATE TYPE model_type AS ENUM ('yolov8', 'facenet', 'custom');

-- Model status
CREATE TYPE model_status AS ENUM ('active', 'inactive', 'deprecated', 'training');

-- Mechanic document status
CREATE TYPE mechanic_doc_status AS ENUM ('submitted', 'approved', 'rejected');

-- =====================================================
-- 2. CREATE TABLES WITH RELATIONSHIPS
-- =====================================================

-- =====================================================
-- PROFILES TABLE (Central User Management)
-- =====================================================
CREATE TABLE profiles (
    user_id UUID PRIMARY KEY,
    full_name TEXT,
    role user_role NOT NULL DEFAULT 'client',
    approved BOOLEAN NOT NULL DEFAULT false,
    availability availability_status NOT NULL DEFAULT 'not_available',
    specialization TEXT[] DEFAULT '{}',
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    avatar_url TEXT,
    wallet_balance NUMERIC(10,2) DEFAULT 0.00,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- BOOKINGS TABLE (Service Requests)
-- =====================================================
CREATE TABLE bookings (
    id BIGSERIAL PRIMARY KEY,
    client_id UUID NOT NULL,
    mechanic_id UUID,
    status booking_status NOT NULL DEFAULT 'pending',
    required_specialization TEXT NOT NULL,
    notes TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    mechanic_latitude DOUBLE PRECISION,
    mechanic_longitude DOUBLE PRECISION,
    client_latitude DOUBLE PRECISION,
    client_longitude DOUBLE PRECISION,
    mechanic_score NUMERIC,
    distance_km NUMERIC,
    service_price NUMERIC(10,2),
    motorcycle_model TEXT,
    client_phone TEXT,
    payment_method TEXT,
    payment_status TEXT,
    payment_completed_at TIMESTAMPTZ,
    service_completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- FOREIGN KEY RELATIONSHIPS
    CONSTRAINT fk_bookings_client FOREIGN KEY (client_id) REFERENCES profiles(user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_bookings_mechanic FOREIGN KEY (mechanic_id) REFERENCES profiles(user_id) ON DELETE SET NULL
);

-- =====================================================
-- WALLET_TRANSACTIONS TABLE (Financial Records)
-- =====================================================
CREATE TABLE wallet_transactions (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    transaction_type transaction_type NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    status transaction_status NOT NULL DEFAULT 'pending',
    payment_method payment_method,
    reference_number TEXT,
    description TEXT,
    admin_notes TEXT,
    processed_by UUID,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- FOREIGN KEY RELATIONSHIPS
    CONSTRAINT fk_wallet_transactions_user FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_wallet_transactions_processed_by FOREIGN KEY (processed_by) REFERENCES profiles(user_id) ON DELETE SET NULL
);

-- =====================================================
-- WALLET_TOPUP_REQUESTS TABLE (GCash Topups)
-- =====================================================
CREATE TABLE wallet_topup_requests (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    gcash_reference TEXT NOT NULL,
    receipt_images TEXT[],
    verification_photo TEXT,
    status transaction_status NOT NULL DEFAULT 'pending',
    admin_notes TEXT,
    processed_by UUID,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- FOREIGN KEY RELATIONSHIPS
    CONSTRAINT fk_wallet_topup_requests_user FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_wallet_topup_requests_processed_by FOREIGN KEY (processed_by) REFERENCES profiles(user_id) ON DELETE SET NULL
);

-- =====================================================
-- FACIAL_RECOGNITION_PAYMENTS TABLE (Face Payments)
-- =====================================================
CREATE TABLE facial_recognition_payments (
    id BIGSERIAL PRIMARY KEY,
    booking_id BIGINT NOT NULL,
    client_id UUID NOT NULL,
    mechanic_id UUID NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    verification_photo TEXT,
    facial_recognition_data JSONB,
    status transaction_status NOT NULL DEFAULT 'pending',
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- FOREIGN KEY RELATIONSHIPS
    CONSTRAINT fk_facial_payments_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    CONSTRAINT fk_facial_payments_client FOREIGN KEY (client_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_facial_payments_mechanic FOREIGN KEY (mechanic_id) REFERENCES profiles(user_id) ON DELETE CASCADE
);

-- =====================================================
-- FACE_EMBEDDINGS TABLE (Facial Recognition Data)
-- =====================================================
CREATE TABLE face_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL UNIQUE,
    user_name TEXT NOT NULL,
    face_embedding BYTEA NOT NULL,
    face_image BYTEA,
    embedding_dimension INTEGER NOT NULL DEFAULT 128,
    confidence_threshold REAL DEFAULT 0.6,
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- =====================================================
-- FACE_RECOGNITION_LOGS TABLE (Recognition Tracking)
-- =====================================================
CREATE TABLE face_recognition_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT,
    recognition_attempted_at TIMESTAMPTZ DEFAULT NOW(),
    was_successful BOOLEAN NOT NULL,
    confidence_score REAL,
    similarity_score REAL,
    face_detected BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- =====================================================
-- FACE_REGISTRATION_LOGS TABLE (Registration Tracking)
-- =====================================================
CREATE TABLE face_registration_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    registration_attempted_at TIMESTAMPTZ DEFAULT NOW(),
    was_successful BOOLEAN NOT NULL,
    error_message TEXT,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- =====================================================
-- ML_MODELS TABLE (Machine Learning Models)
-- =====================================================
CREATE TABLE ml_models (
    id BIGSERIAL PRIMARY KEY,
    model_name TEXT NOT NULL,
    model_type model_type NOT NULL,
    version TEXT NOT NULL,
    description TEXT,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    file_hash TEXT,
    model_config JSONB,
    performance_metrics JSONB,
    status model_status NOT NULL DEFAULT 'active',
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- FOREIGN KEY RELATIONSHIPS
    CONSTRAINT fk_ml_models_created_by FOREIGN KEY (created_by) REFERENCES profiles(user_id) ON DELETE SET NULL,
    
    -- CONSTRAINTS
    CONSTRAINT unique_default_per_type UNIQUE (model_type, is_default)
);

-- =====================================================
-- MODEL_USAGE_LOGS TABLE (ML Usage Tracking)
-- =====================================================
CREATE TABLE model_usage_logs (
    id BIGSERIAL PRIMARY KEY,
    model_id BIGINT NOT NULL,
    user_id UUID,
    inference_time_ms INTEGER,
    input_size TEXT,
    confidence_score NUMERIC,
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- FOREIGN KEY RELATIONSHIPS
    CONSTRAINT fk_model_usage_logs_model FOREIGN KEY (model_id) REFERENCES ml_models(id) ON DELETE CASCADE,
    CONSTRAINT fk_model_usage_logs_user FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE SET NULL
);

-- =====================================================
-- MODELS TABLE (Legacy Model Storage)
-- =====================================================
CREATE TABLE models (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    model_type VARCHAR(100) NOT NULL,
    version VARCHAR(50),
    file_path TEXT NOT NULL,
    file_size BIGINT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);

-- =====================================================
-- MECHANIC_DOCUMENTS TABLE (Verification Documents)
-- =====================================================
CREATE TABLE mechanic_documents (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    doc_type TEXT NOT NULL,
    file_path TEXT NOT NULL,
    public_url TEXT,
    status mechanic_doc_status NOT NULL DEFAULT 'submitted',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- FOREIGN KEY RELATIONSHIPS
    CONSTRAINT fk_mechanic_documents_user FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE
);

-- =====================================================
-- ADMIN_GCASH_SETTINGS TABLE (GCash Configuration)
-- =====================================================
CREATE TABLE admin_gcash_settings (
    id BIGSERIAL PRIMARY KEY,
    account_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    qr_code_image TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Profiles indexes
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_mechanic_filter ON profiles(approved, availability);

-- Bookings indexes
CREATE INDEX idx_bookings_client ON bookings(client_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_mechanic ON bookings(mechanic_id);

-- Wallet transactions indexes
CREATE INDEX idx_wallet_transactions_user ON wallet_transactions(user_id);
CREATE INDEX idx_wallet_transactions_status ON wallet_transactions(status);

-- Wallet topup requests indexes
CREATE INDEX idx_wallet_topup_requests_user ON wallet_topup_requests(user_id);
CREATE INDEX idx_wallet_topup_requests_status ON wallet_topup_requests(status);

-- Facial payments indexes
CREATE INDEX idx_facial_payments_booking ON facial_recognition_payments(booking_id);
CREATE INDEX idx_facial_payments_client ON facial_recognition_payments(client_id);
CREATE INDEX idx_facial_payments_mechanic ON facial_recognition_payments(mechanic_id);

-- Face embeddings indexes
CREATE INDEX idx_face_embeddings_user_id ON face_embeddings(user_id);
CREATE INDEX idx_face_embeddings_active ON face_embeddings(is_active);

-- Face recognition logs indexes
CREATE INDEX idx_face_recognition_logs_user ON face_recognition_logs(user_id);
CREATE INDEX idx_face_recognition_logs_created_at ON face_recognition_logs(recognition_attempted_at);

-- Face registration logs indexes
CREATE INDEX idx_face_registration_logs_user ON face_registration_logs(user_id);
CREATE INDEX idx_face_registration_logs_created_at ON face_registration_logs(registration_attempted_at);

-- ML models indexes
CREATE INDEX idx_ml_models_type_status ON ml_models(model_type, status);
CREATE INDEX idx_ml_models_default ON ml_models(model_type, is_default) WHERE is_default = true;

-- Model usage logs indexes
CREATE INDEX idx_model_usage_logs_model ON model_usage_logs(model_id);
CREATE INDEX idx_model_usage_logs_created_at ON model_usage_logs(created_at);

-- Models indexes
CREATE INDEX idx_models_type ON models(model_type);

-- Mechanic documents indexes
CREATE INDEX idx_mechanic_documents_user ON mechanic_documents(user_id);
CREATE INDEX idx_mechanic_documents_status ON mechanic_documents(status);

-- =====================================================
-- 4. RELATIONSHIP SUMMARY FOR LUNA MODELER
-- =====================================================

/*
RELATIONSHIPS TO VISUALIZE IN LUNA MODELER:

1. ONE-TO-MANY RELATIONSHIPS:
   - profiles (1) → bookings (many) [client_id]
   - profiles (1) → bookings (many) [mechanic_id]
   - profiles (1) → wallet_transactions (many) [user_id]
   - profiles (1) → wallet_topup_requests (many) [user_id]
   - profiles (1) → facial_recognition_payments (many) [client_id]
   - profiles (1) → facial_recognition_payments (many) [mechanic_id]
   - profiles (1) → ml_models (many) [created_by]
   - profiles (1) → model_usage_logs (many) [user_id]
   - profiles (1) → mechanic_documents (many) [user_id]
   - profiles (1) → wallet_transactions (many) [processed_by]
   - profiles (1) → wallet_topup_requests (many) [processed_by]
   - bookings (1) → facial_recognition_payments (many) [booking_id]
   - ml_models (1) → model_usage_logs (many) [model_id]

2. PRIMARY KEYS (PK):
   - profiles: user_id (UUID)
   - bookings: id (BIGSERIAL)
   - wallet_transactions: id (BIGSERIAL)
   - wallet_topup_requests: id (BIGSERIAL)
   - facial_recognition_payments: id (BIGSERIAL)
   - face_embeddings: id (UUID)
   - face_recognition_logs: id (UUID)
   - face_registration_logs: id (UUID)
   - ml_models: id (BIGSERIAL)
   - model_usage_logs: id (BIGSERIAL)
   - models: id (SERIAL)
   - mechanic_documents: id (BIGSERIAL)
   - admin_gcash_settings: id (BIGSERIAL)

3. FOREIGN KEYS (FK):
   - All foreign key relationships are defined above with CONSTRAINT statements
   - Use these to draw connecting lines in Luna Modeler

4. CARDINALITY:
   - 1:1 relationships: None (all are 1:many or many:1)
   - 1:Many relationships: All relationships listed above
   - Many:Many relationships: None (would require junction tables)

5. VISUAL CONNECTIONS:
   - Draw lines from PK to FK
   - Use crow's foot notation for "many" side
   - Use single line for "one" side
   - Label relationships with descriptive names
*/
