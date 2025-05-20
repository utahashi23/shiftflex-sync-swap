
-- Create a table for storing user system preferences
CREATE TABLE IF NOT EXISTS public.system_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  roster_default_view TEXT NOT NULL DEFAULT 'card', -- Default to card/list view
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.system_preferences ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Users can view their own system preferences"
  ON public.system_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own system preferences"
  ON public.system_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can update their own system preferences"
  ON public.system_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Add a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_system_preferences_updated_at
BEFORE UPDATE ON public.system_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
