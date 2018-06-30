//////////////////// Init bot ////////////////////

require("dotenv").config();
const fs = require("fs");
const Discord = require("discord.js");
let config = require("./config.js");
const originalConfig = config;

const bot = new Discord.Client();

//////////////////// Database /////////////////////

const MongoClient = require("mongodb").MongoClient;
const ObjectID = require("mongodb").ObjectID;
let logs = null;
let warnings = null;
let db = null;

async function connectToDb() {
  const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || config.DATABASE_NAME;
  const MONGODB_URI = process.env.MONGODB_URI || `mongodb://localhost:27017/${MONGODB_DB_NAME}`;
  db = await MongoClient.connect(MONGODB_URI);
  logs = db.collection("logs");
  warnings = db.collection("warnings");
}

//////////////////// Channels /////////////////////

let welcomeChannel;
let goodbyeChannel;
let testChannel;

//////////////////// Generic helpers //////////////

function isAdmin(user) {
  for (const role of config.ADMIN_ROLES) {
    if (user.roles.find("name", role)) return true;
  }
  return false;
}

function doIfAdmin(msg, callback) {
  if (isAdmin(msg.member)) callback();
}

function isValidUserTag(tag) {
  return config.USER_ID_REGEX.test(tag.trim());
}

function tokenize(msg, sliceIndex) {
  const tokens = msg.content.substring(msg.content.indexOf(" ") + 1).split(" ");
  return sliceIndex ? tokens.slice(sliceIndex) : tokens;
}

function moveToVoiceChannel(user, voiceChannel) {
  const id = typeof voiceChannel === "string" || typeof voiceChannel === "number" ? voiceChannel : voiceChannel.id;
  user.setVoiceChannel(id);
}

//////////////////// Logging /////////////////////

function log(user, action, description, time = new Date()) {
  console.log(`${user.username}: ${action} (${description}) @ ${time.toString()}`);
}

//////////////////// Bot management //////////////

function getLastKey(key) {
  const keyParts = key.split(".");
  return keyParts[keyParts.length - 1];
}

function getEnclosingConfigObject(key) {
  const keyParts = key.split(".");
  let currentObject = config;
  for (let i = 0; i < keyParts.length - 1; i++) {
    const nextKey = keyParts[i];
    currentObject = currentObject[nextKey];
  }
  return currentObject;
}

function getConfigValue(key) {
  const enclosingObject = getEnclosingConfigObject(key);
  let result = enclosingObject[getLastKey(key)];
  if (typeof result === "object") result = JSON.stringify(result);
  else if (typeof result === "string") result = `"${result}"`;
  return result;
}

function setConfigVar(key, value, msg) {
  if (!key || !value) return msg.reply("To set an option, please use `${config.COMMAND_PREFIX}config set <name> <value>`");
  const enclosingConfigObject = getEnclosingConfigObject(key);
  const currentValue = getConfigValue(key);
  const lastKey = getLastKey(key);
  if (typeof currentValue === "number") enclosingConfigObject[lastKey] = Number(value);
  else if (typeof currentValue === "object") enclosingConfigObject[lastKey] = JSON.parse(value);
  else if (typeof currentValue === "boolean") enclosingConfigObject[lastKey] = Boolean(value);
  else enclosingConfigObject[lastKey] = value;
  msg.reply(`Successfully set option ${key} to ${value}`);
}

function resetConfigVar(key, msg) {
  if (!key) return msg.reply(`To reset an option, please use \`${config.COMMAND_PREFIX}config ${key} <name>\``);
  config[key] = originalConfig[key];
  msg.reply(`Successfully reset option ${key} to original value ${originalConfig[key]}`);
}

function getConfigVar(key, msg) {
  if (!key) return msg.reply("To get an option's value, plaese use `${config.COMMAND_PREFIX}config get <name>`");
  msg.reply(`Option ${key} is currently set to ${getConfigValue(key)}`);
}

function listConfigOptions(msg) {
  const options = Object.keys(config);
  const optionsListEmbed = new Discord.RichEmbed().setColor(2215814);
  options.forEach(option => {
    let value = config[option];
    if (typeof value === "object") value = JSON.stringify(value);
    optionsListEmbed.addField(option, value);
  });
  msg.reply("Here is a list of currently set options:");
  msg.channel.send(optionsListEmbed);
}

function configBot(msg) {
  let tokens = tokenize(msg);
  if (tokens[0] === "set") {
    const key = tokens[1];
    let value = tokens[2];
    // join all space-separated words into one string for value value
    if (tokens.length > 3) value = tokens.slice(2).join(" ");
    setConfigVar(key, value, msg);
  } else if (tokens[0] === "reset") {
    resetConfigVar(tokens[1], msg);
  } else if (tokens[0] === "get") {
    getConfigVar(tokens[1], msg);
  } else if (tokens[0] === "options" || tokens[0] === "list") {
    listConfigOptions(msg);
  } else {
    msg.reply("Usage: `${config.COMMAND_PREFIX}config set <name> <value> | reset <name> | get <name> | options`");
  }
}

//////////////////// Commands ////////////////////

function test(msg) {
  const whichTest = msg.content.substr(msg.content.indexOf(" ") + 1).split(" ")[0];
  if (whichTest === "welcome") {
    welcome(msg.author);
  } else if (whichTest === "goodbye") {
    goodbye(msg.user);
  }
}

//////////////////// MH ////////////////////

function isMH(member) {
  return member.id === config.MH.ID;
}

function mh(message) {
  const userMap = bot.users.filter(user => user.discriminator === config.MH.DISCRIMINATOR);
  if (userMap.size === 0) return message.channel.send("MH was not found.");
  userMap.forEach(user => message.channel.send(`MH is **${user.username}#${user.discriminator}**`));
}

function handleMHVoiceJoin(oldMember, newMember) {
  const newVoiceChannel = newMember.voiceChannel;
  const shouldMove = newVoiceChannel && isMH(newMember) && newVoiceChannel.id !== config.AFK_CHANNEL_ID
    && config.MH.VOICE_LOCKED;
  if (shouldMove) moveToVoiceChannel(newMember, config.AFK_CHANNEL_ID);
}

//////////////////// Warning system //////////////

function getMuteLimitText() {
  return `You will be muted after ${config.MAX_WARNINGS} warnings.`;
}

async function muteUser(msg, username) {
  const userId = username.substring(username.indexOf("@") + 1, username.length - 1);
  const user = msg.guild.members.get(userId);
  await user.addRole(msg.guild.roles.find("name", "Muted"));
  msg.channel.send(`${username}, you are now muted.`);
}

async function unmuteUser(msg, username) {
  const userId = username.substring(username.indexOf("@") + 1, username.length - 1);
  const user = msg.guild.members.get(userId);
  await user.removeRole(msg.guild.roles.find("name", "Muted"));
  msg.channel.send(`${username}, you have been unmuted.`);
}

async function updateWarning(msg, username, note = "") {
  const existingWarning = await warnings.findOne({ username });
  let count;
  if (existingWarning) {
    count = existingWarning.count + 1;
    if (count > config.MAX_WARNINGS) return msg.channel.send("This user is already muted and cannot be warned.");
    await warnings.updateOne({ username }, {
      username: username,
      count: count,
      note: note ? `${existingWarning.note}\n${note}` : existingWarning.note
    });
  } else {
    count = 1;
    await warnings.insertOne({
      username: username,
      count: count,
      note: note ? `${note}\n` : ""
    });
  }

  if (count === 1) {
    msg.channel.send(`${username}, you have been warned. ${getMuteLimitText()}`)
  } else if (count !== config.MAX_WARNINGS) {
    msg.channel.send(`${username}, you now have ${count} warnings. ${getMuteLimitText()}`);
  } else {
    muteUser(msg, username);
  }
}

async function warn(msg) {
  const tokens = tokenize(msg);
  if (tokens.length === 0) return msg.reply("Please specify a user to warn.");
  const username = tokens[0];
  if(!isValidUserTag(username)) return msg.reply("Please tag the user using @username to warn them.");
  const note = tokens.slice(1).join(" ");
  await updateWarning(msg, username.toLowerCase(), note);
}

async function warnStatus(msg) {
  const tokens = tokenize(msg);
  if (tokens.length === 0) return msg.reply("Please specify a user to warn.");
  const username = tokens[0];
  if (!isValidUserTag(username)) return msg.reply("Please tag the user using @username to warn them.");
  const existingWarning = await warnings.findOne({ username });
  if (!existingWarning) return msg.reply("That user currently has no warnings.");
  const { count, note } = existingWarning;
  const notes = note.split("\n").filter(s => s).map(s => `* ${s.trim()}`);
  const noteStr = `\`\`\`${notes.join("\n")}\`\`\``;
  msg.channel.send(`${username} has ${count} warnings. These are the notes I found:\n${noteStr}`);
}

async function unwarn(msg) {
  if (!isAdmin(msg.member)) return;
  const tokens = tokenize(msg);
  if (tokens.length === 0) return msg.reply("Please specify a user to unwarn.");
  const username = tokens[0];
  if(!isValidUserTag(username)) return msg.reply("Please tag the user using @username to unwarn them.");

  const existingWarning = await warnings.findOne({ username });
  if (existingWarning) {
    if (existingWarning.count === 0) {
      await warnings.deleteOne({ username });
      msg.channel.send(`${username}, you are no longer warned.`);
    } else {
      const newCount = existingWarning.count - 1;
      await warnings.updateOne({ username }, {
        username: username,
        count: newCount,
        note: `${existingWarning.note}\nManually muted by ${msg.author}`
      });
      if (newCount === config.MAX_WARNINGS - 1) unmuteUser(msg, username);
      msg.channel.send(`${username}, you now have ${newCount} warnings. ${getMuteLimitText()}`);
    }
  } else {
    msg.channel.send("That user does not have any warnings.");
  }
}

async function mute(msg) {
  if (!isAdmin(msg.member)) return;
  const tokens = tokenize(msg);
  if (tokens.length === 0) return msg.reply("Please specify a user to mute.");
  const username = tokens[0];
  if(!isValidUserTag(username)) return msg.reply("Please tag the user using @username to mute them.");
  const existingWarning = await warnings.findOne({ username });
  if (existingWarning) {
    await warnings.updateOne({ username }, {
      username: username,
      count: config.MAX_WARNINGS,
      note: `${existingWarning.note}\nManually muted by ${msg.author}`
    });
  } else {
    await warnings.insertOne({
      username: username,
      count: config.MAX_WARNINGS,
      note: `Manually muted by ${msg.author}`
    });
  }
  muteUser(msg, username);
}

async function unmute(msg) {
  if (!isAdmin(msg.member)) return;
  const tokens = tokenize(msg);
  if (tokens.length === 0) return msg.reply("Please specify a user to unmute.");
  const username = tokens[0];
  if(!isValidUserTag(username)) return msg.reply("Please tag the user using @username to unmute them.");
  const existingWarning = await warnings.findOne({ username });
  if (!existingWarning) return msg.channel.send("That user was not muted.");
  await warnings.deleteOne({ username });
  unmuteUser(msg, username);
}

//////////////////// Chat management /////////////

async function purge(msg) {
  if (!isAdmin(msg.member)) return;
  const limit = Number(tokenize(msg)[0]) + 1;
  if (!limit) return msg.reply("Please specify the number of messages to purge.");
  const messages = await msg.channel.fetchMessages({ limit });
  msg.channel.bulkDelete(messages);
  log(msg.author, config.LOGGING.PURGE, msg.content);
}

//////////////////// Handlers ////////////////////

function ready() {
  bot.user.setActivity(config.ACTIVITY_MESSAGE);
  welcomeChannel = bot.channels.get(config.WELCOME_CHANNEL_ID);
  goodbyeChannel = bot.channels.get(config.GOODBYE_CHANNEL_ID);
  testChannel = bot.channels.get(config.TEST_CHANNEL_ID);
  console.log(`Logged in as ${bot.user.tag}!`);
}

function handleAdminCommand(command, msg) {
  if (command === "config") {
    configBot(msg);
  } else if (command === "reset") {
    resetBot(msg);
  } else if (command === "restart") {
    restartBot(msg);
  } else if (command === "warn") {
    warn(msg);
  } else if (command === "warnstatus") {
    warnStatus(msg);
  } else if (command === "unwarn") {
    unwarn(msg);
  } else if (command === "mute") {
    mute(msg);
  } else if (command === "unmute") {
    unmute(msg);
  } else if (command === "purge") {
    purge(msg);
  }
}

// TODO: Figure out better way to handle test commands
function handleCommand(msg) {
  const command = msg.content.substring(config.COMMAND_PREFIX.length).split(" ")[0];
  if (command === "test") {
    test(msg);
  } else if (command === "mh") {
    mh(msg);
  } else if (command === "ping") {
    msg.reply(`pong! I am currently up and running in ${process.env.NODE_ENV} mode.`);
  } else if (isAdmin(msg.member)) {
    handleAdminCommand(command, msg);
  }
}

function handleMessage(msg) {
  if (msg.content.startsWith(config.COMMAND_PREFIX)) {
    handleCommand(msg);
  }
}

function welcome(member) {
  const welcomeEmbed = new Discord.RichEmbed()
    .setColor(2215814)
    .addField(`Welcome to ${config.GUILD_NAME}!`, config.WELCOME_MESSAGE);
  if (config.WELCOME_BG_IMG_URL) welcomeEmbed.setImage(config.WELCOME_BG_IMG_URL);
  welcomeChannel.send(`Hi ${member}!`);
  welcomeChannel.send(welcomeEmbed);
}

function getRandomGoodbye() {
  return config.GOODBYE_MESSAGES[Math.floor(Math.random() * config.GOODBYE_MESSAGES.length)];
}

function goodbye(member) {
  const staticUserInfo = `${member.username}#${member.discriminator}`;
  const memberTag = member.toString().replace("!", "");
  goodbyeChannel.send(`${memberTag} has left the server. ${getRandomGoodbye()}`);
}

//////////////////// Run bot ////////////////////

async function resetBot(msg) {
  config = originalConfig;
  msg.channel.send("Resetting bot configuration...");
  await restart();
  msg.channel.send("Successfully reset!");
}

async function restartBot(msg) {
  msg.channel.send("Restarting...");
  await restart();
  msg.channel.send("Successfully restarted!");
}

async function restart() {
  await bot.destroy();
  await bot.login(process.env.DISCORD_TOKEN);
}

async function main() {
  // await connectToDb();
  bot.on("ready", ready);
  bot.on("message", handleMessage);
  bot.on("voiceStateUpdate", handleMHVoiceJoin);
  bot.on("guildMemberAdd", welcome);
  bot.on("guildMemberRemove", goodbye);
  bot.login(process.env.DISCORD_TOKEN);
}

main();
