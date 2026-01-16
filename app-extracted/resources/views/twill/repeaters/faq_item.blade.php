@twillRepeaterTitle('Question')

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
    name="question"
    label="question"
/>

<x-twill::wysiwyg
    type="tiptap"
    name="text"
    label="Text"
    placeholder="Text"
    :toolbar-options="$wysiwygOptions"
    :translated="true"
/>
