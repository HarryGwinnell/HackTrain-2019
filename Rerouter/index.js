var express = require('express');
var journey = require("./journey.js");

app = express()

app.get("/", async (req, res) => {
    res.status(200);
    res.json("Aren't you naughty, you shouldn't be here");
});

app.get("/reroute", async (req, res) => {
    const query = req.query;
    if(query.start && query.destination && query.dateTime)
    {
        console.log(query.dateTime)
        const journeys = await journey.getAllJourneys(query.start, query.destination, query.dateTime);
        res.status(200);
        res.json(journeys);
        return;
    }
    res.status(400);
    res.send('Check your paramaters');
   });

port = 3000;

app.listen(port);

console.log('running on port', port)