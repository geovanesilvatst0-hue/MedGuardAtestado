
import React from 'react';
import { UserPlus, Shield, Key, Trash2, CheckCircle, XCircle, Activity, Loader2, X, Building2, MapPin, Save, AlertCircle } from 'lucide-react';
import { db } from '../services/db';
import { User, UserRole, AuditLog } from '../types';

const UserManagement: React.FC = () => {
  const [users, setUsers] = React.useState<User[]>([]);
  const [logs, setLogs] = React.useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    role: UserRole.VIEWER,
    cnpj: '',
    city: ''
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [u, l] = await Promise.all([db.getUsers(), db.getLogs()]);
      setUsers(u);
      setLogs(l);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    loadData();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const newUser = {
        ...formData,
        id: `user-${Date.now()}`, // O db.ts vai converter isso para UUID se necessário
        active: true,
      };
      
      await db.saveUser(newUser as any);
      
      await db.addLog({
        userId: 'ADMIN',
        userName: 'Administrador',
        action: 'USER_CREATE',
        details: `Novo usuário ${formData.email} criado. Perfil: ${formData.role}. Escopo: ${formData.cnpj || formData.city || 'Global'}`
      });
      
      setIsModalOpen(false);
      setFormData({ name: '', email: '', role: UserRole.VIEWER, cnpj: '', city: '' });
      loadData();
    } catch (err: any) {
      setError(err.message || "Não foi possível criar o usuário.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStatus = async (id: string) => {
    const userToUpdate = users.find(u => u.id === id);
    if (!userToUpdate) return;
    const newStatus = !userToUpdate.active;
    try {
      await db.saveUser({ id, active: newStatus });
      setUsers(users.map(u => u.id === id ? { ...u, active: newStatus } : u));
    } catch (err) {
      alert("Erro ao atualizar status.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
        <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">Acessando Diretório de Usuários...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Controle de Acessos</h2>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Segurança & Governança • LGPD Compliance</p>
        </div>
        <button 
          onClick={() => { setError(null); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-6 py-3.5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
        >
          <UserPlus size={16} />
          Novo Usuário
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] uppercase text-slate-400 font-black border-b border-slate-100">
                <tr>
                  <th className="px-8 py-5">Identificação</th>
                  <th className="px-8 py-5">Escopo de Acesso</th>
                  <th className="px-8 py-5 text-center">Status</th>
                  <th className="px-8 py-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs">
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-black text-slate-900">{u.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col gap-1.5">
                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 w-fit ${
                          u.role === UserRole.ADMIN ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          <Shield size={10} />
                          {u.role}
                        </span>
                        {(u.cnpj || u.city) ? (
                          <div className="flex flex-wrap gap-2">
                            {u.cnpj && <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md"><Building2 size={10}/> {u.cnpj}</span>}
                            {u.city && <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md"><MapPin size={10}/> {u.city}</span>}
                          </div>
                        ) : (
                          <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest italic">Acesso Global</span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <button onClick={() => toggleStatus(u.id)} className="transition-transform active:scale-90">
                        {u.active ? 
                          <CheckCircle className="text-emerald-500 mx-auto" size={22} /> : 
                          <XCircle className="text-slate-300 mx-auto" size={22} />
                        }
                      </button>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                          <Key size={18} />
                        </button>
                        <button className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl text-white">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-6 flex items-center gap-2 text-indigo-400">
              <Activity size={16} />
              Logs de Auditoria
            </h3>
            <div className="space-y-5 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar-dark">
              {logs.map(log => (
                <div key={log.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">{log.action}</span>
                    <span className="text-[8px] text-white/30 font-mono">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-[10px] font-black text-white/90 mb-1">{log.userName}</p>
                  <p className="text-[9px] text-white/50 leading-relaxed italic">"{log.details}"</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-[150] animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-800 tracking-tight">Configurar Novo Acesso</h2>
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Definição de Perfil e Escopo</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-3 text-slate-400 hover:bg-slate-50 rounded-2xl transition-all">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-8 space-y-6">
              {error && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-800 text-[11px] font-bold animate-in slide-in-from-top-2">
                  <AlertCircle size={18} className="shrink-0" />
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                  <input required type="text" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300 outline-none" 
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ex: Maria Souza" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail Corporativo</label>
                  <input required type="email" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300 outline-none" 
                    value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="maria@empresa.com.br" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Papel no Sistema</label>
                  <select className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black focus:ring-4 focus:ring-indigo-50" 
                    value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRole})}>
                    <option value={UserRole.VIEWER}>Visualizador (Somente Leitura)</option>
                    <option value={UserRole.ADMIN}>Administrador (Pode Editar/Excluir)</option>
                  </select>
                </div>
              </div>

              <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield size={14} className="text-indigo-600" />
                  <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Restrição de Escopo (Opcional)</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Filtrar por CNPJ</label>
                    <input type="text" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold" 
                      value={formData.cnpj} onChange={e => setFormData({...formData, cnpj: e.target.value})} placeholder="00.000.000/0001-00" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Filtrar por Cidade</label>
                    <input type="text" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold" 
                      value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} placeholder="Ex: São Paulo" />
                  </div>
                </div>
                <p className="text-[8px] text-slate-400 font-bold italic text-center">Deixe em branco para acesso total a todos os dados.</p>
              </div>

              <div className="flex items-center justify-end gap-4 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600">Cancelar</button>
                <button type="submit" disabled={isSaving} className="px-10 py-4 bg-indigo-600 text-white rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 flex items-center gap-2 active:scale-95 disabled:bg-slate-300">
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Criar Usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
