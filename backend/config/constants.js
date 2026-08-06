//For points economy, values due to change so no other file should hardcode this for now
export const POINTS ={
    SUBMISSION: 10, //awarded when a potential anomaly is submitted
    VERIFIED: 50,   //awarded when an overseer verifies it
}

//Blocklist, not an allowlist: anything not named here can still authenticate.
//'Reassigned' is deliberately absent; transferred but functional.
export const LOCKED_OUT_STATUSES = ['MIA', 'Deceased'];

//Rank is computed from points so it's not stored on a user doc and
//the threshold is minimum points, checked highest to lowest.
export const RANKS = [
    { title: 'Site Director', minPoints: 400 },
    { title: 'Containment Specialist', minPoints: 150 },
    { title: 'Field Agent', minPoints: 50 },
    { title: 'Recruit', minPoints: 0},
];

//One function, used by roster routes+anywhere rank is shown
//Fallback matters: negative or undefined points match no threshold, and without
//it .find() returns undefined and .title throws - which 500s the whole roster
//because rank is computed inside a map() over every user.
export function rankForPoints(points) {
    return (RANKS.find((rank) => points >= rank.minPoints) ?? RANKS.at(-1)).title;
}