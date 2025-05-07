
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, ShieldX } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const UserRoleIndicator = () => {
  const { isAdmin, user } = useAuth();

  return (
    <div className="flex items-center gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={isAdmin ? "default" : "outline"} 
            className={`flex items-center gap-1 px-2 py-1 ${isAdmin ? 'bg-green-600 hover:bg-green-700 text-white' : 'text-muted-foreground'}`}
          >
            {isAdmin ? (
              <>
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Admin</span>
              </>
            ) : (
              <>
                <ShieldX className="h-3.5 w-3.5" />
                <span>User</span>
              </>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {isAdmin 
              ? 'You have administrator privileges' 
              : 'You have regular user privileges'}
          </p>
          <p className="text-xs mt-1 text-gray-400">User ID: {user?.id?.substring(0, 8)}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
};

export default UserRoleIndicator;
