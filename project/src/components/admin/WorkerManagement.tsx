import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, CreditCard as Edit2, Trash2, UserCheck, UserX, Search, Upload } from 'lucide-react';
import BulkWorkerUpload from './BulkWorkerUpload';

interface Worker {
  id: string;
  full_name: string;
  rut: string;
  phone: string | null;
  email: string;
  role: string;
  cost_center_id: string | null;
  cost_centers: { name: string } | null;
  document_count?: number;
}

interface CostCenter {
  id: string;
  name: string;
  code: string;
}

export default function WorkerManagement() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    full_name: '',
    rut: '',
    phone: '',
    email: '',
    password: '',
    cost_center_id: '',
  });

  useEffect(() => {
    loadWorkers();
    loadCostCenters();
  }, []);

  async function loadWorkers() {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, full_name, rut, phone, email, role, cost_center_id, cost_centers(name)')
      .eq('role', 'worker')
      .order('full_name');

    if (!error && data) {
      // Load document counts for each worker
      const workersWithCounts = await Promise.all(
        data.map(async (worker) => {
          const { count } = await supabase
            .from('documents')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', worker.id);

          return { ...worker, document_count: count || 0 };
        })
      );

      setWorkers(workersWithCounts);
    }
    setLoading(false);
  }

  async function loadCostCenters() {
    const { data } = await supabase
      .from('cost_centers')
      .select('*')
      .order('name');

    if (data) {
      setCostCenters(data);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;

      if (!token) throw new Error('No autorizado');

      if (editingWorker) {
        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-worker`;

        const updatePayload: Record<string, unknown> = {
          worker_id: editingWorker.id,
          full_name: formData.full_name,
          rut: formData.rut,
          phone: formData.phone || null,
          cost_center_id: formData.cost_center_id || null,
        };

        if (formData.password && formData.password.length >= 6) {
          updatePayload.password = formData.password;
        }

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatePayload),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Error al actualizar trabajador');
        }
      } else {
        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-worker`;

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            full_name: formData.full_name,
            rut: formData.rut,
            phone: formData.phone || null,
            cost_center_id: formData.cost_center_id || null,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          console.error('Error response:', result);
          throw new Error(result.error || 'Error al crear trabajador');
        }
      }

      setShowModal(false);
      resetForm();
      loadWorkers();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error al guardar trabajador');
    } finally {
      setLoading(false);
    }
  }

  async function toggleWorkerStatus(worker: Worker) {
    alert('Esta función estará disponible próximamente');
  }

  async function deleteWorker(id: string) {
    if (confirm('¿Está seguro de eliminar este trabajador?')) {
      try {
        const { data: session } = await supabase.auth.getSession();
        const token = session.session?.access_token;

        if (!token) throw new Error('No autorizado');

        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-worker`;

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ worker_id: id }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Error al eliminar trabajador');
        }

        loadWorkers();
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Error al eliminar trabajador');
      }
    }
  }

  function openEditModal(worker: Worker) {
    setEditingWorker(worker);
    setFormData({
      full_name: worker.full_name,
      rut: worker.rut,
      phone: worker.phone || '',
      email: worker.email,
      password: '',
      cost_center_id: worker.cost_center_id || '',
    });
    setShowModal(true);
  }

  function resetForm() {
    setFormData({
      full_name: '',
      rut: '',
      phone: '',
      email: '',
      password: '',
      cost_center_id: '',
    });
    setEditingWorker(null);
  }

  const filteredWorkers = workers.filter(worker =>
    worker.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    worker.rut.includes(searchTerm) ||
    worker.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && workers.length === 0) {
    return <div className="text-center py-8">Cargando trabajadores...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Trabajadores</h2>
          <p className="text-gray-600 mt-1">Administre los trabajadores de su empresa</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowBulkUpload(true)}
            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition"
          >
            <Upload className="w-5 h-5" />
            <span>Carga Masiva</span>
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
          >
            <Plus className="w-5 h-5" />
            <span>Nuevo Trabajador</span>
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Buscar por nombre, RUT o email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Trabajador
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                RUT
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Centro de Costo
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Documentos
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredWorkers.map((worker) => (
              <tr key={worker.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{worker.full_name}</div>
                    <div className="text-sm text-gray-500">{worker.email}</div>
                    {worker.phone && <div className="text-sm text-gray-500">{worker.phone}</div>}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">{worker.rut}</td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {worker.cost_centers?.name || 'Sin asignar'}
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    {worker.document_count || 0}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Activo
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-sm font-medium space-x-2">
                  <button
                    onClick={() => toggleWorkerStatus(worker)}
                    className="text-gray-600 hover:text-gray-900 inline-flex items-center"
                    title={worker.is_active ? 'Desactivar' : 'Activar'}
                  >
                    {worker.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => openEditModal(worker)}
                    className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteWorker(worker.id)}
                    className="text-red-600 hover:text-red-900 inline-flex items-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {editingWorker ? 'Editar Trabajador' : 'Nuevo Trabajador'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">RUT</label>
                <input
                  type="text"
                  required
                  value={formData.rut}
                  onChange={(e) => setFormData({ ...formData, rut: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="12.345.678-9"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {editingWorker && (
                  <p className="text-xs text-gray-500 mt-1">
                    Cambiar el email actualizará las credenciales de acceso
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {editingWorker ? 'Nueva Contraseña (dejar en blanco para no cambiar)' : 'Contraseña'}
                </label>
                <input
                  type="password"
                  required={!editingWorker}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  minLength={6}
                  placeholder={editingWorker ? 'Dejar en blanco para no cambiar' : ''}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Centro de Costo
                </label>
                <select
                  value={formData.cost_center_id}
                  onChange={(e) => setFormData({ ...formData, cost_center_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Sin asignar</option>
                  {costCenters.map((cc) => (
                    <option key={cc.id} value={cc.id}>
                      {cc.name} ({cc.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBulkUpload && (
        <BulkWorkerUpload
          onClose={() => setShowBulkUpload(false)}
          onSuccess={() => {
            loadWorkers();
          }}
          costCenters={costCenters}
        />
      )}
    </div>
  );
}
