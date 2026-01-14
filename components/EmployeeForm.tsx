
import React from 'react';
import { X, Save, User, CreditCard, Building2, Briefcase, Hash, MapPin, Loader2, AlertCircle } from 'lucide-react';
import { Employee } from '../types';

interface EmployeeFormProps {
  onClose: () => void;
  onSave: (data: Partial<Employee>) => Promise<void>;
  initialData?: Employee;
}

const EmployeeForm: React.FC<EmployeeFormProps> = ({ onClose, onSave, initialData }) => {
  const [formData, setFormData] = React.useState<Partial<Employee>>(
    initialData || {
      name: '',
      cpf: '',
      registration: '',
      department: '',
      role: '',
      city: ''
    }
  );
  
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    
    setIsSaving(true);
    setError(null);
    
    try {
      await onSave(formData);
    } catch (err: any) {
      console.error("Erro ao salvar prontuário:", err);
      setError(err.message || "Não foi possível salvar os dados. Verifique a conexão.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center p-4 z-[110] backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-white/20">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">
              {initialData ? 'Editar Funcionário' : 'Novo Prontuário'}
            </h2>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">Gestão de Dados do Colaborador</p>
          </div>
          <button onClick={onClose} className="p-3 text-slate-400 hover:bg-slate-50 hover:text-rose-500 rounded-2xl transition-all">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar bg-white">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 text-rose-800 animate-in shake duration-300">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-[11px] font-black uppercase tracking-widest mb-1">Erro no Processamento</p>
                <p className="text-xs font-bold leading-tight opacity-80">{error}</p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Informações Pessoais</label>
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" size={20} />
              <input required name="name" className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300 outline-none transition-all uppercase placeholder:normal-case"
                value={formData.name} onChange={handleChange} placeholder="Nome completo do funcionário" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="relative group">
                <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" size={20} />
                <input required name="cpf" className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-50 outline-none transition-all"
                  value={formData.cpf} onChange={handleChange} placeholder="CPF" />
              </div>
              <div className="relative group">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" size={20} />
                <input required name="registration" className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-50 outline-none transition-all uppercase"
                  value={formData.registration} onChange={handleChange} placeholder="Matrícula" />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Lotação e Unidade</label>
            <div className="grid grid-cols-2 gap-4">
              <div className="relative group">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" size={20} />
                <input required name="department" className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-50 outline-none transition-all uppercase placeholder:normal-case"
                  value={formData.department} onChange={handleChange} placeholder="Setor / Depto" />
              </div>
              <div className="relative group">
                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" size={20} />
                <input required name="role" className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-50 outline-none transition-all uppercase placeholder:normal-case"
                  value={formData.role} onChange={handleChange} placeholder="Cargo" />
              </div>
            </div>

            <div className="relative group">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" size={18} />
              <input name="city" className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-50 outline-none transition-all uppercase placeholder:normal-case"
                value={formData.city} onChange={handleChange} placeholder="Cidade de Atuação" />
            </div>
            <p className="text-[9px] text-slate-400 font-bold italic text-center leading-relaxed">O campo de Cidade define quem terá acesso a este funcionário no painel restrito.</p>
          </div>

          <div className="flex items-center justify-end gap-4 pt-8 border-t border-slate-100 shrink-0">
            <button type="button" onClick={onClose} disabled={isSaving} className="px-8 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 disabled:opacity-50">Cancelar</button>
            <button type="submit" disabled={isSaving} className="px-12 py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-[11px] shadow-2xl shadow-indigo-100 hover:bg-indigo-700 hover:-translate-y-1 transition-all flex items-center gap-3 active:scale-95 disabled:bg-slate-300 disabled:shadow-none">
              {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
              {isSaving ? 'Processando...' : 'Confirmar Cadastro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmployeeForm;
