
<header class="navbar navbar-expand-lg navbar-dark bg-warning sticky-top">
    <div class="container">

        {{-- Brand --}}
        <a class="navbar-brand d-flex align-items-center" href="#">
            <img class="img-fluid logo " src="{{ URL::asset('assets/images/FirstVentureCapita-logo.svg') }}" alt="FVC Digital">
        </a>

        {{-- Mobile Toggle Button --}}
        <button class="navbar-toggler" type="button" data-bs-toggle="offcanvas" data-bs-target="#mobileMenu">
            <span class="navbar-toggler-icon"></span>
        </button>

        {{-- Desktop Menu --}}
        <div class="collapse navbar-collapse justify-content-lg-end d-none d-lg-flex">
            <ul class="navbar-nav px-3 px-md-0">
                @foreach($links as $link)
                    <li class="nav-item px-md-3">
                        <a class="nav-link" href="{{ route('frontend.page', [$link->getRelated('page')->first()->slug]) }}">
                            {{ $link->title }}
                        </a>
                    </li>
                @endforeach
            </ul>

            <a href="{{ route('frontend.buy-fvc') }}" class="btn btn-light border-0 btn-lg ms-lg-3">Join</a>
           
        </div>

    </div>
</header>

{{-- Offcanvas Mobile Menu --}}
<div class="offcanvas offcanvas-start bg-dark text-white" tabindex="-1" id="mobileMenu">
    <div class="offcanvas-header">
        <h5 class="offcanvas-title">Menu</h5>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="offcanvas"></button>
    </div>

    <div class="offcanvas-body">

        {{-- Mobile Nav Links --}}
        <ul class="navbar-nav">
            @foreach($links as $link)
                <li class="nav-item">
                    <a class="nav-link text-white py-2"
                       href="{{ route('frontend.page', [$link->getRelated('page')->first()->slug]) }}"
                       >
                        {{ $link->title }}
                    </a>
                </li>
            @endforeach
        </ul>

        <hr class="border-secondary">

        {{-- Buttons --}}
        <a href="{{ route('frontend.buy-fvc') }}" class="btn btn-light btn-lg w-100 mb-3" data-bs-dismiss="offcanvas">Join</a>

    

    </div>
</div>

<script>
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.smooth-scroll').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href.startsWith('#')) {
                e.preventDefault();
                const offcanvas = document.getElementById('mobileMenu');
                if (offcanvas) {
                    const bsOffcanvas = bootstrap.Offcanvas.getInstance(offcanvas);
                    if (bsOffcanvas) bsOffcanvas.hide();
                }
                setTimeout(() => {
                    const target = document.querySelector(href);
                    if (target) {
                        target.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                    }
                }, 300);
            }
        });
    });
});
</script>
