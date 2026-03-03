<?php
/**
 * Proxy para API Anthropic Claude
 * Suporta modo normal e streaming (SSE)
 * Retry automático com backoff + fallback de modelo (Haiku → Sonnet)
 *
 * Lógica: tenta Haiku 3x, se falhar tenta Sonnet 3x = até 6 tentativas
 * Só envia headers SSE ao browser quando confirma resposta 200 da Anthropic
 */

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

// Modelos: tenta Haiku (barato) primeiro, fallback para Sonnet (confiável)
$models = [
    'claude-haiku-4-5-20251001',
    'claude-sonnet-4-20250514',
];

$maxRetries = 3;
$retryDelays = [2, 3, 5]; // segundos entre tentativas

// ========== STREAMING MODE ==========
if ($useStream) {
    // Desabilita output buffering para streaming
    while (ob_get_level()) ob_end_flush();

    foreach ($models as $modelIdx => $model) {
        for ($attempt = 0; $attempt < $maxRetries; $attempt++) {
            // Delay entre tentativas (exceto primeira do primeiro modelo)
            if ($attempt > 0 || $modelIdx > 0) {
                $delay = $retryDelays[min($attempt, count($retryDelays) - 1)];
                sleep($delay);
            }

            $payload = json_encode([
                'model' => $model,
                'max_tokens' => isset($input['max_tokens']) ? (int)$input['max_tokens'] : 8000,
                'system' => $input['system'] ?? '',
                'messages' => $input['messages'],
                'stream' => true,
            ]);

            $httpCode = 0;
            $errorBody = '';
            $headersSent = false;

            $ch = curl_init('https://api.anthropic.com/v1/messages');
            curl_setopt_array($ch, [
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => $payload,
                CURLOPT_RETURNTRANSFER => false,
                CURLOPT_TIMEOUT => 300,
                CURLOPT_CONNECTTIMEOUT => 15,
                CURLOPT_HTTPHEADER => [
                    'Content-Type: application/json',
                    'x-api-key: ' . $apiKey,
                    'anthropic-version: 2023-06-01',
                ],
                // Captura HTTP status da Anthropic ANTES dos dados
                CURLOPT_HEADERFUNCTION => function($ch, $header) use (&$httpCode) {
                    if (preg_match('/^HTTP\/\S+\s+(\d{3})/', $header, $m)) {
                        $httpCode = (int)$m[1];
                    }
                    return strlen($header);
                },
                // Só envia dados ao browser se status = 200
                CURLOPT_WRITEFUNCTION => function($ch, $data) use (&$httpCode, &$errorBody, &$headersSent) {
                    // API retornou erro — buffer sem enviar ao browser
                    if ($httpCode !== 200) {
                        $errorBody .= $data;
                        return strlen($data);
                    }

                    // Primeira vez com dados bons — agora sim envia headers SSE
                    if (!$headersSent) {
                        header('Content-Type: text/event-stream; charset=utf-8');
                        header('Cache-Control: no-cache');
                        header('Connection: keep-alive');
                        header('X-Accel-Buffering: no');
                        $headersSent = true;
                    }

                    // Forward SSE data direto pro browser
                    echo $data;
                    if (ob_get_level()) ob_flush();
                    flush();
                    return strlen($data);
                },
            ]);

            curl_exec($ch);
            $curlError = curl_error($ch);
            curl_close($ch);

            // Sucesso — dados já foram enviados ao browser via SSE
            if ($headersSent) {
                exit;
            }

            // Erro retryable (overloaded, rate limit, conexão)
            if ($curlError || $httpCode === 529 || $httpCode === 429) {
                continue; // Tenta novamente
            }

            // Erro não-retryable (400, 401, 403, etc.)
            header('Content-Type: application/json; charset=utf-8');
            http_response_code($httpCode ?: 502);
            echo $errorBody ?: json_encode(['error' => 'Erro na API']);
            exit;
        }
    }

    // Todas as tentativas falharam
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(503);
    echo json_encode([
        'error' => 'A API do Claude está sobrecarregada. O servidor tentou múltiplas vezes sem sucesso. Aguarde 30 segundos e tente novamente.'
    ]);
    exit;
}

// ========== NORMAL MODE (fallback) ==========
header('Content-Type: application/json; charset=utf-8');

foreach ($models as $modelIdx => $model) {
    for ($attempt = 0; $attempt < $maxRetries; $attempt++) {
        if ($attempt > 0 || $modelIdx > 0) {
            $delay = $retryDelays[min($attempt, count($retryDelays) - 1)];
            sleep($delay);
        }

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
            CURLOPT_CONNECTTIMEOUT => 15,
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

        // Retryable
        if ($curlError || $httpCode === 529 || $httpCode === 429) continue;

        // Sucesso ou erro não-retryable
        http_response_code($httpCode);
        echo $response;
        exit;
    }
}

// Todas as tentativas falharam
http_response_code(503);
echo json_encode([
    'error' => 'A API do Claude está sobrecarregada. Aguarde 30 segundos e tente novamente.'
]);
