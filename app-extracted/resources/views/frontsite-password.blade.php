<!DOCTYPE html>
<html>
<head>
    <title>Site Password</title>
    <style>
        body { font-family: sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; }
        form { display:flex; flex-direction:column; }
        input, button { padding:10px; margin:5px 0; }
    </style>
</head>
<body>
    <form method="POST">
        @csrf
        <h1>Enter Site Password</h1>
        <input type="password" name="password" placeholder="Password" required>
        <button type="submit">Enter</button>

        @if($errors->has('password'))
            <p style="color:red;">{{ $errors->first('password') }}</p>
        @endif
    </form>
</body>
</html>