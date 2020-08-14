package com.onerail.onerail;

import org.springframework.web.bind.annotation.RestController;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;

import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.HttpResponse;
import org.apache.http.HttpEntity;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.client.methods.HttpPost;

import java.io.File;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.transform.Transformer;
import javax.xml.transform.TransformerException;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;
import org.w3c.dom.Attr;
import org.w3c.dom.Document;
import org.w3c.dom.Element;

import java.util.List;
import java.util.ArrayList;

import org.apache.http.client.entity.UrlEncodedFormEntity;

@RestController
public class RailController {

    @GetMapping("/greeting")
    public String greeting(@RequestParam(name="name", required=false, defaultValue="World") String name, Model model) {
        model.addAttribute("name", name);
        return "greeting1";
    }

    @GetMapping("/refund")
    public ResponseEntity<String> refund(@RequestParam String bookingRef){
      try{
            DocumentBuilderFactory documentFactory = DocumentBuilderFactory.newInstance();

            DocumentBuilder documentBuilder = documentFactory.newDocumentBuilder();
            Document document = documentBuilder.newDocument();

            // context element
            Element context = document.createElement("context");
            Element distributorCode = document.createElement("distributorCode");
            distributorCode.appendChild(document.createTextNode("HACKTRAIN"));
            Element pointOfSaleCode = document.createElement("pointOfSaleCode");
            pointOfSaleCode.appendChild(document.createTextNode("FR"));
            Element channelCode = document.createElement("channelCode");
            channelCode.appendChild(document.createTextNode("CH2"));
            context.appendChild(distributorCode);
            context.appendChild(pointOfSaleCode);
            context.appendChild(channelCode);
      } catch( Exception e){
        return new ResponseEntity<>("fail", HttpStatus.INTERNAL_SERVER_ERROR);
      }
        return new ResponseEntity<>("Cool", HttpStatus.OK);
    }

    @GetMapping("/getBooking")
    public ResponseEntity<String> getBooking(@RequestParam String bookingRef){
      try{
        //send request to silverrail

        CloseableHttpClient httpclient = HttpClients.createDefault();
        HttpPost httppost = new HttpPost("");


        //Execute and get the response.
        httppost.setHeader(HttpHeaders.CONTENT_TYPE, "text/xml");
        String testString = new String("<soapenv:Envelope xmlns:soapenv=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:book=\"http://railgds.net/ws/booking\" xmlns=\"http://railgds.net/ws/commontypes\"><soapenv:Header/>   <soapenv:Body>
      <book:retrieveBookingRecordRequest>
         <context>
            <distributorCode>DEMO</distributorCode>
            <pointOfSaleCode>US</pointOfSaleCode>
            <channelCode>CON</channelCode>
            <agencyCode>AG1</agencyCode>
            <companyCode>COM1</companyCode>
         </context>
         <book:recordLocator>B-DEMO-XXU0003ZX</book:recordLocator>
         <book:responseSpec>
            <book:includeOrderDetails>true</book:includeOrderDetails>
            <book:includeOrderCosts>true</book:includeOrderCosts>
            <book:includePassengerDetails>true</book:includePassengerDetails>
            <book:includeFinancials>true</book:includeFinancials>
            <book:includePaymentRequirements>true</book:includePaymentRequirements>
            <book:includeTicketingOptions>true</book:includeTicketingOptions>
            <book:includeFulfillmentInformation>true</book:includeFulfillmentInformation>
         </book:responseSpec>
      </book:retrieveBookingRecordRequest>
   </soapenv:Body>
</soapenv:Envelope>");
StringEntity entity = new StringEntity(testString);

        httpPost.setEntity(entity);
        HttpResponse response = httpclient.execute(httppost);
        HttpEntity entity = response.getEntity();
        System.out.println(response);
        System.out.println(entity);

      }
      catch( Exception e){
        return new ResponseEntity<>("Fail to connect to Silverrail", HttpStatus.INTERNAL_SERVER_ERROR);
      }
      return new ResponseEntity<>("Good",HttpStatus.OK);
    }

}
