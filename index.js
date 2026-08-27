const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf('8744590697:AAGfNdEv1_ZI6rvMx5KNfWmcLf29OQU80Ac');

bot.command('start', async (ctx) => {
  const photoUrl = 'https://hesamyemane21.github.io/YemeBingo/banner.jpg';

  await ctx.replyWithPhoto(photoUrl, {
    caption: 'Welcome to Yeme Bingo! Play bingo and start winning today!',
    ...Markup.inlineKeyboard([
      [Markup.button.webApp('🎮 Play now 🎮', 'https://hesamyemane21.github.io/YemeBingo/')],
      [
        Markup.button.callback('Check Balance 💰', 'balance'),
        Markup.button.callback('Game Instruction 📑', 'instructions')
      ],
      [
        Markup.button.callback('Deposit', 'deposit'),
        Markup.button.callback('Contact Us 📞', 'contact')
      ]
    ])
  });
});

bot.action('deposit', (ctx) => ctx.reply('Please enter the amount you want to deposit (50–3000 ETB):'));
bot.command('deposit', (ctx) => ctx.reply('Please enter the amount you want to deposit (50–3000 ETB):'));

bot.launch();
