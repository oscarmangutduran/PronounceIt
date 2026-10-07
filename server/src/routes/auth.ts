import { Router, Request, Response } from 'express';
import { getDb, saveDb, UserRecord } from '../db.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { signToken } from '../middleware/auth.js';

const router = Router();
const SALT_ROUNDS = 12;

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

    console.log(`\n======================================================`);
    console.log(`📧 [EMAIL SERVICE] Correo de Bienvenida Enviado`);
    console.log(`Destinatario: ${newUser.email}`);
    console.log(`Usuario: ${newUser.username}`);
    console.log(`Contraseña provisional: 12345 (almacenada con hash bcrypt)`);
    console.log(`Nota: Debe cambiar su contraseña en el primer inicio de sesión.`);
    console.log(`======================================================\n`);

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

    return res.json({
      success: true,
      token,
      user: sanitizeUser(user),
      mustChangePassword: user.must_change_password,
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
    const user = db.users.find(
      (u) => (userId && u.id === userId) || (email && u.email.toLowerCase() === email.trim().toLowerCase())
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

export default router;
