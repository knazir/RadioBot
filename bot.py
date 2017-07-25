from config import *
from secrets import *
from text import *
from utils import *
from discord.ext.commands import Bot

radio_bot = Bot(command_prefix="?")

@radio_bot.event
async def on_read():
    print("Client logged in")

@radio_bot.command()
async def hello(*args):
    return await radio_bot.say("Hello, world!")

@radio_bot.command()
async def letsplay(*args):
    return await radio_bot.say(GAMES)

@radio_bot.command()
async def games(*args):
    return await radio_bot.say(LIST_GAMES)

@radio_bot.command()
async def mh(*args):
    return await radio_bot.say("MH is **" + findUserById(radio_bot, MH_USER_ID) + "**")

radio_bot.run(BOT_SECRET)