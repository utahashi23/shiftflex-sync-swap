
-- Create a function to get all regions and areas, bypassing RLS for diagnostic purposes
CREATE OR REPLACE FUNCTION public.get_all_regions_and_areas()
RETURNS TABLE (
    region_id UUID,
    region_name TEXT,
    region_status TEXT,
    area_id UUID,
    area_name TEXT,
    area_status TEXT,
    area_region_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
    RETURN QUERY 
    SELECT 
        r.id as region_id,
        r.name as region_name,
        r.status as region_status,
        a.id as area_id,
        a.name as area_name,
        a.status as area_status,
        a.region_id as area_region_id
    FROM 
        public.regions r
    LEFT JOIN 
        public.areas a ON r.id = a.region_id
    WHERE 
        r.status = 'active' AND 
        (a.id IS NULL OR a.status = 'active')
    ORDER BY 
        r.name, a.name;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_all_regions_and_areas() TO authenticated;
