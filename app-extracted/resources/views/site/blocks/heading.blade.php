<div class="py-5 " id="index-banner">
    <div class="container  
                @if(!empty($block->translatedInput('css')))

                {!! $block->translatedInput('css') !!}

        @endif
      ">
          @if(!empty($block->translatedInput('title')))
            <h1 class="text-center pb-3 pt-4">
                {{ $block->translatedInput('title') }}
            </h1>
        @endif

        @if(!empty($block->translatedInput('subtitle')))
            <h2 class="text-center animated-text  fw-normal pb-5 mb-5" id="animatedText">{{ $block->translatedInput('subtitle') }}</h2>
        @endif
         
<div class="row">
    <div class="col-12 col-md-6 pt-4">
      
        
 <h3 class="mb-4 fw-bold   pt-1">   Venture Capital, Decentralised </h3>      
<p class="fs-5 mt-3">FVC is building a decentralised ecosystem where real-world innovation meets on-chain participation, connecting entrepreneurs and token holders.</p>

<p class="fw-bold fs-5 pl-2 "><i class="bi bi-check-circle-fill   text-warning "></i> Security Audited</p> 

<p class="fw-bold fs-5 pl-2 "><i class="bi bi-check-circle-fill  text-warning"></i> KYC Verified</p>

<p class="fw-bold fs-5 pl-2 "><i class="bi bi-check-circle-fill  text-warning"></i> Fully Transparent</p>

         <a href="{{ $block->input('button_url') }}" class="btn  btn-warning   btn-lg mt-3 mb-5 p-4 fs-4 ">
       Join Pre-sale   <i class="bi bi-arrow-up-right-square "></i>
        </a>
        
<h3 class="fw-bold mb-3">What is FVC</h3>
<p class="fs-5">For too long, venture opportunities have been locked behind closed doors. FVC uses a utility token ($FVC) to connect entrepreneurs and token holders through governed, interest-free revenue-share funding—no equity given up.</p>


 <a href="{{ $block->input('button_url') }}" class="btn  btn-outline-dark btn-lg  mt-2 mb-5">
          Read Whitepaper
        </a>

        @if(!empty($block->translatedInput('text')))
            
                    {!! $block->translatedInput('text') !!}
            
        @endif
        
        
        </div>
     <div class="col-12 col-md-6"> <div class="card p-4 rounded-3"> <h2>Private Seeding Round</h2>  <div class="progress mb-3" style="height: 30px;" role="progressbar" aria-label="Warning animated" aria-valuenow="80" aria-valuemin="0" aria-valuemax="100">
        <div id="animatedProgressBar" class="progress-bar progress-bar-striped progress-bar-animated bg-warning" style="width: 80%">
          <span class="px-2">$4.26M raised of $10M goal</span>
        </div>
      </div>  <div class="card-body bg-light">
                    <div class="row text-center p-0 m-0">
                        <div class="col-3">
                            <h3 id="days" class="display-4">00</h3>
                            <p>Days</p>
                        </div>
                        <div class="col-3">
                            <h3 id="hours" class="display-4">00</h3>
                            <p>Hours</p>
                        </div>
                        <div class="col-3">
                            <h3 id="minutes" class="display-4">00</h3>
                            <p>Minutes</p>
                        </div>
                        <div class="col-3">
                            <h3 id="seconds" class="display-4">00</h3>
                            <p>Seconds</p>
                        </div>
                    </div>
                </div><div id="fvc-private-sale"></div></div></div>
 
        </div>
       <h4 class="fw-bold text-center mt-4">Back businesses. Share revenues. Govern together.</h4></div>
</div>

