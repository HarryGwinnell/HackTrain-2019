var axios = require("axios");
var express = require("express");
app = express();
var https = require("https");
var fs = require("fs");
var soap = require("soap");
var request = require("request");
//var convert = require('xml-js');

var agent = new https.Agent({
  cert: fs.readFileSync("./cert.pem"),
  key: fs.readFileSync("./key.pem"),
  passphrase: "",
  rejectUnauthorized: false,
});

const instance = axios.create({
  baseURL: "https://xml-cert-nex.railgds.net/booking-ws/services/Booking",
  timeout: 100000,
  httpsAgent: new https.Agent({
    cert: fs.readFileSync("./cert.pem"),
    key: fs.readFileSync("./key.pem"),
    rejectUnauthorized: false,
  }),
});

function formatDate(date) {
  var d = new Date(date),
    month = "" + (d.getMonth() + 1),
    day = "" + d.getDate(),
    year = d.getFullYear();

  if (month.length < 2) month = "0" + month;
  if (day.length < 2) day = "0" + day;

  return [year, month, day].join("-");
}

async function getBookingInfo(ticketId, distributor, pointOfSale, channelCode) {
  let xmls = `
   <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns="http://railgds.net/ws/commontypes" xmlns:book="http://railgds.net/ws/booking">
      <soapenv:Header />
      <soapenv:Body>
         <book:retrieveBookingRecordRequest>
            <context>
               <distributorCode>${distributor}</distributorCode>
               <pointOfSaleCode>${pointOfSale}</pointOfSaleCode>
               <channelCode>${channelCode}</channelCode>
            </context>
            <book:recordLocator>${ticketId}</book:recordLocator>
            <book:responseSpec>
               <book:includeOrderDetails>true</book:includeOrderDetails>
               <book:includeOrderCosts>true</book:includeOrderCosts>
               <book:includePassengerDetails>true</book:includePassengerDetails>
               <book:includeFinancials>true</book:includeFinancials>
               <book:includePaymentRequirements>true</book:includePaymentRequirements>
               <book:includeTicketingOptions>true</book:includeTicketingOptions>
               <book:includeNotes>true</book:includeNotes>
               <book:includeFulfillmentInformation>true</book:includeFulfillmentInformation>
            </book:responseSpec>
         </book:retrieveBookingRecordRequest>
      </soapenv:Body>
   </soapenv:Envelope>`;

  var r = await instance
    .post("/v2?wsdl", xmls, { headers: { "Content-Type": "text/xml" }, agent })
    .then((res) => {
      return res.data;
    })
    .catch((err) => {
      console.log(err);
      return "Error";
    });
  return r;
}

async function getCancellationSummaryInfo(
  ticketId,
  distributor,
  pointOfSale,
  channelCode
) {
  console.log("XOXOXO", distributor, pointOfSale, channelCode, ticketId);
  let xmls = `
     <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:book="http://railgds.net/ws/booking" xmlns="http://railgds.net/ws/commontypes">
       <soapenv:Header/>
       <soapenv:Body>
          <book:retrieveCancellationSummaryRequest>
             <context>
                <distributorCode>${distributor}</distributorCode>
                <pointOfSaleCode>${pointOfSale}</pointOfSaleCode>
                <channelCode>${channelCode}</channelCode>
             </context>
             <book:recordLocator>${ticketId}</book:recordLocator>
          </book:retrieveCancellationSummaryRequest>
       </soapenv:Body>
    </soapenv:Envelope>`;

  var r = await instance
    .post("/v2?wsdl", xmls, { headers: { "Content-Type": "text/xml" }, agent })
    .then((res) => {
      return res.data;
    })
    .catch((err) => {
      console.log(err);
      return "Error";
    });
  return r;
}

async function confirmBookingRecord(
  ticketId,
  distributor,
  pointOfSale,
  channelCode
) {
  console.log("ZOZOZO", distributor, pointOfSale, channelCode, ticketId);
  let xmls = `
     <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:book="http://railgds.net/ws/booking" xmlns="http://railgds.net/ws/commontypes">
       <soapenv:Header/>
       <soapenv:Body>
          <book:confirmBookingRecordRequest>
             <context>
                <distributorCode>${distributor}</distributorCode>
                <pointOfSaleCode>${pointOfSale}</pointOfSaleCode>
                <channelCode>${channelCode}</channelCode>
             </context>
             <book:recordLocator>${ticketId}</book:recordLocator>
             <book:responseSpec>
                <book:returnReservationDetails>true</book:returnReservationDetails>
             </book:responseSpec>
          </book:confirmBookingRecordRequest>
       </soapenv:Body>
    </soapenv:Envelope>`;

  var r = await instance
    .post("/v2?wsdl", xmls, { headers: { "Content-Type": "text/xml" }, agent })
    .then((res) => {
      return res.data;
    })
    .catch((err) => {
      console.log(err);
      return "Error";
    });
  return r;
}

async function cancelBookingRequest(
  ticketId,
  distributor,
  pointOfSale,
  channelCode,
  currency,
  expectedCost
) {
  let xmls = `
   <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:book="http://railgds.net/ws/booking" xmlns="http://railgds.net/ws/commontypes">
   <soapenv:Header/>
   <soapenv:Body>
      <book:cancelBookingRecordRequest>
         <context>
         <distributorCode>${distributor}</distributorCode>
         <pointOfSaleCode>${pointOfSale}</pointOfSaleCode>
         <channelCode>${channelCode}</channelCode>
      </context>
      <book:recordLocator>${ticketId}</book:recordLocator>
      <book:expectedCancellationFee currency="${currency}">${expectedCost}</book:expectedCancellationFee>
         <book:responseSpec>
            <book:returnReservationDetails>true</book:returnReservationDetails>
         </book:responseSpec>
      </book:cancelBookingRecordRequest>
   </soapenv:Body>
</soapenv:Envelope>`;

  var r = await instance
    .post("/v2?wsdl", xmls, { headers: { "Content-Type": "text/xml" }, agent })
    .then((res) => {
      return res.data;
    })
    .catch((err) => {
      console.log(err);
      return "Error";
    });
  return r;
}

async function refundBookingRequest(
  ticketId,
  distributor,
  pointOfSale,
  channelCode,
  currency,
  expectedCost,
  receiptNumber
) {
  console.log(
    "YOYOYOYOYO",
    ticketId,
    distributor,
    pointOfSale,
    channelCode,
    currency,
    expectedCost,
    receiptNumber
  );
  console.log(formatDate(new Date(date).add(1)));
  let xmls = `
   <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:book="http://railgds.net/ws/booking" xmlns="http://railgds.net/ws/commontypes">
   <soapenv:Header/>
   <soapenv:Body>
      <book:refundBookingRecordRequest>
         <context>
            <distributorCode>${distributor}</distributorCode>
            <pointOfSaleCode>${pointOfSale}</pointOfSaleCode>
            <channelCode>${channelCode}</channelCode>
         </context>
         <book:recordLocator>${ticketId}</book:recordLocator>
         <book:responseSpec>
            <book:returnReservationDetails>true</book:returnReservationDetails>
         </book:responseSpec>
         <book:receiptNumber>${receiptNumber}</book:receiptNumber>
         <book:refundAmount currency="${currency}">${expectedCost}</book:refundAmount>
      </book:refundBookingRecordRequest>
   </soapenv:Body>
</soapenv:Envelope>`;

  var r = await instance
    .post("/v2?wsdl", xmls, { headers: { "Content-Type": "text/xml" }, agent })
    .then((res) => {
      return res.data;
    })
    .catch((err) => {
      console.log(err);
      return "Error";
    });
  return r;
}

async function exchangeSearchRequest(
  ticketId,
  distributor,
  pointOfSale,
  channelCode,
  orderLocator,
  ticketableFareID,
  startPoint,
  endPoint,
  departureDate,
  arrivalDate
) {
  console.log(
    "YOYOYOYOYO",
    ticketId,
    distributor,
    pointOfSale,
    channelCode,
    orderLocator,
    ticketableFareID,
    startPoint,
    endPoint,
    departureDate,
    arrivalDate
  );

  var d = "2019-12-02";
  console.log(d);
  //console.log(d);
  let xmls = `
   <soap:Envelope xmlns="http://railgds.net/ws/commontypes"
   xmlns:book="http://railgds.net/ws/booking"
   xmlns:shop="http://railgds.net/ws/shopping"
   xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
   <soap:Header/>
   <soap:Body>
   <book:exchangeSearchRequest>
     <context>
      <distributorCode>${distributor}</distributorCode>
      <pointOfSaleCode>${pointOfSale}</pointOfSaleCode>
      <channelCode>${channelCode}</channelCode>
     </context>
    <book:recordLocator>${ticketId}</book:recordLocator>
    <book:orderLocator>${orderLocator}</book:orderLocator>
     <book:exchangeSets>
     <book:exchangeSet exchangeSetID="change1">
       <ticketableFareLocators>
         <ticketableFareLocator>${ticketableFareID}</ticketableFareLocator>
       </ticketableFareLocators>
       <book:exchangeShoppingQuery>
        <book:travelPointPairs>
        <book:travelPointPair>
          <originTravelPoint type="STATION">${startPoint}</originTravelPoint>
          <destinationTravelPoint type="STATION">${endPoint}</destinationTravelPoint>
          <departureDateTimeWindow>
           <date>${d}</date>
          </departureDateTimeWindow>
         </book:travelPointPair>
        </book:travelPointPairs>
       </book:exchangeShoppingQuery>
      </book:exchangeSet>
     </book:exchangeSets>
     <book:responseSpec>
      <book:includeOptionalPrices reservations="false"
       accommodations="false" onboardServices="false" localServices="false"/>
     </book:responseSpec>
    </book:exchangeSearchRequest>
   </soap:Body>
  </soap:Envelope>
 `;

  var r = await instance
    .post("/v2?wsdl", xmls, { headers: { "Content-Type": "text/xml" }, agent })
    .then((res) => {
      return res.data;
    })
    .catch((err) => {
      console.log(err);
      return "Error";
    });
  return r;
}

module.exports = {
  getBookingInfo,
  getCancellationSummaryInfo,
  confirmBookingRecord,
  cancelBookingRequest,
  refundBookingRequest,
  exchangeSearchRequest,
};
