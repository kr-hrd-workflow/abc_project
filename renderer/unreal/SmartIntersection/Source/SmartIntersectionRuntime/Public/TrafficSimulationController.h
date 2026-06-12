#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "TrafficSimulationController.generated.h"

UENUM(BlueprintType)
enum class ETrafficSimulationPhase : uint8
{
    Unknown UMETA(DisplayName = "Unknown"),
    NorthSouthGreen UMETA(DisplayName = "North/South Green"),
    EastWestGreen UMETA(DisplayName = "East/West Green"),
    AllRed UMETA(DisplayName = "All Red")
};

USTRUCT(BlueprintType)
struct FTrafficSignalTiming
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot")
    ETrafficSimulationPhase ActivePhase = ETrafficSimulationPhase::Unknown;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot")
    float CycleSecond = 0.0f;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot")
    FString Source = TEXT("SUMO truth source via future Python TraCI bridge");
};

/**
 * Renderer-side receiver shell for future SUMO/TraCI snapshots.
 * This actor does not simulate traffic, spawn vehicles, or own signal truth.
 * SUMO remains authoritative; Unreal only renders received state.
 */
UCLASS(BlueprintType)
class SMARTINTERSECTIONRUNTIME_API ATrafficSimulationController : public AActor
{
    GENERATED_BODY()

public:
    ATrafficSimulationController();

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot")
    FTrafficSignalTiming CurrentTiming;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Pixel Streaming")
    bool bPixelStreamConnected = false;

    UFUNCTION(BlueprintCallable, Category = "SUMO TraCI Snapshot")
    void ApplySimulationSnapshotJson(const FString& SnapshotJson);
};
