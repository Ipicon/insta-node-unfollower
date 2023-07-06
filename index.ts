import {IgApiClient, IgLoginRequiredError, IgLoginTwoFactorRequiredError} from 'instagram-private-api';
import type {AccountFollowersFeed, AccountFollowingFeed} from 'instagram-private-api';
import {readFileSync, writeFileSync, existsSync, unlinkSync} from 'fs';
import promptSync from 'prompt-sync';
import * as dotenv from 'dotenv';

const prompt = promptSync();
const ig = new IgApiClient();
const serializedSessionFile = 'session.json';

dotenv.config();

const username = process.env.IG_USERNAME;
const password = process.env.IG_PASSWORD;

if (!username || !password) {
    throw new Error('Please provide IG_USERNAME and IG_PASSWORD environment variables!');
}

async function getAllItems(feed: AccountFollowersFeed | AccountFollowingFeed) {
    const items = [];
    let isMoreAvailable = true;

    while (isMoreAvailable) {
        const batch = await feed.items();
        console.log(`Got ${batch.length} items`, batch.map(item => item.username));
        items.push(...batch);

        isMoreAvailable = feed.isMoreAvailable();
        console.log(`More available: ${isMoreAvailable}`);
    }

    return items;
}

async function saveSession() {
    const serialized = await ig.state.serialize();
    writeFileSync(serializedSessionFile, JSON.stringify(serialized));
    console.log('Session saved successfully!');
}

async function loadSession() {
    const serialized = readFileSync(serializedSessionFile, 'utf8');
    await ig.state.deserialize(JSON.parse(serialized));
    console.log('Session loaded successfully!');
}

async function fetchInstagramData() {
    const {pk: accountId} = await ig.account.currentUser();
    const followersFeed = await ig.feed.accountFollowers(accountId);
    const followingFeed = await ig.feed.accountFollowing(accountId);

    const followers = await getAllItems(followersFeed);
    const followees = await getAllItems(followingFeed);

    // Print the results
    console.log(`Followers of ${username}:`, followers.map(follower => follower.username));
    console.log(`Followees of ${username}:`, followees.map(followee => followee.username));
    writeFileSync('followers.json', JSON.stringify(followers, null, 2));
    writeFileSync('followees.json', JSON.stringify(followees, null, 2));
}

(async () => {
        ig.state.generateDevice(username);

        if (existsSync(serializedSessionFile)) {
            await loadSession();
            console.log('Logged in using the loaded session!');
        } else {
            try {
                await ig.account.login(username, password);
                console.log('Logged in successfully!');
            } catch (error) {
                if (error instanceof IgLoginTwoFactorRequiredError) {
                    const twoFactorIdentifier = error.response.body.two_factor_info.two_factor_identifier;
                    console.log('Two factor authentication required!');

                    const verificationCode = prompt('Enter 2FA code: ');
                    await ig.account.twoFactorLogin({
                        username,
                        verificationCode,
                        twoFactorIdentifier,
                        verificationMethod: '1',
                        trustThisDevice: "1",
                    });
                } else {
                    console.log('Login failed!');
                    throw error;
                }
            }
            await saveSession();
        }

        try {
            await fetchInstagramData();
        } catch (error) {
           if (error instanceof IgLoginRequiredError) {
               console.log('Session expired! Try to login again...');
               unlinkSync(serializedSessionFile);
            } else if (error instanceof Error) {
               console.log(error.message);
            }
        }
    }
)();
