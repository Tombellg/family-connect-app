import { Navigate, Route, Routes } from 'react-router-dom';
import { useEffect, type ReactElement } from 'react';
import { useAuthStore } from './store/authStore';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import LoadingScreen from './components/common/LoadingScreen';

function RequireAuth({ children }: { children: ReactElement }) {
  const { user, initialized } = useAuthStore();
  if (!initialized) {
    return <LoadingScreen message="Initialisation" />;
  }
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  return children;
}

export default function App() {
  const { initialized, bootstrap, user } = useAuthStore();

  useEffect(() => {
    if (!initialized) {
      void bootstrap();
    }
  }, [initialized, bootstrap]);

  if (!initialized) {
    return <LoadingScreen message="Connexion au tableau de bord" />;
  }

  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <DashboardPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to={user ? '/' : '/auth'} replace />} />
    </Routes>
  );
}
