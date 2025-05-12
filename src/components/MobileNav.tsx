
import { HomeIcon, CalendarDays, Settings, Menu, Calendar, ListTodo } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function MobileNav() {
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    {
      icon: HomeIcon,
      label: 'Home',
      href: '/dashboard',
    },
    {
      icon: CalendarDays,
      label: 'Shifts',
      href: '/shifts',
    },
    {
      icon: ListTodo,
      label: 'Swaps',
      href: '/swaps-list',
    },
    {
      icon: Calendar,
      label: 'Calendar',
      href: '/calendar',
    },
    {
      icon: Settings,
      label: 'Settings',
      href: '/settings',
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-background border-t md:hidden">
      <div className="grid h-full grid-cols-5">
        {navItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              "flex flex-col items-center justify-center",
              isActive(item.href) ? "text-primary" : "text-muted-foreground"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-xs mt-1">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
