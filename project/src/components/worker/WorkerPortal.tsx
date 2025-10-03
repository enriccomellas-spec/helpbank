import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, FileText, Download, Search, Filter, User, Calendar } from 'lucide-react';

interface Document {
  id: string;
  title: string;
  description: string | null;
  file_name: string;
  file_size: number;
  file_type: string;
  file_url: string;
  created_at: string;
}

interface Worker {
  full_name: string;
  email: string;
  phone: string | null;
  cost_centers: { name: string } | null;
}

const categories = [
  { value: 'reuniones', label: 'Reuniones' },
  { value: 'presentaciones', label: 'Presentaciones' },
  { value: 'informes', label: 'Informes' },
  { value: 'analisis', label: 'Análisis' },
  { value: 'produccion', label: 'Producción' },
  { value: 'otros', label: 'Otros' },
];

export default function WorkerPortal() {
  const { user, signOut } = useAuth();
  const [worker, setWorker] = useState<Worker | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [companyName, setCompanyName] = useState('Portal del Trabajador');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    loadCompanySettings();
    loadWorkerData();
    loadDocuments();
  }, []);

  async function loadCompanySettings() {
    const { data } = await supabase
      .from('company_settings')
      .select('name, logo_url')
      .maybeSingle();

    if (data) {
      setCompanyName(data.name);
      setLogoUrl(data.logo_url);
    }
  }

  async function loadWorkerData() {
    if (!user?.id) return;

    const { data } = await supabase
      .from('user_profiles')
      .select('full_name, email, phone, cost_centers(name)')
      .eq('id', user.id)
      .single();

    if (data) {
      setWorker(data);
    }
  }

  async function loadDocuments() {
    if (!user?.id) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setDocuments(data);
    }
    setLoading(false);
  }

  async function downloadDocument(doc: Document) {
    try {
      // Extract the path from the URL
      const urlParts = doc.file_url.split('/storage/v1/object/public/documents/');
      if (urlParts.length < 2) {
        throw new Error('URL de archivo inválida');
      }
      const filePath = urlParts[1];

      const { data, error } = await supabase.storage
        .from('documents')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      a.click();
      URL.revokeObjectURL(url);

      alert('Documento descargado exitosamente');
    } catch (error) {
      console.error('Error al descargar:', error);
      alert('Error al descargar el documento: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          doc.file_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filterCategory || doc.category === filterCategory;

    let matchesMonth = true;
    if (filterMonth) {
      const docDate = new Date(doc.created_at);
      const docMonth = `${docDate.getFullYear()}-${String(docDate.getMonth() + 1).padStart(2, '0')}`;
      matchesMonth = docMonth === filterMonth;
    }

    return matchesSearch && matchesCategory && matchesMonth;
  });

  const availableMonths = Array.from(new Set(
    documents.map(doc => {
      const date = new Date(doc.created_at);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    })
  )).sort().reverse();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="h-10 w-auto object-contain"
                />
              ) : (
                <div className="bg-blue-600 p-2 rounded-lg">
                  <FileText className="w-6 h-6 text-white" />
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold text-gray-900">{companyName}</h1>
                <p className="text-xs text-gray-500">Portal del Trabajador</p>
              </div>
            </div>
            <button
              onClick={() => signOut()}
              className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {worker && (
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl shadow-sm p-6 mb-6 border border-blue-200">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-600 p-3 rounded-full">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Hola {worker.full_name.split(' ')[0]}, bienvenida a tu gestor de documentación</h2>
                <p className="text-sm text-gray-700 mt-1">{worker.email}</p>
                <div className="flex gap-4 mt-2 text-sm text-gray-700">
                  {worker.phone && <p>📱 {worker.phone}</p>}
                  {worker.cost_centers && (
                    <p>🏢 {worker.cost_centers.name}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-6 border-b">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Mis Documentos</h2>

            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar documentos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white min-w-[180px]"
                >
                  <option value="">Todas las categorías</option>
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white min-w-[180px]"
                >
                  <option value="">Todos los meses</option>
                  {availableMonths.map((month) => (
                    <option key={month} value={month}>
                      {new Date(month + '-01').toLocaleDateString('es-CL', {
                        year: 'numeric',
                        month: 'long'
                      })}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="text-center py-12 text-gray-600">
                Cargando documentos...
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No hay documentos disponibles</p>
                <p className="text-sm text-gray-500 mt-1">
                  Los documentos asignados a usted aparecerán aquí
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="border rounded-lg p-4 hover:shadow-md transition"
                  >
                    <div className="flex items-start space-x-3 mb-3">
                      <div className="bg-blue-100 p-2 rounded-lg flex-shrink-0">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {doc.title}
                        </h3>
                        <p className="text-xs text-gray-500 truncate">
                          {doc.file_name}
                        </p>
                      </div>
                    </div>

                    {doc.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {doc.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        {categories.find(c => c.value === doc.category)?.label}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatFileSize(doc.file_size)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t">
                      <span className="text-xs text-gray-500">
                        {new Date(doc.created_at).toLocaleDateString('es-CL')}
                      </span>
                      <button
                        onClick={() => downloadDocument(doc)}
                        className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition"
                      >
                        <Download className="w-4 h-4" />
                        <span>Descargar</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
