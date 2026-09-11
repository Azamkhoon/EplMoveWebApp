import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "@/api/AuthContext";
import { Shell } from "@/components/layout/Shell";
import { Login } from "@/pages/Login";
import { Dashboard } from "@/pages/Dashboard";
import { Declarations } from "@/pages/Declarations";
import { Shipments } from "@/pages/Shipments";
import { Clients } from "@/pages/Clients";
import { HsCodes } from "@/pages/HsCodes";
import { DutyCalculator } from "@/pages/DutyCalculator";
import { Documents } from "@/pages/Documents";
import { Financials } from "@/pages/Financials";
import { Analytics } from "@/pages/Analytics";

function Guard() {
  const { authed, loading, live } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
      </div>
    );
  }
  if (!live || authed) {
    return (
      <Routes>
        <Route element={<Shell />}>
          <Route index             element={<Dashboard />}      />
          <Route path="declarations" element={<Declarations />} />
          <Route path="shipments"    element={<Shipments />}    />
          <Route path="clients"      element={<Clients />}      />
          <Route path="hs-codes"     element={<HsCodes />}      />
          <Route path="duty-calc"    element={<DutyCalculator />} />
          <Route path="documents"    element={<Documents />}    />
          <Route path="financials"   element={<Financials />}   />
          <Route path="analytics"    element={<Analytics />}    />
          <Route path="*"            element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    );
  }
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="*"      element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter
      future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
    >
      <AuthProvider>
        <Guard />
      </AuthProvider>
    </BrowserRouter>
  );
}
