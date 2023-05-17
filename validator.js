
exports.validateParams = async(checkObj)=>{
    for (let key in checkObj ){
        if(!checkObj[key]){
            return {message:`${key} is required and must be a correct format`}
        }
        if (key === 'groupName') {
            const regexExp = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/gi;
            if (!regexExp.test(checkObj[key])) {
                return { message: `${key} must be a uuid string"` };
            }
        }
        if (key === 'startDate' || key === 'endDate') {
            if (!Date.parse(checkObj[key])) {
                return { message: `${key} must be a valid ISO 8601 timestamp` };
            }
        }
    }
    return true

}