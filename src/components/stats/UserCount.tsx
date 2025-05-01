
import { useUserCount } from '@/hooks/useUserCount';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users } from "lucide-react";

const UserCount = () => {
  const { userCount, isLoading } = useUserCount();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
        <Users className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <div className="text-2xl font-bold">{userCount !== null ? userCount : 'N/A'}</div>
        )}
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground">
          Total registered users in the application
        </p>
      </CardFooter>
    </Card>
  );
};

export default UserCount;
