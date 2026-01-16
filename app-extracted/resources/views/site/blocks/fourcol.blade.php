

<section class="container">

  <div class="row">
    @foreach($block->children()->where('type', 'fourblock_item')->get() as $item)
      <div class="col-12 col-md-6 mb-4">
        <div class="card  overflow-hidden">
          <div class="position-relative">
            <img src="{{ $item->image('highlight', 'desktop') }}" class="card-img-top" alt="{{ $item->input('header') }}">
            
            <!-- Gradient overlay -->
            <div class="position-absolute top-0 start-0 w-100 h-100" style="background: linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4));"></div>
            
            <!-- Card title -->
            <h5 class="card-title position-absolute bottom-0 start-0 m-3">
              {{ $item->input('header') }}
            </h5>

            <!-- Floating button -->
            <a href="{{ $item->input('url') }}" class="btn btn-danger rounded-circle position-absolute top-50 end-0 translate-middle-y me-3">
              <i class="bi bi-plus"></i> <!-- Bootstrap Icons -->
            </a>
          </div>

          <div class="card-body text-dark">
            {{ $item->input('description') }}
          </div>
        </div>
      </div>
    @endforeach
  </div>

</section>


