
import React from 'react';
import { X, Upload, Save, User, Calendar, FileText, Stethoscope, Sparkles, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import { Employee, MedicalCertificate, ExtractionConfidence, ConfidenceLevel } from '../types';
/* Updated import to include Type from @google/genai for schema definition */
import { GoogleGenAI, Type } from "@google/genai";

interface CertificateFormProps {
  employees: Employee[];
  onClose: () => void;
  onSave: (data: Partial<MedicalCertificate>) => void;
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
  const [isExtracting, setIsExtracting] = React.useState(false);
  const [confidences, setConfidences] = React.useState<ExtractionConfidence | null>(null);
  const [lgpdConsent, setLgpdConsent] = React.useState(false);

  const getConfidenceLevel = (score: number): ConfidenceLevel => {
    if (score >= 0.85) return 'high';
    if (score >= 0.60) return 'medium';
    return 'low';
  };

  const getConfidenceColor = (score: number | undefined) => {
    if (score === undefined) return '';
    const level = getConfidenceLevel(score);
    if (level === 'high') return 'border-emerald-500 ring-emerald-50';
    if (level === 'medium') return 'border-amber-500 ring-amber-50';
    return 'border-rose-500 ring-rose-50';
  };

  const getBadgeColor = (score: number | undefined) => {
    if (score === undefined) return 'bg-slate-200';
    const level = getConfidenceLevel(score);
    if (level === 'high') return 'bg-emerald-500';
    if (level === 'medium') return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleExtract = async () => {
    if (!file) return;
    setIsExtracting(true);

    try {
      const base64Data = await fileToBase64(file);
      /* Initialized GoogleGenAI with named apiKey parameter as per guidelines */
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const prompt = `Analise este atestado médico e extraia os seguintes dados em formato JSON puro.
      Campos:
      - issue_date: data de emissão (YYYY-MM-DD)
      - start_date: início do afastamento (YYYY-MM-DD)
      - end_date: fim do afastamento (YYYY-MM-DD)
      - days: quantidade de dias (inteiro)
      - type: tipo (Doença, Acidente, Maternidade, Outros)
      - cid: código CID se houver
      - doctor_name: nome do médico
      - crm: CRM do médico
      - patient_name: nome do paciente
      - confidence: objeto com scores de 0 a 1 para cada campo acima`;

      /* Updated to use gemini-3-flash-preview and recommended responseSchema/responseMimeType */
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType: file.type } },
            { text: prompt }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              issue_date: { type: Type.STRING },
              start_date: { type: Type.STRING },
              end_date: { type: Type.STRING },
              days: { type: Type.INTEGER },
              type: { type: Type.STRING },
              cid: { type: Type.STRING },
              doctor_name: { type: Type.STRING },
              crm: { type: Type.STRING },
              patient_name: { type: Type.STRING },
              confidence: {
                type: Type.OBJECT,
                properties: {
                  issue_date: { type: Type.NUMBER },
                  start_date: { type: Type.NUMBER },
                  end_date: { type: Type.NUMBER },
                  days: { type: Type.NUMBER },
                  type: { type: Type.NUMBER },
                  cid: { type: Type.NUMBER },
                  doctor_name: { type: Type.NUMBER },
                  crm: { type: Type.NUMBER },
                  patient_name: { type: Type.NUMBER }
                }
              }
            }
          }
        }
      });

      /* Accessing .text property directly as per guidelines */
      const text = response.text || "";
      const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const result = JSON.parse(jsonStr);

      // Mapeamento para o formulário
      setFormData(prev => ({
        ...prev,
        issueDate: result.issue_date || prev.issueDate,
        startDate: result.start_date || prev.startDate,
        endDate: result.end_date || prev.endDate,
        days: result.days || prev.days,
        cid: result.cid || prev.cid,
        doctorName: result.doctor_name || prev.doctorName,
        crm: result.crm || prev.crm,
        type: result.type || prev.type,
      }));

      // Se o nome do paciente foi extraído, tenta sugerir o funcionário
      if (result.patient_name) {
        const found = employees.find(e => 
          result.patient_name.toLowerCase().includes(e.name.toLowerCase().split(' ')[0])
        );
        if (found) setFormData(prev => ({ ...prev, employeeId: found.id }));
      }

      // Converte confidence do JSON para o estado
      if (result.confidence) {
        setConfidences({
          issueDate: result.confidence.issue_date || 0,
          startDate: result.confidence.start_date || 0,
          endDate: result.confidence.end_date || 0,
          days: result.confidence.days || 0,
          cid: result.confidence.cid || 0,
          doctorName: result.confidence.doctor_name || 0,
          crm: result.confidence.crm || 0,
          patientName: result.confidence.patient_name || 0,
          type: result.confidence.type || 0,
        });
      }

    } catch (error) {
      console.error("Erro na extração:", error);
      alert("Não foi possível extrair dados automaticamente. Por favor, preencha manualmente.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.cid && !lgpdConsent) {
      alert("É necessário o consentimento para armazenar o CID conforme LGPD.");
      return;
    }
    onSave({
      ...formData,
      fileName: file?.name,
      status: 'ACTIVE' as any,
      extractionConfidence: confidences || undefined
    });
  };

  const ConfidenceBadge = ({ score }: { score?: number }) => {
    if (score === undefined) return null;
    return (
      <div 
        className={`w-2 h-2 rounded-full inline-block ml-1.5 ${getBadgeColor(score)}`} 
        title={`Confiança: ${(score * 100).toFixed(0)}%`}
      />
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              {initialData ? 'Editar Atestado' : 'Registrar Novo Atestado'}
            </h2>
            <p className="text-sm text-slate-500">Preencha os dados ou use a extração inteligente.</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Left Side: Upload & Extraction */}
          <div className="w-full md:w-2/5 p-6 bg-slate-50 border-r border-slate-100 overflow-y-auto">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Upload size={18} className="text-indigo-600" />
              Documento do Atestado
            </h3>
            
            <div className={`border-2 border-dashed rounded-xl p-4 text-center transition-all bg-white relative mb-4 ${file ? 'border-indigo-400' : 'border-slate-200 hover:border-indigo-300'}`}>
              <input
                type="file"
                className="absolute inset-0 opacity-0 cursor-pointer"
                accept="image/*,application/pdf"
                onChange={handleFileChange}
              />
              {previewUrl ? (
                <div className="space-y-3">
                  <img src={previewUrl} alt="Atestado" className="max-h-64 mx-auto rounded-lg shadow-sm border border-slate-200" />
                  <p className="text-xs font-medium text-slate-500 truncate">{file?.name}</p>
                  <button type="button" className="text-xs text-indigo-600 font-bold hover:underline">Trocar arquivo</button>
                </div>
              ) : (
                <div className="py-8">
                  <div className="p-3 bg-indigo-50 rounded-full w-fit mx-auto mb-3">
                    <Upload className="text-indigo-500" />
                  </div>
                  <p className="text-sm font-bold text-slate-700">Clique para anexar</p>
                  <p className="text-xs text-slate-400 mt-1">Imagens ou PDF até 5MB</p>
                </div>
              )}
            </div>

            {file && (
              <button
                type="button"
                onClick={handleExtract}
                disabled={isExtracting}
                className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md ${
                  isExtracting 
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98]'
                }`}
              >
                {isExtracting ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Extraindo dados...
                  </>
                ) : (
                  <>
                    <Sparkles size={20} />
                    Extrair via IA
                  </>
                )}
              </button>
            )}

            {isExtracting && (
              <div className="mt-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100 flex items-start gap-3 animate-pulse">
                <AlertCircle size={20} className="text-indigo-500 shrink-0 mt-0.5" />
                <p className="text-xs text-indigo-700 leading-relaxed">
                  A IA está analisando a imagem para identificar datas, nomes, CRM e CID. Isso pode levar alguns segundos dependendo da qualidade do arquivo.
                </p>
              </div>
            )}
          </div>

          {/* Right Side: Form */}
          <form onSubmit={handleSubmit} className="flex-1 p-6 overflow-y-auto space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Employee Selection */}
              <div className="col-span-full">
                <label className="block text-sm font-bold text-slate-700 mb-1.5 flex items-center">
                  Funcionário *
                  <ConfidenceBadge score={confidences?.patientName} />
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <select
                    required
                    name="employeeId"
                    className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl focus:ring-4 focus:ring-indigo-100 outline-none appearance-none transition-all ${getConfidenceColor(confidences?.patientName)}`}
                    value={formData.employeeId}
                    onChange={handleChange}
                  >
                    <option value="">Selecione o funcionário</option>
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>{e.name} ({e.registration})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dates Row */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5 flex items-center">
                  Data de Emissão *
                  <ConfidenceBadge score={confidences?.issueDate} />
                </label>
                <input
                  type="date"
                  required
                  name="issueDate"
                  className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl focus:ring-4 outline-none transition-all ${getConfidenceColor(confidences?.issueDate)}`}
                  value={formData.issueDate}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5 flex items-center">
                  Tipo de Afastamento
                  <ConfidenceBadge score={confidences?.type} />
                </label>
                <select
                  name="type"
                  className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl focus:ring-4 outline-none transition-all ${getConfidenceColor(confidences?.type)}`}
                  value={formData.type}
                  onChange={handleChange}
                >
                  <option value="Doença">Doença</option>
                  <option value="Acidente">Acidente</option>
                  <option value="Maternidade">Maternidade</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5 flex items-center">
                  Início do Afastamento *
                  <ConfidenceBadge score={confidences?.startDate} />
                </label>
                <input
                  type="date"
                  required
                  name="startDate"
                  className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl focus:ring-4 outline-none transition-all ${getConfidenceColor(confidences?.startDate)}`}
                  value={formData.startDate}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5 flex items-center">
                  Fim do Afastamento *
                  <ConfidenceBadge score={confidences?.endDate} />
                </label>
                <input
                  type="date"
                  required
                  name="endDate"
                  className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl focus:ring-4 outline-none transition-all ${getConfidenceColor(confidences?.endDate)}`}
                  value={formData.endDate}
                  onChange={handleChange}
                />
              </div>

              {/* CID & LGPD Row */}
              <div className="col-span-full p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="text-emerald-500" size={20} />
                    <h4 className="text-sm font-bold text-slate-800">Conformidade LGPD (Dados Sensíveis)</h4>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={lgpdConsent} onChange={e => setLgpdConsent(e.target.checked)} />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={!lgpdConsent ? 'opacity-50 pointer-events-none' : ''}>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5 flex items-center">
                      CID
                      <ConfidenceBadge score={confidences?.cid} />
                    </label>
                    <input
                      type="text"
                      name="cid"
                      placeholder="Ex: M54.5"
                      className={`w-full px-4 py-2.5 bg-white border rounded-xl focus:ring-4 outline-none transition-all ${getConfidenceColor(confidences?.cid)}`}
                      value={formData.cid}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="flex items-center text-[10px] text-slate-400">
                    <p>O CID é opcional. Sua coleta requer consentimento explícito do colaborador para fins de medicina ocupacional.</p>
                  </div>
                </div>
              </div>

              {/* Doctor Row */}
              <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 flex items-center">
                    Médico Responsável
                    <ConfidenceBadge score={confidences?.doctorName} />
                  </label>
                  <input
                    type="text"
                    required
                    name="doctorName"
                    className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl focus:ring-4 outline-none transition-all ${getConfidenceColor(confidences?.doctorName)}`}
                    value={formData.doctorName}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 flex items-center">
                    CRM
                    <ConfidenceBadge score={confidences?.crm} />
                  </label>
                  <input
                    type="text"
                    required
                    name="crm"
                    placeholder="Número/UF"
                    className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl focus:ring-4 outline-none transition-all ${getConfidenceColor(confidences?.crm)}`}
                    value={formData.crm}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* Form Footer */}
            <div className="flex items-center justify-end gap-3 pt-6 mt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-8 py-2.5 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2 active:scale-95"
              >
                <Save size={18} />
                Confirmar Registro
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CertificateForm;
