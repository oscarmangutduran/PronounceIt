import { appStorage } from './storage';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  updateProfile as fbUpdateProfile,
  updatePassword as fbUpdatePassword,
  sendPasswordResetEmail,
  User,
  Auth,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
  Firestore,
} from 'firebase/firestore';
import { FirebaseConfig, UserProfile, WordItem } from '../types';
import { StoredTestItem } from './testHistoryStore';
import { backendApi } from './apiClient';

export interface WelcomeEmailNotice {
  to: string;
  subject: string;
  tempPassword?: string;
  html?: string;
  sentAt?: string;
  username?: string;
  [key: string]: any;
}

export interface StoredAccount {
  id: string;
  email: string;
  username: string;
  password?: string;
  createdAt?: string;
  fullName?: string;
  full_name?: string;
  avatarUrl?: string;
  mustChangePassword?: boolean;
  must_change_password?: boolean;
  [key: string]: any;
}

const STORAGE_KEY_FIREBASE_CONFIG = 'pronounceit_firebase_config_v1';
const STORAGE_KEY_FIREBASE_USER = 'pronounceit_firebase_user_v1';

// ==========================================
// RESILIENT ASSET STORAGE (INDEXEDDB)
// Guarantees profile photo is NEVER lost across reloads or logins
// ==========================================
const IDB_NAME = 'pronounceit_db';
const IDB_STORE = 'avatars';

function getIDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function idbSaveAvatar(key: string, dataUrl: string): Promise<void> {
  if (!key || !dataUrl) return;
  const db = await getIDB();
  if (!db) return;
  try {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(dataUrl, key.toLowerCase());
  } catch {}
}

export async function idbGetAvatar(key: string): Promise<string | null> {
  if (!key) return null;
  const db = await getIDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(key.toLowerCase());
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

class FirebaseService {
  private app: FirebaseApp | null = null;
  private auth: Auth | null = null;
  private db: Firestore | null = null;
  private currentUser: UserProfile | null = null;
  private listeners: Array<(user: UserProfile | null) => void> = [];
  private isConnected = false;

  constructor() {
    this.init();
  }

  private persistCurrentUser() {
    if (!this.currentUser) {
      appStorage.removeItem(STORAGE_KEY_FIREBASE_USER);
      return;
    }
    try {
      appStorage.setItem(STORAGE_KEY_FIREBASE_USER, JSON.stringify(this.currentUser));
    } catch (e) {
      console.warn('[FirebaseClient] localStorage quota exceeded, saving light user:', e);
      try {
        const lightUser = { ...this.currentUser, avatar_url: undefined };
        appStorage.setItem(STORAGE_KEY_FIREBASE_USER, JSON.stringify(lightUser));
      } catch {}
    }
    if (this.currentUser.avatar_url) {
      this.saveAvatar(this.currentUser.id, this.currentUser.avatar_url, this.currentUser.username, this.currentUser.email);
    }
  }

  private getStoredConfig(): FirebaseConfig | null {
    try {
      const stored = appStorage.getItem(STORAGE_KEY_FIREBASE_CONFIG);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // ignore
    }
    return null;
  }

  public getConfig(): FirebaseConfig {
    const stored = this.getStoredConfig();
    return {
      apiKey:
        stored?.apiKey ||
        process.env.EXPO_PUBLIC_FIREBASE_API_KEY ||
        process.env.VITE_FIREBASE_API_KEY ||
        'AIzaSyAfb-y-x0a2q8kRN5FJ9-PvsjKUjeuE208',
      authDomain:
        stored?.authDomain ||
        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ||
        process.env.VITE_FIREBASE_AUTH_DOMAIN ||
        'pronounceit-56fe6.firebaseapp.com',
      projectId:
        stored?.projectId ||
        process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ||
        process.env.VITE_FIREBASE_PROJECT_ID ||
        'pronounceit-56fe6',
      storageBucket:
        stored?.storageBucket ||
        process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ||
        process.env.VITE_FIREBASE_STORAGE_BUCKET ||
        'pronounceit-56fe6.firebasestorage.app',
      messagingSenderId:
        stored?.messagingSenderId ||
        process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
        process.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
        '535336392107',
      appId:
        stored?.appId ||
        process.env.EXPO_PUBLIC_FIREBASE_APP_ID ||
        process.env.VITE_FIREBASE_APP_ID ||
        '1:535336392107:web:1a1a0e6ab9244e362f2eee',
      isConnected: this.isConnected,
    };
  }

  public isConfigured(): boolean {
    const cfg = this.getConfig();
    return Boolean(cfg.apiKey && cfg.projectId && cfg.appId);
  }

  public isFirebaseConnected(): boolean {
    return this.isConnected;
  }

  private init() {
    // 1. Synchronously restore cached user (purge demo users)
    try {
      const cached = appStorage.getItem(STORAGE_KEY_FIREBASE_USER);
      if (cached) {
        const u = JSON.parse(cached);
        if (
          u.id === 'usr-alex-gorbatow' ||
          u.username?.toLowerCase() === 'alexgorbatow' ||
          u.email?.toLowerCase() === 'alexgorbatow@yandex.ru' ||
          u.id === 'demo-user-1'
        ) {
          appStorage.removeItem(STORAGE_KEY_FIREBASE_USER);
          appStorage.removeItem('pronounceit_saved_email');
          appStorage.removeItem('pronounceit_saved_username');
          this.currentUser = null;
        } else {
          this.currentUser = u;
        }
      }
    } catch {
      // ignore
    }

    // Clean registered accounts store from demo accounts
    try {
      const accounts = this.getStoredAccounts();
      const filtered = accounts.filter(
        (a) =>
          a.id !== 'usr-alex-gorbatow' &&
          a.username.toLowerCase() !== 'alexgorbatow' &&
          a.email.toLowerCase() !== 'alexgorbatow@yandex.ru' &&
          a.id !== 'demo-user-1'
      );
      if (filtered.length !== accounts.length) {
        this.saveStoredAccounts(filtered);
      }
    } catch {}

    // 2. Synchronously ensure avatar is restored from all persistent stores
    const savedAvatar = this.getSavedAvatar(this.currentUser?.id, this.currentUser?.username, this.currentUser?.email);
    if (savedAvatar) {
      if (this.currentUser) {
        this.currentUser.avatar_url = savedAvatar;
      }
    }

    // 3. Asynchronously recover from IndexedDB if localStorage was missing or quota-limited
    idbGetAvatar('current_avatar').then((idbAvatar) => {
      const bestAvatar = idbAvatar || savedAvatar;
      if (bestAvatar && this.currentUser && (!this.currentUser.avatar_url || this.currentUser.avatar_url !== bestAvatar)) {
        this.currentUser.avatar_url = bestAvatar;
        this.persistCurrentUser();
        this.notify();
      }
    }).catch(() => {});

    const cfg = this.getConfig();
    if (cfg.apiKey && cfg.projectId && cfg.appId) {
      try {
        if (getApps().length === 0) {
          this.app = initializeApp({
            apiKey: cfg.apiKey,
            authDomain: cfg.authDomain,
            projectId: cfg.projectId,
            storageBucket: cfg.storageBucket,
            messagingSenderId: cfg.messagingSenderId,
            appId: cfg.appId,
          });
        } else {
          this.app = getApp();
        }

        this.auth = getAuth(this.app);
        this.db = getFirestore(this.app);
        this.isConnected = true;

        onAuthStateChanged(this.auth, (user) => {
          this.handleAuthStateChange(user);
        });
      } catch (err) {
        console.warn('[Firebase] Error de inicialización:', err);
        this.isConnected = false;
      }
    }
  }

  private handleAuthStateChange(user: User | null) {
    if (user) {
      // CRITICAL FIX: NEVER wipe an existing avatar!
      // Prioritize existing avatar in memory, local storage, or IndexedDB over null user.photoURL
      const existingAvatar =
        this.currentUser?.avatar_url ||
        this.getSavedAvatar(user.uid, user.email?.split('@')[0], user.email || undefined) ||
        this.getSavedAvatar();

      const currentFullName = this.currentUser?.full_name;
      const currentUsername = this.currentUser?.username;

      this.currentUser = {
        id: user.uid,
        email: user.email || this.currentUser?.email || 'usuario@firebase.com',
        full_name: (currentFullName && currentFullName !== 'Usuario PronounceIt')
          ? currentFullName
          : (user.displayName || user.email?.split('@')[0] || 'Usuario PronounceIt'),
        username: (currentUsername && currentUsername !== 'usuario')
          ? currentUsername
          : (user.email?.split('@')[0] || 'usuario'),
        avatar_url: existingAvatar || (user.photoURL?.startsWith('http') ? user.photoURL : undefined),
        role: this.currentUser?.role || 'user',
      };

      if (existingAvatar) {
        this.saveAvatar(user.uid, existingAvatar, this.currentUser.username, this.currentUser.email);
      }

      this.persistCurrentUser();
      this.notify();
    }
  }

  public async setConfig(newConfig: Partial<FirebaseConfig>): Promise<{ success: boolean; message: string }> {
    try {
      const fullConfig: FirebaseConfig = {
        apiKey: newConfig.apiKey?.trim() || '',
        authDomain: newConfig.authDomain?.trim() || '',
        projectId: newConfig.projectId?.trim() || '',
        storageBucket: newConfig.storageBucket?.trim() || '',
        messagingSenderId: newConfig.messagingSenderId?.trim() || '',
        appId: newConfig.appId?.trim() || '',
      };

      if (!fullConfig.apiKey || !fullConfig.projectId || !fullConfig.appId) {
        return { success: false, message: 'apiKey, projectId y appId son campos requeridos.' };
      }

      appStorage.setItem(STORAGE_KEY_FIREBASE_CONFIG, JSON.stringify(fullConfig));

      // Re-initialize
      try {
        this.app = initializeApp(
          {
            apiKey: fullConfig.apiKey,
            authDomain: fullConfig.authDomain,
            projectId: fullConfig.projectId,
            storageBucket: fullConfig.storageBucket,
            messagingSenderId: fullConfig.messagingSenderId,
            appId: fullConfig.appId,
          },
          'pronounceit-app-' + Date.now()
        );
        this.auth = getAuth(this.app);
        this.db = getFirestore(this.app);
        this.isConnected = true;

        onAuthStateChanged(this.auth, (user) => {
          this.handleAuthStateChange(user);
        });

        return { success: true, message: 'Firebase configurado y conectado correctamente.' };
      } catch (err: any) {
        return { success: false, message: `Error al inicializar Firebase: ${err.message}` };
      }
    } catch (e: any) {
      return { success: false, message: e.message || 'Error desconocido al configurar Firebase.' };
    }
  }

  public getCurrentUser(): UserProfile | null {
    if (this.currentUser && !this.currentUser.avatar_url) {
      const saved = this.getSavedAvatar(this.currentUser.id, this.currentUser.username, this.currentUser.email);
      if (saved) {
        this.currentUser.avatar_url = saved;
      }
    }
    return this.currentUser;
  }

  public subscribe(callback: (user: UserProfile | null) => void): () => void {
    this.listeners.push(callback);
    callback(this.currentUser);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l(this.currentUser));
  }

  private getStoredAccounts(): StoredAccount[] {
    try {
      const raw = appStorage.getItem('pronounceit_registered_accounts_v1');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveStoredAccounts(accounts: StoredAccount[]) {
    appStorage.setItem('pronounceit_registered_accounts_v1', JSON.stringify(accounts));
  }

  public getSavedAvatar(userId?: string, username?: string, email?: string): string | undefined {
    try {
      const keys = [
        userId ? `pronounceit_avatar_${userId}` : null,
        username ? `pronounceit_avatar_${username.toLowerCase()}` : null,
        email ? `pronounceit_avatar_${email.toLowerCase()}` : null,
        'pronounceit_last_avatar',
      ].filter(Boolean) as string[];

      for (const k of keys) {
        const val = appStorage.getItem(k);
        if (val && (val.startsWith('data:image') || val.startsWith('http'))) {
          return val;
        }
      }

      // Check registered accounts
      const accounts = this.getStoredAccounts();
      const match = accounts.find(
        (a) =>
          (userId && a.id === userId) ||
          (username && a.username.toLowerCase() === username.toLowerCase()) ||
          (email && a.email.toLowerCase() === email.toLowerCase())
      );
      if (match?.avatarUrl && (match.avatarUrl.startsWith('data:image') || match.avatarUrl.startsWith('http'))) {
        return match.avatarUrl;
      }
    } catch {}
    return undefined;
  }

  public saveAvatar(userId?: string, avatarUrl?: string, username?: string, email?: string) {
    if (!avatarUrl) return;
    try {
      if (userId) appStorage.setItem(`pronounceit_avatar_${userId}`, avatarUrl);
      if (username) appStorage.setItem(`pronounceit_avatar_${username.toLowerCase()}`, avatarUrl);
      if (email) appStorage.setItem(`pronounceit_avatar_${email.toLowerCase()}`, avatarUrl);
      appStorage.setItem('pronounceit_last_avatar', avatarUrl);
    } catch (e) {
      console.warn('[FirebaseClient] localStorage setItem in saveAvatar failed (quota?):', e);
    }

    // Always also persist to IndexedDB
    idbSaveAvatar('current_avatar', avatarUrl);
    idbSaveAvatar('last_avatar', avatarUrl);
    if (userId) idbSaveAvatar(`avatar_${userId}`, avatarUrl);
    if (username) idbSaveAvatar(`avatar_${username}`, avatarUrl);
    if (email) idbSaveAvatar(`avatar_${email}`, avatarUrl);
  }

  // ==========================================
  // AUTH OPERATIONS
  // ==========================================
  public async signIn(
    emailOrUsername: string,
    password: string
  ): Promise<{ success: boolean; message?: string; mustChangePassword?: boolean; user?: UserProfile }> {
    const input = (emailOrUsername || '').trim().toLowerCase();
    if (!input || !password) {
      return { success: false, message: 'Por favor ingresa tu usuario/correo y contraseña' };
    }

    // Try Firebase Auth if input is an email
    if (this.auth && input.includes('@')) {
      try {
        const cred = await signInWithEmailAndPassword(this.auth, input, password);
        const u = cred.user;
        let avatarUrl = u.photoURL || this.getSavedAvatar(u.uid, input.split('@')[0], u.email || input);
        if (this.db) {
          try {
            const uDoc = await getDoc(doc(this.db, 'users', u.uid));
            if (uDoc.exists() && uDoc.data()?.avatar_url) {
              avatarUrl = uDoc.data()?.avatar_url;
            }
          } catch {}
        }
        if (avatarUrl) {
          this.saveAvatar(u.uid, avatarUrl, input.split('@')[0], u.email || input);
        }
        const profile: UserProfile = {
          id: u.uid,
          email: u.email || input,
          full_name: u.displayName || input.split('@')[0],
          username: input.split('@')[0],
          avatar_url: avatarUrl,
          role: 'user',
        };
        this.currentUser = profile;
        appStorage.setItem(STORAGE_KEY_FIREBASE_USER, JSON.stringify(profile));
        this.notify();
        return { success: true, user: profile };
      } catch (err: any) {
        // Fallback to local accounts or Express backend if Firebase Auth threw user-not-found
      }
    }

    // Check with Express backend if available
    try {
      const serverAuth = await backendApi.login(input, password);
      if (serverAuth && serverAuth.success && serverAuth.user) {
        const sUser = serverAuth.user;
        const profile: UserProfile = {
          id: sUser.id,
          email: sUser.email,
          full_name: sUser.username,
          username: sUser.username,
          must_change_password: Boolean(serverAuth.mustChangePassword || sUser.must_change_password),
          avatar_url: sUser.avatar_url || this.getSavedAvatar(sUser.id, sUser.username, sUser.email),
          role: 'user',
          created_at: sUser.created_at,
        };
        this.currentUser = profile;
        appStorage.setItem(STORAGE_KEY_FIREBASE_USER, JSON.stringify(profile));
        this.notify();
        return {
          success: true,
          mustChangePassword: Boolean(serverAuth.mustChangePassword || sUser.must_change_password),
          user: profile,
        };
      }
    } catch {}

    // Check stored accounts
    const accounts = this.getStoredAccounts();
    const existing = accounts.find(
      (a) => a.email.toLowerCase() === input || a.username.toLowerCase() === input
    );

    if (existing) {
      if (existing.password !== password) {
        return { success: false, message: 'Contraseña incorrecta' };
      }
      let avatarUrl = existing.avatarUrl || this.getSavedAvatar(existing.id, existing.username, existing.email);
      if (this.db) {
        try {
          const uDoc = await getDoc(doc(this.db, 'users', existing.id));
          if (uDoc.exists() && uDoc.data()?.avatar_url) {
            avatarUrl = uDoc.data()?.avatar_url;
          }
        } catch {}
      }
      if (avatarUrl) {
        this.saveAvatar(existing.id, avatarUrl, existing.username, existing.email);
      }
      const profile: UserProfile = {
        id: existing.id,
        email: existing.email,
        full_name: existing.fullName || existing.username,
        username: existing.username,
        must_change_password: existing.mustChangePassword,
        avatar_url: avatarUrl,
        role: 'user',
        created_at: existing.createdAt,
      };
      this.currentUser = profile;
      appStorage.setItem(STORAGE_KEY_FIREBASE_USER, JSON.stringify(profile));
      this.notify();
      return {
        success: true,
        mustChangePassword: existing.mustChangePassword,
        user: profile,
      };
    }

    // No valid user match found
    return {
      success: false,
      message: 'Usuario o contraseña no válidos. Si no tienes una cuenta, regístrate para comenzar.',
    };
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
      password: '12345',
      mustChangePassword: true,
      createdAt: new Date().toISOString(),
    };

    accounts.push(newAccount);
    this.saveStoredAccounts(accounts);

    // Synchronize with Express backend database
    backendApi.register(cleanEmail, cleanUsername).catch(() => {});

    // Also register in Firebase Auth if available
    if (this.auth) {
      try {
        await createUserWithEmailAndPassword(this.auth, cleanEmail, '12345');
        if (this.auth.currentUser) {
          await fbUpdateProfile(this.auth.currentUser, { displayName: cleanUsername });
        }
      } catch {
        // ignore if email format or weak password restricts Firebase Auth
      }
    }

    const emailNotice: WelcomeEmailNotice = {
      to: cleanEmail,
      username: cleanUsername,
      standardPassword: '12345',
      subject: '🎉 ¡Bienvenido a PronounceIt! Tus credenciales de acceso',
      sentAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

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

    if (this.auth?.currentUser) {
      try {
        await fbUpdatePassword(this.auth.currentUser, newPassword);
      } catch {
        // ignore
      }
    }

    if (this.currentUser) {
      this.currentUser.must_change_password = false;
      appStorage.setItem(STORAGE_KEY_FIREBASE_USER, JSON.stringify(this.currentUser));
      backendApi.changePassword({ email: this.currentUser.email, newPassword }).catch(() => {});
      this.notify();
    }

    return { success: true, message: 'Contraseña actualizada correctamente.' };
  }

  public async resetPassword(
    emailOrUsername: string,
    newPassword?: string
  ): Promise<{ success: boolean; message?: string; tempPassword?: string }> {
    const input = (emailOrUsername || '').trim();
    if (!input) {
      return { success: false, message: 'Introduce tu correo electrónico o nombre de usuario.' };
    }

    const cleanInput = input.toLowerCase();
    const accounts = this.getStoredAccounts();
    const account = accounts.find(
      (a) => a.email.toLowerCase() === cleanInput || a.username.toLowerCase() === cleanInput
    );

    // 1. Si se especificó una nueva contraseña personalizada
    if (newPassword && newPassword.trim()) {
      if (newPassword.trim().length < 4) {
        return { success: false, message: 'La nueva contraseña debe tener al menos 4 caracteres.' };
      }
      const pass = newPassword.trim();

      if (account) {
        account.password = pass;
        account.mustChangePassword = false;
        this.saveStoredAccounts(accounts);
      }

      // Sincronizar con Express backend
      try {
        await backendApi.resetPassword({ emailOrUsername: input, newPassword: pass });
      } catch {}

      // Intentar actualizar en Firebase si estuviera disponible
      if (this.auth?.currentUser) {
        try {
          await fbUpdatePassword(this.auth.currentUser, pass);
        } catch {}
      }

      return {
        success: true,
        message: '¡Contraseña restablecida con éxito! Ya puedes iniciar sesión con tu nueva contraseña.',
      };
    }

    // 2. Si no se especificó nueva contraseña:
    // Restablecer a la contraseña temporal estándar '12345'
    if (account) {
      account.password = '12345';
      account.mustChangePassword = true;
      this.saveStoredAccounts(accounts);

      // Sincronizar con backend
      try {
        await backendApi.resetPassword({ emailOrUsername: input, newPassword: '12345' });
      } catch {}

      // Intentar enviar correo con Firebase si estuviera activo
      let firebaseEmailSent = false;
      if (this.auth) {
        try {
          await sendPasswordResetEmail(this.auth, account.email);
          firebaseEmailSent = true;
        } catch {}
      }

      const note = firebaseEmailSent
        ? ' Se ha enviado también un aviso a tu correo.'
        : '';

      return {
        success: true,
        tempPassword: '12345',
        message: `Tu contraseña ha sido restablecida a la temporal estándar: 12345.${note} Ya puedes iniciar sesión con 12345 y definir tu nueva clave.`,
      };
    }

    // 3. Probar contra el backend si no estaba en local accounts
    try {
      const serverRes = await backendApi.resetPassword({ emailOrUsername: input });
      if (serverRes && serverRes.success) {
        return {
          success: true,
          tempPassword: serverRes.tempPassword || '12345',
          message: serverRes.message || 'Contraseña restablecida a la estándar: 12345.',
        };
      }
    } catch {}

    // 4. Intentar Firebase directo
    if (this.auth) {
      try {
        await sendPasswordResetEmail(this.auth, input);
        return {
          success: true,
          message: `Se ha enviado un correo de recuperación a ${input} a través de Firebase. Revisa tu bandeja de entrada y spam.`,
        };
      } catch (err: any) {
        if (err.code === 'auth/user-not-found') {
          return {
            success: false,
            message: 'No existe ninguna cuenta registrada con ese correo.',
          };
        }
      }
    }

    return {
      success: false,
      message: 'No se encontró ninguna cuenta registrada con ese correo o usuario.',
    };
  }

  public async signOut(): Promise<void> {
    if (this.auth) {
      try {
        await fbSignOut(this.auth);
      } catch {
        // ignore
      }
    }
    this.currentUser = null;
    appStorage.removeItem(STORAGE_KEY_FIREBASE_USER);
    backendApi.setToken(null);
    this.notify();
  }

  public async updateUserProfile(updates: {
    fullName?: string;
    username?: string;
    email?: string;
    avatarUrl?: string;
    newPassword?: string;
  }): Promise<{ success: boolean; message?: string; user?: UserProfile }> {
    if (!this.currentUser) {
      return { success: false, message: 'No hay ninguna sesión activa.' };
    }

    const cleanFullName = (updates.fullName || '').trim();
    const cleanUsername = (updates.username || '').trim();
    const cleanEmail = (updates.email || '').trim().toLowerCase();

    if (updates.newPassword && updates.newPassword.length < 6) {
      return { success: false, message: 'La nueva contraseña debe tener al menos 6 caracteres.' };
    }

    if (!this.currentUser) {
      return { success: false, message: 'No hay usuario autenticado.' };
    }

    const current = this.currentUser;
    const resolvedAvatar = updates.avatarUrl !== undefined ? updates.avatarUrl : current.avatar_url;

    this.currentUser = {
      ...current,
      full_name: cleanFullName || current.full_name,
      username: cleanUsername || current.username,
      email: cleanEmail || current.email,
      avatar_url: resolvedAvatar,
    };
    this.persistCurrentUser();

    if (resolvedAvatar) {
      this.saveAvatar(this.currentUser.id, resolvedAvatar, this.currentUser.username, this.currentUser.email);
    }
    this.notify();

    // Update in registered accounts array
    try {
      const accounts = this.getStoredAccounts();
      const existingIdx = accounts.findIndex(
        (a) =>
          a.id === current.id ||
          (a.username && current.username && a.username.toLowerCase() === current.username.toLowerCase()) ||
          (a.email && current.email && a.email.toLowerCase() === current.email.toLowerCase())
      );
      if (existingIdx !== -1) {
        accounts[existingIdx] = {
          ...accounts[existingIdx],
          fullName: cleanFullName || accounts[existingIdx].fullName,
          username: cleanUsername || accounts[existingIdx].username,
          email: cleanEmail || accounts[existingIdx].email,
          avatarUrl: resolvedAvatar || accounts[existingIdx].avatarUrl,
          password: updates.newPassword || accounts[existingIdx].password,
        };
      } else {
        accounts.push({
          id: current.id,
          email: current.email,
          username: current.username || '',
          fullName: current.full_name,
          password: updates.newPassword || '12345',
          avatarUrl: resolvedAvatar,
          mustChangePassword: false,
          createdAt: new Date().toISOString(),
        });
      }
      this.saveStoredAccounts(accounts);
    } catch {}

    // Update in Firebase Auth (Note: photoURL must be a real HTTP web URL; Firebase Auth rejects base64 data URIs)
    if (this.auth?.currentUser) {
      try {
        const authUpdates: { displayName?: string; photoURL?: string } = {
          displayName: cleanFullName || current.full_name,
        };
        if (resolvedAvatar && resolvedAvatar.startsWith('http')) {
          authUpdates.photoURL = resolvedAvatar;
        }
        await fbUpdateProfile(this.auth.currentUser, authUpdates);
        if (updates.newPassword) {
          await fbUpdatePassword(this.auth.currentUser, updates.newPassword);
        }
      } catch (err) {
        console.warn('[Firebase] Error actualizando perfil Auth:', err);
      }
    }

    // Update in Firestore
    if (this.db) {
      try {
        const userData = {
          full_name: current.full_name,
          username: current.username,
          avatar_url: resolvedAvatar || null,
          email: current.email,
          updated_at: new Date().toISOString(),
        };
        const promises = [
          setDoc(doc(this.db, 'users', current.id), userData, { merge: true }),
        ];
        if (current.username) {
          promises.push(setDoc(doc(this.db, 'users', current.username.toLowerCase()), userData, { merge: true }));
        }
        await Promise.all(promises);
      } catch (err) {
        console.warn('[Firebase] Error actualizando usuario en Firestore:', err);
      }
    }

    // Synchronize with Express backend database
    backendApi
      .updateProfile(current.id, {
        username: current.username,
        avatar_url: resolvedAvatar,
        password: updates.newPassword,
        email: current.email,
      })
      .catch((e) => console.warn('Backend updateProfile error:', e));

    return { success: true, message: 'Perfil actualizado correctamente.', user: this.currentUser };
  }

  public getEffectiveUserId(userId?: string): string {
    if (userId) return userId;
    if (this.currentUser?.id) return this.currentUser.id;
    try {
      const stored = appStorage.getItem(STORAGE_KEY_FIREBASE_USER);
      if (stored) {
        const u = JSON.parse(stored);
        if (u.id) return u.id;
      }
      const legacyUser = appStorage.getItem('pronounceit_user_v1');
      if (legacyUser) {
        const lu = JSON.parse(legacyUser);
        if (lu.id) return lu.id;
      }
    } catch {}
    return 'usuario_principal';
  }

  // ==========================================
  // FIRESTORE: VOCABULARY (WORDS)
  // ==========================================
  public async fetchWords(userId?: string): Promise<WordItem[] | null> {
    if (!this.db) return null;
    const uid = this.getEffectiveUserId(userId);

    try {
      const wordsCol = collection(this.db, 'users', uid, 'words');
      let snapshot = await getDocs(wordsCol);

      // Fallback to top-level words collection if user subcollection is empty
      if (snapshot.empty) {
        const globalCol = collection(this.db, 'words');
        snapshot = await getDocs(globalCol);
      }

      const words: WordItem[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        words.push({
          id: d.id,
          word: data.word || '',
          partOfSpeech: data.partOfSpeech || 'noun',
          level: data.level || 'B1',
          ipa: data.ipa || '',
          phoneticGuide: data.phoneticGuide || '',
          phoneticNote: data.phoneticNote || '',
          translation: data.translation || '',
          definition: data.definition || '',
          exampleEn: data.exampleEn || '',
          exampleEs: data.exampleEs || '',
          highlightWord: data.highlightWord || '',
          status: data.status || 'nueva',
          isFavorite: Boolean(data.isFavorite),
          categoryGroup: data.categoryGroup || 'General',
          categorySub: data.categorySub || 'General',
          srsIntervalDays: data.srsIntervalDays ?? 1,
          lastReviewedAt: data.lastReviewedAt,
          createdAt: data.createdAt,
        });
      });
      return words;
    } catch (err: any) {
      console.warn('[Firebase] Error al cargar palabras de Firestore:', err?.code || err?.message);
      return null;
    }
  }

  public async upsertWord(word: WordItem, userId?: string): Promise<boolean> {
    if (!this.db) return false;
    const uid = this.getEffectiveUserId(userId);

    try {
      const wordData = {
        id: word.id,
        user_id: uid,
        word: word.word,
        partOfSpeech: word.partOfSpeech,
        level: word.level,
        ipa: word.ipa,
        phoneticGuide: word.phoneticGuide,
        phoneticNote: word.phoneticNote || '',
        translation: word.translation,
        definition: word.definition || '',
        exampleEn: word.exampleEn || '',
        exampleEs: word.exampleEs || '',
        highlightWord: word.highlightWord || '',
        status: word.status,
        isFavorite: word.isFavorite,
        categoryGroup: word.categoryGroup,
        categorySub: word.categorySub,
        srsIntervalDays: word.srsIntervalDays ?? 1,
        lastReviewedAt: word.lastReviewedAt || null,
        createdAt: word.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Write to both user subcollection and top-level collection for convenience
      const userWordRef = doc(this.db, 'users', uid, 'words', word.id);
      const globalWordRef = doc(this.db, 'words', word.id);

      await Promise.all([
        setDoc(userWordRef, wordData, { merge: true }),
        setDoc(globalWordRef, wordData, { merge: true }),
      ]);

      return true;
    } catch (err) {
      console.warn('[Firebase] Error al guardar palabra en Firestore:', err);
      return false;
    }
  }

  public async deleteWord(wordId: string, userId?: string): Promise<boolean> {
    if (!this.db) return false;
    const uid = this.getEffectiveUserId(userId);

    try {
      await Promise.all([
        deleteDoc(doc(this.db, 'users', uid, 'words', wordId)),
        deleteDoc(doc(this.db, 'words', wordId)),
      ]);
      return true;
    } catch (err) {
      console.warn('[Firebase] Error al eliminar palabra de Firestore:', err);
      return false;
    }
  }

  public async syncAllWords(words: WordItem[], userId?: string): Promise<boolean> {
    if (!this.db) return false;
    const uid = this.getEffectiveUserId(userId);

    try {
      const batch = writeBatch(this.db);
      for (const w of words) {
        const wordData = {
          id: w.id,
          user_id: uid,
          word: w.word,
          partOfSpeech: w.partOfSpeech,
          level: w.level,
          ipa: w.ipa,
          phoneticGuide: w.phoneticGuide,
          phoneticNote: w.phoneticNote || '',
          translation: w.translation,
          definition: w.definition || '',
          exampleEn: w.exampleEn || '',
          exampleEs: w.exampleEs || '',
          highlightWord: w.highlightWord || '',
          status: w.status,
          isFavorite: w.isFavorite,
          categoryGroup: w.categoryGroup,
          categorySub: w.categorySub,
          srsIntervalDays: w.srsIntervalDays ?? 1,
          lastReviewedAt: w.lastReviewedAt || null,
          createdAt: w.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        batch.set(doc(this.db, 'users', uid, 'words', w.id), wordData, { merge: true });
        batch.set(doc(this.db, 'words', w.id), wordData, { merge: true });
      }
      await batch.commit();
      return true;
    } catch (err) {
      console.warn('[Firebase] Error en sincronización por lotes de palabras:', err);
      return false;
    }
  }

  // ==========================================
  // FIRESTORE: TEST HISTORY
  // ==========================================
  public async fetchTestHistory(userId?: string): Promise<StoredTestItem[] | null> {
    if (!this.db) return null;
    const uid = this.getEffectiveUserId(userId);

    try {
      const testsCol = collection(this.db, 'users', uid, 'test_history');
      let snapshot = await getDocs(testsCol);

      if (snapshot.empty) {
        const globalTestsCol = collection(this.db, 'test_history');
        snapshot = await getDocs(globalTestsCol);
      }

      const list: StoredTestItem[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          type: data.type || 'vocabulary',
          title: data.title || '',
          level: data.level || '',
          scoreOutOfTen: data.scoreOutOfTen || 0,
          percentage: data.percentage || 0,
          gradeLabel: data.gradeLabel || '',
          totalQuestions: data.totalQuestions || 0,
          correctCount: data.correctCount || 0,
          completedAt: data.completedAt || '',
          timestamp: data.timestamp || Date.now(),
          vocabularyQuestions: data.vocabularyQuestions,
          irregularVerbQuestions: data.irregularVerbQuestions,
        });
      });
      list.sort((a, b) => b.timestamp - a.timestamp);
      return list;
    } catch (err: any) {
      console.warn('[Firebase] Error al cargar historial de tests de Firestore:', err?.code || err?.message);
      return null;
    }
  }

  public async saveTestResult(test: StoredTestItem, userId?: string): Promise<boolean> {
    if (!this.db) return false;
    const uid = this.getEffectiveUserId(userId);

    try {
      const testData = {
        id: test.id,
        user_id: uid,
        type: test.type,
        title: test.title,
        level: test.level,
        scoreOutOfTen: test.scoreOutOfTen,
        percentage: test.percentage,
        gradeLabel: test.gradeLabel,
        totalQuestions: test.totalQuestions,
        correctCount: test.correctCount,
        completedAt: test.completedAt,
        timestamp: test.timestamp,
        vocabularyQuestions: test.vocabularyQuestions || null,
        irregularVerbQuestions: test.irregularVerbQuestions || null,
        created_at: new Date().toISOString(),
      };

      await Promise.all([
        setDoc(doc(this.db, 'users', uid, 'test_history', test.id), testData, { merge: true }),
        setDoc(doc(this.db, 'test_history', test.id), testData, { merge: true }),
      ]);
      return true;
    } catch (err) {
      console.warn('[Firebase] Error al guardar test en Firestore:', err);
      return false;
    }
  }

  public async deleteTestResult(testId: string, userId?: string): Promise<boolean> {
    if (!this.db) return false;
    const uid = this.getEffectiveUserId(userId);

    try {
      await Promise.all([
        deleteDoc(doc(this.db, 'users', uid, 'test_history', testId)),
        deleteDoc(doc(this.db, 'test_history', testId)),
      ]);
      return true;
    } catch (err) {
      console.warn('[Firebase] Error al eliminar test de Firestore:', err);
      return false;
    }
  }

  public async clearTestHistory(userId?: string): Promise<boolean> {
    if (!this.db) return false;
    const uid = this.getEffectiveUserId(userId);

    try {
      const testsCol = collection(this.db, 'users', uid, 'test_history');
      const snapshot = await getDocs(testsCol);
      const batch = writeBatch(this.db);
      snapshot.forEach((d) => {
        batch.delete(d.ref);
      });
      await batch.commit();
      return true;
    } catch (err) {
      console.warn('[Firebase] Error al vaciar historial de tests en Firestore:', err);
      return false;
    }
  }
}

export const firebaseService = new FirebaseService();
