@twillBlockTitle('Button')
<x-twill::input
    name="button_text"
    label="Button Text"
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
    name="button_url"
    label="Button URL"
/>
