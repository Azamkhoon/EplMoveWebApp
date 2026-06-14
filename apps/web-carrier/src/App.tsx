import { Navigate, Route, Routes } from "react-router-dom";
import { Loader2, PlugZap } from "lucide-react";
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

  if (!auth.live) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-100 p-6 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-slate-400 shadow-card">
          <PlugZap size={22} />
        </span>
        <p className="text-sm font-semibold text-slate-700">Backend not configured</p>
        <p className="max-w-sm text-sm text-slate-500">
          Set <code className="rounded bg-slate-200 px-1.5 py-0.5 text-xs">VITE_API_URL</code> to the EPL Move
          gateway to use the carrier portal.
        </p>
      </div>
    );
  }

  if (auth.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-400">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

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
