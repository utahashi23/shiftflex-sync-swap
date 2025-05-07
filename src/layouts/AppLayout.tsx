
import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import {
  LayoutDashboard,
  Calendar,
  Settings,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  RocketIcon,
  HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

type AppLayoutProps = {
  children: ReactNode;
};

const AppLayout = ({ children }: AppLayoutProps) => {
  const { user, signOut, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Get user's first name from user_metadata, fallback to email if not available
  const userFirstName = user?.user_metadata?.first_name || 'User';

  const handleSignOut = async () => {
    if (isSigningOut) return;
    
    try {
      setIsSigningOut(true);
      
      // Call the signOut function - it now returns void not boolean
      await signOut();
      
      // Always navigate after sign-out attempt
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Sign out error:', error);
      toast({
        title: "Sign out failed",
        description: "There was a problem signing you out.",
        variant: "destructive",
      });
    } finally {
      setIsSigningOut(false);
    }
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
    { path: '/shifts', label: 'Shift Swaps', icon: <Calendar className="h-5 w-5" /> },
    { path: '/calendar', label: 'Roster', icon: <Calendar className="h-5 w-5" /> },
    { path: '/roadmap', label: 'Roadmap', icon: <RocketIcon className="h-5 w-5" /> },
    { path: '/faq', label: 'FAQ', icon: <HelpCircle className="h-5 w-5" /> },
    { path: '/settings', label: 'Settings', icon: <Settings className="h-5 w-5" /> },
    ...(isAdmin ? [{ path: '/admin', label: 'Admin', icon: <ShieldCheck className="h-5 w-5" /> }] : []),
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Mobile sidebar toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button 
          size="icon" 
          variant="ghost" 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="bg-white shadow-md"
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Sidebar */}
      <div 
        className={cn(
          "w-64 bg-white border-r border-gray-200 shadow-sm p-4 flex flex-col fixed inset-y-0 z-40 transition-transform duration-300 ease-in-out lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center mb-8 p-2">
          <h1 className="text-2xl font-bold text-primary">ShiftFlex</h1>
        </div>

        <div className="mb-6 px-2">
          <div className="text-sm font-medium text-gray-400 mb-2">Welcome</div>
          <div className="font-medium">{userFirstName}</div>
        </div>

        <nav className="flex-1">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-secondary hover:text-primary transition-colors",
                    location.pathname === item.path && "bg-secondary text-primary font-medium"
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-auto pt-4">
          <Button 
            variant="outline" 
            className="w-full justify-start text-gray-700 hover:text-primary" 
            onClick={handleSignOut}
            disabled={isSigningOut}
          >
            <LogOut className="w-4 h-4 mr-2" /> 
            {isSigningOut ? 'Signing Out...' : 'Sign Out'}
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 lg:ml-64">
        <main className="p-4 md:p-6 max-w-7xl mx-auto">
          {children}
        </main>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default AppLayout;
