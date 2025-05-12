
import { 
  CalendarDays, 
  Home, 
  Settings, 
  Calendar, 
  ListTodo, 
  Menu
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Sidebar, 
  SidebarContent, 
  SidebarHeader,
  SidebarFooter,
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarTrigger
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';

export function AppSidebar() {
  const location = useLocation();

  // List of main navigation items
  const navigationItems = [
    {
      title: 'Dashboard',
      path: '/dashboard',
      icon: Home
    },
    {
      title: 'Shift Swaps',
      path: '/shifts',
      icon: CalendarDays
    },
    {
      title: 'Swaps List',
      path: '/swaps-list',
      icon: ListTodo
    },
    {
      title: 'Leave Swaps',
      path: '/leave-swaps',
      icon: Calendar
    },
    {
      title: 'Calendar',
      path: '/calendar',
      icon: Calendar
    }
  ];

  // List of secondary navigation items
  const secondaryItems = [
    {
      title: 'Settings',
      path: '/settings',
      icon: Settings
    }
  ];
  
  // Check if a route is active
  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar>
      <SidebarHeader className="flex items-center justify-between p-4">
        <div className="flex items-center">
          <span className="text-xl font-bold">ShiftFlex</span>
        </div>
        <div className="md:hidden">
          <SidebarTrigger />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarMenu>
            {navigationItems.map((item) => (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive(item.path)}
                  tooltip={item.title}
                >
                  <Link to={item.path}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarMenu>
            {secondaryItems.map((item) => (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive(item.path)}
                  tooltip={item.title}
                >
                  <Link to={item.path}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="text-xs text-muted-foreground">
          ShiftFlex © {new Date().getFullYear()}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
