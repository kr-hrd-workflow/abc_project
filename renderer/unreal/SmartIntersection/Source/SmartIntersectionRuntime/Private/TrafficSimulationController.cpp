#include "TrafficSimulationController.h"

#include "Components/SceneComponent.h"
#include "Engine/World.h"
#include "Dom/JsonObject.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"

ATrafficSimulationController::ATrafficSimulationController()
{
    PrimaryActorTick.bCanEverTick = false;

    USceneComponent* SceneRoot = CreateDefaultSubobject<USceneComponent>(TEXT("SimulationRendererRoot"));
    RootComponent = SceneRoot;
}

void ATrafficSimulationController::SetCityProfileId(const FString& InCityProfileId)
{
    CityProfileId = InCityProfileId;
}

void ATrafficSimulationController::SetSimulationPhase(ETrafficSimulationPhase InPhase)
{
    SimulationPhase = InPhase;
}

void ATrafficSimulationController::SetSignalTiming(
    float InGreenSeconds,
    float InAmberSeconds,
    float InRedClearanceSeconds
)
{
    SignalTiming.GreenSeconds = InGreenSeconds;
    SignalTiming.AmberSeconds = InAmberSeconds;
    SignalTiming.RedClearanceSeconds = InRedClearanceSeconds;
}

void ATrafficSimulationController::SetPixelStreamConnected(bool bInConnected)
{
    bPixelStreamConnected = bInConnected;
}

void ATrafficSimulationController::ApplySimulationSnapshotJson(const FString& SnapshotJson)
{
    LastSnapshotJson = SnapshotJson;
    bLastSnapshotParsed = false;

    if (const UWorld* World = GetWorld())
    {
        LastSnapshotWorldSeconds = World->GetTimeSeconds();
    }
    else
    {
        LastSnapshotWorldSeconds = 0.0f;
    }

    TSharedPtr<FJsonObject> SnapshotObject;
    const TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(SnapshotJson);
    if (!FJsonSerializer::Deserialize(Reader, SnapshotObject) || !SnapshotObject.IsValid())
    {
        return;
    }

    FString ParsedSignalGroup;
    if (SnapshotObject->TryGetStringField(TEXT("activeSignalGroup"), ParsedSignalGroup))
    {
        ActiveSignalGroup = ParsedSignalGroup;
    }
    else if (SnapshotObject->TryGetStringField(TEXT("signal_phase"), ParsedSignalGroup))
    {
        ActiveSignalGroup = ParsedSignalGroup;
    }

    double ParsedCycleSecond = 0.0;
    if (SnapshotObject->TryGetNumberField(TEXT("cycleSecond"), ParsedCycleSecond))
    {
        CycleSecond = static_cast<float>(ParsedCycleSecond);
    }
    else if (SnapshotObject->TryGetNumberField(TEXT("cycle_second"), ParsedCycleSecond))
    {
        CycleSecond = static_cast<float>(ParsedCycleSecond);
    }

    const TSharedPtr<FJsonObject>* QueuesObject = nullptr;
    if (SnapshotObject->TryGetObjectField(TEXT("queues"), QueuesObject) && QueuesObject && QueuesObject->IsValid())
    {
        DirectionalQueues.Empty();
        for (const TPair<FString, TSharedPtr<FJsonValue>>& QueuePair : (*QueuesObject)->Values)
        {
            double QueueValue = 0.0;
            if (QueuePair.Value.IsValid() && QueuePair.Value->TryGetNumber(QueueValue))
            {
                DirectionalQueues.Add(QueuePair.Key, static_cast<int32>(QueueValue));
            }
        }
    }

    bEmergencyVehicleApproaching = false;
    EmergencyVehicleDirection = TEXT("none");
    const TArray<TSharedPtr<FJsonValue>>* Events = nullptr;
    if (SnapshotObject->TryGetArrayField(TEXT("events"), Events) && Events)
    {
        for (const TSharedPtr<FJsonValue>& EventValue : *Events)
        {
            const TSharedPtr<FJsonObject> EventObject = EventValue.IsValid() ? EventValue->AsObject() : nullptr;
            if (!EventObject.IsValid())
            {
                continue;
            }

            FString EventType;
            if (EventObject->TryGetStringField(TEXT("type"), EventType) && EventType == TEXT("emergency_vehicle_approach"))
            {
                bEmergencyVehicleApproaching = true;
                FString Direction;
                if (EventObject->TryGetStringField(TEXT("direction"), Direction))
                {
                    EmergencyVehicleDirection = Direction;
                }
                break;
            }
        }
    }

    const TSharedPtr<FJsonObject>* EmergencyPriorityObject = nullptr;
    if (!bEmergencyVehicleApproaching && SnapshotObject->TryGetObjectField(TEXT("emergency_priority"), EmergencyPriorityObject) && EmergencyPriorityObject && EmergencyPriorityObject->IsValid())
    {
        bool bPresent = false;
        if ((*EmergencyPriorityObject)->TryGetBoolField(TEXT("present"), bPresent))
        {
            bEmergencyVehicleApproaching = bPresent;
        }
        FString Direction;
        if ((*EmergencyPriorityObject)->TryGetStringField(TEXT("direction"), Direction) && !Direction.IsEmpty())
        {
            EmergencyVehicleDirection = Direction;
        }
    }

    bLastSnapshotParsed = true;
}
