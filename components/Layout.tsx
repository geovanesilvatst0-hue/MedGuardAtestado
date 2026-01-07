
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
  alertCount?: number;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, user, onLogout, alertCount = 0 }) => {
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
    { id: 'alerts', label: 'Alertas', icon: Bell, hasBadge: true },
  ];

  if (user.role === UserRole.ADMIN) {
    navItems.push({ id: 'users', label: 'Usuários', icon: UserCog });
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-900">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-900 text-white shadow-xl shrink-0">
        <div className="p-6 flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-500/20">
            <ShieldCheck size={24} />
          </div>
          <span className="font-bold text-xl tracking-tight">MedGuard</span>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all group ${
                activeTab === item.id 
                  ? 'bg-indigo-600 text-white shadow-lg' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <item.icon size={20} />
                  {item.hasBadge && alertCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500 border border-slate-900"></span>
                    </span>
                  )}
                </div>
                <span className="font-medium">{item.label}</span>
              </div>
              
              {item.hasBadge && alertCount > 0 && (
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  activeTab === item.id ? 'bg-white text-indigo-600' : 'bg-rose-500 text-white'
                }`}>
                  {alertCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-4 py-3 text-slate-400 text-sm">
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold text-white uppercase shadow-inner">
              {user.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-white font-medium truncate">{user.name}</p>
              <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">{user.role}</p>
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
        <div className="flex items-center gap-4">
          <div className="relative">
            <Bell size={20} className="text-slate-400" onClick={() => setActiveTab('alerts')} />
            {alertCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-rose-500 text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-white">
                {alertCount}
              </span>
            )}
          </div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 bg-slate-900/50 z-40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}>
          <aside className="w-64 h-full bg-slate-900 text-white p-6 shadow-2xl animate-in slide-in-from-left duration-300" onClick={e => e.stopPropagation()}>
             <nav className="space-y-4 mt-12">
               {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all ${
                      activeTab === item.id ? 'bg-indigo-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon size={20} />
                      <span className="font-medium">{item.label}</span>
                    </div>
                    {item.hasBadge && alertCount > 0 && (
                      <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                        {alertCount}
                      </span>
                    )}
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
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="hidden lg:flex items-center justify-between h-16 bg-white border-b border-slate-200 px-8 flex-shrink-0 z-20">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-black text-slate-800 capitalize tracking-tight">{activeTab === 'users' ? 'Gestão de Usuários' : activeTab}</h1>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-widest ${
              isDbConnected === true ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
              isDbConnected === false ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-slate-50 text-slate-400 border border-slate-100'
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
               <p className="font-black text-indigo-600 uppercase tracking-widest text-[9px]">Sessão Segura Ativa</p>
               <p className="font-mono text-[9px] opacity-60">ID: {user.id.split('-')[0].toUpperCase()}</p>
             </div>
             <div className="h-8 w-px bg-slate-200" />
             <div className="bg-slate-50 p-2.5 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors border border-slate-200/50 relative">
               <Bell size={20} className="text-slate-600" onClick={() => setActiveTab('alerts')} />
               {alertCount > 0 && (
                 <span className="absolute -top-1 -right-1 h-4 w-4 bg-rose-500 text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-white">
                   {alertCount}
                 </span>
               )}
             </div>
             <div className="bg-slate-50 p-2.5 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors border border-slate-200/50">
               <Settings size={20} className="text-slate-600" />
             </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto w-full pb-12">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
