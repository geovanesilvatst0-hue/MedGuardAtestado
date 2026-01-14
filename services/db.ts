
import { supabase, createSecondaryClient, isConfigured } from './supabase';
import { Employee, MedicalCertificate, User, UserRole, AuditLog } from '../types';

export const db = {
  checkConnection: async (): Promise<boolean> => {
    if (!isConfigured) return false;
    try {
      const { error } = await supabase.from('profiles').select('id').limit(1);
      return !error;
    } catch (err) {
      return false;
    }
  },

  uploadFile: async (file: File, isDemo: boolean = false): Promise<string> => {
    if (isDemo) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    }
    if (!isConfigured) throw new Error("Supabase não configurado.");
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.floor(Math.random() * 1000)}.${fileExt}`;
    const filePath = `certificates/${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from('medguard-docs')
      .upload(filePath, file);
    if (uploadError) throw new Error(`Falha ao subir arquivo: ${uploadError.message}`);
    const { data } = supabase.storage.from('medguard-docs').getPublicUrl(filePath);
    return data.publicUrl;
  },

  getProfile: async (userId: string): Promise<User | null> => {
    if (!isConfigured) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) return null;
      return { ...data, createdAt: data.created_at, lastLogin: data.last_login } as User;
    } catch (e) { return null; }
  },

  getUsers: async (): Promise<User[]> => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').order('name');
      if (error) {
        console.error("Erro ao buscar usuários:", error);
        throw error;
      }
      return data.map(u => ({ 
        ...u, 
        createdAt: u.created_at, 
        lastLogin: u.last_login 
      })) as User[];
    } catch (e) { return []; }
  },

  saveUser: async (user: Partial<User> & { password?: string }) => {
    const isNew = !user.id || user.id.startsWith('user-');
    let finalId = user.id;

    if (isNew) {
      if (!user.email || !user.password) throw new Error("E-mail e senha são obrigatórios.");
      
      const secondaryClient = createSecondaryClient();
      const { data: authData, error: authError } = await secondaryClient.auth.signUp({
        email: user.email,
        password: user.password,
      });

      if (authError) {
        if (authError.message.includes("already registered")) {
          throw new Error("E-mail já cadastrado.");
        }
        throw new Error(`Auth Error: ${authError.message}`);
      }

      if (!authData.user) throw new Error("Falha na criação da conta.");
      finalId = authData.user.id;
    }

    const payload = {
      id: finalId,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active ?? true,
      city: user.city || null
    };

    const { data, error: dbError } = await supabase
      .from('profiles')
      .upsert([payload], { onConflict: 'id' })
      .select();
    
    if (dbError) {
      console.error("DB Error Details:", dbError);
      if (dbError.message.includes('recursion')) {
        throw new Error("Erro de Segurança (Recursão). Rode o SQL da função 'is_admin'.");
      }
      throw new Error(`Erro no Banco: ${dbError.message}`);
    }
    
    return data?.[0] as User;
  },

  deleteUser: async (userId: string) => {
    const { error } = await supabase.from('profiles').delete().eq('id', userId);
    if (error) throw new Error(`Erro ao excluir perfil: ${error.message}`);
    return true;
  },

  addLog: async (log: Omit<AuditLog, 'id' | 'timestamp'>) => {
    if (!isConfigured) return;
    try {
      await supabase.from('audit_logs').insert([{
        actor_id: log.userId === 'ADMIN_GLOBAL' ? null : log.userId,
        action: log.action,
        details: log.details,
        entity: 'system'
      }]);
    } catch (e) {}
  },

  getLogs: async (): Promise<AuditLog[]> => {
    try {
      const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(50);
      if (error) return [];
      return data.map(d => ({ 
        id: d.id, 
        userId: d.actor_id || 'SYSTEM', 
        userName: 'Admin', 
        action: d.action, 
        details: d.details, 
        timestamp: d.created_at 
      }));
    } catch (e) { return []; }
  },

  getEmployees: async (): Promise<Employee[]> => {
    try {
      const { data, error } = await supabase.from('employees').select('*').order('name');
      if (error) throw error;
      return data.map(e => ({ ...e, createdAt: e.created_at })) as Employee[];
    } catch (e) { return []; }
  },

  saveEmployee: async (employee: Partial<Employee>, isDemo: boolean = false) => {
    if (isDemo) {
      const local = localStorage.getItem('medguard_demo_employees');
      const employees = local ? JSON.parse(local) : [];
      const newEmp = {
        ...employee,
        id: employee.id || `demo-emp-${Date.now()}`,
        createdAt: employee.createdAt || new Date().toISOString()
      };
      const updated = employee.id ? employees.map((e: any) => e.id === employee.id ? newEmp : e) : [newEmp, ...employees];
      localStorage.setItem('medguard_demo_employees', JSON.stringify(updated));
      return newEmp;
    }

    const payload = { 
      name: employee.name, 
      cpf: employee.cpf, 
      registration: employee.registration, 
      department: employee.department, 
      role: employee.role,
      city: employee.city || null
    };
    const isUpdate = employee.id && !employee.id.startsWith('demo-') && !employee.id.startsWith('temp-');
    const query = isUpdate
      ? supabase.from('employees').update(payload).eq('id', employee.id)
      : supabase.from('employees').insert([payload]);
    
    const { data, error } = await query.select();
    if (error) {
      if (error.message.includes('unique_cpf')) throw new Error("Este CPF já está cadastrado.");
      throw new Error(`Erro ao salvar funcionário: ${error.message}`);
    }
    return data[0];
  },

  deleteEmployee: async (id: string, isDemo: boolean = false) => {
    if (isDemo) {
      const local = localStorage.getItem('medguard_demo_employees');
      if (local) {
        const employees = JSON.parse(local);
        const updated = employees.filter((e: any) => e.id !== id);
        localStorage.setItem('medguard_demo_employees', JSON.stringify(updated));
      }
      return;
    }
    const { error } = await supabase.from('employees').delete().eq('id', id);
    if (error) throw error;
  },

  getCertificates: async (): Promise<MedicalCertificate[]> => {
    try {
      const { data, error } = await supabase.from('medical_certificates').select('*').order('issue_date', { ascending: false });
      if (error) throw error;
      return data.map(d => ({
        ...d,
        employeeId: d.employee_id,
        issueDate: d.issue_date,
        startDate: d.start_date,
        endDate: d.end_date,
        days: d.days,
        cid: d.cid,
        doctorName: d.doctor_name,
        crm: d.crm,
        type: d.type,
        fileUrl: d.file_path,
        createdAt: d.created_at,
        observations: d.observations
      })) as MedicalCertificate[];
    } catch (e) { return []; }
  },

  saveCertificate: async (cert: Partial<MedicalCertificate>) => {
    const payload: any = {
      employee_id: cert.employeeId,
      issue_date: cert.issueDate,
      start_date: cert.startDate,
      end_date: cert.endDate,
      days: cert.days,
      cid: cert.cid || null,
      doctor_name: cert.doctorName,
      crm: cert.crm,
      type: cert.type,
      file_path: cert.fileUrl || null,
      observations: cert.observations || null
    };
    const isUpdate = cert.id && !cert.id.startsWith('demo-') && !cert.id.startsWith('temp-');
    const query = isUpdate
      ? supabase.from('medical_certificates').update(payload).eq('id', cert.id)
      : supabase.from('medical_certificates').insert([payload]);
    const { data, error } = await query.select();
    if (error) throw new Error(`Erro no salvamento: ${error.message}`);
    return data?.[0];
  }
};
