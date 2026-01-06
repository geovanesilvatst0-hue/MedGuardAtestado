
import { createClient } from '@supabase/supabase-js';

/**
 * CONFIGURAÇÃO DO SUPABASE
 */

const getEnv = (key: string) => {
  return (window as any).process?.env?.[key] || 
         (import.meta as any).env?.[`VITE_${key}`] || 
         (import.meta as any).env?.[key] || 
         '';
};

const supabaseUrl = getEnv('SUPABASE_URL') || 'https://ndnhxxiivkogadczwafy.supabase.co';
// Chave anon public (JWT) fornecida pelo usuário
const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kbmh4eGlpdmtvZ2FkY3p3YWZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NjUxMTIsImV4cCI6MjA4MzI0MTExMn0.JJ7UfAkUHsP7V4P52660T--aVAkRANqKB837xQpuOOI';

// Validação técnica: Chaves do Supabase para Auth são sempre JWTs (começam com eyJ)
export const isKeyValidFormat = supabaseAnonKey.startsWith('eyJ');

export const isConfigured = 
  supabaseUrl !== '' && 
  !supabaseUrl.includes('SUBSTITUA') && 
  supabaseUrl.startsWith('https://');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
