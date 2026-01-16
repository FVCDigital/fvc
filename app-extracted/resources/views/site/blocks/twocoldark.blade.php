

<section class="container-fluid bg-dark ">
<div class="container">
  <div class="row">
      <div class="col-12  mb-4 pt-4">
         <h2 class="fw-bold fs-2 fs-md-2 fs-lg-1 text-center text-white   pb-3">
        {{ $block->translatedInput('title') }}
    </h2>
                <h3 class="fw-bold fs-3 fs-md-4 fs-lg-2 text-center text-white pb-3">
        {{ $block->translatedInput('sub') }}
    </h3>
      </div>
    @foreach($block->children()->where('type', 'twoblock_item')->get() as $item)
     <div class="col-12 col-md-6 mb-4">
                <div class="card-reveal-wrapper shadow-lg">
                   <i class="bi  bi-file-earmark-check h2  " style="  z-index:100;"></i>  <div class="card card-reveal h-100">
                     
                        <div class="card-body">
                               
                            <h4 class="card-title fs-900 text-center text-white"> {{ $item->input('header') }}</h4>
                          
                          
                             <i class="bi bi-arrow-return-right" style="position:absolute; bottom:10px; right:10px; font-size:24px;  z-index:20;"></i>
                        </div>
                    </div>
                    
                    <div class="card-reveal-content bg-dark p-5 text-center  rounded-2">
                        <div class="card-body d-flex flex-column justify-content-center h-100">
                           
                            <p class="card-text ">   {{ $item->input('description') }}</p>
                            
                        </div>
                    </div>
                </div>
      </div>
  
    @endforeach
  </div>
    <div class="row justify-content-center">
    <div class="col-12 text-center pb-3">
        <a href="{{ $block->input('button_url') }}" class="btn mb-3  btn-outline-light btn-lg">
            {{ $block->input('button_text') }}
        </a>
    </div>
</div>
</div>
</section>


