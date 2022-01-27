require('dotenv').config();
const fs = require('fs');
const axios = require('axios');
const path = require('path');
const parseString = require('xml2js').parseString;
const instance = process.env.INSTANCE;

const url = `${instance}/api/352714/update_sets/retrieve_update_sets`;

const RetrieveFiles = {};

RetrieveFiles.getFilesByUser = function(user) {
    axios.post(
        url,
        {created_by: user},
        {
            headers: {
                Accept: 'Application/json',
                'Content-Type': 'Application/json'
            },
            auth: {
                username: process.env.USER_NAME,
                password: process.env.PASSWORD
            },
        }
    ).then((response) => {
        this.retrieveXMLRecords(response.data.result);
    }).catch((error) => {
        console.log(error)
    });
}

RetrieveFiles.retrieveXMLRecords = function(ids) {
    ids.forEach(id => {
        const url = `${instance}/api/352714/update_sets/get_xml`;
        axios.post(
            url,
            {sys_id: id.sys_id},
            {
                headers: {
                    Accept: 'Application/xml',
                    'Content-Type': 'Application/json'
                },
                auth: {
                    username: process.env.USER_NAME,
                    password: process.env.PASSWORD
                },
            }
        ).then(response => {
            this.getXML(id, response.data);
        }).catch(error => { 
            console.log(error);
        });
    });
}

RetrieveFiles.getXML = function(fileData, xmlData) {
    parseString(xmlData, (err, result) => {
        xmlString = result.response.result[0].xmlDoc[0].documentElement[0];
        let encodedString = xmlString.replace('UTF-16', 'UTF-8');
        let fileName = fileData.name + '.xml';
        this.writeFileToDir(fileName, fileData.sys_created_by, encodedString);
    })
}

RetrieveFiles.writeFileToDir = function(fileName, userPath, xmlData) {
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

RetrieveFiles.getFilesByUser('admin');

