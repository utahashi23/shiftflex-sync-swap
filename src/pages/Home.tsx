
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Home = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-6">
      <h1 className="text-4xl font-bold mb-6">ShiftSwapper</h1>
      <p className="text-xl mb-8 text-center">
        The easiest way to manage and swap your work shifts
      </p>
      <div className="flex gap-4">
        <Button asChild variant="default">
          <Link to="/login">Sign In</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/dashboard">Dashboard</Link>
        </Button>
      </div>
    </div>
  );
};

export default Home;
