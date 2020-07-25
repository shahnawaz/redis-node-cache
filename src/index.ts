import express, { Request, Response, NextFunction } from 'express';
import fetch from 'node-fetch';
import redis from 'redis';

const PORT = process.env.PORT || 5000;
const REDIS_PORT = process.env.REDIS_PORT || '6379';

const client = redis.createClient(REDIS_PORT);

const app = express();

// Set response
function setResponse(username: string, repos: Array<any>) {
    return `<h2>${username} has ${repos.length} Github repos</h2>`;
}

// Make request to Github for data
async function getRepos(req: Request, res: Response, next: NextFunction) {
    try {
        console.log('Fetching data...');
        const { username } = req.params;

        const response = await fetch(`https://api.github.com/users/${username}/repos`);

        let repos = await response.json();

        if (!repos) {
            repos = [];
        }

        // Set data to Redis
        // setex = Set with Expiration
        client.setex(username, 3600, JSON.stringify(repos));

        res.send(setResponse(username, repos));
    } catch(err) {
        console.log(err);
        res.status(500);
    }
}

// Cache middleware
async function cache(req: Request, res: Response, next: NextFunction) {
    const { username } = req.params;

    client.get(username, (err, data) => {
        if (err) {
            throw err;
        }

        if (data !== null) {
            res.send(setResponse(username, JSON.parse(data)));
        } else {
            next();
        }
    })
}

app.get('/repos/:username', cache, getRepos);

app.listen(PORT, () => {
    console.log(`App Listening on Port ${PORT}`);
})