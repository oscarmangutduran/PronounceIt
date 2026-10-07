import { Router, Request, Response } from 'express';
import { getDb, saveDb, UserRecord } from '../db.js';
import crypto from 'crypto';

const router = Router();

function sanitizeUser(user: UserRecord) {
  const { password, ...safeUser } = user;
  return safeUser;
}

// POST /api/auth/register
// Registers user with standard initial password '12345' and must_change_password flag
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, username } = req.body;
    if (!email || !username) {
      return res.status(400).json({ error: 'El email y el nombre de usuario son obligatorios.' });
    }

    const db = await getDb();
    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim();

    // Check if user already exists
    const existing = db.users.find(
      (u) => u.email.toLowerCase() === cleanEmail || u.username.toLowerCase() === cleanUsername.toLowerCase()
    );
    if (existing) {
      return res.status(409).json({ error: 'Ya existe una cuenta con este correo o nombre de usuario.' });
    }

    // New user with standard initial password '12345'
    const newUser: UserRecord = {
      id: 'usr_' + crypto.randomUUID().slice(0, 8),
      email: cleanEmail,
      username: cleanUsername,
      password: '12345', // Standard temporary password requested
      must_change_password: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.users.push(newUser);
    await saveDb();

    // Log the transactional welcome email dispatch
    console.log(`\n======================================================`);
    console.log(`📧 [EMAIL SERVICE] Correo de Bienvenida Enviado`);
    console.log(`Destinatario: ${newUser.email}`);
    console.log(`Usuario: ${newUser.username}`);
    console.log(`Contraseña provisional: 12345`);
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

// POST /api/auth/login
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
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    }

    if (user.password !== password) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    }

    return res.json({
      success: true,
      user: sanitizeUser(user),
      mustChangePassword: user.must_change_password,
    });
  } catch (error) {
    console.error('Error en /api/auth/login:', error);
    return res.status(500).json({ error: 'Error interno del servidor al iniciar sesión.' });
  }
});

// POST /api/auth/change-password
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

    if (currentPassword && user.password !== currentPassword) {
      return res.status(400).json({ error: 'La contraseña actual no es correcta.' });
    }

    user.password = newPassword;
    user.must_change_password = false;
    user.updated_at = new Date().toISOString();

    await saveDb();

    console.log(`🔒 [AUTH] Contraseña actualizada exitosamente para el usuario ${user.email}`);

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

// PUT /api/auth/profile
router.put('/profile', async (req: Request, res: Response) => {
  try {
    const { userId, username, avatar_url } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId es requerido.' });
    }

    const db = await getDb();
    const user = db.users.find((u) => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    if (username) user.username = username.trim();
    if (avatar_url !== undefined) user.avatar_url = avatar_url;
    user.updated_at = new Date().toISOString();

    await saveDb();

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
