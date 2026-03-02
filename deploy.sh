#!/bin/bash
# Script de deploy para cPanel
# Gera o build e prepara a pasta para upload

echo "🔨 Gerando build de produção..."
npm run build

echo "📋 Copiando arquivos PHP e .htaccess para dist..."
cp -r public/api dist/api
cp public/.htaccess dist/.htaccess

echo ""
echo "✅ Build pronto em ./dist/"
echo ""
echo "📤 Para subir no cPanel:"
echo "   1. Acesse o Gerenciador de Arquivos do cPanel"
echo "   2. Navegue até a pasta do subdomínio claude.win7.com.br"
echo "   3. Faça upload de TODOS os arquivos da pasta dist/"
echo "   4. Crie um arquivo .env UM NÍVEL ACIMA da pasta pública com:"
echo "      ANTHROPIC_API_KEY=sk-ant-api03-SUA-CHAVE"
echo ""
echo "   Ou use FTP/SFTP para a pasta do subdomínio."
