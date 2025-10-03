import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, Building2, FileText, Activity, RefreshCw } from 'lucide-react';

interface Stats {
  clients: number;
  users: number;
  documents: number;
  documentsWithFile: number;
}

interface RecentActivity {
  id: string;
  title: string;
  uploaded_at: string;
  uploaded_by_email: string;
  category: string | null;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    clients: 0,
    users: 0,
    documents: 0,
    documentsWithFile: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      await Promise.all([
        loadStats(),
        loadRecentActivity(),
        loadCompanyName(),
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function loadCompanyName() {
    const { data } = await supabase
      .from('company_settings')
      .select('name')
      .maybeSingle();

    if (data) {
      setCompanyName(data.name);
    }
  }

  async function loadStats() {
    const [clientsRes, usersRes, documentsRes] = await Promise.all([
      supabase.from('cost_centers').select('id', { count: 'exact', head: true }),
      supabase.from('user_profiles').select('id', { count: 'exact', head: true }).eq('role', 'worker'),
      supabase.from('documents').select('id, file_url', { count: 'exact' }),
    ]);

    const documentsWithFile = documentsRes.data?.filter(doc => doc.file_url).length || 0;

    setStats({
      clients: clientsRes.count || 0,
      users: usersRes.count || 0,
      documents: documentsRes.count || 0,
      documentsWithFile,
    });
  }

  async function loadRecentActivity() {
    const { data } = await supabase
      .from('documents')
      .select(`
        id,
        title,
        created_at,
        category,
        user_profiles!documents_uploaded_by_fkey(email)
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      const activities: RecentActivity[] = data.map((doc: any) => ({
        id: doc.id,
        title: doc.title,
        uploaded_at: doc.created_at,
        uploaded_by_email: doc.user_profiles?.email || 'Sistema',
        category: doc.category,
      }));
      setRecentActivity(activities);
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  function getCategoryLabel(category: string | null) {
    const categories: { [key: string]: string } = {
      reuniones: 'Reuniones',
      presentaciones: 'Presentación',
      informes: 'Informe de Gestión',
      analisis: 'Análisis',
      produccion: 'Producción',
      otros: 'Otros',
    };
    return category ? categories[category] || category : 'Sin categoría';
  }

  function getCategoryColor(category: string | null) {
    const colors: { [key: string]: string } = {
      reuniones: 'bg-blue-100 text-blue-700',
      presentaciones: 'bg-purple-100 text-purple-700',
      informes: 'bg-green-100 text-green-700',
      analisis: 'bg-yellow-100 text-yellow-700',
      produccion: 'bg-orange-100 text-orange-700',
      otros: 'bg-gray-100 text-gray-700',
    };
    return category ? colors[category] || colors.otros : colors.otros;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-2" />
          <p className="text-gray-600">Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-orange-50 to-orange-100 border-l-4 border-orange-500 rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <div className="bg-orange-500 p-2 rounded-lg">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Bienvenido, Administrador</h1>
            </div>
            <p className="text-gray-700 font-medium">Panel de administración de {companyName || 'HelpSecurity'}</p>
            <p className="text-gray-600 text-sm mt-1">Gestiona centros de costo, trabajadores y documentos desde aquí.</p>
          </div>
          <button
            onClick={loadData}
            className="flex items-center space-x-2 px-4 py-2 bg-white border border-orange-200 rounded-lg hover:bg-orange-50 transition"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="text-sm font-medium">Actualizar</span>
          </button>
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-green-800 font-medium">
          <span className="font-bold">Sistema Activo:</span> {stats.clients} centros de costo | {stats.users} trabajadores | {stats.documents} documentos | {stats.documentsWithFile} con archivo original
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border rounded-xl p-6 hover:shadow-lg transition">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-1">Centros de Costo</p>
              <p className="text-4xl font-bold text-gray-900 mb-2">{stats.clients}</p>
              <p className="text-green-600 text-sm font-medium">{stats.clients} activo{stats.clients !== 1 ? 's' : ''}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-xl">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-xl p-6 hover:shadow-lg transition">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-1">Trabajadores</p>
              <p className="text-4xl font-bold text-gray-900 mb-2">{stats.users}</p>
              <p className="text-green-600 text-sm font-medium">{stats.users} activo{stats.users !== 1 ? 's' : ''}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-xl">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-xl p-6 hover:shadow-lg transition">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-1">Documentos</p>
              <p className="text-4xl font-bold text-gray-900 mb-2">{stats.documents}</p>
              <p className="text-green-600 text-sm font-medium">{stats.documentsWithFile} con archivo</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-xl">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-xl p-6 hover:shadow-lg transition">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-1">Sistema</p>
              <p className="text-4xl font-bold text-green-600 mb-2">Activo</p>
              <p className="text-gray-600 text-sm font-medium">Funcionando</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-xl">
              <Activity className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Actividad reciente</h2>
        <p className="text-gray-600 text-sm mb-6">Últimas acciones en el sistema</p>

        {recentActivity.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No hay actividad reciente</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
              >
                <div className="flex items-center space-x-4 flex-1">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      Documento subido: {activity.title}
                    </p>
                    <p className="text-sm text-gray-600">
                      {formatDate(activity.uploaded_at)} - {activity.uploaded_by_email}
                    </p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getCategoryColor(activity.category)}`}>
                  {getCategoryLabel(activity.category)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
