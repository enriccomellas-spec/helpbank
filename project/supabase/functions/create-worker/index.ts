import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface WorkerData {
  email: string;
  password: string;
  full_name: string;
  rut: string;
  phone?: string;
  cost_center_id?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: adminUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !adminUser) {
      throw new Error('Unauthorized');
    }

    const { data: adminProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('id', adminUser.id)
      .single();

    if (adminProfile?.role !== 'admin') {
      throw new Error('Only admins can create workers');
    }

    const workerData: WorkerData = await req.json();

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: workerData.email,
      password: workerData.password,
      email_confirm: true,
      user_metadata: {
        role: 'worker'
      }
    });

    if (createError) {
      if (createError.message.includes('already been registered')) {
        throw new Error('Ya existe un usuario con este correo electrónico');
      }
      throw createError;
    }
    if (!newUser.user) throw new Error('No se pudo crear el usuario');

    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: newUser.user.id,
        role: 'worker',
        email: workerData.email,
        full_name: workerData.full_name,
        rut: workerData.rut,
        phone: workerData.phone || null,
        cost_center_id: workerData.cost_center_id || null,
      });

    if (profileError) throw profileError;

    return new Response(
      JSON.stringify({ success: true, user_id: newUser.user.id }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});