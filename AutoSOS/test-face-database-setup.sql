-- Test script to verify face database setup
-- Run this after setup-face-database-complete.sql

-- 1. Check if tables exist
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('face_embeddings', 'face_recognition_logs', 'face_registration_logs')
ORDER BY tablename;

-- 2. Check if functions exist
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'get_face_embedding',
    'get_all_face_embeddings', 
    'register_face_embedding',
    'deactivate_face_embedding',
    'log_face_recognition',
    'log_face_registration'
)
ORDER BY routine_name;

-- 3. Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('face_embeddings', 'face_recognition_logs', 'face_registration_logs')
ORDER BY tablename, policyname;

-- 4. Test the register_face_embedding function
SELECT register_face_embedding(
    'test-user-' || extract(epoch from now())::text,
    'Test User',
    '\x1234567890abcdef'::bytea,
    128,
    0.6,
    NULL,
    '{"test": true}'::jsonb
) as registration_result;

-- 5. Check if the test record was inserted
SELECT 
    user_id,
    user_name,
    embedding_dimension,
    confidence_threshold,
    registered_at,
    is_active
FROM public.face_embeddings 
WHERE user_id LIKE 'test-user-%'
ORDER BY registered_at DESC
LIMIT 5;

-- 6. Test the get_face_embedding function
SELECT * FROM get_face_embedding('test-user-' || extract(epoch from now())::text);

-- 7. Clean up test data (optional)
-- DELETE FROM public.face_embeddings WHERE user_id LIKE 'test-user-%';

-- 8. Show current face count
SELECT 
    'Total faces registered' as metric,
    count(*) as value
FROM public.face_embeddings 
WHERE is_active = true;
