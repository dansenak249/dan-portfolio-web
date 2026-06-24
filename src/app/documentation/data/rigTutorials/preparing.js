// Self-contained tutorial data module for the VTuber (Live2D) pipeline docs.
// Verbatim from the Live2D Cubism Editor Tutorial
// "2. Preparing to Move the Illustration". Download buttons, the Basic
// Tutorial List, the comment form, the prev/next navigation, and the page
// footer are intentionally omitted.
//
// `body` arrays are content blocks rendered in order: a plain string is a
// paragraph, { image } is a figure, { list } is a bullet list. This lets
// images sit right after the paragraph that describes them.

export const preparing = {
  id: 'rig-import',
  label: 'Import to Live2D Cubism',
  sub: 'Importing the PSD into Cubism Editor',
  accent: '#c264c8',
  article: {
    intro: [
      'Load the PSDs created in the previous section Illustration Processing into the Editor and prepare to add movement to them. The video explains the operational procedures and things to be aware of when dividing a mesh.',
      'In this example, the processed illustration data is loaded into Editor to prepare for moving the illustration.',
    ],
    video: {
      youtube: '', // paste the YouTube link or video id here
      caption: 'Live2D Cubism Basic Tutorial 2: Preparing to move the illustration',
    },
    sections: [
      {
        heading: 'PSD Import',
        body: [
          'Select [Open] from the [File] menu and select the PSD you want to load. PSDs can also be loaded by dragging and dropping them directly into the View area.',
          { image: { src: '/documentation/vtuber-pipeline/import-psd-import.png', alt: 'Open dialog used to load a PSD into the Editor' } },
          'Once loaded, the illustration will appear on the canvas.',
          'Information about the loaded illustration is displayed in the Parts palette in the upper left corner of the screen.',
        ],
      },
      {
        heading: 'About ArtMeshes',
        body: [
          'Click on the loaded illustration to see white dots and gray lines. This is called a \u201cmesh.\u201d A texture to which a \u201cmesh\u201d is assigned is called an \u201cArtMesh.\u201d The white dots in the \u201cmesh\u201d are called vertices, and by moving these vertices, the texture can be deformed.',
          'See Live2D Glossary for a detailed explanation of terms.',
          { image: { src: '/documentation/vtuber-pipeline/import-artmesh-vertices.png', alt: 'ArtMesh showing mesh vertices and gray connecting lines' } },
        ],
      },
      {
        heading: 'Mesh Editing (Automatic)',
        body: [
          'When first loaded, only four vertices are struck for the ArtMesh. The number of vertices is too small to deform and it is difficult to get the desired deformation, so it is necessary to break the mesh a little finer.',
          'Since adjusting everything one by one would be a difficult task, all meshes are automatically reassigned once. After selecting all ArtMeshes with Ctrl + A, click [Automatic Mesh generator] from the menu above.',
          { image: { src: '/documentation/vtuber-pipeline/import-automatic-mesh-generator.png', alt: 'Automatic Mesh generator button in the top menu' } },
          'A settings dialog box will then appear. The size and width of the mesh can be adjusted by changing the values from the settings dialog box. Here, break the mesh with the default settings. Click on a value and press Enter to apply the mesh.',
          { image: { src: '/documentation/vtuber-pipeline/import-automatic-mesh-settings.png', alt: 'Automatic mesh generator settings dialog box' } },
          { image: { src: '/documentation/vtuber-pipeline/import-automatic-mesh-result.png', alt: 'ArtMesh after the automatic mesh has been applied' } },
        ],
      },
      {
        heading: 'Mesh Editing (Manual)',
        body: [
          'The eyebrows, eyelashes, and mouth are the most common parts to be deformed significantly, so it is better to manually mesh them to create a clean shape.',
          'With the ArtMesh you want to edit selected, press [Manual Mesh Edit] to enter Mesh Edit mode. Ctrl + E will take you to the same screen.',
          'From here, you can add or delete points.',
          { image: { src: '/documentation/vtuber-pipeline/import-manual-mesh-edit.png', alt: 'Manual Mesh Edit mode with add and delete point tools' } },
          'First, select the Eraser Tool in the Tool Details palette to erase all the points you want to erase.',
          'The size of the Eraser Tool can be changed by dragging it on the canvas while pressing B. Even with a non-Eraser Tool selected, you can hold down Ctrl and drag on the canvas to select multiple vertices for erasing.',
          { image: { src: '/documentation/vtuber-pipeline/import-eraser-tool-before.png', alt: 'Eraser Tool selected in the Tool Details palette' } },
          { image: { src: '/documentation/vtuber-pipeline/import-eraser-tool-after.png', alt: 'Vertices erased from the ArtMesh with the Eraser Tool' } },
          'To add a vertex, select the icon with the plus sign, then click on the canvas. Now you can hit a vertex.',
          'When the next point is struck, the line is automatically connected from point to point.',
          { image: { src: '/documentation/vtuber-pipeline/import-add-vertex-tool.png', alt: 'Add vertex tool with the plus-sign icon selected' } },
          { image: { src: '/documentation/vtuber-pipeline/import-add-vertex-line.png', alt: 'Line automatically connected between added vertices' } },
          'If you hit a point by mistake, you can erase the vertex by selecting the icon with the minus sign and clicking on the one you want to erase.',
          'While in the Add Tool, it is possible to erase a point in the same way by pressing Alt.',
          { image: { src: '/documentation/vtuber-pipeline/import-delete-vertex-tool.png', alt: 'Delete vertex tool with the minus-sign icon selected' } },
          { image: { src: '/documentation/vtuber-pipeline/import-delete-vertex-result.png', alt: 'Mistaken vertex erased from the mesh' } },
          'If you want to connect points with lines after hitting the points, press [Generate Polygons] to automatically connect the points.',
          { image: { src: '/documentation/vtuber-pipeline/import-generate-polygons-before.png', alt: 'Points placed before generating polygons' } },
          { image: { src: '/documentation/vtuber-pipeline/import-generate-polygons-after.png', alt: 'Points connected after pressing Generate Polygons' } },
          'Once the desired shape is achieved, press the check button on the canvas to complete the adjustment. If the adjustment is completed while the mesh does not fully enclose the texture, the texture outside the mesh will not be visible. Divide the mesh so that it completely encloses the texture.',
        ],
      },
      {
        heading: 'Recommended Division by Parts',
        body: [],
        subsections: [
          {
            title: 'How to divide an eyebrow',
            body: [
              'For each eyebrow, we recommend that you create triangles that enclose it. Another method is to draw a line through the middle of the eyebrow. It is recommended that the line width be uniform.',
              { image: { src: '/documentation/vtuber-pipeline/import-divide-eyebrow.png', alt: 'Eyebrow mesh divided with enclosing triangles' } },
            ],
          },
          {
            title: 'How to divide an eyelash',
            body: [
              'The eyelashes deform greatly, so divide the mesh a little finer. As with the eyebrows, the line should be drawn through the middle of the eyelash.',
              { image: { src: '/documentation/vtuber-pipeline/import-divide-eyelash.png', alt: 'Eyelash mesh divided more finely along its middle' } },
            ],
          },
          {
            title: 'How to divide a mouth',
            body: [
              'Draw a line across the top of the lip line and enclose the border in the skin tone area. Do not forget to re-strike not only the upper lip but also the lower lip.',
              { image: { src: '/documentation/vtuber-pipeline/import-divide-mouth-1.png', alt: 'Mouth mesh with a line across the top of the lip line' } },
              { image: { src: '/documentation/vtuber-pipeline/import-divide-mouth-2.png', alt: 'Mouth mesh enclosing both the upper and lower lip' } },
            ],
          },
          {
            title: 'Points to keep in mind when creating meshes manually',
            body: [
              'Although these are the only three we will introduce here, typically, the following points should be kept in mind when creating meshes manually in order to create beautiful deformations.',
              { list: [
                'Make a nice equilateral triangle',
                'Add a point across the line',
              ] },
              'If you have trouble deforming parts other than those introduced here, please refer to the sample models.',
              { image: { src: '/documentation/vtuber-pipeline/import-manual-mesh-points.png', alt: 'Example mesh showing equilateral triangles and points across lines' } },
            ],
          },
        ],
      },
    ],
    source: 'Adapted from the Live2D Cubism Editor Tutorial \u2014 "2. Preparing to Move the Illustration".',
  },
}
