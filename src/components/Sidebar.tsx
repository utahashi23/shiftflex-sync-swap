
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Calendar,
  Settings,
  LogOut,
  Home,
  ArrowLeftRight,
  Users,
  UserCog,
  List,
  MessageSquareText,
  HelpCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";

const Sidebar = () => {
  const { isAdmin, signOut } = useAuth();

  return (
    <div className="pb-12 w-full min-h-screen bg-black text-white hidden lg:block">
      <div className="flex flex-col h-full">
        {/* Logo and app title */}
        <div className="px-4 py-6">
          <h2 className="text-2xl font-bold">ShiftSwapper</h2>
          <p className="text-gray-400 text-sm">Staff Shift Management</p>
        </div>
        
        <Separator className="bg-white/10" />
        
        {/* Navigation links */}
        <nav className="space-y-1 px-2 py-4 flex-1">
          <NavItem to="/" icon={<Home size={20} />} label="Home" />
          <NavItem to="/dashboard" icon={<LayoutDashboard size={20} />} label="Dashboard" />
          <NavItem to="/shifts" icon={<Calendar size={20} />} label="My Shifts" />
          <NavItem to="/calendar" icon={<Calendar size={20} />} label="Calendar" />
          <NavItem to="/shift-swaps" icon={<ArrowLeftRight size={20} />} label="Shift Swaps" />
          <NavItem to="/swaps-list" icon={<List size={20} />} label="Swaps List" />
          <NavItem to="/leave-swaps" icon={<Calendar size={20} />} label="Leave Swaps" />
          <NavItem to="/swap-preferences" icon={<UserCog size={20} />} label="Swap Preferences" />
          <NavItem to="/settings" icon={<Settings size={20} />} label="Settings" />
          <NavItem to="/feedback" icon={<MessageSquareText size={20} />} label="Feedback" />
          <NavItem to="/faq" icon={<HelpCircle size={20} />} label="FAQ" />
          
          {/* Admin-only section */}
          {isAdmin && (
            <>
              <div className="mt-6 mb-2 px-3 text-xs font-semibold text-gray-400">
                ADMIN SECTION
              </div>
              <NavItem to="/admin" icon={<Users size={20} />} label="Admin Panel" />
              <NavItem to="/system-settings" icon={<Settings size={20} />} label="System Settings" />
            </>
          )}
        </nav>
        
        {/* Sign out button */}
        <div className="px-4 py-4">
          <Button
            variant="ghost"
            className="w-full justify-start text-white hover:bg-white/10"
            onClick={signOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
};

// Helper component for navigation item
interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      cn(
        "flex items-center px-3 py-2 text-sm font-medium rounded-md",
        isActive
          ? "bg-white/10 text-white"
          : "text-gray-300 hover:bg-white/5 hover:text-white"
      )
    }
  >
    <span className="mr-3">{icon}</span>
    {label}
  </NavLink>
);

export default Sidebar;
