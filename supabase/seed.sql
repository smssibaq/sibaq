-- Supabase Seed Data
-- Instructions: Run this script against your local or development database to seed sample data.

-- 1. How to manually grant Admin privileges to a developer or trusted user:
-- Find the user's UUID from the Supabase Auth dashboard or run:
-- SELECT id, email FROM auth.users WHERE email = 'your-team-lead@example.com';
--
-- Then run:
-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('<YOUR_USER_UUID_HERE>', 'admin')
-- ON CONFLICT (user_id, role) DO NOTHING;

-- 2. Sample Demo Item (Replace '<OWNER_UUID>' with a valid user ID if seeding locally)
-- Note: When running in local Supabase emulator, you can seed mock auth users first.
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Grab first existing user if one exists
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    -- Ensure user has a profile
    INSERT INTO public.profiles (id, email, full_name, display_name)
    VALUES (v_user_id, 'demo@example.com', 'Demo Engineer', 'Demo Engineer')
    ON CONFLICT (id) DO NOTHING;

    -- Ensure user has a role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'user')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Insert sample items
    INSERT INTO public.sample_items (id, owner_id, title, description, status)
    VALUES
      (gen_random_uuid(), v_user_id, 'Verify API Contracts', 'Inspect input validation schemas across client and edge boundary.', 'active'),
      (gen_random_uuid(), v_user_id, 'Configure Google Cloud Console', 'Add authorized redirect URIs to credentials in GCP.', 'draft')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

