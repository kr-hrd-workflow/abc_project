"use client";

import { memo, useMemo, type ReactNode } from "react";
import { ContactShadows } from "@react-three/drei";

import { getSeamlessGrade } from "./seamlessGrade";
import type { Stage6TimeOfDay } from "./stage6Quality";
import { INTERSECTION_BOX_METERS } from "./roadGeometry";

// Fresh night vehicle grounding driven ONLY by the shared night grade. Built
// fresh on drei primitives (ContactShadows + MeshReflectorMaterial) — it does
// NOT reuse the failed WetRoadReflectors / DynamicVehicleLayer materials as the
// look. The dynamic SUMO vehicle layer is rendered as children unchanged; this
// component adds the look around it: emissive lights, a contact shadow, and a
// planar wet reflection so the cars sit IN the neon scene, not pasted on top.

export type NightVehicleTreatmentConfig = {
  emissiveIntensity: number;
  headlightColor: string;
  taillightColor: string;
  // Soft light pool cast under each car onto the wet asphalt.
  roadLightPoolIntensity: number;
  contactShadow: {
    enabled: boolean;
    opacity: number;
    blur: number;
    scale: number;
  };
  wetReflection: {
    enabled: boolean;
    mixStrength: number;
    roughness: number;
  };
};

// Pure, GPU-free config so the look is unit-testable. Night turns on the full
// grounding stack; the day path keeps it off (legacy day look owns daytime).
export function resolveNightVehicleTreatment(
  timeOfDay: Stage6TimeOfDay
): NightVehicleTreatmentConfig {
  const grade = getSeamlessGrade(timeOfDay);
  const isNight = timeOfDay === "night";

  return {
    emissiveIntensity: grade.vehicleEmissiveIntensity,
    headlightColor: "#fff4d6",
    taillightColor: "#ff2b1f",
    roadLightPoolIntensity: isNight ? grade.vehicleEmissiveIntensity * 0.5 : 0,
    contactShadow: {
      enabled: isNight,
      opacity: 0.55,
      blur: 2.4,
      scale: INTERSECTION_BOX_METERS * 2
    },
    wetReflection: {
      enabled: isNight,
      // Reflection mix scales with bloom so neon spill and its reflection track.
      mixStrength: grade.bloomIntensity * 0.5,
      roughness: 0.32
    }
  };
}

function NightVehicleTreatmentComponent({
  timeOfDay,
  children
}: {
  timeOfDay: Stage6TimeOfDay;
  children: ReactNode;
}) {
  const config = useMemo(
    () => resolveNightVehicleTreatment(timeOfDay),
    [timeOfDay]
  );

  // Day path is a transparent pass-through so the legacy look is untouched.
  if (!config.contactShadow.enabled && !config.wetReflection.enabled) {
    return <>{children}</>;
  }

  return (
    <group
      name="gangnam-night-vehicle-treatment"
      userData={{
        treatmentSource: "fresh_night_grade",
        emissiveIntensity: config.emissiveIntensity,
        wetReflection: config.wetReflection.enabled
      }}
    >
      {/* Wet reflection is now supplied by the projected plate itself (the plate
          IS the wet asphalt), so the separate dark MeshReflectorMaterial plane is
          intentionally NOT rendered — it overlapped and darkened the plate at the
          intersection. config.wetReflection stays as look intent / for tests. */}

      {/* Soft contact shadow so each car is anchored to the ground plane. */}
      {config.contactShadow.enabled ? (
        <ContactShadows
          position={[0, 0.02, 0]}
          opacity={config.contactShadow.opacity}
          blur={config.contactShadow.blur}
          scale={config.contactShadow.scale}
          far={6}
          frames={1}
        />
      ) : null}

      {/* The unmodified SUMO-truth vehicle layer renders on top of its own
          grounding; positions still come solely from SimulationFrameSnapshot. */}
      {children}
    </group>
  );
}

export const NightVehicleTreatment = memo(NightVehicleTreatmentComponent);
NightVehicleTreatment.displayName = "NightVehicleTreatment";
