import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { FileText } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [companyName, setCompanyName] = useState('Sistema Documental Helpbank');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [colors, setColors] = useState({
    primary: '#3B82F6',
    button: '#3B82F6',
    gradientStart: '#F8FAFC',
    gradientEnd: '#E2E8F0',
  });
  const { signIn } = useAuth();

  useEffect(() => {
    loadCompanySettings();
  }, []);

  async function loadCompanySettings() {
    const { data } = await supabase
      .from('company_settings')
      .select('name, logo_url, primary_color, button_color, background_gradient_start, background_gradient_end')
      .maybeSingle();

    if (data) {
      setCompanyName(data.name);
      setLogoUrl(data.logo_url);
      setColors({
        primary: data.primary_color || '#3B82F6',
        button: data.button_color || '#3B82F6',
        gradientStart: data.background_gradient_start || '#F8FAFC',
        gradientEnd: data.background_gradient_end || '#E2E8F0',
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: `linear-gradient(to bottom right, ${colors.gradientStart}, ${colors.gradientEnd})`
      }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-8">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Logo"
              className="h-20 w-auto object-contain mb-4"
            />
          ) : (
            <div
              className="p-3 rounded-xl mb-4"
              style={{ backgroundColor: colors.primary }}
            >
              <FileText className="w-8 h-8 text-white" />
            </div>
          )}
          <h1 className="text-3xl font-bold text-gray-900">{companyName}</h1>
          <p className="text-gray-600 mt-2">Sistema de Gestión Documental Aguas Andinas</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition"
              style={{ '--tw-ring-color': colors.primary } as React.CSSProperties}
              placeholder="correo@empresa.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition"
              style={{ '--tw-ring-color': colors.primary } as React.CSSProperties}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full text-white font-medium py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: colors.button,
              filter: 'brightness(1)',
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                (e.target as HTMLButtonElement).style.filter = 'brightness(0.9)';
              }
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.filter = 'brightness(1)';
            }}
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Ingrese con sus credenciales proporcionadas por el administrador</p>
          <p className="mt-2 text-xs text-gray-500">Creado por Alella</p>
        </div>
      </div>
    </div>
  );
}
