from app.domain.schemas import VisionObservation


def generate_scenario_report(observation: VisionObservation) -> str:
    queues = observation.queues.model_dump()
    busiest_direction = max(queues, key=queues.get)
    busiest_count = queues[busiest_direction]
    emergency_text = (
        "Emergency vehicle approach detected."
        if observation.emergency_vehicle.present
        else "No emergency vehicle approach detected."
    )
    pedestrian_text = (
        "Pedestrian waiting request is active."
        if observation.pedestrian_waiting
        else "No pedestrian waiting request is active."
    )
    return (
        f"10-minute traffic summary for {observation.intersection_id}: "
        f"{busiest_direction} has the longest queue with {busiest_count} vehicles. "
        f"Congestion level is {observation.congestion_level}. "
        f"{emergency_text} {pedestrian_text}"
    )
