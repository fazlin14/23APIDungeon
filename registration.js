const express = require('express');
const registrationRouter = express.Router();
module.exports = registrationRouter;

const bcrypt = require('bcrypt');
const client = require('./database.js');
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');
const { randomise_enemy_skill } = require('./update_enemy.js');
require('dotenv').config(); // Load environment variables

// Middleware for token verification
function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).send('Token is required');
    }

    jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] }, (err, decoded) => {
        if (err) {
            return res.status(403).send('Invalid or expired token');
        }
        req.authData = decoded;
        next();
    });
}

// *LOGIN*
registrationRouter.post('/account/login', async (req, res) => {
    const { player, password } = req.body;

    if (!player || !password) {
        return res.status(400).send('Username and password are required');
    }

    const result = await client.db('ds_db').collection('account').findOne({ player });

    if (!result) {
        return res.status(404).send('User not found');
    }

    const isPasswordValid = bcrypt.compareSync(password, result.password);

    if (isPasswordValid) {
        const token = jwt.sign(
            { _id: result._id, player: result.player },
            process.env.JWT_SECRET,
            { expiresIn: '2h', algorithm: 'HS256' }
        );
        res.json({ token });
    } else {
        res.status(401).send('Incorrect password');
    }
});

// *GET ACCOUNT*
registrationRouter.get('/account/:id', verifyToken, async (req, res) => {
    if (req.authData._id !== req.params.id) {
        return res.status(403).send('User is not authorized');
    }

    const account = await client.db('ds_db').collection('account').findOne({ _id: new ObjectId(req.params.id) });

    if (!account) {
        return res.status(404).send('Account not found');
    }

    res.json({ player: account.player, id: account._id });
});

// *REGISTER*
registrationRouter.post('/account/register', async (req, res) => {
    const { player, password } = req.body;

    if (!player || !password) {
        return res.status(400).send('Username and password are required');
    }

    const exists = await client.db('ds_db').collection('account').findOne({ player });

    if (exists) {
        return res.status(409).send('Player already exists');
    }

    const hash = bcrypt.hashSync(password, 10);

    await client.db('ds_db').collection('account').insertOne({ player, password: hash });
    const enemy = await client.db('ds_db').collection('almanac').aggregate([{ $sample: { size: 1 } }]).toArray();
    const document = enemy[0];
    const skill = await randomise_enemy_skill(document.enemy);

    await client.db('ds_db').collection('stats').insertOne({
        playerId: player,
        health_pts: 10,
        attack_action: 10,
        evade_action: 5,
        inventory: [],
        coin: 10,
        current_score: 0,
        current_enemy: document.enemy,
        enemy_current_health: document.base_health,
        enemy_next_move: skill,
    });

    const user = await client.db('ds_db').collection('account').findOne({ player });
    res.json({ message: 'Account created successfully', userId: user._id });
});

// *LEADERBOARD*
registrationRouter.get('/leaderboard', async (req, res) => {
    const leaderboard = await client.db('ds_db').collection('leaderboard').find().sort({ score: -1 }).toArray();
    res.json(leaderboard);
});

// *FORGOT USER ID*
registrationRouter.post('/account/forgetuserID', async (req, res) => {
    const { player, password } = req.body;

    if (!player || !password) {
        return res.status(400).send('Username and password are required');
    }

    const user = await client.db('ds_db').collection('account').findOne({ player });

    if (!user) {
        return res.status(404).send('User not found');
    }

    if (!bcrypt.compareSync(password, user.password)) {
        return res.status(401).send('Incorrect password');
    }

    res.json({ userId: user._id });
});

// *CHANGE PASSWORD*
registrationRouter.patch('/account/changepassword', async (req, res) => {
    const { player, password, newpassword } = req.body;

    if (!player || !password || !newpassword) {
        return res.status(400).send('All fields are required');
    }

    const user = await client.db('ds_db').collection('account').findOne({ player });

    if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).send('Invalid credentials');
    }

    const hashedPassword = bcrypt.hashSync(newpassword, 10);
    await client.db('ds_db').collection('account').updateOne({ player }, { $set: { password: hashedPassword } });

    res.send('Password changed successfully');
});

// *DELETE ACCOUNT*
registrationRouter.delete('/account/delete/:id', verifyToken, async (req, res) => {
    if (req.authData._id !== req.params.id) {
        return res.status(403).send('User is not authorized');
    }

    const player = await client.db('ds_db').collection('account').findOne({ _id: new ObjectId(req.params.id) });

    if (!player) {
        return res.status(404).send('Player not found');
    }

    const { player: playerName } = player;

    await client.db('ds_db').collection('account').deleteOne({ _id: new ObjectId(req.params.id) });
    await client.db('ds_db').collection('stats').deleteOne({ playerId: playerName });
    await client.db('ds_db').collection('leaderboard').deleteMany({ player: playerName });

    res.send('Account deleted successfully');
});