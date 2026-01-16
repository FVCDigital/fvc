<?php

namespace App\Http\Livewire;

use Livewire\Component;
use Illuminate\Support\Facades\Mail;

class ContactForm extends Component
{
    public $name;
    public $email;
    public $message;
    public $successMessage;

    protected $rules = [
        'name'    => 'required|min:3',
        'email'   => 'required|email',
        'message' => 'required|min:10',
    ];

    public function submit()
    {
        $this->validate();

        // Example: send email (you can customize)
        Mail::raw($this->message, function ($mail) {
            $mail->to('contact@example.com')
                 ->from($this->email, $this->name)
                 ->subject('New Contact Form Message');
        });

        // Reset form
        $this->reset(['name', 'email', 'message']);
        $this->successMessage = "Thank you! Your message has been sent.";
    }

    public function render()
    {
        return view('livewire.contact-form');
    }
}
