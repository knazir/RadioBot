require("dotenv").config();

const Api = require("./api");
const Config = require("./config.js");
const Discord = require("discord.js");
const table = require("text-table");

const bot = new Discord.Client();

////////////////////////// Helpers //////////////////////////

function userTag(userId) {
  return `<@${userId}>`;
}

function optionPresent(content, optionName) {
  return content.indexOf(`${Config.OPTION_PREFIX}${optionName}`) !== -1;
}

function containsWord(word, content) {
  return content.toLowerCase().split(" ").indexOf(word) !== -1;
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

  // Get rid of empty strings
  games = games.filter(game => game);

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

function pubgStatRow(stat) {
  return [stat.label, stat.displayValue, stat.percentile, stat.rank || ""];
}


////////////////////////// Commands //////////////////////////

function mh(message) {
  message.channel.send("I have absolutely no fucking clue who `MH` is");
  // const userMap = bot.users.filter(user => user.discriminator === Config.MH_DISCRIMINATOR);
  // if (userMap.size === 0) return message.channel.send("MH was not found.");
  // userMap.forEach(user => message.channel.send(`MH is **${user.username}#${user.discriminator}**`));
}

function letsplay(message) {
  const shouldNotify = !optionPresent(message.content, "quiet");
  askToPlay(message, shouldNotify)
    .then(message => {
      message.react("✋");
    })
}

async function pubg(message) {
  const args = message.content.split(" ").slice(1);
  const nickname = args[0];
  if (!nickname) return message.channel.send(`Please specify the **garbage** player's PUBG name: \`${Config.COMMAND_PREFIX}pubg <name> <mode> <region>\``);

  const result = await Api.pubgProfile(nickname);
  const match = args[1] || Config.PUBG_DEFAULT_MATCH;
  const region = args[2] || Config.PUBG_DEFAULT_REGION;
  const gameModeStats = result.Stats.filter(stat => {
    return stat.Region.toUpperCase() === region.toUpperCase() && stat.Match.toUpperCase() === match.toUpperCase();
  });

  if (gameModeStats.length === 0) {
    return message.reply(`sorry, I couldn't find any stats for \`${nickname}\` in \`${region}\` for the game type \`${match}\``);
  }

  let profileInfo = (`\`\`\`
    Name: ${result.PlayerName}
    Last Updated: ${new Date(result.LastUpdated).toDateString()}
    Region: ${region.toUpperCase()}
    
    (Name, Percentile, Rank)
    `).split("\n").map(line => line.trim()).join("\n");

  profileInfo += table(gameModeStats[0].Stats.map(stat => pubgStatRow(stat)));
  profileInfo += "\n```";

  message.channel.send(profileInfo)
    .catch(() => message.reply(`whoops, the message was too long for me to send (${profileInfo.length} characters).`));
}

function ramsay(message){
  const toMH = optionPresent(message.content, "mh");
  const insult = Config.RAMSAY_INSULTS[Math.floor(Math.random() * Config.RAMSAY_INSULTS.length)];
  const response = `${toMH ? `${userTag(Config.MH_ID)} ` : ""}${insult}`;
  message.channel.send(response);
}

function rage(message) {
  message.channel.send("FUCK THIS GAME AND EVERYTHING IT STANDS FOR");
}

function overlord(message) {
  message.channel.send("Our lord and savior, Radio DJ <@90599323728900096>");
}


////////////////////////// Text Processing //////////////////////////

function ayy(message) {
  let lmao = "lma";
  const ys = message.content.substring(message.content.indexOf("y"));
  for (let i = 0; i < ys.length; i++) {
    if (ys[i] === ys[i].toUpperCase()) lmao += "O";
    else lmao += "o";
  }
  message.channel.send(lmao);
}

function lit(message) {
  message.react("🔥");
}


////////////////////////// Main //////////////////////////

function handleCommand(message) {
  const command = message.content.substring(1).split(" ")[0];
  if (command === "mh") {
    mh(message);
  } else if (command === "letsplay") {
    letsplay(message);
  } else if (command === "pubg") {
    pubg(message);
  } else if (command === "ramsay") {
    ramsay(message);
  } else if (command === "rage") {
    rage(message);
  } else if (command === "overlord") {
    overlord(message);
  }
}

bot.on("ready", () => {
  console.log(`Logged in as ${bot.user.tag}!`);
});

bot.on("message", message => {
  if (message.content.startsWith(Config.COMMAND_PREFIX)) {
    handleCommand(message);
  } else if (/^a+y+$/i.test(message.content)) {
    let lmao = "lma";
    const ys = message.content.substring(message.content.indexOf("y"));
    for (let i = 0; i < ys.length; i++) {
      if (ys[i] === ys[i].toUpperCase()) lmao += "O";
      else lmao += "o";
    }
    message.channel.send(lmao);
    ayy(message);
  } else if (containsWord("lit", message.content) || containsWord("fire", message.content)) {
    lit(message);
  }
});

bot.on("guildMemberAdd", member => {
  member.guild.defaultChannel.send(`Welcome to Weeknight Radio with Josh, ${member}! Hope you enjoy your stay.`);
});

bot.login(process.env.DISCORD_TOKEN);
