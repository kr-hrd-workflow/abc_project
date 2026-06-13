#include "TrafficSimulationController.h"

#include "Dom/JsonObject.h"
#include "Engine/World.h"
#include "HttpModule.h"
#include "Materials/MaterialInterface.h"
#include "Misc/DateTime.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"
#include "UObject/ConstructorHelpers.h"

namespace
{
int32 QueueMarkerCountFromQueue(const int32 QueueCount)
{
    if (QueueCount <= 0)
    {
        return 0;
    }

    return FMath::Clamp(FMath::CeilToInt(static_cast<float>(QueueCount) / 8.0f), 1, 4);
}

FVector EmergencyBeaconLocationForDirection(const FString& Direction)
{
    if (Direction.Equals(TEXT("east"), ESearchCase::IgnoreCase))
    {
        return FVector(210.0f, 0.0f, 105.0f);
    }
    if (Direction.Equals(TEXT("west"), ESearchCase::IgnoreCase))
    {
        return FVector(-210.0f, 0.0f, 105.0f);
    }
    if (Direction.Equals(TEXT("north"), ESearchCase::IgnoreCase))
    {
        return FVector(0.0f, 210.0f, 105.0f);
    }
    if (Direction.Equals(TEXT("south"), ESearchCase::IgnoreCase))
    {
        return FVector(0.0f, -210.0f, 105.0f);
    }

    return FVector::ZeroVector;
}
}

ATrafficSimulationController::ATrafficSimulationController()
{
    PrimaryActorTick.bCanEverTick = false;

    RendererVisualRoot = CreateDefaultSubobject<USceneComponent>(TEXT("RuntimeRendererVisualRoot"));
    SetRootComponent(RendererVisualRoot);

    static ConstructorHelpers::FObjectFinder<UStaticMesh> CubeMesh(TEXT("/Engine/BasicShapes/Cube.Cube"));
    static ConstructorHelpers::FObjectFinder<UStaticMesh> SignalHeadRuntimeMesh(
        TEXT("/Game/PhotorealRoadKit/Meshes/signal_head_uk_high_fidelity.signal_head_uk_high_fidelity")
    );
    static ConstructorHelpers::FObjectFinder<UStaticMesh> CctvRuntimeMesh(
        TEXT("/Game/PhotorealRoadKit/Meshes/cctv_camera_high_fidelity.cctv_camera_high_fidelity")
    );
    static ConstructorHelpers::FObjectFinder<UMaterialInterface> QueueVehicleRuntimeMaterial(
        TEXT("/Game/Materials/RoadOnlyRenderer/M_london_queue_vehicle_body.M_london_queue_vehicle_body")
    );
    static ConstructorHelpers::FObjectFinder<UMaterialInterface> EmergencyVehicleRuntimeMaterial(
        TEXT("/Game/Materials/RoadOnlyRenderer/M_london_emergency_vehicle_blue.M_london_emergency_vehicle_blue")
    );

    const bool bLoadedPhotorealRuntimeAssets = SignalHeadRuntimeMesh.Succeeded() &&
        CctvRuntimeMesh.Succeeded() &&
        QueueVehicleRuntimeMaterial.Succeeded() &&
        EmergencyVehicleRuntimeMaterial.Succeeded();
    if (bLoadedPhotorealRuntimeAssets)
    {
        RuntimeVisualAssetSet = TEXT("photoreal_roadkit_runtime_assets");
    }
    else
    {
        RuntimeVisualAssetSet = TEXT("engine_fallback_runtime_visuals");
    }

    UStaticMesh* RuntimeFallbackMesh = CubeMesh.Succeeded() ? CubeMesh.Object.Get() : nullptr;
    UStaticMesh* RuntimeSignalHeadMesh = SignalHeadRuntimeMesh.Succeeded()
        ? SignalHeadRuntimeMesh.Object.Get()
        : RuntimeFallbackMesh;
    UStaticMesh* RuntimeCctvMesh = CctvRuntimeMesh.Succeeded()
        ? CctvRuntimeMesh.Object.Get()
        : RuntimeFallbackMesh;
    UMaterialInterface* RuntimeQueueVehicleMaterial =
        QueueVehicleRuntimeMaterial.Succeeded() ? QueueVehicleRuntimeMaterial.Object.Get() : nullptr;
    UMaterialInterface* RuntimeEmergencyVehicleMaterial =
        EmergencyVehicleRuntimeMaterial.Succeeded() ? EmergencyVehicleRuntimeMaterial.Object.Get() : nullptr;

    const auto ConfigureVisualComponent = [this, RuntimeFallbackMesh](
        UStaticMeshComponent* Component,
        const FVector& Location,
        const FVector& Scale,
        UStaticMesh* RuntimeMesh = nullptr,
        UMaterialInterface* RuntimeMaterial = nullptr
    )
    {
        if (!Component)
        {
            return;
        }

        Component->SetupAttachment(RendererVisualRoot);
        Component->SetRelativeLocation(Location);
        Component->SetRelativeScale3D(Scale);
        UStaticMesh* ComponentMesh = RuntimeMesh ? RuntimeMesh : RuntimeFallbackMesh;
        if (ComponentMesh)
        {
            Component->SetStaticMesh(ComponentMesh);
        }
        if (RuntimeMaterial)
        {
            Component->SetMaterial(0, RuntimeMaterial);
        }
        Component->SetVisibility(false, true);
        Component->SetHiddenInGame(true, true);
    };

    EastWestGreenSignalVisual = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("RuntimeVisual_EastWestGreenSignal"));
    ConfigureVisualComponent(EastWestGreenSignalVisual, FVector(140.0f, 0.0f, 80.0f), FVector(0.26f, 0.08f, 0.08f), RuntimeSignalHeadMesh);

    NorthSouthGreenSignalVisual = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("RuntimeVisual_NorthSouthGreenSignal"));
    ConfigureVisualComponent(NorthSouthGreenSignalVisual, FVector(0.0f, 140.0f, 80.0f), FVector(0.08f, 0.26f, 0.08f), RuntimeSignalHeadMesh);

    PedestrianCrossingVisual = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("RuntimeVisual_PedestrianCrossing"));
    ConfigureVisualComponent(PedestrianCrossingVisual, FVector(-90.0f, -90.0f, 58.0f), FVector(0.20f, 0.20f, 0.035f));

    EmergencyVehicleDirectionVisual = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("RuntimeVisual_EmergencyVehicleDirection"));
    ConfigureVisualComponent(EmergencyVehicleDirectionVisual, FVector(210.0f, 0.0f, 105.0f), FVector(0.12f, 0.12f, 0.12f), nullptr, RuntimeEmergencyVehicleMaterial);

    PixelStreamReadyVisual = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("RuntimeVisual_PixelStreamReady"));
    ConfigureVisualComponent(PixelStreamReadyVisual, FVector(-210.0f, 0.0f, 105.0f), FVector(0.12f, 0.12f, 0.12f), RuntimeCctvMesh);

    NorthQueueVisualMarker0 = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("RuntimeVisual_NorthQueueMarker0"));
    ConfigureVisualComponent(NorthQueueVisualMarker0, FVector(-36.0f, 230.0f, 40.0f), FVector(0.08f, 0.08f, 0.04f), nullptr, RuntimeQueueVehicleMaterial);
    NorthQueueVisualMarker1 = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("RuntimeVisual_NorthQueueMarker1"));
    ConfigureVisualComponent(NorthQueueVisualMarker1, FVector(-12.0f, 230.0f, 40.0f), FVector(0.08f, 0.08f, 0.04f), nullptr, RuntimeQueueVehicleMaterial);
    NorthQueueVisualMarker2 = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("RuntimeVisual_NorthQueueMarker2"));
    ConfigureVisualComponent(NorthQueueVisualMarker2, FVector(12.0f, 230.0f, 40.0f), FVector(0.08f, 0.08f, 0.04f), nullptr, RuntimeQueueVehicleMaterial);
    NorthQueueVisualMarker3 = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("RuntimeVisual_NorthQueueMarker3"));
    ConfigureVisualComponent(NorthQueueVisualMarker3, FVector(36.0f, 230.0f, 40.0f), FVector(0.08f, 0.08f, 0.04f), nullptr, RuntimeQueueVehicleMaterial);

    SouthQueueVisualMarker0 = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("RuntimeVisual_SouthQueueMarker0"));
    ConfigureVisualComponent(SouthQueueVisualMarker0, FVector(-36.0f, -230.0f, 40.0f), FVector(0.08f, 0.08f, 0.04f), nullptr, RuntimeQueueVehicleMaterial);
    SouthQueueVisualMarker1 = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("RuntimeVisual_SouthQueueMarker1"));
    ConfigureVisualComponent(SouthQueueVisualMarker1, FVector(-12.0f, -230.0f, 40.0f), FVector(0.08f, 0.08f, 0.04f), nullptr, RuntimeQueueVehicleMaterial);
    SouthQueueVisualMarker2 = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("RuntimeVisual_SouthQueueMarker2"));
    ConfigureVisualComponent(SouthQueueVisualMarker2, FVector(12.0f, -230.0f, 40.0f), FVector(0.08f, 0.08f, 0.04f), nullptr, RuntimeQueueVehicleMaterial);
    SouthQueueVisualMarker3 = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("RuntimeVisual_SouthQueueMarker3"));
    ConfigureVisualComponent(SouthQueueVisualMarker3, FVector(36.0f, -230.0f, 40.0f), FVector(0.08f, 0.08f, 0.04f), nullptr, RuntimeQueueVehicleMaterial);

    EastQueueVisualMarker0 = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("RuntimeVisual_EastQueueMarker0"));
    ConfigureVisualComponent(EastQueueVisualMarker0, FVector(230.0f, -36.0f, 40.0f), FVector(0.08f, 0.08f, 0.04f), nullptr, RuntimeQueueVehicleMaterial);
    EastQueueVisualMarker1 = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("RuntimeVisual_EastQueueMarker1"));
    ConfigureVisualComponent(EastQueueVisualMarker1, FVector(230.0f, -12.0f, 40.0f), FVector(0.08f, 0.08f, 0.04f), nullptr, RuntimeQueueVehicleMaterial);
    EastQueueVisualMarker2 = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("RuntimeVisual_EastQueueMarker2"));
    ConfigureVisualComponent(EastQueueVisualMarker2, FVector(230.0f, 12.0f, 40.0f), FVector(0.08f, 0.08f, 0.04f), nullptr, RuntimeQueueVehicleMaterial);
    EastQueueVisualMarker3 = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("RuntimeVisual_EastQueueMarker3"));
    ConfigureVisualComponent(EastQueueVisualMarker3, FVector(230.0f, 36.0f, 40.0f), FVector(0.08f, 0.08f, 0.04f), nullptr, RuntimeQueueVehicleMaterial);

    WestQueueVisualMarker0 = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("RuntimeVisual_WestQueueMarker0"));
    ConfigureVisualComponent(WestQueueVisualMarker0, FVector(-230.0f, -36.0f, 40.0f), FVector(0.08f, 0.08f, 0.04f), nullptr, RuntimeQueueVehicleMaterial);
    WestQueueVisualMarker1 = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("RuntimeVisual_WestQueueMarker1"));
    ConfigureVisualComponent(WestQueueVisualMarker1, FVector(-230.0f, -12.0f, 40.0f), FVector(0.08f, 0.08f, 0.04f), nullptr, RuntimeQueueVehicleMaterial);
    WestQueueVisualMarker2 = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("RuntimeVisual_WestQueueMarker2"));
    ConfigureVisualComponent(WestQueueVisualMarker2, FVector(-230.0f, 12.0f, 40.0f), FVector(0.08f, 0.08f, 0.04f), nullptr, RuntimeQueueVehicleMaterial);
    WestQueueVisualMarker3 = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("RuntimeVisual_WestQueueMarker3"));
    ConfigureVisualComponent(WestQueueVisualMarker3, FVector(-230.0f, 36.0f, 40.0f), FVector(0.08f, 0.08f, 0.04f), nullptr, RuntimeQueueVehicleMaterial);
}

void ATrafficSimulationController::BeginPlay()
{
    Super::BeginPlay();

    if (!bEnableSnapshotPolling)
    {
        LastSnapshotFetchStatus = TEXT("polling disabled");
        return;
    }

    PollSimulationSnapshot();
    GetWorldTimerManager().SetTimer(
        SnapshotPollingTimerHandle,
        this,
        &ATrafficSimulationController::PollSimulationSnapshot,
        FMath::Max(0.1f, SnapshotPollingIntervalSeconds),
        true
    );
}

void ATrafficSimulationController::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
    GetWorldTimerManager().ClearTimer(SnapshotPollingTimerHandle);
    Super::EndPlay(EndPlayReason);
}

void ATrafficSimulationController::ApplySimulationSnapshotJson(const FString& SnapshotJson)
{
    LastSnapshotJson = SnapshotJson;
    LastSnapshotReceivedAtUtc = FDateTime::UtcNow().ToIso8601();

    TSharedPtr<FJsonObject> Root;
    const TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(SnapshotJson);
    if (!FJsonSerializer::Deserialize(Reader, Root) || !Root.IsValid())
    {
        ActiveSignalGroup = TEXT("unknown");
        CurrentTiming.ActivePhase = ETrafficSimulationPhase::Unknown;
        DirectionalQueues.Empty();
        bPedestrianRequestActive = false;
        bEmergencyVehicleApproaching = false;
        EmergencyVehicleDirection = TEXT("none");
        bPixelStreamConnected = false;
        PixelStreamStatus = TEXT("disconnected");
        bLastSnapshotParsed = false;
        UpdateRuntimeVisualState();
        return;
    }

    bLastSnapshotParsed = true;

    FString City;
    if (Root->TryGetStringField(TEXT("cityProfileId"), City) || Root->TryGetStringField(TEXT("city_profile"), City) || Root->TryGetStringField(TEXT("city"), City))
    {
        CityProfileId = City;
    }

    FString Phase;
    if (Root->TryGetStringField(TEXT("activeSignalGroup"), Phase) || Root->TryGetStringField(TEXT("signal_phase"), Phase))
    {
        ActiveSignalGroup = Phase;
        CurrentTiming.Source = TEXT("SUMO truth source via FastAPI snapshot");
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

    const TSharedPtr<FJsonObject>* Queues = nullptr;
    if (Root->TryGetObjectField(TEXT("queues"), Queues) && Queues && Queues->IsValid())
    {
        DirectionalQueues.Empty();
        for (const TPair<FString, TSharedPtr<FJsonValue>>& QueueEntry : (*Queues)->Values)
        {
            DirectionalQueues.Add(QueueEntry.Key, static_cast<int32>(QueueEntry.Value->AsNumber()));
        }
    }

    bool bPedestrianRequest = false;
    if (Root->TryGetBoolField(TEXT("pedestrian_request"), bPedestrianRequest) ||
        Root->TryGetBoolField(TEXT("pedestrianRequest"), bPedestrianRequest) ||
        Root->TryGetBoolField(TEXT("crosswalk_request"), bPedestrianRequest))
    {
        bPedestrianRequestActive = bPedestrianRequest;
    }

    bool bEmergency = false;
    if (Root->TryGetBoolField(TEXT("emergency_vehicle_approach"), bEmergency) || Root->TryGetBoolField(TEXT("emergency_priority"), bEmergency))
    {
        bEmergencyVehicleApproaching = bEmergency;
    }

    FString EmergencyDirection;
    if (Root->TryGetStringField(TEXT("emergencyVehicleDirection"), EmergencyDirection) || Root->TryGetStringField(TEXT("emergency_direction"), EmergencyDirection))
    {
        EmergencyVehicleDirection = EmergencyDirection;
    }

    bool bStreamConnected = false;
    if (Root->TryGetBoolField(TEXT("pixelStreamConnected"), bStreamConnected) ||
        Root->TryGetBoolField(TEXT("pixel_stream_connected"), bStreamConnected) ||
        Root->TryGetBoolField(TEXT("stream_connected"), bStreamConnected))
    {
        bPixelStreamConnected = bStreamConnected;
        PixelStreamStatus = bPixelStreamConnected ? TEXT("connected") : TEXT("disconnected");
    }

    FString StreamStatus;
    if (Root->TryGetStringField(TEXT("pixelStreamStatus"), StreamStatus) ||
        Root->TryGetStringField(TEXT("pixel_stream_status"), StreamStatus) ||
        Root->TryGetStringField(TEXT("stream_status"), StreamStatus))
    {
        PixelStreamStatus = StreamStatus;
        const bool bExplicitlyDisconnected = StreamStatus.Contains(TEXT("disconnect"), ESearchCase::IgnoreCase);
        bPixelStreamConnected = !bExplicitlyDisconnected && (
            StreamStatus.Equals(TEXT("connected"), ESearchCase::IgnoreCase) ||
            StreamStatus.Equals(TEXT("streaming"), ESearchCase::IgnoreCase) ||
            StreamStatus.Equals(TEXT("ready"), ESearchCase::IgnoreCase));
    }

    FString SignallingUrl;
    if (Root->TryGetStringField(TEXT("pixelStreamSignallingUrl"), SignallingUrl) ||
        Root->TryGetStringField(TEXT("pixel_stream_signalling_url"), SignallingUrl) ||
        Root->TryGetStringField(TEXT("pixel_stream_url"), SignallingUrl))
    {
        PixelStreamSignallingUrl = SignallingUrl;
    }

    UpdateRuntimeVisualState();
}

void ATrafficSimulationController::FetchSimulationSnapshotOnce()
{
    PollSimulationSnapshot();
}

void ATrafficSimulationController::PollSimulationSnapshot()
{
    if (SnapshotEndpointUrl.IsEmpty())
    {
        LastSnapshotFetchStatus = TEXT("missing endpoint");
        return;
    }

    FString RequestUrl = SnapshotEndpointUrl;
    if (!CityProfileId.IsEmpty() && !RequestUrl.Contains(TEXT("city_profile_id"), ESearchCase::IgnoreCase))
    {
        RequestUrl += RequestUrl.Contains(TEXT("?")) ? TEXT("&") : TEXT("?");
        RequestUrl += FString::Printf(TEXT("city_profile_id=%s"), *CityProfileId);
    }

    TSharedRef<IHttpRequest, ESPMode::ThreadSafe> Request = FHttpModule::Get().CreateRequest();
    Request->SetURL(RequestUrl);
    Request->SetVerb(TEXT("GET"));
    Request->SetHeader(TEXT("Accept"), TEXT("application/json"));
    Request->OnProcessRequestComplete().BindUObject(
        this,
        &ATrafficSimulationController::HandleSnapshotResponse
    );

    LastSnapshotFetchStatus = TEXT("requesting");
    if (!Request->ProcessRequest())
    {
        LastSnapshotFetchStatus = TEXT("request not started");
    }
}

void ATrafficSimulationController::HandleSnapshotResponse(
    FHttpRequestPtr Request,
    FHttpResponsePtr Response,
    bool bWasSuccessful
)
{
    static_cast<void>(Request);

    if (!bWasSuccessful || !Response.IsValid())
    {
        LastSnapshotFetchStatus = TEXT("request failed");
        bLastSnapshotParsed = false;
        return;
    }

    const int32 ResponseCode = Response->GetResponseCode();
    if (ResponseCode < 200 || ResponseCode >= 300)
    {
        LastSnapshotFetchStatus = FString::Printf(TEXT("http %d"), ResponseCode);
        bLastSnapshotParsed = false;
        return;
    }

    LastSnapshotFetchStatus = TEXT("received");
    ApplySimulationSnapshotJson(Response->GetContentAsString());
}

void ATrafficSimulationController::UpdateRuntimeVisualState()
{
    const bool bEastWestGreen = CurrentTiming.ActivePhase == ETrafficSimulationPhase::EastWestGreen;
    const bool bNorthSouthGreen = CurrentTiming.ActivePhase == ETrafficSimulationPhase::NorthSouthGreen;

    RuntimeVisualSignalState = TEXT("unknown");
    if (bEastWestGreen)
    {
        RuntimeVisualSignalState = TEXT("east_west_green");
    }
    else if (bNorthSouthGreen)
    {
        RuntimeVisualSignalState = TEXT("north_south_green");
    }
    else if (CurrentTiming.ActivePhase == ETrafficSimulationPhase::AllRed)
    {
        RuntimeVisualSignalState = TEXT("all_red");
    }

    SetRuntimeVisualComponentVisible(EastWestGreenSignalVisual, bEastWestGreen);
    SetRuntimeVisualComponentVisible(NorthSouthGreenSignalVisual, bNorthSouthGreen);

    RuntimeVisualNorthQueueMarkers = QueueMarkerCountFromQueue(GetDirectionalQueueCount(TEXT("north")));
    RuntimeVisualSouthQueueMarkers = QueueMarkerCountFromQueue(GetDirectionalQueueCount(TEXT("south")));
    RuntimeVisualEastQueueMarkers = QueueMarkerCountFromQueue(GetDirectionalQueueCount(TEXT("east")));
    RuntimeVisualWestQueueMarkers = QueueMarkerCountFromQueue(GetDirectionalQueueCount(TEXT("west")));

    SetRuntimeQueueMarkerVisibility(
        {
            NorthQueueVisualMarker0,
            NorthQueueVisualMarker1,
            NorthQueueVisualMarker2,
            NorthQueueVisualMarker3,
        },
        RuntimeVisualNorthQueueMarkers
    );
    SetRuntimeQueueMarkerVisibility(
        {
            SouthQueueVisualMarker0,
            SouthQueueVisualMarker1,
            SouthQueueVisualMarker2,
            SouthQueueVisualMarker3,
        },
        RuntimeVisualSouthQueueMarkers
    );
    SetRuntimeQueueMarkerVisibility(
        {
            EastQueueVisualMarker0,
            EastQueueVisualMarker1,
            EastQueueVisualMarker2,
            EastQueueVisualMarker3,
        },
        RuntimeVisualEastQueueMarkers
    );
    SetRuntimeQueueMarkerVisibility(
        {
            WestQueueVisualMarker0,
            WestQueueVisualMarker1,
            WestQueueVisualMarker2,
            WestQueueVisualMarker3,
        },
        RuntimeVisualWestQueueMarkers
    );

    bRuntimeVisualPedestrianCrossingVisible = bPedestrianRequestActive;
    bRuntimeVisualEmergencyBeaconVisible = bEmergencyVehicleApproaching &&
        !EmergencyVehicleDirection.Equals(TEXT("none"), ESearchCase::IgnoreCase);
    RuntimeVisualEmergencyDirectionState = EmergencyVehicleDirection;
    if (!bRuntimeVisualEmergencyBeaconVisible)
    {
        RuntimeVisualEmergencyDirectionState = TEXT("none");
    }
    RuntimeVisualEmergencyBeaconLocation = EmergencyBeaconLocationForDirection(
        RuntimeVisualEmergencyDirectionState
    );
    bRuntimeVisualPixelStreamReadyVisible = bPixelStreamConnected && (
        PixelStreamStatus.Equals(TEXT("ready"), ESearchCase::IgnoreCase) ||
        PixelStreamStatus.Equals(TEXT("streaming"), ESearchCase::IgnoreCase) ||
        PixelStreamStatus.Equals(TEXT("connected"), ESearchCase::IgnoreCase)
    );

    SetRuntimeVisualComponentVisible(
        PedestrianCrossingVisual,
        bRuntimeVisualPedestrianCrossingVisible
    );
    SetRuntimeVisualComponentVisible(
        EmergencyVehicleDirectionVisual,
        bRuntimeVisualEmergencyBeaconVisible
    );
    if (EmergencyVehicleDirectionVisual)
    {
        EmergencyVehicleDirectionVisual->SetRelativeLocation(RuntimeVisualEmergencyBeaconLocation);
    }
    SetRuntimeVisualComponentVisible(
        PixelStreamReadyVisual,
        bRuntimeVisualPixelStreamReadyVisible
    );
}

void ATrafficSimulationController::SetRuntimeQueueMarkerVisibility(
    const TArray<UStaticMeshComponent*>& Markers,
    const int32 VisibleCount
)
{
    for (int32 MarkerIndex = 0; MarkerIndex < Markers.Num(); ++MarkerIndex)
    {
        SetRuntimeVisualComponentVisible(Markers[MarkerIndex], MarkerIndex < VisibleCount);
    }
}

void ATrafficSimulationController::SetRuntimeVisualComponentVisible(
    USceneComponent* Component,
    const bool bVisible
)
{
    if (!Component)
    {
        return;
    }

    Component->SetVisibility(bVisible, true);
    Component->SetHiddenInGame(!bVisible, true);
}

int32 ATrafficSimulationController::GetDirectionalQueueCount(const FString& Direction) const
{
    if (const int32* QueueCount = DirectionalQueues.Find(Direction))
    {
        return *QueueCount;
    }

    return 0;
}
