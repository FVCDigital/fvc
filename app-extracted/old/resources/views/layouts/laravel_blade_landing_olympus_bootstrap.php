{{--
  File: resources/views/landing.blade.php
  Quick start:
  1) Save this file as resources/views/landing.blade.php
  2) Add route in routes/web.php: Route::view('/', 'landing');
  3) Run: php artisan serve

  Notes:
  - Uses Bootstrap 5 and shadstrap.css for styling.
--}}
<!DOCTYPE html>
<html lang="en" class="h-100">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>@yield('title', 'Your Protocol')</title>
  <meta name="description" content="A minimal, dark landing template for Laravel (Blade)"> 

  {{-- Bootstrap 5 --}}
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  {{-- Shadstrap --}}
  <link href="https://fvcdigital.com/assets/css/shadstrap.min.css" rel="stylesheet">

  <style>
    body {
      background-color: #0b0e13;
      color: #fff;
      font-family: "Inter", sans-serif;
    }
    .hero {
      padding: 6rem 0;
      background: radial-gradient(circle at top, rgba(58,167,255,.1), transparent);
    }
    .glass {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 1rem;
      backdrop-filter: blur(8px);
    }
    .glow {
      box-shadow: 0 0 30px rgba(58,167,255,0.3);
    }
  </style>
</head>
<body class="d-flex flex-column h-100">
  {{-- Top Nav --}}
  <header class="navbar navbar-expand-lg navbar-dark bg-dark fixed-top">
    <div class="container">
      <a class="navbar-brand d-flex align-items-center" href="#">
        <div class="rounded bg-primary me-2" style="width:32px;height:32px;"></div>
        <span>Your Protocol</span>
      </a>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="navbarNav">
        <ul class="navbar-nav ms-auto">
          <li class="nav-item"><a class="nav-link" href="#features">Features</a></li>
          <li class="nav-item"><a class="nav-link" href="#docs">Docs</a></li>
          <li class="nav-item"><a class="nav-link" href="#community">Community</a></li>
          <li class="nav-item"><a class="nav-link" href="#faq">FAQ</a></li>
        </ul>
        <a href="#app" class="btn btn-primary ms-lg-3">Open App</a>
      </div>
    </div>
  </header>

  {{-- Hero --}}
  <section class="hero text-center text-md-start">
    <div class="container">
      <div class="row align-items-center">
        <div class="col-md-6">
          <h1 class="display-4 fw-bold">A sustainable reserve protocol for the multi‑chain future</h1>
          <p class="lead mt-3">A Bootstrap 5 + Shadstrap minimal template for DeFi-style landing pages.</p>
          <div class="mt-4">
            <a href="#app" class="btn btn-primary btn-lg me-2">Enter App</a>
            <a href="#docs" class="btn btn-outline-light btn-lg">Read Docs</a>
          </div>
        </div>
        <div class="col-md-6 mt-5 mt-md-0">
          <div class="glass p-4 glow">
            <h5 class="mb-3">Protocol Metrics</h5>
            <div class="d-flex justify-content-between mb-3">
              <span>Market Cap</span>
              <strong>$123.4M</strong>
            </div>
            <div class="d-flex justify-content-between mb-3">
              <span>Treasury</span>
              <strong>$87.2M</strong>
            </div>
            <div class="d-flex justify-content-between">
              <span>Stakers</span>
              <strong>42,381</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  {{-- Features --}}
  <section id="features" class="py-5 bg-dark">
    <div class="container">
      <div class="row g-4">
        @foreach ([
          ['title'=>'Protocol Owned Liquidity','desc'=>'Mitigate mercenary capital by owning your depth across venues.'],
          ['title'=>'Treasury Backing','desc'=>'Every token is backed by a basket of on‑chain assets.'],
          ['title'=>'Open Governance','desc'=>'Token‑holder proposals and executable votes.'],
        ] as $f)
        <div class="col-md-4">
          <div class="glass p-4 h-100">
            <h5>{{ $f['title'] }}</h5>
            <p class="text-muted">{{ $f['desc'] }}</p>
          </div>
        </div>
        @endforeach
      </div>
    </div>
  </section>

  {{-- Docs Callout --}}
  <section id="docs" class="py-5">
    <div class="container text-center">
      <div class="glass p-5 mx-auto" style="max-width:720px;">
        <h2 class="fw-bold">Everything documented</h2>
        <p class="text-muted">Swap these buttons for your Notion, GitBook, or Whitepaper links.</p>
        <div class="d-flex justify-content-center gap-3 mt-3">
          <a href="#" class="btn btn-outline-light">Whitepaper</a>
          <a href="#" class="btn btn-outline-light">GitBook</a>
          <a href="#" class="btn btn-primary">Forum</a>
        </div>
      </div>
    </div>
  </section>

  {{-- Community --}}
  <section id="community" class="py-5 bg-dark">
    <div class="container">
      <div class="row align-items-center g-4">
        <div class="col-md-6">
          <h2 class="fw-bold">Join the community</h2>
          <p class="text-muted">Point these cards to your Discord, Twitter/X, GitHub, and Snapshot.</p>
          <div class="d-grid gap-3 mt-3">
            @foreach ([['Discord','#'],['Twitter','#'],['GitHub','#'],['Snapshot','#']] as $c)
            <a href="{{ $c[1] }}" class="btn btn-outline-light">{{ $c[0] }}</a>
            @endforeach
          </div>
        </div>
        <div class="col-md-6">
          <div class="glass p-4">
            <h5 class="fw-bold">Roadmap</h5>
            <ul class="list-unstyled mt-3">
              <li><strong>Q3</strong> – Core deployment</li>
              <li><strong>Q4</strong> – L2 expansion</li>
              <li><strong>Q1</strong> – Governance v1</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </section>

  {{-- FAQ --}}
  <section id="faq" class="py-5">
    <div class="container">
      <h2 class="fw-bold text-center mb-4">FAQ</h2>
      <div class="accordion" id="faqAccordion">
        @foreach ([
          ['q'=>'Is this open source?','a'=>'Yes. Use this template freely in your Laravel project.'],
          ['q'=>'How do I connect a wallet?','a'=>'This is a static landing page. Add wallet integrations in your dApp.'],
          ['q'=>'Can I change the theme?','a'=>'Yes—adjust Bootstrap variables or Shadstrap CSS.'],
        ] as $i=>$item)
        <div class="accordion-item">
          <h2 class="accordion-header" id="heading{{ $i }}">
            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse{{ $i }}">
              {{ $item['q'] }}
            </button>
          </h2>
          <div id="collapse{{ $i }}" class="accordion-collapse collapse" data-bs-parent="#faqAccordion">
            <div class="accordion-body">{{ $item['a'] }}</div>
          </div>
        </div>
        @endforeach
      </div>
    </div>
  </section>

  {{-- Footer --}}
  <footer class="bg-dark py-4 mt-auto">
    <div class="container text-center text-muted small">
      <p class="mb-1">© {{ date('Y') }} Your Protocol. All rights reserved.</p>
      <a href="#" class="text-muted me-2">Privacy</a>
      <a href="#" class="text-muted me-2">Terms</a>
      <a href="#" class="text-muted">Contact</a>
    </div>
  </footer>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
