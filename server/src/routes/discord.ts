import { Router, Request, Response } from 'express';
import {
  getActiveDiscordRooms,
  createDiscordVoiceRoom,
  deleteDiscordRoomById,
  ROOM_DURATION_MS,
} from '../discordBot.js';

const router = Router();

/**
 * GET /api/discord/rooms?lang=en
 * Devuelve todas las salas activas (y limpia automáticamente las que hayan cumplido 1 hora).
 */
router.get('/rooms', async (req: Request, res: Response) => {
  try {
    const lang = typeof req.query.lang === 'string' ? req.query.lang : undefined;
    const rooms = await getActiveDiscordRooms(lang);
    res.json({
      success: true,
      durationMs: ROOM_DURATION_MS,
      rooms,
    });
  } catch (err: any) {
    console.error('[Discord Routes] Error al obtener salas:', err);
    res.status(500).json({
      success: false,
      error: err?.message || 'Error al obtener las salas de Discord',
    });
  }
});

/**
 * POST /api/discord/rooms
 * Crea una nueva sala de voz para el idioma indicado y programa su eliminación automática tras 1 hora.
 */
router.post('/rooms', async (req: Request, res: Response) => {
  try {
    const { languageCode, languageName, username } = req.body || {};
    const room = await createDiscordVoiceRoom({
      languageCode: languageCode || 'en',
      languageName,
      username,
    });
    const rooms = await getActiveDiscordRooms();
    res.status(201).json({
      success: true,
      room,
      rooms,
      durationMs: ROOM_DURATION_MS,
      message: 'Sala creada con éxito. Se eliminará automáticamente cuando transcurra 1 hora.',
    });
  } catch (err: any) {
    console.error('[Discord Routes] Error al crear sala:', err);
    res.status(500).json({
      success: false,
      error: err?.message || 'Error al crear la sala de Discord',
    });
  }
});

/**
 * DELETE /api/discord/rooms/:id
 * Elimina una sala temporal por su ID.
 */
router.delete('/rooms/:id', async (req: Request, res: Response) => {
  try {
    const roomId = req.params.id;
    const deleted = await deleteDiscordRoomById(roomId);
    const rooms = await getActiveDiscordRooms();
    res.json({
      success: deleted,
      rooms,
    });
  } catch (err: any) {
    console.error('[Discord Routes] Error al eliminar sala:', err);
    res.status(500).json({
      success: false,
      error: err?.message || 'Error al eliminar la sala de Discord',
    });
  }
});

export default router;

