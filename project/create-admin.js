import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Leer variables de entorno
const envContent = readFileSync('.env', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key.trim()] = value.trim();
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseAnonKey = envVars.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createAdmin() {
  console.log('🚀 Creando usuario administrador...\n');

  const adminEmail = 'admin@empresa.com';
  const adminPassword = 'Admin123456';

  try {
    // Crear usuario
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: adminEmail,
      password: adminPassword,
    });

    if (authError) throw authError;

    const userId = authData.user?.id;
    console.log('✅ Usuario creado:', userId);

    // Crear perfil de administrador
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: userId,
        role: 'admin',
        full_name: 'Administrador Principal',
        rut: '11111111-1',
        phone: null,
        cost_center_id: null,
      });

    if (profileError) throw profileError;

    console.log('\n═══════════════════════════════════════════════════');
    console.log('✅ USUARIO CREADO EXITOSAMENTE');
    console.log('═══════════════════════════════════════════════════');
    console.log('\nEmail:    ', adminEmail);
    console.log('Password: ', adminPassword);
    console.log('\n═══════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createAdmin();
