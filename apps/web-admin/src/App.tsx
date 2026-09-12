import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "@/api/AuthContext";
import { Shell } from "@/components/layout/Shell";
import { Login } from "@/pages/Login";
import { Overview } from "@/pages/Overview";
import { Tenants } from "@/pages/Tenants";
import { Users } from "@/pages/Users";
import { Shipments } from "@/pages/Shipments";
import { Invoices } from "@/pages/Invoices";
import { Health } from "@/pages/Health";
import { AuditLog } from "@/pages/AuditLog";
import { Analytics } from "@/pages/Analytics";

function Guard() {
  const { authed, loading, live } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }
  if (!live) return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div role="status" className="max-w-md rounded-2xl bg-white p-8 shadow">
        <h1 className="text-xl font-semibold">EPL Move</h1>
        <p className="mt-3 text-slate-600">This portal is awaiting service activation. Registration and sign-in are temporarily unavailable.</p>
      </div>
    </main>
  );
  if (authed) {
    return (
      <Routes>
        <Route element={<Shell />}>
          <Route index              element={<Overview />}   />
          <Route path="tenants"     element={<Tenants />}    />
          <Route path="users"       element={<Users />}      />
          <Route path="shipments"   element={<Shipments />}  />
          <Route path="invoices"    element={<Invoices />}   />
          <Route path="health"      element={<Health />}     />
          <Route path="audit"       element={<AuditLog />}   />
          <Route path="analytics"   element={<Analytics />}  />
          <Route path="*"           element={<Navigate to="/" replace />} />
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
