const { Telegraf, Markup } = require('telegraf');
const http = require('http');

const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('YemeBingo Bot is live!\n');
}).listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

const bot = new Telegraf(process.env.BOT_TOKEN);

// In-memory store for user deposit amounts
const userDeposits = {};

// --- START COMMAND ---
bot.command('start', async (ctx) => {
  const textMsg = 'Welcome to Yeme Bingo! Play bingo and start winning today!';
  const photoUrl = 'https://i.imgur.com/58zJ61A.jpeg';

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
    await ctx.replyWithPhoto(photoUrl, { caption: textMsg, reply_markup: keyboard.reply_markup });
  } catch (err) {
    await ctx.reply(textMsg, keyboard);
  }
});

// --- DEPOSIT TRIGGER ---
const startDepositFlow = async (ctx) => {
  await ctx.reply('Please enter the amount you want to deposit (50–3000 ETB):', {
    reply_markup: { force_reply: true }
  });
};

bot.action('deposit', async (ctx) => {
  await ctx.answerCbQuery();
  await startDepositFlow(ctx);
});

bot.command('deposit', async (ctx) => {
  await startDepositFlow(ctx);
});

// --- HANDLE TEXT RESPONSES (AMOUNT INPUT) ---
bot.on('text', async (ctx, next) => {
  const text = ctx.message.text.trim();
  
  // Skip if it's a command like /start
  if (text.startsWith('/')) return next();

  const amount = parseFloat(text);

  if (!isNaN(amount) && amount >= 50 && amount <= 3000) {
    const formattedAmount = amount.toFixed(1);
    userDeposits[ctx.from.id] = formattedAmount;

        return ctx.reply(
      `To deposit ${formattedAmount} ETB, select the wallet you are sending from:`,
      Markup.inlineKeyboard([
        [Markup.button.callback('TeleBirr', `pay_telebirr_${ctx.from.id}`)],
        [Markup.button.callback('CBE Birr', `pay_cbe_${ctx.from.id}`)]
      ])
    );

  } else {
    return ctx.reply('⚠️ Invalid amount. Please enter a number between 50 and 3000 ETB:');
  }
});

// --- WALLET SELECTION HANDLERS ---
bot.action(/pay_telebirr_(.+)/, async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.match[1];
  const amount = userDeposits[userId] || '50.0';

  const msg = 
`💰 እንዴት ዲፖዚት ይደረጋል - ቴሌብር

💳 የብር መጠን: ${amount} ETB

🏦 የሂሳብ ቁጥር:
0989464339

👤 የሂሳብ ስም:
Mikiyas Alemayehu Dersie

1️⃣ በቴሌብር አማካኝነት ከላይ ወደለው የሂሳብ ቁጥር ትክክለኛውን ${amount} ETB ይላኩ።
2️⃣ ከከፈሉ በኋላ ከነዚህ አንዱን ለዚህ ቦት ይላኩ:
• የትራንዛክሽን መለያ
• ሙሉ የደደረሰኝ ሊንክ
• ሙሉ የSMS/የትራንዛክሽን መልዕክት

⚠️ ማሳሰቢያ: ለቴሌብር ሂሳብ ቴሌብርን ብቻ፣ ለሲቢኤ ብር ሂሳብ ደግሞ ሲቢኤ ብርን ብቻ ይጠቀሙ። የማይሰሩ፣ ቀደም ሲል የተጠቀሙባቸው ወይም ለዋና ያልተመዘገቡ የሂሳብ ቁጥሮች የተደረጉ ክፍያዎች ተቀባይነት የላቸውም።
እርዳታ: /contact`;

  await ctx.reply(msg);
});

bot.action(/pay_cbe_(.+)/, async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.match[1];
  const amount = userDeposits[userId] || '50.0';

  const msg = 
`💰 እንዴት ዲፖዚት ይደረጋል - ሲቢኤ ብር

💳 የብር መጠን: ${amount} ETB

🏦 የሂሳብ ቁጥር:
0989464339

👤 የሂሳብ ስም:
MIKIYAS ALEMAYEHU

1️⃣ በሲቢኤ ብር አማካኝነት ከላይ ወደለው የሂሳብ ቁጥር ትክክለኛውን ${amount} ETB ይላኩ።
2️⃣ ከከፈሉ በኋላ ከነዚህ አንዱን ለዚህ ቦት ይላኩ:
• የትራንዛክሽን መለያ
• ሙሉ የደደረሰኝ ሊንክ
• ሙሉ የSMS/የትራንዛክሽን መልዕክት

⚠️ ማሳሰቢያ: ለቴሌብር ሂሳብ ቴሌብርን ብቻ፣ ለሲቢኤ ብር ሂሳብ ደግሞ ሲቢኤ ብርን ብቻ ይጠቀሙ። የማይሰሩ፣ ቀደም ሲል የተጠቀሙባቸው ወይም ለዋና ያልተመዘገቡ የሂሳብ ቁጥሮች የተደረጉ ክፍያዎች ተቀባይነት የላቸውም።
እርዳታ: /contact`;

  await ctx.reply(msg);
});

// --- OTHER BUTTON HANDLERS ---
bot.action('balance', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply('Your balance: 0.00 ETB');
});

bot.action('instructions', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply('How to Play: Mark off numbers on your bingo card as they are called to win!');
});

bot.action('contact', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply('Support contact: @YemeSupport');
});

bot.command('contact', async (ctx) => {
  await ctx.reply('Support contact: @YemeSupport');
});

bot.launch().then(() => console.log('Telegram bot started successfully!'));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
