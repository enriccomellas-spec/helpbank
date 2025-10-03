import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { LogOut, Users, FolderTree, Upload, Building2, Settings, BarChart3, UserCog } from 'lucide-react';
import Dashboard from './Dashboard';
import WorkerManagement from './WorkerManagement';
import CostCenterManagement from './CostCenterManagement';
import DocumentManagement from './DocumentManagement';
import CompanySettings from './CompanySettings';
import AdminManagement from './AdminManagement';

type Tab = 'dashboard' | 'workers' | 'cost-centers' | 'documents' | 'admins' | 'settings';

export default function AdminDashboard() {
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [companyName, setCompanyName] = useState('Panel de Administración');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    loadCompanySettings();
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

  const tabs = [
    { id: 'dashboard' as Tab, label: 'Resumen', icon: BarChart3 },
    { id: 'workers' as Tab, label: 'Centro de Costo', icon: FolderTree },
    { id: 'cost-centers' as Tab, label: 'Trabajadores', icon: Users },
    { id: 'documents' as Tab, label: 'Documentos', icon: Upload },
    { id: 'admins' as Tab, label: 'Administradores', icon: UserCog },
    { id: 'settings' as Tab, label: 'Configuración', icon: Settings },
  ];

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
                  <Building2 className="w-6 h-6 text-white" />
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold text-gray-900">{companyName}</h1>
                <p className="text-xs text-gray-500">Panel de Administración</p>
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
        <div className="bg-white rounded-xl shadow-sm">
          <div className="border-b">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition ${
                      activeTab === tab.id
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'workers' && <CostCenterManagement />}
            {activeTab === 'cost-centers' && <WorkerManagement />}
            {activeTab === 'documents' && <DocumentManagement />}
            {activeTab === 'admins' && <AdminManagement />}
            {activeTab === 'settings' && <CompanySettings />}
          </div>
        </div>
      </div>
    </div>
  );
}
