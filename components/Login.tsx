
import React from 'react';
import { ShieldCheck, Mail, Lock, Loader2, AlertCircle, Eye, EyeOff, CheckCircle2, Settings, ArrowRight, RefreshCw, Database } from 'lucide-react';
import { supabase, isKeyValidFormat } from '../services/supabase';
import { db } from '../services/db';
import { User, UserRole } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = React.useState('admin@medguard.com');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [diagnostic, setDiagnostic] = React.useState<string | null>(null);
  const [error, setError] = React.useState<{message: string, type?: 'auth' | 'db' | 'config' | 'supabase_setting'} | null>(null);

  // Limpa qualquer sessão residual ao carregar a tela de login
  React.useEffect(() => {
    supabase.auth.signOut();
  }, []);

  const runDiagnostic = async () => {
    setDiagnostic("Testando conexão com o banco...");
    try {
      const { error: dbError } = await supabase.from('profiles').select('id').limit(1);
      if (dbError) {
        if (dbError.message.includes('relation "profiles" does not exist')) {
          setDiagnostic("ERRO: A tabela 'profiles' não foi encontrada no seu banco de dados.");
        } else if (dbError.code === '42501') {
          setDiagnostic("ERRO: A tabela 'profiles' existe, mas as políticas de RLS estão bloqueando o acesso.");
        } else {
          setDiagnostic(`ERRO DB: ${dbError.message}`);
        }
      } else {
        setDiagnostic("CONEXÃO OK: O banco de dados está respondendo corretamente.");
      }
    } catch (e) {
      setDiagnostic("ERRO CRÍTICO: Não foi possível contatar o servidor Supabase.");
    }
  };

  const handleDemoLogin = () => {
    const mockUser: User = {
      id: 'demo-user',
      name: 'Usuário Demonstrativo',
      email: 'demo@medguard.com',
      role: UserRole.ADMIN,
      active: true,
      createdAt: new Date().toISOString()
    };
    onLogin(mockUser);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setDiagnostic(null);

    try {
      if (!isKeyValidFormat) {
        throw { message: 'Configuração inválida: Chave Anon do Supabase incorreta.', type: 'config' };
      }

      // Tenta o login
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        console.error("Erro Auth:", authError);
        let msg = authError.message;
        let type: any = 'auth';

        if (msg.includes('Email not confirmed')) {
          msg = 'O e-mail ainda consta como não confirmado no Supabase.';
          type = 'supabase_setting';
        } else if (msg.includes('Invalid login credentials')) {
          msg = 'E-mail ou senha incorretos. Verifique os dados digitados.';
        }
        
        throw { message: msg, type };
      }

      if (data.user) {
        // Busca o perfil
        let profile = await db.getProfile(data.user.id);
        
        if (!profile) {
          // Tenta criar perfil se não existir (Fallback)
          const { data: newProfile, error: insError } = await supabase.from('profiles').insert([{
            id: data.user.id,
            name: email.split('@')[0],
            email: email,
            role: 'ADMIN',
            active: true
          }]).select().single();
          
          if (insError) {
            console.error("Erro ao criar perfil:", insError);
            throw { message: 'Autenticado com sucesso, mas a tabela "profiles" recusou a criação do seu perfil (RLS ou Tabela Ausente).', type: 'db' };
          }
          
          profile = { 
            id: newProfile.id,
            name: newProfile.name,
            email: newProfile.email,
            role: newProfile.role as UserRole,
            active: newProfile.active,
            createdAt: newProfile.created_at
          };
        }

        if (profile) {
          if (!profile.active) {
            throw { message: 'Esta conta está desativada.', type: 'auth' };
          }
          setIsSuccess(true);
          setTimeout(() => onLogin(profile!), 800);
        }
      }
    } catch (err: any) {
      setError({ 
        message: err.message || 'Erro ao processar autenticação.',
        type: err.type || 'auth'
      });
      // Se for erro de banco ou auth, sugere diagnóstico
      if (err.type === 'db' || err.type === 'auth') {
        runDiagnostic();
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorativo */}
      <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-indigo-600/10 blur-[150px] rounded-full" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-emerald-600/10 blur-[150px] rounded-full" />

      <div className="max-w-md w-full z-10">
        <div className="text-center mb-10">
          <div className="inline-flex p-4 bg-indigo-600 rounded-3xl mb-4 shadow-2xl shadow-indigo-500/40">
            <ShieldCheck size={48} className="text-white" />
          </div>
          <h1 className="text-4xl font-black text-white mb-1 tracking-tight">MedGuard</h1>
          <p className="text-slate-400 font-bold tracking-[0.2em] text-[10px] uppercase opacity-60">Sessão Segura v2.5</p>
        </div>

        <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl border border-white/20 relative overflow-hidden">
          {isSuccess && (
            <div className="absolute inset-0 bg-white z-50 flex flex-col items-center justify-center animate-in fade-in duration-300">
              <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mb-4 shadow-lg shadow-emerald-200">
                <CheckCircle2 size={32} />
              </div>
              <p className="font-black text-slate-800 text-xl tracking-tight">Bem-vindo!</p>
              <p className="text-slate-500 text-sm font-medium">Redirecionando...</p>
            </div>
          )}

          <div className="mb-8">
            <h2 className="text-2xl font-black text-slate-900 leading-tight">Painel de Acesso</h2>
            <p className="text-slate-500 text-sm font-medium">Gestão de Saúde Ocupacional & RH</p>
          </div>

          {error && (
            <div className={`mb-6 p-4 rounded-2xl border flex gap-3 animate-in slide-in-from-top-4 duration-300 ${
              error.type === 'supabase_setting' ? 'bg-amber-50 border-amber-200 text-amber-800' :
              error.type === 'db' ? 'bg-indigo-50 border-indigo-200 text-indigo-800' :
              'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              <div className="shrink-0">
                <AlertCircle size={20} className={error.type === 'auth' ? 'text-rose-500' : 'text-current'} />
              </div>
              <div className="space-y-3 flex-1">
                <p className="text-xs font-bold leading-tight">{error.message}</p>
                
                {diagnostic && (
                  <div className="bg-white/60 p-3 rounded-xl text-[10px] font-mono leading-relaxed border border-slate-200/50 text-slate-600">
                    <div className="flex items-center gap-1.5 mb-1 text-indigo-600 font-bold uppercase tracking-widest text-[8px]">
                      <Database size={10} /> Diagnóstico Técnico
                    </div>
                    {diagnostic}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <button onClick={() => window.location.reload()} className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest bg-white px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all shadow-sm">
                    <RefreshCw size={12} /> Recarregar App
                  </button>
                  <button onClick={handleDemoLogin} className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all p-2">
                    Entrar como Demo
                  </button>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">Usuário</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                <input
                  type="email"
                  required
                  placeholder="admin@medguard.com"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:bg-white focus:border-indigo-300 outline-none transition-all text-sm font-semibold text-slate-800"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">Senha Corporativa</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:bg-white focus:border-indigo-300 outline-none transition-all text-sm font-semibold text-slate-800"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed group"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  <span>Entrar no Sistema</span>
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100">
             <div className="flex items-center justify-center gap-2 mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Infraestrutura Cloud Supabase
                </p>
             </div>
             <p className="text-[9px] text-center text-slate-400 leading-relaxed max-w-[200px] mx-auto">
               Este sistema utiliza criptografia de ponta a ponta para proteção de dados sensíveis.
             </p>
          </div>
        </div>
        
        <p className="text-center mt-8 text-slate-600 text-[10px] font-black uppercase tracking-widest opacity-30">
          MedGuard Occupational Health • v2.5
        </p>
      </div>
    </div>
  );
};

export default Login;
