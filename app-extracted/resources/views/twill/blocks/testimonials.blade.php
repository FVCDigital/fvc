@twillBlockTitle('Testimonials')

<x-twill::repeater type="testimonial_item" label="Add Testimonial" />

<x-twill::input
    name="bk"
    label="Background Colour"
    :translated="true"
/>