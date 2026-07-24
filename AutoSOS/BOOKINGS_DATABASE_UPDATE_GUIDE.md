# Bookings Database Update Guide

## Overview
This guide explains how to update the bookings database to include new fields for enhanced functionality.

## New Fields Added

### 1. Mechanic Location
- `mechanic_latitude` (double precision) - Mechanic's current latitude when service starts
- `mechanic_longitude` (double precision) - Mechanic's current longitude when service starts

### 2. Client Location
- `client_latitude` (double precision) - Client's location latitude where service is needed
- `client_longitude` (double precision) - Client's location longitude where service is needed

### 3. Service Details
- `service_price` (numeric(10,2)) - Price of the service in PHP
- `motorcycle_model` (text) - Client's motorcycle model/brand
- `client_phone` (text) - Client's phone number for contact

### 4. Payment Information
- `payment_method` (text) - Payment method: 'cash' or 'facial_recognition'
- `payment_status` (text) - Payment status: 'pending', 'paid', 'failed', 'refunded'
- `payment_completed_at` (timestamptz) - Timestamp when payment was completed

### 5. Service Completion
- `service_completed_at` (timestamptz) - Timestamp when service was completed

## Implementation Steps

### Step 1: Run Database Migration
Execute the SQL script in your Supabase SQL editor:
```sql
-- Run the update-bookings-schema.sql script
```

### Step 2: Update TypeScript Interfaces
The `Booking` interface in `src/app/models.ts` has been updated to include all new fields.

### Step 3: Update Application Code

#### Client Side (Mechanic Finder)
When creating a booking, include the new fields:
```typescript
const bookingData = {
  client_id: userId,
  required_specialization: this.selectedIssue,
  notes: this.notes,
  latitude: this.currentLocation.latitude,
  longitude: this.currentLocation.longitude,
  client_latitude: this.currentLocation.latitude,
  client_longitude: this.currentLocation.longitude,
  motorcycle_model: this.motorcycleModel,
  client_phone: this.clientPhone,
  payment_method: this.selectedPaymentMethod,
  payment_status: 'pending'
};
```

#### Mechanic Side (Service Request)
When accepting a booking, update with mechanic location and service price:
```typescript
const updateData = {
  mechanic_id: mechanicId,
  status: 'in_progress',
  mechanic_latitude: currentLocation.latitude,
  mechanic_longitude: currentLocation.longitude,
  service_price: servicePrice
};
```

#### Payment Processing
When processing payments:
```typescript
const paymentUpdate = {
  payment_status: 'paid',
  payment_completed_at: new Date().toISOString()
};
```

#### Service Completion
When completing service:
```typescript
const completionUpdate = {
  status: 'completed',
  service_completed_at: new Date().toISOString()
};
```

## Database Schema Changes

### Before
```sql
CREATE TABLE bookings (
  id bigserial PRIMARY KEY,
  client_id uuid NOT NULL,
  mechanic_id uuid,
  status booking_status NOT NULL DEFAULT 'pending',
  required_specialization text NOT NULL,
  notes text,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  mechanic_score numeric,
  distance_km numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

### After
```sql
CREATE TABLE bookings (
  id bigserial PRIMARY KEY,
  client_id uuid NOT NULL,
  mechanic_id uuid,
  status booking_status NOT NULL DEFAULT 'pending',
  required_specialization text NOT NULL,
  notes text,
  -- Client location
  client_latitude double precision,
  client_longitude double precision,
  -- Mechanic location
  mechanic_latitude double precision,
  mechanic_longitude double precision,
  -- Service details
  service_price numeric(10,2),
  motorcycle_model text,
  client_phone text,
  -- Payment information
  payment_method text DEFAULT 'cash' CHECK (payment_method IN ('cash', 'facial_recognition')),
  payment_status text DEFAULT 'pending',
  payment_completed_at timestamptz,
  -- Service completion
  service_completed_at timestamptz,
  -- Matching and scoring
  mechanic_score numeric,
  distance_km numeric,
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

## Usage Examples

### 1. Creating a New Booking
```typescript
const newBooking = await supabase
  .from('bookings')
  .insert({
    client_id: userId,
    required_specialization: 'tire-assistance',
    notes: 'Flat tire on Honda CBR',
    client_latitude: 14.5995,
    client_longitude: 120.9842,
    motorcycle_model: 'Honda CBR',
    client_phone: '+639123456789',
    payment_method: 'facial_recognition',
    payment_status: 'pending'
  });
```

### 2. Mechanic Accepting Booking
```typescript
const acceptBooking = await supabase
  .from('bookings')
  .update({
    mechanic_id: mechanicId,
    status: 'in_progress',
    mechanic_latitude: 14.6000,
    mechanic_longitude: 120.9850,
    service_price: 1500.00
  })
  .eq('id', bookingId);
```

### 3. Processing Payment
```typescript
const processPayment = await supabase
  .from('bookings')
  .update({
    payment_status: 'paid',
    payment_completed_at: new Date().toISOString()
  })
  .eq('id', bookingId);
```

### 4. Completing Service
```typescript
const completeService = await supabase
  .from('bookings')
  .update({
    status: 'completed',
    service_completed_at: new Date().toISOString()
  })
  .eq('id', bookingId);
```

## Benefits

1. **Enhanced Location Tracking**: Separate fields for client and mechanic locations
2. **Better Service Management**: Track service price and motorcycle details
3. **Improved Communication**: Store client phone number for direct contact
4. **Payment Tracking**: Complete payment method and status tracking
5. **Service Analytics**: Timestamps for service completion and payment processing
6. **Better User Experience**: More detailed information for both clients and mechanics

## Migration Notes

- All new fields are nullable to maintain compatibility with existing data
- Default values are set for payment_method ('cash') and payment_status ('pending')
- Existing bookings will have NULL values for new fields until updated
- The original latitude/longitude fields have been removed and data migrated to client_latitude/client_longitude
- Clear separation between client and mechanic location fields

## Testing

After implementing these changes:

1. Test creating new bookings with all fields
2. Test mechanic accepting bookings with location and price
3. Test payment processing with different methods
4. Test service completion workflow
5. Verify data integrity and proper field population
