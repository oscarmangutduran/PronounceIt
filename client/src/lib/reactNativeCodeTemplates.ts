export interface CodeFile {
  name: string;
  path: string;
  language: string;
  description: string;
  content: string;
}

export const REACT_NATIVE_FILES: CodeFile[] = [
  {
    name: 'App.tsx',
    path: 'App.tsx',
    language: 'typescript',
    description: 'Punto de entrada de la aplicación React Native con navegación por pestañas y stack de autenticación.',
    content: `import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Home, PlusCircle, BarChart2, User } from 'lucide-react-native';

import { supabase } from './src/lib/supabase';
import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import CreateTaskScreen from './src/screens/CreateTaskScreen';
import StatsScreen from './src/screens/StatsScreen';
import ProfileScreen from './src/screens/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#0F172A',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen 
        name="Inicio" 
        component={HomeScreen} 
        options={{
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />
        }}
      />
      <Tab.Screen 
        name="Crear" 
        component={CreateTaskScreen} 
        options={{
          tabBarIcon: ({ color, size }) => <PlusCircle size={size} color={color} />
        }}
      />
      <Tab.Screen 
        name="Métricas" 
        component={StatsScreen} 
        options={{
          tabBarIcon: ({ color, size }) => <BarChart2 size={size} color={color} />
        }}
      />
      <Tab.Screen 
        name="Perfil" 
        component={ProfileScreen} 
        options={{
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Obtener la sesión activa de Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Escuchar cambios de estado en Auth (Login, Logout, Token Refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0F172A" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session && session.user ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    height: 64,
    paddingBottom: 8,
    paddingTop: 8,
  },
});`,
  },
  {
    name: 'supabase.ts',
    path: 'src/lib/supabase.ts',
    language: 'typescript',
    description: 'Cliente de Supabase configurado para React Native / Expo con AsyncStorage y auto-refresh de tokens.',
    content: `import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

// Reemplaza con tus credenciales de Supabase
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://tu-proyecto.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'tu-anon-key-aqui';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// React Native AppState listener para mantener activa la sesión
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});`,
  },
  {
    name: 'AuthScreen.tsx',
    path: 'src/screens/AuthScreen.tsx',
    language: 'typescript',
    description: 'Pantalla nativa de autenticación en React Native: inicio de sesión, registro y validación.',
    content: `import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { Mail, Lock, User, ArrowRight } from 'lucide-react-native';

export default function AuthScreen() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleAuth() {
    if (!email || !password) {
      Alert.alert('Campos requeridos', 'Por favor ingresa tu email y contraseña.');
      return;
    }

    setLoading(true);

    if (isRegister) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });

      if (error) {
        Alert.alert('Error de registro', error.message);
      } else {
        Alert.alert('¡Bienvenido!', 'Tu cuenta ha sido creada exitosamente.');
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        Alert.alert('Error al iniciar sesión', error.message);
      }
    }

    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.brandTitle}>SUPABASE</Text>
          <Text style={styles.title}>
            {isRegister ? 'Crea tu cuenta' : 'Bienvenido de nuevo'}
          </Text>
          <Text style={styles.subtitle}>
            {isRegister
              ? 'Regístrate para sincronizar tus tareas en tiempo real'
              : 'Ingresa con tus credenciales para acceder a tus datos'}
          </Text>
        </View>

        <View style={styles.form}>
          {isRegister && (
            <View style={styles.inputContainer}>
              <User size={20} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Nombre completo"
                placeholderTextColor="#94A3B8"
                value={fullName}
                onChangeText={setFullName}
              />
            </View>
          )}

          <View style={styles.inputContainer}>
            <Mail size={20} color="#64748B" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="correo@ejemplo.com"
              placeholderTextColor="#94A3B8"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputContainer}>
            <Lock size={20} color="#64748B" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Contraseña (mínimo 6 caracteres)"
              placeholderTextColor="#94A3B8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <View style={styles.buttonContent}>
                <Text style={styles.primaryButtonText}>
                  {isRegister ? 'Registrarse' : 'Iniciar Sesión'}
                </Text>
                <ArrowRight size={18} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => setIsRegister(!isRegister)}
          >
            <Text style={styles.switchButtonText}>
              {isRegister
                ? '¿Ya tienes una cuenta? Inicia sesión'
                : '¿No tienes cuenta? Regístrate aquí'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    marginBottom: 32,
  },
  brandTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
  },
  primaryButton: {
    backgroundColor: '#0F172A',
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  switchButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  switchButtonText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '500',
  },
});`,
  },
  {
    name: 'HomeScreen.tsx',
    path: 'src/screens/HomeScreen.tsx',
    language: 'typescript',
    description: 'Pantalla principal con FlatList, sincronización con Supabase y filtros de estado.',
    content: `import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { CheckCircle2, Circle, AlertCircle, Clock } from 'lucide-react-native';

export default function HomeScreen({ navigation }: any) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'todas' | 'pendientes' | 'completadas'>('todas');

  async function fetchTasks() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setTasks(data);
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchTasks();
  }, []);

  async function toggleStatus(id: string, currentStatus: string) {
    const nextStatus = currentStatus === 'completada' ? 'pendiente' : 'completada';
    
    // Actualización optimista en React Native
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: nextStatus } : t));

    const { error } = await supabase
      .from('tasks')
      .update({ status: nextStatus })
      .eq('id', id);

    if (error) {
      // Revertir si hay error
      fetchTasks();
    }
  }

  const filteredTasks = tasks.filter(t => {
    if (filter === 'pendientes') return t.status !== 'completada';
    if (filter === 'completadas') return t.status === 'completada';
    return true;
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mis Tareas</Text>
        <Text style={styles.subtitle}>Sincronizado con Supabase PostgreSQL</Text>
      </View>

      {/* Selector de filtros */}
      <View style={styles.filterBar}>
        {(['todas', 'pendientes', 'completadas'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.filterButton, filter === tab && styles.filterButtonActive]}
            onPress={() => setFilter(tab)}
          >
            <Text style={[styles.filterText, filter === tab && styles.filterTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredTasks}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchTasks} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hay tareas registradas</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.taskCard}>
            <TouchableOpacity
              onPress={() => toggleStatus(item.id, item.status)}
              style={styles.checkButton}
            >
              {item.status === 'completada' ? (
                <CheckCircle2 size={24} color="#10B981" />
              ) : (
                <Circle size={24} color="#94A3B8" />
              )}
            </TouchableOpacity>

            <View style={styles.taskInfo}>
              <Text style={[styles.taskTitle, item.status === 'completada' && styles.taskTitleDone]}>
                {item.title}
              </Text>
              {item.description ? (
                <Text style={styles.taskDesc} numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}
              <View style={styles.metaRow}>
                <Text style={styles.categoryText}>{item.category || 'General'}</Text>
                <Text style={styles.bullet}>·</Text>
                <Text style={styles.priorityText}>Prioridad: {item.priority || 'media'}</Text>
              </View>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 12,
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  filterButtonActive: {
    backgroundColor: '#0F172A',
  },
  filterText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 12,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  checkButton: {
    marginRight: 12,
    marginTop: 2,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  taskDesc: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  categoryText: {
    fontSize: 12,
    color: '#64748B',
    textTransform: 'capitalize',
  },
  bullet: {
    fontSize: 12,
    color: '#CBD5E1',
  },
  priorityText: {
    fontSize: 12,
    color: '#64748B',
    textTransform: 'capitalize',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 14,
  },
});`,
  },
  {
    name: 'CreateTaskScreen.tsx',
    path: 'src/screens/CreateTaskScreen.tsx',
    language: 'typescript',
    description: 'Formulario en React Native para registrar nuevas tareas directamente en la tabla tasks de Supabase.',
    content: `import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase';

const CATEGORIES = ['trabajo', 'personal', 'finanzas', 'salud', 'estudio'];
const PRIORITIES = ['baja', 'media', 'alta', 'urgente'];

export default function CreateTaskScreen({ navigation }: any) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('trabajo');
  const [priority, setPriority] = useState('media');
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert('Título requerido', 'Por favor ingresa un nombre para la tarea.');
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      Alert.alert('Error', 'Debes estar autenticado para guardar.');
      setLoading(false);
      return;
    }

    const { error } = await supabase.from('tasks').insert([
      {
        user_id: user.id,
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        status: 'pendiente',
      },
    ]);

    setLoading(false);

    if (error) {
      Alert.alert('Error al guardar en Supabase', error.message);
    } else {
      Alert.alert('Guardado', 'Tarea registrada exitosamente.');
      setTitle('');
      setDescription('');
      navigation.navigate('Inicio');
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Nueva Tarea</Text>
        <Text style={styles.subtitle}>Crea un registro que se guardará en tu base de datos Supabase.</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Título</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej. Revisar informe semanal"
            placeholderTextColor="#94A3B8"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Descripción</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Detalles adicionales..."
            placeholderTextColor="#94A3B8"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Categoría</Text>
          <View style={styles.optionsRow}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.optionChip, category === cat && styles.optionChipActive]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.optionText, category === cat && styles.optionTextActive]}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Prioridad</Text>
          <View style={styles.optionsRow}>
            {PRIORITIES.map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.optionChip, priority === p && styles.optionChipActive]}
                onPress={() => setPriority(p)}
              >
                <Text style={[styles.optionText, priority === p && styles.optionTextActive]}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Guardar en Supabase</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 24,
    gap: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: -12,
    marginBottom: 8,
  },
  formGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  optionChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  optionText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  optionTextActive: {
    color: '#FFFFFF',
  },
  saveButton: {
    backgroundColor: '#059669',
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});`,
  },
  {
    name: 'schema.sql',
    path: 'supabase/schema.sql',
    language: 'sql',
    description: 'Script SQL completo para ejecutar en el Editor SQL de Supabase con Row Level Security (RLS).',
    content: `-- 1. Crear tabla de tareas con clave foránea hacia auth.users
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT DEFAULT 'trabajo',
  priority TEXT DEFAULT 'media',
  status TEXT DEFAULT 'pendiente',
  due_date DATE,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Habilitar Row Level Security (RLS) para proteger los datos
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 3. Crear políticas RLS: cada usuario sólo puede ver, crear, editar y borrar sus propios datos
DROP POLICY IF EXISTS "Los usuarios pueden ver sus propias tareas" ON public.tasks;
CREATE POLICY "Los usuarios pueden ver sus propias tareas"
  ON public.tasks
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden crear tareas asociadas a su id" ON public.tasks;
CREATE POLICY "Los usuarios pueden crear tareas asociadas a su id"
  ON public.tasks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden actualizar sus propias tareas" ON public.tasks;
CREATE POLICY "Los usuarios pueden actualizar sus propias tareas"
  ON public.tasks
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden eliminar sus propias tareas" ON public.tasks;
CREATE POLICY "Los usuarios pueden eliminar sus propias tareas"
  ON public.tasks
  FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Índice para optimizar búsquedas por usuario
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);`,
  },
  {
    name: 'package.json',
    path: 'package.json (Expo)',
    language: 'json',
    description: 'Configuración de paquetes recomendada para un proyecto Expo con Supabase.',
    content: `{
  "name": "supabase-mobile-app",
  "version": "1.0.0",
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web"
  },
  "dependencies": {
    "@react-native-async-storage/async-storage": "1.23.1",
    "@react-navigation/bottom-tabs": "^6.5.20",
    "@react-navigation/native": "^6.1.17",
    "@react-navigation/native-stack": "^6.9.26",
    "@supabase/supabase-js": "^2.45.0",
    "expo": "~51.0.0",
    "expo-status-bar": "~1.12.1",
    "lucide-react-native": "^0.395.0",
    "react": "18.2.0",
    "react-native": "0.74.1",
    "react-native-safe-area-context": "4.10.1",
    "react-native-screens": "3.31.1",
    "react-native-url-polyfill": "^2.0.0"
  },
  "devDependencies": {
    "@babel/core": "^7.20.0",
    "@types/react": "~18.2.45",
    "typescript": "~5.3.3"
  },
  "private": true
}`,
  },
];
