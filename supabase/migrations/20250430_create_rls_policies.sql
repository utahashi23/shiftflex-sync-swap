
-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_swap_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.truck_names ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles table
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" 
ON public.profiles FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all profiles" 
ON public.profiles FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

-- Create policies for shifts table
CREATE POLICY "Users can view their own shifts" 
ON public.shifts FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own shifts" 
ON public.shifts FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shifts" 
ON public.shifts FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shifts" 
ON public.shifts FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all shifts" 
ON public.shifts FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- Create policies for shift_swap_requests table
CREATE POLICY "Users can view swap requests they're involved in" 
ON public.shift_swap_requests FOR SELECT 
USING (auth.uid() = requester_id OR auth.uid() = acceptor_id);

CREATE POLICY "Users can create swap requests" 
ON public.shift_swap_requests FOR INSERT 
WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update swap requests they're involved in" 
ON public.shift_swap_requests FOR UPDATE 
USING (auth.uid() = requester_id OR auth.uid() = acceptor_id);

CREATE POLICY "Users can delete their own swap requests" 
ON public.shift_swap_requests FOR DELETE 
USING (auth.uid() = requester_id);

CREATE POLICY "Admins can manage all swap requests" 
ON public.shift_swap_requests FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- Create policies for truck_names table
-- Everyone can view truck names
CREATE POLICY "Anyone can view truck names" 
ON public.truck_names FOR SELECT 
USING (true);

-- Only admins can manage truck names
CREATE POLICY "Admins can manage truck names" 
ON public.truck_names FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- Create policies for user_roles table
CREATE POLICY "Users can view their own roles" 
ON public.user_roles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" 
ON public.user_roles FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));
