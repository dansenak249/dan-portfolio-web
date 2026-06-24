// Self-contained tutorial data module for the Adding Facial Expressions stage.
// Verbatim from the Live2D Cubism Editor Tutorial "3. Adding Facial Expressions".
// The "download Cubism" button, the Basic Tutorial List, remote download links,
// the Tutorial Video timestamp index, and the trailing previous/next navigation
// are intentionally omitted. Mirrors the schema/style of the `art` stage article
// in data/pipeline.js: `body` arrays are content blocks rendered in order, where a
// plain string is a paragraph, { image } is a figure, and { list } is a bullet
// list, so images sit right after the paragraph that describes them.

export const expression = {
  id: 'rig-expression',
  label: 'Facial Expressions',
  sub: 'Eye open/close, eyebrow deformation, and mouth open/close',
  accent: '#c264c8',
  article: {
    intro: [
      'Using Live2D, let\u2019s actually move the illustrations. This time, add movements for [Eye open/close], [deformation of eyebrows], and [Mouth Open/Close].',
    ],
    video: {
      youtube: '', // paste the YouTube link or video id here
      caption: 'Live2D Cubism Basic Tutorial 3: Adding facial expressions',
    },
    sections: [
      {
        heading: 'Video Review',
        body: [
          'This section describes specific ways to add facial expressions to a model. In particular, the quality of the eyes and mouth movements can vary greatly depending on the method of deformation, so try to learn how to add facial expressions here!',
        ],
      },
      {
        heading: 'Lock Parts',
        body: [
          'First, lock all parts except the eyes to prevent them from being edited. You can lock a part by clicking the lock icon on the Parts palette.',
          { image: { src: '/documentation/vtuber-pipeline/expression-lock-parts.png', alt: 'Lock icon on the Parts palette used to lock all parts except the eyes' } },
        ],
      },
      {
        heading: 'Eye Opening and Closing',
        body: [
          'Lock all parts except the eyes, making it impossible to edit anything except the eyes. Once locked, select the object to add movements. Now, start the movement with the left eye, so select all the left eyelashes. Multiple selections can be made by holding down Shift and clicking.',
          { image: { src: '/documentation/vtuber-pipeline/expression-eye-select-eyelashes.png', alt: 'Selecting all of the left eyelashes by holding Shift and clicking' } },
          'With at least one object selected, select the parameters to add movements. A parameter that is grayed out is in the selected state.',
          'First, select \u201cEyeL open/close\u201d and click on [Add 2 Keyforms] at the top of the Parameter palette. The selected ArtMesh now has parameters, and the parameters that were gray now have green dots. A parameter with red and white dots while an object is unselected has an object key inserted. When an object is selected, a green dot indicates that the object has a parameter attached to it.',
          { image: { src: '/documentation/vtuber-pipeline/expression-eye-add-keyforms.png', alt: 'EyeL open/close parameter with green dots after adding 2 keyforms' } },
          'Move the eyelashes to try out the parameter.',
          { image: { src: '/documentation/vtuber-pipeline/expression-eye-try-parameter.png', alt: 'Moving the eyelashes to test the EyeL open/close parameter' } },
          'If you move a parameter in this state, it will move from the position where you moved it to the position where it was at the beginning. This is the state with parameters.',
          'If you move one point and then the other, the initial position setting will be lost. To prevent this, check the \u201cLock Default Forms\u201d checkbox in the Parameter palette menu. Doing so makes it impossible to edit the object when its default values are used.',
          { image: { src: '/documentation/vtuber-pipeline/expression-eye-lock-default-forms.png', alt: 'Lock Default Forms checkbox in the Parameter palette menu' } },
        ],
        subsections: [
          {
            title: 'Eyelashes deformation',
            body: [
              'Let\u2019s actually add movement to the eyelashes. Hide the eyeballs to make it easier to create the closed eye shape.',
              { image: { src: '/documentation/vtuber-pipeline/expression-eyelashes-hide-eyeballs.png', alt: 'Eyeballs hidden to make creating the closed eye shape easier' } },
              'Move the parameter to the left and confirm that the number next to the parameter is 0. In the 0 state, transform the eyelashes into a closed eye. Click on the eyelashes and a red box will appear; grab the center of the box and lower it to the position of the lower eyelashes.',
              { image: { src: '/documentation/vtuber-pipeline/expression-eyelashes-lower-box.png', alt: 'Red bounding box on the eyelashes lowered to the lower eyelash position' } },
              'From here, deform the meshes of the inner corner and outer corner of the eyes to create the closed eyes, although it is difficult to move the vertices one by one. In such a case, click on the [Deform Path edit] on the [Tools Menu] above.',
              { image: { src: '/documentation/vtuber-pipeline/expression-eyelashes-deform-path-edit.png', alt: 'Deform Path edit selected on the Tools Menu' } },
              'Clicking on the ArtMesh with the deform path selected will draw a line. Note that deform paths cannot be drawn unless an ArtMesh is selected. Return to the Select Tool and click on the struck green point to change it to red. When you move this point, the area around the point is deformed all at once. This will create the shape of the closed eye.',
              { image: { src: '/documentation/vtuber-pipeline/expression-eyelashes-deform-path-points.png', alt: 'Deform path point changed from green to red to deform the surrounding area' } },
              'Once the rough shape is created, directly move the vertices of the ArtMesh to shape it. Once you have deformed the main eyelashes, move the parameters around to check them.',
            ],
          },
          {
            title: 'Deformation of the white parts of the eyes using clipping',
            body: [
              'If eyeballs are displayed in this state, they will be visible even when the eyes are closed. Therefore, use the clipping function to create movement so that the eyeballs are not visible when closed.',
              'First, select the white part of the eye. Copy the ID as it appears in the inspector palette and paste the white eye ID into the eyeball clipping text box.',
              { image: { src: '/documentation/vtuber-pipeline/expression-clipping-white-eye-id.png', alt: 'Pasting the white eye ID into the eyeball clipping text box' } },
              'Now the eyeball is clipped to the white part of the eye. When the white part of the eye is actually moved, the eyeball is not displayed outside the range of the white eye. Let\u2019s put a parameter on this white eye. If this parameter is set so that the white part of the eye is deleted\u2014that is, hidden by the eyelashes\u2014when the eye is closed, the eyeball will not be visible.',
              'This completes the left eye\u2019s motion setup. Let\u2019s add movements for the right eye in the same way.',
            ],
          },
        ],
      },
      {
        heading: 'Deform Eyebrows',
        body: [
          'Similar to the eyelashes, eyebrows can be moved using a deform path. The procedure is almost the same.',
          'With the left eyebrow ArtMesh selected, select the parameters for the left eyebrow deformation. This time, instead of inserting two points, insert three points. The deformity is such that the eyebrows are bent down to the side when the parameter goes to the left side and the eyebrows are raised when the parameter goes to the right side.',
          { image: { src: '/documentation/vtuber-pipeline/expression-eyebrow-three-points.png', alt: 'Left eyebrow parameter set up with three points for bend and raise' } },
        ],
        note: {
          title: 'TIPS',
          body: [
            'You can tell how many points to insert by where the black dot in the parameter is located.',
            'Also, please refer to the sample models while adding parameters.',
            { image: { src: '/documentation/vtuber-pipeline/expression-eyebrow-tips-black-dot.png', alt: 'Black dot position in the parameter indicating how many points to insert' } },
          ],
        },
        postNote: [
          'Let\u2019s start with the down-slanting eyebrows first. Select the ArtMesh with the parameter set to [-1.0], and draw a deform path to move the points. Edit the vertices for fine adjustment. Down-slanting eyebrows take the shape shown in the following image.',
          { image: { src: '/documentation/vtuber-pipeline/expression-eyebrow-down-slanting.png', alt: 'Down-slanting eyebrow shape created at parameter -1.0' } },
          'Let\u2019s continue to create the right side of the parameters. This transformation is mainly used to express surprise. Contrary to a down-slanting eyebrow, the eyebrow is transformed so that the center of the eyebrow is raised.',
          { image: { src: '/documentation/vtuber-pipeline/expression-eyebrow-raised.png', alt: 'Raised eyebrow shape with the center lifted to express surprise' } },
          'Let\u2019s add movements for the right eyebrow in the same way.',
        ],
      },
      {
        heading: 'Deform Mouth',
        body: [
          'Select the top and bottom parts of the mouth and inside the mouth, and insert two keys in [Mouth Open/Close]. In this illustration, the mouth is open by default, so create a closed mouth when the parameter is 0.',
        ],
        subsections: [
          {
            title: 'Deformation of the top part of the mouth',
            body: [
              'First, create the shape of the top part of the mouth. Since it is difficult to see with the other parts displayed, hide them. Draw a deform path on the top part of the mouth. As with the eyes and eyebrows, draw a deform path that traces the line. The skin tone area will also move significantly if only the top of the line is drawn.',
              'This will cause the vertices to intersect and make it difficult to make adjustments later, so a deform path is also drawn for the skin tone area. In this way, moving the deform path on the line does not affect the upper portion, and the vertices of the skin tone area will not move. Move the deform path to create the shape. Once the rough shape is created, directly adjust the vertices and shape.',
              { image: { src: '/documentation/vtuber-pipeline/expression-mouth-top.png', alt: 'Deform paths on the top mouth line and skin tone area to shape the upper mouth' } },
            ],
          },
          {
            title: 'Deformation of the bottom part of the mouth',
            body: [
              'When shaping the bottom part of the mouth, be careful to keep the lines as close as possible to the shape of the top part. The bottom part is hidden by the top part when the mouth is closed, and the line may be smudged or positioned too high. In this condition, the shape of the closed mouth at the time of interpolation may look bad. So, try to match the shape to the top part as much as possible.',
              { image: { src: '/documentation/vtuber-pipeline/expression-mouth-bottom.png', alt: 'Bottom part of the mouth shaped to match the top part for a clean closed mouth' } },
            ],
          },
          {
            title: 'Deformation of area inside the mouth',
            body: [
              'If the area inside the mouth protrudes from the skin tone area, move the vertices so that the skin tone area of each mesh widens, or add parameters to the area inside the mouth so that the inside area shrinks when the mouth is closed.',
              { image: { src: '/documentation/vtuber-pipeline/expression-mouth-inside.png', alt: 'Inside of the mouth adjusted so it does not protrude from the skin tone area when closed' } },
            ],
          },
        ],
        footer:
          'This completes adding movement. Other parts can be moved in the same way, so please refer to the sample models and other materials to try adding movement. In the next video, adding movement to the hair and body will be explained.',
      },
    ],
    source: 'Adapted from the Live2D Cubism Editor Tutorial \u2014 "3. Adding Facial Expressions".',
  },
}
