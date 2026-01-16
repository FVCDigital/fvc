@twillBlockTitle('FAQs')

<x-twill::input
    name="title"
    label="Title"
    :translated="true"
/>

<x-twill::repeater type="faq_item" label="Add item" />