require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
});

// ⚠️ GANTI INI
const CREATE_CHANNEL_ID = '1489141959040696351';
const CATEGORY_ID = '1488141665578520616';

// simpan owner room
const tempRooms = new Map();

client.on('voiceStateUpdate', async (oldState, newState) => {
  const member = newState.member;

  // 🎤 CREATE ROOM
  if (newState.channelId === CREATE_CHANNEL_ID) {
    const channel = await newState.guild.channels.create({
      name: `👑 ${member.user.username}`,
      type: ChannelType.GuildVoice,
      parent: CATEGORY_ID
    });

    tempRooms.set(channel.id, member.id);

    await member.voice.setChannel(channel);

    // 🔥 PANEL EMBED
    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setTitle('TempVoice Interface')
      .setDescription(`
Control room kamu dari sini:

🔒 Lock / Unlock
👥 Limit user
✏️ Rename
🗑️ Delete
`);

    // 🔘 BUTTONS
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('lock').setLabel('Lock').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('unlock').setLabel('Unlock').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('rename').setLabel('Rename').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('delete').setLabel('Delete').setStyle(ButtonStyle.Danger)
    );

    await channel.send({ embeds: [embed], components: [row] });
  }

  // 🧹 DELETE KALAU KOSONG
  if (oldState.channelId && tempRooms.has(oldState.channelId)) {
    const channel = oldState.guild.channels.cache.get(oldState.channelId);
    if (channel && channel.members.size === 0) {
      tempRooms.delete(oldState.channelId);
      await channel.delete();
    }
  }
});

// 🎛️ BUTTON HANDLER
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  const channel = interaction.member.voice.channel;
  if (!channel) return interaction.reply({ content: '❌ Masuk VC dulu', ephemeral: true });

  const ownerId = tempRooms.get(channel.id);
  if (interaction.user.id !== ownerId) {
    return interaction.reply({ content: '❌ Bukan room kamu!', ephemeral: true });
  }

  // 🔒 LOCK
  if (interaction.customId === 'lock') {
    await channel.permissionOverwrites.edit(channel.guild.id, {
      Connect: false
    });
    return interaction.reply({ content: '🔒 Room dikunci', ephemeral: true });
  }

  // 🔓 UNLOCK
  if (interaction.customId === 'unlock') {
    await channel.permissionOverwrites.edit(channel.guild.id, {
      Connect: true
    });
    return interaction.reply({ content: '🔓 Room dibuka', ephemeral: true });
  }

  // ✏️ RENAME
  if (interaction.customId === 'rename') {
    await channel.setName(`✨ ${interaction.user.username}`);
    return interaction.reply({ content: '✏️ Nama diubah', ephemeral: true });
  }

  // 🗑️ DELETE
  if (interaction.customId === 'delete') {
    await channel.delete();
  }
});

client.once('ready', () => {
  console.log(`🔥 TempVoice + Panel aktif sebagai ${client.user.tag}`);
});

client.login(process.env.TOKEN);
