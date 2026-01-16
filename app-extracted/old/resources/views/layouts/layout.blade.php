<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>@yield('title', 'FVC Digital')</title>

<link rel="stylesheet" href="{{ URL::asset('assets/css/bootstrap.css') }}"> 
<link rel="stylesheet" href="{{ URL::asset('assets/css/shadstrap.min.css') }}">
    <link rel="stylesheet" href="{{ URL::asset('assets/css/app.css') }}">
    @livewireStyles
</head>
<body>
    <!-- Navbar -->
  @include('partials.header')

    <!-- Page Content -->
    <div class="container-fluid m-0 p-0">
        @yield('content')
    </div>

@include('partials.footer')
    @livewireScripts
    <script src="{{ URL::asset('assets/js/PrivateSaleCard.js') }}"></script>
    <script> const privateSaleCard = new FVCPrivateSaleCard('fvc-private-sale'); </script>
</body>
</html>
