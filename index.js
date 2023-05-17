console.log('Loading function');
        
const aws = require('aws-sdk');
const tt = require('@santosheot/tt-sdk');
const { v4: uuidv4 } = require('uuid');
const {getCSVData, writeToS3, sorting, createGroup} = require('helper');
const {validateParams} = require('validate');
 const crypto = require('crypto');

const s3 = new aws.S3({ 
    accessKeyId: process.env.accessKeyId,
    secretAccessKey: process.env.secretAccessKey, 
    apiVersion: process.env.apiVersion
});

exports.handler = async (event, context) => {
    const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
    const bucket = event.Records[0].s3.bucket.name;
    const TwinTalk = new tt({ 
        baseUrl: process.env.baseUrl,
        auth: process.env.auth
    });
    try{
        await writeToS3('reading from csv started')
        const data = await getCSVData(key, bucket);
        data.shift();
        const sortedData = sorting(data)
        // return console.log(sortedData)
        const groupObject = createGroup(sortedData, 'endDate')
        let newGroup = {}
        // return console.log(groupObject)
        for(let i in groupObject ){
            let subchunk = []
            while(groupObject[i].length>0){
                subchunk.push(groupObject[i].splice(0,process.env.sizeOfGroup))
            }
            for(let j in subchunk){
                newGroup[i+'-'+j] = subchunk[j]
            }
        }
        // return console.log(newGroup)
        let dateArray = Object.keys(newGroup)
        let chunk = []
        while (dateArray.length > 0) {
            chunk.push(dateArray.splice(0,process.env.sizeOfChunk))
        }
        // return console.log(chunk.length)
        let result = []
        console.log('start')
        for(let i in chunk){
            // console.log('111', i)
            // return console.log(chunk[i])
            let response = await Promise.all(chunk[i].map(async(record)=>{
                let currentRecord = newGroup[record]
                // return console.log(newGroup[record])
                let tagName = currentRecord.map(o=>o.tagName)
                // return console.log(tagName)
                // let groupName = uuidv4();
                let groupName = `Group-${i}`
                const hashData = `${groupName} ${currentRecord[0].startdate} ${currentRecord[0].enddate}`;
                const hash = crypto.createHash('md5').update(hashData).digest('hex');
                let creatGroupResponse = await TwinTalk.CreateGroupByQuery(groupName, tagName);
                creatGroupResponse.tag = tagName
                console.log(creatGroupResponse)
                await writeToS3(`${hash} \t group created ${groupName}, number tages registered ${creatGroupResponse.registered} and registered tage are ${tagName}`)
                let getRecordResponse = await TwinTalk.GetRecordedVals(groupName, currentRecord[0].startDate, currentRecord[0].endDate, '', 'S3', process.env.historicalDataS3, 'workshopdata/100/Node/$DATEDIR_SellableVolume_MostRecent_$SEC_addon', 'rowathena', '{"Method" : "recent", "CalcDate": "$DATE" , "Frequency": "one time", "Source":"TT Pi (BPX): $GROUPNAME"}');
                console.log(getRecordResponse)
                await writeToS3(`${hash} \t reading from group ${groupName} and nBytesUploaded is ${getRecordResponse.nBytesUploaded}`)
                let deleteResponse = await TwinTalk.DeleteGroupReq(groupName);
                console.log(deleteResponse)
                await writeToS3(`${hash} \t group deleted ${groupName}`)
                return({creatGroupResponse, getRecordResponse, deleteResponse});
            }));
            result.push(response)
        }
        console.log('end')
        return {
            statusCode: 200,
            body: 'finished'
        };
    } 
    catch (err) {
        console.log(err);
        const message = `Error getting object ${key} from bucket ${bucket}. Make sure they exist and your bucket is in the same region as this function.`;
        // console.log(message);
        throw new Error(message);
    }
};