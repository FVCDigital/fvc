{{--
  File: resources/views/landing.blade.php
  Quick start:
  1) Save this file as resources/views/landing.blade.php
  2) Add route in routes/web.php: Route::view('/', 'landing');
  3) Run: php artisan serve

  Notes:
  - Uses Tailwind via CDN for speed. For production, wire Tailwind through Vite.
  - Design is dark, minimal, and modular so you can swap in your own branding.
--}}
<!DOCTYPE html>
<html lang="en" class="h-full">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>@yield('title', 'Your Protocol')</title>
  <meta name="description" content="A minimal, dark landing template for Laravel (Blade)"> 
  <link rel="preconnect" href="https://fonts.bunny.net" />
  <link href="https://fonts.bunny.net/css?family=inter:400,500,600,700|jetbrains-mono:400,600" rel="stylesheet" />
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui'], mono:['JetBrains Mono','ui-monospace','SFMono-Regular'] },
          colors: {
            base: {
              50:'#f6f7f9', 100:'#eaeef3', 900:'#0b0e13'
            },
            brand: {
              50:'#e8f7ff', 100:'#c6eaff', 500:'#69c0ff', 600:'#3aa7ff', 700:'#0f8fff'
            }
          },
          boxShadow: { glow: '0 0 0 1px rgba(255,255,255,0.06), 0 10px 40px rgba(0,0,0,0.4)' },
          backdropBlur: { xs: '2px' }
        }
      }
    }
  </script>
  <style>
    /* subtle animated gradient background */
    .bg-grid {
      background-image: radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px);
      background-size: 24px 24px;
      mask-image: linear-gradient(to bottom, rgba(0,0,0,0.15), rgba(0,0,0,0.7) 40%, rgba(0,0,0,1));
    }
    .noise { position: fixed; inset: 0; pointer-events: none; opacity:.08; background-image:url('data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'160\' height=\'160\'><filter id=\'n\'><feTurbulence type=\'fractalNoise\' baseFrequency=\'0.7\' numOctaves=\'3\'/></filter><rect width=\'100%\' height=\'100%\' filter=\'url(%23n)\' opacity=\'0.5\'/></svg>'); mix-blend-mode: overlay; }
  </style>
</head>
<body class="h-full bg-base-900 text-white antialiased selection:bg-brand-600/30">
  <div class="noise"></div>
  {{-- Top Nav --}}
  <header class="sticky top-0 z-40 border-b border-white/5 backdrop-blur bg-black/30">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex h-16 items-center justify-between">
        <a href="#" class="flex items-center gap-3 group">
          <div class="h-8 w-8 rounded-xl bg-gradient-to-br from-brand-700 to-brand-500 shadow-glow"></div>
          <span class="font-semibold tracking-tight group-hover:text-brand-100">Your Protocol</span>
        </a>
        <nav class="hidden md:flex items-center gap-8 text-sm">
          <a href="#features" class="hover:text-brand-100/90">Features</a>
          <a href="#docs" class="hover:text-brand-100/90">Docs</a>
          <a href="#community" class="hover:text-brand-100/90">Community</a>
          <a href="#faq" class="hover:text-brand-100/90">FAQ</a>
        </nav>
        <div class="flex items-center gap-3">
          <a href="#app" class="hidden sm:inline-flex items-center rounded-xl border border-white/10 px-3 py-2 text-sm hover:border-white/20 hover:bg-white/5">Open App</a>
          <a href="#" class="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/20">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 14.5h-2V17h2v-0.5zM13 7h-2v7h2V7z"/></svg>
            Launch Docs
          </a>
        </div>
      </div>
    </div>
  </header>

  {{-- Hero --}}
  <section class="relative overflow-clip">
    <div class="absolute inset-0 bg-gradient-to-b from-brand-700/20 via-transparent to-transparent"></div>
    <div class="bg-grid absolute inset-0"></div>
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
      <div class="grid md:grid-cols-2 items-center gap-10">
        <div>
          <p class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs tracking-wide uppercase">On-chain • Composable • Immutable</p>
          <h1 class="mt-6 text-4xl sm:text-5xl font-bold leading-tight">A simple, sustainable reserve protocol for the multi‑chain future</h1>
          <p class="mt-4 text-white/70 max-w-xl">This minimal landing template gives you a clean foundation reminiscent of modern DeFi sites—dark UI, glass cards, bold typography—without copying any proprietary branding.</p>
          <div class="mt-8 flex flex-wrap gap-3">
            <a href="#app" class="inline-flex items-center justify-center rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold hover:bg-brand-700 transition">Enter App</a>
            <a href="#docs" class="inline-flex items-center justify-center rounded-xl border border-white/10 px-5 py-3 text-sm hover:bg-white/5">Read Docs</a>
          </div>
          {{-- KPI Row --}}
          <dl class="mt-10 grid grid-cols-3 gap-4 text-center">
            <div class="rounded-2xl bg-white/5 p-4 border border-white/10">
              <dt class="text-xs uppercase tracking-wider text-white/60">Market Cap</dt>
              <dd class="mt-1 text-xl font-semibold">$123.4M</dd>
            </div>
            <div class="rounded-2xl bg-white/5 p-4 border border-white/10">
              <dt class="text-xs uppercase tracking-wider text-white/60">Treasury</dt>
              <dd class="mt-1 text-xl font-semibold">$87.2M</dd>
            </div>
            <div class="rounded-2xl bg-white/5 p-4 border border-white/10">
              <dt class="text-xs uppercase tracking-wider text-white/60">Stakers</dt>
              <dd class="mt-1 text-xl font-semibold">42,381</dd>
            </div>
          </dl>
        </div>
        <div class="relative">
          <div class="absolute -inset-8 bg-gradient-to-br from-brand-700/20 to-transparent blur-3xl"></div>
          <div class="relative rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glow">
            <div class="grid gap-4">
              <div class="rounded-2xl border border-white/10 bg-black/40 p-4">
                <div class="flex items-center justify-between text-sm">
                  <span class="text-white/70">Protocol APY</span>
                  <span class="font-semibold">11.2%</span>
                </div>
                <div class="mt-3 h-1.5 w-full rounded bg-white/10">
                  <div class="h-1.5 rounded bg-brand-600" style="width: 64%"></div>
                </div>
              </div>
              <div class="rounded-2xl border border-white/10 bg-black/40 p-4">
                <div class="flex items-center justify-between text-sm">
                  <span class="text-white/70">Backing per token</span>
                  <span class="font-semibold">$23.18</span>
                </div>
                <div class="mt-2 text-xs text-white/60">Updated ~5 min ago</div>
              </div>
              <div class="rounded-2xl border border-white/10 bg-black/40 p-4">
                <div class="flex items-center justify-between text-sm">
                  <span class="text-white/70">Runway</span>
                  <span class="font-semibold">412 days</span>
                </div>
                <p class="mt-2 text-xs text-white/60">Assuming current emissions and growth trajectory.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  {{-- Features --}}
  <section id="features" class="py-16 md:py-24 border-t border-white/5">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="grid md:grid-cols-3 gap-6">
        @foreach ([
          ['title'=>'Protocol Owned Liquidity','desc'=>'Mitigate mercenary capital by owning your depth across venues.'],
          ['title'=>'Treasury Backing','desc'=>'Every token is backed by a basket of on‑chain assets for resilience.'],
          ['title'=>'Policy Framework','desc'=>'Transparent levers to influence supply, emissions, and runway.'],
          ['title'=>'Cross‑chain Ready','desc'=>'Deploy across L2s and sidechains with the same core primitives.'],
          ['title'=>'Composable Primitives','desc'=>'Integrate seamlessly with DeFi legos: AMMs, money markets, perps.'],
          ['title'=>'Open Governance','desc'=>'Token‑holder proposals, forum discussion, and executable votes.'],
        ] as $f)
        <div class="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-glow">
          <div class="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-700 to-brand-500 mb-4"></div>
          <h3 class="font-semibold text-lg">{{ $f['title'] }}</h3>
          <p class="mt-1 text-sm text-white/70">{{ $f['desc'] }}</p>
        </div>
        @endforeach
      </div>
    </div>
  </section>

  {{-- Callout / Docs --}}
  <section id="docs" class="py-16 md:py-24">
    <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-transparent p-8 md:p-12 text-center shadow-glow">
        <h2 class="text-3xl font-bold">Everything documented, nothing hidden</h2>
        <p class="mt-3 text-white/70">Ship with a docs link, whitepaper, and a simple policy dashboard. Swap these buttons to your own Notion, GitBook, or Docusaurus.</p>
        <div class="mt-6 flex flex-wrap justify-center gap-3">
          <a href="#" class="inline-flex items-center rounded-xl border border-white/10 px-4 py-2 hover:bg-white/5">Whitepaper</a>
          <a href="#" class="inline-flex items-center rounded-xl border border-white/10 px-4 py-2 hover:bg-white/5">GitBook</a>
          <a href="#" class="inline-flex items-center rounded-xl bg-brand-600 px-4 py-2 font-semibold hover:bg-brand-700">Forum</a>
        </div>
      </div>
    </div>
  </section>

  {{-- Community --}}
  <section id="community" class="py-16 md:py-24 border-t border-white/5">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="grid md:grid-cols-2 gap-8 items-center">
        <div>
          <h2 class="text-3xl font-bold">Built with the community</h2>
          <p class="mt-3 text-white/70">Point these cards to your Discord, Twitter/X, GitHub, and snapshot space. Replace the copy with your own community voice.</p>
          <div class="mt-6 grid grid-cols-2 gap-4 text-sm">
            @foreach ([
              ['label'=>'Discord','href'=>'#'],
              ['label'=>'X / Twitter','href'=>'#'],
              ['label'=>'GitHub','href'=>'#'],
              ['label'=>'Snapshot','href'=>'#'],
            ] as $c)
            <a href="{{ $c['href'] }}" class="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition shadow-glow">{{ $c['label'] }}</a>
            @endforeach
          </div>
        </div>
        <div class="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glow">
          <h3 class="font-semibold">Roadmap</h3>
          <ol class="mt-4 space-y-4 text-sm">
            <li class="flex items-start gap-3">
              <span class="mt-1 h-2 w-2 rounded-full bg-brand-600"></span>
              <div>
                <p class="font-medium">Q3 • Core deployment</p>
                <p class="text-white/70">Launch treasury, bonding, staking, and initial policy set.</p>
              </div>
            </li>
            <li class="flex items-start gap-3">
              <span class="mt-1 h-2 w-2 rounded-full bg-brand-600"></span>
              <div>
                <p class="font-medium">Q4 • L2 expansion</p>
                <p class="text-white/70">Bridge liquidity and roll out cross‑chain incentives.</p>
              </div>
            </li>
            <li class="flex items-start gap-3">
              <span class="mt-1 h-2 w-2 rounded-full bg-brand-600"></span>
              <div>
                <p class="font-medium">Q1 • Governance v1</p>
                <p class="text-white/70">Formalize proposals, voting, and execution flows.</p>
              </div>
            </li>
          </ol>
        </div>
      </div>
    </div>
  </section>

  {{-- FAQ --}}
  <section id="faq" class="py-16 md:py-24">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <h2 class="text-3xl font-bold text-center">FAQ</h2>
      <div class="mt-8 divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/5 shadow-glow">
        @foreach ([
          ['q'=>'Is this open source?','a'=>'Yes. Use this template freely in your Laravel project. No attribution required.'],
          ['q'=>'How do I connect a wallet?','a'=>'This is a static landing page. For wallet integrations, add a frontend dApp (wagmi / ethers) or link to your separate app.'],
          ['q'=>'Can I change the theme?','a'=>'Absolutely—adjust Tailwind config or swap colors in the <script> block.'],
        ] as $item)
        <details class="group p-4">
          <summary class="flex cursor-pointer items-center justify-between text-sm font-medium list-none">
            <span>{{ $item['q'] }}</span>
            <span class="transition group-open:rotate-45">+</span>
          </summary>
          <p class="mt-2 text-white/70">{{ $item['a'] }}</p>
        </details>
        @endforeach
      </div>
    </div>
  </section>

  {{-- Footer --}}
  <footer class="border-t border-white/5 py-10">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-white/60">
        <p>© {{ date('Y') }} Your Protocol. All rights reserved.</p>
        <div class="flex items-center gap-4">
          <a href="#" class="hover:text-white">Privacy</a>
          <a href="#" class="hover:text-white">Terms</a>
          <a href="#" class="hover:text-white">Contact</a>
        </div>
      </div>
    </div>
  </footer>
</body>
</html>
