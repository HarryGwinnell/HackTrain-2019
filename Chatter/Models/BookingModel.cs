using System;

public class BookingModel
{
    public string DepartPoint { get; set; }
    public DateTime DepartTime { get; set; }
    public string ArrivePoint { get; set; }
    public DateTime ArriveTime { get; set; }
    public string TrainClass { get; set; }
    public string Carrier { get; set; }
    public string TotalPrice { get; set; }
    public string Currency { get; set; }
}