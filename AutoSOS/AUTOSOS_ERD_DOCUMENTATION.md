# AutoSOS Database Entity Relationship Diagram (ERD)

## Overview
This document provides a comprehensive Entity Relationship Diagram for the AutoSOS motorcycle service application database, built on Supabase (PostgreSQL).

## Database Schema Summary

### Core Tables (12 Main Entities)

1. **profiles** - User profiles and authentication
2. **bookings** - Service requests and appointments
3. **wallet_transactions** - Financial transaction records
4. **wallet_topup_requests** - GCash topup requests
5. **facial_recognition_payments** - Face-based payment transactions
6. **face_embeddings** - Facial recognition data storage
7. **face_recognition_logs** - Recognition attempt tracking
8. **face_registration_logs** - Registration attempt tracking
9. **ml_models** - Machine learning model storage
10. **model_usage_logs** - ML model usage tracking
11. **models** - Legacy model storage (alternative to ml_models)
12. **mechanic_documents** - Mechanic verification documents

---

## Detailed Table Specifications

### 1. profiles
**Primary Key:** `user_id` (UUID)
**Purpose:** Central user management table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| user_id | UUID | PK, FK → auth.users(id) | User identifier |
| full_name | TEXT | | User's full name |
| role | user_role | NOT NULL, DEFAULT 'client' | User role (client/mechanic/admin) |
| approved | BOOLEAN | NOT NULL, DEFAULT false | Admin approval status |
| availability | availability_status | NOT NULL, DEFAULT 'not_available' | Mechanic availability |
| specialization | TEXT[] | DEFAULT '{}' | Mechanic specializations |
| latitude | DOUBLE PRECISION | | Current location latitude |
| longitude | DOUBLE PRECISION | | Current location longitude |
| avatar_url | TEXT | | Profile picture URL |
| wallet_balance | NUMERIC(10,2) | DEFAULT 0.00 | Current wallet balance |
| phone | TEXT | | Contact phone number |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Record creation time |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Last update time |

**Indexes:**
- `profiles_role_idx` on (role)
- `profiles_mechanic_filter_idx` on (approved, availability)

---

### 2. bookings
**Primary Key:** `id` (BIGSERIAL)
**Purpose:** Service request and appointment management

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGSERIAL | PK | Booking identifier |
| client_id | UUID | NOT NULL, FK → profiles(user_id) | Client requesting service |
| mechanic_id | UUID | FK → profiles(user_id) | Assigned mechanic |
| status | booking_status | NOT NULL, DEFAULT 'pending' | Booking status |
| required_specialization | TEXT | NOT NULL | Required service type |
| notes | TEXT | | Additional notes |
| latitude | DOUBLE PRECISION | NOT NULL | Service location latitude |
| longitude | DOUBLE PRECISION | NOT NULL | Service location longitude |
| mechanic_latitude | DOUBLE PRECISION | | Mechanic location at booking |
| mechanic_longitude | DOUBLE PRECISION | | Mechanic location at booking |
| client_latitude | DOUBLE PRECISION | | Client location at booking |
| client_longitude | DOUBLE PRECISION | | Client location at booking |
| mechanic_score | NUMERIC | | Mechanic rating |
| distance_km | NUMERIC | | Distance to service location |
| service_price | NUMERIC(10,2) | | Service cost |
| motorcycle_model | TEXT | | Client's motorcycle model |
| client_phone | TEXT | | Client contact number |
| payment_method | TEXT | | Payment method used |
| payment_status | TEXT | | Payment completion status |
| payment_completed_at | TIMESTAMPTZ | | Payment completion time |
| service_completed_at | TIMESTAMPTZ | | Service completion time |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Booking creation time |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Last update time |

**Indexes:**
- `bookings_client_idx` on (client_id)
- `bookings_status_idx` on (status)

---

### 3. wallet_transactions
**Primary Key:** `id` (BIGSERIAL)
**Purpose:** Financial transaction records

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGSERIAL | PK | Transaction identifier |
| user_id | UUID | NOT NULL, FK → profiles(user_id) | Transaction owner |
| transaction_type | transaction_type | NOT NULL | Type of transaction |
| amount | NUMERIC(10,2) | NOT NULL | Transaction amount |
| status | transaction_status | NOT NULL, DEFAULT 'pending' | Transaction status |
| payment_method | payment_method | | Payment method used |
| reference_number | TEXT | | Reference/booking ID |
| description | TEXT | | Transaction description |
| admin_notes | TEXT | | Admin notes |
| processed_by | UUID | FK → profiles(user_id) | Admin who processed |
| processed_at | TIMESTAMPTZ | | Processing time |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Transaction creation time |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Last update time |

**Indexes:**
- `wallet_transactions_user_id_idx` on (user_id)
- `wallet_transactions_status_idx` on (status)

---

### 4. wallet_topup_requests
**Primary Key:** `id` (BIGSERIAL)
**Purpose:** GCash topup request management

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGSERIAL | PK | Request identifier |
| user_id | UUID | NOT NULL, FK → profiles(user_id) | Requesting user |
| amount | NUMERIC(10,2) | NOT NULL | Topup amount |
| gcash_reference | TEXT | NOT NULL | GCash reference number |
| receipt_images | TEXT[] | | Array of receipt image URLs |
| verification_photo | TEXT | | User verification photo |
| status | transaction_status | NOT NULL, DEFAULT 'pending' | Request status |
| admin_notes | TEXT | | Admin processing notes |
| processed_by | UUID | FK → profiles(user_id) | Admin who processed |
| processed_at | TIMESTAMPTZ | | Processing time |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Request creation time |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Last update time |

**Indexes:**
- `wallet_topup_requests_user_id_idx` on (user_id)
- `wallet_topup_requests_status_idx` on (status)

---

### 5. facial_recognition_payments
**Primary Key:** `id` (BIGSERIAL)
**Purpose:** Face-based payment transactions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGSERIAL | PK | Payment identifier |
| booking_id | BIGINT | NOT NULL, FK → bookings(id) | Associated booking |
| client_id | UUID | NOT NULL, FK → profiles(user_id) | Paying client |
| mechanic_id | UUID | NOT NULL, FK → profiles(user_id) | Receiving mechanic |
| amount | NUMERIC(10,2) | NOT NULL | Payment amount |
| verification_photo | TEXT | | Face verification photo |
| facial_recognition_data | JSONB | | Recognition match data |
| status | transaction_status | NOT NULL, DEFAULT 'pending' | Payment status |
| processed_at | TIMESTAMPTZ | | Processing time |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Payment creation time |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Last update time |

**Indexes:**
- `facial_payments_booking_id_idx` on (booking_id)

---

### 6. face_embeddings
**Primary Key:** `id` (UUID)
**Purpose:** Facial recognition data storage

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Embedding identifier |
| user_id | TEXT | NOT NULL, UNIQUE | Associated user ID |
| user_name | TEXT | NOT NULL | User's name |
| face_embedding | BYTEA | NOT NULL | Face embedding binary data |
| face_image | BYTEA | | Original face image |
| embedding_dimension | INTEGER | NOT NULL, DEFAULT 128 | Embedding vector dimension |
| confidence_threshold | REAL | DEFAULT 0.6 | Recognition threshold |
| registered_at | TIMESTAMPTZ | DEFAULT now() | Registration time |
| last_updated | TIMESTAMPTZ | DEFAULT now() | Last update time |
| is_active | BOOLEAN | DEFAULT true | Active status |
| metadata | JSONB | DEFAULT '{}' | Additional metadata |

---

### 7. face_recognition_logs
**Primary Key:** `id` (UUID)
**Purpose:** Recognition attempt tracking

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Log identifier |
| user_id | TEXT | | Attempted user ID |
| recognition_attempted_at | TIMESTAMPTZ | DEFAULT now() | Attempt time |
| was_successful | BOOLEAN | NOT NULL | Success status |
| confidence_score | REAL | | Recognition confidence |
| similarity_score | REAL | | Similarity score |
| face_detected | BOOLEAN | DEFAULT false | Face detection status |
| error_message | TEXT | | Error details |
| ip_address | INET | | Client IP address |
| user_agent | TEXT | | Client user agent |
| metadata | JSONB | DEFAULT '{}' | Additional metadata |

---

### 8. face_registration_logs
**Primary Key:** `id` (UUID)
**Purpose:** Registration attempt tracking

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Log identifier |
| user_id | TEXT | NOT NULL | User ID |
| registration_attempted_at | TIMESTAMPTZ | DEFAULT now() | Attempt time |
| was_successful | BOOLEAN | NOT NULL | Success status |
| error_message | TEXT | | Error details |
| ip_address | INET | | Client IP address |
| user_agent | TEXT | | Client user agent |
| metadata | JSONB | DEFAULT '{}' | Additional metadata |

---

### 9. ml_models
**Primary Key:** `id` (BIGSERIAL)
**Purpose:** Machine learning model storage

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGSERIAL | PK | Model identifier |
| model_name | TEXT | NOT NULL | Model name |
| model_type | model_type | NOT NULL | Model type (yolov8/facenet/custom) |
| version | TEXT | NOT NULL | Model version |
| description | TEXT | | Model description |
| file_path | TEXT | NOT NULL | Storage file path |
| file_size | BIGINT | | File size in bytes |
| file_hash | TEXT | | SHA256 hash for integrity |
| model_config | JSONB | | Model configuration |
| performance_metrics | JSONB | | Performance data |
| status | model_status | NOT NULL, DEFAULT 'active' | Model status |
| is_default | BOOLEAN | NOT NULL, DEFAULT false | Default model flag |
| created_by | UUID | FK → profiles(user_id) | Creator |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Creation time |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Last update time |

**Constraints:**
- `unique_default_per_type` UNIQUE (model_type, is_default)

**Indexes:**
- `ml_models_type_status_idx` on (model_type, status)
- `ml_models_default_idx` on (model_type, is_default) WHERE is_default = true

---

### 10. model_usage_logs
**Primary Key:** `id` (BIGSERIAL)
**Purpose:** ML model usage tracking

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGSERIAL | PK | Log identifier |
| model_id | BIGINT | NOT NULL, FK → ml_models(id) | Model used |
| user_id | UUID | FK → profiles(user_id) | User who used model |
| inference_time_ms | INTEGER | | Inference time in milliseconds |
| input_size | TEXT | | Input dimensions |
| confidence_score | NUMERIC | | Average confidence score |
| success | BOOLEAN | NOT NULL, DEFAULT true | Success status |
| error_message | TEXT | | Error details |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Usage time |

**Indexes:**
- `model_usage_logs_model_id_idx` on (model_id)
- `model_usage_logs_created_at_idx` on (created_at)

---

### 11. models (Legacy)
**Primary Key:** `id` (SERIAL)
**Purpose:** Alternative model storage

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PK | Model identifier |
| name | VARCHAR(255) | NOT NULL | Model name |
| model_type | VARCHAR(100) | NOT NULL | Model type |
| version | VARCHAR(50) | | Model version |
| file_path | TEXT | NOT NULL | File storage path |
| file_size | BIGINT | | File size |
| created_at | TIMESTAMPTZ | | Creation time |
| updated_at | TIMESTAMPTZ | | Last update time |

---

### 12. mechanic_documents
**Primary Key:** `id` (BIGSERIAL)
**Purpose:** Mechanic verification documents

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGSERIAL | PK | Document identifier |
| user_id | UUID | NOT NULL, FK → profiles(user_id) | Mechanic user |
| doc_type | TEXT | NOT NULL | Document type |
| file_path | TEXT | NOT NULL | Storage file path |
| public_url | TEXT | | Public access URL |
| status | mechanic_doc_status | NOT NULL, DEFAULT 'submitted' | Document status |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Upload time |

**Indexes:**
- `mechanic_documents_user_idx` on (user_id)

---

## Custom Data Types (Enums)

### user_role
- `client` - Regular service requester
- `mechanic` - Service provider
- `admin` - System administrator

### booking_status
- `pending` - Awaiting mechanic assignment
- `matched` - Mechanic assigned
- `in_progress` - Service in progress
- `completed` - Service completed
- `cancelled` - Service cancelled

### availability_status
- `available` - Mechanic available for work
- `not_available` - Mechanic not available

### transaction_type
- `topup` - Wallet topup
- `payment` - Service payment
- `refund` - Payment refund
- `withdrawal` - Wallet withdrawal

### transaction_status
- `pending` - Awaiting processing
- `approved` - Approved by admin
- `rejected` - Rejected by admin
- `completed` - Successfully completed
- `failed` - Processing failed

### payment_method
- `gcash` - GCash payment
- `facial_recognition` - Face-based payment
- `bank_transfer` - Bank transfer
- `cash` - Cash payment

### model_type
- `yolov8` - YOLOv8 object detection
- `facenet` - FaceNet facial recognition
- `custom` - Custom model

### model_status
- `active` - Model is active
- `inactive` - Model is inactive
- `deprecated` - Model is deprecated
- `training` - Model is being trained

### mechanic_doc_status
- `submitted` - Document submitted
- `approved` - Document approved
- `rejected` - Document rejected

---

## Key Relationships

### One-to-Many Relationships

1. **profiles → bookings** (client_id)
   - One user can have many bookings as a client
   - One user can have many bookings as a mechanic

2. **bookings → facial_recognition_payments** (booking_id)
   - One booking can have one facial payment

3. **ml_models → model_usage_logs** (model_id)
   - One model can have many usage logs

4. **profiles → wallet_transactions** (user_id)
   - One user can have many wallet transactions

5. **profiles → wallet_topup_requests** (user_id)
   - One user can have many topup requests

6. **profiles → mechanic_documents** (user_id)
   - One mechanic can have many documents

### Foreign Key Constraints

- **profiles.user_id** → auth.users(id) ON DELETE CASCADE
- **bookings.client_id** → profiles(user_id) ON DELETE RESTRICT
- **bookings.mechanic_id** → profiles(user_id) ON DELETE SET NULL
- **facial_recognition_payments.booking_id** → bookings(id) ON DELETE CASCADE
- **model_usage_logs.model_id** → ml_models(id) ON DELETE CASCADE

---

## Storage Buckets

The application uses Supabase Storage with the following bucket structure:

### autosos bucket
- `avatars/<user_id>/` - User profile pictures
- `mechanic_docs/<user_id>/` - Mechanic verification documents
- `wallet_receipts/<user_id>/` - GCash receipt images
- `models/` - ML model files

---

## Security Features

### Row Level Security (RLS)
All tables have RLS enabled with appropriate policies:

- **User Data Access**: Users can only access their own data
- **Admin Access**: Admins can access all data
- **Public Access**: Limited public access for active models
- **Service Access**: System functions have appropriate permissions

### Key Security Functions
- `current_user_role()` - Returns current user's role
- `get_wallet_balance()` - Secure wallet balance retrieval
- `approve_wallet_topup()` - Admin-only topup approval
- `match_mechanics_for_booking()` - Mechanic matching logic

---

## Performance Optimizations

### Indexes
- Primary key indexes on all tables
- Foreign key indexes for join performance
- Status-based indexes for filtering
- Composite indexes for complex queries
- Partial indexes for specific conditions

### Triggers
- `set_updated_at()` - Automatically updates timestamp fields
- `handle_new_user()` - Creates profile on user registration

---

## Database Functions

### Core Functions
- `haversine_km()` - Distance calculation between coordinates
- `match_mechanics_for_booking()` - Mechanic assignment logic
- `get_wallet_balance()` - Wallet balance retrieval
- `get_wallet_transactions()` - Transaction history
- `approve_wallet_topup()` - Admin topup approval
- `reject_wallet_topup()` - Admin topup rejection

---

This ERD represents a comprehensive motorcycle service platform with advanced features including facial recognition payments, ML-powered diagnostics, real-time location tracking, and secure financial transactions.
