-- Fix RLS policies for face registration service access
-- This script adds service-level access policies for the FaceNet service

-- Add service access policy for face_embeddings table
-- This allows the service to insert/update face embeddings without user authentication
CREATE POLICY "Service can manage face embeddings" ON public.face_embeddings
    FOR ALL USING (true)
    WITH CHECK (true);

-- Ensure the register_face_embedding function has proper permissions
-- Grant execute permission to the service role
GRANT EXECUTE ON FUNCTION register_face_embedding(
    TEXT, TEXT, BYTEA, INTEGER, REAL, BYTEA, JSONB
) TO service_role;

-- Grant execute permission to authenticated users as well
GRANT EXECUTE ON FUNCTION register_face_embedding(
    TEXT, TEXT, BYTEA, INTEGER, REAL, BYTEA, JSONB
) TO authenticated;

-- Also grant permissions to the anon role for service access
GRANT EXECUTE ON FUNCTION register_face_embedding(
    TEXT, TEXT, BYTEA, INTEGER, REAL, BYTEA, JSONB
) TO anon;

-- Ensure the function can access the face_embeddings table
-- Grant necessary permissions to the function owner
GRANT ALL ON public.face_embeddings TO postgres;

-- Alternative approach: Create a more specific service policy
-- Drop the broad policy and create a more specific one
DROP POLICY IF EXISTS "Service can manage face embeddings" ON public.face_embeddings;

-- Create a specific policy for service operations
CREATE POLICY "Service can insert face embeddings" ON public.face_embeddings
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Service can update face embeddings" ON public.face_embeddings
    FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Service can select face embeddings" ON public.face_embeddings
    FOR SELECT USING (true);

-- Ensure the function is properly configured
-- Recreate the function with explicit security settings
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

-- Grant execute permissions again after recreation
GRANT EXECUTE ON FUNCTION register_face_embedding(
    TEXT, TEXT, BYTEA, INTEGER, REAL, BYTEA, JSONB
) TO service_role, authenticated, anon;

-- Test the function (optional - remove in production)
-- SELECT register_face_embedding('test-user', 'Test User', '\x00'::bytea, 128, 0.6, NULL, '{}'::jsonb);
