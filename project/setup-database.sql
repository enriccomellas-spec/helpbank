-- =============================================
-- SCRIPT DE CONFIGURACIÓN INICIAL
-- =============================================

-- 1. Crear tablas principales
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  primary_color text DEFAULT '#2563eb',
  secondary_color text DEFAULT '#1e40af',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cost_centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, code)
);

CREATE TABLE IF NOT EXISTS workers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  cost_center_id uuid REFERENCES cost_centers(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  rut text NOT NULL UNIQUE,
  phone text,
  email text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS administrators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  is_super_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, company_id)
);

CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  cost_center_id uuid REFERENCES cost_centers(id) ON DELETE SET NULL,
  worker_id uuid REFERENCES workers(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL,
  file_type text NOT NULL,
  category text NOT NULL CHECK (category IN ('reuniones', 'presentaciones', 'informes', 'analisis', 'produccion', 'otros')),
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  accessed_at timestamptz DEFAULT now()
);

-- 2. Habilitar RLS en todas las tablas
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE administrators ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_access_log ENABLE ROW LEVEL SECURITY;

-- 3. Crear índices
CREATE INDEX IF NOT EXISTS idx_workers_company ON workers(company_id);
CREATE INDEX IF NOT EXISTS idx_workers_cost_center ON workers(cost_center_id);
CREATE INDEX IF NOT EXISTS idx_workers_user ON workers(user_id);
CREATE INDEX IF NOT EXISTS idx_administrators_user ON administrators(user_id);
CREATE INDEX IF NOT EXISTS idx_administrators_company ON administrators(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_company ON documents(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_worker ON documents(worker_id);
CREATE INDEX IF NOT EXISTS idx_documents_cost_center ON documents(cost_center_id);

-- 4. Crear políticas RLS para companies
CREATE POLICY "Admins can view their company" ON companies FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM administrators WHERE administrators.user_id = auth.uid() AND administrators.company_id = companies.id));

CREATE POLICY "Admins can update their company" ON companies FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM administrators WHERE administrators.user_id = auth.uid() AND administrators.company_id = companies.id))
WITH CHECK (EXISTS (SELECT 1 FROM administrators WHERE administrators.user_id = auth.uid() AND administrators.company_id = companies.id));

CREATE POLICY "Workers can view their company" ON companies FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM workers WHERE workers.user_id = auth.uid() AND workers.company_id = companies.id));

-- 5. Crear políticas RLS para cost_centers
CREATE POLICY "Admins can view cost centers" ON cost_centers FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM administrators WHERE administrators.user_id = auth.uid() AND administrators.company_id = cost_centers.company_id));

CREATE POLICY "Admins can insert cost centers" ON cost_centers FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM administrators WHERE administrators.user_id = auth.uid() AND administrators.company_id = cost_centers.company_id));

CREATE POLICY "Admins can update cost centers" ON cost_centers FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM administrators WHERE administrators.user_id = auth.uid() AND administrators.company_id = cost_centers.company_id))
WITH CHECK (EXISTS (SELECT 1 FROM administrators WHERE administrators.user_id = auth.uid() AND administrators.company_id = cost_centers.company_id));

CREATE POLICY "Admins can delete cost centers" ON cost_centers FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM administrators WHERE administrators.user_id = auth.uid() AND administrators.company_id = cost_centers.company_id));

-- 6. Crear políticas RLS para workers
CREATE POLICY "Admins can view workers" ON workers FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM administrators WHERE administrators.user_id = auth.uid() AND administrators.company_id = workers.company_id));

CREATE POLICY "Admins can insert workers" ON workers FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM administrators WHERE administrators.user_id = auth.uid() AND administrators.company_id = workers.company_id));

CREATE POLICY "Admins can update workers" ON workers FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM administrators WHERE administrators.user_id = auth.uid() AND administrators.company_id = workers.company_id))
WITH CHECK (EXISTS (SELECT 1 FROM administrators WHERE administrators.user_id = auth.uid() AND administrators.company_id = workers.company_id));

CREATE POLICY "Admins can delete workers" ON workers FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM administrators WHERE administrators.user_id = auth.uid() AND administrators.company_id = workers.company_id));

CREATE POLICY "Workers can view own data" ON workers FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- 7. Crear políticas RLS para administrators
CREATE POLICY "Admins can view other admins" ON administrators FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM administrators a WHERE a.user_id = auth.uid() AND a.company_id = administrators.company_id));

CREATE POLICY "Super admins can insert admins" ON administrators FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM administrators WHERE administrators.user_id = auth.uid() AND administrators.is_super_admin = true));

-- 8. Crear políticas RLS para documents
CREATE POLICY "Admins can view all company documents" ON documents FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM administrators WHERE administrators.user_id = auth.uid() AND administrators.company_id = documents.company_id));

CREATE POLICY "Admins can insert documents" ON documents FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM administrators WHERE administrators.user_id = auth.uid() AND administrators.company_id = documents.company_id));

CREATE POLICY "Admins can update documents" ON documents FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM administrators WHERE administrators.user_id = auth.uid() AND administrators.company_id = documents.company_id))
WITH CHECK (EXISTS (SELECT 1 FROM administrators WHERE administrators.user_id = auth.uid() AND administrators.company_id = documents.company_id));

CREATE POLICY "Admins can delete documents" ON documents FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM administrators WHERE administrators.user_id = auth.uid() AND administrators.company_id = documents.company_id));

CREATE POLICY "Workers can view their documents" ON documents FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM workers
  WHERE workers.user_id = auth.uid()
  AND workers.company_id = documents.company_id
  AND (
    documents.worker_id = workers.id
    OR documents.cost_center_id = workers.cost_center_id
    OR (documents.worker_id IS NULL AND documents.cost_center_id IS NULL)
  )
));

-- 9. Crear políticas RLS para document_access_log
CREATE POLICY "Users can insert their own access logs" ON document_access_log FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view access logs" ON document_access_log FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM administrators
  JOIN documents ON documents.id = document_access_log.document_id
  WHERE administrators.user_id = auth.uid()
  AND administrators.company_id = documents.company_id
));

-- 10. Crear buckets de storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true),
       ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- 11. Políticas de storage para company-logos
CREATE POLICY "Admins can upload company logos" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'company-logos');

CREATE POLICY "Anyone can view company logos" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'company-logos');

CREATE POLICY "Admins can delete company logos" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'company-logos');

-- 12. Políticas de storage para documents
CREATE POLICY "Admins can upload documents" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Authenticated users can view documents" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documents');

CREATE POLICY "Admins can delete documents" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'documents');

-- 13. Insertar empresa de ejemplo
INSERT INTO companies (name, primary_color, secondary_color)
VALUES ('Mi Empresa', '#2563eb', '#1e40af')
ON CONFLICT DO NOTHING;
