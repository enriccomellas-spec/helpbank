import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Building2, Upload } from 'lucide-react';

interface Company {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string;
  background_gradient_start: string;
  background_gradient_end: string;
  button_color: string;
}

export default function CompanySettings() {
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    primary_color: '#3B82F6',
    background_gradient_start: '#F8FAFC',
    background_gradient_end: '#E2E8F0',
    button_color: '#3B82F6',
  });

  useEffect(() => {
    loadCompany();
  }, []);

  async function loadCompany() {
    const { data: companyData } = await supabase
      .from('company_settings')
      .select('*')
      .single();

    if (companyData) {
      setCompany(companyData);
      setFormData({
        name: companyData.name,
        primary_color: companyData.primary_color || '#3B82F6',
        background_gradient_start: companyData.background_gradient_start || '#F8FAFC',
        background_gradient_end: companyData.background_gradient_end || '#E2E8F0',
        button_color: companyData.button_color || '#3B82F6',
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!company) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('company_settings')
        .update({
          name: formData.name,
          primary_color: formData.primary_color,
          background_gradient_start: formData.background_gradient_start,
          background_gradient_end: formData.background_gradient_end,
          button_color: formData.button_color,
        })
        .eq('id', company.id);

      if (error) throw error;

      alert('Configuración guardada exitosamente');
      loadCompany();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error al guardar');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !company) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor seleccione un archivo de imagen');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${company.id}-${Date.now()}.${fileExt}`;
      const filePath = `${company.id}/${fileName}`;

      if (company.logo_url) {
        const oldPath = company.logo_url.split('/').slice(-2).join('/');
        await supabase.storage.from('company-logos').remove([oldPath]);
      }

      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Error al subir: ${uploadError.message}`);
      }

      const { data } = supabase.storage
        .from('company-logos')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('company_settings')
        .update({ logo_url: data.publicUrl })
        .eq('id', company.id);

      if (updateError) {
        console.error('Update error:', updateError);
        throw new Error(`Error al actualizar: ${updateError.message}`);
      }

      loadCompany();
      alert('Logo actualizado exitosamente');
    } catch (error) {
      console.error('Error completo:', error);
      alert(error instanceof Error ? error.message : 'Error al subir el logo');
    } finally {
      setUploading(false);
    }
  }

  if (!company) {
    return <div className="text-center py-8">Cargando configuración...</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Configuración de la Empresa</h2>
        <p className="text-gray-600 mt-1">Personalice la información y apariencia de su empresa</p>
      </div>

      <div className="bg-white border rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-blue-100 p-2 rounded-lg">
            <Building2 className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Información General</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre de la Empresa
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Logo de la Empresa
            </label>
            <div className="flex items-center space-x-4">
              {company.logo_url && (
                <img
                  src={company.logo_url}
                  alt="Logo"
                  className="w-20 h-20 object-contain border rounded-lg"
                />
              )}
              <label className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition">
                <Upload className="w-4 h-4" />
                <span className="text-sm">
                  {uploading ? 'Subiendo...' : 'Cambiar logo'}
                </span>
                <input
                  type="file"
                  onChange={handleLogoUpload}
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Formatos recomendados: PNG, JPG (máx. 2MB)
            </p>
          </div>

          <div className="border-t pt-6 mt-6">
            <h4 className="text-md font-semibold text-gray-900 mb-4">Personalización de Colores</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color Principal
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={formData.primary_color}
                    onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                    className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.primary_color}
                    onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="#3B82F6"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Color de acento y enlaces</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color de Botones
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={formData.button_color}
                    onChange={(e) => setFormData({ ...formData, button_color: e.target.value })}
                    className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.button_color}
                    onChange={(e) => setFormData({ ...formData, button_color: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="#3B82F6"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Color de los botones principales</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Degradado de Fondo (Inicio)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={formData.background_gradient_start}
                    onChange={(e) => setFormData({ ...formData, background_gradient_start: e.target.value })}
                    className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.background_gradient_start}
                    onChange={(e) => setFormData({ ...formData, background_gradient_start: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="#F8FAFC"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Color inicial del fondo de login</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Degradado de Fondo (Final)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={formData.background_gradient_end}
                    onChange={(e) => setFormData({ ...formData, background_gradient_end: e.target.value })}
                    className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.background_gradient_end}
                    onChange={(e) => setFormData({ ...formData, background_gradient_end: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="#E2E8F0"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Color final del fondo de login</p>
              </div>
            </div>

            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">Vista previa:</p>
              <div
                className="h-24 rounded-lg flex items-center justify-center"
                style={{
                  background: `linear-gradient(to bottom right, ${formData.background_gradient_start}, ${formData.background_gradient_end})`
                }}
              >
                <button
                  type="button"
                  className="px-6 py-2 text-white rounded-lg font-medium shadow-md"
                  style={{ backgroundColor: formData.button_color }}
                >
                  Botón de ejemplo
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
