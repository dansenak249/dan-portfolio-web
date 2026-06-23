// VTuber (Live2D) production & streaming pipeline content.
// EDIT THIS FILE to change the document. The docs UI (sidebar tree + content)
// is generated from this data plus data/docs.js and data/references.js.
//
// Logos: drop PNG/SVG files in /public/documentation/logos/ and
// point rep.image at them. If the file is missing, a colored monogram
// (rep.short) is shown automatically.
//
// `description` is a rich-text token array: plain strings render as text, and
// { t: 'tech-def-id', label?: 'shown text' } objects render as an inline
// glossary term that hovers a summary and links to its Technical Definition
// page in References. Tool names link to their Applications & Plugins page via
// the `app` id.

export const pipeline = [
  {
    id: 'art',
    eyebrow: 'STAGE 01',
    navLabel: 'Artwork',
    label: 'Artwork',
    sub: 'Layer-separated Illustration',
    blurb: 'Ready-to-Rig model artwork file, different from rendered drawing files.',
    accent: '#ff69b4',
    rep: { name: 'Photoshop', short: 'Ps', color: '#001e36', image: '/documentation/logos/photoshop.png' },
    description: [
      'Draw the character not as one flat picture but as ',
      { t: 'part-separation', label: 'part-separated' },
      ' artwork, where every piece that needs to move lives on its own layer. This is the defining requirement of the stage rather than just "drawing": the cleaner the separation, the more freedom the next stage has during ',
      { t: 'rigging' },
      '. The separated layers travel onward as a single .psd.',
    ],
    tools: [
      { app: 'photoshop', name: 'Adobe Photoshop', tag: 'standard', note: 'Industry standard. .psd is the native format Cubism imports.' },
      { app: 'clip-studio-paint', name: 'Clip Studio Paint (CSP)', tag: 'popular', note: 'Very popular with VTuber artists; exports to .psd.' },
      { app: 'krita', name: 'Krita', tag: 'free', note: 'Free, open-source; exports .psd.' },
      { app: 'procreate', name: 'Procreate', tag: 'ipad', note: 'iPad app; layered export to .psd.' },
      { app: 'affinity-photo', name: 'Affinity Photo', tag: 'alt', note: 'One-time-purchase Photoshop alternative; PSD-capable.' },
      { app: 'painttool-sai', name: 'PaintTool SAI', tag: 'alt', note: 'Lightweight illustration tool; PSD-capable.' },
    ],
    handoff: {
      to: 'rig',
      text: 'Export a flattened-per-part .psd and hand it to rigging.',
      files: [{ type: 'psd', label: '.psd (layered)' }],
    },
  },
  {
    id: 'rig',
    eyebrow: 'STAGE 02',
    navLabel: 'Rig',
    label: 'Rig',
    sub: 'Deformers & Track Parameters',
    blurb: 'Add mesh deformers, tracking parameters and physics to model.',
    accent: '#c264c8',
    rep: { name: 'Live2D Cubism', short: 'Cu', color: '#0b9bd1', image: '/documentation/logos/cubism.png' },
    description: [
      'Give the flat parts mesh deformers, ',
      { t: 'parameter', label: 'parameters' },
      ' (head turn, blink, mouth) and ',
      { t: 'physics' },
      ' so a static drawing becomes a controllable puppet. This is ',
      { t: 'rigging' },
      ' proper; a Cubism "export for runtime" then produces the model bundle the tracking app loads.',
    ],
    tools: [
      { app: 'live2d-cubism', name: 'Live2D Cubism (Editor)', tag: 'standard', note: 'The de-facto standard for 2D rigging. Near-monopoly.' },
      { app: 'inochi-creator', name: 'Inochi Creator (Inochi2D)', tag: 'free', note: 'Free, open-source alternative to Cubism. Newer, less mature.' },
    ],
    callouts: [
      {
        title: 'Editor vs Runtime',
        body: 'Cubism splits into the Editor (where you rig) and the Runtime/SDK (what Stage 3 apps load). You export FOR the runtime.',
      },
    ],
    handoff: {
      to: 'tracking',
      text: 'Use Cubism "export for runtime" to produce the model bundle the tracking app loads.',
      files: [
        { type: 'model', label: '.moc3 (model)' },
        { type: 'image', label: 'texture atlas (.png)' },
        { type: 'json', label: '.model3.json' },
      ],
    },
  },
  {
    id: 'tracking',
    eyebrow: 'STAGE 03',
    navLabel: 'Tracker',
    label: 'Tracker',
    sub: 'Camera Tracking',
    blurb: 'Load the rigged model and use camera/phone to track your facial & body movement in real time.',
    accent: '#7978e6',
    rep: { name: 'VTube Studio', short: 'VTS', color: '#ff7aa8', image: '/documentation/logos/vts.png' },
    description: [
      'Load the rigged model and drive it live from your face and camera — this is where the avatar actually moves. High-fidelity setups feed ',
      { t: 'arkit', label: 'ARKit' },
      ' ',
      { t: 'blendshape', label: 'blendshapes' },
      ' (built on ',
      { t: 'facs', label: 'FACS' },
      '), sometimes routed over ',
      { t: 'vmc', label: 'VMC' },
      ', and remap them onto the rig to puppeteer the model in real time.',
    ],
    tools: [
      { app: 'vtube-studio', name: 'VTube Studio (VTS)', tag: 'standard', note: 'The standard. Free (small watermark; paid DLC removes it). Webcam or iPhone.' },
      { app: 'nizima-live', name: 'nizima LIVE', tag: 'official', note: 'Official Live2D tracking app. Free tier non-commercial; paid for commercial.' },
      { app: 'prprlive', name: 'PrPrLive', tag: 'free', note: 'Free alternative tracking app.' },
      { app: 'inochi-session', name: 'Inochi Session', tag: 'free', note: 'Runtime + tracking for Inochi2D models (open-source).' },
    ],
    warn: 'VSeeFace and Warudo are for 3D (VRM) models — a different pipeline. Do not put them here.',
    plugins: [
      { app: 'vbridger', name: 'VBridger', tag: 'enhancer', note: 'Sits in FRONT of VTS. Remaps ARKit blendshapes into advanced mouth/lip/tongue control. Paid; best with iPhone ARKit.' },
      { app: 'ifacialmocap', name: 'iFacialMocap', tag: 'source', note: 'iOS app that streams ARKit face data into VBridger / VTS.' },
      { app: 'facemotion3d', name: 'FaceMotion3D', tag: 'source', note: 'Alternative iOS ARKit mocap source.' },
      { app: 'meowface', name: 'MeowFace', tag: 'source', note: 'Android face-tracking source (lower fidelity than ARKit).' },
    ],
    callouts: [
      {
        title: 'Where VBridger attaches',
        body: 'VBridger does NOT replace VTube Studio. It takes ARKit input (iFacialMocap/FaceMotion3D/MeowFace), lets you mix & remap blendshapes for richer mouth/tongue/expression, then feeds the result into VTS via its API.',
      },
    ],
    handoff: {
      to: 'compositing',
      text: 'Best practice: output VTS via the Spout2 plugin so the model arrives in OBS with alpha. Otherwise: window/game capture + color-key.',
      files: [{ type: 'feed', label: 'Spout2 feed (transparent)' }],
    },
  },
  {
    id: 'compositing',
    eyebrow: 'STAGE 04',
    navLabel: 'Composite',
    label: 'Composite',
    sub: 'Model to Screen',
    blurb: 'Bring the model in with overlays and audio, add to screen, then encode and push the stream.',
    accent: '#4f9ee8',
    rep: { name: 'OBS Studio', short: 'OBS', color: '#302e31', image: '/documentation/logos/obs.png' },
    description: [
      'Bring the model in as one source among overlays, alerts and audio, build your scenes, then encode and push the stream. The cleanest input is a transparent ',
      { t: 'spout2', label: 'Spout2' },
      ' feed from the tracker; some broadcasters can ',
      { t: 'simulcast' },
      ' the encode to several platforms at once before pushing it out over ',
      { t: 'rtmp', label: 'RTMP' },
      '.',
    ],
    tools: [
      { app: 'obs-studio', name: 'OBS Studio', tag: 'standard', note: 'Free, open-source standard. Desktop only.' },
      { app: 'streamlabs', name: 'Streamlabs Desktop', tag: 'popular', note: 'OBS fork with built-in alerts and themes.' },
      { app: 'prism-live', name: 'PRISM Live Studio', tag: 'free', note: 'Free, by NAVER. Desktop + mobile. Native multi-platform simulcast.' },
      { app: 'xsplit', name: 'XSplit Broadcaster', tag: 'paid', note: 'Polished paid broadcaster.' },
      { app: 'vmix', name: 'vMix', tag: 'paid', note: 'Professional-grade live production.' },
    ],
    callouts: [
      {
        title: 'What is PRISM Live Studio?',
        body: 'A free broadcaster by NAVER (Korea) in the SAME group as OBS. Runs on Windows desktop AND iOS/Android. Signature feature: simulcast to many platforms (YouTube, Twitch, CHZZK, SOOP...) from one encode. Explicitly supports VTubing.',
      },
    ],
    handoff: {
      to: 'platform',
      text: 'Paste the platform stream key (RTMP) into your broadcaster and go live.',
      files: [{ type: 'stream', label: 'RTMP stream key' }],
    },
  },
  {
    id: 'platform',
    eyebrow: 'STAGE 05',
    navLabel: 'Stream',
    label: 'Stream',
    sub: 'Screen to Stream',
    blurb: 'Where the encoded stream lands and the audience watches, and where chat events can loop back to the tracker.',
    accent: '#3ec4a0',
    rep: { name: 'Twitch', short: 'Tw', color: '#9146ff', image: '/documentation/logos/twitch.png' },
    description: [
      'Where the encoded ',
      { t: 'rtmp', label: 'RTMP' },
      ' stream lands and the audience watches. The loop is not one-way: ',
      { t: 'channel-points', label: 'channel-point' },
      ' redeems and chat commands can fire all the way back to the tracker to trigger expressions, props and scene changes.',
    ],
    tools: [
      { app: 'twitch', name: 'Twitch', tag: 'public', note: 'Primary Western live platform.' },
      { app: 'youtube-live', name: 'YouTube Live', tag: 'public', note: 'Huge reach; great VOD.' },
      { app: 'tiktok-live', name: 'TikTok Live', tag: 'public', note: 'Growing public broadcast option.' },
      { app: 'kick', name: 'Kick', tag: 'public', note: 'Newer Twitch-like public platform.' },
      { app: 'twitcasting', name: 'Twitcasting', tag: 'regional', note: 'Popular Japanese platform.' },
      { app: 'niconico', name: 'Niconico Live', tag: 'regional', note: 'Long-running Japanese platform.' },
      { app: 'bilibili', name: 'bilibili Live', tag: 'regional', note: 'Big with Chinese VTubers.' },
      { app: 'soop', name: 'SOOP', tag: 'regional', note: 'Korean platform (PRISM integrates natively).' },
      { app: 'chzzk', name: 'CHZZK', tag: 'regional', note: 'Korean platform by NAVER (PRISM integrates natively).' },
      { app: 'discord', name: 'Discord', tag: 'community', note: 'Community + private Go Live / Stage. Not a public broadcast destination.' },
    ],
    plugins: [
      { app: 'streamer-bot', name: 'Streamer.bot', tag: 'automation', note: 'Bridges Twitch events (e.g. channel-point redeems) to VTS hotkeys.' },
      { app: 'mix-it-up', name: 'Mix It Up', tag: 'automation', note: 'Bot/automation that can trigger model expressions from chat.' },
    ],
    callouts: [
      {
        title: 'Model reacts to chat',
        body: 'Channel-point redeems and chat commands can be wired back to Stage 3: bots fire VTube Studio hotkeys to trigger expressions, props or scene changes.',
      },
    ],
  },
]
