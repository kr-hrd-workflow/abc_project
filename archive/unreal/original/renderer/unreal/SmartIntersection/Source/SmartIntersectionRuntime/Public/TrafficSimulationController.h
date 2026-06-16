#pragma once

#include "CoreMinimal.h"
#include "Components/SceneComponent.h"
#include "Components/StaticMeshComponent.h"
#include "GameFramework/Actor.h"
#include "Interfaces/IHttpRequest.h"
#include "Interfaces/IHttpResponse.h"
#include "TimerManager.h"
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

USTRUCT(BlueprintType)
struct FTrafficVehicleBindingState
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot|Motion Binding")
    FString ActorLabel;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot|Motion Binding")
    FString VehicleId;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot|Motion Binding")
    FString LaneId;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot|Motion Binding")
    FString Direction;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot|Motion Binding")
    FVector LocationCm = FVector::ZeroVector;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot|Motion Binding")
    float HeadingDegrees = 0.0f;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot|Motion Binding")
    float SpeedMetersPerSecond = 0.0f;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot|Motion Binding")
    FString VehicleClass;
};

USTRUCT(BlueprintType)
struct FTrafficSignalBindingState
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot|Motion Binding")
    FString ActorLabel;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot|Motion Binding")
    FString SignalGroup;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot|Motion Binding")
    FString State;
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

protected:
    virtual void BeginPlay() override;
    virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

public:
    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot")
    FString CityProfileId = TEXT("london");

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot")
    FString ActiveSignalGroup = TEXT("unknown");

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot")
    FTrafficSignalTiming CurrentTiming;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot|Motion Binding")
    FString LastStage4SnapshotId = TEXT("none");

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot|Motion Binding")
    FString Stage4MotionBindingVersion = TEXT("none");

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot|Motion Binding")
    TArray<FTrafficVehicleBindingState> LastVehicleBindings;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot|Motion Binding")
    TArray<FTrafficSignalBindingState> LastSignalBindings;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot")
    TMap<FString, int32> DirectionalQueues;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot")
    bool bPedestrianRequestActive = false;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot")
    bool bEmergencyVehicleApproaching = false;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot")
    FString EmergencyVehicleDirection = TEXT("none");

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot")
    bool bLastSnapshotParsed = false;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot")
    FString LastSnapshotJson;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot")
    FString LastSnapshotReceivedAtUtc;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot|Polling")
    bool bEnableSnapshotPolling = true;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot|Polling")
    FString SnapshotEndpointUrl = TEXT("http://127.0.0.1:8000/api/renderer/unreal/snapshot");

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot|Polling", meta = (ClampMin = "0.1"))
    float SnapshotPollingIntervalSeconds = 1.0f;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot|Polling")
    FString LastSnapshotFetchStatus = TEXT("not started");

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Pixel Streaming")
    bool bPixelStreamConnected = false;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Pixel Streaming")
    FString PixelStreamStatus = TEXT("disconnected");

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Pixel Streaming")
    FString PixelStreamSignallingUrl = TEXT("not configured");

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot|Runtime Visuals")
    USceneComponent* RendererVisualRoot;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot|Runtime Visuals")
    UStaticMeshComponent* EastWestGreenSignalVisual;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot|Runtime Visuals")
    UStaticMeshComponent* NorthSouthGreenSignalVisual;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot|Runtime Visuals")
    UStaticMeshComponent* PedestrianCrossingVisual;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot|Runtime Visuals")
    UStaticMeshComponent* EmergencyVehicleDirectionVisual;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot|Runtime Visuals")
    UStaticMeshComponent* PixelStreamReadyVisual;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot|Runtime Visuals")
    UStaticMeshComponent* NorthQueueVisualMarker0;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot|Runtime Visuals")
    UStaticMeshComponent* NorthQueueVisualMarker1;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot|Runtime Visuals")
    UStaticMeshComponent* NorthQueueVisualMarker2;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot|Runtime Visuals")
    UStaticMeshComponent* NorthQueueVisualMarker3;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot|Runtime Visuals")
    UStaticMeshComponent* SouthQueueVisualMarker0;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot|Runtime Visuals")
    UStaticMeshComponent* SouthQueueVisualMarker1;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot|Runtime Visuals")
    UStaticMeshComponent* SouthQueueVisualMarker2;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot|Runtime Visuals")
    UStaticMeshComponent* SouthQueueVisualMarker3;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot|Runtime Visuals")
    UStaticMeshComponent* EastQueueVisualMarker0;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot|Runtime Visuals")
    UStaticMeshComponent* EastQueueVisualMarker1;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot|Runtime Visuals")
    UStaticMeshComponent* EastQueueVisualMarker2;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot|Runtime Visuals")
    UStaticMeshComponent* EastQueueVisualMarker3;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot|Runtime Visuals")
    UStaticMeshComponent* WestQueueVisualMarker0;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot|Runtime Visuals")
    UStaticMeshComponent* WestQueueVisualMarker1;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot|Runtime Visuals")
    UStaticMeshComponent* WestQueueVisualMarker2;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot|Runtime Visuals")
    UStaticMeshComponent* WestQueueVisualMarker3;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot|Runtime Visuals")
    FString RuntimeVisualSignalState = TEXT("unknown");

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot|Runtime Visuals")
    FString RuntimeVisualAssetSet = TEXT("engine_fallback_runtime_visuals");

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot|Runtime Visuals")
    int32 RuntimeVisualNorthQueueMarkers = 0;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot|Runtime Visuals")
    int32 RuntimeVisualEastQueueMarkers = 0;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot|Runtime Visuals")
    int32 RuntimeVisualSouthQueueMarkers = 0;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot|Runtime Visuals")
    int32 RuntimeVisualWestQueueMarkers = 0;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot|Runtime Visuals")
    FString RuntimeVisualEmergencyDirectionState = TEXT("none");

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot|Runtime Visuals")
    FVector RuntimeVisualEmergencyBeaconLocation = FVector::ZeroVector;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot|Runtime Visuals")
    bool bRuntimeVisualPedestrianCrossingVisible = false;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot|Runtime Visuals")
    bool bRuntimeVisualEmergencyBeaconVisible = false;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot|Runtime Visuals")
    bool bRuntimeVisualPixelStreamReadyVisible = false;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot|Runtime Visuals")
    int32 RuntimeVisualVehicleBindingCount = 0;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot|Runtime Visuals")
    FString RuntimeVisualFirstVehicleActorLabel = TEXT("none");

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot|Runtime Visuals")
    FVector RuntimeVisualFirstVehicleLocationCm = FVector::ZeroVector;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot|Runtime Visuals")
    float RuntimeVisualFirstVehicleHeadingDegrees = 0.0f;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot|Runtime Visuals")
    FString RuntimeVisualFirstVehicleClass = TEXT("none");

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot|Runtime Visuals")
    int32 RuntimeVisualSignalBindingCount = 0;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot|Runtime Visuals")
    FString RuntimeVisualFirstSignalActorLabel = TEXT("none");

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "SUMO TraCI Snapshot|Runtime Visuals")
    FString RuntimeVisualFirstSignalState = TEXT("none");

    UFUNCTION(BlueprintCallable, Category = "SUMO TraCI Snapshot")
    void ApplySimulationSnapshotJson(const FString& SnapshotJson);

    UFUNCTION(BlueprintCallable, Category = "SUMO TraCI Snapshot|Polling")
    void FetchSimulationSnapshotOnce();

private:
    FTimerHandle SnapshotPollingTimerHandle;

    void PollSimulationSnapshot();
    void HandleSnapshotResponse(
        FHttpRequestPtr Request,
        FHttpResponsePtr Response,
        bool bWasSuccessful
    );

    void UpdateRuntimeVisualState();
    void UpdateStage4BindingVisualState();
    void SetRuntimeQueueMarkerVisibility(
        const TArray<UStaticMeshComponent*>& Markers,
        int32 VisibleCount
    );
    void SetRuntimeVisualComponentVisible(USceneComponent* Component, bool bVisible);
    int32 GetDirectionalQueueCount(const FString& Direction) const;
};
