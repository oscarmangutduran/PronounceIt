import {
  Client,
  GatewayIntentBits,
  ChannelType,
  PermissionFlagsBits,
  VoiceState,
} from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

// Mapeo de prefijos y banderas según el nombre del canal maestro
const LANGUAGE_FLAGS: Record<string, string> = {
  ingles: '🇬🇧',
  english: '🇬🇧',
  frances: '🇫🇷',
  french: '🇫🇷',
  francais: '🇫🇷',
  aleman: '🇩🇪',
  german: '🇩🇪',
  deutsch: '🇩🇪',
  espanol: '🇪🇸',
  spanish: '🇪🇸',
  italiano: '🇮🇹',
  italian: '🇮🇹',
  portugues: '🇵🇹',
  portuguese: '🇵🇹',
  ruso: '🇷🇺',
  russian: '🇷🇺',
  chino: '🇨🇳',
  chinese: '🇨🇳',
  japones: '🇯🇵',
  japanese: '🇯🇵',
  arabe: '🇸🇦',
  arabic: '🇸🇦',
};

// Almacén en memoria de las salas temporales creadas por el bot
const temporaryRooms = new Set<string>();

export const createDiscordBot = (): Client | null => {
  const token = process.env.DISCORD_BOT_TOKEN;

  if (!token) {
    console.log('[Discord Bot] DISCORD_BOT_TOKEN no configurado. El bot no se iniciará.');
    return null;
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildVoiceStates,
    ],
  });

  client.once('ready', () => {
    console.log(`[Discord Bot] ✅ Conectado como ${client.user?.tag}!`);
    console.log(`[Discord Bot] 🎙️ Listo para gestionar salas automáticas por idioma.`);
  });

  client.on('voiceStateUpdate', async (oldState: VoiceState, newState: VoiceState) => {
    try {
      // 1. USUARIO ENTRA A UN CANAL DE VOZ
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
          let flag = '🔊';
          for (const [key, icon] of Object.entries(LANGUAGE_FLAGS)) {
            if (channelName.includes(key)) {
              flag = icon;
              break;
            }
          }

          const roomName = `${flag} Sala de ${userName}`;

          console.log(`[Discord Bot] 🚀 Creando sala temporal: "${roomName}" para ${userName}`);

          // Creamos la sala en la misma categoría del canal maestro
          const newRoom = await guild.channels.create({
            name: roomName,
            type: ChannelType.GuildVoice,
            parent: joinedChannel.parentId || undefined,
            userLimit: 5, // Límite inicial recomendado de alumnos por sala
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

          // Movemos al alumno inmediatamente a su nueva sala
          await newState.setChannel(newRoom);
          console.log(`[Discord Bot] ➡️ ${userName} movido con éxito a "${roomName}"`);
        }
      }

      // 2. USUARIO SALE DE UN CANAL DE VOZ (LIMPIEZA AUTOMÁTICA)
      if (oldState.channelId && oldState.channelId !== newState.channelId) {
        const leftChannel = oldState.channel;
        if (!leftChannel) return;

        // Comprobamos si era una sala temporal creada por el bot o con nombre "Sala de"
        const isTemporary =
          temporaryRooms.has(leftChannel.id) ||
          leftChannel.name.includes('Sala de');

        if (isTemporary) {
          // Si no queda ningún miembro en la sala, la borramos
          if (leftChannel.members.size === 0) {
            console.log(`[Discord Bot] 🧹 Sala vacía detectada: "${leftChannel.name}". Eliminando...`);
            temporaryRooms.delete(leftChannel.id);
            await leftChannel.delete('Eliminación automática de sala temporal vacía');
            console.log(`[Discord Bot] 🗑️ Sala eliminada con éxito.`);
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
