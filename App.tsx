
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
import { FileText, Download, Filter, BellRing, Loader2, AlertCircle } from 'lucide-react';

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

  React.useEffect(() => {
    const initApp = async () => {
      try {
        if (!isConfigured) {
          setIsInitializing(false);
          return;
        }

        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          const profile = await db.getProfile(data.session.user.id);
          if (profile) setCurrentUser(profile);
        }
      } catch (err) {
        console.error("Erro na inicialização:", err);
      } finally {
        setIsInitializing(false);
      }
    };
    initApp();
  }, []);

  const loadAppData = React.useCallback(async () => {
    if (!currentUser || !isConfigured) return;
    setIsLoadingData(true);
    try {
      const [empData, certData] = await Promise.all([
        db.getEmployees(),
        db.getCertificates()
      ]);
      setEmployees(empData || []);
      setCertificates(certData || []);
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setIsLoadingData(false);
    }
  }, [currentUser]);

  React.useEffect(() => {
    loadAppData();
  }, [loadAppData]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  if (isInitializing) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-900 gap-4">
        <Loader2 className="animate-spin text-white" size={48} />
        <p className="text-slate-400 font-medium animate-pulse">Iniciando MedGuard...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  const isAdmin = currentUser.role === UserRole.ADMIN;

  const handleSaveCertificate = async (data: Partial<MedicalCertificate>) => {
    if (!isAdmin) return;
    try {
      await db.saveCertificate({ ...data, id: currentEdit?.id });
      await loadAppData();
      setIsFormOpen(false);
      setCurrentEdit(undefined);
    } catch (err: any) {
      alert(`Erro ao salvar: ${err.message}`);
    }
  };

  const handleSaveEmployee = async (data: Partial<Employee>) => {
    if (!isAdmin) return;
    try {
      await db.saveEmployee(data);
      await loadAppData();
      setIsEmployeeFormOpen(false);
      setCurrentEmployeeEdit(undefined);
    } catch (err: any) {
      alert(`Erro ao salvar: ${err.message}`);
    }
  };

  const handleBulkImportEmployees = async (newEmployees: Partial<Employee>[]) => {
    if (!isAdmin) return;
    try {
      // Salva um por um para garantir que todos os campos sejam preenchidos
      for (const emp of newEmployees) {
        if (emp.name) {
          await db.saveEmployee(emp);
        }
      }
      await loadAppData();
    } catch (err: any) {
      alert(`Erro na importação: ${err.message}`);
    }
  };

  const renderContent = () => {
    if (isLoadingData) {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="animate-spin text-indigo-600" size={32} />
          <p className="text-slate-500 font-medium">Carregando dados...</p>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard employees={employees} certificates={certificates} />;
      case 'employees':
        return (
          <EmployeeList 
            employees={employees} 
            onAdd={() => { setCurrentEmployeeEdit(undefined); setIsEmployeeFormOpen(true); }}
            onEdit={(id) => { const e = employees.find(x => x.id === id); if(e) { setCurrentEmployeeEdit(e); setIsEmployeeFormOpen(true); } }}
            onDelete={async (id) => { if(window.confirm("Excluir?")) { await db.deleteEmployee(id); loadAppData(); } }}
            onView={(id) => setActiveTab('certificates')}
            onBulkImport={handleBulkImportEmployees}
            isAdmin={isAdmin}
          />
        );
      case 'certificates':
        return (
          <div className="space-y-6">
             <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-800">Atestados Médicos</h2>
                {isAdmin && (
                  <button onClick={() => { setCurrentEdit(undefined); setIsFormOpen(true); }} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2">
                    <FileText size={18} /> Novo Registro
                  </button>
                )}
             </div>

             <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-black border-b">
                    <tr>
                      <th className="px-6 py-4">Funcionário</th>
                      <th className="px-6 py-4">Período</th>
                      <th className="px-6 py-4">CID / Tipo</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {certificates.map(c => {
                      const emp = employees.find(e => e.id === c.employeeId);
                      return (
                        <tr key={c.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => { if(isAdmin) { setCurrentEdit(c); setIsFormOpen(true); }}}>
                          <td className="px-6 py-4">
                            <p className="font-bold text-slate-900">{emp?.name || '---'}</p>
                            <p className="text-[10px] text-slate-400">{emp?.registration || '---'}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-medium">{new Date(c.startDate).toLocaleDateString()}</p>
                            <p className="text-[10px] text-slate-400">até {new Date(c.endDate).toLocaleDateString()}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-indigo-600 font-bold">{c.cid || 'N/A'}</p>
                            <p className="text-[10px] text-slate-400">{c.type}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">Ativo</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
             </div>
          </div>
        );
      case 'users':
        return isAdmin ? <UserManagement /> : null;
      default:
        return null;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} user={currentUser} onLogout={handleLogout}>
      {renderContent()}
      {isFormOpen && (
        <CertificateForm employees={employees} onClose={() => setIsFormOpen(false)} onSave={handleSaveCertificate} initialData={currentEdit} />
      )}
      {isEmployeeFormOpen && (
        <EmployeeForm onClose={() => setIsEmployeeFormOpen(false)} onSave={handleSaveEmployee} initialData={currentEmployeeEdit} />
      )}
    </Layout>
  );
};

export default App;
