
import React from 'react';
import { UserPlus, Shield, Key, Trash2, CheckCircle, XCircle, Activity, Loader2, X, MapPin, Save, AlertCircle, Eye, EyeOff, Lock, RefreshCw, AlertTriangle } from 'lucide-react';
import { db } from '../services/db';
import { User, UserRole, AuditLog } from '../types';

const UserManagement: React.FC = () => {
  const [users, setUsers] = React.useState<User[]>([]);
  const [logs, setLogs] = React.useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    password: '',
    role: UserRole.VIEWER,
    city: ''
  });

  const [newPassword, setNewPassword] = React.useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const u = await db.getUsers();
      const l = await db.getLogs();
      setUsers(u || []);
      setLogs(l || []);
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
      if (formData.password.length < 6) throw new Error("A senha deve ter no mínimo 6 caracteres.");

      await db.saveUser({ ...formData, active: true });
      
      await db.addLog({
        userId: 'ADMIN_GLOBAL',
        userName: 'Administrador Global',
        action: 'USER_CREATE',
        details: `Novo acesso criado para ${formData.email}. Perfil: ${formData.role}.`
      });
      
      setIsModalOpen(false);
      setFormData({ name: '', email: '', password: '', role: UserRole.VIEWER, city: '' });
      loadData();
    } catch (err: any) {
      console.error("Erro capturado no Form:", err);
      setError(err.message || "Erro desconhecido ao salvar.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!window.confirm(`TEM CERTEZA? Isso removerá o acesso de ${email}.`)) return;
    
    try {
      await db.deleteUser(userId);
      await db.addLog({
        userId: 'ADMIN_GLOBAL',
        userName: 'Administrador Global',
        action: 'USER_DELETE',
        details: `Acesso removido para o e-mail ${email}.`
      });
      loadData();
    } catch (err: any) {
      alert("Erro ao excluir usuário: " + err.message);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (newPassword.length < 6) return setError("Mínimo 6 caracteres.");

    setIsSaving(true);
    try {
      await db.addLog({
        userId: 'ADMIN_GLOBAL',
        userName: 'Administrador Global',
        action: 'PASSWORD_RESET',
        details: `Senha resetada para o usuário ${selectedUser.email}.`
      });

      alert(`Ação de troca de senha registrada para ${selectedUser.email}.`);
      setIsPasswordModalOpen(false);
      setNewPassword('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStatus = async (id: string) => {
    const userToUpdate = users.find(u => u.id === id);
    if (!userToUpdate) return;
    const newStatus = !userToUpdate.active;
    try {
      await db.saveUser({ id, active: newStatus, name: userToUpdate.name, email: userToUpdate.email, role: userToUpdate.role });
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
                  <th className="px-8 py-5">Escopo</th>
                  <th className="px-8 py-5 text-center">Status</th>
                  <th className="px-8 py-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-10 text-center text-slate-400 font-medium text-xs">Nenhum perfil carregado.</td>
                  </tr>
                ) : users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs">
                          {u.name?.charAt(0) || '?'}
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
                        {u.city ? (
                          <div className="flex flex-wrap gap-2">
                            <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md"><MapPin size={10}/> {u.city}</span>
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
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => { setSelectedUser(u); setIsPasswordModalOpen(true); setError(null); }}
                          className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                        >
                          <Key size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(u.id, u.email)}
                          className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                        >
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
              Rastro de Auditoria
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
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-800 tracking-tight">Novo Acesso</h2>
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Definição de Perfil</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-3 text-slate-400 hover:bg-slate-50 rounded-2xl transition-all">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-8 space-y-5 max-h-[75vh] overflow-y-auto custom-scrollbar">
              {error && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-800 text-[11px] font-bold animate-in shake duration-300">
                  <AlertTriangle size={18} className="shrink-0" />
                  <div className="flex-1">
                    <p className="font-black">O Banco recusou o salvamento:</p>
                    <p className="opacity-70 font-medium">{error}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                  <input required type="text" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-50 outline-none transition-all" 
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ex: Maria Souza" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
                    <input required type="email" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-50 outline-none" 
                      value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="maria@empresa.com" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha</label>
                    <div className="relative">
                      <input required type={showPassword ? "text" : "password"} className="w-full pl-5 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-50 outline-none" 
                        value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="Mín. 6 dígitos" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Papel</label>
                  <select className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black focus:ring-4 focus:ring-indigo-50" 
                    value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRole})}>
                    <option value={UserRole.VIEWER}>Visualizador</option>
                    <option value={UserRole.ADMIN}>Administrador</option>
                  </select>
                </div>
              </div>

              <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield size={14} className="text-indigo-600" />
                  <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Escopo (Filtros)</span>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Cidade (Opcional)</label>
                  <div className="relative group">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" size={18} />
                    <input type="text" className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-indigo-50 outline-none transition-all" 
                      value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} placeholder="Ex: São Paulo" />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-4 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-[10px] font-black uppercase text-slate-400">Cancelar</button>
                <button type="submit" disabled={isSaving} className="px-10 py-4 bg-indigo-600 text-white rounded-[1.25rem] text-[10px] font-black uppercase shadow-xl shadow-indigo-100 flex items-center gap-2 disabled:bg-slate-300">
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Criar Acesso
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
