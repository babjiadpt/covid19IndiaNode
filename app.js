const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "covid19India.db");
let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server started at http://localhost3000");
    });
  } catch (e) {
    console.log(`DB ERROR: ${e.message}`);
  }
};

initializeDbAndServer();

const convertDbObjectToResponseObject = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};

const convertDistrictDbObjectToResponseObject = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

//Returns a list of all states in the state table API
app.get("/states/", async (request, response) => {
  const getStatesDetailsQuery = `
    SELECT * FROM state`;
  const responseStatesArray = await db.all(getStatesDetailsQuery);
  response.send(
    responseStatesArray.map((eachState) =>
      convertDbObjectToResponseObject(eachState)
    )
  );
});

//Returns a state based on the state ID
app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const stateDetailQuery = `
    SELECT * FROM
        state
    WHERE 
        state_id = ${stateId}`;
  const stateObject = await db.get(stateDetailQuery);
  response.send(convertDbObjectToResponseObject(stateObject));
});

//Create a district in the district table API
app.post("/districts/", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;

  const addDistrictDetailsQuery = `
    INSERT INTO 
        district (district_name, state_id, cases, cured, active, deaths)
    VALUES (
             '${districtName}', 
             '${stateId}', 
              ${cases},
             '${cured}',
             '${active}',
             '${deaths}'
             );`;

  await db.run(addDistrictDetailsQuery);
  response.send("District Successfully Added");
});

//Returns a district based on the district ID API
app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const districtDetailQuery = `
    SELECT * FROM
        district
    WHERE 
        district_id = ${districtId}`;
  const districtObject = await db.get(districtDetailQuery);
  response.send(convertDistrictDbObjectToResponseObject(districtObject));
});

//Deletes a district from the district table based on the district ID API
app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrictQuery = `
    DELETE FROM district
    WHERE
        district_id = ${districtId}`;
  await db.run(deleteDistrictQuery);
  response.send("District Removed");
});

//Updates the details of a specific district based on the district ID API
app.put("/districts/:districtId/", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const { districtId } = request.params;
  const updateDistrictQuery = `
  UPDATE 
        district
  SET
       district_name = '${districtName}',
       state_id = '${stateId}',
       cases = ${cases},
       cured = '${cured}',
       active = '${active}',
       deaths = '${deaths}'
  WHERE 
        district_id = ${districtId};`;

  await db.run(updateDistrictQuery);
  response.send("District Details Updated");
});

//Returns the statistics of total cases, cured, active, deaths of a specific state based on state ID API
app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getStateStatsQuery = `
    SELECT
        SUM(cases) AS  totalCases, 
        SUM(cured) AS  totalCured,
        SUM(active) As totalActive,
        SUM(deaths) AS totalDeaths
    FROM
        district
    WHERE
        state_id = ${stateId}`;

  const statsObject = await db.get(getStateStatsQuery);
  response.send(statsObject);
});

//Returns an object containing the state name of a district based on the district ID API
app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getStateNameQuery = `
    SELECT
      state_name
    FROM
      district
    NATURAL JOIN
      state
    WHERE 
      district_id=${districtId};`;
  const state = await db.get(getStateNameQuery);
  response.send({ stateName: state.state_name });
});

module.exports = app;
