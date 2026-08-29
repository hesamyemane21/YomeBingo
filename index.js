const { Telegraf, Markup } = require('telegraf');
const http = require('http');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK using your uploaded key
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const PORT = process.env.PORT || 3000;
const ADMIN_CHAT_ID = "7309584664";

// Keep-alive HTTP server for Render
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('YemeBingo Bot is live!\n');
}).listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

const bot = new Telegraf(process.env.BOT_TOKEN);

// Temporary state stores
const userDeposits = {};
const userState = {}; 

const getUserId = (ctx) => String(ctx.from.id);

// Helper function to get or create a user in Firebase
async function getOrCreateUser(userId) {
  const userRef = db.collection('users').doc(userId);
  const doc = await userRef.get();
  if (!doc.exists) {
    await userRef.set({ balance: 0.0, createdAt: new Date() });
    return 0.0;
  }
  return doc.data().balance || 0.0;
}

// --- DEPOSIT TRIGGER ---
const startDepositFlow = async (ctx) => {
  const userId = getUserId(ctx);
  userState[userId] = 'AWAITING_AMOUNT';
  await ctx.reply("Please enter the amount you want to deposit (50–3000 ETB):");
};

// --- START COMMAND ---
bot.command('start', async (ctx) => {
  const userId = getUserId(ctx);
  await getOrCreateUser(userId);

  const textMsg = 'Welcome to Yeme Bingo! Play bingo and start winning today!';
  const photoUrl = 'https://i.imgur.com/58zJ61A.jpeg';

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.webApp('🎮 Play now 🎮', 'https://hesamyemane21.github.io/YomeBingo/')],
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

bot.action('deposit', async (ctx) => {
  await ctx.answerCbQuery();
  await startDepositFlow(ctx);
});

bot.command('deposit', async (ctx) => {
  await startDepositFlow(ctx);
});

// --- TEXT MESSAGE ROUTER ---
bot.on('text', async (ctx, next) => {
  if (!ctx.message || !ctx.message.text) return next();
  
  const text = ctx.message.text.trim();
  if (text.startsWith('/')) return next();

  const userId = getUserId(ctx);
  const state = userState[userId];

  // Send receipt info to Admin for manual review
  const isReceipt = state === 'AWAITING_RECEIPT' || 
                    text.includes('transactioninfo.ethiotelecom.et') || 
                    (text.length > 8 && isNaN(text));

  if (isReceipt) {
    delete userState[userId];
    const depositAmount = userDeposits[userId] || '50.0';

    await ctx.reply("⌛ Receipt submitted! Your deposit is currently pending admin verification...");

    // Send receipt notification to Admin
    await ctx.telegram.sendMessage(
      ADMIN_CHAT_ID,
      `📥 **New Deposit Request**\nUser ID: \`${userId}\`\nAmount: ${depositAmount} ETB\nReceipt: ${text}`,
      Markup.inlineKeyboard([
        [
          Markup.button.callback('Approve ✅', `approve_${userId}_${depositAmount}`),
          Markup.button.callback('Reject ❌', `reject_${userId}`)
        ]
      ])
    );
    return;
  } 

  // Process deposit amount input
  const amount = parseFloat(text);
  if (!isNaN(amount) && amount >= 50 && amount <= 3000) {
    const formattedAmount = amount.toFixed(1);
    userDeposits[userId] = formattedAmount;
    userState[userId] = 'AWAITING_WALLET';

    return ctx.reply(
      `To deposit ${formattedAmount} ETB, select the wallet you are sending from:`,
      Markup.inlineKeyboard([
        [Markup.button.callback('TeleBirr', `pay_telebirr_${userId}`)],
        [Markup.button.callback('CBE Birr', `pay_cbe_${userId}`)]
      ])
    );
  } else {
    return ctx.reply("⚠️ Invalid amount. Please enter a number between 50 and 3000 ETB:");
  }
});

// --- ADMIN APPROVAL HANDLER (UPDATES FIREBASE) ---
bot.action(/approve_(.+)_(.+)/, async (ctx) => {
  await ctx.answerCbQuery();
  const targetUserId = ctx.match[1];
  const amount = parseFloat(ctx.match[2]);

  const userRef = db.collection('users').doc(targetUserId);

  // Increment user balance directly in Firestore
  await userRef.set({
    balance: admin.firestore.FieldValue.increment(amount)
  }, { merge: true });

  const updatedDoc = await userRef.get();
  const newBalance = updatedDoc.data().balance;

  // Edit admin message
  await ctx.editMessageText(`✅ Approved ${amount} ETB for User ID: ${targetUserId}. New Balance: ${newBalance.toFixed(2)} ETB`);

  // Notify user
  await ctx.telegram.sendMessage(
    targetUserId,
    `✅ Your deposit of ${amount.toFixed(1)} ETB has been verified and credited! Current Balance: ${newBalance.toFixed(2)} ETB`
  );
});

bot.action(/reject_(.+)/, async (ctx) => {
  await ctx.answerCbQuery();
  const targetUserId = ctx.match[1];

  // Edit admin message
  await ctx.editMessageText(`❌ Rejected deposit for User ID: ${targetUserId}`);

  // Notify user
  await ctx.telegram.sendMessage(
    targetUserId,
    `❌ Transaction verification failed: Payment receipt was not accepted or recipient details did not match.`
  );
});

// --- WALLET SELECTION HANDLERS ---
bot.action(/pay_telebirr_(.+)/, async (ctx) => {
  await ctx.answerCbQuery();
  const userId = getUserId(ctx);
  const amount = userDeposits[userId] || '50.0';

  userState[userId] = 'AWAITING_RECEIPT';

  const msg = 
`💰 እንዴት ዲፖዚት ይደረጋል - ቴሌብር

💳 የብር መጠን: ${amount} ETB

🏦 የሂሳብ ቁጥር:
0939383425

👤 የሂሳብ ስም:
Yemane Tsadik Gebreslassie

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
  const userId = getUserId(ctx);
  const amount = userDeposits[userId] || '50.0';

  userState[userId] = 'AWAITING_RECEIPT';

  const msg = 
`💰 እንዴት ዲፖዚት ይደረጋል - ሲቢኤ ብር

💳 የብር መጠን: ${amount} ETB

🏦 የሂሳብ ቁጥር:
0939383425

👤 የሂሳብ ስም:
Yemane Tsadik Gebreslassie

1️⃣ በሲቢኤ ብር አማካኝነት ከላይ ወደለው የሂሳብ ቁጥር ትክክለኛውን ${amount} ETB ይላኩ።
2️⃣ ከከፈሉ በኋላ ከነዚህ አንዱን ለዚህ ቦት ይላኩ:
• የትራንዛክሽን መለያ
• ሙሉ የደደረሰኝ ሊንክ
• ሙሉ የSMS/የትራንዛክሽን መልዕክት

⚠️ ማሳሰቢያ: ለቴሌብር ሂሳብ ቴሌብርን ብቻ፣ ለሲቢኤ ብር ሂሳብ ደግሞ ሲቢኤ ብርን ብቻ ይጠቀሙ። የማይሰሩ፣ ቀደም ሲል የተጠቀሙባቸው ወይም ለዋና ያልተመዘገቡ የሂሳብ ቁጥሮች የተደረጉ ክፍያዎች ተቀባይነት የላቸውም።
እርዳታ: /contact`;

  await ctx.reply(msg);
});

// --- BALANCE & SUPPORT ---
bot.action('balance', async (ctx) => {
  await ctx.answerCbQuery();
  const userId = getUserId(ctx);
  const currentBalance = await getOrCreateUser(userId);
  await ctx.reply(`Your balance: ${currentBalance.toFixed(2)} ETB`);
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
