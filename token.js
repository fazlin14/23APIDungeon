var jwt = require('jsonwebtoken');

module.exports = { compareToken }

function compareToken(req, res, next) {

    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(` `)[1]

    if (token == null) return res.sendStatus(401)

    try {
        
        let decoded = jwt.verify(token, 'chiikawaaaaaaa')
        
        let token_name = decoded.player

        if(req.body.playerId == token_name) {
            next()
        }
        else {
            res.send('Unauthorized')
        }

    } catch (error) {
        return res.status(400).send(error.message);
    }
}