<?php
/**
 * Proxy para API Anthropic Claude
 * Suporta modo normal e streaming (SSE)
 */

// Timeout PHP generoso
set_time_limit(300);
ini_set('max_execution_time', 300);

// CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(405);
    echo json_encode(['error' => 'Método não permitido']);
    exit;
}

// Carrega API key
$apiKey = '';
$envPaths = [
    dirname(__DIR__) . '/.env',
    dirname(dirname(__DIR__)) . '/.env',
    '/home/pages/.env',
];
foreach ($envPaths as $path) {
    if (file_exists($path)) {
        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            if (strpos($line, '#') === 0) continue;
            if (strpos($line, 'ANTHROPIC_API_KEY=') === 0) {
                $apiKey = trim(substr($line, strlen('ANTHROPIC_API_KEY=')));
                break 2;
            }
        }
    }
}
if (empty($apiKey)) $apiKey = getenv('ANTHROPIC_API_KEY');

if (empty($apiKey)) {
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(500);
    echo json_encode(['error' => 'API key não configurada no servidor']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
if (!$input || empty($input['messages'])) {
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(400);
    echo json_encode(['error' => 'Requisição inválida']);
    exit;
}

$useStream = !empty($input['stream']);

// Modelo - usar haiku 4.5 para testes (barato e rápido), sonnet para produção
// Modelos disponíveis na conta:
// - claude-haiku-4-5-20251001  (mais barato, testes)
// - claude-sonnet-4-20250514   (produção)
// - claude-sonnet-4-6          (mais recente)
$model = 'claude-haiku-4-5-20251001';

// ========== STREAMING MODE ==========
if ($useStream) {
    header('Content-Type: text/event-stream; charset=utf-8');
    header('Cache-Control: no-cache');
    header('Connection: keep-alive');
    header('X-Accel-Buffering: no'); // nginx

    // Desabilita output buffering
    while (ob_get_level()) ob_end_flush();

    $payload = json_encode([
        'model' => $model,
        'max_tokens' => isset($input['max_tokens']) ? (int)$input['max_tokens'] : 8000,
        'system' => $input['system'] ?? '',
        'messages' => $input['messages'],
        'stream' => true,
    ]);

    $ch = curl_init('https://api.anthropic.com/v1/messages');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_RETURNTRANSFER => false,
        CURLOPT_TIMEOUT => 300,
        CURLOPT_CONNECTTIMEOUT => 30,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'x-api-key: ' . $apiKey,
            'anthropic-version: 2023-06-01',
        ],
        CURLOPT_WRITEFUNCTION => function($ch, $data) {
            // Forward SSE data direto pro browser
            echo $data;
            if (ob_get_level()) ob_flush();
            flush();
            return strlen($data);
        },
    ]);

    $success = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($curlError) {
        echo "event: error\ndata: " . json_encode(['error' => $curlError]) . "\n\n";
        flush();
    }

    exit;
}

// ========== NORMAL MODE (fallback) ==========
header('Content-Type: application/json; charset=utf-8');

$payload = json_encode([
    'model' => $model,
    'max_tokens' => isset($input['max_tokens']) ? (int)$input['max_tokens'] : 8000,
    'system' => $input['system'] ?? '',
    'messages' => $input['messages'],
]);

$ch = curl_init('https://api.anthropic.com/v1/messages');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $payload,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 300,
    CURLOPT_CONNECTTIMEOUT => 30,
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
    echo json_encode(['error' => 'Erro de conexão: ' . $curlError]);
    exit;
}

http_response_code($httpCode);
echo $response;
