@twillBlockTitle('Text')
@twillBlockIcon('text')
@twillBlockGroup('app')

<x-twill::input
    name="title"
    label="Title"
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
<div>
    <label>Column Width</label>
    <select name="image_with_width_column">
        <option value="12">Full</option>
        <option value="6">Half</option>
        <option value="4">One-third</option>
        <option value="3">One-quarter</option>
    </select>
</div>
