<div class="container py-5 {{ $block->input('css_class') }}" id="buy-fvc-section" 
     @if($block->input('background_colour')) style="background-color: {{ $block->input('background_colour') }};" @endif>
    <div class="row justify-content-center">
        <div class="col-12 col-lg-10">
            <div class="card border-0 p-4 shadow-sm">
                @if(!empty($block->translatedInput('title')))
                    <h2 class="text-center mb-4">{{ $block->translatedInput('title') }}</h2>
                @else
                    <h2 class="text-center mb-4">Join Pre-Sale</h2>
                @endif
                
                @if(!empty($block->translatedInput('text')))
                    <div class="text-center mb-4">
                        {!! $block->translatedInput('text') !!}
                    </div>
                @endif
                
                <div id="buy-fvc-component" class="mt-3"></div>
            </div>
        </div>
    </div>
</div>

<script src="https://cdn.ethers.io/lib/ethers-5.7.2.umd.min.js"></script>
<script>
document.addEventListener('DOMContentLoaded', function() {
    if (typeof FVCBuyComponent !== 'undefined' && document.getElementById('buy-fvc-component')) {
        window.buyFVCComponent = new FVCBuyComponent('buy-fvc-component', {
            apiBase: '{{ config("app.url") }}/api',
            saleContractAddress: '{{ config("services.bsc.sale_address", "") }}',
            usdcAddress: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
            usdtAddress: '0x55d398326f99059fF775485246999027B3197955',
            chainId: 56,
        });
    }
});
</script>
