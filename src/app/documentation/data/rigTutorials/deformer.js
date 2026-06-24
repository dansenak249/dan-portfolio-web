// Self-contained tutorial data module for the VTuber (Live2D) rig stage.
// Verbatim from the Live2D Cubism Editor Tutorial "4. Adding Body Movement".
// The "download Cubism" button, the Basic Tutorial List, remote download
// links, breadcrumbs, and any trailing "Please refer to the following
// pages..." block are intentionally omitted.
//
// `body` arrays are content blocks rendered in order: a plain string is a
// paragraph, { image } is a figure, { list } is a bullet list. Each { image }
// sits immediately after the paragraph that describes it.

export const deformer = {
  id: 'rig-deformer',
  label: 'Body Movement',
  sub: 'Use deformers to add face tilt, hair swing, arm, and body movement',
  accent: '#c264c8',
  article: {
    intro: [
      'In this case, use the Live2D \u201cDeformer\u201d tool to add movement to the body and hair. In the video, we explain how to use a deformer while adding [facial tilt], [hair swing], [arm movement], and [body up/down and tilt].',
    ],
    video: {
      youtube: '', // paste the YouTube link or video id here
      caption: 'Live2D Cubism Basic Tutorial 4: Adding Body Movement',
    },
    sections: [
      {
        heading: 'Video Review',
        body: [
          'Here, the ArtMesh is placed in a \u201cdeformer\u201d to add movement. The following four movements are added:',
          { list: [
            'Tilting movement of the face',
            'Hair sway',
            'Arm movement',
            'Tilt of the body and vertical movement',
          ] },
        ],
      },
      {
        heading: 'About Deformers',
        body: [
          'When the sample model is displayed, it shows a gray square and several red bars. These are deformers.',
          { image: { src: '/documentation/vtuber-pipeline/deformer-about-deformers.png', alt: 'Sample model showing a gray square and several red bars that are deformers' } },
          'Transformation and rotation can be performed by placing an ArtMesh inside a deformer. Like ArtMeshes, deformers can be parameterized, so if you learn how to use them, you can add a variety of movements to your characters.',
        ],
      },
      {
        heading: 'Types of Deformers',
        body: [
          'The gray square and red bar are both deformers, but they are used for separate purposes. The gray squares are called \u201cwarp deformers.\u201d Warp deformers can deform the ArtMesh contained within.',
          'The red bar is called a \u201crotation deformer.\u201d The rotation deformer is a deformer specialized in rotational movements, allowing the user to rotate the target by specifying a numerical angle. It is primarily used on the neck, arms, and legs to create a leaning motion.',
          { image: { src: '/documentation/vtuber-pipeline/deformer-types-of-deformers.png', alt: 'Diagram showing warp deformers as gray squares and rotation deformers as red bars' } },
        ],
      },
      {
        heading: 'Create a Face-Tilting Movement',
        body: [
          'The tilting motion of the face is called [Angle Z] in the Live2D parameters.',
          'First, place the head part in a rotation deformer. From the Parts palette, lock the neck, arms, body, and legs.',
          { image: { src: '/documentation/vtuber-pipeline/deformer-face-lock-parts.png', alt: 'Parts palette with the neck, arms, body, and legs locked' } },
          'Once locked, use Ctrl + A to select all ArtMeshes that are not locked. With those ArtMeshes selected, click [Create Rotation Deformer] at the top of the screen.',
          { image: { src: '/documentation/vtuber-pipeline/deformer-face-create-rotation.png', alt: 'Menu showing the Create Rotation Deformer option' } },
          'Clicking on [Create Rotation Deformer] will bring up a new dialog box. The Name field can be set as desired. You can use the list to select the part in which to insert the deformer. For this example, select a face since it is a face rotation. Be sure to select \u201cSet as Parent of Selected Object\u201d option for Addition Destination.',
          'After confirming the various settings, click [Create].',
          { image: { src: '/documentation/vtuber-pipeline/deformer-face-rotation-dialog.png', alt: 'Create Rotation Deformer dialog box' } },
          'The rotation deformer is now ready. When rotated, the selected face parts will rotate. If any parts are missing, they can be inserted by selecting the ArtMesh and then selecting Deformer from the Inspector.',
          'Deformers can be positioned by holding down Ctrl and moving them. This operation is similar for warp deformers. Make sure to hold down Ctrl; otherwise the ArtMesh inside will move with it.',
          { image: { src: '/documentation/vtuber-pipeline/deformer-face-position.png', alt: 'Rotation deformer positioned on the character head' } },
          'Move the rotation deformer to the chin position.',
          { image: { src: '/documentation/vtuber-pipeline/deformer-face-chin-position.png', alt: 'Rotation deformer moved to the chin position' } },
          'Once the position has been adjusted, the parameters are used to add movement. The procedure for attaching parameters is the same as for an ArtMesh. Add three keys to the face rotation Z parameter to add motion. Here, each side should move 10 degrees.',
          { image: { src: '/documentation/vtuber-pipeline/deformer-face-parameter-keys.png', alt: 'Three keys added to the face rotation Z parameter for motion' } },
        ],
      },
      {
        heading: 'Add Hair Swing Movement',
        body: [
          'Next, let\u2019s create the hair swing movement. Movement is applied to the front, sides, and back of the hair, respectively. First select the bangs ArtMesh and click on [Create Warp Deformer] in the center of the menu above.',
          { image: { src: '/documentation/vtuber-pipeline/deformer-hair-create-warp.png', alt: 'Create Warp Deformer menu option' } },
          'As with the rotation deformer, a dialog box will appear to confirm each item.',
          'The bottom item is one that was not used for the rotation deformer. For the time being, the number of Bezier divisions is 2 x 2 and the number of conversion divisions is 5 x 5. When you have finished entering the values, click [Create].',
          { image: { src: '/documentation/vtuber-pipeline/deformer-hair-warp-dialog.png', alt: 'Create Warp Deformer dialog with Bezier and conversion division settings' } },
          'The warp deformer is now ready. When the deformer is deformed, the bangs are deformed together.',
          'Now, let\u2019s add a swinging movement for the bangs to the deformer.',
          'The procedure for attaching parameters is the same as for an ArtMesh. Add three keys to the \u201cHair swing Front\u201d parameter. Add a movement such that the tips of the hairs sway to the left side of the screen when the parameter moves to the left, and to the right side of the screen when the parameter moves to the right. When deforming the warp deformer, pay attention to the \u201cLevel edit\u201d in the menu. Level edit 3 is suitable for rough movement and 1 for detailed movement. Once you get used to it, you can work more efficiently using the Level edit, but until you get used to it, we recommend that you normally use Level edit 2.',
          { image: { src: '/documentation/vtuber-pipeline/deformer-hair-level-edit.png', alt: 'Warp deformer applied to the bangs with Level edit settings' } },
          'The swing motion can be easily added by simply moving the bottom of the deformer.',
          { image: { src: '/documentation/vtuber-pipeline/deformer-hair-swing-motion.png', alt: 'Hair swing motion created by moving the bottom of the deformer' } },
          'This completes the swing of the bangs. Create deformers and add movement to the sides and back of the hair as well.',
        ],
      },
      {
        heading: 'Create Arm Movements',
        body: [
          'As with the face, select the ArtMesh and then create a rotation deformer on the arms. However, if this is left as is, the arm is down but the rotation deformer is pointing up, making it difficult to operate, so the default angle is set to match the arm. The angle can be adjusted by turning the handle while pressing Ctrl.',
          { image: { src: '/documentation/vtuber-pipeline/deformer-arm-angle-adjust.png', alt: 'Arm rotation deformer angle adjusted to match the arm' } },
          'After adjusting the angle, click [Set Standard Angle] in the inspector to set the standard angle. Setting a standard angle makes it easier to specify the angle numerically.',
          { image: { src: '/documentation/vtuber-pipeline/deformer-arm-set-standard-angle.png', alt: 'Set Standard Angle option in the inspector' } },
          'After adjusting the deformer, movement will be added. Before that, add a new parameter since arm movement is not included in the default parameters. On the Parameter palette, use the [Create Parameter] function to add a new parameter.',
          { image: { src: '/documentation/vtuber-pipeline/deformer-arm-create-parameter.png', alt: 'Create Parameter dialog in the Parameter palette' } },
          'The name should be \u201cArm\u201d and the ID \u201cParamArm.\u201d',
          'The range of the parameter is 0 to 30, since only an arm raising motion is added here. If you want to add a downward movement as well, set the Minimum [-30], Standard [0], and Maximum [30].',
          { image: { src: '/documentation/vtuber-pipeline/deformer-arm-parameter-range.png', alt: 'Parameter range settings for the arm' } },
          'Insert two parameters into the rotation deformer to make the arm go up when it reaches 30.',
          { image: { src: '/documentation/vtuber-pipeline/deformer-arm-parameterized.png', alt: 'Parameterized arm rotation deformer raising the arm at 30' } },
          'The arm looked thin when raised, so this time a parameter was added to the ArtMesh to adjust the thickness.',
          { image: { src: '/documentation/vtuber-pipeline/deformer-arm-thickness.png', alt: 'ArtMesh thickness adjustment for the raised arm' } },
          'Let\u2019s add movements for the left arm in the same way.',
        ],
      },
      {
        heading: 'Create Body Tilt and Vertical Movements',
        body: [
          'Tilting and up-and-down movements of the body are made by placing the entire body in a warp deformer. The procedure so far has been to select all ArtMeshes and create a deformer, but since the head, hair, etc. are already in deformers, it is not possible to set and create a deformer as the parent for the entire body.',
          { image: { src: '/documentation/vtuber-pipeline/deformer-body-existing-deformers.png', alt: 'Body with the head and hair already placed in deformers' } },
          'For this reason, in this case, first create an empty deformer and then insert objects.',
          'Two deformers are also required, one for tilt and one for up/down. If you want to create two deformers in succession, press [Sequential Creation] on the far left to continue creating deformers.',
          { image: { src: '/documentation/vtuber-pipeline/deformer-body-sequential-creation.png', alt: 'Sequential Creation option on the far left of the deformer menu' } },
          'To put an object into a deformer, drag and drop it from the deformer palette.',
          { image: { src: '/documentation/vtuber-pipeline/deformer-body-drag-drop.png', alt: 'Object dragged and dropped into a deformer from the deformer palette' } },
          'Alternatively, the object can be placed in a deformer by selecting the deformer from the Inspector with the object selected.',
          { image: { src: '/documentation/vtuber-pipeline/deformer-body-inspector-select.png', alt: 'Object placed in a deformer by selecting the deformer from the Inspector' } },
          'Now let\u2019s add vertical movement to the smaller warp deformer and tilt movement to the larger one.',
          'The ups and downs of the body are moved by the parameter [Body rotation Y]. Insert three points as you make a move up and a move down. If the feet float, it will be difficult to attach motions, so deform the feet so that they do not leave the ground surface.',
          { image: { src: '/documentation/vtuber-pipeline/deformer-body-vertical-deform.png', alt: 'Body vertical movement deformation keeping the feet on the ground' } },
          { image: { src: '/documentation/vtuber-pipeline/deformer-body-vertical-keys.png', alt: 'Body rotation Y parameter with three keyframes for vertical movement' } },
          'The tilt of the body is moved by the parameter [Body rotation Z].',
          'The tilt of the body should be transformed into an arc, rather than translating sideways. For male characters, it is better to make a movement to shift the body\u2019s center of gravity.',
          { image: { src: '/documentation/vtuber-pipeline/deformer-body-tilt-deform.png', alt: 'Body tilt deformed into an arc using the Body rotation Z parameter' } },
        ],
      },
      {
        heading: 'Conclusion',
        body: [
          'This completes adding movement. If you use deformers well, you will be able to create a variety of movements. The basic method of adding movement is the same for all parts, so try moving the character around a lot while referring to sample models. The movements we have learned so far are enough to move the characters, so try your hand at animation!',
        ],
      },
    ],
    source: 'Adapted from the Live2D Cubism Editor Tutorial \u2014 "4. Adding Body Movement".',
  },
}
