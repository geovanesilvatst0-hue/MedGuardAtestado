
import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Bell, 
  Settings, 
  LogOut,
  ShieldCheck,
  Menu,
  X,
  UserCog,
  Database
} from 'lucide-react';
import { User, UserRole } from '../types';
import { db } from '../services/db';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: User;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, user, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isDbConnected, setIsDbConnected] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    const checkDb = async () => {
      const status = await db.checkConnection();
      setIsDbConnected(status);
    };
    checkDb();
    const interval = setInterval(checkDb, 30000); // Re-check every 30s
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'employees', label: 'Funcionários', icon: Users },
    { id: 'certificates', label: 'Atestados', icon: FileText },
    { id: 'alerts', label: 'Alertas', icon: Bell },
  ];

  if (user.role === UserRole.ADMIN) {
    navItems.push({ id: 'users', label: 'Usuários', icon: UserCog });
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-900 text-white shadow-xl">
        <div className="p-6 flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-lg">
            <ShieldCheck size={24} />
          </div>
          <span className="font-bold text-xl tracking-tight">MedGuard</span>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                activeTab === item.id 
                  ? 'bg-indigo-600 text-white shadow-lg' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-4 py-3 text-slate-400 text-sm">
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold text-white uppercase">
              {user.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-white font-medium truncate">{user.name}</p>
              <p className="text-[10px] text-indigo-400 font-bold">{user.role}</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 mt-2 text-slate-400 hover:text-rose-400 transition-colors group"
          >
            <LogOut size={20} className="group-hover:translate-x-1 transition-transform" />
            <span className="font-medium">Sair</span>
          </button>
        </div>
      </aside>

      {/* Mobile Nav */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-50 flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
           <ShieldCheck size={24} className="text-indigo-600" />
           <span className="font-bold text-lg">MedGuard</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 bg-slate-900/50 z-40" onClick={() => setIsMobileMenuOpen(false)}>
          <aside className="w-64 h-full bg-slate-900 text-white p-6" onClick={e => e.stopPropagation()}>
             <nav className="space-y-4 mt-12">
               {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${activeTab === item.id ? 'bg-indigo-600' : ''}`}
                  >
                    <item.icon size={20} />
                    <span>{item.label}</span>
                  </button>
                ))}
                <button 
                  onClick={onLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-rose-400 border-t border-slate-800 pt-6"
                >
                  <LogOut size={20} />
                  <span>Sair</span>
                </button>
             </nav>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto lg:mt-0 mt-16">
        <header className="hidden lg:flex items-center justify-between h-16 bg-white border-b border-slate-200 px-8 flex-shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-slate-800 capitalize">{activeTab === 'users' ? 'Gestão de Usuários' : activeTab}</h1>
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold ${
              isDbConnected === true ? 'bg-emerald-50 text-emerald-600' : 
              isDbConnected === false ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-400'
            }`}>
              <Database size={12} />
              {isDbConnected === true ? 'ONLINE' : isDbConnected === false ? 'OFFLINE' : 'CHECKING...'}
              <span className={`w-1.5 h-1.5 rounded-full ${
                isDbConnected === true ? 'bg-emerald-500' : 
                isDbConnected === false ? 'bg-rose-500' : 'bg-slate-300'
              } animate-pulse`} />
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="text-xs text-right text-slate-500">
               <p className="font-bold text-indigo-600">Sessão Segura Ativa</p>
               <p className="font-mono text-[10px]">LGPD ID: {user.id.toUpperCase()}</p>
             </div>
             <div className="h-8 w-px bg-slate-200" />
             <div className="bg-slate-100 p-2 rounded-full cursor-pointer hover:bg-slate-200 transition-colors">
               <Settings size={20} className="text-slate-600" />
             </div>
          </div>
        </header>
        <div className="p-4 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
