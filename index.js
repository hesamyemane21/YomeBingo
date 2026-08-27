const { Telegraf, Markup } = require('telegraf');
const http = require('http');

const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('YemeBingo Bot is live!\n');
}).listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

const bot = new Telegraf('8744590697:AAFOLkcvHnIKcv0EMIiicBUzB8x_vmzdHzU');

bot.command('start', async (ctx) => {
  const textMsg = 'Welcome to Yeme Bingo! Play bingo and start winning today!';
  const photoUrl = 'https://hesamyemane21.github.io/YemeBingo/banner.jpg';
  
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.webApp('🎮 Play now 🎮', 'https://hesamyemane21.github.io/YemeBingo/')],
    [
      Markup.button.callback('Check Balance 💰', 'balance'),
      Markup.button.callback('Game Instruction 📑', 'instructions')
    ],
    [
      Markup.button.callback('Deposit', 'deposit'),
      Markup.button.callback('Contact Us 📞', 'contact')
    ]
  ]);

  try {
    await ctx.replyWithPhoto(photoUrl, {
      caption: textMsg,
      reply_markup: keyboard.reply_markup
    });
  } catch (err) {
    console.error('Photo failed to send, falling back to text:', err);
    await ctx.reply(textMsg, keyboard);
  }
});


bot.action('deposit', (ctx) => ctx.reply('Please enter the amount you want to deposit (50–3000 ETB):'));
bot.action('balance', (ctx) => ctx.reply('Your balance: 0.00 ETB'));
bot.action('instructions', (ctx) => ctx.reply('How to Play: Mark off numbers on your bingo card as they are called to win!'));
bot.action('contact', (ctx) => ctx.reply('Support contact: @YemeSupport'));

bot.command('deposit', (ctx) => ctx.reply('Please enter the amount you want to deposit (50–3000 ETB):'));

bot.launch().then(() => console.log('Telegram bot started successfully!'));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
