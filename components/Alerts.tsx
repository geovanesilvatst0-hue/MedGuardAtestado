
import React from 'react';
import { Bell, Calendar, AlertCircle, Clock, CheckCircle2, UserCheck, ShieldAlert, ArrowRight } from 'lucide-react';
import { Employee, MedicalCertificate } from '../types';

interface AlertsProps {
  employees: Employee[];
  certificates: MedicalCertificate[];
  onManage: (cert: MedicalCertificate) => void;
}

const Alerts: React.FC<AlertsProps> = ({ employees, certificates, onManage }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Lógica de Alertas
  const alertsList = React.useMemo(() => {
    return certificates.map(cert => {
      const emp = employees.find(e => e.id === cert.employeeId);
      const endDate = new Date(cert.endDate);
      endDate.setHours(0, 0, 0, 0);

      // 1. Retorno Amanhã (Atestado acaba HOJE)
      if (endDate.getTime() === today.getTime()) {
        return {
          type: 'RETURN_TOMORROW',
          severity: 'warning',
          title: 'Retorno Previsto para Amanhã',
          description: `O período de afastamento de ${emp?.name || 'Funcionário'} encerra hoje.`,
          icon: UserCheck,
          date: cert.endDate,
          emp,
          certificate: cert
        };
      }

      // 2. Vencendo/Vencido Hoje (Atestado acabou ONTEM)
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      if (endDate.getTime() === yesterday.getTime()) {
        return {
          type: 'EXPIRED_TODAY',
          severity: 'danger',
          title: 'Retorno Pendente (Hoje)',
          description: `${emp?.name || 'Funcionário'} deveria ter retornado hoje ao posto de trabalho.`,
          icon: Clock,
          date: cert.endDate,
          emp,
          certificate: cert
        };
      }

      // 3. Alerta de INSS (> 15 dias)
      if (cert.days > 15) {
        return {
          type: 'INSS_ALERT',
          severity: 'critical',
          title: 'Alerta de INSS (Afastamento Longo)',
          description: `Afastamento de ${cert.days} dias detectado. Necessário agendamento de perícia previdenciária.`,
          icon: ShieldAlert,
          date: cert.startDate,
          emp,
          certificate: cert
        };
      }

      return null;
    }).filter(Boolean);
  }, [certificates, employees, today]);

  const severityStyles = {
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    danger: 'bg-rose-50 border-rose-200 text-rose-800',
    critical: 'bg-indigo-50 border-indigo-200 text-indigo-800',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800'
  };

  const iconStyles = {
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    critical: 'bg-indigo-600',
    success: 'bg-emerald-500'
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Painel de Alertas Operacionais</h2>
          <p className="text-xs text-slate-500 font-medium">Monitoramento em tempo real de fluxos de trabalho e conformidade.</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-400">
          Total de Notificações: {alertsList.length}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {alertsList.length > 0 ? (
          alertsList.map((alert, index) => {
            const Icon = alert!.icon; // Variável capitalizada para o React renderizar o componente
            return (
              <div 
                key={index} 
                className={`p-6 rounded-[2rem] border-2 flex flex-col md:flex-row items-center gap-6 transition-all hover:shadow-lg ${severityStyles[alert!.severity as keyof typeof severityStyles]}`}
              >
                <div className={`w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center text-white shadow-lg ${iconStyles[alert!.severity as keyof typeof iconStyles]}`}>
                  <Icon size={28} />
                </div>
                
                <div className="flex-1 text-center md:text-left">
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-1">
                    <h3 className="text-sm font-black uppercase tracking-tight">{alert!.title}</h3>
                    <span className="text-[9px] font-black bg-white/50 px-2 py-0.5 rounded-full uppercase border border-current opacity-70">
                      {alert!.type.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs font-bold opacity-80 mb-2">{alert!.description}</p>
                  
                  <div className="flex items-center justify-center md:justify-start gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-white/40 flex items-center justify-center text-[10px] font-black uppercase">
                        {alert!.emp?.name.charAt(0)}
                      </div>
                      <span className="text-[10px] font-bold">{alert!.emp?.name} (Mat: {alert!.emp?.registration})</span>
                    </div>
                    <div className="w-1 h-1 rounded-full bg-current opacity-30" />
                    <span className="text-[10px] font-bold">Ref: {new Date(alert!.date).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="shrink-0 flex gap-2">
                  <button className="px-5 py-2.5 bg-white/50 hover:bg-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-current/10">
                    Ignorar
                  </button>
                  <button 
                    onClick={() => onManage(alert!.certificate)}
                    className="px-5 py-2.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-2 active:scale-95"
                  >
                    Gerenciar <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-slate-50 text-slate-200 rounded-3xl flex items-center justify-center mb-4">
              <CheckCircle2 size={48} />
            </div>
            <h3 className="text-slate-400 font-black uppercase tracking-widest text-xs">Tudo sobre controle</h3>
            <p className="text-slate-300 text-[10px] font-bold">Nenhum alerta crítico ou retorno imediato detectado hoje.</p>
          </div>
        )}
      </div>

      <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Bell size={120} />
        </div>
        <div className="relative z-10 max-w-xl">
          <h4 className="text-indigo-400 font-black uppercase tracking-widest text-[10px] mb-2">Dica MedGuard de Conformidade</h4>
          <p className="text-sm font-medium leading-relaxed">
            Lembre-se: Afastamentos superiores a 15 dias devem ter a CAT emitida em caso de acidente e o encaminhamento ao INSS realizado imediatamente para evitar passivos trabalhistas.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Alerts;
