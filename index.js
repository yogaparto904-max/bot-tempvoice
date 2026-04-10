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
  TextInputStyle
} = require('discord.js');

const { joinVoiceChannel } = require('@discordjs/voice');

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

// ===== EMBED RESPONSE =====
function successEmbed(desc, guild) {
  return new EmbedBuilder()
    .setColor('#2b2d31')
    .setTitle('Updated!')
    .setDescription(desc)
    .setFooter({
      text: "TempVoice System",
      iconURL: guild?.iconURL({ dynamic: true })
    });
}

// ===== PANEL =====
function getPanel(guild) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('name')
      .setEmoji({ name: "rn", id: "1489177109711818823" })
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder().setCustomId('limit')
      .setEmoji({ name: "lim", id: "1489177299969380404" })
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder().setCustomId('lock')
      .setEmoji({ name: "lc", id: "1489177237277249536" })
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder().setCustomId('unlock')
      .setEmoji({ name: "op", id: "1489177192490598430" })
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder().setCustomId('region')
      .setEmoji({ name: "gl", id: "1489177019311984660" })
      .setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('claim')
      .setEmoji({ name: "cr", id: "1489177359318778020" })
      .setStyle(ButtonStyle.Primary)
  );

  const embed = new EmbedBuilder()
    .setColor('#00b8b8')
    .setAuthor({ name: "BETLEHEM — Temporary Voice." })
    .setTitle('BETLEHEM INTERFACE')
    .setDescription(`Gunakan tombol dibawah untuk mengatur voice anda.`)
    .setImage("https://media.discordapp.net/attachments/1487590787284734143/1489196472720167022/image_3.png?ex=69cf89cb&is=69ce384b&hm=3bdad0fab2f2ac7f9a9266a57f34b0fb0d8d6af8d092a520b70ccfe51d3038bc&=&format=webp&quality=lossless")
    .setFooter({
      text: "Copyright ©2018 - BTHL |•16/05/2025 15:35",
      iconURL: guild?.iconURL({ dynamic: true })
    });

  return { embed, components: [row, row2] };
}

// ===== READY + AUTO JOIN =====
client.once('ready', async () => {
  console.log(`Login sebagai ${client.user.tag}`);

  // PANEL
  const ch = await client.channels.fetch(PANEL_CHANNEL_ID);
  const msgs = await ch.messages.fetch({ limit: 10 });

  if (!msgs.find(m => m.author.id === client.user.id)) {
    const panel = getPanel(ch.guild);
    await ch.send({ embeds: [panel.embed], components: panel.components });
  }

  // AUTO JOIN VC
  try {
    const guild = client.guilds.cache.first();
    if (!guild) return;

    const channel = guild.channels.cache.get( "1488854856633680083" );
    if (!channel) return;

    joinVoiceChannel({
      channelId: channel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: false
    });

    console.log("Auto join VC aktif");
  } catch (err) {
    console.log("Gagal auto join:", err);
  }
});

// ===== TEMP VOICE =====
client.on('voiceStateUpdate', async (oldState, newState) => {

  if (newState.channelId === TRIGGER_CHANNEL_ID) {
    const vc = await newState.guild.channels.create({
      name: `${newState.member.user.username}`,
      type: ChannelType.GuildVoice,
      parent: CATEGORY_ID
    });

    owners.set(vc.id, newState.member.id);
    await newState.setChannel(vc);
  }

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

  if (i.customId === 'lock') {
    await vc.permissionOverwrites.edit(i.guild.roles.everyone, { Connect: false });
    return i.reply({ embeds: [successEmbed(`Channel berhasil dikunci.`, i.guild)], ephemeral: true });
  }

  if (i.customId === 'unlock') {
    await vc.permissionOverwrites.edit(i.guild.roles.everyone, { Connect: true });
    return i.reply({ embeds: [successEmbed(`Channel berhasil dibuka.`, i.guild)], ephemeral: true });
  }

  if (i.customId === 'region') {
    await vc.setRTCRegion('singapore');
    return i.reply({ embeds: [successEmbed(`Region berhasil diubah.`, i.guild)], ephemeral: true });
  }

  if (i.customId === 'claim') {
    owners.set(vc.id, i.user.id);
    return i.reply({ embeds: [successEmbed(`Sekarang kamu adalah owner.`, i.guild)], ephemeral: true });
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
    return i.reply({ embeds: [successEmbed(`Nama channel diubah ke **${name}**.`, i.guild)], ephemeral: true });
  }

  if (i.customId === 'limit') {
    const limit = parseInt(i.fields.getTextInputValue('limitInput'));
    await vc.setUserLimit(limit);
    return i.reply({ embeds: [successEmbed(`User limit sekarang **${limit}**.`, i.guild)], ephemeral: true });
  }
});

client.login(process.env.TOKEN);
