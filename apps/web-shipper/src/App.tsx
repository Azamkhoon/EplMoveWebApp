import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Login } from "@/pages/Login";
import { useAuth } from "@/api/AuthContext";

const Dashboard = lazy(() => import("@/pages/Dashboard").then((module) => ({ default: module.Dashboard })));
const Shipments = lazy(() => import("@/pages/Shipments").then((module) => ({ default: module.Shipments })));
const ShipmentDetail = lazy(() => import("@/pages/ShipmentDetail").then((module) => ({ default: module.ShipmentDetail })));
const Quotation = lazy(() => import("@/pages/Quotation").then((module) => ({ default: module.Quotation })));
const LoadCalculator = lazy(() => import("@/pages/LoadCalculator").then((module) => ({ default: module.LoadCalculator })));
const PostLoad = lazy(() => import("@/pages/PostLoad").then((module) => ({ default: module.PostLoad })));
const Marketplace = lazy(() => import("@/pages/Marketplace").then((module) => ({ default: module.Marketplace })));
const Documents = lazy(() => import("@/pages/Documents").then((module) => ({ default: module.Documents })));
const RateEstimator = lazy(() => import("@/pages/RateEstimator").then((module) => ({ default: module.RateEstimator })));
const Invoices = lazy(() => import("@/pages/Invoices").then((module) => ({ default: module.Invoices })));
const Settings = lazy(() => import("@/pages/Settings").then((module) => ({ default: module.Settings })));
const Tracking = lazy(() => import("@/pages/Tracking").then((module) => ({ default: module.Tracking })));
const NotFound = lazy(() => import("@/pages/NotFound").then((module) => ({ default: module.NotFound })));

export default function App() {
  const auth = useAuth();

  if (auth.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-400">
        <Loader2 className="animate-spin" />
      </div>
    );
  }
  if (!auth.live) return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div role="status" className="max-w-md rounded-2xl bg-white p-8 shadow">
        <h1 className="text-xl font-semibold">EPL Move</h1>
        <p className="mt-3 text-slate-600">This portal is awaiting service activation. Registration and sign-in are temporarily unavailable.</p>
      </div>
    </main>
  );
  if (!auth.authed) return <Login />;

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-400">
          <Loader2 className="animate-spin" />
        </div>
      }
    >
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="shipments" element={<Shipments />} />
          <Route path="shipments/:id" element={<ShipmentDetail />} />
          <Route path="post-load" element={<PostLoad />} />
          <Route path="marketplace" element={<Marketplace />} />
          <Route path="documents" element={<Documents />} />
          <Route path="rate-estimator" element={<RateEstimator />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="settings" element={<Settings />} />
          <Route path="quotation" element={<Quotation />} />
          <Route path="load-calculator" element={<LoadCalculator />} />
          <Route path="tracking" element={<Tracking />} />
          <Route path="tracking/:id" element={<Tracking />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
