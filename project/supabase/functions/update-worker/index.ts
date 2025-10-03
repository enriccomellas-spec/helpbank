import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface UpdateWorkerData {
  worker_id: string;
  full_name?: string;
  rut?: string;
  phone?: string;
  email?: string;
  cost_center_id?: string;
  password?: string;
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
      throw new Error('Solo los administradores pueden actualizar trabajadores');
    }

    const updateData: UpdateWorkerData = await req.json();

    if (!updateData.worker_id) {
      throw new Error('worker_id es requerido');
    }

    // Update auth user (email and/or password)
    const authUpdates: { email?: string; password?: string } = {};
    if (updateData.email) authUpdates.email = updateData.email;
    if (updateData.password && updateData.password.length >= 6) authUpdates.password = updateData.password;

    if (Object.keys(authUpdates).length > 0) {
      const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
        updateData.worker_id,
        authUpdates
      );
      if (authUpdateError) throw authUpdateError;
    }

    // Update profile fields
    const updateFields: Record<string, unknown> = {};
    if (updateData.full_name !== undefined) updateFields.full_name = updateData.full_name;
    if (updateData.rut !== undefined) updateFields.rut = updateData.rut;
    if (updateData.phone !== undefined) updateFields.phone = updateData.phone;
    if (updateData.email !== undefined) updateFields.email = updateData.email;
    if (updateData.cost_center_id !== undefined) updateFields.cost_center_id = updateData.cost_center_id;

    if (Object.keys(updateFields).length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from('user_profiles')
        .update(updateFields)
        .eq('id', updateData.worker_id)
        .eq('role', 'worker');

      if (updateError) throw updateError;
    }

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