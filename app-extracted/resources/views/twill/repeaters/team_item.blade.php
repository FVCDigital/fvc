@twillRepeaterTitle('team member')

 
<x-twill::input
    name="name"
    label="name"
/>
<x-twill::input
    name="job"
    label="job title"
/>
 
<x-twill::medias
    name="highlight"
    label="Highlight"
/>

<x-twill::input
    type="textarea"
    name="description"
    label="description"
    :rows="4"
/>
