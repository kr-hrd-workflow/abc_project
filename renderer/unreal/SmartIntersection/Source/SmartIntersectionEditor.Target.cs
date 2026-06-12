using UnrealBuildTool;
using System.Collections.Generic;

public class SmartIntersectionEditorTarget : TargetRules
{
    public SmartIntersectionEditorTarget(TargetInfo Target) : base(Target)
    {
        Type = TargetType.Editor;
        DefaultBuildSettings = BuildSettingsVersion.Latest;
        IncludeOrderVersion = EngineIncludeOrderVersion.Latest;

        ExtraModuleNames.Add("SmartIntersectionRuntime");
    }
}
