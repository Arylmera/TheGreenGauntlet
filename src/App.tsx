import { AdminPage } from './pages/Admin';
import { PublicDashboard } from './pages/PublicDashboard';

export function App() {
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
    return <AdminPage />;
  }
  return <PublicDashboard />;
}
