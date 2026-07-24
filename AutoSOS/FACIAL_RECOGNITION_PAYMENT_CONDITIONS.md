# 🎯 Facial Recognition Payment Conditions

## 📋 **Complete Payment Flow Requirements**

### **1. 🔐 Authentication Conditions**
- ✅ **User must be authenticated** - Valid Supabase session required
- ✅ **User ID must exist** - `auth.uid()` must return valid UUID
- ✅ **Session must be active** - No expired JWT tokens

### **2. 📝 Booking Conditions**
- ✅ **Booking must exist** - Valid booking ID in database
- ✅ **Booking must belong to client** - `client_id` must match authenticated user
- ✅ **Booking status must be 'in_progress'** - Service must be active
- ✅ **Payment method must be 'facial_recognition'** - Correct payment type
- ✅ **Payment status must be 'pending'** - Not already paid
- ✅ **Mechanic must be assigned** - `mechanic_id` must exist
- ✅ **Service price must be set** - `service_price > 0`

### **3. 💰 Wallet Conditions**
- ✅ **Client must have sufficient balance** - `wallet_balance >= service_price`
- ✅ **Wallet balance must be positive** - Cannot be negative
- ✅ **Mechanic wallet must exist** - Valid mechanic profile

### **4. 🎭 Face Recognition Conditions**

#### **Face Detection:**
- ✅ **Face must be detected** - At least one face in the image
- ✅ **Image quality must be good** - Clear, well-lit photo
- ✅ **Face must be visible** - Not obscured or partially hidden

#### **Face Verification:**
- ✅ **Face must be registered** - User must have registered face in database
- ✅ **Face must match registered user** - `user_id` must match client ID
- ✅ **Confidence must meet threshold** - `confidence >= 0.6` (60%)
- ✅ **Face recognition must succeed** - FaceNet API must return success

### **5. 🗄️ Database Conditions**

#### **RLS Policies:**
- ✅ **Profiles table access** - Can update wallet balances
- ✅ **Wallet transactions access** - Can insert transaction records
- ✅ **Facial payments access** - Can insert payment records
- ✅ **Bookings table access** - Can update payment status

#### **Table Requirements:**
- ✅ **facial_payments table exists** - Or facial_recognition_payments
- ✅ **wallet_transactions table exists** - For transaction history
- ✅ **profiles table has wallet_balance** - For balance updates

### **6. 🔧 Technical Conditions**

#### **API Requirements:**
- ✅ **FaceNet service running** - Port 8001 accessible
- ✅ **Supabase connection** - Database accessible
- ✅ **Camera access** - Device camera permissions
- ✅ **Network connectivity** - API calls must succeed

#### **Data Validation:**
- ✅ **Valid image format** - Base64 encoded image
- ✅ **Valid booking ID** - Numeric booking ID
- ✅ **Valid amount** - Positive numeric value
- ✅ **Valid user IDs** - Proper UUID format

## 🚨 **Common Failure Points**

### **Authentication Failures:**
- ❌ **JWT expired** - User needs to re-login
- ❌ **Invalid session** - Session corrupted or invalid
- ❌ **User not found** - Profile doesn't exist

### **Booking Failures:**
- ❌ **Booking not found** - Invalid booking ID
- ❌ **Wrong booking status** - Not 'in_progress'
- ❌ **Payment already processed** - Status not 'pending'
- ❌ **No mechanic assigned** - Mechanic ID missing

### **Wallet Failures:**
- ❌ **Insufficient balance** - Not enough money in wallet
- ❌ **Negative balance** - Wallet balance corrupted
- ❌ **Wallet not initialized** - Balance is null

### **Face Recognition Failures:**
- ❌ **No face detected** - Camera didn't capture face
- ❌ **Face not registered** - User hasn't registered face
- ❌ **Face doesn't match** - Wrong person trying to pay
- ❌ **Low confidence** - Face recognition confidence < 60%
- ❌ **Poor image quality** - Blurry or dark image

### **Database Failures:**
- ❌ **RLS policy blocking** - Row Level Security preventing updates
- ❌ **Table doesn't exist** - Missing required tables
- ❌ **Permission denied** - User lacks database permissions
- ❌ **Connection timeout** - Database unreachable

## ✅ **Success Conditions Summary**

For payment to succeed, **ALL** of these must be true:

1. **User authenticated** ✅
2. **Valid booking in progress** ✅
3. **Sufficient wallet balance** ✅
4. **Face detected and verified** ✅
5. **Confidence >= 60%** ✅
6. **Database permissions OK** ✅
7. **All APIs accessible** ✅

## 🔧 **Troubleshooting Guide**

### **If Payment Fails:**

1. **Check browser console** - Look for error messages
2. **Verify face registration** - Ensure face is registered
3. **Check wallet balance** - Ensure sufficient funds
4. **Verify booking status** - Must be 'in_progress'
5. **Test FaceNet service** - Ensure API is running
6. **Check database permissions** - Apply RLS fixes if needed

### **Debug Steps:**
1. **Test face registration** - Register face first
2. **Check wallet balance** - Add funds if needed
3. **Verify booking flow** - Ensure proper booking creation
4. **Test API endpoints** - Ensure services are running
5. **Apply database fixes** - Run RLS policy fixes

## 🎯 **Current Status**

- ✅ **Face Recognition API** - Working (7 faces registered)
- ✅ **Compilation** - No TypeScript errors
- ⚠️ **Database RLS** - Needs `fix-facial-payment-rls.sql` applied
- ✅ **Payment Flow** - Ready to test after RLS fix

**Next Step:** Apply the RLS fix to your Supabase database to enable wallet transfers!
