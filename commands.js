const { REST, Routes } = require('discord.js');
require('dotenv/config');

const commands = [
  {
    name: 'tracktasks',
    description: 'Starts tracking tasks for your team.'
  },
  {
    name: 'checkusertasks',
    description: 'See what tasks a user is doing right now.',
    options: [
        {
            name:'Username',
            description: 'Username of the player on the team',
            type: 3,
            required: true,
        },
    ],
  },
];

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(Routes.applicationCommands(process.env.BOT_CLIENT_ID), { body: commands });

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();