<!doctype html>
<html lang="en" data-bs-theme="light">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>@yield('title', config('app.name', 'Laravel'))</title>

    {{-- Bootstrap 5 core CSS --}}
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">

    {{-- Font Awesome (Shadstrap demo assets commonly assume FA is available) --}}
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" />

    {{-- Shadstrap CSS: place the compiled file in public/css or update this path --}}
    <link rel="stylesheet" href="{{ asset('css/shadstrap.min.css') }}">

    {{-- Optional: app-specific overrides --}}
    @stack('styles')

    <style>
        /* Small helper to show a subtle container max-width on huge screens */
        .container-xl { max-width: 1200px; }
    </style>
</head>
<body class="bg-body text-body">
<nav class="navbar navbar-expand-lg border-bottom sticky-top bg-body">
    <div class="container-xl">
        <a class="navbar-brand d-flex align-items-center gap-2" href="{{ url('/') }}">
            <i class="fa-solid fa-cubes"></i>
            <span class="fw-semibold">{{ config('app.name', 'Laravel') }}</span>
        </a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav" aria-controls="mainNav" aria-expanded="false" aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="mainNav">
            <ul class="navbar-nav me-auto mb-2 mb-lg-0">
                <li class="nav-item"><a class="nav-link active" aria-current="page" href="#">Home</a></li>
                <li class="nav-item"><a class="nav-link" href="#">Components</a></li>
                <li class="nav-item"><a class="nav-link" href="#">Docs</a></li>
            </ul>
            <div class="d-flex align-items-center gap-2">
                {{-- Theme toggle --}}
                <button id="themeToggle" type="button" class="btn btn-outline-secondary btn-sm">
                    <i class="fa-solid fa-moon me-2" aria-hidden="true"></i>
                    <span class="align-middle">Toggle theme</span>
                </button>
                @auth
                    <div class="dropdown">
                        <button class="btn btn-outline-primary dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">
                            <i class="fa-solid fa-user"></i>
                            <span class="ms-2">{{ Auth::user()->name }}</span>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end">
                            <li><a class="dropdown-item" href="{{ route('profile.show') }}">Profile</a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li>
                                <form method="POST"  >
                                    @csrf
                                    <button type="submit" class="dropdown-item text-danger">Logout</button>
                                </form>
                            </li>
                        </ul>
                    </div>
                @else
                    <a class="btn btn-primary"  >
                        <i class="fa-solid fa-right-to-bracket me-2"></i>Login
                    </a>
                @endauth
            </div>
        </div>
    </div>
</nav>

<main class="py-4">
    <div class="container-xl">
        {{-- Optional sample UI to confirm styling looks like shadcn/ui --}}
        @hasSection('content')
            @yield('content')
        @else
            <div class="row g-4">
                <div class="col-12 col-lg-8">
                    <div class="card">
                        <div class="card-header d-flex align-items-center justify-content-between">
                            <span class="card-title h6 mb-0">Welcome</span>
                            <span class="text-muted small">Example card</span>
                        </div>
                        <div class="card-body">
                            <p class="mb-3">This layout uses <strong>Bootstrap 5</strong> components styled with a <em>shadcn/ui</em>-like theme (Shadstrap). Use the controls below to preview buttons, inputs, and alerts.</p>
                            <div class="d-flex flex-wrap gap-2 mb-3">
                                <button class="btn btn-primary">Primary</button>
                                <button class="btn btn-secondary">Secondary</button>
                                <button class="btn btn-outline-primary">Outline</button>
                                <button class="btn btn-ghost">Ghost</button>
                                <button class="btn btn-destructive">Destructive</button>
                            </div>
                            <form class="row g-3">
                                <div class="col-md-6">
                                    <label for="name" class="form-label">Name</label>
                                    <input type="text" class="form-control" id="name" placeholder="Jane Doe">
                                </div>
                                <div class="col-md-6">
                                    <label for="email" class="form-label">Email</label>
                                    <input type="email" class="form-control" id="email" placeholder="jane@example.com">
                                </div>
                                <div class="col-12">
                                    <label for="select" class="form-label">Select</label>
                                    <select id="select" class="form-select">
                                        <option>Option A</option>
                                        <option>Option B</option>
                                        <option>Option C</option>
                                    </select>
                                </div>
                                <div class="col-12">
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="checkMe">
                                        <label class="form-check-label" for="checkMe">Remember my choice</label>
                                    </div>
                                </div>
                                <div class="col-12 d-flex gap-2">
                                    <button type="submit" class="btn btn-primary">Submit</button>
                                    <button type="button" class="btn btn-outline-secondary">Cancel</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
                <div class="col-12 col-lg-4">
                    <div class="alert alert-info" role="alert">
                        <i class="fa-solid fa-circle-info me-2"></i>
                        This is an info alert using the Shadstrap palette.
                    </div>
                    <div class="card">
                        <div class="card-header"><span class="card-title h6 mb-0">Quick Actions</span></div>
                        <div class="card-body d-grid gap-2">
                            <a href="#" class="btn btn-secondary w-100"><i class="fa-solid fa-rocket me-2"></i>Launch</a>
                            <a href="#" class="btn btn-outline-secondary w-100"><i class="fa-solid fa-gear me-2"></i>Settings</a>
                            <a href="#" class="btn btn-destructive w-100"><i class="fa-solid fa-trash me-2"></i>Delete</a>
                        </div>
                    </div>
                </div>
            </div>
        @endif
    </div>
</main>

<footer class="border-top mt-5 py-4">
    <div class="container-xl d-flex flex-wrap gap-2 justify-content-between align-items-center">
        <div class="small text-muted">© {{ date('Y') }} {{ config('app.name', 'Laravel') }}. All rights reserved.</div>
        <div class="d-flex align-items-center gap-2 small">
            <a href="#" class="link-secondary text-decoration-none">Privacy</a>
            <span class="text-muted">·</span>
            <a href="#" class="link-secondary text-decoration-none">Terms</a>
        </div>
    </div>
</footer>

{{-- Bootstrap JS (bundle includes Popper) --}}
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>

{{-- Theme persistence (Bootstrap 5.3 uses data-bs-theme="light|dark") --}}
<script>
(function() {
    const root = document.documentElement;
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') {
        root.setAttribute('data-bs-theme', stored);
    }

    const btn = document.getElementById('themeToggle');
    if (!btn) return;

    btn.addEventListener('click', function () {
        const current = root.getAttribute('data-bs-theme') || 'light';
        const next = current === 'light' ? 'dark' : 'light';
        root.setAttribute('data-bs-theme', next);
        localStorage.setItem('theme', next);
        // Optional: update icon
        const icon = btn.querySelector('i');
        if (icon) {
            icon.classList.toggle('fa-moon', next === 'light');
            icon.classList.toggle('fa-sun', next === 'dark');
        }
    });
})();
</script>

{{-- Per-page scripts --}}
@stack('scripts')
</body>
</html>
