const Config = require("./config.js");
const Discord = require("discord.js");
const Secrets = require("./secrets.js");

const bot = new Discord.Client();

function mh(message){
  const userMap = bot.users.filter(user => user.discriminator === Config.MH_ID);
  if (userMap.size === 0) return message.channel.send("MH was not found.");
  userMap.forEach(user => message.channel.send(`MH is **${user.username}#${user.discriminator}**`));
}

function handleCommand(message) {
  const command = message.content.substring(1).split(" ")[0];
  if (command === "mh") {
    mh(message);
  }
}

bot.on("ready", () => {
  console.log(`Logged in as ${bot.user.tag}!`);
});

bot.on("message", msg => {
  if (msg.content.startsWith(Config.COMMAND_PREFIX)) {
    handleCommand(msg);
  }
});

bot.login(Secrets.Token);
