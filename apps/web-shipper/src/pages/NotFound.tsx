import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-navy-50 text-navy-700">
        <Compass size={28} />
      </span>
      <h1 className="mt-5 text-2xl font-bold text-slate-900">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        The page you’re looking for doesn’t exist or has moved.
      </p>
      <Link to="/" className="mt-5">
        <Button>Back to Dashboard</Button>
      </Link>
    </div>
  );
}
