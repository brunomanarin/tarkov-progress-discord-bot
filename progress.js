const request = require('request');

const questsData = require('./data/quests.json')


const token = 'Bearer JircDJYyEjSLSxd4mFhzDY'

let clientData;

request.get(
    'https://tarkovtracker.io/api/v2/progress',

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
            gatherTaskProgress(clientData)
        }
    }
)

const gatherTaskProgress = async (clientData) => {
    console.log(clientData.data.tasksProgress)

    let questsArray = []
    clientData.data.tasksProgress.map(task => {
        const found = questsData.find(questData => questData.gameId === task.id)
        if(found){
            questsArray.push(found.title)
        }
    })
    console.log(questsArray)
}