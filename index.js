require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionFlagsBits,
  StringSelectMenuBuilder
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

// ===== EMBED =====
function ok(desc) {
  return new EmbedBuilder()
    .setColor('#2b2d31')
    .setTitle('Updated!')
    .setDescription(desc)
    .setFooter({ text: "TempVoice System" });
}

// ===== BUTTON =====
function btnCustom(id, emojiId){
  return new ButtonBuilder()
    .setCustomId(id)
    .setEmoji({ id: emojiId })
    .setStyle(ButtonStyle.Secondary);
}

function btnDefault(id, emoji){
  return new ButtonBuilder()
    .setCustomId(id)
    .setEmoji(emoji)
    .setStyle(ButtonStyle.Secondary);
}

// ===== PRIVACY DROPDOWN =====
function privacyMenu(){
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('privacy_select')
      .setPlaceholder('Setelan menu privasi')
      .addOptions([
        { label: 'Kunci', value: 'lock', emoji: '🔒' },
        { label: 'Buka Kunci', value: 'unlock', emoji: '🔓' },
        { label: 'Sembunyikan', value: 'hide', emoji: '🙈' },
        { label: 'Tampilkan', value: 'show', emoji: '👁️' }
      ])
  );
}

// ===== PANEL =====
function panel() {

  const row1 = new ActionRowBuilder().addComponents(
    btnCustom('name','1489177109711818823'),
    btnCustom('limit','1489177299969380404'),
    btnDefault('waiting','⏱️'),
    btnDefault('chat','💬')
  );

  const row2 = privacyMenu();

  const row3 = new ActionRowBuilder().addComponents(
    btnDefault('trust','➕'),
    btnDefault('untrust','➖'),
    btnDefault('invite','📞'),
    btnDefault('kick','📤'),
    btnCustom('region','1489177019311984660')
  );

  const row4 = new ActionRowBuilder().addComponents(
    btnDefault('block','🚫'),
    btnDefault('unblock','⭕'),
    btnCustom('claim','1489177359318778020'),
    btnDefault('transfer','👑'),
    btnDefault('delete','🗑️').setStyle(ButtonStyle.Danger)
  );

  const embed = new EmbedBuilder()
    .setColor('#2b2d31')
    .setTitle('ASSPLR INTERFACE')
    .setDescription('Gunakan tombol dibawah untuk mengatur voice anda.')
    .setFooter({ text: "ASSPLR PRESENT." });

  return { embed, components:[row1,row2,row3,row4] };
}

// ===== READY =====
client.once('ready', async () => {
  console.log(`Login sebagai ${client.user.tag}`);

  const ch = await client.channels.fetch(PANEL_CHANNEL_ID);
  const msgs = await ch.messages.fetch({ limit: 10 });

  if (!msgs.find(m => m.author.id === client.user.id)) {
    const p = panel();
    await ch.send({ embeds:[p.embed], components:p.components });
  }
});

// ===== TEMP VOICE =====
client.on('voiceStateUpdate', async (oldS, newS) => {

  if (newS.channelId === TRIGGER_CHANNEL_ID) {
    const vc = await newS.guild.channels.create({
      name: newS.member.user.username,
      type: ChannelType.GuildVoice,
      parent: CATEGORY_ID
    });

    owners.set(vc.id, newS.member.id);
    await newS.setChannel(vc);
  }

  if (
    oldS.channel &&
    oldS.channel.parentId === CATEGORY_ID &&
    oldS.channel.id !== TRIGGER_CHANNEL_ID &&
    oldS.channel.members.size === 0
  ) {
    owners.delete(oldS.channel.id);
    oldS.channel.delete().catch(() => {});
  }
});

// ===== INTERACTION =====
client.on('interactionCreate', async (i) => {

  // ===== BUTTON =====
  if (i.isButton()) {

    const vc = i.member.voice.channel;
    if (!vc) return i.reply({ content: "Masuk VC dulu ❌", ephemeral: true });

    if (owners.get(vc.id) !== i.user.id)
      return i.reply({ content: "Bukan room kamu ❌", ephemeral: true });

    switch (i.customId) {

      case 'name':
        return showModal(i,'rename','Nama Baru','nameInput');

      case 'limit':
        return showModal(i,'limit','Limit User','limitInput');

      case 'waiting':
        await vc.setUserLimit(1);
        return i.reply({ embeds:[ok('Waiting room aktif.')], ephemeral:true });

      case 'chat':
        return i.reply({ embeds:[ok('Chat dimatikan.')], ephemeral:true });

      case 'trust':
        return i.reply({ embeds:[ok('User ditrust.')], ephemeral:true });

      case 'untrust':
        return i.reply({ embeds:[ok('Trust dihapus.')], ephemeral:true });

      case 'invite':
        return i.reply({ embeds:[ok('Invite tersedia.')], ephemeral:true });

      case 'kick':
        vc.members.forEach(m => {
          if (m.id !== i.user.id) m.voice.disconnect();
        });
        return i.reply({ embeds:[ok('Semua user di kick.')], ephemeral:true });

      case 'region':
        await vc.setRTCRegion('singapore');
        return i.reply({ embeds:[ok('Region diubah.')], ephemeral:true });

      case 'block':
        return i.reply({ embeds:[ok('Channel diblock.')], ephemeral:true });

      case 'unblock':
        return i.reply({ embeds:[ok('Block dibuka.')], ephemeral:true });

      case 'claim':
        owners.set(vc.id, i.user.id);
        return i.reply({ embeds:[ok('Sekarang kamu owner.')], ephemeral:true });

      case 'transfer':
        const member = vc.members.filter(m => m.id !== i.user.id).first();
        if (member) {
          owners.set(vc.id, member.id);
          return i.reply({ embeds:[ok(`Owner dipindah ke ${member.user.username}`)], ephemeral:true });
        }
        return i.reply({ embeds:[ok('Tidak ada user lain.')], ephemeral:true });

      case 'delete':
        await vc.delete();
        return;
    }
  }

  // ===== DROPDOWN =====
  if (i.isStringSelectMenu()) {

    const vc = i.member.voice.channel;
    if (!vc) return i.reply({ content: "Masuk VC dulu ❌", ephemeral: true });

    if (owners.get(vc.id) !== i.user.id)
      return i.reply({ content: "Bukan room kamu ❌", ephemeral: true });

    const val = i.values[0];

    switch(val){

      case 'lock':
        await vc.permissionOverwrites.edit(i.guild.id, { Connect: false });
        return i.reply({ embeds:[ok('Channel dikunci 🔒')], ephemeral:true });

      case 'unlock':
        await vc.permissionOverwrites.edit(i.guild.id, { Connect: true });
        return i.reply({ embeds:[ok('Channel dibuka 🔓')], ephemeral:true });

      case 'hide':
        await vc.permissionOverwrites.edit(i.guild.id, { ViewChannel: false });
        return i.reply({ embeds:[ok('Channel disembunyikan 🙈')], ephemeral:true });

      case 'show':
        await vc.permissionOverwrites.edit(i.guild.id, { ViewChannel: true });
        return i.reply({ embeds:[ok('Channel ditampilkan 👁️')], ephemeral:true });

    }
  }

  // ===== MODAL =====
  if (i.isModalSubmit()) {

    const vc = i.member.voice.channel;
    if (!vc) return;

    if (i.customId === 'rename') {
      const name = i.fields.getTextInputValue('nameInput');
      await vc.setName(name);
      return i.reply({ embeds:[ok(`Nama diubah ke **${name}**`)], ephemeral:true });
    }

    if (i.customId === 'limit') {
      const limit = parseInt(i.fields.getTextInputValue('limitInput'));
      await vc.setUserLimit(limit);
      return i.reply({ embeds:[ok(`Limit sekarang **${limit}**`)], ephemeral:true });
    }
  }

});

// ===== MODAL =====
function showModal(i, id, label, inputId) {
  const modal = new ModalBuilder()
    .setCustomId(id)
    .setTitle(label);

  const input = new TextInputBuilder()
    .setCustomId(inputId)
    .setLabel(label)
    .setStyle(TextInputStyle.Short);

  modal.addComponents(new ActionRowBuilder().addComponents(input));
  i.showModal(modal);
}

client.login(process.env.TOKEN);
