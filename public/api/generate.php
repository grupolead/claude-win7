<?php
/**
 * Proxy para API Anthropic Claude
 * Protege a API key no servidor (nunca exposta ao frontend)
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Preflight CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método não permitido']);
    exit;
}

// Carrega a chave da API de um arquivo .env
// Busca em: pasta pai do api/ → pasta pai do subdominio → /home/pages
$apiKey = '';
$envPaths = [
    dirname(__DIR__) . '/.env',           // /home/pages/public_html/claude/.env
    dirname(dirname(__DIR__)) . '/.env',  // /home/pages/public_html/.env
    '/home/pages/.env',                    // home do usuario
];
$envFile = null;
foreach ($envPaths as $path) {
    if (file_exists($path)) { $envFile = $path; break; }
}

if ($envFile) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos($line, '#') === 0) continue;
        if (strpos($line, 'ANTHROPIC_API_KEY=') === 0) {
            $apiKey = trim(substr($line, strlen('ANTHROPIC_API_KEY=')));
            break;
        }
    }
}

// Fallback: variável de ambiente do servidor
if (empty($apiKey)) {
    $apiKey = getenv('ANTHROPIC_API_KEY');
}

if (empty($apiKey)) {
    http_response_code(500);
    echo json_encode(['error' => 'API key não configurada no servidor']);
    exit;
}

// Lê o body da requisição
$input = json_decode(file_get_contents('php://input'), true);

if (!$input || empty($input['messages'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Requisição inválida. Envie { system, messages, max_tokens }']);
    exit;
}

// Prepara a requisição para a Anthropic
$payload = json_encode([
    'model' => 'claude-sonnet-4-20250514',

    'max_tokens' => isset($input['max_tokens']) ? (int)$input['max_tokens'] : 8000,
    'system' => $input['system'] ?? '',
    'messages' => $input['messages'],
]);

$ch = curl_init('https://api.anthropic.com/v1/messages');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $payload,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 120,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'x-api-key: ' . $apiKey,
        'anthropic-version: 2023-06-01',
    ],
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    http_response_code(502);
    echo json_encode(['error' => 'Erro de conexão com API: ' . $curlError]);
    exit;
}

http_response_code($httpCode);
echo $response;
