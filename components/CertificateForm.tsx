
import React from 'react';
import { X, Upload, Save, User, FileText, Stethoscope, AlertCircle, ShieldCheck, CheckCircle2, RefreshCw, Loader2 } from 'lucide-react';
import { Employee, MedicalCertificate } from '../types';

interface CertificateFormProps {
  employees: Employee[];
  onClose: () => void;
  onSave: (data: Partial<MedicalCertificate>) => Promise<void>;
  initialData?: MedicalCertificate;
}

const CertificateForm: React.FC<CertificateFormProps> = ({ employees, onClose, onSave, initialData }) => {
  const [formData, setFormData] = React.useState<Partial<MedicalCertificate>>(
    initialData || {
      employeeId: '',
      issueDate: '',
      startDate: '',
      endDate: '',
      days: 1,
      cid: '',
      doctorName: '',
      crm: '',
      type: 'Doença'
    }
  );

  const [file, setFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [lgpdConsent, setLgpdConsent] = React.useState(!!initialData?.cid);

  // Cálculo automático de dias
  React.useEffect(() => {
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        if (diffDays !== formData.days) {
          setFormData(prev => ({ ...prev, days: diffDays > 0 ? diffDays : 1 }));
        }
      }
    }
  }, [formData.startDate, formData.endDate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'cid' && value.trim() !== '') setLgpdConsent(true);
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validate = (): string | null => {
    if (!formData.employeeId) return "Selecione o paciente vinculado.";
    if (!formData.issueDate) return "Informe a data de emissão.";
    if (!formData.startDate) return "Informe a data de início do afastamento.";
    if (!formData.endDate) return "Informe a data de término do afastamento.";
    if (!formData.doctorName) return "Informe o nome do médico.";
    if (!formData.crm) return "Informe o CRM do médico.";
    if (formData.cid && formData.cid.trim() !== '' && !lgpdConsent) {
      return "Para salvar o CID, você deve marcar a autorização de conformidade LGPD.";
    }
    return null;
  };

  const handleManualSubmit = async () => {
    console.log("Tentando salvar formulário...", formData);
    
    const error = validate();
    if (error) {
      console.warn("Validação falhou:", error);
      alert(`⚠️ CAMPOS PENDENTES:\n${error}`);
      return;
    }

    setIsSaving(true);
    try {
      console.log("Chamando onSave...");
      await onSave({
        ...formData,
        cid: lgpdConsent ? formData.cid : '',
        fileName: file?.name || initialData?.fileName,
        status: 'ACTIVE' as any
      });
      console.log("onSave concluído com sucesso.");
    } catch (err: any) {
      console.error("Erro fatal ao salvar no App:", err);
      alert(`Erro ao salvar: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center p-4 z-[100] backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-[2rem] w-full max-w-5xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-white/20">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner">
              <FileText size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">
                {initialData ? 'Editar Atestado' : 'Registrar Atestado'}
              </h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Protocolo de Saúde Ocupacional</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-50 hover:text-rose-500 rounded-xl transition-all">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Lado Esquerdo: Upload & Preview */}
          <div className="w-full md:w-[35%] p-6 bg-slate-50 border-r border-slate-100 overflow-y-auto space-y-6">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Anexo do Documento</h3>
            <div className={`group relative border-2 border-dashed rounded-3xl p-4 text-center transition-all bg-white ${file ? 'border-indigo-400' : 'border-slate-200'}`}>
              <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={e => {
                const f = e.target.files?.[0];
                if (f) { setFile(f); setPreviewUrl(URL.createObjectURL(f)); }
              }} />
              {previewUrl ? (
                <img src={previewUrl} className="max-h-64 mx-auto rounded-xl shadow-md object-contain w-full" alt="Preview" />
              ) : (
                <div className="py-12 flex flex-col items-center">
                  <Upload size={32} className="text-slate-300 mb-2" />
                  <p className="text-[11px] font-bold text-slate-400 uppercase">Clique para anexar</p>
                </div>
              )}
            </div>
            {file && (
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center gap-3">
                <CheckCircle2 size={16} className="text-indigo-600" />
                <span className="text-[10px] font-bold text-indigo-700 truncate">{file.name}</span>
              </div>
            )}
          </div>

          {/* Lado Direito: Formulário */}
          <div className="flex-1 p-8 overflow-y-auto bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-full space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Paciente Vinculado *</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <select name="employeeId" className={`w-full pl-12 pr-4 py-3.5 border rounded-2xl outline-none text-sm font-bold transition-all appearance-none ${!formData.employeeId ? 'border-rose-200 bg-rose-50/30' : 'border-slate-200 bg-slate-50'}`} value={formData.employeeId} onChange={handleChange}>
                    <option value="">Selecione o colaborador...</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.registration})</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Emissão</label>
                  <input type="date" name="issueDate" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" value={formData.issueDate} onChange={handleChange} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Início</label>
                  <input type="date" name="startDate" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" value={formData.startDate} onChange={handleChange} />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo</label>
                  <select name="type" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" value={formData.type} onChange={handleChange}>
                    <option value="Doença">Doença</option>
                    <option value="Acidente">Acidente</option>
                    <option value="Maternidade">Maternidade</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Término ({formData.days} dias)</label>
                  <input type="date" name="endDate" className="w-full px-4 py-3 bg-indigo-50 border border-indigo-100 rounded-xl text-sm font-bold text-indigo-700" value={formData.endDate} onChange={handleChange} />
                </div>
              </div>

              <div className={`col-span-full p-5 rounded-3xl border-2 transition-all ${lgpdConsent ? 'bg-indigo-50/50 border-indigo-200' : 'bg-slate-50 border-slate-100'}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <ShieldCheck size={20} className={lgpdConsent ? 'text-indigo-600' : 'text-slate-300'} />
                    <span className="text-[10px] font-black text-slate-700 uppercase">Conformidade CID (LGPD)</span>
                  </div>
                  <input type="checkbox" className="w-5 h-5 accent-indigo-600" checked={lgpdConsent} onChange={e => setLgpdConsent(e.target.checked)} />
                </div>
                <input 
                  type="text" 
                  name="cid" 
                  placeholder="Código CID-10 (Ex: M54.5)" 
                  className={`w-full px-4 py-3 border rounded-xl outline-none text-sm font-bold ${lgpdConsent ? 'bg-white border-indigo-200' : 'bg-slate-100 text-slate-400'}`}
                  disabled={!lgpdConsent}
                  value={formData.cid} 
                  onChange={handleChange} 
                />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Médico Assistente</label>
                <div className="relative">
                  <Stethoscope className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input type="text" name="doctorName" className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" value={formData.doctorName} onChange={handleChange} />
                </div>
              </div>
              
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CRM/UF</label>
                <input type="text" name="crm" placeholder="000000/UF" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" value={formData.crm} onChange={handleChange} />
              </div>
            </div>

            <div className="flex items-center justify-end gap-4 pt-8 mt-6 border-t border-slate-100">
              <button type="button" onClick={onClose} className="px-6 py-3 text-slate-400 font-bold uppercase text-[10px] tracking-widest hover:text-slate-600">Cancelar</button>
              <button 
                type="button"
                onClick={handleManualSubmit}
                disabled={isSaving}
                className="px-10 py-4 bg-indigo-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:bg-slate-300"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {isSaving ? 'Gravando...' : 'Gravar no Prontuário'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CertificateForm;
