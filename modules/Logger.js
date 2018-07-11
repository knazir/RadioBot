"use strict";

const { RichEmbed } = require("discord.js");
const { Module } = require("simple-bot-discord");

module.exports = class Logger extends Module {
  constructor({ logCollection, auditChannelName }) {
    super();
    this._logCollection = logCollection;
    this._auditChannelName = auditChannelName;
  }

  getKey() {
    return "logger";
  }

  async commandFinished(command, message, bot) {
    const useLogger = command.options.useLogger;
    if (!useLogger) return;
    const log = await this._createDatabaseLog(command, message, bot);
    if (!this._auditChannelName) return;
    this._postToAuditChannel(log, bot);
  }

  async _createDatabaseLog(command, message, bot) {
    if (!bot.modules.mongodb) throw new Error("The MongoDB module is not enabled.");
    const log = {
      user: message.author.toString(),
      channel: message.channel.toString(),
      command: `**${command.key}**`,
      message: message.tokens.length > 0 ? `\`${message.content}\`` : null,
      time: new Date()
    };
    await bot.modules.mongodb.addToCollection(this._logCollection, log);
    return log;
  }

  _postToAuditChannel(log, bot) {
    const { user, channel, command, message, time } = log;
    const auditEmbed = new RichEmbed().setColor(11191551);
    auditEmbed.addField("User", user);
    auditEmbed.addField("Channel", channel);
    auditEmbed.addField("Command", command);
    if (message) auditEmbed.addField("Message", message);
    auditEmbed.addField("Time", time.toLocaleString());
    bot.channels[this._auditChannelName].send(auditEmbed);
  }
};