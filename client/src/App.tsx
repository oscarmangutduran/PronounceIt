import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Code2,
  Database,
  Moon,
  Sun,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Sliders,
  CheckCircle2,
  Layers,
  ArrowRight,
  LogOut,
} from 'lucide-react';

import { TaskItem, ActiveScreen, TaskStatus } from './types';
import { supabaseService } from './lib/supabaseClient';

// Auth Gatekeeper
import { LoginView } from './components/auth/LoginView';

// Mobile Simulator Components
import { DeviceFrame } from './components/mobile/DeviceFrame';
import { BottomTabBar } from './components/mobile/BottomTabBar';
import { OnboardingView } from './components/mobile/screens/OnboardingView';
import { AuthView } from './components/mobile/screens/AuthView';
import { HomeView } from './components/mobile/screens/HomeView';
import { StatsView } from './components/mobile/screens/StatsView';
import { ProfileView } from './components/mobile/screens/ProfileView';
import { CreateTaskModal } from './components/mobile/screens/CreateTaskModal';
import { TaskDetailModal } from './components/mobile/screens/TaskDetailModal';

// Code & Config Components
import { CodeExporterPanel } from './components/code-export/CodeExporterPanel';
import { SupabaseConfigModal } from './components/supabase/SupabaseConfigModal';

export default function App() {
  // Always start unauthenticated on app launch so login is always shown
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [supabaseConfig, setSupabaseConfig] = useState(supabaseService.getConfig());

  // Mobile app state
  const [currentScreen, setCurrentScreen] = useState<ActiveScreen>('home');
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Phone simulator configuration
  const [phoneDarkMode, setPhoneDarkMode] = useState(false);
  const [deviceModel, setDeviceModel] = useState<'iphone' | 'android'>('iphone');

  // Desktop view layout mode: 'split' (Simulator + Code side-by-side) or 'phone-only' or 'code-only'
  const [viewMode, setViewMode] = useState<'split' | 'phone-only' | 'code-only'>('split');

  // Supabase connection modal
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);

  // Load tasks
  const loadTasks = async () => {
    setLoadingTasks(true);
    const data = await supabaseService.fetchTasks();
    setTasks(data);
    setLoadingTasks(false);
  };

  useEffect(() => {
    loadTasks();

    const unsubscribe = supabaseService.subscribe(() => {
      setCurrentUser(supabaseService.getCurrentUser());
      setSupabaseConfig(supabaseService.getConfig());
      loadTasks();
    });

    return () => unsubscribe();
  }, []);

  // Screen routing handlers
  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus: TaskStatus = currentStatus === 'completada' ? 'pendiente' : 'completada';
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: nextStatus } : t))
    );
    await supabaseService.updateTask(id, { status: nextStatus });
  };

  const handleCreateTask = async (
    newTask: Omit<TaskItem, 'id' | 'created_at' | 'user_id'>
  ) => {
    await supabaseService.createTask(newTask);
    await loadTasks();
  };

  const handleUpdateTaskStatus = async (id: string, newStatus: TaskStatus) => {
    await supabaseService.updateTask(id, { status: newStatus });
    if (selectedTask && selectedTask.id === id) {
      setSelectedTask({ ...selectedTask, status: newStatus });
    }
    await loadTasks();
  };

  const handleDeleteTask = async (id: string) => {
    await supabaseService.deleteTask(id);
    if (selectedTask && selectedTask.id === id) {
      setSelectedTask(null);
    }
    await loadTasks();
  };

  const handleResetData = () => {
    supabaseService.resetDemoData();
    loadTasks();
  };

  const handleLogout = async () => {
    await supabaseService.signOut();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setCurrentScreen('home');
  };

  const pendingCount = tasks.filter((t) => t.status !== 'completada').length;

  // Gatekeeper: El usuario SIEMPRE inicia en la pantalla de Login
  if (!isAuthenticated || !currentUser) {
    return (
      <LoginView
        onSuccess={() => {
          setIsAuthenticated(true);
          setCurrentUser(supabaseService.getCurrentUser());
          setCurrentScreen('home');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      {/* Top Bar Contract: Zone 1 (Wordmark) - Zone 2 (Nav links) - Zone 3 (Primary Actions) */}
      <header className="flex items-center justify-between px-6 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-30 shrink-0">
        {/* Zone 1: Single text element wordmark */}
        <a href="/" className="text-base font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <span>PronounceIt</span>
        </a>

        {/* Zone 2: Nav links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-600 dark:text-slate-400">
          <button
            type="button"
            onClick={() => setViewMode('split')}
            className={`transition-colors hover:text-slate-900 dark:hover:text-white ${
              viewMode === 'split' ? 'text-slate-900 dark:text-white font-semibold' : ''
            }`}
          >
            Vista Dual (App + Código)
          </button>
          <button
            type="button"
            onClick={() => setViewMode('phone-only')}
            className={`transition-colors hover:text-slate-900 dark:hover:text-white ${
              viewMode === 'phone-only' ? 'text-slate-900 dark:text-white font-semibold' : ''
            }`}
          >
            Simulador Móvil
          </button>
          <button
            type="button"
            onClick={() => setViewMode('code-only')}
            className={`transition-colors hover:text-slate-900 dark:hover:text-white ${
              viewMode === 'code-only' ? 'text-slate-900 dark:text-white font-semibold' : ''
            }`}
          >
            Código React Native
          </button>
          <button
            type="button"
            onClick={() => setIsSupabaseModalOpen(true)}
            className="transition-colors hover:text-slate-900 dark:hover:text-white"
          >
            Esquema SQL & RLS
          </button>
        </nav>

        {/* Zone 3: Primary Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsSupabaseModalOpen(true)}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-xs transition-colors whitespace-nowrap cursor-pointer"
          >
            <Database size={13} />
            <span>{supabaseConfig.isCustom ? 'Supabase Conectado' : 'Conectar Supabase'}</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 font-medium">
              {currentUser?.email}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              title="Cerrar sesión"
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut size={13} />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT / CENTER: Mobile Phone Simulator */}
        {(viewMode === 'split' || viewMode === 'phone-only') && (
          <div
            className={`flex-1 flex flex-col items-center justify-center p-4 lg:p-6 overflow-y-auto ${
              viewMode === 'split' ? 'w-full lg:w-1/2 xl:w-5/12' : 'w-full'
            }`}
          >
            {/* Phone Simulator Toolbar */}
            <div className="w-full max-w-[400px] mb-3 flex items-center justify-between px-2 text-xs">
              {/* Screen Quick Selector */}
              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                <button
                  type="button"
                  onClick={() => {
                    if (currentUser) {
                      setCurrentScreen('home');
                    } else {
                      setCurrentScreen('auth');
                    }
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                    currentScreen === 'home'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  App
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentScreen('auth')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                    currentScreen === 'auth'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Auth
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentScreen('onboarding')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                    currentScreen === 'onboarding'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Intro
                </button>
              </div>

              {/* Theme & Reset Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPhoneDarkMode(!phoneDarkMode)}
                  title={phoneDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                  className="w-7 h-7 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900"
                >
                  {phoneDarkMode ? <Sun size={13} /> : <Moon size={13} />}
                </button>

                <button
                  type="button"
                  onClick={handleResetData}
                  title="Restablecer datos de prueba"
                  className="w-7 h-7 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900"
                >
                  <RotateCcw size={13} />
                </button>
              </div>
            </div>

            {/* Mobile Device Frame */}
            <DeviceFrame isDarkMode={phoneDarkMode} deviceType={deviceModel}>
              {/* Screen Content Switcher */}
              <div className="flex-1 flex flex-col overflow-hidden relative">
                {currentScreen === 'onboarding' && (
                  <OnboardingView
                    onStart={() => setCurrentScreen(currentUser ? 'home' : 'auth')}
                    onLogin={() => setCurrentScreen('auth')}
                  />
                )}

                {currentScreen === 'auth' && (
                  <AuthView
                    onSuccess={() => {
                      setCurrentUser(supabaseService.getCurrentUser());
                      setCurrentScreen('home');
                    }}
                    onOpenSettings={() => setIsSupabaseModalOpen(true)}
                  />
                )}

                {currentScreen === 'home' && (
                  <HomeView
                    tasks={tasks}
                    loading={loadingTasks}
                    onRefresh={loadTasks}
                    onSelectTask={(task) => setSelectedTask(task)}
                    onOpenCreate={() => setIsCreateOpen(true)}
                    onToggleStatus={handleToggleStatus}
                    onDeleteTask={handleDeleteTask}
                  />
                )}

                {currentScreen === 'stats' && <StatsView tasks={tasks} />}

                {currentScreen === 'profile' && (
                  <ProfileView
                    onLogout={handleLogout}
                    onOpenSettings={() => setIsSupabaseModalOpen(true)}
                    onResetData={handleResetData}
                  />
                )}

                {/* Modals inside phone canvas */}
                <CreateTaskModal
                  isOpen={isCreateOpen}
                  onClose={() => setIsCreateOpen(false)}
                  onSave={handleCreateTask}
                />

                <TaskDetailModal
                  task={selectedTask}
                  isOpen={Boolean(selectedTask)}
                  onClose={() => setSelectedTask(null)}
                  onUpdateStatus={handleUpdateTaskStatus}
                  onDelete={handleDeleteTask}
                />
              </div>

              {/* Bottom Tab Bar (shown when user is in main app tabs) */}
              {currentScreen !== 'onboarding' && currentScreen !== 'auth' && (
                <BottomTabBar
                  currentScreen={currentScreen}
                  onNavigate={(screen) => setCurrentScreen(screen)}
                  pendingCount={pendingCount}
                />
              )}
            </DeviceFrame>
          </div>
        )}

        {/* RIGHT: React Native Code Exporter & Supabase Tooling Panel */}
        {(viewMode === 'split' || viewMode === 'code-only') && (
          <div
            className={`flex-1 flex flex-col h-full overflow-hidden ${
              viewMode === 'split' ? 'hidden lg:flex w-full lg:w-1/2 xl:w-7/12' : 'w-full'
            }`}
          >
            <CodeExporterPanel />
          </div>
        )}
      </div>

      {/* Supabase Connection & SQL Schema Modal */}
      <SupabaseConfigModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onConfigSaved={() => loadTasks()}
      />
    </div>
  );
}
