import { Router, Request, Response } from 'express';

const router = Router();

// POST /api/translate/deepl
router.post('/deepl', async (req: Request, res: Response) => {
  try {
    const { text, targetLang = 'ES', sourceLang, apiKey } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'El texto es requerido.' });
    }

    const key = (apiKey || process.env.DEEPL_API_KEY || '').trim();
    if (!key) {
      return res.status(400).json({ error: 'No se ha proporcionado ninguna clave API de DeepL.' });
    }

    const isFree = key.endsWith(':fx');
    const endpoint = isFree
      ? 'https://api-free.deepl.com/v2/translate'
      : 'https://api.deepl.com/v2/translate';

    const normalizedTarget = targetLang.toUpperCase() === 'EN' ? 'EN-US' : targetLang.toUpperCase();
    const payload: any = {
      text: Array.isArray(text) ? text : [text],
      target_lang: normalizedTarget,
    };

    if (sourceLang && sourceLang !== 'auto') {
      payload.source_lang = sourceLang.toUpperCase();
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({
        error: `Error DeepL (${response.status}): ${errText}`,
      });
    }

    const data = (await response.json()) as any;
    const translatedText = data?.translations?.[0]?.text || '';
    const detectedSource = data?.translations?.[0]?.detected_source_language || '';

    return res.json({
      success: true,
      translation: translatedText,
      detectedSource,
      raw: data,
    });
  } catch (error: any) {
    console.error('Error en /api/translate/deepl:', error);
    return res.status(500).json({ error: error?.message || 'Error al traducir con DeepL' });
  }
});

// POST /api/translate/deepl/test (Test DeepL connection)
router.post('/deepl/test', async (req: Request, res: Response) => {
  try {
    const key = (req.body?.apiKey || process.env.DEEPL_API_KEY || '').trim();
    if (!key) {
      return res.status(400).json({ error: 'No se ha proporcionado ninguna clave API de DeepL.' });
    }

    const isFree = key.endsWith(':fx');
    const endpoint = isFree
      ? 'https://api-free.deepl.com/v2/usage'
      : 'https://api.deepl.com/v2/usage';

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `DeepL-Auth-Key ${key}`,
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({
        error: `DeepL rechazó la clave API (${response.status}): ${errText}`,
      });
    }

    const data = (await response.json()) as any;
    return res.json({
      success: true,
      message: `Conexión exitosa con DeepL (${isFree ? 'DeepL Free' : 'DeepL Pro'}). Uso: ${data.character_count || 0} / ${data.character_limit || 'ilimitado'} caracteres.`,
      isFree,
      usage: data,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Error al conectar con DeepL.' });
  }
});

export default router;
