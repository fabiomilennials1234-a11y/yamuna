-- ============================================================
-- RPC function to list tenant users (join auth.users + user_profiles)
-- Super admins need to see email from auth.users, which RLS blocks
-- Run on Supabase project: ppnyrufzkicurwtyjtmr
-- ============================================================

CREATE OR REPLACE FUNCTION get_tenant_users(tenant_uuid UUID)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  role user_role,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Only super admins can call this
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Unauthorized: only super admins can list tenant users';
  END IF;

  RETURN QUERY
  SELECT
    up.id,
    au.email::TEXT,
    up.full_name,
    up.role,
    up.created_at
  FROM user_profiles up
  INNER JOIN auth.users au ON au.id = up.id
  WHERE up.tenant_id = tenant_uuid
  ORDER BY up.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also create a function to count users per tenant (for admin dashboard stats)
CREATE OR REPLACE FUNCTION get_tenant_user_counts()
RETURNS TABLE (
  tenant_id UUID,
  user_count BIGINT
) AS $$
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    up.tenant_id,
    COUNT(*)::BIGINT as user_count
  FROM user_profiles up
  WHERE up.tenant_id IS NOT NULL
  GROUP BY up.tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
