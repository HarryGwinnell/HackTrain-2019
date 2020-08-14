# oneRail

This project was for the HackTrain 2019 Hackathon. It consisted of a Azure Cognitive Services Chatbot that interfaced with a third party API to allow users to make, check and cancel train tickets, find alternative routes, etc.

## Folder Strucure

### Chatter

- This provides the backend logic for the chatbot, and is based on C#

### Rerouter

- This is used to find alternative route options including walking and public transport, for rescheduling or cancelled trains

### SilverRail Caller

- This provides the logic for contacting the third party ticketing API, for purchasing, updating and cancelling bookings
