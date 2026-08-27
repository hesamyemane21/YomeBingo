const { Telegraf, Scenes, session, Markup } = require('telegraf');
const http = require('http');

const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('YemeBingo Bot is live!\n');
}).listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

// 1. Define Deposit Conversation Flow
const depositWizard = new Scenes.WizardScene(
  'deposit-wizard',
  
  // Step 1: Prompt for deposit amount
  async (ctx) => {
    await ctx.reply('Please enter the amount you want to deposit (50–3000 ETB):');
    return ctx.wizard.next();
  },

  // Step 2: Validate amount and show TeleBirr / CBE Birr options
  async (ctx) => {
    const text = ctx.message?.text;
    const amount = parseFloat(text);

    if (isNaN(amount) || amount < 50 || amount > 3000) {
      await ctx.reply('⚠️ Invalid amount. Please enter a number between 50 and 3000 ETB:');
      return;
    }

    ctx.wizard.state.amount = amount.toFixed(1);

    await ctx.reply(
      `To deposit ${ctx.wizard.state.amount} ETB, select the wallet you are sending from:`,
      Markup.inlineKeyboard([
        [Markup.button.callback('TeleBirr', 'pay_telebirr')],
        [Markup.button.callback('CBE Birr', 'pay_cbe')]
      ])
    );

    return ctx.wizard.next();
  },

  // Step 3: Handle wallet selection and send Amharic details
  async (ctx) => {
    if (!ctx.callbackQuery) return;
    await ctx.answerCbQuery();
    
    const selection = ctx.callbackQuery.data;
    const amount = ctx.wizard.state.amount;

    if (selection === 'pay_telebirr') {
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
    } else if (selection === 'pay_cbe') {
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
    }

    return ctx.scene.leave();
  }
);

// 2. Initialize Bot and Register Scenes
const stage = new Scenes.Stage([depositWizard]);
const bot = new Telegraf(process.env.BOT_TOKEN);

bot.use(session());
bot.use(stage.middleware());

// 3. Command Handlers
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

bot.action('deposit', (ctx) => {
  ctx.answerCbQuery();
  return ctx.scene.enter('deposit-wizard');
});
bot.command('deposit', (ctx) => ctx.scene.enter('deposit-wizard'));

bot.action('balance', (ctx) => ctx.reply('Your balance: 0.00 ETB'));
bot.action('instructions', (ctx) => ctx.reply('How to Play: Mark off numbers on your bingo card as they are called to win!'));
bot.action('contact', (ctx) => ctx.reply('Support contact: @YemeSupport'));
bot.command('contact', (ctx) => ctx.reply('Support contact: @YemeSupport'));

bot.launch().then(() => console.log('Telegram bot started successfully!'));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
