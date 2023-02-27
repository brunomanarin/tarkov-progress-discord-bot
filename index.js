const {Client, GatewayIntentBits } = require('discord.js')
const request = require('request')
const fs = require('fs')
require('dotenv/config')

const questsData = require('./data/quests.json')
const hideoutData = require('./data/hideout-modules.json')

const token = `Bearer ${process.env.TARKOV_API_TOKEN}`


const client = new Client({
    intents:[
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
})

let clientData;

client.on('ready', async () =>{
    await fs.readFile('./data/teamdata.json', 'utf8', function(err, data){
        if(err || !data){
            console.log('Data file not found. Creating a new one.')
            request.get(
                'https://tarkovtracker.io/api/v2/team/progress',
    
                {   
                    headers: {
                    'Authorization': token
                    },
                },
                async (error, response, body) => {          
                    if(response?.statusCode !== 200){
                        throw console.error('ERROR! API RETRIEVAL ERROR. CHECK CONFIG.')
                    }
                    if (!error && response.statusCode == 200) {
                        clientData = JSON.parse(await body);
                        writeToPersistence(await body);
                        console.log('Data Loaded from API, bot ready.')
                    }
                }
            )
        } else {
            console.log('Local data found.')
            clientData = JSON.parse(data);
            console.log('Data loaded from file, bot ready.')
        } 
    });
})

const gatherTaskProgress = (clientData) => {
    let quests = ''
    clientData.data.tasksProgress.map(task => {
        const found = questsData.find(questData => questData.gameId === task.id)
        if(found){
            quests += `- ${found.title} \n`
        }
    })
    return quests;
}

const gatherUserCurrentTasks = async (interaction) => {
    let unfinishedQuests = ''
    clientData.data.map(async userData => {
        console.log(userData.displayName.toLowerCase(), interaction.options.getString('username').toLowerCase())
        console.log(userData.displayName.toLowerCase() === interaction.options.getString('username').toLowerCase())
        if(userData.displayName.toLowerCase() === interaction.options.getString('username').toLowerCase()){
            userData.tasksProgress.map( taskProgress => {
                if(!taskProgress.complete){
                        unfinishedQuests += `- ${getTaskNameFromFile(taskProgress.id)} \n`
                }
            })
            return interaction.reply(unfinishedQuests);
        }
    })
    return interaction.reply('User not found.')
}

const writeToPersistence = (data) => {
    fs.writeFile('./data/teamdata.json', JSON.stringify(data), 'utf8', (err)=> {
        if(err){
            return console.log('Something went wrong when writing persistence file to disk. Please check it immediately.')
        }
        
        return console.log("File updated sucessfully.");
    });
}

const trackTasks = async (interaction) => {
    setInterval(()=>{
            request.get(
                'https://tarkovtracker.io/api/v2/team/progress',
        
                {   
                    headers: {
                    'Authorization': token
                    },
                },
                async (error, response, body) => {          
                    if(response?.statusCode !== 200){
                        throw console.error('ERROR! API RETRIEVAL ERROR. CHECK CONFIG.')
                    }
                    if (!error && response.statusCode == 200) {
                        let newClientData = JSON.parse(await body);
                        compareTeamProgress(clientData, newClientData, interaction);
                        console.log('API data updated.')
                    }
                }
            )
    }, 10000)          
}

const compareTeamProgress = (oldClientData, newClientData, interaction) =>{

    newClientData.data.map((client, clientIndex) => {
        if(client.userId === oldClientData.data[clientIndex]?.userId){
            console.log(`Found user: ${client.displayName}.`)

            const isPlayerLevelUpdated = comparePlayerLevel(client.playerLevel, oldClientData.data[clientIndex]?.playerLevel, client.displayName, interaction)

            const isPlayerHideoutModulesUpdated = comparePlayerData(client.hideoutModulesProgress, oldClientData.data[clientIndex]?.hideoutModulesProgress, client.displayName, 'hideout', interaction)

            const isPlayerTaskListUpdated = comparePlayerData(client.tasksProgress, oldClientData.data[clientIndex]?.tasksProgress, client.displayName, 'tasks', interaction)

            if(isPlayerLevelUpdated || isPlayerHideoutModulesUpdated || isPlayerTaskListUpdated){
                clientData = newClientData
                writeToPersistence(newClientData)
                return console.log(`Found new data found for ${client.displayName} and wrote it to file.`)
            } else {
                return console.log(`No new data found for ${client.displayName}.`)
            }

            
        }
        clientData = newClientData;
        return console.log('New Team member found.')
    })
}

const comparePlayerLevel = (newPlayerLevel, oldPlayerLevel, playerName, interaction) =>{
    if(newPlayerLevel !== oldPlayerLevel){
        console.log(`${playerName} changed his level from ${oldPlayerLevel} to ${newPlayerLevel}. \n`)

        if(newPlayerLevel > oldPlayerLevel){
            interaction.reply(`${playerName} leveled up to ${newPlayerLevel}.`)
        }
        return true
    }
    return false

}

const comparePlayerData = ( newPlayerDataArray, oldPlayerDataArray, playerName, typeOfData, interaction ) => {
    let newIdsFound = '';

    newPlayerDataArray.map((newData) =>{ 
        const isNewClientDataEqualToOld = oldPlayerDataArray.some(oldData => newData.id === oldData.id && newData.complete === oldData.complete)
        if(!isNewClientDataEqualToOld){
            newIdsFound += `${getNameFromIdFile(newData.id, typeOfData)} \n`
        }
    })

    if(newIdsFound !== ''){
        if(newIdsFound.length < 1950){
            interaction.reply(`${playerName} just completed the ${typeOfData === 'hideout' ? 'hideout module' : 'task'}(s): ${newIdsFound}`)
        } else {
            interaction.reply(`${playerName} had to many new ${typeOfData === 'hideout' ? 'hideout module' : 'task'}s. I couldn't properly show them because of Discord's character limits.`)
        }
        return true
    }
    return false
}

const getNameFromIdFile = (Id, typeOfData) => {

    const isNameAvailable = typeOfData === 'hideout' ? hideoutData.find(moduleData => Id.includes(moduleData.id)) : questsData.find(questData => questData.gameId === Id)

    if(!isNameAvailable){
        return `Unknown ${typeOfData === 'hideout' ? 'Hideout Module' :  'Task'}.`
    }

    return typeOfData === 'hideout' ? `${isNameAvailable.title} level ${Id.substring(Id.length - 1)}.` : isNameAvailable.title
}

client.on('messageCreate', async (message) => {
    const command = '+trackProgress'
    if(message.content === command || message.content.toLowerCase() === command.toLowerCase() || message.content.toUpperCase() === command.toUpperCase()){ 
        await trackTasks(message);
        return message.reply(`Set, now tracking this team's progress.`)
    }

})

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if(interaction.commandName === 'tracktasks'){ 
        await interaction.reply(`This command is deprecated. Please message me '+trackProgress' instead to monitor your team's progress.`)
    }



});


client.login(process.env.BOT_TOKEN)


