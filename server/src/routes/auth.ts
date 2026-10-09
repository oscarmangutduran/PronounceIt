import { Router, Request, Response } from 'express';
import { getDb, saveDb, UserRecord } from '../db.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { signToken } from '../middleware/auth.js';
import {
  sendWelcomeEmail,
  sendPasswordChangedEmail,
  sendAccountDeletedEmail,
} from '../services/emailService.js';

const router = Router();
const SALT_ROUNDS = 12;
const JWT_SECRET = process.env.JWT_SECRET || 'pronounceit_fallback_secret_dev_only';

function sanitizeUser(user: UserRecord) {
  const { password, ...safeUser } = user;
  return safeUser;
}

/**
 * Verifica si una cadena parece ser un hash bcrypt válido.
 * Los hashes bcrypt siempre empiezan con '$2a$', '$2b$' o '$2y$'.
 */
function isBcryptHash(value: string): boolean {
  return /^\$2[aby]\$/.test(value);
}

/**
 * Compara una contraseña en texto plano contra el valor almacenado.
 * Soporta migración automática: si el valor guardado NO es un hash bcrypt
 * (cuenta antigua con contraseña en texto plano), lo compara directamente
 * y devuelve un flag para re-hashear.
 */
async function verifyPassword(
  plain: string,
  stored: string
): Promise<{ valid: boolean; needsRehash: boolean }> {
  if (isBcryptHash(stored)) {
    const valid = await bcrypt.compare(plain, stored);
    return { valid, needsRehash: false };
  }
  // Contraseña antigua en texto plano — migración automática
  const valid = plain === stored;
  return { valid, needsRehash: valid };
}

// ─────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, username } = req.body;
    if (!email || !username) {
      return res.status(400).json({ error: 'El email y el nombre de usuario son obligatorios.' });
    }

    const db = await getDb();
    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim();

    const existing = db.users.find(
      (u) => u.email.toLowerCase() === cleanEmail || u.username.toLowerCase() === cleanUsername.toLowerCase()
    );
    if (existing) {
      return res.status(409).json({ error: 'Ya existe una cuenta con este correo o nombre de usuario.' });
    }

    // Hash de la contraseña temporal '12345'
    const hashedPassword = await bcrypt.hash('12345', SALT_ROUNDS);

    const newUser: UserRecord = {
      id: 'usr_' + crypto.randomUUID().slice(0, 8),
      email: cleanEmail,
      username: cleanUsername,
      password: hashedPassword,
      must_change_password: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.users.push(newUser);
    await saveDb();

    // Envío de correo de bienvenida desde hola@oscarmangutdev.es
    sendWelcomeEmail(newUser.email, newUser.username, '12345').catch((err) => {
      console.error('Error enviando email de bienvenida:', err);
    });

    return res.status(201).json({
      success: true,
      message: 'Cuenta creada con éxito. Se ha enviado un correo con su usuario y contraseña temporal (12345).',
      emailSent: true,
      user: sanitizeUser(newUser),
    });
  } catch (error) {
    console.error('Error en /api/auth/register:', error);
    return res.status(500).json({ error: 'Error interno del servidor al registrar usuario.' });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { emailOrUsername, password } = req.body;
    if (!emailOrUsername || !password) {
      return res.status(400).json({ error: 'Credenciales incompletas.' });
    }

    const db = await getDb();
    const term = emailOrUsername.trim().toLowerCase();

    const user = db.users.find(
      (u) => u.email.toLowerCase() === term || u.username.toLowerCase() === term
    );

    if (!user) {
      // Respuesta genérica para no filtrar si el usuario existe o no
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    }

    const { valid, needsRehash } = await verifyPassword(password, user.password);

    if (!valid) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    }

    // Migración automática: si la contraseña estaba en texto plano, la re-hasheamos
    if (needsRehash) {
      console.log(`🔒 [AUTH] Migrando contraseña a bcrypt para: ${user.email}`);
      user.password = await bcrypt.hash(password, SALT_ROUNDS);
      user.updated_at = new Date().toISOString();
      await saveDb();
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      username: user.username,
    });

    const isTemp = password === '12345';
    const mustChange = Boolean(user.must_change_password || isTemp);

    return res.json({
      success: true,
      token,
      user: {
        ...sanitizeUser(user),
        must_change_password: mustChange,
      },
      mustChangePassword: mustChange,
    });
  } catch (error) {
    console.error('Error en /api/auth/login:', error);
    return res.status(500).json({ error: 'Error interno del servidor al iniciar sesión.' });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/change-password
// ─────────────────────────────────────────────
router.post('/change-password', async (req: Request, res: Response) => {
  try {
    const { userId, email, currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 4 caracteres.' });
    }

    const db = await getDb();
    const term = (email || '').trim().toLowerCase();
    const user = db.users.find(
      (u) =>
        (userId && u.id === userId) ||
        (term && (u.email.toLowerCase() === term || u.username.toLowerCase() === term))
    );

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    // Si se proporciona contraseña actual, verificarla (con soporte de migración)
    if (currentPassword) {
      const { valid } = await verifyPassword(currentPassword, user.password);
      if (!valid) {
        return res.status(400).json({ error: 'La contraseña actual no es correcta.' });
      }
    }

    user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
    user.must_change_password = false;
    user.updated_at = new Date().toISOString();

    await saveDb();

    console.log(`🔒 [AUTH] Contraseña actualizada (bcrypt) para el usuario ${user.email}`);

    // Envío de correo de confirmación de cambio de contraseña desde hola@oscarmangutdev.es
    sendPasswordChangedEmail(user.email, user.username).catch((err) => {
      console.error('Error enviando email de cambio de contraseña:', err);
    });

    return res.json({
      success: true,
      message: 'Contraseña cambiada exitosamente.',
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('Error en /api/auth/change-password:', error);
    return res.status(500).json({ error: 'Error interno al cambiar contraseña.' });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/reset-password
// ─────────────────────────────────────────────
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { emailOrUsername, newPassword } = req.body;
    if (!emailOrUsername) {
      return res.status(400).json({ error: 'Debes proporcionar tu correo o nombre de usuario.' });
    }

    const db = await getDb();
    const term = emailOrUsername.trim().toLowerCase();

    const user = db.users.find(
      (u) => u.email.toLowerCase() === term || u.username.toLowerCase() === term
    );

    if (!user) {
      return res.status(404).json({ error: 'No se encontró ninguna cuenta con ese correo o usuario.' });
    }

    const passwordToSet = (newPassword && newPassword.trim().length >= 4) ? newPassword.trim() : '12345';
    user.password = await bcrypt.hash(passwordToSet, SALT_ROUNDS);
    user.must_change_password = (passwordToSet === '12345');
    user.updated_at = new Date().toISOString();

    await saveDb();

    console.log(`🔑 [AUTH] Contraseña restablecida para ${user.email} -> ${passwordToSet === '12345' ? '12345 (temporal)' : 'nueva contraseña personalizada'}`);

    // Envío de correo de confirmación de restablecimiento de contraseña desde hola@oscarmangutdev.es
    sendPasswordChangedEmail(user.email, user.username).catch((err) => {
      console.error('Error enviando email de restablecimiento de contraseña:', err);
    });

    return res.json({
      success: true,
      message: passwordToSet === '12345'
        ? 'Contraseña restablecida a la temporal estándar: 12345. Inicia sesión con 12345 y podrás definir tu clave definitiva.'
        : '¡Contraseña restablecida con éxito! Ya puedes iniciar sesión con tu nueva contraseña.',
      tempPassword: passwordToSet === '12345' ? '12345' : undefined,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('Error en /api/auth/reset-password:', error);
    return res.status(500).json({ error: 'Error interno al restablecer la contraseña.' });
  }
});

// ─────────────────────────────────────────────
// PUT /api/auth/profile
// ─────────────────────────────────────────────
router.put('/profile', async (req: Request, res: Response) => {
  try {
    const { userId, username, avatar_url, password, email } = req.body;
    if (!userId && !email && !username) {
      return res.status(400).json({ error: 'userId, email o username es requerido.' });
    }

    const db = await getDb();
    const user = db.users.find(
      (u) =>
        (userId && u.id === userId) ||
        (email && u.email.toLowerCase() === email.trim().toLowerCase()) ||
        (username && u.username.toLowerCase() === username.trim().toLowerCase())
    );
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    if (username && username.trim()) user.username = username.trim();
    if (avatar_url !== undefined) user.avatar_url = avatar_url;
    if (password && password.trim()) {
      // Hash de la nueva contraseña al actualizar perfil
      user.password = await bcrypt.hash(password.trim(), SALT_ROUNDS);
      user.must_change_password = false;

      // Envío de correo de confirmación de cambio de contraseña desde hola@oscarmangutdev.es
      sendPasswordChangedEmail(user.email, user.username).catch((err) => {
        console.error('Error enviando email de cambio de contraseña desde perfil:', err);
      });
    }
    user.updated_at = new Date().toISOString();

    await saveDb();

    console.log(`👤 [AUTH] Perfil actualizado para ${user.username} (${user.email})`);

    return res.json({
      success: true,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('Error en /api/auth/profile:', error);
    return res.status(500).json({ error: 'Error interno al actualizar perfil.' });
  }
});

// ─────────────────────────────────────────────
// DELETE /api/auth/delete-account
// ─────────────────────────────────────────────
router.delete('/delete-account', async (req: Request, res: Response) => {
  try {
    let userId = req.body?.userId;
    let email = req.body?.email;
    let username = req.body?.username;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        if (decoded?.userId) userId = decoded.userId;
        if (decoded?.email) email = decoded.email;
        if (decoded?.username) username = decoded.username;
      } catch {}
    }

    if (!userId && !email && !username) {
      return res.status(400).json({ error: 'userId, email o username es requerido para dar de baja la cuenta.' });
    }

    const db = await getDb();
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    const cleanUsername = username ? username.trim().toLowerCase() : '';

    const userIndex = db.users.findIndex(
      (u) =>
        (userId && u.id === userId) ||
        (cleanEmail && u.email.toLowerCase() === cleanEmail) ||
        (cleanUsername && u.username.toLowerCase() === cleanUsername)
    );

    let userEmailToSend = cleanEmail;
    let userNameToSend = cleanUsername || 'Usuario';

    if (userIndex !== -1) {
      const targetUser = db.users[userIndex];
      const targetUserId = targetUser.id;
      userEmailToSend = targetUser.email || cleanEmail;
      userNameToSend = targetUser.username || cleanUsername || 'Usuario';

      // Eliminar el usuario de la base de datos
      db.users.splice(userIndex, 1);

      // Eliminar palabras y tests asociados
      db.words = db.words.filter((w) => w.userId !== targetUserId && w.userId !== userId);
      db.tests = db.tests.filter((t) => t.userId !== targetUserId && t.userId !== userId);

      await saveDb();
      console.log(`🗑️ [AUTH] Cuenta eliminada (baja) exitosamente: ${targetUser.username} (${targetUser.email})`);
    } else {
      console.log(`ℹ️ [AUTH] delete-account: usuario no encontrado en db.json (o ya purgado), completado.`);
    }

    // Envío de correo de confirmación de baja desde hola@oscarmangutdev.es
    if (userEmailToSend) {
      sendAccountDeletedEmail(userEmailToSend, userNameToSend).catch((err) => {
        console.error('Error enviando email de confirmación de baja:', err);
      });
    }

    return res.json({
      success: true,
      message: 'Cuenta dada de baja exitosamente.',
    });
  } catch (error) {
    console.error('Error en /api/auth/delete-account:', error);
    return res.status(500).json({ error: 'Error interno al dar de baja la cuenta.' });
  }
});

export default router;
