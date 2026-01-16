 <div class="container-fluid justify-content-center">
       <h2 class="fw-bold fs-3 fs-md-4 fs-lg-2 text-center   pb-3">
        {{ $block->translatedInput('title') }}
    </h2>
                <div class="row g-3 position-relative text-center justify-content-center">
                    <div class="col-12 col-md-3 step-item " onclick="activateHorizontalStep(0)">
                        <div class="step-circle ">
                            <i class="bi bi-1-circle-fill text-warning" style="font-size: 3rem;"></i>
                        </div>
                        <div class="step-content text-center">
                            <h5 class="fw-bold mb-2">Application</h5>
                            <p class="text-muted small mb-0">Submit your request to begin</p>
                        </div>
                    </div>
                    <div class="col-12 col-md-3 step-item" onclick="activateHorizontalStep(1)">
                        <div class="step-circle">
                            <i class="bi bi-2-circle-fill text-warning" style="font-size: 3rem;"></i>
                        </div>
                        <div class="step-content text-center">
                            <h5 class="fw-bold mb-2">Expert Review</h5>
                            <span class="badge-time">1 week</span>
                            <p class="text-muted small mb-0 mt-2">Professional evaluation</p>
                        </div>
                    </div>
                    <div class="col-12 col-md-3 step-item" onclick="activateHorizontalStep(2)">
                        <div class="step-circle">
                            <i class="bi bi-3-circle-fill text-warning" style="font-size: 3rem;"></i>
                        </div>
                        <div class="step-content text-center">
                            <h5 class="fw-bold mb-2">Due Diligence</h5>
                            <p class="text-muted small mb-0">Thorough verification</p>
                        </div>
                    </div>
     </div>
      <div class="row g-3 position-relative text-center justify-content-center">
                    <div class="col-12 col-md-3 step-item" onclick="activateHorizontalStep(3)">
                        <div class="step-circle">
                            <i class="bi bi-4-circle-fill text-warning" style="font-size: 3rem;"></i>
                        </div>
                        <div class="step-content text-center">
                            <h5 class="fw-bold mb-2">Community Vote</h5>
                            <span class="badge-time">3 days</span>
                            <p class="text-muted small mb-0 mt-2">Democratic decision</p>
                        </div>
                    </div>
                    <div class="col-12  col-md-3 step-item" onclick="activateHorizontalStep(4)">
                        <div class="step-circle">
                            <i class="bi bi-5-circle-fill text-warning" style="font-size: 3rem;"></i>
                        </div>
                        <div class="step-content text-center">
                            <h5 class="fw-bold mb-2">Instant Funding</h5>
                            <p class="text-muted small mb-0">Immediate approval</p>
                        </div>
                    </div>
                </div>
 </div>