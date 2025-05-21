import { Fragment, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Dialog, Transition } from '@headlessui/react';
import {
  LayoutDashboard,
  Calendar,
  LogOut,
  Menu,
  X,
  CalendarDays,
  Home,
  FileQuestion,
  ArrowLeftRight,
  Settings,
  Users,
  Database,
  UserCog,
  List
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { EmailDomainWarning } from '@/components/EmailDomainWarning';

const navigation = [
  { name: 'Home', href: '/', icon: Home, requiresAuth: false },
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, requiresAuth: true },
  { name: 'My Roster', href: '/roster-2', icon: CalendarDays, requiresAuth: true },
  { name: 'Shift Swaps', href: '/shift-swaps', icon: ArrowLeftRight, requiresAuth: true },
  { name: 'Browse Swaps', href: '/swaps-list', icon: List, requiresAuth: true }, 
  { name: 'Leave Swaps', href: '/leave-swaps', icon: Calendar, requiresAuth: true },
  { name: 'Swap Preferences', href: '/swap-preferences', icon: UserCog, requiresAuth: true },
  { name: 'FAQ', href: '/faq', icon: FileQuestion, requiresAuth: false },
];

// Admin navigation items
const adminNavigation = [
  { name: 'Admin Panel', href: '/admin', icon: Users, requiresAuth: true },
  { name: 'Admin Dashboard', href: '/admin-dashboard', icon: Database, requiresAuth: true },
  { name: 'System Settings', href: '/system-settings', icon: Settings, requiresAuth: true }
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    // Log auth status for debugging
    console.log("AppLayout - Auth status:", { 
      isAdmin, 
      userEmail: user?.email,
      userMetadata: user?.app_metadata
    });
  }, [user, isAdmin]);
  
  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <>
      <div className="min-h-full">
        <Transition.Root show={sidebarOpen} as={Fragment}>
          <Dialog as="div" className="relative z-40 lg:hidden" onClose={setSidebarOpen}>
            <Transition.Child
              as={Fragment}
              enter="transition-opacity ease-linear duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="transition-opacity ease-linear duration-300"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
            </Transition.Child>

            <div className="fixed inset-0 z-40 flex">
              <Transition.Child
                as={Fragment}
                enter="transition ease-in-out duration-300 transform"
                enterFrom="-translate-x-full"
                enterTo="translate-x-0"
                leave="transition ease-in-out duration-300 transform"
                leaveFrom="translate-x-0"
                leaveTo="-translate-x-full"
              >
                <Dialog.Panel className="relative flex w-full max-w-xs flex-1 flex-col bg-white">
                  <Transition.Child
                    as={Fragment}
                    enter="ease-in-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in-out duration-300"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                    <div className="absolute top-0 right-0 -mr-12 pt-2">
                      <button
                        type="button"
                        className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                        onClick={() => setSidebarOpen(false)}
                      >
                        <span className="sr-only">Close sidebar</span>
                        <X className="h-6 w-6 text-white" aria-hidden="true" />
                      </button>
                    </div>
                  </Transition.Child>
                  <div className="h-0 flex-1 overflow-y-auto pt-5 pb-4">
                    <div className="flex flex-shrink-0 items-center px-4">
                      <div className="flex items-center">
                        <div className="h-8 w-8 bg-indigo-600 rounded-md flex items-center justify-center text-white font-bold mr-2">SF</div>
                        <span className="text-lg font-semibold text-gray-900">ShiftFlex</span>
                      </div>
                    </div>
                    <nav className="mt-5 space-y-1">
                      {navigation.map((item) =>
                        (!item.requiresAuth || user) ? (
                          <Link
                            key={item.name}
                            to={item.href}
                            className={classNames(
                              location.pathname === item.href ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                              'group flex items-center px-3 py-2 text-base font-medium rounded-md'
                            )}
                          >
                            <item.icon
                              className={classNames(
                                location.pathname === item.href ? 'text-gray-500' : 'text-gray-400 group-hover:text-gray-500',
                                'mr-4 flex-shrink-0 h-6 w-6'
                              )}
                              aria-hidden="true"
                            />
                            {item.name}
                          </Link>
                        ) : null
                      )}

                      {/* Admin navigation items in mobile sidebar */}
                      {isAdmin && (
                        <>
                          <div className="mt-6 mb-2 px-3 text-xs font-semibold text-gray-500">
                            ADMIN SECTION
                          </div>
                          {adminNavigation.map((item) => (
                            <Link
                              key={item.name}
                              to={item.href}
                              className={classNames(
                                location.pathname === item.href ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                                'group flex items-center px-3 py-2 text-base font-medium rounded-md'
                              )}
                            >
                              <item.icon
                                className={classNames(
                                  location.pathname === item.href ? 'text-gray-500' : 'text-gray-400 group-hover:text-gray-500',
                                  'mr-4 flex-shrink-0 h-6 w-6'
                                )}
                                aria-hidden="true"
                              />
                              {item.name}
                            </Link>
                          ))}
                        </>
                      )}
                    </nav>
                  </div>
                  <div className="flex flex-shrink-0 border-t border-gray-200 p-4">
                    {user ? (
                      <div className="group block flex-shrink-0">
                        <div className="flex items-center">
                          <div>
                            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold">
                              {user?.email?.substring(0, 2).toUpperCase() || 'U'}
                            </div>
                          </div>
                          <div className="ml-3">
                            <p className="text-base font-medium text-gray-700 group-hover:text-gray-900">{user.email}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <Link to="/login" className="group block flex-shrink-0">
                        <div className="flex items-center">
                          <div className="ml-3">
                            <p className="text-base font-medium text-gray-700 group-hover:text-gray-900">Not signed in</p>
                            <p className="text-sm font-medium text-gray-500 group-hover:text-gray-700">
                              Sign in
                            </p>
                          </div>
                        </div>
                      </Link>
                    )}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
              <div className="w-14 flex-shrink-0" aria-hidden="true">
                {/* Force sidebar to shrink to fit close icon */}
              </div>
            </div>
          </Dialog>
        </Transition.Root>

        {/* Static sidebar for desktop - use our separate Sidebar component */}
        <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
          {/* Import actual Sidebar component */}
          <div className="flex flex-grow flex-col overflow-y-auto bg-white border-r border-gray-200">
            <div className="flex flex-grow flex-col">
              <nav className="flex-1 mt-5 space-y-1 bg-white">
                {navigation.map((item) =>
                  (!item.requiresAuth || user) ? (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={classNames(
                        location.pathname === item.href ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                        'group flex items-center px-3 py-2 text-sm font-medium rounded-md'
                      )}
                    >
                      <item.icon
                        className={classNames(
                          location.pathname === item.href ? 'text-gray-500' : 'text-gray-400 group-hover:text-gray-500',
                          'mr-3 flex-shrink-0 h-6 w-6'
                        )}
                        aria-hidden="true"
                      />
                      {item.name}
                    </Link>
                  ) : null
                )}

                {/* Admin navigation items if user is admin */}
                {isAdmin && (
                  <>
                    <div className="mt-6 mb-2 px-3 text-xs font-semibold text-gray-500">
                      ADMIN SECTION
                    </div>
                    {adminNavigation.map((item) => (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={classNames(
                          location.pathname === item.href ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                          'group flex items-center px-3 py-2 text-sm font-medium rounded-md'
                        )}
                      >
                        <item.icon
                          className={classNames(
                            location.pathname === item.href ? 'text-gray-500' : 'text-gray-400 group-hover:text-gray-500',
                            'mr-3 flex-shrink-0 h-6 w-6'
                          )}
                          aria-hidden="true"
                        />
                        {item.name}
                      </Link>
                    ))}
                  </>
                )}
              </nav>
            </div>
          </div>
        </div>
        <div className="lg:pl-64 flex flex-col flex-1">
          <div className="relative z-10 flex h-16 shrink-0 bg-white border-b border-gray-200">
            {/* Left side of header: Logo and burger menu */}
            <div className="flex items-center">
              <button
                type="button"
                className="px-4 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <span className="sr-only">Open sidebar</span>
                <Menu className="h-6 w-6" aria-hidden="true" />
              </button>
              
              {/* Logo - visible on all screens */}
              <Link to="/" className="flex items-center ml-2 lg:ml-4">
                <div className="h-8 w-8 bg-indigo-600 rounded-md flex items-center justify-center text-white font-bold mr-2">
                  SF
                </div>
                <span className="text-lg font-semibold text-gray-900">ShiftFlex</span>
              </Link>
            </div>
            
            {/* Right side of header: Settings and Logout buttons */}
            <div className="ml-auto flex items-center pr-4">
              {user && (
                <>
                  <Link 
                    to="/settings" 
                    className="p-2 text-gray-500 hover:text-gray-700 mr-2"
                    aria-label="Settings"
                  >
                    <Settings className="h-5 w-5" />
                  </Link>
                  
                  <Button
                    variant="ghost"
                    className="text-gray-500 hover:text-gray-700"
                    onClick={handleSignOut}
                    aria-label="Sign out"
                  >
                    <LogOut className="h-5 w-5" />
                  </Button>
                </>
              )}
            </div>
          </div>

          <main className="flex-1">
            <div className="py-6">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {user && <EmailDomainWarning />}
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  )
}

export default AppLayout;
