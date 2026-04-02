require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionsBitField
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
});

// ====== CONFIG ======
const TRIGGER_CHANNEL_ID = "1489143518214754364";
const CATEGORY_ID = "1488141665578520616";
const PANEL_CHANNEL_ID = "1489141959040696351";

// ====== PANEL BUTTON ======
function getPanel() {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('name').setEmoji('🎚️').setLabel('NAME').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('limit').setEmoji('👥').setLabel('LIMIT').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('privacy').setEmoji('🛡️').setLabel('PRIVACY').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('waiting').setEmoji('⏳').setLabel('WAITING R.').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('chat').setEmoji('💬').setLabel('CHAT').setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('trust').setEmoji('🟢').setLabel('TRUST').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('untrust').setEmoji('🔴').setLabel('UNTRUST').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('invite').setEmoji('📨').setLabel('INVITE').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('kick').setEmoji('📵').setLabel('KICK').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('region').setEmoji('🌍').setLabel('REGION').setStyle(ButtonStyle.Secondary)
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('block').setEmoji('🚫').setLabel('BLOCK').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('unblock').setEmoji('🔓').setLabel('UNBLOCK').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('claim').setEmoji('👑').setLabel('CLAIM').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('transfer').setEmoji('🔁').setLabel('TRANSFER').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('delete').setEmoji('🗑️').setLabel('DELETE').setStyle(ButtonStyle.Danger)
  );

  const embed = new EmbedBuilder()
    .setColor('#2b2d31')
    .setTitle('TempVoice Interface')
    .setDescription('Manage your temporary voice channel using buttons below.');

  return { embed, components: [row1, row2, row3] };
}

// ====== READY ======
client.once('ready', async () => {
  console.log(`Login sebagai ${client.user.tag}`);

  const channel = await client.channels.fetch(PANEL_CHANNEL_ID);

  // cek biar ga spam panel
  const messages = await channel.messages.fetch({ limit: 10 });
  const already = messages.find(m => m.author.id === client.user.id);

  if (!already) {
    const panel = getPanel();
    await channel.send({
      embeds: [panel.embed],
      components: panel.components
    });
    console.log("Panel dikirim 1x ✅");
  } else {
    console.log("Panel sudah ada, skip kirim ulang ✅");
  }
});

// ====== TEMP VOICE ======
client.on('voiceStateUpdate', async (oldState, newState) => {
  if (newState.channelId === TRIGGER_CHANNEL_ID) {
    const channel = await newState.guild.channels.create({
      name: `${newState.member.user.username}`,
      type: ChannelType.GuildVoice,
      parent: CATEGORY_ID,
      permissionOverwrites: [
        {
          id: newState.member.id,
          allow: [PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.Connect]
        }
      ]
    });

    await newState.setChannel(channel);
  }

  if (oldState.channel && oldState.channel.parentId === CATEGORY_ID) {
    if (oldState.channel.members.size === 0) {
      oldState.channel.delete().catch(() => {});
    }
  }
});

// ====== BUTTON HANDLER ======
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  await interaction.reply({
    content: `Fitur **${interaction.customId}** belum diaktifkan 😎`,
    ephemeral: true
  });
});

client.login(process.env.TOKEN);
