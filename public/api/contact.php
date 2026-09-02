<?php
// Contact form handler for the Loopia (Apache/PHP) deployment.
// Sends the inquiry through the Algreen mailbox via PHP mail() — from
// upit@algreen.rs to info@algreen.rs, with the customer as Reply-To.
// Returns the same JSON contract the site's form expects: {"ok":true|false}.

header('Content-Type: application/json; charset=utf-8');

function out($status, $arr) {
  http_response_code($status);
  echo json_encode($arr);
  exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
  header('Allow: POST');
  out(405, ['ok' => false, 'error' => 'method_not_allowed']);
}

// Same-origin guard: block cross-site browser POSTs.
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$host   = $_SERVER['HTTP_HOST'] ?? '';
if ($origin !== '') {
  $oh = parse_url($origin, PHP_URL_HOST);
  if ($oh === false || $oh !== $host) out(403, ['ok' => false, 'error' => 'forbidden']);
}

// The form sends JSON; fall back to form-encoded just in case.
$raw  = file_get_contents('php://input');
$body = json_decode($raw, true);
if (!is_array($body)) $body = $_POST;

$name     = trim($body['name']    ?? '');
$email    = trim($body['email']   ?? '');
$phone    = trim($body['phone']   ?? '');
$message  = trim($body['message'] ?? '');
$honeypot = trim($body['company'] ?? ''); // hidden field; humans leave it empty

// Silently accept bots (don't tip them off), but send nothing.
if ($honeypot !== '') out(200, ['ok' => true]);

$validEmail = filter_var($email, FILTER_VALIDATE_EMAIL);
if ($name === '' || $email === '' || $message === '' || !$validEmail) {
  out(400, ['ok' => false, 'error' => 'invalid_input']);
}
if (mb_strlen($name) > 120 || mb_strlen($email) > 160 || mb_strlen($phone) > 40 || mb_strlen($message) > 5000) {
  out(413, ['ok' => false, 'error' => 'too_long']);
}

// Strip CR/LF from any value used in a header (anti header-injection).
$oneLine = fn($s) => trim(preg_replace('/[\r\n]+/', ' ', $s));
$esc     = fn($s) => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');

$to      = 'info@algreen.rs';
$from    = 'upit@algreen.rs';
$subject = 'Novi upit sa sajta — ' . $oneLine($name);

$html = '<div style="font-family:Arial,sans-serif;max-width:560px">'
      . '<h2 style="color:#1f1c1c">Novi upit sa sajta</h2>'
      . '<p><strong>Ime:</strong> ' . $esc($name) . '</p>'
      . '<p><strong>Email:</strong> ' . $esc($email) . '</p>'
      . '<p><strong>Telefon:</strong> ' . ($phone !== '' ? $esc($phone) : '—') . '</p>'
      . '<p><strong>Poruka:</strong><br>' . nl2br($esc($message)) . '</p>'
      . '</div>';

$headers  = "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: text/html; charset=UTF-8\r\n";
$headers .= 'From: Algreen sajt <' . $from . ">\r\n";
$headers .= 'Reply-To: ' . $oneLine($email) . "\r\n";

// Encode the (Cyrillic/Latin) subject for correct display.
$encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';

$sent = @mail($to, $encodedSubject, $html, $headers, '-f' . $from);

if ($sent) out(200, ['ok' => true]);
out(502, ['ok' => false, 'error' => 'send_failed']);
