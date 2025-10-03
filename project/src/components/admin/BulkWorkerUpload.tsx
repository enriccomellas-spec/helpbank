import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Upload, X, AlertCircle, CheckCircle, Download } from 'lucide-react';

interface UploadResult {
  success: boolean;
  message: string;
  row?: number;
}

interface CostCenter {
  id: string;
  name: string;
}

interface BulkWorkerUploadProps {
  onClose: () => void;
  onSuccess: () => void;
  costCenters: CostCenter[];
}

export default function BulkWorkerUpload({ onClose, onSuccess, costCenters }: BulkWorkerUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  function downloadTemplate() {
    const csvContent = 'Nombre Completo,Email,Telefono,Centro de Costo\nJuan Pérez,juan.perez@empresa.com,+56912345678,Administración\nMaría González,maria.gonzalez@empresa.com,+56987654321,Ventas\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'plantilla_trabajadores.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setResults([]);
      setShowResults(false);
    } else {
      alert('Por favor, seleccione un archivo CSV válido');
    }
  }

  async function processCSV() {
    if (!file) return;

    setUploading(true);
    setResults([]);
    setShowResults(false);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const uploadResults: UploadResult[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split(',').map(p => p.trim());

        if (parts.length < 3) {
          uploadResults.push({
            success: false,
            message: `Fila ${i + 1}: Formato inválido (debe tener al menos: Nombre, Email, Teléfono)`,
            row: i + 1
          });
          continue;
        }

        const [fullName, email, phone, costCenterName] = parts;

        if (!fullName || !email) {
          uploadResults.push({
            success: false,
            message: `Fila ${i + 1}: Nombre y Email son obligatorios`,
            row: i + 1
          });
          continue;
        }

        let costCenterId = null;
        if (costCenterName) {
          const costCenter = costCenters.find(cc =>
            cc.name.toLowerCase() === costCenterName.toLowerCase()
          );
          if (costCenter) {
            costCenterId = costCenter.id;
          }
        }

        const password = Math.random().toString(36).slice(-8);

        const { data: createData, error: createError } = await supabase.functions.invoke(
          'create-worker',
          {
            body: {
              email,
              password,
              full_name: fullName,
              phone: phone || null,
              cost_center_id: costCenterId
            }
          }
        );

        if (createError) {
          uploadResults.push({
            success: false,
            message: `Fila ${i + 1}: ${fullName} - ${createError.message}`,
            row: i + 1
          });
        } else if (createData?.error) {
          uploadResults.push({
            success: false,
            message: `Fila ${i + 1}: ${fullName} - ${createData.error}`,
            row: i + 1
          });
        } else {
          uploadResults.push({
            success: true,
            message: `Fila ${i + 1}: ${fullName} creado exitosamente (Contraseña: ${password})`,
            row: i + 1
          });
        }
      }

      setResults(uploadResults);
      setShowResults(true);

      const successCount = uploadResults.filter(r => r.success).length;
      if (successCount > 0) {
        onSuccess();
      }
    } catch (error) {
      alert('Error al procesar el archivo: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setUploading(false);
    }
  }

  const successCount = results.filter(r => r.success).length;
  const errorCount = results.filter(r => !r.success).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Carga Masiva de Trabajadores</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {!showResults ? (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Instrucciones:</h3>
                <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
                  <li>Descargue la plantilla CSV haciendo clic en el botón de abajo</li>
                  <li>Complete los datos de los trabajadores en el archivo</li>
                  <li>Formato requerido: Nombre Completo, Email, Teléfono, Centro de Costo (opcional)</li>
                  <li>Suba el archivo completado</li>
                  <li>El sistema generará contraseñas automáticamente para cada trabajador</li>
                </ol>
              </div>

              <button
                onClick={downloadTemplate}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
              >
                <Download className="w-4 h-4" />
                <span>Descargar Plantilla CSV</span>
              </button>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="csv-upload"
                />
                <label
                  htmlFor="csv-upload"
                  className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium"
                >
                  Seleccionar archivo CSV
                </label>
                {file && (
                  <p className="mt-4 text-sm text-gray-600">
                    Archivo seleccionado: <span className="font-semibold">{file.name}</span>
                  </p>
                )}
              </div>

              {file && (
                <button
                  onClick={processCSV}
                  disabled={uploading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Procesando...' : 'Cargar Trabajadores'}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-semibold">{successCount} exitosos</span>
                  </div>
                  {errorCount > 0 && (
                    <div className="flex items-center space-x-2 text-red-600">
                      <AlertCircle className="w-5 h-5" />
                      <span className="font-semibold">{errorCount} errores</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto space-y-2">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      result.success
                        ? 'bg-green-50 border-green-200 text-green-800'
                        : 'bg-red-50 border-red-200 text-red-800'
                    }`}
                  >
                    <div className="flex items-start space-x-2">
                      {result.success ? (
                        <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      )}
                      <p className="text-sm flex-1">{result.message}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Importante:</strong> Guarde las contraseñas generadas y compártalas de forma segura con cada trabajador.
                </p>
              </div>

              <button
                onClick={onClose}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition"
              >
                Cerrar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
