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

// ===== DATABASE SEDERHANA =====
const owners = new Map();
const textChannels = new Map();

// ===== PANEL =====
function getPanel() {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('name').setEmoji('🎚️').setLabel('NAME').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('limit').setEmoji('👥').setLabel('LIMIT').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('lock').setEmoji('🔒').setLabel('LOCK').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('unlock').setEmoji('🔓').setLabel('UNLOCK').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('kick').setEmoji('📵').setLabel('KICK').setStyle(ButtonStyle.Danger)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('claim').setEmoji('👑').setLabel('CLAIM').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('transfer').setEmoji('🔁').setLabel('TRANSFER').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('block').setEmoji('🚫').setLabel('BLOCK').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('unblock').setEmoji('🔓').setLabel('UNBLOCK').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('delete').setEmoji('🗑️').setLabel('DELETE').setStyle(ButtonStyle.Danger)
  );

  const embed = new EmbedBuilder()
    .setColor('#2b2d31')
    .setTitle('TempVoice Ultimate')
    .setDescription('Gunakan tombol untuk kontrol voice kamu.');

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

    const txt = await newState.guild.channels.create({
      name: `chat-${newState.member.user.username}`,
      type: ChannelType.GuildText,
      parent: CATEGORY_ID
    });

    owners.set(vc.id, newState.member.id);
    textChannels.set(vc.id, txt.id);

    await newState.setChannel(vc);
  }

  // DELETE
  if (!oldState.channel) return;
  if (oldState.channel.id === TRIGGER_CHANNEL_ID) return;
  if (oldState.channel.parentId !== CATEGORY_ID) return;

  setTimeout(async () => {
    if (oldState.channel && oldState.channel.members.size === 0) {

      const txtId = textChannels.get(oldState.channel.id);
      if (txtId) {
        const txt = await oldState.guild.channels.fetch(txtId).catch(() => null);
        if (txt) txt.delete().catch(() => {});
      }

      owners.delete(oldState.channel.id);
      textChannels.delete(oldState.channel.id);

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
      .setCustomId('name')
      .setLabel('Nama Baru')
      .setStyle(TextInputStyle.Short);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
    return i.showModal(modal);
  }

  // ===== LIMIT =====
  if (i.customId === 'limit') {
    const modal = new ModalBuilder()
      .setCustomId('limit')
      .setTitle('Limit');

    const input = new TextInputBuilder()
      .setCustomId('limitInput')
      .setLabel('Jumlah User')
      .setStyle(TextInputStyle.Short);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
    return i.showModal(modal);
  }

  // LOCK / UNLOCK
  if (i.customId === 'lock') {
    await vc.permissionOverwrites.edit(i.guild.roles.everyone, { Connect: false });
    return i.reply({ content: "Room dikunci 🔒", ephemeral: true });
  }

  if (i.customId === 'unlock') {
    await vc.permissionOverwrites.edit(i.guild.roles.everyone, { Connect: true });
    return i.reply({ content: "Room dibuka 🔓", ephemeral: true });
  }

  // KICK
  if (i.customId === 'kick') {
    const member = vc.members.filter(m => m.id !== i.user.id).first();
    if (!member) return i.reply({ content: "Ga ada orang ❌", ephemeral: true });

    await member.voice.disconnect();
    return i.reply({ content: "User di kick 🚫", ephemeral: true });
  }

  // CLAIM
  if (i.customId === 'claim') {
    owners.set(vc.id, i.user.id);
    return i.reply({ content: "Sekarang kamu owner 👑", ephemeral: true });
  }

  // DELETE
  if (i.customId === 'delete') {
    vc.delete();
  }

  // BLOCK
  if (i.customId === 'block') {
    const member = vc.members.filter(m => m.id !== i.user.id).first();
    if (!member) return;

    await vc.permissionOverwrites.edit(member.id, { Connect: false });
    await member.voice.disconnect();
    return i.reply({ content: "User diblock 🚫", ephemeral: true });
  }

  // UNBLOCK
  if (i.customId === 'unblock') {
    return i.reply({ content: "Unblock manual dulu 😎", ephemeral: true });
  }

  // TRANSFER
  if (i.customId === 'transfer') {
    const member = vc.members.filter(m => m.id !== i.user.id).first();
    if (!member) return;

    owners.set(vc.id, member.id);
    return i.reply({ content: "Owner dipindah 🔁", ephemeral: true });
  }
});

// ===== MODAL =====
client.on('interactionCreate', async (i) => {

  if (!i.isModalSubmit()) return;

  const vc = i.member.voice.channel;
  if (!vc) return;

  if (i.customId === 'rename') {
    const name = i.fields.getTextInputValue('name');
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
