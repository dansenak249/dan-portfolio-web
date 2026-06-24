// Self-contained tutorial data module for the "Creating Animations" stage.
// Verbatim from the Live2D Cubism Editor Tutorial "6. Creating Animations".
// The "download Cubism" button, the Tutorial Video link list, remote download
// links, breadcrumbs, and the trailing "please refer to the manual website"
// navigation block are intentionally omitted, mirroring the `art` article in
// pipeline.js.
//
// `body` arrays are content blocks rendered in order: a plain string is a
// paragraph, { image } is a figure, { list } is a bullet list. Each { image }
// sits immediately after the paragraph that describes it.

export const animator = {
  id: 'rig-animator',
  label: 'Animations',
  sub: 'Switching to Animation Mode and adding motion to a finished model',
  accent: '#c264c8',
  article: {
    intro: [
      'Switch to Animation Mode and add motion to the model you have created.',
      'This section describes basic operation of the Animation Mode.',
    ],
    video: {
      youtube: '', // paste the YouTube link or video id here
      caption: 'Live2D Cubism Basic Tutorial 6: Creating Animations',
    },
    sections: [
      {
        heading: 'Video Review',
        body: [
          'This section describes the operations for attaching motion to the model.',
          'Adding motion makes the model even more attractive, so learn how to use it here!',
        ],
      },
      {
        heading: 'Edit Mode Types',
        body: [
          'Live2D Cubism has two modes: Modeling Mode and Animation Mode.',
          'The Modeling Mode is used to add motion to illustrations, and the Animation Mode is used to add motion to created models.',
          'In this page, the Animation Mode will be explained.',
          'The mode is toggled by pressing the [Modeler]/[Animator] icon in the upper left corner of the Editor.',
          { image: { src: '/documentation/vtuber-pipeline/animator-edit-mode-types.png', alt: 'Modeler and Animator mode toggle icons in the upper left corner of the Editor' } },
        ],
      },
      {
        heading: 'Load the model',
        body: [
          'After switching to Animation Mode, load the model file for which you want to create motion.',
          'Drag and drop the model data onto the timeline palette at the bottom of the screen.',
          { image: { src: '/documentation/vtuber-pipeline/animator-load-the-model.png', alt: 'Dragging and dropping model data onto the timeline palette' } },
          'Once the model is loaded, a new scene is added and the model appears on the canvas.',
        ],
      },
      {
        heading: 'Adjust Model Size',
        body: [
          'If you want to adjust the size of the model, open the [Placement & Opacity] tab in the Timeline and adjust the size of the model from [Scale].',
          { image: { src: '/documentation/vtuber-pipeline/animator-adjust-model-size-scale.png', alt: 'Adjusting model size from the Scale field in the Placement & Opacity tab' } },
          'Alternatively, the size can be changed using the bounding box on the canvas.',
          { image: { src: '/documentation/vtuber-pipeline/animator-adjust-model-size-bounding-box.png', alt: 'Resizing the model using the bounding box on the canvas' } },
        ],
      },
      {
        heading: 'Adjust Canvas Size',
        body: [
          'The size of the canvas is 1280*720 when newly created, so if you want to adjust it, you can do so from the [Size] settings in the inspector palette.',
          { image: { src: '/documentation/vtuber-pipeline/animator-adjust-canvas-size.png', alt: 'Canvas Size settings in the inspector palette' } },
        ],
      },
      {
        heading: 'Keyframe Settings',
        body: [
          'When you have finished placing the model, open the [Live2D Parameters] tab of the purple model track in the timeline palette.',
          'When opened, it displays the parameters you have set in the Modeling Mode.',
          'By moving the slider for this parameter, a keyframe will be hit with that value on the timeline.',
          { image: { src: '/documentation/vtuber-pipeline/animator-keyframe-settings.png', alt: 'Live2D Parameters tab with parameter sliders in the timeline palette' } },
          'A keyframe is a point struck on the timeline.',
          'To try it out, let\u2019s play around with the parameters and hit multiple keyframes.',
          'If you press the Playback button at the top of the timeline palette with a key being hit, you will see that the animation is performed by automatically inbetweening between the keyframes.',
        ],
      },
      {
        heading: 'Trackbar and Work Area Settings',
        body: [
          'When we played back the animation, the model disappeared in the middle of the animation.',
          'The purple bar on the timeline is called the track, which is the display range of the model on the timeline.',
          'The track is shorter than the length of the entire scene so the model disappears in the middle of the scene.',
          { image: { src: '/documentation/vtuber-pipeline/animator-trackbar.png', alt: 'Purple track bar shorter than the full scene length on the timeline' } },
          'If you want to keep the same model visible throughout the scene, drag the edges of the track to extend it to the full length of the scene.',
          'The length of the scene itself is set in [Duration:] by dragging the left portion of the string to the left or right.',
          { image: { src: '/documentation/vtuber-pipeline/animator-track-extension.png', alt: 'Extending the track to the full length of the scene' } },
          'When a scene is extended, the Work Area must also be extended along with it or it will not be visible during playback.',
          'The orange bar indicates the range of the Work Area. If you want to add motion to the end, extend the Work Area to the full scene.',
          'When playing the animation again, the model will not disappear in the middle and will be displayed until the end.',
        ],
      },
      {
        heading: 'Type of Keyframe Settings',
        body: [
          'In addition to moving parameters, keyframes can also be placed on the timeline by entering a numerical value next to the parameter.',
          { image: { src: '/documentation/vtuber-pipeline/animator-keyframe-numerical-input.png', alt: 'Entering a numerical value next to a parameter to place a keyframe' } },
          'Keyframes can also be hit by holding down [Ctrl] and clicking on the timeline.',
          'If you hold down [Ctrl], you can hit keyframes in parameter units, or you can click on the green bar to hit keyframes for all parameters at once.',
          { image: { src: '/documentation/vtuber-pipeline/animator-keyframe-ctrl-click.png', alt: 'Holding Ctrl and clicking on the timeline to place keyframes' } },
          'To delete a keyframe, hold down [Ctrl] and click on the keyframe you want to delete, or select the keyframe and press [Delete].',
          'In addition, multiple keyframes can be selected, and they can be moved or deleted at one time.',
          'As you drag on the timeline, the selected area will turn pale blue.',
          'In this state, when the mouse is hovered over a keyframe, an arrow appears next to the mouse, and the keyframe can be moved by dragging it sideways.',
          { image: { src: '/documentation/vtuber-pipeline/animator-keyframe-multiple-selection.png', alt: 'Selecting multiple keyframes shown as a pale blue area on the timeline' } },
          'You can also copy keyframes with [Ctrl+C] and paste keyframes with [Ctrl+V].',
          'You can also delete keyframes all at one time by pressing [Delete] while they are selected.',
        ],
      },
      {
        heading: 'Animation Templates',
        body: [
          'If you want to use the same movement over and over again, it is recommended to save keyframes as \u201canimation templates.\u201d',
          'Select a range of keyframes you want to save and click on [Create New Template] at the bottom right of the template palette.',
          { image: { src: '/documentation/vtuber-pipeline/animator-create-new-template.png', alt: 'Create New Template button at the bottom right of the template palette' } },
          'Enter the desired name and click [OK] to save it as a template.',
          { image: { src: '/documentation/vtuber-pipeline/animator-template-name-input.png', alt: 'Template name input dialog' } },
          { image: { src: '/documentation/vtuber-pipeline/animator-saved-template.png', alt: 'Saved template shown in the template palette' } },
          'Movements such as eye blinking are used frequently during motion and should be saved as a template.',
        ],
      },
      {
        heading: 'Shy function',
        body: [
          'If you hit keyframes for all parameters at frame 0 first, it will be easier to add motion while anticipating the movement.',
          { image: { src: '/documentation/vtuber-pipeline/animator-shy-frame-0.png', alt: 'Keyframes hit for all parameters at frame 0' } },
          'If you have multiple parameters and find it difficult to edit, use the Shy function and hide the parameters.',
          'Click the small [shy button] on the far left of the parameter you want to hide.',
          { image: { src: '/documentation/vtuber-pipeline/animator-shy-button-individual.png', alt: 'Small shy button on the far left of a parameter' } },
          'Clicking the large shy button above the track while the shy buttons next to the parameters are pushed in will hide the specified parameters.',
          { image: { src: '/documentation/vtuber-pipeline/animator-shy-button-large.png', alt: 'Large shy button above the track' } },
          'If you want to view them again, just click the large shy button.',
          'This is recommended when adding motion to a model with many parameters.',
        ],
      },
      {
        heading: 'Adjust Spacing',
        body: [
          'If you want to adjust the speed of the entire motion, use the [Adjust Spacing] button at the bottom of the timeline palette with all keyframes selected.',
          { image: { src: '/documentation/vtuber-pipeline/animator-adjust-spacing.png', alt: 'Adjust Spacing button at the bottom of the timeline palette' } },
          'If you apply it at 50%, the spacing between each key is halved and the motion is faster.',
          'Conversely, if applied at 200%, the interval can be doubled to slow down the motion.',
          'It can also be applied partially, so if used properly, it can efficiently improve the quality of motion.',
        ],
      },
      {
        heading: 'Graph Editor',
        body: [
          'With a parameter selected, click on [Graph Editor] at the top of the timeline to visually check the keyframe transition for that parameter.',
          { image: { src: '/documentation/vtuber-pipeline/animator-graph-editor-button.png', alt: 'Graph Editor button at the top of the timeline' } },
          { image: { src: '/documentation/vtuber-pipeline/animator-graph-editor-interface.png', alt: 'Graph Editor interface showing keyframe transitions for a parameter' } },
          'In this state, keyframe values and positions can be edited.',
          'Drag on the timeline and select multiple keyframes to display the bounding box.',
          { image: { src: '/documentation/vtuber-pipeline/animator-graph-editor-bounding-box.png', alt: 'Bounding box displayed around selected keyframes in the Graph Editor' } },
          'Here, it is possible to change the amplitude of the movement and adjust the spacing.',
          'As with the timeline, keyframes can also be added and removed using [Ctrl].',
          { image: { src: '/documentation/vtuber-pipeline/animator-graph-editor-keyframe.png', alt: 'Adding and removing keyframes in the Graph Editor using Ctrl' } },
          'The Graph Editor allows you to intuitively check and edit keyframe values, so be sure to take advantage of it when adding motion.',
        ],
        footer:
          'This is the end of the explanation of how to use the Animation Workspace.',
      },
    ],
    source: 'Adapted from the Live2D Cubism Editor Tutorial \u2014 "6. Creating Animations".',
  },
}
