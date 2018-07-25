"use strict";

require("dotenv").config();

const { Bot, Role } = require("simple-bot-discord");
const { MongoDb } = require("simple-bot-discord/modules");

const Logger = require("./modules/Logger");
const config = require("./config");

const bot = new Bot({
  name: "RadioBot",
  commandPrefix: "?",
  optionsPrefix: "--",
  activityMessage: "Hello Nathaniel",
  discordToken: process.env.DISCORD_TOKEN
});

//////////////// Modules ////////////////

bot.addModule(new MongoDb({
  databaseUrl: process.env.MONGODB_URI,
  databaseName: process.env.MONGODB_DATABASE_NAME,
  collections: ["logs", "config"]
}));

bot.addModule(new Logger({
  logCollection: "logs",
  auditChannelName: "audit"
}));

//////////////// Roles ////////////////

bot.setRoles({
  radioDj: new Role("Radio DJ", config.ROLES.RADIO_DJ, true),
  musicTechnician: new Role("Music Technician", config.ROLES.MUSIC_TECHNICIAN, true),
  aisrCouncil: new Role("AISR Council", config.ROLES.AISR_COUNCIL, false)
});

//////////////// Channels ////////////////

bot.setChannels({
  welcome: config.CHANNELS.WELCOME,
  goodbye: config.CHANNELS.GOODBYE,
  audit: config.CHANNELS.AUDIT
});

//////////////// Data structures ////////////////

const intervals = new Set();

//////////////// Admin commands ////////////////

bot.addCommand("restart", async message => {
  message.channel.send("Restarting...");
  await bot.restart();
  message.channel.send("Successfully restarted!");
}, {
  description: "Restarts the bot.",
  requiresRole: bot.roles.musicTechnician,
  useLogger: true
});

bot.addCommand("purge", async message => {
  const limit = Number(message.tokens[0]) + 1;
  if (!limit) return message.reply("Please specify the number of messages to purge.");
  const messages = await message.channel.fetchMessages({ limit });
  message.channel.bulkDelete(messages);
}, {
  description: "Removes a given number of messages from the current channel.",
  usage: "<number of messages>",
  requiresRole: bot.roles.musicTechnician,
  useLogger: true
});

const env = bot.addCommand("env", message => {
  message.reply("Please specify which environment variable to get.");
}, {
  description: "Allows interacting with environment variables from the current bot instance.",
  usage: "<get> | <set>",
  requiresRole: bot.roles.musicTechnician,
  useLogger: true
});

env.addSubCommand("get", message => {
  const variableName = message.tokens[0];
  if (!variableName) message.reply("Please specify a variable name to get.");
  else message.reply(`\`${variableName}\` is currently set to ${JSON.stringify(process.env[variableName])}`);
}, {
  description: "Gets the current value of an environment variable.",
  usage: "<variable name>"
});

env.addSubCommand("set", message => {
  const [variableName, value] = message.tokens;
  if (!variableName) {
    message.reply("Please specify a variable name to set.");
  } else if (!value) {
    message.reply(`Please specify a value to set ${variableName} to.`);
  } else {
    try {
      process.env[variableName] = JSON.parse(value);
    } catch (ignored) {
      process.env[variableName] = value;
    }
    message.reply(`\`${variableName}\` set to ${process.env[variableName]}`);
  }
}, {
  description: "Sets the current value of an environment variable.",
  usage: "<variable name> <value>",
  useLogger: true
});

//////////////// Miscellaneous ////////////////

bot.addCommand("ping", message => {
  message.reply(`pong! I am currently up and running in ${process.env.NODE_ENV} mode.`);
}, {
  description: "Checks whether the bot is online and what mode it is running in."
});

bot.addCommand("mh", message => {
  const mh = bot.client.users.get(config.MH.ID);
  if (!mh) return message.channel.send("MH was not found.");
  message.channel.send(`MH is **${mh.username}#${mh.discriminator}**`);
}, {
  description: "Find out what the hell MH has changed his name to now."
});

bot.addCommand("yohoho", message => {
  message.channel.send("HE TOOK A BITE OF GUM GUM");
}, {
  description: "YA-YO, YA-YO, YA-YO"
});

bot.addCommand("spam", async message => {
  if (message.tokens.length === 0) return message.reply("Please specify a message.");
  const interval = message.options.interval || config.SPAM_DEFAULT_INTERVAL;
  const maxCount = message.options.count || config.SPAM_DEFAULT_COUNT;
  const messageToSpam = message.tokens.join(" ");
  let count = 0;
  if (message.options.secret) {
    const messagesToDelete = await message.channel.fetchMessages({ limit: 1 });
    message.channel.bulkDelete(messagesToDelete);
  }
  const intervalId = setInterval(async () => {
    if (count >= maxCount || !intervals.has(intervalId)) return clearInterval(intervalId);
    message.channel.send(messageToSpam);
    count++;
  }, interval);
  intervals.add(intervalId);
}, {
  description: "Spam a message",
  usage: "<message> --count=<number> --interval=<delay> --secret?",
  requiresRole: bot.roles.musicTechnician
});

bot.addCommand("clearSpamJobs", message => {
  for (const id of intervals) clearInterval(id);
  message.reply("Cleared!");
});

//////////////// Event handlers ////////////////

bot.on(Bot.events.guildMemberAdd, member => bot.channels.welcome.send(`Hi ${member}!`));
bot.on(Bot.events.guildMemberRemove, member => bot.channels.goodbye.send(`${member} has left the server.`));
bot.on(Bot.events.ready, () => console.log(`Logged in as ${bot.client.user.tag}!`));

bot.connect();
