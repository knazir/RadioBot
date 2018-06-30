const config = {
  // guild
  GUILD_NAME: "Weeknight Radio with Josh",

  // database
  DATABASE_NAME: "bot-db",

  // commands
  COMMAND_PREFIX: "?",
  OPTION_PREFIX: "--",

  // logging
  LOGGING: {
    PURGE: "purge",
    WARN: "warn"
  },

  // media
  WELCOME_BG_IMG_URL: null,

  // warnings
  MAX_WARNINGS: 3,

  // roles
  ADMIN_ROLES: ["Radio DJ", "Music Technician"],

  // channels
  WELCOME_CHANNEL_ID: "163130669701136385",
  GOODBYE_CHANNEL_ID: "163130669701136385",
  AFK_CHANNEL_ID: "163131330022866946",
  TEST_CHANNEL_ID: "462733772618596362",

  // welcome and goodbye
  WELCOME_MESSAGE: "Welcome to **Cleanse**! Please tag one of the _Mistress or Royalty_ members with your in-game " +
  "name using the **@** symbol to receive access!",
  GOODBYE_MESSAGES: ["Cya nerd. :^)", "Later loser.", "Don't let the door hit you on the way out!", "Bye."],

  // misc
  STATUS: "online",
  ACTIVITY_MESSAGE: "You're Done",
  USER_ID_REGEX: /<@[^>]+>/,
  MH: {
    ID: "219988011822219264",
    DISCRIMINATOR: "2024",
    VOICE_LOCKED: false
  }
};

module.exports = config;
