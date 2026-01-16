<div class="py-5" id="index-banner">
    <div class="container {{ $block->translatedInput('css') }} rounded-5">
        <div class="row justify-content-center">
    
      <div class="col-12   mb-4  text-center ">
        <div class="mt-5">
    <h2 class="fw-bold fs-3 fs-md-4 fs-lg-2 text-center   pb-3">
        {{ $block->translatedInput('title') }}
    </h2>
                <h4 class="fw-bold fs-3 fs-md-4 fs-lg-2 text-center text-white pb-3">
        {{ $block->translatedInput('subheading') }}
    </h4>
                    <div class="row justify-content-center">
                     @foreach($block->children()->where('type', 'card_item')->get() as $item)
            
  <div class="col-12 col-md-5 col-lg-5 mb-4">
            
                 <div class="card bg-white h-100 ">
                     
                        <div class="card-body">
                               <div class="col d-flex align-items-start text-start">
      <i class="bi {{ $item->input('icon') }}   fs-2 text-warning flex-shrink-0 me-3" style="font-size: 1.75em;"></i>
        <div>
          <h4 class="fw-bold mb-0">{{ $item->input('header') }}</h4>
          <p>{{ $item->input('description') }}</p>
        </div>
      </div> 
                         
                        </div>
                    </div>
                     </div>
    @endforeach
                    </div>   
    <div class="fs-5  ">
        {!! $block->translatedInput('text') !!}
    </div> </div></div>
        </div></div></div>
