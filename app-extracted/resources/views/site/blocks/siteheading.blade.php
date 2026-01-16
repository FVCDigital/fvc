<div class="py-5 " id="index-banner">
    <div class="container  
                @if(!empty($block->translatedInput('css')))

                {!! $block->translatedInput('css') !!}

        @endif
      ">
          @if(!empty($block->translatedInput('title')))
            <h1 class="text-center pb-3">
                {{ $block->translatedInput('title') }}
            </h1>
        @endif

        @if(!empty($block->translatedInput('subtitle')))
            <h2 class="text-center animated-text  fw-normal pb-4 mb-3" id="animatedText">{{ $block->translatedInput('subtitle') }}</h2>
        @endif
        
<div class="row ">
    <div class="col-12 col-md-9 pt-4 mx-auto">
      
 

        @if(!empty($block->translatedInput('text')))
            
                    {!! $block->translatedInput('text') !!}
            
        @endif
        
        
        </div>
   
 
        </div>
    </div>
</div>

