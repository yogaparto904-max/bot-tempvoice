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

const tempRooms = new Map();

client.once('ready', async () => {
  console.log(`🔥 Bot aktif sebagai ${client.user.tag}`);

  const channel = await client.channels.fetch(PANEL_CHANNEL_ID);

  // 🔍 CEK BIAR GA DOUBLE PANEL
  const messages = await channel.messages.fetch({ limit: 10 });
  const existing = messages.find(
    m => m.author.id === client.user.id && m.embeds.length > 0
  );

  if (existing) {
    console.log("⚠️ Panel sudah ada, skip kirim");
    return;
  }

  // 🎛️ EMBED MIRIP GAMBAR
  const embed = new EmbedBuilder()
    .setColor('#2b2d31')
    .setTitle('TempVoice Interface')
    .setDescription(`This interface can be used to manage temporary voice channels.
More options are available with /voice commands.

Press the buttons below to use the interface`);

  // 🔘 ROW 1
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('name').setLabel('Name').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('limit').setLabel('Limit').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('privacy').setLabel('Privacy').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('waiting').setLabel('Waiting').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('chat').setLabel('Chat').setStyle(ButtonStyle.Secondary)
  );

  // 🔘 ROW 2
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('trust').setLabel('Trust').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('untrust').setLabel('Untrust').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('invite').setLabel('Invite').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('kick').setLabel('Kick').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('region').setLabel('Region').setStyle(ButtonStyle.Secondary)
  );

  // 🔘 ROW 3
  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('block').setLabel('Block').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('unblock').setLabel('Unblock').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('claim').setLabel('Claim').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('transfer').setLabel('Transfer').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('delete').setLabel('Delete').setStyle(ButtonStyle.Danger)
  );

  await channel.send({
    embeds: [embed],
    components: [row1, row2, row3]
  });
});

// 🎤 CREATE ROOM
client.on('voiceStateUpdate', async (oldState, newState) => {
  const member = newState.member;

  if (newState.channelId === CREATE_CHANNEL_ID) {
    const channel = await newState.guild.channels.create({
      name: `👑 ${member.user.username}`,
      type: ChannelType.GuildVoice,
      parent: CATEGORY_ID
    });

    tempRooms.set(channel.id, member.id);
    await member.voice.setChannel(channel);
  }

  // 🧹 AUTO DELETE
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

  const vc = interaction.member.voice.channel;
  if (!vc) {
    return interaction.reply({ content: '❌ Masuk VC dulu!', ephemeral: true });
  }

  const ownerId = tempRooms.get(vc.id);
  if (interaction.user.id !== ownerId) {
    return interaction.reply({ content: '❌ Bukan room kamu!', ephemeral: true });
  }

  switch (interaction.customId) {
    case 'lock':
      await vc.permissionOverwrites.edit(vc.guild.id, { Connect: false });
      return interaction.reply({ content: '🔒 Room dikunci', ephemeral: true });

    case 'unlock':
      await vc.permissionOverwrites.edit(vc.guild.id, { Connect: true });
      return interaction.reply({ content: '🔓 Room dibuka', ephemeral: true });

    case 'name':
      await vc.setName(`✨ ${interaction.user.username}`);
      return interaction.reply({ content: '✏️ Nama diubah', ephemeral: true });

    case 'limit':
      await vc.setUserLimit(2);
      return interaction.reply({ content: '👥 Limit diubah', ephemeral: true });

    case 'delete':
      await vc.delete();
      break;

    default:
      return interaction.reply({
        content: '⚠️ Fitur ini belum diaktifkan',
        ephemeral: true
      });
  }
});

client.login(process.env.TOKEN);
