import { useAuth } from './contexts/AuthContext';
import LoginPage from './components/LoginPage';
import AdminDashboard from './components/admin/AdminDashboard';
import WorkerPortal from './components/worker/WorkerPortal';

function App() {
  const { user, userRole, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  if (userRole === 'admin') {
    return <AdminDashboard />;
  }

  if (userRole === 'worker') {
    return <WorkerPortal />;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-md">
        <p className="text-gray-600 mb-4">No se pudo determinar el rol del usuario</p>
        <div className="text-sm text-left mb-4 p-4 bg-gray-50 rounded">
          <p className="font-semibold mb-2">Información de depuración:</p>
          <p><span className="font-medium">Usuario autenticado:</span> {user ? 'Sí' : 'No'}</p>
          {user && <p><span className="font-medium">Email:</span> {user.email}</p>}
          {user && <p><span className="font-medium">ID:</span> {user.id}</p>}
          <p><span className="font-medium">Rol detectado:</span> {userRole || 'null'}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => window.location.reload()}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Recargar
          </button>
          <button
            onClick={() => signOut()}
            className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
