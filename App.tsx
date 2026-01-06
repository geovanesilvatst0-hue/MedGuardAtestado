
import React from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import EmployeeList from './components/EmployeeList';
import CertificateForm from './components/CertificateForm';
import EmployeeForm from './components/EmployeeForm';
import UserManagement from './components/UserManagement';
import Login from './components/Login';
import { db } from './services/db';
import { supabase, isConfigured } from './services/supabase';
import { Employee, MedicalCertificate, User, UserRole } from './types';
import { FileText, Loader2, AlertTriangle, ShieldAlert, CheckCircle2 } from 'lucide-react';

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

  const isDemo = currentUser?.id === 'demo-user';

  // Carregar dados iniciais (incluindo local storage para demo)
  const loadAppData = React.useCallback(async (user: User) => {
    setIsLoadingData(true);
    try {
      if (user.id === 'demo-user') {
        const localEmps = localStorage.getItem('medguard_demo_employees');
        const localCerts = localStorage.getItem('medguard_demo_certificates');
        setEmployees(localEmps ? JSON.parse(localEmps) : []);
        setCertificates(localCerts ? JSON.parse(localCerts) : []);
      } else {
        const [empData, certData] = await Promise.all([db.getEmployees(), db.getCertificates()]);
        setEmployees(empData || []);
        setCertificates(certData || []);
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
    console.log("App.tsx -> handleSaveCertificate iniciado", data);
    
    if (isDemo) {
      const newCert = {
        ...data,
        id: currentEdit?.id || `demo-cert-${Date.now()}`,
        createdAt: new Date().toISOString()
      } as MedicalCertificate;
      
      const updatedCerts = currentEdit?.id 
        ? certificates.map(c => c.id === currentEdit.id ? newCert : c)
        : [newCert, ...certificates];
      
      setCertificates(updatedCerts);
      localStorage.setItem('medguard_demo_certificates', JSON.stringify(updatedCerts));
      
      setIsFormOpen(false);
      setCurrentEdit(undefined);
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
      console.error("Erro no DB (Real Mode):", err);
      alert(`Erro no Banco de Dados: ${err.message}`);
      throw err;
    }
  };

  const handleSaveEmployee = async (data: Partial<Employee>) => {
    if (isDemo) {
      const newEmp = {
        ...data,
        id: currentEmployeeEdit?.id || `demo-emp-${Date.now()}`,
        createdAt: new Date().toISOString()
      } as Employee;
      
      const updatedEmps = currentEmployeeEdit?.id 
        ? employees.map(e => e.id === currentEmployeeEdit.id ? newEmp : e)
        : [newEmp, ...employees];
      
      setEmployees(updatedEmps);
      localStorage.setItem('medguard_demo_employees', JSON.stringify(updatedEmps));
      
      setIsEmployeeFormOpen(false);
      setCurrentEmployeeEdit(undefined);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
      return;
    }

    try {
      await db.saveEmployee(data);
      await loadAppData(currentUser!);
      setIsEmployeeFormOpen(false);
      setCurrentEmployeeEdit(undefined);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (isInitializing) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-900 gap-4">
        <Loader2 className="animate-spin text-white" size={48} />
        <p className="text-slate-400 font-medium font-black uppercase tracking-widest text-xs">Carregando MedGuard...</p>
      </div>
    );
  }

  if (!currentUser) return <Login onLogin={handleLogin} />;

  const isAdmin = currentUser.role === UserRole.ADMIN;

  const renderContent = () => {
    if (isLoadingData) {
      return (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="animate-spin text-indigo-600" size={32} />
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Sincronizando registros...</p>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard': return <Dashboard employees={employees} certificates={certificates} />;
      case 'employees': return (
        <EmployeeList 
          employees={employees} 
          onAdd={() => { setCurrentEmployeeEdit(undefined); setIsEmployeeFormOpen(true); }}
          onEdit={(id) => { const e = employees.find(x => x.id === id); if(e) { setCurrentEmployeeEdit(e); setIsEmployeeFormOpen(true); } }}
          onDelete={async (id) => { 
            if(isDemo) {
              const updated = employees.filter(e => e.id !== id);
              setEmployees(updated);
              localStorage.setItem('medguard_demo_employees', JSON.stringify(updated));
              return;
            }
            if(window.confirm("Deseja realmente excluir este funcionário?")) { await db.deleteEmployee(id); loadAppData(currentUser!); } 
          }}
          onView={(id) => setActiveTab('certificates')}
          onBulkImport={async (list) => { 
            if (isDemo) {
              const newItems = list.map(l => ({ ...l, id: `demo-${Math.random()}`, createdAt: new Date().toISOString() } as Employee));
              const updated = [...newItems, ...employees];
              setEmployees(updated);
              localStorage.setItem('medguard_demo_employees', JSON.stringify(updated));
              return;
            }
            for(const e of list) await db.saveEmployee(e); 
            loadAppData(currentUser!); 
          }}
          isAdmin={isAdmin}
        />
      );
      case 'certificates': return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Prontuário de Atestados</h2>
                <p className="text-xs text-slate-500 font-medium">Histórico clínico de afastamentos e CID.</p>
              </div>
              {isAdmin && (
                <button onClick={() => { setCurrentEdit(undefined); setIsFormOpen(true); }} className="bg-indigo-600 text-white px-7 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all flex items-center gap-2">
                  <FileText size={16} /> Novo Registro
                </button>
              )}
           </div>
           <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden border-white/40">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/50 text-[10px] uppercase text-slate-500 font-black border-b border-slate-100">
                  <tr><th className="px-8 py-5">Funcionário</th><th className="px-8 py-5">Período</th><th className="px-8 py-5">CID / Diagnóstico</th><th className="px-8 py-5">Status</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {certificates.map(c => {
                    const emp = employees.find(e => e.id === c.employeeId);
                    return (
                      <tr key={c.id} className="hover:bg-slate-50 group cursor-pointer transition-colors" onClick={() => { if(isAdmin) { setCurrentEdit(c); setIsFormOpen(true); }}}>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black text-xs uppercase">
                              {emp?.name.charAt(0) || '?'}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{emp?.name || 'Não vinculado'}</p>
                              <p className="text-[10px] text-slate-400 font-mono">{emp?.registration || '---'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <p className="font-bold text-slate-600 text-xs">
                            {new Date(c.startDate).toLocaleDateString()} — {new Date(c.endDate).toLocaleDateString()}
                          </p>
                          <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{c.days} dias de afastamento</p>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex flex-col gap-1">
                            <span className="text-indigo-600 font-black text-[10px] tracking-wider bg-indigo-50 px-3 py-1.5 rounded-lg w-fit">
                              CID: {c.cid || 'NÃO INFORMADO'}
                            </span>
                            <span className="text-[9px] text-slate-400 font-bold ml-1">{c.type}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">Ativo</span>
                        </td>
                      </tr>
                    );
                  })}
                  {certificates.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-8 py-24 text-center">
                        <div className="max-w-xs mx-auto space-y-3">
                          <div className="w-16 h-16 bg-slate-50 text-slate-200 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                            <FileText size={32} />
                          </div>
                          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Nenhum atestado registrado.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
           </div>
        </div>
      );
      case 'users': return isAdmin ? <UserManagement /> : null;
      default: return null;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} user={currentUser} onLogout={handleLogout}>
      {/* Toast de Sucesso */}
      {showSuccessToast && (
        <div className="fixed bottom-10 right-10 z-[200] bg-slate-900 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-5 animate-in slide-in-from-bottom-10 duration-500 border border-white/10">
          <div className="bg-emerald-500 p-2 rounded-xl">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest">Sucesso na Gravação</p>
            <p className="text-[10px] text-slate-400 font-bold">{isDemo ? 'Os dados foram persistidos no cache do seu navegador.' : 'Registro sincronizado via Supabase Cloud.'}</p>
          </div>
        </div>
      )}

      {isDemo && (
        <div className="mb-8 bg-indigo-600 p-6 rounded-[2.5rem] flex items-center justify-between text-white shadow-2xl shadow-indigo-200 animate-in zoom-in duration-500">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
              <ShieldAlert size={32} />
            </div>
            <div>
              <h3 className="font-black uppercase tracking-[0.2em] text-xs">Sandbox de Demonstração</h3>
              <p className="text-[11px] opacity-80 font-bold">Você pode registrar e visualizar dados. Eles ficam salvos apenas neste navegador (LocalStorage).</p>
            </div>
          </div>
          <div className="bg-white/10 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-white/20">
            Acesso Root
          </div>
        </div>
      )}

      {renderContent()}
      
      {isFormOpen && (
        <CertificateForm 
          employees={employees} 
          onClose={() => setIsFormOpen(false)} 
          onSave={handleSaveCertificate} 
          initialData={currentEdit} 
        />
      )}
      
      {isEmployeeFormOpen && (
        <EmployeeForm 
          onClose={() => setIsEmployeeFormOpen(false)} 
          onSave={handleSaveEmployee} 
          initialData={currentEmployeeEdit} 
        />
      )}
    </Layout>
  );
};

export default App;
