#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "TrafficSimulationController.generated.h"

UENUM(BlueprintType)
enum class ETrafficSimulationPhase : uint8
{
    Offline UMETA(DisplayName = "Offline"),
    Initializing UMETA(DisplayName = "Initializing"),
    Running UMETA(DisplayName = "Running"),
    Paused UMETA(DisplayName = "Paused"),
    Error UMETA(DisplayName = "Error")
};

USTRUCT(BlueprintType)
struct FTrafficSignalTiming
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Simulation|Signals")
    float GreenSeconds = 30.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Simulation|Signals")
    float AmberSeconds = 4.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Simulation|Signals")
    float RedClearanceSeconds = 2.0f;
};

UCLASS(BlueprintType, Blueprintable)
class SMARTINTERSECTIONRUNTIME_API ATrafficSimulationController : public AActor
{
    GENERATED_BODY()

public:
    ATrafficSimulationController();

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Simulation|Profile")
    FString CityProfileId = TEXT("seoul");

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Simulation|State")
    ETrafficSimulationPhase SimulationPhase = ETrafficSimulationPhase::Offline;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Simulation|Signals")
    FTrafficSignalTiming SignalTiming;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Simulation|Streaming")
    bool bPixelStreamConnected = false;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Simulation|Snapshot")
    FString LastSnapshotJson;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Simulation|Snapshot")
    float LastSnapshotWorldSeconds = 0.0f;

    UFUNCTION(BlueprintCallable, Category = "Simulation|Profile")
    void SetCityProfileId(const FString& InCityProfileId);

    UFUNCTION(BlueprintCallable, Category = "Simulation|State")
    void SetSimulationPhase(ETrafficSimulationPhase InPhase);

    UFUNCTION(BlueprintCallable, Category = "Simulation|Signals")
    void SetSignalTiming(float InGreenSeconds, float InAmberSeconds, float InRedClearanceSeconds);

    UFUNCTION(BlueprintCallable, Category = "Simulation|Streaming")
    void SetPixelStreamConnected(bool bInConnected);

    UFUNCTION(BlueprintCallable, Category = "Simulation|Snapshot")
    void ApplySimulationSnapshotJson(const FString& SnapshotJson);
};
