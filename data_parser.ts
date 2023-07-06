import {readFileSync} from 'fs';

export interface InstagramUser {
    pk: number;
    username: string;
}


(async () => {
    const followers: InstagramUser[] = JSON.parse(readFileSync('followers.json', 'utf8'));
    const followees: InstagramUser[] = JSON.parse(readFileSync('followees.json', 'utf8'));

    console.log("followers count:", followers.length);
    console.log("followees count:", followees.length);

    const notFollowingBack = followees.filter(followee => !followers.find(follower => follower.pk === followee.pk));
    console.log("not following back count:", notFollowingBack.length);
    console.log("not following back:", notFollowingBack.map(user => user.username));
})();
