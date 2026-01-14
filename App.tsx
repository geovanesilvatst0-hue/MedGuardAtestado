
import React from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import EmployeeList from './components/EmployeeList';
import CertificateForm from './components/CertificateForm';
import EmployeeForm from './components/EmployeeForm';
import UserManagement from './components/UserManagement';
import Alerts from './components/Alerts';
import Login from './components/Login';
import { db } from './services/db';
import { supabase, isConfigured } from './services/supabase';
import { Employee, MedicalCertificate, User, UserRole } from './types';
import { FileText, Loader2, CheckCircle2, Eye, Paperclip, Download, Printer, FileSpreadsheet } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [isInitializing, setIsInitializing] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState('dashboard');
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [certificates, setCertificates] = React.useState<MedicalCertificate[]>([]);
  const [isLoadingData, setIsLoadingData] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isEmployeeFormOpen, setIsEmployeeFormOpen] = React.useState(false);
  const [currentEdit, setCurrentEdit] = React.useState<MedicalCertificate | undefined>();
  const [currentEmployeeEdit, setCurrentEmployeeEdit] = React.useState<Employee | undefined>();
  const [showSuccessToast, setShowSuccessToast] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);

  const isDemo = currentUser?.id === 'demo-user';

  const alertCount = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return certificates.filter(cert => {
      const endDate = new Date(cert.endDate);
      endDate.setHours(0, 0, 0, 0);
      return endDate.getTime() <= today.getTime() || cert.days > 15;
    }).length;
  }, [certificates]);

  const loadAppData = React.useCallback(async (user: User) => {
    setIsLoadingData(true);
    try {
      let allEmps: Employee[] = [];
      let allCerts: MedicalCertificate[] = [];

      if (user.id === 'demo-user') {
        const localEmps = localStorage.getItem('medguard_demo_employees');
        const localCerts = localStorage.getItem('medguard_demo_certificates');
        allEmps = localEmps ? JSON.parse(localEmps) : [];
        allCerts = localCerts ? JSON.parse(localCerts) : [];
      } else {
        const [empData, certData] = await Promise.all([db.getEmployees(), db.getCertificates()]);
        allEmps = empData || [];
        allCerts = certData || [];
      }

      // --- LOGICA DE FILTRO POR ESCOPO ---
      // Se o usuário não for ADMIN global ou tiver restrições de CNPJ/Cidade
      if (user.role !== UserRole.ADMIN || user.cnpj || user.city) {
        // Filtra funcionários pelo CNPJ ou Cidade do usuário
        const filteredEmps = allEmps.filter(emp => {
          let match = true;
          if (user.cnpj && emp.cnpj !== user.cnpj) match = false;
          if (user.city && emp.city !== user.city) match = false;
          return match;
        });
        
        const validEmpIds = new Set(filteredEmps.map(e => e.id));
        
        // Filtra atestados que pertencem aos funcionários permitidos
        const filteredCerts = allCerts.filter(cert => validEmpIds.has(cert.employeeId));

        setEmployees(filteredEmps);
        setCertificates(filteredCerts);
      } else {
        // ADMIN GLOBAL - Vê tudo
        setEmployees(allEmps);
        setCertificates(allCerts);
      }
      
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  React.useEffect(() => {
    const initApp = async () => {
      try {
        if (!isConfigured) { setIsInitializing(false); return; }
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          const profile = await db.getProfile(data.session.user.id);
          if (profile) {
            setCurrentUser(profile);
            loadAppData(profile);
          }
        }
      } catch (err) {
        console.error("Erro na inicialização:", err);
      } finally { setIsInitializing(false); }
    };
    initApp();
  }, [loadAppData]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    loadAppData(user);
  };
  
  const handleLogout = async () => { 
    await supabase.auth.signOut(); 
    setCurrentUser(null); 
  };

  const handleSaveCertificate = async (data: Partial<MedicalCertificate>) => {
    if (isDemo) {
      const newCert = {
        ...data,
        id: currentEdit?.id || `demo-cert-${Date.now()}`,
        createdAt: new Date().toISOString()
      } as MedicalCertificate;
      const updatedCerts = currentEdit?.id ? certificates.map(c => c.id === currentEdit.id ? newCert : c) : [newCert, ...certificates];
      setCertificates(updatedCerts);
      localStorage.setItem('medguard_demo_certificates', JSON.stringify(updatedCerts));
      setIsFormOpen(false);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
      return;
    }

    try {
      await db.saveCertificate({ ...data, id: currentEdit?.id });
      await loadAppData(currentUser!);
      setIsFormOpen(false);
      setCurrentEdit(undefined);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePrintSystem = () => {
    setTimeout(() => window.print(), 100);
  };

  const handleExportPDF = () => {
    setIsExporting(true);
    const doc = new jsPDF('landscape');
    
    doc.setFillColor(79, 70, 229); // Indigo-600
    doc.rect(0, 0, 297, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('MedGuard - Relatório de Afastamentos', 15, 25);
    doc.setFontSize(10);
    doc.text(`Escopo: ${currentUser?.cnpj || currentUser?.city || 'Geral'} | Gerado em: ${new Date().toLocaleString()}`, 15, 33);

    const tableData = certificates.map(c => {
      const emp = employees.find(e => e.id === c.employeeId);
      return [
        emp?.name || 'Não vinculado',
        emp?.registration || '---',
        new Date(c.startDate).toLocaleDateString(),
        new Date(c.endDate).toLocaleDateString(),
        c.days.toString(),
        c.cid || 'N/I',
        c.type,
        c.observations || '---'
      ];
    });

    autoTable(doc, {
      startY: 50,
      head: [['Funcionário', 'Matrícula', 'Início', 'Término', 'Dias', 'CID', 'Tipo', 'Observações']],
      body: tableData,
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      styles: { fontSize: 8 },
      columnStyles: {
        7: { cellWidth: 60 }
      }
    });

    doc.save(`relatorio_atestados_${Date.now()}.pdf`);
    setIsExporting(false);
  };

  const handleExportExcel = () => {
    const data = certificates.map(c => {
      const emp = employees.find(e => e.id === c.employeeId);
      return {
        'Funcionário': emp?.name,
        'Matrícula': emp?.registration,
        'Setor': emp?.department,
        'Unidade/CNPJ': emp?.cnpj,
        'Cidade': emp?.city,
        'Data Início': c.startDate,
        'Data Término': c.endDate,
        'Dias': c.days,
        'CID': c.cid,
        'Médico': c.doctorName,
        'CRM': c.crm,
        'Tipo': c.type,
        'Observações': c.observations
      };
    });
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Atestados");
    XLSX.writeFile(wb, `relatorio_medguard_${Date.now()}.xlsx`);
  };

  const renderContent = () => {
    if (isLoadingData) return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
        <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">Sincronizando registros...</p>
      </div>
    );

    const isAdminUser = currentUser?.role === UserRole.ADMIN;

    switch (activeTab) {
      case 'dashboard': return (
        <Dashboard 
          employees={employees} 
          certificates={certificates} 
          onExportPDF={handleExportPDF}
          onExportExcel={handleExportExcel}
          onViewCertificate={(c) => { setCurrentEdit(c); setIsFormOpen(true); }}
          isExporting={isExporting}
        />
      );
      case 'employees': return (
        <EmployeeList 
          employees={employees} 
          onAdd={() => { setCurrentEmployeeEdit(undefined); setIsEmployeeFormOpen(true); }}
          onEdit={(id) => { const e = employees.find(x => x.id === id); if(e) { setCurrentEmployeeEdit(e); setIsEmployeeFormOpen(true); } }}
          onDelete={async (id) => { if(window.confirm("Deseja realmente excluir este funcionário?")) { await db.deleteEmployee(id); loadAppData(currentUser!); } }}
          onView={(id) => setActiveTab('certificates')}
          onBulkImport={async (list) => { for(const e of list) await db.saveEmployee(e); loadAppData(currentUser!); }}
          isAdmin={isAdminUser || currentUser?.cnpj !== undefined || currentUser?.city !== undefined}
        />
      );
      case 'certificates': return (
        <div className="space-y-6">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Prontuário de Atestados</h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                  Escopo: {currentUser?.cnpj || currentUser?.city || 'Acesso Global'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center bg-white rounded-2xl p-1 border border-slate-200 shadow-sm">
                  <button onClick={handlePrintSystem} className="p-3 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-all" title="Imprimir Lista">
                    <Printer size={20} />
                  </button>
                  <button onClick={handleExportExcel} className="p-3 text-slate-500 hover:text-emerald-600 hover:bg-slate-50 rounded-xl transition-all" title="Exportar Excel">
                    <FileSpreadsheet size={20} />
                  </button>
                </div>
                
                <button onClick={handleExportPDF} disabled={isExporting} className="hidden lg:flex items-center gap-2 border border-slate-200 bg-white text-slate-600 px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all active:scale-95">
                   {isExporting ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />} 
                   PDF Export
                </button>

                <button onClick={() => { setCurrentEdit(undefined); setIsFormOpen(true); }} className="bg-indigo-600 text-white px-7 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-2 active:scale-95">
                  <FileText size={16} /> Novo Registro
                </button>
              </div>
           </div>
           
           <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[10px] uppercase text-slate-400 font-black border-b border-slate-100">
                  <tr>
                    <th className="px-8 py-5">Colaborador / Unidade</th>
                    <th className="px-8 py-5">Período</th>
                    <th className="px-8 py-5">CID</th>
                    <th className="px-8 py-5 print:hidden text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {certificates.map(c => {
                    const emp = employees.find(e => e.id === c.employeeId);
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/50 group cursor-pointer transition-colors" onClick={() => { setCurrentEdit(c); setIsFormOpen(true); }}>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black text-xs">
                              {emp?.name.charAt(0) || '?'}
                            </div>
                            <div>
                              <p className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{emp?.name || 'Não vinculado'}</p>
                              <div className="flex gap-2 items-center">
                                <p className="text-[10px] text-slate-400 font-mono">{emp?.registration}</p>
                                <span className="w-1 h-1 rounded-full bg-slate-200" />
                                <p className="text-[9px] text-slate-400 font-bold uppercase">{emp?.city || emp?.cnpj || 'Unidade Geral'}</p>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <p className="font-black text-slate-700 text-xs">{new Date(c.startDate).toLocaleDateString()} — {new Date(c.endDate).toLocaleDateString()}</p>
                          <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{c.days} dias</p>
                        </td>
                        <td className="px-8 py-5">
                          <span className="text-indigo-600 font-black text-[10px] tracking-wider bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
                            {c.cid || 'N/I'}
                          </span>
                        </td>
                        <td className="px-8 py-5 print:hidden text-right">
                          <button className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl transition-all shadow-sm border border-transparent hover:border-slate-100">
                            <Eye size={18} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {certificates.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-8 py-20 text-center italic text-slate-300 font-bold text-xs uppercase tracking-widest">Nenhum registro encontrado neste escopo.</td>
                    </tr>
                  )}
                </tbody>
              </table>
           </div>
        </div>
      );
      case 'alerts': return <Alerts employees={employees} certificates={certificates} onManage={(c) => { setCurrentEdit(c); setIsFormOpen(true); }} />;
      case 'users': return isAdminUser ? <UserManagement /> : null;
      default: return null;
    }
  };

  if (isInitializing) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-900 gap-4">
        <Loader2 className="animate-spin text-white" size={48} />
        <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Acessando Camada Segura...</p>
      </div>
    );
  }

  if (!currentUser) return <Login onLogin={handleLogin} />;

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} user={currentUser} onLogout={handleLogout} alertCount={alertCount}>
      {showSuccessToast && (
        <div className="fixed bottom-10 right-10 z-[200] bg-slate-900 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-5 border border-white/10 animate-in slide-in-from-bottom-10">
          <div className="bg-emerald-500 p-2 rounded-xl">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest">Sincronizado</p>
            <p className="text-[10px] text-slate-400 font-bold">Base de dados atualizada com sucesso.</p>
          </div>
        </div>
      )}
      {renderContent()}
      {isFormOpen && <CertificateForm employees={employees} onClose={() => setIsFormOpen(false)} onSave={handleSaveCertificate} initialData={currentEdit} />}
      {isEmployeeFormOpen && <EmployeeForm onClose={() => setIsEmployeeFormOpen(false)} onSave={async (d) => { await db.saveEmployee(d); loadAppData(currentUser); setIsEmployeeFormOpen(false); }} initialData={currentEmployeeEdit} />}
    </Layout>
  );
};

export default App;
