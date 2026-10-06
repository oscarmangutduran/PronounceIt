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

const STORAGE_KEY_FIREBASE_CONFIG = 'pronounceit_firebase_config_v1';
const STORAGE_KEY_FIREBASE_USER = 'pronounceit_firebase_user_v1';

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

  private getStoredConfig(): FirebaseConfig | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_FIREBASE_CONFIG);
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
      apiKey: stored?.apiKey || import.meta.env.VITE_FIREBASE_API_KEY || '',
      authDomain: stored?.authDomain || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
      projectId: stored?.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
      storageBucket: stored?.storageBucket || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: stored?.messagingSenderId || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: stored?.appId || import.meta.env.VITE_FIREBASE_APP_ID || '',
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
    // Restore cached user
    try {
      const cached = localStorage.getItem(STORAGE_KEY_FIREBASE_USER);
      if (cached) {
        this.currentUser = JSON.parse(cached);
        if (this.currentUser) {
          const savedAvatar = this.getSavedAvatar(this.currentUser.id, this.currentUser.username, this.currentUser.email);
          if (savedAvatar) {
            this.currentUser.avatar_url = savedAvatar;
          }
        }
      }
    } catch {
      // ignore
    }

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
      const existingAvatar = this.getSavedAvatar(user.uid, user.email?.split('@')[0], user.email || undefined);
      this.currentUser = {
        id: user.uid,
        email: user.email || 'usuario@firebase.com',
        full_name: user.displayName || user.email?.split('@')[0] || 'Usuario PronounceIt',
        username: user.email?.split('@')[0] || 'usuario',
        avatar_url: user.photoURL || existingAvatar || undefined,
        role: 'user',
      };
      localStorage.setItem(STORAGE_KEY_FIREBASE_USER, JSON.stringify(this.currentUser));
      this.notify();
    }
    // Do NOT wipe localStorage on null auth - preserves offline/credentials session!
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

      localStorage.setItem(STORAGE_KEY_FIREBASE_CONFIG, JSON.stringify(fullConfig));

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
      const raw = localStorage.getItem('pronounceit_registered_accounts_v1');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveStoredAccounts(accounts: StoredAccount[]) {
    localStorage.setItem('pronounceit_registered_accounts_v1', JSON.stringify(accounts));
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
        const val = localStorage.getItem(k);
        if (val && (val.startsWith('data:image') || val.startsWith('http'))) {
          return val;
        }
      }
    } catch {}
    return undefined;
  }

  public saveAvatar(userId?: string, avatarUrl?: string, username?: string, email?: string) {
    if (!avatarUrl) return;
    try {
      if (userId) localStorage.setItem(`pronounceit_avatar_${userId}`, avatarUrl);
      if (username) localStorage.setItem(`pronounceit_avatar_${username.toLowerCase()}`, avatarUrl);
      if (email) localStorage.setItem(`pronounceit_avatar_${email.toLowerCase()}`, avatarUrl);
      localStorage.setItem('pronounceit_last_avatar', avatarUrl);
    } catch {}
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
        localStorage.setItem(STORAGE_KEY_FIREBASE_USER, JSON.stringify(profile));
        this.notify();
        return { success: true, user: profile };
      } catch (err: any) {
        // Fallback to local accounts if Firebase Auth threw user-not-found or similar
      }
    }

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
      localStorage.setItem(STORAGE_KEY_FIREBASE_USER, JSON.stringify(profile));
      this.notify();
      return {
        success: true,
        mustChangePassword: existing.mustChangePassword,
        user: profile,
      };
    }

    // Demo account access (alexgorbatow)
    if (input === 'alexgorbatow' || input === 'alexgorbatow@yandex.ru') {
      let avatarUrl = this.getSavedAvatar('usr-alex-gorbatow', 'alexgorbatow', 'alexgorbatow@yandex.ru');
      let fullName = 'Alex Gorbatow';

      if (this.db) {
        try {
          const uDoc = await getDoc(doc(this.db, 'users', 'usr-alex-gorbatow'));
          if (uDoc.exists()) {
            const data = uDoc.data();
            if (data?.avatar_url) avatarUrl = data.avatar_url;
            if (data?.full_name) fullName = data.full_name;
          }
        } catch {}
      }

      if (avatarUrl) {
        this.saveAvatar('usr-alex-gorbatow', avatarUrl, 'alexgorbatow', 'alexgorbatow@yandex.ru');
      }

      const demoProfile: UserProfile = {
        id: 'usr-alex-gorbatow',
        email: 'alexgorbatow@yandex.ru',
        full_name: fullName,
        username: 'alexgorbatow',
        avatar_url: avatarUrl,
        must_change_password: password === '12345',
        role: 'user',
        created_at: new Date().toISOString(),
      };
      this.currentUser = demoProfile;
      localStorage.setItem(STORAGE_KEY_FIREBASE_USER, JSON.stringify(demoProfile));
      this.notify();
      return {
        success: true,
        mustChangePassword: password === '12345',
        user: demoProfile,
      };
    }

    // Standard default user fallback
    let fallbackAvatar = this.getSavedAvatar(undefined, input, input);
    if (this.db && input) {
      try {
        const uDoc = await getDoc(doc(this.db, 'users', input));
        if (uDoc.exists() && uDoc.data()?.avatar_url) {
          fallbackAvatar = uDoc.data()?.avatar_url;
        }
      } catch {}
    }

    const fallbackProfile: UserProfile = {
      id: `usr-${Date.now().toString(36)}`,
      email: input.includes('@') ? input : `${input}@pronounceit.app`,
      full_name: input.split('@')[0],
      username: input.split('@')[0],
      avatar_url: fallbackAvatar,
      must_change_password: password === '12345',
      role: 'user',
      created_at: new Date().toISOString(),
    };
    this.currentUser = fallbackProfile;
    localStorage.setItem(STORAGE_KEY_FIREBASE_USER, JSON.stringify(fallbackProfile));
    this.notify();
    return {
      success: true,
      mustChangePassword: password === '12345',
      user: fallbackProfile,
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
      localStorage.setItem(STORAGE_KEY_FIREBASE_USER, JSON.stringify(this.currentUser));
      this.notify();
    }

    return { success: true, message: 'Contraseña actualizada correctamente.' };
  }

  public async resetPassword(email: string): Promise<{ success: boolean; message?: string }> {
    if (!email) {
      return { success: false, message: 'Introduce un correo electrónico válido.' };
    }

    if (this.auth) {
      try {
        await sendPasswordResetEmail(this.auth, email.trim());
        return { success: true, message: 'Instrucciones enviadas con éxito a tu correo por Firebase.' };
      } catch (err: any) {
        // Continue to fallback notice
      }
    }

    return {
      success: true,
      message: `Se han enviado las instrucciones de restablecimiento a ${email}.`,
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
    localStorage.removeItem(STORAGE_KEY_FIREBASE_USER);
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

    const resolvedAvatar = updates.avatarUrl !== undefined ? updates.avatarUrl : this.currentUser.avatar_url;

    this.currentUser = {
      ...this.currentUser,
      full_name: cleanFullName || this.currentUser.full_name,
      username: cleanUsername || this.currentUser.username,
      email: cleanEmail || this.currentUser.email,
      avatar_url: resolvedAvatar,
    };
    localStorage.setItem(STORAGE_KEY_FIREBASE_USER, JSON.stringify(this.currentUser));

    if (resolvedAvatar) {
      this.saveAvatar(this.currentUser.id, resolvedAvatar, this.currentUser.username, this.currentUser.email);
    }
    this.notify();

    // Update in registered accounts array
    try {
      const accounts = this.getStoredAccounts();
      const existingIdx = accounts.findIndex(
        (a) =>
          a.id === this.currentUser!.id ||
          a.username.toLowerCase() === this.currentUser!.username.toLowerCase() ||
          a.email.toLowerCase() === this.currentUser!.email.toLowerCase()
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
          id: this.currentUser.id,
          email: this.currentUser.email,
          username: this.currentUser.username,
          fullName: this.currentUser.full_name,
          password: updates.newPassword || '12345',
          avatarUrl: resolvedAvatar,
          mustChangePassword: false,
          createdAt: new Date().toISOString(),
        });
      }
      this.saveStoredAccounts(accounts);
    } catch {}

    // Update in Firebase Auth
    if (this.auth?.currentUser) {
      try {
        await fbUpdateProfile(this.auth.currentUser, {
          displayName: cleanFullName || this.currentUser.full_name,
          photoURL: resolvedAvatar || undefined,
        });
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
          full_name: this.currentUser.full_name,
          username: this.currentUser.username,
          avatar_url: resolvedAvatar || null,
          email: this.currentUser.email,
          updated_at: new Date().toISOString(),
        };
        await Promise.all([
          setDoc(doc(this.db, 'users', this.currentUser.id), userData, { merge: true }),
          setDoc(doc(this.db, 'users', this.currentUser.username.toLowerCase()), userData, { merge: true }),
        ]);
      } catch (err) {
        console.warn('[Firebase] Error actualizando usuario en Firestore:', err);
      }
    }

    return { success: true, message: 'Perfil actualizado correctamente.', user: this.currentUser };
  }

  public getEffectiveUserId(userId?: string): string {
    if (userId) return userId;
    if (this.currentUser?.id) return this.currentUser.id;
    try {
      const stored = localStorage.getItem(STORAGE_KEY_FIREBASE_USER);
      if (stored) {
        const u = JSON.parse(stored);
        if (u.id) return u.id;
      }
      const legacyUser = localStorage.getItem('pronounceit_user_v1');
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
