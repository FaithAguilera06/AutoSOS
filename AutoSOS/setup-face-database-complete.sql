-- Complete Face Database Setup for AutoSOS
-- This script creates all necessary tables, functions, and policies for facial recognition

-- ==============================================
-- 1. CREATE TABLES
-- ==============================================

-- Create face_embeddings table
CREATE TABLE IF NOT EXISTS public.face_embeddings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    user_name TEXT NOT NULL,
    face_embedding BYTEA NOT NULL, -- Store the face embedding as binary data
    face_image BYTEA, -- Store the original face image (optional)
    embedding_dimension INTEGER NOT NULL DEFAULT 128, -- Dimension of the face embedding
    confidence_threshold REAL DEFAULT 0.6, -- Confidence threshold for this user
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'::jsonb -- Additional metadata like face box coordinates
);

-- Create face_recognition_logs table for tracking recognition attempts
CREATE TABLE IF NOT EXISTS public.face_recognition_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT,
    recognition_attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    was_successful BOOLEAN NOT NULL,
    confidence_score REAL,
    similarity_score REAL,
    face_detected BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create face_registration_logs table for tracking registration attempts
CREATE TABLE IF NOT EXISTS public.face_registration_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    registration_attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    was_successful BOOLEAN NOT NULL,
    error_message TEXT,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- ==============================================
-- 2. CREATE INDEXES
-- ==============================================

CREATE INDEX IF NOT EXISTS idx_face_embeddings_user_id ON public.face_embeddings(user_id);
CREATE INDEX IF NOT EXISTS idx_face_embeddings_active ON public.face_embeddings(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_face_recognition_logs_user_id ON public.face_recognition_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_face_recognition_logs_attempted_at ON public.face_recognition_logs(recognition_attempted_at);
CREATE INDEX IF NOT EXISTS idx_face_registration_logs_user_id ON public.face_registration_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_face_registration_logs_attempted_at ON public.face_registration_logs(registration_attempted_at);

-- ==============================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ==============================================

ALTER TABLE public.face_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.face_recognition_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.face_registration_logs ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- 4. CREATE RLS POLICIES
-- ==============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own face embeddings" ON public.face_embeddings;
DROP POLICY IF EXISTS "Users can insert their own face embeddings" ON public.face_embeddings;
DROP POLICY IF EXISTS "Users can update their own face embeddings" ON public.face_embeddings;
DROP POLICY IF EXISTS "Users can delete their own face embeddings" ON public.face_embeddings;
DROP POLICY IF EXISTS "Service can insert face embeddings" ON public.face_embeddings;
DROP POLICY IF EXISTS "Service can update face embeddings" ON public.face_embeddings;
DROP POLICY IF EXISTS "Service can select face embeddings" ON public.face_embeddings;

DROP POLICY IF EXISTS "Users can view their own recognition logs" ON public.face_recognition_logs;
DROP POLICY IF EXISTS "Service can insert recognition logs" ON public.face_recognition_logs;

DROP POLICY IF EXISTS "Users can view their own registration logs" ON public.face_registration_logs;
DROP POLICY IF EXISTS "Service can insert registration logs" ON public.face_registration_logs;

-- Create RLS policies for face_embeddings
-- Users can only access their own face data
CREATE POLICY "Users can view their own face embeddings" ON public.face_embeddings
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own face embeddings" ON public.face_embeddings
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own face embeddings" ON public.face_embeddings
    FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own face embeddings" ON public.face_embeddings
    FOR DELETE USING (auth.uid()::text = user_id);

-- Service access policies (for backend service)
CREATE POLICY "Service can insert face embeddings" ON public.face_embeddings
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Service can update face embeddings" ON public.face_embeddings
    FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Service can select face embeddings" ON public.face_embeddings
    FOR SELECT USING (true);

-- Create RLS policies for face_recognition_logs
CREATE POLICY "Users can view their own recognition logs" ON public.face_recognition_logs
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Service can insert recognition logs" ON public.face_recognition_logs
    FOR INSERT WITH CHECK (true);

-- Create RLS policies for face_registration_logs
CREATE POLICY "Users can view their own registration logs" ON public.face_registration_logs
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Service can insert registration logs" ON public.face_registration_logs
    FOR INSERT WITH CHECK (true);

-- ==============================================
-- 5. CREATE FUNCTIONS
-- ==============================================

-- Function to get face embedding by user_id
CREATE OR REPLACE FUNCTION get_face_embedding(p_user_id TEXT)
RETURNS TABLE(
    user_id TEXT,
    user_name TEXT,
    face_embedding BYTEA,
    embedding_dimension INTEGER,
    confidence_threshold REAL,
    registered_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fe.user_id,
        fe.user_name,
        fe.face_embedding,
        fe.embedding_dimension,
        fe.confidence_threshold,
        fe.registered_at,
        fe.is_active
    FROM public.face_embeddings fe
    WHERE fe.user_id = p_user_id 
    AND fe.is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all active face embeddings
CREATE OR REPLACE FUNCTION get_all_face_embeddings()
RETURNS TABLE(
    user_id TEXT,
    user_name TEXT,
    face_embedding BYTEA,
    embedding_dimension INTEGER,
    confidence_threshold REAL,
    registered_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fe.user_id,
        fe.user_name,
        fe.face_embedding,
        fe.embedding_dimension,
        fe.confidence_threshold,
        fe.registered_at
    FROM public.face_embeddings fe
    WHERE fe.is_active = TRUE
    ORDER BY fe.registered_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to register a new face (with proper error handling)
CREATE OR REPLACE FUNCTION register_face_embedding(
    p_user_id TEXT,
    p_user_name TEXT,
    p_face_embedding BYTEA,
    p_embedding_dimension INTEGER DEFAULT 128,
    p_confidence_threshold REAL DEFAULT 0.6,
    p_face_image BYTEA DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Insert or update face embedding
    INSERT INTO public.face_embeddings (
        user_id,
        user_name,
        face_embedding,
        embedding_dimension,
        confidence_threshold,
        face_image,
        metadata
    ) VALUES (
        p_user_id,
        p_user_name,
        p_face_embedding,
        p_embedding_dimension,
        p_confidence_threshold,
        p_face_image,
        p_metadata
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
        user_name = EXCLUDED.user_name,
        face_embedding = EXCLUDED.face_embedding,
        embedding_dimension = EXCLUDED.embedding_dimension,
        confidence_threshold = EXCLUDED.confidence_threshold,
        face_image = EXCLUDED.face_image,
        metadata = EXCLUDED.metadata,
        last_updated = NOW(),
        is_active = TRUE;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error for debugging
        RAISE LOG 'Error in register_face_embedding: %', SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to deactivate a face embedding
CREATE OR REPLACE FUNCTION deactivate_face_embedding(p_user_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.face_embeddings 
    SET is_active = FALSE, last_updated = NOW()
    WHERE user_id = p_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log face recognition attempt
CREATE OR REPLACE FUNCTION log_face_recognition(
    p_user_id TEXT,
    p_was_successful BOOLEAN,
    p_confidence_score REAL DEFAULT NULL,
    p_similarity_score REAL DEFAULT NULL,
    p_face_detected BOOLEAN DEFAULT FALSE,
    p_error_message TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO public.face_recognition_logs (
        user_id,
        was_successful,
        confidence_score,
        similarity_score,
        face_detected,
        error_message,
        ip_address,
        user_agent,
        metadata
    ) VALUES (
        p_user_id,
        p_was_successful,
        p_confidence_score,
        p_similarity_score,
        p_face_detected,
        p_error_message,
        p_ip_address,
        p_user_agent,
        p_metadata
    );
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log face registration attempt
CREATE OR REPLACE FUNCTION log_face_registration(
    p_user_id TEXT,
    p_was_successful BOOLEAN,
    p_error_message TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO public.face_registration_logs (
        user_id,
        was_successful,
        error_message,
        ip_address,
        user_agent,
        metadata
    ) VALUES (
        p_user_id,
        p_was_successful,
        p_error_message,
        p_ip_address,
        p_user_agent,
        p_metadata
    );
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- 6. GRANT PERMISSIONS
-- ==============================================

-- Grant permissions to authenticated users
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.face_embeddings TO authenticated;
GRANT SELECT ON public.face_recognition_logs TO authenticated;
GRANT SELECT ON public.face_registration_logs TO authenticated;
GRANT EXECUTE ON FUNCTION get_face_embedding(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_face_embeddings() TO authenticated;
GRANT EXECUTE ON FUNCTION register_face_embedding(TEXT, TEXT, BYTEA, INTEGER, REAL, BYTEA, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION deactivate_face_embedding(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION log_face_recognition(TEXT, BOOLEAN, REAL, REAL, BOOLEAN, TEXT, INET, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION log_face_registration(TEXT, BOOLEAN, TEXT, INET, TEXT, JSONB) TO authenticated;

-- Grant permissions for service role (backend service access)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.face_embeddings TO service_role;
GRANT INSERT ON public.face_recognition_logs TO service_role;
GRANT INSERT ON public.face_registration_logs TO service_role;
GRANT EXECUTE ON FUNCTION get_face_embedding(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION get_all_face_embeddings() TO service_role;
GRANT EXECUTE ON FUNCTION register_face_embedding(TEXT, TEXT, BYTEA, INTEGER, REAL, BYTEA, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION deactivate_face_embedding(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION log_face_recognition(TEXT, BOOLEAN, REAL, REAL, BOOLEAN, TEXT, INET, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION log_face_registration(TEXT, BOOLEAN, TEXT, INET, TEXT, JSONB) TO service_role;

-- Grant permissions for anon role (for service access)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.face_embeddings TO anon;
GRANT INSERT ON public.face_recognition_logs TO anon;
GRANT INSERT ON public.face_registration_logs TO anon;
GRANT EXECUTE ON FUNCTION get_face_embedding(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_all_face_embeddings() TO anon;
GRANT EXECUTE ON FUNCTION register_face_embedding(TEXT, TEXT, BYTEA, INTEGER, REAL, BYTEA, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION deactivate_face_embedding(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION log_face_recognition(TEXT, BOOLEAN, REAL, REAL, BOOLEAN, TEXT, INET, TEXT, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION log_face_registration(TEXT, BOOLEAN, TEXT, INET, TEXT, JSONB) TO anon;

-- ==============================================
-- 7. CREATE VIEWS
-- ==============================================

-- Create a view for face recognition statistics
CREATE OR REPLACE VIEW face_recognition_stats AS
SELECT 
    fe.user_id,
    fe.user_name,
    fe.registered_at,
    COUNT(frl.id) as total_recognition_attempts,
    COUNT(CASE WHEN frl.was_successful THEN 1 END) as successful_recognitions,
    ROUND(
        COUNT(CASE WHEN frl.was_successful THEN 1 END)::numeric / 
        NULLIF(COUNT(frl.id), 0) * 100, 2
    ) as success_rate_percentage,
    AVG(frl.confidence_score) as avg_confidence_score,
    AVG(frl.similarity_score) as avg_similarity_score,
    MAX(frl.recognition_attempted_at) as last_recognition_attempt
FROM public.face_embeddings fe
LEFT JOIN public.face_recognition_logs frl ON fe.user_id = frl.user_id
WHERE fe.is_active = TRUE
GROUP BY fe.user_id, fe.user_name, fe.registered_at;

GRANT SELECT ON public.face_recognition_stats TO authenticated, anon, service_role;

-- ==============================================
-- 8. ADD COMMENTS
-- ==============================================

COMMENT ON TABLE public.face_embeddings IS 'Stores face embeddings and user information for facial recognition';
COMMENT ON TABLE public.face_recognition_logs IS 'Logs face recognition attempts for analytics and debugging';
COMMENT ON TABLE public.face_registration_logs IS 'Logs face registration attempts for analytics and debugging';
COMMENT ON VIEW public.face_recognition_stats IS 'Statistics view for face recognition performance';

-- ==============================================
-- 9. TEST THE SETUP
-- ==============================================

-- Test the register_face_embedding function
-- SELECT register_face_embedding('test-user', 'Test User', '\x1234567890abcdef', 128, 0.6, NULL, '{}'::jsonb);

-- Verify tables exist
SELECT 'face_embeddings' as table_name, count(*) as row_count FROM public.face_embeddings
UNION ALL
SELECT 'face_recognition_logs' as table_name, count(*) as row_count FROM public.face_recognition_logs
UNION ALL
SELECT 'face_registration_logs' as table_name, count(*) as row_count FROM public.face_registration_logs;
