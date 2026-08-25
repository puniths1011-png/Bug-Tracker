import { Routes, Route } from "react-router-dom";
import AcceptInvite from "../pages/AcceptInvite";

export default function AppRouter({ App }) {
  return (
    <Routes>
      <Route path="/admin" element={<App isAdminPage={true} />} />
      <Route path="/accept-invite" element={<AcceptInvite />} />
      <Route path="/*" element={<App isAdminPage={false} />} />
    </Routes>
  );
}
