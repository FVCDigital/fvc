

<section class="container">

 
    @foreach($block->children()->where('type', 'team_item')->get() as $item)
     <div class="row justify-content-center mb-4">
         <div class="col-9 col-md-3 mb-4 px-4"><img src="{{$item->image('highlight', 'mobile')}}" class="rounded-circle w-100 h-100" alt="Circular image" style="max-width: 300px; max-height: 300px; object-fit: cover;"></div>
         <div class="col-12 col-md-7 mb-4">
              <h3 class="fs-900  "> {{ $item->input('name') }}</h3>
                          
                           <h5 class=" fs-900  "> {{ $item->input('job') }}</h5>
                <p >   {{ $item->input('description') }}</p>
             
      </div>
    </div>
    @endforeach


</section>


