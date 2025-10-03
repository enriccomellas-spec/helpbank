import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Upload, X, AlertCircle, CheckCircle, FileText, Mail } from 'lucide-react';

interface UploadResult {
  success: boolean;
  message: string;
  fileName: string;
}

interface Worker {
  id: string;
  full_name: string;
  email?: string;
}

interface BulkDocumentUploadProps {
  onClose: () => void;
  onSuccess: () => void;
  workers: Worker[];
}

export default function BulkDocumentUpload({ onClose, onSuccess, workers }: BulkDocumentUploadProps) {
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentDescription, setDocumentDescription] = useState('');
  const [sendEmails, setSendEmails] = useState(false);
  const [companyName, setCompanyName] = useState('Sistema Documental');

  useEffect(() => {
    loadCompanySettings();
  }, []);

  async function loadCompanySettings() {
    const { data } = await supabase
      .from('company_settings')
      .select('name')
      .maybeSingle();

    if (data) {
      setCompanyName(data.name);
    }
  }

  function normalizeString(str: string): string {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  }

  function findWorkerByFileName(fileName: string): Worker | null {
    const normalizedFileName = normalizeString(fileName);

    let bestMatch: Worker | null = null;
    let bestMatchScore = 0;

    for (const worker of workers) {
      const normalizedWorkerName = normalizeString(worker.full_name);

      if (normalizedFileName.includes(normalizedWorkerName)) {
        return worker;
      }

      if (normalizedWorkerName.includes(normalizedFileName)) {
        return worker;
      }

      const nameParts = worker.full_name.split(' ').filter(part => part.length > 0);

      if (nameParts.length >= 2) {
        const firstLastName = normalizeString(`${nameParts[0]}${nameParts[1]}`);
        if (normalizedFileName.includes(firstLastName)) {
          const score = firstLastName.length;
          if (score > bestMatchScore) {
            bestMatch = worker;
            bestMatchScore = score;
          }
        }
      }

      let matchCount = 0;
      for (const part of nameParts) {
        const normalizedPart = normalizeString(part);
        if (normalizedPart.length >= 3 && normalizedFileName.includes(normalizedPart)) {
          matchCount++;
        }
      }

      if (matchCount >= 2) {
        const score = matchCount * 10;
        if (score > bestMatchScore) {
          bestMatch = worker;
          bestMatchScore = score;
        }
      }
    }

    return bestMatch;
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      const pdfFiles = Array.from(selectedFiles).filter(file =>
        file.type === 'application/pdf'
      );

      if (pdfFiles.length !== selectedFiles.length) {
        alert('Solo se permiten archivos PDF. Algunos archivos fueron excluidos.');
      }

      if (pdfFiles.length > 0) {
        const dataTransfer = new DataTransfer();
        pdfFiles.forEach(file => dataTransfer.items.add(file));
        setFiles(dataTransfer.files);
        setResults([]);
        setShowResults(false);
      }
    }
  }

  async function processFiles() {
    if (!files || files.length === 0) return;
    if (!documentTitle.trim()) {
      alert('Por favor, ingrese un título para los documentos');
      return;
    }

    setUploading(true);
    setResults([]);
    setShowResults(false);

    const uploadResults: UploadResult[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = file.name;

      const worker = findWorkerByFileName(fileName);

      if (!worker) {
        uploadResults.push({
          success: false,
          message: `No se pudo asociar con ningún trabajador`,
          fileName
        });
        continue;
      }

      try {
        const fileExt = fileName.split('.').pop();
        const filePath = `${worker.id}/${Date.now()}_${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file);

        if (uploadError) {
          uploadResults.push({
            success: false,
            message: `Error al subir: ${uploadError.message}`,
            fileName
          });
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath);

        const { error: dbError } = await supabase
          .from('documents')
          .insert({
            title: documentTitle,
            description: documentDescription || null,
            file_name: fileName,
            file_url: urlData.publicUrl,
            file_size: file.size,
            file_type: file.type,
            user_id: worker.id,
            cost_center_id: null
          });

        if (dbError) {
          uploadResults.push({
            success: false,
            message: `Error en base de datos: ${dbError.message}`,
            fileName
          });

          await supabase.storage
            .from('documents')
            .remove([filePath]);
        } else {
          let emailStatus = '';

          if (sendEmails) {
            if (!worker.email) {
              emailStatus = ' (Sin email configurado)';
            } else {
              try {
                const { data: emailData, error: emailError } = await supabase.functions.invoke(
                  'send-document-email',
                  {
                    body: {
                      to: worker.email,
                      workerName: worker.full_name,
                      documentTitle,
                      documentUrl: urlData.publicUrl,
                      fileName,
                      companyName
                    }
                  }
                );

                if (emailError) {
                  console.error('Error al enviar email:', emailError);
                  emailStatus = ` (Email no enviado: ${emailError.message})`;
                } else if (!emailData?.success) {
                  console.error('Email no exitoso:', emailData);
                  emailStatus = ` (Email fallido: ${emailData?.error || 'Error desconocido'})`;
                } else {
                  emailStatus = ` ✓ Email enviado a ${worker.email}`;
                }
              } catch (emailErr) {
                console.error('Excepción al enviar email:', emailErr);
                emailStatus = ` (Error al enviar: ${emailErr instanceof Error ? emailErr.message : 'Error desconocido'})`;
              }
            }
          }

          uploadResults.push({
            success: true,
            message: `Asociado a ${worker.full_name}${emailStatus}`,
            fileName
          });
        }
      } catch (error) {
        uploadResults.push({
          success: false,
          message: `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`,
          fileName
        });
      }
    }

    setResults(uploadResults);
    setShowResults(true);

    const successCount = uploadResults.filter(r => r.success).length;
    if (successCount > 0) {
      onSuccess();
    }

    setUploading(false);
  }

  const successCount = results.filter(r => r.success).length;
  const errorCount = results.filter(r => !r.success).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Carga Masiva de Documentos</h2>
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
                  <li>Los archivos PDF deben nombrarse con el nombre del trabajador</li>
                  <li>Ejemplos válidos:
                    <ul className="list-disc list-inside ml-6 mt-1">
                      <li><code className="bg-blue-100 px-1 rounded">Juan_Perez_contrato.pdf</code></li>
                      <li><code className="bg-blue-100 px-1 rounded">maria.gonzalez.certificado.pdf</code></li>
                      <li><code className="bg-blue-100 px-1 rounded">Pedro Lopez - documento.pdf</code></li>
                    </ul>
                  </li>
                  <li>El sistema asociará automáticamente cada archivo al trabajador correspondiente</li>
                  <li>Puede incluir acentos y espacios, el sistema los normalizará</li>
                </ol>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Título del documento <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={documentTitle}
                    onChange={(e) => setDocumentTitle(e.target.value)}
                    placeholder="Ej: Contrato de trabajo 2025"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Este título se aplicará a todos los documentos cargados
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción (opcional)
                  </label>
                  <textarea
                    value={documentDescription}
                    onChange={(e) => setDocumentDescription(e.target.value)}
                    placeholder="Descripción adicional..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendEmails}
                      onChange={(e) => setSendEmails(e.target.checked)}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex items-center space-x-2">
                      <Mail className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">
                        Enviar email automático a cada trabajador con su documento
                      </span>
                    </div>
                  </label>
                  <p className="text-xs text-blue-700 mt-2 ml-8">
                    Cada trabajador recibirá un correo con un enlace directo para descargar su documento
                  </p>
                </div>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <input
                  type="file"
                  accept=".pdf"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  id="pdf-upload"
                />
                <label
                  htmlFor="pdf-upload"
                  className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium"
                >
                  Seleccionar archivos PDF
                </label>
                {files && files.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 font-semibold mb-2">
                      {files.length} archivo{files.length > 1 ? 's' : ''} seleccionado{files.length > 1 ? 's' : ''}:
                    </p>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {Array.from(files).map((file, index) => (
                        <div key={index} className="flex items-center justify-center space-x-2 text-xs text-gray-600">
                          <FileText className="w-3 h-3" />
                          <span>{file.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {files && files.length > 0 && (
                <button
                  onClick={processFiles}
                  disabled={uploading || !documentTitle.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? `Procesando ${files.length} archivo${files.length > 1 ? 's' : ''}...` : 'Cargar Documentos'}
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
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-start space-x-2">
                      {result.success ? (
                        <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
                      )}
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                          {result.fileName}
                        </p>
                        <p className={`text-xs mt-0.5 ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                          {result.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
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
