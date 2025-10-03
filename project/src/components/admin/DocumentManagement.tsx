import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Upload, FileText, Download, Trash2, Search, UploadCloud } from 'lucide-react';
import BulkDocumentUpload from './BulkDocumentUpload';

interface Document {
  id: string;
  title: string;
  description: string | null;
  category?: string | null;
  file_name: string;
  file_url: string;
  file_size: number;
  file_type: string;
  created_at: string;
  user_id: string | null;
  cost_center_id: string | null;
  assigned_to_name?: string;
  cost_center_name?: string;
}

interface Worker {
  id: string;
  full_name: string;
  email: string;
}

interface CostCenter {
  id: string;
  name: string;
}

export default function DocumentManagement() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    user_id: '',
    cost_center_id: '',
    file: null as File | null,
  });

  useEffect(() => {
    loadDocuments();
    loadWorkers();
    loadCostCenters();
  }, []);

  async function loadDocuments() {
    setLoading(true);

    const { data: docs, error } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading documents:', error);
      setLoading(false);
      return;
    }

    if (docs) {
      const docsWithNames = await Promise.all(
        docs.map(async (doc) => {
          let assigned_to_name = 'Todos';
          let cost_center_name = null;

          if (doc.user_id) {
            const { data: user } = await supabase
              .from('user_profiles')
              .select('full_name')
              .eq('id', doc.user_id)
              .maybeSingle();
            if (user) assigned_to_name = user.full_name;
          }

          if (doc.cost_center_id) {
            const { data: cc } = await supabase
              .from('cost_centers')
              .select('name')
              .eq('id', doc.cost_center_id)
              .maybeSingle();
            if (cc) {
              cost_center_name = cc.name;
              if (!doc.user_id) {
                assigned_to_name = cc.name;
              }
            }
          }

          return {
            ...doc,
            assigned_to_name,
            cost_center_name
          };
        })
      );

      setDocuments(docsWithNames);
    }

    setLoading(false);
  }

  async function loadWorkers() {
    const { data } = await supabase
      .from('user_profiles')
      .select('id, full_name, email')
      .eq('role', 'worker')
      .order('full_name');

    if (data) {
      setWorkers(data);
    }
  }

  async function loadCostCenters() {
    const { data } = await supabase
      .from('cost_centers')
      .select('id, name')
      .order('name');

    if (data) {
      setCostCenters(data);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.file) {
      alert('Seleccione un archivo');
      return;
    }

    setUploading(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user.id;

      const fileExt = formData.file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `public/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, formData.file);

      if (uploadError) throw uploadError;

      const { data: fileData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      const { error: insertError } = await supabase
        .from('documents')
        .insert({
          title: formData.title,
          description: formData.description || null,
          category: formData.category || null,
          file_name: formData.file.name,
          file_url: fileData.publicUrl,
          file_size: formData.file.size,
          file_type: formData.file.type,
          user_id: formData.user_id || null,
          cost_center_id: formData.cost_center_id || null,
          uploaded_by: userId!,
        });

      if (insertError) throw insertError;

      setShowModal(false);
      resetForm();
      loadDocuments();
      alert('Documento subido exitosamente');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error al subir documento');
    } finally {
      setUploading(false);
    }
  }

  async function downloadDocument(doc: Document) {
    try {
      const a = document.createElement('a');
      a.href = doc.file_url;
      a.download = doc.file_name;
      a.target = '_blank';
      a.click();
    } catch (error) {
      alert('Error al descargar el documento');
    }
  }

  async function deleteDocument(doc: Document) {
    if (confirm('¿Está seguro de eliminar este documento?')) {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id);

      if (!error) {
        loadDocuments();
      } else {
        alert('Error al eliminar el documento: ' + error.message);
      }
    }
  }

  function resetForm() {
    setFormData({
      title: '',
      description: '',
      category: '',
      user_id: '',
      cost_center_id: '',
      file: null,
    });
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  const filteredDocuments = documents.filter(doc => {
    return doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
           doc.file_name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Documentos</h2>
          <p className="text-gray-600 mt-1">Suba y administre documentos empresariales</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowBulkUpload(true)}
            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition"
          >
            <UploadCloud className="w-5 h-5" />
            <span>Carga Masiva</span>
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
          >
            <Upload className="w-5 h-5" />
            <span>Subir Documento</span>
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Buscar documentos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {loading ? (
        <div className="text-center py-8">Cargando documentos...</div>
      ) : filteredDocuments.length === 0 ? (
        <div className="bg-white rounded-lg border p-12 text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay documentos</h3>
          <p className="text-gray-500">
            {documents.length === 0
              ? 'Suba su primer documento usando el botón de arriba'
              : 'No se encontraron documentos que coincidan con su búsqueda'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Documento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categoría
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Asignado a
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tamaño
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDocuments.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{doc.title}</div>
                        <div className="text-sm text-gray-500">{doc.file_name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {doc.category && (
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        {doc.category === 'reuniones' && 'Reuniones'}
                        {doc.category === 'presentaciones' && 'Presentaciones'}
                        {doc.category === 'informes' && 'Informes'}
                        {doc.category === 'analisis' && 'Análisis'}
                        {doc.category === 'produccion' && 'Producción'}
                        {doc.category === 'otros' && 'Otros'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <div className="text-gray-900 font-medium">
                        {doc.assigned_to_name || 'Todos'}
                      </div>
                      {doc.user_id && doc.cost_center_name && (
                        <div className="text-xs text-gray-500">
                          {doc.cost_center_name}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatFileSize(doc.file_size)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(doc.created_at).toLocaleDateString('es-CL')}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium space-x-2">
                    <button
                      onClick={() => downloadDocument(doc)}
                      className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteDocument(doc)}
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
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Subir Documento</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Seleccione una categoría</option>
                  <option value="reuniones">Reuniones</option>
                  <option value="presentaciones">Presentaciones</option>
                  <option value="informes">Informes</option>
                  <option value="analisis">Análisis</option>
                  <option value="produccion">Producción</option>
                  <option value="otros">Otros</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Asignar a Trabajador (opcional)
                </label>
                <select
                  value={formData.user_id}
                  onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Ninguno</option>
                  {workers.map((worker) => (
                    <option key={worker.id} value={worker.id}>
                      {worker.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Asignar a Centro de Costo (opcional)
                </label>
                <select
                  value={formData.cost_center_id}
                  onChange={(e) => setFormData({ ...formData, cost_center_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Ninguno</option>
                  {costCenters.map((cc) => (
                    <option key={cc.id} value={cc.id}>
                      {cc.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Si no asigna a nadie, será visible para todos
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Archivo
                </label>
                <input
                  type="file"
                  required
                  onChange={(e) => setFormData({ ...formData, file: e.target.files?.[0] || null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Formatos: PDF, Word, Excel, PowerPoint
                </p>
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
                  disabled={uploading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {uploading ? 'Subiendo...' : 'Subir'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBulkUpload && (
        <BulkDocumentUpload
          onClose={() => setShowBulkUpload(false)}
          onSuccess={() => {
            loadDocuments();
          }}
          workers={workers}
        />
      )}
    </div>
  );
}
