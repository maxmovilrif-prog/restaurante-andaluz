import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import AdminLogin from './pages/AdminLogin';
import StaffConsumption from './pages/StaffConsumption';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Invoices from './pages/Invoices';
import Reports from './pages/Reports';
import StaffManagement from './pages/StaffManagement';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/staff" element={<StaffConsumption />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/admin" element={<Dashboard />} />
          <Route path="/admin/inventario" element={<Inventory />} />
          <Route path="/admin/facturas" element={<Invoices />} />
          <Route path="/admin/informes" element={<Reports />} />
          <Route path="/admin/personal" element={<StaffManagement />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
