using Newtonsoft.Json;
using System.Collections.Generic;
using Microsoft.Bot.Builder;
using Microsoft.Bot.Builder.AI.Luis;

public partial class TrainBooking : IRecognizerConvert
{
    public string Text;
    public string AlteredText;
    public enum Intent
    {
        CancelTicket,
        ExchangeTicket,
        None
    };
    public Dictionary<Intent, IntentScore> Intents;

    public class _Entities
    {
        public DateTimeSpec[] datetime;
        public string DepartureStation;
        public string ArrivalStation;
        public string TicketId;

        // Composites
        public class _InstanceFrom
        {
            public InstanceData[] Airport;
        }

        public class _InstanceTo
        {
            public InstanceData[] Airport;
        }
        public class ToClass
        {
            [JsonProperty("$instance")]
            public _InstanceTo _instance;
        }
        public ToClass[] To;

        // Instance
        public class _Instance
        {
            public InstanceData[] datetime;
            public InstanceData[] Airport;
            public InstanceData[] From;
            public InstanceData[] To;
        }
        [JsonProperty("$instance")]
        public _Instance _instance;
    }
    public _Entities Entities;

    [JsonExtensionData(ReadData = true, WriteData = true)]
    public IDictionary<string, object> Properties { get; set; }

    public void Convert(dynamic result)
    {
        //var app = JsonConvert.DeserializeObject<string>(JsonConvert.SerializeObject(result, new JsonSerializerSettings { NullValueHandling = NullValueHandling.Ignore }));
    }

    public (Intent intent, double score) TopIntent()
    {
        Intent maxIntent = Intent.None;
        var max = 0.0;
        foreach (var entry in Intents)
        {
            if (entry.Value.Score > max)
            {
                maxIntent = entry.Key;
                max = entry.Value.Score.Value;
            }
        }
        return (maxIntent, max);
    }
}
