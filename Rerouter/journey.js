var express = require('express');
const axios = require('axios');
const moment = require('moment');
const secrets = require('./secrets')
app = express()

async function getJourney(mode, startingLocation, finishLocation, datetime) {
    try {
      const response = await axios.get(`http://dev.virtualearth.net/REST/V1/Routes/${mode}`, {
        params: {
          'wp.0': startingLocation,
          'wp.1': finishLocation,
          'key': secrets.bingKey,
          'timeType': 'Departure',
          'dateTime': moment(datetime, "MM/DD/YYYY HH:mm:ss").format("MM/DD/YYYY HH:mm:ss")
        }});
      const data = response.data.resourceSets[0].resources[0];

      var journeyInfo = {
        distanceKilometres: data.travelDistance,
        durationMins: Math.floor(data.travelDuration / 60),
        durationMinsWithTraffic: Math.floor(data.travelDurationTraffic / 60),
        routeSteps: data.routeLegs
        //routeProvider: data.route.
      }

      return(journeyInfo)
    } catch (error) {
        console.log(error)
      //return "Route Too Long"
    }
  }

    async function getAllJourneys(startingLocation, finishLocation, date) {
      const walking = await getJourney("Walking", startingLocation, finishLocation, date);
      const transit = await getJourney("Transit", startingLocation, finishLocation, date);
      const driving = await getJourney("Driving", startingLocation, finishLocation, date);

      var json = {
          walkingRoute: walking,
          transitRoute: transit,
          drivingRoute: driving
      }
      return json;
  }


  module.exports = {getAllJourneys}