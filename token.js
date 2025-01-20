// Import required modules
var jwt = require('jsonwebtoken');
require('dotenv').config(); // Load environment variables

// Export the compareToken function
module.exports = { compareToken };

function compareToken(req, res, next) {
    // Extract the token from the Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    // Check if the token exists
    if (token == null) {
        return res.status(401).send('Token is required');
    }

    try {
        // Verify the token using the secret key and allowed algorithms
        let decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });

        // Extract the player field from the decoded token
        let token_name = decoded.player;

        // Check if the token's player matches the playerId in the request body
        if (req.body.playerId === token_name) {
            next(); // Proceed to the next middleware if authorized
        } else {
            res.status(403).send('Unauthorized'); // Send "Forbidden" response if not authorized
        }
    } catch (error) {
        // Handle token verification errors (e.g., expired or invalid token)
        return res.status(400).send('Invalid or expired token');
    }
}