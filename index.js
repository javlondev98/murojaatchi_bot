const { Telegraf, Scenes, session  } = require('telegraf');
const { Keyboard } = require('telegram-keyboard');
const { getFirestore, doc, getDoc, setDoc, collection, getDocs } = require("firebase/firestore");
const {db} = require('./users')
const { WizardScene } = Scenes; // Move this line here

const adminChatId = 6392652983;

const keyboard = Keyboard.make(["Murojaat yo'llash"]).reply()

// Scene 1: Name Scene
const nameScene = new WizardScene('nameScene',
    (ctx) => {
        ctx.reply("Ism va familiyangizni kiriting:");
        return ctx.wizard.next();
    },
    async (ctx) => {
        ctx.session.fullName = ctx.message.text;
        await ctx.reply("Murojaatingizni kiriting:");
        return ctx.wizard.next();
    },
    async (ctx) => {
        ctx.session.ideas = ctx.message.text;
        // Save to Firestore
        await saveToFirestore(ctx, ctx.session);
        ctx.reply("Murojaatingiz qabul qilindi!");
        return ctx.scene.leave();
    }
);


// Function to forward user's name and ideas to admin
async function forwardToAdmin(ctx, data) {
     // Replace ADMIN_CHAT_ID with the chat ID of the admin

    // Construct the message to be forwarded
    const message = `👤 <b>Murojaatchi:</b> ${data.fullName}\n💡 <b>Murojaat matni:</b> ${data.ideas}`;

    try {
        // Forward the message to the admin
        await ctx.telegram.sendMessage(adminChatId, message, { parse_mode: 'HTML' });
    } catch (error) {
        console.error("Error forwarding message to admin:", error);
    }
}

async function saveToFirestore(ctx, data) {
    console.log("Session data:", data);
    const { id: user_id, first_name, username } = ctx.message.chat;
    const userRef = doc(db, "users", `${user_id}`);

    // Get the current user data from Firestore
    const userSnapshot = await getDoc(userRef);
    let ideasArray = [];

    // If the user document exists, update the ideas array
    if (userSnapshot.exists()) {
        const userData = userSnapshot.data();
        ideasArray = userData.ideas || [];
    }

    // Add the new idea to the ideas array
    ideasArray.push(data.ideas);

    // Save the updated data back to Firestore
    await setDoc(userRef, {
        name: first_name || "",
        username: username || "", // In case username is undefined
        user_id: user_id,
        ideas: ideasArray
    });

    // Forward the user's name and ideas to admin
    await forwardToAdmin(ctx, data);
}

// Scene 2: Ideas Scene
const ideasScene = new WizardScene('ideasScene',
    (ctx) => {
        ctx.reply("Murojaatingizni kiriting:");
        return ctx.wizard.next();
    },
    async (ctx) => {
        ctx.session.ideas = ctx.message.text;
        // Save to Firestore
        await saveToFirestore(ctx.session);
        ctx.reply("Ma'lumotlar qabul qilindi!");
        return ctx.scene.leave();
    }
);

// Middleware to handle `/start` command
const stage = new Scenes.Stage([nameScene, ideasScene]); 


// Initialize Telegraf bot
const bot = new Telegraf('6788302229:AAH5CnCyaZGLvakxEE2lJnlj1ARjMaXRhEA');

bot.use(session());
bot.use(stage.middleware());

bot.start((ctx) => {
    ctx.replyWithChatAction('typing');
    
    if (ctx.message.chat.id === adminChatId) {
        ctx.replyWithHTML('Assalomu alaykum, <b>Admin</b>');
    } else {
        setTimeout(async () => {
            ctx.replyWithHTML(`Assalomu alaykum, <b>${ctx.message.chat.first_name || ctx.message.chat.username}</b>!  <b>"XATIRCHI YOSHLARI"</b> kanali murojaat botiga xush kelibsiz!`, keyboard);
            await setDoc(doc(db, "users", `${ctx.message.chat.id}`), {
                name: `${ctx.message.chat.first_name}`,
                username: `${ctx.message.chat.username}`,
                user_id: `${ctx.message.chat.id}`,
            });
        }, 200);
    }
});

// Command handler for "Murojaat yo'llash"
bot.hears("Murojaat yo'llash", async (ctx) => {
    // Start the Name Scene
    ctx.scene.enter('nameScene');
});

bot.launch();