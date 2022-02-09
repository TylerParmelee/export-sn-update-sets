require('dotenv').config();
const fs = require('fs');
const axios = require('axios');
const path = require('path');
const parseString = require('xml2js').parseString;
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers')

const RetrieveFiles = {};

RetrieveFiles.headersJSON = {
    Accept: 'Application/json',
    'Content-Type': 'Application/json'
}

RetrieveFiles.headersXML = {
    Accept: 'Application/xml',
    'Content-Type': 'Application/json'
}

RetrieveFiles.auth = {
    username: process.env.USER_NAME,
    password: process.env.PASSWORD
}

RetrieveFiles.getFilesByStory = function(stories) {
    stories.forEach(number => {
        const url = `${this.instance}/api/now/table/rm_story?sysparm_fields=number,u_deployment_package&sysparm_query=number=${number}`
        axios.get(
            url,
            {
                headers: this.headersJSON,
                auth: this.auth
            }
        ).then((response) => {
            console.log(response.data.result);
        }).catch((error) => {
            console.log(error)
        });
    });
}

RetrieveFiles._getUpdateSets = function(deploymentPackages) {
    deploymentPackages.forEach(set => {
        const url = `${this.instance}/api/now/table/u_deployment_package?sysparm_fields=short_description&sysparm_query=sys_id=${set}`
        axios.get(
            url,
            {
                headers: this.headersJSON,
                auth: this.auth
            }
        ).then((response) => {
            console.log(response.data.result);
        }).catch((error) => {
            console.log(error)
        });
    });
}

// RetrieveFiles.getFilesByStory(['STRY0010013']);

RetrieveFiles.getFilesByUser = function(user, instance) {
    const url = `${instance}/api/352714/update_sets/retrieve_update_sets`;
    axios.post(
        url,
        {created_by: user},
        {
            headers: this.headersJSON,
            auth: this.auth
        }
    ).then((response) => {
        this._retrieveXMLRecords(response.data.result, instance);
    }).catch((error) => {
        console.log(error)
    });
}

RetrieveFiles._retrieveXMLRecords = function(ids, instance) {
    const url = `${instance}/api/352714/update_sets/get_xml`;
    ids.forEach(id => {
        axios.post(
            url,
            {sys_id: id.sys_id},
            {
                headers: this.headersXML,
                auth: this.auth
            }
        ).then(response => {
            this._getXML(id, response.data);
        }).catch(error => { 
            console.log(error);
        });
    });
}

RetrieveFiles._getXML = function(fileData, xmlData) {
    parseString(xmlData, (err, result) => {
        let xmlString = result.response.result[0].xmlDoc[0].documentElement[0];
        let encodedString = xmlString.replace('UTF-16', 'UTF-8');
        let fileName = fileData.name + '.xml';
        this._writeFileToDir(fileName, fileData.sys_created_by, encodedString);
    })
}

RetrieveFiles._writeFileToDir = function(fileName, userPath, xmlData) {
    if(!fs.existsSync(path.join(__dirname, '/update_set_exports'))) {
        fs.mkdirSync(path.join(__dirname, '/update_set_exports'));
    }

    const dirPath = path.join(__dirname, '/update_set_exports');
    const instancePath = `${dirPath}/${this.instanceShort}`
    const usersPath = `${instancePath}/${userPath}`;

    if(!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath);
    }

    if(!fs.existsSync(instancePath)) {
        fs.mkdirSync(instancePath);
    }

    if(!fs.existsSync(usersPath)) {
        fs.mkdirSync(usersPath);
    }

    fs.writeFileSync(`${usersPath}/${fileName}`, xmlData, {encoding: 'utf-8'});
    console.log(`${fileName} has been written to ${usersPath}`);
}

RetrieveFiles._readFilesFromDirectory = function(user) {
    const filesPath = path.join(__dirname, `/update_set_exports/${this.instanceShort}/${user}`);
    return fs.readdirSync(filesPath);
}

RetrieveFiles.sendToGitLab = function(user, files, projectId) {
    const filesPath = path.join(__dirname, `/update_set_exports/${user}`);
    const url = `https://gitlab.com/api/v4/projects/${projectId}/repository/commits`
    let request = {
        branch: 'main',
        commit_message: 'Committing SN Update Sets',
        actions: this._buildJSON(filesPath, files)
    };
    axios.post(
        url,
        request,
        {
            headers: {
                Accept: 'Application/json',
                'Content-Type': 'Application/json',
                PRIVATE_TOKEN: process.env.PRIVATE_TOKEN
            },
        }
    ).then((response) => {
        console.log(response);
    }).catch(error => { 
        console.log(error);
    })
}

RetrieveFiles._buildJSON = function(path, files) {
    let actions = [];
    for(let i = 0; i < files.length; i++) {
        let obj = {
            action: 'create',
            file_path: `${path}/${files[i]}`,
            content: fs.readFileSync(`${path}/${files[i]}`, 'base64'),
        }
        actions.push(obj);
    }
    return actions;
}

const argv = yargs(hideBin(process.argv)).argv

if(argv.user && argv.instance) {
    RetrieveFiles.instance = `https://${argv.instance}.service-now.com`
    RetrieveFiles.instanceShort = argv.instance;
    RetrieveFiles.getFilesByUser(argv.user, `https://${argv.instance}.service-now.com`);
} else {
    console.log('arguments required - (--user=admin && --instance=dev10001): Please provide arguments to export and save files.');
}

// RetrieveFiles.sendToGitLab('admin', RetrieveFiles._readFilesFromDirectory('admin'), '33251467');

