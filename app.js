const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "cricketMatchDetails.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen("3003", () => {
      console.log("Server Running at http://localhost:3003/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

const convertPlayerDetailsToResponseObj = (dbObject) => {
  return {
    playerId: dbObject.player_id,
    playerName: dbObject.player_name,
  };
};

const convertMatchDetailsToResponseObj = (dbObject) => {
  return {
    matchId: dbObject.match_id,
    match: dbObject.match,
    year: dbObject.year,
  };
};

//1 Returns a list of all the players in the player table
app.get("/players/", async (request, response) => {
  const getPlayerQuery = `SELECT * FROM player_details;`;
  const allPlayers = await db.all(getPlayerQuery);
  response.send(
    allPlayers.map((playerDetails) =>
      convertPlayerDetailsToResponseObj(playerDetails)
    )
  );
});

//2 Returns a specific player based on the player ID

app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerQuery = `SELECT * FROM player_details 
    WHERE player_id = ${playerId}`;
  const playerDetails = await db.get(getPlayerQuery);
  response.send(convertPlayerDetailsToResponseObj(playerDetails));
});

//3 Updates the details of a specific player based on the player ID

app.put("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const { playerName } = request.body;
  const updatedPlayerQuery = `UPDATE player_details
    SET player_name = '${playerName}'
    WHERE player_id = ${playerId};`;
  await db.run(updatedPlayerQuery);
  response.send("Player Details Updated");
});

//4 Returns the match details of a specific match

app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;
  const getMatchDetails = `SELECT * FROM match_details
    WHERE match_id = ${matchId};`;
  const matchDetails = await db.get(getMatchDetails);
  response.send(convertMatchDetailsToResponseObj(matchDetails));
});

//5 Returns a list of all the matches of a player

app.get("/players/:playerId/matches", async (request, response) => {
  try {
    const { playerId } = request.params;
    const getAllPlayers = `SELECT * FROM 
    player_match_score NATURAL JOIN match_details
    WHERE player_id = ${playerId};`;
    const playerMatches = await db.all(getAllPlayers);
    response.send(
      playerMatches.map((players) => convertMatchDetailsToResponseObj(players))
    );
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
});

//6 Returns a list of players of a specific match

app.get("/matches/:matchId/players", async (request, response) => {
  const { matchId } = request.params;
  const getSpecificPlayers = `SELECT * FROM player_match_score
    NATURAL JOIN player_details 
    WHERE 
    match_id = ${matchId};`;
  const allPlayers = await db.all(getSpecificPlayers);
  response.send(
    allPlayers.map((players) => convertPlayerDetailsToResponseObj(players))
  );
});

//7 Returns the statistics of the total score, fours, sixes of a specific player based on the player ID

app.get("/players/:playerId/playerScores/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerScored = `
    SELECT
    player_details.player_id AS playerId,
    player_details.player_name AS playerName,
    SUM(player_match_score.score) AS totalScore,
    SUM(fours) AS totalFours,
    SUM(sixes) AS totalSixes FROM 
    player_details INNER JOIN player_match_score ON
    player_details.player_id = player_match_score.player_id
    WHERE player_details.player_id = ${playerId};
    `;
  const playerDetails = await db.get(getPlayerScored);
  response.send(playerDetails);
});

module.exports = app;
