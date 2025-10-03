import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Leer variables de entorno
const envContent = readFileSync(join(__dirname, '.env'), 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key.trim()] = value.trim();
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseAnonKey = envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: No se encontraron las variables de entorno de Supabase');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function setupAdminUser() {
  console.log('🚀 Configurando usuario administrador...\n');

  const adminEmail = 'admin@empresa.com';
  const adminPassword = 'Admin123456';
  const adminName = 'Administrador Principal';

  try {
    // 1. Crear usuario en Supabase Auth
    console.log('1️⃣ Creando usuario en Supabase Auth...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: adminEmail,
      password: adminPassword,
      options: {
        emailRedirectTo: undefined,
      }
    });

    if (authError) {
      console.error('Error al crear usuario:', authError.message);
      process.exit(1);
    }

    const userId = authData.user?.id;
    if (!userId) {
      console.error('Error: No se obtuvo el ID del usuario');
      process.exit(1);
    }

    console.log('✅ Usuario creado con ID:', userId);

    // 2. Obtener la empresa creada
    console.log('\n2️⃣ Obteniendo empresa...');
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id')
      .limit(1)
      .single();

    if (companyError || !company) {
      console.error('Error: No se encontró la empresa. Ejecuta primero setup-database.sql');
      process.exit(1);
    }

    console.log('✅ Empresa encontrada con ID:', company.id);

    // 3. Crear registro de administrador
    console.log('\n3️⃣ Registrando como administrador...');
    const { error: adminError } = await supabase
      .from('administrators')
      .insert({
        user_id: userId,
        company_id: company.id,
        full_name: adminName,
        email: adminEmail,
        is_super_admin: true,
      });

    if (adminError) {
      console.error('Error al crear administrador:', adminError.message);
      process.exit(1);
    }

    console.log('✅ Administrador registrado exitosamente\n');

    console.log('═══════════════════════════════════════════════════');
    console.log('✅ CONFIGURACIÓN COMPLETADA');
    console.log('═══════════════════════════════════════════════════');
    console.log('\n📧 CREDENCIALES DE ACCESO:\n');
    console.log('   Email:    ', adminEmail);
    console.log('   Password: ', adminPassword);
    console.log('\n═══════════════════════════════════════════════════');
    console.log('\n🌐 Accede a la aplicación e inicia sesión con estas credenciales\n');

  } catch (error) {
    console.error('Error inesperado:', error);
    process.exit(1);
  }
}

setupAdminUser();
