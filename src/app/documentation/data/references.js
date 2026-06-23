// Central reference content for the docs "References" section. Three buckets:
//   technicalDefinitions - concepts (e.g. "what is rigging?", protocols)
//   fileExtensions       - real files written to disk (.psd, .moc3, ...)
//   applications         - software, plugins and platforms used in the pipeline
//
// Stage pages link INTO these: inline glossary terms -> a technicalDefinition,
// tool names -> an application, handoff files -> a fileExtension or protocol.
// `id` doubles as the URL hash so any page can be opened directly.

// ---------------------------------------------------------------------------
// Technical definitions (concepts + live protocols).
// `summary` is the short text shown in an inline-term hover tooltip.
// `definition` is the full prose shown on the reference page.
// `relatedStages` lists the pipeline stage ids where the concept matters.
// ---------------------------------------------------------------------------
export const technicalDefinitions = [
  {
    id: 'rigging',
    term: 'Rigging',
    summary: 'Turning flat, separated artwork into a controllable puppet with deformers, parameters and physics.',
    definition:
      'Rigging is the step that turns static, part-separated artwork into a live, controllable puppet. The rigger imports the layered .psd, wraps each part in a mesh, and attaches deformers driven by named parameters (head angle, eye blink, mouth open) plus a physics simulation for secondary motion. Nothing on screen moves yet, but every way the avatar will ever be able to move is decided here. For 2D VTubers this work happens almost exclusively in Live2D Cubism.',
    relatedStages: ['rig'],
  },
  {
    id: 'part-separation',
    term: 'Part separation',
    summary: 'Splitting the artwork into independent layers so each movable piece can be rigged on its own.',
    definition:
      'Part separation is the practice of painting a character as many independent layers rather than a single flat image, so that every piece that needs to move — each eye, the mouth, individual hair strands, accessories — lives on its own layer. It is the defining requirement of the Artwork stage: rigging can only deform what has been separated, so cleaner separation directly translates into a more expressive final model. The separated layers travel to rigging as a single .psd.',
    relatedStages: ['art', 'rig'],
  },
  {
    id: 'ready-to-rig',
    term: 'Ready-to-Rig',
    summary: 'Model artwork prepared for rigging — every movable part on its own layer — as opposed to a flattened, render-only illustration.',
    definition:
      'A Ready-to-Rig file is character artwork prepared specifically for the rigging stage rather than for viewing. Every piece that needs to move — each eye, the mouth, hair strands, accessories — is painted on its own layer and kept un-flattened, so the rigger can wrap each part in its own mesh. This is what separates a Ready-to-Rig model file from an ordinary rendered drawing or exported illustration, which flattens everything into a single image and cannot be rigged. In practice it travels to rigging as a single layered .psd.',
    relatedStages: ['art', 'rig'],
  },
  {
    id: 'parameter',
    term: 'Parameter',
    summary: 'A named slider in Cubism (AngleX, MouthOpen...) that drives one or more deformations.',
    definition:
      'A parameter is a named, numeric slider defined during rigging — AngleX, EyeOpenLeft, MouthOpen and so on — that drives one or more deformations on the model. Parameters are the contract between the rig and everything downstream: a tracking app does not move artwork directly, it moves these parameters, and the rig translates each value into the deformations the artist set up. A well-designed parameter set is what lets one face-tracking value (say, a smile) read naturally across the whole face.',
    relatedStages: ['rig', 'tracking'],
  },
  {
    id: 'physics',
    term: 'Physics',
    summary: 'Cubism simulation that adds secondary motion (hair sway, accessories) reacting to head movement.',
    definition:
      'Physics is the Cubism simulation layer that adds secondary motion: hair, earrings, ribbons and other loose elements sway and settle in response to head movement instead of staying rigidly attached. It is configured in the editor by linking input parameters (usually head angle) to pendulum-style outputs, and it runs live in the tracking app. Good physics is much of what separates a stiff, papery model from one that feels alive.',
    relatedStages: ['rig'],
  },
  {
    id: 'arkit',
    term: 'ARKit',
    summary: "Apple's face-tracking system; outputs 52 FACS blendshapes — the gold standard for high-fidelity Live2D tracking.",
    definition:
      "ARKit is Apple's on-device face-tracking system, available on TrueDepth iPhones and iPads. It outputs 52 standardized blendshape values based on FACS, and because that set is consistent and high quality it has become the gold-standard input for expressive Live2D tracking. An iOS device runs ARKit and streams the blendshapes to the desktop tracker (often by way of a remapping tool such as VBridger) over the local network.",
    relatedStages: ['tracking'],
  },
  {
    id: 'facs',
    term: 'FACS',
    summary: 'Facial Action Coding System — the standardized muscle-movement set ARKit blendshapes are based on.',
    definition:
      'FACS — the Facial Action Coding System — is a standardized taxonomy of individual facial muscle movements (action units) originally developed for psychology research. It matters here because ARKit blendshapes are modeled on it: each tracked value corresponds to a recognizable, named facial action. That shared vocabulary is what lets different apps and rigs agree on what "jaw open" or "left brow raise" means.',
    relatedStages: ['tracking'],
  },
  {
    id: 'blendshape',
    term: 'Blendshape',
    summary: 'A single tracked facial value (jawOpen, mouthSmileLeft...) that gets remapped into Cubism parameters.',
    definition:
      'A blendshape is a single tracked facial value — jawOpen, mouthSmileLeft, eyeBlinkRight and so on — produced by face tracking such as ARKit. On their own blendshapes describe a face, not your model; a tool like VBridger (or the tracker itself) blends and remaps them onto the rig\'s Cubism parameters so your specific avatar reacts the way you want. The richer and cleaner the blendshape input, the more nuanced the mouth, tongue and expression control you can build.',
    relatedStages: ['tracking'],
  },
  {
    id: 'vmc',
    term: 'VMC',
    summary: 'Virtual Motion Capture protocol — a common way to pass face/body tracking data between apps over the network.',
    definition:
      'VMC (the Virtual Motion Capture protocol) is a lightweight network protocol for passing face and body tracking data between applications, typically over OSC on the local machine or LAN. It lets you decouple the thing that does the tracking from the thing that renders the avatar, so a dedicated tracker can feed a separate runtime. While it originates in the 3D/VRM world, it is a useful interchange whenever tracking and rendering live in different apps.',
    relatedStages: ['tracking'],
  },
  {
    id: 'spout2',
    term: 'Spout2',
    summary: 'Windows framework for sharing GPU video frames between apps — sends a transparent model feed into OBS.',
    definition:
      'Spout2 is a Windows framework for sharing video frames directly between applications on the GPU, without ever writing them to disk. In this pipeline VTube Studio publishes the rendered model — crucially, with its transparent background preserved — and OBS picks it up through the Spout2 plugin. Because the alpha channel survives, it is the cleanest way to composite the avatar into a scene, with no green screen or colour key required.',
    relatedStages: ['tracking', 'compositing'],
  },
  {
    id: 'rtmp',
    term: 'RTMP',
    summary: 'Real-Time Messaging Protocol — the stream-key based protocol broadcast software uses to push video to platforms.',
    definition:
      'RTMP (Real-Time Messaging Protocol) is the stream-key based channel your broadcaster uses to push encoded video up to a platform such as Twitch or YouTube. You paste a server URL and a secret stream key into the encoder, and it continuously uploads the live feed for as long as you broadcast. It is a live transport, not a file: nothing is saved locally by RTMP itself.',
    relatedStages: ['compositing', 'platform'],
  },
  {
    id: 'simulcast',
    term: 'Simulcast',
    summary: 'Streaming to multiple platforms at once from a single encode. PRISM does this natively.',
    definition:
      'Simulcasting is broadcasting to several platforms at the same time from a single local encode, rather than running multiple encoders or restreaming through a paid service. PRISM Live Studio supports this natively, sending one output to YouTube, Twitch and regional platforms simultaneously. It saves CPU/GPU and bandwidth compared with encoding the same stream several times.',
    relatedStages: ['compositing'],
  },
  {
    id: 'channel-points',
    term: 'Channel points',
    summary: 'Twitch viewer rewards. Bots can turn a redeem into a VTube Studio hotkey to trigger expressions.',
    definition:
      'Channel points are Twitch\'s built-in viewer-reward currency: viewers earn them by watching and spend them on rewards you define. They close the loop back to the avatar — an automation tool such as Streamer.bot or Mix It Up can catch a redeem and fire a VTube Studio hotkey, so a viewer can directly trigger an expression, prop or scene change. This is how chat ends up "controlling" the model.',
    relatedStages: ['platform', 'tracking'],
  },
]

// ---------------------------------------------------------------------------
// File extensions (real files on disk). `type` matches a FileIcon glyph and a
// handoff `type` in pipeline.js so handoff rows can link here.
// ---------------------------------------------------------------------------
export const fileExtensions = [
  {
    id: 'psd',
    type: 'psd',
    icon: 'psd',
    navLabel: '.psd',
    name: 'Photoshop Document',
    extension: '.psd',
    summary: 'Layered raster image format Cubism imports directly; the universal handoff from drawing to rigging.',
    technical:
      'A layered raster image format created by Adobe Photoshop. Every visual element lives on its own layer — which is exactly what Live2D Cubism needs: the rigger imports the .psd and turns each separated layer into an independently deformable mesh. Other painting apps (Clip Studio Paint, Krita, Procreate) can all export to .psd for this reason, so the format is the universal handoff between drawing and rigging.',
    producedBy: 'art',
    consumedBy: 'rig',
  },
  {
    id: 'moc3',
    type: 'model',
    icon: 'model',
    navLabel: '.moc3',
    name: 'Live2D Model',
    extension: '.moc3',
    summary: 'The compiled, runtime-ready model exported from the Cubism Editor; loaded directly by tracking apps.',
    technical:
      'The compiled, runtime-ready model exported from the Cubism Editor. It stores the mesh deformers, parameters and rigging logic in an optimized binary form that tracking apps load directly. You never edit a .moc3 by hand — it is generated from the Cubism source project (.cmo3) via "export for runtime".',
    producedBy: 'rig',
    consumedBy: 'tracking',
  },
  {
    id: 'atlas',
    type: 'image',
    icon: 'image',
    navLabel: '.png (texture atlas)',
    name: 'Texture Atlas',
    extension: '.png',
    summary: "PNG sheets packing all of the model's artwork; the .moc3 references coordinates inside them.",
    technical:
      "One or more PNG images that pack all of the model's artwork into texture sheets. The .moc3 references coordinates inside these atlases to know which pixels belong to each part, so the runtime can draw the puppet. Exported alongside the model and the .model3.json as part of the runtime bundle.",
    producedBy: 'rig',
    consumedBy: 'tracking',
  },
  {
    id: 'model3',
    type: 'json',
    icon: 'json',
    navLabel: '.model3.json',
    name: 'Model Settings Manifest',
    extension: '.model3.json',
    summary: 'Plain-text manifest that ties the runtime bundle together; tracking apps open it first.',
    technical:
      'A plain-text JSON manifest that ties the runtime bundle together. It points to the .moc3, the texture atlas(es), physics, pose and expression files, and lists the model\'s parameters and hit areas. Tracking apps open the .model3.json first and follow its references to load everything else.',
    producedBy: 'rig',
    consumedBy: 'tracking',
  },
]

// Maps a handoff `type` (from pipeline.js) to the reference page that documents
// it. File handoffs point at a fileExtension; live feeds point at a protocol
// technicalDefinition. Used to turn handoff rows into links.
export const handoffTargets = {
  psd: { section: 'file-ext', id: 'psd' },
  model: { section: 'file-ext', id: 'moc3' },
  image: { section: 'file-ext', id: 'atlas' },
  json: { section: 'file-ext', id: 'model3' },
  feed: { section: 'tech-def', id: 'spout2' },
  stream: { section: 'tech-def', id: 'rtmp' },
}

// ---------------------------------------------------------------------------
// Applications, plugins and platforms. One flat pool, sorted alphabetically in
// the sidebar. `category` drives the small label; `tag` reuses TAG_STYLES.
// `stages` lists the pipeline stage ids where the app is used.
// ---------------------------------------------------------------------------
export const applications = [
  // --- Artwork ---
  {
    id: 'photoshop',
    name: 'Adobe Photoshop',
    category: 'app',
    tag: 'standard',
    vendor: 'Adobe',
    summary: 'Industry-standard raster editor; .psd is the native format Cubism imports.',
    description:
      'Adobe Photoshop is the industry-standard raster editor and the reason .psd is the universal artwork handoff: it is the native format Live2D Cubism imports. VTuber artists use it to paint the character as cleanly part-separated layers, which is the single most important factor in how well the model can later be rigged. Its ubiquity means almost any other painting tool offers a .psd export specifically to slot into this stage.',
    stages: ['art'],
  },
  {
    id: 'clip-studio-paint',
    name: 'Clip Studio Paint (CSP)',
    category: 'app',
    tag: 'popular',
    vendor: 'Celsys',
    summary: 'Extremely popular illustration tool among VTuber artists; exports to .psd.',
    description:
      'Clip Studio Paint is an illustration-focused painting application that is enormously popular with VTuber and anime-style artists thanks to its drawing feel, brushes and one-time-purchase options. It exports layered .psd files, so part-separated artwork made in CSP drops straight into rigging. For many character artists it is the practical default over Photoshop.',
    stages: ['art'],
  },
  {
    id: 'krita',
    name: 'Krita',
    category: 'app',
    tag: 'free',
    vendor: 'KDE',
    summary: 'Free, open-source painting app; exports .psd for the rigging handoff.',
    description:
      'Krita is a free, open-source digital painting application with a capable layer and brush system. It exports layered .psd files, making it a no-cost entry point into the artwork stage for hobbyists and newcomers. While less common in professional commissions than Photoshop or CSP, it is fully viable for producing rig-ready, part-separated art.',
    stages: ['art'],
  },
  {
    id: 'procreate',
    name: 'Procreate',
    category: 'app',
    tag: 'ipad',
    vendor: 'Savage Interactive',
    summary: 'iPad painting app with layered .psd export.',
    description:
      'Procreate is a popular iPad-only painting app prized for its natural drawing experience and Apple Pencil support. It supports layered export to .psd, so artwork drawn on tablet can be handed to a rigger on desktop. It is a common choice for artists who prefer drawing on iPad rather than at a desktop.',
    stages: ['art'],
  },
  {
    id: 'affinity-photo',
    name: 'Affinity Photo',
    category: 'app',
    tag: 'alt',
    vendor: 'Serif',
    summary: 'One-time-purchase Photoshop alternative; PSD-capable.',
    description:
      'Affinity Photo is a one-time-purchase raster editor positioned as an alternative to Photoshop. It can open and export .psd, so it can participate in the artwork stage, though it is less commonly seen in VTuber workflows than Photoshop or Clip Studio Paint. It appeals to artists who want a Photoshop-like toolset without a subscription.',
    stages: ['art'],
  },
  {
    id: 'painttool-sai',
    name: 'PaintTool SAI',
    category: 'app',
    tag: 'alt',
    vendor: 'Systemax',
    summary: 'Lightweight illustration tool with a loyal following; PSD-capable.',
    description:
      'PaintTool SAI is a lightweight, long-standing illustration application with a devoted following for its smooth line work. It supports .psd, allowing part-separated art to flow into rigging. It is more of a niche choice today but remains capable for the artwork stage.',
    stages: ['art'],
  },

  // --- Rigging ---
  {
    id: 'live2d-cubism',
    name: 'Live2D Cubism',
    category: 'app',
    tag: 'standard',
    vendor: 'Live2D Inc.',
    summary: 'The de-facto standard 2D rigging editor; near-monopoly. Splits into Editor and Runtime/SDK.',
    description:
      'Live2D Cubism is the de-facto standard — a near monopoly — for 2D character rigging. It splits into the Editor, where you build mesh deformers, parameters and physics from the imported .psd, and the Runtime/SDK that tracking apps embed to load the model. You rig in the Editor and use "export for runtime" to produce the .moc3 + texture atlas + .model3.json bundle the next stage consumes. The editable source project is a .cmo3; the .moc3 is the compiled output.',
    stages: ['rig'],
  },
  {
    id: 'inochi-creator',
    name: 'Inochi Creator',
    category: 'app',
    tag: 'free',
    vendor: 'Inochi2D',
    summary: 'Free, open-source alternative to Cubism (Inochi2D). Newer and less mature.',
    description:
      'Inochi Creator is the free, open-source rigging editor of the Inochi2D project, positioned as an alternative to Live2D Cubism. It produces Inochi2D models that are puppeteered by its companion runtime, Inochi Session. It is newer and less mature than Cubism and has a smaller ecosystem, but it is fully open and carries no licensing cost.',
    stages: ['rig'],
  },

  // --- Tracker ---
  {
    id: 'vtube-studio',
    name: 'VTube Studio (VTS)',
    category: 'app',
    tag: 'standard',
    vendor: 'Denchi',
    summary: 'The standard 2D tracking app. Free (small watermark; paid DLC removes it). Webcam or iPhone.',
    description:
      'VTube Studio is the standard tracking/runtime app for Live2D VTubers. It loads the Cubism runtime bundle and drives the model live from a webcam or an iPhone, and exposes a plugin API that tools like VBridger and chat bots hook into. It is free with a small watermark that a one-time DLC purchase removes. Its Spout2 plugin is the recommended way to send a transparent model feed into OBS.',
    stages: ['tracking'],
  },
  {
    id: 'nizima-live',
    name: 'nizima LIVE',
    category: 'app',
    tag: 'official',
    vendor: 'Live2D Inc.',
    summary: 'Official Live2D tracking app. Free tier non-commercial; paid for commercial.',
    description:
      'nizima LIVE is the official tracking application from Live2D Inc., the makers of Cubism. It loads Live2D runtime models and drives them from camera or ARKit input, with a free tier for non-commercial use and paid licensing for commercial streaming. Being first-party, it tracks Cubism feature support closely.',
    stages: ['tracking'],
  },
  {
    id: 'prprlive',
    name: 'PrPrLive',
    category: 'app',
    tag: 'free',
    vendor: 'PrPr',
    summary: 'Free alternative tracking app for Live2D models.',
    description:
      'PrPrLive is a free alternative tracking application for Live2D models, offering webcam-based face tracking as a no-cost option in the runtime stage. It is less widely adopted than VTube Studio but provides a workable free path for puppeteering a rigged model.',
    stages: ['tracking'],
  },
  {
    id: 'inochi-session',
    name: 'Inochi Session',
    category: 'app',
    tag: 'free',
    vendor: 'Inochi2D',
    summary: 'Open-source runtime + tracking for Inochi2D models.',
    description:
      'Inochi Session is the open-source runtime and tracking app for Inochi2D, the companion to Inochi Creator. It loads Inochi2D models and drives them from face tracking, completing a fully open-source alternative pipeline to Cubism + VTube Studio. Like the rest of Inochi2D it is free and community-developed.',
    stages: ['tracking'],
  },
  {
    id: 'vbridger',
    name: 'VBridger',
    category: 'plugin',
    tag: 'enhancer',
    vendor: 'Mia',
    summary: 'Sits in front of VTS; remaps ARKit blendshapes into advanced mouth/lip/tongue control. Paid.',
    description:
      'VBridger is a paid enhancer that sits in front of VTube Studio rather than replacing it. It takes ARKit blendshape input (from iFacialMocap, FaceMotion3D or MeowFace), lets you mix and remap those blendshapes for far richer mouth, lip and tongue control, then feeds the result into VTS through its plugin API. It is the standard way to get expressive, advanced lip-sync out of an iPhone ARKit setup.',
    stages: ['tracking'],
  },
  {
    id: 'ifacialmocap',
    name: 'iFacialMocap',
    category: 'plugin',
    tag: 'source',
    vendor: 'Emily SP',
    summary: 'iOS app that streams ARKit face data into VBridger / VTS.',
    description:
      'iFacialMocap is an iOS app that captures ARKit face data on a TrueDepth iPhone or iPad and streams the blendshapes over the local network to a desktop tracker or to VBridger. It is one of the most common ARKit sources for high-fidelity Live2D tracking. The phone does the capture; the desktop does the remapping and rendering.',
    stages: ['tracking'],
  },
  {
    id: 'facemotion3d',
    name: 'FaceMotion3D',
    category: 'plugin',
    tag: 'source',
    vendor: 'Crazy Eddie',
    summary: 'Alternative iOS ARKit mocap source.',
    description:
      'FaceMotion3D is an iOS ARKit mocap app and an alternative to iFacialMocap as a blendshape source. It streams high-quality ARKit face data to desktop trackers and remappers such as VBridger over the network. Many streamers pick it for its capture quality and feature set.',
    stages: ['tracking'],
  },
  {
    id: 'meowface',
    name: 'MeowFace',
    category: 'plugin',
    tag: 'source',
    vendor: 'Suvidriel',
    summary: 'Android face-tracking source (lower fidelity than ARKit).',
    description:
      'MeowFace is an Android face-tracking app that emulates ARKit-style blendshape output, giving Android users a tracking source where ARKit is unavailable. Its fidelity is lower than a TrueDepth iPhone, but it lets non-Apple users feed VBridger or a tracker without buying iOS hardware.',
    stages: ['tracking'],
  },

  // --- Composite ---
  {
    id: 'obs-studio',
    name: 'OBS Studio',
    category: 'app',
    tag: 'standard',
    vendor: 'OBS Project',
    summary: 'Free, open-source standard for scene compositing and encoding. Desktop only.',
    description:
      'OBS Studio is the free, open-source standard for scene compositing and broadcasting. It brings the avatar in as one source — ideally a transparent Spout2 feed from VTube Studio — alongside overlays, alerts and audio, arranges them into scenes, then encodes and pushes the result over RTMP. Its huge plugin ecosystem (including the Spout2 plugin) is a big part of why it dominates the stage.',
    stages: ['compositing'],
  },
  {
    id: 'streamlabs',
    name: 'Streamlabs Desktop',
    category: 'app',
    tag: 'popular',
    vendor: 'Streamlabs',
    summary: 'OBS fork with built-in alerts and themes.',
    description:
      'Streamlabs Desktop is a fork of OBS that bundles alerts, overlays and themes into a more turnkey package. It performs the same compositing-and-encoding role but trades some of OBS\'s flexibility for a friendlier, batteries-included experience. It is popular with streamers who want alerts working out of the box.',
    stages: ['compositing'],
  },
  {
    id: 'prism-live',
    name: 'PRISM Live Studio',
    category: 'app',
    tag: 'free',
    vendor: 'NAVER',
    summary: 'Free broadcaster by NAVER. Desktop + mobile. Native multi-platform simulcast.',
    description:
      'PRISM Live Studio is a free broadcaster by NAVER (Korea), in the same broader group as OBS, that runs on both Windows desktop and iOS/Android. Its signature feature is native simulcasting: pushing one encode to many platforms at once (YouTube, Twitch, CHZZK, SOOP and more). It explicitly supports VTubing and is a strong pick for multi-platform streamers.',
    stages: ['compositing'],
  },
  {
    id: 'xsplit',
    name: 'XSplit Broadcaster',
    category: 'app',
    tag: 'paid',
    vendor: 'SplitmediaLabs',
    summary: 'Polished paid broadcaster.',
    description:
      'XSplit Broadcaster is a polished, paid alternative to OBS for scene compositing and streaming. It offers a refined interface and built-in features behind a subscription. It fills the same role in the pipeline for users who prefer a commercial product.',
    stages: ['compositing'],
  },
  {
    id: 'vmix',
    name: 'vMix',
    category: 'app',
    tag: 'paid',
    vendor: 'StudioCoast',
    summary: 'Professional-grade live production software.',
    description:
      'vMix is professional-grade live production software aimed at multi-camera and broadcast-style workflows. It can act as the compositing and encoding stage for ambitious setups that need mixing, replays and advanced inputs. It is overkill for most solo VTubers but powerful for productions that need it.',
    stages: ['compositing'],
  },

  // --- Streaming platforms ---
  {
    id: 'twitch',
    name: 'Twitch',
    category: 'platform',
    tag: 'public',
    vendor: 'Amazon',
    summary: 'Primary Western live-streaming platform; receives the RTMP broadcast.',
    description:
      'Twitch is the primary Western live-streaming platform and a common landing point for the RTMP broadcast. Beyond hosting the stream it closes the loop back to the avatar through channel points and chat: automation tools can turn a redeem into a VTube Studio hotkey. For many VTubers it is the default home platform.',
    stages: ['platform'],
  },
  {
    id: 'youtube-live',
    name: 'YouTube Live',
    category: 'platform',
    tag: 'public',
    vendor: 'Google',
    summary: 'Huge reach and excellent VOD; receives the RTMP broadcast.',
    description:
      'YouTube Live is a public broadcast destination with enormous reach and best-in-class VOD/archiving. It receives the encoded stream over RTMP and makes the finished broadcast easy to rewatch and discover later. It is frequently used alongside or instead of Twitch.',
    stages: ['platform'],
  },
  {
    id: 'tiktok-live',
    name: 'TikTok Live',
    category: 'platform',
    tag: 'public',
    vendor: 'ByteDance',
    summary: 'Growing public live-streaming option with mobile-first reach.',
    description:
      'TikTok Live is a fast-growing public live-streaming destination with strong mobile-first discovery. It receives a broadcast and exposes a large, casual audience. Access to RTMP streaming can depend on account eligibility.',
    stages: ['platform'],
  },
  {
    id: 'kick',
    name: 'Kick',
    category: 'platform',
    tag: 'public',
    vendor: 'Kick',
    summary: 'Newer public streaming platform; Twitch-like.',
    description:
      'Kick is a newer public live-streaming platform with a Twitch-like model and creator-friendly terms. It receives the RTMP broadcast and is increasingly used as a primary or secondary destination. It has grown quickly as an alternative home for streamers.',
    stages: ['platform'],
  },
  {
    id: 'twitcasting',
    name: 'Twitcasting',
    category: 'platform',
    tag: 'regional',
    vendor: 'MOI',
    summary: 'Popular Japanese live-streaming platform.',
    description:
      'Twitcasting is a Japanese live-streaming platform popular with JP creators and VTubers. It serves as a regional broadcast destination with its own audience and culture. It is a common choice for streamers targeting a Japanese viewership.',
    stages: ['platform'],
  },
  {
    id: 'niconico',
    name: 'Niconico Live',
    category: 'platform',
    tag: 'regional',
    vendor: 'Dwango',
    summary: 'Long-running Japanese streaming/video platform.',
    description:
      'Niconico Live is the streaming arm of Niconico, a long-running Japanese video platform famous for its overlaid-comment culture. It is a regional broadcast destination with deep roots in Japanese internet and VTuber history. It remains relevant for creators aimed at that audience.',
    stages: ['platform'],
  },
  {
    id: 'bilibili',
    name: 'bilibili Live',
    category: 'platform',
    tag: 'regional',
    vendor: 'bilibili',
    summary: 'Major Chinese video/streaming platform; big with CN VTubers.',
    description:
      'bilibili Live is the live arm of bilibili, a major Chinese video platform and the heart of the Chinese VTuber (VUP) scene. It is the key regional broadcast destination for creators targeting China. Its community and event culture are central to CN VTubing.',
    stages: ['platform'],
  },
  {
    id: 'soop',
    name: 'SOOP',
    category: 'platform',
    tag: 'regional',
    vendor: 'SOOP',
    summary: 'Korean streaming platform (formerly AfreecaTV); PRISM integrates natively.',
    description:
      'SOOP (formerly AfreecaTV) is a major Korean live-streaming platform. It is a regional broadcast destination that PRISM Live Studio integrates with natively for simulcasting. It is a primary home for many Korean streamers.',
    stages: ['platform'],
  },
  {
    id: 'chzzk',
    name: 'CHZZK',
    category: 'platform',
    tag: 'regional',
    vendor: 'NAVER',
    summary: 'NAVER\'s Korean streaming platform; PRISM integrates natively.',
    description:
      'CHZZK is NAVER\'s Korean live-streaming platform and a growing regional broadcast destination. Being a NAVER product, it integrates natively with PRISM Live Studio for simulcasting. It has quickly become a significant home for Korean creators.',
    stages: ['platform'],
  },
  {
    id: 'discord',
    name: 'Discord',
    category: 'platform',
    tag: 'community',
    vendor: 'Discord',
    summary: 'Community + private Go Live / Stage. Not a public broadcast destination.',
    description:
      'Discord is a community and private-streaming tool rather than a public broadcast platform: its Go Live and Stage features share a screen or camera with a server, not a public RTMP audience. It belongs in the platform conversation only to draw the distinction — it is where community happens, not where you push your encoded broadcast. Treating it as a Twitch/YouTube equivalent is a common mistake.',
    stages: ['platform'],
  },
  {
    id: 'streamer-bot',
    name: 'Streamer.bot',
    category: 'plugin',
    tag: 'automation',
    vendor: 'Streamer.bot',
    summary: 'Bridges Twitch events (e.g. channel-point redeems) to VTS hotkeys.',
    description:
      'Streamer.bot is a free automation tool that listens to platform events — channel-point redeems, follows, chat commands — and fires actions in response, including VTube Studio hotkeys. It is the glue that lets viewers trigger expressions, props and scene changes on the avatar. This is what makes the pipeline a loop rather than a one-way street.',
    stages: ['platform'],
  },
  {
    id: 'mix-it-up',
    name: 'Mix It Up',
    category: 'plugin',
    tag: 'automation',
    vendor: 'Mix It Up',
    summary: 'Bot/automation that can trigger model expressions from chat.',
    description:
      'Mix It Up is a streaming bot and automation tool that can react to chat commands and platform events and, among many other actions, trigger VTube Studio hotkeys. Like Streamer.bot it wires the audience back to the avatar so chat can drive expressions and effects. It is an alternative automation hub for the same loop-closing job.',
    stages: ['platform'],
  },
]

// ---------------------------------------------------------------------------
// Lookups + sorting helpers.
// ---------------------------------------------------------------------------
export function findTechDef(id) {
  return technicalDefinitions.find((t) => t.id === id) || null
}

export function findFileExtension(id) {
  return fileExtensions.find((f) => f.id === id) || null
}

export function findApplication(id) {
  return applications.find((a) => a.id === id) || null
}

// Resolve a handoff `type` (psd/model/feed/...) to its reference page id, or
// null when the type has no documentation page.
export function findRefByHandoffType(type) {
  return handoffTargets[type] || null
}

const byTermOrName = (a, b) => (a.term || a.name).localeCompare(b.term || b.name)

export function sortedTechDefs() {
  return [...technicalDefinitions].sort(byTermOrName)
}

export function sortedFileExtensions() {
  return [...fileExtensions].sort((a, b) => a.navLabel.localeCompare(b.navLabel))
}

export function sortedApplications() {
  return [...applications].sort(byTermOrName)
}

// Category label shown on an application reference page.
export const APP_CATEGORY_LABEL = {
  app: 'Application',
  plugin: 'Plugin / input',
  platform: 'Streaming platform',
}

// ---------------------------------------------------------------------------
// Category intro pages. Each References sub-category (Technical Definition,
// File Extensions, Applications & Plugins) is its own page with a short intro
// article followed by the list of entries it contains. Auto-generated starter
// copy — edit the `intro` paragraphs freely. `items()` returns the entry list
// (id + label) so the page can render quick links into each entry.
// ---------------------------------------------------------------------------
export const categoryIntros = [
  {
    id: 'tech-def',
    title: 'Technical Definitions',
    intro: [
      'This category gathers the concepts and live protocols the pipeline relies on, written in plain language. It is the place to look up what a term means before — or while — reading a stage page: what rigging actually produces, what a parameter or blendshape is, and how transports like Spout2 and RTMP move data between apps.',
      'Entries here are referenced inline throughout the Manual: any underlined term in a stage description links straight to its definition here. Each definition also lists the stages where the concept matters, so you can jump from a word back to where it is used in practice.',
    ],
    items: () => sortedTechDefs().map((t) => ({ id: t.id, label: t.term })),
  },
  {
    id: 'file-ext',
    title: 'File Extensions',
    intro: [
      'This category documents the real files that travel between stages — the concrete artifacts a producer writes and a consumer reads. Each entry gives a plain-language definition of the format, the file extension itself, and where the file sits in the pipeline (which stage produces it and which one consumes it).',
      'These are the handoffs that make the pipeline a pipeline: a layered .psd leaves Artwork for Rigging, the compiled .moc3 bundle leaves Rigging for Tracking, and so on. Use this list when you need to understand exactly what is being passed along, not just which tool does the passing.',
    ],
    items: () => sortedFileExtensions().map((f) => ({ id: f.id, label: f.navLabel })),
  },
  {
    id: 'apps',
    title: 'Applications & Plugins',
    intro: [
      'This category is the full, alphabetical catalogue of every piece of software, plugin and platform used across the pipeline — drawing apps, the rigging editor, tracking runtimes, ARKit sources, broadcasters, streaming platforms and the automation bots that close the loop back to the avatar.',
      'Each entry explains what the tool is, who makes it, and which stage(s) it belongs to. Tool names mentioned on stage pages link directly into this catalogue, so you can always go from "what runs at this stage" to a focused description of the tool itself.',
    ],
    items: () => sortedApplications().map((a) => ({ id: a.id, label: a.name })),
  },
]

// Resolve a category id (tech-def/file-ext/apps) to its intro page, with the
// entry list already materialized. Returns null for unknown ids.
export function findCategoryIntro(id) {
  const cat = categoryIntros.find((c) => c.id === id)
  if (!cat) return null
  return { id: cat.id, title: cat.title, intro: cat.intro, items: cat.items() }
}
