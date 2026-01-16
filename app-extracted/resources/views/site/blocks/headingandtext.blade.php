<div class="py-5" id="index-banner">
    <div class="container">
        <div class="row justify-content-center">
    
      <div class="col-9   mb-4    @if(!empty($block->translatedInput('css')))

                {!! $block->translatedInput('css') !!}

        @endif">
        <div class="mt-5">
    <h2 class="fw-bold fs-3 fs-md-4 fs-lg-2 pb-3 text-warning extralarge">
        {{ $block->translatedInput('title') }}
    </h2>
            <h4 class="mb-3">{{ $block->translatedInput('sub') }}</h4>
    <div class="fs-5  ">
        {!! $block->translatedInput('text') !!}
    </div> </div></div>
        </div></div></div>
