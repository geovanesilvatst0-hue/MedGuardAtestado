
import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { TrendingUp, Users, Calendar, AlertTriangle, Printer, FileSpreadsheet, Download, Loader2, ClipboardList, Inbox } from 'lucide-react';
import { Employee, MedicalCertificate } from '../types';

interface DashboardProps {
  employees: Employee[];
  certificates: MedicalCertificate[];
  onExportPDF?: () => void;
  onExportExcel?: () => void;
  onViewCertificate?: (cert: MedicalCertificate) => void;
  isExporting?: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  employees, 
  certificates, 
  onExportPDF, 
  onExportExcel, 
  onViewCertificate,
  isExporting 
}) => {
  // Lógica robusta para identificar afastamentos que ainda estão vigentes hoje
  const activeCertificates = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return certificates.filter(c => {
      const end = new Date(c.endDate);
      end.setHours(23, 59, 59, 999);
      return end >= today;
    }).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [certificates]);

  const stats = [
    { label: 'Afastados Atuais', value: activeCertificates.length, icon: Calendar, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Total Funcionários', value: employees.length, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Retornos (Próx 7 dias)', value: activeCertificates.filter(c => {
      const diff = new Date(c.endDate).getTime() - new Date().getTime();
      return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
    }).length, icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Alertas Críticos', value: activeCertificates.filter(c => c.days > 15).length, icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-50' },
  ];

  const deptData = React.useMemo(() => {
    const map: Record<string, number> = {};
    if (certificates.length === 0) return [{ name: 'Nenhum dado', value: 0 }];
    certificates.forEach(c => {
      const emp = employees.find(e => e.id === c.employeeId);
      if (emp) map[emp.department] = (map[emp.department] || 0) + 1;
    });
    const result = Object.entries(map).map(([name, value]) => ({ name, value }));
    return result.length > 0 ? result : [{ name: 'Sem registros', value: 0 }];
  }, [certificates, employees]);

  const motiveData = React.useMemo(() => {
    const map: Record<string, number> = {};
    if (certificates.length === 0) return [{ name: 'Nenhum dado', value: 0 }];
    certificates.forEach(c => {
      const type = c.type || 'Outros';
      map[type] = (map[type] || 0) + 1;
    });
    const result = Object.entries(map).map(([name, value]) => ({ name, value }));
    return result.length > 0 ? result : [{ name: 'Sem registros', value: 0 }];
  }, [certificates]);

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1'];

  const handlePrint = () => {
    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Dashboard Operacional</h2>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">Indicadores em Tempo Real • KPI Saúde</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white rounded-2xl p-1 border border-slate-200 shadow-sm">
            <button 
              onClick={handlePrint}
              type="button"
              className="p-3 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-all active:scale-90" 
              title="Imprimir Painel"
            >
              <Printer size={20} />
            </button>
            <button 
              onClick={onExportExcel}
              type="button"
              className="p-3 text-slate-500 hover:text-emerald-600 hover:bg-slate-50 rounded-xl transition-all active:scale-90" 
              title="Exportar Excel"
            >
              <FileSpreadsheet size={20} />
            </button>
          </div>

          <button 
            onClick={onExportPDF}
            disabled={isExporting}
            type="button"
            className="bg-slate-900 text-white px-7 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
          >
            {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Gerar Relatório PDF
          </button>
        </div>
      </div>

      <div className="hidden print:block mb-8 border-b-2 border-slate-900 pb-4">
        <h1 className="text-2xl font-black text-slate-900 uppercase">Relatório de Indicadores MedGuard</h1>
        <p className="text-xs font-bold text-slate-500">Data do Relatório: {new Date().toLocaleString('pt-BR')}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4">
        {stats.map((s, i) => (
          <div key={i} className="bg-white p-6 rounded-[1.5rem] border border-slate-200 shadow-sm flex items-center gap-4 transition-all hover:border-indigo-100">
            <div className={`p-3 rounded-2xl ${s.bg} shrink-0 print:border print:border-slate-100`}>
              <s.icon className={s.color} size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{s.label}</p>
              <p className="text-2xl font-black text-slate-900">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-2">
        {/* Charts remain the same */}
        <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm min-h-[380px]">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Afastamentos por Setor</h3>
            <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 print:hidden">
               <TrendingUp size={16} />
            </div>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                />
                <Bar dataKey="value" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm min-h-[380px]">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Distribuição de Motivos</h3>
            <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-400 print:hidden">
               <ClipboardList size={16} />
            </div>
          </div>
          <div className="h-[250px] flex flex-col md:flex-row items-center w-full gap-8">
            <div className="flex-1 h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={motiveData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {motiveData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3 shrink-0">
              {motiveData.map((d, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest truncate max-w-[120px]">{d.name}</span>
                  <span className="text-xs font-black text-slate-900 ml-auto">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Improved Active Absences Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Afastamentos Ativos</h3>
          <span className="bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest print:hidden">RESUMO RECENTE</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-[10px] uppercase text-slate-400 bg-slate-50 font-black">
              <tr>
                <th className="px-8 py-4">Funcionário</th>
                <th className="px-8 py-4">Setor</th>
                <th className="px-8 py-4">Início</th>
                <th className="px-8 py-4">Término</th>
                <th className="px-8 py-4 text-center">Dias</th>
                <th className="px-8 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeCertificates.length > 0 ? (
                activeCertificates.slice(0, 10).map((c) => {
                  const emp = employees.find(e => e.id === c.employeeId);
                  return (
                    <tr 
                      key={c.id} 
                      className="hover:bg-slate-50 transition-colors cursor-pointer group"
                      onClick={() => onViewCertificate?.(c)}
                    >
                      <td className="px-8 py-5">
                        <p className="font-black text-slate-900 text-xs group-hover:text-indigo-600 transition-colors">{emp?.name || 'Não vinculado'}</p>
                        <p className="text-[9px] text-slate-400 font-mono">{emp?.registration || '---'}</p>
                      </td>
                      <td className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">{emp?.department || '---'}</td>
                      <td className="px-8 py-5 text-[11px] font-bold text-slate-600">{new Date(c.startDate).toLocaleDateString()}</td>
                      <td className="px-8 py-5 text-[11px] font-bold text-slate-600">{new Date(c.endDate).toLocaleDateString()}</td>
                      <td className="px-8 py-5 font-black text-indigo-600 text-xs text-center">{c.days}</td>
                      <td className="px-8 py-5">
                        <span className="px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100">
                          Ativo
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-8 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                        <Inbox size={24} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Nenhum afastamento ativo</p>
                        <p className="text-[10px] text-slate-300 font-bold">Todos os funcionários estão em atividade.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
