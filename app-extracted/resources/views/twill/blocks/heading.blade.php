@twillBlockTitle('Home page Heading Section')
@twillBlockIcon('text')
@twillBlockGroup('app')
@php
$wysiwygOptions = [
    ['header' => [2, 3, 4, 5, 6, false]],
    'bold',
    'italic',
    'underline',
    'strike',
    'blockquote',
    'code-block',
    'ordered',
    'bullet',
    'hr',
    'code',
    'link',
    'clean',
    'table',
    'align',
];
@endphp
<x-twill::input
    name="title"
    label="Title"
    :translated="true"
/>
<x-twill::input
    name="subtitle"
    label="Sub title"
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
    :toolbar-options="$wysiwygOptions"
    :translated="true"
/>

<x-twill::select
    name="column_width"
    label="Column Width"
    placeholder="Select column width"
    :options="[
        ['value' => '12', 'label' => 'Full (s12)'],
        ['value' => '6',  'label' => 'Half (s6)'],
        ['value' => '4',  'label' => 'One-third (s4)'],
        ['value' => '3',  'label' => 'One-quarter (s3)'],
    ]"
/>

<x-twill::input
    name="button_text"
    label="Button Text"
/>
<x-twill::input
    name="button_url"
    label="Button URL"
/>

