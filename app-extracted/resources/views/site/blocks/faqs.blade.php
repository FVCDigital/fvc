<div class="container py-5">
   
    <div class="row">
        <div class="col-9 mx-auto">

<div class="container accordion-container">
   

    <div class="accordion" id="projectAccordion">
        <!-- Planning Section -->
@foreach($block->children()->where('type', 'faq_item')->get() as $item)
    <div class="accordion-item">
        <h2 class="accordion-header">
            <button class="accordion-button {{ $loop->first ? '' : 'collapsed' }}" type="button" data-bs-toggle="collapse" data-bs-target="#collapse{{ $block->id }}_{{ $loop->iteration }}" aria-expanded="{{ $loop->first ? 'true' : 'false' }}">
                <i class="fas fa-clipboard-list feature-icon"></i>
                {{ $item->input('question') }}
            </button>
        </h2>
        <div id="collapse{{ $block->id }}_{{ $loop->iteration }}" class="accordion-collapse collapse {{ $loop->first ? 'show' : '' }}" data-bs-parent="#projectAccordion">
            <div class="accordion-body">
                {!! $item->translatedInput('text') !!}
            </div>
        </div>
    </div>
@endforeach

       

 
    
 
    </div>
            </div></div></div></div>