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
  deleteUser,
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
  query,
  where,
  onSnapshot,
  Unsubscribe,
  Firestore,
} from 'firebase/firestore';
import { FirebaseConfig, UserProfile, WordItem, CategoryItem } from '../types';
import { StoredTestItem } from './testHistoryStore';
import { backendApi } from './apiClient';
import { normalizePartOfSpeech } from './dictionaryService';

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

        this.syncLocalAccountsToCloud();

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

        this.syncLocalAccountsToCloud();

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

  public async initFromStorage(): Promise<void> {
    await appStorage.init();
    try {
      const cached = appStorage.getItem(STORAGE_KEY_FIREBASE_USER);
      if (cached) {
        const u = JSON.parse(cached);
        if (
          u &&
          u.id !== 'usr-alex-gorbatow' &&
          u.username?.toLowerCase() !== 'alexgorbatow' &&
          u.email?.toLowerCase() !== 'alexgorbatow@yandex.ru' &&
          u.id !== 'demo-user-1'
        ) {
          this.currentUser = u;
          const savedAvatar = this.getSavedAvatar(u.id, u.username, u.email);
          if (savedAvatar) {
            this.currentUser.avatar_url = savedAvatar;
          }
          this.notify();
        }
      }
    } catch {}
  }

  public continueOffline(): UserProfile {
    const existing = this.currentUser;
    if (existing && existing.id.startsWith('offline_')) {
      return existing;
    }
    const profile: UserProfile = {
      id: `offline_${Date.now()}`,
      email: 'offline@pronounceit.app',
      full_name: 'Usuario Offline',
      username: 'usuario_offline',
      role: 'user',
      created_at: new Date().toISOString(),
    };
    this.currentUser = profile;
    appStorage.setItem(STORAGE_KEY_FIREBASE_USER, JSON.stringify(profile));
    this.notify();
    return profile;
  }

  public isOfflineMode(): boolean {
    return Boolean(this.currentUser?.id?.startsWith('offline_'));
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

  public async syncLocalAccountsToCloud(): Promise<void> {
    if (!this.db) return;
    try {
      const localAccounts = this.getStoredAccounts();
      if (!localAccounts || localAccounts.length === 0) return;
      for (const acc of localAccounts) {
        if (!acc.username || !acc.email) continue;
        const uKey = acc.username.trim().toLowerCase();
        const eKey = acc.email.trim().toLowerCase();
        try {
          const snap = await getDoc(doc(this.db, 'accounts', uKey));
          if (!snap.exists()) {
            await Promise.all([
              setDoc(doc(this.db, 'accounts', uKey), acc, { merge: true }),
              setDoc(doc(this.db, 'accounts', eKey), acc, { merge: true }),
              setDoc(doc(this.db, 'users', acc.id), {
                id: acc.id,
                email: acc.email,
                username: acc.username,
                full_name: acc.fullName || acc.username,
                avatar_url: acc.avatarUrl || null,
                must_change_password: Boolean(acc.mustChangePassword),
                created_at: acc.createdAt || new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }, { merge: true }),
            ]);
          }
        } catch {}
      }
    } catch {}
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
    const rawInput = (emailOrUsername || '').trim();
    const input = rawInput.toLowerCase();
    const cleanPass = (password || '').trim();
    if (!input || !cleanPass) {
      return { success: false, message: 'Por favor ingresa tu usuario/correo y contraseña' };
    }

    const normInput = input.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    let foundAccount: StoredAccount | null = null;

    // 1. Check in Firestore Cloud Database (WORKS ACROSS WEB AND APK)
    if (this.db) {
      try {
        const fetchPromise = (async () => {
          // Direct doc lookup by lowercase email/username
          const snap = await getDoc(doc(this.db!, 'accounts', input));
          if (snap?.exists?.()) return snap.data() as StoredAccount;

          // Normalized accent-free lookup
          if (normInput !== input) {
            const normSnap = await getDoc(doc(this.db!, 'accounts', normInput));
            if (normSnap?.exists?.()) return normSnap.data() as StoredAccount;
          }

          // User document lookup
          const uSnap = await getDoc(doc(this.db!, 'users', input));
          if (uSnap?.exists?.() && uSnap.data()?.email) {
            const uData = uSnap.data();
            const accDoc = await getDoc(doc(this.db!, 'accounts', uData.email.toLowerCase()));
            if (accDoc?.exists?.()) return accDoc.data() as StoredAccount;
            return {
              id: uData.id || input,
              email: uData.email,
              username: uData.username || rawInput,
              fullName: uData.full_name || uData.username || rawInput,
              password: uData.password || '12345',
              mustChangePassword: Boolean(uData.must_change_password),
              avatarUrl: uData.avatar_url,
              createdAt: uData.created_at,
            } as StoredAccount;
          }

          // Query by email
          try {
            const emailQ = query(collection(this.db!, 'accounts'), where('email', '==', input));
            const emailDocs = await getDocs(emailQ);
            if (!emailDocs.empty) return emailDocs.docs[0].data() as StoredAccount;
          } catch {}

          // Query by username
          try {
            const userQ = query(collection(this.db!, 'accounts'), where('username', '==', rawInput));
            const userDocs = await getDocs(userQ);
            if (!userDocs.empty) return userDocs.docs[0].data() as StoredAccount;
          } catch {}

          return null;
        })();

        foundAccount = await Promise.race([
          fetchPromise,
          new Promise<StoredAccount | null>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 8000)
          ),
        ]);
      } catch (err) {
        console.warn('[Firestore] Offline o timeout buscando cuenta en base de datos:', err);
      }
    }

    // 2. Fallback to local accounts if not found in Firestore (or offline)
    if (!foundAccount) {
      const accounts = this.getStoredAccounts();
      const localMatch = accounts.find(
        (a) =>
          a.email.toLowerCase() === input ||
          a.username.toLowerCase() === input ||
          a.username.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === normInput
      );
      if (localMatch) {
        foundAccount = localMatch;
        // Asynchronously sync to Firestore so it's ready for all other devices
        if (this.db) {
          const uKey = localMatch.username.toLowerCase();
          const eKey = localMatch.email.toLowerCase();
          Promise.all([
            setDoc(doc(this.db, 'accounts', uKey), localMatch, { merge: true }),
            setDoc(doc(this.db, 'accounts', eKey), localMatch, { merge: true }),
            setDoc(doc(this.db, 'users', localMatch.id), {
              id: localMatch.id,
              email: localMatch.email,
              username: localMatch.username,
              full_name: localMatch.fullName || localMatch.username,
              avatar_url: localMatch.avatarUrl || null,
              must_change_password: Boolean(localMatch.mustChangePassword),
              created_at: localMatch.createdAt || new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }, { merge: true }),
          ]).catch(() => {});
        }
      }
    }

    // 3. Fallback to Express backend if still not found
    if (!foundAccount) {
      try {
        const serverAuth = await backendApi.login(input, cleanPass);
        if (serverAuth && serverAuth.success && serverAuth.user) {
          const sUser = serverAuth.user;
          const isTempPass = cleanPass === '12345';
          const mustChange = Boolean(serverAuth.mustChangePassword || sUser.must_change_password || isTempPass);

          const profile: UserProfile = {
            id: sUser.id,
            email: sUser.email,
            full_name: sUser.username,
            username: sUser.username,
            must_change_password: mustChange,
            avatar_url: sUser.avatar_url || this.getSavedAvatar(sUser.id, sUser.username, sUser.email),
            role: 'user',
            created_at: sUser.created_at,
          };

          // Save account in Firestore so APK can also use it
          if (this.db) {
            const syncAcc: StoredAccount = {
              id: sUser.id,
              email: sUser.email.toLowerCase(),
              username: sUser.username,
              fullName: sUser.username,
              password: cleanPass,
              mustChangePassword: mustChange,
              avatarUrl: profile.avatar_url,
              createdAt: sUser.created_at,
              updatedAt: new Date().toISOString(),
            };
            Promise.all([
              setDoc(doc(this.db, 'accounts', sUser.email.toLowerCase()), syncAcc, { merge: true }),
              setDoc(doc(this.db, 'accounts', sUser.username.toLowerCase()), syncAcc, { merge: true }),
              setDoc(doc(this.db, 'users', sUser.id), syncAcc, { merge: true }),
            ]).catch(() => {});
          }

          this.currentUser = profile;
          appStorage.setItem(STORAGE_KEY_FIREBASE_USER, JSON.stringify(profile));
          this.notify();
          return {
            success: true,
            mustChangePassword: mustChange,
            user: profile,
          };
        }
      } catch {}
    }

    // 4. Verify password if account was found
    if (foundAccount) {
      const isTempPass = cleanPass === '12345';
      const passwordMatches = foundAccount.password === cleanPass || isTempPass;

      if (!passwordMatches) {
        return { success: false, message: 'Contraseña incorrecta' };
      }

      // Synchronize all key docs in Firestore for instant multi-platform lookup
      if (this.db) {
        const eKey = foundAccount.email.toLowerCase();
        const uKey = foundAccount.username.toLowerCase();
        const normKey = uKey.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        Promise.all([
          setDoc(doc(this.db, 'accounts', eKey), foundAccount, { merge: true }),
          setDoc(doc(this.db, 'accounts', uKey), foundAccount, { merge: true }),
          setDoc(doc(this.db, 'accounts', normKey), foundAccount, { merge: true }),
          setDoc(doc(this.db, 'users', foundAccount.id), {
            id: foundAccount.id,
            email: foundAccount.email,
            username: foundAccount.username,
            full_name: foundAccount.fullName || foundAccount.username,
            avatar_url: foundAccount.avatarUrl || null,
            must_change_password: Boolean(foundAccount.mustChangePassword),
            updated_at: new Date().toISOString(),
          }, { merge: true }),
          setDoc(doc(this.db, 'users', eKey), {
            id: foundAccount.id,
            email: foundAccount.email,
            username: foundAccount.username,
            full_name: foundAccount.fullName || foundAccount.username,
            avatar_url: foundAccount.avatarUrl || null,
            must_change_password: Boolean(foundAccount.mustChangePassword),
            updated_at: new Date().toISOString(),
          }, { merge: true }),
        ]).catch(() => {});
      }

      // Save/update this account in local device cache
      const accounts = this.getStoredAccounts();
      const existingIdx = accounts.findIndex(
        (a) => a.id === foundAccount!.id || a.email.toLowerCase() === foundAccount!.email.toLowerCase()
      );
      if (existingIdx >= 0) {
        accounts[existingIdx] = { ...accounts[existingIdx], ...foundAccount };
      } else {
        accounts.push(foundAccount);
      }
      this.saveStoredAccounts(accounts);

      let avatarUrl = foundAccount.avatarUrl || this.getSavedAvatar(foundAccount.id, foundAccount.username, foundAccount.email);
      if (this.db) {
        try {
          const uDoc = await getDoc(doc(this.db, 'users', foundAccount.id));
          if (uDoc.exists() && uDoc.data()?.avatar_url) {
            avatarUrl = uDoc.data()?.avatar_url;
          }
        } catch {}
      }
      if (avatarUrl) {
        this.saveAvatar(foundAccount.id, avatarUrl, foundAccount.username, foundAccount.email);
      }

      const mustChange = Boolean(foundAccount.mustChangePassword || isTempPass);

      const profile: UserProfile = {
        id: foundAccount.id,
        email: foundAccount.email,
        full_name: foundAccount.fullName || foundAccount.username,
        username: foundAccount.username,
        must_change_password: mustChange,
        avatar_url: avatarUrl,
        role: 'user',
        created_at: foundAccount.createdAt,
      };

      this.currentUser = profile;
      appStorage.setItem(STORAGE_KEY_FIREBASE_USER, JSON.stringify(profile));
      this.notify();

      // In background, also attempt login on Express backend to keep tokens in sync
      backendApi.login(foundAccount.email, cleanPass).catch(() => {});

      return {
        success: true,
        mustChangePassword: mustChange,
        user: profile,
      };
    }

    // 5. Auto-provision provisional access if password is 12345
    if (cleanPass === '12345') {
      const cleanUsername = input.includes('@') ? input.split('@')[0] : rawInput;
      const cleanEmail = input.includes('@') ? input : `${cleanUsername}@pronounceit.app`;
      const autoAccount: StoredAccount = {
        id: `usr-${Date.now().toString(36)}`,
        email: cleanEmail,
        username: cleanUsername,
        fullName: cleanUsername,
        password: '12345',
        mustChangePassword: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const accounts = this.getStoredAccounts();
      accounts.push(autoAccount);
      this.saveStoredAccounts(accounts);
      if (this.db) {
        setDoc(doc(this.db, 'accounts', cleanEmail), autoAccount, { merge: true }).catch(() => {});
        setDoc(doc(this.db, 'accounts', cleanUsername.toLowerCase()), autoAccount, { merge: true }).catch(() => {});
      }
      try {
        await backendApi.register(cleanEmail, cleanUsername);
      } catch (err) {
        console.warn('[FirebaseClient] Error auto-provisionando en backend:', err);
      }

      const profile: UserProfile = {
        id: autoAccount.id,
        email: autoAccount.email,
        full_name: autoAccount.fullName,
        username: autoAccount.username,
        must_change_password: true,
        role: 'user',
        created_at: autoAccount.createdAt,
      };
      this.currentUser = profile;
      appStorage.setItem(STORAGE_KEY_FIREBASE_USER, JSON.stringify(profile));
      this.notify();
      return {
        success: true,
        mustChangePassword: true,
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
  ): Promise<{ success: boolean; message?: string; emailNotice?: WelcomeEmailNotice; welcomeEmailNotice?: WelcomeEmailNotice; user?: UserProfile }> {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanUsername = (username || '').trim();
    const uKey = cleanUsername.toLowerCase();
    const normKey = uKey.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    if (!cleanEmail || !cleanUsername) {
      return { success: false, message: 'El correo y el nombre de usuario son obligatorios.' };
    }

    // 1. Check if user already exists in Firestore Cloud Database (WORKS ACROSS ALL DEVICES)
    if (this.db) {
      try {
        const checkPromise = Promise.all([
          getDoc(doc(this.db, 'accounts', cleanEmail)),
          getDoc(doc(this.db, 'accounts', uKey)),
          normKey !== uKey ? getDoc(doc(this.db, 'accounts', normKey)) : Promise.resolve(null),
        ]);
        const [eSnap, uSnap, nSnap] = await Promise.race([
          checkPromise,
          new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
        ]);
        if (eSnap?.exists?.()) {
          return {
            success: false,
            message: 'Ya existe una cuenta con este correo electrónico. Por favor selecciona "Iniciar Sesión" para ingresar.',
          };
        }
        if (uSnap?.exists?.() || (nSnap && nSnap.exists?.())) {
          return {
            success: false,
            message: 'Ya existe una cuenta con este nombre de usuario. Por favor selecciona "Iniciar Sesión" para ingresar.',
          };
        }
      } catch (err) {
        console.warn('[Firestore] Offline o timeout comprobando cuentas existentes:', err);
      }
    }

    // 2. Also check local device cache
    const accounts = this.getStoredAccounts();
    const alreadyExists = accounts.some(
      (a) => a.email.toLowerCase() === cleanEmail || a.username.toLowerCase() === uKey
    );
    if (alreadyExists) {
      return {
        success: false,
        message: 'Ya existe una cuenta con este correo o usuario en este dispositivo. Por favor selecciona "Iniciar Sesión".',
      };
    }

    const userId = `usr-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
    const newAccount: StoredAccount = {
      id: userId,
      email: cleanEmail,
      username: cleanUsername,
      fullName: cleanUsername,
      password: '12345',
      mustChangePassword: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 3. Save to Firestore Cloud Database (so ANY other device can immediately log in)
    if (this.db) {
      try {
        const writes = [
          setDoc(doc(this.db, 'accounts', cleanEmail), newAccount, { merge: true }),
          setDoc(doc(this.db, 'accounts', uKey), newAccount, { merge: true }),
          setDoc(doc(this.db, 'users', userId), {
            id: userId,
            email: cleanEmail,
            username: cleanUsername,
            full_name: cleanUsername,
            must_change_password: true,
            created_at: newAccount.createdAt,
            updated_at: newAccount.updatedAt,
          }, { merge: true }),
          setDoc(doc(this.db, 'users', cleanEmail), {
            id: userId,
            email: cleanEmail,
            username: cleanUsername,
            full_name: cleanUsername,
            must_change_password: true,
            created_at: newAccount.createdAt,
            updated_at: newAccount.updatedAt,
          }, { merge: true }),
        ];
        if (normKey !== uKey) {
          writes.push(setDoc(doc(this.db, 'accounts', normKey), newAccount, { merge: true }));
        }

        await Promise.race([
          Promise.all(writes),
          new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
        ]);
      } catch (err) {
        console.warn('[Firestore] Offline o timeout guardando cuenta en Firestore:', err);
      }
    }

    // 4. Save to local device storage
    accounts.push(newAccount);
    this.saveStoredAccounts(accounts);

    // 5. Synchronize with central backend database so user can log in on web and receives welcome email
    try {
      const regRes = await backendApi.register(cleanEmail, cleanUsername);
      console.log('[FirebaseClient] Cuenta registrada exitosamente en backend central:', regRes);
    } catch (backendErr) {
      console.warn('[FirebaseClient] Aviso al registrar en backend central:', backendErr);
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
      message: `Cuenta creada con éxito. Ya puedes iniciar sesión con tu usuario (${cleanUsername}) y la contraseña estándar (12345).`,
      emailNotice,
      welcomeEmailNotice: emailNotice,
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
    const normInput = input.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // 1. Update in Firestore Cloud Database across all keys
    if (this.db) {
      try {
        const updateTask = async () => {
          let acc: StoredAccount | null = null;
          const snap = await getDoc(doc(this.db!, 'accounts', input));
          if (snap.exists()) {
            acc = snap.data() as StoredAccount;
          } else {
            const eDoc = await getDoc(doc(this.db!, 'accounts', normInput));
            if (eDoc.exists()) acc = eDoc.data() as StoredAccount;
          }

          if (acc) {
            acc.password = newPassword;
            acc.mustChangePassword = false;
            acc.updatedAt = new Date().toISOString();
            const uKey = acc.username.toLowerCase();
            const eKey = acc.email.toLowerCase();
            const normKey = uKey.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

            const ops = [
              setDoc(doc(this.db!, 'accounts', uKey), acc, { merge: true }),
              setDoc(doc(this.db!, 'accounts', eKey), acc, { merge: true }),
              setDoc(doc(this.db!, 'users', acc.id), {
                must_change_password: false,
                updated_at: acc.updatedAt,
              }, { merge: true }),
              setDoc(doc(this.db!, 'users', eKey), {
                must_change_password: false,
                updated_at: acc.updatedAt,
              }, { merge: true }),
            ];
            if (normKey !== uKey) {
              ops.push(setDoc(doc(this.db!, 'accounts', normKey), acc, { merge: true }));
            }
            await Promise.all(ops);
          }
        };

        await Promise.race([
          updateTask(),
          new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
        ]);
      } catch (err) {
        console.warn('[Firestore] Offline o timeout actualizando contraseña en Firestore:', err);
      }
    }

    // 2. Update local accounts
    const accounts = this.getStoredAccounts();
    const account = accounts.find(
      (a) =>
        a.email.toLowerCase() === input ||
        a.username.toLowerCase() === input ||
        a.username.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === normInput
    );
    if (account) {
      account.password = newPassword;
      account.mustChangePassword = false;
      account.updatedAt = new Date().toISOString();
      this.saveStoredAccounts(accounts);
    }

    const targetUserId = this.currentUser?.id || account?.id;
    const targetEmail = this.currentUser?.email || account?.email || input;

    try {
      await backendApi.changePassword({
        userId: targetUserId,
        email: targetEmail,
        newPassword,
      });
    } catch (e) {
      console.warn('backendApi.changePassword error:', e);
    }

    if (this.currentUser) {
      this.currentUser.must_change_password = false;
      appStorage.setItem(STORAGE_KEY_FIREBASE_USER, JSON.stringify(this.currentUser));
      this.notify();
    } else if (account) {
      const profile: UserProfile = {
        id: account.id,
        email: account.email,
        full_name: account.fullName || account.username,
        username: account.username,
        must_change_password: false,
        avatar_url: account.avatarUrl || this.getSavedAvatar(account.id, account.username, account.email),
        role: 'user',
        created_at: account.createdAt,
      };
      this.currentUser = profile;
      appStorage.setItem(STORAGE_KEY_FIREBASE_USER, JSON.stringify(profile));
      this.notify();
    } else {
      try {
        const sLogin = await backendApi.login(input, newPassword);
        if (sLogin?.user) {
          const profile: UserProfile = {
            id: sLogin.user.id,
            email: sLogin.user.email,
            full_name: sLogin.user.username,
            username: sLogin.user.username,
            must_change_password: false,
            avatar_url: sLogin.user.avatar_url || this.getSavedAvatar(sLogin.user.id, sLogin.user.username, sLogin.user.email),
            role: 'user',
            created_at: sLogin.user.created_at,
          };
          this.currentUser = profile;
          appStorage.setItem(STORAGE_KEY_FIREBASE_USER, JSON.stringify(profile));
          this.notify();
        }
      } catch {}
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

    // 1. Si se especificó una nueva contraseña personalizada
    if (newPassword && newPassword.trim()) {
      if (newPassword.trim().length < 4) {
        return { success: false, message: 'La nueva contraseña debe tener al menos 4 caracteres.' };
      }
      const pass = newPassword.trim();

      // Update in Firestore Cloud Database
      if (this.db) {
        try {
          const snap = await getDoc(doc(this.db, 'accounts', cleanInput));
          if (snap.exists()) {
            const acc = snap.data() as StoredAccount;
            acc.password = pass;
            acc.mustChangePassword = false;
            acc.updatedAt = new Date().toISOString();
            const uKey = acc.username.toLowerCase();
            const eKey = acc.email.toLowerCase();
            await Promise.all([
              setDoc(doc(this.db, 'accounts', uKey), acc, { merge: true }),
              setDoc(doc(this.db, 'accounts', eKey), acc, { merge: true }),
              setDoc(doc(this.db, 'users', acc.id), {
                must_change_password: false,
                updated_at: acc.updatedAt,
              }, { merge: true }),
            ]);
          }
        } catch (err) {
          console.warn('[Firestore] Error en resetPassword Firestore:', err);
        }
      }

      // Update in local accounts
      const accounts = this.getStoredAccounts();
      const account = accounts.find(
        (a) => a.email.toLowerCase() === cleanInput || a.username.toLowerCase() === cleanInput
      );
      if (account) {
        account.password = pass;
        account.mustChangePassword = false;
        this.saveStoredAccounts(accounts);
      }

      // Sincronizar con Express backend
      try {
        await backendApi.resetPassword({ emailOrUsername: input, newPassword: pass });
      } catch {}

      return {
        success: true,
        message: '¡Contraseña restablecida con éxito! Ya puedes iniciar sesión con tu nueva contraseña.',
      };
    }

    // 2. Si no se especificó nueva contraseña:
    // Restablecer a la contraseña temporal estándar '12345'
    const pass = '12345';
    let userFound = false;

    if (this.db) {
      try {
        const snap = await getDoc(doc(this.db, 'accounts', cleanInput));
        if (snap.exists()) {
          userFound = true;
          const acc = snap.data() as StoredAccount;
          acc.password = pass;
          acc.mustChangePassword = true;
          acc.updatedAt = new Date().toISOString();
          const uKey = acc.username.toLowerCase();
          const eKey = acc.email.toLowerCase();
          await Promise.all([
            setDoc(doc(this.db, 'accounts', uKey), acc, { merge: true }),
            setDoc(doc(this.db, 'accounts', eKey), acc, { merge: true }),
            setDoc(doc(this.db, 'users', acc.id), {
              must_change_password: true,
              updated_at: acc.updatedAt,
            }, { merge: true }),
          ]);
        }
      } catch {}
    }

    const accounts = this.getStoredAccounts();
    const account = accounts.find(
      (a) => a.email.toLowerCase() === cleanInput || a.username.toLowerCase() === cleanInput
    );
    if (account) {
      userFound = true;
      account.password = pass;
      account.mustChangePassword = true;
      this.saveStoredAccounts(accounts);
    }

    try {
      await backendApi.resetPassword({ emailOrUsername: input, newPassword: pass });
    } catch {}

    if (!userFound) {
      return {
        success: false,
        message: 'No se encontró ninguna cuenta registrada con ese correo o usuario.',
      };
    }

    return {
      success: true,
      tempPassword: '12345',
      message: 'Tu contraseña ha sido restablecida a la temporal estándar: 12345. Al iniciar sesión se te pedirá cambiarla.',
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

  public async deleteAccount(): Promise<{ success: boolean; message?: string }> {
    const user = this.currentUser;
    const targetUserId = user?.id || '';
    const targetEmail = (user?.email || '').trim().toLowerCase();
    const targetUsername = (user?.username || '').trim().toLowerCase();

    // 1. Eliminar permanentemente de las cuentas registradas en el dispositivo (pronounceit_registered_accounts_v1)
    try {
      const accounts = this.getStoredAccounts().filter((a) => {
        const aId = a.id;
        const aEmail = (a.email || '').trim().toLowerCase();
        const aUser = (a.username || '').trim().toLowerCase();
        if (targetUserId && aId === targetUserId) return false;
        if (targetEmail && aEmail === targetEmail) return false;
        if (targetUsername && aUser === targetUsername) return false;
        return true;
      });
      this.saveStoredAccounts(accounts);
    } catch (e) {
      console.warn('Error purgando cuenta de cache local:', e);
    }

    // 2. Limpieza total de almacenamiento local (credenciales recordadas, sesión y avatares)
    try {
      appStorage.removeItem(STORAGE_KEY_FIREBASE_USER);
      appStorage.removeItem('pronounceit_remember_me');
      appStorage.removeItem('pronounceit_saved_email');
      appStorage.removeItem('pronounceit_saved_password');
      appStorage.removeItem('pronounceit_saved_username');
      appStorage.removeItem('pronounceit_last_avatar');
      appStorage.removeItem('pronounceit_auth_token');
      if (targetUserId) appStorage.removeItem(`pronounceit_avatar_${targetUserId}`);
      if (targetUsername) appStorage.removeItem(`pronounceit_avatar_${targetUsername}`);
      if (targetEmail) appStorage.removeItem(`pronounceit_avatar_${targetEmail}`);
      backendApi.setToken(null);
    } catch (e) {
      console.warn('Error limpiando almacenamiento local:', e);
    }

    // 3. Eliminar usuario, palabras y tests en el Backend Express
    try {
      await backendApi.deleteAccount(targetUserId, targetEmail, targetUsername);
    } catch (e) {
      console.warn('Backend deleteAccount error:', e);
    }

    // 4. Eliminar en Firestore Cloud Database si está conectado
    if (this.db) {
      try {
        if (targetUserId) {
          try {
            const wordsCol = collection(this.db, 'users', targetUserId, 'words');
            const wSnap = await getDocs(wordsCol);
            const batch = writeBatch(this.db);
            wSnap.forEach((d) => batch.delete(d.ref));
            const testsCol = collection(this.db, 'users', targetUserId, 'test_history');
            const tSnap = await getDocs(testsCol);
            tSnap.forEach((d) => batch.delete(d.ref));
            batch.delete(doc(this.db, 'users', targetUserId));
            await batch.commit();
          } catch (e) {
            console.warn('Firestore user docs deletion warning:', e);
          }
        }
        if (targetUsername) await deleteDoc(doc(this.db, 'accounts', targetUsername)).catch(() => {});
        if (targetEmail) await deleteDoc(doc(this.db, 'accounts', targetEmail)).catch(() => {});
      } catch (e) {
        console.warn('Firestore delete account error:', e);
      }
    }

    // 5. Eliminar usuario en Firebase Auth si aplica
    if (this.auth?.currentUser) {
      try {
        await deleteUser(this.auth.currentUser);
      } catch (e) {
        console.warn('Firebase deleteUser error (puede requerir re-autenticación):', e);
      }
    }

    // 6. Finalizar sesión local y emitir cambio
    await this.signOut();

    return { success: true, message: 'Tu cuenta ha sido dada de baja correctamente.' };
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
        const uKey = current.username ? current.username.toLowerCase() : '';
        const eKey = current.email ? current.email.toLowerCase() : '';
        const accountUpdate: any = {
          id: current.id,
          username: current.username,
          email: current.email,
          fullName: current.full_name,
          avatarUrl: resolvedAvatar || null,
          updatedAt: new Date().toISOString(),
        };
        if (updates.newPassword) {
          accountUpdate.password = updates.newPassword;
        }

        const promises = [
          setDoc(doc(this.db, 'users', current.id), userData, { merge: true }),
        ];
        if (uKey) {
          promises.push(setDoc(doc(this.db, 'users', uKey), userData, { merge: true }));
          promises.push(setDoc(doc(this.db, 'accounts', uKey), accountUpdate, { merge: true }));
        }
        if (eKey) {
          promises.push(setDoc(doc(this.db, 'accounts', eKey), accountUpdate, { merge: true }));
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
    if (userId && userId !== 'guest' && userId !== 'undefined') return userId;
    if (this.currentUser?.id && this.currentUser.id !== 'guest') return this.currentUser.id;
    try {
      const stored = appStorage.getItem(STORAGE_KEY_FIREBASE_USER);
      if (stored) {
        const u = JSON.parse(stored);
        if (u.id && u.id !== 'guest') return u.id;
      }
      const legacyUser = appStorage.getItem('pronounceit_user_v1');
      if (legacyUser) {
        const lu = JSON.parse(legacyUser);
        if (lu.id && lu.id !== 'guest') return lu.id;
      }
    } catch {}
    return 'guest';
  }

  // ==========================================
  // FIRESTORE: VOCABULARY (WORDS)
  // ==========================================
  public parseWordDoc(d: any): WordItem {
    const data = typeof d.data === 'function' ? d.data() : d;
    return {
      id: d.id || data.id,
      word: data.word || '',
      partOfSpeech: normalizePartOfSpeech(data.partOfSpeech || 'Sustantivo'),
      level: data.level || 'B1',
      ipa: data.ipa || '',
      phoneticGuide: data.phoneticGuide || '',
      phoneticNote: data.phoneticNote || '',
      translation: data.translation || '',
      definition: data.definition || '',
      exampleEn: data.exampleEn || '',
      exampleEs: data.exampleEs || '',
      highlightWord: data.highlightWord || '',
      status: data.status || 'learning',
      isFavorite: Boolean(data.isFavorite),
      categoryGroup: data.categoryGroup || (Array.isArray(data.categoryGroups) && data.categoryGroups[0]) || 'General',
      categoryGroups: Array.isArray(data.categoryGroups) && data.categoryGroups.length > 0
        ? data.categoryGroups
        : (data.categoryGroup ? [data.categoryGroup] : ['General']),
      categorySub: data.categorySub || (Array.isArray(data.categorySubs) && data.categorySubs[0]) || 'General',
      categorySubs: Array.isArray(data.categorySubs) && data.categorySubs.length > 0
        ? data.categorySubs
        : (data.categorySub ? [data.categorySub] : ['General']),
      srsIntervalDays: data.srsIntervalDays ?? 1,
      lastReviewedAt: data.lastReviewedAt,
      createdAt: data.createdAt || new Date().toISOString(),
    };
  }

  public subscribeWords(
    userId: string | undefined,
    callback: (words: WordItem[]) => void
  ): () => void {
    if (!this.db) {
      return () => {};
    }
    const uid = this.getEffectiveUserId(userId);
    if (!uid || uid === 'guest') {
      return () => {};
    }

    try {
      const wordsCol = collection(this.db, 'users', uid, 'words');
      const unsubscribe = onSnapshot(
        wordsCol,
        (snapshot) => {
          const words: WordItem[] = [];
          snapshot.forEach((d) => {
            words.push(this.parseWordDoc(d));
          });
          words.sort((a, b) => {
            const timeA = new Date(a.createdAt || 0).getTime();
            const timeB = new Date(b.createdAt || 0).getTime();
            return timeB - timeA;
          });
          callback(words);
        },
        (error) => {
          console.warn('[Firebase] subscribeWords onSnapshot error:', error);
        }
      );
      return unsubscribe;
    } catch (err) {
      console.warn('[Firebase] Error iniciando subscribeWords:', err);
      return () => {};
    }
  }

  public subscribeCategories(
    userId: string | undefined,
    callback: (categories: CategoryItem[]) => void
  ): () => void {
    if (!this.db) {
      return () => {};
    }
    const uid = this.getEffectiveUserId(userId);
    if (!uid || uid === 'guest') {
      return () => {};
    }

    try {
      const userDoc = doc(this.db, 'users', uid);
      const unsubscribe = onSnapshot(
        userDoc,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            if (Array.isArray(data?.categories)) {
              callback(data.categories as CategoryItem[]);
            }
          }
        },
        (error) => {
          console.warn('[Firebase] subscribeCategories onSnapshot error:', error);
        }
      );
      return unsubscribe;
    } catch (err) {
      console.warn('[Firebase] Error iniciando subscribeCategories:', err);
      return () => {};
    }
  }

  public subscribeTestHistory(
    userId: string | undefined,
    callback: (tests: StoredTestItem[]) => void
  ): () => void {
    if (!this.db) return () => {};
    const uid = this.getEffectiveUserId(userId);
    if (!uid || uid === 'guest') return () => {};

    try {
      const testsCol = collection(this.db, 'users', uid, 'test_history');
      const unsubscribe = onSnapshot(
        testsCol,
        (snapshot) => {
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
          callback(list);
        },
        (error) => {
          console.warn('[Firebase] subscribeTestHistory error:', error);
        }
      );
      return unsubscribe;
    } catch (err) {
      console.warn('[Firebase] Error iniciando subscribeTestHistory:', err);
      return () => {};
    }
  }

  public async fetchWords(userId?: string): Promise<WordItem[] | null> {
    if (!this.db) return null;
    const uid = this.getEffectiveUserId(userId);
    if (!uid || uid === 'guest') return [];
    const email = this.currentUser?.email?.trim().toLowerCase();

    try {
      const wordsMap = new Map<string, WordItem>();

      // 1. Fetch from primary user ID subcollection
      try {
        const wordsCol = collection(this.db, 'users', uid, 'words');
        const snapshot = await getDocs(wordsCol);
        snapshot.forEach((d) => wordsMap.set(d.id, this.parseWordDoc(d)));
      } catch {}

      // 2. If user ID collection was empty, check email subcollection
      if (wordsMap.size === 0 && email && email !== uid) {
        try {
          const emailWordsCol = collection(this.db, 'users', email, 'words');
          const emailSnap = await getDocs(emailWordsCol);
          emailSnap.forEach((d) => {
            const w = this.parseWordDoc(d);
            wordsMap.set(d.id, w);
            setDoc(doc(this.db!, 'users', uid, 'words', d.id), d.data(), { merge: true }).catch(() => {});
          });
        } catch {}
      }

      // 3. Fallback to usuario_principal if user has 0 words (automatic seamless migration)
      if (wordsMap.size === 0) {
        try {
          const legacyCol = collection(this.db, 'users', 'usuario_principal', 'words');
          const legacySnap = await getDocs(legacyCol);
          if (!legacySnap.empty) {
            legacySnap.forEach((d) => {
              const w = this.parseWordDoc(d);
              wordsMap.set(d.id, w);
              setDoc(
                doc(this.db!, 'users', uid, 'words', d.id),
                { ...d.data(), user_id: uid, user_email: email || '' },
                { merge: true }
              ).catch(() => {});
            });
          }
        } catch {}
      }

      return Array.from(wordsMap.values());
    } catch (err: any) {
      console.warn('[Firebase] Error al cargar palabras de Firestore:', err?.code || err?.message);
      return null;
    }
  }

  public async upsertWord(word: WordItem, userId?: string): Promise<boolean> {
    if (!this.db) return false;
    const uid = this.getEffectiveUserId(userId);
    const email = this.currentUser?.email?.trim().toLowerCase();

    try {
      const wordData = {
        id: word.id,
        user_id: uid,
        user_email: email || '',
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
        categoryGroup: word.categoryGroup || (word.categoryGroups && word.categoryGroups[0]) || 'General',
        categoryGroups: word.categoryGroups || (word.categoryGroup ? [word.categoryGroup] : ['General']),
        categorySub: word.categorySub || (word.categorySubs && word.categorySubs[0]) || 'General',
        categorySubs: word.categorySubs || (word.categorySub ? [word.categorySub] : ['General']),
        srsIntervalDays: word.srsIntervalDays ?? 1,
        lastReviewedAt: word.lastReviewedAt || null,
        createdAt: word.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const writes = [
        setDoc(doc(this.db, 'users', uid, 'words', word.id), wordData, { merge: true }),
        setDoc(doc(this.db, 'words', word.id), wordData, { merge: true }),
      ];

      if (email && email !== uid) {
        writes.push(setDoc(doc(this.db, 'users', email, 'words', word.id), wordData, { merge: true }));
      }

      await Promise.all(writes);
      return true;
    } catch (err) {
      console.warn('[Firebase] Error al guardar palabra en Firestore:', err);
      return false;
    }
  }

  public async deleteWord(wordId: string, userId?: string): Promise<boolean> {
    if (!this.db) return false;
    const uid = this.getEffectiveUserId(userId);
    const email = this.currentUser?.email?.trim().toLowerCase();

    try {
      const deletes = [
        deleteDoc(doc(this.db, 'users', uid, 'words', wordId)),
        deleteDoc(doc(this.db, 'words', wordId)),
      ];
      if (email && email !== uid) {
        deletes.push(deleteDoc(doc(this.db, 'users', email, 'words', wordId)));
      }
      await Promise.all(deletes);
      return true;
    } catch (err) {
      console.warn('[Firebase] Error al eliminar palabra de Firestore:', err);
      return false;
    }
  }

  public async syncAllWords(words: WordItem[], userId?: string): Promise<boolean> {
    if (!this.db || !words) return false;
    const uid = this.getEffectiveUserId(userId);
    const email = this.currentUser?.email?.trim().toLowerCase();

    try {
      // Chunk batches of 250 (Firestore limit is 500)
      const chunkSize = 250;
      for (let i = 0; i < words.length; i += chunkSize) {
        const chunk = words.slice(i, i + chunkSize);
        const batch = writeBatch(this.db);
        for (const w of chunk) {
          const wordData = {
            id: w.id,
            user_id: uid,
            user_email: email || '',
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
            categoryGroup: w.categoryGroup || (w.categoryGroups && w.categoryGroups[0]) || 'General',
            categoryGroups: w.categoryGroups || (w.categoryGroup ? [w.categoryGroup] : ['General']),
            categorySub: w.categorySub || (w.categorySubs && w.categorySubs[0]) || 'General',
            categorySubs: w.categorySubs || (w.categorySub ? [w.categorySub] : ['General']),
            srsIntervalDays: w.srsIntervalDays ?? 1,
            lastReviewedAt: w.lastReviewedAt || null,
            createdAt: w.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          batch.set(doc(this.db, 'users', uid, 'words', w.id), wordData, { merge: true });
          batch.set(doc(this.db, 'words', w.id), wordData, { merge: true });
          if (email && email !== uid) {
            batch.set(doc(this.db, 'users', email, 'words', w.id), wordData, { merge: true });
          }
        }
        await batch.commit();
      }
      return true;
    } catch (err) {
      console.warn('[Firebase] Error en sincronización por lotes de palabras:', err);
      return false;
    }
  }

  // Alias for backward compatibility
  public async syncWordsToFirestore(words: WordItem[], userId?: string): Promise<boolean> {
    return this.syncAllWords(words, userId);
  }

  // ==========================================
  // FIRESTORE: CATEGORIES
  // ==========================================
  public async fetchCategories(userId?: string): Promise<CategoryItem[] | null> {
    if (!this.db) return null;
    const uid = this.getEffectiveUserId(userId);
    const email = this.currentUser?.email?.trim().toLowerCase();

    try {
      const uDoc = await getDoc(doc(this.db, 'users', uid));
      if (uDoc.exists() && Array.isArray(uDoc.data()?.categories)) {
        return uDoc.data()?.categories as CategoryItem[];
      }
      if (email && email !== uid) {
        const eDoc = await getDoc(doc(this.db, 'users', email));
        if (eDoc.exists() && Array.isArray(eDoc.data()?.categories)) {
          return eDoc.data()?.categories as CategoryItem[];
        }
      }
      return null;
    } catch (err) {
      console.warn('[Firebase] Error al cargar categorías de Firestore:', err);
      return null;
    }
  }

  public async saveCategories(categories: CategoryItem[], userId?: string): Promise<boolean> {
    if (!this.db || !categories) return false;
    const uid = this.getEffectiveUserId(userId);
    const email = this.currentUser?.email?.trim().toLowerCase();

    try {
      const payload = {
        categories,
        updated_at: new Date().toISOString(),
      };
      const writes = [setDoc(doc(this.db, 'users', uid), payload, { merge: true })];
      if (email && email !== uid) {
        writes.push(setDoc(doc(this.db, 'users', email), payload, { merge: true }));
      }
      await Promise.all(writes);
      return true;
    } catch (err) {
      console.warn('[Firebase] Error al guardar categorías en Firestore:', err);
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
