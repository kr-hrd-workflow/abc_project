#include "TrafficSimulationController.h"

#include "Components/SceneComponent.h"
#include "Engine/World.h"

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

    if (const UWorld* World = GetWorld())
    {
        LastSnapshotWorldSeconds = World->GetTimeSeconds();
    }
    else
    {
        LastSnapshotWorldSeconds = 0.0f;
    }
}
