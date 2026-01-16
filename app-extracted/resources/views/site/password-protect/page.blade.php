<form method="POST">
    @csrf
    <input type="password" name="password" placeholder="Enter password" required>
    <button type="submit">Unlock</button>
</form>

@if(session('page_error'))
<p style="color:red;">{{ session('page_error') }}</p>
@endif
