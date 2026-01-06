
import React from 'react';
import { Plus, UserPlus, Shield, Mail, Key, Trash2, CheckCircle, XCircle, Activity, Loader2 } from 'lucide-react';
import { db } from '../services/db';
import { User, UserRole, AuditLog } from '../types';

const UserManagement: React.FC = () => {
  const [users, setUsers] = React.useState<User[]>([]);
  // Fix: Initialize with empty array and fetch via useEffect to avoid setting a Promise into state
  const [logs, setLogs] = React.useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Added async data fetching in useEffect to properly load users and logs
  React.useEffect(() => {
    const loadData = async () => {
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
    loadData();
  }, []);

  // Fixed toggleStatus to be async and call the correct database method (saveUser) for the specific user
  const toggleStatus = async (id: string) => {
    const userToUpdate = users.find(u => u.id === id);
    if (!userToUpdate) return;

    const newStatus = !userToUpdate.active;
    
    try {
      // Corrected call to save individual user status instead of attempting to save entire array with non-existent method
      await db.saveUser({ id, active: newStatus });
      
      setUsers(users.map(u => 
        u.id === id ? { ...u, active: newStatus } : u
      ));

      // Audit log the change
      await db.addLog({
        userId: 'SYSTEM',
        userName: 'Admin',
        action: 'USER_UPDATE',
        details: `Status do usuário ${userToUpdate.email} alterado para ${newStatus ? 'Ativo' : 'Inativo'}`
      });

      // Update local logs after the action
      const updatedLogs = await db.getLogs();
      setLogs(updatedLogs);
    } catch (err) {
      alert("Erro ao atualizar status do usuário");
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
        <p className="text-slate-500 font-medium">Carregando usuários e logs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Gestão de Usuários</h2>
          <p className="text-slate-500">Controle de acessos e auditoria do sistema.</p>
        </div>
        <button className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all">
          <UserPlus size={18} />
          Convidar Usuário
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-bold border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Usuário</th>
                  <th className="px-6 py-4">Perfil</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600">
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{u.name}</p>
                          <p className="text-xs text-slate-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 w-fit ${
                        u.role === UserRole.ADMIN ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-600'
                      }`}>
                        <Shield size={12} />
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => toggleStatus(u.id)} className="transition-transform active:scale-90">
                        {u.active ? 
                          <CheckCircle className="text-emerald-500 mx-auto" size={20} /> : 
                          <XCircle className="text-slate-300 mx-auto" size={20} />
                        }
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Resetar Senha">
                          <Key size={18} />
                        </button>
                        <button className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="Excluir">
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
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Activity size={18} className="text-indigo-600" />
              Logs de Auditoria
            </h3>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {logs.map(log => (
                <div key={log.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">{log.action}</span>
                    <span className="text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-xs font-bold text-slate-700 mb-0.5">{log.userName}</p>
                  <p className="text-[11px] text-slate-500 leading-tight">{log.details}</p>
                </div>
              ))}
              {logs.length === 0 && <p className="text-center py-10 text-slate-400 text-sm">Nenhum log registrado.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
