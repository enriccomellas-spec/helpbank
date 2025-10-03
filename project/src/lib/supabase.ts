import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          name: string;
          logo_url: string | null;
          primary_color: string;
          secondary_color: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['companies']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['companies']['Insert']>;
      };
      cost_centers: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          code: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['cost_centers']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['cost_centers']['Insert']>;
      };
      workers: {
        Row: {
          id: string;
          user_id: string | null;
          company_id: string;
          cost_center_id: string | null;
          full_name: string;
          rut: string;
          phone: string | null;
          email: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['workers']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['workers']['Insert']>;
      };
      administrators: {
        Row: {
          id: string;
          user_id: string;
          company_id: string;
          full_name: string;
          email: string;
          is_super_admin: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['administrators']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['administrators']['Insert']>;
      };
      documents: {
        Row: {
          id: string;
          company_id: string;
          cost_center_id: string | null;
          worker_id: string | null;
          title: string;
          description: string | null;
          file_name: string;
          file_path: string;
          file_size: number;
          file_type: string;
          category: 'reuniones' | 'presentaciones' | 'informes' | 'analisis' | 'produccion' | 'otros';
          uploaded_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['documents']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['documents']['Insert']>;
      };
      document_access_log: {
        Row: {
          id: string;
          document_id: string;
          user_id: string;
          accessed_at: string;
        };
        Insert: Omit<Database['public']['Tables']['document_access_log']['Row'], 'id' | 'accessed_at'>;
        Update: never;
      };
    };
  };
};
