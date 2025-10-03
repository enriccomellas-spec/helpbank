import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface DeleteWorkerData {
  worker_id: string;
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
      throw new Error('Solo los administradores pueden eliminar trabajadores');
    }

    const deleteData: DeleteWorkerData = await req.json();

    if (!deleteData.worker_id) {
      throw new Error('worker_id es requerido');
    }

    // First delete from user_profiles
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .delete()
      .eq('id', deleteData.worker_id)
      .eq('role', 'worker');

    if (profileError) throw profileError;

    // Then delete from auth.users
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(deleteData.worker_id);

    if (authDeleteError) throw authDeleteError;

    return new Response(
      JSON.stringify({ success: true }),
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