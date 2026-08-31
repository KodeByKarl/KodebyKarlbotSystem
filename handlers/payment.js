const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const path = require('path');

/**
 * Creates the Payment Details embed and attachment payload (Minimalist Design)
 */
function getPaymentMessagePayload() {
  const qrPath = path.join(__dirname, '../assets/gotyme_qr.png');
  const attachment = new AttachmentBuilder(qrPath, { name: 'gotyme_qr.png' });

  const embed = new EmbedBuilder()
    .setTitle('Payment Details')
    .setColor(0x2B2D31)
    .setDescription(
      `**GoTyme Bank (InstaPay / Bank Transfer)**\n` +
      `Account Name: \`KARL DARNAYLA\` (\`KRL DRNYL\`)\n` +
      `Account Number: \`010158390246\`\n\n` +
      `**GCash**\n` +
      `Not Available\n\n` +
      `*Please send a screenshot of your payment receipt in this ticket once completed.*`
    )
    .setImage('attachment://gotyme_qr.png')
    .setFooter({ text: 'KodebyKarl.net' });

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
