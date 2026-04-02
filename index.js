require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionsBitField,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
});

// ===== CONFIG =====
const TRIGGER_CHANNEL_ID = "1489151653658759238";
const CATEGORY_ID = "1488141665578520616";
const PANEL_CHANNEL_ID = "1489141959040696351";

// ===== DATABASE =====
const owners = new Map();

// ===== PANEL =====
function getPanel() {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('name').setEmoji('🎚️').setLabel('RENAME').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('limit').setEmoji('👥').setLabel('LIMIT').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('lock').setEmoji('🔒').setLabel('LOCK').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('unlock').setEmoji('🔓').setLabel('UNLOCK').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('region').setEmoji('🌍').setLabel('REGION').setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('claim').setEmoji('👑').setLabel('CLAIM').setStyle(ButtonStyle.Primary)
  );

  const embed = new EmbedBuilder()
    .setColor('#2b2d31')
    .setTitle('ASOSIASI PLENGER TempVoice')
    .setDescription('Kelola voice kamu dengan tombol di bawah.');

  return { embed, components: [row, row2] };
}

// ===== READY =====
client.once('ready', async () => {
  console.log(`Login sebagai ${client.user.tag}`);

  const ch = await client.channels.fetch(PANEL_CHANNEL_ID);
  const msgs = await ch.messages.fetch({ limit: 10 });

  if (!msgs.find(m => m.author.id === client.user.id)) {
    const panel = getPanel();
    await ch.send({ embeds: [panel.embed], components: panel.components });
  }
});

// ===== TEMP VOICE =====
client.on('voiceStateUpdate', async (oldState, newState) => {

  // CREATE
  if (newState.channelId === TRIGGER_CHANNEL_ID) {
    const vc = await newState.guild.channels.create({
      name: `${newState.member.user.username}`,
      type: ChannelType.GuildVoice,
      parent: CATEGORY_ID
    });

    owners.set(vc.id, newState.member.id);
    await newState.setChannel(vc);
  }

  // DELETE (AMAN)
  if (!oldState.channel) return;
  if (oldState.channel.id === TRIGGER_CHANNEL_ID) return;
  if (oldState.channel.parentId !== CATEGORY_ID) return;

  setTimeout(() => {
    if (oldState.channel && oldState.channel.members.size === 0) {
      owners.delete(oldState.channel.id);
      oldState.channel.delete().catch(() => {});
    }
  }, 3000);
});

// ===== BUTTON =====
client.on('interactionCreate', async (i) => {

  if (!i.isButton()) return;

  const vc = i.member.voice.channel;
  if (!vc) return i.reply({ content: "Masuk VC dulu ❌", ephemeral: true });

  if (owners.get(vc.id) !== i.user.id)
    return i.reply({ content: "Bukan room kamu ❌", ephemeral: true });

  // ===== RENAME =====
  if (i.customId === 'name') {
    const modal = new ModalBuilder()
      .setCustomId('rename')
      .setTitle('Rename VC');

    const input = new TextInputBuilder()
      .setCustomId('nameInput')
      .setLabel('Nama Baru')
      .setStyle(TextInputStyle.Short);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
    return i.showModal(modal);
  }

  // ===== LIMIT =====
  if (i.customId === 'limit') {
    const modal = new ModalBuilder()
      .setCustomId('limit')
      .setTitle('Set Limit');

    const input = new TextInputBuilder()
      .setCustomId('limitInput')
      .setLabel('Jumlah User')
      .setStyle(TextInputStyle.Short);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
    return i.showModal(modal);
  }

  // ===== LOCK =====
  if (i.customId === 'lock') {
    await vc.permissionOverwrites.edit(i.guild.roles.everyone, { Connect: false });
    return i.reply({ content: "Room dikunci 🔒", ephemeral: true });
  }

  // ===== UNLOCK =====
  if (i.customId === 'unlock') {
    await vc.permissionOverwrites.edit(i.guild.roles.everyone, { Connect: true });
    return i.reply({ content: "Room dibuka 🔓", ephemeral: true });
  }

  // ===== REGION =====
  if (i.customId === 'region') {
    await vc.setRTCRegion('singapore'); // bisa ganti
    return i.reply({ content: "Region diubah 🌍", ephemeral: true });
  }

  // ===== CLAIM =====
  if (i.customId === 'claim') {
    owners.set(vc.id, i.user.id);
    return i.reply({ content: "Sekarang kamu owner 👑", ephemeral: true });
  }
});

// ===== MODAL =====
client.on('interactionCreate', async (i) => {

  if (!i.isModalSubmit()) return;

  const vc = i.member.voice.channel;
  if (!vc) return;

  if (i.customId === 'rename') {
    const name = i.fields.getTextInputValue('nameInput');
    await vc.setName(name);
    return i.reply({ content: "Nama diubah ✅", ephemeral: true });
  }

  if (i.customId === 'limit') {
    const limit = parseInt(i.fields.getTextInputValue('limitInput'));
    await vc.setUserLimit(limit);
    return i.reply({ content: "Limit di set ✅", ephemeral: true });
  }
});

client.login(process.env.TOKEN);
