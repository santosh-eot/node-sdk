const aws = require('aws-sdk');
const s3 = new aws.S3({ 
    accessKeyId: process.env.accessKeyId,
    secretAccessKey: process.env.secretAccessKey, 
    apiVersion: process.env.apiVersion
});

module.exports.getCSVData = async(key, bucket)=>{
    return new Promise(async(resolve, reject)=>{
        const results = [];
        const params = {
            Bucket: bucket,
            Key: key    
        };
        const s3Stream = s3.getObject(params).createReadStream()
        require('fast-csv').parseStream(s3Stream)
        .on("error", reject)
        .on('data', (data) => {
            results.push({tagName:data[0], startDate: data[1], endDate: data[2]})
        })
        .on('end', () => {
            resolve(results)
        });
    })
}

const days = (date_1, date_2) =>{
    let difference = date_1.getTime() - date_2.getTime();
    let TotalDays = Math.ceil(difference / (1000 * 3600 * 24));
    return TotalDays;
}

module.exports.writeToS3 = async(input) => {
    const weekday = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const d = new Date();
    let day = weekday[d.getDay()];
    var content='';
    var getParams = {
        Bucket: process.env.logBucket, 
        Key: `${day}.log`
    };
    let {Body} = await s3.getObject(getParams).promise();
    content = Body.toString()
    if(content){
        let date1 = content.split(' ')[0];
        date1 = date1.split('\n')[1]
        date1 = date1.split('\t')[0]
        let date_1 = new Date(date1)
        let date_2 = new Date() 
        content = days(date_1, date_2)>1 ? '' : content
        let dateIso = Math.floor(new Date().getTime() * 1000)
    }
    content = content + '\n' + new Date().toISOString() + '\t' + input;
    var putParams = {
        Body: content,
        Bucket: process.env.logBucket, 
        Key: `${day}.log`
     };
    await s3.putObject(putParams).promise();
}

module.exports.sorting = (data)=>{
    return data.sort(function(a,b){
          return new Date(a.startDate) - new Date(b.startDate);
    });
}

module.exports.createGroup = (arr, property) =>{
    return arr.reduce(function(memo, x) {
        if (!memo[new Date(x[property]).toLocaleDateString()]) { memo[new Date(x[property]).toLocaleDateString()] = []; }
        memo[new Date(x[property]).toLocaleDateString()].push(x);
        return memo;
  }, {});
}