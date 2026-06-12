#include "TrafficSimulationController.h"

#include "Dom/JsonObject.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"

ATrafficSimulationController::ATrafficSimulationController()
{
    PrimaryActorTick.bCanEverTick = false;
}

void ATrafficSimulationController::ApplySimulationSnapshotJson(const FString& SnapshotJson)
{
    TSharedPtr<FJsonObject> Root;
    const TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(SnapshotJson);
    if (!FJsonSerializer::Deserialize(Reader, Root) || !Root.IsValid())
    {
        CurrentTiming.ActivePhase = ETrafficSimulationPhase::Unknown;
        return;
    }

    FString Phase;
    if (Root->TryGetStringField(TEXT("activeSignalGroup"), Phase) || Root->TryGetStringField(TEXT("signal_phase"), Phase))
    {
        if (Phase.Contains(TEXT("north"), ESearchCase::IgnoreCase) || Phase.Contains(TEXT("south"), ESearchCase::IgnoreCase))
        {
            CurrentTiming.ActivePhase = ETrafficSimulationPhase::NorthSouthGreen;
        }
        else if (Phase.Contains(TEXT("east"), ESearchCase::IgnoreCase) || Phase.Contains(TEXT("west"), ESearchCase::IgnoreCase))
        {
            CurrentTiming.ActivePhase = ETrafficSimulationPhase::EastWestGreen;
        }
        else if (Phase.Contains(TEXT("red"), ESearchCase::IgnoreCase))
        {
            CurrentTiming.ActivePhase = ETrafficSimulationPhase::AllRed;
        }
        else
        {
            CurrentTiming.ActivePhase = ETrafficSimulationPhase::Unknown;
        }
    }

    double CycleSecond = 0.0;
    if (Root->TryGetNumberField(TEXT("cycleSecond"), CycleSecond) || Root->TryGetNumberField(TEXT("cycle_second"), CycleSecond))
    {
        CurrentTiming.CycleSecond = static_cast<float>(CycleSecond);
    }
}
