
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
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

type AppLayoutProps = {
  children: ReactNode;
};

const AppLayout = ({ children }: AppLayoutProps) => {
  const { user, signOut, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [forceLogoutDialogOpen, setForceLogoutDialogOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed out successfully",
        description: "You have been logged out of your account.",
      });
      navigate('/login');
    } catch (error) {
      toast({
        title: "Sign out failed",
        description: "There was a problem signing you out. Try force logout instead.",
        variant: "destructive",
      });
    }
  };

  const handleForceLogout = async () => {
    try {
      // Clear browser storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Attempt to sign out
      await signOut();
      
      toast({
        title: "Force logout successful",
        description: "Your session has been reset.",
      });
      
      // Force a page reload to clear React state
      window.location.href = '/login';
    } catch (error) {
      console.error("Force logout failed:", error);
      // Hard redirect as a fallback
      window.location.href = '/login';
    } finally {
      setForceLogoutDialogOpen(false);
    }
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
    { path: '/shifts', label: 'Shift Swaps', icon: <Calendar className="h-5 w-5" /> },
    { path: '/calendar', label: 'Calendar', icon: <Calendar className="h-5 w-5" /> },
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
          <div className="font-medium">{user?.email}</div>
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

        <div className="mt-auto pt-4 space-y-2">
          <Button 
            variant="outline" 
            className="w-full justify-start text-gray-700 hover:text-primary" 
            onClick={() => setForceLogoutDialogOpen(true)}
          >
            <RefreshCw className="w-4 h-4 mr-2" /> Force Logout
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full justify-start text-gray-700 hover:text-primary" 
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
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
      
      {/* Force Logout Dialog */}
      <Dialog open={forceLogoutDialogOpen} onOpenChange={setForceLogoutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Force Logout</DialogTitle>
            <DialogDescription>
              This will clear all authentication data and reset your session. Use this if you're experiencing authentication issues.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0 mt-4">
            <Button variant="outline" onClick={() => setForceLogoutDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleForceLogout}>
              Force Logout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AppLayout;
