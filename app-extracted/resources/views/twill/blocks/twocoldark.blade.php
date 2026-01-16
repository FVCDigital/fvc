@twillBlockTitle('Reveal card Dark bk')
<x-twill::input
    name="title"
    label="Title"
    :translated="true"
/>
<x-twill::input
    name="sub"
    label="subheading"
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
<x-twill::repeater type="twoblock_item" label="Add item" />
<x-twill::input
    name="button_text"
    label="Button Text"
/>


<x-twill::input
    name="button_url"
    label="Button URL"
/>

