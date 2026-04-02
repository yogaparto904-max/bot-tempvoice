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
const CREATE_CHANNEL_ID = '1489143518214754364';
const CATEGORY_ID = '1488141665578520616';
const PANEL_CHANNEL_ID = '1489141959040696351';

// simpan owner
const tempRooms = new Map();

client.once('ready', async () => {
  console.log(`🔥 Bot aktif sebagai ${client.user.tag}`);

  const channel = await client.channels.fetch(PANEL_CHANNEL_ID);

  const embed = new EmbedBuilder()
    .setColor('#2b2d31')
    .setTitle('TempVoice Interface')
    .setDescription('Gunakan tombol di bawah untuk mengatur room voice kamu.');

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('name').setLabel('Name').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('limit').setLabel('Limit').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('lock').setLabel('Lock').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('unlock').setLabel('Unlock').setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('delete').setLabel('Delete').setStyle(ButtonStyle.Danger)
  );

  // kirim sekali aja
  await channel.send({
    embeds: [embed],
    components: [row1, row2]
  });
});

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
  }

  // 🧹 DELETE
  if (oldState.channelId && tempRooms.has(oldState.channelId)) {
    const channel = oldState.guild.channels.cache.get(oldState.channelId);
    if (channel && channel.members.size === 0) {
      tempRooms.delete(oldState.channelId);
      await channel.delete();
    }
  }
});

// 🎛️ BUTTON HANDLER (GLOBAL)
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  const channel = interaction.member.voice.channel;
  if (!channel) {
    return interaction.reply({ content: '❌ Masuk VC dulu!', ephemeral: true });
  }

  const ownerId = tempRooms.get(channel.id);
  if (interaction.user.id !== ownerId) {
    return interaction.reply({ content: '❌ Bukan room kamu!', ephemeral: true });
  }

  if (interaction.customId === 'lock') {
    await channel.permissionOverwrites.edit(channel.guild.id, { Connect: false });
    return interaction.reply({ content: '🔒 Room dikunci', ephemeral: true });
  }

  if (interaction.customId === 'unlock') {
    await channel.permissionOverwrites.edit(channel.guild.id, { Connect: true });
    return interaction.reply({ content: '🔓 Room dibuka', ephemeral: true });
  }

  if (interaction.customId === 'delete') {
    await channel.delete();
  }

  if (interaction.customId === 'name') {
    await channel.setName(`✨ ${interaction.user.username}`);
    return interaction.reply({ content: '✏️ Nama diubah', ephemeral: true });
  }

  if (interaction.customId === 'limit') {
    await channel.setUserLimit(2);
    return interaction.reply({ content: '👥 Limit 2 user', ephemeral: true });
  }
});

client.login(process.env.TOKEN);
