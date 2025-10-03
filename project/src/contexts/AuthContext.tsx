import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  userRole: 'admin' | 'worker' | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'worker' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkUserRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (() => {
        setUser(session?.user ?? null);
        if (session?.user) {
          checkUserRole(session.user.id);
        } else {
          setUserRole(null);
          setLoading(false);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  async function checkUserRole(userId: string) {
    console.log('Checking user role for ID:', userId);

    // Wait a moment for the session to be fully established
    await new Promise(resolve => setTimeout(resolve, 100));

    // Get the current session to ensure we have the auth token
    const { data: { session } } = await supabase.auth.getSession();
    console.log('Current session:', session ? 'Active' : 'None');
    console.log('Session user ID:', session?.user?.id);

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    console.log('Profile query result:', { profile, error });

    if (error) {
      console.error('Error fetching user profile:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      setLoading(false);
      return;
    }

    if (profile) {
      console.log('Profile found, setting role:', profile.role);
      setUserRole(profile.role as 'admin' | 'worker');
    } else {
      console.error('No profile found for user:', userId);
    }
    setLoading(false);
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signUp(email: string, password: string) {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  return (
    <AuthContext.Provider value={{ user, userRole, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
