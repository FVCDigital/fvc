@twillBlockTitle('Text and heading section')
@twillBlockIcon('text')
@twillBlockGroup('app')

<x-twill::input
    name="title"
    label="Title"
    :translated="true"
/>
<x-twill::input
    name="sub"
    label="Subheading"
    :translated="true"
/>
<x-twill::input
    name="bk"
    label="Background Colour"
    :translated="true"
/>
<x-twill::input
    name="css"
    label="css class"
    :translated="true"
/>
<x-twill::wysiwyg
    type="quill"
    name="text"
    label="Text"
    placeholder="Text"
    :toolbar-options="[
        'bold',
        'italic',
        ['list' => 'bullet'],
        ['list' => 'ordered'],
        [ 'script' => 'super' ],
        [ 'script' => 'sub' ],
        'link',
        'clean'
    ]"
    :translated="true"
/>
 
