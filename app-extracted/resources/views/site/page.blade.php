<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, shrink-to-fit=no">
    <title>{{ $item->seotitle }}</title>
    <link rel="stylesheet" href="https://use.typekit.net/sxv2zkv.css">
    <link rel="stylesheet" href="{{ URL::asset('assets/css/bootstrap.css') }}"> 
     <link rel="stylesheet" href="{{ URL::asset('assets/css/app.css') }}"> 
     <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css">
    
</head>
<body class="bg">
    <div class="bkvideo"></div>
<x-menu/>
<div class=" ">
  

    {!! $item->renderBlocks() !!}
     
</div>
<div>

 
</div>
    <footer class="mt-5 bg-dark p-3  bg-opacity-50">
        <div class="container text-white">
    <div class="row">
        <div class="col-12 col-md-6">
            <img class="img-fluid footerlogo " src="{{ URL::asset('assets/images/FirstVentureCapita-logo.svg') }}" alt="FVC Digital">
             <h4 class="mb-2  text-left pt-1">   Venture Capital, Decentralised </h4>
        <div class="col-12 text-left text-white fs-3 mb-2 social-icons">
                    <a href="#facebook" aria-label="Facebook" class="link-light"><i class="bi bi-facebook p-2"></i></a>
                    <a href="#twitter" aria-label="Twitter" class="link-light"><i class="bi bi-twitter-x p-2"></i></a>
                    <a href="#instagram" aria-label="Instagram" class="link-light"><i class="bi bi-instagram p-2"></i></a>
                    <a href="#linkedin" aria-label="LinkedIn" class="link-light"><i class="bi bi-linkedin p-2"></i></a>
                    <a href="#youtube" aria-label="YouTube" class="link-light"><i class="bi bi-youtube p-2"></i></a>
                </div>
              <a href="#app" class="btn  btn-outline-light   btn-lg mt-2 mb-3 ">Join</a>
            <div class="col-10"><p>FVC tokens are utility tokens. Not investment advice.  Please review our risk disclaimer. Cryptocurrency investments carry risk.  Only invest what you can afford to lose.</p></div>
          
        </div>
        <div class="col-12 col-md-3">
            <h3 class="text-white pt-3">Navigation</h3>
         <ul class="nav flex-column">
                        <li class="nav-item"><a href="#home" class="link-light">Home</a></li>
                        <li class="nav-item"><a href="#about" class="link-light">About</a></li>
                        <li class="nav-item"><a href="#services" class="link-light">Services</a></li>
                        <li class="nav-item"><a href="#contact" class="link-light">Contact</a></li>
                        <li class="nav-item"><a href="#privacy" class="link-light">Privacy Policy</a></li>
                        <li><a href="#terms" class="link-light">Terms of Service</a></li>
                    </ul></div>
        <div class="col-12 col-md-3">
        <h3 class="text-white pt-3">Legal</h3>
         <ul class="nav flex-column">
                        <li class="nav-item"><a href="#home" class="link-light">Home</a></li>
                        <li class="nav-item"><a href="#about" class="link-light">About</a></li>
                        <li class="nav-item"><a href="#services" class="link-light">Services</a></li>
                        <li class="nav-item"><a href="#contact" class="link-light">Contact</a></li>
                        <li class="nav-item"><a href="#privacy" class="link-light">Privacy Policy</a></li>
                        <li><a href="#terms" class="link-light">Terms of Service</a></li>
                    </ul>
        </div>
        </div>
        <div class="row mt-3 pb-2">
        <div class="col-12 text-center">© 2026 FVC Coin. All rights reserved.<br />

</div> 
        </div>
            </div>
    </footer>
  
    <script src="{{ URL::asset('assets/js/bootstrap.bundle.min.js') }}"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels"></script>


<script>
        // Wrap everything in DOMContentLoaded to ensure elements exist
        document.addEventListener('DOMContentLoaded', function() {
            
            // Navbar scroll shrink effect
            window.addEventListener('scroll', function() {
                const navbar = document.querySelector('.navbar');
                if (window.scrollY > 50) {
                    navbar.classList.add('scrolled');
                } else {
                    navbar.classList.remove('scrolled');
                }
            });
            
            // Letter by letter animation optimized for mobile and desktop
            const text = document.getElementById('animatedText');

            if (text) {
                const originalText = text.textContent;
                
                function animateText(message) {
                    // Clear existing content
                    text.innerHTML = '';
                    
                    // Use requestAnimationFrame for better performance
                    const words = message.split(' ');
                    let letterIndex = 0;
                    
                    // Create spans grouped by words to prevent word splitting
                    const fragment = document.createDocumentFragment();
                    const allSpans = [];
                    
                    words.forEach((word, wordIdx) => {
                        // Create a wrapper for each word
                        const wordWrapper = document.createElement('span');
                        wordWrapper.className = 'word-wrapper';
                        wordWrapper.style.display = 'inline-block';
                        wordWrapper.style.whiteSpace = 'nowrap'; // Keep word together
                        
                        // Add letters for this word
                        word.split('').forEach((letter) => {
                            const span = document.createElement('span');
                            span.textContent = letter;
                            span.className = 'letter';
                            span.style.opacity = '0';
                            span.style.display = 'inline-block';
                            span.style.willChange = 'opacity';
                            wordWrapper.appendChild(span);
                            allSpans.push(span);
                        });
                        
                        fragment.appendChild(wordWrapper);
                        
                        // Add space after word (except last word)
                        if (wordIdx < words.length - 1) {
                            const space = document.createElement('span');
                            space.textContent = '\u00A0';
                            space.className = 'letter space';
                            space.style.opacity = '0';
                            space.style.display = 'inline-block';
                            space.style.willChange = 'opacity';
                            fragment.appendChild(space);
                            allSpans.push(space);
                        }
                    });
                    
                    text.appendChild(fragment);
                    
                    const spans = allSpans;
                    
                    // Animate with staggered timing
                    spans.forEach((span, i) => {
                        // Use setTimeout instead of CSS animation delay for better mobile support
                        setTimeout(() => {
                            span.style.transition = 'opacity 0.1s ease-out';
                            span.style.opacity = '1';
                            
                            // Clean up will-change after animation
                            setTimeout(() => {
                                span.style.willChange = 'auto';
                            }, 150);
                        }, i * 50); // 50ms delay between letters
                    });
                }
                
                // Add CSS for letter styling
                if (!document.getElementById('letterAnimation')) {
                    const style = document.createElement('style');
                    style.id = 'letterAnimation';
                    style.textContent = `
                        .letter {
                            display: inline-block;
                            transform: translateZ(0); /* Enable hardware acceleration */
                            backface-visibility: hidden; /* Prevent flicker on mobile */
                            -webkit-font-smoothing: antialiased; /* Better text rendering */
                        }
                        
                        .word-wrapper {
                            display: inline-block;
                            white-space: nowrap; /* Keep words together */
                        }
                        
                        /* Prevent text selection during animation */
                        #animatedText {
                            -webkit-user-select: none;
                            -moz-user-select: none;
                            -ms-user-select: none;
                            user-select: none;
                            text-align: center; /* Center text */
                            width: 100%; /* Ensure full width */
                            display: block; /* Make it a block element */
                            word-spacing: normal; /* Maintain normal word spacing */
                        }
                        
                        /* Ensure smooth rendering on mobile */
                        @media (max-width: 768px) {
                            .letter {
                                -webkit-transform: translateZ(0);
                                -webkit-backface-visibility: hidden;
                            }
                        }
                    `;
                    document.head.appendChild(style);
                }
                
                // Animate with slight delay to ensure DOM is ready
                requestAnimationFrame(() => {
                    setTimeout(() => animateText(originalText), 100);
                });
                
                // Re-enable text selection after animation completes
                setTimeout(() => {
                    text.style.userSelect = 'text';
                    text.style.webkitUserSelect = 'text';
                }, originalText.length * 50 + 200);
            }
                
            // Set the date we're counting down to (15 days from now)
            const countDownDate = new Date().getTime() + (15 * 24 * 60 * 60 * 1000);

            // Function to animate number change
            function animateNumber(elementId, newValue) {
                const element = document.getElementById(elementId);
                if (!element) return;
                
                const oldValue = element.textContent;
                
                // Only animate if value changed
                if (oldValue !== newValue) {
                    element.style.transform = 'translateY(-20%)';
                    element.style.opacity = '0.3';
                    
                    setTimeout(() => {
                        element.textContent = newValue;
                        element.style.transform = 'translateY(20%)';
                        element.offsetHeight; // Trigger reflow
                        element.style.transition = 'transform 0.5s ease, opacity 0.5s ease';
                        element.style.transform = 'translateY(0)';
                        element.style.opacity = '1';
                    }, 250);
                }
            }

            // Update the countdown every 1 second
            const x = setInterval(function() {
                const now = new Date().getTime();
                const distance = countDownDate - now;

                // Time calculations
                const days = Math.floor(distance / (1000 * 60 * 60 * 24));
                const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((distance % (1000 * 60)) / 1000);

                // Format with leading zeros
                const formattedDays = days.toString().padStart(2, '0');
                const formattedHours = hours.toString().padStart(2, '0');
                const formattedMinutes = minutes.toString().padStart(2, '0');
                const formattedSeconds = seconds.toString().padStart(2, '0');

                // Animate the numbers
                animateNumber("days", formattedDays);
                animateNumber("hours", formattedHours);
                animateNumber("minutes", formattedMinutes);
                animateNumber("seconds", formattedSeconds);

                // If the countdown is finished
                if (distance < 0) {
                    clearInterval(x);
                    document.getElementById("days").innerHTML = "00";
                    document.getElementById("hours").innerHTML = "00";
                    document.getElementById("minutes").innerHTML = "00";
                    document.getElementById("seconds").innerHTML = "00";
                }
            }, 1000);
            
            // Progress Bar Animation
            (function() {
                const progressBar = document.getElementById('animatedProgressBar');
                
                if (!progressBar) {
                    console.warn('Progress bar element not found');
                    return;
                }
                
                const targetWidth = parseInt(progressBar.style.width) || 80;
                let currentWidth = 0;
                progressBar.style.width = '0%';
                
                function animateWidth() {
                    if (currentWidth < targetWidth) {
                        currentWidth += 0.5;
                        progressBar.style.width = currentWidth + '%';
                        requestAnimationFrame(animateWidth);
                    }
                }
                
                setTimeout(animateWidth, 300);
                
                progressBar.style.backgroundImage = 'linear-gradient(45deg, rgba(255,255,255,.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.15) 50%, rgba(255,255,255,.15) 75%, transparent 75%, transparent)';
                progressBar.style.backgroundSize = '1rem 1rem';
                
                let pos = 0;
                
                function animateStripes() {
                    pos -= 1;
                    if (pos <= -16) {
                        pos = 0;
                    }
                    progressBar.style.backgroundPosition = pos + 'px 0';
                    requestAnimationFrame(animateStripes);
                }
                
                animateStripes();
            })();
            
            // Chart.js Doughnut Chart
            (function() {
                const chartElement = document.getElementById('myChart');
                
                if (!chartElement) {
                    console.warn('Chart element not found');
                    return;
                }
                
                const ctx = chartElement.getContext('2d');
                
                const gradient1 = ctx.createLinearGradient(0, 0, 0, 400);
                gradient1.addColorStop(0, 'rgba(102, 2, 60, 1)');
                gradient1.addColorStop(1, 'rgba(80, 80, 80, 1)');
                
                const gradient2 = ctx.createLinearGradient(0, 0, 0, 400);
                gradient2.addColorStop(0, 'rgba(102, 2, 60, 0.6)');
                gradient2.addColorStop(1, 'rgba(80, 80, 80, 0.7)');
                
                const gradient3 = ctx.createLinearGradient(0, 0, 0, 400);
                gradient3.addColorStop(0, 'rgba(102, 2, 60, 1)');
                gradient3.addColorStop(1, 'rgba(80, 80, 80, 1)');
                
                const gradient4 = ctx.createLinearGradient(0, 0, 0, 400);
                gradient4.addColorStop(0, 'rgba(102, 2, 60, 0.6)');
                gradient4.addColorStop(1, 'rgba(80, 80, 80, 0.6)');
                
                const gradient5 = ctx.createLinearGradient(0, 0, 0, 400);
                gradient5.addColorStop(0, 'rgba(102, 2, 60, 0.7)');
                gradient5.addColorStop(1, 'rgba(80, 80, 80, 1)');
                
                new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: ['Public Sale', 'Ecosystem Growth', 'Staking Rewards', 'Team & Advisors', 'Liquidity & Reserve'],
                        datasets: [{
                            label: 'Distribution',
                            data: [40, 20, 15, 15, 10],
                            borderWidth: 0,
                            hoverOffset: 10,
                            hoverBackgroundColor: 'rgba(0, 0, 0, 0.8)',
                            backgroundColor: [
                                gradient1,
                                gradient2,
                                gradient3,
                                gradient4,
                                gradient5
                            ]
                        }]
                    },
                    options: {
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                enabled: true,
                                titleFont: { size: 16 },
                                bodyFont: { size: 18 },
                                callbacks: {
                                    label: function(context) {
                                        const label = context.label || '';
                                        const value = context.parsed;
                                        const total = context.chart.data.datasets[0].data
                                            .reduce((a, b) => a + b, 0);
                                        const percentage = ((value / total) * 100).toFixed(1);
                                        return `${label}: ${value} (${percentage}%)`;
                                    }
                                }
                            },
                            datalabels: { display: false }
                        },
                        scales: {
                            x: { display: false, grid: { display: false } },
                            y: { display: false, grid: { display: false } }
                        }
                    },
                    plugins: []
                });
            })();
            
        });
    </script>

<script src="{{ URL::asset('assets/js/PrivateSaleCard.js') }}"></script>
    <script> const privateSaleCard = new FVCPrivateSaleCard('fvc-private-sale'); </script>
</body>
</html>
