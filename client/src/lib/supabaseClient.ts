import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { TaskItem, UserProfile, SupabaseConfig } from '../types';

const STORAGE_KEYS = {
  CONFIG: 'supabase_app_config',
  SESSION_USER: 'supabase_session_user',
  LOCAL_TASKS: 'supabase_local_tasks_backup',
  REGISTERED_ACCOUNTS: 'pronounceit_registered_accounts',
  SENT_EMAILS: 'pronounceit_sent_emails',
};

export interface StoredAccount {
  id: string;
  email: string;
  username: string;
  fullName: string;
  password: string;
  mustChangePassword: boolean;
  createdAt: string;
}

export interface WelcomeEmailNotice {
  to: string;
  username: string;
  standardPassword: string;
  subject: string;
  sentAt: string;
}

const DEFAULT_TASKS: TaskItem[] = [
  {
    id: 't-1',
    user_id: 'usr-demo-001',
    title: 'Configurar variables de Supabase',
    description: 'Añadir SUPABASE_URL y SUPABASE_ANON_KEY para sincronización en la nube.',
    category: 'trabajo',
    priority: 'alta',
    status: 'en_progreso',
    due_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    created_at: new Date().toISOString(),
    tags: ['supabase', 'backend'],
  },
  {
    id: 't-2',
    user_id: 'usr-demo-001',
    title: 'Diseñar interfaz en React Native',
    description: 'Implementar FlatList y Navigation Tabs en la app móvil con feedback háptico.',
    category: 'trabajo',
    priority: 'media',
    status: 'completada',
    due_date: new Date().toISOString().split('T')[0],
    created_at: new Date(Date.now() - 86400000).toISOString(),
    tags: ['react-native', 'ui'],
  },
  {
    id: 't-3',
    user_id: 'usr-demo-001',
    title: 'Hacer rutina de cardio y estiramiento',
    description: 'Completar 30 minutos de ejercicio antes de la reunión matutina.',
    category: 'salud',
    priority: 'media',
    status: 'pendiente',
    due_date: new Date(Date.now() + 172800000).toISOString().split('T')[0],
    created_at: new Date().toISOString(),
    tags: ['fitness', 'bienestar'],
  },
  {
    id: 't-4',
    user_id: 'usr-demo-001',
    title: 'Revisar presupuesto mensual',
    description: 'Exportar balance de gastos y organizar previsiones de inversión.',
    category: 'finanzas',
    priority: 'baja',
    status: 'pendiente',
    due_date: new Date(Date.now() + 259200000).toISOString().split('T')[0],
    created_at: new Date().toISOString(),
    tags: ['finanzas', 'control'],
  },
  {
    id: 't-5',
    user_id: 'usr-demo-001',
    title: 'Curso de Row Level Security (RLS)',
    description: 'Practicar políticas de seguridad de PostgreSQL para proteger datos de usuarios.',
    category: 'estudio',
    priority: 'urgente',
    status: 'en_progreso',
    due_date: new Date().toISOString().split('T')[0],
    created_at: new Date().toISOString(),
    tags: ['sql', 'seguridad'],
  },
];

class SupabaseService {
  private client: SupabaseClient | null = null;
  private config: SupabaseConfig;
  private currentUser: UserProfile | null = null;
  private listeners: (() => void)[] = [];

  constructor() {
    const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
    const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

    const savedConfigStr = localStorage.getItem(STORAGE_KEYS.CONFIG);
    let savedConfig: Partial<SupabaseConfig> = {};
    if (savedConfigStr) {
      try {
        savedConfig = JSON.parse(savedConfigStr);
      } catch (e) {
        console.error('Error parsing stored supabase config', e);
      }
    }

    const activeUrl = savedConfig.url || envUrl || '';
    const activeKey = savedConfig.anonKey || envKey || '';

    this.config = {
      url: activeUrl,
      anonKey: activeKey,
      isCustom: Boolean(savedConfig.url || (envUrl && envUrl.includes('supabase.co'))),
      isConnected: false,
    };

    if (this.config.url && this.config.anonKey) {
      try {
        this.client = createClient(this.config.url, this.config.anonKey);
      } catch (e) {
        console.warn('Failed to initialize real Supabase client:', e);
      }
    }

    // Always start with no active session so the user starts at the login screen
    this.currentUser = null;
    localStorage.removeItem(STORAGE_KEYS.SESSION_USER);
  }

  public subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  public getConfig(): SupabaseConfig {
    return { ...this.config };
  }

  public getCurrentUser(): UserProfile | null {
    return this.currentUser;
  }

  public getClient(): SupabaseClient | null {
    return this.client;
  }

  public async setConfig(url: string, anonKey: string): Promise<{ success: boolean; message: string }> {
    const cleanUrl = url.trim();
    const cleanKey = anonKey.trim();

    if (!cleanUrl || !cleanKey) {
      return { success: false, message: 'URL y Anon Key son requeridos.' };
    }

    try {
      const testClient = createClient(cleanUrl, cleanKey);
      // Fast probe
      const { error } = await testClient.from('tasks').select('id').limit(1);

      this.client = testClient;
      this.config = {
        url: cleanUrl,
        anonKey: cleanKey,
        isCustom: true,
        isConnected: !error || !error.message.includes('FetchError'),
        lastChecked: new Date().toLocaleTimeString(),
      };

      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(this.config));
      this.notify();
      return {
        success: true,
        message: error ? `Conectado a Supabase (aviso tabla: ${error.message})` : 'Conexión con Supabase exitosa',
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: `Error al conectar: ${msg}` };
    }
  }

  private getStoredAccounts(): StoredAccount[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.REGISTERED_ACCOUNTS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveStoredAccounts(accounts: StoredAccount[]) {
    localStorage.setItem(STORAGE_KEYS.REGISTERED_ACCOUNTS, JSON.stringify(accounts));
  }

  public async signIn(
    emailOrUsername: string,
    password: string
  ): Promise<{ success: boolean; message?: string; mustChangePassword?: boolean; user?: UserProfile }> {
    const input = (emailOrUsername || '').trim().toLowerCase();
    if (!input || !password) {
      return { success: false, message: 'Por favor ingresa tu usuario/correo y contraseña' };
    }

    if (this.client && this.config.isCustom && input.includes('@')) {
      try {
        const { data, error } = await this.client.auth.signInWithPassword({ email: input, password });
        if (!error && data.user) {
          const profile: UserProfile = {
            id: data.user.id,
            email: data.user.email || input,
            full_name: data.user.user_metadata?.full_name || input.split('@')[0],
            username: input.split('@')[0],
            created_at: data.user.created_at,
          };
          this.currentUser = profile;
          localStorage.setItem(STORAGE_KEYS.SESSION_USER, JSON.stringify(profile));
          this.notify();
          return { success: true, user: profile };
        }
      } catch {
        // Fallback to local accounts
      }
    }

    // Check stored registered accounts
    const accounts = this.getStoredAccounts();
    const existing = accounts.find(
      (a) => a.email.toLowerCase() === input || a.username.toLowerCase() === input
    );

    if (existing) {
      if (existing.password !== password) {
        return { success: false, message: 'Contraseña incorrecta' };
      }
      const profile: UserProfile = {
        id: existing.id,
        email: existing.email,
        full_name: existing.fullName || existing.username,
        username: existing.username,
        must_change_password: existing.mustChangePassword,
        role: 'Estudiante PronounceIt',
        created_at: existing.createdAt,
      };
      this.currentUser = profile;
      localStorage.setItem(STORAGE_KEYS.SESSION_USER, JSON.stringify(profile));
      this.notify();
      return {
        success: true,
        mustChangePassword: existing.mustChangePassword,
        user: profile,
      };
    }

    // Standard initial password for demo/mock accounts
    if (password === '12345') {
      const profile: UserProfile = {
        id: `usr-${Date.now().toString(36)}`,
        email: input.includes('@') ? input : `${input}@ejemplo.com`,
        full_name: input.split('@')[0],
        username: input.split('@')[0],
        must_change_password: true,
        role: 'Estudiante PronounceIt',
        created_at: new Date().toISOString(),
      };
      this.currentUser = profile;
      localStorage.setItem(STORAGE_KEYS.SESSION_USER, JSON.stringify(profile));
      this.notify();
      return { success: true, mustChangePassword: true, user: profile };
    }

    if (password.length < 6) {
      return { success: false, message: 'La contraseña debe tener al menos 6 caracteres' };
    }

    const mockProfile: UserProfile = {
      id: `usr-${Date.now().toString(36)}`,
      email: input.includes('@') ? input : `${input}@ejemplo.com`,
      full_name: input.split('@')[0].replace('.', ' ').replace(/^./, (c) => c.toUpperCase()),
      username: input.split('@')[0],
      must_change_password: false,
      role: 'Estudiante PronounceIt',
      created_at: new Date().toISOString(),
    };
    this.currentUser = mockProfile;
    localStorage.setItem(STORAGE_KEYS.SESSION_USER, JSON.stringify(mockProfile));
    this.notify();
    return { success: true, mustChangePassword: false, user: mockProfile };
  }

  public async signUpWithStandardPassword(
    email: string,
    username: string
  ): Promise<{ success: boolean; message?: string; emailNotice?: WelcomeEmailNotice; user?: UserProfile }> {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanUsername = (username || '').trim();

    if (!cleanEmail || !cleanUsername) {
      return { success: false, message: 'El correo y el nombre de usuario son obligatorios.' };
    }

    const accounts = this.getStoredAccounts();
    const alreadyExists = accounts.some(
      (a) => a.email.toLowerCase() === cleanEmail || a.username.toLowerCase() === cleanUsername.toLowerCase()
    );

    if (alreadyExists) {
      return { success: false, message: 'Ya existe una cuenta con este correo o nombre de usuario.' };
    }

    const newAccount: StoredAccount = {
      id: `usr-${Date.now().toString(36)}`,
      email: cleanEmail,
      username: cleanUsername,
      fullName: cleanUsername,
      password: '12345', // Contraseña estándar obligatoria que deberá cambiar
      mustChangePassword: true,
      createdAt: new Date().toISOString(),
    };

    accounts.push(newAccount);
    this.saveStoredAccounts(accounts);

    const emailNotice: WelcomeEmailNotice = {
      to: cleanEmail,
      username: cleanUsername,
      standardPassword: '12345',
      subject: '🎉 ¡Bienvenido a PronounceIt! Tus credenciales de acceso',
      sentAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    try {
      const sentRaw = localStorage.getItem(STORAGE_KEYS.SENT_EMAILS);
      const sentList = sentRaw ? JSON.parse(sentRaw) : [];
      sentList.unshift(emailNotice);
      localStorage.setItem(STORAGE_KEYS.SENT_EMAILS, JSON.stringify(sentList.slice(0, 10)));
    } catch (e) {
      console.warn('Error saving sent emails notice', e);
    }

    return {
      success: true,
      message: `Cuenta creada. Se ha enviado un correo a ${cleanEmail} con tu usuario (${cleanUsername}) y la contraseña estándar (12345).`,
      emailNotice,
    };
  }

  public async updateInitialPassword(
    emailOrUsername: string,
    newPassword: string
  ): Promise<{ success: boolean; message?: string }> {
    if (!newPassword || newPassword.length < 6) {
      return { success: false, message: 'La nueva contraseña debe tener al menos 6 caracteres.' };
    }
    if (newPassword === '12345') {
      return { success: false, message: 'La nueva contraseña no puede ser la contraseña estándar 12345.' };
    }

    const input = (emailOrUsername || '').trim().toLowerCase();
    const accounts = this.getStoredAccounts();
    const account = accounts.find(
      (a) => a.email.toLowerCase() === input || a.username.toLowerCase() === input
    );

    if (account) {
      account.password = newPassword;
      account.mustChangePassword = false;
      this.saveStoredAccounts(accounts);
    }

    if (this.currentUser) {
      this.currentUser.must_change_password = false;
      localStorage.setItem(STORAGE_KEYS.SESSION_USER, JSON.stringify(this.currentUser));
      this.notify();
    } else {
      const profile: UserProfile = {
        id: account ? account.id : `usr-${Date.now().toString(36)}`,
        email: account ? account.email : (input.includes('@') ? input : `${input}@ejemplo.com`),
        full_name: account ? (account.fullName || account.username) : input.split('@')[0],
        username: account ? account.username : input.split('@')[0],
        must_change_password: false,
        role: 'Estudiante PronounceIt',
        created_at: account ? account.createdAt : new Date().toISOString(),
      };
      this.currentUser = profile;
      localStorage.setItem(STORAGE_KEYS.SESSION_USER, JSON.stringify(profile));
      this.notify();
    }

    return { success: true, message: 'Contraseña actualizada correctamente.' };
  }

  public async signUp(email: string, password: string, fullName: string): Promise<{ success: boolean; message?: string; user?: UserProfile }> {
    return this.signUpWithStandardPassword(email, fullName);
  }

  public async signOut(): Promise<void> {
    if (this.client && this.config.isCustom) {
      try {
        await this.client.auth.signOut();
      } catch (e) {
        console.warn('Error signing out of real supabase:', e);
      }
    }
    this.currentUser = null;
    localStorage.removeItem(STORAGE_KEYS.SESSION_USER);
    this.notify();
  }

  public async resetPassword(email: string): Promise<{ success: boolean; message?: string }> {
    if (this.client && this.config.isCustom) {
      try {
        const { error } = await this.client.auth.resetPasswordForEmail(email, {
          redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        });
        if (error) {
          return { success: false, message: error.message };
        }
        return { success: true, message: 'Se ha enviado un correo con instrucciones para restablecer tu contraseña.' };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, message: msg };
      }
    }

    if (!email || !email.includes('@')) {
      return { success: false, message: 'Por favor ingresa un correo electrónico válido.' };
    }

    return {
      success: true,
      message: `Hemos enviado las instrucciones para restablecer tu contraseña a ${email}.`,
    };
  }

  // --- CRUD Operations ---
  public async fetchTasks(): Promise<TaskItem[]> {
    if (this.client && this.config.isCustom) {
      try {
        const { data, error } = await this.client
          .from('tasks')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          return data as TaskItem[];
        }
      } catch (e) {
        console.warn('Real supabase tasks fetch fallback to local:', e);
      }
    }

    // Local Storage tasks fallback
    const raw = localStorage.getItem(STORAGE_KEYS.LOCAL_TASKS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.LOCAL_TASKS, JSON.stringify(DEFAULT_TASKS));
      return DEFAULT_TASKS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_TASKS;
    }
  }

  public async createTask(task: Omit<TaskItem, 'id' | 'created_at' | 'user_id'>): Promise<TaskItem> {
    const userId = this.currentUser?.id || 'usr-demo-001';
    const newTask: TaskItem = {
      id: `t-${Date.now().toString(36)}`,
      user_id: userId,
      ...task,
      created_at: new Date().toISOString(),
    };

    if (this.client && this.config.isCustom) {
      try {
        const { data, error } = await this.client
          .from('tasks')
          .insert([newTask])
          .select()
          .single();

        if (!error && data) {
          return data as TaskItem;
        }
      } catch (e) {
        console.warn('Supabase insert fallback:', e);
      }
    }

    // Local update
    const current = await this.fetchTasks();
    const updated = [newTask, ...current];
    localStorage.setItem(STORAGE_KEYS.LOCAL_TASKS, JSON.stringify(updated));
    this.notify();
    return newTask;
  }

  public async updateTask(id: string, updates: Partial<TaskItem>): Promise<TaskItem | null> {
    if (this.client && this.config.isCustom) {
      try {
        const { data, error } = await this.client
          .from('tasks')
          .update(updates)
          .eq('id', id)
          .select()
          .single();

        if (!error && data) {
          return data as TaskItem;
        }
      } catch (e) {
        console.warn('Supabase update fallback:', e);
      }
    }

    const current = await this.fetchTasks();
    const index = current.findIndex((t) => t.id === id);
    if (index === -1) return null;

    current[index] = { ...current[index], ...updates };
    localStorage.setItem(STORAGE_KEYS.LOCAL_TASKS, JSON.stringify(current));
    this.notify();
    return current[index];
  }

  public async deleteTask(id: string): Promise<boolean> {
    if (this.client && this.config.isCustom) {
      try {
        const { error } = await this.client.from('tasks').delete().eq('id', id);
        if (!error) {
          return true;
        }
      } catch (e) {
        console.warn('Supabase delete fallback:', e);
      }
    }

    const current = await this.fetchTasks();
    const filtered = current.filter((t) => t.id !== id);
    localStorage.setItem(STORAGE_KEYS.LOCAL_TASKS, JSON.stringify(filtered));
    this.notify();
    return true;
  }

  public resetDemoData() {
    localStorage.setItem(STORAGE_KEYS.LOCAL_TASKS, JSON.stringify(DEFAULT_TASKS));
    this.notify();
  }
}

export const supabaseService = new SupabaseService();
