import { Router, Request, Response } from 'express';
import { getDb, saveDb, TestRecord } from '../db.js';
import crypto from 'crypto';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/tests
router.get('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const { userId, type, level } = req.query;

    let result = [...db.tests];

    if (userId && typeof userId === 'string') {
      result = result.filter((t) => t.userId === userId);
    }
    if (type && typeof type === 'string') {
      result = result.filter((t) => t.type === type);
    }
    if (level && typeof level === 'string' && level !== 'all') {
      result = result.filter((t) => t.level.toLowerCase() === level.toLowerCase());
    }

    // Sort by timestamp descending
    result.sort((a, b) => b.timestamp - a.timestamp);

    return res.json({
      success: true,
      count: result.length,
      tests: result,
    });
  } catch (error) {
    console.error('Error en GET /api/tests:', error);
    return res.status(500).json({ error: 'Error al obtener historial de evaluaciones.' });
  }
});

// POST /api/tests
router.post('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const {
      userId,
      type,
      title,
      level,
      scoreOutOfTen,
      percentage,
      gradeLabel,
      totalQuestions,
      correctCount,
      completedAt,
      timestamp,
      vocabularyQuestions,
      irregularVerbQuestions,
    } = req.body;

    const newTest: TestRecord = {
      id: req.body.id || 'test_' + crypto.randomUUID().slice(0, 8),
      userId: userId || undefined,
      type: type || 'vocabulary',
      title: title || 'Evaluación de Nivel',
      level: level || 'A1-C2',
      scoreOutOfTen: Number(scoreOutOfTen) || 0,
      percentage: Number(percentage) || 0,
      gradeLabel: gradeLabel || 'Aprobado',
      totalQuestions: Number(totalQuestions) || 0,
      correctCount: Number(correctCount) || 0,
      completedAt: completedAt || new Date().toISOString(),
      timestamp: Number(timestamp) || Date.now(),
      vocabularyQuestions: vocabularyQuestions || [],
      irregularVerbQuestions: irregularVerbQuestions || [],
    };

    db.tests.unshift(newTest);
    await saveDb();

    return res.status(201).json({
      success: true,
      test: newTest,
    });
  } catch (error) {
    console.error('Error en POST /api/tests:', error);
    return res.status(500).json({ error: 'Error al guardar la evaluación.' });
  }
});

// DELETE /api/tests/:id
router.delete('/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    const initialLen = db.tests.length;
    db.tests = db.tests.filter((t) => t.id !== id);

    if (db.tests.length === initialLen) {
      return res.status(404).json({ error: 'Registro de evaluación no encontrado.' });
    }

    await saveDb();

    return res.json({
      success: true,
      message: 'Evaluación eliminada del historial.',
    });
  } catch (error) {
    console.error('Error en DELETE /api/tests/:id:', error);
    return res.status(500).json({ error: 'Error al eliminar registro de evaluación.' });
  }
});

// DELETE /api/tests (Clear all)
router.delete('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    db.tests = [];
    await saveDb();

    return res.json({
      success: true,
      message: 'Historial de evaluaciones restablecido.',
    });
  } catch (error) {
    console.error('Error en DELETE /api/tests:', error);
    return res.status(500).json({ error: 'Error al reiniciar historial.' });
  }
});

export default router;
