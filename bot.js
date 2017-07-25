const Config = require("./config.js");
const Discord = require("discord.js");
const Secrets = require("./secrets.js");

const bot = new Discord.Client();

////////////////////////// Helpers //////////////////////////

function optionPresent(content, optionName) {
  return content.indexOf(`${Config.OPTION_PREFIX}${optionName}`) !== -1;
}

// TODO: Figure out why it replaces all text after a match
function cleanOptions(content) {
  return content.replace(new RegExp(`${Config.OPTION_PREFIX}.+`, "g"), "").replace(/\s\s+/g, " ").trim();
}

function notifyAll(messageContent, shouldNotify) {
  return shouldNotify ? `@everyone ${messageContent}` : messageContent;
}

function askToPlay(message, shouldNotify) {
  let games = message.content.split(" ").slice(shouldNotify ? 1 : 2);
  const argString = games.join(" ");
  if (games.length === 0 || argString.indexOf(",") !== -1) games = argString.split(",").map(game => game.trim());

  if (games.length === 0) return message.channel.send(notifyAll("Who wants to play some vidya gaems!?", shouldNotify));
  if (games.length > 9) return message.reply("That's way too many games...");

  let gamesText = games[0];
  for (let i = 1; i < games.length; i++) {
    const game = games[i];
    if (i === games.length - 1 && games.length !== 1) {
      if (games.length === 2) gamesText += ` or ${game}`;
      else gamesText += `, or ${game}`;
    }
    else gamesText += `, ${game}`;
  }

  return message.channel.send(notifyAll(`Who wants to play some ${gamesText}?`, shouldNotify));
}


////////////////////////// Commands //////////////////////////

function mh(message) {
  const userMap = bot.users.filter(user => user.discriminator === Config.MH_ID);
  if (userMap.size === 0) return message.channel.send("MH was not found.");
  userMap.forEach(user => message.channel.send(`MH is **${user.username}#${user.discriminator}**`));
}

function letsplay(message) {
  const shouldNotify = !optionPresent(message.content, "quiet");
  askToPlay(message, shouldNotify)
    .then(message => {
      message.react("✋");
    })
}

function handleCommand(message) {
  const command = message.content.substring(1).split(" ")[0];
  if (command === "mh") {
    mh(message);
  } else if (command === "letsplay") {
    letsplay(message);
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

bot.on("guildMemberAdd", member => {
  member.guild.defaultChannel.send(`Welcome to Weeknight Radio with Josh, ${member}! Hope you enjoy your stay.`);
});

bot.login(Secrets.Token);
