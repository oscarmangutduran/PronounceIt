import { Router, Request, Response } from 'express';
import { getDb, saveDb, WordRecord } from '../db.js';
import crypto from 'crypto';

const router = Router();

// GET /api/words
router.get('/', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const { userId, category, level, search } = req.query;

    let result = [...db.words];

    if (userId && typeof userId === 'string') {
      result = result.filter((w) => !w.userId || w.userId === userId);
    }
    if (category && typeof category === 'string' && category !== 'all') {
      result = result.filter((w) => w.category.toLowerCase() === category.toLowerCase());
    }
    if (level && typeof level === 'string' && level !== 'all') {
      result = result.filter((w) => w.level.toLowerCase() === level.toLowerCase());
    }
    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      result = result.filter(
        (w) =>
          w.word.toLowerCase().includes(q) ||
          w.translation.toLowerCase().includes(q) ||
          w.example.toLowerCase().includes(q)
      );
    }

    return res.json({
      success: true,
      count: result.length,
      words: result,
    });
  } catch (error) {
    console.error('Error en GET /api/words:', error);
    return res.status(500).json({ error: 'Error al obtener vocabulario.' });
  }
});

// POST /api/words
router.post('/', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const {
      word,
      phonetic,
      translation,
      example,
      exampleTranslation,
      category,
      level,
      status,
      isFavorite,
      notes,
      userId,
    } = req.body;

    if (!word || !translation) {
      return res.status(400).json({ error: 'La palabra y su traducción son campos requeridos.' });
    }

    const newWord: WordRecord = {
      id: req.body.id || 'w_' + crypto.randomUUID().slice(0, 8),
      userId: userId || undefined,
      word: word.trim(),
      phonetic: (phonetic || '').trim(),
      translation: (translation || '').trim(),
      example: (example || '').trim(),
      exampleTranslation: (exampleTranslation || '').trim(),
      category: (category || 'General').trim(),
      level: (level || 'B1').trim(),
      status: status || 'learning',
      isFavorite: Boolean(isFavorite),
      notes: notes || '',
      interval: req.body.interval ?? 1,
      easeFactor: req.body.easeFactor ?? 2.5,
      repetitions: req.body.repetitions ?? 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.words.unshift(newWord);
    await saveDb();

    return res.status(201).json({
      success: true,
      word: newWord,
    });
  } catch (error) {
    console.error('Error en POST /api/words:', error);
    return res.status(500).json({ error: 'Error al guardar la palabra.' });
  }
});

// POST /api/words/bulk (For CSV imports or multi-word restore)
router.post('/bulk', async (req: Request, res: Response) => {
  try {
    const { words, replaceAll, userId } = req.body;
    if (!Array.isArray(words)) {
      return res.status(400).json({ error: 'El cuerpo debe incluir un arreglo de palabras en la propiedad "words".' });
    }

    const db = await getDb();

    if (replaceAll) {
      if (userId) {
        db.words = db.words.filter((w) => w.userId && w.userId !== userId);
      } else {
        db.words = [];
      }
    }

    const mappedWords: WordRecord[] = words.map((item: any) => ({
      id: item.id || 'w_' + crypto.randomUUID().slice(0, 8),
      userId: userId || item.userId,
      word: String(item.word || '').trim(),
      phonetic: String(item.phonetic || '').trim(),
      translation: String(item.translation || '').trim(),
      example: String(item.example || '').trim(),
      exampleTranslation: String(item.exampleTranslation || '').trim(),
      category: String(item.category || 'General').trim(),
      level: String(item.level || 'B1').trim(),
      status: item.status || 'learning',
      isFavorite: Boolean(item.isFavorite),
      notes: item.notes || '',
      interval: item.interval ?? 1,
      easeFactor: item.easeFactor ?? 2.5,
      repetitions: item.repetitions ?? 0,
      created_at: item.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    db.words.push(...mappedWords);
    await saveDb();

    return res.json({
      success: true,
      message: `Se importaron ${mappedWords.length} palabras correctamente.`,
      totalWords: db.words.length,
    });
  } catch (error) {
    console.error('Error en POST /api/words/bulk:', error);
    return res.status(500).json({ error: 'Error al importar palabras.' });
  }
});

// PUT /api/words/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    const index = db.words.findIndex((w) => w.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Palabra no encontrada.' });
    }

    db.words[index] = {
      ...db.words[index],
      ...req.body,
      id, // Preserve id
      updated_at: new Date().toISOString(),
    };

    await saveDb();

    return res.json({
      success: true,
      word: db.words[index],
    });
  } catch (error) {
    console.error('Error en PUT /api/words/:id:', error);
    return res.status(500).json({ error: 'Error al actualizar la palabra.' });
  }
});

// DELETE /api/words/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    const initialLen = db.words.length;
    db.words = db.words.filter((w) => w.id !== id);

    if (db.words.length === initialLen) {
      return res.status(404).json({ error: 'Palabra no encontrada.' });
    }

    await saveDb();

    return res.json({
      success: true,
      message: 'Palabra eliminada.',
    });
  } catch (error) {
    console.error('Error en DELETE /api/words/:id:', error);
    return res.status(500).json({ error: 'Error al eliminar la palabra.' });
  }
});

// DELETE /api/words (Delete all words)
router.delete('/', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    const db = await getDb();
    if (userId && typeof userId === 'string') {
      db.words = db.words.filter((w) => w.userId && w.userId !== userId);
    } else {
      db.words = [];
    }
    await saveDb();
    return res.json({
      success: true,
      message: 'Todas las palabras han sido eliminadas.',
      totalWords: db.words.length,
    });
  } catch (error) {
    console.error('Error en DELETE /api/words:', error);
    return res.status(500).json({ error: 'Error al eliminar todas las palabras.' });
  }
});

export default router;
