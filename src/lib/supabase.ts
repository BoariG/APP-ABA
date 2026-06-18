import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://gfyjwrhuuqbefedkzxlt.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmeWp3cmh1dXFiZWZlZGt6eGx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MDIyODksImV4cCI6MjA5NzM3ODI4OX0._mLczZxVCBgG3qNgVWYkG_paKEP0DZiIfJLYvzSAV1I";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

// Authenticate anonymously immediately as fallback to ensure Supabase is accessible
async function initializeAuth() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) {
        console.warn(
          "Supabase Anonymous Auth status: " + error.message + 
          ". Please ensure anonymous sign-ins are enabled in the Supabase Dashboard under Authentication -> Providers."
        );
      } else {
        console.log("Authenticated anonymously to Supabase: ", data.user?.id);
      }
    } else {
      console.log("Supabase patient/professional session authenticated: ", session.user.id);
    }
  } catch (err) {
    console.warn("Supabase auth system error: ", err);
  }
}

initializeAuth();

/**
 * Validate Connection to Supabase on startup
 */
export async function testSupabaseConnection() {
  try {
    const { error } = await supabase
      .from('patients')
      .select('id')
      .limit(1);
      
    if (error) {
      console.log("Supabase connection test status: ", error.message);
    } else {
      console.log("Supabase connection test completed.");
    }
  } catch (error) {
    console.log("Supabase connection exception: ", error);
  }
}

testSupabaseConnection();
