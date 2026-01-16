@twillRepeaterTitle('Accordion item')
@twillRepeaterMax('10') // Optional
 
<x-twill::input
    name="header"
    label="Header"
/>
 
<x-twill::input
    type="textarea"
    name="description"
    label="description"
    :rows="4"
/>