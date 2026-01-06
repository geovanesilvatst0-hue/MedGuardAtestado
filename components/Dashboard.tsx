
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
import { TrendingUp, Users, Calendar, AlertTriangle } from 'lucide-react';
import { Employee, MedicalCertificate } from '../types';

interface DashboardProps {
  employees: Employee[];
  certificates: MedicalCertificate[];
}

const Dashboard: React.FC<DashboardProps> = ({ employees, certificates }) => {
  const activeCertificates = certificates.filter(c => {
    const today = new Date();
    const end = new Date(c.endDate);
    return end >= today;
  });

  const stats = [
    { label: 'Afastados Atuais', value: activeCertificates.length, icon: Calendar, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Total Funcionários', value: employees.length, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Retornos (Próx 7 dias)', value: activeCertificates.filter(c => {
      const diff = new Date(c.endDate).getTime() - new Date().getTime();
      return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
    }).length, icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Alertas Críticos', value: activeCertificates.filter(c => c.days > 15).length, icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-50' },
  ];

  // Data for charts
  const deptData = React.useMemo(() => {
    const map: Record<string, number> = {};
    if (certificates.length === 0) return [{ name: 'Nenhum dado', value: 0 }];
    
    certificates.forEach(c => {
      const emp = employees.find(e => e.id === c.employeeId);
      if (emp) {
        map[emp.department] = (map[emp.department] || 0) + 1;
      }
    });

    const result = Object.entries(map).map(([name, value]) => ({ name, value }));
    return result.length > 0 ? result : [{ name: 'Sem registros', value: 0 }];
  }, [certificates, employees]);

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={i} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-lg ${s.bg}`}>
              <s.icon className={s.color} size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{s.label}</p>
              <p className="text-2xl font-bold text-slate-900">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm min-h-[350px]">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Afastamentos por Setor</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={deptData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm min-h-[350px]">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Distribuição de Motivos</h3>
          <div className="h-[250px] flex items-center w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <PieChart>
                <Pie
                  data={deptData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {deptData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 ml-4">
              {deptData.slice(0, 5).map((d, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-slate-600 truncate max-w-[100px]">{d.name}:</span>
                  <span className="font-bold">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-800">Afastamentos Ativos</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-xs uppercase text-slate-500 bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-semibold">Funcionário</th>
                <th className="px-4 py-3 font-semibold">Setor</th>
                <th className="px-4 py-3 font-semibold">Início</th>
                <th className="px-4 py-3 font-semibold">Término</th>
                <th className="px-4 py-3 font-semibold">Dias</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeCertificates.slice(0, 5).map((c) => {
                const emp = employees.find(e => e.id === c.employeeId);
                return (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4 font-medium text-slate-900">{emp?.name || '---'}</td>
                    <td className="px-4 py-4 text-slate-600">{emp?.department || '---'}</td>
                    <td className="px-4 py-4 text-slate-600">{new Date(c.startDate).toLocaleDateString()}</td>
                    <td className="px-4 py-4 text-slate-600">{new Date(c.endDate).toLocaleDateString()}</td>
                    <td className="px-4 py-4 font-bold text-slate-700">{c.days}</td>
                    <td className="px-4 py-4">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                        Ativo
                      </span>
                    </td>
                  </tr>
                );
              })}
              {activeCertificates.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-sm italic">Nenhum afastamento ativo no momento.</td>
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
