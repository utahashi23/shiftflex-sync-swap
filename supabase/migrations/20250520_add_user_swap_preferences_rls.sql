
-- Enable RLS on the user_swap_preferences table
ALTER TABLE public.user_swap_preferences ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own preferences
CREATE POLICY "Users can view their own swap preferences" 
ON public.user_swap_preferences FOR SELECT 
USING (auth.uid() = user_id);

-- Create policy for users to insert their own preferences
CREATE POLICY "Users can insert their own swap preferences" 
ON public.user_swap_preferences FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create policy for users to update their own preferences
CREATE POLICY "Users can update their own swap preferences" 
ON public.user_swap_preferences FOR UPDATE 
USING (auth.uid() = user_id);

-- Create policy for users to delete their own preferences
CREATE POLICY "Users can delete their own swap preferences" 
ON public.user_swap_preferences FOR DELETE 
USING (auth.uid() = user_id);

-- Create policy for admins to manage all preferences
CREATE POLICY "Admins can manage all swap preferences" 
ON public.user_swap_preferences FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));
