
import React from 'react';
import { X, Upload, Save, User, FileText, Stethoscope, ShieldCheck, CheckCircle2, Loader2, Trash2, ExternalLink, AlertTriangle, Copy, Sparkles, Wand2, MessageSquare, Key } from 'lucide-react';
import { Employee, MedicalCertificate } from '../types';
import { db } from '../services/db';
import { GoogleGenAI, Type } from "@google/genai";

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
      type: 'Doença',
      fileUrl: '',
      observations: ''
    }
  );

  const [file, setFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(initialData?.fileUrl || null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(false);
  const [lgpdConsent, setLgpdConsent] = React.useState(!!initialData?.cid);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [technicalError, setTechnicalError] = React.useState<string | null>(null);
  const [analysisStep, setAnalysisStep] = React.useState('');

  const isDemo = employees.some(e => e.id.startsWith('demo-')) || initialData?.id?.startsWith('demo-');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'cid' && value.trim() !== '') setLgpdConsent(true);
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = error => reject(error);
    });
  };

  const handleOpenKeyManager = async () => {
    if ((window as any).aistudio?.openSelectKey) {
      await (window as any).aistudio.openSelectKey();
    } else {
      alert("Gerenciador de chaves indisponível neste ambiente.");
    }
  };

  const handleAnalyzeDocument = async () => {
    if (!file) return;

    setErrorMsg(null);
    setTechnicalError(null);
    setIsAnalyzing(true);
    setAnalysisStep('Iniciando análise inteligente...');
    
    try {
      const base64Data = await fileToBase64(file);
      
      // Cria uma nova instância para garantir que pegamos a chave mais atual do seletor
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      
      setAnalysisStep('Extraindo dados com Gemini 3 Pro...');
      
      const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: [
          {
            parts: [
              { inlineData: { data: base64Data, mimeType: file.type || 'image/jpeg' } },
              { text: `Aja como um perito em RH. Analise este atestado médico e extraia os dados em JSON puro.
              Campos: patientName, startDate, endDate, days, cid, doctorName, crm, type (Doença, Acidente, Maternidade, Outros), observations.
              Datas em YYYY-MM-DD. Se não encontrar algo, retorne null no campo.` }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              patientName: { type: Type.STRING },
              startDate: { type: Type.STRING },
              endDate: { type: Type.STRING },
              days: { type: Type.INTEGER },
              cid: { type: Type.STRING },
              doctorName: { type: Type.STRING },
              crm: { type: Type.STRING },
              type: { type: Type.STRING },
              observations: { type: Type.STRING }
            }
          }
        }
      });

      setAnalysisStep('Processando resposta...');
      
      if (!response.text) throw new Error("A IA não retornou dados válidos.");

      const result = JSON.parse(response.text);

      // Match do funcionário
      let foundEmployeeId = formData.employeeId;
      if (result.patientName) {
        const matched = employees.find(e => 
          e.name.toLowerCase().includes(result.patientName.toLowerCase()) ||
          result.patientName.toLowerCase().includes(e.name.toLowerCase())
        );
        if (matched) foundEmployeeId = matched.id;
      }

      setFormData(prev => ({
        ...prev,
        employeeId: foundEmployeeId,
        startDate: result.startDate || prev.startDate,
        endDate: result.endDate || prev.endDate,
        days: result.days || prev.days,
        cid: result.cid || prev.cid,
        doctorName: result.doctorName || prev.doctorName,
        crm: result.crm || prev.crm,
        type: (['Doença', 'Acidente', 'Maternidade', 'Outros'].includes(result.type) ? result.type : 'Doença') as any,
        observations: result.observations || prev.observations
      }));

      if (result.cid) setLgpdConsent(true);
      setAnalysisStep('Sucesso!');
      setTimeout(() => setAnalysisStep(''), 2000);

    } catch (err: any) {
      console.error("ERRO IA:", err);
      setErrorMsg("Falha na análise automática.");
      
      // Captura o erro técnico real para exibição
      const errorDetail = err.message || "Erro desconhecido";
      setTechnicalError(errorDetail);

      if (errorDetail.includes("Requested entity was not found") || errorDetail.includes("API key")) {
        setTechnicalError("Chave de API inválida ou modelo não disponível com a chave atual.");
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleManualSubmit = async () => {
    if (!formData.employeeId) return alert("Selecione o paciente.");
    setIsSaving(true);
    try {
      let finalUrl = formData.fileUrl || initialData?.fileUrl || '';
      if (file) {
        setUploadProgress(true);
        finalUrl = await db.uploadFile(file, isDemo);
        setUploadProgress(false);
      }
      await onSave({ ...formData, fileUrl: finalUrl, cid: lgpdConsent ? formData.cid : '' });
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSaving(false);
      setUploadProgress(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center p-4 z-[100] backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] w-full max-w-6xl shadow-2xl flex flex-col h-full max-h-[85vh] overflow-hidden border border-white/20">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-[1.25rem] flex items-center justify-center shadow-sm">
              <FileText size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">{initialData ? 'Editar Atestado' : 'Registrar Atestado'}</h2>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-0.5">Protocolo de Saúde Ocupacional • v2.5</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 text-slate-400 hover:bg-slate-50 hover:text-rose-500 rounded-2xl transition-all">
            <X size={28} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row min-h-0">
          {/* Coluna Esquerda */}
          <div className="w-full md:w-[32%] p-8 bg-slate-50/50 border-r border-slate-100 overflow-y-auto space-y-8 shrink-0">
            {errorMsg && (
              <div className="p-5 bg-rose-50 border border-rose-100 rounded-[1.5rem] space-y-3 animate-in slide-in-from-top-4">
                <div className="flex items-center gap-2 text-rose-600">
                  <AlertTriangle size={18} />
                  <span className="text-[10px] font-black uppercase tracking-widest">{errorMsg}</span>
                </div>
                {technicalError && (
                  <div className="p-3 bg-white/50 rounded-xl border border-rose-100">
                    <p className="text-[9px] font-mono text-rose-700 leading-tight">{technicalError}</p>
                  </div>
                )}
                <button 
                  onClick={handleOpenKeyManager}
                  className="w-full py-2 bg-rose-100 text-rose-700 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-rose-200 transition-all flex items-center justify-center gap-2"
                >
                  <Key size={12} /> Configurar Minha Chave
                </button>
              </div>
            )}

            <div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Documentação Comprobatória</h3>
              <div className="group relative border-2 border-dashed rounded-[2rem] p-6 text-center transition-all bg-white min-h-[220px] flex flex-col items-center justify-center border-slate-200 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/5 cursor-pointer">
                {(!previewUrl) ? (
                  <>
                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) { setFile(f); setPreviewUrl(URL.createObjectURL(f)); setTechnicalError(null); setErrorMsg(null); }
                    }} />
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Upload size={32} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
                    </div>
                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest leading-relaxed">Clique ou arraste<br/><span className="text-[9px] text-slate-400">PDF, JPG ou PNG</span></p>
                  </>
                ) : (
                  <div className="w-full space-y-6 animate-in zoom-in-95 duration-200">
                    <div className="p-6 bg-indigo-50 rounded-[1.5rem] border border-indigo-100 flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                        <CheckCircle2 size={32} className="text-emerald-500" />
                      </div>
                      <p className="text-[11px] font-black text-indigo-700 uppercase tracking-widest">Documento Carregado</p>
                    </div>
                    <div className="flex flex-col gap-3">
                      <button 
                        onClick={handleAnalyzeDocument}
                        disabled={isAnalyzing}
                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:bg-slate-300 active:scale-95"
                      >
                        {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                        Analisar com IA
                      </button>
                      <a href={previewUrl} target="_blank" rel="noreferrer" className="w-full py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 transition-all shadow-sm active:scale-95">
                        <ExternalLink size={14} /> Abrir Documento
                      </a>
                      <button onClick={() => { setPreviewUrl(null); setFile(null); setErrorMsg(null); setTechnicalError(null); }} className="w-full py-3 text-rose-500 text-[9px] font-black uppercase tracking-widest hover:bg-rose-50 rounded-xl transition-all flex items-center justify-center gap-2">
                        <Trash2 size={14} /> Remover
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {(isAnalyzing || uploadProgress) && (
              <div className="p-5 bg-indigo-600 rounded-[1.5rem] text-white flex items-center gap-4 animate-pulse shadow-lg shadow-indigo-200">
                <Loader2 size={24} className="animate-spin" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest">{isAnalyzing ? 'Processando IA' : 'Enviando Arquivo'}</p>
                  <p className="text-[9px] font-bold opacity-70">{analysisStep || 'Aguarde...'}</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 p-10 overflow-y-auto bg-white custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
              <div className="col-span-full group">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block group-focus-within:text-indigo-600 transition-colors">Funcionário / Paciente</label>
                <select name="employeeId" className="w-full px-6 py-4.5 bg-slate-50 border border-slate-200 rounded-[1.25rem] text-sm font-black focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300 outline-none transition-all appearance-none cursor-pointer" value={formData.employeeId} onChange={handleChange}>
                  <option value="">Selecione o funcionário...</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.registration})</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Início do Afastamento</label>
                <input type="date" name="startDate" className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.25rem] text-sm font-bold focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300 outline-none transition-all" value={formData.startDate} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Término do Afastamento</label>
                <input type="date" name="endDate" className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.25rem] text-sm font-bold focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300 outline-none transition-all" value={formData.endDate} onChange={handleChange} />
              </div>

              <div className="col-span-full p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm border border-slate-100">
                      <Stethoscope size={20} />
                    </div>
                    <div>
                      <span className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Informações Clínicas</span>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Diagnóstico e Profissional</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Permitir CID?</span>
                    <input type="checkbox" className="w-5 h-5 accent-indigo-600 rounded-lg cursor-pointer" checked={lgpdConsent} onChange={e => setLgpdConsent(e.target.checked)} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <input type="text" name="cid" placeholder="CID-10" disabled={!lgpdConsent} className="px-6 py-4 bg-white border border-slate-200 rounded-[1.25rem] text-sm font-black disabled:bg-slate-100 disabled:opacity-50 focus:border-indigo-300 transition-all uppercase placeholder:font-bold" value={formData.cid} onChange={handleChange} />
                  <input type="text" name="doctorName" placeholder="Médico" className="px-6 py-4 bg-white border border-slate-200 rounded-[1.25rem] text-sm font-black focus:border-indigo-300 transition-all placeholder:font-bold" value={formData.doctorName} onChange={handleChange} />
                  <input type="text" name="crm" placeholder="CRM/UF" className="px-6 py-4 bg-white border border-slate-200 rounded-[1.25rem] text-sm font-black focus:border-indigo-300 transition-all placeholder:font-bold" value={formData.crm} onChange={handleChange} />
                </div>
              </div>

              <div className="col-span-full group">
                <div className="flex items-center gap-2 mb-2 ml-1">
                  <MessageSquare size={14} className="text-slate-400" />
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Observações Adicionais</label>
                </div>
                <textarea name="observations" rows={4} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm font-medium focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300 outline-none transition-all placeholder:text-slate-300 resize-none" placeholder="Detalhes extraídos pela IA ou anotações manuais..." value={formData.observations} onChange={handleChange} />
              </div>
            </div>

            <div className="flex items-center justify-end gap-6 pt-12 mt-12 border-t border-slate-100 shrink-0">
              <button type="button" onClick={onClose} className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-8 py-4 hover:text-slate-600 transition-colors">Cancelar</button>
              <button onClick={handleManualSubmit} disabled={isSaving || isAnalyzing} className="bg-indigo-600 text-white px-12 py-5 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-1 transition-all flex items-center gap-3 active:scale-95 disabled:bg-slate-300 disabled:shadow-none disabled:translate-y-0">
                {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                Confirmar Registro
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CertificateForm;
