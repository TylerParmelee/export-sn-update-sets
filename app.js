require('dotenv').config();
const fs = require('fs');
const axios = require('axios');
const path = require('path');
const parseString = require('xml2js').parseString;
const instance = process.env.INSTANCE;

const RetrieveFiles = {};

RetrieveFiles.instance = process.env.INSTANCE

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
},

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
        const url = `${this.instance}/api/now/table/u_deployment_package?sysparm_fields=u_type,short_de&sysparm_query=number=${number}`
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

RetrieveFiles.getFilesByUser = function(user) {
    const url = `${this.instance}/api/352714/update_sets/retrieve_update_sets`;
    axios.post(
        url,
        {created_by: user},
        {
            headers: this.headersJSON,
            auth: this.auth
        }
    ).then((response) => {
        this._retrieveXMLRecords(response.data.result);
    }).catch((error) => {
        console.log(error)
    });
}

RetrieveFiles._retrieveXMLRecords = function(ids) {
    const url = `${this.instance}/api/352714/update_sets/get_xml`;
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
        xmlString = result.response.result[0].xmlDoc[0].documentElement[0];
        let encodedString = xmlString.replace('UTF-16', 'UTF-8');
        let fileName = fileData.name + '.xml';
        this._writeFileToDir(fileName, fileData.sys_created_by, encodedString);
    })
}

RetrieveFiles._writeFileToDir = function(fileName, userPath, xmlData) {
    const dirPath = path.join(__dirname, '/update_set_exports');
    const usersPath = `${dirPath}/${userPath}`;

    if(!fs.existsSync(usersPath)) {
        fs.mkdirSync(usersPath);
    }

    fs.writeFileSync(`${usersPath}/${fileName}`, xmlData, {encoding: 'utf-8'}, (err) => {
        if(err) throw err;
        console.log(`${fileName} has been written to ${usersPath}`);
    });
}

RetrieveFiles._readFilesFromDirectory = function(user) {
    const filesPath = path.join(__dirname, `/update_set_exports/${user}`);
    return fs.readdirSync(filesPath);
}

RetrieveFiles.getFilesByUser('admin');

RetrieveFiles.sendToGitLab = function(user, files, projectId) {
    const filesPath = path.join(__dirname, `/update_set_exports/${user}`);
    const url = `https://gitlab.com/api/v4/projects/${projectId}/repository/commits`
    var request = {
        branch: 'dev',
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
        var obj = {
            action: 'create',
            file_path: `${path}/${files[i]}`,
            content: fs.readFileSync(`${path}/${files[i]}`, 'base64'),
        }
        actions.push(obj);
    }
    return actions;
}

// RetrieveFiles.sendToGitLab('admin', RetrieveFiles._readFilesFromDirectory('admin'), '31558220');

