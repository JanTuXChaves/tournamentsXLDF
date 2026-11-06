import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import RequireAuth from './components/RequireAuth';

import DashboardLayout from './components/DashboardLayout';
import Dashboard from './pages/Dashboard';
import AtletasList from './pages/AtletasList';
import AtletaProfile from './pages/AtletaProfile';
import AtletaForm from './pages/AtletaForm';
import EventosList from './pages/EventosList';
import EventoDetail from './pages/EventoDetail';
import EventoForm from './pages/EventoForm';
import EntidadeProfile from './pages/EntidadeProfile';
import EntidadesList from './pages/EntidadesList';
import UsuariosList from './pages/UsuariosList';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Placar from './pages/Placar';
import PlacarControle from './pages/PlacarControle';
import EntidadeFinanceiro from './pages/EntidadeFinanceiro';
import AdminFinanceiro from './pages/AdminFinanceiro';
import Ranking from './pages/Ranking';
import CategoriasList from './pages/CategoriasList';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/placar" element={<RequireAuth><Placar /></RequireAuth>} />
        <Route path="/placar/controle" element={<RequireAuth><PlacarControle /></RequireAuth>} />

        <Route
          path="/"
          element={
            <RequireAuth>
              <DashboardLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="minha-entidade" element={<EntidadeProfile />} />
          <Route path="entidades" element={<EntidadesList />} />
          <Route path="entidades/:id" element={<EntidadeProfile />} />
          <Route path="entidades/:id/financeiro" element={<EntidadeFinanceiro />} />
          <Route path="financeiro" element={<EntidadeFinanceiro />} />
          <Route path="admin/financeiro" element={<AdminFinanceiro />} />
          <Route path="usuarios" element={<UsuariosList />} />
          <Route path="atletas" element={<AtletasList />} />
          <Route path="atletas/novo" element={<AtletaForm />} />
          <Route path="atletas/:id" element={<AtletaProfile />} />
          <Route path="eventos" element={<EventosList />} />
          <Route path="eventos/novo" element={<EventoForm />} />
          <Route path="eventos/:id" element={<EventoDetail />} />
          <Route path="eventos/:id/editar" element={<EventoForm />} />
          <Route path="ranking" element={<Ranking />} />
          <Route path="categorias" element={<CategoriasList />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
