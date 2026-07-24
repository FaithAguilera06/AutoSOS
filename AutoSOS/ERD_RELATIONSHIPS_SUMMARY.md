# AutoSOS ERD Relationships Summary

## Quick Reference for Luna Modeler

### Core Tables and Their Relationships

#### 1. PROFILES (Central Hub)
**Primary Key:** `user_id` (UUID)

**Connects TO:**
- `bookings.client_id` (1:Many) - "Client makes bookings"
- `bookings.mechanic_id` (1:Many) - "Mechanic handles bookings"
- `wallet_transactions.user_id` (1:Many) - "User has transactions"
- `wallet_topup_requests.user_id` (1:Many) - "User requests topups"
- `facial_recognition_payments.client_id` (1:Many) - "Client makes payments"
- `facial_recognition_payments.mechanic_id` (1:Many) - "Mechanic receives payments"
- `ml_models.created_by` (1:Many) - "User creates models"
- `model_usage_logs.user_id` (1:Many) - "User uses models"
- `mechanic_documents.user_id` (1:Many) - "Mechanic uploads documents"
- `wallet_transactions.processed_by` (1:Many) - "Admin processes transactions"
- `wallet_topup_requests.processed_by` (1:Many) - "Admin processes topups"

#### 2. BOOKINGS (Service Requests)
**Primary Key:** `id` (BIGSERIAL)

**Connects TO:**
- `facial_recognition_payments.booking_id` (1:1) - "Booking has payment"

**Connects FROM:**
- `profiles.user_id` → `bookings.client_id` (Many:1)
- `profiles.user_id` → `bookings.mechanic_id` (Many:1)

#### 3. WALLET_TRANSACTIONS (Financial Records)
**Primary Key:** `id` (BIGSERIAL)

**Connects FROM:**
- `profiles.user_id` → `wallet_transactions.user_id` (Many:1)
- `profiles.user_id` → `wallet_transactions.processed_by` (Many:1)

#### 4. WALLET_TOPUP_REQUESTS (GCash Topups)
**Primary Key:** `id` (BIGSERIAL)

**Connects FROM:**
- `profiles.user_id` → `wallet_topup_requests.user_id` (Many:1)
- `profiles.user_id` → `wallet_topup_requests.processed_by` (Many:1)

#### 5. FACIAL_RECOGNITION_PAYMENTS (Face Payments)
**Primary Key:** `id` (BIGSERIAL)

**Connects TO:**
- `bookings.id` → `facial_recognition_payments.booking_id` (1:1)

**Connects FROM:**
- `profiles.user_id` → `facial_recognition_payments.client_id` (Many:1)
- `profiles.user_id` → `facial_recognition_payments.mechanic_id` (Many:1)

#### 6. ML_MODELS (Machine Learning Models)
**Primary Key:** `id` (BIGSERIAL)

**Connects TO:**
- `model_usage_logs.model_id` (1:Many) - "Model is used"

**Connects FROM:**
- `profiles.user_id` → `ml_models.created_by` (Many:1)

#### 7. MODEL_USAGE_LOGS (ML Usage Tracking)
**Primary Key:** `id` (BIGSERIAL)

**Connects FROM:**
- `ml_models.id` → `model_usage_logs.model_id` (Many:1)
- `profiles.user_id` → `model_usage_logs.user_id` (Many:1)

#### 8. FACE_EMBEDDINGS (Facial Recognition Data)
**Primary Key:** `id` (UUID)
**No direct foreign key relationships** (standalone table)

#### 9. FACE_RECOGNITION_LOGS (Recognition Tracking)
**Primary Key:** `id` (UUID)
**No direct foreign key relationships** (standalone table)

#### 10. FACE_REGISTRATION_LOGS (Registration Tracking)
**Primary Key:** `id` (UUID)
**No direct foreign key relationships** (standalone table)

#### 11. MODELS (Legacy Model Storage)
**Primary Key:** `id` (SERIAL)
**No direct foreign key relationships** (standalone table)

#### 12. MECHANIC_DOCUMENTS (Verification Documents)
**Primary Key:** `id` (BIGSERIAL)

**Connects FROM:**
- `profiles.user_id` → `mechanic_documents.user_id` (Many:1)

#### 13. ADMIN_GCASH_SETTINGS (GCash Configuration)
**Primary Key:** `id` (BIGSERIAL)
**No direct foreign key relationships** (standalone table)

---

## Visual Connection Guide

### Lines to Draw in Luna Modeler:

1. **profiles.user_id** → **bookings.client_id** (1:Many)
2. **profiles.user_id** → **bookings.mechanic_id** (1:Many)
3. **bookings.id** → **facial_recognition_payments.booking_id** (1:1)
4. **profiles.user_id** → **wallet_transactions.user_id** (1:Many)
5. **profiles.user_id** → **wallet_topup_requests.user_id** (1:Many)
6. **profiles.user_id** → **facial_recognition_payments.client_id** (1:Many)
7. **profiles.user_id** → **facial_recognition_payments.mechanic_id** (1:Many)
8. **profiles.user_id** → **ml_models.created_by** (1:Many)
9. **ml_models.id** → **model_usage_logs.model_id** (1:Many)
10. **profiles.user_id** → **model_usage_logs.user_id** (1:Many)
11. **profiles.user_id** → **mechanic_documents.user_id** (1:Many)
12. **profiles.user_id** → **wallet_transactions.processed_by** (1:Many)
13. **profiles.user_id** → **wallet_topup_requests.processed_by** (1:Many)

### Cardinality Notation:
- **1** = Single line (one side)
- **∞** = Crow's foot (many side)
- **|** = Required (NOT NULL)
- **O** = Optional (NULL allowed)

### Example Notations:
- `profiles ||--o{ bookings` (One profile can have zero or many bookings)
- `bookings ||--|| facial_recognition_payments` (One booking has exactly one payment)
- `profiles ||--o{ wallet_transactions` (One profile can have zero or many transactions)

---

## Table Groupings for Layout:

### Core Business (Center):
- profiles
- bookings

### Financial (Left):
- wallet_transactions
- wallet_topup_requests
- facial_recognition_payments
- admin_gcash_settings

### AI/ML (Right):
- ml_models
- model_usage_logs
- models

### Face Recognition (Bottom):
- face_embeddings
- face_recognition_logs
- face_registration_logs

### Verification (Top):
- mechanic_documents

This summary gives you everything you need to create the ERD in Luna Modeler with proper relationships and connections!
