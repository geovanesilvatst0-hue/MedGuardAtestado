
import { supabase, isConfigured } from './supabase';
import { Employee, MedicalCertificate, User, UserRole, AuditLog } from '../types';

export const db = {
  // Verificação de saúde da conexão
  checkConnection: async (): Promise<boolean> => {
    if (!isConfigured) {
      console.warn("❌ MedGuard: Supabase não está configurado.");
      return false;
    }

    try {
      const { error } = await supabase.from('profiles').select('id').limit(1);
      if (error) {
        console.error("❌ Erro de banco de dados:", error.message);
        return false;
      }
      return true;
    } catch (err: any) {
      console.error("❌ Erro inesperado na conexão:", err);
      return false;
    }
  },

  // Usuários e Perfis
  getProfile: async (userId: string): Promise<User | null> => {
    if (!isConfigured) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) return null;
      return {
        ...data,
        createdAt: data.created_at,
        lastLogin: data.last_login
      } as User;
    } catch (e) {
      return null;
    }
  },

  getUsers: async (): Promise<User[]> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('name');
      if (error) throw error;
      return data.map(u => ({
        ...u,
        createdAt: u.created_at,
        lastLogin: u.last_login
      })) as User[];
    } catch (e) {
      return [];
    }
  },

  saveUser: async (user: Partial<User>) => {
    const { data, error } = await supabase
      .from('profiles')
      .update(user)
      .eq('id', user.id)
      .select();
    if (error) throw error;
    return data?.[0] as User;
  },

  // Auditoria
  addLog: async (log: Omit<AuditLog, 'id' | 'timestamp'>) => {
    if (!isConfigured) return;
    try {
      await supabase.from('audit_logs').insert([{
        actor_id: log.userId === 'SYSTEM' ? null : log.userId,
        action: log.action,
        details: log.details,
        entity: 'system'
      }]);
    } catch (e) {}
  },

  getLogs: async (): Promise<AuditLog[]> => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) return [];
      return data.map(d => ({
        id: d.id,
        userId: d.actor_id || 'SYSTEM',
        userName: 'Usuário',
        action: d.action,
        details: d.details,
        timestamp: d.created_at
      }));
    } catch (e) {
      return [];
    }
  },

  // Funcionários
  getEmployees: async (): Promise<Employee[]> => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('name');
      if (error) throw error;
      return data.map(e => ({
        ...e,
        createdAt: e.created_at
      })) as Employee[];
    } catch (e: any) {
      return [];
    }
  },

  saveEmployee: async (employee: Partial<Employee>) => {
    const payload = {
      name: employee.name,
      cpf: employee.cpf,
      registration: employee.registration,
      department: employee.department,
      role: employee.role
    };

    if (employee.id) {
      const { data, error } = await supabase.from('employees').update(payload).eq('id', employee.id).select();
      if (error) throw error;
      return data[0];
    } else {
      const { data, error } = await supabase.from('employees').insert([payload]).select();
      if (error) throw error;
      return data[0];
    }
  },

  deleteEmployee: async (id: string) => {
    const { error } = await supabase.from('employees').delete().eq('id', id);
    if (error) throw error;
  },

  // Atestados
  getCertificates: async (): Promise<MedicalCertificate[]> => {
    try {
      const { data, error } = await supabase
        .from('medical_certificates')
        .select('*')
        .order('issue_date', { ascending: false });
      if (error) throw error;
      return data.map(d => ({
        ...d,
        employeeId: d.employee_id,
        issueDate: d.issue_date,
        startDate: d.start_date,
        endDate: d.end_date,
        doctorName: d.doctor_name,
        fileUrl: d.file_path,
        createdAt: d.created_at
      })) as MedicalCertificate[];
    } catch (e) {
      return [];
    }
  },

  saveCertificate: async (cert: Partial<MedicalCertificate>) => {
    const payload = {
      employee_id: cert.employeeId,
      issue_date: cert.issueDate,
      start_date: cert.startDate,
      end_date: cert.endDate,
      days: cert.days,
      cid: cert.cid,
      doctor_name: cert.doctorName,
      crm: cert.crm,
      type: cert.type,
      file_path: cert.fileUrl,
      status: cert.status
    };

    if (cert.id) {
      const { error } = await supabase.from('medical_certificates').update(payload).eq('id', cert.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('medical_certificates').insert([payload]);
      if (error) throw error;
    }
  }
};
