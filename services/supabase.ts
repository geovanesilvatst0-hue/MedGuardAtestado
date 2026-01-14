
import { createClient } from '@supabase/supabase-js';

const getEnv = (key: string) => {
  try {
    return (window as any).process?.env?.[key] || 
           (import.meta as any).env?.[`VITE_${key}`] || 
           (import.meta as any).env?.[key] || 
           '';
  } catch (e) {
    return '';
  }
};

const supabaseUrl = getEnv('SUPABASE_URL') || 'https://ndnhxxiivkogadczwafy.supabase.co';
const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kbmh4eGlpdmtvZ2FkY3p3YWZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NjUxMTIsImV4cCI6MjA4MzI0MTExMn0.JJ7UfAkUHsP7V4P52660T--aVAkRANqKB837xQpuOOI';

export const isKeyValidFormat = typeof supabaseAnonKey === 'string' && supabaseAnonKey.startsWith('eyJ');

export const isConfigured = 
  supabaseUrl !== '' && 
  !supabaseUrl.includes('SUBSTITUA') && 
  supabaseUrl.startsWith('https://');

// Cliente principal (com persistência de sessão para o login do admin)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Função para criar cliente secundário (usado para cadastrar terceiros sem deslogar o admin)
export const createSecondaryClient = () => createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});
