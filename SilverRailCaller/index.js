var express = require('express');
var soap = require("./soap.js");
var convert = require('xml-js');
const XmlReader = require('xml-reader');
const xmlQuery = require('xml-query');
const fs = require('fs');
var xmlserializer = require('xmlserializer');

app = express()

app.get("/", async (req, res) => {
    res.status(200);
    return res.json("Aren't you naughty, you shouldn't be here");
});

app.get("/bookingInfo", async (req, res) => {
    const query = req.query;
    if(query.ticketID && query.distributor && query.pointOfSale && query.channelCode)
    {
        const ticketData = await soap.getBookingInfo(query.ticketID, query.distributor, query.pointOfSale, query.channelCode);
        console.log(ticketData);
        const departPoint = getTagBody(ticketData, 'originTravelPoint');
        const departTime = getTagBody(ticketData, 'departureDateTime');
        const arrivePoint = getTagBody(ticketData, 'destinationTravelPoint');
        const arriveTime = getTagBody(ticketData, 'arrivalDateTime');
        const trainClass = getTagBody(ticketData, 'serviceClass');
        const carrier = getTagBody(ticketData, 'operatingCarrier');
        const totalPrice = getTagBody(ticketData, 'totalPrice');
        const currency = getAttribute(ticketData,'totalPrice' ,'currency');

        const dataOut = {
          departPoint,
          departTime,
          arrivePoint,
          arriveTime,
          trainClass,
          carrier,
          totalPrice,
          currency
        }

        const ticket = convert.xml2json(ticketData);
        res.status(200);
        return res.json(dataOut);
    }
    res.status(400);
    res.send('Check your paramaters');
   });


app.get("/bookingTicketInfo", async (req, res) => {
  const query = req.query;
  if(query.ticketID && query.distributor && query.pointOfSale && query.channelCode)
  {
    const ticketData = await soap.getBookingInfo(query.ticketID, query.distributor, query.pointOfSale, query.channelCode);
    const ticketableFares = getTag(ticketData, 'ticketableFares');

    const orderID = getAttribute(ticketData, 'order', 'orderID');
    const departureDate = getTagBody(ticketData, 'departureDateTime');
    const arrivalDate = getTagBody(ticketData, 'arrivalDateTime');
    console.log(orderID);

    var result = [];

    ticketableFares.ast[0].children.forEach((kid) => {
      var obj = {
        ticketableFareID: kid.attributes.ticketableFareID,
        fareOrigin: kid.children.filter((info) => info.name=="fareOrigin")[0].children[0].value,
        fareDestination: kid.children.filter((info) => info.name=="fareDestination")[0].children[0].value,
        //date: kid.children.filter((info) => info.name=="passengerReferences")[0].children[0].children.filter((n) => n.name=="fareCodes")[0].children[0].children.filter((x) => x.name=="fareExpirationDateTime")[0].children[0].value,
        orderID: orderID,
        ticketID: query.ticketID,
        departureDate: departureDate,
        arrivalDate: arrivalDate

      }
      result.push(obj);

     });

     res.status(200);
     res.json(result);
    //console.log(ticketableFares.ast[0].children[0].attributes.ticketableFareID);
  }
  res.status(400);
  res.send('Check your parameters');
});

app.get("/cancelSummary", async(req, res) => {
  const query = req.query;
  if(query.ticketID && query.distributor && query.pointOfSale && query.channelCode)
  {
    //get booking records
    /*const confirmationBookingRecordXML = await soap.confirmBookingRecord(query.ticketID, query.distributor, query.pointOfSale, query.channelCode);
    const confirmation = convert.xml2json(confirmationBookingRecordXML);
    console.log("CONF",confirmation);
    */
    //get cancellationSummary
    const cancellationSummary = await soap.getCancellationSummaryInfo(query.ticketID, query.distributor, query.pointOfSale, query.channelCode);

    var cancellationEligibility = getAttribute(cancellationSummary, 'ns2:cancellationSummary', 'isCancellable');
    var partialCancellationEligibility = getAttribute(cancellationSummary, 'ns2:cancellationSummary', 'isPartiallyCancellable');
    var currency = getAttribute(cancellationSummary, 'total', 'currency');
    var penalty = getTagBody(cancellationSummary, 'total');

    var answer = {
      cancellationEligibility: cancellationEligibility,
      partialCancellationEligibility: partialCancellationEligibility,
      penalty: penalty,
      currency: currency
    }
    res.status(200);
    res.json(answer);
  }
  res.status(400);
  res.send('Check your paramaters');
});


  app.get("/approveCancel", async (req, res) => {
  const query = req.query;
  if(query.ticketID)
  {
      var outString = "";
      // Summary
      const cancellationSummary = await soap.getBookingInfo(query.ticketID, query.distributor, query.pointOfSale, query.channelCode);
      console.log(cancellationSummary);
      const refund = await getTagBody(cancellationSummary, 'totalPrice')
      const receiptNumber = await getTagBody(cancellationSummary, 'receiptNumber')
      const currency = await getAttribute(cancellationSummary, 'fee', 'currency')
      const expectedCost = await getTagBody(cancellationSummary, 'fee')
      let approveCancel = await soap.cancelBookingRequest(query.ticketID, query.distributor, query.pointOfSale, query.channelCode, currency, expectedCost);
      let message = await getTagBody(approveCancel, 'message')
      if (message === "Order can not be cancelled.")
      {
        const refundRequest = await processRefundRequest(query.ticketID, query.distributor, query.pointOfSale, query.channelCode, currency, refund, receiptNumber)
        if(refundRequest) {
          outString = "- Refund successful";
        }
        else {
          outString = "- Unable to refund";
        }
        res.status(200);
        return res.send(`Couldn't cancel order ${outString}`);
      }
      // Try 0 cancellation fee
      if (message.includes('does not equal supply channel cancellation fee'))
      {
        approveCancel = await soap.cancelBookingRequest(query.ticketID, query.distributor, query.pointOfSale, query.channelCode, currency, "10.00");
        message = await getTagBody(approveCancel, 'message')
      }
      // Try 0 cancellation fee
      if (message.includes('does not equal supply channel cancellation fee'))
      {
        approveCancel = await soap.cancelBookingRequest(query.ticketID, query.distributor, query.pointOfSale, query.channelCode, currency, "0.00");
        message = await getTagBody(approveCancel, 'message')
      }
      let success = await getTagBody(approveCancel, 'success')

      if(success == "true")
      {
        // Attempt refund
        const refundRequest = await processRefundRequest(query.ticketID, query.distributor, query.pointOfSale, query.channelCode, currency, refund, receiptNumber)
        if(refundRequest) {
          outString = " - Refund successful";
        }
        else {
          outString = " - Could not refund";
        }
        res.status(200);
        return res.send(`Cancelled Successfully ${outString}`);
      }


      return res.send('Something went wrong');
  }
  res.status(400);
  res.send('Check your paramaters');
  });


  app.get("/exchangeSearch", async(req, res) => {
    const query = req.query;
    const request =await soap.exchangeSearchRequest(query.ticketID, query.distributor, query.pointOfSale, query.channelCode, query.orderLocator, query.ticketableFareID, query.startPoint, query.endPoint, query.departureDate, query.arrivalDate);
    var r = convert.xml2json(request);
    let success = await getTagBody(request, 'success')
    let code = await getTagBody(request, 'code')
    if(code == "BK00282")
    {
      return res.send("We couldn't exchange these tickets as they aren't order linked. Please contact customer support.");
    }
    if(success == "false")
    {
      return res.send("You're not able to exchange these tickets; they may be cancelled. Please contact customer support.");
    }
    res.status(200);
    res.json(r);
  });

  function getTag(xml, tag) {
    const parsed = XmlReader.parseSync(xml);
    const value = xmlQuery(parsed).find(tag);
    return value;
  }

  async function processRefundRequest(ticketID, distributor, pointOfSale, channelCode, currency, refund, receiptNumber) {
    const request = await soap.refundBookingRequest(ticketID, distributor, pointOfSale, channelCode, currency, refund, receiptNumber)
    const val = await getTagBody(request, 'success')
    if(val == "true")
    {
      return true;
    }
    return false;
  }

  function getAttribute(xml, tag, attribute) {
    const parsed = XmlReader.parseSync(xml);
    const value = xmlQuery(parsed).find(tag).attr(attribute);
    return value;
  }

  function getTagBody(xml, tag) {
    const parsed = XmlReader.parseSync(xml);
    const value = xmlQuery(parsed).find(tag).first().text();
    return value;
  }

port = 3000;

app.listen(port);

console.log('running on port', port)
