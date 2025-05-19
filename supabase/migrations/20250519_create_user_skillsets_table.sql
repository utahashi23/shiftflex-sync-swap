
-- Create the user_skillsets table to store the relationship between users and their skillsets
CREATE TABLE IF NOT EXISTS public.user_skillsets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skillset_id UUID NOT NULL REFERENCES public.colleague_types(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, skillset_id)
);

-- Enable Row Level Security
ALTER TABLE public.user_skillsets ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own skillsets
CREATE POLICY "Users can view their own skillsets" 
  ON public.user_skillsets
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Create policy for users to insert their own skillsets
CREATE POLICY "Users can add their own skillsets" 
  ON public.user_skillsets
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Create policy for users to update their own skillsets
CREATE POLICY "Users can update their own skillsets" 
  ON public.user_skillsets
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create policy for users to delete their own skillsets
CREATE POLICY "Users can delete their own skillsets" 
  ON public.user_skillsets
  FOR DELETE 
  USING (auth.uid() = user_id);
