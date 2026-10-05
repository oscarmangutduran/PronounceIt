export type PriorityLevel = 'baja' | 'media' | 'alta' | 'urgente';
export type TaskCategory = 'trabajo' | 'personal' | 'finanzas' | 'salud' | 'estudio';
export type TaskStatus = 'pendiente' | 'en_progreso' | 'completada';

export interface TaskItem {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: TaskCategory;
  priority: PriorityLevel;
  status: TaskStatus;
  due_date: string;
  created_at: string;
  tags?: string[];
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role?: string;
  created_at?: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isCustom: boolean;
  isConnected: boolean;
  lastChecked?: string;
}

export type ActiveScreen = 'onboarding' | 'auth' | 'home' | 'stats' | 'profile';
