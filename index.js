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

// simpen owner room
const owners = new Map();

// ===== PANEL =====
function getPanel() {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('name').setEmoji('🎚️').setLabel('NAME').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('limit').setEmoji('👥').setLabel('LIMIT').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('privacy').setEmoji('🛡️').setLabel('PRIVACY').setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('kick').setEmoji('📵').setLabel('KICK').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('claim').setEmoji('👑').setLabel('CLAIM').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('delete').setEmoji('🗑️').setLabel('DELETE').setStyle(ButtonStyle.Danger)
  );

  const embed = new EmbedBuilder()
    .setColor('#2b2d31')
    .setTitle('TempVoice Interface')
    .setDescription('Kelola room voice kamu dengan tombol di bawah.');

  return { embed, components: [row1, row2] };
}

// ===== READY =====
client.once('ready', async () => {
  console.log(`Login sebagai ${client.user.tag}`);

  const channel = await client.channels.fetch(PANEL_CHANNEL_ID);
  const msgs = await channel.messages.fetch({ limit: 10 });

  const exist = msgs.find(m => m.author.id === client.user.id);

  if (!exist) {
    const panel = getPanel();
    await channel.send({
      embeds: [panel.embed],
      components: panel.components
    });
  }
});

// ===== TEMP VOICE =====
client.on('voiceStateUpdate', async (oldState, newState) => {

  // CREATE
  if (newState.channelId === TRIGGER_CHANNEL_ID) {
    const ch = await newState.guild.channels.create({
      name: `${newState.member.user.username}`,
      type: ChannelType.GuildVoice,
      parent: CATEGORY_ID
    });

    owners.set(ch.id, newState.member.id);

    await newState.setChannel(ch);
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
  if (i.isButton()) {

    const vc = i.member.voice.channel;
    if (!vc) return i.reply({ content: "Masuk VC dulu ❌", ephemeral: true });

    if (owners.get(vc.id) !== i.user.id) {
      return i.reply({ content: "Bukan room kamu ❌", ephemeral: true });
    }

    // ===== RENAME =====
    if (i.customId === 'name') {
      const modal = new ModalBuilder()
        .setCustomId('renameModal')
        .setTitle('Ganti Nama');

      const input = new TextInputBuilder()
        .setCustomId('newname')
        .setLabel('Nama Baru')
        .setStyle(TextInputStyle.Short);

      modal.addComponents(new ActionRowBuilder().addComponents(input));
      return i.showModal(modal);
    }

    // ===== LIMIT =====
    if (i.customId === 'limit') {
      const modal = new ModalBuilder()
        .setCustomId('limitModal')
        .setTitle('Set Limit');

      const input = new TextInputBuilder()
        .setCustomId('limit')
        .setLabel('Jumlah User')
        .setStyle(TextInputStyle.Short);

      modal.addComponents(new ActionRowBuilder().addComponents(input));
      return i.showModal(modal);
    }

    // ===== LOCK =====
    if (i.customId === 'privacy') {
      await vc.permissionOverwrites.edit(i.guild.roles.everyone, {
        Connect: false
      });
      return i.reply({ content: "Room di lock 🔒", ephemeral: true });
    }

    // ===== DELETE =====
    if (i.customId === 'delete') {
      owners.delete(vc.id);
      await vc.delete();
    }

    // ===== CLAIM =====
    if (i.customId === 'claim') {
      owners.set(vc.id, i.user.id);
      return i.reply({ content: "Sekarang kamu owner 👑", ephemeral: true });
    }

    // ===== KICK =====
    if (i.customId === 'kick') {
      const member = vc.members.filter(m => m.id !== i.user.id).first();
      if (!member) return i.reply({ content: "Ga ada orang ❌", ephemeral: true });

      await member.voice.disconnect();
      return i.reply({ content: "User di kick 🚫", ephemeral: true });
    }
  }

  // ===== MODAL =====
  if (i.isModalSubmit()) {
    const vc = i.member.voice.channel;
    if (!vc) return;

    if (i.customId === 'renameModal') {
      const name = i.fields.getTextInputValue('newname');
      await vc.setName(name);
      return i.reply({ content: "Nama diganti ✅", ephemeral: true });
    }

    if (i.customId === 'limitModal') {
      const limit = parseInt(i.fields.getTextInputValue('limit'));
      await vc.setUserLimit(limit);
      return i.reply({ content: "Limit di set ✅", ephemeral: true });
    }
  }
});

client.login(process.env.TOKEN);
