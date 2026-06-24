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
    navLabel: 'Illustration',
    label: 'Illustration',
    sub: 'Layer-separated Illustration',
    blurb: 'Ready-to-Rig model artwork file, different from rendered drawing files.',
    accent: '#ff69b4',
    rep: { name: 'Photoshop', short: 'Ps', color: '#001e36', image: '/documentation/logos/photoshop.png' },
    description: [
      'Draw the character not as one flat picture but as ',
      { t: 'part-separation', label: 'part-separated' },
      ' artwork, where every piece that needs to move lives on its own layer. This is the defining requirement of the stage rather than just "drawing": the cleaner the separation, the more freedom the next stage has during ',
      { t: 'rigging' },
      '. The result is a ',
      { t: 'ready-to-rig', label: 'Ready-to-Rig' },
      ' file — the separated layers travel onward as a single .psd.',
    ],
    descriptionExtra: [
      'You can use other software — Clip Studio Paint (CSP), Krita, Procreate as long as it exports a layered .psd, since that is the format the next stage imports.',
    ],
    tools: [
      { app: 'photoshop', name: 'Adobe Photoshop', tag: 'standard', note: 'Industry standard. .psd is the native format Cubism imports.' },
    ],
    // Embedded tutorial (self-contained so the offline / presentation builds keep
    // the content). Verbatim from the Live2D Cubism Editor Tutorial
    // "1. Illustration Processing". The "download Cubism" button, the Basic
    // Tutorial List, remote download links, and everything from "Please refer to
    // the following pages..." onward are intentionally omitted.
    article: {
      // `body` arrays are content blocks rendered in order: a plain string is a
      // paragraph, { image } is a figure, { list } is a bullet list. This lets
      // images sit right after the paragraph that describes them.
      intro: [
        'You will learn the first steps of processing an illustration when moving it in Live2D. In this video, we are working with Photoshop.',
      ],
      toolsNote:
        'The following drawing tools are recommended when creating PSDs: Photoshop (Adobe) and CLIP STUDIO PAINT (Celsys). The drawing data is imported into the Cubism Editor, but in rare cases, depending on the drawing tool you are using, normal reading and writing may not be possible.',
      video: {
        youtube: '', // paste the YouTube link or video id here
        caption: 'Live2D Cubism Basic Tutorial 1: Illustration processing',
      },
      sections: [
        {
          heading: 'Illustration Processing',
          body: [
            'The illustration moved by Live2D looks like a single illustration when it is still, but in reality it is divided into parts such as hair, eyebrows, eyelashes, and ears.',
            'By separating the parts, the character can be made to move, for example, to shake its hair or blink.',
            'It is possible to move an illustration in Live2D without separating the parts, but if you want to move the character in an attractive way, you need to separate the minimum number of necessary parts.',
            'The illustrations are roughly divided into three categories: hair, face, and body, but from there they are further subdivided.',
          ],
        },
        {
          heading: 'Separate the Hair into Parts',
          body: [
            'The hair will be divided into three sections: bangs, sides, and back. If the hair is split to the left or right, such as sideburns or pigtails, use separate layers for each side.',
            'Also, if you have a cowlick or other hair that you want to move, separate it into separate layers to make it easier to move it around.',
            'When dividing, do not forget to add the parts that were hidden in the source image. If there are no additions, the part will appear disconnected when it moves, as shown in the following image.',
            { image: { src: '/documentation/vtuber-pipeline/artwork-separate-the-hair-into-parts.png', alt: 'Hair separated into bangs, sides, and back layers' } },
            'It is possible to adjust the illustration after it has been modeled, so you can watch it in motion. If you have trouble making multiple adjustments to an illustration, it is recommended that you make larger additions to the drawing from the beginning.',
          ],
        },
        {
          heading: 'Separate the Face into Parts',
          body: ['The face will be divided into eyes, nose, eyebrows, mouth, contours, and ears.'],
          subsections: [
            {
              title: 'Eyes',
              body: [
                'Separate the eyelashes, eyeballs, and whites of the eyes. Lashes are easier to transform if they are separated from the bouncing part at the corner of the eye.',
                'The white eyes can be used as clipping material. Don\u2019t forget to add the white eyes because the part hidden by the eyeballs is visible when the eyeballs are moved.',
              ],
            },
            {
              title: 'Eyebrows and nose',
              body: [
                'Since it is not a component that can be significantly deformed, it does not matter as long as it is separated on its own.',
              ],
            },
            {
              title: 'Mouth',
              body: [
                'Separate the lips at the top and bottom. Also, separate the inside part of the mouth, as the inside part of the mouth should not be visible when closed.',
                'When dividing the inside part of the mouth, make the drawing one size larger than the source image. However, since the mouth protrudes from the line as it is, a skin-colored area should be added to the lips.',
                { image: { src: '/documentation/vtuber-pipeline/artwork-mouth-1.png', alt: 'Mouth separated into upper lip, lower lip, and inside' } },
              ],
            },
            {
              title: 'Outline and ear',
              body: [
                'The outline should be painted so that the area hidden by the hair is also painted and only the skin color is used. A round head makes it easier to get a sense of the three-dimensionality of the model, and it also makes it easier to add movement when modeling.',
                'Although it is acceptable to treat the ears as the same parts as the contours, we will separate them this time because it is possible to control their movements more precisely and the quality of the model will be higher if they are separated.',
                { image: { src: '/documentation/vtuber-pipeline/artwork-outline-and-ear.png', alt: 'Face outline painted in skin color with ears separated' } },
              ],
            },
          ],
          note: {
            title: 'Tips',
            body: [
              'In the same way as with eyes, it is possible to create a mouth using the inside of the mouth as clipping material, but doing so poses the following disadvantages:',
              { list: [
                'Clipping masks are used extensively, resulting in a burden when installing the masks.',
                'Mouth parts may protrude beyond concealment in line drawings of the mouth.',
                'The greater the deformation of the mouth, the more work-hours required for its production and adjustment.',
              ] },
            ],
          },
          postNote: [
            '(In the image below, the mouth is subtly protruding from the line drawing.)',
            { image: { src: '/documentation/vtuber-pipeline/artwork-mouth-2.png', alt: 'Mouth subtly protruding from the line drawing' } },
            'Rather than using clipping on the mouth, we recommend using skin-colored fill to conceal the mouth.',
            'However, clipping can be used effectively in the following situations. Use different types depending on the source image and the application.',
            { list: [
              'For applications in which the capacity of the model is not important, such as videos, etc.',
              'If thickly painted or unevenly painted around the lips, depending on the painting style.',
              'Simple image with little deformation of the mouth.',
            ] },
          ],
        },
        {
          heading: 'Separate the Body into Parts',
          body: [
            'It is sufficient if the body is divided into neck, torso, arms, and legs.',
            'The neck should be drawn larger so that it is not visibly cut off when the face is moved. It is sufficient if the neck size is up to the mouth area.',
          ],
          subsections: [
            {
              title: 'Neck',
              body: [
                { image: { src: '/documentation/vtuber-pipeline/artwork-neck.png', alt: 'Neck drawn larger, up to the mouth area' } },
              ],
            },
            {
              title: 'Torso',
              body: [
                'Keep the body separate if there are ribbons that you want to shake. Separating each collar and cardigan makes it easier to add movement and improves quality, but there is no problem if they are grouped together.',
                { image: { src: '/documentation/vtuber-pipeline/artwork-torso.png', alt: 'Torso separated, with collar and cardigan on their own layers' } },
              ],
            },
            {
              title: 'Arms',
              body: [
                'The arms should be separated by the upper arm, forearm, and hand.',
                { image: { src: '/documentation/vtuber-pipeline/artwork-arm.png', alt: 'Arm separated into upper arm, forearm, and hand' } },
              ],
            },
            {
              title: 'Legs',
              body: [
                'Legs are divided by skirt, left leg, and right leg.',
                { image: { src: '/documentation/vtuber-pipeline/artwork-legs.png', alt: 'Legs divided into skirt, left leg, and right leg' } },
              ],
            },
          ],
          footer:
            'This concludes the processing of the illustration. This is enough separation to move the character at a sufficient level.',
        },
        {
          heading: 'About Editor Import',
          body: [
            'Finally, prepare to load the file into the Editor. When importing PSDs into the Editor, line art and fill must be combined into a single layer, not separate.',
            { image: { src: '/documentation/vtuber-pipeline/artwork-editor-import-1.png', alt: 'Line art and fill combined into a single layer per part' } },
            'It is also easier to manage the parts in the Editor if they are roughly divided into groups.',
            { image: { src: '/documentation/vtuber-pipeline/artwork-editor-import-2.png', alt: 'Parts organized into groups in the Editor' } },
            'If you are using Photoshop, we recommend that you use the merging scripts that are available. When saving data, please save it in PSD format.',
            'This concludes the tutorial on illustration processing. The video includes audio for a more complete understanding, so please listen to it along with reading the text!',
          ],
        },
      ],
      source: 'Adapted from the Live2D Cubism Editor Tutorial \u2014 "1. Illustration Processing".',
    },
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
    descriptionExtra: [
      'Among the available editors, Live2D Cubism is currently the most reasonable choice.',
    ],
    tools: [
      { app: 'live2d-cubism', name: 'Live2D Cubism (Editor)', tag: 'standard', note: 'The de-facto standard for 2D rigging. Near-monopoly.' },
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
    descriptionExtra: [
      'VTube Studio has strong support for custom plugins — its plugin API is what tools like VBridger and chat bots hook into to extend and automate the rig.',
    ],
    tools: [
      { app: 'vtube-studio', name: 'VTube Studio (VTS)', tag: 'standard', note: 'The standard. Free (small watermark; paid DLC removes it). Webcam or iPhone.' },
    ],
    plugins: [
      { app: 'vbridger', name: 'VBridger', tag: 'enhancer', note: 'Sits in FRONT of VTS. Remaps ARKit blendshapes into advanced mouth/lip/tongue control. Paid; best with iPhone ARKit.' },
      { app: 'ifacialmocap', name: 'iFacialMocap', tag: 'source', note: 'iOS app that streams ARKit face data into VBridger / VTS.' },
      { app: 'meowface', name: 'MeowFace', tag: 'source', note: 'Android face-tracking source (lower fidelity than ARKit).' },
    ],
    callouts: [
      {
        title: 'Where VBridger attaches',
        body: 'VBridger does NOT replace VTube Studio. It takes ARKit input (iFacialMocap/MeowFace), lets you mix & remap blendshapes for richer mouth/tongue/expression, then feeds the result into VTS via its API.',
      },
    ],
    handoff: {
      to: 'compositing',
      text: 'Best practice: send VTS out via the Spout2 plugin so the model reaches OBS with alpha (else window capture + color-key).',
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
    descriptionExtra: [
      'OBS Studio runs on desktop (PC) only, while PRISM Live Studio also works on mobile (iOS/Android) — pick based on whether you broadcast from a computer or a phone.',
    ],
    tools: [
      { app: 'obs-studio', name: 'OBS Studio', tag: 'standard', note: 'Free, open-source standard. Desktop only.' },
      { app: 'prism-live', name: 'PRISM Live Studio', tag: 'free', note: 'Free, by NAVER. Desktop + mobile. Native multi-platform simulcast.' },
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
