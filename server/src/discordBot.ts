import {
  Client,
  GatewayIntentBits,
  ChannelType,
  PermissionFlagsBits,
  VoiceState,
  VoiceChannel,
} from 'discord.js';
import dotenv from 'dotenv';
import { getDb, saveDb, DiscordRoomRecord } from './db.js';

dotenv.config();

// Duración exacta de cada sala temporal: 1 hora (3.600.000 ms)
export const ROOM_DURATION_MS = 60 * 60 * 1000;
export const DEFAULT_DISCORD_INVITE_URL = 'https://discord.gg/Zsv27yYBF';

// Mapeo de prefijos y banderas según el código o nombre del idioma
const LANGUAGE_FLAGS: Record<string, string> = {
  en: '🇬🇧',
  ingles: '🇬🇧',
  english: '🇬🇧',
  fr: '🇫🇷',
  frances: '🇫🇷',
  french: '🇫🇷',
  francais: '🇫🇷',
  de: '🇩🇪',
  aleman: '🇩🇪',
  german: '🇩🇪',
  deutsch: '🇩🇪',
  es: '🇪🇸',
  espanol: '🇪🇸',
  spanish: '🇪🇸',
  it: '🇮🇹',
  italiano: '🇮🇹',
  italian: '🇮🇹',
  pt: '🇵🇹',
  portugues: '🇵🇹',
  portuguese: '🇵🇹',
  ru: '🇷🇺',
  ruso: '🇷🇺',
  russian: '🇷🇺',
  zh: '🇨🇳',
  chino: '🇨🇳',
  chinese: '🇨🇳',
  ja: '🇯🇵',
  japones: '🇯🇵',
  japanese: '🇯🇵',
  ar: '🇸🇦',
  arabe: '🇸🇦',
  arabic: '🇸🇦',
};

const LANGUAGE_NAMES_ES: Record<string, string> = {
  en: 'Inglés',
  fr: 'Francés',
  de: 'Alemán',
  es: 'Español',
  it: 'Italiano',
  pt: 'Portugués',
  ru: 'Ruso',
  zh: 'Chino',
  ja: 'Japonés',
  ar: 'Árabe',
};

// Almacén en memoria de las salas temporales y sus temporizadores de 1 hora
const temporaryRooms = new Set<string>();
const roomTimers = new Map<string, ReturnType<typeof setTimeout>>();
let discordClientInstance: Client | null = null;
let cleanupIntervalStarted = false;

export function getFlagForLanguage(codeOrName: string): string {
  const clean = (codeOrName || 'en')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  if (LANGUAGE_FLAGS[clean]) return LANGUAGE_FLAGS[clean];
  for (const [key, icon] of Object.entries(LANGUAGE_FLAGS)) {
    if (clean.includes(key)) return icon;
  }
  return '🔊';
}

export function getSpanishLanguageName(code: string, fallbackName?: string): string {
  const clean = (code || 'en').toLowerCase().trim();
  return LANGUAGE_NAMES_ES[clean] || fallbackName || 'Idiomas';
}

/**
 * Elimina un canal de voz en Discord usando el cliente activo o la API REST de Discord.
 */
async function deleteDiscordChannelRemote(channelId?: string): Promise<void> {
  if (!channelId) return;

  temporaryRooms.delete(channelId);

  // 1. Intentar con el cliente conectado de discord.js
  if (discordClientInstance && discordClientInstance.isReady()) {
    try {
      const channel = await discordClientInstance.channels.fetch(channelId).catch(() => null);
      if (channel && 'delete' in channel) {
        await channel.delete('Tiempo de sala expirado (1 hora transcurrida)');
        console.log(`[Discord Bot] 🗑️ Canal de Discord ${channelId} eliminado tras 1 hora.`);
        return;
      }
    } catch (err: any) {
      console.warn(`[Discord Bot] Aviso al borrar canal ${channelId} vía cliente:`, err?.message || err);
    }
  }

  // 2. Fallback mediante Discord REST API (útil en entornos serverless como Vercel)
  const token = process.env.DISCORD_BOT_TOKEN;
  if (token && token !== 'your_discord_bot_token_here') {
    try {
      const res = await fetch(`https://discord.com/api/v10/channels/${channelId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bot ${token}`,
          'X-Audit-Log-Reason': encodeURIComponent('Eliminación automática tras 1 hora'),
        },
      });
      if (res.ok || res.status === 404) {
        console.log(`[Discord Bot] 🗑️ Canal de Discord ${channelId} eliminado vía REST tras 1 hora.`);
      }
    } catch (err: any) {
      console.warn(`[Discord Bot] Aviso al borrar canal ${channelId} vía REST:`, err?.message || err);
    }
  }
}

/**
 * Programa el temporizador en memoria para eliminar automáticamente la sala al cumplirse su hora de expiración.
 */
function scheduleRoomDeletionTimer(room: DiscordRoomRecord): void {
  const existingTimer = roomTimers.get(room.id);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const remainingMs = Math.max(0, room.expiresAtMs - Date.now());
  const timer = setTimeout(async () => {
    roomTimers.delete(room.id);
    try {
      console.log(`[Discord Bot] ⏰ 1 hora cumplida para la sala "${room.roomName}" (${room.id}). Eliminando...`);
      await deleteDiscordChannelRemote(room.channelId);
      const db = await getDb();
      if (Array.isArray(db.discordRooms)) {
        const beforeCount = db.discordRooms.length;
        db.discordRooms = db.discordRooms.filter((r) => r.id !== room.id);
        if (db.discordRooms.length !== beforeCount) {
          await saveDb();
        }
      }
    } catch (err) {
      console.error(`[Discord Bot] Error eliminando sala expirada ${room.id}:`, err);
    }
  }, remainingMs);

  // Evitar que el timer bloquee el cierre del proceso en tests
  if (typeof (timer as any).unref === 'function') {
    (timer as any).unref();
  }

  roomTimers.set(room.id, timer);
}

/**
 * Limpia todas las salas que hayan superado 1 hora de vida (expiresAtMs <= Date.now()).
 */
export async function cleanupExpiredDiscordRooms(): Promise<void> {
  const db = await getDb();
  if (!Array.isArray(db.discordRooms) || db.discordRooms.length === 0) return;

  const now = Date.now();
  const expiredRooms = db.discordRooms.filter((r) => r.expiresAtMs <= now);
  if (expiredRooms.length === 0) return;

  for (const room of expiredRooms) {
    const timer = roomTimers.get(room.id);
    if (timer) {
      clearTimeout(timer);
      roomTimers.delete(room.id);
    }
    await deleteDiscordChannelRemote(room.channelId);
  }

  db.discordRooms = db.discordRooms.filter((r) => r.expiresAtMs > now);
  await saveDb();
}

/**
 * Devuelve las salas activas (y limpia previamente las que ya hayan cumplido 1 hora).
 */
export async function getActiveDiscordRooms(languageCode?: string): Promise<DiscordRoomRecord[]> {
  await cleanupExpiredDiscordRooms();
  const db = await getDb();
  const rooms = Array.isArray(db.discordRooms) ? db.discordRooms : [];

  // Asegurar que todas las salas activas tengan su timer programado
  for (const room of rooms) {
    if (!roomTimers.has(room.id)) {
      scheduleRoomDeletionTimer(room);
    }
  }

  const filtered = languageCode
    ? rooms.filter((r) => r.languageCode.toLowerCase() === languageCode.toLowerCase())
    : rooms;

  return filtered.sort((a, b) => b.createdAtMs - a.createdAtMs);
}

/**
 * Crea un canal de voz en Discord (vía cliente conectado o vía Discord REST API)
 * y genera un enlace de invitación válido por 1 hora (3600 segundos).
 */
async function provisionDiscordVoiceChannel(
  roomName: string,
  languageCode: string,
  languageName: string
): Promise<{ channelId?: string; inviteUrl: string; isRealDiscordChannel: boolean }> {
  const cleanCode = languageCode.toLowerCase().trim();
  const cleanLangNorm = languageName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // 1. Si el cliente de discord.js está conectado y listo
  if (discordClientInstance && discordClientInstance.isReady()) {
    try {
      const targetGuildId = process.env.DISCORD_GUILD_ID;
      const guild = targetGuildId
        ? discordClientInstance.guilds.cache.get(targetGuildId) ||
          (await discordClientInstance.guilds.fetch(targetGuildId).catch(() => null))
        : discordClientInstance.guilds.cache.first();

      if (guild) {
        await guild.channels.fetch().catch(() => null);

        // Buscar categoría o canal padre del idioma correspondiente si existe
        let parentCategoryId: string | undefined;
        for (const [, ch] of guild.channels.cache) {
          const chNameNorm = ch.name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');

          if (ch.type === ChannelType.GuildCategory) {
            if (chNameNorm.includes(cleanLangNorm) || chNameNorm.includes(`voz-${cleanCode}`)) {
              parentCategoryId = ch.id;
              break;
            }
          } else if (ch.type === ChannelType.GuildVoice && ch.parentId) {
            if (chNameNorm.includes(cleanLangNorm) || chNameNorm.includes(`voz-${cleanCode}`)) {
              parentCategoryId = ch.parentId;
            }
          }
        }

        const newChannel = (await guild.channels.create({
          name: roomName,
          type: ChannelType.GuildVoice,
          parent: parentCategoryId,
          userLimit: 10,
          reason: `Sala temporal de ${languageName} creada desde PronounceIt (auto-eliminación en 1 hora)`,
        })) as VoiceChannel;

        temporaryRooms.add(newChannel.id);

        // Crear invitación directa a este canal de voz con caducidad de 1 hora (3600s)
        let inviteUrl = DEFAULT_DISCORD_INVITE_URL;
        try {
          const invite = await newChannel.createInvite({
            maxAge: 3600,
            maxUses: 0,
            unique: true,
            reason: `Invitación temporal (1h) para ${roomName}`,
          });
          if (invite?.code) {
            inviteUrl = `https://discord.gg/${invite.code}`;
          }
        } catch (invErr: any) {
          console.warn('[Discord Bot] No se pudo crear invite específico, usando enlace general:', invErr?.message);
        }

        return {
          channelId: newChannel.id,
          inviteUrl,
          isRealDiscordChannel: true,
        };
      }
    } catch (err: any) {
      console.warn('[Discord Bot] Error creando sala con cliente Discord:', err?.message || err);
    }
  }

  // 2. Fallback con Discord REST API directa (para Vercel Serverless o cuando el gateway aún no conectó)
  const token = process.env.DISCORD_BOT_TOKEN;
  if (token && token !== 'your_discord_bot_token_here') {
    try {
      let guildId = process.env.DISCORD_GUILD_ID;
      if (!guildId) {
        const guildsRes = await fetch('https://discord.com/api/v10/users/@me/guilds', {
          headers: { Authorization: `Bot ${token}` },
        });
        if (guildsRes.ok) {
          const guilds = (await guildsRes.json()) as Array<{ id: string; name: string }>;
          if (Array.isArray(guilds) && guilds.length > 0) {
            guildId = guilds[0].id;
          }
        }
      }

      if (guildId) {
        const createRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
          method: 'POST',
          headers: {
            Authorization: `Bot ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: roomName,
            type: 2, // GuildVoice
            user_limit: 10,
          }),
        });

        if (createRes.ok) {
          const createdChannel = (await createRes.json()) as { id: string };
          const channelId = createdChannel.id;
          temporaryRooms.add(channelId);

          let inviteUrl = DEFAULT_DISCORD_INVITE_URL;
          try {
            const inviteRes = await fetch(
              `https://discord.com/api/v10/channels/${channelId}/invites`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bot ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  max_age: 3600,
                  max_uses: 0,
                  unique: true,
                }),
              }
            );
            if (inviteRes.ok) {
              const inviteData = (await inviteRes.json()) as { code?: string };
              if (inviteData?.code) {
                inviteUrl = `https://discord.gg/${inviteData.code}`;
              }
            }
          } catch {}

          return {
            channelId,
            inviteUrl,
            isRealDiscordChannel: true,
          };
        }
      }
    } catch (err: any) {
      console.warn('[Discord Bot] Error creando sala vía REST API:', err?.message || err);
    }
  }

  // 3. Si no hay DISCORD_BOT_TOKEN configurado, registramos la sala temporal gestionada por PronounceIt con el enlace oficial
  return {
    channelId: undefined,
    inviteUrl: DEFAULT_DISCORD_INVITE_URL,
    isRealDiscordChannel: false,
  };
}

/**
 * Crea una nueva sala de voz al pulsar el botón de Discord y programa su eliminación automática tras 1 hora.
 */
export async function createDiscordVoiceRoom(params: {
  languageCode: string;
  languageName?: string;
  username?: string;
}): Promise<DiscordRoomRecord> {
  await cleanupExpiredDiscordRooms();

  const langCode = (params.languageCode || 'en').toLowerCase().trim();
  const langName = getSpanishLanguageName(langCode, params.languageName);
  const flag = getFlagForLanguage(langCode);
  const cleanUser = (params.username || 'Alumno').trim().slice(0, 28) || 'Alumno';

  const roomName = `${flag} Sala de ${langName} • ${cleanUser}`;
  const nowMs = Date.now();
  const expiresAtMs = nowMs + ROOM_DURATION_MS;

  const provisioned = await provisionDiscordVoiceChannel(roomName, langCode, langName);

  const newRoom: DiscordRoomRecord = {
    id: `room_${nowMs}_${Math.random().toString(36).slice(2, 7)}`,
    channelId: provisioned.channelId,
    roomName,
    languageCode: langCode,
    languageName: langName,
    createdBy: cleanUser,
    inviteUrl: provisioned.inviteUrl,
    createdAt: new Date(nowMs).toISOString(),
    expiresAt: new Date(expiresAtMs).toISOString(),
    createdAtMs: nowMs,
    expiresAtMs,
    isRealDiscordChannel: provisioned.isRealDiscordChannel,
  };

  const db = await getDb();
  if (!Array.isArray(db.discordRooms)) {
    db.discordRooms = [];
  }
  db.discordRooms.unshift(newRoom);
  await saveDb();

  // Programar eliminación automática exactamente cuando transcurra 1 hora
  scheduleRoomDeletionTimer(newRoom);

  console.log(
    `[Discord Bot] 🚀 Sala creada: "${roomName}" | Expira en 1 hora (${new Date(expiresAtMs).toLocaleTimeString()})`
  );

  return newRoom;
}

/**
 * Elimina manualmente una sala por su ID antes o después de expirar.
 */
export async function deleteDiscordRoomById(roomId: string): Promise<boolean> {
  const db = await getDb();
  if (!Array.isArray(db.discordRooms)) return false;

  const target = db.discordRooms.find((r) => r.id === roomId);
  if (!target) return false;

  const timer = roomTimers.get(roomId);
  if (timer) {
    clearTimeout(timer);
    roomTimers.delete(roomId);
  }

  await deleteDiscordChannelRemote(target.channelId);

  db.discordRooms = db.discordRooms.filter((r) => r.id !== roomId);
  await saveDb();
  return true;
}

export const createDiscordBot = (): Client | null => {
  // Iniciar barrido periódico cada 60 segundos para garantizar eliminación de salas tras 1 hora
  if (!cleanupIntervalStarted) {
    cleanupIntervalStarted = true;
    getActiveDiscordRooms().catch(() => {});
    const interval = setInterval(() => {
      cleanupExpiredDiscordRooms().catch((err) =>
        console.warn('[Discord Bot] Error en limpieza periódica de salas:', err)
      );
    }, 60 * 1000);
    if (typeof (interval as any).unref === 'function') {
      (interval as any).unref();
    }
  }

  const token = process.env.DISCORD_BOT_TOKEN;

  if (!token || token === 'your_discord_bot_token_here') {
    console.log('[Discord Bot] DISCORD_BOT_TOKEN no configurado. El gestor de salas de 1h funcionará en modo API.');
    return null;
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildVoiceStates,
    ],
  });

  discordClientInstance = client;

  client.once('ready', () => {
    console.log(`[Discord Bot] ✅ Conectado como ${client.user?.tag}!`);
    console.log(`[Discord Bot] 🎙️ Listo para gestionar salas automáticas por idioma (auto-eliminación en 1h).`);
    // Restaurar temporizadores pendientes de la base de datos
    getActiveDiscordRooms().catch(() => {});
  });

  client.on('voiceStateUpdate', async (oldState: VoiceState, newState: VoiceState) => {
    try {
      // 1. USUARIO ENTRA A UN CANAL DE VOZ MAESTRO EN DISCORD
      if (newState.channelId && newState.channelId !== oldState.channelId) {
        const joinedChannel = newState.channel;
        if (!joinedChannel) return;

        const channelName = joinedChannel.name.toLowerCase();

        // Comprobamos si es un canal maestro (contiene "+" o "crear" o "join to create")
        const isMasterChannel =
          channelName.includes('➕') ||
          channelName.includes('+') ||
          channelName.includes('crear') ||
          channelName.includes('join to create');

        if (isMasterChannel && newState.member) {
          const guild = newState.guild;
          const member = newState.member;
          const userName = member.displayName || member.user.username;

          // Detectamos el idioma del canal maestro
          const flag = getFlagForLanguage(channelName);
          const roomName = `${flag} Sala de ${userName}`;

          console.log(`[Discord Bot] 🚀 Creando sala temporal (1h): "${roomName}" para ${userName}`);

          // Creamos la sala en la misma categoría del canal maestro
          const newRoom = await guild.channels.create({
            name: roomName,
            type: ChannelType.GuildVoice,
            parent: joinedChannel.parentId || undefined,
            userLimit: 10,
            permissionOverwrites: [
              {
                id: member.id,
                allow: [
                  PermissionFlagsBits.ManageChannels,
                  PermissionFlagsBits.MoveMembers,
                  PermissionFlagsBits.PrioritySpeaker,
                ],
              },
            ],
          });

          // Registramos el ID de la sala creada
          temporaryRooms.add(newRoom.id);

          // Programamos su eliminación automática cuando transcurra 1 hora (3.600.000 ms)
          const nowMs = Date.now();
          const expiresAtMs = nowMs + ROOM_DURATION_MS;
          const roomRecord: DiscordRoomRecord = {
            id: `room_${nowMs}_${newRoom.id}`,
            channelId: newRoom.id,
            roomName,
            languageCode: 'en',
            languageName: 'General',
            createdBy: userName,
            inviteUrl: DEFAULT_DISCORD_INVITE_URL,
            createdAt: new Date(nowMs).toISOString(),
            expiresAt: new Date(expiresAtMs).toISOString(),
            createdAtMs: nowMs,
            expiresAtMs,
            isRealDiscordChannel: true,
          };

          const db = await getDb();
          if (!Array.isArray(db.discordRooms)) db.discordRooms = [];
          db.discordRooms.unshift(roomRecord);
          await saveDb();
          scheduleRoomDeletionTimer(roomRecord);

          // Movemos al alumno inmediatamente a su nueva sala
          await newState.setChannel(newRoom);
          console.log(`[Discord Bot] ➡️ ${userName} movido con éxito a "${roomName}" (se eliminará en 1h)`);
        }
      }

      // 2. USUARIO SALE DE UN CANAL DE VOZ
      if (oldState.channelId && oldState.channelId !== newState.channelId) {
        const leftChannel = oldState.channel;
        if (!leftChannel) return;

        const isTemporary =
          temporaryRooms.has(leftChannel.id) ||
          leftChannel.name.includes('Sala de');

        if (isTemporary && leftChannel.members.size === 0) {
          // Si fue creada desde la web con temporizador de 1h, respetamos su ciclo de 1 hora
          const db = await getDb();
          const trackedRoom = db.discordRooms?.find((r) => r.channelId === leftChannel.id);
          if (!trackedRoom) {
            console.log(`[Discord Bot] 🧹 Sala vacía detectada: "${leftChannel.name}". Eliminando...`);
            temporaryRooms.delete(leftChannel.id);
            await leftChannel.delete('Eliminación automática de sala temporal vacía');
          }
        }
      }
    } catch (error) {
      console.error('[Discord Bot] ⚠️ Error en evento de voz:', error);
    }
  });

  client.login(token).catch((err) => {
    console.error('[Discord Bot] ❌ Error al iniciar sesión en Discord:', err.message);
  });

  return client;
};

// Permite ejecutar el bot de forma independiente con: npm run bot
if (process.argv[1]?.endsWith('discordBot.ts') || process.argv[1]?.endsWith('discordBot.js')) {
  createDiscordBot();
}
