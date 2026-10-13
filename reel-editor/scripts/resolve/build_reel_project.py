"""Builds the whole reel project in DaVinci Resolve from the export folder.

Run it from inside Resolve:  Workspace > Scripts > build_reel_project
(copy this file to  %PROGRAMDATA%\\Blackmagic Design\\DaVinci Resolve\\Fusion\\Scripts\\Utility\\
 on Windows, or  /Library/Application Support/Blackmagic Design/DaVinci Resolve/Fusion/Scripts/Utility/  on macOS)

The export folder must hold (as sent by Claude):
  reel.mp4                 the original 58 s video (copy it in yourself)
  timeline.fcpxml          cuts + zoom keyframes
  1-camera.mp4             the camera-moved video (fallback for V1)
  2-subtitles/ 3-icons/ 4-broll/ 5-title/ 6-flash/   transparent PNG sequences
  subtitles-lines.srt
  LUTs/*.cube

What it does: creates the project (1080x1920, 24 fps), imports everything into bins, imports the
timeline, stacks the layers on V2-V6 from the first frame, applies the Teal Neon LUT to V1,
adds the subtitle track, and prints what is left to do by hand.
"""

import os
import pathlib
import re
import sys

PROJECT_NAME = "Reel - Dr Salma"
# Leave empty to be asked for the folder; or paste the path, e.g. r"G:\\Shared drives\\EDENTIFY\\PROD\\dr salma\\EXPORT\\CLAUDE"
EXPORT_DIR = r""
LUT_NAME = "Reel - Teal Neon.cube"  # or "Reel - Golden Warm.cube" / "Reel - Emerald Dark.cube"
FRAMES = 869  # length of every layer, in frames
LAYERS = [  # (folder, track) bottom to top
    ("4-broll", 2),
    ("6-flash", 3),
    ("3-icons", 4),
    ("5-title", 5),
    ("2-subtitles", 6),
]


def get_resolve():
    # Inside Resolve's Scripts menu `resolve` / `app` are usually predefined.
    g = globals()
    if g.get("resolve"):
        return g["resolve"]
    if g.get("app"):
        try:
            return g["app"].GetResolve()
        except Exception:
            pass
    try:
        import DaVinciResolveScript as dvr  # external scripting (Studio)

        return dvr.scriptapp("Resolve")
    except Exception:
        return None


def ask_folder(resolve):
    if EXPORT_DIR:
        return EXPORT_DIR
    try:
        fusion = resolve.Fusion()
        path = fusion.RequestDir("", {"FReqS_Title": "Choose the reel export folder"})
        if path:
            return path
    except Exception:
        pass
    print("Set EXPORT_DIR at the top of this script to the export folder, then run it again.")
    sys.exit(1)


def main():
    resolve = get_resolve()
    if not resolve:
        print("Could not reach DaVinci Resolve. Run this from Workspace > Scripts inside Resolve.")
        sys.exit(1)
    root = ask_folder(resolve)
    p = lambda *a: os.path.join(root, *a)  # noqa: E731
    for need in ["timeline.fcpxml", "reel.mp4"]:
        if not os.path.exists(p(need)):
            print(f"Missing {need} in {root}")
            sys.exit(1)

    pm = resolve.GetProjectManager()
    project = pm.CreateProject(PROJECT_NAME) or pm.LoadProject(PROJECT_NAME)
    if not project:
        print(f"Could not create or open the project '{PROJECT_NAME}'.")
        sys.exit(1)
    for k, v in {
        "timelineResolutionWidth": "1080",
        "timelineResolutionHeight": "1920",
        "timelineFrameRate": "24",
        "timelinePlaybackFrameRate": "24",
    }.items():
        project.SetSetting(k, v)

    mp = project.GetMediaPool()
    root_bin = mp.GetRootFolder()
    footage = mp.AddSubFolder(root_bin, "Footage")
    layers_bin = mp.AddSubFolder(root_bin, "Layers")
    subs_bin = mp.AddSubFolder(root_bin, "Subtitles")

    mp.SetCurrentFolder(footage)
    mp.ImportMedia([f for f in [p("reel.mp4"), p("1-camera.mp4")] if os.path.exists(f)])

    # point the timeline at this machine's reel.mp4 before importing it
    with open(p("timeline.fcpxml"), encoding="utf-8") as fh:
        xml = fh.read()
    xml = re.sub(r'(<media-rep kind="original-media" src=")[^"]*(")', lambda m: m.group(1) + pathlib.Path(p("reel.mp4")).resolve().as_uri() + m.group(2), xml)
    local_xml = p("timeline-local.fcpxml")
    with open(local_xml, "w", encoding="utf-8") as fh:
        fh.write(xml)
    timeline = mp.ImportTimelineFromFile(local_xml, {"timelineName": "Reel edit", "importSourceClips": True})
    if not timeline:
        print("The FCPXML did not import. Use 1-camera.mp4 on V1 instead.")
        timeline = mp.CreateEmptyTimeline("Reel edit")
        cam = [c for c in footage.GetClipList() if c.GetName().startswith("1-camera")]
        if cam:
            mp.AppendToTimeline([{"mediaPoolItem": cam[0], "trackIndex": 1, "recordFrame": timeline.GetStartFrame()}])
    project.SetCurrentTimeline(timeline)
    start = timeline.GetStartFrame()

    while timeline.GetTrackCount("video") < max(t for _, t in LAYERS):
        timeline.AddTrack("video")

    mp.SetCurrentFolder(layers_bin)
    done = []
    for folder, track in LAYERS:
        d = p(folder)
        if not os.path.isdir(d):
            print(f"Skipped {folder}: folder not found")
            continue
        items = mp.ImportMedia([{"FilePath": os.path.join(d, f"{folder}_%04d.png"), "StartIndex": 0, "EndIndex": FRAMES - 1}])
        if not items:
            print(f"Skipped {folder}: Resolve could not import the image sequence")
            continue
        mp.AppendToTimeline([{"mediaPoolItem": items[0], "startFrame": 0, "endFrame": FRAMES - 1, "trackIndex": track, "recordFrame": start}])
        timeline.SetTrackName("video", track, folder.split("-", 1)[1])
        done.append(folder)
    timeline.SetTrackName("video", 1, "video")

    lut = p("LUTs", LUT_NAME)
    if os.path.exists(lut):
        for item in timeline.GetItemListInTrack("video", 1) or []:
            try:
                item.SetLUT(1, lut)
            except Exception:
                pass

    srt = p("subtitles-lines.srt")
    if os.path.exists(srt):
        mp.SetCurrentFolder(subs_bin)
        subs = mp.ImportMedia([srt])
        if subs:
            if timeline.GetTrackCount("subtitle") < 1:
                timeline.AddTrack("subtitle")
            mp.AppendToTimeline([{"mediaPoolItem": subs[0], "trackIndex": 1, "recordFrame": start}])
            timeline.SetTrackEnable("subtitle", 1, False)  # the animated layer on V6 is the default

    pm.SaveProject()
    print("Done:", ", ".join(done))
    print("Left to do by hand:")
    print("  - V3 (flash): Inspector > Composite Mode > Screen")
    print("  - V1: Effects > ResolveFX Light > Glow")
    print("  - If V1 shows offline: Media Pool > right click > Relink Selected Clips > reel.mp4")


main()
