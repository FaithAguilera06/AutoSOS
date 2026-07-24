# Luna Modeler ERD Setup Guide for AutoSOS

## Overview
This guide will help you create a comprehensive Entity Relationship Diagram (ERD) for the AutoSOS database using Luna Modeler.

## Step-by-Step Setup

### 1. Open Luna Modeler
- Launch Luna Modeler application
- Create a new project
- Choose "PostgreSQL" as your database type

### 2. Import the Database Schema
- Go to **File** → **Import** → **SQL Script**
- Select the `AUTOSOS_LUNA_MODELER_ERD.sql` file
- Click **Import** to load all tables and relationships

### 3. Arrange Tables for Better Visualization

#### Core Tables (Center):
- **profiles** - Place in the center as the main hub
- **bookings** - Place near profiles (main business entity)

#### Financial Tables (Left Side):
- **wallet_transactions**
- **wallet_topup_requests** 
- **facial_recognition_payments**
- **admin_gcash_settings**

#### AI/ML Tables (Right Side):
- **ml_models**
- **model_usage_logs**
- **models** (legacy)

#### Face Recognition Tables (Bottom):
- **face_embeddings**
- **face_recognition_logs**
- **face_registration_logs**

#### Verification Tables (Top):
- **mechanic_documents**

### 4. Visual Relationship Connections

#### Primary Relationships to Draw:

1. **profiles → bookings** (1:Many)
   - Line from `profiles.user_id` to `bookings.client_id`
   - Line from `profiles.user_id` to `bookings.mechanic_id`
   - Label: "Client Bookings" and "Mechanic Bookings"

2. **bookings → facial_recognition_payments** (1:1)
   - Line from `bookings.id` to `facial_recognition_payments.booking_id`
   - Label: "Payment for Booking"

3. **profiles → wallet_transactions** (1:Many)
   - Line from `profiles.user_id` to `wallet_transactions.user_id`
   - Label: "User Transactions"

4. **profiles → wallet_topup_requests** (1:Many)
   - Line from `profiles.user_id` to `wallet_topup_requests.user_id`
   - Label: "User Topup Requests"

5. **profiles → facial_recognition_payments** (1:Many)
   - Line from `profiles.user_id` to `facial_recognition_payments.client_id`
   - Line from `profiles.user_id` to `facial_recognition_payments.mechanic_id`
   - Label: "Client Payments" and "Mechanic Receipts"

6. **ml_models → model_usage_logs** (1:Many)
   - Line from `ml_models.id` to `model_usage_logs.model_id`
   - Label: "Model Usage"

7. **profiles → ml_models** (1:Many)
   - Line from `profiles.user_id` to `ml_models.created_by`
   - Label: "Created Models"

8. **profiles → model_usage_logs** (1:Many)
   - Line from `profiles.user_id` to `model_usage_logs.user_id`
   - Label: "User Model Usage"

9. **profiles → mechanic_documents** (1:Many)
   - Line from `profiles.user_id` to `mechanic_documents.user_id`
   - Label: "Mechanic Documents"

10. **profiles → wallet_transactions** (Admin Processing)
    - Line from `profiles.user_id` to `wallet_transactions.processed_by`
    - Label: "Processed by Admin"

11. **profiles → wallet_topup_requests** (Admin Processing)
    - Line from `profiles.user_id` to `wallet_topup_requests.processed_by`
    - Label: "Processed by Admin"

### 5. Visual Styling Tips

#### Color Coding:
- **Blue**: Core business tables (profiles, bookings)
- **Green**: Financial tables (wallet_*, facial_payments)
- **Orange**: AI/ML tables (ml_models, model_usage_logs)
- **Purple**: Face recognition tables (face_*)
- **Gray**: Support tables (admin_gcash_settings, models)

#### Line Styling:
- **Solid lines**: Primary relationships
- **Dashed lines**: Optional relationships (ON DELETE SET NULL)
- **Thick lines**: Critical business relationships
- **Thin lines**: Supporting relationships

### 6. Relationship Cardinality Notation

#### Use Standard ERD Notation:
- **1** (single line): One side of relationship
- **∞** (crow's foot): Many side of relationship
- **|** (bar): Required (NOT NULL)
- **O** (circle): Optional (NULL allowed)

#### Example Notations:
- `profiles ||--o{ bookings` (One profile can have zero or many bookings)
- `bookings ||--|| facial_recognition_payments` (One booking has exactly one payment)
- `profiles ||--o{ wallet_transactions` (One profile can have zero or many transactions)

### 7. Table Layout Recommendations

```
                    [mechanic_documents]
                           |
                           |
    [admin_gcash_settings] [profiles] [ml_models]
                           |           |
                           |           |
    [wallet_topup_requests] [bookings] [model_usage_logs]
           |                   |
           |                   |
    [wallet_transactions] [facial_recognition_payments]
           |
           |
    [face_embeddings] [face_recognition_logs] [face_registration_logs]
```

### 8. Export Options

#### For Documentation:
- **File** → **Export** → **Image** → **PNG/JPEG** (High resolution)
- **File** → **Export** → **PDF** (For reports)

#### For Development:
- **File** → **Export** → **SQL Script** (Generate DDL)
- **File** → **Export** → **HTML** (Interactive web version)

### 9. Key Features to Highlight

#### Business Logic:
- User roles (client, mechanic, admin)
- Booking workflow (pending → matched → in_progress → completed)
- Payment processing (topup → payment → completion)
- Face recognition integration

#### Technical Features:
- Real-time location tracking
- ML model management
- Document verification
- Financial transaction logging

### 10. Validation Checklist

- [ ] All 13 tables are visible
- [ ] All primary keys are marked
- [ ] All foreign key relationships are connected
- [ ] Cardinality notation is correct
- [ ] Table names are clear and readable
- [ ] Relationships are labeled appropriately
- [ ] Layout is logical and easy to follow
- [ ] Colors help distinguish table types

## Troubleshooting

### Common Issues:
1. **Missing relationships**: Check that all FK constraints are imported
2. **Wrong cardinality**: Verify the relationship direction and type
3. **Overlapping tables**: Adjust table positions for better visibility
4. **Unclear labels**: Add descriptive relationship labels

### Tips:
- Use **View** → **Auto Layout** for initial arrangement
- Use **View** → **Zoom to Fit** to see the entire diagram
- Use **View** → **Grid** to align tables properly
- Save your work frequently

## Final Result
You should have a comprehensive ERD showing:
- 13 interconnected tables
- Clear relationship lines with proper cardinality
- Logical grouping of related tables
- Professional appearance suitable for documentation

This ERD will serve as the definitive reference for your AutoSOS database structure and can be used for:
- Developer onboarding
- Database documentation
- System architecture discussions
- Future development planning
