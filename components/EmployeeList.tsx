
import React from 'react';
import { Plus, Search, Edit2, Trash2, Eye, FileSpreadsheet, Download, Loader2, CheckCircle2, X } from 'lucide-react';
import { Employee } from '../types';
import * as XLSX from 'xlsx';

interface EmployeeListProps {
  employees: Employee[];
  onAdd: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onView: (id: string) => void;
  onBulkImport: (newEmployees: Partial<Employee>[]) => void;
  isAdmin?: boolean;
}

const EmployeeList: React.FC<EmployeeListProps> = ({ 
  employees, onAdd, onEdit, onDelete, onView, onBulkImport, isAdmin = false 
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isImporting, setIsImporting] = React.useState(false);
  const [importStatus, setImportStatus] = React.useState<{count: number} | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const filtered = React.useMemo(() => {
    return employees.filter(e => 
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (e.cpf && e.cpf.includes(searchTerm)) ||
      (e.registration && e.registration.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [employees, searchTerm]);

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "Nome": "NOME DO FUNCIONARIO",
        "CPF": "00000000000",
        "Matricula": "MAT-001",
        "Setor": "TI",
        "Cargo": "ANALISTA"
      }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modelo");
    XLSX.writeFile(wb, "modelo_medguard.xlsx");
  };

  const findValue = (row: any, keys: string[]) => {
    const foundKey = Object.keys(row).find(k => 
      keys.some(searchKey => k.toLowerCase().trim() === searchKey.toLowerCase())
    );
    const val = foundKey ? row[foundKey] : '';
    return val !== undefined && val !== null ? String(val).trim() : '';
  };

  const processFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { raw: false }) as any[];

        const newEmployees: Partial<Employee>[] = data.map((row) => {
          const emp = {
            name: findValue(row, ['Nome', 'name', 'Funcionário', 'Employee', 'NOME COMPLETO']),
            cpf: findValue(row, ['CPF', 'cpf', 'Documento', 'DOCUMENTO']),
            registration: findValue(row, ['Matricula', 'registration', 'ID', 'Matrícula', 'MATRÍCULA']),
            department: findValue(row, ['Setor', 'department', 'Department', 'Departamento', 'SETOR']),
            role: findValue(row, ['Cargo', 'role', 'Role', 'Função', 'CARGO']),
          };
          return emp;
        }).filter(emp => emp.name !== '');

        if (newEmployees.length > 0) {
          onBulkImport(newEmployees as any);
          setImportStatus({ count: newEmployees.length });
          setTimeout(() => setImportStatus(null), 5000);
        } else {
          alert("Nenhum dado válido encontrado.");
        }
      } catch (err) {
        alert("Erro ao ler o arquivo Excel.");
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '---';
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? '---' : date.toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-4">
      {importStatus && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-3 text-emerald-700">
            <CheckCircle2 size={20} />
            <p className="font-medium">Importação concluída: <strong>{importStatus.count}</strong> novos funcionários.</p>
          </div>
          <button onClick={() => setImportStatus(null)} className="text-emerald-400">
            <X size={18} />
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Pesquisar funcionário, CPF ou matrícula..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <>
                <button 
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 bg-white text-slate-600 rounded-lg font-bold hover:bg-slate-50 transition-all text-xs"
                >
                  <Download size={14} />
                  Baixar Modelo
                </button>
                <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls, .csv" onChange={processFile} />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                  className="flex items-center gap-2 px-4 py-2.5 border border-indigo-200 bg-indigo-50 text-indigo-700 rounded-lg font-bold hover:bg-indigo-100 transition-all text-xs disabled:opacity-50"
                >
                  {isImporting ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
                  {isImporting ? 'Importando...' : 'Importar Excel'}
                </button>
                <button 
                  onClick={onAdd}
                  className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-md text-xs"
                >
                  <Plus size={16} />
                  Novo Funcionário
                </button>
              </>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-[10px] uppercase text-slate-500 bg-slate-50 font-black border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Nome / Matrícula</th>
                <th className="px-6 py-4">CPF</th>
                <th className="px-6 py-4">Setor / Cargo</th>
                <th className="px-6 py-4">Data Cadastro</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                        {emp.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{emp.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{emp.registration}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-600 font-medium">{emp.cpf}</td>
                  <td className="px-6 py-4 text-xs">
                    <p className="text-slate-900 font-bold">{emp.department}</p>
                    <p className="text-slate-400">{emp.role}</p>
                  </td>
                  <td className="px-6 py-4 text-[11px] text-slate-400 font-medium">
                    {formatDate(emp.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button onClick={() => onView(emp.id)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors">
                        <Eye size={16} />
                      </button>
                      {isAdmin && (
                        <>
                          <button onClick={() => onEdit(emp.id)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-md transition-colors">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => onDelete(emp.id)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-md transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400 text-sm italic">
                    Nenhum funcionário encontrado.
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

export default EmployeeList;
