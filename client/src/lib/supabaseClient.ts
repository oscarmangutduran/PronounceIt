import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { TaskItem, UserProfile, SupabaseConfig } from '../types';

const STORAGE_KEYS = {
  CONFIG: 'supabase_app_config',
  SESSION_USER: 'supabase_session_user',
  LOCAL_TASKS: 'supabase_local_tasks_backup',
};

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

    // Restore cached session
    const savedUser = localStorage.getItem(STORAGE_KEYS.SESSION_USER);
    if (savedUser) {
      try {
        this.currentUser = JSON.parse(savedUser);
      } catch (e) {
        console.error('Error parsing stored session', e);
      }
    } else {
      // Default demo user so app is immediately usable
      this.currentUser = {
        id: 'usr-demo-001',
        email: 'alex.dev@ejemplo.com',
        full_name: 'Alex Rivera',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        role: 'Pro Developer',
        created_at: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEYS.SESSION_USER, JSON.stringify(this.currentUser));
    }
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

  public async signIn(email: string, password: string): Promise<{ success: boolean; message?: string; user?: UserProfile }> {
    if (this.client && this.config.isCustom) {
      try {
        const { data, error } = await this.client.auth.signInWithPassword({ email, password });
        if (error) {
          return { success: false, message: error.message };
        }
        if (data.user) {
          const profile: UserProfile = {
            id: data.user.id,
            email: data.user.email || email,
            full_name: data.user.user_metadata?.full_name || email.split('@')[0],
            created_at: data.user.created_at,
          };
          this.currentUser = profile;
          localStorage.setItem(STORAGE_KEYS.SESSION_USER, JSON.stringify(profile));
          this.notify();
          return { success: true, user: profile };
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, message: msg };
      }
    }

    // Local / Simulator demo authentication
    if (!email || !password) {
      return { success: false, message: 'Por favor ingresa correo y contraseña' };
    }
    if (password.length < 6) {
      return { success: false, message: 'La contraseña debe tener al menos 6 caracteres' };
    }

    const mockProfile: UserProfile = {
      id: `usr-${Date.now().toString(36)}`,
      email,
      full_name: email.split('@')[0].replace('.', ' ').replace(/^./, (c) => c.toUpperCase()),
      role: 'Usuario Supabase',
      created_at: new Date().toISOString(),
    };
    this.currentUser = mockProfile;
    localStorage.setItem(STORAGE_KEYS.SESSION_USER, JSON.stringify(mockProfile));
    this.notify();
    return { success: true, user: mockProfile };
  }

  public async signUp(email: string, password: string, fullName: string): Promise<{ success: boolean; message?: string; user?: UserProfile }> {
    if (this.client && this.config.isCustom) {
      try {
        const { data, error } = await this.client.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
          },
        });
        if (error) {
          return { success: false, message: error.message };
        }
        if (data.user) {
          const profile: UserProfile = {
            id: data.user.id,
            email: data.user.email || email,
            full_name: fullName || email.split('@')[0],
            created_at: data.user.created_at,
          };
          this.currentUser = profile;
          localStorage.setItem(STORAGE_KEYS.SESSION_USER, JSON.stringify(profile));
          this.notify();
          return { success: true, user: profile, message: 'Registro completado en Supabase Auth.' };
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, message: msg };
      }
    }

    // Simulator sign up
    if (!email || !password || !fullName) {
      return { success: false, message: 'Todos los campos son obligatorios' };
    }
    const mockProfile: UserProfile = {
      id: `usr-${Date.now().toString(36)}`,
      email,
      full_name: fullName,
      role: 'Nuevo Usuario',
      created_at: new Date().toISOString(),
    };
    this.currentUser = mockProfile;
    localStorage.setItem(STORAGE_KEYS.SESSION_USER, JSON.stringify(mockProfile));
    this.notify();
    return { success: true, user: mockProfile };
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
