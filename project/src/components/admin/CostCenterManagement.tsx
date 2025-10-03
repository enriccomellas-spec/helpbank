import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, CreditCard as Edit2, Trash2, FolderTree } from 'lucide-react';

interface CostCenter {
  id: string;
  name: string;
  code: string;
  description: string | null;
}

export default function CostCenterManagement() {
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCenter, setEditingCenter] = useState<CostCenter | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    loadCostCenters();
  }, []);

  async function loadCostCenters() {
    const { data, error } = await supabase
      .from('cost_centers')
      .select('*')
      .order('name');

    if (!error && data) {
      setCostCenters(data);
    }
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingCenter) {
        const { error } = await supabase
          .from('cost_centers')
          .update({
            name: formData.name,
            description: formData.description || null,
          })
          .eq('id', editingCenter.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('cost_centers')
          .insert({
            name: formData.name,
            code: formData.name.substring(0, 10).toUpperCase(),
            description: formData.description || null,
          });

        if (error) throw error;
      }

      setShowModal(false);
      resetForm();
      loadCostCenters();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error al guardar centro de costo');
    } finally {
      setLoading(false);
    }
  }

  async function deleteCostCenter(id: string) {
    if (confirm('¿Está seguro de eliminar este centro de costo?')) {
      const { error } = await supabase
        .from('cost_centers')
        .delete()
        .eq('id', id);

      if (!error) {
        loadCostCenters();
      } else {
        alert('No se puede eliminar. Puede tener trabajadores o documentos asociados.');
      }
    }
  }

  function openEditModal(center: CostCenter) {
    setEditingCenter(center);
    setFormData({
      name: center.name,
      description: center.description || '',
    });
    setShowModal(true);
  }

  function resetForm() {
    setFormData({
      name: '',
      description: '',
    });
    setEditingCenter(null);
  }

  if (loading && costCenters.length === 0) {
    return <div className="text-center py-8">Cargando centros de costo...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Centros de Costo</h2>
          <p className="text-gray-600 mt-1">Organice su empresa por departamentos o áreas</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
        >
          <Plus className="w-5 h-5" />
          <span>Nuevo Centro de Costo</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {costCenters.map((center) => (
          <div key={center.id} className="bg-white border rounded-lg p-6 hover:shadow-md transition">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <FolderTree className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{center.name}</h3>
                  <p className="text-sm text-gray-500">Código: {center.code}</p>
                </div>
              </div>
            </div>

            {center.description && (
              <p className="text-sm text-gray-600 mb-4">{center.description}</p>
            )}

            <div className="flex space-x-2 pt-4 border-t">
              <button
                onClick={() => openEditModal(center)}
                className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition"
              >
                <Edit2 className="w-4 h-4" />
                <span>Editar</span>
              </button>
              <button
                onClick={() => deleteCostCenter(center.id)}
                className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
              >
                <Trash2 className="w-4 h-4" />
                <span>Eliminar</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {costCenters.length === 0 && !loading && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FolderTree className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No hay centros de costo registrados</p>
          <p className="text-sm text-gray-500 mt-1">Cree uno para comenzar a organizar su empresa</p>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {editingCenter ? 'Editar Centro de Costo' : 'Nuevo Centro de Costo'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Reparto
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: Reparto Norte"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Descripción opcional del reparto"
                />
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
    </div>
  );
}
