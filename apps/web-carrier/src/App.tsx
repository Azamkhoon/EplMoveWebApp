import { Navigate, Route, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Shell } from "@/components/layout/Shell";
import { Dashboard }   from "@/pages/Dashboard";
import { Marketplace } from "@/pages/Marketplace";
import { MyBids }      from "@/pages/MyBids";
import { Dispatch }    from "@/pages/Dispatch";
import { Fleet }       from "@/pages/Fleet";
import { Drivers }     from "@/pages/Drivers";
import { Shipments }   from "@/pages/Shipments";
import { Financials }  from "@/pages/Financials";
import { Analytics }   from "@/pages/Analytics";
import { Login }       from "@/pages/Login";
import { useAuth }     from "@/api/AuthContext";

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
    <Routes>
      <Route element={<Shell />}>
        <Route index            element={<Dashboard />}   />
        <Route path="dispatch"  element={<Dispatch />}    />
        <Route path="shipments" element={<Shipments />}   />
        <Route path="marketplace" element={<Marketplace />} />
        <Route path="bids"      element={<MyBids />}      />
        <Route path="fleet"     element={<Fleet />}       />
        <Route path="drivers"   element={<Drivers />}     />
        <Route path="financials" element={<Financials />} />
        <Route path="analytics" element={<Analytics />}   />
        <Route path="*"         element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
