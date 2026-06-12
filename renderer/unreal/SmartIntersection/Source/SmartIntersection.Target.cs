using UnrealBuildTool;
using System.Collections.Generic;

public class SmartIntersectionTarget : TargetRules
{
    public SmartIntersectionTarget(TargetInfo Target) : base(Target)
    {
        Type = TargetType.Game;
        DefaultBuildSettings = BuildSettingsVersion.Latest;
        IncludeOrderVersion = EngineIncludeOrderVersion.Latest;

        ExtraModuleNames.Add("SmartIntersectionRuntime");
    }
}
