const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const path = require('path');
const config = require('../config');

/**
 * Creates the Payment Details embed and attachment payload
 */
function getPaymentMessagePayload() {
  const qrPath = path.join(__dirname, '../assets/gotyme_qr.png');
  const attachment = new AttachmentBuilder(qrPath, { name: 'gotyme_qr.png' });

  const embed = new EmbedBuilder()
    .setTitle('💳 KODEBYKARL.NET - Developer Payment Details')
    .setColor(0x00D2D3)
    .setThumbnail(config.EMBED_IMAGE_URL)
    .setDescription(
      `Official payment details for hiring **KodebyKarl** (FiveM Custom Developer).\n` +
      `Please refer to the active payment channels below:`
    )
    .addFields(
      {
        name: '🏦 GoTyme Bank (InstaPay / Bank Transfer)',
        value:
          `• **Account Name**: \`KRL DRNYL\` (\`KARL DARNAYLA\`)\n` +
          `• **Account Number**: \`010158390246\`\n` +
          `• **Bank Name**: GoTyme Bank\n` +
          `• **Status**: 🟢 **ACTIVE & AVAILABLE**\n` +
          `• **QR Code**: Scan the attached InstaPay QR Code below`,
        inline: false
      },
      {
        name: '📱 GCash',
        value: `• **Status**: 🔴 **NOT AVAILABLE**\n• Please send payments via GoTyme Bank or InstaPay.`,
        inline: false
      },
      {
        name: '📌 Payment Instructions & Receipt Log',
        value:
          `1. Please double-check the account number \`010158390246\` prior to transfer.\n` +
          `2. Take a screenshot / proof of payment upon successful transaction.\n` +
          `3. Upload the receipt in this ticket channel for developer verification.`,
        inline: false
      }
    )
    .setImage('attachment://gotyme_qr.png')
    .setFooter({ text: 'KODEBYKARL.NET - Official Developer Invoices & Payments' })
    .setTimestamp();

  return { embeds: [embed], files: [attachment] };
}

/**
 * Handle Slash Command /payment or Message Command !payment
 * @param {import('discord.js').ChatInputCommandInteraction | import('discord.js').Message} context 
 */
async function handlePaymentCommand(context) {
  const payload = getPaymentMessagePayload();

  if (typeof context.isChatInputCommand === 'function' && context.isChatInputCommand()) {
    return context.reply(payload);
  } else if (typeof context.reply === 'function') {
    return context.reply(payload);
  }
}

module.exports = { getPaymentMessagePayload, handlePaymentCommand };
