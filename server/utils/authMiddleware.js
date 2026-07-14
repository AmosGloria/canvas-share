const jwt = require("jsonwebtoken");

function VerifyJWT(token){
    try{
        const decoded = jwt.verify(token, process.env.JWT._SECRET);
        return {valid: true, decoded}
    }
    catch(err){
        return {valid: false, error: err}
    }
}

module.exports = {VerifyJWT}