# Unreal Archive

This directory isolates the previous Unreal Engine / Pixel Streaming renderer path.

Checkpoint before isolation: `4faf3281 checkpoint Unreal operator stage 7 work`.

Tracked files were moved under `archive/unreal/original/` with their original repo paths preserved, including:

- `renderer/unreal/`
- UE-specific `scripts/`
- UE-specific `docs/`, Superpowers plans, references, and agent prompts
- UE-specific API snapshot service/fixture files
- UE-specific web runtime test
- tracked proof artifacts
- `tools/asset-pipeline/`

`docs/technotes/` was intentionally left in place as requested.

Ignored local proof/cache artifacts and generated UE build/cache directories were deleted after the checkpoint commit instead of being archived. If those are needed later, regenerate them from the archived scripts or recover from local backups.

Untracked active files that differed from the archived copy were preserved under `archive/unreal/original/_active-leftovers/` instead of overwriting the archive. Review that directory before restoring the Unreal path.

To resume the Unreal path, restore the needed paths from `archive/unreal/original/` back to their original locations and recover the removed npm script aliases from commit `4faf3281` if needed. Before committing any resumed UE work, scan `DefaultEngine.ini` and generated configs for `SecurityToken=` and remove generated secrets.
