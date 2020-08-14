// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

using System.Linq;

public partial class TrainBooking
{
    

    // This value will be a TIMEX. And we are only interested in a Date so grab the first result and drop the Time part.
    // TIMEX is a format that represents DateTime expressions that include some ambiguity. e.g. missing a Year.
    public string TravelDate
        => Entities.datetime?.FirstOrDefault()?.Expressions.FirstOrDefault()?.Split('T')[0];
}
