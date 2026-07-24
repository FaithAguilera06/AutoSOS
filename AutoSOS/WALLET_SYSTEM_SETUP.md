# AutoSOS Wallet System Setup Guide

## Overview
The AutoSOS wallet system enables:
- **Clients**: Upload GCash receipts for wallet top-up
- **Mechanics**: Receive payments via facial recognition
- **Admins**: Approve top-up requests and manage wallet transactions

## Database Setup

### 1. Run the Database Migration
Execute the SQL script to create all wallet-related tables and functions:

```bash
# Connect to your Supabase database and run:
psql -h your-db-host -U postgres -d postgres -f fix-wallet-system.sql
```

Or copy the contents of `fix-wallet-system.sql` and run it in your Supabase SQL editor.

### 2. Storage Buckets Setup
Create the following storage buckets in Supabase:

```sql
-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES 
('autosos', 'autosos', false);

-- The policies are already included in the SQL script
```

## Frontend Integration

### 1. Update App Module
Add the wallet service to your app module:

```typescript
// src/app/app.module.ts
import { WalletService } from './wallet.service';

@NgModule({
  providers: [
    WalletService,
    // ... other providers
  ]
})
export class AppModule { }
```

### 2. Environment Configuration
Ensure your Supabase configuration is correct:

```typescript
// src/environments/environment.ts
export const environment = {
  supabaseUrl: 'your-supabase-url',
  supabaseAnonKey: 'your-supabase-anon-key'
};
```

## Usage Guide

### For Clients (Wallet Top-up)

1. **Navigate to Wallet**: Go to Client → Wallet tab
2. **View Balance**: See current wallet balance
3. **Top-up Process**:
   - Click "TOP UP" button
   - Enter amount to top-up
   - Enter GCash reference number
   - Upload GCash receipt photos (max 3 files)
   - Take verification selfie
   - Submit request
4. **Wait for Approval**: Admin will review and approve/reject

### For Mechanics (Facial Recognition Payment)

1. **Navigate to Wallet**: Go to Mechanic → Wallet tab
2. **View Earnings**: See total earnings and transaction history
3. **Process Payment** (when service is completed):
   - Use facial recognition payment modal
   - Enter payment amount
   - Capture client's photo for verification
   - Process payment
4. **Automatic Transfer**: Amount is deducted from client's wallet and added to mechanic's wallet

### For Admins (Top-up Management)

1. **Navigate to Wallet**: Go to Admin → Wallet tab
2. **View Requests**: See all pending top-up requests
3. **Review Requests**:
   - Click on request to view details
   - See GCash receipt images
   - See verification photo
   - Check reference number
4. **Approve/Reject**:
   - Approve: Adds funds to client's wallet
   - Reject: Sends notification to client with reason

## API Endpoints

### Wallet Service Methods

```typescript
// Get wallet balance
await walletService.loadWalletBalance();

// Submit top-up request
await walletService.submitTopupRequest(amount, gcashRef, receiptUrls, verificationPhoto);

// Get transaction history
await walletService.getTransactionHistory(limit, offset);

// Process facial payment (mechanics only)
await walletService.processFacialPayment(bookingId, amount, verificationPhoto);

// Approve top-up (admins only)
await walletService.approveTopupRequest(topupId, adminNotes);

// Reject top-up (admins only)
await walletService.rejectTopupRequest(topupId, reason);
```

## Database Functions

### Available RPC Functions

```sql
-- Get wallet balance
SELECT get_wallet_balance(user_id);

-- Get transaction history
SELECT * FROM get_wallet_transactions(user_id, limit, offset);

-- Approve top-up (admin only)
SELECT * FROM approve_wallet_topup(topup_id, admin_notes);

-- Reject top-up (admin only)
SELECT reject_wallet_topup(topup_id, admin_notes);

-- Process facial payment (mechanic only)
SELECT * FROM process_facial_payment(booking_id, amount, verification_photo, facial_data);
```

## Security Features

### Row Level Security (RLS)
- Users can only see their own transactions
- Admins can see all transactions
- Mechanics can only process payments for their bookings

### File Upload Security
- Images are stored in user-specific folders
- Only owners and admins can access uploaded files
- File type and size validation

### Transaction Validation
- Insufficient balance checks
- Booking status validation
- User role verification

## Testing the System

### 1. Test Client Top-up Flow
```typescript
// 1. Create a client account
// 2. Navigate to wallet
// 3. Submit a top-up request with:
//    - Amount: 1000
//    - GCash reference: "GC123456789"
//    - Upload receipt image
//    - Take verification photo
// 4. Check admin panel for pending request
```

### 2. Test Admin Approval Flow
```typescript
// 1. Login as admin
// 2. Go to wallet tab
// 3. Find pending top-up request
// 4. Review details and approve
// 5. Check client's wallet balance increased
```

### 3. Test Facial Payment Flow
```typescript
// 1. Create a completed booking
// 2. Login as assigned mechanic
// 3. Use facial payment modal
// 4. Process payment with client photo
// 5. Verify balance transfer
```

## Troubleshooting

### Common Issues

1. **Camera not working**:
   - Check browser permissions
   - Ensure HTTPS connection
   - Test on mobile device

2. **File upload fails**:
   - Check file size (max 5MB)
   - Verify file type (images only)
   - Check storage bucket permissions

3. **Payment processing fails**:
   - Verify client has sufficient balance
   - Check booking status is "completed"
   - Ensure mechanic is assigned to booking

4. **Admin approval fails**:
   - Verify user has admin role
   - Check RLS policies
   - Ensure top-up request exists and is pending

### Debug Mode
Enable debug logging in the wallet service:

```typescript
// Add to wallet.service.ts
private debugMode = true;

private log(message: string, data?: any) {
  if (this.debugMode) {
    console.log(`[WalletService] ${message}`, data);
  }
}
```

## Production Considerations

### 1. Security
- Enable HTTPS for all file uploads
- Implement rate limiting for API calls
- Add transaction logging for audit trails
- Regular security audits

### 2. Performance
- Implement image compression for uploads
- Add caching for frequently accessed data
- Optimize database queries
- Monitor storage usage

### 3. Monitoring
- Set up alerts for failed transactions
- Monitor wallet balance changes
- Track approval/rejection rates
- Log all admin actions

### 4. Backup
- Regular database backups
- Storage bucket backups
- Transaction history archiving
- Disaster recovery plan

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review console logs for errors
3. Verify database permissions
4. Test with different user roles

The wallet system is now fully integrated and ready for production use!
