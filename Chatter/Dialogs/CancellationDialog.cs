using System.IO;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using AdaptiveCards.Templating;
using Microsoft.Bot.Builder;
using Microsoft.Bot.Builder.Dialogs;
using Microsoft.Bot.Schema;
using Microsoft.Recognizers.Text.DataTypes.TimexExpression;
using Newtonsoft.Json;

namespace Microsoft.BotBuilderSamples.Dialogs
{

    public class CancellationDialog : CancelAndHelpDialog
    {
        private const string BookingIdMessage = "It looks like you want to cancel your tickets. Can I have your booking reference please?";

        public class CancellableModel
        {
            public bool cancellationEligibility { get; set; }
            public bool partialCancellationEligibility { get; set; }
            public decimal? Penalty { get; set; }
            public string Currency { get; set; }
        }

        public CancellationDialog()
            : base(nameof(CancellationDialog))
        {
            AddDialog(new TextPrompt(nameof(TextPrompt)));
            AddDialog(new ConfirmPrompt(nameof(ConfirmPrompt)));
            AddDialog(new DateResolverDialog());
            AddDialog(new WaterfallDialog(nameof(WaterfallDialog), new WaterfallStep[]
            {
                RetrieveBookingStep,
                ConfirmStepAsync,
                ConfirmRefundStepAsync,
                FinalStepAsync,
            }));

            // The initial child Dialog to run.
            InitialDialogId = nameof(WaterfallDialog);
        }

        private async Task<DialogTurnResult> RetrieveBookingStep(WaterfallStepContext stepContext, CancellationToken cancellationToken)
        {
            var bookingDetails = (BookingDetails)stepContext.Options;

            if (bookingDetails.BookingId == null)
            {
                var promptMessage = MessageFactory.Text(BookingIdMessage, InputHints.ExpectingInput);
                return await stepContext.PromptAsync(nameof(TextPrompt), new PromptOptions { Prompt = promptMessage }, cancellationToken);
            }

            return await stepContext.NextAsync(bookingDetails.BookingId, cancellationToken);
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
                        return await stepContext.ReplaceDialogAsync(nameof(CancellationDialog), null, cancellationToken);
                    }

                    stepContext.Values.Add("ticketPrice", model.TotalPrice);

                    newAttachment = LoadConfirmationCard(model);
                }
                catch
                {
                    await stepContext.Context.SendActivityAsync("Sorry, I didn't recognise that Booking");
                    return await stepContext.ReplaceDialogAsync(nameof(CancellationDialog), null, cancellationToken);

                }
            };

            var testHeroCard = MessageFactory.Attachment(newAttachment);

            var messageText = $"I found the following booking. Is this the one you would like to cancel?";
            var promptMessage = MessageFactory.Text(messageText, messageText, InputHints.ExpectingInput);
            promptMessage.Attachments.Add(newAttachment);

            return await stepContext.PromptAsync(nameof(ConfirmPrompt), new PromptOptions { Prompt = promptMessage }, cancellationToken);
        }

        private async Task<DialogTurnResult> ConfirmRefundStepAsync(WaterfallStepContext stepContext, CancellationToken cancellationToken)
        {
            Activity promptMessage;

            using (HttpClient client = new HttpClient())
            {
                var ticketID = stepContext.Values["bookingId"];
                var response = await client.GetAsync($"http://localhost:3000/cancelSummary?ticketID={ticketID}&distributor=HACKTRAIN&pointOfSale=FR&channelCode=CH2");
                var responseText = await response.Content.ReadAsStringAsync();

                var cancelModel = JsonConvert.DeserializeObject<CancellableModel>(responseText);

                if (!cancelModel.cancellationEligibility)
                {
                    await stepContext.Context.SendActivityAsync("Sorry, this booking can no longer be cancelled.");

                    return await stepContext.EndDialogAsync(null, cancellationToken);
                }

                var totalPrice = stepContext.Values["ticketPrice"] as string;
                promptMessage = MessageFactory.Text($"Your final refund will be £{decimal.Parse(totalPrice) - cancelModel.Penalty}, made up of your £{totalPrice} ticket price, and a £{cancelModel.Penalty} cancellation fee. Do you want to continue?");

            }

            return await stepContext.PromptAsync(nameof(ConfirmPrompt), new PromptOptions { Prompt = promptMessage }, cancellationToken);
        }


        private async Task<DialogTurnResult> FinalStepAsync(WaterfallStepContext stepContext, CancellationToken cancellationToken)
        {

            if ((bool)stepContext.Result)
            {
                using (HttpClient client = new HttpClient())
                {
                    var bookingId = stepContext.Values["bookingId"];

                    var response = await client.GetAsync($"http://localhost:3000/approveCancel?ticketID={bookingId}&distributor=HACKTRAIN&pointOfSale=FR&channelCode=CH2");
                    var responseText = await response.Content.ReadAsStringAsync();

                    if (responseText == "Cancelled Successfully  - Refund successful")
                    {
                        await stepContext.Context.SendActivityAsync("Your tickets have been successfully cancelled");
                        await stepContext.Context.SendActivityAsync("Your refund will be processed in 5-7 days");
                    }
                    else
                    {
                        await stepContext.Context.SendActivityAsync("Something went wrong. Please contact us at +441234 567890");
                    }
                };

                var bookingDetails = (BookingDetails)stepContext.Options;

                return await stepContext.EndDialogAsync(bookingDetails, cancellationToken);
            }

            await stepContext.Context.SendActivityAsync("No changes have been made to your booking");
            return await stepContext.EndDialogAsync(null, cancellationToken);
        }

        private static bool IsAmbiguous(string timex)
        {
            var timexProperty = new TimexProperty(timex);
            return !timexProperty.Types.Contains(Constants.TimexTypes.Definite);
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

    }
}
