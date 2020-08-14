using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Bot.Builder;
using Microsoft.Bot.Builder.Dialogs;
using Microsoft.Bot.Schema;
using Microsoft.Recognizers.Text.DataTypes.TimexExpression;
using Newtonsoft.Json;
using AdaptiveCards.Templating;
using System;
using System.Net.Http;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;

namespace Microsoft.BotBuilderSamples.Dialogs
{
    public class ExchangeDialog : CancelAndHelpDialog
    {
        private const string BookingIdMessage = "It looks like you want to exchange your tickets. Please enter your Booking ID, or type Cancel";

        public class TicketableFare
        {
            public string TicketableFareID { get; set; }
            public string FareOrigin { get; set; }
            public string FareDestination { get; set; }
        }

        public ExchangeDialog()
            : base(nameof(ExchangeDialog))
        {
            AddDialog(new TextPrompt(nameof(TextPrompt)));
            AddDialog(new ConfirmPrompt(nameof(ConfirmPrompt)));
            AddDialog(new DateResolverDialog());
            AddDialog(new WaterfallDialog(nameof(WaterfallDialog), new WaterfallStep[]
            {
                RetrieveBookingStep,
                ConfirmStepAsync,
                ExchangeCheckStep,
                NewBookingTest,
                FinalStepAsync,
            }));

            // The initial child Dialog to run.
            InitialDialogId = nameof(WaterfallDialog);
        }

        private async Task<DialogTurnResult> RetrieveBookingStep(WaterfallStepContext stepContext, CancellationToken cancellationToken)
        {
            var promptMessage = MessageFactory.Text(BookingIdMessage, InputHints.ExpectingInput);
            return await stepContext.PromptAsync(nameof(TextPrompt), new PromptOptions { Prompt = promptMessage }, cancellationToken);
        }

        private async Task<DialogTurnResult> ConfirmStepAsync(WaterfallStepContext stepContext, CancellationToken cancellationToken)
        {
            var bookingId = stepContext.Result;
            stepContext.Values.Add("bookingId", bookingId);

            Attachment newAttachment;

            using (HttpClient client = new HttpClient())
            {
                var response = await client.GetAsync($"http://localhost:3000/bookingInfo?ticketID={bookingId}&distributor=HACKTRAIN&pointOfSale=FR&channelCode=CH2");
                var responseText = await response.Content.ReadAsStringAsync();

                try
                {
                    BookingModel model = JsonConvert.DeserializeObject<BookingModel>(responseText);
                    if (model.ArrivePoint == null)
                    {
                        await stepContext.Context.SendActivityAsync("Sorry, I didn't recognise that Booking");
                        return await stepContext.ReplaceDialogAsync(nameof(ExchangeDialog), null, cancellationToken);
                    }

                    newAttachment = LoadConfirmationCard(model);
                }
                catch
                {
                    await stepContext.Context.SendActivityAsync("Sorry, I didn't recognise that Booking");
                    return await stepContext.ReplaceDialogAsync(nameof(ExchangeDialog), null, cancellationToken);

                }
            };

            var testHeroCard = MessageFactory.Attachment(newAttachment);

            var messageText = $"I found the following booking. Is this the one you would like to exchange?";
            var promptMessage = MessageFactory.Text(messageText, messageText, InputHints.ExpectingInput);
            promptMessage.Attachments.Add(newAttachment);

            return await stepContext.PromptAsync(nameof(ConfirmPrompt), new PromptOptions { Prompt = promptMessage }, cancellationToken);
        }

        private async Task<DialogTurnResult> ExchangeCheckStep(WaterfallStepContext stepContext, CancellationToken cancellationToken)
        {
            var bookingId = stepContext.Values["bookingId"];
            Activity promptMessage;

            using (HttpClient client = new HttpClient())
            {
                var response = await client.GetAsync($"http://localhost:3000/bookingTicketInfo?ticketID={bookingId}&distributor=HACKTRAIN&pointOfSale=FR&channelCode=CH2");
                var responseText = await response.Content.ReadAsStringAsync();

                var ticketableFares = new System.Collections.Generic.List<TicketableFare>();

                ticketableFares = JsonConvert.DeserializeObject<System.Collections.Generic.List<TicketableFare>>(responseText);

                if (ticketableFares.Count == 0)
                {
                    await stepContext.Context.SendActivityAsync("There are no tickets available to exchange on this journey");
                    return await stepContext.ReplaceDialogAsync(nameof(MainDialog), null, cancellationToken);
                }


                await stepContext.Context.SendActivityAsync(MessageFactory.Text($"Which of the following journeys do you wish to exchange?"));
                foreach (var item in ticketableFares)
                {
                    await stepContext.Context.SendActivityAsync(MessageFactory.Text($"Trip {item.TicketableFareID}: Travel from {item.FareOrigin} to {item.FareDestination}"));
                }

                stepContext.Values.Add("option1", ticketableFares[0].TicketableFareID);
                stepContext.Values.Add("option2", ticketableFares[1].TicketableFareID);

                promptMessage = MessageFactory.Text($"Please select between 1 and {ticketableFares.Count}");
            }

            return await stepContext.PromptAsync(nameof(ConfirmPrompt), new PromptOptions { Prompt = promptMessage }, cancellationToken);
        }


        private async Task<DialogTurnResult> NewBookingTest(WaterfallStepContext stepContext, CancellationToken cancellationToken)
        {
            var selectedOption = stepContext.Result;
            var activeId = "";

            if (selectedOption == "true")
                activeId = stepContext.Values["option1"] as string;
            else
                activeId = stepContext.Values["option2"] as string;

            //var loadHeroCard = LoadListCards();
            //var testHeroCard = MessageFactory.Attachment(loadHeroCard);

            //var messageText = $"The following alternatives are available. Which one would you like?";
            //var promptMessage = MessageFactory.Text(messageText, messageText, InputHints.ExpectingInput);
            //promptMessage.Attachments.Add(loadHeroCard);

            using (HttpClient client = new HttpClient())
            {
                var bookingId = stepContext.Values["bookingId"];

                var response = await client.GetAsync($"http://localhost:3000/exchangeSearch?ticketID={bookingId}&distributor=HACKTRAIN&pointOfSale=FR&channelCode=CH2&orderLocator=activeId&");
                var responseText = await response.Content.ReadAsStringAsync();

            }

            var promptMessage = MessageFactory.Text("Hi");

                return await stepContext.PromptAsync(nameof(ConfirmPrompt), new PromptOptions { Prompt = promptMessage }, cancellationToken);
        }

        private async Task<DialogTurnResult> FinalStepAsync(WaterfallStepContext stepContext, CancellationToken cancellationToken)
        {
            if ((bool)stepContext.Result)
            {
                await stepContext.Context.SendActivityAsync("Great, I've changed your booking for you");

                var bookingDetails = (BookingDetails)stepContext.Options;

                return await stepContext.EndDialogAsync(bookingDetails, cancellationToken);
            }

            return await stepContext.EndDialogAsync(null, cancellationToken);
        }

        private static bool IsAmbiguous(string timex)
        {
            var timexProperty = new TimexProperty(timex);
            return !timexProperty.Types.Contains(Constants.TimexTypes.Definite);
        }

        private async Task<bool> TestValidator(PromptValidatorContext<string> promptContext,
            CancellationToken cancellationToken)
        {
            return false;
        }
        private Attachment LoadConfirmationCard(BookingModel model)
        {
            var cardResourcePath = "CoreBot.Cards.confirmationCard.json";

            var newJson = $"{{ \"origin\": {{ \"name\": \"{model.DepartPoint}\", \"time\": \"{model.DepartTime}\" }},  \"destination\": {{ \"name\" : \"{model.ArrivePoint}\", \"time\" : \"{model.ArriveTime}\"  }}, \"ticket\" : {{ \"type\" : \"{model.TrainClass}\", \"operator\" : \"{model.Carrier}\", \"price\": \"{model.TotalPrice}\" }} }}";

            using (var stream = GetType().Assembly.GetManifestResourceStream(cardResourcePath))
            {
                using (var reader = new StreamReader(stream))
                {
                    var adaptiveCard = reader.ReadToEnd();

                    var transformer = new AdaptiveTransformer();
                    var cardJson = transformer.Transform(adaptiveCard, newJson);

                    return new Attachment()
                    {
                        ContentType = "application/vnd.microsoft.card.adaptive",
                        Content = JsonConvert.DeserializeObject(cardJson),
                    };
                }
            }
        }

        private Attachment LoadListCards()
        {
            var cardResourcePath = "CoreBot.Cards.listCard.json";

            var dataJson = @"
{
    ""origin"": {
        ""name"": ""Hull"",
        ""time"": ""13:34PM"",
        ""profileImage"": ""https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Ic_arrow_forward_48px.svg/768px-Ic_arrow_forward_48px.svg.png""
    },
    ""destination"": {
        ""name"": ""Reading"",
        ""time"": ""20:45"",
        ""profileImage"": ""https://image.flaticon.com/icons/svg/60/60972.svg""
    }
}";


            using (var stream = GetType().Assembly.GetManifestResourceStream(cardResourcePath))
            {
                using (var reader = new StreamReader(stream))
                {
                    var adaptiveCard = reader.ReadToEnd();

                    var transformer = new AdaptiveTransformer();
                    var cardJson = transformer.Transform(adaptiveCard, dataJson);

                    return new Attachment()
                    {
                        ContentType = "application/vnd.microsoft.card.adaptive",
                        Content = JsonConvert.DeserializeObject(cardJson),
                    };
                }
            }
        }

    }
}
