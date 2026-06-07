import { Route, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Dashboard } from "@/pages/Dashboard";
import { Shipments } from "@/pages/Shipments";
import { ShipmentDetail } from "@/pages/ShipmentDetail";
import { Tracking } from "@/pages/Tracking";
import { Quotation } from "@/pages/Quotation";
import { LoadCalculator } from "@/pages/LoadCalculator";
import { PostLoad } from "@/pages/PostLoad";
import { Marketplace } from "@/pages/Marketplace";
import { Documents } from "@/pages/Documents";
import { LiveTracking } from "@/pages/LiveTracking";
import { Login } from "@/pages/Login";
import { NotFound } from "@/pages/NotFound";
import { useAuth } from "@/api/AuthContext";

export default function App() {
  const auth = useAuth();

  // Live mode: gate the whole app behind authentication.
  if (auth.live && auth.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-400">
        <Loader2 className="animate-spin" />
      </div>
    );
  }
  if (auth.live && !auth.authed) return <Login />;

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="shipments" element={<Shipments />} />
        <Route path="shipments/:id" element={<ShipmentDetail />} />
        <Route path="post-load" element={<PostLoad />} />
        <Route path="marketplace" element={<Marketplace />} />
        <Route path="documents" element={<Documents />} />
        <Route path="live-tracking" element={<LiveTracking />} />
        <Route path="tracking" element={<Tracking />} />
        <Route path="tracking/:id" element={<Tracking />} />
        <Route path="quotation" element={<Quotation />} />
        <Route path="load-calculator" element={<LoadCalculator />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
