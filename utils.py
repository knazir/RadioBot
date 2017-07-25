def findUserById(bot, id):
    username = None
    for member in bot.get_all_members():
        member_name = str(member)
        if member_name.endswith(id):
            username = member_name
            break
    return "not here" if username is None else username