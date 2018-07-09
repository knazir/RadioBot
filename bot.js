"use strict";

require("dotenv").config();

const { Bot, Role } = require("simple-bot-discord");
const config = require("./config");

const bot = new Bot({
  name: "RadioBot",
  commandPrefix: "?",
  activityMessage: "Welcome to the show",
  discordToken: process.env.DISCORD_TOKEN
});

//////////////// Roles ////////////////

bot.setRoles({
  radioDj: new Role("Radio DJ", "166688942819639296", true),
  musicTechnician: new Role("Music Technician", "235088799074484224", true),
  aisrCouncil: new Role("AISR Council", "327923960983584768", false)
});

//////////////// Channels //////////////////////

bot.setChannels({
  welcome: config.CHANNELS.WELCOME,
  goodbye: config.CHANNELS.GOODBYE
});

//////////////// Admin commands ////////////////

bot.addCommand("restart", async message => {
  message.channel.send("Restarting...");
  await bot.restart();
  message.channel.send("Successfully restarted!");
}, {
  description: "Restarts the bot.",
  requiresRole: bot.roles.musicTechnician
});

bot.addCommand("purge", async message => {
  const limit = Number(message.tokens[0]) + 1;
  if (!limit) return message.reply("Please specify the number of messages to purge.");
  const messages = await message.channel.fetchMessages({ limit });
  message.channel.bulkDelete(messages);
}, {
  description: "Removes a given number of messages from the current channel.",
  requiresRole: bot.roles.musicTechnician,
  usage: "<number of messages>"
});

//////////////// Miscellaneous /////////////////

bot.addCommand("ping", message => {
  message.reply(`pong! I am currently up and running in ${process.env.NODE_ENV} mode.`)
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

//////////////// Event handlers ////////////////

bot.on(Bot.events.guildMemberAdd, member => bot.channels.welcome.send(`Hi ${member}!`));
bot.on(Bot.events.guildMemberRemove, member => bot.channels.goodbye.send(`${member} has left the server.`));
bot.on(Bot.events.ready, () => console.log(`Logged in as ${bot.client.user.tag}!`));

bot.connect();
