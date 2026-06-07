import { Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Dashboard } from "@/pages/Dashboard";
import { Shipments } from "@/pages/Shipments";
import { ShipmentDetail } from "@/pages/ShipmentDetail";
import { Tracking } from "@/pages/Tracking";
import { Quotation } from "@/pages/Quotation";
import { LoadCalculator } from "@/pages/LoadCalculator";
import { NotFound } from "@/pages/NotFound";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="shipments" element={<Shipments />} />
        <Route path="shipments/:id" element={<ShipmentDetail />} />
        <Route path="tracking" element={<Tracking />} />
        <Route path="tracking/:id" element={<Tracking />} />
        <Route path="quotation" element={<Quotation />} />
        <Route path="load-calculator" element={<LoadCalculator />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
